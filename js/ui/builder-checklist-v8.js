(function(){
  const S=window.V7SStateV7s,$=s=>document.querySelector(s);
  let scheduled=false,patching=false,observer=null;
  function schedule(){if(scheduled||patching)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;patch()})}
  function patch(){if(patching)return;patching=true;observer?.disconnect();try{$('#levelChecklist')?.remove();$('#builderLevelChecklist')?.remove();$('#builderLevelChecklistHost')?.remove()}finally{patching=false;observe()}}
  function observe(){observer?.disconnect();observer=new MutationObserver(schedule);const c=$('#characterPage'),b=$('#builderDialog');if(c)observer.observe(c,{childList:true,subtree:true});if(b)observer.observe(b,{childList:true,subtree:true})}
  document.addEventListener('DOMContentLoaded',()=>{observe();setTimeout(schedule,80)});
  S?.subscribe(()=>setTimeout(schedule,20));
  setTimeout(()=>{observe();schedule()},220);
})();
