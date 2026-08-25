(function(){
  const S=window.V7SStateV7s,T=window.TreasureHunterDataV7s,D=window.V7SDerived,Catalog=window.V7SItemCatalog;
  if(!S||!T||!D)return;
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const signed=n=>Number(n)>=0?`+${Number(n)}`:`${Number(n)}`;
  const openActions=new Set();
  let scheduled=false,patching=false;
  const observer=new MutationObserver(()=>schedule());
  const observed=['#actionsPage','#featuresPage','#relicsPage','#gearPage','#npcsPage'];

  const CORE_ACTIONS=[
    {id:'core-attack',name:'Attack',action:'Action',group:'core',source:'Core',summary:'Make one attack with a weapon or Unarmed Strike. Extra Attack and other features can change how many attacks you make.'},
    {id:'core-unarmed',name:'Unarmed Strike — Damage',action:'Action',group:'core',source:'Core',summary:'Make a melee attack using Strength and Proficiency Bonus. On a hit, deal 1 + STR modifier Bludgeoning damage.'},
    {id:'core-grapple',name:'Grapple',action:'Action',group:'core',source:'Core',summary:'Use an Unarmed Strike to attempt a Grapple. The target makes a Strength or Dexterity saving throw against 8 + PB + STR modifier.'},
    {id:'core-shove',name:'Shove / Push',action:'Action',group:'core',source:'Core',summary:'Use an Unarmed Strike to push a target 5 ft. away or knock it Prone. The target makes a Strength or Dexterity saving throw against 8 + PB + STR modifier.'},
    {id:'core-dash',name:'Dash',action:'Action',group:'core',source:'Core',summary:'Gain extra movement for the current turn equal to your Speed after modifiers.'},
    {id:'core-disengage',name:'Disengage',action:'Action',group:'core',source:'Core',summary:'Your movement does not provoke Opportunity Attacks for the rest of the turn.'},
    {id:'core-dodge',name:'Dodge',action:'Action',group:'core',source:'Core',summary:'Until the start of your next turn, attacks against you have Disadvantage if you can see the attacker, and you make Dexterity saving throws with Advantage.'},
    {id:'core-help',name:'Help',action:'Action',group:'core',source:'Core',summary:'Assist another creature with a check or an attack when the Help action requirements are met.'},
    {id:'core-hide',name:'Hide',action:'Action',group:'core',source:'Core',summary:'Attempt to become hidden when the environment and line of sight allow it.'},
    {id:'core-influence',name:'Influence',action:'Action',group:'core',source:'Core',summary:'Try to influence another creature through roleplay and an appropriate Charisma check when the rules call for it.'},
    {id:'core-magic',name:'Magic',action:'Action',group:'core',source:'Core',summary:'Cast a spell, use a magic item, or activate a magical feature whose activation requires the Magic action.'},
    {id:'core-ready',name:'Ready',action:'Action',group:'core',source:'Core',summary:'Choose a perceivable trigger and prepare an action to take as a Reaction when that trigger occurs.'},
    {id:'core-search',name:'Search',action:'Action',group:'core',source:'Core',summary:'Use an appropriate ability or skill to find something concealed or not obvious.'},
    {id:'core-study',name:'Study',action:'Action',group:'core',source:'Core',summary:'Use an appropriate Intelligence-based check to recall or discover useful information.'},
    {id:'core-utilize',name:'Utilize',action:'Action',group:'core',source:'Core',summary:'Use a nonmagical object whose use requires an action.'},
    {id:'core-object',name:'Simple Object Interaction',action:'Free',group:'free',source:'Core',summary:'A simple interaction such as drawing, stowing, opening, or handling an object can often be done without spending an Action.'}
  ];
  const LOCATION_LABELS={equipped:'Equipped',worn:'Worn',carried:'Carried',backpack:'Backpack',back:'On back',ground:'On ground',storage:'Storage'};

  const state=()=>S.get();
  const level=()=>D.level();
  const pb=()=>D.pb();
  function observe(){observed.forEach(sel=>{const el=$(sel);if(el)observer.observe(el,{childList:true,subtree:true})})}
  function schedule(){if(scheduled||patching)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;patchAll()})}
  function patchAll(){if(patching)return;patching=true;observer.disconnect();try{renderActions();patchFeatures();patchRelics();patchGear();patchNpcDelete()}finally{patching=false;observe()}}
  function dispatchDerived(){window.dispatchEvent(new CustomEvent('v7s:state-changed'))}
  function toast(message,type='success'){const host=$('#toastHost');if(!host)return;const el=document.createElement('div');el.className=`toast ${type}`;el.textContent=message;host.appendChild(el);setTimeout(()=>el.remove(),2000)}

  function actionCode(a){if(a==='Action')return'A';if(a==='Bonus Action')return'BA';if(a==='Reaction')return'R';if(a==='Free')return'FREE';if(a==='Other')return'OTHER';if(a==='Special')return'SA';return'PASS'}
  function badgeClass(a){const c=actionCode(a);return c==='A'?'a':c==='BA'?'ba':c==='R'?'r':c==='FREE'?'free':c==='OTHER'?'other':'pass'}
  function relicRows(){return (state().classes.treasureHunter.relics||[]).map((x,i)=>typeof x==='string'?{id:x,prepared:false,used:0,stateIndex:i}:{prepared:false,used:0,...x,stateIndex:i}).map(x=>({...((T.relics||[]).find(r=>r.id===x.id)||{}),...x})).filter(x=>x.id)}
  function relicMax(r){return r.uses==='PB'?pb():Math.max(0,Number(r.charges)||0)}
  function propNames(raw){return (raw?.properties||[]).map(x=>typeof x==='string'?x:(x.name||x.index||'')).filter(Boolean)}
  function isInventoryWeapon(it){const r=it?.raw||{},text=`${it?.category||''} ${r.weapon_category||''} ${r.equipment_category?.name||''}`;return !!r.damage?.damage_dice||/weapon/i.test(text)}
  function itemAttackAbility(it){const r=it.raw||{},props=propNames(r).map(x=>x.toLowerCase());if(String(r.weapon_range||'').toLowerCase()==='ranged'||props.some(x=>x.includes('finesse')))return'DEX';return'STR'}
  function weaponSummary(it){const r=it.raw||{},a=itemAttackAbility(it),enh=D.weaponEnhancement(it),attack=D.mod(a)+pb()+enh,dice=r.damage?.damage_dice||it.damage||'',type=r.damage?.damage_type?.name||it.damageType||'',damageBonus=D.mod(a)+enh;return `Attack ${signed(attack)} • ${dice}${damageBonus?` ${signed(damageBonus)}`:''} ${type}`.trim()}
  function legacyWeaponActions(){return (state().character.gear.weapons||[]).map(w=>({id:`weapon-${w.id||w.name}`,name:w.name,action:'Action',group:'weapon',source:'Weapon',priority:0,summary:`Attack ${signed(D.mod(w.attackAbility||'DEX')+pb())} • ${w.damage||''} ${w.damageType||''} ${signed(D.mod(w.attackAbility||'DEX'))}${w.mastery?` • Mastery: ${w.mastery}`:''}`}))}
  function inventoryWeaponActions(){return (state().character.gear.inventory||[]).map((it,i)=>({it,i})).filter(x=>x.it&&typeof x.it==='object'&&x.it.location==='equipped'&&isInventoryWeapon(x.it)).map(({it,i})=>({id:`item-weapon-${i}`,name:it.name||'Weapon',action:'Action',group:'weapon',source:'Weapon',priority:0,summary:weaponSummary(it),detail:it.description||'',itemIndex:i}))}
  function spellActions(){return (state().character.spells||[]).filter(x=>x&&x.prepared!==false).map((x,i)=>({id:`spell-${x.id||i}`,name:x.name||'Spell',action:x.action||'Action',group:'spell',source:'Spell',priority:1,summary:x.summary||x.description||'',detail:x.description||x.summary||'',spellIndex:i}))}
  function classActions(){const out=[];(T.features||[]).filter(f=>f.level<=level()).forEach(f=>{if(f.action&&!['Passive','Resource'].includes(f.action))out.push({id:`feature-${f.id}`,name:f.name,action:f.action,group:'class',source:'Feature',priority:3,summary:f.summary||f.fullText||'',detail:f.fullText||f.summary||'',cost:Number(f.cost)||0,featureId:f.id,featureUses:Number(f.uses)||0,recovery:f.recovery||''});(f.actions||[]).forEach((a,j)=>out.push({id:`feature-${f.id}-${a.id||j}`,name:a.name||f.name,action:a.action||'Action',group:'class',source:f.name,priority:3,summary:a.summary||a.fullText||'',detail:a.fullText||a.summary||'',cost:Number(a.cost??f.cost)||0,featureId:f.id,featureUses:Number(a.uses??f.uses)||0,recovery:a.recovery||f.recovery||''}))});return out}
  function relicActions(){return relicRows().filter(r=>r.prepared&&r.action&&r.action!=='Passive').map(r=>({id:`relic-${r.id}`,name:r.name,action:r.action,group:'relic',source:'Relic',priority:2,summary:r.summary||r.fullText||'',detail:r.fullText||r.summary||'',relicIndex:r.stateIndex,relicMax:relicMax(r),relicUsed:Number(r.used)||0}))}
  function customActions(){return (state().character.customActions||[]).map((a,i)=>({...a,id:a.id||`custom-${i}`,source:a.source||'Custom',group:a.group||'custom',priority:5,custom:true}))}
  function allActions(){return [...legacyWeaponActions(),...inventoryWeaponActions(),...spellActions(),...relicActions(),...classActions(),...CORE_ACTIONS.map(x=>({...x,priority:4})),...customActions()]}
  function actionMatches(a,filter){if(filter==='all')return true;if(filter==='a')return a.action==='Action';if(filter==='ba')return a.action==='Bonus Action';if(filter==='r')return a.action==='Reaction';if(filter==='free')return a.action==='Free';if(filter==='other')return a.action==='Other';return true}
  function actionSort(a,b,mode,favs){const fa=favs.includes(a.id),fb=favs.includes(b.id);if(mode==='favorite'&&fa!==fb)return fa?-1:1;if(mode==='name')return a.name.localeCompare(b.name);if(mode==='source')return String(a.source).localeCompare(String(b.source))||a.name.localeCompare(b.name);return (a.priority??9)-(b.priority??9)||['Action','Bonus Action','Reaction','Free','Other'].indexOf(a.action)-['Action','Bonus Action','Reaction','Free','Other'].indexOf(b.action)||a.name.localeCompare(b.name)}
  function dotMarkup(max,used,attrs){if(!max)return'';const left=Math.max(0,max-used);return `<div class="action-resource"><span>${left}/${max}</span><div class="action-resource-dots">${Array.from({length:max},(_,i)=>`<button type="button" class="action-charge-dot ${i<left?'filled':''}" ${attrs} data-charge-state="${i<left?'full':'empty'}" aria-label="${i<left?'Use':'Restore'} charge"></button>`).join('')}</div></div>`}
  function actionResource(a){let out='';if(a.featureUses){const used=Math.max(0,Number(state().classes.treasureHunter.featureUses?.[a.featureId])||0);out+=dotMarkup(a.featureUses,used,`data-polish-feature-charge="${esc(a.featureId)}"`)}if(a.relicMax)out+=dotMarkup(a.relicMax,a.relicUsed,`data-polish-relic-charge="${a.relicIndex}"`);if(a.cost)out+=`<button type="button" class="action-cool-spend" data-polish-cool-spend="${a.cost}">−${a.cost} Cool</button>`;return out}
  function renderActions(){
    const root=$('#actionsPage');if(!root)return;const ui=state().ui||(state().ui={}),filter=ui.actionFilter||'all',sort=ui.actionSort||'combat',favs=ui.favoriteActions||[],rows=allActions().filter(a=>actionMatches(a,filter)).sort((a,b)=>actionSort(a,b,sort,favs));
    const filters=[['all','ALL'],['a','A'],['ba','BA'],['r','R'],['free','FREE'],['other','OTHER']].map(([k,l])=>`<button type="button" class="filter-btn ${filter===k?'active':''}" data-polish-action-filter="${k}">${l}</button>`).join('');
    const cards=rows.map(a=>{const open=openActions.has(a.id),fav=favs.includes(a.id),resources=actionResource(a);return `<article class="action-quick-card ${open?'open':''}" data-polish-action-card="${esc(a.id)}"><div class="action-quick-head"><button type="button" class="action-favorite ${fav?'on':''}" data-polish-action-favorite="${esc(a.id)}" aria-label="Favorite">★</button><button type="button" class="action-expand" data-polish-action-toggle="${esc(a.id)}"><span><strong>${esc(a.name)}</strong><small>${esc(a.source||'')}</small></span><span class="badge ${badgeClass(a.action)}">${actionCode(a.action)}</span></button></div>${resources?`<div class="action-resource-strip">${resources}</div>`:''}<div class="action-quick-detail"><p>${esc(a.detail||a.summary||'')}</p>${a.custom?`<button type="button" class="small-btn danger" data-polish-delete-custom="${esc(a.id)}">Delete custom action</button>`:''}</div></article>`}).join('')||'<div class="empty">No actions in this group.</div>';
    const html=`<div class="page-intro"><span>ACTIONS</span><small>Quick combat controls</small></div><section class="section"><div class="section-head"><h2>Actions</h2><select class="action-sort" data-polish-action-sort aria-label="Sort actions"><option value="combat" ${sort==='combat'?'selected':''}>Combat priority</option><option value="favorite" ${sort==='favorite'?'selected':''}>Favorites</option><option value="name" ${sort==='name'?'selected':''}>A–Z</option><option value="source" ${sort==='source'?'selected':''}>Source</option></select></div><div class="filters">${filters}</div><div class="action-toolbar-row"><button type="button" class="small-btn primary" data-new-action>+ Custom Action</button><span class="muted">Weapons, prepared relics and spells sort first by default.</span></div><div class="action-quick-list">${cards}</div></section>`;
    if(root.innerHTML!==html)root.innerHTML=html;
  }

  function featureByRow(row){return (T.features||[]).find(f=>f.id===row.dataset.row)}
  function skillOptions(){return Object.keys(state().character.skills||{}).filter(k=>Number(state().character.skills[k])>0)}
  function weaponOptions(){const a=(state().character.gear.weapons||[]).map(x=>x.name);(state().character.gear.inventory||[]).forEach(x=>{if(x&&typeof x==='object'&&isInventoryWeapon(x))a.push(x.name)});return [...new Set(a.filter(Boolean))]}
  function choiceArray(def){const th=state().classes.treasureHunter;if(def.key==='expertise')return[th.expertise||''];const v=th[def.key];return Array.isArray(v)?v:Array(def.count).fill('')}
  function choiceOptions(def,val,index){
    if(def.type==='select'){const vals=T[def.source]||[];return `<select data-polish-feature-choice="${esc(def.key)}" data-choice-index="${index}"><option value="">Choose…</option>${vals.map(x=>`<option value="${esc(x)}" ${x===val?'selected':''}>${esc(x)}</option>`).join('')}</select>`}
    if(def.type==='skill'){const vals=skillOptions();return `<select data-polish-feature-choice="${esc(def.key)}" data-choice-index="${index}"><option value="">Choose proficient skill…</option>${vals.map(x=>`<option value="${esc(x)}" ${x===val?'selected':''}>${esc(x)}</option>`).join('')}</select>`}
    if(def.type==='weapon'){const vals=weaponOptions();return `<select data-polish-feature-choice="${esc(def.key)}" data-choice-index="${index}"><option value="">Choose weapon…</option>${vals.map(x=>`<option value="${esc(x)}" ${x===val?'selected':''}>${esc(x)}</option>`).join('')}</select>`}
    return `<input data-polish-feature-choice="${esc(def.key)}" data-choice-index="${index}" value="${esc(val)}" placeholder="${esc(def.placeholder||'Choose…')}">`;
  }
  function featureQuickHtml(f){
    const defs=T.choiceDefinitions?.[f.id]||[],th=state().classes.treasureHunter,parts=[];let missing=0;
    defs.forEach(def=>{const vals=choiceArray(def),controls=Array.from({length:def.count},(_,i)=>{const v=vals[i]||'';if(!v)missing++;return choiceOptions(def,v,i)}).join('');parts.push(`<div class="feature-inline-choice"><span>${esc(def.label)}</span>${controls}</div>`)});
    if(Number(f.uses)>0){const max=Number(f.uses),used=Math.max(0,Math.min(max,Number(th.featureUses?.[f.id])||0)),left=max-used;parts.push(`<div class="feature-inline-uses"><span>${left}/${max} uses</span><div>${Array.from({length:max},(_,i)=>`<button type="button" class="feature-quick-dot ${i<left?'filled':''}" data-polish-feature-use="${esc(f.id)}" data-use-state="${i<left?'full':'empty'}"></button>`).join('')}</div></div>`)}
    return{html:parts.length?`<div class="feature-quick-strip">${parts.join('')}</div>`:'',missing};
  }
  function patchFeatures(){
    const root=$('#featuresPage');if(!root)return;root.querySelectorAll('.feature-level-heading,.feature-quick-strip,.choice-warning').forEach(x=>x.remove());
    const list=root.querySelector('.list');if(!list)return;const rows=[...list.querySelectorAll('.row-card')];
    rows.forEach(row=>{row.classList.remove('needs-choice');const f=featureByRow(row);if(!f)return;const q=featureQuickHtml(f);if(q.html)row.querySelector('.row-main')?.insertAdjacentHTML('afterend',q.html);if(q.missing){row.classList.add('needs-choice');row.querySelector('.row-main>span')?.insertAdjacentHTML('beforeend',`<span class="choice-warning" title="Choice required">!</span>`)}const defs=T.choiceDefinitions?.[f.id]||[];defs.forEach(def=>{const vals=choiceArray(def);row.querySelectorAll(`[data-feature-choice="${CSS.escape(def.key)}"]`).forEach((el,i)=>{if(el.value!==String(vals[i]||''))el.value=vals[i]||''})})});
    rows.sort((ra,rb)=>{const a=featureByRow(ra),b=featureByRow(rb);if(!a||!b)return 0;const ai=(T.choiceDefinitions?.[a.id]?.length||Number(a.uses)>0)?0:(a.action!=='Passive'||(a.actions||[]).length)?1:2,bi=(T.choiceDefinitions?.[b.id]?.length||Number(b.uses)>0)?0:(b.action!=='Passive'||(b.actions||[]).length)?1:2;return a.level-b.level||ai-bi||a.name.localeCompare(b.name)});
    let last=-1;rows.forEach(row=>{const f=featureByRow(row);if(!f)return;if(f.level!==last){const h=document.createElement('div');h.className='feature-level-heading';h.textContent=`Level ${f.level}`;list.appendChild(h);last=f.level}list.appendChild(row)});
  }

  function patchRelics(){
    const open=new Set(state().ui.openRelics||[]);$$('#relicsPage .relic-card').forEach(card=>{const idx=Number(card.querySelector('[data-relic-prepared]')?.dataset.relicPrepared??card.querySelector('[data-relic-remove]')?.dataset.relicRemove);if(!Number.isFinite(idx))return;const raw=state().classes.treasureHunter.relics?.[idx],id=typeof raw==='string'?raw:raw?.id;if(!id)return;card.dataset.relicId=id;const top=card.querySelector('.relic-top');if(!top)return;top.classList.add('polish-relic-toggle');top.dataset.polishRelicToggle=id;top.setAttribute('role','button');top.tabIndex=0;if(!top.querySelector('.relic-chevron'))top.insertAdjacentHTML('beforeend','<span class="relic-chevron">›</span>');let charge=card.querySelector(':scope > .charge-row');if(charge&&charge.previousElementSibling!==top)top.after(charge);let body=card.querySelector(':scope > .relic-body');if(!body){body=document.createElement('div');body.className='relic-body';[...card.children].filter(x=>x!==top&&x!==charge&&x!==body).forEach(x=>body.appendChild(x));card.appendChild(body)}const isOpen=open.has(id);card.classList.toggle('relic-open',isOpen);top.querySelector('.relic-chevron').textContent=isOpen?'⌄':'›';const merged={...((T.relics||[]).find(r=>r.id===id)||{}),...(typeof raw==='object'?raw:{})},max=relicMax(merged),used=Number(merged.used)||0,left=Math.max(0,max-used);if(charge){const label=charge.querySelector('span');if(label)label.textContent=`${left}/${max}`;charge.querySelectorAll('.charge-dot').forEach((dot,i)=>{dot.classList.toggle('filled',i<left);dot.dataset.chargeState=i<left?'full':'empty'})}});
  }

  function locationSelect(index,value){return `<select data-polish-item-location="${index}">${Object.entries(LOCATION_LABELS).map(([k,v])=>`<option value="${k}" ${k===value?'selected':''}>${v}</option>`).join('')}</select>`}
  function patchGear(){
    const inv=state().character.gear.inventory||[];$$('#gearPage .gear-card').forEach(card=>{const toggle=card.querySelector('[data-toggle-inventory]');if(!toggle)return;const idx=Number(toggle.dataset.toggleInventory),raw=inv[idx],it=typeof raw==='string'?{name:raw,location:'backpack',quantity:1}:raw;if(!it)return;const meta=toggle.querySelector('.row-meta');if(meta&&!meta.querySelector('.item-location-chip'))meta.insertAdjacentHTML('beforeend',`<span class="item-location-chip">${esc(LOCATION_LABELS[it.location]||'Backpack')}</span>`);else if(meta?.querySelector('.item-location-chip'))meta.querySelector('.item-location-chip').textContent=LOCATION_LABELS[it.location]||'Backpack';const detail=card.querySelector('.inventory-detail');if(!detail)return;let editor=detail.querySelector('.item-state-editor');const effect=D.itemEffects(it),activeText=effect.active?'Active item effects are applied to derived stats.':it.attunement&&['equipped','worn'].includes(it.location)&&!it.isAttuned?'Requires attunement before its effects apply.':'Stored items do not modify your stats.';const html=`<div class="item-state-grid"><label>Location${locationSelect(idx,it.location||'backpack')}</label><label>Quantity<input type="number" min="1" value="${Number(it.quantity)||1}" data-polish-item-quantity="${idx}"></label>${it.attunement?`<label class="item-attune"><input type="checkbox" data-polish-item-attuned="${idx}" ${it.isAttuned?'checked':''}> Attuned</label>`:''}</div><small class="item-effect-note ${effect.active?'active':''}">${esc(activeText)}</small>`;if(!editor){editor=document.createElement('div');editor.className='item-state-editor';detail.prepend(editor)}if(editor.innerHTML!==html)editor.innerHTML=html});
  }

  function ensureNpcDeleteButton(){const dialog=$('#npcDialog'),menu=dialog?.querySelector('menu');if(!menu)return null;let b=$('#npcDeleteBtn');if(!b){b=document.createElement('button');b.id='npcDeleteBtn';b.type='button';b.className='danger npc-dialog-delete';b.textContent='Delete NPC';menu.prepend(b)}return b}
  function updateNpcDeleteVisibility(){const b=ensureNpcDeleteButton();if(!b)return;b.hidden=$('#npcId')?.value===''}
  function patchNpcDelete(){$$('#npcsPage [data-delete-npc]').forEach(b=>b.remove());updateNpcDeleteVisibility()}
  function renumberNpcCards(){const cards=$$('#npcsPage .npc-card');cards.forEach((card,i)=>{card.querySelectorAll('[data-edit-npc]').forEach(x=>x.dataset.editNpc=String(i));card.querySelectorAll('[data-npc-favorite]').forEach(x=>x.dataset.npcFavorite=String(i))});if(!cards.length){const grid=$('#npcsPage .npc-grid');if(grid)grid.innerHTML='<div class="empty">No NPCs yet.</div>'}}

  function changeFeatureChoice(el){const key=el.dataset.polishFeatureChoice,i=Number(el.dataset.choiceIndex)||0,val=el.value;S.update(s=>{const th=s.classes.treasureHunter;if(key==='expertise')th.expertise=val;else{if(!Array.isArray(th[key]))th[key]=[];th[key][i]=val}});S.flush();schedule()}
  function changeFeatureUse(el){const id=el.dataset.polishFeatureUse,f=(T.features||[]).find(x=>x.id===id);if(!f)return;const max=Number(f.uses)||1,delta=el.dataset.useState==='full'?1:-1;S.update(s=>{const u=s.classes.treasureHunter.featureUses||(s.classes.treasureHunter.featureUses={});u[id]=Math.max(0,Math.min(max,(Number(u[id])||0)+delta))});S.flush();schedule()}
  function changeRelicCharge(el){const i=Number(el.dataset.polishRelicCharge),delta=el.dataset.chargeState==='full'?1:-1;S.update(s=>{let x=s.classes.treasureHunter.relics[i];if(typeof x==='string'){x={id:x,prepared:false,used:0};s.classes.treasureHunter.relics[i]=x}if(!x)return;const r={...((T.relics||[]).find(y=>y.id===x.id)||{}),...x},max=relicMax(r);x.used=Math.max(0,Math.min(max,(Number(x.used)||0)+delta))});S.flush();schedule()}

  document.addEventListener('click',e=>{
    const t=e.target.closest('button,[data-polish-relic-toggle]');if(!t)return;
    if(t.dataset.polishActionFilter){e.preventDefault();e.stopImmediatePropagation();S.update(s=>s.ui.actionFilter=t.dataset.polishActionFilter);S.flush();renderActions();return}
    if(t.dataset.polishActionFavorite){e.preventDefault();e.stopImmediatePropagation();S.update(s=>{const a=s.ui.favoriteActions||(s.ui.favoriteActions=[]),id=t.dataset.polishActionFavorite,i=a.indexOf(id);i>=0?a.splice(i,1):a.push(id)});S.flush();renderActions();return}
    if(t.dataset.polishActionToggle){e.preventDefault();e.stopImmediatePropagation();const id=t.dataset.polishActionToggle;openActions.has(id)?openActions.delete(id):openActions.add(id);renderActions();return}
    if(t.dataset.polishFeatureCharge){e.preventDefault();e.stopImmediatePropagation();changeFeatureUse(t);return}
    if(t.dataset.polishRelicCharge!=null){e.preventDefault();e.stopImmediatePropagation();changeRelicCharge(t);return}
    if(t.dataset.polishFeatureUse){e.preventDefault();e.stopImmediatePropagation();changeFeatureUse(t);return}
    if(t.dataset.polishCoolSpend){e.preventDefault();e.stopImmediatePropagation();const cost=Number(t.dataset.polishCoolSpend)||0,total=T.coolTotal(level()),used=Number(state().classes.treasureHunter.coolUsed)||0;if(total-used<cost){toast('Not enough Cool Points.','warn');return}S.update(s=>s.classes.treasureHunter.coolUsed=Math.min(total,(Number(s.classes.treasureHunter.coolUsed)||0)+cost));S.flush();schedule();return}
    if(t.dataset.polishDeleteCustom){e.preventDefault();e.stopImmediatePropagation();S.update(s=>s.character.customActions=s.character.customActions.filter(a=>a.id!==t.dataset.polishDeleteCustom));S.flush();renderActions();return}
    if(t.dataset.polishRelicToggle){if(e.target.closest('button,select,input')&&e.target!==t)return;e.preventDefault();const id=t.dataset.polishRelicToggle;S.update(s=>{const a=s.ui.openRelics||(s.ui.openRelics=[]),i=a.indexOf(id);i>=0?a.splice(i,1):a.push(id)});S.flush();patchRelics();return}
    if(t.id==='npcDeleteBtn'){e.preventDefault();e.stopImmediatePropagation();const idx=Number($('#npcId')?.value);if(!Number.isFinite(idx))return;if(!confirm('Delete this NPC? This cannot be undone.'))return;S.update(s=>s.campaign.npcs.splice(idx,1));S.flush();$('#npcDialog')?.close();const cards=$$('#npcsPage .npc-card');cards[idx]?.remove();renumberNpcCards();toast('NPC deleted.');return}
    if(t.dataset.editNpc!=null){setTimeout(updateNpcDeleteVisibility,0)}
  },true);

  document.addEventListener('change',e=>{
    const el=e.target;
    if(el.dataset.polishActionSort){S.update(s=>s.ui.actionSort=el.value);S.flush();renderActions();return}
    if(el.dataset.polishFeatureChoice){changeFeatureChoice(el);return}
    if(el.dataset.polishItemLocation!=null){const i=Number(el.dataset.polishItemLocation);S.update(s=>{let it=s.character.gear.inventory[i];if(typeof it==='string'){it={name:it,location:'backpack',quantity:1,modifiers:[]};s.character.gear.inventory[i]=it}if(it)it.location=el.value});S.flush();dispatchDerived();schedule();return}
    if(el.dataset.polishItemQuantity!=null){const i=Number(el.dataset.polishItemQuantity);S.update(s=>{let it=s.character.gear.inventory[i];if(typeof it==='string'){it={name:it,location:'backpack',quantity:1,modifiers:[]};s.character.gear.inventory[i]=it}if(it)it.quantity=Math.max(1,Number(el.value)||1)});S.flush();schedule();return}
    if(el.dataset.polishItemAttuned!=null){const i=Number(el.dataset.polishItemAttuned);S.update(s=>{const it=s.character.gear.inventory[i];if(it&&typeof it==='object')it.isAttuned=!!el.checked});S.flush();dispatchDerived();schedule();return}
  },true);

  document.addEventListener('keydown',e=>{const t=e.target.closest?.('[data-polish-relic-toggle]');if(t&&(e.key==='Enter'||e.key===' ')){e.preventDefault();t.click()}});
  S.subscribe(()=>schedule());window.addEventListener('v7s:state-changed',schedule);
  document.addEventListener('DOMContentLoaded',()=>{observe();patchAll();ensureNpcDeleteButton()});
})();