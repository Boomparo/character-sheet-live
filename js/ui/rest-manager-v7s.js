(function(){
  const S=window.V7SStateV7s,T=window.TreasureHunterDataV7s,D=window.V7SDerived;
  if(!S||!T||!D)return;
  let mode='SR',dieCount=0;
  const $=s=>document.querySelector(s);
  const checked=id=>!!$(id)?.checked;
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

  function inject(){
    if($('#restDialog'))return;
    document.body.insertAdjacentHTML('beforeend',`<dialog id="restDialog" class="sheet-dialog rest-dialog"><form method="dialog"><div class="dialog-head"><strong id="restTitle">Rest</strong><button value="cancel" class="icon-btn" aria-label="Close">×</button></div><div id="restBody"></div><div id="restError" class="rest-error" hidden></div><menu><button value="cancel" class="ghost">Cancel</button><button id="applyRest" type="button" class="primary">Finish Rest</button></menu></form></dialog>`);
    $('#applyRest').addEventListener('click',apply);
    $('#restBody').addEventListener('click',e=>{const b=e.target.closest('[data-rest-die]');if(!b)return;const hd=D.hitDice();dieCount=Math.max(0,Math.min(hd.available,dieCount+Number(b.dataset.restDie)));render()});
  }
  function option(id,title,sub,checkedByDefault=true){return `<label class="rest-option"><input id="${id}" type="checkbox" ${checkedByDefault?'checked':''}><span><b>${esc(title)}</b><small>${esc(sub)}</small></span></label>`}
  function render(){
    inject();const s=S.get(),hd=D.hitDice(),con=D.mod('CON'),hp=s.character.hp;$('#restTitle').textContent=mode==='SR'?'Short Rest':'Long Rest';
    if(mode==='SR'){
      dieCount=Math.min(dieCount,hd.available);
      $('#restBody').innerHTML=`<div class="rest-summary"><span>HP <b>${hp.current}/${hp.max}</b></span><span>Hit Dice <b>${hd.available}/${hd.total} ${hd.die}</b></span><span>CON <b>${con>=0?'+':''}${con}</b></span></div><section class="rest-block"><div class="rest-block-head"><div><b>Spend Hit Dice</b><small>Each d10 heals the roll + CON modifier, minimum 1 HP per die.</small></div><div class="rest-die-stepper"><button type="button" data-rest-die="-1">−</button><strong>${dieCount}</strong><button type="button" data-rest-die="1">+</button></div></div><small class="muted">Available: ${hd.available}d10</small></section><section class="rest-block"><b>Recharge</b>${option('restCool','Cool Points','Restore all spent Cool Points.')}${option('restFeatures','Short-Rest Features','Recharge features that return on a Short or Long Rest.')}${option('restRelics','Relic Charges','Recharge relics that return on a Short or Long Rest.')}</section>`;
    }else{
      $('#restBody').innerHTML=`<div class="rest-summary"><span>HP <b>${hp.current}/${hp.max}</b></span><span>Hit Dice <b>${hd.available}/${hd.total} ${hd.die}</b></span><span>Exhaustion <b>${Number(s.character.exhaustion)||0}</b></span></div><section class="rest-block"><b>Long Rest Benefits</b>${option('restHp','Hit Points','Restore all lost HP.')}${option('restTemp','Temporary HP','Clear Temporary HP at the end of the rest.')}${option('restHitDice','Hit Dice','Restore all spent Hit Point Dice.')}${option('restCool','Cool Points','Restore all spent Cool Points.')}${option('restFeatures','Feature Uses','Recharge Short- and Long-Rest features.')}${option('restRelics','Relic Charges','Recharge Short- and Long-Rest relics.')}${option('restExhaustion','Exhaustion','Reduce Exhaustion by 1 level.')}</section>`;
    }
    $('#restError').hidden=true;
  }
  function rechargeFeatures(s,kind){const uses=s.classes.treasureHunter.featureUses||(s.classes.treasureHunter.featureUses={});Object.keys(uses).forEach(id=>{const f=(T.features||[]).find(x=>x.id===id);if(!f)return;const r=String(f.recovery||'').toUpperCase();if(kind==='LR'&&r)uses[id]=0;else if(kind==='SR'&&(r.includes('SR')||r.includes('SHORT')))uses[id]=0})}
  function rechargeRelics(s,kind){(s.classes.treasureHunter.relics||[]).forEach(x=>{if(typeof x!=='object')return;const r=(T.relics||[]).find(y=>y.id===x.id);if(!r)return;const rec=String(r.recovery||'LR').toUpperCase();if(kind==='LR'||rec.includes('SR')||rec.includes('SHORT'))x.used=0})}
  function rollD10(){return 1+Math.floor(Math.random()*10)}
  function apply(){
    const before=S.get();if((Number(before.character.hp.current)||0)<=0){const e=$('#restError');e.textContent='A rest requires at least 1 HP to start.';e.hidden=false;return}
    let healing=0,rolls=[];
    S.update(s=>{
      if(mode==='SR'){
        const hd=s.character.hitDice.d10,available=Math.max(0,(Number(s.character.level)||1)-(Number(hd.spent)||0)),count=Math.min(dieCount,available),con=S.modifier(s.character.abilities.CON);
        for(let i=0;i<count;i++){const roll=rollD10(),gain=Math.max(1,roll+con);rolls.push(`${roll}${con>=0?'+':''}${con}=${gain}`);healing+=gain}
        hd.spent=(Number(hd.spent)||0)+count;s.character.hp.current=Math.min(s.character.hp.max,s.character.hp.current+healing);
        if(checked('#restCool'))s.classes.treasureHunter.coolUsed=0;if(checked('#restFeatures'))rechargeFeatures(s,'SR');if(checked('#restRelics'))rechargeRelics(s,'SR');
      }else{
        if(checked('#restHp'))s.character.hp.current=s.character.hp.max;if(checked('#restTemp'))s.character.hp.temp=0;if(checked('#restHitDice'))s.character.hitDice.d10.spent=0;if(checked('#restCool'))s.classes.treasureHunter.coolUsed=0;if(checked('#restFeatures'))rechargeFeatures(s,'LR');if(checked('#restRelics'))rechargeRelics(s,'LR');if(checked('#restExhaustion'))s.character.exhaustion=Math.max(0,(Number(s.character.exhaustion)||0)-1);
      }
    });
    S.flush();try{sessionStorage.setItem('v7s-rest-result',mode==='SR'&&rolls.length?`Short Rest: healed ${healing} HP (${rolls.join(', ')}).`:`${mode==='SR'?'Short':'Long'} Rest completed.`)}catch(e){}$('#restDialog').close();setTimeout(()=>location.reload(),70);
  }
  function open(kind){mode=kind;dieCount=0;render();$('#restDialog').showModal()}
  document.addEventListener('click',e=>{const b=e.target.closest('[data-short-rest],[data-long-rest]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();open(b.hasAttribute('data-short-rest')?'SR':'LR')},true);
  document.addEventListener('DOMContentLoaded',()=>{inject();try{const m=sessionStorage.getItem('v7s-rest-result');if(m){sessionStorage.removeItem('v7s-rest-result');const host=$('#toastHost');if(host){const el=document.createElement('div');el.className='toast success';el.textContent=m;host.appendChild(el);setTimeout(()=>el.remove(),2600)}}}catch(e){}});
})();