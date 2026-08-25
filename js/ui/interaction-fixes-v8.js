(function(){
  const S=window.V7SStateV7s,T=window.TreasureHunterDataV7s;
  if(!S||!T)return;
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const SKILLS=['Acrobatics','Animal Handling','Arcana','Athletics','Deception','History','Insight','Intimidation','Investigation','Medicine','Nature','Perception','Performance','Persuasion','Religion','Sleight of Hand','Stealth','Survival'];
  const MASTERY_WEAPONS=['Club','Dagger','Greatclub','Handaxe','Javelin','Light Hammer','Mace','Quarterstaff','Sickle','Spear','Light Crossbow','Dart','Shortbow','Sling','Rapier','Scimitar','Shortsword','Whip','Hand Crossbow','Heavy Crossbow','Longbow','Pistol','Musket'];
  let scheduled=false,patching=false,observer=null;

  function state(){return S.get()}
  function persistDirect(){try{S.normalize(state());localStorage.setItem(S.KEY,JSON.stringify(state()))}catch(e){}}
  function featureDefByKey(key){for(const defs of Object.values(T.choiceDefinitions||{})){const d=(defs||[]).find(x=>x.key===key);if(d)return d}return null}
  function writeChoice(el){
    const key=el.dataset.builderChoice,idx=Math.max(0,Number(el.dataset.choiceIndex)||0),value=el.value;
    if(!key)return;
    const th=state().classes.treasureHunter;
    if(key==='expertise')th.expertise=value;
    else{
      if(!Array.isArray(th[key]))th[key]=[];
      const def=featureDefByKey(key);
      if(def?.unique&&value)th[key]=th[key].map((x,i)=>i!==idx&&x===value?'':x);
      th[key][idx]=value;
    }
    persistDirect();
    $$(`[data-builder-choice="${CSS.escape(key)}"]`).forEach(x=>{const i=Math.max(0,Number(x.dataset.choiceIndex)||0);const next=key==='expertise'?th.expertise:(th[key]?.[i]||'');if(x!==el&&x.value!==next)x.value=next});
    refreshChoiceWarning(el.closest('.row-card'));
  }
  function refreshChoiceWarning(card){
    if(!card)return;const f=(T.features||[]).find(x=>x.id===card.dataset.row);if(!f)return;
    let missing=0;for(const d of T.choiceDefinitions?.[f.id]||[]){const th=state().classes.treasureHunter,v=d.key==='expertise'?[th.expertise]:th[d.key];const count=(Array.isArray(v)?v:[v]).filter(Boolean).length;missing+=Math.max(0,d.count-count)}
    card.classList.toggle('needs-choice',missing>0);let w=card.querySelector('.choice-warning');if(missing&&!w){w=document.createElement('span');w.className='choice-warning';w.textContent='!';card.querySelector('.row-main>span')?.appendChild(w)}else if(!missing)w?.remove();
  }
  function useFeatureDot(btn){
    const id=btn.dataset.builderFeatureUse,f=(T.features||[]).find(x=>x.id===id),max=Math.max(1,Number(f?.uses)||1),used=Number(state().classes.treasureHunter.featureUses?.[id])||0,delta=btn.dataset.useState==='full'?1:-1,next=Math.max(0,Math.min(max,used+delta));
    state().classes.treasureHunter.featureUses||(state().classes.treasureHunter.featureUses={});state().classes.treasureHunter.featureUses[id]=next;persistDirect();
    const left=max-next;$$(`[data-builder-feature-use="${CSS.escape(id)}"]`).forEach((x,i)=>{const filled=i<left;x.classList.toggle('filled',filled);x.dataset.useState=filled?'full':'empty'});
    $$(`.feature-inline-uses`).forEach(box=>{if(box.querySelector(`[data-builder-feature-use="${CSS.escape(id)}"]`)){const label=box.querySelector(':scope>span');if(label)label.textContent=`${left}/${max} uses`}});
  }
  function selectedBuilderSkills(){return $$('[data-class-skill]:checked').map(x=>x.dataset.classSkill).filter(Boolean)}
  function patchExpertise(){
    const sel=$('#bExpertise');if(!sel)return;const current=sel.value||state().classes.treasureHunter.expertise||'',picked=selectedBuilderSkills(),prof=SKILLS.filter(n=>Number(state().character.skills?.[n])>0),opts=[...new Set([...picked,...prof,current].filter(Boolean))];
    const html='<option value="">Choose proficient skill…</option>'+opts.map(x=>`<option value="${esc(x)}" ${x===current?'selected':''}>${esc(x)}</option>`).join('');if(sel.innerHTML!==html)sel.innerHTML=html;
    sel.disabled=!opts.length;let note=sel.parentElement?.querySelector('.expertise-note');if(!note){note=document.createElement('small');note.className='muted expertise-note';sel.after(note)}note.textContent=opts.length?'Choose one of your proficient skills.':'Choose class skill proficiencies first.';
  }
  function masteryOptions(current){const owned=(state().character.gear.weapons||[]).map(x=>x?.name).filter(Boolean),opts=[...new Set([...MASTERY_WEAPONS,...owned,current].filter(Boolean))];return '<option value="">Choose weapon type…</option>'+opts.map(x=>`<option value="${esc(x)}" ${x===current?'selected':''}>${esc(x)}</option>`).join('')}
  function patchMastery(){
    ['bMastery0','bMastery1'].forEach(id=>{const old=$('#'+id);if(!old)return;const current=old.value||'';if(old.tagName==='SELECT'){const html=masteryOptions(current);if(old.innerHTML!==html)old.innerHTML=html;return}const sel=document.createElement('select');sel.id=id;sel.innerHTML=masteryOptions(current);old.replaceWith(sel)});
  }
  function removeStartingEquipment(){
    $$('#builderBody .builder-block h3').forEach(h=>{if(/Starting Equipment/i.test(h.textContent||''))h.closest('.builder-block')?.remove()});
  }
  function patchBuilder(){if(!$('#builderDialog')?.open)return;removeStartingEquipment();patchExpertise();patchMastery()}
  function patchTempHp(){
    const temp=Math.max(0,Number(state().character.hp?.temp)||0),hp=[...$$('#characterPage .hero-stats .stat')].find(x=>x.querySelector(':scope>span')?.textContent.trim()==='HP');
    if(hp){let badge=hp.querySelector('.temp-hp-chip');if(temp>0){if(!badge){badge=document.createElement('small');badge.className='temp-hp-chip';hp.appendChild(badge)}badge.textContent=`+${temp} TEMP`}else badge?.remove()}
    const hud=$('#hudHp');if(hud?.parentElement){let badge=hud.parentElement.querySelector('.hud-temp-hp');if(temp>0){if(!badge){badge=document.createElement('small');badge.className='hud-temp-hp';hud.after(badge)}badge.textContent=`+${temp} TEMP`}else badge?.remove()}
  }
  function money(){const m=state().character.gear.money||(state().character.gear.money={});if(!Number.isFinite(Number(m.ep)))m.ep=0;return m}
  function coinTile(key,label,icon){const v=Math.max(0,Number(money()[key])||0);return `<div class="coin-tile ${key}"><span class="coin-icon" aria-hidden="true">${icon}</span><b>${label}</b><div class="coin-controls"><button type="button" data-coin-step="${key}" data-step="-1" aria-label="Remove ${label}">−</button><input inputmode="numeric" type="number" min="0" value="${v}" data-coin-input="${key}" aria-label="${label}"><button type="button" data-coin-step="${key}" data-step="1" aria-label="Add ${label}">+</button></div></div>`}
  function patchMoney(){
    const root=$('#gearPage');if(!root)return;const sec=[...root.querySelectorAll(':scope>.section')].find(x=>x.querySelector('.section-head h2')?.textContent.trim()==='Money');if(!sec)return;
    sec.querySelector('.money-grid')?.remove();let wallet=sec.querySelector('.money-wallet');const html=`<div class="money-wallet" aria-label="Coins left to right: Gold, Electrum, Silver, Copper">${coinTile('gp','GP','G')}${coinTile('ep','EP','E')}${coinTile('sp','SP','S')}${coinTile('cp','CP','C')}</div>`;if(!wallet){sec.insertAdjacentHTML('beforeend',html)}else{const tmp=document.createElement('div');tmp.innerHTML=html;wallet.replaceWith(tmp.firstElementChild)}
  }
  function patchAll(){if(patching)return;patching=true;observer?.disconnect();try{patchBuilder();patchTempHp();patchMoney()}finally{patching=false;observe()}}
  function schedule(){if(scheduled||patching)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;patchAll()})}
  function observe(){observer?.disconnect();observer=new MutationObserver(schedule);['#characterPage','#gearPage','#builderDialog'].forEach(sel=>{const el=$(sel);if(el)observer.observe(el,{childList:true,subtree:true})})}

  document.addEventListener('change',e=>{
    const el=e.target;
    if(el?.dataset?.builderChoice){e.stopImmediatePropagation();writeChoice(el);return}
    if(el?.matches?.('[data-class-skill]'))setTimeout(patchExpertise,0);
    if(el?.dataset?.coinInput){const k=el.dataset.coinInput;money()[k]=Math.max(0,Math.floor(Number(el.value)||0));persistDirect();el.value=money()[k]}
  },true);
  document.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.builderFeatureUse){e.preventDefault();e.stopImmediatePropagation();useFeatureDot(b);return}
    if(b.dataset.coinStep){e.preventDefault();e.stopImmediatePropagation();const k=b.dataset.coinStep,step=Number(b.dataset.step)||0;money()[k]=Math.max(0,Math.floor((Number(money()[k])||0)+step));persistDirect();patchMoney();return}
    if(b.hasAttribute('data-open-builder')||b.dataset.builderTab)setTimeout(patchBuilder,20)
  },true);
  document.addEventListener('DOMContentLoaded',()=>{money();persistDirect();observe();setTimeout(schedule,100)});
  setTimeout(()=>{observe();schedule()},260);
})();
