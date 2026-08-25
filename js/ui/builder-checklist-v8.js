(function(){
  const S=window.V7SStateV7s;
  const $=s=>document.querySelector(s);
  let scheduled=false,patching=false,observer=null;

  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;patch()})}
  function patch(){
    if(patching)return;patching=true;
    try{
      const source=$('#characterPage #levelChecklist');
      if(source){source.setAttribute('aria-hidden','true');source.dataset.builderSource='1'}
      const dialog=$('#builderDialog'),body=$('#builderBody');
      if(!source||!dialog||!body||!dialog.open)return;
      let host=body.querySelector('#builderLevelChecklistHost');
      if(!host){host=document.createElement('div');host.id='builderLevelChecklistHost';host.className='builder-level-checklist-host';body.prepend(host)}
      const signature=source.outerHTML.replace(/id="levelChecklist"/,'id="builderLevelChecklist"').replace(/aria-hidden="true"/g,'').replace(/data-builder-source="1"/g,'');
      if(host.dataset.signature===signature)return;
      host.dataset.signature=signature;
      const clone=source.cloneNode(true);clone.id='builderLevelChecklist';clone.removeAttribute('aria-hidden');clone.removeAttribute('data-builder-source');clone.style.display='';
      host.replaceChildren(clone);
    }finally{patching=false}
  }
  function observe(){
    observer?.disconnect();observer=new MutationObserver(schedule);
    const char=$('#characterPage'),dialog=$('#builderDialog');
    if(char)observer.observe(char,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    if(dialog)observer.observe(dialog,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});
  }
  document.addEventListener('click',e=>{if(e.target.closest('[data-open-builder],[data-builder-tab],[data-review-level]'))setTimeout(schedule,25)},true);
  document.addEventListener('DOMContentLoaded',()=>{observe();setTimeout(schedule,80)});
  S?.subscribe(()=>setTimeout(schedule,20));
  setTimeout(()=>{observe();schedule()},220);
})();
