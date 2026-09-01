(function () {
  'use strict';

  const S = window.CharacterState;
  if (!S) return;
  const KEY = 'character-sheet-v9-roster';
  const LEGACY_KEY = 'character-sheet-v7s-roster';
  let muted = false;
  let currentId = '';

  const clone = value => S.clone(value);
  function uid(roster = { profiles: [] }) {
    const ids = new Set(roster.profiles.map(profile => profile.id));
    const base = S.uid('char');
    let id = base, suffix = 1;
    while (ids.has(id)) id = `${base}-${suffix++}`;
    return id;
  }
  function readKey(key) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '{}');
      return { activeId: parsed.activeId || '', profiles: Array.isArray(parsed.profiles) ? parsed.profiles : [] };
    } catch (error) { throw new Error('Stored characters could not be read. No characters were replaced.'); }
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
    try { localStorage.setItem(KEY, JSON.stringify(value)); }
    catch (error) { throw new Error('Characters could not be saved. Browser storage may be full. Export a backup before freeing space. No character was replaced.'); }
  }
  function summary(data, id, createdAt) {
    return {
      id, name: data.character?.name || 'Unnamed Character', race: data.character?.race || '',
      classKey: data.character?.classKey || 'treasureHunter', level: Number(data.character?.level) || 1,
      createdAt: createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(), data: clone(data)
    };
  }
  function ensure() {
    const roster = read();
    if (!roster.profiles.length) {
      const id = uid();
      roster.activeId = id;
      roster.profiles = [summary(S.get(), id)];
      write(roster);
    }
    if (!roster.profiles.some(profile => profile.id === roster.activeId)) {
      roster.activeId = roster.profiles[0].id;
      write(roster);
    }
    return roster;
  }
  function saveCurrent() {
    if (muted) return;
    const roster = ensure();
    const index = roster.profiles.findIndex(profile => profile.id === currentId);
    if (index < 0) throw new Error('This character is no longer in the roster. Export it before continuing.');
    roster.activeId = currentId;
    roster.profiles[index] = summary(S.get(), currentId, roster.profiles[index].createdAt);
    write(roster);
  }
  function list() { return ensure().profiles.map(({ data, ...metadata }) => ({ ...metadata, portrait: data?.character?.portrait || metadata.portrait || '' })); }
  function activeId() { return currentId; }
  function activate(profile, roster) {
    const previousRoster = read();
    const previousId = currentId;
    roster.activeId = profile.id;
    // Never load a new character if its roster entry could not be stored.
    write(roster);
    muted = true;
    try {
      currentId = profile.id;
      S.replace(clone(profile.data), 'roster:switch', { persist: true });
    } catch (error) {
      currentId = previousId;
      write(previousRoster);
      throw error;
    } finally { muted = false; }
  }
  function switchTo(id) {
    saveCurrent();
    const roster = ensure();
    const profile = roster.profiles.find(item => item.id === id);
    if (!profile) return false;
    activate(profile, roster);
    return true;
  }
  function create(name = 'New Character', classKey = 'treasureHunter') {
    saveCurrent();
    const roster = ensure();
    const id = uid(roster);
    const fresh = S.fresh();
    fresh.character.name = name;
    const canonicalClass = window.CharacterClassRegistry?.canonicalId(classKey) || 'treasureHunter';
    fresh.character.classKey = canonicalClass;
    fresh.character.level = 1;
    S.normalize(fresh, { skipAbilityMigration: true });
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
    const nextId = uid(roster);
    const data = clone(profile.data);
    const baseName = `${data.character.name || 'Character'} Copy`;
    const names = new Set(roster.profiles.map(item => item.name));
    data.character.name = baseName;
    let suffix = 2;
    while (names.has(data.character.name)) data.character.name = `${baseName} ${suffix++}`;
    const copy = summary(data, nextId);
    roster.profiles.push(copy);
    activate(copy, roster);
    return nextId;
  }
  function remove(id) {
    saveCurrent();
    const roster = ensure();
    if (roster.profiles.length <= 1) return false;
    const index = roster.profiles.findIndex(profile => profile.id === id);
    if (index < 0) return false;
    const wasActive = currentId === id;
    roster.profiles.splice(index, 1);
    if (wasActive) activate(roster.profiles[0], roster); else write(roster);
    return true;
  }
  function exportAll() {
    // Backups must remain available even when storage is full.
    const roster = ensure();
    const index = roster.profiles.findIndex(profile => profile.id === currentId);
    if (index >= 0) roster.profiles[index] = summary(S.get(), currentId, roster.profiles[index].createdAt);
    roster.activeId = currentId;
    return clone(roster);
  }
  function importAll(payload) {
    if (!payload || !Array.isArray(payload.profiles) || !payload.profiles.length) return false;
    if (payload.profiles.some(profile => !profile?.data || typeof profile.data !== 'object' || Array.isArray(profile.data))) return false;
    saveCurrent();
    const roster = ensure();
    const imported = payload.profiles.map(profile => {
      const data = S.normalize(clone(profile.data));
      data.character.name = String(data.character.name || profile.name || 'Imported Character');
      const copy = summary(data, uid(roster));
      roster.profiles.push(copy);
      return copy;
    });
    const activeIndex = payload.profiles.findIndex(profile => profile.id === payload.activeId);
    activate(imported[Math.max(0, activeIndex)], roster);
    return true;
  }
  function importCharacter(payload, fallbackName = 'Imported Character') {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
    saveCurrent();
    const roster = ensure();
    const data = S.normalize(clone(payload));
    data.character.name = String(data.character?.name || fallbackName).trim() || fallbackName;
    const id = uid(roster);
    const profile = summary(data, id);
    roster.profiles.push(profile);
    activate(profile, roster);
    return id;
  }

  currentId = ensure().activeId;
  S.subscribe(saveCurrent);
  window.CharacterRoster = { KEY, LEGACY_KEY, list, activeId, saveCurrent, switchTo, create, duplicate, remove, exportAll, importAll, importCharacter };
  window.V7SRoster = window.CharacterRoster;
})();
