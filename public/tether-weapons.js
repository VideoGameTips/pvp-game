(() => {
  'use strict';
  const remotes=new Map(), up=new THREE.Vector3(0,1,0);
  const ropeGeometry=new THREE.CylinderGeometry(.014,.014,1,6);
  const ropeMaterial=new THREE.MeshBasicMaterial({color:0xd8ba72});
  const recallSpeed=105;
  const bolts=new Map(), capacity=()=>projectileWeaponSpec('harpoon_gun').mag;
  const held=()=>activeSlot==='primary'&&currentWeapon?.id==='harpoon_gun';
  const live=()=>gameStarted&&!inLobby&&!isDead&&!countdownActive&&!match?.over;
  const v=p=>new THREE.Vector3(p.x,p.y,p.z);
  // The Octopus skin: the line is a tentacle (thick at the gun, thin at the hit, wriggling) and the bolt that stays in a wall is a tentacle tip.
  const tentacleGeometry=new THREE.CylinderGeometry(.012,.04,1,10);
  const tentacleMaterial=new THREE.MeshPhongMaterial({color:0x8a2f8f,shininess:70,specular:0xe0a0e8,emissive:0x2a0830});
  const isTentacle=skin=>skin==='harpoon_octopus';
  const myHarpoonSkin=()=>typeof heldSkinId==='function'?heldSkinId('harpoon_gun')||null:null;
  function rope(skin){const t=isTentacle(skin),m=new THREE.Mesh(t?tentacleGeometry:ropeGeometry,t?tentacleMaterial:ropeMaterial);m.userData.tentacle=t;scene.add(m);return m;}
  function remove(s){if(s){s.line.removeFromParent();s.bolt?.removeFromParent();if(s.flight)s.flight._cull=true;}}
  function setBoltAmmo(n){
    const idx=WEAPONS.findIndex(w=>w.id==='harpoon_gun');weaponAmmo[idx]={ammo:n,reserve:0};
    syncHeldAmmoModelForIndex(idx);
    if(held()){ammo=n;reserve=0;updateAmmoHUD();}
  }
  function clear(notify=false){
    for(const bolt of bolts.values()){
      if(notify)socket.emit('harpoonRecall',{id:bolt.id});
      remove(bolt);
    }
    bolts.clear();
    for(const s of remotes.values())remove(s);remotes.clear();
  }
  function fired(b){
    if(bolts.size>=capacity()){b._cull=true;return;}
    const skin=myHarpoonSkin();
    bolts.set(b.id,{id:b.id,epoch:matchEpoch,phase:'flight',flight:b,skin,line:rope(skin),point:b.mesh.position.clone(),direction:b.dir.clone(),tripped:new Set()});
    setBoltAmmo(capacity()-bolts.size);
  }
  function makeBolt(point,dir,skin){
    const look=isTentacle(skin)&&typeof skinLookById==='function'?skinLookById(skin):null;
    const m=makeBulletMesh(0xb8b8b8,.08,'harpoon_gun',false,look);m.position.copy(point);
    if(m._alignToDir)m.quaternion.setFromUnitVectors(up,dir);scene.add(m);return m;
  }
  function latch(b,point,id){
    const own=bolts.get(b.id);
    if(!own||own.phase!=='flight')return;
    own.phase='latched';own.flight=null;own.point.copy(point);
    const target=id&&remoteMeshes[id]&&players[id]&&!players[id].dead&&!players[id].isDummy&&!friendlyFireBlocked(id)&&!resolveBot(id)?.boss;
    own.target=target?id:null;
    own.offset=own.target?point.clone().sub(remoteMeshes[id].position):null;
    own.bolt=makeBolt(own.point,own.direction,own.skin);
    socket.emit('harpoonLatch',{id:b.id,targetId:own.target,x:point.x,y:point.y,z:point.z});
    if(own.target){
      own.nextReel=performance.now()+450;
      if(!socket.connected)pullLocalBot(own);
    }
  }
  function muzzle(){
    if(held()&&weaponModels[currentWeaponIdx]?._flash)return weaponModels[currentWeaponIdx]._flash.getWorldPosition(new THREE.Vector3());
    return camera.position.clone().add(new THREE.Vector3(0,-.4,0));
  }
  function recall(){
    if(!held()||!live())return;
    let recalled=false;
    for(const own of bolts.values()){
      if(own.phase==='return')continue;
      if(own.flight){own.point.copy(own.flight.mesh.position);own.flight._cull=true;own.flight=null;}
      own.target=null;own.phase='return';own.bolt ||= makeBolt(own.point,own.direction,own.skin);
      socket.emit('harpoonRecall',{id:own.id});recalled=true;
    }
    if(recalled)playSoundEvent('click',{volume:.7,minGap:90});
  }
  function pullLocalBot(own){
    const bot=resolveBot(own.target);
    if(!bot||bot.dead)return;
    const d=camera.position.clone().sub(own.point).setY(0).normalize();
    bot.kbVX=d.x*34;bot.kbVZ=d.z*34;bot.yVel=Math.max(bot.yVel||0,2);
  }
  // Reeling (hold R, or tap E for a short pull): every bolt that is stuck in a wall or the ground pulls ME toward it, and the pulls ADD UP -- two
  // bolts on one wall pull twice as hard, two on different walls drag you between them. A bolt stuck in an enemy drags THEM straight to me.
  let reelHeld=false, reelUntil=0, clickAt=0;
  const reeling=()=>reelHeld||performance.now()<reelUntil;
  const PULL=62, PULL_MAX_SPEED=30, PULL_MAX_LIFT=24;
  function reel(){if(live()&&held())reelUntil=performance.now()+450;}
  function reelHold(on){reelHeld=!!on&&live()&&held();}
  function applyReel(dt){
    const now=performance.now(), eye=camera.position, sum=new THREE.Vector3();
    let anchors=0;
    for(const own of bolts.values()){
      if(own.phase!=='latched')continue;
      if(own.target){
        if(players[own.target]?.dead||now<(own.nextReel||0))continue;
        own.nextReel=now+450;
        if(socket.connected)socket.emit('harpoonReel',{id:own.id});else pullLocalBot(own);
        continue;
      }
      const d=own.point.clone().sub(eye),dist=d.length();
      if(dist<0.8)continue;
      sum.addScaledVector(d.divideScalar(dist),Math.min(1,(dist-0.8)/2.5));      // it lets go of you as you arrive
      anchors++;
    }
    if(!anchors||sum.lengthSq()<1e-6)return;
    _extVel.x+=sum.x*PULL*dt;_extVel.z+=sum.z*PULL*dt;
    const sp=Math.hypot(_extVel.x,_extVel.z);
    if(sp>PULL_MAX_SPEED){_extVel.x*=PULL_MAX_SPEED/sp;_extVel.z*=PULL_MAX_SPEED/sp;}
    window._blastCarry=true;                                                      // no ground drag while it is hauling you
    const lift=sum.y*PULL*dt;
    if(lift>0){                                                                   // anchors above you lift you off the ground
      if(slamState)slamState.vel=Math.min(PULL_MAX_LIFT,slamState.vel+lift);
      else if(playerYVel!==0||!isPlayerGrounded())playerYVel=Math.min(PULL_MAX_LIFT,playerYVel+lift);
      else slamState={vel:Math.max(3,lift),type:'jump'};
    }
    if(now>clickAt){clickAt=now+320;playSoundEvent('click',{volume:.5,minGap:100});}
  }
  function draw(s,start){
    const d=s.point.clone().sub(start),len=d.length();s.line.visible=len>.03;
    s.line.position.copy(start).addScaledVector(d,.5);s.line.scale.y=len;
    if(s.line.userData.tentacle)s.line.scale.x=s.line.scale.z=1+.10*Math.sin(performance.now()/90+s.point.x);   // it wriggles
    if(len>.001)s.line.quaternion.setFromUnitVectors(up,d.divideScalar(len));
    if(s.bolt)s.bolt.position.copy(s.point);
  }
  function step(dt){
    if(reelHeld&&!(live()&&held()))reelHeld=false;
    if(bolts.size&&live()&&held()&&reeling())applyReel(dt);
    if(bolts.size&&(!live()||bolts.values().next().value.epoch!==matchEpoch)){clear(true);setBoltAmmo(capacity());return;}
    const start=bolts.size?muzzle():null;
    for(const own of bolts.values()){
      if(own.flight){
        own.point.copy(own.flight.mesh.position);
        if(!localBullets.includes(own.flight)){own.flight=null;own.phase='loose';own.bolt=makeBolt(own.point,own.direction,own.skin);}
      }
      if(own.target){const m=remoteMeshes[own.target];if(m&&!players[own.target]?.dead)own.point.copy(m.position).add(own.offset);else own.target=null;}
      if(own.phase==='return'){
        const d=start.clone().sub(own.point),dist=d.length();
        if(dist<=Math.max(.12,dt*recallSpeed)){remove(own);bolts.delete(own.id);setBoltAmmo(capacity()-bolts.size);continue;}
        own.point.addScaledVector(d,dt*recallSpeed/dist);
        if(own.bolt?._alignToDir)own.bolt.quaternion.setFromUnitVectors(up,d.normalize());
      }
      draw(own,start);
      if(own.phase==='latched'&&start.distanceToSquared(own.point)>.04){
        const line=new THREE.Line3(start,own.point),closest=new THREE.Vector3();
        for(const [id,m] of Object.entries(remoteMeshes)){
          const p=players[id];
          if(!m.visible||!p||p.dead||p.isDummy||id===own.target||own.tripped.has(id)||friendlyFireBlocked(id)||resolveBot(id)?.boss)continue;
          const foot=m.position.clone().add(new THREE.Vector3(0,.65,0));line.closestPointToPoint(foot,true,closest);
          if(closest.distanceToSquared(foot)>.65**2||!hasLineOfSight(start.x,start.z,closest.x,closest.z,start.y,closest.y))continue;
          own.tripped.add(id);
          if(socket.connected)socket.emit('harpoonTrip',{id:own.id,targetId:id});
          else window.PVP_RAGDOLL?.knockdown(id);
        }
      }
    }
    for(const [id,s] of remotes){
      const source=remoteMeshes[s.ownerId];
      if(!source||players[s.ownerId]?.dead||s.epoch!==matchEpoch){remove(s);remotes.delete(id);continue;}
      const target=s.target&&remoteMeshes[s.target];if(target&&!players[s.target]?.dead)s.point.copy(target.position).add(s.offset);
      draw(s,source.position.clone().add(new THREE.Vector3(0,1.1,0)));
    }
  }
  function place(entry){
    const p=players[entry.id];if(!p)return;
    const eyeY=entry.y+(entry.fromBot ? .65 : 0), feetY=eyeY-1.65;
    Object.assign(p,{x:entry.x,y:p.isBot?feetY+1:eyeY,z:entry.z,_snaps:[]});
    if(entry.id===myId){
      window.PVP_RAGDOLL?.resetLocal();camera.position.set(entry.x,eyeY,entry.z);
      playerYVel=0;slamState=null;_extVel.x=_extVel.z=0;lastPlayerPos.copy(camera.position);
      playSoundEvent('air_launch',{volume:.7,minGap:90});flashScreen('rgba(112,233,219,.35)',180);
    }else{
      const bot=resolveBot(entry.id),mesh=remoteMeshes[entry.id];
      if(mesh){window.PVP_RAGDOLL?.reset(mesh);mesh.visible=true;mesh.position.set(entry.x,feetY,entry.z);}
      if(bot)Object.assign(bot,{x:entry.x,y:feetY,z:entry.z,yVel:0,kbVX:0,kbVZ:0});
    }
  }
  function swap(b,hit){
    const p=players[hit.pid];
    if(!live()||!p||p.dead||p.isDummy||friendlyFireBlocked(hit.pid)||resolveBot(hit.pid)?.boss)return;
    if(socket.connected)socket.emit('swapGunHit',{id:b.id,targetId:hit.pid});
    else {
      const dest={id:myId,x:hit.mesh.position.x,y:hit.mesh.position.y+1.65,z:hit.mesh.position.z};
      place({id:hit.pid,x:camera.position.x,y:camera.position.y,z:camera.position.z});place(dest);
    }
  }
  socket.on('harpoonState',data=>{
    if(data.ownerId===myId)return;
    const key=data.ownerId+'|'+data.id;
    remove(remotes.get(key));remotes.delete(key);
    if(!data.point||!remoteMeshes[data.ownerId])return;
    const point=v(data.point),target=remoteMeshes[data.targetId],dir=point.clone().sub(remoteMeshes[data.ownerId].position).normalize();
    const skin=players[data.ownerId]?.weaponSkin||null;
    remotes.set(key,{ownerId:data.ownerId,epoch:matchEpoch,point,line:rope(skin),bolt:makeBolt(point,dir,skin),target:data.targetId,offset:target?point.clone().sub(target.position):null});
  });
  socket.on('harpoonTripped',({id})=>{if(!players[id]?.dead)window.PVP_RAGDOLL?.knockdown(id);});
  socket.on('weaponSwap',({positions})=>{if(gameStarted&&!inLobby&&Array.isArray(positions))positions.forEach(place);});
  window.PVP_TETHER_WEAPONS={fired,latch,recall,reel,reelHold,step,swap,clear,get deployed(){return bolts.size>0;},get full(){return bolts.size>=capacity();},get latched(){return [...bolts.values()].some(b=>b.phase==='latched');}};
})();
