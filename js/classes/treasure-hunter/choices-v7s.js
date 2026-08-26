(function(){
  const T=window.TreasureHunterDataV7s;if(!T)return;
  T.classSkills=['Acrobatics','Arcana','Athletics','Deception','History','Insight','Investigation','Nature','Perception','Persuasion','Religion','Sleight of Hand','Stealth','Survival'];
  T.subclasses=['Occult Collector'];
  T.choiceDefinitions={
    'ancient-languages':[{key:'ancientLanguages',label:'Starověké jazyky',count:3,type:'select',source:'ancientLanguages',unique:true}],
    'drivers-license':[{key:'vehicles',label:'Vehicles',count:2,type:'text',placeholder:'Vehicle proficiency'}],
    'specialized-expertise':[{key:'expertise',label:'Expertise',count:1,type:'skill'}],
    'weapon-mastery':[{key:'weaponMasteries',label:'Weapon Masteries',count:2,type:'weapon',unique:true}],
    'treasure-hunter-subclass':[{key:'subclass',label:'Treasure Hunter Subclass',count:1,type:'select',source:'subclasses'}],
    'asi-4':[{key:'feat4',label:'Level 4 Feat',count:1,type:'text',placeholder:'Choose a feat or Ability Score Improvement'}],
    'asi-8':[{key:'feat8',label:'Level 8 Feat',count:1,type:'text',placeholder:'Choose a feat or Ability Score Improvement'}],
    'asi-12':[{key:'feat12',label:'Level 12 Feat',count:1,type:'text',placeholder:'Choose a feat or Ability Score Improvement'}],
    'asi-16':[{key:'feat16',label:'Level 16 Feat',count:1,type:'text',placeholder:'Choose a feat or Ability Score Improvement'}],
    'epic-boon':[{key:'epicBoon19',label:'Level 19 Epic Boon / Feat',count:1,type:'text',placeholder:'Choose an Epic Boon or another qualifying feat'}]
  };
})();
