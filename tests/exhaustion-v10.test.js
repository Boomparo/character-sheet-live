const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const plain = value => JSON.parse(JSON.stringify(value));

function session() {
  const memory = new Map();
  const c = vm.createContext({ console, TextDecoder, crypto: require('node:crypto').webcrypto,
    setTimeout: () => 1, clearTimeout: () => {}, localStorage: {
      getItem: key => memory.get(key) || null, setItem: (key, value) => memory.set(key, String(value))
    } });
  c.window = c;
  for (const match of fs.readFileSync(path.join(root, 'index.html'), 'utf8').matchAll(/<script src="([^"?]+)/g)) {
    if (match[1].startsWith('js/ui/')) break;
    vm.runInContext(fs.readFileSync(path.join(root, match[1]), 'utf8'), c, { filename: match[1] });
  }
  return { S: c.CharacterState, C: c.CharacterCommands, D: c.CharacterDerived, R: c.CharacterRoster, F: c.CharacterFeatureLibrary };
}

function setup(env, classKey = 'treasureHunter') {
  env.S.update(s => {
    s.character.classKey = classKey;
    s.character.level = 8;
    s.character.abilities = { STR: 16, DEX: 18, CON: 14, INT: 16, WIS: 12, CHA: 10 };
    s.character.gear.weapons = [
      { id: 'sword', name: 'Longsword +1', itemType: 'weapon', location: 'equipped', damage: '1d8', damageType: 'Slashing' },
      { id: 'bow', name: 'Longbow', itemType: 'weapon', category: 'Martial Ranged Weapon', location: 'equipped', damage: '1d8', damageType: 'Piercing' },
      { id: 'dagger', name: 'Dagger', itemType: 'weapon', properties: ['Finesse'], location: 'equipped', damage: '1d4', damageType: 'Piercing' }
    ];
  });
}

test('Every weapon attack includes Exhaustion once, with its explanation, without changing damage or raw abilities', () => {
  for (const classKey of ['treasureHunter', 'occultist']) {
    const e = session(); setup(e, classKey);
    const baseline = plain(e.D.weaponAttacks()), abilities = plain(e.S.get().character.abilities), ac = e.D.armorClass(), hp = e.D.hpMax();
    for (let level = 0; level <= 5; level++) {
      e.S.update(s => { s.character.exhaustion = level; });
      e.D.weaponAttacks().forEach((weapon, i) => {
        assert.equal(weapon.hit, baseline[i].hit - 2 * level, `${classKey} ${weapon.name}, Exhaustion ${level}`);
        assert.equal(weapon.damage, baseline[i].damage);
        assert.equal(weapon.damageModifier, baseline[i].damageModifier);
        assert.equal(weapon.attackBreakdown.some(([label, value]) => label === 'Exhaustion' && value === String(-2 * level)), level > 0);
      });
      assert.deepEqual(plain(e.S.get().character.abilities), abilities);
      assert.equal(e.D.armorClass(), ac); assert.equal(e.D.hpMax(), hp);
    }
  }
});

test('Spell attacks and True Strike update while Save DC, healing and proficiency stay unchanged', () => {
  const e = session(); setup(e, 'occultist');
  const attack = e.D.spellAttack(), dc = e.D.spellDC(), pb = e.D.pb(), int = e.D.mod('INT');
  const heal = plain(e.F.spellFacts({ id: 'cure-wounds' }, e.S.get()));
  const strike = plain(e.F.spellFacts({ id: 'true-strike' }, e.S.get()));
  for (let level = 1; level <= 5; level++) {
    e.S.update(s => { s.character.exhaustion = level; });
    assert.equal(e.D.spellAttack(), attack - level * 2);
    assert.equal(e.D.spellDC(), dc); assert.equal(e.D.pb(), pb); assert.equal(e.D.mod('INT'), int);
    assert.deepEqual(plain(e.F.spellFacts({ id: 'cure-wounds' }, e.S.get())), heal);
    const facts = e.F.spellFacts({ id: 'true-strike' }, e.S.get());
    for (const fact of strike.filter(fact => fact.label.endsWith(' attack'))) assert.equal(Number(facts.find(x => x.label === fact.label).value), Number(fact.value) - level * 2);
  }
});

test('Skills, raw ability checks, saves, Initiative and Speed share the same Exhaustion level', () => {
  const { S, D } = session();
  const initial = { skill: D.skillMod('Perception'), save: D.saveMod('WIS'), init: D.initiative(), speed: D.speed(), ability: D.mod('WIS') };
  for (let level = 0; level <= 5; level++) {
    S.update(s => { s.character.exhaustion = level; });
    assert.equal(D.skillMod('Perception'), initial.skill - level * 2);
    assert.equal(D.abilityCheckMod('WIS'), initial.ability - level * 2);
    assert.equal(D.saveMod('WIS'), initial.save - level * 2);
    assert.equal(D.initiative(), initial.init - level * 2);
    assert.equal(D.speed(), Math.max(0, initial.speed - level * 5));
    assert.equal(D.saveBreakdown('WIS').value, D.saveMod('WIS'));
    assert.equal(D.skillBreakdown('Perception').value, D.skillMod('Perception'));
  }
  S.update(s => { s.character.exhaustion = 5; s.character.speed = 10; s.character.conditions = ['Restrained']; });
  assert.equal(D.speed(), 0); assert.equal(D.saveMod('DEX'), -8);
  S.update(s => { s.character.conditions = ['Paralyzed']; }); assert.equal(D.saveMod('DEX'), null);
  S.update(s => { s.character.conditions = []; s.character.exhaustion = 6; });
  assert.equal(D.speed(), 0); assert.equal(D.saveMod('WIS'), null);
});

test('Death Saves use the exhausted total while natural 1 and natural 20 retain their special rules', () => {
  for (let level = 0; level <= 4; level++) {
    const { S, C } = session(); C.adjustExhaustion(level); C.setHpCurrent(0);
    C.recordDeathSave(9 + level * 2); assert.equal(S.get().character.deathSaves.failures, 1);
    C.recordDeathSave(10 + level * 2); assert.equal(S.get().character.deathSaves.successes, 1);
    C.recordDeathSave(20); assert.equal(S.get().character.hp.current, 1);
    C.setHpCurrent(0); C.recordDeathSave(1); assert.equal(S.get().character.deathSaves.failures, 2);
  }
  const { S, C } = session(); C.adjustExhaustion(5); C.setHpCurrent(0);
  C.recordDeathSave(19); assert.equal(S.get().character.deathSaves.failures, 1);
  C.recordDeathSave(20); assert.equal(S.get().character.hp.current, 1);
});

test('Death Saves include general save bonuses but never CON or ability-specific proficiency/bonuses', () => {
  const { S, C, D } = session();
  S.update(s => { s.character.abilities.CON = 20; s.character.gear.inventory = [
    { id: 'ring', name: 'Ring of Protection', location: 'equipped', attunement: true, isAttuned: true },
    { id: 'con-only', name: 'CON charm', location: 'equipped', modifiers: [{ type: 'save', target: 'CON', value: 3 }] }
  ]; });
  C.adjustExhaustion(2);
  assert.equal(D.deathSaveBreakdown().value, -3);
  C.setHpCurrent(0); C.recordDeathSave(13); assert.equal(S.get().character.deathSaves.successes, 1);
});

test('Numerical custom attacks are adjusted for display without mutating their stored hit or damage', () => {
  const { S, D, C } = session(); C.adjustExhaustion(2);
  const record = { name: 'Custom strike', hit: '+7', damage: '1d8+3', isAttack: true };
  const before = plain(record), result = D.actionRoll(record, S.get());
  assert.equal(Number(result.hit), 3); assert.equal(Number(D.actionRoll({hit:'+7'},S.get()).hit),3); assert.equal(result.damage, '1d8+3'); assert.deepEqual(record, before);
  assert.equal(D.actionRoll({ ...record, hit: 'DM sets bonus' }, S.get()).hit, 'DM sets bonus');
  assert.equal(D.actionRoll({ name: 'Save spell', attack: 'DEX save', damage: '2d6' }, S.get()).hit, undefined);
});

test('Exhaustion remains per character through switching, import, rest, reload and Undo', () => {
  const e = session(), { S, C, D, R } = e; setup(e);
  const first = R.activeId(), original = D.weaponAttacks()[0].hit;
  C.adjustExhaustion(3); assert.equal(D.weaponAttacks()[0].hit, original - 6);
  const exported = plain(S.get()), imported = R.importCharacter(exported);
  assert.equal(D.weaponAttacks()[0].hit, original - 6);
  C.adjustExhaustion(-3); assert.equal(D.weaponAttacks()[0].hit, original);
  R.switchTo(first); assert.equal(D.weaponAttacks()[0].hit, original - 6);
  C.rest('short'); assert.equal(S.get().character.exhaustion, 3);
  C.rest('long'); assert.equal(S.get().character.exhaustion, 2); assert.equal(D.weaponAttacks()[0].hit, original - 4);
  S.undo(); assert.equal(S.get().character.exhaustion, 3); assert.equal(D.weaponAttacks()[0].hit, original - 6);
  S.flush(); R.switchTo(imported); R.switchTo(first); assert.equal(D.weaponAttacks()[0].hit, original - 6);
  assert.equal(S.get().character.gear.weapons[0].attackBonus, undefined);
});

test('Line Attack uses the chosen melee weapon, never an arbitrary highest damage weapon', () => {
  const e = session(); setup(e);
  const { S, C, D, F } = e;
  assert.equal(D.featureAttack('line-attack').weapon, null, 'Multiple eligible weapons require a choice');
  assert.deepEqual(plain(D.featureAttack('line-attack').weapons.map(w => w.id)), ['sword', 'dagger']);
  C.setUi('featureWeapons', { 'line-attack': 'dagger' });
  assert.equal(D.featureAttack('line-attack').weapon.id, 'dagger');
  assert.equal(D.featureAttack('line-attack').damage, '1d4+4 Piercing');
  assert.equal(D.featureAttack('line-attack').laterDamage, '1d4 Piercing');
  C.setUi('featureWeapons', { 'line-attack': 'sword' });
  assert.equal(D.featureAttack('line-attack').damage, '1d8+4 Slashing');
  assert.equal(D.featureAttack('line-attack').laterDamage, '1d8 Slashing');
  assert.equal(F.facts({ id: 'line-attack' }, S.get()).find(f => f.label === 'First hit').value, '1d8+4 Slashing');
  C.adjustExhaustion(2);
  assert.equal(D.featureAttack('line-attack').weapon.hit, 3);
  assert.equal(D.featureAttack('line-attack').damage, '1d8+4 Slashing');
  C.setUi('featureWeapons', { 'line-attack': 'bow' }); assert.equal(D.featureAttack('line-attack').weapon, null);
});

test('Later Line Attack hits use one die for multi-die weapons and the level 11 Cool die option', () => {
  const e = session(); setup(e); const { S, C, D } = e;
  S.update(s => { s.character.gear.weapons.push({ id: 'greatsword', name: 'Greatsword +2', damage: '2d6', damageType: 'Slashing', location: 'equipped', itemType: 'weapon' }); });
  C.setUi('featureWeapons', { 'line-attack': 'greatsword' });
  assert.equal(D.featureAttack('line-attack').damage, '2d6+5 Slashing');
  assert.equal(D.featureAttack('line-attack').laterDamage, '1d6 Slashing');
  S.update(s => { s.character.level = 11; });
  assert.equal(D.featureAttack('line-attack').laterDamage, '1d6 or 1d10 Slashing');
  assert.equal(D.featureAttack('improved-attack-slide').weapon.id, 'greatsword');
});

test('Precision Slide allows ranged weapons; Daring Strike upgrades and equipment changes stay current', () => {
  const e = session(); setup(e); const { S, C, D, R } = e;
  const original = R.activeId();
  C.setUi('featureWeapons', { 'precision-slide': 'bow', 'daring-strike': 'sword', 'line-attack': 'sword' });
  assert.equal(D.featureAttack('precision-slide').damage, '1d8+4 + 1d8 Piercing');
  S.update(s => { s.character.level = 13; }); assert.equal(D.featureAttack('improved-daring').damage, '1d8+4 + 2d10 Slashing');
  S.update(s => { s.character.level = 17; }); assert.equal(D.featureAttack('superior-daring').damage, '1d8+4 + 3d12 Slashing');
  const imported = R.importCharacter(plain(S.get()));
  C.setUi('featureWeapons', { 'line-attack': 'dagger' });
  R.switchTo(original); assert.equal(D.featureAttack('line-attack').weapon.id, 'sword');
  S.update(s => { s.character.gear.weapons.find(w => w.id === 'sword').location = 'storage'; });
  assert.equal(D.featureAttack('line-attack').weapon, null, 'An invalid selection never silently switches to another weapon');
  C.setUi('featureWeapons', {}); assert.equal(D.featureAttack('line-attack').weapon.id, 'dagger', 'A sole eligible weapon needs no choice');
  R.switchTo(imported); assert.equal(D.featureAttack('line-attack').weapon.id, 'dagger');
});

test('Level 6 Exhaustion is fatal and cannot be removed with ordinary healing, Death Saves or rest', () => {
  const { S, C, D } = session(); C.adjustExhaustion(6);
  assert.equal(D.exhaustion(), 6); assert.equal(D.speed(), 0);
  assert.equal(C.heal(5).reason, 'dead'); assert.equal(C.rest('long').reason, 'dead');
  assert.equal(S.get().character.exhaustion, 6);
  C.setHpCurrent(0); assert.equal(C.recordDeathSave(20), false);
  assert.equal(S.get().character.hp.current, 0);
});
