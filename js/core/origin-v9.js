(function () {
  'use strict';

  const SKILLS = [
    'Acrobatics', 'Animal Handling', 'Arcana', 'Athletics', 'Deception', 'History', 'Insight',
    'Intimidation', 'Investigation', 'Medicine', 'Nature', 'Perception', 'Performance',
    'Persuasion', 'Religion', 'Sleight of Hand', 'Stealth', 'Survival'
  ];
  const SIMPLE_WEAPONS = [
    'Club', 'Dagger', 'Greatclub', 'Handaxe', 'Javelin', 'Light Hammer', 'Mace',
    'Quarterstaff', 'Sickle', 'Spear', 'Dart', 'Light Crossbow', 'Shortbow', 'Sling'
  ];
  const VEHICLES = ['Land Vehicles', 'Water Vehicles', 'Train', 'Automobile', 'Motorcycle', 'Aircraft'];
  const TOOLS = [
    "Thieves' Tools", "Navigator's Tools", "Alchemist's Supplies", "Brewer's Supplies",
    "Calligrapher's Supplies", "Carpenter's Tools", "Cartographer's Tools", "Cobbler's Tools",
    "Cook's Utensils", "Disguise Kit", "Forgery Kit", "Gaming Set", "Herbalism Kit",
    "Jeweler's Tools", "Leatherworker's Tools", "Mason's Tools", "Musical Instrument",
    "Painter's Supplies", "Poisoner's Kit", "Potter's Tools", "Smith's Tools",
    "Tinker's Tools", "Weaver's Tools", "Woodcarver's Tools"
  ];

  const SPECIES = [
    {
      id: 'city_goblin_lukys_campaign', name: 'City Goblin', mechanicsAvailable: true,
      size: 'Small', speed: 25, source: 'Úvod do reálií 3, s. 12',
      traits: [
        ['Darkvision', 'Darkvision 60 ft.'],
        ['Jacobson’s Organ', 'Blindsight 10 ft. through scent and the forked tongue. It cannot discern colors, writing, light, or intangible objects.'],
        ['Burrow', 'Can burrow with claws through soft material such as sand, soil, or lawn. The source does not define a Burrow Speed or action; those details remain with the DM.'],
        ['Child of the Street', 'Advantage on Deception, Insight, Intimidation, and Persuasion checks while dealing with criminals and society outcasts. Choose two skill proficiencies and one Simple Weapon proficiency.'],
        ['Bite and Claw', 'Unarmed Strikes use a 1d6 damage die, increasing to 2d6 at character level 5. The source does not define the damage type or ability modifier.']
      ]
    },
    { id: 'civilized_elf', name: 'Civilized Elf', mechanicsAvailable: false, source: 'Úvod do reálií 3' },
    { id: 'horned_faun', name: 'Horned Faun', mechanicsAvailable: false, source: 'Úvod do reálií 3' },
    { id: 'humane_human', name: 'Humane Human', mechanicsAvailable: false, source: 'Úvod do reálií 3' },
    { id: 'outlandish_orc', name: 'Outlandish Orc', mechanicsAvailable: false, source: 'Úvod do reálií 3' },
    { id: 'stocky_halfling', name: 'Stocky Halfling', mechanicsAvailable: false, source: 'Úvod do reálií 3' },
    { id: 'veela_scrat', name: 'Veela/Scrat', mechanicsAvailable: false, source: 'Úvod do reálií 3' }
  ];

  const BACKGROUND = {
    id: 'luky_universal_background', name: 'Lukyho univerzální background', source: 'Lukyho homebrew',
    skills: 2, tool: 1, secondary: 1, abilityModes: ['+2/+1', '+1/+1/+1'],
    feats: {
      Defence: { description: 'While wearing Light, Medium, or Heavy armor, gain +1 Armor Class.', mechanic: 'ac' },
      Resilient: { description: 'Choose one ability. Increase it by 1 (maximum 20) and gain proficiency in saving throws using it.', mechanic: 'resilient' },
      Skilled: { description: 'Gain proficiency in any combination of three skills or tools.', mechanic: 'skilled' },
      Alert: { description: 'Add your Proficiency Bonus to Initiative. After rolling Initiative, you may swap it with one willing ally in the same combat if neither creature is Incapacitated.', mechanic: 'initiative' },
      Lucky: { description: 'Luck Points equal your Proficiency Bonus, restored on a Long Rest. Spend 1 for Advantage on your D20 Test or to impose Disadvantage on an attack against you.', mechanic: 'luck' },
      Healer: { description: 'Battle Medic uses a Healer’s Kit and one Hit Point Die of the target, restoring the die roll + your Proficiency Bonus. Healing Rerolls lets you reroll a 1 on a healing die.', mechanic: 'healer' },
      'Savage Attacker': { description: 'Once per turn when you hit with a weapon, roll the weapon damage dice twice and use either roll.', mechanic: 'savage' },
      Tough: { description: 'Your Hit Point maximum increases by 2 for each character level and by 2 whenever you gain another level.', mechanic: 'tough' }
    }
  };

  function species(state) {
    const selected = state?.character?.origin?.species || state?.character?.race || '';
    return SPECIES.find(item => item.id === selected || item.name === selected) || null;
  }

  function background(state) {
    return state?.character?.origin?.background || {};
  }

  function backgroundFeat(state) {
    return String(background(state).feat || '');
  }

  function abilityBonuses(state) {
    const selected = background(state);
    const choices = [...new Set((selected.abilityChoices || []).filter(Boolean))];
    const result = {};
    if (selected.abilityMode === '+1/+1/+1') {
      choices.slice(0, 3).forEach(ability => { result[ability] = 1; });
    } else {
      if (choices[0]) result[choices[0]] = 2;
      if (choices[1]) result[choices[1]] = 1;
    }
    return result;
  }

  function originIncomplete(state) {
    const origin = state?.character?.origin || {};
    const selectedSpecies = species(state);
    const selectedBackground = background(state);
    const missing = [];
    if (!selectedSpecies) {
      missing.push('Species');
    } else if (selectedSpecies.id === 'city_goblin_lukys_campaign') {
      if ([...new Set((origin.speciesChoices?.skills || []).filter(Boolean))].length < 2) missing.push('City Goblin: 2 skills');
      if (!origin.speciesChoices?.simpleWeapon) missing.push('City Goblin: Simple Weapon');
    }
    if ((selectedBackground.skills || []).filter(Boolean).length < 2) missing.push('Background: 2 skills');
    if (!selectedBackground.tool) missing.push('Background: tool/kit/supplies');
    if (!selectedBackground.secondary) missing.push('Background: instrument/game/vehicle');
    if (!selectedBackground.feat) missing.push('Background feat');
    const abilityCount = selectedBackground.abilityMode === '+1/+1/+1' ? 3 : 2;
    if ([...new Set((selectedBackground.abilityChoices || []).filter(Boolean))].length < abilityCount) missing.push('Background ability boosts');
    if (selectedBackground.feat === 'Resilient' && !selectedBackground.resilientAbility) missing.push('Resilient ability');
    if (selectedBackground.feat === 'Skilled' && [...new Set((selectedBackground.skilledChoices || []).filter(Boolean))].length < 3) missing.push('Skilled: 3 choices');
    return missing;
  }

  function speciesTraits(state) {
    return species(state)?.traits || [];
  }

  window.CharacterOrigin = {
    SKILLS, SIMPLE_WEAPONS, VEHICLES, TOOLS, SPECIES, BACKGROUND,
    species, background, backgroundFeat, abilityBonuses, originIncomplete, speciesTraits
  };
})();
