'use strict';
const rules=require('./public/radiation');
module.exports=function({players,emit,credit,blocked,hub,onDeath=()=>{}}){
  const active=new Map();
  function clear(target){active.delete(target.id);}
  function apply(target,source,now=Date.now()){
    if(!target||!source||target.dead||target.hp<=0||target.id===source.id||!target.matchId||
      target.matchId===hub||target.matchId==='lobby'||target.matchId!==source.matchId||blocked(source,target))return;
    const old=active.get(target.id);
    const state=rules.expose(old?.target===target&&old.match===target.matchId?old.state:null,now);
    active.set(target.id,{target,source,state,match:target.matchId});
    emit(target.matchId,'radiationExposure',{targetId:target.id,stacks:state.stacks,permanent:true});
  }
  function update(now=Date.now()){
    for(const [id,entry] of active){
      const {target,source,state,match}=entry;
      if(players[id]!==target||target.dead||target.matchId!==match||blocked(source,target)){
        active.delete(id);continue;
      }
      const damage=rules.tick(state,now);
      if(damage>0){
        const before=target.hp;target.hp=Math.max(0,before-damage);
        const present=players[source.id]===source&&source.matchId===match;
        if(present)credit(source,before-target.hp);
        emit(match,'playerHit',{targetId:id,hp:target.hp,dealt:before-target.hp,
          shooterId:source.id,weapon:'rad_pulse_dot',periodic:true,
          environmentSeq:target.environmentSeq||0,bulletId:'rad_'+id+'_'+state.next});
        if(target.hp<=0){
          target.dead=true;target.deaths=(target.deaths||0)+1;
          if(present){source.kills=(source.kills||0)+1;source.matchKills=(source.matchKills||0)+1;}
          emit(match,'playerDied',{targetId:id,killerId:source.id,weapon:'rad_pulse_dot'});
          onDeath(target);
          active.delete(id);continue;
        }
      }
      if(now>=state.until)active.delete(id);
    }
  }
  return {apply,update,clear};
};
