(function () {
  'use strict';
  const Registry = window.CharacterClassRegistry;
  const T = window.TreasureHunterDataV7s;
  if (!Registry || !T) return;

  Registry.register({
    id: 'treasureHunter', aliases: ['treasure'], name: 'Treasure Hunter', shortName: 'Treasure Hunter',
    sigil: '⌖', accent: '#8f3238', motto: 'Fortune favors the prepared.', maxLevel: 20,
    hitDie: 'd10', hitDieAverage: 6, primaryAbilities: ['DEX', 'INT'], saves: T.saves,
    skills: T.classSkills || [], skillChoiceCount: 3, armor: T.armor, weapons: T.weapons,
    tools: ["Thieves' Tools", "Navigator's Tools"], systems: ['cool', 'subclasses'], features: T.features,
    createState() {
      return {
        coolUsed: 0, featureUses: {}, relics: [],
        choices: {
          classSkills: [], ancientLanguages: ['', '', ''], vehicles: ['', ''], expertise: '',
          subclass: '', subclassConfirmed: false, weaponMasteries: ['', ''],
          feat4: [], feat8: [], feat12: [], feat16: [], epicBoon19: [], startingMelee: '', startingRanged: ''
        }
      };
    },
    hpMax(level, constitutionModifier) { return T.hpMax(level, constitutionModifier); }
  });
})();
