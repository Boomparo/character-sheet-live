const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const plain = value => JSON.parse(JSON.stringify(value));
function session() {
  const memory = new Map(), c = vm.createContext({ console, TextDecoder, crypto:require('node:crypto').webcrypto,
    setTimeout:()=>1,clearTimeout:()=>{},localStorage:{getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,String(value))},fetch:async()=>{throw Error('offline');} });
  c.window=c;
  for(const match of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^"?]+)/g)) {
    if(match[1].startsWith('js/ui/'))break;
    vm.runInContext(fs.readFileSync(path.join(root,match[1]),'utf8'),c,{filename:match[1]});
  }
  c.CharacterState.update(s=>{s.character.abilities.DEX=16;s.character.abilities.STR=12;});
  return {E:c.CharacterEquipment,D:c.CharacterDerived,S:c.CharacterState,C:c.CharacterCommands,R:c.CharacterRoster,H:c.CharacterHomebrewLibrary,Catalog:c.V7SItemCatalog,Help:c.CharacterRulesHelp};
}
function equip(e,definition) {const id=e.C.addItem(definition);e.C.setItemEquipped(id,true);return e.D.weaponAttacks().find(item=>item.id===id);}

test('Gunslinger profiles retain published damage, range, reload, weight, ammunition and source', () => {
  const {E}=session(), weapons=E.GUNSLINGER_ITEMS.filter(item=>item.itemType==='weapon');
  assert.equal(weapons.length,15); assert.equal(E.GUNSLINGER_ITEMS.filter(item=>item.category==='Ammunition').length,6);
  assert.equal(new Set(E.GUNSLINGER_ITEMS.map(item=>item.id)).size,21);
  const revolver=weapons.find(item=>item.name==='Revolver');
  assert.equal(revolver.damage,'2d6');assert.equal(revolver.rangeLabel,'30/120 ft.');assert.equal(revolver.weight,3);
  assert.ok(revolver.properties.includes('Reload (6)'));assert.equal(revolver.cost.quantity,125);
  const blunderbuss=weapons.find(item=>item.name==='Blunderbuss');assert.equal(blunderbuss.damageAbility,'auto');assert.ok(!blunderbuss.properties.includes('Firearm'));
});

test('Firearm omits the ability damage bonus while hit, magic bonuses and Exhaustion remain independent', () => {
  const e=session(), gun=e.E.GUNSLINGER_ITEMS.find(item=>item.name==='Revolver');
  let weapon=equip(e,{...plain(gun),name:'Revolver +1'});
  assert.equal(weapon.hit,6);assert.equal(weapon.damage,'2d6 +1 Piercing');
  e.C.adjustExhaustion(2);weapon=e.D.weaponAttacks()[0];assert.equal(weapon.hit,2);assert.equal(weapon.damage,'2d6 +1 Piercing');
  e.S.update(s=>{s.character.level=11;});assert.equal(e.D.weaponAttacks()[0].damage,'2d6 +1 Piercing','Treasure Hunter 11 never gains Gunslinger Overkill');
  e.C.updateItem(weapon.id,{damageAbility:'auto'});assert.equal(e.D.weaponAttacks()[0].damage,'2d6 +4 Piercing','Explicit campaign/feature override remains possible');
});

test('SRD Pistol, Musket, Blunderbuss and campaign firearms retain normal ability damage', () => {
  const e=session();
  for(const name of ['Pistol','Musket']) {
    const base=e.E.bases().find(item=>item.name===name&&item.source==='SRD 5.2.1');
    const weapon=equip(e,base);assert.equal(weapon.damageModifier,3,name);
  }
  const campaign=e.Catalog.HOME_BREW_ITEMS.find(item=>item.name==='Revolver');assert.equal(equip(e,campaign).damageModifier,3);
  assert.equal(equip(e,e.E.GUNSLINGER_ITEMS.find(item=>item.name==='Blunderbuss')).damageModifier,3);
});

test('Imported Firearm properties work without a source flag or handwritten negative bonus', () => {
  const e=session();const weapon=equip(e,{name:'Imported gun',itemType:'weapon',damage:'2d4',damageType:'Piercing',properties:['Firearm'],category:'Simple Ranged Weapon'});
  assert.equal(weapon.damageModifier,0);assert.equal(weapon.hit,5);
  const exported=plain(e.S.get());e.R.importCharacter(exported);assert.equal(e.D.weaponAttacks()[0].damageModifier,0);
});

test('Catalog remains useful offline and preserves both same-name campaign and Gunslinger weapons', async () => {
  const e=session();const matches=await e.Catalog.search('Revolver');
  assert.ok(matches.some(item=>item.id==='homebrew:revolver'));
  assert.ok(matches.some(item=>item.id==='gunslinger:revolver'));
  assert.equal((await e.Catalog.search('',{tags:['gunslinger']})).length,21);
  assert.ok((await e.Catalog.search('Plate')).some(item=>item.name==='Plate Armor'));
});

test('Adamantine Dagger and armor names resolve to complete distinct base profiles', () => {
  const {E}=session();let matches=E.detect('Adamantine Dagger');assert.equal(matches.length,1);
  let base=E.mechanics(matches[0]);assert.equal(base.itemType,'weapon');assert.equal(base.damage,'1d4');assert.equal(base.damageType,'Piercing');
  assert.ok(base.properties.includes('Finesse'));assert.ok(base.properties.some(p=>p.startsWith('Thrown')));assert.equal(base.mastery,'Nick');assert.equal(base.masteryWeapon,'Dagger');
  matches=E.detect('Adamantine Plate');assert.equal(matches.length,1);base=E.mechanics(matches[0]);assert.equal(base.itemType,'armor');assert.equal(base.armorBase,18);assert.equal(base.armorDex,'none');
  assert.equal(E.detect('Unknown magical curiosity').length,0);
  assert.ok(E.detect('Custom Revolver').length>=2,'Source conflicts require a player choice');
});

test('Custom base metadata is cloned, preserves canonical Mastery and remains character-local', () => {
  const e=session(),base=e.E.detect('Adamantine Dagger')[0],before=plain(base),first=e.R.activeId();
  const weapon=equip(e,{...e.E.mechanics(base),name:'Adamantine Dagger'});assert.equal(weapon.ability,'DEX');assert.equal(weapon.damage,'1d4 +3 Piercing');
  e.C.updateItem(weapon.id,{damage:'2d4'});assert.deepEqual(plain(base),before);
  const imported=e.R.importCharacter(plain(e.S.get()));e.C.updateItem(e.D.weaponAttacks()[0].id,{damageAbility:'none'});
  e.R.switchTo(first);assert.equal(e.D.weaponAttacks()[0].damageModifier,3);e.R.switchTo(imported);assert.equal(e.D.weaponAttacks()[0].damageModifier,0);
});

test('Shared item definitions never carry attunement, equipped state, quantities or storage from another character', async () => {
  const e=session(),base=e.E.detect('Adamantine Dagger')[0];
  const saved=e.H.saveItem({...e.E.mechanics(base),name:'Moon Dagger',quantity:7,attunement:true,isAttuned:true,location:'equipped',containerId:'private-bag',stowedContainerId:'private-bag'});
  for(const key of ['quantity','isAttuned','location','containerId','stowedContainerId'])assert.equal(saved[key],undefined,key);
  const id=e.C.addItem(e.Catalog.cloneForInventory(saved));const item=e.D.inventory().find(item=>item.id===id);
  assert.equal(item.quantity,1);assert.equal(item.isAttuned,false);assert.equal(item.location,'carried');
  assert.ok((await e.Catalog.search('Moon Dagger',{tags:['weapon']})).some(item=>item.libraryId===saved.libraryId));
});

test('Gunslinger ammunition works with all six types and maintains independent stack counts', () => {
  const e=session();
  for(const name of ['Revolver','Double-Barrel Shotgun','Cannon','Flare Gun','Grenade Launcher','Blunderbuss']) {
    const gun=e.E.GUNSLINGER_ITEMS.find(item=>item.name===name),weapon=equip(e,gun), type=weapon.ammunitionType;
    const ammo=e.E.GUNSLINGER_ITEMS.find(item=>item.category==='Ammunition'&&item.name.toLowerCase().startsWith(type.toLowerCase()));
    assert.ok(ammo,`${name}: ${type}`);const ammoId=e.C.addItem(e.Catalog.cloneForInventory(ammo));
    const before=e.D.ammunitionSummaryForWeapon(weapon).total;assert.ok(before>0);assert.equal(e.C.spendAmmunition(weapon.id).ok,true);
    assert.equal(e.D.ammunitionSummaryForWeapon(weapon).total,before-1);assert.ok(e.D.inventory().find(item=>item.id===ammoId));
  }
});

test('New rule tags have explanations and the published damage rule is explicit in preview fields', () => {
  const {E,Help,Catalog}=session();
  for(const property of ['Firearm','Recoil','Reload (6)','Automatic','Explode','Mounted','Scatter','Sighted'])assert.ok(Help.property(property),property);
  const gun=E.GUNSLINGER_ITEMS.find(item=>item.name==='Parlor Gun');
  assert.ok(Catalog.displayFields(gun).some(([name,value])=>name==='Damage ability'&&value.includes('None')));
});

test('Changing an imported item type moves it out of its old bucket without changing identity or notes', () => {
  const e=session();e.S.update(s=>{s.character.gear.weapons.push({id:'old-weapon',name:'Custom plate',itemType:'weapon',damage:'1d4',notes:'Keep me',location:'equipped'});});
  e.C.updateItem('old-weapon',{itemType:'armor',damage:'',armorBase:18,armorDex:'none',raw:{armor_category:'Heavy'}});
  const item=e.D.inventory().find(item=>item.id==='old-weapon');assert.equal(item.notes,'Keep me');assert.equal(item.itemType,'armor');
  assert.equal(e.S.get().character.gear.weapons.length,0);assert.equal(e.D.weaponAttacks().length,0);assert.equal(e.D.armorClass(),18);
  e.S.undo();assert.equal(e.S.get().character.gear.weapons[0].id,'old-weapon');assert.equal(e.D.weaponAttacks().length,1);
});
