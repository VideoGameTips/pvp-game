(function(root){
  'use strict';
  const dps=2;
  function expose(previous, now) {
    const live=previous && previous.until>now;
    return {stacks:Math.min(3,(live?previous.stacks:0)+1),until:Infinity,next:live?previous.next:now+1000};
  }
  function tick(state,now){
    const ticks=Math.max(0,Math.floor((Math.min(now,state.until)-state.next)/1000)+1);
    state.next+=ticks*1000;
    return ticks*state.stacks*dps;
  }
  const api={expose,tick,dps};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.PVP_RADIATION=api;
})(typeof window!=='undefined'?window:globalThis);
