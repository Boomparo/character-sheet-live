(function(){
  const S=window.V7SStateV7s;
  const TITLES=['CHARACTER','ACTIONS','SKILLS','FEATURES','RELICS','GEAR','NPCs'];
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  let pager=null,pointerId=null,active=false,axis='',startX=0,startY=0,startScroll=0,startIndex=0,lastX=0,lastT=0,dragged=false,suppressClickUntil=0,settleTimer=0;

  function width(){return Math.max(1,pager?.clientWidth||1)}
  function clamp(i){return Math.max(0,Math.min(TITLES.length-1,Number(i)||0))}
  function indexFromScroll(){return clamp(Math.round((pager?.scrollLeft||0)/width()))}
  function updateChrome(i){
    i=clamp(i);
    const title=$('#pageTitle');if(title&&title.textContent!==TITLES[i])title.textContent=TITLES[i];
    $$('#pageDots .page-dot').forEach((d,j)=>d.classList.toggle('active',j===i));
  }
  function persist(i){if(S)S.update(s=>{s.ui||(s.ui={});s.ui.page=clamp(i)})}
  function snap(i,smooth=true){
    if(!pager)return;i=clamp(i);clearTimeout(settleTimer);
    pager.classList.remove('swipe-dragging');pager.classList.add('swipe-settling');
    pager.style.scrollSnapType='none';pager.style.scrollBehavior=smooth?'smooth':'auto';
    updateChrome(i);persist(i);
    pager.scrollTo({left:width()*i,behavior:smooth?'smooth':'auto'});
    settleTimer=setTimeout(()=>{pager.classList.remove('swipe-settling');pager.style.scrollSnapType='';pager.style.scrollBehavior='';pager.scrollLeft=width()*i;updateChrome(i)},smooth?300:20);
  }
  function ignoredTarget(t){return !!t.closest('input,textarea,select,[contenteditable="true"],dialog,.crop-stage,.hp-wheel')}
  function down(e){
    if(!pager||e.pointerType==='mouse'&&e.button!==0||ignoredTarget(e.target))return;
    pointerId=e.pointerId;active=true;axis='';dragged=false;startX=lastX=e.clientX;startY=e.clientY;lastT=performance.now();startScroll=pager.scrollLeft;startIndex=indexFromScroll();
  }
  function move(e){
    if(!active||e.pointerId!==pointerId)return;
    const dx=e.clientX-startX,dy=e.clientY-startY,adx=Math.abs(dx),ady=Math.abs(dy);
    if(!axis&&Math.max(adx,ady)>=6)axis=adx>ady*1.08?'x':'y';
    if(axis!=='x')return;
    e.preventDefault();dragged=dragged||adx>8;
    try{pager.setPointerCapture(e.pointerId)}catch(_e){}
    pager.classList.add('swipe-dragging');pager.style.scrollSnapType='none';pager.style.scrollBehavior='auto';
    pager.scrollLeft=startScroll-dx;
    updateChrome(indexFromScroll());
    lastX=e.clientX;lastT=performance.now();
  }
  function finish(e,cancelled=false){
    if(!active||e.pointerId!==pointerId)return;
    const endX=e.clientX??lastX,dx=endX-startX,elapsed=Math.max(1,performance.now()-lastT),vx=(endX-lastX)/elapsed,w=width();
    if(axis==='x'){
      const threshold=Math.min(58,w*0.14),fast=Math.abs(vx)>.32;
      let target=startIndex;
      if(!cancelled&&(Math.abs(dx)>=threshold||fast))target=startIndex+(dx<0?1:-1);
      else target=indexFromScroll();
      if(dragged)suppressClickUntil=Date.now()+360;
      snap(target,true);
    }
    try{pager.releasePointerCapture(e.pointerId)}catch(_e){}
    pointerId=null;active=false;axis='';dragged=false;
  }
  function init(){
    pager=$('#pager');if(!pager||pager.dataset.swipeV8)return;pager.dataset.swipeV8='1';pager.classList.add('swipe-v8');
    pager.addEventListener('pointerdown',down,{passive:true});
    pager.addEventListener('pointermove',move,{passive:false});
    pager.addEventListener('pointerup',e=>finish(e,false),{passive:true});
    pager.addEventListener('pointercancel',e=>finish(e,true),{passive:true});
    pager.addEventListener('click',e=>{if(Date.now()<suppressClickUntil){e.preventDefault();e.stopImmediatePropagation()}},true);
    window.addEventListener('resize',()=>snap(indexFromScroll(),false),{passive:true});
    updateChrome(indexFromScroll());
  }
  document.addEventListener('DOMContentLoaded',init);setTimeout(init,120);
})();
