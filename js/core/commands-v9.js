(function () {
  'use strict';

  const S = window.CharacterState;
  const D = window.CharacterDerived;
  const T = window.TreasureHunterDataV7s;
  const Relics = window.TreasureHunterRelicsV7s || [];
  const Origin = window.CharacterOrigin;
  const Rules = window.DND2024Rules;
  const GearRules = window.GearRulesV9;
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

  function rest(kind, options = {}) {
    const long = kind === 'long' || kind === 'LR';
    const source = S.get();
    if (number(source.character.hp.current) <= 0) return { ok: false, reason: 'zero-hp' };
    const config = {
      hitDice: Math.max(0, Math.floor(number(options.hitDice, 0))),
      hp: options.hp !== false, temp: options.temp !== false, recoverHitDice: options.recoverHitDice !== false,
      cool: options.cool !== false, features: options.features !== false, relics: options.relics !== false,
      exhaustion: options.exhaustion !== false,
      rolls: Array.isArray(options.rolls) ? options.rolls : []
    };
    const result = { ok: true, kind: long ? 'long' : 'short', healing: 0, rolls: [], hitDiceSpent: 0, hitDiceRecovered: 0 };
    update(state => {
      const th = state.classes.treasureHunter;
      if (config.cool) th.coolUsed = 0;
      if (config.features) {
        for (const [id] of Object.entries(th.featureUses || {})) {
          const feature = T.features.find(item => item.id === id);
          if (feature && (long || feature.recovery === 'SR')) th.featureUses[id] = 0;
        }
      }
      if (config.relics && D.subclassHasSystem('relics', state)) {
        for (const entry of th.relics || []) {
          const relic = Relics.find(item => item.id === entry.relicId);
          if (relic && (long || relic.recovery === 'SR')) entry.used = 0;
        }
      }
      if (long) {
        if (config.hp) state.character.hp.current = D.hpMax(state);
        if (config.temp) state.character.hp.temp = 0;
        if (config.exhaustion) state.character.exhaustion = Math.max(0, number(state.character.exhaustion) - 1);
        if (config.recoverHitDice) {
          const before = number(state.character.hitDice.d10.spent);
          state.character.hitDice.d10.spent = Math.max(0, before - Math.max(1, Math.ceil(D.level(state) / 2)));
          result.hitDiceRecovered = before - state.character.hitDice.d10.spent;
        }
        state.character.deathSaves = { successes: 0, failures: 0 };
        state.character.origin.background.luckUsed = 0;
      } else if (config.hitDice) {
        const hitDice = state.character.hitDice.d10;
        const available = Math.max(0, D.level(state) - number(hitDice.spent));
        const count = Math.min(available, config.hitDice);
        const con = D.mod('CON', state);
        for (let index = 0; index < count; index += 1) {
          const die = clamp(config.rolls[index] ?? (1 + Math.floor(Math.random() * 10)), 1, 10);
          const gain = Math.max(1, die + con);
          result.rolls.push({ die, con, gain });
          result.healing += gain;
        }
        result.hitDiceSpent = count;
        hitDice.spent = number(hitDice.spent) + count;
        state.character.hp.current = Math.min(D.hpMax(state), number(state.character.hp.current) + result.healing);
      }
    }, long ? 'rest:long' : 'rest:short');
    result.current = S.get().character.hp.current;
    return result;
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
    if (!D.subclassHasSystem('relics', source)) return { ok: false, reason: 'subclass' };
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
    if (!D.subclassHasSystem('relics', source)) return { ok: false, reason: 'subclass' };
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
      if (key === 'subclass') {
        choices.subclass = String(value || '');
        choices.subclassConfirmed = !!choices.subclass;
      } else if (index == null) choices[key] = value;
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

  function addItem(item, location = 'carried') {
    const next = S.clone(item || {});
    next.id = S.uid('item');
    next.location = S.ITEM_LOCATIONS.includes(location) ? location : 'carried';
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
        item.location = S.ITEM_LOCATIONS.includes(parent.location) ? parent.location : 'carried';
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
          item.stowedLocation = item.location || 'carried';
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
          const fallback = S.ITEM_LOCATIONS.includes(item.stowedLocation) && !['equipped', 'worn'].includes(item.stowedLocation) ? item.stowedLocation : 'carried';
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
      if (next.quantity != null) next.quantity = Math.max(item.isConsumable || next.isConsumable ? 0 : 1, Math.floor(number(next.quantity, 1)));
      if (next.weight != null) next.weight = Math.max(0, number(next.weight, 0));
      if (next.capacityWeight != null) next.capacityWeight = Math.max(0, number(next.capacityWeight, 0));
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
      for (const loadout of gear.loadouts || []) delete loadout.items[id];
      for (const item of [...gear.inventory, ...gear.weapons, ...gear.armor]) {
        if (item.containerId === id) {
          item.containerId = '';
          item.location = 'carried';
          if (item.isContainer) syncContainedLocations(state, item.id, item.location);
        }
      }
    }, 'item:remove');
  }

  function useConsumable(id) {
    const source = S.get();
    const item = findItem(source, id);
    if (!item || !D.isConsumable(item)) return { ok: false, reason: 'item' };
    const before = Math.max(0, Math.floor(number(item.quantity)));
    if (before <= 0) return { ok: false, reason: 'empty', remaining: 0 };
    update(state => {
      const current = findItem(state, id);
      if (current) current.quantity = Math.max(0, Math.floor(number(current.quantity)) - 1);
    }, `consumable:use:${item.name}`);
    return { ok: true, name: item.name, remaining: before - 1 };
  }

  function saveLoadout(name) {
    const label = String(name || '').trim();
    if (!label) return { ok: false, reason: 'name' };
    let id = '';
    update(state => {
      const gear = state.character.gear;
      const items = Object.fromEntries(D.inventory(state).map(item => [item.id, { location: item.location, containerId: item.containerId || '' }]));
      const current = (gear.loadouts || []).find(entry => entry.name.toLowerCase() === label.toLowerCase());
      if (current) { current.name = label; current.items = items; id = current.id; }
      else {
        id = S.uid('loadout');
        gear.loadouts = [...(gear.loadouts || []), { id, name: label, items }].slice(-8);
      }
    }, 'loadout:save');
    return { ok: true, id, name: label };
  }

  function applyLoadout(id) {
    const source = S.get();
    const selected = (source.character.gear.loadouts || []).find(entry => entry.id === id);
    if (!selected) return { ok: false, reason: 'missing' };
    update(state => {
      const all = D.inventory(state);
      const byId = new Map(all.map(item => [item.id, item]));
      for (const item of all) {
        const saved = selected.items?.[item.id];
        if (!saved) continue;
        item.containerId = '';
        item.location = S.ITEM_LOCATIONS.includes(saved.location) ? saved.location : 'carried';
      }
      for (const item of all) {
        const saved = selected.items?.[item.id];
        const parent = saved?.containerId ? byId.get(saved.containerId) : null;
        if (parent?.isContainer && parent.id !== item.id) {
          item.containerId = parent.id;
          item.location = parent.location;
        }
      }
      for (const item of all.filter(entry => entry.isContainer && !entry.containerId)) syncContainedLocations(state, item.id, item.location);
    }, `loadout:apply:${selected.name}`);
    return { ok: true, id, name: selected.name };
  }

  function deleteLoadout(id) {
    let removed = false;
    update(state => {
      const before = (state.character.gear.loadouts || []).length;
      state.character.gear.loadouts = (state.character.gear.loadouts || []).filter(entry => entry.id !== id);
      removed = state.character.gear.loadouts.length !== before;
    }, 'loadout:delete');
    return removed;
  }

  function spendAmmunition(weaponId) {
    const source = S.get();
    const weapon = D.weaponAttacks(source, { includeUnequipped: true }).find(attack => attack.id === weaponId);
    if (!weapon?.ammunitionType) return { ok: false, reason: 'weapon' };
    const summary = D.ammunitionSummaryForWeapon(weapon, source);
    const stack = summary.entries.find(entry => entry.count > 0);
    if (!stack) return { ok: false, reason: 'empty', type: summary.type, remaining: 0 };
    update(state => {
      const item = findItem(state, stack.item.id);
      if (item) item.ammunitionCount = Math.max(0, D.ammunitionCount(item) - 1);
    }, 'ammunition:spend');
    return { ok: true, type: summary.type, itemId: stack.item.id, remaining: Math.max(0, summary.total - 1) };
  }

  function executeAction(payload = {}) {
    const source = S.get();
    const cost = Math.max(0, Math.floor(number(payload.cost)));
    const coolMax = T.coolTotal(D.level(source));
    const coolLeft = Math.max(0, coolMax - number(source.classes.treasureHunter.coolUsed));
    if (cost > coolLeft) return { ok: false, reason: 'cool', available: coolLeft };
    const featureId = String(payload.featureId || '');
    const feature = featureId ? T.features.find(entry => entry.id === featureId) : null;
    const featureMax = Math.max(0, number(payload.uses || feature?.uses));
    const featureUsed = Math.max(0, number(source.classes.treasureHunter.featureUses?.[featureId]));
    if (featureId && featureMax && featureUsed >= featureMax) return { ok: false, reason: 'uses', available: 0 };
    const relicInstanceId = String(payload.relicInstanceId || '');
    const relicEntry = relicInstanceId ? source.classes.treasureHunter.relics.find(entry => entry.instanceId === relicInstanceId) : null;
    const relicMax = relicEntry ? D.relicMax(relicEntry, source) : 0;
    if (relicInstanceId && (!relicEntry || number(relicEntry.used) >= relicMax)) return { ok: false, reason: 'charges', available: 0 };
    let ammo = null;
    if (payload.spendAmmo && payload.weaponId) {
      const weapon = D.weaponAttacks(source, { includeUnequipped: true }).find(attack => attack.id === payload.weaponId);
      if (!weapon?.ammunitionType) return { ok: false, reason: 'weapon' };
      const summary = D.ammunitionSummaryForWeapon(weapon, source);
      const stack = summary.entries.find(entry => entry.count > 0);
      if (!stack) return { ok: false, reason: 'ammunition', type: summary.type, available: 0 };
      ammo = { itemId: stack.item.id, type: summary.type, remaining: Math.max(0, summary.total - 1) };
    }
    update(state => {
      if (cost) state.classes.treasureHunter.coolUsed = Math.min(T.coolTotal(D.level(state)), number(state.classes.treasureHunter.coolUsed) + cost);
      if (featureId && featureMax) state.classes.treasureHunter.featureUses[featureId] = Math.min(featureMax, number(state.classes.treasureHunter.featureUses[featureId]) + 1);
      if (relicInstanceId) {
        const entry = state.classes.treasureHunter.relics.find(item => item.instanceId === relicInstanceId);
        if (entry) entry.used = Math.min(D.relicMax(entry, state), number(entry.used) + 1);
      }
      if (ammo) {
        const item = findItem(state, ammo.itemId);
        if (item) item.ammunitionCount = Math.max(0, D.ammunitionCount(item) - 1);
      }
    }, `action:execute:${String(payload.name || payload.id || 'action')}`);
    return {
      ok: true, name: String(payload.name || 'Action'), cost,
      featureUse: featureId && featureMax ? { id: featureId, remaining: Math.max(0, featureMax - featureUsed - 1) } : null,
      relicUse: relicInstanceId ? { id: relicInstanceId, remaining: Math.max(0, relicMax - number(relicEntry.used) - 1) } : null,
      ammunition: ammo
    };
  }

  function levelUp(targetLevel, selections = {}) {
    const source = S.get();
    const current = D.level(source);
    const target = clamp(targetLevel, 1, 20);
    if (target !== current + 1) return { ok: false, reason: current >= 20 ? 'maximum' : 'next-level', current, target };
    const oldMax = D.hpMax(source);
    const oldDamage = Math.max(0, oldMax - number(source.character.hp.current));
    update(state => {
      const choices = state.classes.treasureHunter.choices;
      for (const [key, raw] of Object.entries(selections || {})) {
        const value = Array.isArray(raw) ? raw.map(entry => String(entry || '')) : String(raw || '');
        choices[key] = value;
        if (key === 'subclass') choices.subclassConfirmed = !!value;
      }
      state.character.level = target;
      const nextMax = D.hpMax(state);
      state.character.hp.max = nextMax;
      state.character.hp.current = Math.max(0, Math.min(nextMax, nextMax - oldDamage));
      state.classes.treasureHunter.coolUsed = clamp(state.classes.treasureHunter.coolUsed, 0, T.coolTotal(target));
    }, `level-up:${current}:${target}`);
    return { ok: true, from: current, to: target, hpMax: D.hpMax(S.get()), missing: D.choiceRequirements(S.get()) };
  }

  function setEncumbranceMode(mode) {
    if (!['basic', 'balanced', 'variant'].includes(mode)) return false;
    update(state => { state.character.gear.encumbranceMode = mode; }, 'gear:encumbrance');
    return true;
  }

  function startingGearStatus(value = S.get()) {
    const source = value || S.get();
    const setup = source.character.gear.starting || {};
    const spentCp = allGearItems(source).reduce((sum, item) => sum + (item.startingPurchase ? Math.max(0, Math.floor(number(item.startingCostCp))) : 0), 0);
    const budgetCp = Math.max(0, Math.floor(number(setup.budgetGp))) * 100;
    const finalized = !!setup.finalized;
    return {
      budgetGp: Math.floor(budgetCp / 100), budgetCp, spentCp,
      remainingCp: finalized ? 0 : Math.max(0, budgetCp - spentCp),
      overspentCp: Math.max(0, spentCp - budgetCp),
      remainderCp: Math.max(0, Math.floor(number(setup.remainderCp))),
      finalized, legacy: !!setup.legacy
    };
  }

  function setStartingGearBudget(gp) {
    if (S.get().character.gear.starting?.finalized) return { ok: false, reason: 'finalized' };
    const nextBudgetGp = Math.max(0, Math.floor(number(gp)));
    if (nextBudgetGp * 100 < startingGearStatus().spentCp) return { ok: false, reason: 'below-spent', ...startingGearStatus() };
    update(state => { state.character.gear.starting.budgetGp = nextBudgetGp; }, 'starting-gear:budget');
    return { ok: true, ...startingGearStatus() };
  }

  function purchaseStartingItem(item, costCp, destination = {}) {
    const price = Math.max(0, Math.floor(number(costCp)));
    const status = startingGearStatus();
    if (status.finalized) return { ok: false, reason: 'finalized' };
    if (status.spentCp + price > status.budgetCp) return { ok: false, reason: 'budget' };
    let id = '';
    update(state => {
      const next = S.clone(item || {});
      id = S.uid('starting-item');
      Object.assign(next, { id, quantity: Math.max(1, number(next.quantity, 1)), startingPurchase: true, startingCostCp: price, containerId: '', location: 'carried' });
      state.character.gear.inventory.push(next);
      const containerId = String(destination.containerId || '');
      if (containerId && validContainerMove(state, id, containerId)) {
        const parent = findItem(state, containerId);
        next.containerId = containerId;
        next.location = parent.location;
      } else if (S.ITEM_LOCATIONS.includes(destination.location)) {
        next.location = destination.location;
      }
    }, 'starting-gear:purchase');
    return { ok: true, id, ...startingGearStatus() };
  }

  function finalizeStartingGear() {
    const status = startingGearStatus();
    if (status.finalized) return { ok: false, reason: 'finalized' };
    if (!status.budgetCp) return { ok: false, reason: 'budget' };
    if (status.overspentCp) return { ok: false, reason: 'overspent', ...status };
    update(state => {
      const setup = state.character.gear.starting;
      let remainder = startingGearStatus(state).remainingCp;
      setup.remainderCp = remainder;
      setup.finalized = true;
      const wallet = state.character.gear.currencyWallets.generic || (state.character.gear.currencyWallets.generic = { g: 0, s: 0, c: 0 });
      wallet.g += Math.floor(remainder / 100);
      remainder %= 100;
      wallet.s += Math.floor(remainder / 10);
      wallet.c += remainder % 10;
    }, 'starting-gear:finalize');
    return { ok: true, ...startingGearStatus() };
  }

  function refundStartingItem(id) {
    const source = S.get();
    if (source.character.gear.starting?.finalized) return { ok: false, reason: 'finalized' };
    const item = findItem(source, id);
    if (!item?.startingPurchase) return { ok: false, reason: 'not-purchase' };
    removeItem(id);
    return { ok: true, ...startingGearStatus() };
  }

  function setMoney(values) {
    const totalCp = Math.max(0, Math.floor(number(values?.pp))) * 1000 + Math.max(0, Math.floor(number(values?.gp))) * 100 +
      Math.max(0, Math.floor(number(values?.ep))) * 50 + Math.max(0, Math.floor(number(values?.sp))) * 10 + Math.max(0, Math.floor(number(values?.cp)));
    update(state => {
      state.character.gear.currencyWallets.generic = D.cpCoins(totalCp);
    }, 'money:set');
  }

  function adjustMoney(values) {
    const mapped = {
      g: Math.trunc(number(values?.gp)) + Math.trunc(number(values?.pp)) * 10,
      s: Math.trunc(number(values?.sp)) + Math.trunc(number(values?.ep)) * 5,
      c: Math.trunc(number(values?.cp))
    };
    const applied = adjustCurrency('generic', mapped);
    return { pp: 0, gp: applied.g, ep: 0, sp: applied.s, cp: applied.c };
  }

  function adjustCurrency(currencyId, values) {
    const id = GearRules?.CURRENCY_BY_ID?.has(currencyId) ? currencyId : 'generic';
    const applied = { g: 0, s: 0, c: 0 };
    update(state => {
      const wallets = state.character.gear.currencyWallets || (state.character.gear.currencyWallets = {});
      const wallet = wallets[id] || (wallets[id] = { g: 0, s: 0, c: 0 });
      for (const coin of ['g', 's', 'c']) {
        const before = Math.max(0, Math.floor(number(wallet[coin])));
        const after = Math.max(0, before + Math.trunc(number(values?.[coin])));
        wallet[coin] = after;
        applied[coin] = after - before;
      }
    }, 'currency:adjust');
    return applied;
  }

  function exchangeCurrency(fromId, toId, values, feePercent = 0) {
    const from = GearRules?.CURRENCY_BY_ID?.has(fromId) ? fromId : '';
    const to = GearRules?.CURRENCY_BY_ID?.has(toId) ? toId : '';
    if (!from || !to || from === to) return { ok: false, reason: 'currency' };
    const sentCp = Math.max(0, Math.trunc(number(values?.g))) * 100 + Math.max(0, Math.trunc(number(values?.s))) * 10 + Math.max(0, Math.trunc(number(values?.c)));
    if (!sentCp) return { ok: false, reason: 'amount' };
    const source = S.get();
    const availableCp = D.walletCp(source.character.gear.currencyWallets?.[from]);
    if (availableCp < sentCp) return { ok: false, reason: 'funds', availableCp };
    const fee = clamp(feePercent, 0, 100);
    const receivedCp = Math.max(0, Math.floor(sentCp * (1 - fee / 100)));
    const transaction = { id: S.uid('exchange'), at: new Date().toISOString(), fromId: from, toId: to, sentCp, receivedCp, feePercent: fee };
    update(state => {
      const wallets = state.character.gear.currencyWallets || (state.character.gear.currencyWallets = {});
      const fromWallet = wallets[from] || (wallets[from] = { g: 0, s: 0, c: 0 });
      const toWallet = wallets[to] || (wallets[to] = { g: 0, s: 0, c: 0 });
      wallets[from] = D.cpCoins(D.walletCp(fromWallet) - sentCp);
      wallets[to] = D.cpCoins(D.walletCp(toWallet) + receivedCp);
      state.character.gear.currencyTransactions.push(transaction);
      state.character.gear.currencyTransactions = state.character.gear.currencyTransactions.slice(-50);
    }, `currency:exchange:${from}:${to}`);
    return { ok: true, ...transaction };
  }

  function setFavoriteCurrency(currencyId) {
    if (!GearRules?.CURRENCY_BY_ID?.has(currencyId)) return false;
    update(state => { state.character.gear.favoriteCurrencyId = currencyId; }, 'currency:favorite');
    return true;
  }

  function setCurrencyDisplayMode(mode) {
    if (!['total', 'favorite'].includes(mode)) return false;
    update(state => { state.character.gear.currencyDisplayMode = mode; }, 'currency:display');
    return true;
  }

  function setOtherPossessions(value) {
    update(state => { state.character.gear.otherPossessions = String(value || ''); }, 'gear:other-possessions');
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
      const now = new Date().toISOString();
      const next = {
        name: String(payload.name || 'NPC'), profession: String(payload.profession || payload.tag || ''),
        nationality: String(payload.nationality || ''), location: String(payload.location || ''),
        notes: String(payload.notes || ''), image: payload.image || '', thumbnail: payload.thumbnail || '', relations: Array.isArray(payload.relations) ? S.clone(payload.relations) : (current?.relations || []),
        favorite: payload.favorite == null ? !!current?.favorite : !!payload.favorite,
        createdAt: current?.createdAt || now, updatedAt: now
      };
      if (current) Object.assign(current, next);
      else { id = S.uid('npc'); state.campaign.npcs.push({ id, ...next }); }
    }, 'npc:save');
    return id;
  }

  function deleteNpc(id) {
    update(state => {
      state.campaign.npcs = state.campaign.npcs.filter(npc => npc.id !== id);
      for (const npc of state.campaign.npcs) npc.relations = (npc.relations || []).filter(relation => relation.npcId !== id);
    }, 'npc:delete');
  }

  function toggleNpcFavorite(id) {
    update(state => { const npc = state.campaign.npcs.find(item => item.id === id); if (npc) npc.favorite = !npc.favorite; }, 'npc:favorite');
  }

  function saveJournalEntry(payload = {}) {
    let id = String(payload.id || '');
    update(state => {
      const current = state.campaign.journal.find(entry => entry.id === id);
      const now = new Date().toISOString();
      const next = {
        title: String(payload.title || 'Untitled entry').trim() || 'Untitled entry',
        type: ['session', 'quest', 'clue', 'location', 'note'].includes(payload.type) ? payload.type : 'note',
        date: String(payload.date || ''), location: String(payload.location || ''), body: String(payload.body || ''),
        favorite: payload.favorite == null ? !!current?.favorite : !!payload.favorite,
        npcIds: unique(payload.npcIds), itemIds: unique(payload.itemIds), relicIds: unique(payload.relicIds),
        createdAt: current?.createdAt || now, updatedAt: now
      };
      if (current) Object.assign(current, next);
      else { id = S.uid('journal'); state.campaign.journal.push({ id, ...next }); }
    }, 'journal:save');
    return id;
  }

  function deleteJournalEntry(id) {
    update(state => { state.campaign.journal = state.campaign.journal.filter(entry => entry.id !== id); }, 'journal:delete');
  }

  function toggleJournalFavorite(id) {
    update(state => { const entry = state.campaign.journal.find(item => item.id === id); if (entry) entry.favorite = !entry.favorite; }, 'journal:favorite');
  }

  function saveBio(values) {
    update(state => { for (const [key, value] of Object.entries(values || {})) state.character.bio[key] = String(value || '').trim(); }, 'bio:save');
  }

  function setUi(key, value) {
    update(state => {
      state.ui[key] = value;
      if (key === 'pageId') {
        const pages = ['characterPage', 'actionsPage', 'skillsPage', 'featuresPage', 'relicsPage', 'gearPage', 'npcsPage', 'bioPage'];
        const index = pages.indexOf(value);
        if (index >= 0) state.ui.page = index;
      }
    }, `ui:${key}`);
  }

  window.CharacterCommands = {
    applyDamage, heal, setTempHp, setHpCurrent, reconcileDerived, toggleInspiration, spendCool, adjustCool, adjustLuck, rest,
    toggleFeatureUse, addRelic, removeRelic, toggleRelicPrepared, adjustRelicUse, setRelicChoice,
    setChoice, setClassSkills, setRollMode, addCondition, removeCondition, adjustExhaustion,
    addDefense, removeDefense, setSkillManual, applyOrigin, saveBuilder, saveQuickCharacter,
    addItem, updateItem, moveItem, setItemEquipped, removeItem, useConsumable, saveLoadout, applyLoadout, deleteLoadout, spendAmmunition, executeAction, levelUp, setEncumbranceMode, startingGearStatus, setStartingGearBudget, purchaseStartingItem, finalizeStartingGear, refundStartingItem,
    setMoney, adjustMoney, adjustCurrency, exchangeCurrency, setFavoriteCurrency, setCurrencyDisplayMode, setOtherPossessions, addCustomAction, removeCustomAction,
    toggleFavorite, toggleOpen, saveNpc, deleteNpc, toggleNpcFavorite, saveJournalEntry, deleteJournalEntry, toggleJournalFavorite, saveBio, setUi
  };
})();
