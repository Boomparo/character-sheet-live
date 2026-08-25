(function(){
  const T=window.TreasureHunterDataV7s;if(!T)return;
  T.choiceDefinitions={
    'ancient-languages':[
      {key:'ancientLanguages',label:'Starověké jazyky',count:3,type:'select',source:'ancientLanguages',unique:true}
    ],
    'drivers-license':[
      {key:'vehicles',label:'Vehicles',count:2,type:'text',placeholder:'Vehicle proficiency'}
    ],
    'specialized-expertise':[
      {key:'expertise',label:'Expertise',count:1,type:'skill'}
    ],
    'weapon-mastery':[
      {key:'weaponMasteries',label:'Weapon Masteries',count:2,type:'weapon',unique:true}
    ]
  };
})();