(function () {
  'use strict';
  const O = window.OccultistDataV10;
  if (!O) return;
  const state = source => source.classes.occultist;
  const entry = (spell, source) => state(source).spells.find(value => value.id === spell.id);
  function available(spell, source) {
    const level = Number(source.character.level) || 1;
    const tier = spell.scienceKey && O.scienceLevels[Number(spell.scienceLevel || 1) - 1];
    return level >= Number(spell.requiredLevel || 1) && (!spell.scienceKey ||
      (Number(state(source).sciences[spell.scienceKey]) >= Number(spell.scienceLevel || 1) && level >= Number(tier?.requiredLevel || 1)));
  }
  function selected(spell, source) {
    if (Number(spell.level) || !spell.scienceKey) return true;
    const choice = (O.scienceChoices[spell.scienceKey] || []).find(value => value.options.includes(spell.id));
    return !choice || state(source).choices.scienceChoices[choice.key] === spell.id;
  }
  function known(source) {
    const byId = new Map(O.spells.filter(spell => available(spell, source) && selected(spell, source)).map(spell => [spell.id, spell]));
    for (const value of state(source).spells) {
      if (value.added && value.definition && !O.spells.some(spell => spell.id === value.id) && available(value.definition, source) && selected(value.definition, source)) byId.set(value.id, { ...value.definition, id: value.id });
    }
    return [...byId.values()];
  }
  const alwaysPrepared = spell => spell.id === 'oziveni-golema';
  const prepared = (spell, source) => !Number(spell.level) || alwaysPrepared(spell) || !!entry(spell, source)?.prepared;
  const preparedCount = source => known(source).filter(spell => Number(spell.level) > 0 && !alwaysPrepared(spell) && prepared(spell, source)).length;
  function castStatus(spell, source) {
    if (!spell || !known(source).some(value => value.id === spell.id)) return { ok: false, reason: 'spell' };
    if (Number(source.character.hp.current) <= 0 || window.DND2024Rules?.isIncapacitated(source.character.conditions)) return { ok: false, reason: 'incapacitated' };
    if (!prepared(spell, source)) return { ok: false, reason: 'prepared' };
    const level = Number(spell.level) || 0;
    if (!level) return { ok: true, slot: 0 };
    const max = O.progressionAt(source.character.level).slots[level - 1] || 0;
    const used = Number(state(source).slotsUsed[level]) || 0;
    return used < max ? { ok: true, slot: level, remaining: max - used } : { ok: false, reason: 'slot', slot: level };
  }
  const get = (id, source) => known(source).find(spell => spell.id === id) || null;
  window.CharacterOccultistSpells = { entry, available, selected, known, alwaysPrepared, prepared, preparedCount, castStatus, get };
})();
