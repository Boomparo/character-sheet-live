(function(){
  const S=window.V7SStateV7s;
  const TITLES=['CHARACTER','ACTIONS','SKILLS','FEATURES','RELICS','GEAR','NPCs'];
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  let pager=null,pointerId=null,active=false,axis='',startX=0,startY=0,startLeft=0,startIndex=0,lastX=0,lastT=0,velocityX=0,dragged=false,suppressClickUntil=0,settleTimer=0,settling=false;

  function pages(){return pager?[...pager.querySelectorAll(':scope>.sheet-page')]:[]}
  function clamp(i){return Math.max(0,Math.min(TITLES.length-1,Number(i)||0))}
  function pageLeft(i){const ps=pages(),p=ps[clamp(i)];if(!pager||!p)return Math.max(0,(pager?.clientWidth||1)*clamp(i));const pr=pager.getBoundingClientRect(),r=p.getBoundingClientRect();return pager.scrollLeft+(r.left-pr.left)}
  function nearestIndex(){if(!pager)return 0;const x=pager.scrollLeft,ps=pages();let best=0,dist=Infinity;ps.forEach((_,i)=>{const d=Math.abs(pageLeft(i)-x);if(d<dist){dist=d;best=i}});return clamp(best)}
  function updateChrome(i){i=clamp(i);const title=$('#pageTitle');if(title&&title.textContent!==TITLES[i])title.textContent=TITLES[i];$$('#pageDots .page-dot').forEach((d,j)=>d.classList.toggle('active',j===i))}
  function persist(i){if(S)S.update(s=>{s.ui||(s.ui={});s.ui.page=clamp(i)})}
  function exact(i){if(!pager)return;i=clamp(i);pager.scrollLeft=pageLeft(i);updateChrome(i)}
  function snap(i,smooth=true){
    if(!pager)return;i=clamp(i);clearTimeout(settleTimer);settling=true;pager.classList.remove('swipe-dragging');pager.classList.add('swipe-settling');pager.style.scrollSnapType='none';pager.style.scrollBehavior='auto';updateChrome(i);persist(i);
    const left=pageLeft(i);
    if(smooth&&typeof pager.animate==='function'){
      const from=pager.scrollLeft,start=performance.now(),duration=180;
      const tick=now=>{if(!settling)return;const t=Math.min(1,(now-start)/duration),e=1-Math.pow(1-t,3);pager.scrollLeft=from+(left-from)*e;if(t<1)requestAnimationFrame(tick);else finishSettle(i)};requestAnimationFrame(tick);
    }else{pager.scrollLeft=left;finishSettle(i)}
    settleTimer=setTimeout(()=>finishSettle(i),260);
  }
  function finishSettle(i){if(!pager)return;clearTimeout(settleTimer);settling=false;pager.classList.remove('swipe-settling');pager.style.scrollSnapType='';pager.style.scrollBehavior='';requestAnimationFrame(()=>exact(i))}
  function ignoredTarget(t){return !!t.closest('input,textarea,select,[contenteditable="true"],dialog,.crop-stage,.hp-wheel')}
  function down(e){if(!pager||(e.pointerType==='mouse'&&e.button!==0)||ignoredTarget(e.target)||settling)return;pointerId=e.pointerId;active=true;axis='';dragged=false;velocityX=0;startX=lastX=e.clientX;startY=e.clientY;lastT=performance.now();startIndex=nearestIndex();startLeft=pageLeft(startIndex);exact(startIndex)}
  function move(e){
    if(!active||e.pointerId!==pointerId)return;const dx=e.clientX-startX,dy=e.clientY-startY,adx=Math.abs(dx),ady=Math.abs(dy);
    if(!axis&&Math.max(adx,ady)>=5)axis=adx>ady*1.12?'x':'y';if(axis!=='x')return;
    e.preventDefault();dragged=dragged||adx>7;try{pager.setPointerCapture(e.pointerId)}catch(_e){}
    pager.classList.add('swipe-dragging');pager.style.scrollSnapType='none';pager.style.scrollBehavior='auto';
    const now=performance.now(),dt=Math.max(1,now-lastT);velocityX=(e.clientX-lastX)/dt;lastX=e.clientX;lastT=now;
    const min=pageLeft(0),max=pageLeft(TITLES.length-1);pager.scrollLeft=Math.max(min,Math.min(max,startLeft-dx));updateChrome(nearestIndex());
  }
  function finish(e,cancelled=false){
    if(!active||e.pointerId!==pointerId)return;const endX=Number.isFinite(e.clientX)?e.clientX:lastX,dx=endX-startX,w=Math.max(1,pager.clientWidth),threshold=Math.min(64,w*.13),fast=Math.abs(velocityX)>.28;let target=startIndex;
    if(axis==='x'&&!cancelled&&(Math.abs(dx)>=threshold||fast))target=startIndex+(dx<0?1:-1);
    if(axis==='x'&&dragged)suppressClickUntil=Date.now()+320;
    try{pager.releasePointerCapture(e.pointerId)}catch(_e){}pointerId=null;active=false;axis='';dragged=false;snap(target,axis!=='y');
  }
  function init(){
    pager=$('#pager');if(!pager||pager.dataset.swipeV8==='2')return;pager.dataset.swipeV8='2';pager.classList.add('swipe-v8');
    pager.addEventListener('pointerdown',down,{passive:true});pager.addEventListener('pointermove',move,{passive:false});pager.addEventListener('pointerup',e=>finish(e,false),{passive:true});pager.addEventListener('pointercancel',e=>finish(e,true),{passive:true});pager.addEventListener('lostpointercapture',e=>{if(active&&e.pointerId===pointerId)finish(e,false)},{passive:true});
    pager.addEventListener('scrollend',()=>{if(!active&&!settling)snap(nearestIndex(),false)},{passive:true});pager.addEventListener('click',e=>{if(Date.now()<suppressClickUntil){e.preventDefault();e.stopImmediatePropagation()}},true);
    window.addEventListener('resize',()=>{if(!active)snap(nearestIndex(),false)},{passive:true});document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&!active)snap(nearestIndex(),false)});updateChrome(nearestIndex());setTimeout(()=>snap(Number(S?.get()?.ui?.page)||nearestIndex(),false),60);
  }
  document.addEventListener('DOMContentLoaded',init);setTimeout(init,140);
})();
