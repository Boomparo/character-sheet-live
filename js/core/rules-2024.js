(function(){
  const CONDITIONS={
    Blinded:{name:'Oslepený',summary:'Nevidíš. Automaticky neuspěješ v ověřeních vlastností, která vyžadují zrak. Tvé hody na útok mají Nevýhodu a hody na útok proti tobě mají Výhodu.'},
    Charmed:{name:'Okouzlený',summary:'Nemůžeš útočit na původce okouzlení ani jej cílit škodlivými schopnostmi nebo magickými efekty. Původce má Výhodu na sociální interakce s tebou.'},
    Deafened:{name:'Ohlušený',summary:'Neslyšíš a automaticky neuspěješ v ověřeních vlastností, která vyžadují sluch.'},
    Frightened:{name:'Vystrašený',summary:'Dokud vidíš zdroj strachu, máš Nevýhodu na ověření vlastností a hody na útok a nemůžeš se k němu dobrovolně přiblížit.'},
    Grappled:{name:'Chycený',summary:'Rychlost je 0 a nemůže se zvýšit. Na útoky proti jiným cílům než tomu, kdo tě drží, máš Nevýhodu.'},
    Incapacitated:{name:'Vyřazený',summary:'Nemůžeš provádět akce, bonusové akce ani reakce. Ztrácíš Soustředění a nemůžeš mluvit. Pokud takto házíš iniciativu, máš Nevýhodu.'},
    Invisible:{name:'Neviditelný',summary:'Bez zvláštního smyslu tě nelze vidět. Hody na útok proti tobě mají Nevýhodu a tvé hody na útok mají Výhodu, pokud tě protivník nevidí.'},
    Paralyzed:{name:'Paralyzovaný',summary:'Jsi Vyřazený, Rychlost je 0, automaticky neuspěješ v záchranných hodech na Sílu a Obratnost a útoky proti tobě mají Výhodu. Zásah z 5 ft je kritický.'},
    Petrified:{name:'Zkamenělý',summary:'Jsi Vyřazený, Rychlost je 0, automaticky neuspěješ v záchranných hodech na Sílu a Obratnost, útoky proti tobě mají Výhodu a máš Odolnost vůči všemu zranění.'},
    Poisoned:{name:'Otrávený',summary:'Máš Nevýhodu na hody na útok a ověření vlastností.'},
    Prone:{name:'Na zemi',summary:'Pohybuješ se plazením nebo utratíš polovinu Rychlosti na vstání. Tvé hody na útok mají Nevýhodu. Útoky proti tobě z 5 ft mají Výhodu, ostatní Nevýhodu.'},
    Restrained:{name:'Omezený',summary:'Rychlost je 0. Tvé hody na útok mají Nevýhodu, útoky proti tobě mají Výhodu a záchranné hody na Obratnost mají Nevýhodu.'},
    Stunned:{name:'Omráčený',summary:'Jsi Vyřazený, automaticky neuspěješ v záchranných hodech na Sílu a Obratnost a útoky proti tobě mají Výhodu.'},
    Unconscious:{name:'V bezvědomí',summary:'Jsi Vyřazený a Na zemi, upustíš držené věci, Rychlost je 0 a automaticky neuspěješ v záchranných hodech na Sílu a Obratnost. Zásah z 5 ft je kritický.'}
  };

  const DAMAGE_TYPES=[
    ['Acid','Kyselinové'],['Bludgeoning','Drtivé'],['Cold','Chladné'],['Fire','Ohnivé'],['Force','Silové'],['Lightning','Bleskové'],['Necrotic','Nekrotické'],['Piercing','Bodné'],['Poison','Jedové'],['Psychic','Psychické'],['Radiant','Zářivé'],['Slashing','Sečné'],['Thunder','Hromové']
  ];

  const DEFENSE_TYPES={
    resistance:'Odolnost',
    immunity:'Imunita',
    vulnerability:'Zranitelnost',
    conditionImmunity:'Imunita vůči stavu'
  };

  const ZERO_SPEED=new Set(['Grappled','Restrained','Paralyzed','Petrified','Unconscious']);
  const INCAPACITATED=new Set(['Incapacitated','Paralyzed','Petrified','Stunned','Unconscious']);
  const AUTO_FAIL_STR_DEX=new Set(['Paralyzed','Petrified','Stunned','Unconscious']);
  const ATTACK_DISADVANTAGE=new Set(['Blinded','Poisoned','Prone','Restrained']);
  const ABILITY_CHECK_DISADVANTAGE=new Set(['Poisoned']);

  function exhaustionPenalty(level){return -2*Math.max(0,Math.min(6,Number(level)||0));}
  function exhaustionSpeedPenalty(level){return 5*Math.max(0,Math.min(6,Number(level)||0));}
  function has(conditions,key){return Array.isArray(conditions)&&conditions.includes(key);}
  function isIncapacitated(conditions){return [...INCAPACITATED].some(k=>has(conditions,k));}
  function speedIsZero(conditions){return [...ZERO_SPEED].some(k=>has(conditions,k));}
  function saveAutoFails(conditions,ability){return ['STR','DEX'].includes(ability)&&[...AUTO_FAIL_STR_DEX].some(k=>has(conditions,k));}
  function attackDisadvantage(conditions){return [...ATTACK_DISADVANTAGE].filter(k=>has(conditions,k));}
  function abilityCheckDisadvantage(conditions){return [...ABILITY_CHECK_DISADVANTAGE].filter(k=>has(conditions,k));}
  function damageTypeName(key){return DAMAGE_TYPES.find(x=>x[0]===key)?.[1]||key;}
  function conditionName(key){return CONDITIONS[key]?.name||key;}

  window.DND2024Rules={CONDITIONS,DAMAGE_TYPES,DEFENSE_TYPES,exhaustionPenalty,exhaustionSpeedPenalty,isIncapacitated,speedIsZero,saveAutoFails,attackDisadvantage,abilityCheckDisadvantage,damageTypeName,conditionName};
})();