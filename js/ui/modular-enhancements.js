(function(){
  const S=window.V7SStateV7s,T=window.TreasureHunterDataV7s,D=window.V7SDerived;
  if(!S||!T||!D)return;
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const DAMAGE_CHOICES=['Acid','Cold','Fire','Lightning','Necrotic','Poison','Psychic','Thunder'];
  let scheduled=false;

  function toast(message){const host=$('#toastHost');if(!host)return;const el=document.createElement('div');el.className='toast warn';el.textContent=message;host.appendChild(el);setTimeout(()=>el.remove(),1800)}
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;patchAll()})}
  function usedFor(id){return Math.max(0,Number(S.get().classes?.treasureHunter?.featureUses?.[id])||0)}
  function recoveryLabel(f){return String(f.recovery||'LR').toUpperCase().includes('SR')?'SHORT / LONG REST':'LONG REST'}
  function labelFor(mode){return mode==='advantage'?'A':mode==='disadvantage'?'D':'±'}
  function cycle(current){return current==='normal'?'advantage':current==='advantage'?'disadvantage':'normal'}
  function setFlag(flag,mode,locked=false,sources=[]){if(!flag)return;flag.classList.remove('normal','advantage','disadvantage','locked');flag.classList.add(mode==='advantage'?'advantage':mode==='disadvantage'?'disadvantage':'normal');if(locked)flag.classList.add('locked');flag.textContent=labelFor(mode);flag.dataset.mode=mode;flag.dataset.locked=locked?'1':'0';flag.title=locked?`Fixed by: ${sources.join(', ')}`:`Click to cycle Advantage / Disadvantage`;flag.setAttribute('aria-label',locked?`${mode}. Fixed by ${sources.join(', ')}`:mode)}

  function patchFeatureTrackers(){
    (T.features||[]).filter(f=>Number(f.uses)>0).forEach(f=>{
      const card=document.querySelector(`[data-row="${f.id}"]`),detail=card?.querySelector('.row-detail');if(!detail)return;
      const max=Number(f.uses)||1,used=Math.min(max,usedFor(f.id)),left=max-used,sig=`${left}/${max}:${f.recovery||'LR'}`;let control=detail.querySelector('.feature-use-control');if(control?.dataset.sig===sig)return;
      const dots=Array.from({length:max},(_,i)=>`<button type="button" class="feature-use-dot ${i<left?'filled':''}" data-feature-use="${esc(f.id)}" data-use-state="${i<left?'full':'empty'}" aria-label="${i<left?'Use':'Restore'} ${esc(f.name)}"></button>`).join('');
      const html=`<div><span class="eyebrow">USES • ${recoveryLabel(f)}</span><strong>${left}/${max}</strong></div><div class="feature-use-dots">${dots}</div>`;if(!control){control=document.createElement('div');control.className='feature-use-control';detail.appendChild(control)}control.dataset.sig=sig;control.innerHTML=html;
    });
  }
  function selectedRelic(id){return (S.get().classes?.treasureHunter?.relics||[]).find(x=>(typeof x==='string'?x:x.id)===id)}
  function patchCloakChoice(){const raw=selectedRelic('cloak-pilgrim-worlds');if(!raw||typeof raw==='string')return;const card=[...document.querySelectorAll('#relicsPage .relic-card')].find(c=>c.querySelector('h3')?.textContent.trim()==='Plášť poutníka mezi světy');if(!card)return;const value=raw.choiceValue||'',sig=value||'none';let box=card.querySelector('.relic-choice-control');if(box?.dataset.sig===sig)return;const html=`<label><span>Odolnost po Dlouhém odpočinku</span><select data-relic-choice="cloak-pilgrim-worlds"><option value="">Choose…</option>${DAMAGE_CHOICES.map(x=>`<option value="${x}" ${x===value?'selected':''}>${x}</option>`).join('')}</select></label>`;if(!box){box=document.createElement('div');box.className='relic-choice-control';card.querySelector('.detail-actions')?.before(box)}box.dataset.sig=sig;box.innerHTML=html}
  function patchCloakDefense(){const raw=selectedRelic('cloak-pilgrim-worlds');if(!raw||typeof raw==='string'||!raw.prepared)return;const value=raw.choiceValue||'';$$('#characterPage .chip.brass').forEach(el=>{if(el.textContent.trim()==='Resistances: selected Cloak damage type')el.textContent=value?`Resistances: ${value}`:'Resistances: choose Cloak damage type'})}

  function patchSaveFlags(){
    const modes=S.get().character.rollModes||(S.get().character.rollModes={initiative:'normal',skills:{},saves:{}});modes.saves=modes.saves||{};
    $$('#characterPage .ability').forEach((el,i)=>{const ability=S.A[i];if(!ability)return;const save=el.querySelector('.save');if(!save)return;let wrap=el.querySelector('.save-control');if(!wrap){wrap=document.createElement('div');wrap.className='save-control';save.before(wrap);wrap.appendChild(save)}let flag=wrap.querySelector('.save-roll-flag');if(!flag){flag=document.createElement('span');flag.className='roll-flag save-roll-flag';flag.dataset.saveCycle=ability;flag.tabIndex=0;flag.setAttribute('role','button');wrap.appendChild(flag)}const fixed=D.fixedSave(ability);if(fixed.mode==='autoFail'){flag.hidden=true;return}flag.hidden=false;setFlag(flag,fixed.locked?fixed.mode:(modes.saves[ability]||'normal'),fixed.locked,fixed.sources)});
  }
  function patchInitiativeFlag(){const fixed=D.fixedInitiative(),manual=S.get().character.rollModes?.initiative||'normal';const flag=$('#characterPage [data-roll-cycle="initiative"]');if(flag)setFlag(flag,fixed.locked?fixed.mode:manual,fixed.locked,fixed.sources)}
  function patchSkillFlags(){const fixed=D.fixedSkill();$$('#skillsPage .skill-row').forEach(row=>{const name=row.querySelector('.skill-name')?.textContent.trim(),flag=row.querySelector('[data-roll-cycle]');if(!name||!flag)return;const manual=S.get().character.rollModes?.skills?.[name]||'normal';setFlag(flag,fixed.locked?fixed.mode:manual,fixed.locked,fixed.sources);if(flag.tagName==='BUTTON')flag.disabled=!!fixed.locked})}
  function patchUniqueChoices(){['ancientLanguages','weaponMasteries'].forEach(key=>{const selects=$$(`[data-feature-choice="${key}"]`);if(selects.length<2)return;const selected=selects.map(s=>s.value).filter(Boolean);selects.forEach(sel=>[...sel.options].forEach(o=>{if(o.value)o.disabled=o.value!==sel.value&&selected.includes(o.value)}))})}
  function localizeTreasureHunterText(){['#featuresPage','#relicsPage'].forEach(rootSel=>{const root=$(rootSel);if(!root)return;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while((n=walker.nextNode()))if(n.nodeValue?.includes('Thunder damage'))n.nodeValue=n.nodeValue.replaceAll('Thunder damage','hromové zranění')})}
  function patchAll(){patchFeatureTrackers();patchCloakChoice();patchCloakDefense();patchSaveFlags();patchInitiativeFlag();patchSkillFlags();patchUniqueChoices();localizeTreasureHunterText()}

  function cycleSave(a,flag){const fixed=D.fixedSave(a);if(fixed.locked){toast(`Fixed by ${fixed.sources.join(', ')}.`);return}S.update(s=>{const r=s.character.rollModes||(s.character.rollModes={initiative:'normal',skills:{},saves:{}}),m=r.saves||(r.saves={});m[a]=cycle(m[a]||'normal')});setFlag(flag,S.get().character.rollModes.saves[a],false,[])}
  function cycleRoll(flag){const key=flag.dataset.rollCycle;if(!key)return;if(key==='initiative'){const fixed=D.fixedInitiative();if(fixed.locked){toast(`Fixed by ${fixed.sources.join(', ')}.`);return}S.update(s=>s.character.rollModes.initiative=cycle(s.character.rollModes.initiative||'normal'));setFlag(flag,S.get().character.rollModes.initiative,false,[]);return}if(key.startsWith('skill:')){const fixed=D.fixedSkill();if(fixed.locked){toast(`Fixed by ${fixed.sources.join(', ')}.`);return}}
  }
  document.addEventListener('click',e=>{
    const save=e.target.closest('[data-save-cycle]');if(save){e.preventDefault();e.stopImmediatePropagation();cycleSave(save.dataset.saveCycle,save);return}
    const rf=e.target.closest('[data-roll-cycle]');if(rf?.dataset.locked==='1'){e.preventDefault();e.stopImmediatePropagation();toast(`Fixed by ${rf.title.replace('Fixed by: ','')}.`);return}if(rf&&rf.tagName!=='BUTTON'){e.preventDefault();e.stopImmediatePropagation();cycleRoll(rf);return}
    const t=e.target.closest('button');if(!t)return;if(t.dataset.featureUse){e.preventDefault();e.stopPropagation();const id=t.dataset.featureUse,f=(T.features||[]).find(x=>x.id===id);if(!f)return;const max=Number(f.uses)||1,delta=t.dataset.useState==='full'?1:-1;S.update(s=>{const u=s.classes.treasureHunter.featureUses||(s.classes.treasureHunter.featureUses={});u[id]=Math.max(0,Math.min(max,(Number(u[id])||0)+delta))});schedule()}
  },true);
  document.addEventListener('keydown',e=>{const t=e.target.closest?.('[data-save-cycle],[data-roll-cycle]');if(!t||!(e.key==='Enter'||e.key===' '))return;e.preventDefault();if(t.dataset.saveCycle)cycleSave(t.dataset.saveCycle,t);else if(t.tagName!=='BUTTON')cycleRoll(t)});
  document.addEventListener('change',e=>{if(e.target.dataset.relicChoice==='cloak-pilgrim-worlds'){const val=e.target.value;S.update(s=>{const r=(s.classes.treasureHunter.relics||[]).find(x=>typeof x==='object'&&x.id==='cloak-pilgrim-worlds');if(r)r.choiceValue=val});S.flush();schedule()}if(e.target.dataset.featureChoice)requestAnimationFrame(patchUniqueChoices)});
  const observer=new MutationObserver(schedule);
  document.addEventListener('DOMContentLoaded',()=>{['#characterPage','#skillsPage','#featuresPage','#relicsPage'].forEach(sel=>{const el=$(sel);if(el)observer.observe(el,{childList:true,subtree:true})});patchAll()});
})();