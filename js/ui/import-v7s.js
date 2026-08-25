(function(){
  const S=window.V7SStateV7s;
  const Roster=window.V7SRoster;
  const O=window.V7SCampaignOrigin;
  if(!S)return;
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const AB={Strength:'STR',Dexterity:'DEX',Constitution:'CON',Intelligence:'INT',Wisdom:'WIS',Charisma:'CHA',STR:'STR',DEX:'DEX',CON:'CON',INT:'INT',WIS:'WIS',CHA:'CHA'};
  let pending=null;
  let report=[];

  function toast(message,type='success'){
    const host=$('#toastHost');if(!host)return;
    const el=document.createElement('div');el.className=`toast ${type}`;el.textContent=message;host.appendChild(el);setTimeout(()=>el.remove(),2400);
  }
  function inject(){
    if($('#importDialog'))return;
    document.body.insertAdjacentHTML('beforeend',`<dialog id="importDialog" class="sheet-dialog import-dialog"><form method="dialog"><div class="dialog-head"><strong>Import Character Data</strong><button value="cancel" class="icon-btn">×</button></div><div class="import-source-row"><label class="file-btn">Choose JSON file<input id="importFile" type="file" accept="application/json,.json" hidden></label><span>or paste JSON below</span></div><textarea id="importText" rows="12" spellcheck="false" placeholder='{"name":"...","level":5,...}'></textarea><div id="importReport" class="import-report">Native V7s, roster JSON, Character Craft JSON, and the simple sheet format are supported.</div><menu><button type="button" class="ghost" id="copyTemplate">Copy template</button><button type="button" class="primary" id="previewImport">Check import</button><button type="button" class="primary" id="applyImport" disabled>Import</button></menu></form></dialog>`);
  }
  function patchCharacters(){
    const form=$('#charactersDialog form');if(!form||form.querySelector('.import-toolbar'))return;
    const bar=document.createElement('div');bar.className='import-toolbar';bar.innerHTML='<button type="button" class="small-btn" data-import-open>⇩ Import JSON</button><button type="button" class="small-btn" data-export-character>⇧ Export Character</button><button type="button" class="small-btn" data-export-roster>Export All</button>';
    form.querySelector('[data-roster-new]')?.after(bar);
  }
  function template(){
    return {format:'v7s-simple-character',name:'Example Character',level:1,species:'City Goblin',background:'Lukyho univerzální background',abilities:{STR:10,DEX:10,CON:10,INT:10,WIS:10,CHA:10},hp:{current:10,max:10,temp:0},skills:{Acrobatics:1},gear:{weapons:[],inventory:[]},bio:{alignment:'',appearance:'',backstory:''},treasureHunter:{classSkills:[],ancientLanguages:[],vehicles:[],expertise:'',weaponMasteries:[],relics:[]}};
  }
  function download(name,data){
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),a=document.createElement('a');
    a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000);
  }
  function parseBackgroundSelections(desc=''){
    const out={skills:[],tool:'',secondary:'',abilityBonuses:{}};
    const sm=desc.match(/Skills?:\s*([^\n.]+)/i);if(sm)out.skills=sm[1].split(/,| and /i).map(x=>x.trim()).filter(Boolean).slice(0,2);
    const tm=desc.match(/Tool:\s*([^\n.]+)/i);if(tm)out.tool=tm[1].trim();
    const vm=desc.match(/(?:Vehicle|Instrument|Game(?: Set)?):\s*([^\n.]+)/i);if(vm)out.secondary=vm[1].trim();
    const am=desc.match(/Ability Scores?:\s*([^\n.]+)/i);
    if(am){
      for(const match of am[1].matchAll(/\+(\d)\s+(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)/gi)){
        const raw=match[2];const key=raw.charAt(0).toUpperCase()+raw.slice(1).toLowerCase();const ability=AB[key];if(ability)out.abilityBonuses[ability]=Number(match[1]);
      }
    }
    return out;
  }
  function collectGear(payload){
    const src=payload.inventory||payload.items||payload.equipment;if(!Array.isArray(src))return[];
    return src.map((item,i)=>{
      if(typeof item==='string')return {uid:`import-${Date.now()}-${i}`,name:item,quantity:1,location:'backpack',modifiers:[]};
      return {uid:item.uid||`import-${Date.now()}-${i}`,name:item.name||item.itemName||'Imported item',quantity:Number(item.quantity)||1,location:item.location||'backpack',weight:Number(item.weight)||undefined,description:item.description||'',raw:item.raw||item,modifiers:Array.isArray(item.modifiers)?item.modifiers:[]};
    });
  }
  function inferLevel(payload){
    for(const value of [payload.level,payload.characterLevel,payload.levelNumber]){const n=Number(value);if(n>=1&&n<=20)return n}
    const classes=Array.isArray(payload.class)?payload.class:[];
    for(const cls of classes){const n=Number(cls.level);if(n>=1&&n<=20)return n;const keys=Object.keys(cls.hpGainedPerLevel||{}).map(Number).filter(Number.isFinite);if(keys.length)return Math.max(...keys)}
    return 1;
  }
  function importCharacterCraft(payload){
    const next=S.fresh(),c=next.character;report=[];
    c.name=payload.name||'Imported Character';report.push(`Name: ${c.name}`);
    c.level=inferLevel(payload);report.push(`Level: ${c.level}`);
    const attrs=payload.attributes||payload.abilities||{};
    Object.entries(attrs).forEach(([key,value])=>{const a=AB[key];if(a&&Number.isFinite(Number(value)))c.abilities[a]=Number(value)});report.push('Ability scores');
    const sp=typeof payload.species==='string'?{name:payload.species}:(payload.species||{});
    if(sp.name){
      const speciesSkills=Array.isArray(sp.skillProficiencies)?sp.skillProficiencies.slice(0,2):[];
      const simpleWeapon=Array.isArray(sp.proficiency)?(sp.proficiency[0]||''):'';
      c.race=sp.name;c.origin={species:sp.name,speciesChoices:{skills:speciesSkills,simpleWeapon},background:{}};
      const speed=parseInt(sp.speed,10);if(speed)c.speed=speed;
      speciesSkills.forEach(x=>{c.skills[x]=1});
      const weapons=Array.isArray(sp.proficiency)?sp.proficiency.filter(x=>x&&!/choose/i.test(x)):[];c.proficiencies.weapons.push(...weapons);
      if(Number(sp.darkvisionRange))c.proficiencies.senses.push(`Darkvision ${Number(sp.darkvisionRange)} ft.`);
      report.push(`Species: ${sp.name}`);
    }
    const bg=typeof payload.background==='string'?{name:payload.background,description:''}:(payload.background||{});
    if(bg.name){
      const sel=parseBackgroundSelections(bg.description||'');const rawFeat=(Array.isArray(bg.features)&&bg.features[0]?.name)||String(bg.name).split(' - ').pop();const knownFeats=Object.keys(O?.BACKGROUND?.feats||{});const feat=knownFeats.includes(rawFeat)?rawFeat:'';
      c.background=bg.name;c.origin||(c.origin={species:c.race,speciesChoices:{skills:[],simpleWeapon:''}});
      c.origin.background={name:'Lukyho univerzální background',skills:sel.skills,tool:sel.tool,secondary:sel.secondary,feat,abilityMode:Object.values(sel.abilityBonuses).some(x=>x===2)?'+2/+1':'+1/+1/+1',abilityChoices:Object.keys(sel.abilityBonuses),appliedBonuses:sel.abilityBonuses,resilientAbility:'',skilledChoices:[],luckUsed:0};
      sel.skills.forEach(x=>{c.skills[x]=1});if(sel.tool)c.proficiencies.tools.push(sel.tool);if(sel.secondary)c.proficiencies.tools.push(sel.secondary);report.push(`Background: ${bg.name}`);
    }
    const hpBy=Array.isArray(payload.class)?payload.class[0]?.hpGainedPerLevel:null;
    if(hpBy&&typeof hpBy==='object'){const total=Object.values(hpBy).reduce((n,v)=>n+(Number(v)||0),0);if(total>0)c.hp={current:total,max:total,temp:0,auto:false}}
    else if(payload.hp&&typeof payload.hp==='object'){c.hp.current=Number(payload.hp.current)||c.hp.current;c.hp.max=Number(payload.hp.max||payload.maxHp)||c.hp.max;c.hp.temp=Number(payload.hp.temp)||0}
    if(typeof payload.image==='string')c.portrait=payload.image;
    c.gear.inventory=collectGear(payload);if(c.gear.inventory.length)report.push(`${c.gear.inventory.length} inventory items`);
    if(payload.bio&&typeof payload.bio==='object')c.bio={...payload.bio};
    report.push('Only explicit selected values are imported. Option catalogs inside Character Craft class definitions are not treated as character choices.');
    return next;
  }
  function importSimple(payload){
    const next=S.fresh(),c=next.character,th=next.classes.treasureHunter;report=[];
    c.name=payload.name||c.name;c.level=Math.max(1,Math.min(20,Number(payload.level)||1));c.race=payload.species||payload.race||'';c.background=payload.background||'';
    Object.entries(payload.abilities||{}).forEach(([key,value])=>{const a=AB[key];if(a)c.abilities[a]=Number(value)||10});
    if(payload.hp&&typeof payload.hp==='object')c.hp={...c.hp,...payload.hp};if(payload.skills&&typeof payload.skills==='object')c.skills={...payload.skills};if(payload.gear&&typeof payload.gear==='object')c.gear={...c.gear,...payload.gear};if(payload.bio&&typeof payload.bio==='object')c.bio={...payload.bio};if(payload.treasureHunter&&typeof payload.treasureHunter==='object')Object.assign(th,payload.treasureHunter);
    report.push('Simple V7s character data');return next;
  }
  function classify(payload){
    if(payload&&Array.isArray(payload.profiles))return {kind:'roster',data:payload};
    if(payload?.schemaVersion&&payload?.character&&payload?.classes)return {kind:'native',data:payload};
    if(payload?.name&&(payload.species||payload.attributes)&&(Array.isArray(payload.class)||payload.background))return {kind:'character-craft',data:importCharacterCraft(payload)};
    if(payload?.format==='v7s-simple-character'||payload?.name||payload?.abilities)return {kind:'simple',data:importSimple(payload)};
    throw new Error('JSON format not recognized');
  }
  function preview(text){
    try{const payload=JSON.parse(text),parsed=classify(payload);pending=parsed;$('#applyImport').disabled=false;$('#importReport').innerHTML=`<b>${esc(parsed.kind.toUpperCase())}</b>${report.length?`<ul>${report.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'<p>Valid V7s data detected.</p>'}`;return true}
    catch(error){pending=null;$('#applyImport').disabled=true;$('#importReport').innerHTML=`<b>Cannot import</b><p>${esc(error.message)}</p>`;return false}
  }
  function applyImport(){
    if(!pending)return;
    if(pending.kind==='roster'){if(!Roster||!Roster.importAll(pending.data))toast('Roster import failed','warn');return}
    if(pending.kind==='native'){S.replace(pending.data);S.flush()}
    else{const campaign=S.clone(S.get().campaign||{});pending.data.campaign=campaign;S.replace(pending.data);S.flush()}
    $('#importDialog').close();toast('Character imported.','success');window.dispatchEvent(new CustomEvent('v7s:state-changed'));setTimeout(()=>location.reload(),180);
  }
  document.addEventListener('click',event=>{
    const t=event.target.closest('button');if(!t)return;
    if(t.hasAttribute('data-import-open')){inject();pending=null;$('#importText').value='';$('#applyImport').disabled=true;$('#importReport').textContent='Paste JSON or choose a file.';$('#importDialog').showModal()}
    else if(t.hasAttribute('data-export-character'))download(`${(S.get().character.name||'character').replace(/[^a-z0-9_-]+/gi,'_')}.json`,S.get())
    else if(t.hasAttribute('data-export-roster'))download('character-sheet-roster.json',Roster&&Roster.exportAll?Roster.exportAll():{current:S.get()})
    else if(t.id==='previewImport')preview($('#importText').value)
    else if(t.id==='applyImport')applyImport()
    else if(t.id==='copyTemplate'){const text=JSON.stringify(template(),null,2);if(navigator.clipboard?.writeText)navigator.clipboard.writeText(text).then(()=>toast('Import template copied.')).catch(()=>{$('#importText').value=text});else $('#importText').value=text}
  },true);
  document.addEventListener('change',event=>{if(event.target.id!=='importFile')return;const file=event.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{$('#importText').value=String(reader.result||'');preview($('#importText').value)};reader.readAsText(file)},true);
  document.addEventListener('DOMContentLoaded',()=>{inject();patchCharacters()});S.subscribe(()=>setTimeout(patchCharacters,0));setTimeout(()=>{inject();patchCharacters()},160);
})();
