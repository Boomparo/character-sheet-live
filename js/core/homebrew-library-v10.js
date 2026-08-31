(function () {
  'use strict';

  const KEY = 'character-sheet-homebrew-v1';
  const VERSION = 1;
  const listeners = new Set();
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const array = value => Array.isArray(value) ? value : [];
  const slug = value => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const uid = prefix => {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return `${prefix}-${window.crypto.randomUUID()}`;
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  };

  function empty() { return { version: VERSION, items: [], spells: [], potionRecipes: [] }; }
  function normalizeItem(source = {}) {
    const item = clone(source);
    item.libraryId = String(item.libraryId || item.homebrewId || item.id || uid('hb-item'));
    if (!item.libraryId.startsWith('hb-item-')) item.libraryId = `hb-item-${slug(item.libraryId) || uid('item')}`;
    item.id = `homebrew:user:${item.libraryId}`;
    item.name = String(item.name || 'Homebrew Item').trim() || 'Homebrew Item';
    item.kind = item.kind === 'Magic Item' ? 'Magic Item' : 'Equipment';
    item.rarity = String(item.rarity || 'Mundane');
    item.category = String(item.category || 'Homebrew');
    item.description = String(item.description || item.notes || '');
    item.source = String(item.source || 'My Homebrew');
    item.homebrew = true;
    item.userHomebrew = true;
    item.tags = [...new Set([...array(item.tags), 'homebrew'].map(slug).filter(Boolean))];
    item.updatedAt = new Date().toISOString();
    delete item.containerId;
    delete item.location;
    delete item.addedAt;
    delete item.ammunitionCount;
    return item;
  }
  function normalizeSpell(source = {}) {
    const spell = clone(source);
    spell.libraryId = String(spell.libraryId || spell.homebrewId || spell.id || uid('hb-spell'));
    if (!spell.libraryId.startsWith('hb-spell-')) spell.libraryId = `hb-spell-${slug(spell.libraryId) || uid('spell')}`;
    spell.id = `homebrew:user:${spell.libraryId}`;
    spell.name = String(spell.name || 'Homebrew Spell').trim() || 'Homebrew Spell';
    spell.level = Math.max(0, Math.min(9, Number(spell.level) || 0));
    spell.school = String(spell.school || 'Universal');
    spell.time = String(spell.time || spell.castingTime || 'Action');
    spell.range = String(spell.range || 'Self');
    spell.components = String(spell.components || '');
    spell.duration = String(spell.duration || 'Instantaneous');
    spell.attack = String(spell.attack || '');
    spell.desc = String(spell.desc || spell.description || '');
    spell.upcast = String(spell.upcast || '');
    spell.classes = [...new Set(array(spell.classes).map(String).filter(Boolean))];
    spell.source = String(spell.source || 'My Homebrew');
    spell.homebrew = true;
    spell.userHomebrew = true;
    spell.updatedAt = new Date().toISOString();
    return spell;
  }
  function normalizeRecipe(source = {}) {
    const recipe = clone(source);
    recipe.libraryId = String(recipe.libraryId || recipe.id || uid('hb-potion'));
    if (!recipe.libraryId.startsWith('hb-potion-')) recipe.libraryId = `hb-potion-${slug(recipe.libraryId) || uid('potion')}`;
    recipe.id = `homebrew:user:${recipe.libraryId}`;
    recipe.name = String(recipe.name || 'Homebrew Potion').trim() || 'Homebrew Potion';
    recipe.description = String(recipe.description || '');
    recipe.effect = String(recipe.effect || '');
    recipe.ingredients = array(recipe.ingredients).map(entry => typeof entry === 'string' ? { name: entry, quantity: 1 } : { name: String(entry?.name || ''), quantity: Math.max(1, Number(entry?.quantity) || 1) }).filter(entry => entry.name);
    recipe.timeMinutes = Math.max(0, Number(recipe.timeMinutes) || 0);
    recipe.costGp = Math.max(0, Number(recipe.costGp) || 0);
    recipe.quantity = Math.max(1, Number(recipe.quantity) || 1);
    recipe.source = String(recipe.source || 'My Homebrew');
    recipe.homebrew = true;
    recipe.updatedAt = new Date().toISOString();
    return recipe;
  }
  function normalize(source) {
    const data = source && typeof source === 'object' ? source : empty();
    return {
      version: VERSION,
      items: array(data.items).map(normalizeItem),
      spells: array(data.spells).map(normalizeSpell),
      potionRecipes: array(data.potionRecipes).map(normalizeRecipe)
    };
  }
  function read() {
    try { return normalize(JSON.parse(localStorage.getItem(KEY) || 'null')); }
    catch (error) { return empty(); }
  }
  function write(data) {
    const next = normalize(data);
    try { localStorage.setItem(KEY, JSON.stringify(next)); }
    catch (error) { return false; }
    for (const listener of listeners) { try { listener(clone(next)); } catch (error) {} }
    if (typeof window.dispatchEvent === 'function' && typeof window.CustomEvent === 'function') window.dispatchEvent(new CustomEvent('character-sheet:homebrew-changed', { detail: clone(next) }));
    return true;
  }
  function upsert(bucket, value, normalizer) {
    const data = read();
    const next = normalizer(value);
    const index = data[bucket].findIndex(entry => entry.libraryId === next.libraryId || entry.id === next.id);
    if (index >= 0) data[bucket][index] = next; else data[bucket].push(next);
    if (!write(data)) return null;
    return clone(next);
  }
  function remove(bucket, id) {
    const data = read();
    const before = data[bucket].length;
    data[bucket] = data[bucket].filter(entry => entry.libraryId !== id && entry.id !== id);
    return data[bucket].length !== before && write(data);
  }
  function importAll(payload, mode = 'merge') {
    const incoming = normalize(payload);
    if (mode === 'replace') return write(incoming);
    const current = read();
    for (const bucket of ['items', 'spells', 'potionRecipes']) {
      const byId = new Map(current[bucket].map(entry => [entry.libraryId, entry]));
      for (const entry of incoming[bucket]) byId.set(entry.libraryId, entry);
      current[bucket] = [...byId.values()];
    }
    return write(current);
  }

  window.CharacterHomebrewLibrary = {
    KEY, VERSION, read, exportAll: () => clone(read()), importAll,
    items: () => clone(read().items), spells: () => clone(read().spells), potionRecipes: () => clone(read().potionRecipes),
    saveItem: value => upsert('items', value, normalizeItem),
    saveSpell: value => upsert('spells', value, normalizeSpell),
    savePotionRecipe: value => upsert('potionRecipes', value, normalizeRecipe),
    removeItem: id => remove('items', id), removeSpell: id => remove('spells', id), removePotionRecipe: id => remove('potionRecipes', id),
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }
  };
})();
