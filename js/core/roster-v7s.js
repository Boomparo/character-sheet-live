(function(){
  const S=window.V7SStateV7s;
  const KEY='character-sheet-v7s-roster';
  const clone=v=>JSON.parse(JSON.stringify(v));
  let muted=false;

  function uid(){return `char-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`}
  function read(){
    try{const x=JSON.parse(localStorage.getItem(KEY)||'{}');return {activeId:x.activeId||'',profiles:Array.isArray(x.profiles)?x.profiles:[]}}catch(e){return {activeId:'',profiles:[]}}
  }
  function write(x){try{localStorage.setItem(KEY,JSON.stringify(x))}catch(e){}}
  function summary(data,id){return {id,name:data.character?.name||'Unnamed Character',race:data.character?.race||'',classKey:data.character?.classKey||'treasureHunter',level:Number(data.character?.level)||1,portrait:data.character?.portrait||'',updatedAt:new Date().toISOString(),data:clone(data)}}
  function ensure(){
    const r=read();
    if(!r.profiles.length){const id=uid();r.activeId=id;r.profiles=[summary(S.get(),id)];write(r);return r}
    if(!r.profiles.some(p=>p.id===r.activeId))r.activeId=r.profiles[0].id;
    write(r);return r;
  }
  function saveCurrent(){
    if(muted)return;const r=ensure(),i=r.profiles.findIndex(p=>p.id===r.activeId);if(i<0)return;
    r.profiles[i]=summary(S.get(),r.activeId);write(r);
  }
  function list(){const r=ensure();return r.profiles.map(({data,...meta})=>meta)}
  function activeId(){return ensure().activeId}
  function switchTo(id){
    const r=ensure(),p=r.profiles.find(x=>x.id===id);if(!p)return false;saveCurrent();muted=true;r.activeId=id;write(r);S.replace(clone(p.data));S.flush();muted=false;location.reload();return true;
  }
  function create(name='New Character'){
    saveCurrent();const r=ensure(),id=uid(),fresh=S.fresh();fresh.character.name=name;r.activeId=id;r.profiles.push(summary(fresh,id));write(r);muted=true;S.replace(fresh);S.flush();muted=false;location.reload();return id;
  }
  function duplicate(id=activeId()){
    saveCurrent();const r=ensure(),p=r.profiles.find(x=>x.id===id);if(!p)return null;const nid=uid(),copy=clone(p.data);copy.character.name=`${copy.character.name||'Character'} Copy`;r.activeId=nid;r.profiles.push(summary(copy,nid));write(r);muted=true;S.replace(copy);S.flush();muted=false;location.reload();return nid;
  }
  function remove(id){
    const r=ensure();if(r.profiles.length<=1)return false;const i=r.profiles.findIndex(p=>p.id===id);if(i<0)return false;r.profiles.splice(i,1);if(r.activeId===id){r.activeId=r.profiles[0].id;write(r);muted=true;S.replace(clone(r.profiles[0].data));S.flush();muted=false;location.reload();return true}write(r);return true;
  }
  function rename(id,name){const r=ensure(),p=r.profiles.find(x=>x.id===id);if(!p)return false;p.name=name||'Unnamed Character';if(p.data?.character)p.data.character.name=p.name;write(r);return true}
  function exportAll(){saveCurrent();return clone(ensure())}
  function importAll(payload){if(!payload||!Array.isArray(payload.profiles)||!payload.profiles.length)return false;write(payload);const r=ensure(),p=r.profiles.find(x=>x.id===r.activeId)||r.profiles[0];muted=true;S.replace(clone(p.data));S.flush();muted=false;location.reload();return true}

  ensure();S.subscribe(saveCurrent);
  window.V7SRoster={KEY,list,activeId,saveCurrent,switchTo,create,duplicate,remove,rename,exportAll,importAll};
})();