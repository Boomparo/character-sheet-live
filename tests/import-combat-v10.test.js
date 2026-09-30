const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const plain = value => JSON.parse(JSON.stringify(value));
const liliText = fs.readFileSync(process.env.LILI_JSON_PATH || path.join(__dirname, 'fixtures/Lili_169.json'), 'utf8');

function session() {
  const memory = new Map();
  const context = vm.createContext({ console, TextDecoder, crypto:require('node:crypto').webcrypto,
    setTimeout:()=>1, clearTimeout:()=>{}, localStorage:{getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,String(value))} });
  context.window = context;
  for (const match of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^"?]+)/g)) {
    if (match[1].startsWith('js/ui/')) break;
    vm.runInContext(fs.readFileSync(path.join(root,match[1]),'utf8'),context,{filename:match[1]});
  }
  return { S:context.CharacterState, R:context.CharacterRoster, C:context.CharacterCommands, D:context.CharacterDerived,
    I:context.CharacterImport, P:context.CharacterOccultistSpells, Legacy:context.OccultistLegacyImportV10, Help:context.CharacterRulesHelp, memory };
}
function importLili(env) { return env.R.importCharacter(env.Legacy.convert(env.I.validate(env.I.parse(liliText)))); }

test('Actual Lili export imports twice, preserves prepared flags and never edits Tazio', () => {
  const env=session(),{S,R,D}=env;
  S.update(state=>{state.character.name='Tazio';state.character.hp.current=7;state.character.bio.notes='Original';});
  const originalId=R.activeId(),before=plain(S.get());
  const first=importLili(env),second=importLili(env);
  assert.equal(new Set([originalId,first,second]).size,3);
  assert.equal(R.list().length,3);
  assert.equal(S.get().character.name,'Lili');
  assert.equal(D.armorClass(),14);
  assert.equal(D.ability('DEX'),13);
  const legacy=JSON.parse(liliText);
  for(const spell of legacy.spells) assert.equal(S.get().classes.occultist.spells.find(entry=>entry.id===spell.libraryId).prepared,spell.prepared);
  S.update(state=>{state.classes.occultist.spells[0].prepared=true;state.character.gear.inventory[0].quantity=9;});
  R.switchTo(first);assert.equal(S.get().classes.occultist.spells[0].prepared,false);
  R.switchTo(originalId);assert.deepEqual(plain(S.get()),before);
});

test('UTF-8 file, Czech characters, BOM and Unicode separators preserve string contents', async () => {
  const {I}=session();
  const text='\uFEFF{\u00a0"name":\u2009"Předurčení", "notes":"české\u00a0mezery\u200B", "abilities":{}}';
  const bytes=new TextEncoder().encode(text);
  const actual=await I.readFile({size:bytes.length,arrayBuffer:async()=>bytes.buffer});
  assert.equal(I.parse(actual).name,'Předurčení');
  assert.equal(I.parse(actual).notes,'české\u00a0mezery\u200B');
});

test('Empty, unreadable and invalid UTF-8 files report actionable errors', async () => {
  const {I}=session();
  await assert.rejects(I.readFile({size:0}),/empty/);
  await assert.rejects(I.readFile({size:1,arrayBuffer:async()=>{throw Error('IO');}}),/could not be read/);
  await assert.rejects(I.readFile({size:1,arrayBuffer:async()=>new Uint8Array([255]).buffer}),/UTF-8/);
});

test('Malformed, incomplete and non-character JSON is rejected before roster changes', () => {
  const {S,R,I}=session(), before=plain(S.get()), beforeCount=R.list().length;
  for(const input of ['', '{"name":', '[]', 'null', '{"name":"Lili"}', '{"character":{}}', '{"profiles":[{"data":{}}]}']) {
    assert.throws(()=>I.validate(I.parse(input)));
    assert.deepEqual(plain(S.get()),before);assert.equal(R.list().length,beforeCount);
  }
  assert.throws(()=>I.parse('{\n"name" "Lili"}'),/line 2/);
  assert.equal(S.get().character.name,before.character.name);
});

test('Prepared spell eligibility updates immediately and survives Dawn, level changes and import', () => {
  const env=session(),{S,C,P,R}=env;const id=importLili(env);
  C.adjustOccultistSlot(1,-2);
  const canCast=id=>P.castStatus(P.get(id,S.get()),S.get()).ok;
  assert.equal(canCast('predurceni'),true);
  assert.equal(canCast('mage-armor'),false);
  assert.equal(C.toggleOccultistSpell('predurceni').ok,true);assert.equal(canCast('predurceni'),false);
  assert.equal(C.toggleOccultistSpell('mage-armor').ok,true);assert.equal(canCast('mage-armor'),true);
  C.completeOccultistDawn();assert.equal(canCast('mage-armor'),true);
  C.levelUp(3);assert.equal(canCast('mage-armor'),true);
  const backup=plain(S.get());R.importCharacter(backup);assert.equal(canCast('mage-armor'),true);
  C.toggleOccultistSpell('mage-armor');R.switchTo(id);assert.equal(canCast('mage-armor'),true);
});

test('Only selected cantrips are usable without preparation; exhausted slots hide leveled Actions', () => {
  const env=session(),{S,C,P}=env;importLili(env);
  assert.equal(P.castStatus(P.get('blade-ward',S.get()),S.get()).ok,true);
  assert.equal(C.castOccultistSpell('telekinesis').reason,'spell');
  assert.equal(P.castStatus(P.get('predurceni',S.get()),S.get()).reason,'slot');
  C.adjustOccultistSlot(1,-1);assert.equal(P.castStatus(P.get('predurceni',S.get()),S.get()).ok,true);
  C.castOccultistSpell('predurceni');assert.equal(P.castStatus(P.get('predurceni',S.get()),S.get()).reason,'slot');
  assert.equal(P.castStatus(P.get('blade-ward',S.get()),S.get()).ok,true);
});

test('Always-prepared golem does not consume the daily limit and unavailable sciences cannot bypass it', () => {
  const {S,P,C,R}=session();R.create('Kabalist','occultist');
  S.update(state=>{state.character.level=12;state.classes.occultist.sciences.kabala=5;});
  assert.equal(P.prepared(P.get('oziveni-golema',S.get()),S.get()),true);
  assert.equal(P.preparedCount(S.get()),0);
  assert.equal(C.castOccultistSpell('oziveni-golema').ok,true);
  S.update(state=>{state.character.level=1;});
  assert.equal(P.get('oziveni-golema',S.get()),null);
  assert.equal(C.castOccultistSpell('oziveni-golema').ok,false);
});

test('Death Saves stabilize at three successes and clear both counters; healing wakes the character', () => {
  const {S,C}=session();C.setHpCurrent(0);
  assert.ok(S.get().character.conditions.includes('Unconscious'));
  C.setDeathSave('failures',1);C.setDeathSave('successes',2);C.setDeathSave('successes',3);
  assert.equal(S.get().character.deathSaves.stable,true);
  assert.equal(S.get().character.deathSaves.successes,0);assert.equal(S.get().character.deathSaves.failures,0);
  assert.equal(C.recordDeathSave(10),false);
  C.heal(1);assert.equal(S.get().character.deathSaves.stable,false);
  assert.ok(!S.get().character.conditions.includes('Unconscious'));
  assert.ok(S.get().character.conditions.includes('Prone'),'Healing does not make you stand up');
});

test('Natural 1 is two failures, natural 20 restores 1 HP, three failures are Dead and Undo restores', () => {
  const {S,C}=session();C.setHpCurrent(0);C.recordDeathSave(1);
  assert.equal(S.get().character.deathSaves.failures,2);
  C.recordDeathSave(9);assert.equal(S.get().character.deathSaves.dead,true);
  assert.equal(C.heal(5).healed,0);S.undo();assert.equal(S.get().character.deathSaves.dead,false);
  C.recordDeathSave(20);assert.equal(S.get().character.hp.current,1);assert.equal(S.get().character.deathSaves.failures,0);
});

test('Damage at 0 HP breaks stability and counts failures, including Critical Hits and massive damage', () => {
  const {S,C,D}=session();C.setHpCurrent(0);C.stabilize();C.applyDamage(1);
  assert.equal(S.get().character.deathSaves.stable,false);assert.equal(S.get().character.deathSaves.failures,1);
  C.applyDamage(1,'',{critical:true});assert.equal(S.get().character.deathSaves.dead,true);
  C.setHpCurrent(1);C.applyDamage(D.hpMax()+1);assert.equal(S.get().character.deathSaves.dead,true);
});

test('Death Save state and coin changes stay isolated between characters', () => {
  const {S,C,R}=session(), first=R.activeId();C.setHpCurrent(0);C.recordDeathSave(1);
  const second=R.create('Other');assert.equal(S.get().character.deathSaves.failures,0);
  C.changeCurrency('generic',{g:40},'add');assert.equal(S.get().character.gear.currencyWallets.generic.g,40);
  R.switchTo(first);assert.equal(S.get().character.deathSaves.failures,2);assert.equal(S.get().character.gear.currencyWallets.generic.g,0);
  R.switchTo(second);assert.equal(S.get().character.gear.currencyWallets.generic.g,40);
});

test('Add/Remove accepts positive coin amounts and insufficient funds cannot partly remove money', () => {
  const {S,C}=session();assert.equal(C.changeCurrency('generic',{g:40,s:2},'add').ok,true);
  assert.equal(C.changeCurrency('generic',{g:10},'remove').ok,true);
  assert.equal(S.get().character.gear.currencyWallets.generic.g,30);
  const before=plain(S.get());
  assert.equal(C.changeCurrency('generic',{g:5,s:3},'remove').reason,'funds');assert.deepEqual(plain(S.get()),before);
  for(const g of [-1,0,0.5,NaN,Infinity]) assert.equal(C.changeCurrency('generic',{g},'add').ok,false);
});

test('Weapon range includes legacy rangeText, melee reach and thrown range, with damage types', () => {
  const {S,D,R}=session();R.importCharacter(S.fresh());
  S.update(state=>{state.character.gear.weapons=[{id:'dagger',name:'Dagger',equipped:true,location:'equipped',damage:'1d4',damageType:'Piercing',rangeText:'20/60 ft.',properties:['Finesse','Light','Thrown (20/60)']}];});
  assert.equal(D.weaponAttacks()[0].rangeText,'5 ft. · Thrown 20/60 ft.');assert.equal(D.weaponAttacks()[0].damageType,'Piercing');
  assert.equal(D.weaponRange({name:'Rapier',properties:['Finesse']}),'5 ft.');
  assert.equal(D.weaponRange({name:'Dagger',properties:['Thrown (20/60)']}),'5 ft. · Thrown 20/60 ft.');
});

test('Rules vocabulary keeps mechanics English without changing passive benefits or source names', () => {
  const {Help}=session();assert.equal(Help.text('Máš Nevýhodu a Výhodu. Bonusovou akcí použij záchranný hod.'),'Máš Disadvantage a Advantage. Bonus Action použij saving throw.');
  assert.equal(Help.text('pasivní výhody, výhodnější, transakci'),'pasivní výhody, výhodnější, transakci');
  assert.match(Help.property('Finesse'),/STR or DEX/);assert.match(Help.property('Light'),/different Light weapon/);assert.match(Help.property('Thrown (20/60)'),/throw/);
});


test('Incapacitated characters cannot cast, while known spells remain in the spellbook', () => {
  const env=session(),{S,C,P}=env;importLili(env);C.setHpCurrent(0);
  assert.equal(C.castOccultistSpell('blade-ward').reason,'incapacitated');
  assert.ok(P.known(S.get()).some(spell=>spell.id==='blade-ward'));
  C.heal(1);assert.equal(C.castOccultistSpell('blade-ward').ok,true);
});
