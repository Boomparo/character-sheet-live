(function(){
  const S=window.V7SStateV7s,T=window.TreasureHunterDataV7s,D=window.V7SDerived;if(!S||!T||!D)return;
  const SKILLS=['Acrobatics','Animal Handling','Arcana','Athletics','Deception','History','Insight','Intimidation','Investigation','Medicine','Nature','Perception','Performance','Persuasion','Religion','Sleight of Hand','Stealth','Survival'];
  const SIMPLE_WEAPONS=['Club','Dagger','Greatclub','Handaxe','Javelin','Light Hammer','Mace','Quarterstaff','Sickle','Spear','Dart','Light Crossbow','Shortbow','Sling'];
  const SPECIES=[
    {id:'city_goblin_lukys_campaign',name:'City Goblin',mechanicsAvailable:true,size:'Small',speed:25,source:'Úvod do reálií 3, p. 12',traits:[
      ['Darkvision','Darkvision 60 ft.'],['Jacobson’s Organ','Blindsight 10 ft. through scent and the forked tongue. It cannot discern colors, writing, light, or intangible objects.'],['Burrow','Can burrow with claws through soft material such as sand, soil, or lawn. The source does not specify a Burrow Speed or action, so the DM determines those details.'],['Child of the Street','Advantage on Deception, Insight, Intimidation, and Persuasion checks while dealing with criminals and society outcasts. Choose two skill proficiencies and one Simple Weapon proficiency.'],['Bite and Claw','Unarmed Strikes use a 1d6 damage die, increasing to 2d6 at character level 5. The source does not specify damage type or the ability modifier, so those remain DM-defined.']
    ]},
    {id:'civilized_elf',name:'Civilized Elf',mechanicsAvailable:false,source:'Úvod do reálií 3'},
    {id:'horned_faun',name:'Horned Faun',mechanicsAvailable:false,source:'Úvod do reálií 3'},
    {id:'humane_human',name:'Humane Human',mechanicsAvailable:false,source:'Úvod do reálií 3'},
    {id:'outlandish_orc',name:'Outlandish Orc',mechanicsAvailable:false,source:'Úvod do reálií 3'},
    {id:'stocky_halfling',name:'Stocky Halfling',mechanicsAvailable:false,source:'Úvod do reálií 3'},
    {id:'veela_scrat',name:'Veela/Scrat',mechanicsAvailable:false,source:'Úvod do reálií 3'}
  ];
  const BACKGROUND={id:'luky_universal_background',name:'Lukyho univerzální background',source:'Lukyho homebrew',skills:2,tool:1,secondary:1,abilityModes:['+2/+1','+1/+1/+1'],feats:{
    Defence:{description:'While wearing Light, Medium, or Heavy armor, gain +1 Armor Class.',mechanic:'ac'},
    Resilient:{description:'Choose one ability. Increase it by 1 (maximum 20) and gain proficiency in saving throws using it.',mechanic:'resilient'},
    Skilled:{description:'Gain proficiency in any combination of three skills or tools.',mechanic:'skilled'},
    Alert:{description:'Add your Proficiency Bonus to Initiative. Immediately after rolling Initiative, you may swap it with one willing ally in the same combat if neither creature is Incapacitated.',mechanic:'initiative'},
    Lucky:{description:'Luck Points equal your Proficiency Bonus, restored on a Long Rest. Spend 1 for Advantage on your D20 Test or to impose Disadvantage on an attack against you.',mechanic:'luck'},
    Healer:{description:'Battle Medic uses a Healer’s Kit and one Hit Point Die of the target, restoring the die roll + your Proficiency Bonus. Healing Rerolls lets you reroll a 1 on a healing die.',mechanic:'healer'},
    'Savage Attacker':{description:'Once per turn when you hit with a weapon, roll the weapon damage dice twice and use either roll.',mechanic:'savage'},
    Tough:{description:'Your Hit Point maximum increases by 2 for each character level and by 2 whenever you gain another level.',mechanic:'tough'}
  }};
  function state(){return S.get()}
  function origin(){return state().character.origin||{}}
  function species(){const n=origin().species||state().character.race||'';return SPECIES.find(x=>x.id===n||x.name===n)||null}
  function bg(){return origin().background||{}}
  function backgroundFeat(){return bg().feat||''}
  function ensure(){S.update(s=>{const c=s.character;c.origin||(c.origin={species:c.race||'',speciesChoices:{skills:[],simpleWeapon:''},background:{name:BACKGROUND.name,skills:[],tool:'',secondary:'',feat:'',abilityMode:'+2/+1',abilityChoices:[],appliedBonuses:{},resilientAbility:'',skilledChoices:[]}});c.origin.speciesChoices||(c.origin.speciesChoices={skills:[],simpleWeapon:''});c.origin.background||(c.origin.background={name:BACKGROUND.name,skills:[],tool:'',secondary:'',feat:'',abilityMode:'+2/+1',abilityChoices:[],appliedBonuses:{},resilientAbility:'',skilledChoices:[]})})}
  function applyAbilityBonuses(next){
    S.update(s=>{const c=s.character,o=c.origin||(c.origin={}),b=o.background||(o.background={}),old=b.appliedBonuses||{};Object.entries(old).forEach(([a,v])=>{if(c.abilities[a]!=null)c.abilities[a]=Math.max(1,Number(c.abilities[a])-Number(v||0))});Object.entries(next||{}).forEach(([a,v])=>{if(c.abilities[a]!=null)c.abilities[a]=Math.min(30,Number(c.abilities[a])+Number(v||0))});b.appliedBonuses={...(next||{})}})
  }
  function applySpecies(name,choices={}){
    const sp=SPECIES.find(x=>x.name===name||x.id===name);if(!sp)return;
    S.update(s=>{const c=s.character;c.origin||(c.origin={});c.origin.species=sp.name;c.race=sp.name;c.origin.speciesChoices={skills:[...(choices.skills||[])].slice(0,2),simpleWeapon:choices.simpleWeapon||''};
      if(sp.id==='city_goblin_lukys_campaign'){
        c.speed=25;c.size='Small';c.proficiencies||(c.proficiencies={languages:[],vehicles:[],tools:[],weapons:[],armor:[],senses:[],defenses:[]});c.proficiencies.senses=(c.proficiencies.senses||[]).filter(x=>!/^Darkvision 60 ft\.|^Blindsight 10 ft\./.test(x));c.proficiencies.senses.push('Darkvision 60 ft.','Blindsight 10 ft.');
        (choices.skills||[]).slice(0,2).forEach(sk=>{c.skills||(c.skills={});c.skills[sk]=Math.max(1,Number(c.skills[sk])||0)});if(choices.simpleWeapon&&!c.proficiencies.weapons.includes(choices.simpleWeapon))c.proficiencies.weapons.push(choices.simpleWeapon);
      }
    });
  }
  function applyBackground(next){
    const b={name:BACKGROUND.name,skills:[...(next.skills||[])].slice(0,2),tool:next.tool||'',secondary:next.secondary||'',feat:next.feat||'',abilityMode:next.abilityMode||'+2/+1',abilityChoices:[...(next.abilityChoices||[])],resilientAbility:next.resilientAbility||'',skilledChoices:[...(next.skilledChoices||[])],appliedBonuses:bg().appliedBonuses||{}};
    const bonuses={};if(b.abilityMode==='+1/+1/+1'){[...new Set(b.abilityChoices)].slice(0,3).forEach(a=>bonuses[a]=1)}else{const u=[...new Set(b.abilityChoices)].slice(0,2);if(u[0])bonuses[u[0]]=2;if(u[1])bonuses[u[1]]=1}
    applyAbilityBonuses(bonuses);
    S.update(s=>{const c=s.character;c.origin||(c.origin={});b.appliedBonuses=bonuses;c.origin.background=b;c.background=BACKGROUND.name;
      b.skills.forEach(sk=>{c.skills||(c.skills={});c.skills[sk]=Math.max(1,Number(c.skills[sk])||0)});c.proficiencies||(c.proficiencies={languages:[],vehicles:[],tools:[],weapons:[],armor:[],senses:[],defenses:[]});if(b.tool&&!c.proficiencies.tools.includes(b.tool))c.proficiencies.tools.push(b.tool);if(b.secondary&&!c.proficiencies.tools.includes(b.secondary))c.proficiencies.tools.push(b.secondary);
      if(b.feat==='Skilled')b.skilledChoices.forEach(x=>{if(SKILLS.includes(x)){c.skills[x]=Math.max(1,Number(c.skills[x])||0)}else if(x&&!c.proficiencies.tools.includes(x))c.proficiencies.tools.push(x)});
    });
  }
  function originIncomplete(){const o=origin(),sp=species(),b=bg(),x=[];if(!sp)x.push('Species');else if(sp.id==='city_goblin_lukys_campaign'){if((o.speciesChoices?.skills||[]).filter(Boolean).length<2)x.push('City Goblin: 2 skills');if(!o.speciesChoices?.simpleWeapon)x.push('City Goblin: Simple Weapon')}if(!b.feat)x.push('Background feat');if((b.skills||[]).filter(Boolean).length<2)x.push('Background: 2 skills');if(!b.tool)x.push('Background: tool/kit/supplies');if(!b.secondary)x.push('Background: instrument/game/vehicle');const n=b.abilityMode==='+1/+1/+1'?3:2;if(new Set((b.abilityChoices||[]).filter(Boolean)).size<n)x.push('Background ability boosts');if(b.feat==='Resilient'&&!b.resilientAbility)x.push('Resilient ability');if(b.feat==='Skilled'&&(b.skilledChoices||[]).filter(Boolean).length<3)x.push('Skilled: 3 choices');return x}

  // Derived wrappers for background mechanics. They are deliberately data-driven and additive.
  if(!D.__originWrapped){D.__originWrapped=true;
    const oldAC=D.armorClass,oldBreak=D.armorBreakdown,oldInit=D.initiative,oldSave=D.saveMod;
    D.armorClass=function(){let v=oldAC();if(backgroundFeat()==='Defence'&&D.equippedArmor()?.item)v+=1;return v};
    D.armorBreakdown=function(){const b=oldBreak();if(backgroundFeat()==='Defence'&&D.equippedArmor()?.item){b.value+=1;b.parts.push(['Defence feat','+1'])}return b};
    D.initiative=function(){return oldInit()+(backgroundFeat()==='Alert'?D.pb():0)};
    D.saveMod=function(a){const v=oldSave(a);if(v==null)return v;const r=bg().resilientAbility;return v+(backgroundFeat()==='Resilient'&&r===a&&!T.saves.includes(a)?D.pb():0)};
    if(typeof T.hpMax==='function'){const oldHpMax=T.hpMax;T.hpMax=function(l,con){return oldHpMax(l,con)+(backgroundFeat()==='Tough'?2*Math.max(1,Number(l)||1):0)}}
  }
  ensure();
  window.V7SCampaignOrigin={SKILLS,SIMPLE_WEAPONS,SPECIES,BACKGROUND,state,origin,species,bg,backgroundFeat,ensure,applySpecies,applyBackground,applyAbilityBonuses,originIncomplete};
})();
