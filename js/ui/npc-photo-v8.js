(function(){
  const S=window.V7SStateV7s,Cropper=window.V7SPortraitCropper;
  if(!S)return;
  const $=s=>document.querySelector(s);
  let fallbackImage=null;

  function currentNpc(){
    const raw=$('#npcId')?.value;
    if(raw==null||raw==='')return null;
    return S.get().campaign.npcs?.[Number(raw)]||null;
  }
  function ensureUi(){
    const dialog=$('#npcDialog'),source=$('#npcImage');
    if(!dialog||!source||dialog.dataset.photoV8==='1')return;
    dialog.dataset.photoV8='1';
    const oldLabel=source.closest('label');if(oldLabel)oldLabel.hidden=true;
    const anchor=oldLabel||dialog.querySelector('#npcNotes')?.closest('label');
    const wrap=document.createElement('section');wrap.className='npc-photo-editor';wrap.innerHTML=`
      <div class="npc-photo-preview" id="npcPhotoPreview"><span>NO PHOTO</span></div>
      <div class="npc-photo-buttons">
        <button type="button" class="small-btn primary" data-npc-gallery>▣ Upload photo</button>
        <button type="button" class="small-btn" data-npc-camera>◉ Take photo</button>
      </div>
      <small class="muted">Both options use the same crop, position and zoom editor as the character portrait.</small>
      <input id="npcGalleryInput" class="npc-photo-hidden" type="file" accept="image/*">
      <input id="npcCameraInput" class="npc-photo-hidden" type="file" accept="image/*" capture="environment">`;
    anchor?.before(wrap);
    $('#npcGalleryInput')?.addEventListener('change',pick);
    $('#npcCameraInput')?.addEventListener('change',pick);
  }
  function preview(src=''){
    const p=$('#npcPhotoPreview');if(!p)return;
    p.innerHTML=src?`<img src="${src}" alt="NPC portrait preview">`:'<span>NO PHOTO</span>';
  }
  function syncDialog(){
    ensureUi();fallbackImage=null;preview(currentNpc()?.image||'');
    const source=$('#npcImage');if(source)source.value='';
    const g=$('#npcGalleryInput'),c=$('#npcCameraInput');if(g)g.value='';if(c)c.value='';
  }
  function dataUrlFile(dataUrl){
    const parts=String(dataUrl).split(','),mime=(parts[0].match(/data:([^;]+)/)||[])[1]||'image/jpeg',bin=atob(parts[1]||''),bytes=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
    return new File([bytes],`npc-portrait-${Date.now()}.jpg`,{type:mime});
  }
  function attachToNativeInput(dataUrl){
    const source=$('#npcImage');if(!source)return false;
    try{const dt=new DataTransfer();dt.items.add(dataUrlFile(dataUrl));source.files=dt.files;return source.files.length===1}catch(_e){return false}
  }
  function finishCrop(result){
    preview(result);
    fallbackImage=attachToNativeInput(result)?null:result;
  }
  function pick(e){
    const file=e.target.files?.[0];if(!file)return;
    if(Cropper)Cropper.open(file,finishCrop);else{
      const r=new FileReader();r.onload=()=>finishCrop(String(r.result||''));r.readAsDataURL(file);
    }
    e.target.value='';
  }
  function fallbackSave(e){
    if(!fallbackImage||e.target.closest('button')?.id!=='saveNpc')return;
    e.preventDefault();e.stopImmediatePropagation();
    const idx=$('#npcId').value===''?null:Number($('#npcId').value),existing=idx==null?{}:(S.get().campaign.npcs||[])[idx]||{};
    const n={...existing,name:$('#npcName').value.trim()||'NPC',tag:$('#npcTag').value.trim(),location:$('#npcLocation').value.trim(),notes:$('#npcNotes').value.trim(),image:fallbackImage};
    S.update(s=>{if(idx==null)s.campaign.npcs.push(n);else s.campaign.npcs[idx]=n});S.flush();$('#npcDialog')?.close();location.reload();
  }
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-npc-gallery]')){$('#npcGalleryInput')?.click();return}
    if(e.target.closest('[data-npc-camera]')){$('#npcCameraInput')?.click();return}
    if(e.target.closest('[data-new-npc],[data-edit-npc]'))setTimeout(syncDialog,0);
  },true);
  document.addEventListener('click',fallbackSave,true);
  document.addEventListener('DOMContentLoaded',()=>{ensureUi();$('#npcDialog')?.addEventListener('close',()=>{fallbackImage=null})});
  setTimeout(ensureUi,260);
})();