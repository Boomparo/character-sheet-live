(function(){
  const S=window.V7SStateV7s,T=window.TreasureHunterDataV7s;
  if(!S||!T)return;
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[m]));
  const SKILLS=['Acrobatics','Animal Handling','Arcana','Athletics','Deception','History','Insight','Intimidation','Investigation','Medicine','Nature','Perception','Performance','Persuasion','Religion','Sleight of Hand','Stealth','Survival'];
  const MASTERY_WEAPONS=['Club','Dagger','Greatclub','Handaxe','Javelin','Light Hammer','Mace','Quarterstaff','Sickle','Spear','Light Crossbow','Dart','Shortbow','Sling','Rapier','Scimitar','Shortsword','Whip','Hand Crossbow','Heavy Crossbow','Longbow','Pistol','Musket','Revolver','Rifle','Shotgun'];
  let scheduled=false,patching=false,observer=null;

  function state(){return S.get()}
  function persistDirect(){try{S.normalize(state());localStorage.setItem(S.KEY,JSON.stringify(state()))}catch(e){}}
  function featureDefByKey(key){for(const defs of Object.values(T.choiceDefinitions||{})){const d=(defs||[]).find(x=>x.key===key);if(d)return d}return null}
  function choiceKey(el){return el?.dataset?.builderChoice||el?.dataset?.featureChoice||''}
  function choiceValues(key){const th=state().classes.treasureHunter;if(key==='expertise')return[th.expertise||''];const v=th[key]??th.choices?.[key];return Array.isArray(v)?v:[v||'']}
  function setSelectOptions(el,opts,current,placeholder='Choose…'){
    const html=`<option value="">${esc(placeholder)}</option>${[...new Set([...(opts||[]),current].filter(Boolean))].map(x=>`<option value="${esc(x)}" ${x===current?'selected':''}>${esc(x)}</option>`).join('')}`;
    if(el.innerHTML!==html)el.innerHTML=html;
  }
  function proficientSkills(){const picked=$$('[data-class-skill]:checked').map(x=>x.dataset.classSkill).filter(Boolean),saved=SKILLS.filter(n=>Number(state().character.skills?.[n])>0),current=state().classes.treasureHunter.classSkills||[];return [...new Set([...picked,...saved,...current].filter(Boolean))]}
  function normalizeFeatureControl(el){
    const key=choiceKey(el);if(!key)return;const idx=Math.max(0,Number(el.dataset.choiceIndex)||0),current=key==='expertise'?(state().classes.treasureHunter.expertise||''):(choiceValues(key)[idx]||el.value||''),def=featureDefByKey(key);
    if(el.tagName!=='SELECT')return;
    if(def?.type==='skill'||key==='expertise')setSelectOptions(el,proficientSkills(),current,'Choose proficient skill…');
    else if(def?.type==='weapon'||key==='weaponMasteries')setSelectOptions(el,[...MASTERY_WEAPONS,...(state().character.gear.weapons||[]).map(x=>x?.name).filter(Boolean)],current,'Choose weapon type…');
    else if(def?.type==='select')setSelectOptions(el,T[def.source]||[],current,'Choose…');
    if(el.value!==current)el.value=current;
  }
  function patchFeatureControls(){$$('#featuresPage [data-builder-choice],#featuresPage [data-feature-choice]').forEach(normalizeFeatureControl)}
  function writeChoice(el){
    const key=choiceKey(el),idx=Math.max(0,Number(el.dataset.choiceIndex)||0),value=el.value;if(!key)return;
    const th=state().classes.treasureHunter;
    if(key==='expertise')th.expertise=value;
    else{
      if(!Array.isArray(th[key]))th[key]=[];
      const def=featureDefByKey(key);
      if(def?.unique&&value)th[key]=th[key].map((x,i)=>i!==idx&&x===value?'':x);
      th[key][idx]=value;
    }
    persistDirect();
    $$(`[data-builder-choice="${CSS.escape(key)}"],[data-feature-choice="${CSS.escape(key)}"]`).forEach(x=>{const i=Math.max(0,Number(x.dataset.choiceIndex)||0),next=key==='expertise'?th.expertise:(th[key]?.[i]||'');if(x!==el&&x.value!==next)x.value=next});
    refreshChoiceWarning(el.closest('.row-card'));
  }
  function refreshChoiceWarning(card){
    if(!card)return;const f=(T.features||[]).find(x=>x.id===card.dataset.row);if(!f)return;let missing=0;
    for(const d of T.choiceDefinitions?.[f.id]||[]){const v=d.key==='expertise'?[state().classes.treasureHunter.expertise]:state().classes.treasureHunter[d.key],count=(Array.isArray(v)?v:[v]).filter(Boolean).length;missing+=Math.max(0,d.count-count)}
    card.classList.toggle('needs-choice',missing>0);const w=card.querySelector('.choice-warning');if(w)w.hidden=!missing;
  }
  function useFeatureDot(btn){
    const id=btn.dataset.builderFeatureUse,f=(T.features||[]).find(x=>x.id===id),max=Math.max(1,Number(f?.uses)||1),used=Number(state().classes.treasureHunter.featureUses?.[id])||0,delta=btn.dataset.useState==='full'?1:-1,next=Math.max(0,Math.min(max,used+delta));
    state().classes.treasureHunter.featureUses||(state().classes.treasureHunter.featureUses={});state().classes.treasureHunter.featureUses[id]=next;persistDirect();const left=max-next;
    $$(`[data-builder-feature-use="${CSS.escape(id)}"]`).forEach((x,i)=>{const filled=i<left;x.classList.toggle('filled',filled);x.dataset.useState=filled?'full':'empty'});
    $$('.feature-inline-uses').forEach(box=>{if(box.querySelector(`[data-builder-feature-use="${CSS.escape(id)}"]`)){const label=box.querySelector(':scope>span');if(label){const text=`${left}/${max} uses`;if(label.firstChild?.nodeType===3)label.firstChild.nodeValue=text;else label.textContent=text}}});
  }

  function patchExpertise(){
    const sel=$('#bExpertise');if(!sel)return;const current=state().classes.treasureHunter.expertise||sel.value||'',opts=[...new Set([...proficientSkills(),current].filter(Boolean))];
    setSelectOptions(sel,opts,current,'Choose proficient skill…');sel.disabled=!opts.length;
    let note=sel.parentElement?.querySelector('.expertise-note');if(!note){note=document.createElement('small');note.className='muted expertise-note';sel.after(note)}note.textContent=opts.length?'Choose one of your currently proficient skills.':'Choose class skill proficiencies first.';
  }
  function masteryOptions(current){return [...new Set([...MASTERY_WEAPONS,...(state().character.gear.weapons||[]).map(x=>x?.name).filter(Boolean),current].filter(Boolean))]}
  function patchMastery(){
    ['bMastery0','bMastery1'].forEach(id=>{const old=$('#'+id);if(!old)return;const current=state().classes.treasureHunter.weaponMasteries?.[Number(id.slice(-1))]||old.value||'';let sel=old;if(old.tagName!=='SELECT'){sel=document.createElement('select');sel.id=id;old.replaceWith(sel)}setSelectOptions(sel,masteryOptions(current),current,'Choose weapon type…')});
  }
  function removeStartingEquipment(){
    const body=$('#builderBody');if(!body)return;
    if(!$('#bStartMelee'))body.insertAdjacentHTML('beforeend','<input type="hidden" id="bStartMelee" value=""><input type="hidden" id="bStartRanged" value="">');
    $$('#builderBody .builder-block h3').forEach(h=>{if(/Starting Equipment/i.test(h.textContent||''))h.closest('.builder-block')?.remove()});
    if(!body.querySelector('.gear-managed-note'))body.insertAdjacentHTML('beforeend','<div class="gear-managed-note">Starting equipment is not forced by the builder. Add and equip items manually on the Gear page.</div>');
  }
  function patchBuilder(){if(!$('#builderDialog')?.open)return;removeStartingEquipment();patchExpertise();patchMastery()}

  function patchTempHp(){
    const temp=Math.max(0,Number(state().character.hp?.temp)||0),hp=[...$$('#characterPage .hero-stats .stat')].find(x=>x.querySelector(':scope>span')?.textContent.trim()==='HP');
    if(hp){let badge=hp.querySelector('.temp-hp-chip');if(!badge){badge=document.createElement('small');badge.className='temp-hp-chip';hp.appendChild(badge)}badge.textContent=`TEMP ${temp}`;badge.classList.toggle('active',temp>0)}
    const hud=$('#hudHp');if(hud?.parentElement){let badge=hud.parentElement.querySelector('.hud-temp-hp');if(temp>0){if(!badge){badge=document.createElement('small');badge.className='hud-temp-hp';hud.after(badge)}badge.textContent=`+${temp} TEMP`}else badge?.remove()}
  }

  function money(){const m=state().character.gear.money||(state().character.gear.money={});for(const k of ['gp','ep','sp','cp'])if(!Number.isFinite(Number(m[k])))m[k]=0;return m}
  function compact(n){n=Math.max(0,Math.floor(Number(n)||0));if(n<10000)return new Intl.NumberFormat('en-US').format(n);if(n<1e6)return `${(n/1e3).toFixed(n>=1e5?0:1).replace('.0','')}k`;if(n<1e9)return `${(n/1e6).toFixed(n>=1e8?0:1).replace('.0','')}m`;return `${(n/1e9).toFixed(1).replace('.0','')}b`}
  const COINS=[['gp','GP','G'],['ep','EP','E'],['sp','SP','S'],['cp','CP','C']];
  function coinTile(key,label,icon){const v=money()[key];return `<button type="button" class="coin-tile ${key}" data-money-open="${key}" aria-label="Edit ${label}"><span class="coin-icon" aria-hidden="true">${icon}</span><span class="coin-copy"><b>${label}</b><strong data-coin-value="${key}" title="${Math.floor(Number(v)||0)}">${compact(v)}</strong></span></button>`}
  function ensureMoneyDialog(){if($('#moneyDialog'))return;document.body.insertAdjacentHTML('beforeend',`<dialog id="moneyDialog" class="sheet-dialog money-dialog"><form method="dialog"><div class="dialog-head"><strong>Money</strong><button value="cancel" class="icon-btn">×</button></div><p class="muted">Edit exact amounts. The Gear page only shows a compact status.</p><div class="money-edit-grid">${COINS.map(([k,l,i])=>`<label><span class="coin-icon ${k}">${i}</span>${l}<input id="moneyEdit_${k}" type="number" min="0" step="1" inputmode="numeric"></label>`).join('')}</div><menu><button value="cancel" class="ghost">Cancel</button><button type="button" id="moneySave" class="primary">Save Money</button></menu></form></dialog>`)}
  function openMoney(focusKey='gp'){ensureMoneyDialog();const m=money();for(const [k] of COINS)$('#moneyEdit_'+k).value=Math.max(0,Math.floor(Number(m[k])||0));$('#moneyDialog').showModal();setTimeout(()=>$('#moneyEdit_'+focusKey)?.focus(),40)}
  function saveMoney(){const m=money();for(const [k] of COINS)m[k]=Math.max(0,Math.floor(Number($('#moneyEdit_'+k)?.value)||0));persistDirect();$('#moneyDialog')?.close();patchMoney()}
  function patchMoney(){
    const root=$('#gearPage');if(!root)return;const sec=[...root.querySelectorAll(':scope>.section')].find(x=>x.querySelector('.section-head h2')?.textContent.trim()==='Money');if(!sec)return;sec.querySelector('.money-grid')?.remove();
    let wallet=sec.querySelector('.money-wallet');if(!wallet){wallet=document.createElement('div');wallet.className='money-wallet';wallet.setAttribute('aria-label','Coins left to right: Gold, Electrum, Silver, Copper');wallet.innerHTML=COINS.map(x=>coinTile(...x)).join('');sec.appendChild(wallet)}else for(const [k] of COINS){const el=wallet.querySelector(`[data-coin-value="${k}"]`),v=money()[k];if(el){el.textContent=compact(v);el.title=String(Math.floor(Number(v)||0))}}
  }

  function patchAll(){if(patching)return;patching=true;observer?.disconnect();try{patchBuilder();patchTempHp();patchMoney();ensureMoneyDialog()}finally{patching=false;observe()}}
  function schedule(){if(scheduled||patching)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;patchAll()})}
  function observe(){observer?.disconnect();observer=new MutationObserver(schedule);['#characterPage','#gearPage','#builderDialog'].forEach(sel=>{const el=$(sel);if(el)observer.observe(el,{childList:true,subtree:true})})}

  document.addEventListener('change',e=>{
    const el=e.target,key=choiceKey(el);if(key&&$('#featuresPage')?.contains(el)){e.preventDefault();e.stopImmediatePropagation();writeChoice(el);return}
    if(el?.matches?.('[data-class-skill]'))setTimeout(patchExpertise,0);
  },true);
  document.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.builderFeatureUse){e.preventDefault();e.stopImmediatePropagation();useFeatureDot(b);return}
    if(b.dataset.moneyOpen){e.preventDefault();e.stopImmediatePropagation();openMoney(b.dataset.moneyOpen);return}
    if(b.id==='moneySave'){e.preventDefault();e.stopImmediatePropagation();saveMoney();return}
    if(b.hasAttribute('data-open-builder')||b.dataset.builderTab)setTimeout(patchBuilder,30)
  },true);
  document.addEventListener('DOMContentLoaded',()=>{money();persistDirect();ensureMoneyDialog();observe();setTimeout(schedule,100)});
  setTimeout(()=>{observe();schedule()},260);
})();