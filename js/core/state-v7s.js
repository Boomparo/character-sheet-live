(function(){
  const KEY='character-sheet-v7s';
  const OLD_KEY='occultist-sheet-v1';
  const SCHEMA_VERSION=10;
  const A=['STR','DEX','CON','INT','WIS','CHA'];
  const ITEM_LOCATIONS=['equipped','worn','carried','backpack','back','ground','storage'];
  const clone=v=>JSON.parse(JSON.stringify(v));

  function baseState(){return {
    schemaVersion:SCHEMA_VERSION,appVersion:'7s.5.0-gameplay',
    character:{
      name:'',race:'',classKey:'treasureHunter',level:1,portrait:'',
      hp:{current:10,max:10,temp:0,auto:true},
      hitDice:{d10:{spent:0}},
      ac:10,acMode:'auto',acManual:10,armorFormula:'unarmored',acBonus:0,
      speed:30,initiativeBonus:0,inspiration:false,
      abilities:{STR:10,DEX:10,CON:10,INT:10,WIS:10,CHA:10},
      conditions:[],exhaustion:0,skills:{},
      rollModes:{initiative:'normal',skills:{},saves:{}},
      customActions:[],
      damageDefenses:{resistances:[],immunities:[],vulnerabilities:[],conditionImmunities:[]},
      proficiencies:{languages:[],vehicles:[],tools:["Thieves' Tools","Navigator's Tools"],weapons:[],armor:['Light Armor'],senses:[],defenses:[]},
      gear:{money:{cp:0,sp:0,gp:0,pp:0},weapons:[{id:'whip',name:'Whip',attackAbility:'DEX',damage:'1d6',damageType:'Slashing',mastery:'Slow'}],armor:[],inventory:[]}
    },
    classes:{treasureHunter:{coolUsed:0,featureUses:{},relics:[],ancientLanguages:['','',''],vehicles:['',''],expertise:'',weaponMasteries:['',''],feat4:[],feat8:[],feat12:[],feat16:[],epicBoon19:[],choices:{}},occultist:{}},
    campaign:{npcs:[],notes:[],tarot:{}},
    ui:{page:0,favoriteFeatures:[],favoriteActions:[],featureFilter:'all',actionFilter:'all',actionSort:'combat'}
  }}

  function merge(target,source){if(!source||typeof source!=='object')return target;Object.keys(source).forEach(k=>{if(source[k]&&typeof source[k]==='object'&&!Array.isArray(source[k])){if(!target[k]||typeof target[k]!=='object'||Array.isArray(target[k]))target[k]={};merge(target[k],source[k]);}else target[k]=source[k];});return target}
  function num(v,f){const n=Number(v);return Number.isFinite(n)?n:f}
  function clamp(n,a,b){return Math.max(a,Math.min(b,num(n,a)))}
  function normalizeItem(it){
    if(typeof it==='string')return it;
    if(!it||typeof it!=='object')return it;
    if(!ITEM_LOCATIONS.includes(it.location))it.location='backpack';
    it.quantity=Math.max(1,Math.floor(num(it.quantity,1)));
    if(it.attunement&&typeof it.isAttuned!=='boolean')it.isAttuned=false;
    if(!Array.isArray(it.modifiers))it.modifiers=[];
    return it;
  }

  function normalize(s){
    const oldSchema=Number(s.schemaVersion)||0;
    s.schemaVersion=SCHEMA_VERSION;s.appVersion='7s.5.0-gameplay';
    const c=s.character||(s.character={});
    c.level=clamp(c.level,1,20);
    c.conditions=Array.isArray(c.conditions)?c.conditions.filter(Boolean):[];
    if(c.conditions.includes('Exhaustion')){c.conditions=c.conditions.filter(x=>x!=='Exhaustion');c.exhaustion=Math.max(1,num(c.exhaustion,0));}
    c.exhaustion=clamp(c.exhaustion,0,6);
    c.hitDice=c.hitDice&&typeof c.hitDice==='object'?c.hitDice:{};
    c.hitDice.d10=c.hitDice.d10&&typeof c.hitDice.d10==='object'?c.hitDice.d10:{spent:0};
    c.hitDice.d10.spent=clamp(c.hitDice.d10.spent,0,c.level);
    c.acMode=['auto','manual'].includes(c.acMode)?c.acMode:'auto';
    c.acManual=Math.max(0,num(c.acManual,c.ac??10));
    c.armorFormula=typeof c.armorFormula==='string'&&c.armorFormula?c.armorFormula:'unarmored';
    c.acBonus=num(c.acBonus,0);
    c.damageDefenses=c.damageDefenses&&typeof c.damageDefenses==='object'?c.damageDefenses:{};
    ['resistances','immunities','vulnerabilities','conditionImmunities'].forEach(k=>{if(!Array.isArray(c.damageDefenses[k]))c.damageDefenses[k]=[];c.damageDefenses[k]=[...new Set(c.damageDefenses[k].filter(Boolean))]});
    c.rollModes=c.rollModes&&typeof c.rollModes==='object'?c.rollModes:{initiative:'normal',skills:{},saves:{}};
    if(!['normal','advantage','disadvantage'].includes(c.rollModes.initiative))c.rollModes.initiative='normal';
    c.rollModes.skills=c.rollModes.skills&&typeof c.rollModes.skills==='object'?c.rollModes.skills:{};
    c.rollModes.saves=c.rollModes.saves&&typeof c.rollModes.saves==='object'?c.rollModes.saves:{};
    if(!Array.isArray(c.customActions))c.customActions=[];
    if(!c.hp||typeof c.hp!=='object')c.hp={current:10,max:10,temp:0,auto:true};
    c.hp.max=Math.max(1,num(c.hp.max,10));c.hp.current=clamp(c.hp.current,0,c.hp.max);c.hp.temp=Math.max(0,num(c.hp.temp,0));
    if(!c.gear||typeof c.gear!=='object')c.gear=baseState().character.gear;
    if(!Array.isArray(c.gear.inventory))c.gear.inventory=[];
    c.gear.inventory=c.gear.inventory.map(normalizeItem);
    if(!Array.isArray(c.gear.weapons))c.gear.weapons=[];
    if(!Array.isArray(c.gear.armor))c.gear.armor=[];
    const hasActiveArmor=c.gear.inventory.some(it=>it&&typeof it==='object'&&['equipped','worn'].includes(it.location)&&(it.raw?.armor_class||/armor|shield/i.test(`${it.category||''} ${it.name||''}`)));
    if(oldSchema<10&&c.acMode!=='manual'&&!hasActiveArmor)c.armorFormula='unarmored';
    if(!s.classes||typeof s.classes!=='object')s.classes={};
    if(!s.classes.treasureHunter||typeof s.classes.treasureHunter!=='object')s.classes.treasureHunter={};
    const th=s.classes.treasureHunter;
    if(!th.choices||typeof th.choices!=='object')th.choices={};
    if(!th.featureUses||typeof th.featureUses!=='object')th.featureUses={};
    if(!Array.isArray(th.ancientLanguages))th.ancientLanguages=['','',''];
    if(!Array.isArray(th.vehicles))th.vehicles=['',''];
    if(!Array.isArray(th.weaponMasteries))th.weaponMasteries=['',''];
    ['feat4','feat8','feat12','feat16','epicBoon19'].forEach(k=>{if(!Array.isArray(th[k]))th[k]=th[k]?[String(th[k])]:[]});
    if(!s.ui||typeof s.ui!=='object')s.ui={};
    if(!Array.isArray(s.ui.favoriteFeatures))s.ui.favoriteFeatures=[];
    if(!Array.isArray(s.ui.favoriteActions))s.ui.favoriteActions=[];
    if(!['all','a','ba','r','free','other'].includes(s.ui.actionFilter))s.ui.actionFilter='all';
    if(!['combat','favorite','name','source'].includes(s.ui.actionSort))s.ui.actionSort='combat';
    return s;
  }

  function migrateOld(old){
    const s=baseState();
    try{
      const c=old.character||{};
      s.character.name=old.name||old.characterName||c.name||'';
      s.character.race=old.race?.name||old.raceName||c.race||'';
      s.character.level=clamp(old.level??c.level,1,20);
      s.character.portrait=old.portrait||c.portrait||old.characterPortrait||'';
      const hp=old.hp||c.hp||{};
      s.character.hp.max=num(old.hpMax??old.maxHp??hp.max,10);
      s.character.hp.current=num(old.hpCurrent??old.currentHp??hp.current,s.character.hp.max);
      s.character.hp.temp=num(old.tempHp??hp.temp,0);
      s.character.hp.auto=typeof hp.auto==='boolean'?hp.auto:false;
      s.character.ac=num(old.ac??c.ac,10);s.character.acManual=s.character.ac;s.character.speed=num(old.speed??c.speed,30);
      s.character.inspiration=!!(old.inspiration??c.inspiration);
      s.character.exhaustion=clamp(old.exhaustion??c.exhaustion,0,6);
      A.forEach(a=>{const low=a.toLowerCase(),v=old.abilities?.[a]??old.abilities?.[low]??c.abilities?.[a]??old[low]??old[a];if(v!=null)s.character.abilities[a]=num(v,10)});
      if(Array.isArray(old.conditions||c.conditions))s.character.conditions=clone(old.conditions||c.conditions);
      if(Array.isArray(old.npcs))s.campaign.npcs=clone(old.npcs);else if(Array.isArray(old.campaign?.npcs))s.campaign.npcs=clone(old.campaign.npcs);
      if(Array.isArray(old.inventory))s.character.gear.inventory=clone(old.inventory);
      if(old.treasure&&typeof old.treasure==='object')merge(s.classes.treasureHunter,clone(old.treasure));
      if(Array.isArray(old.relics))s.classes.treasureHunter.relics=clone(old.relics);
      s.migratedFrom=OLD_KEY;s.migratedAt=new Date().toISOString();
    }catch(e){s.migrationWarning=String(e)}
    return normalize(s);
  }

  function load(){
    try{const raw=localStorage.getItem(KEY);if(raw)return normalize(merge(baseState(),JSON.parse(raw)));}catch(e){}
    try{const oldRaw=localStorage.getItem(OLD_KEY);if(oldRaw){const s=migrateOld(JSON.parse(oldRaw));localStorage.setItem(KEY,JSON.stringify(s));return s}}catch(e){}
    return normalize(baseState());
  }

  let state=load(),timer=0;const listeners=new Set();
  function flush(){normalize(state);try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}listeners.forEach(fn=>{try{fn(state)}catch(e){}})}
  function save(){clearTimeout(timer);timer=setTimeout(flush,60)}
  function update(fn){fn(state);normalize(state);save();return state}
  function replace(next){state=normalize(merge(baseState(),next||{}));save();return state}
  function modifier(score){return Math.floor((num(score,10)-10)/2)}
  function signed(n){return Number(n)>=0?`+${Number(n)}`:`${Number(n)}`}
  async function imageToThumb(file,max=420,quality=.78){
    if(!file)return'';const src=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)});
    const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src});
    const scale=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.width*scale));c.height=Math.max(1,Math.round(img.height*scale));c.getContext('2d').drawImage(img,0,0,c.width,c.height);return c.toDataURL('image/jpeg',quality);
  }

  window.V7SStateV7s={KEY,OLD_KEY,SCHEMA_VERSION,A,ITEM_LOCATIONS,get:()=>state,update,replace,save,flush,fresh:()=>normalize(baseState()),subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)},modifier,signed,clone,imageToThumb,normalize};
})();