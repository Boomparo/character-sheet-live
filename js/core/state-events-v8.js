(function(){
  const S=window.V7SStateV7s;
  if(!S||S.__stableSubscribeV8)return;
  const rawSubscribe=S.subscribe.bind(S);
  S.subscribe=function(fn){
    let last='';try{last=JSON.stringify(S.get())}catch(_e){}
    return rawSubscribe(state=>{
      let next='';try{next=JSON.stringify(state)}catch(_e){next=String(Date.now())}
      if(next===last)return;
      last=next;
      fn(state);
    });
  };
  S.__stableSubscribeV8=true;
})();
