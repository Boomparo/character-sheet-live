(function () {
  'use strict';

  const classes = new Map();
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));

  function normalizeDefinition(definition = {}) {
    const id = String(definition.id || '').trim();
    const name = String(definition.name || '').trim();
    if (!id || !name) throw new Error('A character class needs an id and name.');
    return {
      id,
      name,
      shortName: String(definition.shortName || name),
      sigil: String(definition.sigil || '✦'),
      accent: String(definition.accent || '#8f6a3e'),
      motto: String(definition.motto || ''),
      maxLevel: Math.max(1, Number(definition.maxLevel) || 20),
      hitDie: String(definition.hitDie || 'd8'),
      hitDieAverage: Math.max(1, Number(definition.hitDieAverage) || 5),
      primaryAbilities: [...new Set((definition.primaryAbilities || []).filter(Boolean))],
      saves: [...new Set((definition.saves || []).filter(Boolean))],
      skills: [...new Set((definition.skills || []).filter(Boolean))],
      skillChoiceCount: Math.max(0, Number(definition.skillChoiceCount) || 0),
      armor: [...new Set((definition.armor || []).filter(Boolean))],
      weapons: [...new Set((definition.weapons || []).filter(Boolean))],
      tools: [...new Set((definition.tools || []).filter(Boolean))],
      systems: [...new Set((definition.systems || []).filter(Boolean))],
      features: Array.isArray(definition.features) ? definition.features : [],
      actions: Array.isArray(definition.actions) ? definition.actions : [],
      progression: definition.progression || {},
      pages: definition.pages || {},
      createState: typeof definition.createState === 'function' ? definition.createState : () => ({}),
      normalizeState: typeof definition.normalizeState === 'function' ? definition.normalizeState : value => value || {},
      hpMax: typeof definition.hpMax === 'function' ? definition.hpMax : null,
      choiceRequirements: typeof definition.choiceRequirements === 'function' ? definition.choiceRequirements : () => [],
      ...definition,
      id,
      name
    };
  }

  function register(definition) {
    const normalized = normalizeDefinition(definition);
    classes.set(normalized.id, normalized);
    for (const alias of normalized.aliases || []) classes.set(String(alias), normalized);
    return normalized;
  }

  function get(id) { return classes.get(String(id || '')) || null; }
  function canonicalId(id) { return get(id)?.id || ''; }
  function list() { return [...new Map([...classes.values()].map(entry => [entry.id, entry])).values()]; }
  function active(value) { return get(value?.character?.classKey) || get('treasureHunter') || list()[0] || null; }
  function state(value, classId) {
    const definition = get(classId || value?.character?.classKey);
    return definition ? value?.classes?.[definition.id] || null : null;
  }
  function freshStates() {
    return Object.fromEntries(list().map(definition => [definition.id, clone(definition.createState())]));
  }
  function normalizeStates(source = {}) {
    const output = { ...source };
    for (const definition of list()) {
      const base = clone(definition.createState());
      const current = output[definition.id] && typeof output[definition.id] === 'object' ? output[definition.id] : {};
      output[definition.id] = definition.normalizeState(Object.assign(base, clone(current)));
    }
    return output;
  }

  window.CharacterClassRegistry = { register, get, canonicalId, list, active, state, freshStates, normalizeStates };
})();
