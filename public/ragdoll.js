/* Jointed bodies use the vendored MIT-licensed cannon-es 0.20.0 engine. */
(function () {
  'use strict';
  let C=null,physics=null,map=null,lastBlast=null,accumulator=0;
  const active=[],statics=new Map();
  const ready=import('./vendor/cannon-es.js').then(module=>{C=module;}).catch(error=>console.warn('[ragdoll] physics unavailable',error));
  const vec=p=>new C.Vec3(p.x,p.y,p.z);
  function setup(point){
    if(!physics||map!==activeMapName){const latest=lastBlast;clear();lastBlast=latest;map=activeMapName;physics=new C.World({gravity:new C.Vec3(0,-22,0),allowSleep:true});physics.broadphase=new C.SAPBroadphase(physics);physics.solver.iterations=12;
      physics.defaultContactMaterial.friction=.65;physics.defaultContactMaterial.restitution=.08;
      const ground=MAP_VOID[activeMapName];
      if(!ground){const floor=new C.Body({mass:0,collisionFilterGroup:1});floor.addShape(new C.Plane());floor.quaternion.setFromEuler(-Math.PI/2,0,0);physics.addBody(floor);}
      else for(const r of ground.rects||[{x0:-ground.halfX,x1:ground.halfX,z0:-ground.halfZ,z1:ground.halfZ}])staticBox({min:{x:r.x0,y:-.4,z:r.z0},max:{x:r.x1,y:0,z:r.z1}},true);
    }
    for(const box of wallColliders){
      if(statics.has(box)||box.max.x<point.x-24||box.min.x>point.x+24||box.max.z<point.z-24||box.min.z>point.z+24)continue;
      staticBox(box);
    }
  }
  function staticBox(box,terrain=false){
    const size=new C.Vec3((box.max.x-box.min.x)/2,(box.max.y-box.min.y)/2,(box.max.z-box.min.z)/2);
    if(size.x<.005||size.y<.005||size.z<.005)return;
    const body=new C.Body({mass:0,shape:new C.Box(size),collisionFilterGroup:1});body._terrain=terrain;body.position.set((box.max.x+box.min.x)/2,(box.max.y+box.min.y)/2,(box.max.z+box.min.z)/2);physics.addBody(body);statics.set(box,body);
  }
  function release(entry,restore=false){
    const i=active.indexOf(entry);if(i<0)return;active.splice(i,1);
    scene.remove(entry.visual);for(const joint of entry.joints)physics?.removeConstraint(joint);for(const part of entry.parts)physics?.removeBody(part.body);
    if(entry.source._ragdoll===entry){entry.source._ragdoll=null;if(restore&&!entry.dead)entry.source.visible=true;}
    if(entry.owned)disposeBody(entry.source);
  }
  function clear(){for(const entry of [...active])release(entry,!entry.dead);physics=null;map=null;statics.clear();accumulator=0;lastBlast=null;}
  function create(source,id,dead,velocity){
    if(!C||!source?._rig)return null;
    let entry=source._ragdoll;
    if(entry){if(dead){entry.dead=true;entry.life=Math.max(entry.life,entry.age+4);}return entry;}
    setup(source.position);while(active.length>=8)recover(active[0]);
    source.updateWorldMatrix(true,true);
    const visual=source.clone(true),sourceNodes=[],cloneNodes=[],mapping=new Map();source.traverse(n=>sourceNodes.push(n));visual.traverse(n=>cloneNodes.push(n));sourceNodes.forEach((n,i)=>mapping.set(n,cloneNodes[i]));
    const rig=source._rig,parts=[],byName={},joints=[];visual.visible=true;visual._ragdollVisual=true;scene.add(visual);visual.updateWorldMatrix(true,true);
    for(const n of [...cloneNodes])if(n.isSprite)n.removeFromParent();
    // Gear follows its existing head/chest instead of being left at the old standing position.
    for(const n of [rig.neck,rig.gearBody])if(n&&mapping.get(n))mapping.get(rig.torso).attach(mapping.get(n));
    const B=BODY;
    const spin=velocity.length()>3?new C.Vec3((Math.random()<.5?-1:1)*5,(Math.random()-.5)*2,(Math.random()-.5)*5):new C.Vec3(.5,0,.4);
    const defs=[['pelvis',B.pelvisW,B.pelvisH,B.chestD,5,0,0],['torso',B.chestW,B.torsoH,B.chestD,8,0,0],['head',B.headHalfW*2,B.headH,B.headHalfD*2,3,0,0]];
    for(const side of ['L','R'])defs.push(['arm'+side,B.upperArmW,B.upperArm,B.upperArmW,2,-B.upperArm/2,0],['elbow'+side,B.foreArmW,B.foreArm,B.foreArmW,1.5,-B.foreArm/2,0],['wrist'+side,B.handW,B.handH,B.handW,.6,-B.handH/2,0],['leg'+side,B.thighW,B.thigh,B.thighD,3,-B.thigh/2,0],['knee'+side,B.shinW,B.shin,B.shinD,2,-B.shin/2,0],['foot'+side,B.bootW,B.bootH,B.bootD,1,-B.bootH/2,B.bootZ]);
    for(const [name,w,h,d,mass,oy,oz] of defs){
      const original=rig[name],node=mapping.get(original);if(!node)continue;
      const offset=new THREE.Vector3(0,oy,oz),center=original.localToWorld(offset.clone()),q=original.getWorldQuaternion(new THREE.Quaternion());
      const body=new C.Body({mass,shape:new C.Box(new C.Vec3(w*.48,h*.48,d*.48)),linearDamping:.15,angularDamping:.55,collisionFilterGroup:2,collisionFilterMask:1,sleepSpeedLimit:.18,sleepTimeLimit:.7});
      body.position.copy(vec(center));body.quaternion.set(q.x,q.y,q.z,q.w);body.velocity.copy(vec(velocity));body.angularVelocity.set(spin.x+(Math.random()-.5),spin.y,spin.z+(Math.random()-.5));physics.addBody(body);
      const part={name,node,body,offset};parts.push(part);byName[name]=part;
    }
    function join(a,b,anchorNode,angle=1.3){
      const A=byName[a]?.body,B=byName[b]?.body;if(!A||!B||!anchorNode)return;
      const p=vec(anchorNode.getWorldPosition(new THREE.Vector3()));
      const joint=new C.ConeTwistConstraint(A,B,{pivotA:A.pointToLocalFrame(p),pivotB:B.pointToLocalFrame(p),axisA:new C.Vec3(0,1,0),axisB:new C.Vec3(0,1,0),angle,twistAngle:.8,maxForce:60000,collideConnected:false});physics.addConstraint(joint);joints.push(joint);
    }
    join('pelvis','torso',rig.pelvis,.5);join('torso','head',rig.neck,.65);
    for(const side of ['L','R']){join('torso','arm'+side,rig['arm'+side],1.8);join('arm'+side,'elbow'+side,rig['elbow'+side],1.7);join('elbow'+side,'wrist'+side,rig['wrist'+side],.7);join('pelvis','leg'+side,rig['leg'+side],1.3);join('leg'+side,'knee'+side,rig['knee'+side],1.5);join('knee'+side,'foot'+side,rig['foot'+side],.55);}
    entry={id,source,visual,parts,joints,byName,dead,owned:false,age:0,life:dead?5:3.5};source._ragdoll=entry;source.visible=false;active.push(entry);return entry;
  }
  function sourceFor(id){
    if(id!==myId)return remoteMeshes[id];
    const mesh=makePlayerMesh(currentUser?.username||'You',false,localPlayerTeam(),mySkin||'default',{hair:myHair});
    mesh.position.copy(camera.position);mesh.position.y-=window._crouchEye||1.65;mesh.rotation.y=euler.y+Math.PI;return mesh;
  }
  function death(id,weaponId){
    if(!C)return false;
    const previous=active.find(e=>e.id===id);if(previous){previous.dead=true;previous.life=Math.max(previous.life,previous.age+4);return true;}
    const source=sourceFor(id);if(!source||(!source.visible&&id!==myId))return false;
    const bot=resolveBot(id),velocity=new THREE.Vector3(bot?.kbVX||0,Math.max(0,bot?.yVel||0),bot?.kbVZ||0);
    const info=_killInfo[id],weapon=info?.weapon||weaponId||'',base=weapon.replace(/_splash$/,''),explosive=EXPLOSIVE_KINDS.has(projectileKind(base,projectileWeaponSpec(base)))||/^(frag|c4|satchel|explosive_barrel|airburst|mortar)(_|$)/.test(weapon)||info?.cause==='hazard'&&/bomb|explos|air.?raid|mortar/i.test(info.label||'');
    if(explosive){
      const recent=lastBlast&&performance.now()-lastBlast.time<500&&source.position.distanceTo(lastBlast.pos)<BLAST_RADIUS;
      const killer=players[info?.killer],origin=recent?lastBlast.pos:new THREE.Vector3(killer?.x??source.position.x-1,source.position.y-.5,killer?.z??source.position.z);
      const kick=impulse(origin,source.position.clone().add(new THREE.Vector3(0,.3,0)),24,recent?BLAST_RADIUS:100);if(kick)velocity.add(kick);
    }
    if(velocity.length()<.5)velocity.set((Math.random()-.5)*1.8,.7,(Math.random()-.5)*1.8);
    const entry=create(source,id,true,velocity);if(entry){entry.explosive=!!explosive;if(id===myId){entry.owned=true;exitSpectator();stopSocialView();if(PLAYER_VIEW.actor)PLAYER_VIEW.actor.visible=false;}}return !!entry;
  }
  function impulse(pos,point,power,radius){const away=point.clone().sub(pos),d=away.length();if(d>=radius)return null;away.y=Math.max(.7,away.y);return away.normalize().multiplyScalar(power*(1-d/radius));}
  function blast(pos){
    if(!C||!gameStarted||inLobby)return;lastBlast={pos:pos.clone(),time:performance.now()};
    // Surviving a blast keeps ordinary knockback and control, never a knockdown.
    for(const entry of active){if(!entry.dead||!entry.explosive||entry.age>.75)continue;const p=entry.byName.pelvis.body.position,kick=impulse(pos,new THREE.Vector3(p.x,p.y,p.z),24,BLAST_RADIUS);if(kick)for(const part of entry.parts){part.body.wakeUp();part.body.velocity.vadd(vec(kick),part.body.velocity);const speed=part.body.velocity.length();if(speed>30)part.body.velocity.scale(30/speed,part.body.velocity);}}
  }
  function recover(entry){
    if(entry.dead){release(entry,false);return;}
    const b=entry.byName.pelvis.body,p=new THREE.Vector3(b.position.x,b.position.y,b.position.z);
    const ground=botGroundYAt(p.x,p.z,Math.max(0,p.y-.4),1.2,4),[x,z]=resolvePosCollisions(p.x,p.z,ground);
    const bot=resolveBot(entry.id);
    if(entry.id===myId){camera.position.set(x,ground+1.65,z);playerYVel=0;slamState=null;_extVel.x=_extVel.z=0;window._blastCarry=false;window._crouchEye=1.65;lastPlayerPos.copy(camera.position);}
    else {entry.source.position.set(x,ground,z);if(bot){bot.x=x;bot.z=z;bot.y=ground;bot.yVel=0;bot.kbVX=bot.kbVZ=0;}}
    release(entry,true);
    if(entry.id===myId&&(isOutOfBoundsXZ(x,z)||!floorExistsAt(x,z)))killLocalOutOfBounds();
    else if(bot&&isBotOutOfBoundsXZ(x,z))killBotOutOfBounds(bot);
  }
  function tick(dt){
    if(!physics||!active.length||window.PVP_UNDERWORLD?.paused||window.PVP_BACKROOMS?.paused)return;
    const colliders=new Set(wallColliders);for(const [box,body] of statics)if(!body._terrain&&!colliders.has(box)){physics.removeBody(body);statics.delete(box);}
    accumulator+=Math.min(.05,dt);let steps=0;while(accumulator>=1/60&&steps++<3){physics.step(1/60);accumulator-=1/60;}
    const q=new THREE.Quaternion(),p=new THREE.Vector3(),offset=new THREE.Vector3(),parentQ=new THREE.Quaternion();
    for(const entry of [...active]){
      entry.age+=dt;
      for(const part of entry.parts){
        q.set(part.body.quaternion.x,part.body.quaternion.y,part.body.quaternion.z,part.body.quaternion.w);offset.copy(part.offset).applyQuaternion(q);p.set(part.body.position.x,part.body.position.y,part.body.position.z).sub(offset);
        part.node.parent.updateWorldMatrix(true,false);part.node.position.copy(part.node.parent.worldToLocal(p));part.node.parent.getWorldQuaternion(parentQ);part.node.quaternion.copy(parentQ.invert().multiply(q));part.node.updateWorldMatrix(false,true);
      }
      const root=entry.byName.pelvis.body,bot=resolveBot(entry.id);
      if(entry.id===myId){const eye=viewCamera();if(eye){camera.position.copy(eye.position);camera.quaternion.copy(eye.quaternion);}}
      if(!entry.dead){
        if(entry.id===myId){camera.position.set(root.position.x,root.position.y+.8,root.position.z);shooting=false;}
        else {entry.source.position.set(root.position.x,root.position.y-.8,root.position.z);if(bot){bot.x=root.position.x;bot.z=root.position.z;bot.y=root.position.y-.8;if(players[entry.id])Object.assign(players[entry.id],{x:bot.x,y:bot.y+1.65,z:bot.z});}}
      }
      if(entry.age>entry.life||root.position.y < -80||!entry.dead&&entry.age>1.2&&entry.parts.every(p=>p.body.sleepState===C.Body.SLEEPING))recover(entry);
    }
  }
  const followCamera=new THREE.PerspectiveCamera(75,1,.04,1000);
  function hit(mesh,start,end,radius=0){
    const entry=mesh?._ragdoll;if(!entry||entry.dead)return null;
    const direction=end.clone().sub(start),length=direction.length();if(length<1e-6)return null;direction.normalize();let best=null;
    for(const part of entry.parts){
      const b=part.body,q=new THREE.Quaternion(b.quaternion.x,b.quaternion.y,b.quaternion.z,b.quaternion.w).invert(),center=new THREE.Vector3(b.position.x,b.position.y,b.position.z),half=b.shapes[0].halfExtents;
      const origin=start.clone().sub(center).applyQuaternion(q),dir=direction.clone().applyQuaternion(q),ray=new THREE.Ray(origin,dir),box=new THREE.Box3(new THREE.Vector3(-half.x-radius,-half.y-radius,-half.z-radius),new THREE.Vector3(half.x+radius,half.y+radius,half.z+radius));
      const p=box.containsPoint(origin)?origin:ray.intersectBox(box,new THREE.Vector3());if(!p)continue;const distance=p.distanceTo(origin);if(distance>length||best&&distance>=best.t*length)continue;
      best={t:distance/length,pos:start.clone().addScaledVector(direction,distance),headshot:part.name==='head',miss:0};
    }return best;
  }
  function viewCamera(){
    const entry=localCameraEntry();if(!entry)return null;
    const head=entry.byName.head,b=head.body,q=new THREE.Quaternion(b.quaternion.x,b.quaternion.y,b.quaternion.z,b.quaternion.w);
    followCamera.position.set(b.position.x,b.position.y,b.position.z).add(new THREE.Vector3(0,.02,BODY.headHalfD+.035).applyQuaternion(q));
    followCamera.quaternion.copy(q).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI)).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),euler.x));
    head.node.visible=false;followCamera.aspect=camera.aspect;followCamera.fov=camera.fov;followCamera.updateProjectionMatrix();return followCamera;
  }
  function localCameraEntry(){
    const entry=active.find(e=>e.id===myId);if(!entry)return null;
    if(entry.dead && entry.age>=3 && match?.type==='elim' && match.roundActive && !match.over && getLiveAllies().length)return null;
    return entry;
  }
  window.PVP_RAGDOLL={ready,death,blast,tick,clear,viewCamera,hit,reset:mesh=>{if(mesh?._ragdoll)release(mesh._ragdoll,false);},resetLocal:()=>{for(const e of [...active])if(e.id===myId)release(e,false);},get entries(){return active;},get controlling(){return !!localCameraEntry();}};
})();
