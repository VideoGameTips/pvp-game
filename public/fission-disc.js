(() => {
  'use strict';
  const flights = new Map();
  let readyAt = 0, initialized = false, serial = 0, template = null;
  function model() {
    if(template)return template.clone();
    const g = new THREE.Group();
    const steel = new THREE.MeshPhongMaterial({color:0x232b32,shininess:100});
    const edge = new THREE.MeshPhongMaterial({color:0xa5b4b9,shininess:140});
    const green = new THREE.MeshBasicMaterial({color:0xa5f542});
    const add = (geo, mat, y) => {const m=new THREE.Mesh(geo,mat);m.position.y=y;g.add(m);return m;};
    add(new THREE.CylinderGeometry(.23,.23,.045,24),steel,0);
    add(new THREE.CylinderGeometry(.255,.255,.012,24),edge,0);
    add(new THREE.CylinderGeometry(.075,.075,.059,12),green,0);
    for (const side of [-1,1]) {
      const ring=add(new THREE.TorusGeometry(.192,.012,4,24),green,side*.026);
      ring.rotation.x=Math.PI/2;
      for(let i=0;i<3;i++) {
        const sector=add(new THREE.RingGeometry(.09,.15,4,1,i*Math.PI*2/3,.85),green,side*.031);
        sector.rotation.x=-side*Math.PI/2;
      }
    }
    template=g;return g.clone();
  }
  function setAmmo(n) {
    const idx=WEAPONS.findIndex(w=>w.id==='fission_disc');
    if(idx<0)return;
    weaponAmmo[idx]={ammo:n,reserve:0};
    if(weaponModels[idx]?._disc)weaponModels[idx]._disc.visible=!!n;
    if(currentWeapon?.id==='fission_disc') {ammo=n;reserve=0;updateAmmoHUD();}
  }
  function remove(f) {f.mesh.removeFromParent();flights.delete(f.id);}
  function clear() {
    for(const f of flights.values())remove(f);
    readyAt=0;setAmmo(1);
  }
  function receive(b) {
    if(b.ownerId===myId||flights.has(b.id))return;
    const f=spawn(b.id,b.ownerId,new THREE.Vector3(b.x,b.y,b.z),new THREE.Vector3(b.dx,b.dy,b.dz),false);
    if(window.PVP_BLACKOUT?.valid.has(b.skin))applyWeaponSkin(f.mesh,WEAPON_SKINS_BY_ID[b.skin]);
  }
  function init() {
    if(initialized)return;initialized=true;
    socket.on('fissionFlight',data=>{
      const f=flights.get(data.id);if(!f||f.own)return;
      if(data.caught){remove(f);return;}
      f.mesh.position.set(data.x,data.y,data.z);
      f.dir.set(data.dx,data.dy,data.dz);f.returning=!!data.returning;
    });
  }
  function spawn(id,owner,origin,dir,own) {
    const mesh=model();mesh.position.copy(origin);scene.add(mesh);
    if(own&&WEAPON_SKINS_BY_ID[wrapIdFor('fission_disc')]?.blackout)applyWeaponSkin(mesh,WEAPON_SKINS_BY_ID[wrapIdFor('fission_disc')]);
    const f={id,owner,own,mesh,dir:dir.clone().normalize(),distance:0,returning:false,
      hits:new Set(),born:performance.now(),epoch:matchEpoch,lastWire:0};
    flights.set(id,f);return f;
  }
  function fire() {
    init();
    if(performance.now()<readyAt||[...flights.values()].some(f=>f.own))return;
    if(!gameStarted||isDead||countdownActive||KILLCAM.active)return;
    const dir=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
    const origin=camera.position.clone().addScaledVector(dir,.35);
    const id=`local_${myId}_fission_${++serial}_${Date.now()}`;
    spawn(id,myId,origin,dir,true);setAmmo(0);lastShot=Date.now();cancelInspect();
    socket.emit('shoot',{weapon:'fission_disc',projectileId:id,x:origin.x,y:origin.y,z:origin.z,dx:dir.x,dy:dir.y,dz:dir.z});
  }
  function wire(f,caught=false) {
    const p=f.mesh.position;
    socket.emit('fissionFlight',{id:f.id,x:p.x,y:p.y,z:p.z,dx:f.dir.x,dy:f.dir.y,dz:f.dir.z,returning:f.returning,caught});
    f.lastWire=performance.now();
  }
  function turn(f) {if(!f.returning){f.returning=true;f.hits.clear();}}
  function step(dt) {
    init();
    const now=performance.now();
    if(readyAt&&now>=readyAt){readyAt=0;setAmmo(1);}
    for(const f of flights.values()) {
      if(f.epoch!==matchEpoch||now-f.born>8000||f.own&&isDead||players[f.owner]?.dead){remove(f);if(f.own){readyAt=now+300;setAmmo(0);}continue;}
      const start=f.mesh.position.clone();
      const owner=f.own?camera.position:remoteMeshes[f.owner]?.position.clone().add(new THREE.Vector3(0,1.5,0));
      if(!owner){remove(f);continue;}
      if(f.returning) {
        const delta=owner.clone().sub(start),distance=delta.length();
        if(distance<=90*dt+.2){
          if(f.own){f.mesh.position.copy(owner);wire(f,true);readyAt=now+300;setAmmo(0);}
          remove(f);continue;
        }
        f.dir.copy(delta).divideScalar(distance);
      }
      const travel=Math.min(90*dt,f.returning?Infinity:35-f.distance);
      const end=start.clone().addScaledVector(f.dir,travel);
      if(!f.returning) {
        const ray=new THREE.Ray(start,f.dir),hit=new THREE.Vector3();let nearest=travel;
        for(const box of wallColliders)if(ray.intersectBox(box,hit))nearest=Math.min(nearest,start.distanceTo(hit));
        if(end.y<.08&&start.y>=.08)nearest=Math.min(nearest,(.08-start.y)/f.dir.y);
        end.copy(start).addScaledVector(f.dir,Math.max(0,nearest));
      }
      f.mesh.position.copy(end);f.mesh.rotation.y+=dt*24;
      if(f.own) {
        // Sweep a thin disc against the same standing/sliding body envelopes used by the game.
        const segment=new THREE.Line3(start,end),closest=new THREE.Vector3();
        wire(f);
        for(const [id,m] of Object.entries(remoteMeshes)) {
          const p=players[id];
          if(id===myId||!p||p.dead||!m.visible||f.hits.has(id)||friendlyFireBlocked(id,myId))continue;
          const head=m._rig?.hitHeadOff??1.65;
          const center=m.position.clone().add(new THREE.Vector3(0,head*.55,0));
          segment.closestPointToPoint(center,true,closest);
          if(Math.hypot(closest.x-center.x,closest.z-center.z)>.6||closest.y<m.position.y-.15||closest.y>m.position.y+head+.25)continue;
          if(!hasLineOfSight(start.x,start.z,closest.x,closest.z,start.y,closest.y))continue;
          f.hits.add(id);
          const bulletId=`${f.id}:${f.returning?'return':'out'}:${id}`;
          if(p.isDummy){const dummy=TRAINING_DUMMIES.find(d=>d.id===id);if(dummy)handleDummyHit(dummy,m,{damage:65,headshot:false,falloff:1,headMiss:null,weaponId:'fission_disc'},closest.clone());}
          else emitHit(id,bulletId,'fission_disc',closest.clone(),false,{damageOverride:65});
        }
      }
      if(!f.returning){f.distance+=start.distanceTo(end);if(f.distance>=35-1e-5||start.distanceTo(end)<travel-1e-5)turn(f);}
    }
  }
  window.PVP_FISSION_DISC={model,fire,step,clear,receive,get deployed(){return [...flights.values()].some(f=>f.own);},get available(){return performance.now()>=readyAt&&!this.deployed;}};
})();
