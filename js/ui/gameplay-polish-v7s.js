(function(){
  ['css/experience-v7s.css','css/experience-v8.css'].forEach(href=>{if(document.querySelector(`link[href="${href}"]`))return;const css=document.createElement('link');css.rel='stylesheet';css.href=href;document.head.appendChild(css)});
  const queue=[
    'js/classes/treasure-hunter/feature-names-v8.js',
    'js/core/campaign-origin-v7s.js',
    'js/ui/actions-v7s.js',
    'js/ui/character-builder-v7s.js',
    'js/ui/inventory-containers-v7s.js',
    'js/ui/origin-builder-v7s.js',
    'js/ui/experience-extras-v8.js',
    'js/ui/import-v7s.js'
  ];
  function load(i){if(i>=queue.length)return;const src=queue[i];if(document.querySelector(`script[src="${src}"]`)){load(i+1);return}const s=document.createElement('script');s.src=src;s.async=false;s.onload=()=>load(i+1);s.onerror=()=>{console.error('Failed to load',src);load(i+1)};document.head.appendChild(s)}
  load(0);
})();
