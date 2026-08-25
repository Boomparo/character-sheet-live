(function(){
  const S=window.V7SStateV7s,T=window.TreasureHunterDataV7s;
  if(!S||!T)return;
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const DAMAGE_CHOICES=['Acid','Cold','Fire','Lightning','Necrotic','Poison','Psychic','Thunder'];
  let scheduled=false;

  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;patchAll()})}
  function usedFor(id){return Math.max(0,Number(S.get().classes?.treasureHunter?.featureUses?.[id])||0)}
  function recoveryLabel(f){return f.recovery==='SR'?'SHORT / LONG REST':'LONG REST'}

  function patchFeatureTrackers(){
    (T.features||[]).filter(f=>Number(f.uses)>0).forEach(f=>{
      const card=document.querySelector(`[data-row="${CSS.escape(f.id)}"]`),detail=card?.querySelector('.row-detail');
      if(!detail)return;
      detail.querySelector('.feature-use-control')?.remove();
      const max=Number(f.uses)||1,used=Math.min(max,usedFor(f.id)),left=max-used;
      const dots=Array.from({length:max},(_,i)=>`<button type="button" class="feature-use-dot ${i<left?'filled':''}" data-feature-use="${esc(f.id)}" data-use-state="${i<left?'full':'empty'}" aria-label="${i<left?'Use':'Restore'} ${esc(f.name)}"></button>`).join('');
      detail.insertAdjacentHTML('beforeend',`<div class="feature-use-control"><div><span class="eyebrow">USES • ${recoveryLabel(f)}</span><strong>${left}/${max}</strong></div><div class="feature-use-dots">${dots}</div></div>`);
    });
  }

  function selectedRelic(id){return (S.get().classes?.treasureHunter?.relics||[]).find(x=>(typeof x==='string'?x:x.id)===id)}
  function patchCloakChoice(){
    const raw=selectedRelic('cloak-pilgrim-worlds');if(!raw||typeof raw==='string')return;
    const card=[...document.querySelectorAll('#relicsPage .relic-card')].find(c=>c.querySelector('h3')?.textContent.trim()==='Plášť poutníka mezi světy');
    if(!card)return;
    let box=card.querySelector('.relic-choice-control');if(box)box.remove();
    const value=raw.choiceValue||'';
    box=document.createElement('div');box.className='relic-choice-control';
    box.innerHTML=`<label><span>Odolnost po Dlouhém odpočinku</span><select data-relic-choice="cloak-pilgrim-worlds"><option value="">Choose…</option>${DAMAGE_CHOICES.map(x=>`<option value="${x}" ${x===value?'selected':''}>${x}</option>`).join('')}</select></label>`;
    card.querySelector('.detail-actions')?.before(box);
  }

  function patchCloakDefense(){
    const raw=selectedRelic('cloak-pilgrim-worlds');if(!raw||typeof raw==='string'||!raw.prepared)return;
    const value=raw.choiceValue||'';
    $$('#characterPage .chip.brass').forEach(el=>{if(el.textContent.trim()==='Resistances: selected Cloak damage type')el.textContent=value?`Resistances: ${value}`:'Resistances: choose Cloak damage type'});
  }

  function patchSaveFlags(){
    const modes=S.get().character.rollModes||(S.get().character.rollModes={initiative:'normal',skills:{}});modes.saves=modes.saves||{};
    $$('#characterPage .ability').forEach((el,i)=>{
      if(el.querySelector('.save-roll-flag'))return;
      const ability=S.A[i];if(!ability)return;
      const mode=modes.saves[ability]||'normal',label=mode==='advantage'?'A':mode==='disadvantage'?'D':'±';
      const b=document.createElement('button');b.type='button';b.className=`roll-flag save-roll-flag ${mode}`;b.dataset.saveCycle=ability;b.textContent=label;b.setAttribute('aria-label',`${ability} saving throw ${mode}`);el.appendChild(b);
    });
  }

  function patchUniqueChoices(){
    ['ancientLanguages','weaponMasteries'].forEach(key=>{
      const selects=$$(`[data-feature-choice="${key}"]`);if(selects.length<2)return;
      const selected=selects.map(s=>s.value).filter(Boolean);
      selects.forEach(sel=>[...sel.options].forEach(o=>{if(!o.value)return;o.disabled=o.value!==sel.value&&selected.includes(o.value)}));
    });
  }

  function localizeTreasureHunterText(){
    ['#featuresPage','#relicsPage'].forEach(rootSel=>{
      const root=$(rootSel);if(!root)return;
      const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;
      while((n=walker.nextNode())){
        if(n.nodeValue?.includes('Thunder damage'))n.nodeValue=n.nodeValue.replaceAll('Thunder damage','hromové zranění');
      }
    });
  }

  function patchAll(){patchFeatureTrackers();patchCloakChoice();patchCloakDefense();patchSaveFlags();patchUniqueChoices();localizeTreasureHunterText()}

  document.addEventListener('click',e=>{
    const t=e.target.closest('button');if(!t)return;
    if(t.dataset.featureUse){
      e.preventDefault();e.stopPropagation();
      const id=t.dataset.featureUse,f=(T.features||[]).find(x=>x.id===id);if(!f)return;
      const max=Number(f.uses)||1,delta=t.dataset.useState==='full'?1:-1;
      S.update(s=>{const u=s.classes.treasureHunter.featureUses||(s.classes.treasureHunter.featureUses={});u[id]=Math.max(0,Math.min(max,(Number(u[id])||0)+delta))});
      schedule();return;
    }
    if(t.dataset.saveCycle){
      e.preventDefault();e.stopPropagation();const a=t.dataset.saveCycle;
      S.update(s=>{const r=s.character.rollModes||(s.character.rollModes={initiative:'normal',skills:{}}),m=r.saves||(r.saves={}),cur=m[a]||'normal';m[a]=cur==='normal'?'advantage':cur==='advantage'?'disadvantage':'normal'});
      t.classList.remove('normal','advantage','disadvantage');const mode=S.get().character.rollModes.saves[a];t.classList.add(mode);t.textContent=mode==='advantage'?'A':mode==='disadvantage'?'D':'±';return;
    }
  },true);

  document.addEventListener('change',e=>{
    if(e.target.dataset.relicChoice==='cloak-pilgrim-worlds'){
      const val=e.target.value;
      S.update(s=>{const r=(s.classes.treasureHunter.relics||[]).find(x=>typeof x==='object'&&x.id==='cloak-pilgrim-worlds');if(r)r.choiceValue=val});S.flush();schedule();
    }
    if(e.target.dataset.featureChoice)requestAnimationFrame(patchUniqueChoices);
  });

  const observer=new MutationObserver(schedule);
  document.addEventListener('DOMContentLoaded',()=>{
    ['#characterPage','#featuresPage','#relicsPage'].forEach(sel=>{const el=$(sel);if(el)observer.observe(el,{childList:true,subtree:true})});
    patchAll();
  });
})();