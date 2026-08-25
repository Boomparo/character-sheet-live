(function(){
  let img=null,done=null;
  const $=s=>document.querySelector(s);
  function readFile(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)})}
  function loadImage(src){return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src})}
  function values(){return {x:Number($('#cropX')?.value||50),y:Number($('#cropY')?.value||50),zoom:Number($('#cropZoom')?.value||1)}}
  function draw(canvas,size=320){
    if(!img||!canvas)return;const {x,y,zoom}=values(),ctx=canvas.getContext('2d');canvas.width=size;canvas.height=size;const base=Math.max(size/img.width,size/img.height)*zoom,srcW=size/base,srcH=size/base,sx=Math.max(0,Math.min(img.width-srcW,(img.width-srcW)*(x/100))),sy=Math.max(0,Math.min(img.height-srcH,(img.height-srcH)*(y/100)));ctx.clearRect(0,0,size,size);ctx.drawImage(img,sx,sy,srcW,srcH,0,0,size,size)
  }
  function preview(){draw($('#cropCanvas'),300)}
  async function open(file,onDone){if(!file)return;const src=await readFile(file);img=await loadImage(src);done=onDone;$('#cropX').value=50;$('#cropY').value=50;$('#cropZoom').value=1;preview();$('#cropDialog').showModal()}
  function save(){if(!img)return;const c=document.createElement('canvas');draw(c,480);const result=c.toDataURL('image/jpeg',.82);$('#cropDialog').close();if(done)done(result);img=null;done=null}
  function bind(){['#cropX','#cropY','#cropZoom'].forEach(s=>$(s)?.addEventListener('input',preview));$('#cropSave')?.addEventListener('click',save);$('#cropReset')?.addEventListener('click',()=>{$('#cropX').value=50;$('#cropY').value=50;$('#cropZoom').value=1;preview()})}
  document.addEventListener('DOMContentLoaded',bind);
  window.V7SPortraitCropper={open};
})();