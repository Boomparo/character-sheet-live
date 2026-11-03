const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
function runtime(){
  const memory=new Map(),context=vm.createContext({console,TextDecoder,crypto:require('node:crypto').webcrypto,setTimeout:()=>1,clearTimeout:()=>{},localStorage:{getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,String(value))}});
  context.window=context;
  for(const match of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^"?]+)/g)){
    if(match[1].startsWith('js/ui/'))break;
    vm.runInContext(fs.readFileSync(path.join(root,match[1]),'utf8'),context,{filename:match[1]});
  }
  return context;
}
const facts=(F,id,state)=>Object.fromEntries(F.facts({id},state).map(f=>[f.label,f.value]));
const plain=value=>JSON.parse(JSON.stringify(value));
function hunter(c,level){const s=c.CharacterState.fresh();s.character.level=level;s.character.abilities.DEX=16;s.character.abilities.INT=14;s.classes.treasureHunter.choices.subclass='Occult Collector';s.classes.treasureHunter.choices.subclassConfirmed=true;return c.CharacterState.normalize(s,{skipAbilityMigration:true});}

test('Every authored class feature and relic has an English presentation without mutating source records',()=>{
  const c=runtime(),E=c.CharacterEnglishRules;
  for(const record of [...c.TreasureHunterDataV7s.features,...c.TreasureHunterRelicsV7s,...c.OccultistDataV10.features]){
    assert.doesNotMatch(E.text(record.name),/[ěščřžýáíéůúďťň]/i,record.id+' name');
    assert.doesNotMatch(E.text(record.fullText),/[ěščřžýáíéůúďťň]/i,record.id+' rules');
    assert.ok(E.text(record.fullText).length>20,record.id+' has rules');
  }
  assert.equal(c.TreasureHunterDataV7s.features.find(f=>f.id==='indy-slide').name,'Indyho skluz');
  assert.match(c.TreasureHunterDataV7s.features.find(f=>f.id==='indy-slide').fullText,/Nevýhodu/);
  assert.equal(E.text('Indyho skluz'),"Indy's Slide");
});

test('English rules preserve important restrictions and detailed result tables',()=>{
  const c=runtime(),E=c.CharacterEnglishRules;
  const byId=id=>E.text(c.TreasureHunterDataV7s.features.find(f=>f.id===id).fullText);
  assert.match(byId('line-attack'),/minimum (?:two|2)/);assert.match(byId('line-attack'),/on-hit effects/);
  assert.match(byId('rope-snare'),/20 ft/);assert.match(byId('quick-rope'),/Disengage/);
  const spirit=E.spell(c.OccultistDataV10.spells.find(s=>s.id==='vyvolani-ducha')).fullText;
  for(const chance of ['90%','75%','60%','40%','20%','10%'])assert.ok(spirit.includes(chance));
  const planets=E.spell(c.OccultistDataV10.spells.find(s=>s.id==='cteni-planet')).fullText;
  assert.match(planets,/10 Comet/);assert.match(planets,/DC 15/);
  assert.match(E.text(c.TreasureHunterRelicsV7s.find(r=>r.id==='coffer-final-judgment').fullText),/10d8 Radiant/);
});

test('Feature families contain each available rule once and exclude future or unselected subclass rules',()=>{
  const c=runtime(),F=c.CharacterFeatureLibrary,s=hunter(c,8),groups=F.families(s);
  const expected=F.records(s).filter(f=>f.level<=8).map(f=>f.id).sort(),actual=groups.flatMap(g=>g.members.map(f=>f.id)).sort();
  assert.deepEqual(plain(actual),plain(expected));assert.equal(new Set(actual).size,actual.length);
  assert.ok(groups.length<expected.length/2);
  const slide=groups.find(g=>g.root.id==='indy-maneuvers');
  assert.ok(slide.members.some(f=>f.id==='improved-slide'));
  assert.ok(slide.members.some(f=>f.id==='precision-slide'));
  assert.ok(!slide.members.some(f=>f.id==='legendary-slide'));
  assert.equal(groups.some(g=>g.root.id==='improved-slide'),false);
  s.classes.treasureHunter.choices.subclass='';s.classes.treasureHunter.choices.subclassConfirmed=false;
  assert.equal(F.families(s).some(g=>g.root.id==='curiosity-collection'),false);
});

test('Active, passive, starred, English search and original-name search all keep rules reachable',()=>{
  const c=runtime(),F=c.CharacterFeatureLibrary,s=hunter(c,8);
  assert.ok(F.families(s,{filter:'active'}).every(g=>g.active));
  assert.ok(F.families(s,{filter:'passive'}).every(g=>!g.active));
  assert.ok(F.families(s,{query:'Precision Slide'}).some(g=>g.members.some(f=>f.id==='precision-slide')));
  assert.ok(F.families(s,{query:'Přesný skluz'}).some(g=>g.members.some(f=>f.id==='precision-slide')));
  s.ui.favoriteFeatures=['precision-slide'];
  assert.equal(F.families(s,{filter:'favorites'})[0].root.id,'precision-slide');
  assert.equal(F.families(s)[0].root.id,'indy-maneuvers');
  assert.ok(F.families(s,{progression:true}).some(g=>g.members.some(f=>f.id==='legendary-slide')));
});

test('Current Treasure Hunter numbers reflect level, stats, Speed and resources',()=>{
  const c=runtime(),F=c.CharacterFeatureLibrary,D=c.CharacterDerived,s=hunter(c,8);
  assert.equal(facts(F,'narrow-escape',s)['Temporary HP'],'1d8+11');
  assert.equal(facts(F,'indy-slide',s).Movement,'20 ft.');
  assert.equal(facts(F,'bags-protection',s)['Force damage'],'8d6+8');
  assert.equal(facts(F,'line-attack',s).Targets,'3');
  assert.equal(facts(F,'adventurers-rope',s)['Rope save'],`DC ${D.whipRopeDC(s)}`);
  s.character.level=15;s.classes.treasureHunter.coolUsed=4;
  assert.equal(facts(F,'narrow-escape',s)['Temporary HP'],'2d10+20');
  assert.equal(facts(F,'cool-points',s)['Cool Points'],'11/15');
  s.character.level=17;assert.equal(facts(F,'indy-slide',s).Movement,'30 ft.');
  assert.equal(facts(F,'daring-strike',s)['Extra damage'],'3d12');
});

test('Occultist families merge upgrades and show current spell attacks, DCs, slots and damage',()=>{
  const c=runtime(),F=c.CharacterFeatureLibrary,s=c.CharacterState.fresh();s.character.classKey='occultist';s.character.level=10;s.character.abilities.INT=16;
  const groups=F.families(s);
  assert.ok(groups.find(g=>g.root.id==='occult-spellcasting').members.some(f=>f.id==='magical-energy'));
  assert.ok(groups.find(g=>g.root.id==='magic-resistance').members.some(f=>f.id==='greater-magic-resistance'));
  assert.equal(facts(F,'magic-resistance',s)['INT / WIS / CHA saves'],'+1d6 against spells');
  assert.equal(facts(F,'occult-spellcasting',s)['Spell save'],'DC 15');
  assert.equal(facts(F,'stunning-trick',s)['Psychic damage'],'2d6+2');
  const healing=F.spellFacts(c.OccultistDataV10.spells.find(s=>s.id==='cure-wounds'),s);
  assert.equal(healing.find(f=>f.label==='Healing').value,'2d8+3');
  const strike=F.spellFacts(c.CharacterEnglishRules.spell(c.OccultistDataV10.spells.find(s=>s.id==='true-strike')),s);
  assert.ok(strike.some(f=>f.value==='Equip a proficient weapon'));
});

test('Translated spell descriptions cover the complete built-in spellbook while preserving IDs',()=>{
  const c=runtime();
  for(const original of c.OccultistDataV10.spells){
    const translated=c.CharacterEnglishRules.spell(original);
    assert.equal(translated.id,original.id);
    assert.doesNotMatch(translated.name+' '+translated.fullText,/[ěščřžýáíéůúďťň]/i,original.id);
    assert.ok(translated.fullText.length>25,original.id+' has complete available rules');
  }
});

test('Feature filters, favorites and search remain profile-local through export and switching',()=>{
  const c=runtime(),S=c.CharacterState,R=c.CharacterRoster,C=c.CharacterCommands;
  const first=R.activeId();C.setUi('featureSearch','slide');C.setUi('featureFilter','favorites');C.setUi('featurePassiveOpen',true);
  S.update(s=>{s.ui.favoriteFeatures=['indy-slide'];});
  const backup=plain(S.get());R.create('Other','occultist');
  assert.equal(S.get().ui.featureSearch,undefined);assert.equal(S.get().ui.featureFilter,'all');assert.equal(S.get().ui.featurePassiveOpen,undefined);
  R.importCharacter(backup);assert.equal(S.get().ui.featureSearch,'slide');
  R.switchTo(first);assert.equal(S.get().ui.featurePassiveOpen,true);assert.equal(S.get().ui.featureSearch,'slide');assert.equal(S.get().ui.featureFilter,'favorites');
});


test('Rule formula annotations and relic healing show the current character values',()=>{
  const c=runtime(),s=hunter(c,8),F=c.CharacterFeatureLibrary;
  assert.match(F.annotate('your Treasure Hunter level + your Proficiency Bonus + your Intelligence modifier',s),/level \(8\).*Bonus \(\+3\).*modifier \(\+2\)/);
  assert.equal(facts(F,'healing-amulet',s).Healing,'2d8+2 HP');assert.equal(facts(F,'healing-amulet',s)['At 0 HP'],'18 HP');
  for(const language of c.TreasureHunterDataV7s.ancientLanguages)assert.doesNotMatch(c.CharacterEnglishRules.text(language),/[ěščřžýáíéůúďťň]/i);
});


test('Opening a deeply nested search match reveals its ancestors and closing a family clears only that branch',()=>{
  const c=runtime(),F=c.CharacterFeatureLibrary,s=hunter(c,8);
  s.ui.openFeatures=['precision-slide','narrow-escape'];
  assert.equal(F.isOpen('indy-maneuvers',s),true);assert.equal(F.isOpen('indy-slide',s),true);assert.equal(F.isOpen('attack-slide',s),true);
  const related=new Set(F.descendants('indy-maneuvers',s));s.ui.openFeatures=s.ui.openFeatures.filter(id=>!related.has(id));
  assert.deepEqual(plain(s.ui.openFeatures),['narrow-escape']);assert.equal(F.isOpen('indy-maneuvers',s),false);assert.equal(F.isOpen('cool-points',s),true);
});
