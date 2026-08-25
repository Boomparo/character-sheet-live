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
    speed: 25, skills: { Stealth: 2, History: 1, Arcana: 1 }, gear: { money: { gp: 7 }, inventory: [], weapons: [], armor: [] },
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
  'js/core/derived-v9.js', 'js/core/commands-v9.js'
]) require(path.join(root, file));

const S = global.CharacterState;
const D = global.CharacterDerived;
const C = global.CharacterCommands;
const T = global.TreasureHunterDataV7s;
const Relics = global.TreasureHunterRelicsV7s;

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
  assert.equal(state.schemaVersion, 11);
  assert.equal(state.character.speed, 30, 'legacy City Goblin speed is converted back to canonical base speed');
  assert.equal(D.speed(state), 25);
  assert.equal(D.ability('DEX', state), 16, 'stored origin bonus is not applied twice');
  assert.deepEqual(state.classes.treasureHunter.choices.ancientLanguages, ['Latina', 'Kečuánština', '']);
  assert.equal(state.classes.treasureHunter.choices.expertise, 'Stealth');
  assert.equal(Object.hasOwn(state.classes.treasureHunter, 'ancientLanguages'), false);
  assert.equal(state.classes.treasureHunter.relics[0].relicId, 'healing-amulet');
  assert.equal(state.character.skills.History, undefined, 'legacy generated grants are migrated out of manual overrides');
  assert.equal(state.character.skills.Arcana, 1, 'unrelated manual proficiency is preserved');
  assert.equal(D.skillStatus('History', state), 1);
  S.update(current => { current.character.origin.background.skills = ['Nature', 'Insight']; });
  assert.equal(D.skillStatus('History'), 0, 'changing a generated choice removes its old mechanical grant');
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
  assert.ok(parts.includes('Defence feat'));
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
    background: { skills: ['History', 'Insight'], tool: 'Forgery Kit', secondary: 'Train', feat: 'Alert', abilityMode: '+2/+1', abilityChoices: ['DEX', 'INT'], resilientAbility: '', skilledChoices: [] },
    abilities: { STR: 10, DEX: 16, CON: 12, INT: 14, WIS: 10, CHA: 8 },
    hpAuto: true, classSkills: ['Acrobatics', 'Investigation', 'Perception'],
    ancientLanguages: ['Latina', 'Kečuánština', 'Egyptština'], vehicles: ['Train', 'Automobile'],
    expertise: 'Acrobatics', weaponMasteries: ['Whip', 'Dagger'], startingMelee: 'Rapier', startingRanged: 'Pistol'
  });
  unsubscribe();
  assert.equal(notifications, 1);
  const choices = S.get().classes.treasureHunter.choices;
  assert.deepEqual(choices.classSkills, ['Acrobatics', 'Investigation', 'Perception']);
  assert.deepEqual(choices.ancientLanguages, ['Latina', 'Kečuánština', 'Egyptština']);
  assert.equal(choices.expertise, 'Acrobatics');
  assert.equal(Object.hasOwn(S.get().classes.treasureHunter, 'expertise'), false);
  assert.deepEqual(D.choiceRequirements(), []);
  S.flush();
  assert.equal(notifications, 1, 'persistence does not emit a second render notification');
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

test('editing an NPC preserves its favorite state', () => {
  fresh();
  const id = C.saveNpc({ name: 'Ally', favorite: true, notes: 'Original' });
  C.saveNpc({ id, name: 'Ally', notes: 'Updated' });
  const npc = S.get().campaign.npcs.find(entry => entry.id === id);
  assert.equal(npc.favorite, true);
  assert.equal(npc.notes, 'Updated');
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
  const scripts = [...index.matchAll(/<script src="([^"]+)"/g)].map(match => match[1]);
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
  assert.match(app, /\['gp', 'GP', 'G'\], \['ep', 'EP', 'E'\], \['sp', 'SP', 'S'\], \['cp', 'CP', 'C'\]/);
  const npcRenderer = app.slice(app.indexOf('function renderNpcs()'), app.indexOf('function renderAll()'));
  assert.equal(npcRenderer.includes('npcDeleteBtn'), false, 'NPC list renderer must not expose deletion');
  const css = fs.readFileSync(path.join(root, 'css/v7s.css'), 'utf8');
  assert.match(css, /scroll-snap-type:x mandatory/);
  assert.match(css, /touch-action:pan-x pan-y/);
});
