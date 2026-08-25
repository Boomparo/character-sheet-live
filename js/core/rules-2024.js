(function(){
  const CONDITIONS={
    Blinded:{name:'Blinded',summary:'You cannot see. Sight-dependent checks fail automatically. Your attack rolls have Disadvantage, and attack rolls against you have Advantage.'},
    Charmed:{name:'Charmed',summary:'You cannot attack the charmer or target it with harmful abilities or magical effects. The charmer has Advantage on social interaction checks with you.'},
    Deafened:{name:'Deafened',summary:'You cannot hear and automatically fail checks that require hearing.'},
    Frightened:{name:'Frightened',summary:'While you can see the source of your fear, your ability checks and attack rolls have Disadvantage, and you cannot willingly move closer to it.'},
    Grappled:{name:'Grappled',summary:'Your Speed is 0 and cannot increase. Your attacks against targets other than the grappler have Disadvantage.'},
    Incapacitated:{name:'Incapacitated',summary:'You cannot take Actions, Bonus Actions, or Reactions. You lose Concentration and cannot speak. Initiative is rolled with Disadvantage.'},
    Invisible:{name:'Invisible',summary:'Without a special sense you cannot be seen. Attacks against you have Disadvantage, while your attacks have Advantage against creatures that cannot see you.'},
    Paralyzed:{name:'Paralyzed',summary:'You are Incapacitated, your Speed is 0, STR and DEX saves fail automatically, and attacks against you have Advantage. A hit from within 5 ft. is a Critical Hit.'},
    Petrified:{name:'Petrified',summary:'You are Incapacitated, your Speed is 0, STR and DEX saves fail automatically, attacks against you have Advantage, and you have Resistance to all damage.'},
    Poisoned:{name:'Poisoned',summary:'Your attack rolls and ability checks have Disadvantage.'},
    Prone:{name:'Prone',summary:'You crawl or spend half your Speed to stand. Your attacks have Disadvantage. Attacks against you from within 5 ft. have Advantage; attacks from farther away have Disadvantage.'},
    Restrained:{name:'Restrained',summary:'Your Speed is 0. Your attacks have Disadvantage, attacks against you have Advantage, and your Dexterity saving throws have Disadvantage.'},
    Stunned:{name:'Stunned',summary:'You are Incapacitated, STR and DEX saves fail automatically, and attacks against you have Advantage.'},
    Unconscious:{name:'Unconscious',summary:'You are Incapacitated and Prone, drop held items, your Speed is 0, and STR and DEX saves fail automatically. A hit from within 5 ft. is a Critical Hit.'}
  };

  const DAMAGE_TYPES=[
    ['Acid','Acid'],['Bludgeoning','Bludgeoning'],['Cold','Cold'],['Fire','Fire'],['Force','Force'],['Lightning','Lightning'],['Necrotic','Necrotic'],['Piercing','Piercing'],['Poison','Poison'],['Psychic','Psychic'],['Radiant','Radiant'],['Slashing','Slashing'],['Thunder','Thunder']
  ];
  const DEFENSE_TYPES={resistance:'Resistances',immunity:'Immunities',vulnerability:'Vulnerabilities',conditionImmunity:'Condition Immunities'};
  const ZERO_SPEED=new Set(['Grappled','Restrained','Paralyzed','Petrified','Unconscious']);
  const INCAPACITATED=new Set(['Incapacitated','Paralyzed','Petrified','Stunned','Unconscious']);
  const AUTO_FAIL_STR_DEX=new Set(['Paralyzed','Petrified','Stunned','Unconscious']);
  const ATTACK_DISADVANTAGE=new Set(['Blinded','Poisoned','Prone','Restrained']);
  const ABILITY_CHECK_DISADVANTAGE=new Set(['Poisoned']);

  function exhaustionPenalty(level){return -2*Math.max(0,Math.min(6,Number(level)||0))}
  function exhaustionSpeedPenalty(level){return 5*Math.max(0,Math.min(6,Number(level)||0))}
  function has(conditions,key){return Array.isArray(conditions)&&conditions.includes(key)}
  function isIncapacitated(conditions){return [...INCAPACITATED].some(k=>has(conditions,k))}
  function speedIsZero(conditions){return [...ZERO_SPEED].some(k=>has(conditions,k))}
  function saveAutoFails(conditions,ability){return ['STR','DEX'].includes(ability)&&[...AUTO_FAIL_STR_DEX].some(k=>has(conditions,k))}
  function attackDisadvantage(conditions){return [...ATTACK_DISADVANTAGE].filter(k=>has(conditions,k))}
  function abilityCheckDisadvantage(conditions){return [...ABILITY_CHECK_DISADVANTAGE].filter(k=>has(conditions,k))}
  function damageTypeName(key){return DAMAGE_TYPES.find(x=>x[0]===key)?.[1]||key}
  function conditionName(key){return CONDITIONS[key]?.name||key}

  window.DND2024Rules={CONDITIONS,DAMAGE_TYPES,DEFENSE_TYPES,exhaustionPenalty,exhaustionSpeedPenalty,isIncapacitated,speedIsZero,saveAutoFails,attackDisadvantage,abilityCheckDisadvantage,damageTypeName,conditionName};
})();