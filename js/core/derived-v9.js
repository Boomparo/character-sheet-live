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
  const subclassName = value => {
    const source = state(value);
    return level(source) >= 3 && source.classes?.treasureHunter?.choices?.subclass === 'Occult Collector' ? 'Occult Collector' : '';
  };

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
    const seen = new Set();
    return [...(gear.weapons || []), ...(gear.armor || []), ...(gear.inventory || [])].filter(item => {
      if (!item || typeof item !== 'object' || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }

  function isItemEquipped(item) { return !!item && ACTIVE_LOCATIONS.has(item.location) && !item.containerId; }
  function isItemActive(item) { return isItemEquipped(item) && (!item.attunement || item.isAttuned); }

  function activeItems(value) {
    return inventory(value).filter(isItemActive);
  }

  function relicState(value) { return state(value).classes?.treasureHunter?.relics || []; }
  function relicDefinition(id) { return Relics.find(relic => relic.id === id) || null; }
  function activeRelics(value) {
    if (!subclassName(value)) return [];
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
    return item?.itemType === 'shield' || text.includes('shield') || String(raw.armor_category || '').toLowerCase() === 'shield';
  }

  function isWeapon(item) {
    const raw = item?.raw || {};
    return !!item && (item.itemType === 'weapon' || raw.weapon_category || raw.damage?.damage_dice || /weapon/i.test(`${item.kind || ''} ${item.category || ''}`));
  }

  function isArmor(item) {
    const raw = item?.raw || {};
    return !!item && !isShield(item) && (item.itemType === 'armor' || raw.armor_category || !!armorKeyFromName(item.name));
  }

  function armorFormulaFromItem(item) {
    if (!item || isShield(item)) return null;
    const raw = item.raw || {};
    if (item.armorBase != null && item.armorBase !== '' && Number.isFinite(Number(item.armorBase))) {
      const mode = item.armorDex || 'full';
      return {
        name: item.name || 'Armor', base: number(item.armorBase, 10), dex: mode !== 'none',
        cap: mode === 'capped' ? Math.max(0, number(item.armorDexCap, 2)) : null,
        enhancement: enhancementFromName(item.name), item
      };
    }
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
      let bonus = protectionBonus(item) + genericModifiers(item, 'ac') + number(item.acBonus);
      if (isShield(item)) bonus += (item.acBonus == null ? number(item.raw?.armor_class?.base, 2) : 0) + enhancementFromName(item.name);
      return total + bonus;
    }, 0);
  }

  function itemSaveBonus(abilityKey, value) {
    return activeItems(value).reduce((total, item) => total + protectionBonus(item) + genericModifiers(item, 'save', abilityKey), 0);
  }
  function itemInitiativeBonus(value) { return activeItems(value).reduce((total, item) => total + genericModifiers(item, 'initiative') + number(item.initiativeBonus), 0); }
  function itemSpeedBonus(value) { return activeItems(value).reduce((total, item) => total + genericModifiers(item, 'speed') + number(item.speedBonus), 0); }
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
    if (Origin.backgroundFeat(source) === 'Defence' && armor.item) parts.push([`Defence · ${Origin.BACKGROUND.name}`, '+1']);
    return { value: armorClass(source), label: armor.item ? armor.name : 'Unarmored', parts };
  }

  function isSaveProficient(abilityKey, value) {
    const source = state(value);
    return T.saves.includes(abilityKey) || (Origin.backgroundFeat(source) === 'Resilient' && Origin.background(source).resilientAbility === abilityKey);
  }

  function saveProficiencySources(abilityKey, value) {
    const source = state(value);
    const sources = [];
    if (T.saves.includes(abilityKey)) sources.push('Treasure Hunter');
    if (Origin.backgroundFeat(source) === 'Resilient' && Origin.background(source).resilientAbility === abilityKey) sources.push(`Resilient · ${Origin.BACKGROUND.name}`);
    return sources;
  }

  function initiative(value) {
    const source = state(value);
    const alert = Origin.backgroundFeat(source) === 'Alert' ? pb(source) : 0;
    return mod('DEX', source) + number(source.character.initiativeBonus) + itemInitiativeBonus(source) + relicInitiativeBonus(source) + alert + Rules.exhaustionPenalty(exhaustion(source));
  }

  function initiativeBreakdown(value) {
    const source = state(value);
    const parts = [['DEX', signed(mod('DEX', source))]];
    const manual = number(source.character.initiativeBonus); if (manual) parts.push(['Manual bonus', signed(manual)]);
    const items = itemInitiativeBonus(source); if (items) parts.push(['Equipped items', signed(items)]);
    const relics = relicInitiativeBonus(source); if (relics) parts.push(['Prepared relics', signed(relics)]);
    if (Origin.backgroundFeat(source) === 'Alert') parts.push([`Alert · ${Origin.BACKGROUND.name}`, signed(pb(source))]);
    const penalty = Rules.exhaustionPenalty(exhaustion(source)); if (penalty) parts.push(['Exhaustion', signed(penalty)]);
    return { value: initiative(source), parts };
  }

  function saveMod(abilityKey, value) {
    const source = state(value);
    if (Rules.saveAutoFails(conditions(source), abilityKey) || exhaustion(source) >= 6) return null;
    return mod(abilityKey, source) + (isSaveProficient(abilityKey, source) ? pb(source) : 0) + itemSaveBonus(abilityKey, source) + relicSaveBonus(abilityKey, source) + Rules.exhaustionPenalty(exhaustion(source));
  }

  function whipRopeDC(value) { const source = state(value); return 8 + pb(source) + mod('DEX', source) + itemDcBonus('whipRope', source) + relicDcBonus('whipRope', source); }
  function relicDC(value) { const source = state(value); return 8 + pb(source) + mod('INT', source) + itemDcBonus('relic', source) + relicDcBonus('relic', source); }

  function dcBreakdown(kind, value) {
    const source = state(value);
    const relic = kind === 'relic';
    const abilityKey = relic ? 'INT' : 'DEX';
    const target = relic ? 'relic' : 'whipRope';
    const parts = [['Base', '8'], ['Proficiency Bonus', signed(pb(source))], [abilityKey, signed(mod(abilityKey, source))]];
    const items = itemDcBonus(target, source); if (items) parts.push(['Equipped items', signed(items)]);
    const relics = relicDcBonus(target, source); if (relics) parts.push(['Prepared relics', signed(relics)]);
    return { value: relic ? relicDC(source) : whipRopeDC(source), parts };
  }

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

  function hpBreakdown(value) {
    const source = state(value);
    if (source.character.hp.auto === false) return { value: hpMax(source), parts: [['Manual Max HP', hpMax(source)]] };
    const characterLevel = level(source);
    const constitution = mod('CON', source);
    const parts = [['Treasure Hunter Hit Die', `10 + ${Math.max(0, characterLevel - 1)} × 6`], ['CON per level', `${signed(constitution)} × ${characterLevel}`]];
    if (Origin.backgroundFeat(source) === 'Tough') parts.push([`Tough · ${Origin.BACKGROUND.name}`, `+${2 * characterLevel}`]);
    return { value: hpMax(source), parts };
  }

  function hitDice(value) {
    const source = state(value);
    const spent = Math.max(0, Math.min(level(source), number(source.character.hitDice?.d10?.spent)));
    return { die: 'd10', total: level(source), spent, available: level(source) - spent };
  }

  function choices(value) { return state(value).classes.treasureHunter.choices || {}; }
  function classSkillProficiencies(value) { return unique(choices(value).classSkills); }

  function skillProficiencySources(name, value) {
    const source = state(value);
    const selected = choices(source);
    const background = Origin.background(source);
    const species = Origin.species(source);
    const speciesChoices = source.character.origin?.speciesChoices || {};
    const entries = [];
    const add = (label, status = 1) => {
      if (!label) return;
      const current = entries.find(entry => entry.source === label);
      if (current) current.status = Math.max(current.status, status);
      else entries.push({ source: label, status });
    };
    const manual = Math.max(0, Math.min(2, number(source.character.skills?.[name], 0)));
    if (manual) add('Manual override', manual);
    if (classSkillProficiencies(source).includes(name)) add('Treasure Hunter');
    if ((background.skills || []).includes(name)) add(Origin.BACKGROUND.name);
    if ((speciesChoices.skills || []).includes(name)) add(species?.name || 'Species');
    if (background.feat === 'Skilled' && (background.skilledChoices || []).includes(name)) add('Skilled');
    if (selected.expertise === name) add('Odborná expertíza', 2);
    return entries;
  }

  function skillStatus(name, value) {
    return skillProficiencySources(name, value).reduce((status, entry) => Math.max(status, entry.status), 0);
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

  function canonicalWeaponName(item) {
    return String(item?.masteryWeapon || item?.raw?.name || item?.name || '').trim();
  }

  function weaponMasteryProperty(name, value) {
    const sought = String(name || '').trim().toLowerCase();
    const item = inventory(value).find(candidate => canonicalWeaponName(candidate).toLowerCase() === sought || String(candidate?.name || '').trim().toLowerCase() === sought);
    return String(item?.mastery || item?.raw?.mastery?.name || item?.raw?.mastery || Rules.weaponMastery(name) || '').trim();
  }

  function weaponMasteryEntries(value) {
    const source = state(value);
    const entries = [];
    const add = (weapon, grantSource) => {
      if (!weapon) return;
      const property = weaponMasteryProperty(weapon, source);
      const label = property ? `${weapon} · ${property}` : weapon;
      let entry = entries.find(item => item.weapon.toLowerCase() === String(weapon).toLowerCase());
      if (!entry) {
        entry = { name: label, weapon, property, description: property ? Rules.MASTERY_PROPERTIES[property] || '' : 'Set the weapon’s Mastery Property in Gear.', sources: [] };
        entries.push(entry);
      }
      if (grantSource && !entry.sources.includes(grantSource)) entry.sources.push(grantSource);
    };
    if (level(source) >= 1) add('Whip', 'Mistr biče');
    unique(choices(source).weaponMasteries).forEach(weapon => add(weapon, 'Weapon Mastery'));
    return entries;
  }

  function proficiencyEntries(value) {
    const source = state(value);
    const p = source.character.proficiencies || {};
    const background = Origin.background(source);
    const origin = source.character.origin || {};
    const classChoices = choices(source);
    const trained = background.feat === 'Skilled' ? background.skilledChoices || [] : [];
    const secondaryIsVehicle = Origin.VEHICLES.includes(background.secondary) || /vehicle|train|automobile|motorcycle|aircraft|boat|ship/i.test(background.secondary || '');
    const result = { armor: [], weapons: [], tools: [], vehicles: [], languages: [], senses: [], masteries: weaponMasteryEntries(source) };
    const add = (category, name, grantSource) => {
      if (!name) return;
      let entry = result[category].find(item => item.name === name);
      if (!entry) { entry = { name, sources: [] }; result[category].push(entry); }
      if (grantSource && !entry.sources.includes(grantSource)) entry.sources.push(grantSource);
    };
    (T.armor || []).forEach(name => add('armor', name, 'Treasure Hunter'));
    (T.weapons || []).forEach(name => add('weapons', name, 'Treasure Hunter'));
    add('tools', "Thieves' Tools", 'Treasure Hunter');
    add('tools', "Navigator's Tools", 'Treasure Hunter');
    (p.armor || []).forEach(name => add('armor', name, result.armor.some(entry => entry.name === name) ? '' : 'Manual'));
    (p.weapons || []).forEach(name => add('weapons', name, result.weapons.some(entry => entry.name === name) ? '' : 'Manual'));
    (p.tools || []).forEach(name => add('tools', name, result.tools.some(entry => entry.name === name) ? '' : 'Manual'));
    (p.vehicles || []).forEach(name => add('vehicles', name, 'Manual'));
    (p.languages || []).forEach(name => add('languages', name, 'Manual'));
    (p.senses || []).forEach(name => add('senses', name, 'Manual'));
    add('weapons', origin.speciesChoices?.simpleWeapon, Origin.species(source)?.name || 'Species');
    add('tools', background.tool, Origin.BACKGROUND.name);
    add(secondaryIsVehicle ? 'vehicles' : 'tools', background.secondary, Origin.BACKGROUND.name);
    trained.filter(item => !SKILLS[item]).forEach(name => add(Origin.VEHICLES.includes(name) ? 'vehicles' : 'tools', name, 'Skilled'));
    (classChoices.vehicles || []).forEach(name => add('vehicles', name, 'Řidičský průkaz'));
    (classChoices.ancientLanguages || []).forEach(name => add('languages', name, 'Starodávné jazyky'));
    if (Origin.species(source)?.id === 'city_goblin_lukys_campaign') {
      add('senses', 'Darkvision 60 ft.', 'City Goblin · Darkvision');
      add('senses', 'Blindsight 10 ft.', 'City Goblin · Jacobson’s Organ');
    }
    return result;
  }

  function proficiencyLists(value) {
    return Object.fromEntries(Object.entries(proficiencyEntries(value)).map(([category, entries]) => [category, entries.map(entry => entry.name)]));
  }

  function damageDefenseEntries(value) {
    const source = state(value);
    const base = source.character.damageDefenses || {};
    const result = { resistances: [], immunities: [], vulnerabilities: [], conditionImmunities: [] };
    const add = (category, name, grantSource) => {
      if (!name) return;
      let entry = result[category].find(item => item.name === name);
      if (!entry) { entry = { name, sources: [] }; result[category].push(entry); }
      if (grantSource && !entry.sources.includes(grantSource)) entry.sources.push(grantSource);
    };
    for (const category of Object.keys(result)) (base[category] || []).forEach(name => add(category, name, 'Manual'));
    const values = input => Array.isArray(input) ? input : String(input || '').split(',').map(name => name.trim()).filter(Boolean);
    for (const item of activeItems(source)) {
      const itemSource = item.name || 'Equipped item';
      values(item.resistance || item.damageDefenses?.resistances).forEach(name => add('resistances', name, itemSource));
      values(item.immunity || item.damageDefenses?.immunities).forEach(name => add('immunities', name, itemSource));
      values(item.vulnerability || item.damageDefenses?.vulnerabilities).forEach(name => add('vulnerabilities', name, itemSource));
      values(item.conditionImmunity || item.damageDefenses?.conditionImmunities).forEach(name => add('conditionImmunities', name, itemSource));
    }
    for (const relic of activeRelics(source)) {
      const relicSource = relic.name || 'Prepared relic';
      if (relic.resistance) add('resistances', relic.resistance, relicSource);
      if (relic.choice === 'damageResistance' && relic.selectedDamageType) add('resistances', relic.selectedDamageType, relicSource);
      if (relic.id === 'last-exorcists-testament' || relic.relicId === 'last-exorcists-testament') {
        add('conditionImmunities', 'Charmed', relicSource);
        add('conditionImmunities', 'Frightened', relicSource);
      }
    }
    if (conditions(source).includes('Petrified')) add('resistances', 'All', 'Petrified');
    return result;
  }

  function damageDefenses(value) {
    return Object.fromEntries(Object.entries(damageDefenseEntries(value)).map(([category, entries]) => [category, entries.map(entry => entry.name)]));
  }

  function weaponEnhancement(item) { return enhancementFromName(item?.name) + genericModifiers(item, 'attack') + number(item?.attackBonus); }
  function weaponDamageBonus(item) { return enhancementFromName(item?.name) + genericModifiers(item, 'damage') + number(item?.damageBonus); }
  function weaponAbility(item, value) {
    const source = state(value);
    if (S.A.includes(item?.attackAbility)) return item.attackAbility;
    const raw = item?.raw || {};
    const text = `${item?.category || ''} ${raw.weapon_range || ''} ${displayValues(item?.properties).join(' ')} ${(raw.properties || []).map?.(property => property.name || property) || ''}`.toLowerCase();
    if (text.includes('ranged')) return 'DEX';
    if (text.includes('finesse')) return mod('DEX', source) >= mod('STR', source) ? 'DEX' : 'STR';
    return 'STR';
  }

  function displayValues(value) {
    if (value == null || value === '') return [];
    const values = Array.isArray(value) ? value : [value];
    return values.map(entry => typeof entry === 'object' ? entry.name || entry.index || '' : String(entry)).filter(Boolean);
  }

  function weaponRange(item) {
    if (typeof item?.rangeLabel === 'string' && item.rangeLabel) return item.rangeLabel;
    if (typeof item?.range === 'string' && item.range) return item.range;
    const raw = item?.raw || {};
    const ranged = raw.range;
    const thrown = raw.throw_range;
    const selected = ranged?.normal != null ? ranged : thrown?.normal != null ? thrown : null;
    if (!selected) return String(raw.weapon_range || '');
    return `${selected.normal}${selected.long ? `/${selected.long}` : ''} ft.`;
  }

  function weaponProperties(item) {
    return unique([...displayValues(item?.properties), ...displayValues(item?.raw?.properties)]);
  }

  function weaponAttacks(value, options = {}) {
    const source = state(value);
    const gear = source.character.gear || {};
    const fromInventory = (gear.inventory || []).filter(isWeapon);
    const seen = new Set();
    return [...(gear.weapons || []), ...fromInventory].filter(item => item && typeof item === 'object').filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    }).filter(item => options.includeUnequipped || isItemEquipped(item)).map(item => {
      const abilityKey = weaponAbility(item, source);
      const enhancement = weaponEnhancement(item);
      const raw = item.raw || {};
      const dice = item.damage || raw.damage?.damage_dice || '—';
      const type = item.damageType || raw.damage?.damage_type?.name || '';
      const damageModifier = mod(abilityKey, source) + weaponDamageBonus(item);
      const canonicalName = canonicalWeaponName(item);
      const masteryProperty = item.mastery || raw.mastery?.name || raw.mastery || Rules.weaponMastery(canonicalName) || '';
      const selectedMasteries = choices(source).weaponMasteries || [];
      const masterySources = [];
      if (String(canonicalName).toLowerCase() === 'whip' && level(source) >= 1) masterySources.push('Mistr biče');
      if (selectedMasteries.some(name => String(name).toLowerCase() === String(canonicalName).toLowerCase() || String(name).toLowerCase() === String(item.name || '').toLowerCase())) masterySources.push('Weapon Mastery');
      const activeMastery = masterySources.length ? masteryProperty : '';
      const effects = Origin.backgroundFeat(source) === 'Savage Attacker' ? [{ name: 'Savage Attacker', source: Origin.BACKGROUND.name, summary: Origin.BACKGROUND.feats['Savage Attacker'].description }] : [];
      return {
        ...item, ability: abilityKey, hit: mod(abilityKey, source) + pb(source) + enhancement,
        damage: `${dice}${damageModifier ? ` ${signed(damageModifier)}` : ''}${type ? ` ${type}` : ''}`,
        mastery: activeMastery, masteryProperty, masterySources,
        masteryDescription: activeMastery ? Rules.MASTERY_PROPERTIES?.[activeMastery] || '' : '',
        rangeText: weaponRange(item), propertiesText: weaponProperties(item).join(', '), effects,
        attackBreakdown: [['Ability', `${abilityKey} ${signed(mod(abilityKey, source))}`], ['Proficiency Bonus', signed(pb(source))], ...(enhancement ? [['Weapon bonuses', signed(enhancement)]] : [])]
      };
    });
  }

  function itemActions(value) {
    const source = state(value);
    return activeItems(source).filter(item => item.actionType && item.actionName).map(item => ({
      id: `item:${item.id}`, itemId: item.id, name: item.actionName, action: item.actionType,
      source: item.name, group: 'custom', summary: item.actionSummary || item.description || item.notes || '',
      damage: item.actionDamage || '', isAttack: !!item.actionIsAttack
    }));
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
    if (level(source) >= 1 && !String(selected.startingMelee || '').trim()) missing.push('Treasure Hunter: starting Finesse weapon');
    if (level(source) >= 1 && !String(selected.startingRanged || '').trim()) missing.push('Treasure Hunter: starting ranged weapon or firearm');
    const background = Origin.background(source);
    const proficiencyChoices = [
      ...(source.character.origin?.speciesChoices?.skills || []), ...(background.skills || []),
      background.tool, background.secondary, ...(background.feat === 'Skilled' ? background.skilledChoices || [] : []),
      ...classSkillProficiencies(source), ...(selected.vehicles || [])
    ].filter(Boolean);
    if (new Set(proficiencyChoices).size !== proficiencyChoices.length) missing.push('Builder: proficiency choices must be unique');
    return missing;
  }

  function originActions(value) {
    const source = state(value);
    const records = [];
    if (Origin.backgroundFeat(source) === 'Healer') records.push({
      id: 'origin-healer-battle-medic', name: 'Healer: Battle Medic', action: 'Action', source: `Background · ${Origin.BACKGROUND.name}`,
      group: 'core', summary: 'With a Healer’s Kit, expend one use as an Action. The creature spends one Hit Point Die and regains the die roll + your Proficiency Bonus.'
    });
    const selectedSpecies = Origin.species(source);
    if (selectedSpecies?.id === 'city_goblin_lukys_campaign') records.push({
      id: 'origin-city-goblin-bite-claw', name: 'Bite and Claw', action: 'Action', source: selectedSpecies.name,
      group: 'core', damage: level(source) >= 5 ? '2d6' : '1d6', isAttack: true,
      summary: 'Use this damage die for an Unarmed Strike. The supplied species source does not define its damage type or attack ability; confirm those with the DM.'
    });
    return records;
  }

  window.CharacterDerived = {
    SKILLS, ARMOR, state, level, pb, subclassName, ability, mod, conditions, exhaustion, inventory, activeItems,
    isItemEquipped, isItemActive, isWeapon, isArmor, isShield,
    relicState, relicDefinition, activeRelics, armorClass, armorBreakdown, initiative, initiativeBreakdown, isSaveProficient, saveProficiencySources,
    saveMod, whipRopeDC, relicDC, dcBreakdown, baseSpeed, speed, speedBreakdown, hpMax, hp, hpBreakdown, hitDice,
    choices, classSkillProficiencies, skillProficiencySources, skillStatus, skillMod, fixedInitiative, fixedSave, fixedSkill,
    fixedAttack, effectiveRollMode, weaponMasteryProperty, weaponMasteryEntries, proficiencyEntries, proficiencyLists, damageDefenseEntries, damageDefenses, weaponAttacks, itemActions, weaponEnhancement,
    relicMax, choiceRequirements, originActions, signed
  };
  window.V7SDerived = window.CharacterDerived;
})();
