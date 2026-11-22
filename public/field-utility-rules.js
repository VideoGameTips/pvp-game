(function(root){
  const specs={
    bounce_pad:{uses:2,radius:.95,height:18,forward:12,lifetime:15000,launches:3},
    bear_trap:{uses:2,radius:2,damage:35,rootMs:800,hp:30},
  };
  function launch(gravity){
    const up=Math.sqrt(2*gravity*18);
    return {up,forward:12/(2*up/gravity),duration:2*up/gravity};
  }
  const api={specs,launch};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.PVP_FIELD_RULES=api;
})(typeof window!=='undefined'?window:globalThis);
