(function(){
  const S=window.V7SStateV7s,R=window.DND2024Rules;
  if(!S)return;
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  let wheelRaf=0,wheelTimer=0,upgrading=false;

  function state(){return S.get()}
  function clampAmount(v){return Math.max(0,Math.min(9999,Math.floor(Number(v)||0)))}
  function persist(){try{S.normalize(state());localStorage.setItem(S.KEY,JSON.stringify(state()))}catch(_e){}}

  function hp(){
    const h=state().character.hp||(state().character.hp={current:0,max:1,temp:0});
    h.current=Math.max(0,Number(h.current)||0);h.max=Math.max(1,Number(h.max)||1);h.temp=Math.max(0,Number(h.temp)||0);
    return h;
  }

  function ensurePicker(){
    const dialog=$('#hpDialog'),oldWheel=dialog?.querySelector('.hp-wheel');if(!dialog||!oldWheel||upgrading)return;
    upgrading=true;
    try{
      dialog.classList.add('hp-v8');
      oldWheel.classList.add('hp-amount-readout');
      const minus=$('#hpMinus'),plus=$('#hpPlus');if(minus)minus.hidden=true;if(plus)plus.hidden=true;
      if(!oldWheel.querySelector('.hp-amount-caption'))oldWheel.insertAdjacentHTML('afterbegin','<span class="hp-amount-caption">AMOUNT</span>');
      if(!$('#hpAmountPicker')){
        const values=Array.from({length:100},(_,i)=>i+1).map(n=>`<span class="hp-wheel-value" data-hp-wheel-value="${n}">${n}</span>`).join('');
        oldWheel.insertAdjacentHTML('afterend',`<div id="hpAmountPicker" class="hp-amount-picker"><div class="hp-wheel-wrap"><div class="hp-wheel-marker" aria-hidden="true"></div><div id="hpAmountWheel" class="hp-amount-wheel" role="spinbutton" aria-label="Damage or healing amount" aria-valuemin="1" aria-valuemax="9999" aria-valuenow="1"><span class="hp-wheel-spacer" aria-hidden="true"></span>${values}<span class="hp-wheel-spacer" aria-hidden="true"></span></div></div><label class="hp-amount-input-label"><span>Exact amount</span><input id="hpAmountInput" type="number" min="0" max="9999" step="1" inputmode="numeric" pattern="[0-9]*" value="1"></label><small class="muted hp-picker-help">Swipe the number wheel or type the exact amount.</small></div>`);
      }
    }finally{upgrading=false}
  }

  function amount(){const input=$('#hpAmountInput');return clampAmount(input?.value??$('#hpAmount')?.textContent??1)}
  function wheelItems(){return $$('#hpAmountWheel [data-hp-wheel-value]')}
  function wheelValueAtCenter(){
    const w=$('#hpAmountWheel');if(!w)return amount();const center=w.scrollLeft+w.clientWidth/2;let best=1,dist=Infinity;
    wheelItems().forEach(el=>{const c=el.offsetLeft+el.offsetWidth/2,d=Math.abs(c-center);if(d<dist){dist=d;best=Number(el.dataset.hpWheelValue)||1}});return best;
  }
  function scrollWheelTo(v,smooth=false){
    const w=$('#hpAmountWheel'),el=w?.querySelector(`[data-hp-wheel-value="${Math.max(1,Math.min(100,clampAmount(v)||1))}"]`);if(!w||!el)return;
    const left=el.offsetLeft-(w.clientWidth-el.offsetWidth)/2;w.scrollTo({left,behavior:smooth?'smooth':'auto'});
  }
  function setAmount(v,{syncWheel=true}={}){
    v=clampAmount(v);const display=$('#hpAmount'),input=$('#hpAmountInput'),wheel=$('#hpAmountWheel');
    if(display)display.textContent=String(v);if(input&&Number(input.value)!==v)input.value=String(v);if(wheel)wheel.setAttribute('aria-valuenow',String(v));
    if(syncWheel&&v>=1&&v<=100)scrollWheelTo(v,false);
  }
  function syncPickerFromDialog(){ensurePicker();const fromApp=clampAmount($('#hpAmount')?.textContent||1)||1;setAmount(fromApp);updateHpDisplay()}

  function patchTempBadge(root,temp){
    if(!root)return;let badge=root.querySelector('.temp-hp-chip');
    if(temp>0){if(!badge){badge=document.createElement('small');badge.className='temp-hp-chip';root.appendChild(badge)}badge.textContent=`+${temp} TEMP`;badge.classList.add('active')}
    else badge?.remove();
  }
  function updateHpDisplay(){
    const h=hp();
    const hpStat=$('#characterPage [data-open-hp]');if(hpStat){const b=hpStat.querySelector(':scope>b');if(b)b.textContent=`${h.current}/${h.max}`;patchTempBadge(hpStat,h.temp)}
    const hud=$('#hudHp');if(hud){hud.textContent=`${h.current}/${h.max}`;const parent=hud.parentElement;if(parent){let badge=parent.querySelector('.hud-temp-hp');if(h.temp>0){if(!badge){badge=document.createElement('small');badge.className='hud-temp-hp';hud.after(badge)}badge.textContent=`+${h.temp} TEMP`}else badge?.remove()}}
    if($('#hpDialog')?.open){if($('#hpCurrent'))$('#hpCurrent').textContent=h.current;if($('#hpMax'))$('#hpMax').textContent=h.max;if($('#hpTempRead'))$('#hpTempRead').textContent=h.temp;if($('#hpTemp')&&document.activeElement!==$('#hpTemp'))$('#hpTemp').value=h.temp}
  }

  function manualDefenseDamage(raw,type){
    let dmg=Math.max(0,raw),d=state().character.damageDefenses||{};
    if(!type)return dmg;
    if((d.immunities||[]).includes(type))return 0;
    if((d.resistances||[]).includes(type))return Math.floor(dmg/2);
    if((d.vulnerabilities||[]).includes(type))return dmg*2;
    return dmg;
  }
  function apply(mode){
    const n=amount();if(n<=0)return;
    const tempField=$('#hpTemp'),typedTemp=tempField?Math.max(0,Math.floor(Number(tempField.value)||0)):hp().temp;
    let absorbed=0,hpDamage=0,finalDamage=0;
    S.update(s=>{
      const h=s.character.hp||(s.character.hp={current:0,max:1,temp:0});
      h.current=Math.max(0,Number(h.current)||0);h.max=Math.max(1,Number(h.max)||1);h.temp=typedTemp;
      if(mode==='damage'){
        finalDamage=manualDefenseDamage(n,$('#hpDamageType')?.value||'');
        absorbed=Math.min(h.temp,finalDamage);h.temp-=absorbed;hpDamage=Math.max(0,finalDamage-absorbed);h.current=Math.max(0,h.current-hpDamage);
      }else h.current=Math.min(h.max,h.current+n);
    });
    persist();updateHpDisplay();
    const dialog=$('#hpDialog');if(dialog?.open)dialog.close();
    const msg=mode==='damage'?(absorbed?`${finalDamage} damage: ${absorbed} absorbed by Temp HP, ${hpDamage} to HP.`:`${finalDamage} damage applied.`):`${n} HP healed.`;
    const host=$('#toastHost');if(host){const el=document.createElement('div');el.className='toast success';el.textContent=msg;host.appendChild(el);setTimeout(()=>{el.style.opacity='0';setTimeout(()=>el.remove(),180)},1900)}
  }

  function saveTempFromField(){
    const field=$('#hpTemp');if(!field)return;const v=Math.max(0,Math.floor(Number(field.value)||0));S.update(s=>{s.character.hp.temp=v});persist();updateHpDisplay();
  }

  function onWheelScroll(){
    if(wheelRaf)return;wheelRaf=requestAnimationFrame(()=>{wheelRaf=0;const v=wheelValueAtCenter();setAmount(v,{syncWheel:false})});
    clearTimeout(wheelTimer);wheelTimer=setTimeout(()=>{const v=wheelValueAtCenter();setAmount(v,{syncWheel:false});scrollWheelTo(v,true)},90);
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.id==='hpDamage'||b.id==='hpHeal'){e.preventDefault();e.stopImmediatePropagation();apply(b.id==='hpDamage'?'damage':'heal');return}
    if(b.hasAttribute('data-open-hp'))setTimeout(syncPickerFromDialog,0);
  },true);
  document.addEventListener('input',e=>{
    if(e.target?.id==='hpAmountInput'){setAmount(e.target.value);return}
    if(e.target?.id==='hpTemp'){const v=Math.max(0,Math.floor(Number(e.target.value)||0));if($('#hpTempRead'))$('#hpTempRead').textContent=String(v)}
  },true);
  document.addEventListener('change',e=>{if(e.target?.id==='hpTemp')saveTempFromField()},true);
  document.addEventListener('wheel',e=>{
    const w=e.target.closest?.('#hpAmountWheel');if(!w)return;e.preventDefault();setAmount(amount()+(e.deltaY>0||e.deltaX>0?1:-1));
  },{capture:true,passive:false});

  function bindWheel(){ensurePicker();const w=$('#hpAmountWheel');if(w&&!w.dataset.hpBound){w.dataset.hpBound='1';w.addEventListener('scroll',onWheelScroll,{passive:true});w.addEventListener('click',e=>{const v=e.target.closest('[data-hp-wheel-value]');if(v)setAmount(v.dataset.hpWheelValue)},true)}}
  const observer=new MutationObserver(()=>{bindWheel();updateHpDisplay()});
  document.addEventListener('DOMContentLoaded',()=>{bindWheel();updateHpDisplay();observer.observe(document.body,{childList:true,subtree:true})});
  setTimeout(()=>{bindWheel();updateHpDisplay();if(document.body&&!document.body.dataset.hpObserver){document.body.dataset.hpObserver='1';observer.observe(document.body,{childList:true,subtree:true})}},220);
})();