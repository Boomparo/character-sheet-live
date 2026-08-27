(function () {
  'use strict';

  const GearRules = window.GearRulesV9;
  const KEY = 'character-sheet-v9';
  const LEGACY_KEYS = ['character-sheet-v7s', 'occultist-sheet-v1'];
  const SCHEMA_VERSION = 16;
  const APP_VERSION = '9.7.0-smart-play';
  const HISTORY_LIMIT = 20;
  const A = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
  const ITEM_LOCATIONS = ['equipped', 'worn', 'carried', 'back', 'ground', 'storage'];
  const PAGE_IDS = ['characterPage', 'actionsPage', 'skillsPage', 'featuresPage', 'relicsPage', 'gearPage', 'npcsPage', 'bioPage'];
  const CHOICE_ARRAYS = [
    'classSkills', 'ancientLanguages', 'vehicles', 'weaponMasteries',
    'feat4', 'feat8', 'feat12', 'feat16', 'epicBoon19'
  ];

  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const number = (value, fallback = 0) => {
    const result = Number(value);
    return Number.isFinite(result) ? result : fallback;
  };
  const clamp = (value, min, max) => Math.max(min, Math.min(max, number(value, min)));
  const array = value => Array.isArray(value) ? value : [];
  const unique = value => [...new Set(array(value).filter(Boolean))];

  function uid(prefix = 'id') {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
      return `${prefix}-${globalThis.crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function baseState() {
    return {
      schemaVersion: SCHEMA_VERSION,
      appVersion: APP_VERSION,
      character: {
        name: '', race: '', classKey: 'treasureHunter', level: 1, portrait: '', size: '',
        hp: { current: 10, max: 10, temp: 0, auto: true },
        hitDice: { d10: { spent: 0 } },
        deathSaves: { successes: 0, failures: 0 },
        acMode: 'auto', acManual: 10, acBonus: 0,
        speed: 30, initiativeBonus: 0, inspiration: false,
        abilities: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
        conditions: [], exhaustion: 0, skills: {},
        rollModes: { initiative: 'normal', attacks: 'normal', skills: {}, saves: {} },
        customActions: [], spells: [],
        damageDefenses: { resistances: [], immunities: [], vulnerabilities: [], conditionImmunities: [] },
        proficiencies: {
          languages: [], vehicles: [], tools: ["Thieves' Tools", "Navigator's Tools"],
          weapons: [], armor: ['Light Armor'], senses: [], defenses: []
        },
        gear: {
          money: { gp: 0, ep: 0, sp: 0, cp: 0, pp: 0 },
          currencyWallets: { generic: { g: 0, s: 0, c: 0 } },
          favoriteCurrencyId: 'generic', currencyDisplayMode: 'total', otherPossessions: '', currencyTransactions: [],
          weapons: [], armor: [], inventory: [],
          encumbranceMode: 'basic',
          starting: { budgetGp: 0, finalized: false, remainderCp: 0, legacy: false }
        },
        origin: {
          species: '',
          speciesChoices: { skills: [], simpleWeapon: '' },
          background: {
            name: 'Lukyho univerzální background', skills: [], tool: '', secondary: '', feat: '',
            abilityMode: '+2/+1', abilityChoices: [], resilientAbility: '', skilledChoices: [], luckUsed: 0
          }
        },
        bio: {
          background: '', alignment: '', age: '', height: '', weight: '', eyes: '', hair: '', skin: '', faith: '',
          personality: '', ideals: '', bonds: '', flaws: '', appearance: '', backstory: '', allies: '', notes: ''
        }
      },
      classes: {
        treasureHunter: {
          coolUsed: 0, featureUses: {}, relics: [],
          choices: {
            classSkills: [], ancientLanguages: ['', '', ''], vehicles: ['', ''], expertise: '',
            subclass: '', subclassConfirmed: false,
            weaponMasteries: ['', ''], feat4: [], feat8: [], feat12: [], feat16: [], epicBoon19: [],
            startingMelee: '', startingRanged: ''
          }
        },
        occultist: {}
      },
      campaign: { npcs: [], journal: [], notes: [], tarot: {} },
      ui: {
        page: 0, pageId: 'characterPage', socialTab: 'npcs', featureView: 'available', featureFilter: 'all', actionFilter: 'all',
        npcSort: 'alphabetical', campaignView: 'directory',
        favoriteFeatures: [], favoriteActions: [], openFeatures: [], openActions: [], openRelics: [], openItems: []
      }
    };
  }

  function merge(target, source) {
    if (!source || typeof source !== 'object') return target;
    for (const key of Object.keys(source)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
      const value = source[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) target[key] = {};
        merge(target[key], value);
      } else {
        target[key] = clone(value);
      }
    }
    return target;
  }

  function stableId(prefix, value, index, seen) {
    let id = String(value || '').trim();
    if (!id || seen.has(id)) id = `${prefix}-${index + 1}`;
    while (seen.has(id)) id = `${id}-copy`;
    seen.add(id);
    return id;
  }

  function normalizeItems(items, prefix, seen = new Set()) {
    return array(items).filter(item => item != null).map((source, index) => {
      const item = typeof source === 'string' ? { name: source } : source;
      item.id = stableId(prefix, item.id || item.uid, index, seen);
      delete item.uid;
      item.name = String(item.name || 'Item');
      item.location = [...ITEM_LOCATIONS, 'backpack'].includes(item.location) ? item.location : (item.equipped || item.isEquipped ? 'equipped' : item.worn || item.isWorn ? 'worn' : 'carried');
      item.quantity = Math.max(1, Math.floor(number(item.quantity, 1)));
      const weight = item.weight ?? item.raw?.weight;
      if (weight != null && weight !== '' && Number.isFinite(Number(weight))) item.weight = Math.max(0, number(weight));
      else delete item.weight;
      item.modifiers = array(item.modifiers).filter(modifier => modifier && typeof modifier === 'object');
      const canonicalPack = /^(backpack|explorer['’]s pack)$/i.test(item.name.trim());
      item.isContainer = canonicalPack || (typeof item.isContainer === 'boolean' ? item.isContainer : /\b(backpack|pack|bag|sack|pouch|chest|case)\b/i.test(item.name));
      const rawArmor = String(item.raw?.armor_category || '').toLowerCase();
      const inferredType = item.isContainer ? 'container' : item.raw?.weapon_category || item.raw?.damage?.damage_dice ? 'weapon' : rawArmor === 'shield' ? 'shield' : rawArmor ? 'armor' : 'item';
      item.itemType = ['item', 'weapon', 'armor', 'shield', 'container'].includes(item.itemType) ? item.itemType : inferredType;
      if (item.itemType === 'container') item.isContainer = true;
      const ammunition = item.itemType !== 'weapon' && ((item.tags || []).includes('ammunition') || /ammunition/i.test(`${item.category || ''} ${item.raw?.equipment_category?.name || ''}`));
      if (ammunition) {
        const hadBundleSize = item.bundleSize != null && item.bundleSize !== '';
        const bundleSize = Math.max(1, Math.floor(number(item.bundleSize, item.quantity)));
        item.bundleSize = bundleSize;
        item.ammunitionCount = Math.max(0, Math.floor(number(item.ammunitionCount, hadBundleSize ? bundleSize * item.quantity : item.quantity)));
        if (!hadBundleSize && item.quantity > 1) item.quantity = 1;
      } else if (item.itemType === 'weapon') { delete item.bundleSize; delete item.ammunitionCount; }
      if (GearRules?.applyItemWeight) GearRules.applyItemWeight(item);
      item.containerId = item.containerId ? String(item.containerId) : '';
      for (const key of ['acBonus', 'speedBonus', 'initiativeBonus', 'attackBonus', 'damageBonus']) {
        if (item[key] != null) item[key] = number(item[key], 0);
      }
      if (item.armorBase != null && item.armorBase !== '') item.armorBase = Math.max(0, number(item.armorBase, 10));
      if (item.attunement) item.isAttuned = !!item.isAttuned;
      return item;
    });
  }

  function migrateLegacyBackpack(character) {
    const gear = character.gear;
    const all = () => [...gear.weapons, ...gear.armor, ...gear.inventory];
    const legacyItems = all().filter(item => item.location === 'backpack');
    if (!legacyItems.length) return;
    let backpack = all().find(item => /^backpack$/i.test(String(item.name || '').trim()) && item.isContainer);
    if (!backpack) {
      backpack = {
        id: 'item-backpack', name: 'Backpack', itemType: 'container', isContainer: true,
        location: 'back', quantity: 1, modifiers: [], containerId: '', capacity: '30 lb.',
        cost: { quantity: 2, unit: 'gp' }, weight: 5, source: 'SRD 5.2.1'
      };
      gear.inventory.push(backpack);
    }
    backpack.location = ITEM_LOCATIONS.includes(backpack.location) ? backpack.location : 'back';
    for (const item of legacyItems) {
      if (item.id === backpack.id) continue;
      if (!item.containerId) item.containerId = backpack.id;
      item.location = backpack.location;
    }
  }

  function migrateCanonicalChoices(th) {
    const choices = th.choices && typeof th.choices === 'object' ? th.choices : (th.choices = {});
    for (const key of CHOICE_ARRAYS) {
      const legacy = th[key];
      const current = choices[key];
      if (!Array.isArray(current) || !current.length || current.every(value => !value)) {
        choices[key] = Array.isArray(legacy) ? clone(legacy) : legacy ? [String(legacy)] : [];
      }
      delete th[key];
    }
    if (!choices.expertise && th.expertise) choices.expertise = th.expertise;
    delete th.expertise;
    choices.classSkills = unique(choices.classSkills);
    choices.ancientLanguages = array(choices.ancientLanguages).slice(0, 3);
    while (choices.ancientLanguages.length < 3) choices.ancientLanguages.push('');
    choices.vehicles = array(choices.vehicles).slice(0, 2);
    while (choices.vehicles.length < 2) choices.vehicles.push('');
    choices.weaponMasteries = unique(choices.weaponMasteries).filter(name => String(name).toLowerCase() !== 'whip').slice(0, 2);
    while (choices.weaponMasteries.length < 2) choices.weaponMasteries.push('');
    for (const key of ['feat4', 'feat8', 'feat12', 'feat16', 'epicBoon19']) choices[key] = array(choices[key]).filter(Boolean).slice(0, 1);
    choices.expertise = String(choices.expertise || '');
    choices.subclass = String(choices.subclass || '');
    choices.subclassConfirmed = !!choices.subclassConfirmed;
    choices.startingMelee = String(choices.startingMelee || '');
    choices.startingRanged = String(choices.startingRanged || '');
  }

  function normalize(state, options = {}) {
    const sourceSchema = number(state && state.schemaVersion, 0);
    const sourcePageId = state?.ui?.pageId;
    const sourceCurrencyWallets = state?.character?.gear?.currencyWallets;
    const sourceLegacyMoney = clone(state?.character?.gear?.money || {});
    const s = merge(baseState(), state || {});
    s.schemaVersion = SCHEMA_VERSION;
    s.appVersion = APP_VERSION;

    const c = s.character;
    c.level = clamp(c.level, 1, 20);
    c.name = String(c.name || '');
    c.race = String(c.race || '');
    c.conditions = unique(c.conditions);
    c.skills = c.skills && typeof c.skills === 'object' && !Array.isArray(c.skills) ? c.skills : {};
    if (c.conditions.includes('Exhaustion')) {
      c.conditions = c.conditions.filter(value => value !== 'Exhaustion');
      c.exhaustion = Math.max(1, number(c.exhaustion, 0));
    }
    c.exhaustion = clamp(c.exhaustion, 0, 6);
    c.inspiration = !!c.inspiration;
    c.acMode = c.acMode === 'manual' ? 'manual' : 'auto';
    c.acManual = Math.max(0, number(c.acManual, c.ac || 10));
    c.acBonus = number(c.acBonus, 0);
    c.speed = Math.max(0, number(c.speed, 30));
    c.initiativeBonus = number(c.initiativeBonus, 0);
    for (const ability of A) c.abilities[ability] = clamp(c.abilities[ability], 1, 30);

    c.hp.current = Math.max(0, number(c.hp.current, 10));
    c.hp.max = Math.max(1, number(c.hp.max, 10));
    c.hp.temp = Math.max(0, number(c.hp.temp, 0));
    c.hp.auto = c.hp.auto !== false;
    c.hitDice.d10.spent = clamp(c.hitDice.d10.spent, 0, c.level);
    c.deathSaves.successes = clamp(c.deathSaves.successes, 0, 3);
    c.deathSaves.failures = clamp(c.deathSaves.failures, 0, 3);

    for (const key of ['resistances', 'immunities', 'vulnerabilities', 'conditionImmunities']) {
      c.damageDefenses[key] = unique(c.damageDefenses[key]);
    }
    for (const key of ['languages', 'vehicles', 'tools', 'weapons', 'armor', 'senses', 'defenses']) {
      c.proficiencies[key] = unique(c.proficiencies[key]);
    }
    c.customActions = normalizeItems(c.customActions, 'action');
    c.spells = normalizeItems(c.spells, 'spell');
    const gearIds = new Set();
    c.gear.inventory = normalizeItems(c.gear.inventory, 'item', gearIds);
    c.gear.weapons = normalizeItems(c.gear.weapons, 'weapon', gearIds);
    c.gear.armor = normalizeItems(c.gear.armor, 'armor', gearIds);
    migrateLegacyBackpack(c);
    const allGear = [...c.gear.inventory, ...c.gear.weapons, ...c.gear.armor];
    if (sourceSchema < 14) {
      for (const item of allGear) {
        const ammunition = (item.tags || []).includes('ammunition') || /ammunition/i.test(`${item.category || ''} ${item.raw?.equipment_category?.name || ''}`);
        if (!ammunition || item.quantity <= 1 || item.bundleSize) continue;
        item.bundleSize = item.quantity;
        item.quantity = 1;
        if (!new RegExp(`\\(${item.bundleSize}\\)`).test(item.name)) item.name = `${item.name} (${item.bundleSize})`;
      }
    }
    const gearById = new Map(allGear.map(item => [item.id, item]));
    for (const item of allGear) {
      const parent = gearById.get(item.containerId);
      if (!parent?.isContainer || parent.id === item.id) { item.containerId = ''; continue; }
      const visited = new Set([item.id]);
      let cursor = parent;
      while (cursor?.containerId && !visited.has(cursor.containerId)) {
        visited.add(cursor.containerId);
        cursor = gearById.get(cursor.containerId);
      }
      if (cursor?.containerId && visited.has(cursor.containerId)) item.containerId = '';
    }
    const currencyIds = new Set((GearRules?.WORLD_CURRENCIES || [{ id: 'generic' }]).map(currency => currency.id));
    const wallets = {};
    for (const [id, wallet] of Object.entries(c.gear.currencyWallets || {})) {
      if (!currencyIds.has(id) || !wallet || typeof wallet !== 'object') continue;
      wallets[id] = {
        g: Math.max(0, Math.floor(number(wallet.g, 0))),
        s: Math.max(0, Math.floor(number(wallet.s, 0))),
        c: Math.max(0, Math.floor(number(wallet.c, 0)))
      };
    }
    if (!sourceCurrencyWallets || typeof sourceCurrencyWallets !== 'object') {
      const legacyCp = Math.max(0, Math.floor(number(sourceLegacyMoney.pp))) * 1000 +
        Math.max(0, Math.floor(number(sourceLegacyMoney.gp))) * 100 +
        Math.max(0, Math.floor(number(sourceLegacyMoney.ep))) * 50 +
        Math.max(0, Math.floor(number(sourceLegacyMoney.sp))) * 10 +
        Math.max(0, Math.floor(number(sourceLegacyMoney.cp)));
      wallets.generic = { g: Math.floor(legacyCp / 100), s: Math.floor(legacyCp % 100 / 10), c: legacyCp % 10 };
    }
    if (!wallets.generic) wallets.generic = { g: 0, s: 0, c: 0 };
    c.gear.currencyWallets = wallets;
    c.gear.favoriteCurrencyId = currencyIds.has(c.gear.favoriteCurrencyId) ? c.gear.favoriteCurrencyId : 'generic';
    c.gear.currencyDisplayMode = c.gear.currencyDisplayMode === 'favorite' ? 'favorite' : 'total';
    c.gear.currencyTransactions = array(c.gear.currencyTransactions).map((entry, index) => ({
      id: String(entry?.id || `exchange-${index + 1}`), at: String(entry?.at || ''),
      fromId: currencyIds.has(entry?.fromId) ? entry.fromId : 'generic',
      toId: currencyIds.has(entry?.toId) ? entry.toId : 'generic',
      sentCp: Math.max(0, Math.floor(number(entry?.sentCp))), receivedCp: Math.max(0, Math.floor(number(entry?.receivedCp))),
      feePercent: clamp(entry?.feePercent, 0, 100)
    })).filter(entry => entry.fromId !== entry.toId && entry.sentCp > 0).slice(-50);
    c.gear.otherPossessions = String(c.gear.otherPossessions || '');
    c.gear.money = { gp: wallets.generic.g, ep: 0, sp: wallets.generic.s, cp: wallets.generic.c, pp: 0 };
    c.gear.encumbranceMode = ['basic', 'balanced', 'variant'].includes(c.gear.encumbranceMode) ? c.gear.encumbranceMode : 'basic';
    c.gear.starting = c.gear.starting && typeof c.gear.starting === 'object' ? c.gear.starting : {};
    c.gear.starting.budgetGp = Math.max(0, Math.floor(number(c.gear.starting.budgetGp, 0)));
    c.gear.starting.finalized = !!c.gear.starting.finalized;
    c.gear.starting.remainderCp = Math.max(0, Math.floor(number(c.gear.starting.remainderCp, 0)));
    c.gear.starting.legacy = !!c.gear.starting.legacy;
    if (sourceSchema < 13) {
      c.gear.starting.finalized = true;
      c.gear.starting.legacy = true;
    }

    const validModes = new Set(['normal', 'advantage', 'disadvantage']);
    c.rollModes.initiative = validModes.has(c.rollModes.initiative) ? c.rollModes.initiative : 'normal';
    c.rollModes.attacks = validModes.has(c.rollModes.attacks) ? c.rollModes.attacks : 'normal';
    for (const bucket of ['skills', 'saves']) {
      if (!c.rollModes[bucket] || typeof c.rollModes[bucket] !== 'object') c.rollModes[bucket] = {};
      for (const key of Object.keys(c.rollModes[bucket])) {
        if (!validModes.has(c.rollModes[bucket][key])) c.rollModes[bucket][key] = 'normal';
      }
    }

    const origin = c.origin;
    origin.species = String(origin.species || c.race || '');
    origin.speciesChoices.skills = unique(origin.speciesChoices.skills).slice(0, 2);
    origin.speciesChoices.simpleWeapon = String(origin.speciesChoices.simpleWeapon || '');
    const background = origin.background;
    background.name = String(background.name || 'Lukyho univerzální background');
    background.skills = unique(background.skills).slice(0, 2);
    background.abilityMode = background.abilityMode === '+1/+1/+1' ? '+1/+1/+1' : '+2/+1';
    background.abilityChoices = unique(background.abilityChoices).filter(value => A.includes(value)).slice(0, background.abilityMode === '+1/+1/+1' ? 3 : 2);
    background.skilledChoices = unique(background.skilledChoices).slice(0, 3);
    background.luckUsed = Math.max(0, Math.floor(number(background.luckUsed, 0)));

    if (sourceSchema < SCHEMA_VERSION && !options.skipAbilityMigration && background.appliedBonuses && !origin.v9AbilityMigration) {
      for (const [ability, bonus] of Object.entries(background.appliedBonuses)) {
        if (A.includes(ability)) c.abilities[ability] = clamp(c.abilities[ability] - number(bonus, 0), 1, 30);
      }
      origin.v9AbilityMigration = true;
    }
    delete background.appliedBonuses;
    if (sourceSchema < SCHEMA_VERSION && origin.species === 'City Goblin' && c.speed === 25) c.speed = 30;

    const th = s.classes.treasureHunter;
    migrateCanonicalChoices(th);
    if (sourceSchema < 14) {
      th.choices.subclass = '';
      th.choices.subclassConfirmed = false;
    }
    if (sourceSchema < SCHEMA_VERSION && !origin.v9GrantMigration) {
      const generatedSkills = unique([
        ...(th.choices.classSkills || []), ...(origin.speciesChoices.skills || []), ...(background.skills || []),
        ...(background.feat === 'Skilled' ? background.skilledChoices || [] : []), th.choices.expertise
      ]);
      for (const skill of generatedSkills) delete c.skills[skill];
      const generatedTools = unique([background.tool, background.secondary, ...(background.feat === 'Skilled' ? background.skilledChoices || [] : [])]);
      c.proficiencies.tools = c.proficiencies.tools.filter(value => !generatedTools.includes(value));
      c.proficiencies.weapons = c.proficiencies.weapons.filter(value => value !== origin.speciesChoices.simpleWeapon);
      if (origin.species === 'City Goblin') c.proficiencies.senses = c.proficiencies.senses.filter(value => !['Darkvision 60 ft.', 'Blindsight 10 ft.'].includes(value));
      origin.v9GrantMigration = true;
    }
    th.coolUsed = Math.max(0, Math.floor(number(th.coolUsed, 0)));
    th.featureUses = th.featureUses && typeof th.featureUses === 'object' ? th.featureUses : {};
    const relicIds = new Set();
    th.relics = array(th.relics).map((source, index) => {
      const relic = typeof source === 'string' ? { relicId: source } : source;
      relic.relicId = String(relic.relicId || relic.id || '');
      relic.instanceId = stableId('relic', relic.instanceId, index, relicIds);
      delete relic.id;
      relic.prepared = !!relic.prepared;
      relic.used = Math.max(0, Math.floor(number(relic.used, 0)));
      return relic;
    }).filter(relic => relic.relicId);

    const npcIds = new Set();
    s.campaign.npcs = array(s.campaign.npcs).map((npc, index) => {
      npc = npc && typeof npc === 'object' ? npc : { name: String(npc || 'NPC') };
      npc.id = stableId('npc', npc.id, index, npcIds);
      npc.name = String(npc.name || 'NPC');
      npc.profession = String(npc.profession || npc.tag || '');
      npc.nationality = String(npc.nationality || '');
      npc.location = String(npc.location || '');
      npc.notes = String(npc.notes || '');
      npc.image = String(npc.image || '');
      npc.favorite = !!npc.favorite;
      npc.createdAt = String(npc.createdAt || npc.addedAt || new Date(index * 1000).toISOString());
      npc.updatedAt = String(npc.updatedAt || npc.createdAt);
      npc.relations = array(npc.relations).map(relation => relation && typeof relation === 'object' ? {
        npcId: String(relation.npcId || relation.id || ''), type: String(relation.type || relation.label || '')
      } : { npcId: String(relation || ''), type: '' });
      return npc;
    });
    const validNpcIds = new Set(s.campaign.npcs.map(npc => npc.id));
    for (const npc of s.campaign.npcs) {
      const seenRelations = new Set();
      npc.relations = npc.relations.filter(relation => {
        if (!validNpcIds.has(relation.npcId) || relation.npcId === npc.id || seenRelations.has(relation.npcId)) return false;
        seenRelations.add(relation.npcId);
        return true;
      });
    }
    const journalIds = new Set();
    const legacyNotes = sourceSchema < 16 ? array(s.campaign.notes).map((note, index) => typeof note === 'string' ? {
      id: `legacy-note-${index + 1}`, title: `Imported note ${index + 1}`, body: note, type: 'note'
    } : note) : [];
    s.campaign.journal = [...array(s.campaign.journal), ...legacyNotes].map((entry, index) => {
      entry = entry && typeof entry === 'object' ? entry : { body: String(entry || '') };
      entry.id = stableId('journal', entry.id, index, journalIds);
      entry.title = String(entry.title || 'Untitled entry');
      entry.type = ['session', 'quest', 'clue', 'location', 'note'].includes(entry.type) ? entry.type : 'note';
      entry.date = String(entry.date || '');
      entry.location = String(entry.location || '');
      entry.body = String(entry.body || entry.notes || '');
      entry.favorite = !!entry.favorite;
      entry.createdAt = String(entry.createdAt || new Date(index * 1000).toISOString());
      entry.updatedAt = String(entry.updatedAt || entry.createdAt);
      entry.npcIds = unique(entry.npcIds).filter(id => validNpcIds.has(id));
      entry.itemIds = unique(entry.itemIds).filter(id => gearById.has(id));
      entry.relicIds = unique(entry.relicIds).filter(id => th.relics.some(relic => relic.instanceId === id));
      return entry;
    });
    if (sourceSchema < 16) s.campaign.notes = [];

    const ui = s.ui;
    ui.page = clamp(ui.page, 0, 7);
    ui.socialTab = ui.socialTab === 'bio' ? 'bio' : 'npcs';
    ui.npcSort = ['alphabetical', 'chronological', 'favorites'].includes(ui.npcSort) ? ui.npcSort : 'alphabetical';
    ui.campaignView = ['directory', 'journal', 'relations'].includes(ui.campaignView) ? ui.campaignView : 'directory';
    ui.featureView = ui.featureView === 'progression' ? 'progression' : 'available';
    ui.featureFilter = ['all', 'active', 'passive', 'subclass'].includes(ui.featureFilter) ? ui.featureFilter : 'all';
    ui.actionFilter = ['all', 'attack', 'action', 'bonus', 'reaction', 'other'].includes(ui.actionFilter) ? ui.actionFilter : 'all';
    ui.pageId = PAGE_IDS.includes(sourcePageId) ? sourcePageId : PAGE_IDS[ui.page];
    ui.page = PAGE_IDS.indexOf(ui.pageId);
    for (const key of ['favoriteFeatures', 'favoriteActions', 'openFeatures', 'openActions', 'openRelics', 'openItems']) ui[key] = unique(ui[key]);
    return s;
  }

  function migrateVeryOld(old) {
    if (old && old.character && old.classes) return old;
    const next = baseState();
    const c = old && old.character && typeof old.character === 'object' ? old.character : (old || {});
    next.character.name = old?.name || old?.characterName || c.name || '';
    next.character.race = old?.race?.name || old?.raceName || c.race || '';
    next.character.level = old?.level || c.level || 1;
    next.character.portrait = old?.portrait || c.portrait || old?.characterPortrait || '';
    const hp = old?.hp || c.hp || {};
    next.character.hp.max = old?.hpMax || old?.maxHp || hp.max || 10;
    next.character.hp.current = old?.hpCurrent || old?.currentHp || hp.current || next.character.hp.max;
    next.character.hp.temp = old?.tempHp || hp.temp || 0;
    for (const ability of A) {
      const lower = ability.toLowerCase();
      const value = old?.abilities?.[ability] ?? old?.abilities?.[lower] ?? c.abilities?.[ability] ?? old?.[lower] ?? old?.[ability];
      if (value != null) next.character.abilities[ability] = value;
    }
    if (Array.isArray(old?.conditions || c.conditions)) next.character.conditions = clone(old.conditions || c.conditions);
    if (Array.isArray(old?.npcs || old?.campaign?.npcs)) next.campaign.npcs = clone(old.npcs || old.campaign.npcs);
    if (Array.isArray(old?.inventory)) next.character.gear.inventory = clone(old.inventory);
    if (old?.treasure && typeof old.treasure === 'object') merge(next.classes.treasureHunter, old.treasure);
    if (Array.isArray(old?.relics)) next.classes.treasureHunter.relics = clone(old.relics);
    return next;
  }

  function readStorage(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function load() {
    const current = readStorage(KEY);
    if (current) return normalize(current, { skipAbilityMigration: true });
    for (const legacyKey of LEGACY_KEYS) {
      const legacy = readStorage(legacyKey);
      if (!legacy) continue;
      const migrated = normalize(migrateVeryOld(legacy));
      migrated.migration = { from: legacyKey, at: new Date().toISOString() };
      writeStorage(KEY, migrated);
      return migrated;
    }
    return normalize(baseState(), { skipAbilityMigration: true });
  }

  let state = load();
  let timer = 0;
  const listeners = new Set();
  const undoStack = [];

  function shouldTrack(reason) {
    return !/^(ui:|derived:|history:|roster:)/.test(String(reason || ''));
  }

  function recordUndo(before, reason) {
    undoStack.push({ before, reason: String(reason || 'update'), at: new Date().toISOString() });
    if (undoStack.length > HISTORY_LIMIT) undoStack.splice(0, undoStack.length - HISTORY_LIMIT);
  }

  function notify(reason) {
    for (const listener of listeners) {
      try { listener(state, reason); } catch (error) { console.error(error); }
    }
  }

  function persist() {
    timer = 0;
    normalize(state, { skipAbilityMigration: true });
    return writeStorage(KEY, state);
  }

  function save() {
    clearTimeout(timer);
    timer = setTimeout(persist, 80);
  }

  function flush() {
    clearTimeout(timer);
    timer = 0;
    return persist();
  }

  function update(mutator, reason = 'update') {
    if (typeof mutator !== 'function') throw new TypeError('State update requires a function.');
    const before = shouldTrack(reason) ? clone(state) : null;
    mutator(state);
    state = normalize(state, { skipAbilityMigration: true });
    if (before && JSON.stringify(before) !== JSON.stringify(state)) recordUndo(before, reason);
    save();
    notify(reason);
    return state;
  }

  function replace(next, reason = 'replace') {
    if (/^roster:/.test(String(reason || ''))) clearHistory();
    const before = shouldTrack(reason) ? clone(state) : null;
    state = normalize(next || {}, { skipAbilityMigration: Number(next?.schemaVersion) >= SCHEMA_VERSION });
    if (before && JSON.stringify(before) !== JSON.stringify(state)) recordUndo(before, reason);
    save();
    notify(reason);
    return state;
  }

  function undo() {
    const entry = undoStack.pop();
    if (!entry) return null;
    state = normalize(entry.before, { skipAbilityMigration: true });
    save();
    notify('history:undo');
    return { reason: entry.reason, at: entry.at };
  }

  function history() {
    return undoStack.slice().reverse().map(({ reason, at }) => ({ reason, at }));
  }

  function clearHistory() { undoStack.length = 0; }

  function modifier(score) { return Math.floor((number(score, 10) - 10) / 2); }
  function signed(value) { return number(value, 0) >= 0 ? `+${number(value, 0)}` : String(number(value, 0)); }

  async function imageToThumb(file, max = 420, quality = 0.78) {
    if (!file) return '';
    const source = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = reject;
      element.src = source;
    });
    const scale = Math.min(1, max / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
  }

  const api = {
    KEY, LEGACY_KEYS, SCHEMA_VERSION, APP_VERSION, A, ITEM_LOCATIONS,
    get: () => state,
    update, replace, save, flush, undo, history, clearHistory,
    fresh: () => normalize(baseState(), { skipAbilityMigration: true }),
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    modifier, signed, clone, uid, normalize, imageToThumb
  };

  window.CharacterState = api;
  window.V7SStateV7s = api;
})();
