(function () {
  'use strict';

  const S = window.CharacterState;
  const D = window.CharacterDerived;
  const T = window.TreasureHunterDataV7s;
  const Relics = window.TreasureHunterRelicsV7s || [];
  const Origin = window.CharacterOrigin;
  if (!S || !D || !T || !Origin) return;

  const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, number(value, min)));
  const unique = values => [...new Set((values || []).filter(Boolean))];

  function update(mutator, reason) { return S.update(mutator, reason); }

  function applyDamage(amount, damageType = '') {
    const requested = Math.max(0, Math.floor(number(amount)));
    let result = null;
    update(state => {
      const defenses = D.damageDefenses(state);
      let applied = requested;
      const steps = [];
      if (damageType && defenses.immunities.includes(damageType)) {
        applied = 0;
        steps.push('immunity');
      } else {
        if (damageType && defenses.resistances.includes(damageType)) {
          applied = Math.floor(applied / 2);
          steps.push('resistance');
        }
        if (damageType && defenses.vulnerabilities.includes(damageType)) {
          applied *= 2;
          steps.push('vulnerability');
        }
      }
      const hp = state.character.hp;
      const absorbed = Math.min(Math.max(0, number(hp.temp)), applied);
      hp.temp = Math.max(0, number(hp.temp) - absorbed);
      const hpDamage = Math.max(0, applied - absorbed);
      hp.current = Math.max(0, number(hp.current) - hpDamage);
      result = { requested, damageType, applied, absorbed, hpDamage, steps, current: hp.current, temp: hp.temp };
    }, 'hp:damage');
    return result;
  }

  function heal(amount) {
    let result = null;
    update(state => {
      const max = D.hpMax(state);
      const before = Math.max(0, number(state.character.hp.current));
      state.character.hp.current = Math.min(max, before + Math.max(0, Math.floor(number(amount))));
      result = { healed: state.character.hp.current - before, current: state.character.hp.current, max };
    }, 'hp:heal');
    return result;
  }

  function setTempHp(amount) {
    update(state => { state.character.hp.temp = Math.max(0, Math.floor(number(amount))); }, 'hp:temp');
  }

  function setHpCurrent(amount) {
    update(state => { state.character.hp.current = clamp(amount, 0, D.hpMax(state)); }, 'hp:set-current');
  }

  function reconcileDerived() {
    const source = S.get();
    const max = D.hpMax(source);
    if (Number(source.character.hp.max) === max && Number(source.character.hp.current) <= max) return false;
    update(state => {
      state.character.hp.max = D.hpMax(state);
      state.character.hp.current = clamp(state.character.hp.current, 0, state.character.hp.max);
    }, 'derived:reconcile');
    return true;
  }

  function toggleInspiration() {
    update(state => { state.character.inspiration = !state.character.inspiration; }, 'inspiration:toggle');
  }

  function spendCool(amount = 1) {
    const cost = Math.max(0, Math.floor(number(amount)));
    if (cost === 0) return true;
    const current = S.get();
    const max = T.coolTotal(D.level(current));
    const used = Math.max(0, number(current.classes.treasureHunter.coolUsed));
    if (max - used < cost) return false;
    update(state => { state.classes.treasureHunter.coolUsed = Math.min(max, number(state.classes.treasureHunter.coolUsed) + cost); }, 'cool:spend');
    return true;
  }

  function adjustCool(delta) {
    update(state => {
      const max = T.coolTotal(D.level(state));
      state.classes.treasureHunter.coolUsed = clamp(number(state.classes.treasureHunter.coolUsed) + number(delta), 0, max);
    }, 'cool:adjust');
  }

  function adjustLuck(delta) {
    update(state => {
      const background = state.character.origin.background;
      background.luckUsed = clamp(number(background.luckUsed) + number(delta), 0, D.pb(state));
    }, 'luck:adjust');
  }

  function rest(kind) {
    const long = kind === 'long' || kind === 'LR';
    update(state => {
      const th = state.classes.treasureHunter;
      th.coolUsed = 0;
      for (const [id] of Object.entries(th.featureUses || {})) {
        const feature = T.features.find(item => item.id === id);
        if (feature && (long || feature.recovery === 'SR')) th.featureUses[id] = 0;
      }
      for (const entry of th.relics || []) {
        const relic = Relics.find(item => item.id === entry.relicId);
        if (relic && (long || relic.recovery === 'SR')) entry.used = 0;
      }
      if (long) {
        state.character.hp.current = D.hpMax(state);
        state.character.hp.temp = 0;
        state.character.exhaustion = Math.max(0, number(state.character.exhaustion) - 1);
        state.character.hitDice.d10.spent = Math.max(0, number(state.character.hitDice.d10.spent) - Math.max(1, Math.ceil(D.level(state) / 2)));
        state.character.deathSaves = { successes: 0, failures: 0 };
        state.character.origin.background.luckUsed = 0;
      }
    }, long ? 'rest:long' : 'rest:short');
  }

  function toggleFeatureUse(featureId, delta) {
    const feature = T.features.find(item => item.id === featureId);
    const max = Math.max(1, number(feature?.uses, 1));
    update(state => {
      const uses = state.classes.treasureHunter.featureUses;
      uses[featureId] = clamp(number(uses[featureId]) + number(delta), 0, max);
    }, 'feature:use');
  }

  function addRelic(relicId) {
    const source = S.get();
    const limits = T.relicLimit(D.level(source));
    if (!Relics.some(relic => relic.id === relicId && relic.level <= D.level(source))) return { ok: false, reason: 'unavailable' };
    if (source.classes.treasureHunter.relics.some(relic => relic.relicId === relicId)) return { ok: false, reason: 'duplicate' };
    if (source.classes.treasureHunter.relics.length >= limits[2]) return { ok: false, reason: 'capacity' };
    update(state => {
      state.classes.treasureHunter.relics.push({ instanceId: S.uid('relic'), relicId, prepared: false, used: 0 });
    }, 'relic:add');
    return { ok: true };
  }

  function removeRelic(instanceId) {
    update(state => { state.classes.treasureHunter.relics = state.classes.treasureHunter.relics.filter(relic => relic.instanceId !== instanceId); }, 'relic:remove');
  }

  function toggleRelicPrepared(instanceId) {
    const source = S.get();
    const current = source.classes.treasureHunter.relics.find(relic => relic.instanceId === instanceId);
    if (!current) return { ok: false, reason: 'missing' };
    const next = !current.prepared;
    const prepared = source.classes.treasureHunter.relics.filter(relic => relic.prepared).length;
    if (next && prepared >= T.relicLimit(D.level(source))[0]) return { ok: false, reason: 'prepared-capacity' };
    update(state => {
      const relic = state.classes.treasureHunter.relics.find(item => item.instanceId === instanceId);
      if (relic) relic.prepared = next;
    }, 'relic:prepare');
    return { ok: true, prepared: next };
  }

  function adjustRelicUse(instanceId, delta) {
    let changed = false;
    update(state => {
      const relic = state.classes.treasureHunter.relics.find(item => item.instanceId === instanceId);
      if (!relic) return;
      const max = D.relicMax(relic, state);
      relic.used = clamp(number(relic.used) + number(delta), 0, max);
      changed = true;
    }, 'relic:use');
    return changed;
  }

  function setRelicChoice(instanceId, key, value) {
    update(state => {
      const relic = state.classes.treasureHunter.relics.find(item => item.instanceId === instanceId);
      if (relic) relic[key] = value;
    }, 'relic:choice');
  }

  function setChoice(key, value, index = null) {
    update(state => {
      const choices = state.classes.treasureHunter.choices;
      if (index == null) choices[key] = value;
      else {
        if (!Array.isArray(choices[key])) choices[key] = [];
        choices[key][index] = value;
      }
    }, 'choice:set');
  }

  function setClassSkills(skills) {
    update(state => { state.classes.treasureHunter.choices.classSkills = unique(skills).slice(0, 3); }, 'choice:class-skills');
  }

  function setRollMode(kind, key, mode) {
    const valid = ['normal', 'advantage', 'disadvantage'];
    if (!valid.includes(mode)) return false;
    const fixed = D.effectiveRollMode(kind, key, S.get());
    if (fixed.locked) return false;
    update(state => {
      if (kind === 'initiative') state.character.rollModes.initiative = mode;
      else if (kind === 'attack') state.character.rollModes.attacks = mode;
      else state.character.rollModes[kind === 'save' ? 'saves' : 'skills'][key] = mode;
    }, 'roll-mode:set');
    return true;
  }

  function addCondition(condition) {
    if (!condition) return false;
    const source = S.get();
    if (D.damageDefenses(source).conditionImmunities.includes(condition)) return false;
    update(state => { state.character.conditions = unique([...state.character.conditions, condition]); }, 'condition:add');
    return true;
  }

  function removeCondition(condition) {
    update(state => { state.character.conditions = state.character.conditions.filter(item => item !== condition); }, 'condition:remove');
  }

  function adjustExhaustion(delta) {
    update(state => { state.character.exhaustion = clamp(number(state.character.exhaustion) + number(delta), 0, 6); }, 'exhaustion:adjust');
  }

  function addDefense(kind, value) {
    const key = { resistance: 'resistances', immunity: 'immunities', vulnerability: 'vulnerabilities', conditionImmunity: 'conditionImmunities' }[kind];
    if (!key || !value) return;
    update(state => { state.character.damageDefenses[key] = unique([...state.character.damageDefenses[key], value]); }, 'defense:add');
  }

  function removeDefense(kind, value) {
    const key = { resistance: 'resistances', immunity: 'immunities', vulnerability: 'vulnerabilities', conditionImmunity: 'conditionImmunities' }[kind];
    if (!key) return;
    update(state => { state.character.damageDefenses[key] = state.character.damageDefenses[key].filter(item => item !== value); }, 'defense:remove');
  }

  function setSkillManual(name, status) {
    update(state => { state.character.skills[name] = clamp(status, 0, 2); }, 'skill:set');
  }

  function backgroundPayload(source = {}) {
    return {
      name: Origin.BACKGROUND.name,
      skills: unique(source.skills).slice(0, 2), tool: String(source.tool || ''), secondary: String(source.secondary || ''),
      feat: String(source.feat || ''), abilityMode: source.abilityMode === '+1/+1/+1' ? '+1/+1/+1' : '+2/+1',
      abilityChoices: unique(source.abilityChoices).filter(ability => S.A.includes(ability)).slice(0, source.abilityMode === '+1/+1/+1' ? 3 : 2),
      resilientAbility: String(source.resilientAbility || ''), skilledChoices: unique(source.skilledChoices).slice(0, 3),
      luckUsed: Math.max(0, number(source.luckUsed))
    };
  }

  function applyOrigin(speciesName, speciesChoices, background) {
    update(state => {
      const selected = Origin.SPECIES.find(species => species.name === speciesName || species.id === speciesName);
      state.character.origin.species = selected?.name || speciesName || '';
      state.character.race = state.character.origin.species;
      state.character.size = selected?.mechanicsAvailable ? selected.size || '' : '';
      state.character.origin.speciesChoices = {
        skills: unique(speciesChoices?.skills).slice(0, 2), simpleWeapon: String(speciesChoices?.simpleWeapon || '')
      };
      state.character.origin.background = backgroundPayload(background);
      state.character.bio.background = Origin.BACKGROUND.name;
    }, 'origin:apply');
  }

  function saveBuilder(payload) {
    const source = S.get();
    const oldMax = D.hpMax(source);
    const oldDamage = Math.max(0, oldMax - number(source.character.hp.current));
    update(state => {
      const c = state.character;
      const th = state.classes.treasureHunter;
      c.name = String(payload.name || '').trim();
      c.level = clamp(payload.level, 1, 20);
      c.origin.species = String(payload.species || '');
      c.race = c.origin.species;
      const speciesDefinition = Origin.SPECIES.find(species => species.name === c.origin.species || species.id === c.origin.species);
      c.size = speciesDefinition?.mechanicsAvailable ? speciesDefinition.size || '' : '';
      c.origin.speciesChoices = {
        skills: unique(payload.speciesChoices?.skills).slice(0, 2), simpleWeapon: String(payload.speciesChoices?.simpleWeapon || '')
      };
      c.origin.background = backgroundPayload(payload.background);
      c.bio.background = Origin.BACKGROUND.name;
      const bonuses = Origin.abilityBonuses(state);
      for (const ability of S.A) {
        const resilient = c.origin.background.feat === 'Resilient' && c.origin.background.resilientAbility === ability ? 1 : 0;
        c.abilities[ability] = clamp(number(payload.abilities?.[ability], 10) - number(bonuses[ability]) - resilient, 1, 30);
      }
      th.choices.classSkills = unique(payload.classSkills).slice(0, 3);
      th.choices.ancientLanguages = (payload.ancientLanguages || []).slice(0, 3);
      th.choices.vehicles = (payload.vehicles || []).slice(0, 2);
      th.choices.expertise = String(payload.expertise || '');
      th.choices.weaponMasteries = (payload.weaponMasteries || []).slice(0, 2);
      th.choices.startingMelee = String(payload.startingMelee || '');
      th.choices.startingRanged = String(payload.startingRanged || '');
      c.hp.auto = payload.hpAuto !== false;
      if (!c.hp.auto) c.hp.max = Math.max(1, number(payload.hpMax, c.hp.max));
      const nextMax = D.hpMax(state);
      c.hp.max = nextMax;
      c.hp.current = Math.max(0, Math.min(nextMax, nextMax - oldDamage));
      th.coolUsed = clamp(th.coolUsed, 0, T.coolTotal(c.level));
    }, 'builder:save');
  }

  function saveQuickCharacter(payload) {
    const source = S.get();
    const oldDamage = Math.max(0, D.hpMax(source) - number(source.character.hp.current));
    update(state => {
      const c = state.character;
      c.name = String(payload.name || '').trim();
      c.level = clamp(payload.level, 1, 20);
      c.portrait = payload.portrait ?? c.portrait;
      c.hp.auto = payload.hpAuto !== false;
      c.acMode = payload.acMode === 'manual' ? 'manual' : 'auto';
      c.acManual = Math.max(0, number(payload.acManual, c.acManual));
      c.speed = Math.max(0, number(payload.speed, c.speed));
      c.initiativeBonus = number(payload.initiativeBonus, c.initiativeBonus);
      const bonuses = Origin.abilityBonuses(state);
      for (const ability of S.A) {
        const resilient = Origin.backgroundFeat(state) === 'Resilient' && Origin.background(state).resilientAbility === ability ? 1 : 0;
        c.abilities[ability] = clamp(number(payload.abilities?.[ability], D.ability(ability, state)) - number(bonuses[ability]) - resilient, 1, 30);
      }
      if (!c.hp.auto) c.hp.max = Math.max(1, number(payload.hpMax, c.hp.max));
      const nextMax = D.hpMax(state);
      c.hp.max = nextMax;
      c.hp.current = Math.max(0, Math.min(nextMax, nextMax - oldDamage));
    }, 'character:save');
  }

  function addItem(item, location = 'backpack') {
    const next = S.clone(item || {});
    next.id = S.uid('item');
    next.location = S.ITEM_LOCATIONS.includes(location) ? location : 'backpack';
    next.quantity = Math.max(1, number(next.quantity, 1));
    update(state => { state.character.gear.inventory.push(next); }, 'item:add');
    return next.id;
  }

  function updateItem(id, changes) {
    update(state => {
      const item = state.character.gear.inventory.find(entry => entry.id === id) || state.character.gear.weapons.find(entry => entry.id === id) || state.character.gear.armor.find(entry => entry.id === id);
      if (item) Object.assign(item, S.clone(changes || {}));
    }, 'item:update');
  }

  function removeItem(id) {
    update(state => {
      const gear = state.character.gear;
      gear.inventory = gear.inventory.filter(item => item.id !== id);
      gear.weapons = gear.weapons.filter(item => item.id !== id);
      gear.armor = gear.armor.filter(item => item.id !== id);
      for (const item of [...gear.inventory, ...gear.weapons, ...gear.armor]) if (item.containerId === id) item.containerId = '';
    }, 'item:remove');
  }

  function setMoney(values) {
    update(state => {
      for (const coin of ['gp', 'ep', 'sp', 'cp']) state.character.gear.money[coin] = Math.max(0, Math.floor(number(values[coin])));
    }, 'money:set');
  }

  function addCustomAction(payload) {
    update(state => {
      state.character.customActions.push({
        id: S.uid('action'), name: String(payload.name || 'Custom Action'), action: payload.action || 'Action',
        group: payload.group || 'custom', damage: String(payload.damage || ''), summary: String(payload.summary || ''), source: 'Custom', custom: true
      });
    }, 'action:add');
  }

  function removeCustomAction(id) {
    update(state => { state.character.customActions = state.character.customActions.filter(action => action.id !== id); }, 'action:remove');
  }

  function toggleFavorite(kind, id) {
    update(state => {
      const key = kind === 'feature' ? 'favoriteFeatures' : 'favoriteActions';
      const list = state.ui[key];
      state.ui[key] = list.includes(id) ? list.filter(item => item !== id) : [...list, id];
    }, 'ui:favorite');
  }

  function toggleOpen(kind, id) {
    const key = { feature: 'openFeatures', action: 'openActions', relic: 'openRelics', item: 'openItems' }[kind];
    if (!key) return;
    update(state => {
      const list = state.ui[key];
      state.ui[key] = list.includes(id) ? list.filter(item => item !== id) : [...list, id];
    }, 'ui:toggle-open');
  }

  function saveNpc(payload) {
    let id = payload.id || '';
    update(state => {
      const current = state.campaign.npcs.find(npc => npc.id === id);
      const next = {
        name: String(payload.name || 'NPC'), tag: String(payload.tag || ''), location: String(payload.location || ''),
        notes: String(payload.notes || ''), image: payload.image || '',
        favorite: payload.favorite == null ? !!current?.favorite : !!payload.favorite
      };
      if (current) Object.assign(current, next);
      else { id = S.uid('npc'); state.campaign.npcs.push({ id, ...next }); }
    }, 'npc:save');
    return id;
  }

  function deleteNpc(id) {
    update(state => { state.campaign.npcs = state.campaign.npcs.filter(npc => npc.id !== id); }, 'npc:delete');
  }

  function toggleNpcFavorite(id) {
    update(state => { const npc = state.campaign.npcs.find(item => item.id === id); if (npc) npc.favorite = !npc.favorite; }, 'npc:favorite');
  }

  function saveBio(values) {
    update(state => { for (const [key, value] of Object.entries(values || {})) state.character.bio[key] = String(value || '').trim(); }, 'bio:save');
  }

  function setUi(key, value) { update(state => { state.ui[key] = value; }, `ui:${key}`); }

  window.CharacterCommands = {
    applyDamage, heal, setTempHp, setHpCurrent, reconcileDerived, toggleInspiration, spendCool, adjustCool, adjustLuck, rest,
    toggleFeatureUse, addRelic, removeRelic, toggleRelicPrepared, adjustRelicUse, setRelicChoice,
    setChoice, setClassSkills, setRollMode, addCondition, removeCondition, adjustExhaustion,
    addDefense, removeDefense, setSkillManual, applyOrigin, saveBuilder, saveQuickCharacter,
    addItem, updateItem, removeItem, setMoney, addCustomAction, removeCustomAction,
    toggleFavorite, toggleOpen, saveNpc, deleteNpc, toggleNpcFavorite, saveBio, setUi
  };
})();
