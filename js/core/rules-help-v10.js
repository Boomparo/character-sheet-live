(function () {
  'use strict';
  const terms = [
    [/nevýhod(?:a|u|ou)(?![\p{L}])/giu, 'Disadvantage'],
    [/výhod(?:a|u|ou)(?![\p{L}])/giu, 'Advantage'],
    [/bonusov(?:á|ou|é) akc(?:e|i|í)(?![\p{L}])/giu, 'Bonus Action'],
    [/příležitostn(?:ý|é|ého|ým|ými) útok(?:y|u|em|ům)?(?![\p{L}])/giu, 'Opportunity Attack'],
    [/záchrann(?:ý|ém|ého|ým|é) hod(?:u|y|em|ům)?(?![\p{L}])/giu, 'saving throw'],
    [/ověření (?:vlastnosti|charakteristiky)/giu, 'ability check'],
    [/hod(?:y|u|em|ům)? na útok(?![\p{L}])/giu, 'attack roll'],
    [/dlouh(?:ý|ém|ého|ým) odpočink(?:u|em)?(?![\p{L}])/giu, 'Long Rest'],
    [/krátk(?:ý|ém|ého|ým) odpočink(?:u|em)?(?![\p{L}])/giu, 'Short Rest'],
    [/magick(?:á|ou|é) akc(?:e|i|í)(?![\p{L}])/giu, 'Magic Action'],
    [/soustředění(?![\p{L}])/giu, 'Concentration'],
    [/sladění(?![\p{L}])/giu, 'Attunement'],
    [/reakc(?:e|i|í)(?![\p{L}])/giu, 'Reaction'],
    [/akc(?:e|i|í)(?![\p{L}])/giu, 'Action'],
    [/rychlost(?:i|í)?(?![\p{L}])/giu, 'Speed'],
    [/na zemi(?![\p{L}])/giu, 'Prone'],
    [/život(?:y|ů|ům|ech)(?![\p{L}])/giu, 'HP'],
    [/zranění(?![\p{L}])/giu, 'damage']
  ];
  function text(value) {
    let result = String(value ?? '');
    for (const [pattern, replacement] of terms) result = result.replace(new RegExp(`(?<![\\p{L}])${pattern.source}`, pattern.flags), replacement);
    return result;
  }
  const properties = {
    Finesse: 'Choose STR or DEX for attack and damage. Use the same ability for both rolls.',
    Light: 'After attacking with this weapon during your Attack action, you can make one Bonus Action attack with a different Light weapon. Omit a positive ability modifier from that extra damage.',
    Heavy: 'Melee: STR below 13 gives Disadvantage on attacks. Ranged: the same applies to DEX below 13.',
    Reach: 'Adds 5 ft. to your melee reach for attacks and Opportunity Attacks. Class features can increase it further.',
    Thrown: 'You can throw this weapon within its listed range. A melee weapon uses the same attack and damage ability when thrown, including Finesse.',
    Ammunition: 'Each ranged attack consumes one piece of the listed ammunition. Loading a one-handed weapon needs a free hand. After combat, spend 1 minute to recover half the ammunition used.',
    Loading: 'Only one piece of ammunition can be fired per Action, Bonus Action or Reaction, regardless of how many attacks you can normally make.',
    'Two-Handed': 'Requires both hands when you attack. You can hold it with one hand between attacks.',
    Versatile: 'Use the damage die in parentheses when making a melee attack with both hands.',
    Range: 'The first number is normal range. Attacks beyond it have Disadvantage. You cannot attack beyond the second number.'
  };
  function property(value) {
    const name = String(value || '').replace(/\s*\(.*/, '').trim();
    return properties[name] || window.DND2024Rules?.MASTERY_PROPERTIES?.[name] || '';
  }
  window.CharacterRulesHelp = { text, property, properties };
})();
