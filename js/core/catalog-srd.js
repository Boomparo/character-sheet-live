(function(){
  const CACHE_KEY='v7s-srd-2024-items-v1';
  const CACHE_MS=7*24*60*60*1000;
  const EQUIPMENT_URL='https://raw.githubusercontent.com/5e-bits/5e-database/main/src/2024/en/5e-SRD-Equipment.json';
  const MAGIC_URL='https://raw.githubusercontent.com/5e-bits/5e-database/main/src/2024/en/5e-SRD-Magic-Items.json';
  const RARITY_ORDER={Mundane:0,Common:1,Uncommon:2,Rare:3,'Very Rare':4,Legendary:5,Artifact:6,Varies:7};
  let memory=null;

  function cleanRarity(v){v=String(v||'Mundane');for(const k of Object.keys(RARITY_ORDER))if(v.startsWith(k))return k;return v||'Mundane'}
  function normalizeEquipment(x){
    const cats=(x.equipment_categories||[]).map(c=>c.name).filter(Boolean);
    return {id:`equipment:${x.index}`,index:x.index,name:x.name||x.index,kind:'Equipment',rarity:'Mundane',category:cats.join(' • ')||x.equipment_category?.name||'Equipment',attunement:false,description:x.description||'',image:x.image||'',source:'SRD 5.2.1',raw:x};
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
  function displayFields(item){
    const r=item.raw||{},out=[];
    if(item.rarity)out.push(['Rarity',item.rarityLabel||item.rarity]);if(item.category)out.push(['Category',item.category]);if(item.attunement)out.push(['Attunement','Required']);
    if(r.cost)out.push(['Cost',`${r.cost.quantity} ${r.cost.unit}`]);if(r.weight!=null)out.push(['Weight',`${r.weight} lb.`]);
    if(r.damage?.damage_dice)out.push(['Damage',`${r.damage.damage_dice} ${r.damage.damage_type?.name||''}`.trim()]);if(r.two_handed_damage?.damage_dice)out.push(['Two-Handed',r.two_handed_damage.damage_dice]);
    if(r.range?.normal!=null)out.push(['Range',`${r.range.normal}${r.range.long?`/${r.range.long}`:''} ft.`]);
    if(r.properties?.length)out.push(['Properties',r.properties.map(x=>x.name).join(', ')]);if(r.mastery?.name)out.push(['Mastery',r.mastery.name]);
    if(r.armor_class?.base!=null)out.push(['AC',String(r.armor_class.base)]);if(r.str_minimum)out.push(['STR minimum',String(r.str_minimum)]);if(r.stealth_disadvantage)out.push(['Stealth','Disadvantage']);
    if(r.quantity)out.push(['Quantity',String(r.quantity)]);if(r.capacity)out.push(['Capacity',String(r.capacity)]);
    return out;
  }
  function cloneForInventory(item){return JSON.parse(JSON.stringify({...item,addedAt:new Date().toISOString()}))}

  window.V7SItemCatalog={load,search,sort,displayFields,cloneForInventory,RARITY_ORDER,attribution:'D&D SRD 5.2.1 (CC BY 4.0); dataset: 5e-bits/5e-database'};
})();