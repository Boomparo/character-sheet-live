(function(){
  const KEY='character-sheet-v7s';
  const OLD_KEY='occultist-sheet-v1';
  const SCHEMA_VERSION=7;
  const A=['STR','DEX','CON','INT','WIS','CHA'];
  const clone=v=>JSON.parse(JSON.stringify(v));

  function baseState(){return {
    schemaVersion:SCHEMA_VERSION,appVersion:'7s.1.0-polish',
    character:{
      name:'',race:'',classKey:'treasureHunter',level:1,portrait:'',
      hp:{current:10,max:10,temp:0,auto:true},ac:10,speed:30,initiativeBonus:0,inspiration:false,
      abilities:{STR:10,DEX:10,CON:10,INT:10,WIS:10,CHA:10},conditions:[],exhaustion:0,skills:{},
      proficiencies:{languages:[],vehicles:[],tools:["Thieves' Tools","Navigator's Tools"],weapons:[],armor:['Light Armor'],senses:[],defenses:[]},
      gear:{money:{cp:0,sp:0,gp:0,pp:0},weapons:[{id:'whip',name:'Bič',attackAbility:'DEX',damage:'1d6',damageType:'Slashing',mastery:'Slow'}],armor:[],inventory:[]}
    },
    classes:{treasureHunter:{coolUsed:0,featureUses:{},relics:[],ancientLanguages:['','',''],vehicles:['',''],expertise:'',weaponMasteries:['','']},occultist:{}},
    campaign:{npcs:[],notes:[],tarot:{}},
    ui:{page:0,favoriteFeatures:[],featureFilter:'all'}
  }}

  function merge(target,source){if(!source||typeof source!=='object')return target;Object.keys(source).forEach(k=>{if(source[k]&&typeof source[k]==='object'&&!Array.isArray(source[k])){if(!target[k]||typeof target[k]!=='object'||Array.isArray(target[k]))target[k]={};merge(target[k],source[k]);}else target[k]=source[k];});return target}
  function num(v,f){const n=Number(v);return Number.isFinite(n)?n:f}

  function migrateOld(old){
    const s=baseState();
    try{
      const c=old.character||{};
      s.character.name=old.name||old.characterName||c.name||'';
      s.character.race=old.race?.name||old.raceName||c.race||'';
      s.character.level=Math.max(1,Math.min(20,num(old.level??c.level,1)));
      s.character.portrait=old.portrait||c.portrait||old.characterPortrait||'';
      const hp=old.hp||c.hp||{};
      s.character.hp.max=num(old.hpMax??old.maxHp??hp.max,10);
      s.character.hp.current=num(old.hpCurrent??old.currentHp??hp.current,s.character.hp.max);
      s.character.hp.temp=num(old.tempHp??hp.temp,0);
      s.character.hp.auto=typeof hp.auto==='boolean'?hp.auto:false;
      s.character.ac=num(old.ac??c.ac,10);s.character.speed=num(old.speed??c.speed,30);
      s.character.inspiration=!!(old.inspiration??c.inspiration);
      A.forEach(a=>{const low=a.toLowerCase(),v=old.abilities?.[a]??old.abilities?.[low]??c.abilities?.[a]??old[low]??old[a];if(v!=null)s.character.abilities[a]=num(v,10)});
      if(Array.isArray(old.conditions||c.conditions))s.character.conditions=clone(old.conditions||c.conditions);
      if(Array.isArray(old.npcs))s.campaign.npcs=clone(old.npcs);else if(Array.isArray(old.campaign?.npcs))s.campaign.npcs=clone(old.campaign.npcs);
      if(Array.isArray(old.inventory))s.character.gear.inventory=clone(old.inventory);
      if(old.treasure&&typeof old.treasure==='object')merge(s.classes.treasureHunter,clone(old.treasure));
      if(Array.isArray(old.relics))s.classes.treasureHunter.relics=clone(old.relics);
      s.migratedFrom=OLD_KEY;s.migratedAt=new Date().toISOString();
    }catch(e){s.migrationWarning=String(e)}
    return s;
  }

  function load(){
    try{const raw=localStorage.getItem(KEY);if(raw)return merge(baseState(),JSON.parse(raw));}catch(e){}
    try{const oldRaw=localStorage.getItem(OLD_KEY);if(oldRaw){const s=migrateOld(JSON.parse(oldRaw));localStorage.setItem(KEY,JSON.stringify(s));return s}}catch(e){}
    return baseState();
  }

  let state=load(),timer=0;const listeners=new Set();
  function flush(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}listeners.forEach(fn=>{try{fn(state)}catch(e){}})}
  function save(){clearTimeout(timer);timer=setTimeout(flush,60)}
  function update(fn){fn(state);save();return state}
  function replace(next){state=merge(baseState(),next||{});save();return state}
  function modifier(score){return Math.floor((num(score,10)-10)/2)}
  function signed(n){return Number(n)>=0?`+${Number(n)}`:`${Number(n)}`}
  async function imageToThumb(file,max=420,quality=.78){
    if(!file)return'';const src=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)});
    const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src});
    const scale=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.width*scale));c.height=Math.max(1,Math.round(img.height*scale));c.getContext('2d').drawImage(img,0,0,c.width,c.height);return c.toDataURL('image/jpeg',quality);
  }

  window.V7SStateV7s={KEY,OLD_KEY,SCHEMA_VERSION,A,get:()=>state,update,replace,save,flush,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)},modifier,signed,clone,imageToThumb};
})();