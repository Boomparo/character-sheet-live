(function(){
  const S=window.V7SStateV7s;
  const TITLES=['CHARACTER','ACTIONS','SKILLS','FEATURES','RELICS','GEAR','NPCs'];
  let pager=null,startX=0,startY=0,startLeft=0,startPage=0,startTime=0,axis='',tracking=false,settleTimer=0;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const width=()=>Math.max(1,pager?.clientWidth||1);
  const page=()=>clamp(Math.round((pager?.scrollLeft||0)/width()),0,TITLES.length-1);
  function chrome(i){
    i=clamp(i,0,TITLES.length-1);
    const title=document.querySelector('#pageTitle');if(title&&title.textContent!==TITLES[i])title.textContent=TITLES[i];
    document.querySelectorAll('#pageDots .page-dot').forEach((d,j)=>d.classList.toggle('active',j===i));
    if(S)S.update(s=>{s.ui||(s.ui={});s.ui.page=i});
  }
  function snap(i,smooth=true){
    if(!pager)return;i=clamp(i,0,TITLES.length-1);const left=i*width();
    pager.classList.remove('manual-swipe');chrome(i);
    pager.scrollTo({left,behavior:smooth?'smooth':'auto'});
    clearTimeout(settleTimer);settleTimer=setTimeout(()=>{if(Math.abs(pager.scrollLeft-left)>2)pager.scrollTo({left,behavior:'auto'});chrome(i)},smooth?240:20);
  }
  function nearest(){if(!tracking)snap(page(),true)}
  function ignoreStart(target){return !!target.closest('input,textarea,select,[contenteditable="true"],.filters,.ability-grid,.catalog-results,.crop-stage,.crop-controls');}
  function onStart(e){
    if(e.touches?.length!==1||!pager||ignoreStart(e.target))return;
    const t=e.touches[0];tracking=true;axis='';startX=t.clientX;startY=t.clientY;startLeft=pager.scrollLeft;startPage=page();startTime=performance.now();clearTimeout(settleTimer);
  }
  function onMove(e){
    if(!tracking||e.touches?.length!==1)return;const t=e.touches[0],dx=t.clientX-startX,dy=t.clientY-startY,ax=Math.abs(dx),ay=Math.abs(dy);
    if(!axis&&Math.max(ax,ay)>7)axis=ax>ay*1.12?'x':'y';
    if(axis!=='x')return;
    e.preventDefault();pager.classList.add('manual-swipe');pager.scrollLeft=startLeft-dx;
  }
  function finish(e){
    if(!tracking)return;tracking=false;
    if(axis!=='x'){pager?.classList.remove('manual-swipe');return}
    const t=e.changedTouches?.[0],dx=(t?.clientX??startX)-startX,move=-dx,dt=Math.max(1,performance.now()-startTime),v=Math.abs(move)/dt,w=width();
    let target=startPage;if(Math.abs(move)>w*.14||v>.34)target+=move>0?1:-1;
    snap(target,true);axis='';
  }
  function onScroll(){if(tracking)return;clearTimeout(settleTimer);settleTimer=setTimeout(()=>snap(page(),true),75)}
  function init(){
    pager=document.querySelector('#pager');if(!pager||pager.dataset.swipeV8)return;pager.dataset.swipeV8='1';
    pager.addEventListener('touchstart',onStart,{passive:true});pager.addEventListener('touchmove',onMove,{passive:false});pager.addEventListener('touchend',finish,{passive:true});pager.addEventListener('touchcancel',finish,{passive:true});
    pager.addEventListener('scroll',onScroll,{passive:true});
    if('onscrollend' in pager)pager.addEventListener('scrollend',()=>{if(!tracking)snap(page(),false)},{passive:true});
    window.addEventListener('resize',()=>snap(Number(S?.get()?.ui?.page)||page(),false),{passive:true});
    requestAnimationFrame(()=>snap(Number(S?.get()?.ui?.page)||0,false));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
