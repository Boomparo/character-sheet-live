(function () {
  'use strict';

  const S = window.CharacterState;
  const D = window.CharacterDerived;
  const T = window.TreasureHunterDataV7s;
  const Relics = window.TreasureHunterRelicsV7s || [];
  const Origin = window.CharacterOrigin;
  const Rules = window.DND2024Rules;
  if (!S || !D || !T || !Origin || !Rules) return;

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
      const hasDefense = list => list.includes(damageType) || list.includes('All');
      if (damageType && hasDefense(defenses.immunities)) {
        applied = 0;
        steps.push('immunity');
      } else {
        if (damageType && hasDefense(defenses.resistances)) {
          applied = Math.floor(applied / 2);
          steps.push('resistance');
        }
        if (damageType && hasDefense(defenses.vulnerabilities)) {
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
    if (!D.subclassName(source)) return { ok: false, reason: 'subclass' };
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

  function allGearItems(state) {
    return [...state.character.gear.weapons, ...state.character.gear.armor, ...state.character.gear.inventory];
  }

  function syncStartingWeapon(state, slot, name, previousName) {
    const gear = state.character.gear;
    const marker = `starting-${slot}`;
    let item = allGearItems(state).find(candidate => candidate.startingChoice === marker);
    if (!name) {
      if (item) delete item.startingChoice;
      return;
    }
    if (item && String(previousName || '').toLowerCase() === String(name).toLowerCase()) return;
    const profile = Rules.startingWeaponProfile(name);
    if (!profile) return;
    if (!item) item = allGearItems(state).find(candidate => String(candidate.name || '').toLowerCase() === String(profile.name).toLowerCase());
    if (!item) {
      item = { id: S.uid(`weapon-${slot}`), location: 'backpack', quantity: 1, containerId: '', modifiers: [] };
      gear.weapons.push(item);
    }
    const identity = { id: item.id, location: item.location || 'backpack', quantity: Math.max(1, number(item.quantity, 1)), containerId: item.containerId || '', modifiers: Array.isArray(item.modifiers) ? item.modifiers : [] };
    delete item.raw;
    Object.assign(item, profile, identity, { source: 'Treasure Hunter starting equipment', startingChoice: marker, masteryWeapon: profile.name });
  }

  function syncStartingAmmunition(state, weaponName, previousName) {
    const gear = state.character.gear;
    let ammunition = gear.inventory.find(item => item.startingChoice === 'starting-ammunition');
    if (!weaponName) {
      if (ammunition) delete ammunition.startingChoice;
      return;
    }
    if (ammunition && String(previousName || '').toLowerCase() === String(weaponName).toLowerCase()) return;
    const profile = Rules.startingWeaponProfile(weaponName);
    if (!profile?.ammunition) return;
    const pack = allGearItems(state).find(item => item.isContainer && /explorer['’]s pack/i.test(item.name || ''));
    if (!ammunition) {
      ammunition = { id: S.uid('starting-ammo'), itemType: 'item', location: pack?.location || 'backpack', containerId: pack?.id || '', modifiers: [] };
      gear.inventory.push(ammunition);
    }
    Object.assign(ammunition, {
      name: profile.ammunition, itemType: 'item', quantity: 20, source: 'Treasure Hunter starting equipment',
      startingChoice: 'starting-ammunition', location: pack?.location || ammunition.location || 'backpack', containerId: pack?.id || ''
    });
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
      const occupiedProficiencies = new Set();
      const takeUnique = (values, count) => unique(values).filter(value => {
        if (occupiedProficiencies.has(value)) return false;
        occupiedProficiencies.add(value);
        return true;
      }).slice(0, count);
      c.origin.speciesChoices = {
        skills: takeUnique(payload.speciesChoices?.skills, 2), simpleWeapon: String(payload.speciesChoices?.simpleWeapon || '')
      };
      const nextBackground = backgroundPayload(payload.background);
      nextBackground.skills = takeUnique(nextBackground.skills, 2);
      if (nextBackground.tool) {
        if (occupiedProficiencies.has(nextBackground.tool)) nextBackground.tool = '';
        else occupiedProficiencies.add(nextBackground.tool);
      }
      if (nextBackground.secondary) {
        if (occupiedProficiencies.has(nextBackground.secondary)) nextBackground.secondary = '';
        else occupiedProficiencies.add(nextBackground.secondary);
      }
      if (nextBackground.feat === 'Skilled') nextBackground.skilledChoices = takeUnique(nextBackground.skilledChoices, 3);
      c.origin.background = nextBackground;
      c.bio.background = Origin.BACKGROUND.name;
      const bonuses = Origin.abilityBonuses(state);
      for (const ability of S.A) {
        const resilient = c.origin.background.feat === 'Resilient' && c.origin.background.resilientAbility === ability ? 1 : 0;
        c.abilities[ability] = clamp(number(payload.abilities?.[ability], 10) - number(bonuses[ability]) - resilient, 1, 30);
      }
      th.choices.classSkills = takeUnique(payload.classSkills, 3);
      th.choices.ancientLanguages = unique(payload.ancientLanguages).slice(0, 3);
      th.choices.vehicles = takeUnique(payload.vehicles, 2);
      th.choices.expertise = String(payload.expertise || '');
      th.choices.weaponMasteries = unique(payload.weaponMasteries).filter(name => String(name).toLowerCase() !== 'whip').slice(0, 2);
      const previousStartingMelee = th.choices.startingMelee;
      const previousStartingRanged = th.choices.startingRanged;
      th.choices.startingMelee = String(payload.startingMelee || '');
      th.choices.startingRanged = String(payload.startingRanged || '');
      syncStartingWeapon(state, 'melee', th.choices.startingMelee, previousStartingMelee);
      syncStartingWeapon(state, 'ranged', th.choices.startingRanged, previousStartingRanged);
      syncStartingAmmunition(state, th.choices.startingRanged, previousStartingRanged);
      if (payload.manualSkills && typeof payload.manualSkills === 'object') {
        for (const skill of Object.keys(D.SKILLS)) delete c.skills[skill];
        for (const [skill, status] of Object.entries(payload.manualSkills)) {
          const normalized = clamp(status, 0, 2);
          if (Object.hasOwn(D.SKILLS, skill) && normalized) c.skills[skill] = normalized;
        }
      }
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
    next.containerId = '';
    update(state => { state.character.gear.inventory.push(next); }, 'item:add');
    return next.id;
  }

  function findItem(state, id) {
    const gear = state.character.gear;
    return [...gear.inventory, ...gear.weapons, ...gear.armor].find(entry => entry.id === id) || null;
  }

  function syncContainedLocations(state, containerId, location, visited = new Set()) {
    if (!containerId || visited.has(containerId)) return;
    visited.add(containerId);
    const gear = state.character.gear;
    for (const child of [...gear.inventory, ...gear.weapons, ...gear.armor].filter(item => item.containerId === containerId)) {
      child.location = location;
      if (child.isContainer) syncContainedLocations(state, child.id, location, visited);
    }
  }

  function validContainerMove(state, itemId, containerId) {
    const target = findItem(state, containerId);
    if (!target?.isContainer || target.id === itemId) return false;
    const visited = new Set([itemId]);
    let cursor = target;
    while (cursor?.containerId) {
      if (visited.has(cursor.containerId)) return false;
      visited.add(cursor.containerId);
      cursor = findItem(state, cursor.containerId);
    }
    return true;
  }

  function moveItem(id, destination = {}) {
    let result = { ok: false, reason: 'missing' };
    update(state => {
      const item = findItem(state, id);
      if (!item) return;
      const containerId = String(destination.containerId || '');
      if (containerId) {
        if (!validContainerMove(state, id, containerId)) { result = { ok: false, reason: 'container' }; return; }
        const parent = findItem(state, containerId);
        item.containerId = containerId;
        item.location = S.ITEM_LOCATIONS.includes(parent.location) ? parent.location : 'backpack';
      } else {
        item.containerId = '';
        if (S.ITEM_LOCATIONS.includes(destination.location)) item.location = destination.location;
      }
      if (item.isContainer) syncContainedLocations(state, item.id, item.location);
      result = { ok: true, location: item.location, containerId: item.containerId };
    }, 'item:move');
    return result;
  }

  function setItemEquipped(id, equipped) {
    let result = { ok: false, reason: 'missing' };
    update(state => {
      const item = findItem(state, id);
      if (!item) return;
      if (equipped) {
        if (item.isContainer) { result = { ok: false, reason: 'container' }; return; }
        if (!['equipped', 'worn'].includes(item.location) || item.containerId) {
          item.stowedLocation = item.location || 'backpack';
          item.stowedContainerId = item.containerId || '';
        }
        item.containerId = '';
        item.location = D.isArmor(item) && !D.isShield(item) ? 'worn' : 'equipped';
      } else {
        const storedContainer = findItem(state, item.stowedContainerId);
        if (storedContainer?.isContainer && validContainerMove(state, item.id, storedContainer.id)) {
          item.containerId = storedContainer.id;
          item.location = storedContainer.location;
        } else {
          const fallback = S.ITEM_LOCATIONS.includes(item.stowedLocation) && !['equipped', 'worn'].includes(item.stowedLocation) ? item.stowedLocation : 'backpack';
          item.location = fallback;
          item.containerId = '';
        }
      }
      result = { ok: true, equipped: !!equipped, location: item.location };
    }, equipped ? 'item:equip' : 'item:unequip');
    return result;
  }

  function updateItem(id, changes) {
    update(state => {
      const item = findItem(state, id);
      if (!item) return;
      const next = S.clone(changes || {});
      if (next.name != null) next.name = String(next.name || 'Item').trim() || 'Item';
      if (next.quantity != null) next.quantity = Math.max(1, Math.floor(number(next.quantity, 1)));
      if (next.location != null && !S.ITEM_LOCATIONS.includes(next.location)) delete next.location;
      if (next.containerId != null) {
        next.containerId = String(next.containerId || '');
        if (next.containerId && !validContainerMove(state, id, next.containerId)) delete next.containerId;
      }
      Object.assign(item, next);
      if (item.containerId) {
        const parent = findItem(state, item.containerId);
        if (parent) item.location = parent.location;
      }
      if (!item.isContainer) {
        for (const child of [...state.character.gear.inventory, ...state.character.gear.weapons, ...state.character.gear.armor]) {
          if (child.containerId === item.id) child.containerId = '';
        }
      }
    }, 'item:update');
  }

  function removeItem(id) {
    update(state => {
      const gear = state.character.gear;
      gear.inventory = gear.inventory.filter(item => item.id !== id);
      gear.weapons = gear.weapons.filter(item => item.id !== id);
      gear.armor = gear.armor.filter(item => item.id !== id);
      for (const item of [...gear.inventory, ...gear.weapons, ...gear.armor]) {
        if (item.containerId === id) {
          item.containerId = '';
          item.location = 'backpack';
          if (item.isContainer) syncContainedLocations(state, item.id, item.location);
        }
      }
    }, 'item:remove');
  }

  function setMoney(values) {
    update(state => {
      for (const coin of ['gp', 'ep', 'sp', 'cp']) state.character.gear.money[coin] = Math.max(0, Math.floor(number(values[coin])));
    }, 'money:set');
  }

  function adjustMoney(values) {
    const applied = {};
    update(state => {
      for (const coin of ['gp', 'ep', 'sp', 'cp']) {
        const before = Math.max(0, Math.floor(number(state.character.gear.money[coin])));
        const after = Math.max(0, before + Math.trunc(number(values?.[coin])));
        state.character.gear.money[coin] = after;
        applied[coin] = after - before;
      }
    }, 'money:adjust');
    return applied;
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
    addItem, updateItem, moveItem, setItemEquipped, removeItem, setMoney, adjustMoney, addCustomAction, removeCustomAction,
    toggleFavorite, toggleOpen, saveNpc, deleteNpc, toggleNpcFavorite, saveBio, setUi
  };
})();
