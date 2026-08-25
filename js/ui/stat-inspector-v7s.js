(function(){
  const S=window.V7SStateV7s,T=window.TreasureHunterDataV7s,R=window.DND2024Rules,D=window.V7SDerived;
  if(!S||!T||!R||!D)return;
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const signed=n=>Number(n)>=0?`+${Number(n)}`:`${Number(n)}`;
  let active='',scheduled=false,patching=false;
  const observer=new MutationObserver(()=>schedule());

  function inject(){if($('#statDialog'))return;document.body.insertAdjacentHTML('beforeend',`<dialog id="statDialog" class="sheet-dialog stat-dialog"><form method="dialog"><div class="dialog-head"><strong id="statTitle">Stat</strong><button value="cancel" class="icon-btn" aria-label="Close">×</button></div><div id="statValue" class="stat-dialog-value"></div><div id="statFormula" class="formula-list"></div><div id="statEditor" class="stat-editor"></div><menu><button value="cancel" class="ghost">Close</button><button id="saveStat" type="button" class="primary" hidden>Save</button></menu></form></dialog>`);$('#saveStat').addEventListener('click',save)}
  function line(label,value){return `<div class="formula-row"><span>${esc(label)}</span><b>${esc(value)}</b></div>`}
  function open(key){
    inject();active=key;const s=S.get(),c=s.character,parts=[];let title='',value='',editor='';
    if(key.startsWith('ability:')){
      const a=key.split(':')[1],score=D.ability(a),m=D.mod(a),save=D.saveMod(a),prof=T.saves.includes(a),fixed=D.fixedSave(a);title=`${a} Ability`;value=signed(m);parts.push(['Ability Score',score],['Modifier',`${score} → ${signed(m)}`],['Saving Throw',save==null?'AUTO FAIL':`${signed(save)}${prof?' • Proficient':''}`]);if(prof)parts.push(['Proficiency Bonus',signed(D.pb())]);const itemSave=D.itemSaveBonus?.(a)||0,relicSave=D.relicSaveBonus?.(a)||0;if(itemSave)parts.push(['Equipped items',signed(itemSave)]);if(relicSave)parts.push(['Prepared relics',signed(relicSave)]);if(Number(c.exhaustion)||0)parts.push(['Exhaustion',signed(R.exhaustionPenalty(c.exhaustion))]);if(fixed.locked)parts.push(['Fixed roll state',`${fixed.mode==='disadvantage'?'Disadvantage':fixed.mode} • ${fixed.sources.join(', ')}`]);editor=`<label>Ability Score<input id="statAbilityScore" type="number" min="1" max="30" value="${score}"></label>`;
    }else if(key==='ac'){
      const b=D.armorBreakdown();title='Armor Class';value=b.value;parts.push(...b.parts);parts.push(['Mode',c.acMode==='manual'?'Manual':'Automatic']);editor=`<label>AC Mode<select id="statAcMode"><option value="auto" ${c.acMode!=='manual'?'selected':''}>Automatic</option><option value="manual" ${c.acMode==='manual'?'selected':''}>Manual</option></select></label><label>Other AC Bonus<input id="statAcBonus" type="number" value="${Number(c.acBonus)||0}"></label><label>Manual AC<input id="statAcManual" type="number" min="0" value="${Number(c.acManual??c.ac)||0}"></label><small class="muted">Automatic AC starts at 10 + DEX while unarmored. Worn/equipped armor replaces that formula. Shields, protection items, relic modifiers and the Other AC Bonus stack on top when applicable.</small>`;
    }else if(key==='initiative'){
      const dex=D.mod('DEX'),bonus=Number(c.initiativeBonus)||0,ex=R.exhaustionPenalty(c.exhaustion||0),fixed=D.fixedInitiative();title='Initiative';value=signed(D.initiative());parts.push(['DEX modifier',signed(dex)],['Initiative bonus',signed(bonus)]);if(ex)parts.push(['Exhaustion',signed(ex)]);if(fixed.locked)parts.push(['Fixed roll state',`${fixed.mode==='advantage'?'Advantage':'Disadvantage'} • ${fixed.sources.join(', ')}`]);editor=`<label>Initiative Bonus<input id="statInitBonus" type="number" value="${bonus}"></label>`;
    }else if(key==='speed'){
      const b=D.speedBreakdown();title='Speed';value=`${b.value} ft.`;parts.push(...b.parts);editor=`<label>Base Speed<input id="statBaseSpeed" type="number" min="0" step="5" value="${Number(c.speed)||0}"></label>`;
    }else if(key==='whipRope'){
      title='Whip / Rope DC';value=D.whipRopeDC();parts.push(['Base',8],['Proficiency Bonus',signed(D.pb())],['DEX modifier',signed(D.mod('DEX'))]);
    }else if(key==='relic'){
      title='Relic DC';value=D.relicDC();parts.push(['Base',8],['Proficiency Bonus',signed(D.pb())],['INT modifier',signed(D.mod('INT'))]);
    }else if(key==='pb'){
      title='Proficiency Bonus';value=signed(D.pb());parts.push(['Character Level',D.level()],['Progression','+2 (1–4), +3 (5–8), +4 (9–12), +5 (13–16), +6 (17–20)']);
    }else return;
    $('#statTitle').textContent=title;$('#statValue').textContent=value;$('#statFormula').innerHTML=parts.map(x=>line(x[0],x[1])).join('');$('#statEditor').innerHTML=editor;$('#saveStat').hidden=!editor;$('#statDialog').showModal();
  }
  function save(){
    if(active.startsWith('ability:')){const a=active.split(':')[1],v=Math.max(1,Math.min(30,Number($('#statAbilityScore').value)||10));S.update(s=>s.character.abilities[a]=v)}
    else if(active==='ac'){S.update(s=>{s.character.acMode=$('#statAcMode').value;s.character.acBonus=Number($('#statAcBonus').value)||0;s.character.acManual=Math.max(0,Number($('#statAcManual').value)||0);s.character.ac=s.character.acManual})}
    else if(active==='initiative'){S.update(s=>s.character.initiativeBonus=Number($('#statInitBonus').value)||0)}
    else if(active==='speed'){S.update(s=>s.character.speed=Math.max(0,Number($('#statBaseSpeed').value)||0))}
    S.flush();$('#statDialog').close();schedule();window.dispatchEvent(new CustomEvent('v7s:state-changed'));
  }
  function statByLabel(root,label){return [...root.querySelectorAll('.stat')].find(x=>x.querySelector(':scope > span')?.textContent.trim()===label)}
  function setText(el,text){if(el&&el.textContent!==String(text))el.textContent=String(text)}
  function normalizeInitiativeFlag(hero,init){
    if(!hero||!init)return;let flag=hero.querySelector('[data-roll-cycle="initiative"]');if(!flag)return;
    if(flag.tagName==='BUTTON'){const span=document.createElement('span');span.className=flag.className;span.dataset.rollCycle='initiative';span.setAttribute('role','button');span.setAttribute('tabindex','0');span.textContent=flag.textContent;flag.replaceWith(span);flag=span}
    let row=init.querySelector('.stat-value-row');if(!row){row=document.createElement('div');row.className='stat-value-row';const b=init.querySelector('b');if(b){b.before(row);row.appendChild(b)}}if(flag.parentElement!==row)row.appendChild(flag);
  }
  function patch(){
    if(patching)return;patching=true;observer.disconnect();try{
      const char=$('#characterPage');if(!char)return;const hero=char.querySelector('.hero-stats');if(hero){const ac=statByLabel(hero,'AC'),init=statByLabel(hero,'INIT'),speed=statByLabel(hero,'SPEED');if(ac){ac.dataset.inspectStat='ac';setText(ac.querySelector('b'),D.armorClass())}if(init){init.dataset.inspectStat='initiative';setText(init.querySelector('b'),signed(D.initiative()));normalizeInitiativeFlag(hero,init)}if(speed){speed.dataset.inspectStat='speed';setText(speed.querySelector('b'),`${D.speed()} ft.`)}}
      const dc=char.querySelector('.dc-grid');if(dc){const a=statByLabel(dc,'WHIP / ROPE DC'),r=statByLabel(dc,'RELIC DC'),p=statByLabel(dc,'PB');if(a){a.dataset.inspectStat='whipRope';setText(a.querySelector('b'),D.whipRopeDC())}if(r){r.dataset.inspectStat='relic';setText(r.querySelector('b'),D.relicDC())}if(p)p.dataset.inspectStat='pb'}
      $$('#characterPage .ability').forEach((el,i)=>{const a=S.A[i];if(!a)return;el.dataset.inspectStat=`ability:${a}`;const save=el.querySelector('.save'),v=D.saveMod(a);if(save)setText(save,v==null?'AUTO FAIL':`${T.saves.includes(a)?'●':'○'} ${signed(v)}`)});
      const hud=$('#hudAc');if(hud){setText(hud,D.armorClass());hud.closest('button').dataset.inspectStat='ac'}
    }finally{patching=false;const root=$('#characterPage');if(root)observer.observe(root,{childList:true,subtree:true})}
  }
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;patch()})}
  document.addEventListener('click',e=>{if(e.target.closest('.roll-flag,.prof-dot,.condition-detail-btn button'))return;const el=e.target.closest('[data-inspect-stat]');if(!el)return;e.preventDefault();e.stopPropagation();open(el.dataset.inspectStat)},true);
  document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-inspect-stat]')){e.preventDefault();open(e.target.dataset.inspectStat)}});
  window.addEventListener('v7s:state-changed',schedule);
  document.addEventListener('DOMContentLoaded',()=>{inject();patch()});
})();