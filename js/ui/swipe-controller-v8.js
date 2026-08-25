(function(){
  // NATIVE_SWIPE_RESTORED
  // The earlier builds felt better because the browser handled the horizontal gesture
  // and CSS Scroll Snap handled settling. Do not intercept pointer/touch movement here.
  const $=s=>document.querySelector(s);
  function restoreNativePager(){
    const pager=$('#pager');
    if(!pager)return;
    pager.classList.remove('swipe-v8','swipe-dragging','swipe-settling');
    pager.removeAttribute('data-swipe-v8');
    pager.dataset.nativeSwipeV8='1';
    for(const prop of ['scroll-snap-type','scroll-behavior','touch-action'])pager.style.removeProperty(prop);
  }
  document.addEventListener('DOMContentLoaded',restoreNativePager,{once:true});
  window.addEventListener('pageshow',restoreNativePager,{passive:true});
  setTimeout(restoreNativePager,120);
})();
