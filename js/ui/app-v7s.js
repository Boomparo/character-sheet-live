(function(){
  const S=window.V7SStateV7s,T=window.TreasureHunterDataV7s;
  T.relics=window.TreasureHunterRelicsV7s||[];
  const PAGES=['character','actions','skills','features','relics','gear','npcs'];
  const TITLES=['CHARACTER','ACTIONS','SKILLS','FEATURES','RELICS','GEAR','NPCs'];
  const SUBTITLES=['Přehled postavy','Boj a aktivní schopnosti','Skills & Proficiencies','Class & Subclass Features','Okultní sběratel','Výbava a inventář','Kartotéka postav'];
  const ALL_SKILLS={Acrobatics:'DEX','Animal Handling':'WIS',Arcana:'INT',Athletics:'STR',Deception:'CHA',History:'INT',Insight:'WIS',Intimidation:'CHA',Investigation:'INT',Medicine:'WIS',Nature:'INT',Perception:'WIS',Performance:'CHA',Persuasion:'CHA',Religion:'INT','Sleight of Hand':'DEX',Stealth:'DEX',Survival:'WIS'};
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const signed=S.signed,mod=S.modifier;
  let actionFilter='all',featureSearch='',featureFilter='all',hpAmount=1,raf=0,savePageTimer=0;

  const state=()=>S.get();
  const level=()=>Math.max(1,Math.min(20,Number(state().character.level)||1));
  const pb=()=>T.pb(level());
  const coolTotal=()=>T.coolTotal(level());
  const coolUsed=()=>Math.max(0,Math.min(coolTotal(),Number(state().classes.treasureHunter.coolUsed)||0));
  const coolAvailable=()=>Math.max(0,coolTotal()-coolUsed());
  const coolDie=()=>T.coolDie(level());
  const ability=a=>Number(state().character.abilities[a])||10;
  const abilityMod=a=>mod(ability(a));
  const saveMod=a=>abilityMod(a)+(T.saves.includes(a)?pb():0);
  const initiative=()=>abilityMod('DEX')+(Number(state().character.initiativeBonus)||0);
  const relicDC=()=>8+pb()+abilityMod('INT');
  const whipDC=()=>8+pb()+abilityMod('DEX');
  const relicLimit=()=>T.relicLimit(level());

  function selectedRelics(){return (state().classes.treasureHunter.relics||[]).map(r=>typeof r==='string'?{id:r,prepared:false,used:0}:{prepared:false,used:0,...r})}
  function relicById(id){return T.relics.find(r=>r.id===id)}
  function activeRelics(){return selectedRelics().filter(r=>r.prepared).map(r=>({...relicById(r.id),...r})).filter(Boolean)}
  function derivedSpeed(){return state().character.speed+activeRelics().reduce((n,r)=>n+(Number(r.bonusSpeed)||0),0)}
  function derivedSenses(){const out=[...(state().character.proficiencies.senses||[])];activeRelics().forEach(r=>{if(r.truesight)out.push(`Truesight ${r.truesight} ft`);if(r.darkvision)out.push(`Darkvision +${r.darkvision} ft`)});return [...new Set(out)]}
  function derivedDefenses(){const out=[...(state().character.proficiencies.defenses||[])];activeRelics().forEach(r=>{if(r.id==='last-exorcists-testament')out.push('Immune: Charmed, Frightened');if(r.choice==='damageResistance')out.push('Resistance: zvolený typ damage')});return [...new Set(out)]}
  function pageIntro(title,subtitle){return `<div class="page-intro"><span>${esc(title)}</span><small>${esc(subtitle)}</small></div>`}
  function stat(label,value,cls='',attrs=''){return `<button class="stat ${cls}" ${attrs}><span>${esc(label)}</span><b>${esc(value)}</b></button>`}
  function section(title,body,right=''){return `<section class="section"><div class="section-head"><h2>${title}</h2>${right}</div>${body}</section>`}
  function actionCode(a){if(a==='Action')return'A';if(a==='Bonus Action')return'BA';if(a==='Reaction')return'R';if(a==='Free')return'FREE';if(a==='Special')return'SA';return a==='Resource'?'RES':'PASS'}
  function badgeClass(a){const c=actionCode(a);return c==='A'?'a':c==='BA'?'ba':c==='R'?'r':'pass'}
  function rowCard(id,title,meta,detail,action='Passive',extra=''){return `<article class="row-card" data-row="${esc(id)}"><button class="row-main" data-toggle-row="${esc(id)}"><span><strong>${esc(title)}</strong><span class="row-meta">${meta}</span></span><span class="badge ${badgeClass(action)}">${esc(actionCode(action))}</span></button><div class="row-detail">${detail}${extra}</div></article>`}

  function allActions(){
    const out=[];
    T.features.filter(f=>f.level<=level()).forEach(f=>{
      if(f.action&&!['Passive','Resource'].includes(f.action))out.push({id:f.id,name:f.name,action:f.action,summary:f.summary,cost:f.cost||0,source:f.name,uses:f.uses,recovery:f.recovery});
      (f.actions||[]).forEach(a=>out.push({...a,source:f.name,level:f.level}));
    });
    return out;
  }
  function actionMatch(a){if(actionFilter==='all')return true;const c=actionCode(a.action).toLowerCase();if(actionFilter==='a')return c==='a';if(actionFilter==='ba')return c==='ba';if(actionFilter==='r')return c==='r';return actionFilter==='special'?['sa','free'].includes(c):true}
  function featureUsesLeft(f){if(!f.uses)return null;const used=Number(state().classes.treasureHunter.featureUses?.[f.id])||0;return Math.max(0,f.uses-used)}
  function featureById(id){return T.features.find(f=>f.id===id)}
  function actionSourceFeature(a){return T.features.find(f=>f.name===a.source)||featureById(a.id)}

  function renderTop(){const s=state();$('#topName').textContent=s.character.name||'Nová postava';$('#topClass').textContent=`Treasure Hunter ${level()} • PB ${signed(pb())}`;$('#hudHp').textContent=`${s.character.hp.current}/${s.character.hp.max}`;$('#hudAc').textContent=s.character.ac;$('#hudCool').textContent=level()>=2?`${coolAvailable()}/${coolTotal()} ${coolDie()}`:`— ${coolDie()}`}

  function renderCharacter(){
    const s=state(),hp=s.character.hp;
    const portrait=s.character.portrait?`<img class="hero-portrait" src="${s.character.portrait}" alt="Portrét postavy">`:`<button class="hero-portrait placeholder" data-open-edit aria-label="Přidat portrét">＋</button>`;
    const abilities=S.A.map(a=>`<div class="ability"><div class="abbr">${a}</div><div class="mod">${signed(abilityMod(a))}</div><div class="score">${ability(a)}</div><div class="save ${T.saves.includes(a)?'prof':''}">${T.saves.includes(a)?'●':'○'} ${signed(saveMod(a))}</div></div>`).join('');
    let dots='';for(let i=0;i<coolTotal();i++)dots+=`<button class="cool-dot ${i<coolAvailable()?'filled':''}" data-cool-set="${i+1}"></button>`;
    const cond=(s.character.conditions||[]).map(c=>`<span class="chip accent">${esc(c)} <button data-remove-condition="${esc(c)}">×</button></span>`).join('')||'<span class="muted">Žádné conditions</span>';
    const sense=[...derivedSenses(),...derivedDefenses()];
    $('#characterPage').innerHTML=`${pageIntro('CHARACTER','Přehled postavy')}
      ${section('',`<div class="character-hero">${portrait}<div class="hero-copy"><span class="eyebrow">TREASURE HUNTER ${level()}</span><h1>${esc(s.character.name||'Nová postava')}</h1><p>${esc(s.character.race||'')}</p></div></div><div class="stat-grid hero-stats">${stat('HP',`${hp.current}/${hp.max}`,'hp-stat','data-open-hp')}${stat('AC',s.character.ac)}${stat('INIT',signed(initiative()))}${stat('SPEED',`${derivedSpeed()} ft`)}</div><div class="hero-actions"><button class="small-btn ${s.character.inspiration?'primary':''}" data-inspiration>✦ Inspiration</button><button class="small-btn" data-short-rest>Short Rest</button><button class="small-btn" data-long-rest>Long Rest</button></div>`)}
      ${section('Cool',level()<2?`<div class="resource-row"><strong>${coolDie()}</strong><span class="muted">Cool Points získáš na 2. levelu.</span></div>`:`<div class="resource-row"><div><div class="eyebrow">COOL POINTS • ${coolAvailable()} / ${coolTotal()} • ${coolDie()}</div><div class="cool-dots">${dots}</div></div><div class="tiny-controls"><button data-cool="-1">+</button><button data-cool="1">−</button></div></div>`)}
      ${section('Abilities & Saving Throws',`<div class="ability-grid">${abilities}</div>`)}
      ${section('Class DC',`<div class="stat-grid">${stat('WHIP DC',whipDC(),'compact')}${stat('ROPE DC',whipDC(),'compact')}${stat('RELIC DC',relicDC(),'compact')}${stat('PB',signed(pb()),'compact')}</div>`)}
      ${sense.length?section('Senses & Defenses',`<div class="condition-strip">${sense.map(x=>`<span class="chip brass">${esc(x)}</span>`).join('')}</div>`):''}
      ${section('Conditions',`<div class="condition-strip">${cond}</div><div class="inline-form top-gap"><input id="conditionInput" class="search-inline" placeholder="Přidat condition"><button class="small-btn" data-add-condition>+</button></div>`)}`;
  }

  function weaponRows(){return (state().character.gear.weapons||[]).map(w=>{const a=w.attackAbility||'DEX',atk=abilityMod(a)+pb();return rowCard(`weapon-${w.id}`,w.name,`<span>${signed(atk)} to hit</span><span>${esc(w.damage)} + ${signed(abilityMod(a))}</span>`,`Attack bonus: ${signed(atk)}\n${a} ${signed(abilityMod(a))} + PB ${signed(pb())}\nDamage: ${esc(w.damage)} + ${signed(abilityMod(a))} ${esc(w.damageType||'')}\n${w.mastery?`Mastery: ${esc(w.mastery)}`:''}`,'Action')}).join('')||'<div class="empty">Žádné zbraně.</div>'}
  function renderActions(){
    const filters=[['all','ALL'],['a','A'],['ba','BA'],['r','R'],['special','SPECIAL']].map(([k,l])=>`<button class="filter-btn ${actionFilter===k?'active':''}" data-action-filter="${k}">${l}</button>`).join('');
    const rows=allActions().filter(actionMatch).map(a=>{const f=actionSourceFeature(a),left=f?featureUsesLeft(f):null,meta=`<span>${esc(a.source||'Treasure Hunter')}</span>${a.cost?`<span>${a.cost} Cool</span>`:''}${left!=null?`<span>${left}/${f.uses}</span>`:''}`;let controls='';if(a.cost)controls+=`<button class="small-btn primary" data-use-action="${esc(a.id)}">Použít • −${a.cost} Cool</button>`;if(left!=null)controls+=`<button class="small-btn primary" data-use-feature="${esc(f.id)}" ${left<=0?'disabled':''}>Použít • ${left}/${f.uses}</button>`;return rowCard(a.id,a.name,meta,esc(a.summary),a.action,controls?`<div class="detail-actions">${controls}</div>`:'')}).join('')||'<div class="empty">Pro tento filtr nejsou žádné akce.</div>';
    const relicActions=activeRelics().filter(r=>r.action!=='Passive').map(r=>rowCard(`relic-${r.id}`,r.name,`<span>RELIKVIe</span>${r.charges?`<span>${Math.max(0,r.charges-(r.used||0))}/${r.charges}</span>`:''}`,esc(r.summary),r.action)).join('');
    $('#actionsPage').innerHTML=`${pageIntro('ACTIONS','Boj a aktivní schopnosti')}${section('Filter',`<div class="filters">${filters}</div>`)}${section('Attacks',`<div class="list">${weaponRows()}</div>`)}${section('Treasure Hunter',`<div class="list">${rows}</div>`)}${relicActions?section('Prepared Relics',`<div class="list">${relicActions}</div>`):''}`;
  }

  function skillStatus(n){return Math.max(0,Math.min(2,Number(state().character.skills?.[n])||0))}
  function skillMod(n){const st=skillStatus(n),a=ALL_SKILLS[n];return abilityMod(a)+(st?pb()*st:0)}
  function renderSkills(){
    const rows=Object.keys(ALL_SKILLS).map(n=>{const st=skillStatus(n),cls=st===2?'expert':st===1?'prof':'';return `<div class="skill-row"><button class="prof-dot ${cls}" data-skill-cycle="${esc(n)}">${st===2?'◆':st===1?'●':'○'}</button><span class="skill-name">${esc(n)}</span><span class="skill-ability">${ALL_SKILLS[n]}</span><span class="skill-mod">${signed(skillMod(n))}</span></div>`}).join('');
    const p=state().character.proficiencies,th=state().classes.treasureHunter;
    const details=(t,b)=>`<details class="proficiency"><summary>${t}</summary><div class="prof-body">${esc(b||'—')}</div></details>`;
    const langs=[...(p.languages||[]),...(th.ancientLanguages||[]).filter(Boolean)];const veh=[...(p.vehicles||[]),...(th.vehicles||[]).filter(Boolean)];
    $('#skillsPage').innerHTML=`${pageIntro('SKILLS','Skills & Proficiencies')}${section('Skills',`<div>${rows}</div>`)}${section('Proficiencies',`${details('Armor',[...new Set([...T.armor,...(p.armor||[])])].join(' • '))}${details('Weapons',[...new Set([...T.weapons,...(p.weapons||[])])].join(' • '))}${details('Tools',[...new Set([...(p.tools||[])])].join(' • '))}${details('Vehicles',[...new Set(veh)].join(' • '))}${details('Languages',[...new Set(langs)].join(' • '))}${details('Senses & Defenses',[...derivedSenses(),...derivedDefenses()].join(' • '))}`)}`;
  }

  function featureMatch(f){const q=featureSearch.trim().toLowerCase();if(q&&!`${f.name} ${f.summary}`.toLowerCase().includes(q))return false;if(featureFilter==='all')return true;if(featureFilter==='active')return f.action!=='Passive'||(f.actions||[]).length;if(featureFilter==='passive')return f.action==='Passive'&&!(f.actions||[]).length;if(featureFilter==='subclass')return f.kind==='subclass';return actionCode(f.action).toLowerCase()===featureFilter}
  function renderFeatures(){
    const fav=state().ui.favoriteFeatures||[];
    const rows=T.features.filter(f=>f.level<=level()).filter(featureMatch).sort((a,b)=>(fav.includes(a.id)?0:1)-(fav.includes(b.id)?0:1)||a.level-b.level||a.name.localeCompare(b.name)).map(f=>{const left=featureUsesLeft(f),sub=(f.actions||[]).map(a=>`<div class="subaction"><b>${esc(a.name)}</b><span>${esc(actionCode(a.action))}</span><p>${esc(a.summary)}</p></div>`).join('');return rowCard(f.id,f.name,`<span>Level ${f.level}</span>${f.kind==='subclass'?'<span>Okultní sběratel</span>':''}${left!=null?`<span>${left}/${f.uses}</span>`:''}`,`${esc(f.summary)}${sub?`<div class="subactions">${sub}</div>`:''}`,f.action,`<div class="detail-actions"><button class="favorite ${fav.includes(f.id)?'on':''}" data-favorite="${f.id}">★</button>${f.cost?`<button class="small-btn primary" data-use-action="${f.id}">Použít • −${f.cost} Cool</button>`:''}${left!=null?`<button class="small-btn primary" data-use-feature="${f.id}" ${left<=0?'disabled':''}>Použít • ${left}/${f.uses}</button>`:''}</div>`)}).join('')||'<div class="empty">Nic nenalezeno.</div>';
    const filters=[['all','ALL'],['active','ACTIVE'],['passive','PASSIVE'],['subclass','SUBCLASS']].map(([k,l])=>`<button class="filter-btn ${featureFilter===k?'active':''}" data-feature-filter="${k}">${l}</button>`).join('');
    $('#featuresPage').innerHTML=`${pageIntro('FEATURES','Class & Subclass Features')}${section('Find Feature',`<input id="featureSearch" class="search-inline" value="${esc(featureSearch)}" placeholder="Hledat feature…"><div class="filters top-gap">${filters}</div>`)}${section('Features',`<div class="list">${rows}</div>`,`<span class="eyebrow">LEVEL ${level()}</span>`)}`;
  }

  function renderRelics(){
    const lim=relicLimit(),sel=selectedRelics(),prep=sel.filter(r=>r.prepared).length,reserve=sel.length-prep,available=T.relics.filter(r=>r.level<=level()&&!sel.some(x=>x.id===r.id));
    const cards=sel.map((x,i)=>{const r={...relicById(x.id),...x},charges=r.charges||0,used=Math.min(charges,Number(r.used)||0),left=Math.max(0,charges-used);return `<article class="relic-card ${r.prepared?'prepared':''}"><div class="relic-top"><div><div class="eyebrow">${r.prepared?'PREPARED':'RESERVE'} • LVL ${r.level}</div><h3>${esc(r.name)}</h3></div><button class="small-btn" data-relic-remove="${i}">×</button></div><p>${esc(r.summary)}</p>${charges?`<div class="charge-row"><span>${left}/${charges} charges</span><div>${Array.from({length:charges},(_,n)=>`<button class="charge-dot ${n<left?'filled':''}" data-relic-use="${i}"></button>`).join('')}</div></div>`:''}<div class="detail-actions"><button class="small-btn ${r.prepared?'primary':''}" data-relic-prepared="${i}">${r.prepared?'Prepared':'Připravit'}</button>${charges&&used?`<button class="small-btn" data-relic-refill="${i}">Obnovit</button>`:''}</div></article>`}).join('')||'<div class="empty">Zatím nemáš žádné relikvie.</div>';
    const options=available.map(r=>`<option value="${r.id}">${esc(r.name)} • lvl ${r.level}</option>`).join('');
    $('#relicsPage').innerHTML=`${pageIntro('RELICS','Okultní sběratel')}${section('Capacity',`<div class="stat-grid">${stat('PREP',`${prep}/${lim[0]}`,'compact')}${stat('RESERVE',`${reserve}/${lim[1]}`,'compact')}${stat('TOTAL',`${sel.length}/${lim[2]}`,'compact')}${stat('RELIC DC',relicDC(),'compact')}</div>`)}${section('Collection',`<div class="inline-form"><select id="relicSelect" class="search-inline" ${sel.length>=lim[2]?'disabled':''}><option value="">Přidat relikvii…</option>${options}</select><button class="small-btn" data-add-relic ${sel.length>=lim[2]?'disabled':''}>+</button></div><div class="relic-grid top-gap">${cards}</div>`)}`;
  }

  function renderGear(){const g=state().character.gear,m=g.money||{};const money=['cp','sp','gp','pp'].map(k=>`<label>${k.toUpperCase()}<input type="number" min="0" value="${Number(m[k])||0}" data-money="${k}"></label>`).join('');const weapons=(g.weapons||[]).map((w,i)=>`<article class="gear-card"><div class="gear-top"><h3>${esc(w.name)}</h3><button class="small-btn" data-weapon-remove="${i}">×</button></div><div class="muted">${esc(w.damage)} ${esc(w.damageType||'')} • ${esc(w.mastery||'')}</div></article>`).join('')||'<div class="empty">Žádné zbraně.</div>';const items=(g.inventory||[]).map((it,i)=>`<article class="gear-card"><div class="gear-top"><h3>${esc(typeof it==='string'?it:it.name||'Item')}</h3><button class="small-btn" data-item-remove="${i}">×</button></div></article>`).join('')||'<div class="empty">Inventář je prázdný.</div>';$('#gearPage').innerHTML=`${pageIntro('GEAR','Výbava a inventář')}${section('Money',`<div class="money-grid">${money}</div>`)}${section('Weapons',`<div class="gear-grid">${weapons}</div>`)}${section('Inventory',`<div class="inline-form"><input id="newItemName" class="search-inline" placeholder="Přidat předmět"><button class="small-btn" data-add-item>+</button></div><div class="gear-grid top-gap">${items}</div>`)}`}

  function renderNpcs(){const npcs=state().campaign.npcs||[];const cards=npcs.map((n,i)=>`<article class="npc-card" data-edit-npc="${i}">${n.image?`<img class="npc-photo" src="${n.image}" alt="">`:`<div class="npc-photo npc-placeholder">♟</div>`}<div class="npc-info"><div class="npc-top"><div><div class="eyebrow">${esc(n.tag||'NPC')}${n.location?` • ${esc(n.location)}`:''}</div><h3>${esc(n.name||'NPC')}</h3></div><button class="favorite ${n.favorite?'on':''}" data-npc-favorite="${i}">★</button></div><p>${esc(n.notes||'')}</p></div></article>`).join('')||'<div class="empty">Žádná NPC.</div>';$('#npcsPage').innerHTML=`${pageIntro('NPCs','Kartotéka postav')}${section('NPCs',`<button class="small-btn primary" data-new-npc>+ NPC</button>`)}${section('Kartotéka',`<div class="npc-grid">${cards}</div>`)}`}

  function renderAll(){renderTop();renderCharacter();renderActions();renderSkills();renderFeatures();renderRelics();renderGear();renderNpcs();updatePageChrome()}

  function currentPageIndex(){const p=$('#pager');return Math.max(0,Math.min(PAGES.length-1,Math.round(p.scrollLeft/Math.max(1,p.clientWidth))))}
  function updatePageChrome(i=currentPageIndex()){$('#pageTitle').textContent=TITLES[i];$$('#pageDots .page-dot').forEach((d,j)=>d.classList.toggle('active',i===j))}
  function setPage(i,smooth=true){i=Math.max(0,Math.min(PAGES.length-1,i));const p=$('#pager');p.scrollTo({left:p.clientWidth*i,behavior:smooth?'smooth':'auto'});updatePageChrome(i);S.update(s=>s.ui.page=i)}
  function initDots(){$('#pageDots').innerHTML=PAGES.map((p,i)=>`<button class="page-dot" data-page-dot="${i}" aria-label="${TITLES[i]}"></button>`).join('')}
  function onPagerScroll(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;const i=currentPageIndex();updatePageChrome(i);clearTimeout(savePageTimer);savePageTimer=setTimeout(()=>S.update(s=>s.ui.page=i),120)})}

  function spendCool(cost){cost=Number(cost)||0;if(cost<=0)return true;if(coolAvailable()<cost){alert('Nemáš dost Cool Points.');return false}S.update(s=>s.classes.treasureHunter.coolUsed=Math.min(coolTotal(),(Number(s.classes.treasureHunter.coolUsed)||0)+cost));return true}
  function useFeature(id){const f=featureById(id);if(!f||!f.uses)return;const left=featureUsesLeft(f);if(left<=0)return;S.update(s=>{s.classes.treasureHunter.featureUses||(s.classes.treasureHunter.featureUses={});s.classes.treasureHunter.featureUses[id]=(Number(s.classes.treasureHunter.featureUses[id])||0)+1});renderAll()}
  function resetRest(kind){S.update(s=>{s.classes.treasureHunter.coolUsed=0;Object.keys(s.classes.treasureHunter.featureUses||{}).forEach(id=>{const f=featureById(id);if(f&&(kind==='LR'||f.recovery==='SR'))s.classes.treasureHunter.featureUses[id]=0});(s.classes.treasureHunter.relics||[]).forEach((x,i)=>{if(typeof x==='string')return;const r=relicById(x.id);if(r&&(kind==='LR'||r.recovery==='SR'))x.used=0})});renderAll()}

  function openHp(){const h=state().character.hp;hpAmount=1;$('#hpCurrent').textContent=h.current;$('#hpMax').textContent=h.max;$('#hpTemp').value=h.temp||0;$('#hpAmount').textContent=hpAmount;$('#hpDialog').showModal()}
  function updateHpAmount(delta){hpAmount=Math.max(1,Math.min(999,hpAmount+delta));$('#hpAmount').textContent=hpAmount}
  function applyHp(mode){S.update(s=>{const h=s.character.hp;if(mode==='damage'){let dmg=hpAmount;const absorb=Math.min(h.temp||0,dmg);h.temp=(h.temp||0)-absorb;dmg-=absorb;h.current=Math.max(0,h.current-dmg)}else h.current=Math.min(h.max,h.current+hpAmount);h.temp=Math.max(0,Number($('#hpTemp').value)||0)});$('#hpDialog').close();renderAll()}

  function openEdit(){const s=state();$('#editName').value=s.character.name||'';$('#editRace').value=s.character.race||'';$('#editLevel').value=level();$('#editHpMax').value=s.character.hp.max;$('#editHpAuto').checked=s.character.hp.auto!==false;$('#editAc').value=s.character.ac;$('#editSpeed').value=s.character.speed;$('#editInitBonus').value=s.character.initiativeBonus||0;$('#abilityEditor').innerHTML=S.A.map(a=>`<label>${a}<input type="number" min="1" max="30" value="${ability(a)}" data-edit-ability="${a}"></label>`).join('');$('#editPortrait').value='';$('#portraitPreview').innerHTML=s.character.portrait?`<img src="${s.character.portrait}" alt="">`:'<span>Bez portrétu</span>';$('#editDialog').showModal()}
  async function saveEdit(ev){ev.preventDefault();const old=state(),oldMax=old.character.hp.max,oldCurrent=old.character.hp.current,damage=Math.max(0,oldMax-oldCurrent),newLevel=Math.max(1,Math.min(20,Number($('#editLevel').value)||1));let portrait=old.character.portrait||'';const file=$('#editPortrait').files[0];if(file){try{portrait=await S.imageToThumb(file)}catch(e){}}const scores={};$$('[data-edit-ability]').forEach(inp=>scores[inp.dataset.editAbility]=Math.max(1,Math.min(30,Number(inp.value)||10)));const conMod=mod(scores.CON),auto=$('#editHpAuto').checked,newMax=auto?T.hpMax(newLevel,conMod):Math.max(1,Number($('#editHpMax').value)||1);S.update(s=>{s.character.name=$('#editName').value.trim();s.character.race=$('#editRace').value.trim();s.character.level=newLevel;s.character.portrait=portrait;s.character.hp.auto=auto;s.character.hp.max=newMax;s.character.hp.current=Math.max(0,Math.min(newMax,newMax-damage));s.character.ac=Math.max(0,Number($('#editAc').value)||0);s.character.speed=Math.max(0,Number($('#editSpeed').value)||0);s.character.initiativeBonus=Number($('#editInitBonus').value)||0;s.character.abilities=scores;s.classes.treasureHunter.coolUsed=Math.min(Number(s.classes.treasureHunter.coolUsed)||0,T.coolTotal(newLevel))});$('#editDialog').close();renderAll()}

  async function saveNpc(ev){ev.preventDefault();const idx=$('#npcId').value===''?null:Number($('#npcId').value),existing=idx==null?{}:(state().campaign.npcs||[])[idx]||{};let image=existing.image||'';const file=$('#npcImage').files[0];if(file){try{image=await S.imageToThumb(file,360,.74)}catch(e){}}const n={...existing,name:$('#npcName').value.trim()||'NPC',tag:$('#npcTag').value.trim(),location:$('#npcLocation').value.trim(),notes:$('#npcNotes').value.trim(),image};S.update(s=>{if(!Array.isArray(s.campaign.npcs))s.campaign.npcs=[];if(idx==null)s.campaign.npcs.push(n);else s.campaign.npcs[idx]=n});$('#npcDialog').close();renderAll()}
  function openNpc(i){const n=i==null?{}:(state().campaign.npcs||[])[i]||{};$('#npcId').value=i==null?'':String(i);$('#npcName').value=n.name||'';$('#npcTag').value=n.tag||'';$('#npcLocation').value=n.location||'';$('#npcNotes').value=n.notes||'';$('#npcImage').value='';$('#npcDialog').showModal()}

  function globalResults(q){q=q.trim().toLowerCase();if(!q)return[];const out=[];T.features.filter(f=>f.level<=level()).forEach(f=>{if(`${f.name} ${f.summary}`.toLowerCase().includes(q))out.push({type:'FEATURE',title:f.name,page:3,id:f.id})});T.relics.filter(r=>r.level<=level()).forEach(r=>{if(`${r.name} ${r.summary}`.toLowerCase().includes(q))out.push({type:'RELIC',title:r.name,page:4,id:r.id})});(state().campaign.npcs||[]).forEach((n,i)=>{if(`${n.name} ${n.tag} ${n.location} ${n.notes}`.toLowerCase().includes(q))out.push({type:'NPC',title:n.name,page:6,id:String(i)})});return out.slice(0,30)}
  function renderGlobalSearch(){const res=globalResults($('#globalSearch').value);$('#globalSearchResults').innerHTML=res.map(r=>`<button type="button" class="search-result" data-search-jump="${r.page}" data-search-id="${esc(r.id)}"><small>${r.type}</small><strong>${esc(r.title)}</strong></button>`).join('')||($('#globalSearch').value?'<div class="empty">Nic nenalezeno.</div>':'')}

  function bind(){
    initDots();$('#pager').addEventListener('scroll',onPagerScroll,{passive:true});$('#prevPage').onclick=()=>setPage(currentPageIndex()-1);$('#nextPage').onclick=()=>setPage(currentPageIndex()+1);$('#pageDots').onclick=e=>{const b=e.target.closest('[data-page-dot]');if(b)setPage(Number(b.dataset.pageDot))};
    $('#editBtn').onclick=openEdit;$('#saveEdit').onclick=saveEdit;$('#searchBtn').onclick=()=>{$('#globalSearch').value='';$('#globalSearchResults').innerHTML='';$('#searchDialog').showModal();setTimeout(()=>$('#globalSearch').focus(),30)};$('#globalSearch').oninput=renderGlobalSearch;$('#saveNpc').onclick=saveNpc;
    $('#hpMinus').onclick=()=>updateHpAmount(-1);$('#hpPlus').onclick=()=>updateHpAmount(1);$('#hpDamage').onclick=()=>applyHp('damage');$('#hpHeal').onclick=()=>applyHp('heal');
    document.addEventListener('click',e=>{const t=e.target.closest('button,[data-edit-npc]');if(!t)return;
      if(t.hasAttribute('data-open-hp')){openHp();return}if(t.hasAttribute('data-open-edit')){openEdit();return}
      if(t.dataset.toggleRow){document.querySelector(`[data-row="${CSS.escape(t.dataset.toggleRow)}"]`)?.classList.toggle('open');return}
      if(t.hasAttribute('data-inspiration')){S.update(s=>s.character.inspiration=!s.character.inspiration);renderAll();return}
      if(t.hasAttribute('data-short-rest')){resetRest('SR');return}if(t.hasAttribute('data-long-rest')){resetRest('LR');return}
      if(t.dataset.cool){S.update(s=>s.classes.treasureHunter.coolUsed=Math.max(0,Math.min(coolTotal(),(Number(s.classes.treasureHunter.coolUsed)||0)+Number(t.dataset.cool))));renderAll();return}
      if(t.dataset.coolSet){const a=Number(t.dataset.coolSet);S.update(s=>s.classes.treasureHunter.coolUsed=Math.max(0,coolTotal()-a));renderAll();return}
      if(t.dataset.useAction){const a=allActions().find(x=>x.id===t.dataset.useAction)||featureById(t.dataset.useAction);if(a&&spendCool(a.cost||0)){const f=actionSourceFeature(a);if(f?.uses)useFeature(f.id);else renderAll()}return}
      if(t.dataset.useFeature){useFeature(t.dataset.useFeature);return}
      if(t.dataset.actionFilter){actionFilter=t.dataset.actionFilter;renderActions();return}if(t.dataset.featureFilter){featureFilter=t.dataset.featureFilter;renderFeatures();return}
      if(t.dataset.favorite){S.update(s=>{const a=s.ui.favoriteFeatures||(s.ui.favoriteFeatures=[]),i=a.indexOf(t.dataset.favorite);i>=0?a.splice(i,1):a.push(t.dataset.favorite)});renderFeatures();return}
      if(t.dataset.skillCycle){S.update(s=>{s.character.skills||(s.character.skills={});s.character.skills[t.dataset.skillCycle]=((Number(s.character.skills[t.dataset.skillCycle])||0)+1)%3});renderSkills();return}
      if(t.hasAttribute('data-add-condition')){const v=$('#conditionInput')?.value.trim();if(v)S.update(s=>{s.character.conditions||(s.character.conditions=[]);if(!s.character.conditions.includes(v))s.character.conditions.push(v)});renderCharacter();return}if(t.dataset.removeCondition){S.update(s=>s.character.conditions=(s.character.conditions||[]).filter(x=>x!==t.dataset.removeCondition));renderCharacter();return}
      if(t.hasAttribute('data-add-relic')){const id=$('#relicSelect')?.value,lim=relicLimit();if(!id)return;if(selectedRelics().length>=lim[2])return;S.update(s=>s.classes.treasureHunter.relics.push({id,prepared:false,used:0}));renderRelics();return}
      if(t.dataset.relicRemove!=null){S.update(s=>s.classes.treasureHunter.relics.splice(Number(t.dataset.relicRemove),1));renderAll();return}
      if(t.dataset.relicPrepared!=null){const i=Number(t.dataset.relicPrepared),sel=selectedRelics(),next=!sel[i].prepared;if(next&&sel.filter(r=>r.prepared).length>=relicLimit()[0]){alert('Prepared limit je plný.');return}S.update(s=>{let r=s.classes.treasureHunter.relics[i];if(typeof r==='string')s.classes.treasureHunter.relics[i]={id:r,prepared:next,used:0};else r.prepared=next});renderAll();return}
      if(t.dataset.relicUse!=null){const i=Number(t.dataset.relicUse);S.update(s=>{let r=s.classes.treasureHunter.relics[i];if(typeof r==='string'){r={id:r,prepared:false,used:0};s.classes.treasureHunter.relics[i]=r}const def=relicById(r.id),max=def?.charges||0;r.used=Math.min(max,(Number(r.used)||0)+1)});renderAll();return}
      if(t.dataset.relicRefill!=null){S.update(s=>{const r=s.classes.treasureHunter.relics[Number(t.dataset.relicRefill)];if(r&&typeof r==='object')r.used=0});renderAll();return}
      if(t.hasAttribute('data-add-item')){const v=$('#newItemName')?.value.trim();if(v)S.update(s=>s.character.gear.inventory.push({name:v,notes:''}));renderGear();return}if(t.dataset.itemRemove!=null){S.update(s=>s.character.gear.inventory.splice(Number(t.dataset.itemRemove),1));renderGear();return}if(t.dataset.weaponRemove!=null){S.update(s=>s.character.gear.weapons.splice(Number(t.dataset.weaponRemove),1));renderAll();return}
      if(t.hasAttribute('data-new-npc')){openNpc(null);return}if(t.dataset.npcFavorite!=null){const i=Number(t.dataset.npcFavorite);S.update(s=>s.campaign.npcs[i].favorite=!s.campaign.npcs[i].favorite);renderNpcs();return}if(t.dataset.editNpc!=null&&!t.closest('button')){openNpc(Number(t.dataset.editNpc));return}
      if(t.dataset.searchJump!=null){$('#searchDialog').close();setPage(Number(t.dataset.searchJump));return}
    });
    document.addEventListener('input',e=>{if(e.target.id==='featureSearch'){featureSearch=e.target.value;const pos=e.target.selectionStart;renderFeatures();const n=$('#featureSearch');n?.focus();if(n&&pos!=null)n.setSelectionRange(pos,pos)}if(e.target.dataset.money){const k=e.target.dataset.money,v=Math.max(0,Number(e.target.value)||0);S.update(s=>s.character.gear.money[k]=v)}if(e.target.id==='editHpAuto')$('#editHpMax').disabled=e.target.checked});
  }

  document.addEventListener('DOMContentLoaded',()=>{bind();renderAll();requestAnimationFrame(()=>setPage(Number(state().ui.page)||0,false))});
})();