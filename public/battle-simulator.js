(function () {
  'use strict';
  const LIMIT=300, KEY='pvp_battle_sim_v1', STEP=1/30;
  const state={active:false,phase:'setup',map:'blank',units:[],selected:null,team:'ally',weapon:'ak20',utility:'',hp:300,difficulty:'medium',serial:0,unitCap:40,lowEffects:true,grounded:false,speed:1,formation:'single',spacing:2.5,rotation:0};
  const deploymentHistory=[];
  let clock=0,epoch=Date.now(),accumulator=0,lastSound=-Infinity;
  const planQueue=[],navQueue=[];
  let planTurn=new Set(),navTurn=new Set();
  const now=()=>epoch+clock;
  const projectiles=[];
  const effects=[];
  const unitBots=new Map();
  const view=new THREE.PerspectiveCamera(60,1,.1,2000), focus=new THREE.Vector3();
  const ray=new THREE.Raycaster(), cursor=new THREE.Vector2();
  const heldKeys=new Set();
  const previewGeometry=new THREE.RingGeometry(.65,.85,24);previewGeometry.rotateX(-Math.PI/2);
  const ghost=new THREE.InstancedMesh(previewGeometry,new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide,depthWrite:false}),100);
  ghost.instanceMatrix.setUsage(THREE.DynamicDrawUsage);ghost.frustumCulled=false;ghost.visible=false;
  let host,distance=55,azimuth=.3,elevation=.85,drag=null,lastStats='',lastStatus='',previewId='',previewAt=0;
  const hiddenUI=new Map();let oldTouchAction='',oldFog=null,oldCamera=null,oldShadows=true;
  const weaponById=new Map([...WEAPONS,...MELEE_ITEMS].map(w=>[w.id,w]));
  const meleeById=new Map(MELEE_ITEMS.map(w=>[w.id,w]));
  const utilityById=new Map(SUPPORT_ITEMS.map(w=>[w.id,w]));
  const weapons=()=>[...WEAPONS.filter(w=>!w.archived&&!w.skinOnly&&!w.playerOnly&&(w.adminItem||(!w.modeOnly&&!w.ddayOnly))&&w.damage>0),...MELEE_ITEMS.filter(w=>!w.archived)];
  const weapon=id=>{const w=weaponById.get(id);return w&&!w.archived&&!w.skinOnly&&(meleeById.has(id)||w.adminItem||(!w.modeOnly&&!w.ddayOnly))?w:null;};
  const melee=id=>meleeById.get(id);
  const utilities=()=>SUPPORT_ITEMS.filter(w=>!w.archived);
  const utility=id=>{const u=utilityById.get(id);return u&&!u.archived?u:null;};
  const maps=()=>[...new Set([...MAP_IDS,...M4_TOWER_MAP_NAMES])].filter(id=>MAP_GROUPS[id]);
  const $=id=>host.querySelector('#'+id);
  function status(message){if(message!==lastStatus){lastStatus=message;$('bs-status').textContent=message;}}
  function save(){try{localStorage.setItem(KEY,JSON.stringify({map:state.map,units:state.units,difficulty:state.difficulty,unitCap:state.unitCap,lowEffects:state.lowEffects,grounded:state.grounded,speed:state.speed,formation:state.formation,spacing:state.spacing,rotation:state.rotation}));}catch(e){}}
  function restore(){
    try{
      const data=JSON.parse(localStorage.getItem(KEY)||'null');if(!data)return;
      if(maps().includes(data.map))state.map=data.map;
      if(['easy','medium','hard','expert'].includes(data.difficulty))state.difficulty=data.difficulty;
      if([40,100,200,300].includes(data.unitCap))state.unitCap=data.unitCap;
      if(typeof data.lowEffects==='boolean')state.lowEffects=data.lowEffects;
      if(typeof data.grounded==='boolean')state.grounded=data.grounded;
      if([.25,.5,1].includes(data.speed))state.speed=data.speed;
      if(['single','line','squad','platoon','company','circle'].includes(data.formation))state.formation=data.formation;
      if(Number.isFinite(data.spacing))state.spacing=THREE.MathUtils.clamp(data.spacing,1.5,6);
      if([0,90,180,270].includes(data.rotation))state.rotation=data.rotation;
      state.units=(Array.isArray(data.units)?data.units:[]).slice(0,LIMIT).filter(u=>u&&weapon(u.weapon)&&['ally','enemy'].includes(u.team)&&[u.x,u.y,u.z,u.hp].every(Number.isFinite)).map(u=>({...u,utility:utility(u.utility)?u.utility:'',id:++state.serial,hp:Math.max(50,Math.min(3000,u.hp))}));
      state.unitCap=[40,100,200,300].find(cap=>cap>=Math.max(state.unitCap,state.units.length))||300;
    }catch(e){}
  }
  function mount(){
    if(host)return;
    host=document.createElement('section');host.id='battle-sim';host.hidden=true;host.setAttribute('aria-label','Battle Simulator');
    host.innerHTML=`<header class="bs-header"><strong>BATTLE SIMULATOR</strong>
      <label>Map <select id="bs-map" aria-label="Map"></select></label>
      <button id="bs-start">Start battle</button><button id="bs-pause" disabled>Pause</button>
      <button id="bs-reset">Edit setup</button><button id="bs-exit">Modes</button>
      <div class="bs-stats"><span id="bs-blue" class="bs-blue"></span><span id="bs-red" class="bs-red"></span></div>
      <div class="bs-performance"><label>Speed <select id="bs-speed"><option value="0.25">1/4x</option><option value="0.5">1/2x</option><option value="1">1x</option></select></label>
      <label><input id="bs-low-effects" type="checkbox" checked>Low Effects</label>
      <label><input id="bs-grounded" type="checkbox">Grounded Units</label></div>
      </header>
      <aside class="bs-editor"><strong id="bs-selection">Deploy fighter</strong>
      <label>Unit limit <select id="bs-limit"><option>40</option><option>100</option><option>200</option><option>300</option></select></label>
      <label>Formation <select id="bs-formation"><option value="single">Single fighter</option><option value="line">Line / 5</option><option value="squad">Squad / 9</option><option value="platoon">Platoon / 25</option><option value="company">Company / 100</option><option value="circle">Circle / 12</option></select></label>
      <div class="bs-deployment-actions"><label>Spacing <input id="bs-spacing" type="number" min="1.5" max="6" step="0.5" value="2.5"></label><button id="bs-rotate" title="Rotate formation" aria-label="Rotate formation">&#8635;</button></div>
      <fieldset><legend>Team</legend><label class="bs-blue"><input type="radio" name="bs-team" value="ally" checked>Blue</label><label class="bs-red"><input type="radio" name="bs-team" value="enemy">Red</label></fieldset>
      <figure><img id="bs-preview" alt="Weapon"></figure>
      <label>Weapon <select id="bs-weapon"></select></label>
      <label>Utility <select id="bs-utility"></select></label>
      <label>Health <input id="bs-hp" type="number" min="50" max="3000" step="50" value="300"></label>
      <label>Bot difficulty <select id="bs-difficulty"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option><option value="expert">Expert</option></select></label>
      <div class="bs-deployment-actions"><button id="bs-deselect">New fighter</button><button id="bs-undo" title="Undo deployment" aria-label="Undo deployment" disabled>&#8630;</button></div><button id="bs-remove" disabled>Remove fighter</button><button id="bs-clear">Clear all</button></aside>
      <div id="bs-status" role="status"></div>
      <nav class="bs-camera" aria-label="Camera"><button data-pan="0,-1" aria-label="Pan forward" style="grid-column:2">&#8593;</button>
      <button data-pan="-1,0" aria-label="Pan left">&#8592;</button><button id="bs-home" aria-label="Frame map">&#8962;</button><button data-pan="1,0" aria-label="Pan right">&#8594;</button>
      <button data-pan="0,1" aria-label="Pan back" style="grid-column:2">&#8595;</button><button id="bs-out" aria-label="Zoom out">&#8722;</button><button id="bs-in" aria-label="Zoom in">+</button></nav>`;
    document.body.appendChild(host);
    for(const id of maps())$('bs-map').add(new Option(mapCardLabel(id),id));
    for(const slot of ['primary','secondary','melee','admin']){
      const group=document.createElement('optgroup');group.label={primary:'Primary',secondary:'Secondary',melee:'Melee',admin:'Admin weapons (sandbox)'}[slot];
      for(const w of weapons().filter(w=>(w.adminItem?'admin':melee(w.id)?'melee':w.slot==='secondary'?'secondary':'primary')===slot))group.appendChild(new Option(w.name,w.id));
      $('bs-weapon').appendChild(group);
    }
    $('bs-utility').add(new Option('None',''));
    for(const u of utilities())$('bs-utility').add(new Option(u.name,u.id));
    $('bs-map').onchange=()=>{state.map=$('bs-map').value;state.units=[];state.selected=null;loadMap();save();};
    $('bs-start').onclick=start;$('bs-reset').onclick=edit;$('bs-exit').onclick=()=>openModeMenu();
    $('bs-pause').onclick=()=>{state.phase=state.phase==='running'?'paused':'running';refresh();};
    $('bs-deselect').onclick=()=>{state.selected=null;refresh();};
    $('bs-remove').onclick=()=>{removeUnits(new Set([state.selected]));state.selected=null;refresh();save();};
    $('bs-clear').onclick=()=>{state.units=[];state.selected=null;deploymentHistory.length=0;rebuild();save();};
    $('bs-undo').onclick=undo;
    $('bs-formation').onchange=()=>{state.formation=$('bs-formation').value;ghost.visible=false;save();};
    $('bs-spacing').onchange=()=>{state.spacing=THREE.MathUtils.clamp(Number($('bs-spacing').value)||2.5,1.5,6);$('bs-spacing').value=state.spacing;ghost.visible=false;save();};
    $('bs-rotate').onclick=()=>{state.rotation=(state.rotation+90)%360;ghost.visible=false;refresh();save();};
    $('bs-weapon').onchange=()=>{state.weapon=$('bs-weapon').value;changeSelected();};
    $('bs-utility').onchange=()=>{state.utility=$('bs-utility').value;changeSelected();};
    $('bs-hp').onchange=()=>{state.hp=Math.max(50,Math.min(3000,Number($('bs-hp').value)||300));changeSelected();};
    host.querySelectorAll('[name=bs-team]').forEach(el=>{el.onchange=()=>{state.team=el.value;changeSelected();};});
    $('bs-difficulty').onchange=()=>{state.difficulty=$('bs-difficulty').value;rebuild();save();};
    $('bs-limit').onchange=()=>{const cap=Number($('bs-limit').value);if(state.units.length>cap){$('bs-limit').value=state.unitCap;status('Deployment exceeds selected limit');return;}state.unitCap=cap;refresh();save();};
    $('bs-speed').onchange=()=>{state.speed=Number($('bs-speed').value);accumulator=0;save();};
    $('bs-low-effects').onchange=()=>{state.lowEffects=$('bs-low-effects').checked;applyPerformance();save();};
    $('bs-grounded').onchange=()=>{state.grounded=$('bs-grounded').checked;if(state.grounded)for(const bot of gameBots)bot._slideUntil=0;save();};
    $('bs-home').onclick=frameMap;$('bs-in').onclick=()=>{distance=Math.max(8,distance*.8);};$('bs-out').onclick=()=>{distance=Math.min(400,distance*1.25);};
    host.querySelectorAll('[data-pan]').forEach(el=>{el.onclick=()=>pan(...el.dataset.pan.split(',').map(Number),distance*.12);});
    renderer.domElement.addEventListener('pointerdown',pointerDown);
    window.addEventListener('pointermove',pointerMove);window.addEventListener('pointerup',pointerUp);
    window.addEventListener('pointercancel',()=>{drag=null;ghost.visible=false;});
    renderer.domElement.addEventListener('contextmenu',e=>{if(state.active)e.preventDefault();});
    renderer.domElement.addEventListener('wheel',e=>{if(!state.active)return;e.preventDefault();distance=THREE.MathUtils.clamp(distance*Math.exp(e.deltaY*.001),8,400);},{passive:false});
    for(const type of ['keydown','keyup'])window.addEventListener(type,e=>{
      if(!state.active)return;
      if(type==='keyup')heldKeys.delete(e.code);
      if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
      e.stopImmediatePropagation();e.preventDefault();
      if(type==='keydown'){heldKeys.add(e.code);if(e.code==='Escape'&&!e.repeat&&['running','paused'].includes(state.phase))$('bs-pause').click();}
    },true);
    window.addEventListener('blur',()=>{heldKeys.clear();drag=null;});
  }
  function changeSelected(){
    const unit=state.units.find(u=>u.id===state.selected);
    if(unit){unit.weapon=state.weapon;unit.utility=state.utility;unit.hp=state.hp;unit.team=state.team;rebuild();}
    refresh();save();
  }
  function clearFighters(){
    planQueue.length=0;navQueue.length=0;planTurn.clear();navTurn.clear();
    for(const shot of projectiles){scene.remove(shot.mesh);shot.mesh.geometry.dispose();shot.mesh.material.dispose();}projectiles.length=0;
    for(const fx of effects){scene.remove(fx.mesh);fx.mesh.geometry.dispose();fx.mesh.material.dispose();}effects.length=0;
    window.PVP_RAGDOLL?.clear();
    for(const bot of gameBots){const mesh=remoteMeshes[bot.id];if(mesh){scene.remove(mesh);disposeBody(mesh);delete remoteMeshes[bot.id];}delete players[bot.id];delete _killInfo[bot.id];}
    gameBots.length=0;unitBots.clear();
    for(const b of localBullets)scene.remove(b.mesh);localBullets.length=0;
  }
  function rebuild(){
    clearFighters();
    for(const unit of state.units)spawnUnit(unit);
    refresh();
  }
  function spawnUnit(unit){
      const w=weapon(unit.weapon);if(!w)return;const isMelee=!!melee(w.id),util=utility(unit.utility);
      const id='sim_'+unit.id, tune=botTuning(state.difficulty),born=now();
      const data={id,name:(unit.team==='ally'?'Blue ':'Red ')+unit.id,isBot:true,ownerId:myId,team:unit.team,weaponId:w.id,skin:'default',x:unit.x,y:unit.y+1.65,z:unit.z,hp:unit.hp,maxHp:unit.hp,dead:false,rotY:unit.team==='ally'?0:Math.PI};
      players[id]=data;spawnRemotePlayer(data);
      const bot={id,team:unit.team,weaponId:w.id,spawnWeaponId:w.id,primaryId:isMelee?null:w.id,secondaryId:null,meleeId:isMelee?w.id:null,utilityId:util?.id||null,
        x:unit.x,y:unit.y,z:unit.z,yVel:0,rotY:data.rotY,hp:unit.hp,maxHp:unit.hp,dead:false,state:'chase',activeSlot:'primary',
        speedMult:1,playstyle:null,charId:null,wanderAngle:0,wanderTimer:0,lastShot:born+Math.random()*500,stuckTimer:0,
        strafeDir:Math.random()<.5?-1:1,strafeFlipTimer:0,tacTimer:0,prevHp:unit.hp,coverPt:null,
        difficulty:state.difficulty,tune,aimSkill:tune.aimMin+Math.random()*tune.aimRand,reactionMs:tune.reactMin+Math.random()*tune.reactRand,
        personality:isMelee?'aggressor':rollPersonality(w.id,state.difficulty),dps:WEAPON_DPS_CACHE[w.id]||150,botAmmo:w.mag||30,botMag:w.mag||30,botReserve:w.reserve||90,reloadUntil:0,
        firstSeenAt:0,lastSeenAt:0,lastSeenPos:null,nextAbilityAt:Infinity,nextUtilityAt:Infinity,utilityUsesLeft:0,frostSlow:100,onLandMine:null,currentTargetId:null,meleeChargeAbandonDist:18,
        hitAndRunUntil:0,hitAndRunTarget:null,nextRunCheck:0,_simUnit:unit.id,_simAbilityAt:1000+Math.random()*500,_simAttackAt:0,_simUtilityAt:1500,_simUtilityUses:util?.uses||1};
      gameBots.push(bot);unitBots.set(id,bot);const mesh=remoteMeshes[id];mesh.userData.simUnit=unit.id;armRemoteMesh(mesh,w.id);syncBotMesh(bot,{visible:true});
      const marker=new THREE.Mesh(new THREE.TorusGeometry(.64,.055,5,28),new THREE.MeshBasicMaterial({color:unit.team==='ally'?0x48b7ff:0xff5269}));
      marker.rotation.x=Math.PI/2;marker.position.y=.08;mesh.add(marker);mesh._simMarker=marker;applyUnitPerformance(mesh);
  }
  function refresh(){
    if(!host)return;host.dataset.phase=state.phase;
    const setup=state.phase==='setup';$('bs-map').disabled=!setup;
    $('bs-start').disabled=!setup||!state.units.some(u=>u.team==='ally')||!state.units.some(u=>u.team==='enemy');
    $('bs-pause').disabled=!['running','paused'].includes(state.phase);$('bs-pause').textContent=state.phase==='paused'?'Resume':'Pause';
    $('bs-remove').disabled=state.selected==null;$('bs-selection').textContent=state.selected==null?'Deploy fighter':'Fighter '+state.selected;
    $('bs-weapon').value=state.weapon;$('bs-utility').value=state.utility;$('bs-hp').value=state.hp;$('bs-difficulty').value=state.difficulty;$('bs-map').value=state.map;
    $('bs-limit').value=state.unitCap;$('bs-speed').value=state.speed;$('bs-low-effects').checked=state.lowEffects;$('bs-grounded').checked=state.grounded;
    $('bs-formation').value=state.formation;$('bs-spacing').value=state.spacing;
    $('bs-rotate').title='Rotate formation / '+state.rotation+' degrees';
    const present=new Set(state.units.map(u=>u.id));$('bs-undo').disabled=!setup||!deploymentHistory.some(batch=>batch.some(id=>present.has(id)));
    host.querySelectorAll('[name=bs-team]').forEach(el=>{el.checked=el.value===state.team;});
    if(previewId!==state.weapon){previewId=state.weapon;$('bs-preview').src=weaponIconURL(state.weapon,false)||'';$('bs-preview').alt=weapon(state.weapon)?.name||'Weapon';}
    for(const b of gameBots){const mesh=remoteMeshes[b.id];if(mesh?._simMarker)mesh._simMarker.scale.setScalar(b._simUnit===state.selected?1.35:1);}
    if(setup)status('Deployment: '+state.units.length+' / '+state.unitCap);
    else if(state.phase==='paused')status('Battle paused');else if(state.phase==='running')status('Battle in progress');
    stats();
  }
  function stats(){
    const blue=gameBots.filter(b=>b.team==='ally'&&!b.dead).length,red=gameBots.filter(b=>b.team==='enemy'&&!b.dead).length;
    const key=blue+':'+red;if(key===lastStats)return;lastStats=key;
    $('bs-blue').textContent='BLUE '+blue;$('bs-red').textContent='RED '+red;
  }
  function applyUnitPerformance(mesh){
    mesh.traverse(o=>{if(!o.isMesh)return;if(o.userData.simShadow===undefined)o.userData.simShadow=o.castShadow;o.castShadow=state.lowEffects?false:o.userData.simShadow;});
  }
  function applyPerformance(){renderer.shadowMap.enabled=state.lowEffects?false:oldShadows;for(const bot of gameBots){const mesh=remoteMeshes[bot.id];if(mesh)applyUnitPerformance(mesh);}}
  function plannedMove(bot,target,dt,time,build){
    if(planTurn.has(bot.id)){
      planTurn.delete(bot.id);bot._simPlanPending=false;const result=build();bot._simPlanAt=clock+180+(bot._simUnit%7)*15;
      bot._simMove=result?{...result,x:result.x/Math.max(.001,dt),z:result.z/Math.max(.001,dt)}:null;
    }
    if(clock>=(bot._simPlanAt||0)&&!bot._simPlanPending){bot._simPlanPending=true;planQueue.push(bot.id);}
    return bot._simMove?{...bot._simMove,x:bot._simMove.x*dt,z:bot._simMove.z*dt}:null;
  }
  function navigationPoint(bot,target,build){
    if(navTurn.has(bot.id)){navTurn.delete(bot.id);bot._simNavPending=false;bot._simNav=build();bot._simNavAt=clock+180+(bot._simUnit%7)*15;}
    if(clock>=(bot._simNavAt||0)&&!bot._simNavPending){bot._simNavPending=true;navQueue.push(bot.id);}
    return bot._simNav;
  }
  function frameMap(){const b=MAP_BOT_BOUNDS[state.map]||getMapBoundsRect();focus.set(0,0,0);distance=Math.max(30,Math.min(125,Math.max(b.halfX,b.halfZ)*.85));elevation=.85;azimuth=.3;updateCamera();}
  function updateCamera(){view.aspect=renderer.domElement.clientWidth/renderer.domElement.clientHeight;view.updateProjectionMatrix();view.position.set(focus.x+Math.sin(azimuth)*Math.cos(elevation)*distance,focus.y+Math.sin(elevation)*distance,focus.z+Math.cos(azimuth)*Math.cos(elevation)*distance);view.lookAt(focus);view.updateMatrixWorld(true);}
  function pan(x,z,amount){focus.x+=(x*Math.cos(azimuth)+z*Math.sin(azimuth))*amount;focus.z+=(-x*Math.sin(azimuth)+z*Math.cos(azimuth))*amount;}
  function loadMap(){deploymentHistory.length=0;activateMap(state.map);scene.fog=null;if(MAP_GROUPS[state.map]._skyColor!=null)scene.background.setHex(MAP_GROUPS[state.map]._skyColor);rebuild();frameMap();}
  function valid(point){
    const b=getMapBoundsRect();if(Math.abs(point.x)>b.halfX-.8||Math.abs(point.z)>b.halfZ-.8)return false;
    if(!floorExistsAt(point.x,point.z)&&point.y<.2)return false;
    if(wallColliders.some(box=>point.x>box.min.x-.4&&point.x<box.max.x+.4&&point.z>box.min.z-.4&&point.z<box.max.z+.4&&box.max.y>point.y+.08&&box.min.y<point.y+1.8))return false;
    return !state.units.some(u=>Math.hypot(u.x-point.x,u.z-point.z)<1.25&&Math.abs(u.y-point.y)<2);
  }
  function place(point,options={}){
    if(state.phase!=='setup'||state.units.length>=state.unitCap||state.units.length>=LIMIT||!weapon(state.weapon)||!valid(point))return false;
    const y=botGroundYAt(point.x,point.z,point.y+.1,.2,.4);
    if(Math.abs(y-point.y)>.5)return false;
    state.units.push({id:++state.serial,team:state.team,weapon:state.weapon,utility:state.utility,hp:state.hp,x:point.x,y,z:point.z});
    state.selected=null;spawnUnit(state.units[state.units.length-1]);
    if(!options.batch)deploymentHistory.push([state.serial]);
    if(!options.defer){refresh();save();}return true;
  }
  function formationPoints(point){
    const offsets=[],size={single:1,line:5,squad:3,platoon:5,company:10,circle:12}[state.formation]||1;
    if(state.formation==='circle')for(let i=0;i<size;i++){const a=i/size*Math.PI*2,r=state.spacing*size/(Math.PI*2);offsets.push([Math.cos(a)*r,Math.sin(a)*r]);}
    else{const rows=['single','line'].includes(state.formation)?1:size;for(let row=0;row<rows;row++)for(let col=0;col<size;col++)offsets.push([(col-(size-1)/2)*state.spacing,(row-(rows-1)/2)*state.spacing]);}
    const angle=state.rotation*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
    return offsets.map(([x,z])=>new THREE.Vector3(point.x+x*c-z*s,point.y,point.z+x*s+z*c));
  }
  function deploy(point){
    if(state.phase!=='setup')return 0;
    const ids=[],points=formationPoints(point);
    for(const candidate of points)if(place(candidate,{batch:true,defer:true}))ids.push(state.serial);
    if(ids.length){deploymentHistory.push(ids);refresh();save();status(ids.length+' deployed'+(ids.length<points.length?' / '+(points.length-ids.length)+' blocked or over limit':''));}
    else status(state.units.length>=state.unitCap?'Fighter limit reached':'Position blocked');
    ghost.visible=false;return ids.length;
  }
  function removeUnits(ids){
    state.units=state.units.filter(u=>!ids.has(u.id));
    for(let i=gameBots.length-1;i>=0;i--){const bot=gameBots[i];if(!ids.has(bot._simUnit))continue;const mesh=remoteMeshes[bot.id];if(mesh){scene.remove(mesh);disposeBody(mesh);delete remoteMeshes[bot.id];}unitBots.delete(bot.id);delete players[bot.id];delete _killInfo[bot.id];gameBots.splice(i,1);}
  }
  function undo(){
    if(state.phase!=='setup')return false;
    while(deploymentHistory.length){const ids=new Set(deploymentHistory.pop());if(!state.units.some(u=>ids.has(u.id)))continue;removeUnits(ids);state.selected=null;ghost.visible=false;refresh();save();return true;}
    refresh();return false;
  }
  function previewFormation(point){
    const points=formationPoints(point),matrix=new THREE.Matrix4(),color=new THREE.Color();let available=state.unitCap-state.units.length;
    ghost.count=points.length;
    for(let i=0;i<points.length;i++){
      const p=points[i],ground=botGroundYAt(p.x,p.z,p.y+.1,.2,.4),ok=available>0&&valid(p)&&Math.abs(ground-p.y)<=.5;
      if(ok)available--;
      matrix.makeTranslation(p.x,ground+.07,p.z);ghost.setMatrixAt(i,matrix);ghost.setColorAt(i,color.setHex(ok?0x77ffad:0xff6677));
    }
    ghost.instanceMatrix.needsUpdate=true;ghost.instanceColor.needsUpdate=true;ghost.visible=true;
  }
  function hitAt(e){
    ray.far=Infinity;
    const rect=renderer.domElement.getBoundingClientRect();cursor.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(cursor,view);
    const units=ray.intersectObjects(gameBots.map(b=>remoteMeshes[b.id]).filter(Boolean),true);
    if(units.length){let object=units[0].object;while(object&&!object.userData.simUnit)object=object.parent;if(object)return {unit:object.userData.simUnit};}
    const hits=ray.intersectObject(MAP_GROUPS[state.map],true);
    for(const hit of hits){if(!hit.face)continue;const normal=hit.face.normal.clone().transformDirection(hit.object.matrixWorld);if(normal.y<.65)continue;return {point:hit.point};}
    return null;
  }
  function pointerDown(e){if(!state.active)return;e.preventDefault();e.stopImmediatePropagation();drag={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,button:e.button,moved:false};renderer.domElement.setPointerCapture?.(e.pointerId);}
  function pointerMove(e){
    if(!state.active)return;
    if(drag){const dx=e.clientX-drag.lastX,dy=e.clientY-drag.lastY;drag.lastX=e.clientX;drag.lastY=e.clientY;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>5)drag.moved=true;if(drag.moved){if(drag.button===2){azimuth-=dx*.008;elevation=THREE.MathUtils.clamp(elevation+dy*.006,.2,1.5);}else pan(-dx,-dy,distance*.0017);}return;}
    if(e.target!==renderer.domElement||state.phase!=='setup'){ghost.visible=false;return;}
    if(performance.now()-previewAt<33)return;previewAt=performance.now();
    const hit=hitAt(e);ghost.visible=!!hit?.point;if(hit?.point)previewFormation(hit.point);
  }
  function pointerUp(e){
    if(!state.active||!drag)return;const old=drag;drag=null;if(old.moved||old.button!==0||state.phase!=='setup')return;
    const hit=hitAt(e);if(hit?.unit){const u=state.units.find(u=>u.id===hit.unit);if(u){state.selected=u.id;state.team=u.team;state.weapon=u.weapon;state.utility=u.utility||'';state.hp=u.hp;refresh();}}
    else if(hit?.point)deploy(hit.point);
  }
  function target(bot){
    if(state.phase!=='running')return null;
    const cached=unitBots.get(bot.currentTargetId);
    if(cached&&!cached.dead&&cached.team!==bot.team&&clock<(bot._simTargetUntil||0))return {x:cached.x,z:cached.z,isPlayer:false,botRef:cached};
    let best=null,distance=Infinity;for(const other of gameBots){if(other.dead||other.team===bot.team)continue;const d=Math.hypot(other.x-bot.x,other.z-bot.z);
      const obscured=d>4&&effects.some(fx=>{if(fx.u.id!=='smoke')return false;const dx=other.x-bot.x,dz=other.z-bot.z,t=THREE.MathUtils.clamp(((fx.point.x-bot.x)*dx+(fx.point.z-bot.z)*dz)/Math.max(.01,d*d),0,1);return Math.hypot(bot.x+dx*t-fx.point.x,bot.z+dz*t-fx.point.z)<fx.radius;});
      if(!obscured&&d<distance){distance=d;best=other;}}
    bot.currentTargetId=best?.id||null;bot._simTargetUntil=clock+180+(bot._simUnit%7)*15;return best?{x:best.x,z:best.z,isPlayer:false,botRef:best}:null;
  }
  function damage(victim,attacker,amount,id){
    if(!victim||victim.dead||victim.team===attacker.team||!(amount>0))return;
    if(clock<(victim._simGuardUntil||0))amount*=.15;
    victim._simHeal=null;
    victim.hp=Math.max(0,victim.hp-amount);
    if(players[victim.id])players[victim.id].hp=victim.hp;
    if(victim.hp<=0){victim.dead=true;victim._simKillingWeapon=id;_killInfo[victim.id]={weapon:id,killer:attacker.id};}
  }
  function shotDamage(bot,item,base){
    let amount=base;
    if(clock<(bot._simBuff?.until||0))amount*=bot._simBuff.damage||1;
    if(bot._simPower){amount=bot._simPower.damage||amount*bot._simPower.mult;bot._simPower=null;}
    return amount;
  }
  function gunShot(bot,enemy,item,id,amount){
    const origin=new THREE.Vector3(bot.x,(bot.y||0)+1.4,bot.z),end=new THREE.Vector3(enemy.x,(enemy.y||0)+1.2,enemy.z);
    spawnLocalBullet(origin,end.sub(origin).normalize(),'sim_'+bot.id+'_'+clock,false,item.bulletSpeed||120,item.bulletColor||0xffbb66,item.bulletSize||.05,id);
    playWeaponSound(item.id,{baseWeapon:item,remote:true,position:origin});damage(enemy,bot,amount,id);
  }
  function area(bot,point,radius,amount,id,knock=0,launch=0,hitSet=null){
    for(const other of gameBots){
      if(other.dead||other.team===bot.team||hitSet?.has(other.id))continue;
      const dx=other.x-point.x,dz=other.z-point.z,d=Math.hypot(dx,dz);
      if(d>radius||Math.abs((other.y||0)-point.y)>3||!hasLineOfSight(point.x,point.z,other.x,other.z))continue;
      hitSet?.add(other.id);damage(other,bot,amount,id);
      other.kbVX=(other.kbVX||0)+dx/Math.max(.1,d)*knock;
      other.kbVZ=(other.kbVZ||0)+dz/Math.max(.1,d)*knock;
      other.yVel=Math.max(other.yVel||0,launch);
    }
  }
  function stepToward(bot,dx,dz,amount){
    if(bot._rootUntil>now())return;
    // Short probes prevent a dash or grapple from tunnelling through map walls.
    const steps=Math.max(1,Math.ceil(amount/.25));
    for(let i=0;i<steps;i++){
      const x=bot.x+dx*amount/steps,z=bot.z+dz*amount/steps,b=getMapBoundsRect();
      if(Math.abs(x)>b.halfX-.5||Math.abs(z)>b.halfZ-.5||wallColliders.some(c=>x>c.min.x-.35&&x<c.max.x+.35&&z>c.min.z-.35&&z<c.max.z+.35&&c.max.y>(bot.y||0)+.15&&c.min.y<(bot.y||0)+1.7))break;
      if(!floorExistsAt(x,z)&&(bot.y||0)<.2)break;
      bot.x=x;bot.z=z;
    }
  }
  function action(bot,item,spec,enemy){
    const dx=enemy.x-bot.x,dz=enemy.z-bot.z,d=Math.hypot(dx,dz)||1;
    const aoe=spec.aoe||spec;
    bot._simAction={start:clock,duration:spec.ms||spec.lock||(spec.dashTime?spec.dashTime*1000:450),delay:spec.delay??100,dx:dx/d,dz:dz/d,
      damage:aoe.damage??item.damage??0,radius:aoe.radius||spec.reach||item.range||2.5,
      knock:aoe.knock||spec.knockback||0,launch:aoe.launch||spec.launchVel||0,
      dash:spec.distance||0,spin:['whirl','spin'].includes(spec.kind)||spec.type==='melee_spinslash',spins:spec.spins||1,hits:new Set(),id:item.id};
    if(bot._simAction.spin)spawnAbilityAOEFX(new THREE.Vector3(bot.x,(bot.y||0)+.6,bot.z),bot._simAction.radius,0xf4fbff);
    if(spec.hop&&!state.grounded)bot.yVel=spec.hop;
    if(!state.lowEffects)playSoundEvent(bot._simAction.spin?'melee_whirlwind':'melee_blade',{volume:.6,minGap:80});
  }
  function zone(bot,u,point){
    const radius=u.burnRadius||u.turretRange||u.swarmRange||u.mineRadius||u.claymoreRadius||(u.id==='smoke'?4:5);
    const smoke=u.id==='smoke';
    const mesh=new THREE.Mesh(smoke?new THREE.SphereGeometry(radius,12,8):new THREE.RingGeometry(radius*.92,radius,40),new THREE.MeshBasicMaterial({color:u.bulletColor||(smoke?0xaab1b8:0x77ccff),side:THREE.DoubleSide,transparent:true,opacity:smoke?.5:.45,depthWrite:false}));
    mesh.position.copy(point);mesh.position.y+=smoke?1.3:.08;if(!smoke)mesh.rotation.x=-Math.PI/2;scene.add(mesh);
    effects.push({bot,u,mesh,point:point.clone(),radius,start:clock,end:clock+(u.burnDur||u.turretDur||u.swarmDur||(u.mineRadius||u.claymoreRadius?60000:6000)),next:clock+500});
  }
  function throwProjectile(bot,u,enemy){
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(u.lightning?.38:.17,10,8),new THREE.MeshPhongMaterial({color:u.bulletColor||0x6b8750,emissive:u.lightning?0x77bbff:0,emissiveIntensity:u.lightning?1:0}));
    const from=new THREE.Vector3(bot.x,(bot.y||0)+1.2,bot.z),to=new THREE.Vector3(enemy.x,enemy.y||0,enemy.z),d=from.distanceTo(to);
    mesh.position.copy(from);scene.add(mesh);
    projectiles.push({mesh,from,to,bot,u,start:clock,duration:u.nukeDelay||(u.skystrike?1600:Math.max(450,d/Math.max(1,u.bulletSpeed||35)*1000)),auraHits:new Set(),targetId:enemy.id});
  }
  function useUtility(bot,enemy){
    const u=utility(bot.utilityId);if(!u||clock<bot._simUtilityAt||(!u.recharge&&bot._simUtilityUses<=0))return;
    if(u.heal){
      if(bot.hp>bot.maxHp-u.heal*.5||bot._simHeal)return;
      bot._simHeal={end:clock+(u.healTime||0),amount:u.heal};
    }else if(u.refill||u.id==='care_package'){
      if(bot.botAmmo>bot.botMag*.6&&bot.hp>bot.maxHp*.75)return;
      bot.botAmmo=bot.botMag;bot.botReserve+=90;bot.reloadUntil=0;
      if(u.id==='care_package')bot.hp=Math.min(bot.maxHp,bot.hp+100);
      spawnAbilityAOEFX(new THREE.Vector3(bot.x,(bot.y||0)+.4,bot.z),1.5,0x77ffbb);
    }else if(u.speedBuff){bot.speedMult=u.speedBuff;bot._simSpeedUntil=clock+(u.buffDur||5000);}
    else if(u.uavDur){bot._simRapidUntil=clock+u.uavDur;}
    else{
      const d=Math.hypot(enemy.x-bot.x,enemy.z-bot.z);
      if(d>(u.range||24)||!hasLineOfSight(bot.x,bot.z,enemy.x,enemy.z))return;
      if(u.airBlast){area(bot,new THREE.Vector3(bot.x,bot.y||0,bot.z),u.range||13,0,u.id,u.pushVel||24,u.launchVel||8);}
      else if(u.grapple){stepToward(bot,(enemy.x-bot.x)/Math.max(.1,d),(enemy.z-bot.z)/Math.max(.1,d),Math.max(0,d-2));}
      else if(u.blink){stepToward(bot,(enemy.x-bot.x)/Math.max(.1,d),(enemy.z-bot.z)/Math.max(.1,d),Math.min(u.blink,Math.max(0,d-2)));}
      else throwProjectile(bot,u,enemy);
    }
    bot._simUtilityUses--;bot._simUtilityAt=clock+Math.max(900,u.cooldown||5000);
  }
  function combat(dt){
    clock+=dt*1000;
    for(let i=effects.length-1;i>=0;i--){
      const fx=effects[i],u=fx.u;
      if(clock>=fx.end){scene.remove(fx.mesh);fx.mesh.geometry.dispose();fx.mesh.material.dispose();effects.splice(i,1);continue;}
      if(clock<fx.next)continue;fx.next=clock+(u.fireRate||500);
      const enemies=gameBots.filter(b=>!b.dead&&b.team!==fx.bot.team&&Math.hypot(b.x-fx.point.x,b.z-fx.point.z)<fx.radius&&hasLineOfSight(fx.point.x,fx.point.z,b.x,b.z));
      if(u.mineRadius||u.claymoreRadius){if(enemies.length){area(fx.bot,fx.point,fx.radius,u.damage,u.id,6,u.launchVel||0);spawnAbilityAOEFX(fx.point,fx.radius,0xff9955);fx.end=clock;}}
      else if(u.turretDur||u.swarmDur){const victim=enemies[0];if(victim){damage(victim,fx.bot,u.damage,u.id);spawnHitParticle(new THREE.Vector3(victim.x,(victim.y||0)+1,victim.z));}}
      else if(u.id!=='smoke'){
        area(fx.bot,fx.point,fx.radius,(u.burnDps||u.damage||0)*.5,u.id);
        for(const victim of enemies){if(u.id==='acid_grenade')victim.frostSlow=now()+800;if(u.blackHole){const d=Math.hypot(victim.x-fx.point.x,victim.z-fx.point.z)||1;stepToward(victim,(fx.point.x-victim.x)/d,(fx.point.z-victim.z)/d,1);}}
      }
    }
    for(let i=projectiles.length-1;i>=0;i--){
      const shot=projectiles[i],t=Math.min(1,(clock-shot.start)/shot.duration);
      const next=shot.from.clone().lerp(shot.to,t);
      if(shot.u.skystrike){
        const apex=shot.from.clone().add(new THREE.Vector3(0,12,0));
        const tracked=gameBots.find(b=>b.id===shot.targetId&&!b.dead);
        if(t>.35&&tracked)shot.to.set(tracked.x,(tracked.y||0)+.5,tracked.z);
        next.copy(t<.35?shot.from.clone().lerp(apex,t/.35):apex.lerp(shot.to,(t-.35)/.65));
      }else if(!shot.u.lightning)next.y+=Math.sin(t*Math.PI)*3;
      if(shot.u.lightning)for(const other of gameBots){
        if(other.dead||other.team===shot.bot.team||shot.auraHits.has(other.id)||new THREE.Vector3(other.x,(other.y||0)+1,other.z).distanceTo(next)>2.5)continue;
        if(!hasLineOfSight(next.x,next.z,other.x,other.z))continue;
        shot.auraHits.add(other.id);damage(other,shot.bot,10,'storm_bloom_aura');other._rootUntil=now()+1000;
      }
      const delta=next.clone().sub(shot.mesh.position),length=delta.length();
      if(length>0){ray.set(shot.mesh.position,delta.normalize());ray.far=length;const hit=ray.intersectObject(MAP_GROUPS[state.map],true)[0];if(hit)next.copy(hit.point);if(hit||t>=1){
        const u=shot.u,r=u.nukeRadius||u.radius||u.stunRadius||u.slowRadius||u.mineRadius||4;
        if(u.burnDur||u.turretDur||u.swarmDur||u.mineRadius||u.claymoreRadius||u.blackHole||u.id==='smoke')zone(shot.bot,u,next);
        else{spawnAbilityAOEFX(next,r,u.bulletColor||0xffaa55);area(shot.bot,next,r,u.damage||0,u.id,u.launchVel?5:0,u.launchVel||0);}
        for(const other of gameBots)if(!other.dead&&other.team!==shot.bot.team&&Math.hypot(other.x-next.x,other.z-next.z)<r){
          if(u.lightning)other._rootUntil=now()+3000;
          else if(u.stunDur||u.empDur)other._stunUntil=now()+(u.stunDur||u.empDur);
          if(u.slowDur)other.frostSlow=now()+u.slowDur;
        }
        scene.remove(shot.mesh);shot.mesh.geometry.dispose();shot.mesh.material.dispose();projectiles.splice(i,1);continue;
      }}
      shot.mesh.position.copy(next);
    }
    for(const bot of gameBots){
      if(bot.dead)continue;
      if(bot._simSpeedUntil&&clock>=bot._simSpeedUntil){bot.speedMult=1;bot._simSpeedUntil=0;}
      if(clock<(bot._simRapidUntil||0))bot.lastShot-=dt*1000;
      if(clock<(bot._simBuff?.until||0))bot.lastShot-=dt*1000*(1/(bot._simBuff.rate||1)-1);
      if(bot._simHeal&&clock>=bot._simHeal.end){bot.hp=Math.min(bot.maxHp,bot.hp+bot._simHeal.amount);bot._simHeal=null;}
      const enemy=target(bot)?.botRef,item=weapon(bot.weaponId);if(!enemy||!item)continue;
      if(bot._stunUntil>now())continue;
      const d=Math.hypot(enemy.x-bot.x,enemy.z-bot.z),isMelee=!!melee(item.id);
      useUtility(bot,enemy);
      if(bot._simHeal)continue;
      if(bot._simVolley&&clock>=bot._simVolley.next){
        const v=bot._simVolley;
        if(bot.botAmmo>0&&hasLineOfSight(bot.x,bot.z,enemy.x,enemy.z)){
          gunShot(bot,enemy,item,v.id,v.damage);bot.botAmmo--;v.left--;v.next=clock+v.delay;
        }else v.left=0;
        if(v.left<=0)bot._simVolley=null;
      }
      const ab=item.ability;
      const abilityRange=isMelee?Math.max(6,(ab?.distance||0)+(ab?.reach||3)):ab?.type==='aoe'&&ab.weaponAbId!=='airburst'?(ab.radius||4):28;
      if(ab&&!bot._simAction&&clock>=bot._simAbilityAt&&d<abilityRange&&hasLineOfSight(bot.x,bot.z,enemy.x,enemy.z)){
        if(ab.heal){if(bot.hp<bot.maxHp){bot.hp=Math.min(bot.maxHp,bot.hp+ab.heal);bot._simAbilityAt=clock+Math.max(1500,ab.cd||5000);}}
        else if(/deflect|parry|shield/.test(ab.type||'')){bot._simGuardUntil=clock+(ab.duration||1000);bot._simAbilityAt=clock+Math.max(1500,ab.cd||5000);}
        else if(isMelee){
          const combo=ab.combo,idx=bot._simComboIndex||0,spec=combo?.[idx]||ab;
          action(bot,item,spec,enemy);
          bot._simComboIndex=combo?(idx+1)%combo.length:0;
          bot._simAbilityAt=clock+(bot._simComboIndex?Math.max(350,spec.lock||500):Math.max(1500,ab.comboCd||ab.cd||5000));
        }else{
          const abilityDamage=ab.weaponAbId?getClientWeaponDamage(ab.weaponAbId):0;
          if(ab.type==='buff')bot._simBuff={until:clock+(ab.duration||3000),rate:ab.rateMult||1,damage:ab.dmgMult||1};
          else if(ab.type==='powershot'||ab.type==='charge')bot._simPower={damage:abilityDamage||0,mult:ab.dmgMult||1};
          else if(/fanfire|multishot|bulletwave/.test(ab.type))bot._simVolley={left:Math.min(bot.botAmmo,ab.count||6),next:clock,delay:ab.delay||70,id:ab.weaponAbId||item.id,damage:abilityDamage||item.damage};
          else if(ab.type==='ball_lightning')throwProjectile(bot,{id:'storm_bloom_ball',damage:100,radius:.9,stunDur:3000,lightning:true,bulletSpeed:6,bulletColor:0x88bbff},enemy);
          else if(ab.type==='javelin_volley')throwProjectile(bot,{id:item.id,damage:item.damage,radius:5,skystrike:true,bulletColor:0xffbb66},enemy);
          else if(ab.type==='cyro_laser'){
            gunShot(bot,enemy,item,'cyroclasm_laser',bot.botAmmo*10);bot.botAmmo=0;bot.reloadFrom=now();bot.reloadUntil=now()+(item.reloadTime||3000);bot.botAmmo=bot.botMag;enemy.frostSlow=now()+3000;
          }else if(ab.type==='hellfire_core'){
            if((bot._simCores||0)<3){bot._simCores=(bot._simCores||0)+1;zone(bot,{id:'molotov',burnDps:12,burnDur:5000,burnRadius:3.2,bulletColor:0xff6633},new THREE.Vector3(enemy.x,enemy.y||0,enemy.z));}
          }else if(ab.damage!=null||ab.radius){
            const point=ab.type==='aoe'&&ab.weaponAbId!=='airburst'?new THREE.Vector3(bot.x,bot.y||0,bot.z):new THREE.Vector3(enemy.x,enemy.y||0,enemy.z);
            area(bot,point,ab.radius||1.2,ab.damage??item.damage,ab.weaponAbId||item.id);spawnAbilityAOEFX(point,ab.radius||1,ab.color||item.bulletColor||0xffcc66);
            if(ab.frostBurst||item.id==='freeze_gun')for(const other of gameBots)if(!other.dead&&other.team!==bot.team&&Math.hypot(other.x-point.x,other.z-point.z)<(ab.radius||4))other._rootUntil=now()+1000;
          }
          bot._simAbilityAt=clock+Math.max(1500,ab.cd||6000);
        }
      }
      const a=bot._simAction;
      if(a){
        const elapsed=clock-a.start;
        if(a.dash)stepToward(bot,a.dx,a.dz,a.dash*dt/(a.duration/1000));
        if(elapsed>=a.delay)area(bot,new THREE.Vector3(bot.x,bot.y||0,bot.z),a.radius,a.damage,a.id,a.knock,a.launch,a.hits);
        if(elapsed>=a.duration)bot._simAction=null;
      }else if(isMelee&&clock>=bot._simAttackAt&&d<=item.range+.35&&Math.abs((bot.y||0)-(enemy.y||0))<2&&hasLineOfSight(bot.x,bot.z,enemy.x,enemy.z)){
        action(bot,item,{damage:item.damage,reach:item.range+.35,ms:Math.min(450,item.cooldown||450),delay:80},enemy);bot._simAttackAt=clock+(item.cooldown||500);
      }
    }
  }
  function poseActions(){
    for(const bot of gameBots){const mesh=remoteMeshes[bot.id];if(!mesh||bot.dead)continue;
      const a=bot._simAction;if(mesh._gun)mesh._gun.rotation.x=0;
      if(!a)continue;
      const t=Math.min(1,(clock-a.start)/a.duration),swing=Math.sin(t*Math.PI);
      if(a.spin)mesh.rotation.y+=t*Math.PI*2*a.spins;
      if(mesh._rig?.armR)mesh._rig.armR.rotation.x-=swing*1.8;
      if(mesh._gun)mesh._gun.rotation.x=-swing*1.2;
    }
  }
  function deaths(){
    for(const bot of gameBots){const p=players[bot.id];if(p){p.hp=bot.hp;p.x=bot.x;p.y=bot.y+1.65;p.z=bot.z;}
      if(bot.dead&&!bot._simDeath){
        if(p)p.dead=true;
        if(!remoteMeshes[bot.id]?._ragdoll)syncBotMesh(bot,{visible:true});
        if(remoteMeshes[bot.id]?._simMarker)remoteMeshes[bot.id]._simMarker.visible=false;
        // Death must be captured before the character pass hides the original body.
        if(window.PVP_RAGDOLL?.death(bot.id,bot._simKillingWeapon,{persistent:true}))bot._simDeath=true;
      }
    }
  }
  function start(){if(!$('bs-start').disabled){clock=0;epoch=Date.now();accumulator=0;lastSound=-Infinity;rebuild();state.phase='running';state.selected=null;ghost.visible=false;match.active=true;match.roundActive=true;match.over=false;
    const box=new THREE.Box3();for(const u of state.units)box.expandByPoint(new THREE.Vector3(u.x,u.y,u.z));
    box.getCenter(focus);focus.y+=1;const span=box.getSize(new THREE.Vector3());distance=THREE.MathUtils.clamp(Math.max(span.x,span.z)*1.5+14,18,180);refresh();}}
  function edit(){state.phase='setup';state.selected=null;match.active=false;match.roundActive=false;match.over=false;rebuild();}
  function open(){
    teardownMatchWorld();mount();restore();state.active=true;state.phase='setup';state.selected=null;lastStats='';lastStatus='';
    GAME_MODE_CONFIGS.battle_simulator=GAME_MODE_CONFIGS.battle_simulator||{type:'simulator',allies:0,enemies:0};selectedModeConfig=GAME_MODE_CONFIGS.battle_simulator;
    gameStarted=true;isDead=false;inLobby=false;shooting=false;reloading=false;isADS=false;
    initMatch();
    hiddenUI.clear();
    for(const id of ['mode-screen','hud','crosshair','mobile-controls','death-screen','loadout-screen','match-hud']){const el=document.getElementById(id);if(el){if(['hud','crosshair','mobile-controls'].includes(id))hiddenUI.set(el,el.style.display);el.style.display='none';}}
    oldTouchAction=renderer.domElement.style.touchAction;renderer.domElement.style.touchAction='none';
    weaponModels.forEach(m=>m.visible=false);meleeModels.forEach(m=>m.visible=false);supportModels.forEach(m=>m.visible=false);
    document.exitPointerLock?.();oldCamera={position:camera.position.clone(),rotation:camera.quaternion.clone()};camera.position.set(0,2000,0);host.hidden=false;scene.add(ghost);oldFog=scene.fog;oldShadows=renderer.shadowMap.enabled;loadMap();applyPerformance();scene.fog=null;startLoop();
  }
  function stop(){if(!state.active)return;state.active=false;host.hidden=true;ghost.visible=false;scene.remove(ghost);drag=null;heldKeys.clear();clearFighters();scene.fog=oldFog;renderer.shadowMap.enabled=oldShadows;if(oldCamera){camera.position.copy(oldCamera.position);camera.quaternion.copy(oldCamera.rotation);}for(const [el,value]of hiddenUI)el.style.display=value;hiddenUI.clear();renderer.domElement.style.touchAction=oldTouchAction;}
  function frame(dt){
    if(!state.active)return;
    const speed=distance*dt*.6;pan((heldKeys.has('KeyD')?1:0)-(heldKeys.has('KeyA')?1:0),(heldKeys.has('KeyS')?1:0)-(heldKeys.has('KeyW')?1:0),speed);updateCamera();
    if(state.phase==='running'||state.phase==='finished')accumulator+=Math.min(.1,dt)*state.speed;
    let steps=0;
    while(accumulator+1e-8>=STEP&&steps++<3){
      accumulator=Math.max(0,accumulator-STEP);
      // FIFO queues give every fighter a planning turn, not only the first squad.
      planTurn=new Set([...planTurn,...planQueue.splice(0,12)]);navTurn=new Set([...navTurn,...navQueue.splice(0,24)]);
      if(state.phase==='running'){
      updateBotAI(STEP,{now:now()+STEP*1000});combat(STEP);updateBullets(STEP);deaths();animateCharacters(STEP);poseActions();window.PVP_RAGDOLL?.tick(STEP);
      stats();const blue=gameBots.some(b=>b.team==='ally'&&!b.dead),red=gameBots.some(b=>b.team==='enemy'&&!b.dead);
      if(!blue||!red){state.phase='finished';match.roundActive=false;match.over=true;refresh();status(blue?'Blue victory':red?'Red victory':'Draw');}
      }else if(state.phase==='finished'){clock+=STEP*1000;deaths();window.PVP_RAGDOLL?.tick(STEP);}
    }
    for(const [id,mesh]of Object.entries(remoteMeshes))if(!id.startsWith('sim_'))mesh.visible=false;
    renderer.render(scene,view);
  }
  window.PVP_BATTLE_SIM={open,stop,frame,target,place,deploy,undo,formationPoints,start,edit,damage,shotDamage,plannedMove,navigationPoint,allowSound:()=>{if(clock-lastSound<80)return false;lastSound=clock;return true;},canFire:bot=>!bot._simHeal&&!bot._simVolley&&!(bot._stunUntil>now()),get now(){return now();},get time(){return clock;},get lowEffects(){return state.active&&state.lowEffects;},get grounded(){return state.active&&state.grounded;},get active(){return state.active;},get state(){return state;},get camera(){return view;}};
})();
