(function(root){
  'use strict';
  const contactMs=50,burnMs=200,duration=8000,contactDamage=10,burnDamage=3,range=24,speed=14;
  function touch(old,now){
    if(old&&now-old.last<contactMs)return null;
    return {last:now,until:now+duration,next:now+burnMs};
  }
  function tick(state,now){
    if(!state||now>state.until||now<state.next)return 0;
    state.next=now+burnMs;return burnDamage;
  }
  const api={contactMs,burnMs,duration,contactDamage,burnDamage,range,speed,touch,tick};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PVP_FLAME_RULES=api;
})(typeof window!=='undefined'?window:globalThis);
