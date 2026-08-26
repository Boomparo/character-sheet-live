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
  const MASTERY_PROPERTIES={
    Cleave:'On a melee hit, make one extra attack against a second creature within 5 ft. of the first and within your reach. Once per turn; the extra damage normally omits your ability modifier.',
    Graze:'On a miss, deal damage equal to the attack ability modifier, of the weapon’s damage type.',
    Nick:'Make the Light property’s extra attack as part of the Attack action instead of as a Bonus Action. Once per turn.',
    Push:'On a hit, push a Large or smaller creature up to 10 ft. straight away from you.',
    Sap:'On a hit, the target has Disadvantage on its next attack roll before the start of your next turn.',
    Slow:'On a damaging hit, reduce the target’s Speed by 10 ft. until the start of your next turn. Multiple Slow hits do not increase the reduction.',
    Topple:'On a hit, the target makes a CON save (DC 8 + attack ability modifier + PB); on a failure, it is Prone.',
    Vex:'On a damaging hit, gain Advantage on your next attack against that target before the end of your next turn.'
  };
  const WEAPON_MASTERY={
    Club:'Slow',Dagger:'Nick',Greatclub:'Push',Handaxe:'Vex',Javelin:'Slow','Light Hammer':'Nick',Mace:'Sap',Quarterstaff:'Topple',Sickle:'Nick',Spear:'Sap',
    Dart:'Vex','Light Crossbow':'Slow',Shortbow:'Vex',Sling:'Slow',Battleaxe:'Topple',Flail:'Sap',Glaive:'Graze',Greataxe:'Cleave',Greatsword:'Graze',
    Halberd:'Cleave',Lance:'Topple',Longsword:'Sap',Maul:'Topple',Morningstar:'Sap',Pike:'Push',Rapier:'Vex',Scimitar:'Nick',Shortsword:'Vex',
    Trident:'Topple',Warhammer:'Push','War Pick':'Sap',Whip:'Slow',Blowgun:'Vex','Hand Crossbow':'Vex','Heavy Crossbow':'Push',Longbow:'Slow',Musket:'Slow',Pistol:'Vex'
  };
  const STARTING_WEAPON_PROFILES={
    Rapier:{damage:'1d8',damageType:'Piercing',properties:['Finesse'],mastery:'Vex'},
    Scimitar:{damage:'1d6',damageType:'Slashing',properties:['Finesse','Light'],mastery:'Nick'},
    Shortsword:{damage:'1d6',damageType:'Piercing',properties:['Finesse','Light'],mastery:'Vex'},
    Blowgun:{damage:'1',damageType:'Piercing',attackAbility:'DEX',rangeLabel:'25/100 ft.',properties:['Ammunition (Needle)','Loading'],mastery:'Vex',ammunition:'Needles'},
    'Hand Crossbow':{damage:'1d6',damageType:'Piercing',attackAbility:'DEX',rangeLabel:'30/120 ft.',properties:['Ammunition (Bolt)','Light','Loading'],mastery:'Vex',ammunition:'Bolts'},
    'Heavy Crossbow':{damage:'1d10',damageType:'Piercing',attackAbility:'DEX',rangeLabel:'100/400 ft.',properties:['Ammunition (Bolt)','Heavy','Loading','Two-Handed'],mastery:'Push',ammunition:'Bolts'},
    Longbow:{damage:'1d8',damageType:'Piercing',attackAbility:'DEX',rangeLabel:'150/600 ft.',properties:['Ammunition (Arrow)','Heavy','Two-Handed'],mastery:'Slow',ammunition:'Arrows'},
    Musket:{damage:'1d12',damageType:'Piercing',attackAbility:'DEX',rangeLabel:'40/120 ft.',properties:['Ammunition (Bullet)','Loading','Two-Handed'],mastery:'Slow',ammunition:'Bullets'},
    Pistol:{damage:'1d10',damageType:'Piercing',attackAbility:'DEX',rangeLabel:'30/90 ft.',properties:['Ammunition (Bullet)','Loading'],mastery:'Vex',ammunition:'Bullets'}
  };
  const ZERO_SPEED=new Set(['Grappled','Restrained','Paralyzed','Petrified','Unconscious']);
  const INCAPACITATED=new Set(['Incapacitated','Paralyzed','Petrified','Stunned','Unconscious']);
  const AUTO_FAIL_STR_DEX=new Set(['Paralyzed','Petrified','Stunned','Unconscious']);
  const ATTACK_DISADVANTAGE=new Set(['Blinded','Poisoned','Prone','Restrained','Frightened']);
  const ABILITY_CHECK_DISADVANTAGE=new Set(['Poisoned','Frightened']);

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
  function weaponMastery(name){
    const match=Object.keys(WEAPON_MASTERY).find(weapon=>weapon.toLowerCase()===String(name||'').trim().toLowerCase());
    return match?WEAPON_MASTERY[match]:'';
  }
  function startingWeaponProfile(name){
    const match=Object.keys(STARTING_WEAPON_PROFILES).find(weapon=>weapon.toLowerCase()===String(name||'').trim().toLowerCase());
    if(!match)return null;
    const profile=STARTING_WEAPON_PROFILES[match];
    return{name:match,itemType:'weapon',category:profile.attackAbility?'Martial Ranged Weapon':'Martial Melee Weapon',...profile,properties:[...(profile.properties||[])]};
  }

  function fixedSkillMode(conditions){
    const sources=abilityCheckDisadvantage(conditions);
    return sources.length?{mode:'disadvantage',locked:true,sources}:{mode:'normal',locked:false,sources:[]};
  }
  function fixedSaveMode(conditions,ability){
    if(saveAutoFails(conditions,ability))return{mode:'autoFail',locked:true,sources:conditions.filter(x=>AUTO_FAIL_STR_DEX.has(x))};
    if(ability==='DEX'&&has(conditions,'Restrained'))return{mode:'disadvantage',locked:true,sources:['Restrained']};
    return{mode:'normal',locked:false,sources:[]};
  }
  function fixedInitiativeMode(conditions){
    const sources=conditions.filter(x=>INCAPACITATED.has(x));
    return sources.length?{mode:'disadvantage',locked:true,sources}:{mode:'normal',locked:false,sources:[]};
  }

  window.DND2024Rules={CONDITIONS,DAMAGE_TYPES,DEFENSE_TYPES,MASTERY_PROPERTIES,WEAPON_MASTERY,STARTING_WEAPON_PROFILES,exhaustionPenalty,exhaustionSpeedPenalty,isIncapacitated,speedIsZero,saveAutoFails,attackDisadvantage,abilityCheckDisadvantage,damageTypeName,conditionName,weaponMastery,startingWeaponProfile,fixedSkillMode,fixedSaveMode,fixedInitiativeMode};
})();
