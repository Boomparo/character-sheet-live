(function () {
  'use strict';

  const Homebrew = window.CharacterHomebrewLibrary;
  const Occultist = window.OccultistDataV10;
  const CACHE_KEY = 'v10-srd-spells-v1';
  const CACHE_MS = 14 * 24 * 60 * 60 * 1000;
  const SPELLS_URL = 'https://raw.githubusercontent.com/5e-bits/5e-database/main/src/2014/en/5e-SRD-Spells.json';
  let memory = null;
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const slug = value => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const text = value => Array.isArray(value) ? value.join('\n\n') : String(value || '');

  function normalizeSrd(source = {}) {
    const components = Array.isArray(source.components) ? source.components.join(', ') : String(source.components || '');
    const damage = source.damage?.damage_at_character_level || source.damage?.damage_at_slot_level || {};
    const firstDamage = Object.values(damage)[0] || '';
    return {
      id: `srd:${source.index || slug(source.name)}`,
      name: String(source.name || source.index || 'Spell'), level: Math.max(0, Number(source.level) || 0),
      school: String(source.school?.name || source.school || ''), time: String(source.casting_time || 'Action'), range: String(source.range || 'Self'),
      components: `${components}${source.material ? ` (${source.material})` : ''}`, duration: `${source.concentration ? 'Concentration, ' : ''}${source.duration || ''}`,
      attack: String(source.dc?.dc_type?.name ? `${source.dc.dc_type.name} save` : source.attack_type ? `${source.attack_type} spell attack` : ''),
      damage: String(firstDamage), desc: text(source.desc), upcast: text(source.higher_level),
      ritual: !!source.ritual, concentration: !!source.concentration,
      classes: (source.classes || []).map(entry => entry.name || entry.index).filter(Boolean), source: 'SRD 5.1 (2014)', raw: clone(source)
    };
  }
  function normalizeOccultist(source = {}) {
    return {
      id: String(source.id || `occultist:${slug(source.name)}`), name: String(source.name || 'Spell'), level: Math.max(0, Number(source.level) || 0),
      school: String(source.school || ''), time: String(source.time || 'Action'), range: String(source.range || 'Self'),
      components: String(source.components || ''), duration: String(source.duration || ''), attack: String(source.attack || ''), damage: String(source.damage || ''),
      desc: String(source.fullText || source.desc || ''), upcast: String(source.upcast || ''), science: String(source.science || ''),
      scienceKey: source.scienceKey || '', scienceLevel: Number(source.scienceLevel) || 0, requiredLevel: Number(source.requiredLevel) || 0,
      classes: ['Occultist'], source: String(source.source || 'Homebrew Occultist'), homebrew: !String(source.source || '').startsWith('2024')
    };
  }
  function readCache() {
    try {
      const value = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (value && Array.isArray(value.spells) && Date.now() - Number(value.savedAt || 0) < CACHE_MS) return value.spells;
    } catch (error) {}
    return null;
  }
  function writeCache(spells) { try { localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), spells })); } catch (error) {} }
  function merge(spells = []) {
    const byName = new Map();
    for (const spell of spells) byName.set(String(spell.name || '').toLowerCase(), spell);
    for (const source of Occultist?.spells || []) {
      const spell = normalizeOccultist(source), key = spell.name.toLowerCase(), existing = byName.get(key);
      byName.set(key, existing ? { ...existing, ...spell, desc: spell.desc || existing.desc, upcast: spell.upcast || existing.upcast, source: spell.source || existing.source } : spell);
    }
    for (const spell of Homebrew?.spells?.() || []) byName.set(String(spell.name || '').toLowerCase(), clone(spell));
    return [...byName.values()];
  }
  async function load(force = false) {
    if (memory && !force) return merge(memory);
    if (!force) {
      const cached = readCache();
      if (cached) { memory = cached; return merge(memory); }
    }
    try {
      const response = await fetch(SPELLS_URL, { cache: 'force-cache' });
      if (!response.ok) throw new Error(`Spell catalog HTTP ${response.status}`);
      memory = (await response.json()).map(normalizeSrd);
      writeCache(memory);
    } catch (error) { memory = []; }
    return merge(memory);
  }
  async function search(query = '', filters = {}) {
    const needle = String(query || '').trim().toLowerCase();
    const level = filters.level == null || filters.level === 'all' ? null : Number(filters.level);
    const school = String(filters.school || 'all');
    const className = String(filters.className || 'all');
    const spells = await load();
    return spells.filter(spell => {
      const haystack = `${spell.name} ${spell.school} ${spell.source} ${spell.desc} ${(spell.classes || []).join(' ')}`.toLowerCase();
      return (!needle || haystack.includes(needle)) && (level == null || spell.level === level) &&
        (school === 'all' || spell.school === school) && (className === 'all' || (spell.classes || []).includes(className));
    }).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  }
  async function get(id) { return (await load()).find(spell => spell.id === id) || null; }

  Homebrew?.subscribe?.(() => {});
  window.CharacterSpellCatalog = { load, search, get, normalizeOccultist, sourceUrl: SPELLS_URL };
})();
