(function(){
  const S=window.V7SStateV7s;
  let timer=0,sourceObserver=null;
  function sync(){
    clearTimeout(timer);const dialog=document.querySelector('#builderDialog'),body=document.querySelector('#builderBody'),source=document.querySelector('#characterPage #levelChecklist');if(!dialog||!body||!source)return;
    let host=dialog.querySelector('#builderLevelChecklist');if(!host){host=document.createElement('div');host.id='builderLevelChecklist';host.className='builder-level-checklist-wrap';body.before(host)}
    const clone=source.cloneNode(true);clone.id='builderLevelChecklistCard';clone.classList.add('inside-builder');host.replaceChildren(clone);
  }
  function schedule(delay=40){clearTimeout(timer);timer=setTimeout(sync,delay)}
  function watchSource(){const source=document.querySelector('#characterPage');if(!source)return;sourceObserver?.disconnect();sourceObserver=new MutationObserver(()=>schedule(20));sourceObserver.observe(source,{childList:true,subtree:true})}
  function init(){
    document.documentElement.classList.add('checklist-in-builder');watchSource();schedule(120);
    document.addEventListener('click',e=>{if(e.target.closest('[data-open-builder]'))schedule(80);if(e.target.closest('[data-review-level]'))schedule(80)},true);
    S?.subscribe(()=>schedule(80));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
