(function(){
  const entries=new Map(),flights=[],closing=[];
  const positions=new Map();
  const specs=PVP_FIELD_RULES.specs;
  let serial=0,lastX=0,lastZ=0;
  const online=()=>socket.connected&&!window.PVP_BATTLE_SIM?.active;
  const clock=()=>window.PVP_BATTLE_SIM?.active?window.PVP_BATTLE_SIM.now:Date.now();
  function dispose(mesh){
    scene.remove(mesh);
    const materials=new Set();mesh.traverse(o=>{o.geometry?.dispose();if(o.material)materials.add(o.material);});
    materials.forEach(m=>m.dispose());
  }
  function remove(id,snap=false){const e=entries.get(id);if(e){entries.delete(id);if(snap)closing.push({mesh:e.mesh,t:0});else dispose(e.mesh);}}
  function place(field){
    remove(field.id);const mesh=buildFieldUtilityWorld(field.kind);
    window.PVP_BLACKOUT?.deployed(mesh,field.kind,field.ownerId);
    mesh.name='field-'+field.kind;mesh.userData.fieldId=field.id;
    mesh.position.set(field.x,field.y,field.z);scene.add(mesh);
    entries.set(field.id,{field,mesh,pending:0,cooldown:0});
  }
  function launch(target,dx,dz){
    const force=PVP_FIELD_RULES.launch(GRAVITY);
    if(target.id===myId){
      slamState={vel:force.up,type:'pad'};playerYVel=0;airTime=0;
      _extVel.x=dx*force.forward;_extVel.z=dz*force.forward;
      window._blastCarry=true;window._blastCarryGround=0;
    }else{
      target.yVel=force.up;target.kbVX=dx*force.forward;target.kbVZ=dz*force.forward;target._padFlight=true;
    }
  }
  function effect(d){
    const target=d.targetId===myId?{id:myId}:gameBots.find(b=>b.id===d.targetId);
    if(!target)return;
    if(d.kind==='bounce_pad')launch(target,d.dx,d.dz);
    else if(target.id===myId){
      playerRootedUntil=Math.max(playerRootedUntil,Date.now()+specs.bear_trap.rootMs);
      thornRootedUntil=Math.max(thornRootedUntil,playerRootedUntil);
      _extVel.x=0;_extVel.z=0;
    }else{
      target._rootUntil=Math.max(target._rootUntil||0,(window.PVP_BATTLE_SIM?.active?window.PVP_BATTLE_SIM.now:Date.now())+specs.bear_trap.rootMs);
      target.kbVX=0;target.kbVZ=0;
    }
  }
  function deploy(kind,bot){
    if(!specs[kind])return;
    const yaw=bot?.rotY??camera.rotation.y,dist=kind==='bounce_pad'?3:1.1;
    const start=new THREE.Vector3(bot?.x??camera.position.x,bot?bot.y+.7:camera.position.y-.35,bot?.z??camera.position.z);
    const end=start.clone().add(new THREE.Vector3(-Math.sin(yaw)*dist,0,-Math.cos(yaw)*dist));
    const ray=new THREE.Ray(start,end.clone().sub(start).normalize());
    for(const box of wallColliders){
      const hit=ray.intersectBox(box,new THREE.Vector3());
      if(hit&&hit.distanceTo(start)<end.distanceTo(start))end.copy(hit).addScaledVector(ray.direction,-.5);
    }
    if(!floorExistsAt(end.x,end.z))return;
    end.y=getGroundEyeY(end.x,end.z,start.y+PLAYER_EYE_HEIGHT)-PLAYER_EYE_HEIGHT;
    const mesh=buildFieldUtilityWorld(kind);window.PVP_BLACKOUT?.deployed(mesh,kind,bot?.id||myId);mesh.scale.setScalar(.55);scene.add(mesh);
    flights.push({kind,bot,start,end,mesh,t:0,epoch:matchEpoch});
  }
  function enemy(owner,target){
    if(owner===target.id)return false;
    const a=gameBots.find(b=>b.id===owner)||players[owner];
    const b=target.id===myId?players[myId]:target;
    if(!a||!b)return owner!==target.id;
    return !a.team||!b.team||a.team!==b.team;
  }
  function unobstructed(f,a){
    const start=new THREE.Vector3(f.x,f.y+.35,f.z),end=new THREE.Vector3(a.x,a.y+.35,a.z);
    const length=start.distanceTo(end);if(length<.01)return true;
    const ray=new THREE.Ray(start,end.sub(start).normalize());
    return !wallColliders.some(box=>{const hit=ray.intersectBox(box,new THREE.Vector3());return hit&&hit.distanceTo(start)<length;});
  }
  function step(dt){
    if(!entries.size&&!flights.length&&!closing.length){positions.clear();lastX=camera.position.x;lastZ=camera.position.z;return;}
    const now=clock();
    for(let i=closing.length-1;i>=0;i--){
      const c=closing[i];c.t+=dt;
      for(const jaw of c.mesh.children)if(jaw.userData.trapSide)jaw.rotation.z=-jaw.userData.trapSide*Math.min(1,c.t/.12)*1.15;
      if(c.t>.35){dispose(c.mesh);closing.splice(i,1);}
    }
    for(let i=flights.length-1;i>=0;i--){
      const f=flights[i];f.t+=dt;
      if(f.epoch!==matchEpoch){dispose(f.mesh);flights.splice(i,1);continue;}
      const t=Math.min(1,f.t/(f.kind==='bounce_pad'?.45:.18));
      f.mesh.position.lerpVectors(f.start,f.end,t);f.mesh.position.y+=Math.sin(t*Math.PI)*.8;
      f.mesh.rotation.y=t*Math.PI*2;
      if(t<1)continue;
      dispose(f.mesh);flights.splice(i,1);
      const d={kind:f.kind,x:f.end.x,y:f.end.y,z:f.end.z};
      if(online())socket.emit('placeFieldUtility',{...d,botId:f.bot?.id});
      else place({...d,id:'field_'+(++serial),ownerId:f.bot?.id||myId,remaining:specs[f.kind].launches||1,
        hp:specs[f.kind].hp||0,until:specs[f.kind].lifetime?now+specs[f.kind].lifetime:0,ready:now+250});
    }
    const dx=camera.position.x-lastX,dz=camera.position.z-lastZ;lastX=camera.position.x;lastZ=camera.position.z;
    const actors=gameBots.filter(b=>!b.dead);
    if(!isDead&&!inLobby&&!window.PVP_BATTLE_SIM?.active)actors.push({id:myId,x:camera.position.x,y:playerFeetY(),z:camera.position.z,dx,dz});
    const motion=new Map();
    for(const a of actors){
      const old=positions.get(a.id);
      motion.set(a.id,{x:a.dx??(old?a.x-old.x:0),z:a.dz??(old?a.z-old.z:0)});
      positions.set(a.id,{x:a.x,z:a.z});
    }
    const alive=new Set(actors.map(a=>a.id));
    for(const id of positions.keys())if(!alive.has(id))positions.delete(id);
    for(const [id,e] of entries){
      const f=e.field,s=specs[f.kind];
      if(f.until&&now>=f.until){remove(id);continue;}
      if(now<f.ready||now<e.cooldown||now<e.pending)continue;
      for(const a of actors){
        if(Math.abs(a.y-f.y)>.4||Math.hypot(a.x-f.x,a.z-f.z)>s.radius)continue;
        if(!unobstructed(f,a))continue;
        if(f.kind==='bear_trap'&&!enemy(f.ownerId,a))continue;
        const movement=motion.get(a.id),moving=Math.hypot(movement.x,movement.z)>.001;
        const yaw=a.id===myId?camera.rotation.y:a.rotY||0;
        const vx=moving?movement.x:-Math.sin(yaw),vz=moving?movement.z:-Math.cos(yaw);
        const len=Math.hypot(vx,vz),d={id,kind:f.kind,targetId:a.id,dx:len>.001?vx/len:0,dz:len>.001?vz/len:-1};
        e.pending=now+400;
        if(online())socket.emit('triggerFieldUtility',d);
        else{
          e.cooldown=now+800;f.remaining--;effect(d);
          if(f.kind==='bear_trap'){
            const owner=gameBots.find(b=>b.id===f.ownerId)||{id:f.ownerId};
            if(a.id===myId)damagePlayerDOT(s.damage,'bear_trap');
            else if(window.PVP_BATTLE_SIM?.active)window.PVP_BATTLE_SIM.damage(a,owner,s.damage,'bear_trap');
            else emitHit(a.id,'trap_'+id,'bear_trap',new THREE.Vector3(a.x,a.y,a.z));
          }
          if(f.remaining<=0)remove(id,f.kind==='bear_trap');
        }
        break;
      }
    }
  }
  function hitBullet(b,x,y,z,dx,dy,dz,stop=1){
    if(!entries.size)return false;
    const length=Math.hypot(dx,dy,dz);if(!length)return false;
    const ray=new THREE.Ray(new THREE.Vector3(x,y,z),new THREE.Vector3(dx,dy,dz).divideScalar(length));
    let nearest=null;
    for(const e of entries.values()){
      const f=e.field;if(f.kind!=='bear_trap')continue;
      const box=new THREE.Box3(new THREE.Vector3(f.x-.57,f.y,f.z-.45),new THREE.Vector3(f.x+.57,f.y+.3,f.z+.45));
      const hit=ray.intersectBox(box,new THREE.Vector3());
      if(hit&&hit.distanceTo(ray.origin)<=length*stop&&(!nearest||hit.distanceTo(ray.origin)<nearest.distance))nearest={e,hit,distance:hit.distanceTo(ray.origin)};
    }
    if(!nearest)return false;
    const f=nearest.e.field;
    if(b.isOwn||gameBots.some(bot=>bot.id===b.botId)){
      if(online())socket.emit('hitFieldUtility',{id:f.id,botId:b.botId,bulletId:b.id,weapon:b.weaponId,x:nearest.hit.x,y:nearest.hit.y,z:nearest.hit.z});
      else{f.hp-=getClientWeaponDamage(b.weaponId);if(f.hp<=0)remove(f.id);}
    }
    return true;
  }
  socket.on('fieldUtility',d=>{
    if(d.action==='place')place(d.field);
    else if(d.action==='remove')remove(d.id,d.snap);
    else if(d.action==='trigger'){
      const e=entries.get(d.id);if(e){e.field.remaining=d.remaining;e.cooldown=Date.now()+800;}
      effect(d);
    }
  });
  function clear(){
    positions.clear();
    for(const id of entries.keys())remove(id);
    for(const f of flights)dispose(f.mesh);flights.length=0;
    for(const c of closing)dispose(c.mesh);closing.length=0;
    if(online())socket.emit('getFieldUtilities');
  }
  window.PVP_FIELD_UTILITIES={deploy,deployForBot:(bot,item)=>deploy(item.id,bot),step,hitBullet,clear};
})();
