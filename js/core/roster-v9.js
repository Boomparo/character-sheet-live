(function () {
  'use strict';

  const S = window.CharacterState;
  if (!S) return;
  const KEY = 'character-sheet-v9-roster';
  const LEGACY_KEY = 'character-sheet-v7s-roster';
  let muted = false;

  const clone = value => S.clone(value);
  const uid = () => S.uid('char');
  function readKey(key) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '{}');
      return { activeId: parsed.activeId || '', profiles: Array.isArray(parsed.profiles) ? parsed.profiles : [] };
    } catch (error) { return { activeId: '', profiles: [] }; }
  }
  function read() {
    const current = readKey(KEY);
    if (current.profiles.length) return current;
    const legacy = readKey(LEGACY_KEY);
    if (!legacy.profiles.length) return current;
    const migrated = {
      activeId: legacy.activeId,
      profiles: legacy.profiles.map(profile => ({ ...profile, data: S.normalize(profile.data || {}) }))
    };
    write(migrated);
    return migrated;
  }
  function write(value) {
    try { localStorage.setItem(KEY, JSON.stringify(value)); return true; } catch (error) { return false; }
  }
  function summary(data, id, createdAt) {
    return {
      id, name: data.character?.name || 'Unnamed Character', race: data.character?.race || '',
      classKey: data.character?.classKey || 'treasureHunter', level: Number(data.character?.level) || 1,
      portrait: data.character?.portrait || '', createdAt: createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(), data: clone(data)
    };
  }
  function ensure() {
    const roster = read();
    if (!roster.profiles.length) {
      const id = uid();
      roster.activeId = id;
      roster.profiles = [summary(S.get(), id)];
    }
    if (!roster.profiles.some(profile => profile.id === roster.activeId)) roster.activeId = roster.profiles[0].id;
    write(roster);
    return roster;
  }
  function saveCurrent() {
    if (muted) return;
    const roster = ensure();
    const index = roster.profiles.findIndex(profile => profile.id === roster.activeId);
    if (index < 0) return;
    roster.profiles[index] = summary(S.get(), roster.activeId, roster.profiles[index].createdAt);
    write(roster);
  }
  function list() { return ensure().profiles.map(({ data, ...metadata }) => metadata); }
  function activeId() { return ensure().activeId; }
  function activate(profile, roster) {
    muted = true;
    roster.activeId = profile.id;
    write(roster);
    S.replace(clone(profile.data), 'roster:switch');
    S.flush();
    muted = false;
  }
  function switchTo(id) {
    saveCurrent();
    const roster = ensure();
    const profile = roster.profiles.find(item => item.id === id);
    if (!profile) return false;
    activate(profile, roster);
    return true;
  }
  function create(name = 'New Character') {
    saveCurrent();
    const roster = ensure();
    const id = uid();
    const fresh = S.fresh();
    fresh.character.name = name;
    const profile = summary(fresh, id);
    roster.profiles.push(profile);
    activate(profile, roster);
    return id;
  }
  function duplicate(id = activeId()) {
    saveCurrent();
    const roster = ensure();
    const profile = roster.profiles.find(item => item.id === id);
    if (!profile) return null;
    const nextId = uid();
    const data = clone(profile.data);
    data.character.name = `${data.character.name || 'Character'} Copy`;
    const copy = summary(data, nextId);
    roster.profiles.push(copy);
    activate(copy, roster);
    return nextId;
  }
  function remove(id) {
    const roster = ensure();
    if (roster.profiles.length <= 1) return false;
    const index = roster.profiles.findIndex(profile => profile.id === id);
    if (index < 0) return false;
    const wasActive = roster.activeId === id;
    roster.profiles.splice(index, 1);
    if (wasActive) activate(roster.profiles[0], roster); else write(roster);
    return true;
  }
  function exportAll() { saveCurrent(); return clone(ensure()); }
  function importAll(payload) {
    if (!payload || !Array.isArray(payload.profiles) || !payload.profiles.length) return false;
    const roster = {
      activeId: payload.activeId || payload.profiles[0].id,
      profiles: payload.profiles.map(profile => ({ ...profile, id: profile.id || uid(), data: S.normalize(profile.data || {}) }))
    };
    write(roster);
    const profile = roster.profiles.find(item => item.id === roster.activeId) || roster.profiles[0];
    activate(profile, roster);
    return true;
  }

  ensure();
  S.subscribe(saveCurrent);
  window.CharacterRoster = { KEY, LEGACY_KEY, list, activeId, saveCurrent, switchTo, create, duplicate, remove, exportAll, importAll };
  window.V7SRoster = window.CharacterRoster;
})();
