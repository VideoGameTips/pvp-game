(function () {
  'use strict';
  const UW = window.PVP_UNDERWORLD;
  let nodes = [], companion = null, sequence = 0, routeCache = null;
  const objects = new Set();
  const portraits = new Map();
  const world = () => match?.type === 'campaign';
  const pointOf = k => { const g = routeCache; return { x: g.x0 + (k % g.W + .5) * g.cell, z: g.z0 + (Math.floor(k / g.W) + .5) * g.cell }; };
  function routes() {
    const source = _botNavGrid();
    if (!source) throw Error('Campaign navigation unavailable for ' + activeMapName);
    const g = { ...source, blocked: source.blocked.slice() };
    routeCache = g;
    for (let k = 0; k < g.blocked.length; k++) if (!g.blocked[k]) {
      const p = pointOf(k);
      if (!floorExistsAt(p.x, p.z) || isBotOutOfBoundsXZ(p.x, p.z)) g.blocked[k] = 1;
    }
    const seen = new Uint8Array(g.blocked.length), components = [];
    const visit = start => {
      const queue = [start]; seen[start] = 1;
      for (let i = 0; i < queue.length; i++) {
        const k = queue[i], x = k % g.W, z = Math.floor(k / g.W);
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, nz = z + dz, n = nz * g.W + nx;
          if (nx >= 0 && nx < g.W && nz >= 0 && nz < g.H && !seen[n] && !g.blocked[n]) { seen[n] = 1; queue.push(n); }
        }
      }
      return queue;
    };
    for (let k = 0; k < g.blocked.length; k++) if (!seen[k] && !g.blocked[k]) components.push(visit(k));
    const main = components.sort((a, b) => b.length - a.length)[0];
    if (!main?.length) throw Error('No connected campaign route on ' + activeMapName);
    const start = main.reduce((best, k) => {
      const p = pointOf(k), b = pointOf(best);
      return Math.hypot(p.x-camera.position.x, p.z-camera.position.z) < Math.hypot(b.x-camera.position.x, b.z-camera.position.z) ? k : best;
    }, main[0]);
    _botNavFill(g, start);
    nodes = main.filter(k => g.dist[k] >= 0).map(k => ({ ...pointOf(k), distance: g.dist[k] * g.cell, k }));
    const result = [pointOf(start)];
    for (const desired of [22, 42, 62]) {
      const scored = nodes.map(p => ({ p, score: -Math.abs(p.distance-desired) - result.reduce((n, q) => n + Math.max(0, 10-Math.hypot(p.x-q.x, p.z-q.z)) * 4, 0) }));
      scored.sort((a, b) => b.score-a.score); result.push({ x: scored[0].p.x, z: scored[0].p.z });
    }
    return result;
  }
  function removeActors(predicate) {
    const removed = gameBots.filter(b => b.campaignActor && predicate(b));
    const ids = new Set(removed.map(b=>b.id));
    for (const bullet of localBullets) if (ids.has(bullet.botId)) {bullet._cull=true;scene.remove(bullet.mesh);}
    if (removed.length) socket.emit('despawnBots', removed.map(b => b.id));
    for (const b of removed) {
      const mesh = remoteMeshes[b.id]; if (mesh) { scene.remove(mesh); disposeBody(mesh); delete remoteMeshes[b.id]; }
      if (b._bubble) b._bubble.remove(); delete players[b.id];
      const i = gameBots.indexOf(b); if (i >= 0) gameBots.splice(i, 1);
    }
  }
  function spawnActor(name, team, weaponId, hp, point, extra = {}) {
    const id = `bot_campaign_${myId}_${++sequence}_${Date.now()}`;
    const difficulty = extra.campaignBoss ? 'hard' : 'medium', tune = botTuning(difficulty);
    const w = WEAPONS.find(w => w.id === weaponId) || WEAPONS[0];
    const p = { id, name, team, isBot: true, ownerId: myId, weaponId: w.id, skin: 'default',
      x: point.x, y: 1, z: point.z, hp, maxHp: hp, dead: false, kills: 0, deaths: 0, rotY: 0, rotX: 0 };
    players[id] = p; spawnRemotePlayer(p);
    const b = { id, team, weaponId: w.id, primaryId: w.id, spawnWeaponId: w.id, secondaryId: null,
      meleeId: null, utilityId: null, utilityUsesLeft: 0, nextUtilityAt: Infinity, activeSlot: 'primary',
      x: point.x, z: point.z, y: 0, yVel: 0, hp, maxHp: hp, prevHp: hp, rotY: 0, dead: false, state: 'chase',
      speedMult: extra.campaignBoss ? .85 : 1, personality: 'balanced', dps: WEAPON_DPS_CACHE[w.id] || 150,
      difficulty, tune, aimSkill: tune.aimMin + tune.aimRand * .4, reactionMs: tune.reactMin + tune.reactRand * .5,
      lastShot: Date.now() + 1800, wanderAngle: 0, wanderTimer: 0, stuckTimer: 0, strafeDir: 1,
      strafeFlipTimer: 0, tacTimer: 0, coverPt: null, charId: null, playstyle: null,
      botAmmo: w.mag || 30, botMag: w.mag || 30, botReserve: 999, reloadUntil: 0, firstSeenAt: 0,
      lastSeenPos: null, lastSeenAt: 0, nextAbilityAt: Infinity, meleeChargeAbandonDist: 18,
      hitAndRunUntil: 0, hitAndRunTarget: null, nextRunCheck: 0, currentTargetId: null, frostSlow: 100,
      campaignActor: true, ...extra };
    gameBots.push(b); syncBotMesh(b, { visible: true, resetPose: true });
    if (remoteMeshes[id]) armRemoteMesh(remoteMeshes[id], w.id);
    socket.emit('spawnBots', [{ ...p, spawnX: point.x, spawnZ: point.z }]);
    return b;
  }
  function enemies(count, point, missionId, boss = false, reinforce = false) {
    const alive = gameBots.filter(b => b.campaignActor && b.team === 'enemy' && !b.dead).length;
    const c = UW.data.consequences(UW.progress);
    const hp = boss ? Math.max(700, 1050-c.evidence*90) : 110 + Math.floor((missionId-1)/4) * 30;
    const candidates = nodes.filter(p => {
      const d = Math.hypot(p.x-camera.position.x, p.z-camera.position.z);
      return d > 13 && d < 60 && Math.hypot(p.x-point.x, p.z-point.z) < 45;
    }).map(p => ({ p, score: Math.abs(Math.hypot(p.x-point.x, p.z-point.z)-16) }))
      .sort((a,b)=>a.score-b.score).slice(0,160);
    for (const candidate of candidates) if (hasLineOfSight(candidate.p.x,candidate.p.z,camera.position.x,camera.position.z)) candidate.score += 12;
    const picks = candidates.sort((a,b)=>a.score-b.score).map(c=>c.p);
    const pool = picks.length ? picks : nodes.filter(p => Math.hypot(p.x-camera.position.x, p.z-camera.position.z) > 8);
    if (!pool.length) throw Error('Campaign has no safe enemy spawn');
    const spawned = [];
    for (let i = 0; i < Math.min(count, 7-alive); i++) {
      const point = pool.find(p => ![...spawned, ...gameBots.filter(b => !b.dead)].some(b => Math.hypot(b.x-p.x,b.z-p.z) < 2)) || pool[(sequence+i*13)%pool.length];
      const type = boss ? 0 : (sequence + i + Math.floor(missionId/4)) % 4;
      const weapon = boss ? 'revolver' : ['pistol', 'ak20', 'vector', 'srx'][type];
      const faction = missionId === 11 || missionId === 12 ? 'Stray Patrol' : missionId >= 15 ? 'Dante Guard' : 'Red Serpent';
      spawned.push(spawnActor(boss ? 'Dante Cross' : faction + ' ' + ['Scout', 'Gunner', 'Runner', 'Marksman'][type], 'enemy', weapon,
        boss ? hp : type === 3 ? hp-20 : hp, point, { campaignBoss: boss, campaignReinforcement: reinforce }));
    }
    return spawned;
  }
  function marker(point, kind, stage) {
    const g = new THREE.Group(); g.position.set(point.x, 0, point.z);
    const color = kind === 'defend' ? 0xe5b85b : 0x79d3b8;
    const mat = new THREE.MeshPhongMaterial({ color: 0x334e4b, shininess: 60 });
    if (stage?.prop === 'prisoner' || stage?.prop === 'contact') {
      const body = makePlayerMesh(stage.prop === 'prisoner' ? 'Captured Stray' : 'Neighborhood Contact',true,'ally','default');
      g.add(body);g.userData.storyBody=body;
    } else if (kind === 'retrieve') {
      const box = new THREE.Mesh(new THREE.BoxGeometry(1.2, .8, .8), mat); box.position.y = .4; g.add(box);
      const screen = new THREE.Mesh(new THREE.BoxGeometry(.75, .38, .04), new THREE.MeshBasicMaterial({ color: stage?.prop === 'cargo' ? 0xe5b85b : color })); screen.position.set(0,.55,.42); g.add(screen);
    } else {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(.12,.18,1.3,8), mat); post.position.y=.65; g.add(post);
      const lamp = new THREE.Mesh(new THREE.OctahedronGeometry(.28),new THREE.MeshBasicMaterial({color})); lamp.position.y=1.7; g.add(lamp); g.userData.spin=lamp;
    }
    const ring = new THREE.Mesh(new THREE.RingGeometry(kind === 'defend' ? 10.7 : 2.6, kind === 'defend' ? 11 : 2.8, 48),
      new THREE.MeshBasicMaterial({ color, transparent:true, opacity:.65, side:THREE.DoubleSide, depthWrite:false }));
    ring.rotation.x=-Math.PI/2;ring.position.y=.06;g.add(ring);
    scene.add(g);objects.add(g);return g;
  }
  function removeMarker(g) { scene.remove(g);objects.delete(g);if(g.userData.storyBody){g.remove(g.userData.storyBody);disposeBody(g.userData.storyBody);}
    g.traverse(o=>{o.geometry?.dispose();if(o.material)o.material.dispose();}); }
  function follow(dt, goal, escort) {
    const b = companion;
    if (!b || b.dead) return;
    const playerDistance = Math.hypot(b.x-camera.position.x,b.z-camera.position.z);
    if ((!escort && playerDistance > 4) || (escort && playerDistance < 12 && Math.hypot(b.x-goal.x,b.z-goal.z)>1.3)) {
      const key = Math.round(goal.x/3) + ':' + Math.round(goal.z/3);
      if (b._uwGoalKey !== key || !b._uwPath?.length) {
        const nearest = p => nodes.reduce((a,n)=>Math.hypot(n.x-p.x,n.z-p.z)<Math.hypot(a.x-p.x,a.z-p.z)?n:a,nodes[0]);
        const end=nearest(goal),start=nearest(b),g=routeCache;
        _botNavFill(g,end.k);
        const path=[];let k=start.k,guard=0;
        while(g.dist[k]>0 && guard++<g.blocked.length){
          const x=k%g.W,z=Math.floor(k/g.W),next=[];
          for(const [dx,dz] of _NAV_STEPS){
            const nx=x+dx,nz=z+dz,n=nz*g.W+nx;
            if(nx>=0&&nx<g.W&&nz>=0&&nz<g.H&&g.dist[n]>=0&&g.dist[n]<g.dist[k]
              && !(dx&&dz&&(g.blocked[z*g.W+nx]||g.blocked[nz*g.W+x])))next.push(n);
          }
          if(!next.length)break;k=next[0];path.push(pointOf(k));
        }
        if(!path.length)path.push({x:end.x,z:end.z});
        b._uwPath=path;b._uwGoalKey=key;
      }
      while(b._uwPath.length>1&&Math.hypot(b._uwPath[0].x-b.x,b._uwPath[0].z-b.z)<.3)b._uwPath.shift();
      const wp = b._uwPath[0] || goal, d = Math.hypot(wp.x-b.x,wp.z-b.z), step = Math.min(d, (escort ? 4.5 : 6) * dt);
      if (d > .01) {
        const [x,z] = resolvePosCollisions(b.x+(wp.x-b.x)/d*step,b.z+(wp.z-b.z)/d*step);
        if (floorExistsAt(x,z) && !isBotOutOfBoundsXZ(x,z)) {b.x=x;b.z=z;b.rotY=Math.atan2(-(wp.x-x),-(wp.z-z));}
      }
    }
    syncBotMesh(b);
    if (players[b.id]) Object.assign(players[b.id],{x:b.x,z:b.z,hp:b.hp});
    const target = gameBots.filter(t=>t.team==='enemy'&&!t.dead&&hasLineOfSight(b.x,b.z,t.x,t.z,1.4))
      .sort((a,c)=>Math.hypot(a.x-b.x,a.z-b.z)-Math.hypot(c.x-b.x,c.z-b.z))[0];
    if (target && Math.hypot(target.x-b.x,target.z-b.z)<28 && Date.now()-b.lastShot>300) {
      b.lastShot=Date.now();b.rotY=Math.atan2(-(target.x-b.x),-(target.z-b.z));
      const origin=new THREE.Vector3(b.x,1.4,b.z),at=new THREE.Vector3(target.x,1,target.z),id=`campaign_jax_${Date.now()}`;
      spawnLocalBullet(origin,at.clone().sub(origin).normalize(),id,false,120,0x79d3b8,.025,'ak20',{visualOnly:true});
      kickCharacter(remoteMeshes[b.id]);playWeaponSound('ak20',{remote:true,position:origin,volume:.4});
      const dmg=18; target.hp=Math.max(0,target.hp-dmg);if(players[target.id])players[target.id].hp=target.hp;
      socket.emit('hitBot',{botId:target.id,weapon:'ak20',bulletId:id,killerId:b.id,damageOverride:dmg});
      if(target.hp<=0){target.dead=true;if(players[target.id])players[target.id].dead=true;dropBody(target.id);onEntityDied(target.id,b.id);}
    }
  }
  function halt(value) {
    shooting=false;isADS=false;for(const k of Object.keys(keys))keys[k]=false;
    window._mobileJump=window._mobileSlide=false;joyDir={x:0,y:0};
    if(value){releasePointer();document.activeElement?.blur();}
  }
  function portrait(id) {
    if (portraits.has(id)) return portraits.get(id);
    const c = UW.data.characters[id] || UW.data.characters.Player;
    const s = new THREE.Scene(); s.background = new THREE.Color(0x263b38);
    s.add(new THREE.HemisphereLight(0xffffff, 0x526052, 1.7));
    const key = new THREE.DirectionalLight(0xffffff, 1.3); key.position.set(2,4,4); s.add(key);
    const body = makePlayerMesh(c.name,true,'ally',c.skin); s.add(body);
    const camera = new THREE.PerspectiveCamera(32,128/160,.05,10);camera.position.set(.9,1.6,2.6);camera.lookAt(0,1.3,0);
    const target = new THREE.WebGLRenderTarget(128,160), old = renderer.getRenderTarget();
    target.texture.colorSpace = THREE.SRGBColorSpace;
    const pixels = new Uint8Array(128*160*4);
    try {renderer.setRenderTarget(target);renderer.render(s,camera);renderer.readRenderTargetPixels(target,0,0,128,160,pixels);}
    finally {renderer.setRenderTarget(old);target.dispose();disposeBody(body);}
    const canvas=document.createElement('canvas');canvas.width=128;canvas.height=160;
    const ctx=canvas.getContext('2d'),data=ctx.createImageData(128,160);
    for(let y=0;y<160;y++)data.data.set(pixels.subarray((159-y)*128*4,(160-y)*128*4),y*128*4);
    ctx.putImageData(data,0,0);const url=canvas.toDataURL();portraits.set(id,url);return url;
  }
  UW.bind({
    portrait,bearing:p=>Math.atan2(p.x-camera.position.x,-(p.z-camera.position.z))+euler.y,
    touch:()=>isTouchUI(),confirmReset:()=>uiConfirm('Start a new Underworld campaign? This erases only this account\'s campaign progress on this device. PvP equipment and progress stay unchanged.'),
    account:()=>currentUser?.username,myId:()=>myId,inCampaign:world,
    player:()=>({x:camera.position.x,y:camera.position.y,z:camera.position.z,hp:players[myId]?.hp??300,dead:isDead}),
    stopWorld:()=>teardownMatchWorld(),lobby:()=>{teardownMatchWorld();selectMode('lobby13');},
    start(mission){
      teardownMatchWorld();companion=null;nodes=[];routeCache=null;
      Object.assign(GAME_MODE_CONFIGS.underworld,{type:'campaign',allies:0,enemies:0,forcedMap:mission.map,playerHp:300,botHp:150});
      selectedModeConfig=GAME_MODE_CONFIGS.underworld;
      if(!loadoutReady()){const d=defaultLoadoutIdx();selectedPrimaryIdx=d.p;selectedSecondaryIdx=d.s;selectedMeleeIdx=d.m;selectedSupportIdx=d.u;}
      sanitizeLoadoutSlots();gameStarted=true;isDead=false;inLobby=false;if(players[myId])players[myId].team='ally';resetCombatResources();clearPlayerStatusEffects();
      for(const id of ['mode-screen','overlay','match-over-screen','death-screen','waiting-screen','loadout-screen']){const e=document.getElementById(id);if(e)e.style.display='none';}
      spawnGameBots();equipActiveSlot();startLoop();showLobbyModesButton(false);showLobbyDuelButton(false);showFloatingSettingsButton(true);
    },
    routes,place(p){camera.position.set(p.x,1.65,p.z);faceToward(0,0);slamState=null;playerYVel=0;socket.emit('resetSelf',{x:p.x,z:p.z,mode:'underworld'});grantSpawnShield(2500);},
    companion(name,p){
      const c=UW.data.consequences(UW.progress);
      companion=spawnActor('Jax Moreno','ally','ak20',380+c.trust*40,p,{_campaignCompanion:true});
      const mission=UW.run.mission.id;
      if(mission>=14&&(c.trust>=2||mission===16&&UW.progress.choices.marcus==='spare')){
        const safe=nodes.find(n=>Math.hypot(n.x-p.x,n.z-p.z)>3&&Math.hypot(n.x-p.x,n.z-p.z)<6)||p;
        spawnActor(mission===16&&UW.progress.choices.marcus==='spare'?'Marcus Kane':'Stray Volunteer','ally','pistol',250,safe);
      }
    },
    companionState:()=>companion,
    reviveCompanion(p){if(!companion)return;const b=companion;const safe=nodes.reduce((best,n)=>Math.hypot(n.x-p.x,n.z-p.z)<Math.hypot(best.x-p.x,best.z-p.z)?n:best,nodes[0]);
      b.dead=false;b.hp=b.maxHp;b.x=safe.x;b.z=safe.z;clearBotStatusEffects(b);if(players[b.id])Object.assign(players[b.id],{dead:false,hp:b.hp,x:b.x,z:b.z});syncBotMesh(b,{visible:true,resetPose:true});socket.emit('forceRespawnBot',{botId:b.id,x:b.x,z:b.z,hp:b.hp});},
    follow,enemies,enemyStates:()=>gameBots.filter(b=>b.campaignActor&&b.team==='enemy'),
    clearEnemies:()=>removeActors(b=>b.team==='enemy'),marker,removeMarker,
    markerTick(list,dt){for(const g of list)if(g.userData.spin)g.userData.spin.rotation.y+=dt;},
    capture:()=>requestPointerLockSafe(),halt,
    active(value){if(match){match.active=value;match.roundActive=value;}if(!value)cancelAutoRespawn();
      for(const id of ['match-hud','death-screen','waiting-screen']){const e=document.getElementById(id);if(e)e.style.display='none';}},
    refill(){if(players[myId]&&!isDead){players[myId].hp=300;updateHealthHUD(300);}resetCombatResources();clearPlayerStatusEffects();
      if(companion&&!companion.dead){companion.hp=companion.maxHp;if(players[companion.id])players[companion.id].hp=companion.hp;
        socket.emit('forceRespawnBot',{botId:companion.id,x:companion.x,z:companion.z,hp:companion.hp});}},
    radio:line=>showAnnouncement('RADIO / JAX',line,'#79d3b8',2200)
  });
})();
