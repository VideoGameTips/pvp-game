'use strict';
const {specs}=require('./public/field-utility-rules');
module.exports=function({io,players,emit,blocked,canUse,weaponDamage,damage,hub,now=Date.now}){
  const fields=new Map(),charges=new WeakMap();
  function remove(f,snap=false){fields.delete(f.id);emit(f.match,'fieldUtility',{action:'remove',id:f.id,snap});}
  function reset(p){
    charges.delete(p);
    delete p._fieldRootUntil;
    for(const f of fields.values())if(f.ownerId===p.id)remove(f);
  }
  function place(p,d){
    const spec=specs[d?.kind];
    if(!p||p.dead||!spec||!p.matchId||p.matchId===hub||p.matchId==='lobby'||!canUse(p,d.kind))return false;
    if(![d.x,d.y,d.z].every(Number.isFinite)||Math.hypot(d.x-p.x,d.y-p.y,d.z-p.z)>9)return false;
    let c=charges.get(p);
    if(!c||c.match!==p.matchId){c={match:p.matchId,counts:{},at:-Infinity};charges.set(p,c);}
    if(now()-c.at<800||(c.counts[d.kind]||0)>=spec.uses)return false;
    c.at=now();c.counts[d.kind]=(c.counts[d.kind]||0)+1;
    const f={id:p.id+'_'+now()+'_'+c.counts[d.kind],kind:d.kind,ownerId:p.id,match:p.matchId,
      x:d.x,y:d.y,z:d.z,hp:spec.hp||0,remaining:spec.launches||1,until:spec.lifetime?now()+spec.lifetime:0,
      ready:now()+250,cooldown:0,hits:new Set()};
    fields.set(f.id,f);emit(f.match,'fieldUtility',{action:'place',field:{...f,hits:undefined}});return f;
  }
  function trigger(p,d){
    const f=fields.get(d?.id),target=players[d?.targetId];
    if(!p||!f||!target||target.dead||target.matchId!==f.match||p.matchId!==f.match||
      (target.id!==p.id&&!(target.isBot&&target.ownerId===p.id))||now()<f.ready||now()<f.cooldown||
      f.until&&now()>=f.until)return false;
    const spec=specs[f.kind];
    if(Math.hypot(target.x-f.x,target.z-f.z)>spec.radius+.2||Math.abs(target.y-f.y)>2.6)return false;
    const owner=players[f.ownerId];
    if(f.kind==='bear_trap'&&(!owner||target.id===owner.id||blocked(owner,target)))return false;
    if(f.kind==='bear_trap'){
      remove(f,true);target._fieldRootUntil=now()+800;
      damage(target,owner,35,'bear_trap');
    }else{
      f.remaining--;f.cooldown=now()+800;
      if(f.remaining<=0)remove(f);
    }
    const dx=Number.isFinite(d.dx)?d.dx:0,dz=Number.isFinite(d.dz)?d.dz:0;
    const len=Math.hypot(dx,dz)||1;
    emit(f.match,'fieldUtility',{action:'trigger',id:f.id,kind:f.kind,targetId:target.id,
      dx:dx/len,dz:dz/len,remaining:f.remaining});
    return true;
  }
  function hit(p,d){
    const f=fields.get(d?.id);
    if(!p||p.dead||!f||f.kind!=='bear_trap'||p.matchId!==f.match||typeof d.bulletId!=='string'||d.bulletId.length>160||!d.bulletId||f.hits.has(d.bulletId))return false;
    if(![d.x,d.y,d.z].every(Number.isFinite)||Math.hypot(d.x-f.x,d.z-f.z)>1||
      Math.abs(d.y-f.y)>.7||Math.hypot(p.x-f.x,p.z-f.z)>250)return false;
    const amount=weaponDamage[d.weapon];
    if(!(amount>0))return false;
    if(f.hits.size>200)return false;
    f.hits.add(String(d.bulletId));f.hp-=amount;
    if(f.hp<=0)remove(f);
    return true;
  }
  function update(){
    for(const f of fields.values()){
      const owner=players[f.ownerId];
      if(!owner||owner.matchId!==f.match||f.until&&now()>=f.until)remove(f);
    }
  }
  io?.on('connection',socket=>{
    socket.on('placeFieldUtility',d=>{
      const owner=players[socket.id],bot=players[d?.botId];
      place(bot?.isBot&&bot.ownerId===socket.id?bot:owner,d);
    });
    socket.on('getFieldUtilities',()=>{
      const p=players[socket.id];if(!p)return;
      for(const f of fields.values())if(f.match===p.matchId)socket.emit('fieldUtility',{action:'place',field:{...f,hits:undefined}});
    });
    socket.on('triggerFieldUtility',d=>trigger(players[socket.id],d));
    socket.on('hitFieldUtility',d=>{
      const bot=players[d?.botId];hit(bot?.isBot&&bot.ownerId===socket.id?bot:players[socket.id],d);
    });
    socket.on('clearFieldUtilities',()=>{
      const p=players[socket.id];if(!p)return;
      for(const f of fields.values())if(f.ownerId===p.id)remove(f);
    });
  });
  const timer=setInterval(update,1000);timer.unref?.();
  return {place,trigger,hit,reset,update,fields,dispose:()=>clearInterval(timer)};
};
