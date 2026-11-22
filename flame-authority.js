'use strict';
const rules=require('./public/flame-rules');
module.exports=function({players,emit,blocked,credit,hub,onDeath}){
  const active=new Map();
  function clear(target){if(active.delete(target.id))emit(target.matchId,'flameExposure',{targetId:target.id,duration:0});}
  function contact(target,source,now=Date.now()){
    if(!target||!source||target.dead||target.matchId!==source.matchId||target.matchId==='lobby'||target.matchId===hub||blocked(source,target))return false;
    if(Math.hypot(target.x-source.x,(target.y||0)-(source.y||0),target.z-source.z)>rules.range+3)return false;
    const old=active.get(target.id),same=old?.target===target&&old.match===target.matchId;
    const state=rules.touch(same?old.state:null,now);if(!state)return false;
    active.set(target.id,{target,source,match:target.matchId,state});
    emit(target.matchId,'flameExposure',{targetId:target.id,duration:rules.duration});return true;
  }
  function update(now=Date.now()){
    for(const [id,e] of active){
      const {target,source,state,match}=e;
      if(players[id]!==target||target.dead||target.matchId!==match||source.matchId!==match||now>state.until){
        active.delete(id);emit(match,'flameExposure',{targetId:id,duration:0});continue;
      }
      const damage=rules.tick(state,now);if(!damage)continue;
      if(blocked(source,target)||now<(target.shieldUntil||0))continue;
      const before=target.hp;target.hp=Math.max(0,before-damage);credit(source,before-target.hp);
      emit(match,'playerHit',{targetId:id,hp:target.hp,dealt:before-target.hp,shooterId:source.id,
        weapon:'flamethrower_burn',periodic:true,environmentSeq:target.environmentSeq||0,bulletId:'flame_'+id+'_'+now});
      if(target.hp<=0){target.dead=true;target.deaths=(target.deaths||0)+1;source.kills=(source.kills||0)+1;
        source.matchKills=(source.matchKills||0)+1;emit(match,'playerDied',{targetId:id,killerId:source.id,weapon:'flamethrower_burn'});onDeath?.(target);}
    }
  }
  return {contact,clear,update};
};
