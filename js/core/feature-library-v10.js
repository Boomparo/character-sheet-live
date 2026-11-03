(function () {
  'use strict';
  const E=window.CharacterEnglishRules, D=window.CharacterDerived, T=window.TreasureHunterDataV7s, O=window.OccultistDataV10;
  const label=value=>E?.text(value) ?? String(value ?? '');
  const signed=value=>Number(value)>=0?`+${value}`:String(value);
  const die=(count,source)=>`${count}${T.coolDie(D.level(source))}`;
  const parentOverrides={
    'improved-slide':'indy-slide','improved-attack-slide':'attack-slide','legendary-slide':'indy-slide',
    'improved-daring':'daring-strike','superior-daring':'daring-strike',
    'relic-connoisseur':'curiosity-collection','relic-arsenal':'curiosity-collection','master-relics':'curiosity-collection',
    'planetary-alignment':'occult-spellcasting','magical-energy':'occult-spellcasting',
    'greater-magic-resistance':'magic-resistance','energetic-parasitism':'life-transfer'
  };
  function records(source) {
    const definition=D.classDefinition(source);
    const values=(definition?.features || []).filter(feature=>source.character.classKey!=='treasureHunter'||D.featureMatchesSubclass(feature,source));
    return [...values,...(window.CharacterOrigin?.featureRecords(source)||[])];
  }
  const parentOf=record=>parentOverrides[record.id] || record.parentId || T.featureParentIds?.[record.id] || '';
  function descendants(id,source,availableOnly=false) {
    const values=records(source),byId=new Map(values.map(record=>[record.id,record]));
    return values.filter(record=>{
      if(availableOnly && source.ui.featureView!=='progression' && record.level>D.level(source))return false;
      let current=record;const seen=new Set();
      while(current&&!seen.has(current.id)) {if(current.id===id)return true;seen.add(current.id);current=byId.get(parentOf(current));}
      return false;
    }).map(record=>record.id);
  }
  const isOpen=(id,source)=>descendants(id,source,true).some(key=>source.ui.openFeatures.includes(key));
  function families(source,{progression=false,query='',filter='all'}={}) {
    const values=records(source).filter(feature=>progression||feature.level<=D.level(source));
    const byId=new Map(values.map(feature=>[feature.id,feature])),groups=new Map();
    const favorites=new Set(source.ui.favoriteFeatures || []);
    const text=String(query).trim().toLowerCase();
    for(const feature of values) {
      if(text && ![feature.name,feature.fullText,feature.summary,label(feature.name),label(feature.fullText),label(feature.summary)].join(' ').toLowerCase().includes(text))continue;
      if(filter==='subclass' && feature.kind!=='subclass')continue;
      if(filter==='favorites' && !favorites.has(feature.id))continue;
      let root=feature,seen=new Set([root.id]);
      while(!text && filter!=='favorites' && byId.has(parentOf(root)) && !seen.has(parentOf(root))) {root=byId.get(parentOf(root));seen.add(root.id);}
      if(!groups.has(root.id))groups.set(root.id,{root,members:[],favorite:false,active:false});
      const group=groups.get(root.id);group.members.push(feature);group.favorite ||= favorites.has(feature.id);
    }
    const result=[...groups.values()];
    for(const group of result) {
      group.active=group.members.some(feature=>['Action','Bonus Action','Reaction','Other','Free'].includes(feature.action)||feature.uses);
      group.members.sort((a,b)=>a.level-b.level||label(a.name).localeCompare(label(b.name)));
    }
    return result.filter(group=>filter!=='active'||group.active).filter(group=>filter!=='passive'||!group.active)
      .sort((a,b)=>Number(b.favorite)-Number(a.favorite)||a.root.level-b.root.level||label(a.root.name).localeCompare(label(b.root.name)));
  }
  function facts(record,source) {
    const level=D.level(source),int=D.mod('INT',source),dex=D.mod('DEX',source),pb=D.pb(source),speed=D.speed(source);
    const value=(label,value)=>({label,value:String(value)}),dc=(label,number)=>value(label,`DC ${number}`);
    const slide=level>=17?30:level>=7?20:15;
    const cool=Math.max(0,T.coolTotal(level)-(Number(source.classes.treasureHunter?.coolUsed)||0));
    const relicLimits=T.relicLimit(level);
    const explicit={
      'adventurer-through-and-through':[value('Languages',3),value('Vehicles',2),value('Expertise','1 skill')],
      'ancient-languages':[value('Languages',(source.classes.treasureHunter?.choices?.ancientLanguages||[]).filter(Boolean).length+'/3')],
      'specialized-expertise':[value('Expertise',source.classes.treasureHunter?.choices?.expertise?`${source.classes.treasureHunter.choices.expertise} ${signed(D.skillMod(source.classes.treasureHunter.choices.expertise,source))}`:'Choose 1 proficient skill')],
      'drivers-license':[value('Vehicles',(source.classes.treasureHunter?.choices?.vehicles||[]).filter(Boolean).length+'/2')],
      'born-stunt-performer':[value('Running jump',`${D.ability('DEX',source)} ft.`),value('Standing jump',`${Math.floor(D.ability('DEX',source)/2)} ft.`),value('High jump',`${Math.max(0,3+dex)} ft.`)],
      'cool-die':[value('Cool die',die(1,source))],
      'cool-points':[value('Cool Points',`${cool}/${T.coolTotal(level)}`),value('Recovery','Short / Long Rest')],
      'whip-master':[value('Weapon die','1d6'),value('Reach','15 ft.'),dc('Whip save',D.whipRopeDC(source))],
      'indy-maneuvers':[value('Slide',`${slide} ft.`),value('Cost','Bonus Action'),...(level>=2?[value('Precision bonus',die(1,source)),value('Line targets',Math.max(2,dex))]:[])],
      'indy-slide':[value('Movement',`${slide} ft.`),value('Frequency','1/round'),...(level>=7?[value('Normal stand',`${Math.min(10,Math.floor(speed/2))} ft.`)]:[])],
      'narrow-escape':[value('Temporary HP',`${die(level>=15?2:1,source)}${signed(level+pb)}`),value('Movement',`${level>=15?Math.floor(speed/2):5} ft.`)],
      'precision-slide':[value('Extra damage',die(1,source)),value('Attack','Advantage')],
      'line-attack':[value('Targets',Math.max(2,dex)),value('First hit','Normal weapon damage'),value('Later hits',level>=11?`Weapon die or ${die(1,source)}`:'1 weapon die')],
      'adventurers-rope':[value('Reach','15 ft.'),dc('Rope save',D.whipRopeDC(source)),value('Pull','10 ft.'),value('Tether','20 ft.')],
      'rope-snare':[dc('DEX save / escape',D.whipRopeDC(source)),value('Reach','15 ft.'),value('Tether','20 ft.')],
      'rope-takedown':[dc('STR save',D.whipRopeDC(source))],
      'quick-rope':[dc('DEX save',D.whipRopeDC(source)),value('Reach','15 ft.')],
      'snatch-item':[dc('STR save',D.whipRopeDC(source)),value('Cost','1 Cool Point')],
      'healing-amulet':[value('Healing',`${die(2,source)}${signed(int)} HP`),value('At 0 HP',`${Math.max(1,2*Number(T.coolDie(level).slice(1))+int)} HP`)],
      'blood-dagger':[value('Temporary HP',pb),value('Frequency','1/turn against a Bloodied target')],
      'master-thiefs-key':[value('Bonus roll',die(1,source)),value('Uses',`${pb} / Long Rest`)],
      'book-unwritten-paths':[value('Targets',Math.max(1,int)),dc('Unwilling target',D.relicDC(source)),value('Target range','30 ft.'),value('Destination','60 ft.')],
      'atlas-nonexistent-road':[value('Additional allies',Math.max(1,int)),value('Ally range','30 ft.'),value('Destination','100 miles')],
      'curiosity-collection':[value('Prepared limit',relicLimits[0]),value('Reserve limit',relicLimits[1]),dc('Relic save',D.relicDC(source))],
      'prepared-relics-reserve':[value('Prepared limit',relicLimits[0]),value('Reserve limit',relicLimits[1])],
      'bags-protection':[dc('WIS save',D.relicDC(source)),value('Force damage',`${level}d6+${level}`),value('Push','10 ft.')],
      'intelligent-use':[dc('Item save',D.relicDC(source)),value('Item attack',signed(int+pb))],
      'not-dead-yet':[value('HP floor','1 HP'),value('Movement','10 ft.'),value('Uses',`${Math.max(0,1-(source.classes.treasureHunter?.featureUses?.[record.id]||0))}/1 · Short / Long Rest`)],
      'extra-attack':[value('Attacks','2 / Attack action')],
      'eye-for-traps':[value('Bonus',`${signed(int)} if INT is not already included`)],
      'seasoned-traveler':[value('Climb Speed',`${speed} ft.`),value('Swim Speed',`${speed} ft.`)],
      'daring-strike':[value('Extra damage',die(level>=17?3:level>=13?2:1,source)),value('Frequency','1/turn')],
      'when-going-tough':[value('Healing',die(1,source)),value('Cool recovery',T.coolTotal(level)),value('Uses',`${Math.max(0,1-(source.classes.treasureHunter?.featureUses?.[record.id]||0))}/1 · Long Rest`)],
      'second-wind':[value('Healing',`${die(2,source)}+${level}`),value('Cost','2 Cool Points')],
      'forced-awakening':[value('Psychic cost',die(3,source)),value('Uses','1 / Long Rest')],
      'occult-spellcasting':[dc('Spell save',D.spellDC(source)),value('Spell attack',signed(D.spellAttack(source))),value('Preparation',O.progressionAt(level).prepared),value('Slots',O.progressionAt(level).slots.map((max,index)=>max?`L${index+1} ${Math.max(0,max-Number(source.classes.occultist.slotsUsed[index+1]||0))}/${max}`:'').filter(Boolean).join(' · ')),value('Recovery','Long Rest')],
      'planetary-alignment':[value('Preparation limit',O.progressionAt(level).prepared),value('Refresh','Dawn')],
      'occult-sciences':[value('Knowledge',`${O.knowledgeSpent(source.classes.occultist)}/${O.progressionAt(level).knowledge}`)],
      'magical-energy':[value('L1 cost','1d4+1 HP'),value('L2 cost','1d6+2 HP'),value('L3 cost','1d10+3 HP'),value('L4 cost','2d8+4 HP')],
      'third-eye':[value('Uses',`${Math.max(0,1-(source.classes.occultist?.resources?.thirdEye||0))}/1 · Short Rest`),value('Slot cost',0)],
      'stunning-trick':[value('Psychic damage',level>=11?'3d6+3':level>=5?'2d6+2':'1d6+1'),value('Attack',signed(D.spellAttack(source))),value('Range','30 ft.')],
      'chakra-tuning':[value('Restores','3 level-1 slots'),value('Time','30 minutes'),value('Uses','1 / day')],
      'magic-resistance':[value('INT / WIS / CHA saves',level>=10?'+1d6 against spells':'+1d4 against spells')],
      'hardy-mystic':[value('Concentration save','+1d4')],
      'magic-block':[value('MagBlock',signed(D.skillMod('MagBlock',source))),value('Range','15 ft.'),value('Duration','12 seconds / 2 rounds'),value('Check DC','DM sets DC')],
      'life-transfer':[value('Range','Touch'),value('Uses',`${Math.max(0,1-(source.classes.occultist?.resources?.lifeTransfer||0))}/1 · Short Rest`),...(level>=12?[value('Unwilling target','Up to half its maximum HP')]:[])]
    };
    if(explicit[record.id])return explicit[record.id];
    const text=label(record.fullText || record.summary || record.desc || '');
    const parts=[...new Set(text.match(/\b\d+d\d+(?:\s*[+−-]\s*\d+)?|\b\d+(?:\/\d+)?\s*ft\.?|\b\d+\s*(?:minutes?|hours?|rounds?|days?)\b|\bDC\s*\d+/gi)||[])];
    const out=parts.slice(0,4).map(part=>value('Rule',part));
    if(/Relic DC|Relic Save DC/.test(text))out.unshift(dc('Relic save',D.relicDC(source)));
    if(/Whip DC|Rope DC/.test(text))out.unshift(dc('Save',D.whipRopeDC(source)));
    if(/Cool di(?:e|ce)/.test(text)) {const count=Number(text.match(/(\d+) Cool di(?:e|ce)/)?.[1] || 1);out.unshift(value('Cool roll',die(count,source)));}
    if(record.cost)out.unshift(value('Cost',`${record.cost} Cool Point${record.cost===1?'':'s'}`));
    return out;
  }
  function spellFacts(spell,source) {
    const out=[],attack=String(spell.attack || '');
    if(spell.id==='true-strike') {
      const weapons=D.weaponAttacks(source);
      for(const weapon of weapons)out.push({label:`${weapon.name} attack`,value:signed(weapon.hit-D.mod(weapon.ability,source)+D.mod('INT',source))});
      if(!weapons.length)out.push({label:'Weapon',value:'Equip a proficient weapon'});
    } else if(/spell attack/i.test(attack))out.push({label:'Attack',value:signed(D.spellAttack(source))});
    else if(/save|STR\/DEX/i.test(attack))out.push({label:'Save',value:`DC ${D.spellDC(source)} · ${attack}`});
    if(spell.range)out.push({label:'Range',value:label(spell.range)});
    const dice={ 'stunning-trick':D.level(source)>=11?'3d6+3':D.level(source)>=5?'2d6+2':'1d6+1',
      'vicious-horoscope':`${D.level(source)>=17?4:D.level(source)>=11?3:D.level(source)>=5?2:1}d6`,
      'fire-bolt':`${D.level(source)>=17?4:D.level(source)>=11?3:D.level(source)>=5?2:1}d10`,
      'chill-touch':`${D.level(source)>=17?4:D.level(source)>=11?3:D.level(source)>=5?2:1}d10`,
      'word-radiance':`${D.level(source)>=17?4:D.level(source)>=11?3:D.level(source)>=5?2:1}d6`,
      'cure-wounds':`2d8${signed(D.mod('INT',source))}`,
      'false-life':'2d4+4','inflict-wounds':'2d10','karmicky-utok':'2d10','kaboom':'2d8','thunderwave':'2d8','dissonant':'3d6' };
    if(dice[spell.id]) {
      const types={'fire-bolt':'Fire','chill-touch':'Necrotic','word-radiance':'Radiant','stunning-trick':'Psychic','vicious-horoscope':'Psychic','inflict-wounds':'Necrotic','karmicky-utok':'Psychic','kaboom':'Thunder','thunderwave':'Thunder','dissonant':'Psychic'};
      out.push({label:spell.id==='cure-wounds'?'Healing':spell.id==='false-life'?'Temporary HP':'Damage',value:[dice[spell.id],types[spell.id]].filter(Boolean).join(' ')});
    }
    return out;
  }
  function annotate(text,source) {
    let value=String(text);
    value=value.replace(/\byour Proficiency Bonus\b(?! \()/g,`your Proficiency Bonus (${signed(D.pb(source))})`);
    value=value.replace(/\byour (Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) modifier\b(?! \()/g,(match,name)=>`${match} (${signed(D.mod({Strength:'STR',Dexterity:'DEX',Constitution:'CON',Intelligence:'INT',Wisdom:'WIS',Charisma:'CHA'}[name],source))})`);
    if(source.character.classKey==='treasureHunter')value=value.replace(/\byour Treasure Hunter level\b(?! \()/g,`your Treasure Hunter level (${D.level(source)})`);
    if(source.character.classKey==='occultist')value=value.replace(/\byour spellcasting (?:ability )?modifier\b(?! \()/g,match=>`${match} (${signed(D.mod('INT',source))})`);
    return value;
  }
  window.CharacterFeatureLibrary={records,parentOf,descendants,isOpen,families,facts,spellFacts,annotate};
})();
