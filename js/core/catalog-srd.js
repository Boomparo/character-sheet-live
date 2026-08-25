(function(){
  const CACHE_KEY='v7s-srd-2024-items-v2';
  const CACHE_MS=7*24*60*60*1000;
  const EQUIPMENT_URL='https://raw.githubusercontent.com/5e-bits/5e-database/main/src/2024/en/5e-SRD-Equipment.json';
  const MAGIC_URL='https://raw.githubusercontent.com/5e-bits/5e-database/main/src/2024/en/5e-SRD-Magic-Items.json';
  const RARITY_ORDER={Mundane:0,Common:1,Uncommon:2,Rare:3,'Very Rare':4,Legendary:5,Artifact:6,Varies:7};
  let memory=null;

  function cleanRarity(v){v=String(v||'Mundane');for(const k of Object.keys(RARITY_ORDER))if(v.startsWith(k))return k;return v||'Mundane'}
  function text(v){if(v==null)return'';if(Array.isArray(v))return v.map(x=>typeof x==='object'?(x.name||x.index||JSON.stringify(x)):x).join(', ');if(typeof v==='object')return v.name||v.index||JSON.stringify(v);return String(v)}
  function normalizeEquipment(x){
    const cats=(x.equipment_categories||[]).map(c=>c.name).filter(Boolean);
    return {id:`equipment:${x.index}`,index:x.index,name:x.name||x.index,kind:'Equipment',rarity:'Mundane',category:cats.join(' • ')||x.equipment_category?.name||'Equipment',attunement:false,description:Array.isArray(x.desc)?x.desc.join('\n'):String(x.description||x.desc||''),image:x.image||'',source:'SRD 5.2.1',raw:x};
  }
  function normalizeMagic(x){return {id:`magic:${x.index}`,index:x.index,name:x.name||x.index,kind:'Magic Item',rarity:cleanRarity(x.rarity?.name),rarityLabel:x.rarity?.name||'',category:x.equipment_category?.name||'Magic Item',attunement:!!x.attunement,description:Array.isArray(x.desc)?x.desc.join('\n'):String(x.desc||''),image:x.image||'',source:'SRD 5.2.1',raw:x}}
  function readCache(){try{const c=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');if(c&&Array.isArray(c.items)&&Date.now()-Number(c.savedAt||0)<CACHE_MS)return c.items}catch(e){}return null}
  function writeCache(items){try{localStorage.setItem(CACHE_KEY,JSON.stringify({savedAt:Date.now(),items}))}catch(e){}}
  async function fetchJson(url){const r=await fetch(url,{cache:'force-cache'});if(!r.ok)throw new Error(`Catalog HTTP ${r.status}`);return r.json()}
  async function load(force=false){
    if(memory&&!force)return memory;if(!force){const c=readCache();if(c){memory=c;return c}}
    const [equipment,magic]=await Promise.all([fetchJson(EQUIPMENT_URL),fetchJson(MAGIC_URL)]);
    memory=[...equipment.map(normalizeEquipment),...magic.map(normalizeMagic)];writeCache(memory);return memory;
  }
  function sort(items,mode='rarity'){const a=[...items];if(mode==='name')return a.sort((x,y)=>x.name.localeCompare(y.name));return a.sort((x,y)=>(RARITY_ORDER[x.rarity]??99)-(RARITY_ORDER[y.rarity]??99)||x.name.localeCompare(y.name))}
  async function search(query='',filters={}){
    const all=await load(),q=String(query).trim().toLowerCase(),rarity=filters.rarity||'all',kind=filters.kind||'all';
    return sort(all.filter(x=>(!q||`${x.name} ${x.category} ${x.rarity} ${x.description}`.toLowerCase().includes(q))&&(rarity==='all'||x.rarity===rarity)&&(kind==='all'||x.kind===kind)),filters.sort||'rarity');
  }
  function push(out,label,value){const v=text(value);if(v&&v!=='0')out.push([label,v])}
  function displayFields(item){
    const r=item.raw||{},out=[];
    if(item.rarity)push(out,'Rarity',item.rarityLabel||item.rarity);if(item.category)push(out,'Category',item.category);if(item.attunement)push(out,'Attunement','Required');
    if(r.cost)push(out,'Cost',`${r.cost.quantity} ${r.cost.unit}`);if(r.weight!=null)push(out,'Weight',`${r.weight} lb.`);
    push(out,'Weapon Category',r.weapon_category);push(out,'Weapon Range',r.weapon_range);push(out,'Category Range',r.category_range?.name||r.category_range);
    if(r.damage?.damage_dice)push(out,'Damage',`${r.damage.damage_dice} ${r.damage.damage_type?.name||''}`.trim());if(r.two_handed_damage?.damage_dice)push(out,'Two-Handed Damage',`${r.two_handed_damage.damage_dice} ${r.two_handed_damage.damage_type?.name||r.damage?.damage_type?.name||''}`.trim());
    if(r.range?.normal!=null)push(out,'Range',`${r.range.normal}${r.range.long?`/${r.range.long}`:''} ft.`);if(r.throw_range?.normal!=null)push(out,'Thrown Range',`${r.throw_range.normal}${r.throw_range.long?`/${r.throw_range.long}`:''} ft.`);
    push(out,'Properties',r.properties);push(out,'Mastery',r.mastery?.name||r.mastery);push(out,'Special',r.special);
    push(out,'Armor Category',r.armor_category);if(r.armor_class?.base!=null)push(out,'AC',String(r.armor_class.base));if(r.armor_class?.dex_bonus)push(out,'DEX Bonus','Yes');if(r.armor_class?.max_bonus!=null)push(out,'Max DEX Bonus',r.armor_class.max_bonus);if(r.str_minimum)push(out,'STR Minimum',r.str_minimum);if(r.stealth_disadvantage)push(out,'Stealth','Disadvantage');
    push(out,'Tool Category',r.tool_category);push(out,'Gear Category',r.gear_category?.name||r.gear_category);push(out,'Vehicle Category',r.vehicle_category);push(out,'Speed',r.speed&&`${r.speed.quantity} ${r.speed.unit}`);push(out,'Capacity',r.capacity);push(out,'Quantity',r.quantity);
    if(Array.isArray(r.contents)&&r.contents.length)push(out,'Contents',r.contents.map(x=>`${x.quantity||1}× ${x.item?.name||x.item?.index||x.item||''}`));
    if(r.rarity?.name&&!out.some(x=>x[0]==='Rarity'))push(out,'Rarity',r.rarity.name);push(out,'Type',r.type?.name||r.type);push(out,'Magic Item Category',r.magic_item_category?.name||r.magic_item_category);
    return out;
  }
  function cloneForInventory(item){return JSON.parse(JSON.stringify({...item,addedAt:new Date().toISOString()}))}

  window.V7SItemCatalog={load,search,sort,displayFields,cloneForInventory,RARITY_ORDER,attribution:'D&D SRD 5.2.1 (CC BY 4.0); dataset: 5e-bits/5e-database'};
})();