(function () {
  'use strict';
  const Registry = window.CharacterClassRegistry;
  if (!Registry) return;

  const PROGRESSION = {
    1:{knowledge:2,prepared:3,slots:[2,0,0]},2:{knowledge:4,prepared:4,slots:[2,0,0]},
    3:{knowledge:7,prepared:5,slots:[3,0,0]},4:{knowledge:10,prepared:6,slots:[3,0,0]},
    5:{knowledge:13,prepared:7,slots:[3,1,0]},6:{knowledge:16,prepared:8,slots:[4,1,0]},
    7:{knowledge:19,prepared:9,slots:[4,2,0]},8:{knowledge:22,prepared:10,slots:[4,3,0]},
    9:{knowledge:25,prepared:11,slots:[4,3,1]},10:{knowledge:28,prepared:12,slots:[4,3,1]},
    11:{knowledge:31,prepared:13,slots:[4,3,2]},12:{knowledge:34,prepared:14,slots:[4,3,2]}
  };
  const SCIENCE_LEVELS = [
    { level: 1, requiredLevel: 1, cost: 1 }, { level: 2, requiredLevel: 3, cost: 2 },
    { level: 3, requiredLevel: 5, cost: 4 }, { level: 4, requiredLevel: 8, cost: 6 },
    { level: 5, requiredLevel: 10, cost: 8 }
  ];
  const SCIENCES = {
    spiritismus:{name:'Spiritismus',symbol:'☾',focus:'Spiritistická tabulka, černá svíce nebo kyvadlo',levels:[
      {title:'Základy spiritismu',items:[['Cantrip','Chill Touch nebo Spare the Dying.'],['False Life','Zachycení zbytkové životní energie.'],['Kontakt se záhrobím','Seance, jejíž sílu určuje hod d12.']]},
      {title:'Vymítání',items:[['Inflict Wounds','Vymítáš duše z živých těl.']]},
      {title:'Vyvolávání a poutání',items:[['Vyvolání ducha','Vyvoláš konkrétního zemřelého a položíš až tři otázky.'],['Polapení duše','Reakce při smrti humanoida do 15 ft. Můžeš poutat nejvýše dvě duše.']]},
      {title:'Moudrost předků',items:[['Moudrost předků','Na hodinu posílí zvolenou ability a poskytne dočasnou proficiency.'],['Volitelný Necromancy spell','Jeden spell 1st nebo 2nd levelu.']]},
      {title:'Eterální mistrovství',items:[['Volitelný Necromancy spell','Jeden spell 1st až 3rd levelu.'],['Vstoupení do éterální pláně','Bonusovou akcí přecházíš mezi materiální a éterální plání za cenu HP.']]}
    ]},
    astrologie:{name:'Astrologie',symbol:'♄',focus:'Astrologická mapa nebo zápisník výpočtů',levels:[
      {title:'Základy astrologie',items:[['Cantrip','True Strike nebo Vicious Horoscope.'],['Palm Reading','Čtení minulosti, přítomnosti nebo budoucnosti z ruky.'],['Předurčení','Uložíš hod d20 a později jím nahradíš viděný d20 hod.']]},
      {title:'Poznej osobnost',items:[['Poznej osobnost','Zjistíš znamení, povahu a při upcastu také cíle nebo tajemství.']]},
      {title:'Čtení planet',items:[['Čtení z planet','Hod d10 uloží jeden planetární efekt.'],['Ochrana čtyř elementů','Jednou denně přidělíš resistenci podle astrologického živlu.']]},
      {title:'Zvířetník',items:[['Zvířetník','Buff nebo debuff podle znamení až dvou bytostí.'],['Volitelný Divination spell','Jeden spell 1st nebo 2nd levelu.']]},
      {title:'Moudrost vesmíru',items:[['Volitelný Divination spell','Jeden spell 1st až 3rd levelu.'],['Moudrost vesmíru','Expertise v Insight a jednou za Long Rest Truesight 30 ft. na hodinu.']]}
    ]},
    kabala:{name:'Kabala',symbol:'✡',focus:'Kabalistická příručka nebo sada šémů',levels:[
      {title:'Základy kabaly',items:[['Cantrip','Guidance nebo Word of Radiance.'],['Cure Wounds','Léčení skrze kabalistickou mantru.'],['Thunderwave','Kabalistická evokace.']]},
      {title:'Slovo a mysl',items:[['Dissonant Whispers','Psychic damage a vynucený bezpečný ústup.']]},
      {title:'Obřady a ochrana',items:[['Ceremony','Atonement, Bless Water, Coming of Age, Dedication, Funeral Rite nebo Wedding.'],['Ochranný kruh','Desetiminutový kruh proti dvěma typům bytostí.']]},
      {title:'Boží a andělská moc',items:[['Ruka boží','Zářivý melee unarmed attack.'],['Andělská jména','Vyvoláš manifestaci jednoho z archandělů.']]},
      {title:'Golem',items:[['Volitelný Conjuration spell','Jeden spell 1st až 3rd levelu.'],['Golem','Vytvoříš hliněného golema a získáš Oživení golema.']]}
    ]},
    esoterika:{name:'Esoterika',symbol:'◇',focus:'Sada krystalů, kadidlo nebo vonné tyčinky',levels:[
      {title:'Základy esoteriky',items:[['Cantrip','Blade Ward nebo Telekinesis, mechanicky Mage Hand.'],['Mage Armor','Esoterický focus nahrazuje materiální komponentu.'],['Protection from Evil and Good','Ochranná práce s energií.']]},
      {title:'Karma',items:[['Karmický útok','Reakce na bytost, která způsobila damage.']]},
      {title:'Čakry a aura',items:[['Očista aury','Odstraní vybraný psychický nebo magický condition.'],['Mistr čaker','Jednou za Long Rest provedeš očistnou meditaci.']]},
      {title:'Amulety',items:[['Amulet','Vytvoříš ochranný nebo temný amulet.'],['Volitelný Abjuration spell','Jeden spell 1st nebo 2nd levelu.']]},
      {title:'Prokletá panenka',items:[['Volitelný Abjuration spell','Jeden spell 1st až 3rd levelu.'],['Prokletá panenka','Tři použití za Long Rest pro damage, deformaci nebo léčení.']]}
    ]},
    alchymie:{name:'Alchymie',symbol:'⚗',focus:"Alchemist's Supplies",levels:[
      {title:'Základy alchymie',items:[['Cantrip','Dancing Lights bez koncentrace nebo Fire Bolt.'],['Absorb Elements','Alchymická reakce na element.'],['Purify Food and Drink','Očistí jídlo a pití.']]},
      {title:'Kaboom',items:[['Kaboom','Očaruješ drobný předmět a necháš ho explodovat.']]},
      {title:'Experimentace',items:[['Alter Self','Lze seslat i na willing cíl s rizikem selhání.'],['Experiment pro každý den','Jednou denně vytvoříš náhodný alchymický efekt.']]},
      {title:'Přeměna kovů',items:[['Přeměna kovů','Jednou za Short Rest přeměníš kov podle hodu d6.'],['Volitelný Transmutation spell','Jeden spell 1st nebo 2nd levelu.']]},
      {title:'Změna vlastní podstaty',items:[['Volitelný Transmutation spell','Jeden spell 1st až 3rd levelu.'],['Změna vlastní podstaty','Jednou za Short Rest zvolíš lehkou, těžkou nebo měkkou podobu.']]}
    ]}
  };

  const feature = (id, level, name, text, action = 'Passive', extra = {}) => ({ id, level, name, summary: text, fullText: text, action, kind: 'class', ...extra });
  const FEATURES = [
    feature('occult-spellcasting',1,'Spellcasting','INT je spellcasting ability. Umíš provádět rituály. Spell Save DC = 8 + INT modifier + Proficiency Bonus a Spell Attack = INT modifier + Proficiency Bonus. Sloty se obnovují po Long Restu.'),
    feature('planetary-alignment',1,'Postavení planet','Za rozbřesku připravíš leveled spelly, které znáš, do denního limitu. Příprava není vázaná na Long Rest.','Other'),
    feature('occult-sciences',1,'Okultní vědy','Body poznání utrácíš za postupné úrovně Spiritismu, Astrologie, Kabaly, Esoteriky a Alchymie. Neutracené body se přenášejí.'),
    feature('magical-energy',1,'Posilování magické energie','Bonusovou akcí za vlastní HP obnovíš spell slot nebo zaplatíš upcast. 1st: 1d4+1 HP, 2nd: 1d6+2 HP, 3rd: 1d10+3 HP, 4th: 2d8+4 HP. Temp HP nelze použít.','Bonus Action'),
    feature('mysticism-student',2,'Student mystiky','Naučíš se hebrejštinu, egyptštinu, sanskrt nebo enochiánštinu. Získáš proficiency v Arcana, History, Insight, Medicine nebo Religion; pokud ji už máš, získáš expertise.'),
    feature('third-eye',2,'Třetí oko','Jednou za Short Rest bez slotu sešleš Detect Evil and Good nebo Detect Aura.','Action',{uses:1,recovery:'SR'}),
    feature('stunning-trick',2,'Omračující trik','Ranged spell attack 30 ft. Při zásahu 1d6+1 Psychic. Pokud by cíl klesl na 0 HP, vrátí se na 1 HP, je Stable a Unconscious. Na 5. levelu 2d6+2, na 11. levelu 3d6+3.','Action'),
    feature('chakra-tuning',3,'Ladění čaker','Jednou denně po 30 minutách soustředění obnovíš tři vyčerpané 1st-level spell sloty. Může proběhnout během Short Restu.','Other',{uses:1,recovery:'LR'}),
    feature('magic-resistance',3,'Odolnost proti magii','Když jsi vystaven kouzlu a házíš INT, WIS nebo CHA saving throw, přičti 1d4.'),
    feature('occult-asi-4',4,'Ability Score Improvement / Feat','Zvyš ability scores nebo zvol feat podle pravidel kampaně.'),
    feature('battle-mystic',5,'Mystik od rány','V rámci jedné Action můžeš seslat cantrip a zaútočit Simple Weapon.','Action'),
    feature('hardy-mystic',5,'Mystik s tuhým kořínkem','Ke CON saving throwu na udržení koncentrace přičítáš 1d4.'),
    feature('magic-block',6,'Blokování magie','Získáš INT skill MagBlock s proficiency. Jednou za hodinu můžeš Action potlačit magický efekt do 15 ft. na dvě kola. Bonusovou akcí můžeš k checku přidat 1d4; nelze kombinovat s Guidance.','Action',{uses:1,recovery:'HOUR'}),
    feature('sweet-oblivion',7,'Sladké zapomnění','Můžeš zapomenout nejvyšší úrovně okultních znalostí v hodnotě až tří bodů a body investovat jinam.'),
    feature('occult-asi-8',8,'Ability Score Improvement / Feat','Zvyš ability scores nebo zvol feat podle pravidel kampaně.'),
    feature('life-transfer',9,'Přelévání života','Dotykem věnuješ vlastní HP nebo přijmeš HP od willing bytosti. Temp HP se nepoužívají a nelze překročit maximum.','Action',{uses:1,recovery:'SR'}),
    feature('greater-magic-resistance',10,'Vyšší odolnost proti magii','Bonus k INT, WIS a CHA saving throwům proti kouzlům se zvyšuje na 1d6.'),
    feature('energetic-parasitism',12,'Energický parazitismus','Přeléváním života můžeš brát HP i unwilling bytosti, maximálně polovinu jejích maximálních HP.','Action')
  ];

  const spell = (id,name,level,science,time,range,school,extra={}) => ({id,name,level,science,time,range,school,components:'',duration:'',attack:'',source:'Homebrew Occultist',desc:'',...extra});
  const SPELLS = [
    spell('stunning-trick','Omračující trik',0,'Class','Action','30 ft.','Necromancy',{requiredLevel:2,components:'V, S',attack:'Ranged spell attack',desc:'Zásah způsobí 1d6+1 Psychic. Cíl sražený na 0 HP se vrátí na 1 HP, je Stable a Unconscious.',upcast:'Character lvl 5: 2d6+2; lvl 11: 3d6+3.'}),
    spell('detect-good-evil','Detect Evil and Good',1,'Class','Action','Self','Divination',{requiredLevel:2,components:'V, S',duration:'Concentration, up to 10 min.',attack:'Detection',source:'2024 Free Rules'}),
    spell('detect-aura','Detect Aura',1,'Class','Action','Self (30 ft.)','Divination',{requiredLevel:2,components:'S',duration:'5 min.',attack:'Detection',desc:'Vycítíš magické nebo prokleté jevy a inteligentní bytosti do 30 ft. Magic Action podrobněji zkoumá jejich auru.'}),
    spell('chill-touch','Chill Touch',0,'Spiritismus','Action','Touch','Necromancy',{scienceKey:'spiritismus',scienceLevel:1,components:'V, S',attack:'Melee spell attack',source:'2024 Free Rules',desc:'Zásah způsobí 1d10 Necrotic a blokuje healing do konce tvého příštího tahu.'}),
    spell('spare-dying','Spare the Dying',0,'Spiritismus','Action','15 ft.','Necromancy',{scienceKey:'spiritismus',scienceLevel:1,components:'V, S',source:'2024 Free Rules',desc:'Bytost na 0 HP se stane Stable.'}),
    spell('false-life','False Life',1,'Spiritismus','Action','Self','Necromancy',{scienceKey:'spiritismus',scienceLevel:1,components:'V, S, M',source:'2024 Free Rules',desc:'Získáš 2d4+4 Temporary HP.'}),
    spell('kontakt','Kontakt se záhrobím',1,'Spiritismus','5 min. / Ritual 30 min.','5 ft.','Necromancy',{scienceKey:'spiritismus',scienceLevel:1,components:'V, S, M (spiritistický focus)',duration:'2 min.',attack:'1d12 contact roll',desc:'Seance. Hod d12 určuje sílu kontaktu; opakování do 24 hodin zmenšuje kostku.'}),
    spell('inflict-wounds','Inflict Wounds',1,'Spiritismus','Action','Touch','Necromancy',{scienceKey:'spiritismus',scienceLevel:2,components:'V, S',attack:'CON save',source:'2024 Free Rules',desc:'Neúspěch 2d10 Necrotic, úspěch polovina.'}),
    spell('vyvolani-ducha','Vyvolání ducha',2,'Spiritismus','Action / Ritual','5 ft.','Necromancy',{scienceKey:'spiritismus',scienceLevel:3,components:'V, S, M (spiritistický focus)',duration:'3 min.',attack:'Special',desc:'Vyvoláš konkrétního zemřelého a položíš až tři otázky. Šance závisí na ostatcích.'}),
    spell('moudrost-predku','Moudrost předků',2,'Spiritismus','Action','Self','Necromancy',{scienceKey:'spiritismus',scienceLevel:4,duration:'1 hour',attack:'Buff'}),
    spell('true-strike','True Strike',0,'Astrologie','Action','Self','Divination',{scienceKey:'astrologie',scienceLevel:1,source:'2024 Free Rules'}),
    spell('vicious-horoscope','Vicious Horoscope',0,'Astrologie','Action','60 ft.','Enchantment',{scienceKey:'astrologie',scienceLevel:1,components:'V',attack:'WIS save',source:'2024 Vicious Mockery + HB reskin',desc:'Neúspěch: 1d6 Psychic a Disadvantage na příští attack roll.',upcast:'Lvl 5: 2d6; lvl 11: 3d6; lvl 17: 4d6.'}),
    spell('palm-reading','Palm Reading',1,'Astrologie','Special','Touch','Divination',{scienceKey:'astrologie',scienceLevel:1,attack:'STR/DEX/CHA',desc:'Z ruky zjistíš jednu skutečnost o minulosti, přítomnosti nebo budoucnosti cíle.'}),
    spell('predurceni','Předurčení',1,'Astrologie','Action','Sight','Divination',{scienceKey:'astrologie',scienceLevel:1,duration:'Do spánku',attack:'Stored d20',desc:'Uložíš hod d20 a později jím nahradíš viděný d20 hod před oznámením úspěchu.'}),
    spell('poznej-osobnost','Poznej osobnost',1,'Astrologie','Action','20 ft.','Divination',{scienceKey:'astrologie',scienceLevel:2}),
    spell('cteni-planet','Čtení z planet',2,'Astrologie','Action','30 ft.','Divination',{scienceKey:'astrologie',scienceLevel:3,attack:'d10 table',desc:'Uložíš jeden z deseti planetárních efektů.'}),
    spell('zviretnik','Zvířetník',2,'Astrologie','Action','15 ft.','Transmutation',{scienceKey:'astrologie',scienceLevel:4}),
    spell('guidance','Guidance',0,'Kabala','Action','Touch','Divination',{scienceKey:'kabala',scienceLevel:1,source:'2024 Free Rules'}),
    spell('word-radiance','Word of Radiance',0,'Kabala','Action','Self','Evocation',{scienceKey:'kabala',scienceLevel:1,attack:'CON save',source:'2024 Rules'}),
    spell('cure-wounds','Cure Wounds',1,'Kabala','Action','Touch','Abjuration',{scienceKey:'kabala',scienceLevel:1,source:'2024 Free Rules',desc:'Cíl obnoví 2d8 + spellcasting modifier HP.'}),
    spell('thunderwave','Thunderwave',1,'Kabala','Action','Self','Evocation',{scienceKey:'kabala',scienceLevel:1,attack:'CON save',source:'2024 Free Rules',desc:'15-ft Cube, 2d8 Thunder a push 10 ft. při neúspěchu.'}),
    spell('dissonant','Dissonant Whispers',1,'Kabala','Action','60 ft.','Enchantment',{scienceKey:'kabala',scienceLevel:2,attack:'WIS save',desc:'3d6 Psychic a při neúspěchu Reaction k bezpečnému ústupu.'}),
    spell('ceremony','Ceremony',1,'Kabala','30 min. / Ritual','10 ft.','Abjuration',{scienceKey:'kabala',scienceLevel:3}),
    spell('ruka-bozi','Ruka boží',2,'Kabala','Bonus Action','Touch','Evocation',{scienceKey:'kabala',scienceLevel:4,attack:'Melee unarmed attack',desc:'Po dobu koncentrace může Action způsobit 2d8 + INT Radiant.'}),
    spell('andelska-jmena','Andělská jména',2,'Kabala','Bonus Action','30 ft.','Conjuration',{scienceKey:'kabala',scienceLevel:4,attack:'d10 archangel table'}),
    spell('oziveni-golema','Oživení golema',3,'Kabala','10 min.','5 ft.','Transmutation',{scienceKey:'kabala',scienceLevel:5,duration:'Until dispelled',attack:'Golem'}),
    spell('blade-ward','Blade Ward',0,'Esoterika','Action','Self','Abjuration',{scienceKey:'esoterika',scienceLevel:1,components:'V, S',duration:'Concentration, up to 1 min.',attack:'Defense',source:'2024 Rules',desc:'Útočník odečítá d4 od attack rollů proti tobě.'}),
    spell('telekinesis','Telekinesis (Mage Hand)',0,'Esoterika','Action','30 ft.','Conjuration',{scienceKey:'esoterika',scienceLevel:1,source:'2024 Mage Hand + HB'}),
    spell('mage-armor','Mage Armor',1,'Esoterika','Action','Touch','Abjuration',{scienceKey:'esoterika',scienceLevel:1,duration:'8 h',attack:'Defense',source:'2024 Free Rules + HB material',desc:'Neozbrojený willing cíl získá base AC 13 + DEX.'}),
    spell('protection-eg','Protection from Evil and Good',1,'Esoterika','Action','Touch','Abjuration',{scienceKey:'esoterika',scienceLevel:1,duration:'Concentration, up to 10 min.',attack:'Defense',source:'2024 Free Rules'}),
    spell('karmicky-utok','Karmický útok',1,'Esoterika','Reaction','60 ft.','Divination',{scienceKey:'esoterika',scienceLevel:2,attack:'WIS save',desc:'Reakce na způsobení damage. Neúspěch 2d10 Psychic, úspěch polovina.'}),
    spell('ocista-aury','Očista aury',2,'Esoterika','Action','15 ft.','Abjuration',{scienceKey:'esoterika',scienceLevel:3}),
    spell('amulet','Amulet',2,'Esoterika','Action / Ritual','Touch','Abjuration',{scienceKey:'esoterika',scienceLevel:4,duration:'Until dispelled',attack:'Buff / debuff'}),
    spell('dancing-lights','Dancing Lights',0,'Alchymie','Action','120 ft.','Illusion',{scienceKey:'alchymie',scienceLevel:1,duration:'1 min. without Concentration',source:'2024 + HB'}),
    spell('fire-bolt','Fire Bolt',0,'Alchymie','Action','120 ft.','Evocation',{scienceKey:'alchymie',scienceLevel:1,attack:'Ranged spell attack',source:'2024 Free Rules',desc:'Zásah 1d10 Fire.'}),
    spell('absorb-elements','Absorb Elements',1,'Alchymie','Reaction','Self','Abjuration',{scienceKey:'alchymie',scienceLevel:1,duration:'1 round'}),
    spell('purify','Purify Food and Drink',1,'Alchymie','Action / Ritual','Touch','Transmutation',{scienceKey:'alchymie',scienceLevel:1}),
    spell('kaboom','Kaboom',1,'Alchymie','Action','60 ft.','Transmutation',{scienceKey:'alchymie',scienceLevel:2,attack:'DEX save',desc:'Očarovaný drobný předmět exploduje za 2d8 Thunder v okruhu 5 ft.'}),
    spell('alter-self','Alter Self',2,'Alchymie','Action','Self / Touch','Transmutation',{scienceKey:'alchymie',scienceLevel:3}),
    spell('premena-kovu','Přeměna kovů',2,'Alchymie','Action','Touch','Transmutation',{scienceKey:'alchymie',scienceLevel:4,attack:'d6 result'})
  ];

  const RESOURCES = [
    {id:'thirdEye',name:'Třetí oko',level:2,max:1,recovery:'SR'}, {id:'chakra',name:'Ladění čaker',level:3,max:1,recovery:'LR'},
    {id:'magBlock',name:'Blokování magie',level:6,max:1,recovery:'HOUR'}, {id:'lifeTransfer',name:'Přelévání života',level:9,max:1,recovery:'SR'},
    {id:'soulBind',name:'Polapení duše',science:'spiritismus',scienceLevel:3,max:2,recovery:'NONE'},
    {id:'fourElements',name:'Ochrana čtyř elementů',science:'astrologie',scienceLevel:3,max:1,recovery:'LR'},
    {id:'universe',name:'Moudrost vesmíru',science:'astrologie',scienceLevel:5,max:1,recovery:'LR'},
    {id:'chakraMaster',name:'Mistr čaker',science:'esoterika',scienceLevel:3,max:1,recovery:'LR'},
    {id:'doll',name:'Prokletá panenka',science:'esoterika',scienceLevel:5,max:3,recovery:'LR'},
    {id:'experiment',name:'Experiment pro každý den',science:'alchymie',scienceLevel:3,max:1,recovery:'LR'},
    {id:'metals',name:'Přeměna kovů',science:'alchymie',scienceLevel:4,max:1,recovery:'SR'},
    {id:'essence',name:'Změna vlastní podstaty',science:'alchymie',scienceLevel:5,max:1,recovery:'SR'}
  ];
  const SCIENCE_CHOICES = {
    spiritismus:[{key:'spiritismusCantrip',level:1,label:'Cantrip',options:['chill-touch','spare-dying']}],
    astrologie:[{key:'astrologieCantrip',level:1,label:'Cantrip',options:['true-strike','vicious-horoscope']}],
    kabala:[{key:'kabalaCantrip',level:1,label:'Cantrip',options:['guidance','word-radiance']}],
    esoterika:[{key:'esoterikaCantrip',level:1,label:'Cantrip',options:['blade-ward','telekinesis']}],
    alchymie:[{key:'alchymieCantrip',level:1,label:'Cantrip',options:['dancing-lights','fire-bolt']}]
  };
  const ACTIONS = [
    {id:'occult-energy',name:'Posilování magické energie',action:'Bonus Action',level:1,summary:'Obnov spell slot nebo zaplať upcast vlastními HP.'},
    {id:'occult-dawn',name:'Postavení planet',action:'Other',level:1,summary:'Za rozbřesku připrav leveled spelly do denního limitu.'},
    {id:'occult-third-eye',name:'Třetí oko',action:'Action',level:2,summary:'Detect Evil and Good nebo Detect Aura bez slotu.',resourceId:'thirdEye'},
    {id:'occult-chakra',name:'Ladění čaker',action:'Other',level:3,summary:'30 minut, obnov tři 1st-level sloty.',resourceId:'chakra'},
    {id:'occult-battle-mystic',name:'Mystik od rány',action:'Action',level:5,summary:'Sesílíš cantrip a zaútočíš Simple Weapon.'},
    {id:'occult-magic-block',name:'Blokování magie',action:'Action',level:6,summary:'MagBlock check potlačí magický efekt na dvě kola.',resourceId:'magBlock'},
    {id:'occult-life-transfer',name:'Přelévání života',action:'Action',level:9,summary:'Dotykem předej nebo přijmi HP.',resourceId:'lifeTransfer'}
  ];

  const costToLevel = level => SCIENCE_LEVELS.slice(0, Math.max(0, Number(level) || 0)).reduce((sum, entry) => sum + entry.cost, 0);
  const knowledgeSpent = classState => Object.keys(SCIENCES).reduce((sum, key) => sum + costToLevel(classState?.sciences?.[key]), 0);
  const progressionAt = level => PROGRESSION[Math.max(1, Math.min(12, Number(level) || 1))];
  const resourceUnlocked = (definition, classState, level) => level >= (definition.level || 1) && (!definition.science || Number(classState.sciences?.[definition.science]) >= definition.scienceLevel);

  function createState() {
    return {
      sciences:{spiritismus:0,astrologie:0,kabala:0,esoterika:0,alchymie:0}, slotsUsed:{1:0,2:0,3:0}, spells:[], resources:{},
      choices:{classSkills:[],mysticLanguage:'',mysticSkill:'',scienceChoices:{}}, ritualNotes:'', lastDawn:''
    };
  }
  function normalizeState(value = {}) {
    const base = createState();
    value.sciences = {...base.sciences,...(value.sciences || {})};
    for (const key of Object.keys(value.sciences)) value.sciences[key] = Math.max(0, Math.min(5, Number(value.sciences[key]) || 0));
    value.slotsUsed = {...base.slotsUsed,...(value.slotsUsed || {})};
    value.spells = Array.isArray(value.spells) ? value.spells : [];
    value.resources = {...base.resources,...(value.resources || {})};
    value.choices = {...base.choices,...(value.choices || {}),scienceChoices:{...base.choices.scienceChoices,...(value.choices?.scienceChoices || {})}};
    value.choices.classSkills = Array.isArray(value.choices.classSkills) ? value.choices.classSkills.filter(Boolean) : [];
    value.ritualNotes = String(value.ritualNotes || '');
    value.lastDawn = String(value.lastDawn || '');
    return value;
  }
  function choiceRequirements(source) {
    const classState = source.classes?.occultist || createState(), level = Number(source.character?.level) || 1, missing = [];
    if (classState.choices.classSkills.length !== 3) missing.push('Occultist: 3 class skills');
    if (level >= 2 && !classState.choices.mysticLanguage) missing.push('Student mystiky: language');
    if (level >= 2 && !classState.choices.mysticSkill) missing.push('Student mystiky: skill');
    const progress = progressionAt(level);
    if (knowledgeSpent(classState) > progress.knowledge) missing.push('Occult Sciences: knowledge points exceeded');
    for (const [scienceKey, definitions] of Object.entries(SCIENCE_CHOICES)) {
      for (const definition of definitions) if (Number(classState.sciences[scienceKey]) >= definition.level && !classState.choices.scienceChoices[definition.key]) missing.push(`${SCIENCES[scienceKey].name}: ${definition.label}`);
    }
    return missing;
  }

  const definition = Registry.register({
    id:'occultist',name:'Occultist',shortName:'Occultist',sigil:'☿',accent:'#6f4b87',motto:'Scientia arcana, non superstitio.',
    maxLevel:12,hitDie:'d10',hitDieAverage:6,primaryAbilities:['CON','INT'],saves:['INT','WIS'],
    skills:['Acrobatics','Arcana','Deception','History','Insight','Investigation','Medicine','Nature','Perception','Religion'],skillChoiceCount:3,
    armor:['Light Armor'],weapons:['Simple Weapons'],tools:[],systems:['spellcasting','sciences'],features:FEATURES,actions:ACTIONS,
    progression:PROGRESSION,pages:{classSystem:{id:'relicsPage',title:'SCIENCES'}},createState,normalizeState,choiceRequirements,
    hpMax(level,constitutionModifier){return Math.max(1,10+Number(constitutionModifier||0)+(Math.max(1,Number(level)||1)-1)*(6+Number(constitutionModifier||0)));},
    scienceLevels:SCIENCE_LEVELS,sciences:SCIENCES,spells:SPELLS,resources:RESOURCES,scienceChoices:SCIENCE_CHOICES,
    progressionAt,costToLevel,knowledgeSpent,resourceUnlocked
  });
  window.OccultistDataV10 = definition;
})();
