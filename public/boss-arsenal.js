/* The Arsenal fires the same weapons, collision-tested bullets and utilities as a match. */
(function () {
  'use strict';
  function build() {
    const root = new THREE.Group(), torso = new THREE.Group();
    const steel = GUN_MATS.steel(), dark = GUN_MATS.grip(), trim = GUN_MATS.blued();
    gpBox(root, dark, 2.65, .38, 1.8, 0, .24, 0);
    for (const side of [-1, 1]) {
      gpBox(root, steel, .62, .65, 1.95, side*1.12, .42, 0);
      for (let i=0;i<9;i++) gpBox(root, dark, .66, .14, .09, side*1.12, .12, -.84+i*.21);
    }
    torso.position.y=.66;root.add(torso);
    gpBox(torso, steel, 1.7, 1.1, 1.05, 0, .58, 0);
    gpBox(torso, trim, 1.45, .65, .13, 0, .60, .56);
    gpBox(torso, dark, .65, .38, .65, 0, 1.38, 0);
    gpBox(torso, new THREE.MeshBasicMaterial({color:0xff3434}), .52, .055, .025, 0, 1.43, .34);
    for (const side of [-1,1]) {
      gpBox(torso, steel, .26, .95, .32, side*1.07, .64, .08);
      gpBox(torso, trim, .75, .16, .58, side*1.03, 1.12, .10);
    }
    const mounts = [];
    function mount(weaponId, builder, x, y, z, scale=3) {
      const pivot=new THREE.Group();pivot.position.set(x,y,z);torso.add(pivot);
      const gun=builder();gun.position.set(0,0,0);gun.rotation.set(0,Math.PI,0);gun.scale.setScalar(scale);pivot.add(gun);
      gpBox(pivot, dark, .18, .22, .32, 0, -.12, -.10);
      let muzzle=gun._flash;
      if(!muzzle){muzzle=new THREE.Object3D();muzzle.position.set(0,.02,-.32);gun.add(muzzle);}
      const entry={weaponId,pivot,gun,muzzle,kick:0};mounts.push(entry);return entry;
    }
    const uzis=[-1,0,1].map((x,i)=>mount('machine_pistol',buildUziSkin,x*1.06,.42,i===1?.82:.48));
    const sniper=mount('srx',buildSRX,0,1.78,.05,3.3);
    const rockets=Array.from({length:5},(_,i)=>mount('rpg',buildRPG,(i-2)*.53,1.14,-.50,2.5));
    const launchers=[-1,1].map(side=>mount('grenade_launcher',buildGrenadeLauncher,side*1.40,.92,-.02,2.6));
    const bottles=Array.from({length:10},(_,i)=>{
      const bottle=buildMolotov();bottle.scale.setScalar(1.9);bottle.position.set((i%5-2)*.23,.13+Math.floor(i/5)*.37,.72);torso.add(bottle);return bottle;
    });
    const sword=buildKatana();sword.scale.setScalar(3.3);sword.position.set(-.92,.45,.45);sword.rotation.set(0,-.7,1.1);torso.add(sword);
    root.userData={torso,mounts,uzis,sniper,rockets,launchers,bottles,sword};return root;
  }
  const target=()=>camera.position.clone().add(new THREE.Vector3(0,-.48,0));
  function aim(mount, point) { mount.pivot.parent.updateWorldMatrix(true,true);mount.pivot.lookAt(point); }
  function fire(B,mount,point,arcTime=0) {
    aim(mount,arcTime ? point.clone().add(new THREE.Vector3(0,.5*BULLET_GRAVITY*1.5*arcTime**2,0)) : point);
    const w=projectileWeaponSpec(mount.weaponId),origin=_bossWorld(mount.muzzle),dir=point.clone().sub(origin).normalize();
    const opts={botId:B.bot.id,botTeam:'enemy',bossOwner:B.bot.id,preciseHeadshot:w.id==='srx'};
    if(arcTime){
      dir.copy(point).sub(origin).divideScalar(arcTime);
      dir.y+=.5*BULLET_GRAVITY*1.5*arcTime;
      Object.assign(opts,{speed:dir.length(),_arc:1,_arcG:1.5,_flightMs:4500});
      dir.normalize();
    }
    spawnLocalBullet(origin,dir,`arsenal_${B.bot.id}_${B.serial=(B.serial||0)+1}`,false,w.bulletSpeed,w.bulletColor,w.bulletSize,w.id,opts);
    playWeaponSound(w.id,{baseWeapon:w,remote:true,position:origin,source:B.bot.id});
    mount.kick=.05;if(mount.gun._flash)mount.gun._flash.visible=true;
  }
  function warning(B,point,radius,color=0xff4833) {
    const mesh=new THREE.Mesh(new THREE.RingGeometry(radius-.07,radius,48),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,transparent:true,opacity:.85,depthWrite:false}));
    mesh.rotation.x=-Math.PI/2;mesh.position.copy(point);mesh.position.y=.07;scene.add(mesh);
    (B.nativeWarnings ||= []).push(mesh);return mesh;
  }
  function removeWarning(B,mesh) {
    const index=B.nativeWarnings?.indexOf(mesh)??-1;
    if(index<0)return;
    B.nativeWarnings.splice(index,1);mesh.removeFromParent();mesh.geometry.dispose();mesh.material.dispose();
  }
  function uzis(B) {
    const guns=B.robot.userData.uzis,gap=.18;
    let t=0,round=0;
    return {name:'uzis',tick(dt){
      t+=dt;
      while(round*gap<11&&t>=round*gap){
        fire(B,guns[round%guns.length],target());
        round++;
      }
      return t>=11;
    }};
  }
  function sniper(B) {
    const gun=B.robot.userData.sniper,positions=new Float32Array(6);
    const laser=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xff1010,transparent:true,opacity:1,depthTest:false}));
    laser.geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));laser.frustumCulled=false;laser.renderOrder=20;scene.add(laser);
    const glow=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,1,8),new THREE.MeshBasicMaterial({color:0xff1515,transparent:true,opacity:.8,depthWrite:false}));
    scene.add(glow);(B.nativeWarnings ||= []).push(laser,glow);
    let t=0,fired=false;
    showAnnouncement('SNIPER TRACKING','Red laser: break the sightline', '#ff4444',2000);
    return {name:'sniper',tick(dt){
      t+=dt;
      if(!fired){
        const eye=window._crouchEye||1.65,crouch=Math.max(0,Math.min(1,(1.65-eye)/.95));
        const lock=camera.position.clone();lock.y=camera.position.y-eye+1.62-crouch*.74;aim(gun,lock);
        const origin=_bossWorld(gun.muzzle),direction=lock.clone().sub(origin).normalize(),end=origin.clone().addScaledVector(direction,180);
        const ray=new THREE.Ray(origin,direction),hit=new THREE.Vector3();
        for(const box of wallColliders)if(ray.intersectBox(box,hit)&&hit.distanceToSquared(origin)<end.distanceToSquared(origin))end.copy(hit);
        if(direction.y<0){
          const ground=origin.clone().addScaledVector(direction,-origin.y/direction.y);
          if(floorExistsAt(ground.x,ground.z)&&ground.distanceToSquared(origin)<end.distanceToSquared(origin))end.copy(ground);
        }
        origin.toArray(positions,0);end.toArray(positions,3);laser.geometry.attributes.position.needsUpdate=true;
        laser.material.opacity=.7+.3*Math.sin(t*12);
        const span=end.clone().sub(origin);glow.position.copy(origin).addScaledVector(span,.5);glow.scale.y=span.length();glow.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),span.normalize());
        if(t>=2){fire(B,gun,lock);fired=true;removeWarning(B,laser);removeWarning(B,glow);}
      }
      return fired&&t>3;
    }};
  }
  function salvo(B,kind) {
    const rockets=kind==='rockets',guns=rockets?B.robot.userData.rockets:B.robot.userData.launchers;
    const lock=target(),points=guns.map((_,i)=>lock.clone().add(new THREE.Vector3((i-(guns.length-1)/2)*(rockets?4:7),0,rockets?Math.abs(i-2)*2:0)));
    points.forEach(p=>{p.y=.15;});
    let t=0,fired=0;
    return {name:kind,tick(dt){
      t+=dt;
      while(fired<guns.length&&t>=fired*.28){fire(B,guns[fired],points[fired],rockets?2.5:0);fired++;}
      return fired===guns.length;
    }};
  }
  function molotovs(B) {
    const U=B.robot.userData,count=30;
    showAnnouncement('MOLOTOV VOLLEY','Bottles incoming: keep a route out of the fire','#ffaa33',1700);
    let t=0,fired=0,mark=null,point=null;
    return {name:'molotovs',tick(dt){
      t+=dt;
      if(!mark&&fired<count){
        const angle=fired*2.399963,offset=fired%3===0?0:4+(fired%4)*1.7;
        point=target().add(new THREE.Vector3(Math.cos(angle)*offset,0,Math.sin(angle)*offset));point.y=.1;
        mark=warning(B,point,3.2,0xff9a23);t=0;
      }
      if(mark&&t>=.85){
        const rackIndex=fired%U.bottles.length;
        if(!rackIndex)U.bottles.forEach(b=>{b.visible=true;});
        const bottle=U.bottles[rackIndex],origin=_bossWorld(bottle),flight=Math.max(.6,origin.distanceTo(point)/30),velocity=point.clone().sub(origin).divideScalar(flight);
        velocity.y+=.5*GRENADE_GRAVITY*flight;
        const mesh=buildMolotov();mesh.position.copy(origin);mesh.scale.setScalar(2);scene.add(mesh);bottle.visible=false;
        activeGrenades.push({mesh,id:`arsenal_molotov_${B.bot.id}_${fired}_${Date.now()}`,isOwn:false,isSupport:true,itemRef:SUPPORT_ITEMS.find(x=>x.id==='molotov'),ownerId:B.bot.id,
          velX:velocity.x,velY:velocity.y,velZ:velocity.z,gravMult:1,explodeOnImpact:true,bounceCount:0});
        removeWarning(B,mark);mark=null;fired++;
      }
      return fired===count;
    }};
  }
  // ONE attack at a time. Every weapon keeps its own cadence (Uzis every 15 s, the sniper every 10 s, grenades every 14 s, Molotovs every 38 s,
  // counted from when it last STARTED), but a cadence is only a wish to start: if something else is already going, it waits. When the current
  // attack ends the boss takes the usual breath between attacks (1.7 s, 1.2 s, 0.7 s by phase), then starts whichever has been due the longest.
  // The covered-target RPG roll still runs on its own fixed interval (so the chance does not depend on FPS), but it can only QUEUE a volley:
  // the volley waits its turn, and is dropped if you have come out of cover by then, because it exists to punish hiding.
  const PERIODS={uzis:15,sniper:10,grenades:14,molotovs:38};
  function covered(B){
    const visor=B.robot.userData.torso.localToWorld(new THREE.Vector3(0,1.55,.36));
    return _bossSegHitsWall(visor,target());
  }
  function updateWeapons(B,dt) {
    const c=B.nativeClocks ||= {t:0,due:{uzis:3,sniper:10,grenades:7,molotovs:18},coverCheck:0,rocketsQueued:false,current:null,pause:0};
    c.t+=dt;
    if(c.t>=c.coverCheck&&!c.rocketsQueued&&c.current?.name!=='rockets'){
      c.coverCheck=c.t+.25;
      if(covered(B)&&Math.random()<.005){c.rocketsQueued=true;c.coverCheck=c.t+4;}
    }
    if(!c.current&&c.t>=c.pause){
      let pick=null;
      if(c.rocketsQueued){c.rocketsQueued=false;if(covered(B))pick='rockets';}
      if(!pick){
        let latest=-1;
        for(const name of Object.keys(PERIODS)){const late=c.t-c.due[name];if(late>=0&&late>latest){pick=name;latest=late;}}
      }
      if(pick){
        if(pick!=='rockets')c.due[pick]=c.t+PERIODS[pick];
        c.current=B.def.attacks[pick](B);
      }
    }
    if(c.current&&c.current.tick(dt)){c.current=null;c.pause=c.t+(B.phase===1?1.7:B.phase===2?1.2:.7);}
  }
  function cleanup(B) {
    for(const mesh of [...(B.nativeWarnings||[])])removeWarning(B,mesh);
    delete B.nativeClocks;
    for(const list of [localBullets,activeGrenades,burnZones])for(let i=list.length-1;i>=0;i--){
      const item=list[i];if(item.bossOwner!==B.bot.id&&item.ownerId!==B.bot.id)continue;
      item.mesh.removeFromParent();list.splice(i,1);
    }
    if(B.shield)bossShieldOff(B,Date.now());
  }
  BOSS_DEFS.arsenal={id:'arsenal',name:'THE ARSENAL',icon:'',color:'#ff6749',hp:7500,scale:4,hitMul:1.6,build,
    win:'THE ARSENAL IS DISARMED',nativeWeapons:true,reactiveShield:true,shieldMs:3000,healOnPhase:false,
    intro:'3 Uzis / sniper / 5 RPGs / 10 Molotovs / katana / twin grenade launchers',
    phaseText:{2:'Ammunition replenished.',3:'Final phase. Ammunition replenished.'},
    refillAmmo(){
      cancelReload();
      for(const idx of new Set([selectedPrimaryIdx,selectedSecondaryIdx])) {
        const w=applyUpgrades(WEAPONS[idx]);
        if(w.id==='harpoon_gun'&&window.PVP_TETHER_WEAPONS?.deployed)continue;
        weaponAmmo[idx]={ammo:w.mag,reserve:w.reserve};
      }
      if(activeSlot==='primary'||activeSlot==='secondary'){
        ammo=weaponAmmo[currentWeaponIdx].ammo;reserve=weaponAmmo[currentWeaponIdx].reserve;
      }
      updateAmmoHUD();
    },
    attacks:{uzis,sniper,rockets:B=>salvo(B,'rockets'),grenades:B=>salvo(B,'grenades'),molotovs},
    updateWeapons,cleanup,
    updateDefense(B,now){
      const hp=B.bot.hp,previous=B.observedHp??B.bot.maxHp;B.observedHp=hp;
      if(hp<previous&&!B.shield&&!B.deflectAt)B.deflectAt=now+1000;
      if(!B.shield&&B.deflectAt&&now>=B.deflectAt){B.deflectAt=0;bossShieldOn(B,now);}
      else if(B.shield&&now>=B.shieldUntil)bossShieldOff(B,now);
    },
    blockHit(B,pos,weaponId,opts){
      if(opts.periodic||EXPLOSIVE_KINDS.has(projectileKind(weaponId))||!projectileWeaponSpec(weaponId))return false;
      reflectBotShotAtPlayer(B.bot.id,weaponId,pos,opts.damageOverride);
      spawnHitParticle(pos);playSoundEvent('katana_deflect',{position:pos,remote:true,minGap:50});
      return true;
    },
    anim(B,dt){
      const U=B.robot.userData,want=Math.atan2(camera.position.x-B.bot.x,camera.position.z-B.bot.z);
      U.torso.rotation.y+=Math.atan2(Math.sin(want-U.torso.rotation.y),Math.cos(want-U.torso.rotation.y))*Math.min(1,dt*2.5);
      for(const m of U.mounts){m.kick=Math.max(0,m.kick-dt*.5);m.gun.position.z=-m.kick;if(m.gun._flash&&m.kick<.025)m.gun._flash.visible=false;}
      const a=1-Math.exp(-dt*16),p=B.shield?new THREE.Vector3(.65,.85,.85):new THREE.Vector3(-.92,.45,.45);
      U.sword.position.lerp(p,a);const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(B.shield?.4:0,B.shield?1.3:-.7,B.shield?.7:1.1));U.sword.quaternion.slerp(q,a);
    }
  };
})();
