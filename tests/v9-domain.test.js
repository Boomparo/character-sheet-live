const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const memory = new Map();
global.window = global;
global.crypto = require('node:crypto').webcrypto;
global.localStorage = {
  getItem: key => memory.has(key) ? memory.get(key) : null,
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: key => memory.delete(key)
};

const legacy = {
  schemaVersion: 10,
  character: {
    name: 'Legacy Hero', race: 'City Goblin', level: 3,
    hp: { current: 22, max: 22, temp: 4, auto: false },
    abilities: { STR: 10, DEX: 16, CON: 12, INT: 14, WIS: 10, CHA: 8 },
    speed: 25, skills: { Stealth: 2, History: 1, Arcana: 1 }, gear: { money: { gp: 7 }, inventory: [{ id: 'legacy-torch', name: 'Torch', location: 'backpack' }], weapons: [], armor: [] },
    origin: {
      species: 'City Goblin', speciesChoices: { skills: ['Stealth', 'Deception'], simpleWeapon: 'Dagger' },
      background: { name: 'Lukyho univerzální background', skills: ['History', 'Insight'], tool: 'Forgery Kit', secondary: 'Train', feat: 'Alert', abilityMode: '+2/+1', abilityChoices: ['DEX', 'INT'], appliedBonuses: { DEX: 2, INT: 1 } }
    }
  },
  classes: { treasureHunter: { coolUsed: 1, ancientLanguages: ['Latina', 'Kečuánština', ''], vehicles: ['Train', 'Boat'], expertise: 'Stealth', weaponMasteries: ['Whip', 'Dagger'], featureUses: {}, relics: [{ id: 'healing-amulet', prepared: true, used: 1 }], choices: {} } },
  campaign: { npcs: [{ name: 'Contact' }] }, ui: {}
};
memory.set('character-sheet-v7s', JSON.stringify(legacy));

for (const file of [
  'js/classes/treasure-hunter/data-v7s.js',
  'js/classes/treasure-hunter/relics-v7s.js',
  'js/classes/treasure-hunter/choices-v7s.js',
  'js/classes/treasure-hunter/content-v9.js',
  'js/core/state-v9.js', 'js/core/rules-2024.js', 'js/core/origin-v9.js',
  'js/core/derived-v9.js', 'js/core/commands-v9.js', 'js/core/catalog-srd.js'
]) require(path.join(root, file));

const S = global.CharacterState;
const D = global.CharacterDerived;
const C = global.CharacterCommands;
const T = global.TreasureHunterDataV7s;
const Relics = global.TreasureHunterRelicsV7s;
const Catalog = global.V7SItemCatalog;

assert.equal(S.APP_VERSION, '9.4.0-subclass-encumbrance');

function fresh(mutator) {
  const value = S.fresh();
  if (mutator) mutator(value);
  S.replace(value, 'test:reset');
  S.flush();
  return S.get();
}

test('legacy V7 data migrates once without deleting the legacy key', () => {
  const state = S.get();
  assert.equal(state.character.name, 'Legacy Hero');
  assert.equal(state.schemaVersion, 14);
  assert.equal(state.character.speed, 30, 'legacy City Goblin speed is converted back to canonical base speed');
  assert.equal(D.speed(state), 25);
  assert.equal(D.ability('DEX', state), 16, 'stored origin bonus is not applied twice');
  assert.deepEqual(state.classes.treasureHunter.choices.ancientLanguages, ['Latina', 'Kečuánština', '']);
  assert.equal(state.classes.treasureHunter.choices.expertise, 'Stealth');
  assert.equal(state.classes.treasureHunter.choices.subclass, '', 'legacy level does not silently select a subclass');
  assert.equal(state.classes.treasureHunter.choices.subclassConfirmed, false);
  assert.equal(Object.hasOwn(state.classes.treasureHunter, 'ancientLanguages'), false);
  assert.deepEqual(state.classes.treasureHunter.choices.weaponMasteries.filter(Boolean), ['Dagger'], 'redundant Whip selection migrates away because Mistr biče already grants Slow');
  assert.equal(state.classes.treasureHunter.relics[0].relicId, 'healing-amulet');
  assert.equal(state.character.skills.History, undefined, 'legacy generated grants are migrated out of manual overrides');
  assert.equal(state.character.skills.Arcana, 1, 'unrelated manual proficiency is preserved');
  assert.equal(D.skillStatus('History', state), 1);
  S.update(current => { current.character.origin.background.skills = ['Nature', 'Insight']; });
  assert.equal(D.skillStatus('History'), 0, 'changing a generated choice removes its old mechanical grant');
  assert.equal(state.character.gear.armor.length, 0, 'migration does not invent a fixed class loadout');
  const backpack = state.character.gear.inventory.find(item => item.name === 'Backpack');
  const torch = state.character.gear.inventory.find(item => item.id === 'legacy-torch');
  assert.equal(backpack.isContainer, true, 'legacy pseudo-Backpack becomes a real container item');
  assert.equal(torch.containerId, backpack.id);
  assert.equal(torch.location, backpack.location);
  assert.equal(state.character.gear.starting.legacy, true);
  assert.ok(memory.has('character-sheet-v7s'));
  assert.ok(memory.has('character-sheet-v9'));
});

test('damage applies defenses, then Temp HP, then Current HP', () => {
  fresh(state => {
    state.character.hp = { current: 10, max: 10, temp: 5, auto: false };
    state.character.damageDefenses.resistances = ['Fire'];
    state.character.damageDefenses.vulnerabilities = ['Fire'];
  });
  const result = C.applyDamage(7, 'Fire');
  assert.deepEqual(result.steps, ['resistance', 'vulnerability']);
  assert.equal(result.applied, 6);
  assert.equal(result.absorbed, 5);
  assert.equal(S.get().character.hp.temp, 0);
  assert.equal(S.get().character.hp.current, 9);

  S.update(state => {
    state.character.hp = { current: 9, max: 10, temp: 3, auto: false };
    state.character.damageDefenses.immunities = ['Cold'];
  });
  const immune = C.applyDamage(99, 'Cold');
  assert.equal(immune.applied, 0);
  assert.equal(S.get().character.hp.temp, 3);
  assert.equal(S.get().character.hp.current, 9);
});

test('condition and equipped-item defenses enter the same damage pipeline', () => {
  fresh(state => {
    state.character.hp = { current: 20, max: 20, temp: 0, auto: false };
    state.character.conditions = ['Petrified'];
    state.character.gear.inventory.push({ id: 'ward', name: 'Ward Ring', location: 'equipped', quantity: 1, immunity: 'Fire' });
  });
  assert.ok(D.damageDefenseEntries().resistances.find(entry => entry.name === 'All').sources.includes('Petrified'));
  assert.ok(D.damageDefenseEntries().immunities.find(entry => entry.name === 'Fire').sources.includes('Ward Ring'));
  assert.equal(C.applyDamage(9, 'Cold').applied, 4);
  assert.equal(C.applyDamage(9, 'Fire').applied, 0);
});

test('automatic AC has one calculation for armor, shield and Defence', () => {
  fresh(state => {
    state.character.abilities.DEX = 16;
  });
  assert.equal(D.armorClass(), 13);
  S.update(state => {
    state.character.gear.inventory.push({ id: 'studded', name: 'Studded Leather Armor', location: 'worn', quantity: 1, modifiers: [], raw: { armor_class: { base: 12, dex_bonus: true } } });
    state.character.gear.inventory.push({ id: 'shield', name: 'Shield', location: 'equipped', quantity: 1, modifiers: [], raw: { armor_category: 'Shield', armor_class: { base: 2 } } });
    state.character.origin.background.feat = 'Defence';
  });
  assert.equal(D.armorClass(), 18);
  const parts = D.armorBreakdown().parts.map(([label]) => label);
  assert.ok(parts.includes('Equipped items'));
  assert.ok(parts.some(label => label.startsWith('Defence ·')));
});

test('subclass identity requires an explicit choice and the registry accepts future subclasses', () => {
  fresh(state => {
    state.character.level = 1;
    state.classes.treasureHunter.choices.weaponMasteries = ['Dagger', 'Shortbow'];
    state.character.gear.weapons.push({ id: 'whip', name: 'Whip', itemType: 'weapon', damage: '1d4', damageType: 'Slashing', mastery: 'Slow', location: 'equipped' });
  });
  assert.equal(D.subclassName(), '');
  const whip = D.weaponAttacks().find(attack => attack.name === 'Whip');
  assert.equal(whip.mastery, 'Slow');
  assert.deepEqual(whip.masterySources, ['Mistr biče']);
  assert.match(whip.masteryDescription, /Speed by 10 ft/);
  S.update(state => { state.character.level = 3; });
  assert.equal(D.subclassName(), '');
  assert.equal(C.addRelic('healing-amulet').reason, 'subclass');
  C.setChoice('subclass', 'Occult Collector');
  assert.equal(D.subclassName(), 'Occult Collector');
  assert.equal(S.get().classes.treasureHunter.choices.subclassConfirmed, true);
  assert.equal(D.subclassHasSystem('relics'), true);
  T.registerSubclass({ id: 'field-agent', name: 'Field Agent', minLevel: 3, systems: [] });
  C.setChoice('subclass', 'Field Agent');
  assert.equal(D.subclassName(), 'Field Agent');
  assert.equal(D.subclassHasSystem('relics'), false);
  assert.equal(C.addRelic('healing-amulet').reason, 'subclass');
});

test('2024 weapon masteries project into sourced Skills and attack records', () => {
  fresh(state => {
    state.classes.treasureHunter.choices.weaponMasteries = ['Dagger', 'Shortbow'];
    state.character.gear.weapons.push({ id: 'shortbow', name: 'Shortbow', itemType: 'weapon', damage: '1d6', damageType: 'Piercing', attackAbility: 'DEX', location: 'equipped' });
  });
  const entries = D.proficiencyEntries().masteries;
  assert.ok(entries.find(entry => entry.name === 'Whip · Slow').sources.includes('Mistr biče'));
  assert.ok(entries.find(entry => entry.name === 'Dagger · Nick').sources.includes('Weapon Mastery'));
  assert.ok(entries.find(entry => entry.name === 'Shortbow · Vex').description.includes('Advantage'));
  const shortbow = D.weaponAttacks().find(attack => attack.name === 'Shortbow');
  assert.equal(shortbow.mastery, 'Vex');
  assert.ok(shortbow.masteryDescription.includes('Advantage'));
});

test('proficiency and defense projections retain their grant sources', () => {
  fresh(state => {
    state.character.origin.species = 'City Goblin';
    state.character.origin.speciesChoices.skills = ['Stealth', 'Deception'];
    state.character.origin.background.skills = ['History', 'Insight'];
    state.character.origin.background.tool = 'Forgery Kit';
    state.character.origin.background.secondary = 'Train';
    state.character.origin.background.feat = 'Defence';
    state.character.gear.armor.push({ id: 'leather', name: 'Leather Armor', itemType: 'armor', armorBase: 11, armorDex: 'full', location: 'worn' });
    state.classes.treasureHunter.choices.classSkills = ['Acrobatics', 'Arcana', 'Perception'];
    state.classes.treasureHunter.choices.expertise = 'Arcana';
  });
  assert.deepEqual(D.skillProficiencySources('Arcana').map(entry => entry.source), ['Treasure Hunter', 'Odborná expertíza']);
  assert.equal(D.skillStatus('Arcana'), 2);
  assert.ok(D.proficiencyEntries().tools.find(entry => entry.name === 'Forgery Kit').sources.includes('Lukyho univerzální background'));
  assert.ok(D.proficiencyEntries().vehicles.find(entry => entry.name === 'Train').sources.includes('Lukyho univerzální background'));
  assert.ok(D.armorBreakdown().parts.some(([label]) => label.startsWith('Defence ·')));
});

test('forced roll modes are indicators backed by locked domain state', () => {
  fresh(state => { state.character.conditions = ['Poisoned']; });
  const forced = D.effectiveRollMode('skill', 'Stealth');
  assert.equal(forced.mode, 'disadvantage');
  assert.equal(forced.locked, true);
  assert.equal(C.setRollMode('skill', 'Stealth', 'advantage'), false);
  assert.equal(S.get().character.rollModes.skills.Stealth, undefined);
  C.removeCondition('Poisoned');
  assert.equal(C.setRollMode('skill', 'Stealth', 'advantage'), true);
  assert.equal(D.effectiveRollMode('skill', 'Stealth').mode, 'advantage');
});

test('relic charges have one shared resource entry', () => {
  fresh(state => { state.character.level = 3; });
  C.setChoice('subclass', 'Occult Collector');
  assert.equal(C.addRelic('healing-amulet').ok, true);
  const entry = S.get().classes.treasureHunter.relics[0];
  assert.equal(C.toggleRelicPrepared(entry.instanceId).ok, true);
  C.adjustRelicUse(entry.instanceId, 1);
  const current = S.get().classes.treasureHunter.relics[0];
  assert.equal(current.used, 1);
  assert.equal(D.relicMax(current), 2);
  assert.equal(D.activeRelics()[0].used, 1);
});

test('Builder saves one atomic canonical choice state', () => {
  fresh();
  let notifications = 0;
  const unsubscribe = S.subscribe(() => { notifications += 1; });
  C.saveBuilder({
    name: 'Builder Hero', level: 1, species: 'City Goblin',
    speciesChoices: { skills: ['Stealth', 'Deception'], simpleWeapon: 'Dagger' },
    background: { skills: ['History', 'Insight'], tool: 'Forgery Kit', secondary: 'Playing Card Set', feat: 'Alert', abilityMode: '+2/+1', abilityChoices: ['DEX', 'INT'], resilientAbility: '', skilledChoices: [] },
    abilities: { STR: 10, DEX: 16, CON: 12, INT: 14, WIS: 10, CHA: 8 },
    hpAuto: true, classSkills: ['Acrobatics', 'Investigation', 'Perception'],
    ancientLanguages: ['Latina', 'Kečuánština', 'Egyptština'], vehicles: ['Train', 'Automobile'],
    expertise: 'Acrobatics', weaponMasteries: ['Dagger', 'Shortbow'], startingMelee: 'Rapier', startingRanged: 'Pistol',
    manualSkills: { Arcana: 1 }
  });
  unsubscribe();
  assert.equal(notifications, 1);
  const choices = S.get().classes.treasureHunter.choices;
  assert.deepEqual(choices.classSkills, ['Acrobatics', 'Investigation', 'Perception']);
  assert.deepEqual(choices.ancientLanguages, ['Latina', 'Kečuánština', 'Egyptština']);
  assert.equal(choices.expertise, 'Acrobatics');
  assert.deepEqual(choices.weaponMasteries, ['Dagger', 'Shortbow']);
  assert.equal(S.get().character.skills.Arcana, 1);
  assert.equal(Object.hasOwn(S.get().classes.treasureHunter, 'expertise'), false);
  assert.deepEqual(D.choiceRequirements(), []);
  S.flush();
  assert.equal(notifications, 1, 'persistence does not emit a second render notification');
});

test('Builder uses a priced starting shop instead of materializing a fixed class loadout', () => {
  fresh();
  const payload = {
    name: 'Shopping Hero', level: 1, species: '', speciesChoices: {}, background: {}, abilities: {}, hpAuto: true,
    classSkills: [], ancientLanguages: [], vehicles: [], weaponMasteries: [], manualSkills: {}, startingMelee: 'Rapier', startingRanged: 'Longbow'
  };
  C.saveBuilder(payload);
  assert.equal(D.inventory().length, 0, 'legacy starting choice fields are non-materializing compatibility data');

  assert.equal(C.setStartingGearBudget(20).ok, true);
  const backpackTemplate = Catalog.CURATED_FALLBACK.find(item => item.name === 'Backpack');
  const whipTemplate = Catalog.CURATED_FALLBACK.find(item => item.name === 'Whip');
  const bagPurchase = C.purchaseStartingItem(Catalog.cloneForInventory(backpackTemplate), Catalog.costInCp(backpackTemplate), { location: 'back' });
  assert.equal(bagPurchase.ok, true);
  const whipPurchase = C.purchaseStartingItem(Catalog.cloneForInventory(whipTemplate), Catalog.costInCp(whipTemplate), { containerId: bagPurchase.id });
  assert.equal(whipPurchase.ok, true);
  assert.equal(S.get().character.gear.inventory.find(item => item.id === whipPurchase.id).containerId, bagPurchase.id);
  assert.equal(C.startingGearStatus().spentCp, 400);
  assert.equal(C.setStartingGearBudget(3).reason, 'below-spent', 'budget cannot hide an overspend');
  assert.equal(C.refundStartingItem(whipPurchase.id).ok, true);
  assert.equal(C.startingGearStatus().remainingCp, 1800);

  const finalized = C.finalizeStartingGear();
  assert.equal(finalized.ok, true);
  assert.equal(finalized.remainderCp, 1800);
  assert.equal(C.startingGearStatus().remainingCp, 0);
  assert.equal(S.get().character.gear.money.gp, 18);
  assert.equal(C.refundStartingItem(bagPurchase.id).reason, 'finalized');
});

test('duplicate proficiency choices are detected by canonical requirements', () => {
  fresh(state => {
    state.character.origin.speciesChoices.skills = ['Stealth'];
    state.character.origin.background.skills = ['Stealth', 'History'];
    state.classes.treasureHunter.choices.classSkills = ['Stealth', 'Arcana', 'Perception'];
  });
  assert.ok(D.choiceRequirements().includes('Builder: proficiency choices must be unique'));
});

test('origin mechanics are derived without inventing missing species mechanics', () => {
  fresh(state => {
    state.character.origin.species = 'City Goblin';
    state.character.origin.speciesChoices = { skills: ['Stealth', 'Deception'], simpleWeapon: 'Dagger' };
    state.character.origin.background = { ...state.character.origin.background, skills: ['History', 'Insight'], tool: 'Forgery Kit', secondary: 'Train', feat: 'Tough', abilityMode: '+2/+1', abilityChoices: ['DEX', 'CON'] };
    state.character.abilities.DEX = 14;
    state.character.abilities.CON = 12;
  });
  assert.equal(D.ability('DEX'), 16);
  assert.equal(D.speed(), 25);
  assert.equal(D.skillStatus('Stealth'), 1);
  assert.ok(D.proficiencyLists().weapons.includes('Dagger'));
  assert.equal(D.hpMax(), T.hpMax(1, D.mod('CON')) + 2);

  C.applyOrigin('Civilized Elf', {}, S.get().character.origin.background);
  assert.equal(D.speed(), 30, 'lore-only species does not receive invented mechanics');
  assert.equal(S.get().character.size, '', 'mechanics from the previously selected species do not leak');
});

test('NPC dossiers preserve favorite state and clean relationship references', () => {
  fresh();
  const contactId = C.saveNpc({ name: 'Contact', profession: 'Guide', nationality: 'Egyptian' });
  const id = C.saveNpc({ name: 'Ally', favorite: true, notes: 'Original', relations: [{ npcId: contactId, type: 'trusted guide' }] });
  C.saveNpc({ id, name: 'Ally', notes: 'Updated', relations: [{ npcId: contactId, type: 'trusted guide' }] });
  let npc = S.get().campaign.npcs.find(entry => entry.id === id);
  assert.equal(npc.favorite, true);
  assert.equal(npc.notes, 'Updated');
  assert.equal(npc.relations[0].npcId, contactId);
  assert.ok(npc.createdAt);
  assert.ok(npc.updatedAt);
  C.deleteNpc(contactId);
  npc = S.get().campaign.npcs.find(entry => entry.id === id);
  assert.deepEqual(npc.relations, []);
});

test('equipping and editing an item drives canonical stats and Actions', () => {
  fresh(state => {
    state.character.gear.weapons = [];
    state.character.gear.armor = [];
    state.character.gear.inventory.push({ id: 'blade', name: 'Test Blade', itemType: 'weapon', damage: '1d8', damageType: 'Slashing', location: 'backpack', quantity: 1, attackBonus: 1 });
    state.character.gear.inventory.push({ id: 'charm', name: 'Swift Charm', location: 'backpack', quantity: 1, acBonus: 1, speedBonus: 5, resistance: 'Lightning', actionName: 'Burst of Speed', actionType: 'Bonus Action', actionSummary: 'Move quickly.' });
  });
  assert.equal(D.weaponAttacks().length, 0);
  assert.equal(D.armorClass(), 10);
  C.setItemEquipped('blade', true);
  C.setItemEquipped('charm', true);
  assert.equal(D.weaponAttacks()[0].hit, 3);
  assert.equal(D.armorClass(), 11);
  assert.equal(D.speed(), 35);
  assert.equal(D.itemActions()[0].name, 'Burst of Speed');
  assert.ok(D.damageDefenses().resistances.includes('Lightning'));
  C.updateItem('blade', { name: 'Renamed Blade', damage: '2d6' });
  assert.equal(D.weaponAttacks()[0].name, 'Renamed Blade');
  assert.match(D.weaponAttacks()[0].damage, /^2d6/);
  C.setItemEquipped('blade', false);
  assert.equal(D.weaponAttacks().length, 0);
});

test('attunement gates equipped item stats and actions without losing equip state', () => {
  fresh(state => {
    state.character.gear.inventory.push({ id: 'attuned-charm', name: 'Attuned Charm', location: 'equipped', quantity: 1, attunement: true, isAttuned: false, acBonus: 2, actionName: 'Ward', actionType: 'Reaction' });
  });
  const item = D.inventory().find(entry => entry.id === 'attuned-charm');
  assert.equal(D.isItemEquipped(item), true);
  assert.equal(D.isItemActive(item), false);
  assert.equal(D.armorClass(), 10);
  assert.equal(D.itemActions().length, 0);
  C.updateItem(item.id, { isAttuned: true });
  assert.equal(D.isItemActive(D.inventory().find(entry => entry.id === item.id)), true);
  assert.equal(D.armorClass(), 12);
  assert.equal(D.itemActions()[0].name, 'Ward');
});

test('Backpack is a canonical container and nested containers reject cycles', () => {
  fresh(state => { state.character.gear.weapons = []; });
  const bag = C.addItem({ name: 'Backpack', isContainer: true, itemType: 'container' }, 'back');
  const box = C.addItem({ name: 'Small Box', isContainer: true, itemType: 'container' }, 'carried');
  const torch = C.addItem({ name: 'Torch' }, 'carried');
  assert.equal(C.moveItem(torch, { containerId: bag }).ok, true);
  assert.equal(S.get().character.gear.inventory.find(item => item.id === torch).containerId, bag);
  assert.equal(C.setItemEquipped(torch, true).ok, true);
  assert.equal(S.get().character.gear.inventory.find(item => item.id === torch).containerId, '');
  assert.equal(C.setItemEquipped(torch, false).ok, true);
  assert.equal(S.get().character.gear.inventory.find(item => item.id === torch).containerId, bag, 'unequip returns an item to its previous container');
  assert.equal(C.moveItem(box, { containerId: bag }).ok, true);
  assert.equal(C.moveItem(bag, { location: 'storage', containerId: '' }).ok, true);
  assert.equal(S.get().character.gear.inventory.find(item => item.id === box).location, 'storage', 'moving a container propagates its effective location to descendants');
  assert.equal(S.get().character.gear.inventory.find(item => item.id === torch).location, 'storage');
  assert.equal(C.moveItem(bag, { containerId: box }).ok, false, 'container cycles are rejected');
  assert.equal(S.ITEM_LOCATIONS.includes('backpack'), false, 'Backpack is never a pseudo-location');
});

test('weight, three encumbrance modes and Push Drag Lift use one canonical calculation', () => {
  fresh(state => {
    state.character.abilities.STR = 10;
    state.character.speed = 30;
    state.character.gear.inventory.push(
      { id: 'bag', name: 'Backpack', itemType: 'container', isContainer: true, location: 'back', quantity: 1, weight: 5 },
      { id: 'rope', name: 'Heavy Rope', location: 'back', containerId: 'bag', quantity: 1, weight: 55 },
      { id: 'vault', name: 'Stored Statue', location: 'storage', quantity: 1, weight: 100 },
      { id: 'mystery', name: 'Unknown Relic', location: 'carried', quantity: 1 }
    );
  });
  assert.equal(D.carriedWeight().total, 60, 'container and contents both count, storage does not');
  assert.equal(D.carriedWeight().unknown, 1);
  assert.equal(D.encumbrance().limit, 150);
  assert.equal(D.encumbrance().pushDragLift, 300);

  assert.equal(C.setEncumbranceMode('balanced'), true);
  assert.equal(D.encumbrance().limit, 100);
  assert.equal(D.encumbrance().status, 'normal');

  C.setEncumbranceMode('variant');
  assert.equal(D.encumbrance().status, 'encumbered');
  assert.equal(D.speed(), 20);
  C.addItem({ name: 'Load', quantity: 1, weight: 50 }, 'carried');
  assert.equal(D.encumbrance().status, 'heavy');
  assert.equal(D.speed(), 10);
  assert.equal(D.effectiveRollMode('skill', 'Athletics').mode, 'disadvantage');
  assert.equal(D.effectiveRollMode('save', 'CON').mode, 'disadvantage');
  assert.equal(D.effectiveRollMode('attack', 'DEX').mode, 'disadvantage');
  assert.equal(D.effectiveRollMode('skill', 'Arcana').mode, 'normal');
});

test('money adjustments add, remove and clamp at zero', () => {
  fresh(state => { state.character.gear.money = { gp: 10, ep: 2, sp: 0, cp: 1, pp: 0 }; });
  const applied = C.adjustMoney({ pp: 2, gp: 5, ep: -9, sp: 3, cp: -1 });
  assert.deepEqual(applied, { pp: 2, gp: 5, ep: -2, sp: 3, cp: -1 });
  assert.deepEqual(S.get().character.gear.money, { gp: 15, ep: 0, sp: 3, cp: 0, pp: 2 });
});

test('Short and Long Rest apply only the recovery choices selected', () => {
  fresh(state => {
    state.character.level = 11;
    state.character.hp = { current: 5, max: 30, temp: 4, auto: false };
    state.character.hitDice.d10.spent = 1;
    state.character.exhaustion = 2;
    state.classes.treasureHunter.coolUsed = 3;
    state.classes.treasureHunter.featureUses = { 'not-dead-yet': 1, 'when-going-tough': 1 };
  });
  const short = C.rest('short', { hitDice: 2, rolls: [4, 10], cool: false, features: true, relics: false });
  assert.equal(short.healing, 14);
  assert.equal(short.hitDiceSpent, 2);
  assert.equal(S.get().character.hp.current, 19);
  assert.equal(S.get().classes.treasureHunter.coolUsed, 3, 'unchecked Cool recovery stays spent');
  assert.equal(S.get().classes.treasureHunter.featureUses['not-dead-yet'], 0, 'Short Rest feature recovers');
  assert.equal(S.get().classes.treasureHunter.featureUses['when-going-tough'], 1, 'Long Rest feature stays spent');

  const long = C.rest('long', { hp: false, temp: false, recoverHitDice: false, exhaustion: false, cool: true, features: false, relics: false });
  assert.equal(long.ok, true);
  assert.equal(S.get().character.hp.current, 19);
  assert.equal(S.get().character.hp.temp, 4);
  assert.equal(S.get().character.hitDice.d10.spent, 3);
  assert.equal(S.get().character.exhaustion, 2);
  assert.equal(S.get().classes.treasureHunter.coolUsed, 0);
});

test('catalog exposes official prices, containers, tags and Luky firearm variants', () => {
  const byName = name => Catalog.CURATED_FALLBACK.find(item => item.name === name);
  assert.equal(Catalog.priceLabel(byName('Whip')), '2 GP');
  assert.equal(Catalog.priceLabel(byName('Leather Armor')), '10 GP');
  assert.equal(Catalog.priceLabel(byName("Explorer's Pack")), '10 GP');
  assert.equal(byName('Backpack').isContainer, true);
  assert.equal(Catalog.costInCp(byName('Firearm Bullets (10)')), 300);
  const arrows = Catalog.cloneForInventory(byName('Arrows (20)'));
  assert.equal(arrows.quantity, 1);
  assert.equal(arrows.bundleSize, 20);
  assert.equal(D.itemStackWeight(arrows), 1, 'a bundle weight is not multiplied by its ammunition count');
  assert.ok(byName('Rapier').tags.includes('finesse'));
  assert.ok(byName('Longbow').tags.includes('martial'));
  assert.ok(byName('Longbow').tags.includes('ranged'));

  const firearms = Object.fromEntries(Catalog.HOME_BREW_ITEMS.map(item => [item.name, item]));
  assert.deepEqual(Object.keys(firearms).sort(), ['Browning 1900', 'Derringer', 'Karabina', 'Mannlicher M 1903', 'Mauser M 98', 'Mondrogón M 1908', 'Parabella', 'Revolver'].sort());
  assert.equal(firearms.Derringer.damage, '1d4');
  assert.equal(Catalog.priceLabel(firearms.Derringer), '5 GP');
  assert.equal(firearms.Parabella.mastery, 'Vex');
  assert.equal(Catalog.priceLabel(firearms.Parabella), '250 GP');
  assert.ok(firearms['Mauser M 98'].tags.includes('two-handed'));
  assert.ok(firearms['Mondrogón M 1908'].tags.includes('homebrew'));
});

test('origin library exposes sourced traits while senses remain derived', () => {
  fresh(state => {
    state.character.origin.species = 'City Goblin';
    state.character.race = 'City Goblin';
    state.character.origin.background.feat = 'Alert';
  });
  const originFeatures = global.CharacterOrigin.featureRecords(S.get());
  assert.ok(originFeatures.some(feature => feature.name === 'Jacobson’s Organ'));
  assert.ok(originFeatures.some(feature => feature.name === 'Alert'));
  assert.deepEqual(D.proficiencyLists().senses, ['Darkvision 60 ft.', 'Blindsight 10 ft.']);
  const bite = D.originActions().find(action => action.name === 'Bite and Claw');
  assert.equal(bite.damage, '1d6');
  assert.equal(bite.source, 'City Goblin');
});

test('final source names and complete relic catalog are wired', () => {
  const names = Object.fromEntries(T.features.map(feature => [feature.id, feature.name]));
  assert.equal(names['ancient-languages'], 'Starodávné jazyky');
  assert.equal(names['specialized-expertise'], 'Odborná expertíza');
  assert.equal(names['indy-get-up'], 'Indyho zvedačka');
  assert.equal(names['line-attack'], 'Útok v lajně');
  assert.equal(names['improved-slide'], 'Zdokonalený skluz');
  assert.equal(names['prepared-relics-reserve'], 'Připravené relikvie a zásoba');
  assert.equal(names['wealth-and-glory'], 'Bohatství a Sláva');
  assert.equal(T.features.length, 74);
  assert.equal(new Set(T.features.map(feature => feature.id)).size, 74);
  assert.equal(Relics.length, 38);
  assert.equal(Relics.find(relic => relic.id === 'master-thiefs-key').name, 'Klíč pána zlodějů');
  assert.equal(Relics.find(relic => relic.id === 'silent-pocket-watch').name, 'Tiché kapesní hodinky');
});

test('loaded V9 graph has one renderer and no DOM patch loop', () => {
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...index.matchAll(/<script src="([^"]+)"/g)].map(match => match[1].split('?')[0]);
  assert.ok(scripts.includes('js/ui/app-v9.js'));
  assert.equal(scripts.filter(file => /js\/ui\/app-v\d/.test(file)).length, 1);
  assert.equal(scripts.some(file => /gameplay-polish-v7s\.js|modular-enhancements\.js|interaction-fixes|experience-extras|builder-checklist|hp-manager/.test(file)), false);
  const loadedSource = scripts.map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
  assert.equal(loadedSource.includes('MutationObserver'), false);
  assert.equal(loadedSource.includes('stopImmediatePropagation'), false);
  assert.equal(loadedSource.includes('location.reload'), false);
  const app = fs.readFileSync(path.join(root, 'js/ui/app-v9.js'), 'utf8');
  assert.match(app, /'attack-slide': 'indy-slide'/);
  assert.match(app, /function renderActionTree/);
  assert.match(app, /HIT \$\{esc\(record\.hit\)\}/);
  assert.match(app, /id="hpAmountWheel"/);
  assert.match(app, /id="hpAmountInput"/);
  assert.match(app, /smooth && adjacent \? 'smooth' : 'auto'/);
  assert.match(index, /service-worker\.js\?v=9\.4\.0/);
  assert.equal((index.match(/class="sheet-page"/g) || []).length, 8);
  assert.match(index, /id="bioPage"/);
  assert.match(index, /id="builderBtn"/);
  assert.match(index, /class="icon-btn builder-anvil"/);
  assert.equal(index.includes('id="editBtn"'), false, 'top bar has one canonical Builder entry point');
  assert.match(app, /\['pp', 'PP', 'P'\], \['gp', 'GP', 'G'\], \['ep', 'EP', 'E'\], \['sp', 'SP', 'S'\], \['cp', 'CP', 'C'\]/);
  assert.match(app, /\['relicsPage', 'RELICS', 'relics'\]/, 'Relics declares its subclass system dependency');
  assert.match(app, /function visiblePages/);
  assert.equal(app.includes('data-action-filter'), true, 'Actions exposes compact type filters');
  const npcRenderer = app.slice(app.indexOf('function renderNpcs()'), app.indexOf('function renderAll()'));
  assert.equal(npcRenderer.includes('npcDeleteBtn'), false, 'NPC list renderer must not expose deletion');
  const css = fs.readFileSync(path.join(root, 'css/v7s.css'), 'utf8');
  assert.match(css, /scroll-snap-type:x mandatory/);
  assert.match(css, /touch-action:pan-x pan-y/);
  const v9Css = fs.readFileSync(path.join(root, 'css/v9.css'), 'utf8');
  assert.match(v9Css, /\.pager\{scroll-behavior:auto\}/);
  assert.match(v9Css, /\.ability-grid\{grid-template-columns:repeat\(3/);
  assert.match(app, /class="ability ability-v9"/);
  assert.match(app, /data-npc-image-storage/);
  assert.match(app, /data-npc-sort="\$\{key\}"/);
  assert.match(app, /data-starting-remove/);
  assert.match(app, /id="hpTempSet"/);
  assert.match(app, /class="action-cool-spend"/);
  assert.match(app, /parentDialog && button\.value === 'cancel'/, 'dialog Cancel buttons close without submitting their forms');
  assert.match(app, /money\$\{id\}Delta/);
  assert.match(app, /data-item-equip/);
  assert.equal(app.includes('data-builder-tab="progression"'), false, 'Progression belongs only on Features');
  assert.match(app, /Proficiencies & Masteries/);
  assert.match(app, /ON HIT · \$\{esc\(record\.mastery\)\}/);
  assert.equal(app.includes("section('Origin'"), false, 'passive origin cards belong on Features, not Character');
  assert.match(v9Css, /\.row-main-wrap\.has-cool-cost/);
  assert.match(v9Css, /\.hp-wheel-marker/);
  assert.match(v9Css, /\.npc-card-main/);
  assert.match(v9Css, /scrollbar-width:none/);
  assert.match(v9Css, /\.action-filter-bar\{display:flex;flex-wrap:wrap/);
  assert.match(v9Css, /\.sheet-page\[hidden\]\{display:none!important\}/);
  const worker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
  assert.match(worker, /character-sheet-v9-ux-9/);
  assert.match(worker, /app-v9\.js\?v=9\.4\.0/);
});
