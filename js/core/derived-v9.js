(function () {
  'use strict';

  const S = window.CharacterState;
  const T = window.TreasureHunterDataV7s;
  const Relics = window.TreasureHunterRelicsV7s || [];
  const Rules = window.DND2024Rules;
  const Origin = window.CharacterOrigin;
  if (!S || !T || !Rules || !Origin) return;

  const SKILLS = {
    Acrobatics: 'DEX', 'Animal Handling': 'WIS', Arcana: 'INT', Athletics: 'STR', Deception: 'CHA',
    History: 'INT', Insight: 'WIS', Intimidation: 'CHA', Investigation: 'INT', Medicine: 'WIS',
    Nature: 'INT', Perception: 'WIS', Performance: 'CHA', Persuasion: 'CHA', Religion: 'INT',
    'Sleight of Hand': 'DEX', Stealth: 'DEX', Survival: 'WIS'
  };
  const ARMOR = {
    unarmored: { name: 'Unarmored', base: 10, dex: true, cap: null },
    padded: { name: 'Padded Armor', base: 11, dex: true, cap: null },
    leather: { name: 'Leather Armor', base: 11, dex: true, cap: null },
    studded: { name: 'Studded Leather Armor', base: 12, dex: true, cap: null },
    hide: { name: 'Hide Armor', base: 12, dex: true, cap: 2 },
    chainShirt: { name: 'Chain Shirt', base: 13, dex: true, cap: 2 },
    scale: { name: 'Scale Mail', base: 14, dex: true, cap: 2 },
    breastplate: { name: 'Breastplate', base: 14, dex: true, cap: 2 },
    halfPlate: { name: 'Half Plate Armor', base: 15, dex: true, cap: 2 },
    ringMail: { name: 'Ring Mail', base: 14, dex: false, cap: 0 },
    chainMail: { name: 'Chain Mail', base: 16, dex: false, cap: 0 },
    splint: { name: 'Splint Armor', base: 17, dex: false, cap: 0 },
    plate: { name: 'Plate Armor', base: 18, dex: false, cap: 0 }
  };
  const ACTIVE_LOCATIONS = new Set(['equipped', 'worn']);

  const state = value => value || S.get();
  const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const unique = values => [...new Set((values || []).filter(Boolean))];
  const signed = value => number(value) >= 0 ? `+${number(value)}` : String(number(value));
  const level = value => Math.max(1, Math.min(20, number(state(value).character.level, 1)));
  const pb = value => T.pb(level(value));

  function ability(abilityKey, value) {
    const source = state(value);
    const base = number(source.character.abilities?.[abilityKey], 10);
    const originBonus = number(Origin.abilityBonuses(source)[abilityKey], 0);
    const resilientBonus = Origin.backgroundFeat(source) === 'Resilient' && Origin.background(source).resilientAbility === abilityKey ? 1 : 0;
    return Math.min(30, base + originBonus + resilientBonus);
  }

  function mod(abilityKey, value) { return S.modifier(ability(abilityKey, value)); }
  function conditions(value) { return state(value).character.conditions || []; }
  function exhaustion(value) { return Math.max(0, Math.min(6, number(state(value).character.exhaustion, 0))); }

  function inventory(value) {
    const gear = state(value).character.gear || {};
    return [...(gear.inventory || []), ...(gear.armor || [])];
  }

  function activeItems(value) {
    return inventory(value).filter(item => item && typeof item === 'object' && ACTIVE_LOCATIONS.has(item.location) && (!item.attunement || item.isAttuned));
  }

  function relicState(value) { return state(value).classes?.treasureHunter?.relics || []; }
  function relicDefinition(id) { return Relics.find(relic => relic.id === id) || null; }
  function activeRelics(value) {
    return relicState(value).filter(entry => entry?.prepared).map(entry => ({ ...(relicDefinition(entry.relicId) || {}), ...entry })).filter(entry => entry.id || entry.relicId);
  }

  function enhancementFromName(name) {
    const match = String(name || '').match(/(?:^|[,+\s])\+(\d)(?:\b|$)/);
    return match ? Number(match[1]) : 0;
  }

  function genericModifiers(source, type, target = 'all') {
    return (source?.modifiers || []).reduce((total, modifier) => {
      if (!modifier || modifier.type !== type) return total;
      const modifierTarget = modifier.target || 'all';
      return total + (modifierTarget === 'all' || modifierTarget === target ? number(modifier.value) : 0);
    }, 0);
  }

  function armorKeyFromName(name) {
    const normalized = String(name || '').toLowerCase();
    if (normalized.includes('studded leather')) return 'studded';
    if (normalized.includes('padded')) return 'padded';
    if (normalized.includes('chain shirt')) return 'chainShirt';
    if (normalized.includes('scale mail')) return 'scale';
    if (normalized.includes('breastplate')) return 'breastplate';
    if (normalized.includes('half plate')) return 'halfPlate';
    if (normalized.includes('ring mail')) return 'ringMail';
    if (normalized.includes('chain mail')) return 'chainMail';
    if (normalized.includes('splint')) return 'splint';
    if (normalized.includes('plate')) return 'plate';
    if (normalized.includes('hide armor')) return 'hide';
    if (normalized.includes('leather')) return 'leather';
    return '';
  }

  function isShield(item) {
    const raw = item?.raw || {};
    const text = `${item?.name || ''} ${item?.category || ''} ${raw.armor_category || ''}`.toLowerCase();
    return text.includes('shield') || String(raw.armor_category || '').toLowerCase() === 'shield';
  }

  function armorFormulaFromItem(item) {
    if (!item || isShield(item)) return null;
    const raw = item.raw || {};
    const armorClass = raw.armor_class;
    if (armorClass && Number.isFinite(Number(armorClass.base))) {
      return {
        name: item.name || 'Armor', base: number(armorClass.base, 10), dex: !!armorClass.dex_bonus,
        cap: armorClass.max_bonus == null ? null : number(armorClass.max_bonus),
        enhancement: enhancementFromName(item.name), item
      };
    }
    const key = armorKeyFromName(item.name);
    return key ? { ...ARMOR[key], enhancement: enhancementFromName(item.name), item } : null;
  }

  function armorValue(formula, value) {
    const dexterity = mod('DEX', value);
    const dexterityPart = formula.dex ? (formula.cap == null ? dexterity : Math.min(formula.cap, dexterity)) : 0;
    return number(formula.base, 10) + dexterityPart + number(formula.enhancement, 0);
  }

  function equippedArmor(value) {
    const formulas = activeItems(value).map(armorFormulaFromItem).filter(Boolean);
    if (!formulas.length) return { ...ARMOR.unarmored, enhancement: 0, item: null };
    return formulas.sort((a, b) => armorValue(b, value) - armorValue(a, value))[0];
  }

  function protectionBonus(item) {
    const name = String(item?.name || '').toLowerCase();
    return name.includes('ring of protection') || name.includes('cloak of protection') ? 1 : 0;
  }

  function itemAcBonus(value) {
    return activeItems(value).reduce((total, item) => {
      let bonus = protectionBonus(item) + genericModifiers(item, 'ac');
      if (isShield(item)) bonus += number(item.raw?.armor_class?.base, 2) + enhancementFromName(item.name);
      return total + bonus;
    }, 0);
  }

  function itemSaveBonus(abilityKey, value) {
    return activeItems(value).reduce((total, item) => total + protectionBonus(item) + genericModifiers(item, 'save', abilityKey), 0);
  }
  function itemInitiativeBonus(value) { return activeItems(value).reduce((total, item) => total + genericModifiers(item, 'initiative'), 0); }
  function itemSpeedBonus(value) { return activeItems(value).reduce((total, item) => total + genericModifiers(item, 'speed'), 0); }
  function itemDcBonus(target, value) { return activeItems(value).reduce((total, item) => total + genericModifiers(item, 'dc', target), 0); }
  function relicAcBonus(value) { return activeRelics(value).reduce((total, relic) => total + number(relic.acBonus) + genericModifiers(relic, 'ac'), 0); }
  function relicSaveBonus(abilityKey, value) { return activeRelics(value).reduce((total, relic) => total + number(relic.saveBonus) + genericModifiers(relic, 'save', abilityKey), 0); }
  function relicInitiativeBonus(value) { return activeRelics(value).reduce((total, relic) => total + number(relic.initiativeBonus) + genericModifiers(relic, 'initiative'), 0); }
  function relicSpeedBonus(value) { return activeRelics(value).reduce((total, relic) => total + number(relic.bonusSpeed) + number(relic.speedBonus) + genericModifiers(relic, 'speed'), 0); }
  function relicDcBonus(target, value) { return activeRelics(value).reduce((total, relic) => total + genericModifiers(relic, 'dc', target), 0); }

  function armorClass(value) {
    const source = state(value);
    if (source.character.acMode === 'manual') return Math.max(0, number(source.character.acManual, 10));
    const armor = equippedArmor(source);
    const defence = Origin.backgroundFeat(source) === 'Defence' && armor.item ? 1 : 0;
    return Math.max(0, armorValue(armor, source) + itemAcBonus(source) + relicAcBonus(source) + number(source.character.acBonus) + defence);
  }

  function armorBreakdown(value) {
    const source = state(value);
    if (source.character.acMode === 'manual') return { value: armorClass(source), label: 'Manual AC', parts: [['Manual AC', armorClass(source)]] };
    const armor = equippedArmor(source);
    const parts = [[armor.item ? 'Armor' : 'Base', armor.item ? `${armor.name}: ${armor.base}` : 'Unarmored: 10']];
    if (armor.dex) parts.push(['DEX', `${signed(mod('DEX', source))}${armor.cap != null ? ` (max +${armor.cap})` : ''}`]);
    if (armor.enhancement) parts.push(['Armor enhancement', signed(armor.enhancement)]);
    const itemBonus = itemAcBonus(source); if (itemBonus) parts.push(['Equipped items', signed(itemBonus)]);
    const relicBonus = relicAcBonus(source); if (relicBonus) parts.push(['Prepared relics', signed(relicBonus)]);
    const other = number(source.character.acBonus); if (other) parts.push(['Other bonus', signed(other)]);
    if (Origin.backgroundFeat(source) === 'Defence' && armor.item) parts.push(['Defence feat', '+1']);
    return { value: armorClass(source), label: armor.item ? armor.name : 'Unarmored', parts };
  }

  function isSaveProficient(abilityKey, value) {
    const source = state(value);
    return T.saves.includes(abilityKey) || (Origin.backgroundFeat(source) === 'Resilient' && Origin.background(source).resilientAbility === abilityKey);
  }

  function initiative(value) {
    const source = state(value);
    const alert = Origin.backgroundFeat(source) === 'Alert' ? pb(source) : 0;
    return mod('DEX', source) + number(source.character.initiativeBonus) + itemInitiativeBonus(source) + relicInitiativeBonus(source) + alert + Rules.exhaustionPenalty(exhaustion(source));
  }

  function saveMod(abilityKey, value) {
    const source = state(value);
    if (Rules.saveAutoFails(conditions(source), abilityKey) || exhaustion(source) >= 6) return null;
    return mod(abilityKey, source) + (isSaveProficient(abilityKey, source) ? pb(source) : 0) + itemSaveBonus(abilityKey, source) + relicSaveBonus(abilityKey, source) + Rules.exhaustionPenalty(exhaustion(source));
  }

  function whipRopeDC(value) { const source = state(value); return 8 + pb(source) + mod('DEX', source) + itemDcBonus('whipRope', source) + relicDcBonus('whipRope', source); }
  function relicDC(value) { const source = state(value); return 8 + pb(source) + mod('INT', source) + itemDcBonus('relic', source) + relicDcBonus('relic', source); }

  function baseSpeed(value) {
    const source = state(value);
    const selectedSpecies = Origin.species(source);
    return selectedSpecies?.mechanicsAvailable && Number.isFinite(Number(selectedSpecies.speed)) ? Number(selectedSpecies.speed) : number(source.character.speed, 30);
  }

  function speed(value) {
    const source = state(value);
    if (exhaustion(source) >= 6 || Rules.speedIsZero(conditions(source))) return 0;
    return Math.max(0, baseSpeed(source) + itemSpeedBonus(source) + relicSpeedBonus(source) - Rules.exhaustionSpeedPenalty(exhaustion(source)));
  }

  function speedBreakdown(value) {
    const source = state(value);
    const parts = [['Base Speed', `${baseSpeed(source)} ft.`]];
    const itemBonus = itemSpeedBonus(source); if (itemBonus) parts.push(['Equipped items', `${signed(itemBonus)} ft.`]);
    const relicBonus = relicSpeedBonus(source); if (relicBonus) parts.push(['Prepared relics', `${signed(relicBonus)} ft.`]);
    const penalty = Rules.exhaustionSpeedPenalty(exhaustion(source)); if (penalty) parts.push(['Exhaustion', `−${penalty} ft.`]);
    if (Rules.speedIsZero(conditions(source))) parts.push(['Condition', 'Speed is fixed at 0']);
    return { value: speed(source), parts };
  }

  function hpMax(value) {
    const source = state(value);
    if (source.character.hp.auto === false) return Math.max(1, number(source.character.hp.max, 1));
    const tough = Origin.backgroundFeat(source) === 'Tough' ? 2 * level(source) : 0;
    return T.hpMax(level(source), mod('CON', source)) + tough;
  }

  function hp(value) {
    const source = state(value);
    const max = hpMax(source);
    return { current: Math.max(0, Math.min(max, number(source.character.hp.current))), max, temp: Math.max(0, number(source.character.hp.temp)) };
  }

  function hitDice(value) {
    const source = state(value);
    const spent = Math.max(0, Math.min(level(source), number(source.character.hitDice?.d10?.spent)));
    return { die: 'd10', total: level(source), spent, available: level(source) - spent };
  }

  function choices(value) { return state(value).classes.treasureHunter.choices || {}; }
  function classSkillProficiencies(value) { return unique(choices(value).classSkills); }

  function skillStatus(name, value) {
    const source = state(value);
    let status = Math.max(0, Math.min(2, number(source.character.skills?.[name], 0)));
    const classChoices = choices(source);
    const background = Origin.background(source);
    const speciesChoices = source.character.origin?.speciesChoices || {};
    if (classSkillProficiencies(source).includes(name) || (background.skills || []).includes(name) || (speciesChoices.skills || []).includes(name)) status = Math.max(status, 1);
    if (background.feat === 'Skilled' && (background.skilledChoices || []).includes(name)) status = Math.max(status, 1);
    if (classChoices.expertise === name) status = 2;
    return status;
  }

  function skillMod(name, value) {
    const source = state(value);
    const status = skillStatus(name, source);
    return mod(SKILLS[name], source) + (status ? pb(source) * status : 0) + Rules.exhaustionPenalty(exhaustion(source));
  }

  function fixedInitiative(value) {
    const source = state(value);
    const fixed = Rules.fixedInitiativeMode(conditions(source));
    if (fixed.locked) return fixed;
    return activeRelics(source).some(relic => relic.id === 'silent-pocket-watch' || relic.relicId === 'silent-pocket-watch')
      ? { mode: 'advantage', locked: true, sources: ['Tiché kapesní hodinky'] }
      : { mode: 'normal', locked: false, sources: [] };
  }
  function fixedSave(abilityKey, value) { return Rules.fixedSaveMode(conditions(state(value)), abilityKey); }
  function fixedSkill(value) { return Rules.fixedSkillMode(conditions(state(value))); }

  function fixedAttack(value) {
    const source = state(value);
    const disadvantage = Rules.attackDisadvantage(conditions(source));
    const advantage = conditions(source).includes('Invisible') ? ['Invisible'] : [];
    if (advantage.length && disadvantage.length) return { mode: 'normal', locked: true, sources: [...advantage, ...disadvantage] };
    if (disadvantage.length) return { mode: 'disadvantage', locked: true, sources: disadvantage };
    if (advantage.length) return { mode: 'advantage', locked: true, sources: advantage };
    return { mode: 'normal', locked: false, sources: [] };
  }

  function effectiveRollMode(kind, key, value) {
    const source = state(value);
    let fixed;
    let manual = 'normal';
    if (kind === 'initiative') { fixed = fixedInitiative(source); manual = source.character.rollModes.initiative; }
    else if (kind === 'save') { fixed = fixedSave(key, source); manual = source.character.rollModes.saves?.[key]; }
    else if (kind === 'skill') { fixed = fixedSkill(source); manual = source.character.rollModes.skills?.[key]; }
    else { fixed = fixedAttack(source); manual = source.character.rollModes.attacks; }
    return fixed.locked ? fixed : { mode: manual || 'normal', locked: false, sources: [] };
  }

  function proficiencyLists(value) {
    const source = state(value);
    const p = source.character.proficiencies || {};
    const background = Origin.background(source);
    const origin = source.character.origin || {};
    const classChoices = choices(source);
    const trained = background.feat === 'Skilled' ? background.skilledChoices || [] : [];
    const secondaryIsVehicle = Origin.VEHICLES.includes(background.secondary) || /vehicle|train|automobile|motorcycle|aircraft|boat|ship/i.test(background.secondary || '');
    return {
      armor: unique([...(T.armor || []), ...(p.armor || [])]),
      weapons: unique([...(T.weapons || []), ...(p.weapons || []), origin.speciesChoices?.simpleWeapon]),
      tools: unique(["Thieves' Tools", "Navigator's Tools", ...(p.tools || []), background.tool, secondaryIsVehicle ? '' : background.secondary, ...trained.filter(item => !SKILLS[item])]),
      vehicles: unique([...(p.vehicles || []), ...(classChoices.vehicles || []), secondaryIsVehicle ? background.secondary : '']),
      languages: unique([...(p.languages || []), ...(classChoices.ancientLanguages || [])]),
      senses: unique([...(p.senses || []), ...(Origin.species(source)?.id === 'city_goblin_lukys_campaign' ? ['Darkvision 60 ft.', 'Blindsight 10 ft.'] : [])])
    };
  }

  function damageDefenses(value) {
    const source = state(value);
    const base = source.character.damageDefenses || {};
    const result = {
      resistances: unique(base.resistances), immunities: unique(base.immunities),
      vulnerabilities: unique(base.vulnerabilities), conditionImmunities: unique(base.conditionImmunities)
    };
    for (const relic of activeRelics(source)) {
      if (relic.resistance) result.resistances = unique([...result.resistances, relic.resistance]);
      if (relic.choice === 'damageResistance' && relic.selectedDamageType) result.resistances = unique([...result.resistances, relic.selectedDamageType]);
      if (relic.id === 'last-exorcists-testament' || relic.relicId === 'last-exorcists-testament') {
        result.conditionImmunities = unique([...result.conditionImmunities, 'Charmed', 'Frightened']);
      }
    }
    return result;
  }

  function weaponEnhancement(item) { return enhancementFromName(item?.name) + genericModifiers(item, 'attack'); }
  function weaponAbility(item, value) {
    const source = state(value);
    if (S.A.includes(item?.attackAbility)) return item.attackAbility;
    const raw = item?.raw || {};
    const text = `${item?.category || ''} ${raw.weapon_range || ''} ${(raw.properties || []).map?.(property => property.name || property) || ''}`.toLowerCase();
    if (text.includes('ranged')) return 'DEX';
    if (text.includes('finesse')) return mod('DEX', source) >= mod('STR', source) ? 'DEX' : 'STR';
    return 'STR';
  }

  function weaponAttacks(value) {
    const source = state(value);
    const gear = source.character.gear || {};
    const fromInventory = (gear.inventory || []).filter(item => {
      const raw = item?.raw || {};
      return item && typeof item === 'object' && (raw.weapon_category || raw.damage?.damage_dice || /weapon/i.test(`${item.kind || ''} ${item.category || ''}`));
    });
    const seen = new Set();
    return [...(gear.weapons || []), ...fromInventory].filter(item => item && typeof item === 'object').filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    }).map(item => {
      const abilityKey = weaponAbility(item, source);
      const enhancement = weaponEnhancement(item);
      const raw = item.raw || {};
      const dice = item.damage || raw.damage?.damage_dice || '—';
      const type = item.damageType || raw.damage?.damage_type?.name || '';
      const damageModifier = mod(abilityKey, source) + enhancement;
      return {
        ...item, ability: abilityKey, hit: mod(abilityKey, source) + pb(source) + enhancement,
        damage: `${dice}${damageModifier ? ` ${signed(damageModifier)}` : ''}${type ? ` ${type}` : ''}`,
        mastery: item.mastery || raw.mastery?.name || raw.mastery || ''
      };
    });
  }

  function relicMax(entry, value) {
    const definition = relicDefinition(entry?.relicId || entry?.id) || entry || {};
    return definition.uses === 'PB' ? pb(value) : Math.max(0, number(definition.charges || definition.uses, 0));
  }

  function choiceRequirements(value) {
    const source = state(value);
    const selected = choices(source);
    const missing = [];
    for (const [featureId, definitions] of Object.entries(T.choiceDefinitions || {})) {
      const feature = T.features.find(item => item.id === featureId);
      if (!feature || feature.level > level(source)) continue;
      for (const definition of definitions) {
        const raw = selected[definition.key];
        const values = Array.isArray(raw) ? raw.filter(Boolean) : raw ? [raw] : [];
        if (values.length < definition.count) missing.push(`${feature.name}: ${definition.label}`);
        if (definition.unique && new Set(values).size !== values.length) missing.push(`${feature.name}: choices must be unique`);
      }
    }
    if (level(source) >= 1 && classSkillProficiencies(source).length !== 3) missing.unshift('Treasure Hunter: 3 class skills');
    return missing;
  }

  function originActions(value) {
    const source = state(value);
    if (Origin.backgroundFeat(source) !== 'Healer') return [];
    return [{
      id: 'origin-healer-battle-medic', name: 'Healer — Battle Medic', action: 'Action', source: 'Background: Healer',
      group: 'core', summary: 'With a Healer’s Kit, expend one use as an Action. The creature spends one Hit Point Die and regains the die roll + your Proficiency Bonus.'
    }];
  }

  window.CharacterDerived = {
    SKILLS, ARMOR, state, level, pb, ability, mod, conditions, exhaustion, inventory, activeItems,
    relicState, relicDefinition, activeRelics, armorClass, armorBreakdown, initiative, isSaveProficient,
    saveMod, whipRopeDC, relicDC, baseSpeed, speed, speedBreakdown, hpMax, hp, hitDice,
    choices, classSkillProficiencies, skillStatus, skillMod, fixedInitiative, fixedSave, fixedSkill,
    fixedAttack, effectiveRollMode, proficiencyLists, damageDefenses, weaponAttacks, weaponEnhancement,
    relicMax, choiceRequirements, originActions, signed
  };
  window.V7SDerived = window.CharacterDerived;
})();
