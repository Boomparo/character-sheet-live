const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const plain = value => JSON.parse(JSON.stringify(value));
function session(memory = new Map()) {
  let rejectWrite = () => false;
  const context = vm.createContext({
    console, crypto: require('node:crypto').webcrypto,
    setTimeout: () => 1, clearTimeout: () => {},
    localStorage: {
      getItem: key => memory.get(key) ?? null,
      setItem(key, value) {
        if (rejectWrite(key, value)) throw new Error('QuotaExceededError');
        memory.set(key, String(value));
      }
    }
  });
  context.window = context;
  for (const file of ['js/core/state-v9.js', 'js/core/roster-v9.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  }
  const S = context.CharacterState, R = context.CharacterRoster;
  return { S, R, memory, fail: rule => { rejectWrite = rule; }, stored: () => JSON.parse(memory.get(R.KEY)) };
}
function tazio() {
  const env = session();
  env.S.update(state => {
    state.character.name = 'Tazio';
    state.character.hp.current = 27;
    state.character.gear.inventory = [{ id: 'bag', name: 'Backpack', quantity: 1 }];
    state.classes.treasureHunter.coolUsed = 2;
    state.campaign.npcs = [{ id: 'friend', name: 'Friend', notes: 'Original notes' }];
  });
  env.S.flush();
  return env;
}

test('Duplicate creates an independent profile and preserves Tazio through edits and reload', () => {
  const { S, R, memory } = tazio();
  const originalId = R.activeId(), original = plain(S.get());
  const copyId = R.duplicate();
  assert.notEqual(copyId, originalId);
  assert.equal(R.list().length, 2);
  assert.equal(R.activeId(), copyId);
  assert.equal(S.get().character.name, 'Tazio Copy');
  S.update(state => {
    state.character.hp.current = 1;
    state.character.gear.inventory[0].quantity = 9;
    state.classes.treasureHunter.coolUsed = 7;
    state.campaign.npcs[0].notes = 'Copy only';
  });
  S.flush();
  const reloaded = session(memory);
  assert.equal(reloaded.R.activeId(), copyId);
  assert.equal(reloaded.S.get().character.hp.current, 1);
  reloaded.R.switchTo(originalId);
  assert.deepEqual(plain(reloaded.S.get()), original);
});

test('Repeated copies of an inactive character get unique names and IDs', () => {
  const { R } = tazio();
  const id = R.activeId();
  const first = R.duplicate(id), second = R.duplicate(id);
  assert.notEqual(first, second);
  assert.deepEqual(plain(R.list().map(p => p.name)), ['Tazio', 'Tazio Copy', 'Tazio Copy 2']);
});

test('Every single-character import adds a profile, even for the same JSON twice', () => {
  const { S, R } = tazio();
  const originalId = R.activeId(), original = plain(S.get());
  const payload = S.fresh(); payload.character.name = 'Lili'; payload.character.classKey = 'occultist';
  const beforePayload = plain(payload);
  const first = R.importCharacter(payload), second = R.importCharacter(payload);
  assert.equal(new Set([originalId, first, second]).size, 3);
  assert.equal(R.list().length, 3);
  S.update(state => { state.character.hp.current = 2; });
  R.switchTo(first);
  assert.equal(S.get().character.hp.current, 10);
  R.switchTo(originalId);
  assert.deepEqual(plain(S.get()), original);
  assert.deepEqual(plain(payload), beforePayload);
});

test('Roster imports append with remapped IDs and never replace existing characters', () => {
  const { S, R } = tazio();
  const originalId = R.activeId(), original = plain(S.get());
  const data = S.fresh(); data.character.name = 'Lili';
  const payload = { activeId: 'second', profiles: [
    { id: originalId, data }, { id: 'second', data: { ...plain(data), character: { ...plain(data.character), name: 'Jano' } } }
  ] };
  const beforePayload = plain(payload);
  assert.equal(R.importAll(payload), true);
  assert.equal(R.list().length, 3);
  assert.equal(S.get().character.name, 'Jano');
  assert.notEqual(R.activeId(), 'second');
  assert.equal(R.importAll(payload), true);
  assert.equal(R.list().length, 5);
  assert.equal(new Set(R.list().map(p => p.id)).size, 5);
  R.switchTo(originalId);
  assert.deepEqual(plain(S.get()), original);
  assert.deepEqual(plain(payload), beforePayload);
});

test('Export All can be imported into the same roster without overwriting anything', () => {
  const { R } = tazio();
  R.duplicate();
  const originalIds = R.list().map(p => p.id);
  R.importAll(R.exportAll());
  assert.equal(R.list().length, 4);
  assert.equal(new Set(R.list().map(p => p.id)).size, 4);
  for (const id of originalIds) assert.ok(R.list().some(p => p.id === id));
});

for (const operation of ['duplicate', 'importCharacter', 'importAll']) {
  test(`${operation}: full roster storage cannot rename or overwrite Tazio`, () => {
    const env = tazio(), { S, R } = env;
    const id = R.activeId(), before = plain(S.get());
    env.fail((key, value) => key === R.KEY && JSON.parse(value).profiles.length > 1);
    const imported = S.fresh(); imported.character.name = 'Lili';
    assert.throws(() => operation === 'duplicate' ? R.duplicate() : operation === 'importAll'
      ? R.importAll({ profiles: [{ data: imported }] }) : R.importCharacter(imported), /storage/i);
    assert.equal(R.activeId(), id);
    assert.equal(R.list().length, 1);
    assert.deepEqual(plain(S.get()), before);
    assert.deepEqual(env.stored().profiles[0].data, before);
    S.update(state => { state.character.hp.current = 26; });
    assert.equal(env.stored().profiles[0].name, 'Tazio');
  });
}

test('Failed active-state write rolls back the roster before notifying or renaming', () => {
  const env = tazio(), { S, R } = env;
  const id = R.activeId(), before = plain(S.get());
  let notifications = 0;
  S.subscribe(() => { notifications++; });
  env.fail((key, value) => key === S.KEY && JSON.parse(value).character.name.includes('Copy'));
  assert.throws(() => R.duplicate(), /storage/i);
  assert.equal(notifications, 0);
  assert.equal(R.activeId(), id);
  assert.equal(R.list().length, 1);
  assert.deepEqual(plain(S.get()), before);
  assert.deepEqual(JSON.parse(env.memory.get(S.KEY)), before);
  env.fail(() => false);
  assert.ok(R.duplicate(), 'failure does not leave roster saves muted');
});

test('A second tab cannot redirect edits from Tazio into the newly imported profile', () => {
  const env = tazio(), tab = session(env.memory);
  const originalId = env.R.activeId();
  const imported = tab.S.fresh(); imported.character.name = 'Lili';
  const liliId = tab.R.importCharacter(imported);
  env.S.update(state => { state.character.hp.current = 17; });
  const profiles = env.stored().profiles;
  assert.equal(profiles.find(p => p.id === originalId).data.character.hp.current, 17);
  assert.equal(profiles.find(p => p.id === liliId).name, 'Lili');
  assert.equal(env.R.activeId(), originalId);
  assert.equal(tab.R.activeId(), liliId);
});

test('Backups still work with full storage and malformed batch imports change nothing', () => {
  const env = tazio(), { S, R } = env;
  const before = plain(S.get());
  env.fail(() => true);
  assert.deepEqual(plain(R.exportAll().profiles[0].data), before);
  assert.equal(R.importAll({ profiles: [{ data: S.fresh() }, { data: null }] }), false);
  assert.equal(R.list().length, 1);
});

test('Generated profile IDs cannot collide with existing IDs', () => {
  const { S, R } = tazio();
  const id = R.activeId();
  S.uid = () => id;
  const first = R.duplicate(id), second = R.duplicate(id);
  assert.equal(new Set([id, first, second]).size, 3);
});
