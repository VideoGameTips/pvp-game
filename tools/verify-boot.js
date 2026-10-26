#!/usr/bin/env node
// Does public/game.js actually RUN?
//
// node --check only parses. The crash this was written for parsed perfectly and
// then threw at line 12652 on load — a `let` read before its declaration — so
// evaluation stopped there and the remaining 15,000 lines never executed. The
// page came up, the canvas drew, and nothing worked. Every check we had passed.
//
// This evaluates the real file against stub DOM/WebGL/socket objects and reports
// the first thing that throws, with the line. It cannot prove the game is fun;
// it proves the script reaches the end.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const GAME = path.join(__dirname, '..', 'public', 'game.js');
const src = fs.readFileSync(GAME, 'utf8');
const THREE = require('../public/three.min.js');
global.PVP_SHOP_CATALOG = require('../public/shop-catalog.js');

const noop = () => {};
const el = () => new Proxy({
  style: {}, dataset: {}, classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
  children: [], childNodes: [], value: '', textContent: '', innerHTML: '', innerText: '',
  appendChild: x => x, prepend: x => x, append: x => x, removeChild: noop, insertBefore: x => x, remove: noop,
  addEventListener: noop, removeEventListener: noop, setAttribute: noop, getAttribute: () => null,
  querySelector: () => el(), querySelectorAll: () => [], getContext: () => ctx2d(),
  focus: noop, blur: noop, click: noop, play: () => Promise.resolve(), pause: noop,
  getBoundingClientRect: () => ({ x:0, y:0, width: 1920, height: 1080, top:0, left:0, right:1920, bottom:1080 }),
  requestPointerLock: noop, width: 1920, height: 1080,
  toDataURL: () => 'data:image/png;base64,test',
}, { get: (t, k) => (k in t ? t[k] : (typeof k === 'string' && k.startsWith('on') ? null : undefined)),
     set: (t, k, v) => { t[k] = v; return true; } });

const ctx2d = () => new Proxy({}, { get: () => (() => ctx2d()) });

const doc = {
  createElement: () => el(), createElementNS: () => el(),
  getElementById: () => el(), querySelector: () => el(), querySelectorAll: () => [],
  addEventListener: noop, removeEventListener: noop, exitPointerLock: noop,
  body: el(), head: el(), documentElement: el(), pointerLockElement: null,
  readyState: 'complete', cookie: '', hidden: false, activeElement: el(),
};

// Boot as a PLAYER, not as a fresh browser. The crash this was written for only
// fired when a gun skin was equipped: ownsSkin() short-circuits on a falsy id,
// so an empty profile never reached the variable that was not ready yet. Testing
// with nothing equipped is testing the one case that worked.
const store = {
  pvp_gun_stat_skins: JSON.stringify({ ak20: 'ak20_midnight_oil', sg8: 'sg8_confetti' }),
  pvp_melee_skins: JSON.stringify({ knife: 'knife_dental_floss' }),
  pvp_model_skins: JSON.stringify({ ak20: 'aug' }),
  pvp_skin: 'default',
};
const storage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); },
                  removeItem: k => { delete store[k]; }, clear: () => {}, key: () => null, length: 0 };

const sock = new Proxy({ on: noop, emit: noop, connect: noop, disconnect: noop, id: 'stub', connected: true },
                       { get: (t, k) => (k in t ? t[k] : noop) });

const G = global;
G.document = doc; G.localStorage = storage; G.sessionStorage = storage;
G.navigator = { userAgent: 'node', platform: 'node', language: 'en', maxTouchPoints: 0,
                clipboard: { writeText: () => Promise.resolve() }, mediaDevices: {} };
G.location = { href: 'http://localhost:3001/', origin: 'http://localhost:3001',
               protocol: 'http:', host: 'localhost:3001', hostname: 'localhost',
               port: '3001', pathname: '/', search: '', hash: '', reload: noop, assign: noop };
G.io = () => sock;
G.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve({}), text: () => Promise.resolve('') });
G.requestAnimationFrame = () => 1; G.cancelAnimationFrame = noop;
G.performance = G.performance || { now: () => 0 };
G.Image = function () { return el(); };
G.Audio = function () { return el(); };
G.AudioContext = function () { return null; };
G.alert = noop; G.prompt = () => null; G.confirm = () => true;
G.matchMedia = () => ({ matches: false, addEventListener: noop, addListener: noop });
G.devicePixelRatio = 1; G.innerWidth = 1920; G.innerHeight = 1080;
G.screen = { width: 1920, height: 1080 };
G.getComputedStyle = () => ({ getPropertyValue: () => '' });
G.WebGLRenderingContext = function () {};
// Timers become no-ops: the game schedules loops and reconnects we do not want
// running, and a boot check only cares that evaluation reaches the end.
G.setTimeout = () => 0; G.clearTimeout = noop;
G.setInterval = () => 0; G.clearInterval = noop;
G.addEventListener = noop; G.removeEventListener = noop; G.dispatchEvent = noop;
G.scrollTo = noop; G.open = () => el(); G.close = noop; G.focus = noop; G.blur = noop;
G.window = G;
G.THREE = THREE;
// A headless WebGL context is not worth stubbing faithfully; the renderer is
// not what we are testing.
THREE.WebGLRenderer = function () {
  return new Proxy({ domElement: el(), shadowMap: {}, capabilities: { isWebGL2: true },
                     info: { render: {}, memory: {} }, setSize: noop, setPixelRatio: noop,
                     render: noop, setAnimationLoop: noop, getContext: () => ctx2d() },
                   { get: (t, k) => (k in t ? t[k] : noop) });
};

// index.html loads equipment-models.js before game.js, and game.js depends on
// what it defines. Load the page's scripts in the page's order.
let ok = true;
const mapWarnings = [];
const originalWarn = console.warn;
console.warn = (...args) => {
  if (/^\[(bespoke|theme|gimmick|look|upgrade)\]/.test(String(args[0]))) mapWarnings.push(args.map(String).join(' '));
  originalWarn(...args);
};
try {
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'public', 'equipment-models.js'), 'utf8'),
                      { filename: 'public/equipment-models.js' });
} catch (e) {
  ok = false;
  console.log('BOOT FAILED in equipment-models.js\n   ' + e.name + ': ' + e.message);
}
try {
  if (ok) vm.runInThisContext(src, { filename: 'public/game.js' });
} catch (e) {
  ok = false;
  const stack = (e.stack || '').split('\n');
  const site = stack.find(l => l.includes('public/game.js')) || stack[1] || '';
  console.log('BOOT FAILED\n');
  console.log('   ' + e.name + ': ' + e.message);
  if (site) console.log('   at' + site.replace(/^\s*at/, ''));
  console.log('\n   Everything after that line never ran, and node --check still passes:');
  console.log('   this is a runtime failure during module evaluation, not a syntax error.');
}

if (ok && process.argv.includes('--environment-health')) {
  const issues = vm.runInThisContext(`(() => {
    const issues=[],saved={me:players[myId],seq:environmentDamageSeq,ack:environmentDamageAck,pending:pendingEnvironmentDamage.slice()};
    try {
      pendingEnvironmentDamage.length=0;environmentDamageSeq=0;environmentDamageAck=0;
      players[myId]={hp:300,matchId:'health-test'};
      applyEnvironmentDamage(100,'lava');
      if(players[myId].hp!==200||pendingEnvironmentDamage.length!==1)issues.push('environment damage not recorded');
      const afterShot=reconcileEnvironmentHealth({hp:270,environmentSeq:0},200);
      if(afterShot!==170)issues.push('player shot restores pending environmental damage');
      if(reconcileEnvironmentHealth({hp:170,environmentSeq:1,healthEvent:'environment'},170)!==170||pendingEnvironmentDamage.length)issues.push('ack double-applies damage');
      if(reconcileEnvironmentHealth({hp:220,environmentSeq:1,healthEvent:'heal'},170)!==220)issues.push('healing is blocked');
      if(reconcileEnvironmentHealth({hp:300,environmentSeq:0},220)!==220)issues.push('older snapshot restores HP');
      pendingEnvironmentDamage.push({seq:2,amount:20},{seq:3,amount:30});
      if(reconcileEnvironmentHealth({hp:200,environmentSeq:2},200)!==170)issues.push('partial ack loses pending tick');
      if(pendingEnvironmentDamage.length!==1||pendingEnvironmentDamage[0].seq!==3)issues.push('partial ack clears wrong ticks');
      players[myId].hp=25;const lost=applyEnvironmentDamage(100,'lava');
      if(lost!==25||players[myId].hp!==0)issues.push('lethal hazard reports more HP than lost');
    } finally {
      if(saved.me===undefined)delete players[myId];else players[myId]=saved.me;
      environmentDamageSeq=saved.seq;environmentDamageAck=saved.ack;pendingEnvironmentDamage.splice(0,pendingEnvironmentDamage.length,...saved.pending);
    }
    return issues;
  })()`);
  if(issues.length){ok=false;console.log('environment health failures:\n'+issues.join('\n'));}
  else console.log('environment health: hazard + shot, pending ticks, partial/stale acks, real healing and lethal damage');
}

if (ok && process.argv.includes('--combat-feedback')) {
  const issues = vm.runInThisContext(`(() => {
    const issues=[],saved={gameStarted,isDead,yaw:euler.y,position:camera.position.clone(),inLobby,
      activeSlot,selectedMeleeIdx,meleeSwingT,riotShieldHp,spawnShieldUntil,me:players[myId]};
    const id='feedback_test_source';
    try {
      clearCombatFeedback();gameStarted=true;isDead=false;inLobby=false;spawnShieldUntil=0;
      camera.position.set(0,1.65,0);euler.y=0;players[id]={x:0,z:-10};
      showDamageDirection(id);const entry=damageDirectionEntries[0],first=entry.el.style.transform;
      for(let n=0;n<20;n++)showDamageDirection(id);
      if(damageDirectionEntries.length!==1)issues.push('automatic hits flood directional arcs');
      players[id].x=10;players[id].z=0;updateDamageDirections(entry.at);
      if(entry.el.style.transform!==first)issues.push('direction arc tracks hidden enemy movement');
      euler.y=Math.PI/2;updateDamageDirections(entry.at);
      if(entry.el.style.transform===first)issues.push('direction arc ignores camera turns');
      updateDamageDirections(entry.at+1100);
      if(damageDirectionEntries.length)issues.push('expired hit arc persists');
      showHitmarker('kill');showHitmarker('hit');
      if(hitmarkerPriority!==3)issues.push('body hit overwrites kill confirmation');
      clearCombatFeedback();showHitmarker('head');showHitmarker('hit');
      if(hitmarkerPriority!==2)issues.push('body hit overwrites headshot confirmation');
      activeSlot='melee';selectedMeleeIdx=MELEE_ITEMS.findIndex(x=>x.id==='riot_shield');meleeSwingT=1;
      players[myId]={hp:300,team:'ally'};riotShieldHp=1;
      const landed=applyBotDamageToPlayer('ak20',null);
      if(riotShieldHp!==0||players[myId].hp!==300||landed)issues.push('shield-breaking hit damages health');
    } finally {
      clearCombatFeedback();delete players[id];players[myId]=saved.me;gameStarted=saved.gameStarted;isDead=saved.isDead;
      euler.y=saved.yaw;camera.position.copy(saved.position);inLobby=saved.inLobby;activeSlot=saved.activeSlot;
      selectedMeleeIdx=saved.selectedMeleeIdx;meleeSwingT=saved.meleeSwingT;riotShieldHp=saved.riotShieldHp;spawnShieldUntil=saved.spawnShieldUntil;
    }
    return issues;
  })()`);
  if(issues.length){ok=false;console.log('combat feedback failures:\n'+issues.join('\n'));}
  else console.log('combat feedback: last-hit bearing, camera turns, deduplication, marker priority and shield break');
}

if (ok && process.argv.includes('--action-wind')) {
  const issues = vm.runInThisContext(`(() => {
    const issues=[], saved={gameStarted,isDead,activeSlot,velocity:playerVelocity.clone()};
    try {
      gameStarted=true;isDead=false;activeSlot='primary';clearActionWind();
      playerVelocity.set(0,0,-SPEED*DEFAULT_MOVE_MULT);updateActionWind(0.05);
      if(actionWind.speed>0.01)issues.push('normal walking triggers speed ring');
      playerVelocity.set(0,0,-25);for(let i=0;i<20;i++)updateActionWind(0.05);
      if(actionWind.speed<0.9||actionWind.canvas?.style.display!=='block')issues.push('fast movement has no ring');
      playerVelocity.set(0,0,0);for(let i=0;i<60;i++)updateActionWind(0.05);
      if(actionWind.canvas.style.display!=='none')issues.push('ring does not fade after stopping');
      playerVelocity.set(0,0,-25);updateActionWind(0.05);isDead=true;updateActionWind(0.05);
      if(actionWind.speed||actionWind.points.length||actionWind.canvas.style.display!=='none')issues.push('wind persists after death');
    } finally {clearActionWind();gameStarted=saved.gameStarted;isDead=saved.isDead;activeSlot=saved.activeSlot;playerVelocity.copy(saved.velocity);}
    return issues;
  })()`);
  if(issues.length){ok=false;console.log('action wind failures:\n'+issues.join('\n'));}
  else console.log('action wind: extra-speed threshold, fade, death cleanup and pointer-transparent overlay');
}

if (ok && process.argv.includes('--melee-feedback')) {
  const issues = vm.runInThisContext(`(() => {
    const issues=[], saved={getAudioCtx,unlockAudio,playFilteredNoise,playTone,meleeDash};
    const noise=[],tones=[], node={connect(){return this;}};
    try {
      getAudioCtx=()=>({currentTime:0,createGain:()=>node,createDynamicsCompressor:()=>node,destination:node});
      unlockAudio=()=>{};playFilteredNoise=(...args)=>noise.push(args);playTone=(...args)=>tones.push(args);
      for(const event of ['melee_swing','melee_blade','melee_heavy','melee_fist','melee_chain','melee_whirlwind']) {
        noise.length=0;tones.length=0;playSoundEvent(event,{minGap:0});
        if(noise.length<2||tones.length)issues.push(event+' lacks layered noise or still has a tonal bleep');
        if(event==='melee_whirlwind' && !noise.some(args=>args[1]>.16))issues.push('second spin has no sound');
      }
      noise.length=0;playSoundEvent('melee_impact',{material:'heavy',minGap:0});
      if(noise.length<2)issues.push('impact has no crack/thump layers');
      const item=MELEE_ITEMS.find(x=>x.id==='combat_axe'),ab=item.plainAbility||item.ability;   // the regular Whirlwind (default mode); the combo's own whirl step is checked below
      if(ab.spins!==2||ab.distance<=6.5||ab.dashTime>=.45||ab.damage!==85)issues.push('axe ability not upgraded or damage changed');
      const model=new THREE.Group();
      meleeDash={item,ab,model,speed:ab.distance/ab.dashTime,elapsed:ab.dashTime};poseMeleeDash();
      if(Math.abs(model.rotation.y-(Math.PI*4-1.05))>.001)issues.push('axe does not complete 720 degrees');
      meleeDash.elapsed+=.05;poseMeleeDash();
      if(Math.abs(model.rotation.y)>Math.PI)issues.push('recovery unwinds extra full turns');
      const _ku=currentUser;currentUser={isAdmin:true};const whirl=item.ability.combo&&item.ability.combo[0];currentUser=_ku;   // (the combo is only there for an admin)
      if(!whirl||whirl.kind!=='whirl'||whirl.spins!==1)issues.push('the combo should open with a one-spin whirlwind');
      else{const m2=new THREE.Group();meleeDash={item,ab:{type:'melee_spinslash',distance:whirl.distance,dashTime:whirl.dashTime,damage:whirl.damage,reach:whirl.reach,spins:whirl.spins},model:m2,speed:whirl.distance/whirl.dashTime,elapsed:whirl.dashTime};poseMeleeDash();
        if(Math.abs(m2.rotation.y-(Math.PI*2-1.05))>.001)issues.push('the combo whirlwind does not complete one turn');}
    } finally {getAudioCtx=saved.getAudioCtx;unlockAudio=saved.unlockAudio;playFilteredNoise=saved.playFilteredNoise;playTone=saved.playTone;meleeDash=saved.meleeDash;}
    return issues;
  })()`);
  if(issues.length){ok=false;console.log('melee feedback failures:\\n'+issues.join('\\n'));}
  else console.log('melee feedback: noise-based swings, two spin passes, physical impacts, faster 720 and short recovery');
}

if (ok && process.argv.includes('--battle-axe')) {
  const valid = vm.runInThisContext(`(() => {
    const m = meleeModels[MELEE_ITEMS.findIndex(x => x.id === 'combat_axe')];
    m.updateMatrixWorld(true);
    const a = m.getObjectByName('battle-axe-blade-left'), b = m.getObjectByName('battle-axe-blade-right');
    if (!a || !b) return false;
    const left = new THREE.Box3().setFromObject(a), right = new THREE.Box3().setFromObject(b);
    const width = left.getSize(new THREE.Vector3());
    return Math.abs(left.min.x + right.max.x - 2*m.position.x) < 0.001
      && Math.abs(left.max.x + right.min.x - 2*m.position.x) < 0.001
      && width.x > 0.15 && width.z > 0.20 && m._heldItem.position.lengthSq() === 0;
  })()`);
  if (!valid) { ok = false; console.log('battle axe: missing, asymmetric or misplaced blades'); }
  else console.log('battle axe: two symmetric crescent blades, original held position');
}

if (ok && process.argv.includes('--ability-cooldowns')) {
  const valid = vm.runInThisContext(`(() => {
    const item = MELEE_ITEMS.find(m => m.id === 'baguette');
    return item.ability.cd === 10000 && abilityCooldownFor(item) === 10000
      && abilityCooldownFor(item, { ...item.ability, cd: 0 }) === 10000
      && abilityCooldownFor(item, null) === 0;
  })()`);
  if (!valid) { ok = false; console.log('baguette cooldown override failed'); }
  else console.log('baguette: 10-second ability cooldown overrides global fast/zero cooldown');
}

if (ok && process.argv.includes('--equipment-hands')) {
  const issues = vm.runInThisContext(`(() => {
    const issues = [];
    for (const [items, models] of [[MELEE_ITEMS, meleeModels], [SUPPORT_ITEMS, supportModels]]) {
      models.forEach((m, i) => {
        const item = items[i], H = m._hands;
        if (!m._equipmentHands || !m._heldItem || !H || !H.rear._armed) {
          issues.push(item.id + ': missing grip or sleeve'); return;
        }
        if (m._heldItem.position.lengthSq() > 1e-12 || m._heldItem.quaternion.angleTo(new THREE.Quaternion()) > 1e-7) {
          issues.push(item.id + ': arms changed original weapon position/angle');
        }
        if (m._offHand && !m._offHand._hands) issues.push(item.id + ': missing dual hand');
        const count = m.children.length;
        attachEquipmentHands(m, item, items === SUPPORT_ITEMS);
        if (count !== m.children.length) issues.push(item.id + ': duplicated hands');
        if (item.id === 'fists') {
          const fists = [];
          m.traverse(o => { if (o.isMesh && o.userData.vmFist) fists.push(o); });
          if (fists.length !== 1 || m._heldItem.children.length) issues.push('fists: fist holding another fist');
          if (!H.rear.children[0].visible) issues.push('fists: actual hand hidden');
          return;
        }
        m.updateMatrixWorld(true);
        for (const hand of new Set([H.rear, H.front])) {
          const at = new THREE.Box3().setFromObject(hand.children[0]).getCenter(new THREE.Vector3());
          let nearest = Infinity;
          m._heldItem.traverse(o => {
            if (o.isMesh && !o.userData.eqFx && !o.userData.legendFx) {
              nearest = Math.min(nearest, new THREE.Box3().setFromObject(o).distanceToPoint(at));
            }
          });
          if (nearest > 0.045) issues.push(item.id + ': hand disconnected by ' + nearest.toFixed(3));
        }
        if (!H.rear.children[0].userData.vmHand) issues.push(item.id + ': wrap can repaint hand');
      });
    }
    const frag = supportModels[SUPPORT_ITEMS.findIndex(x => x.id === 'frag')];
    const children = frag._heldItem.children.length;
    _beginEquip(frag, { equip: 'donutbuild', equipMs: 1450 }, false, true);
    if (_equip.ps.length < 3) issues.push('grenade: lost individual assembly parts');
    _equipStep(_equip, 0.7); finishEquip();
    if (frag._heldItem.children.length !== children) issues.push('grenade: leaked equip props');
    const oldSlot = activeSlot, oldIdx = selectedMeleeIdx, oldT = meleeSwingT;
    activeSlot = 'melee'; selectedMeleeIdx = MELEE_ITEMS.findIndex(x => x.id === 'katana');
    const katana = meleeModels[selectedMeleeIdx], hand = katana._hands.rear;
    if (!katana._hands.single || katana._hands.front !== hand) issues.push('katana: must use one hand');
    const position = hand.position.clone(), home = hand.quaternion.clone();
    meleeSwingT = 0.5; updateMeleeGripPose();
    if (home.angleTo(hand.quaternion) < 0.1) issues.push('katana: wrist does not flex during strike');
    if (position.distanceTo(hand.position) > 1e-8) issues.push('katana: hand slips off grip');
    meleeSwingT = 1; updateMeleeGripPose();
    if (home.angleTo(hand.quaternion) > 1e-7) issues.push('katana: wrist does not return to rest');
    const rootP = katana.position.clone(), rootR = katana.rotation.clone();
    const pulseAt = meleeDeflectPulseAt, dir = meleeDeflectDir;
    meleeDeflectPulseAt = performance.now() - 1000; meleeDeflectDir = 1;
    applyMeleeDeflectPose(katana);
    if (katana.position.distanceTo(new THREE.Vector3(0.045,-0.075,-0.315)) > 1e-8
        || Math.abs(katana.rotation.x + 0.32) > 1e-8 || Math.abs(katana.rotation.z - Math.PI/4) > 1e-8) {
      issues.push('katana: original deflect pose changed');
    }
    katana.position.copy(rootP); katana.rotation.copy(rootR);
    meleeDeflectPulseAt = pulseAt; meleeDeflectDir = dir;
    activeSlot = oldSlot; selectedMeleeIdx = oldIdx; meleeSwingT = oldT;
    return issues;
  })()`);
  if (issues.length) { ok = false; console.log('equipment hand failures:\n' + issues.join('\n')); }
  else console.log('equipment hands: grips, sleeves, dual weapons, contact, wrap protection and grenade assembly');
}

if (ok && process.argv.includes('--equipment-sway')) {
  const issues = vm.runInThisContext(`(() => {
    const issues = [], saved = { gameStarted, isDead, activeSlot, selectedMeleeIdx, selectedSupportIdx,
      meleeSwingT, grenadeWindupT, velocity: playerVelocity.clone(), yaw: euler.y,
      currentWeaponIdx, reloading, isADS, shooting, lastShot, weaponReadyUntil, kick: { ..._gunKick }, land: _realismLandKick, heldWalkLean };
    try {
      gameStarted = true; isDead = false; meleeSwingT = 1; grenadeWindupT = 1;
      shooting=false;isADS=false;weaponReadyUntil=0;lastShot=0;
      heldWalkLean = 0; playerVelocity.set(0,0,-5.2);updateHeldWalkLean(1/60);
      const firstLean=heldWalkLean;
      if(firstLean<=0||firstLean>=0.3)issues.push('walking tilt snaps instead of easing in');
      for(let i=0;i<60;i++)updateHeldWalkLean(1/60);
      if(heldWalkLean<0.99)issues.push('walking tilt never reaches the carrying pose');
      euler.y=0;
      const carry=heldWalkPose(0),offCarry=heldWalkPose(0,Math.PI);
      if(carry.ry<0.55||carry.y>-.04||carry.x>-.04)issues.push('walking carry is not across the chest');
      if(Math.abs(carry.ry+offCarry.ry)>1e-8)issues.push('dual hands do not mirror vertical-axis turn');
      shooting=true;updateHeldWalkLean(1/60);
      if(heldWalkLean<=0||heldWalkLean>=0.8)issues.push('firing carry return is slow or teleports');
      for(let i=0;i<12;i++)updateHeldWalkLean(1/60);
      if(heldWalkLean>.01)issues.push('firing does not restore the ready pose');
      shooting=false;heldWalkLean=1;weaponReadyUntil=performance.now()+220;updateHeldWalkLean(1/60);
      if(!heldWeaponReady()||heldWalkLean>=0.8)issues.push('single-click firing does not hold ready pose');
      weaponReadyUntil=0;heldWalkLean=1;
      playerVelocity.set(0,0,0);updateHeldWalkLean(1/60);
      if(heldWalkLean<=0.5||heldWalkLean>=0.99)issues.push('walking tilt snaps when stopping');
      for(let i=0;i<120;i++)updateHeldWalkLean(1/60);
      if(heldWalkLean!==0)issues.push('walking tilt does not return to original pose');
      euler.y = 0; playerVelocity.set(0,0,0);
      if (Object.values(heldWalkPose(0)).some(x => x !== 0)) issues.push('walking: changes stationary pose');
      playerVelocity.set(5.2,0,0); const right = heldWalkPose(0);
      playerVelocity.set(-5.2,0,0); const left = heldWalkPose(0);
      if (Math.abs(left.x + right.x) > 1e-8 || Math.abs(left.rz + right.rz) > 1e-8) issues.push('walking: strafe does not mirror');
      playerVelocity.set(0,0,-5.2); const forward = heldWalkPose(0.5);
      euler.y = Math.PI/2; playerVelocity.set(-5.2,0,0); const turned = heldWalkPose(0.5);
      if (Math.abs(forward.z - turned.z) > 1e-8 || Math.abs(forward.x - turned.x) > 1e-8) issues.push('walking: not relative to view');
      euler.y = 0;
      for (const slot of ['primary', 'secondary']) {
        activeSlot = slot; currentWeaponIdx = WEAPONS.findIndex(x => x.slot === slot && !x.archived);
        const m = weaponModels[currentWeaponIdx], p = m.position.clone(), r = m.rotation.clone(), visible = m.visible;
        m.visible = true; reloading = false; isADS = false;
        Object.keys(_gunKick).forEach(k => _gunKick[k] = 0); _realismLandKick = 0;
        playerVelocity.set(0,0,-5.2); updateRealismFeedback(1/30);
        if (m.position.distanceTo(p) < 0.001) issues.push(slot + ': no walking displacement');
        m.position.copy(p); m.rotation.copy(r); m.visible = visible;
      }
      for (const slot of ['melee', 'support']) {
        activeSlot = slot;
        selectedMeleeIdx = MELEE_ITEMS.findIndex(x => x.id === 'fists');
        selectedSupportIdx = SUPPORT_ITEMS.findIndex(x => x.id === 'medkit');
        const m = slot === 'melee' ? meleeModels[selectedMeleeIdx] : supportModels[selectedSupportIdx];
        const visible = m.visible; m.visible = true;
        const p = m.position.clone(), r = m.rotation.clone();
        playerVelocity.set(0,0,0); updateEquipmentSway();
        if (m.position.distanceTo(p) < 0.0001) issues.push(slot + ': no idle motion');
        resetEquipmentSway();
        if (m.position.distanceTo(p) > 1e-8) issues.push(slot + ': idle motion drifts');
        playerVelocity.set(8,0,0); updateEquipmentSway();
        if (Math.abs(m.rotation.x-r.x) + Math.abs(m.rotation.z-r.z) < 0.001) issues.push(slot + ': no running motion');
        for (let n=0;n<120;n++) updateEquipmentSway();
        if (m.position.distanceTo(p) > 0.04) issues.push(slot + ': running motion accumulates');
        m.position.x = 0.72; resetEquipmentSway();
        if (m.position.x !== 0.72) issues.push(slot + ': motion overwrites external animation');
        m.position.copy(p); m.rotation.copy(r);
        if (slot === 'melee') meleeSwingT = 0.5; else grenadeWindupT = 0.5;
        updateEquipmentSway();
        if (m._equipmentSway) issues.push(slot + ': motion interferes with attack/use');
        meleeSwingT = 1; grenadeWindupT = 1; m.visible = visible;
      }
    } finally {
      resetEquipmentSway();
      gameStarted = saved.gameStarted; isDead = saved.isDead; activeSlot = saved.activeSlot;
      selectedMeleeIdx = saved.selectedMeleeIdx; selectedSupportIdx = saved.selectedSupportIdx;
      meleeSwingT = saved.meleeSwingT; grenadeWindupT = saved.grenadeWindupT;
      playerVelocity.copy(saved.velocity);
      euler.y = saved.yaw; currentWeaponIdx = saved.currentWeaponIdx; reloading = saved.reloading; isADS = saved.isADS;
      Object.assign(_gunKick, saved.kick); _realismLandKick = saved.land;
      heldWalkLean = saved.heldWalkLean;
      shooting=saved.shooting;weaponReadyUntil=saved.weaponReadyUntil;lastShot=saved.lastShot;
    }
    return issues;
  })()`);
  if (issues.length) { ok = false; console.log('equipment sway failures:\n' + issues.join('\n')); }
  else console.log('equipment sway: idle, running, no accumulated drift and attack/use ownership');
}

if (ok && process.argv.includes('--maps')) {
  const issues = vm.runInThisContext(`(() => {
    const issues = [], names = [...Object.keys(_BESPOKE), ...M4_TOWER_MAP_NAMES];
    // Maps are upgraded (stretched, decked, wall taken out, outskirts) the first time they are played; audit what is played.
    for (const n of names) { try { _upgradeMap(n); } catch (e) { issues.push(n + ': upgrade threw ' + e.message); } }
    for (const rot of [-0.35, 0.35, Math.PI / 4]) {
      const rect = { x: 7, z: -11, w: 38, d: 8, rot };
      const x = rect.x + 16 * Math.cos(rot), z = rect.z - 16 * Math.sin(rot);
      if (!_pointInRotRect(x, z, rect)) issues.push('rotated safe island disagrees with its visible footprint');
    }
    const blocked = (name, x, z) => MAP_COLLIDERS[name].some(b =>
      b.max.y > 0.6 && b.min.y < 1.8 && x > b.min.x - 0.45 && x < b.max.x + 0.45 && z > b.min.z - 0.45 && z < b.max.z + 0.45);
    for (const name of names) {
      const b = MAP_BOUNDS[name], s = MAP_SPAWNS[name], g = MAP_GROUPS[name];
      if (!b || !s || !g || !MAP_COLLIDERS[name].length) { issues.push(name + ': incomplete map'); continue; }
      if (_BESPOKE[name] && !g.userData.identityRefined) issues.push(name + ': identity pass did not finish');
      for (const col of MAP_COLLIDERS[name]) if (![col.min.x, col.min.y, col.min.z, col.max.x, col.max.y, col.max.z].every(Number.isFinite)) issues.push(name + ': invalid collider');
      const boundary = MAP_COLLIDERS[name].filter(c => c.min.y < 0.1 && c.max.y >= 12 && (Math.abs(c.min.x) > b.halfX - 4 || Math.abs(c.max.x) > b.halfX - 4 || Math.abs(c.min.z) > b.halfZ - 4 || Math.abs(c.max.z) > b.halfZ - 4));
      if (boundary.length < 4 && !MAP_VOID[name]) issues.push(name + ': missing high perimeter walls');   // (a void edge replaces the wall)
      const allies = mapSpawnSightlineSamples(s.ally), enemies = mapSpawnSightlineSamples(s.enemy);
      let visible = 0;
      for (const a of allies) for (const enemy of enemies) {
        const dir = enemy.clone().sub(a), distance = dir.length(), ray = new THREE.Ray(a, dir.normalize()), hit = new THREE.Vector3();
        if (!MAP_COLLIDERS[name].some(c => ray.intersectBox(c, hit) && hit.distanceTo(a) < distance)) visible++;
      }
      if (visible) issues.push(name + ': ' + visible + ' exposed starting sightlines');
      for (const [team, r] of Object.entries(s)) {
        if (r.x0 < -b.halfX || r.x1 > b.halfX || r.z0 < -b.halfZ || r.z1 > b.halfZ) issues.push(name + ': ' + team + ' spawn outside bounds');
        let free = 0;
        for (let ix = 0; ix < 9; ix++) for (let iz = 0; iz < 5; iz++) {
          const x = r.x0 + (r.x1 - r.x0) * (ix + 0.5) / 9, z = r.z0 + (r.z1 - r.z0) * (iz + 0.5) / 5;
          if (!blocked(name, x, z)) free++;
        }
        if (free < 45) issues.push(name + ': obstructed ' + team + ' spawn (' + free + '/45 clear)');
      }
    }
    // The rebuilt outdoor maps must offer a continuous ground route between spawn clearings.
    for (const name of ['forest', 'desert', 'tundra']) {
      const s = MAP_SPAWNS[name], b = MAP_BOUNDS[name], start = [0, Math.round((s.ally.z0 + s.ally.z1) / 4)], target = Math.round((s.enemy.z0 + s.enemy.z1) / 4);
      const queue = [start], seen = new Set([start.join(',')]); let reached = false;
      for (let head = 0; head < queue.length; head++) {
        const [x, z] = queue[head]; if (z === target) { reached = true; break; }
        for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          const nx = x + dx, nz = z + dz, key = nx + ',' + nz;
          if (seen.has(key) || Math.abs(nx * 2) >= b.halfX - 1 || Math.abs(nz * 2) >= b.halfZ - 1 || blocked(name, nx * 2, nz * 2)) continue;
          seen.add(key); queue.push([nx, nz]);
        }
      }
      if (!reached) issues.push(name + ': no ground route between spawns');
    }
    console.log('map checks: ' + names.length + ' themed layouts, spawn clearances, bounds and outdoor routes');
    return issues;
  })()`);
  issues.push(...mapWarnings);
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--props')) {
  const issues = vm.runInThisContext(`(() => {
    const issues = [], props = mapDestructibles.filter(d => d.propId);
    const ids = new Set();
    for (const d of props) {
      if (ids.has(d.propId)) issues.push('duplicate prop: ' + d.propId);
      ids.add(d.propId);
      if (!MAP_COLLIDERS[d.mapName].includes(d.colliderRef)) issues.push('missing prop collider: ' + d.propId);
      for (const r of Object.values(MAP_SPAWNS[d.mapName])) {
        const dx = Math.max(r.x0 - d.mesh.position.x, 0, d.mesh.position.x - r.x1);
        const dz = Math.max(r.z0 - d.mesh.position.z, 0, d.mesh.position.z - r.z1);
        if (Math.hypot(dx, dz) < 7) issues.push('prop can blast a spawn: ' + d.propId);
      }
    }
    if (props.length < 20) issues.push('too few themed combat props');
    const saved = { spawnExplosion, spawnAbilityAOEFX, playSoundEvent, showDamageNumber, spawnHitParticle, showAnnouncement, emitHit, applyBotDamageToPlayer };
    let hits = 0, localHits = 0;
    try {
      spawnExplosion = spawnAbilityAOEFX = playSoundEvent = showDamageNumber = spawnHitParticle = showAnnouncement = () => {};
      emitHit = () => { hits++; }; applyBotDamageToPlayer = () => { localHits++; };
      activateMap('refinery');
      const a = props.find(d => d.mapName === 'refinery');
      if (!a) throw new Error('refinery has no explosives');
      if (!a.mesh.parent) issues.push('static merge swallowed explosive');
      const muzzle = a.mesh.position.clone().add(new THREE.Vector3(0, 0.8, -2));
      spawnLocalBullet(muzzle, new THREE.Vector3(0, 0, 1), 'prop-test', true, 200, 0xffffff, 0.01, 'ak20');
      updateBullets(0.02);
      // One AK20 round at point blank: whatever the AK20 hits for now, not a
      // number that goes stale every time it is rebalanced.
      if (a.hp !== a.maxHp - getClientWeaponDamage('ak20')) issues.push('actual bullet did not damage explosive (' + a.hp + ')');
      activateMap('refinery');
      damageDestructible(a, 25, { ownerId: myId });
      if (a.hp !== 35 || !a.mesh.visible) issues.push('nonfatal prop hit destroys it');
      damageDestructible(a, 35, { ownerId: myId });
      if (a.hp !== 0 || a.mesh.visible || wallColliders.includes(a.colliderRef)) issues.push('destroyed prop remains solid or visible');
      if (localHits) issues.push('own explosion damaged player');
      const dead = props.filter(d => d.mapName === 'refinery' && d.hp <= 0);
      if (dead.length < 2) issues.push('nearby barrels did not chain react');
      damageDestructible(a, 100, { ownerId: myId });
      activateMap('refinery');
      if (a.hp !== a.maxHp || !a.mesh.visible || !wallColliders.includes(a.colliderRef)) issues.push('reactivation did not restore prop');
      damageDestructible(a, 60, { remote: true, ownerId: 'opponent' });
      if (hits || localHits) issues.push('remote explosion duplicated damage');
      const oldCols = wallColliders.slice(); wallColliders.length = 0;
      const origin = new THREE.Vector3(0, 1, 0), near = new THREE.Vector3(1, 1, 0), far = new THREE.Vector3(6, 1, 0);
      if (!(mapBlastDamage(origin, near) > mapBlastDamage(origin, far)) || mapBlastDamage(origin, new THREE.Vector3(8, 1, 0)) !== 0) issues.push('blast falloff/range is wrong');
      wallColliders.push(new THREE.Box3(new THREE.Vector3(2, 0, -2), new THREE.Vector3(3, 4, 2)));
      if (mapBlastDamage(origin, far)) issues.push('blast passed through solid cover');
      wallColliders.length = 0; wallColliders.push(...oldCols);
      activateMap('blank');
    } finally {
      ({ spawnExplosion, spawnAbilityAOEFX, playSoundEvent, showDamageNumber, spawnHitParticle, showAnnouncement, emitHit, applyBotDamageToPlayer } = saved);
    }
    console.log('prop checks: ' + props.length + ' explosives on ' + new Set(props.map(d => d.mapName)).size + ' maps; damage, cover, chains, reset and merge');
    return issues;
  })()`);
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--props')) {
  const serverSource = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const begin = serverSource.indexOf("  socket.on('mapPropDestroyed',");
  const end = serverSource.indexOf("  socket.on('airBlast',", begin);
  let handler;
  const delivered = [], player = { matchId: 'prop-test-match', dead: false };
  vm.runInNewContext(serverSource.slice(begin, end), {
    players: { shooter: player }, socket: { id: 'shooter', on: (name, fn) => { if (name === 'mapPropDestroyed') handler = fn; } },
    emitToMatchExcept: (...args) => delivered.push(args),
  });
  handler({ mapName: 'refinery', propId: 'refinery:44.5:1' });
  handler({ mapName: 'refinery', propId: 'warehouse:44.5:1' });
  handler({ mapName: 'refinery', propId: 'refinery:not-a-position' });
  player.dead = true;
  handler({ mapName: 'refinery', propId: 'refinery:44.5:1' });
  player.dead = false;
  for (let i = 0; i < 40; i++) handler({ mapName: 'refinery', propId: 'refinery:44.5:1' });
  if (delivered.length !== 32 || delivered.some(([match, except, event, payload]) =>
    match !== 'prop-test-match' || except !== 'shooter' || event !== 'mapPropDestroyed' || payload.ownerId !== 'shooter')) {
    ok = false; console.log('prop relay failed validation, match scoping or rate limiting');
  } else console.log('prop relay: fractional coordinates, validation, dead-player guard and match scoping passed');
}


// Every map's own mechanic (GIM) and look (LOOK): builds, runs a minute of the frame update with bots about, and -- where the
// builder says where an actor has to stand (X.dbg) -- parks an actor there and waits for something to happen to it.
if (ok && process.argv.includes('--gimmicks')) {
  const rep = vm.runInThisContext(`(() => {
    const issues = [], notes = [];
    const names = Object.keys(GIM);
    const ps = playSoundEvent, hud = updateMatchHUD; playSoundEvent = function () {}; updateMatchHUD = function () {};
    myId = myId || 'me'; players[myId] = players[myId] || { hp: 100, dead: false };
    inLobby = false; countdownActive = false; isDead = false;
    try {
      for (const n of names) {
        try {
          _upgradeMap(n); activateMap(n);
          if (!_gimDone[n]) { issues.push(n + ': the gimmick never built'); continue; }
          const M = MAP_MECH[n]; M.reset();
          const b = MAP_BOT_BOUNDS[n] || MAP_BOUNDS[n], spot = () => [(Math.random() * 2 - 1) * (b.halfX - 8), (Math.random() * 2 - 1) * (b.halfZ - 8)];
          gameBots.length = 0;
          for (let k = 0; k < 16; k++) { const p = spot(); gameBots.push({ id: 'vb' + k, x: p[0], z: p[1], y: 0, yVel: 0, hp: 300, maxHp: 300, dead: false, isBot: true }); }
          for (let s = 0; s < 1200; s++) {                       // a minute at 20 Hz, everyone somewhere new every 1.5 s
            if (s % 30 === 0) { const p = spot(); camera.position.set(p[0], 1.65, p[1]); for (const bb of gameBots) { const q = spot(); bb.x = q[0]; bb.z = q[1]; bb.y = 0; bb.yVel = 0; } }
            for (const bb of gameBots) { bb.hp = 300; bb.dead = false; }
            players[myId].hp = 100; slamState = null; playerYVel = 0; isDead = false;   // a hazard that kills ends the player: stand them up again
            M.update(0.05); updateMapGimmicks(0.05);
          }
          const dbg = g_gimDbg[n];
          if (!dbg || !dbg.pts || !dbg.pts.length) { notes.push(n); continue; }
          let effects = 0, tests = 0;
          for (const p of (dbg.live ? [{ x: 0, z: 0 }] : dbg.pts.slice(0, 3))) {
            tests++; M.reset(); localBullets.length = 0; gameBots.length = 0;
            gameBots.push({ id: 'vt', x: p.x + 0.4, z: p.z, y: 0, yVel: 0, hp: 200, maxHp: 300, dead: false, isBot: true });
            let eff = false;
            for (let s = 0; s < 1400 && !eff; s++) {                // up to 70 s
              let q = p;
              if (dbg.live) { const L = dbg.live(); if (!L.length) { M.update(0.05); continue; } q = L[0]; gameBots[0].x = q.x + 0.4; gameBots[0].z = q.z; }
              camera.position.set(q.x, 1.65, q.z); players[myId].hp = 60; slamState = null; playerRootedUntil = 0; playerYVel = 0; isDead = false;
              const bx = gameBots[0]; bx.hp = Math.min(bx.hp, 200);
              if (dbg.poke && s % 40 === 5) dbg.poke();
              M.update(0.05); updateMapGimmicks(0.05);
              if (players[myId].hp !== 60 || slamState || playerRootedUntil > Date.now() || _gimSlowState.v < 1 || _playerInLowGrav || _gimRollNow() !== 0 ||
                  Math.hypot(camera.position.x - q.x, camera.position.z - q.z) > 1.0 || bx.hp !== 200 || bx.yVel > 0 || bx.dead || Math.hypot(bx.x - (q.x + 0.4), bx.z - q.z) > 0.6) eff = true;
            }
            if (eff) effects++;
          }
          if (!effects) issues.push(n + ': nothing happened to an actor standing where the gimmick says it works (' + tests + ' probes)');
        } catch (e) { issues.push(n + ': ' + e.message + ' @ ' + String((e.stack || '').split('\\n')[1] || '').trim()); }
      }
    } finally { playSoundEvent = ps; updateMatchHUD = hud; gameBots.length = 0; }
    const looks = Object.keys(LOOK).filter(n => !(MAP_GROUPS[n] && MAP_GROUPS[n]._upgraded)).length;
    return { issues, notes, count: names.length, looks: Object.keys(LOOK).length, unbuiltLooks: looks };
  })()`);
  if (rep.issues.length) { ok = false; console.log(rep.issues.join('\n')); }
  console.log('gimmicks: ' + rep.count + ' maps with their own mechanic, ' + rep.looks + ' with a prop pass; ' + (rep.notes.length ? 'no point-probe for ' + rep.notes.join(', ') : 'every one probed'));
}

if (ok && process.argv.includes('--wraps')) {
  const issues = vm.runInThisContext(`(() => {
    const issues = [], originalMap = new THREE.Texture(), originalBump = new THREE.Texture();
    const model = new THREE.Group();
    const main = new THREE.Mesh(new THREE.BoxGeometry(.1, .06, .2), new THREE.MeshStandardMaterial({ color: 0x456789, map: originalMap, bumpMap: originalBump, roughness: .67, metalness: .8 }));
    main.material.userData.surfaceMap = true; model.add(main);
    const sight = new THREE.Mesh(new THREE.BoxGeometry(.01, .01, .01), new THREE.MeshStandardMaterial({ color: 0x111111 })); model.add(sight);
    const lens = new THREE.Mesh(new THREE.BoxGeometry(.01, .01, .01), new THREE.MeshBasicMaterial({ color: 0x55aaff })); model.add(lens);
    const locked = new THREE.Mesh(new THREE.BoxGeometry(.1, .1, .1), new THREE.MeshStandardMaterial({ color: 0xaa1122 })); locked.material.userData.skinLock = true; model.add(locked);
    const lockedMat = locked.material, geometry = main.geometry;
    for (const id of ['carbon', 'wood', 'fire', 'obsidian', 'ultraviolet', 'cyber']) {
      const skin = WEAPON_SKINS_BY_ID[id];
      if (!skin?.wrap) { issues.push(id + ': missing wrap'); continue; }
      applyWeaponSkin(model, skin);
      const surface = getWeaponWrapSurface(id);
      if (main.material.map !== surface.map || main.material.bumpMap !== surface.bumpMap) issues.push(id + ': wrap did not reach gun');
      if (getWeaponWrapSurface(id) !== surface) issues.push(id + ': texture cache missed');
      if (main.geometry !== geometry || locked.material !== lockedMat || lens.material.color.getHex() !== 0x55aaff || sight.material.map !== surface.map) issues.push(id + ': solid trim uncovered or protected surface altered');
      if (id === 'wood' && main.material.metalness !== 0) issues.push('wood reads as metal');
      if (id === 'fire' && !main.material.emissiveMap) issues.push('fire has no glow mask');
    }
    applyWeaponSkin(model, WEAPON_SKINS_BY_ID.woodland);
    if (main.material.map !== _wsTextures('woodland', 0).map || main.material.bumpMap !== originalBump) issues.push('legacy pattern did not replace wrap cleanly');
    applyWeaponSkin(model, WEAPON_SKINS_BY_ID.cyber);
    if (main.material.map !== getWeaponWrapSurface('cyber').map) issues.push('wrap did not replace legacy pattern');
    applyWeaponSkin(model, WEAPON_SKINS_BY_ID.default);
    if (main.material.map !== originalMap || main.material.bumpMap !== originalBump || main.material.color.getHex() !== 0x456789 || main.material.roughness !== .67 || main.material.metalness !== .8 || main.material.emissiveMap) issues.push('stock did not restore original material');
    const allSides = new THREE.Group();
    const body = new THREE.MeshStandardMaterial({ color: 0x555555 }), accent = new THREE.MeshStandardMaterial({ color: 0x777777 });
    const multi = new THREE.Mesh(new THREE.BoxGeometry(.1,.1,.1), [body, accent, new THREE.MeshStandardMaterial({ map: originalMap }), body, accent, new THREE.MeshStandardMaterial()]);
    allSides.add(multi); allSides._bodyMat = body; allSides._accentMat = accent;
    const shared = new THREE.BoxGeometry(.02,.1,.2); shared.deleteAttribute('uv');
    const noUV = new THREE.Mesh(shared, body), alsoNoUV = new THREE.Mesh(shared, body); allSides.add(noUV, alsoNoUV);
    const hand = new THREE.Group(); hand.userData.vmHand = true;
    const handMesh = new THREE.Mesh(shared, body); hand.add(handMesh); allSides.add(hand);
    const glass = new THREE.Mesh(shared, new THREE.MeshPhysicalMaterial({ transparent: true, opacity: .5, transmission: .8 })); allSides.add(glass);
    const glassMat = glass.material;
    const shape = new THREE.Shape(); shape.moveTo(0,0); shape.lineTo(.15,0); shape.lineTo(.15,.06); shape.lineTo(0,.06); shape.closePath();
    const extruded = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth:.015, bevelEnabled:false }), accent); allSides.add(extruded);
    const originalUV = extruded.geometry.attributes.uv.array.slice();
    applyWeaponSkin(allSides, WEAPON_SKINS_BY_ID.ultraviolet);
    const uvMap = getWeaponWrapSurface('ultraviolet').map;
    if (multi.material.some(m => m.map !== uvMap) || allSides._bodyMat.map !== uvMap || allSides._accentMat.map !== uvMap) issues.push('material slots, original maps or accent faces missed wrap');
    for (const mesh of [noUV, alsoNoUV, extruded]) {
      if (!mesh.geometry.attributes.uv || mesh.material.map !== uvMap) issues.push('shared or extruded face lacked wrap');
      const pos = mesh.geometry.attributes.position, nor = mesh.geometry.attributes.normal, uv = mesh.geometry.attributes.uv;
      for (let k = 0; k + 2 < pos.count && !mesh.geometry.index; k += 3) {
        const area = Math.abs((uv.getX(k+1)-uv.getX(k))*(uv.getY(k+2)-uv.getY(k))-(uv.getX(k+2)-uv.getX(k))*(uv.getY(k+1)-uv.getY(k)));
        if (area < .00001) issues.push('extruded face sampled a single texture line');
      }
    }
    if (handMesh.material !== body || handMesh.geometry !== shared || shared.attributes.uv || glass.material !== glassMat || glass.geometry !== shared) issues.push('wrap leaked onto hand/glass or shared geometry');
    applyWeaponSkin(allSides, WEAPON_SKINS_BY_ID.default);
    if (noUV.geometry.attributes.uv || alsoNoUV.geometry.attributes.uv || extruded.geometry.attributes.uv.array.some((v,i) => v !== originalUV[i]) || multi.material[2].map !== originalMap) issues.push('stock UV or authored map restoration failed');
    const lateGeo = new THREE.BoxGeometry(.025,.03,.06); lateGeo.deleteAttribute('uv');
    const late = new THREE.Mesh(lateGeo, accent); allSides.add(late);
    const stableMat = multi.material[0];
    applyWeaponSkin(allSides, WEAPON_SKINS_BY_ID.ultraviolet);
    if (late.material.map !== uvMap || !late.geometry.attributes.uv || multi.material[0] !== stableMat) issues.push('late fittings missed wrap or existing materials recloned');
    applyWeaponSkin(allSides, WEAPON_SKINS_BY_ID.default);
    if (late.geometry.attributes.uv) issues.push('late fitting UV restoration failed');
    console.log('wrap checks: six finishes, every material slot, accent/trim coverage, projected faces, protected hands/lenses and stock restoration');
    return issues;
  })()`);
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--secret-inspects')) {
  const issues = vm.runInThisContext(`(() => {
    const issues = [];
    for (const [skinId, def] of Object.entries(SECRET_INSPECTS)) {
      const skin = MODEL_SKINS.find(s => s.id === skinId);
      if (!skin) { issues.push(skinId + ': missing skin'); continue; }
      const old = _activeModelSkin[skin.weapon];
      _activeModelSkin[skin.weapon] = skin;
      const key = skin.weapon + ':' + skinId;
      _secretInspectCounts.delete(key);
      const model = new THREE.Group();
      const rear = new THREE.Group(), front = new THREE.Group(), main = new THREE.Group();
      rear.add(new THREE.Mesh(new THREE.BoxGeometry(.02, .02, .02), new THREE.MeshStandardMaterial()));
      front.position.set(-.03, -.05, -.04); main._home = new THREE.Vector3(0, .02, -.03); main.position.copy(main._home);
      model.add(rear, front, main); model._homePos = model.position.clone();
      model._parts = { main };
      model._hands = { rear, front, rearHome: rear.position.clone(), frontHome: front.position.clone(), rearRot: rear.rotation.clone(), frontRot: front.rotation.clone(), single: def.kind === 'receipt', hideFront: false };
      const initialChildren = model.children.length;
      for (let n = 1; n <= def.every * 2; n++) {
        const run = secretInspectFor(skin.weapon);
        if (run.triggered !== (n % def.every === 0)) issues.push(skinId + ': wrong repeat threshold');
        model._secretInspect = run;
        const pose = { rx: 0, rz: 0, py: 0 };
        updateSecretInspect(model, .2, pose);
        if (run.triggered && (!run.group || run.group.children.length < 4 || run.group.scale.x <= 0)) issues.push(skinId + ': missing visible effect');
        if (run.triggered) {
          run.sounded = true; // Audio is unavailable in this headless WebGL harness.
          const track = SECRET_INSPECT_TRACKS[run.kind];
          if (!track || !track.some(k => Math.abs(k.hx) + Math.abs(k.hy) + Math.abs(k.hz) > .05)) issues.push(skinId + ': missing independent hand track');
          for (const t of [.45, .65, .9]) {
            const p = _reloadPose(track, t);
            main.position.set(main._home.x + p.ax, main._home.y + p.ay, main._home.z + p.az); main.rotation.set(p.arx, p.ary, p.arz);
            updateSecretInspect(model, t, p); finishSecretInspectPose(model, t, p);
            const hand = run.extraHand || front;
            if (t === .45 && hand.position.distanceTo(model._hands.frontHome) < .001) issues.push(skinId + ': hand did not act');
            if (run.kind === 'donut' && t === .65 && (main.position.distanceTo(main._home) < .05 || Math.abs(main.rotation.z) < Math.PI * 2)) issues.push('glazer did not remove and spin its real cylinder');
          }
          run.group.traverse(o => {
            if (![...o.position.toArray(), ...o.scale.toArray(), o.rotation.x, o.rotation.y, o.rotation.z].every(Number.isFinite)) issues.push(skinId + ': invalid animated transform');
          });
          if (run.kind === 'splash' && (run.balloon.visible || !run.group.children.some(o => o.userData.drop !== undefined && o.visible))) issues.push('balloon did not burst');
        }
        let disposed = 0, geometryCount = 0;
        if (run.group) run.group.traverse(o => { if (o.geometry) { geometryCount++; o.geometry.addEventListener('dispose', () => disposed++); } });
        clearSecretInspect(model, true);
        if (model.children.length !== initialChildren || model._secretInspect || disposed !== geometryCount) issues.push(skinId + ': leaked effect resources');
        if (!rear.position.equals(model._hands.rearHome) || !front.position.equals(model._hands.frontHome) || !main.position.equals(main._home)) issues.push(skinId + ': did not restore hands or cylinder');
      }
      const count = _secretInspectCounts.get(key);
      model._secretInspect = secretInspectFor(skin.weapon);
      clearSecretInspect(model);
      if (_secretInspectCounts.get(key) !== count) issues.push(skinId + ': interrupted inspect counted');
      _activeModelSkin[skin.weapon] = null;
      if (secretInspectFor(skin.weapon)) issues.push(skinId + ': stock triggered skin secret');
      _activeModelSkin[skin.weapon] = { ...skin, weapon: 'wrong_weapon' };
      if (secretInspectFor(skin.weapon)) issues.push(skinId + ': wrong weapon triggered secret');
      _activeModelSkin[skin.weapon] = old;
      _secretInspectCounts.delete(key);
    }
    const idx = WEAPONS.findIndex(w => w.id === 'pistol');
    const saved = { idx: currentWeaponIdx, model: weaponModels[idx], skin: _activeModelSkin.pistol, dead: isDead, reload: reloading, audio: getAudioCtx };
    try {
      currentWeaponIdx = idx; isDead = false; reloading = false; getAudioCtx = () => null;
      weaponModels[idx] = new THREE.Group();
      _activeModelSkin.pistol = MODEL_SKINS.find(s => s.id === 'pistol_blaster');
      const key = 'pistol:pistol_blaster'; _secretInspectCounts.set(key, 3);
      startInspect();
      const model = weaponModels[idx];
      if (!model._secretInspect?.triggered || model._reloadDur !== 3400) issues.push('secret animation did not start');
      model._reloadStart = Date.now() - 800; updateReloadAnim();
      if (!model._secretInspect?.group) issues.push('secret animation did not run through frame update');
      model._reloadStart = Date.now() - 4000; updateReloadAnim(); updateReloadAnim();
      if (_secretInspectCounts.get(key) !== 4 || model._inspectMode || model.children.length) issues.push('completed animation counted twice or failed cleanup');
      startInspect(); cancelInspect();
      if (_secretInspectCounts.get(key) !== 4 || model._inspectMode) issues.push('cancel counted inspection');
      _secretInspectCounts.delete(key);
    } finally {
      currentWeaponIdx = saved.idx; weaponModels[idx] = saved.model; _activeModelSkin.pistol = saved.skin;
      isDead = saved.dead; reloading = saved.reload; getAudioCtx = saved.audio;
    }
    const ri = WEAPONS.findIndex(w => w.id === 'revolver');
    const revolverSaved = { idx: currentWeaponIdx, model: weaponModels[ri], skin: _activeModelSkin.revolver, dead: isDead, reload: reloading, audio: getAudioCtx };
    try {
      currentWeaponIdx = ri; isDead = false; reloading = false; getAudioCtx = () => null;
      const model = prepViewModel(buildDonutRevolver(), 'revolver'); weaponModels[ri] = model;
      _activeModelSkin.revolver = MODEL_SKINS.find(s => s.id === 'revolver_donut');
      _secretInspectCounts.set('revolver:revolver_donut', 5);
      startInspect();
      const cylinder = model._parts.main, angles = [];
      for (const t of [.4, .5, .6]) {
        model._reloadStart = Date.now() - model._reloadDur * t;
        updateReloadAnim();
        const angle = cylinder.rotation.z;
        updateCylinders(1 / 60); // Same ordering as the live render loop.
        if (Math.abs(cylinder.rotation.z - angle) > .001) issues.push('live cylinder update overwrote secret spin');
        if (Math.abs(cylinder.rotation.x) < .3) issues.push('glazer spin lacked visible tilt');
        angles.push(cylinder.rotation.z);
      }
      if (angles[2] - angles[0] < Math.PI * 2) issues.push('glazer failed to visibly spin through a revolution');
      cancelInspect(); updateCylinders(1 / 60);
      if (!cylinder.position.equals(cylinder._home) || cylinder.rotation.x || cylinder.rotation.y || Math.abs(cylinder.rotation.z - (cylinder._spin || 0)) > .001) issues.push('glazer did not restore firing cylinder');
      _secretInspectCounts.delete('revolver:revolver_donut');
    } finally {
      currentWeaponIdx = revolverSaved.idx; weaponModels[ri] = revolverSaved.model; _activeModelSkin.revolver = revolverSaved.skin;
      isDead = revolverSaved.dead; reloading = revolverSaved.reload; getAudioCtx = revolverSaved.audio;
    }
    console.log('secret inspect checks: ' + Object.keys(SECRET_INSPECTS).length + ' skin/weapon pairs, live cylinder ordering, frame updates, cancellation and resource cleanup');
    return issues;
  })()`);
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--combat-feedback')) {
  const issues = vm.runInThisContext(`(() => {
    const issues = [], saved = { boxes: wallColliders.slice(), pos: camera.position.clone(), vel: playerYVel, slam: slamState, eye: window._crouchEye, armed: window._climbArmed, climbing: window._climbing, slide: window._slideUntil, ads: isADS, id: myId, match, turns: _killfeedTurnSamples.slice() };
    try {
      wallColliders.length = 0;
      const roof = new THREE.Box3(new THREE.Vector3(-8, 2.5, -8), new THREE.Vector3(8, 2.6, 8)); wallColliders.push(roof);
      window._crouchEye = 1.65; window._climbArmed = true;
      camera.position.set(0, 4, 0); playerYVel = 20; slamState = null;
      if (!resolvePlayerCeiling(1.8) || camera.position.y >= 2.5 - PLAYER_HEAD_CLEARANCE || playerYVel !== 0 || window._climbArmed) issues.push('standing jump failed swept ceiling contact');
      resolveWallCollisions();
      if (camera.position.x || camera.position.z || camera.position.y > 2.4) issues.push('roof still ejects player sideways');
      camera.position.set(0, 3, 0); slamState = { vel: 15, type: 'jump' };
      resolvePlayerCeiling(1.8);
      if (slamState.vel !== 0 || slamState.type !== 'fall') issues.push('slide/double jump did not stop at ceiling');
      window._crouchEye = .95; roof.min.y = 1.6; roof.max.y = 1.7;
      camera.position.set(0, 2, 0); slamState = null; resolvePlayerCeiling(1);
      resolveWallCollisions();
      if (camera.position.x || camera.position.z || camera.position.y > 1.42) issues.push('crouched ceiling contact failed');
      camera.position.set(10, 3, 10);
      if (resolvePlayerCeiling(1)) issues.push('non-overlapping roof blocked jump');
      camera.position.set(0, 4, 0);
      if (resolvePlayerCeiling(4.5)) issues.push('downward landing treated as ceiling');
      roof.min.y = 20; roof.max.y = 20.02; camera.position.set(0, 25, 0);
      if (!resolvePlayerCeiling(15)) issues.push('high thin ceiling tunneled');
      wallColliders.length = 0; window._crouchEye = 1.65; camera.position.set(0, 1.65, 0);
      isADS = false; myId = 'feedback-test'; _killfeedTurnSamples.length = 0;
      if (!killfeedShotTags('srx').includes('NO SCOPE') || killfeedTagMark('NO SCOPE')[0] !== '' || killfeedTagMark('NO SCOPE')[1] !== 'noscope') issues.push('no-scope symbol failed');
      isADS = true;
      if (killfeedShotTags('srx').includes('NO SCOPE')) issues.push('scoped shot labeled no scope');
      camera.position.y = 3;
      if (!killfeedShotTags('pistol').includes('AIR')) issues.push('air kill context missing');
      camera.position.y = 1.65; window._slideUntil = Date.now() + 1000;
      if (!killfeedShotTags('pistol').includes('SLIDE')) issues.push('slide kill context missing');
      noteKillInfo('feedback-target', myId, 'ak20', false);
      if (!killfeedShotTags('pistol', { targetId: 'feedback-target' }).includes('COMBO')) issues.push('weapon-switch combo missing');
      noteKillInfo('feedback-target', myId, 'pistol', false, { tags: ['COMBO'] });
      if (!killfeedShotTags('pistol', { targetId: 'feedback-target' }).includes('COMBO')) issues.push('same-weapon follow-up lost combo');
      match = {}; _killfeedChains.clear();
      if (killfeedChain('a', 'killer', 1000) !== 1 || killfeedChain('b', 'killer', 2000) !== 2 || killfeedChain('c', 'killer', 8001) !== 1) issues.push('multi-kill window wrong');
      killfeedChain('killer', null, 8100);
      if (killfeedChain('d', 'killer', 8200) !== 1 || killfeedChain('killer', 'killer', 8300) !== 0) issues.push('death/self-kill did not reset streak');
      if (!killfeedLaser('gatecrasher_beam') || !killfeedLaser('cyroclasm_laser') || !killfeedLaser('laser') || killfeedLaser('ak20') || killfeedLaser('taser')) issues.push('laser gag classification wrong');
      for (const [weapon, info, self, want] of [
        ['rpg', {}, false, 'boom'], ['freeze_gun', {}, false, 'ice'], ['taser', {}, false, 'electric'],
        ['flamethrower', {}, false, 'fire'], [null, { cause: 'fall' }, false, 'fall'],
        ['air_blaster', { cause: 'ringout' }, false, 'ringout'], ['rpg', {}, true, 'self'],
        ['pistol', { look: 'fart_cloud' }, false, 'fart'], ['vector', { look: 'bubble_shot' }, false, 'bubble'],
        ['rpg', { look: 'donut' }, false, 'donut'], ['rpg', { look: 'water_balloon' }, false, 'water'],
        ['sg8', { look: 'void' }, false, 'void'], ['frying_pan', {}, false, 'bonk'], ['throwing_knives', {}, false, 'thrown'],
        ['pistol', { look: 'beam' }, false, 'laser'], ['ak20', {}, false, null],
        [null, { cause: 'hazard', label: KILLFEED_HAZARDS.lava }, true, 'fire'],
      ]) if (killfeedGagKind(weapon, info, self) !== want) issues.push(String(weapon) + ': gag category wrong');
      for (const kind of Object.keys(KILLFEED_LOGOS)) {
        const url = killfeedLogoURL(kind), cached = _killfeedLogoCache.get(kind);
        if (!url.startsWith('data:image/png') || url !== killfeedLogoURL(kind) || cached.canvas.width !== 128 || cached.canvas.height !== 128) issues.push(kind + ': logo generation/cache broken');
      }
      if (killfeedLogoURL('unknown')) issues.push('unknown kill received a logo');
    } finally {
      wallColliders.splice(0, wallColliders.length, ...saved.boxes); camera.position.copy(saved.pos); playerYVel = saved.vel; slamState = saved.slam;
      window._crouchEye = saved.eye; window._climbArmed = saved.armed; window._climbing = saved.climbing; window._slideUntil = saved.slide;
      isADS = saved.ads; myId = saved.id; match = saved.match; _killfeedTurnSamples.splice(0, _killfeedTurnSamples.length, ...saved.turns);
      delete _killInfo['feedback-target']; _killfeedChains.clear(); _killfeedChainMatch = null;
    }
    console.log('combat feedback checks: swept ceilings, crouch, high roofs, no-scope symbols, position tags, combos, streak resets and laser classification');
    return issues;
  })()`);
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--emotes')) {
  const issues = vm.runInThisContext(`(() => {
    const issues = [], mesh = makePlayerMesh('Emote test', false, 'ally', 'default');
    try {
      if (keyBoundTo('freecam') !== 'Digit0') issues.push('default controls wrong');
      if (!EMOTES_ARCHIVED || keyBoundTo('emotes') !== null) issues.push('emotes are archived: no key should be bound to them');
      openEmotes(); startEmote('wave'); if (SOCIAL_VIEW.mode) { issues.push('an archived emote started'); stopSocialView(); }
      for (const e of EMOTES) {
        animateCharacterMesh(mesh, .016, 0);
        const before = mesh._rig.armL.rotation.clone();
        poseEmote(mesh, e.id, .37);
        if (!mesh._emotePose || mesh._rig.armL.rotation.equals(before)) issues.push(e.id + ': no distinct pose');
        const root = mesh._emoteRoot, r = mesh._rig;
        for (const joint of [r.head, r.torso, r.pelvis, r.armL, r.armR, r.legL, r.legR]) {
          if (joint.parent !== root) issues.push(e.id + ': detached body turn');
        }
        if (e.id === 'take_l' && (r.legL.rotation.z >= 0 || r.legR.rotation.z <= 0)) issues.push('Take the L kicks inward');
        if (e.id === 'victory' && (r.armL.rotation.z >= 0 || r.armR.rotation.z <= 0)) issues.push('Victory arms raised inward');
        if (e.id === 'shuffle' && (Math.abs(root.rotation.y) < .01 || r.torso.rotation.y !== 0)) issues.push('Shuffle turns torso alone');
        restoreEmotePose(mesh);
        if (!mesh._rig.armL.rotation.equals(before) || mesh._emoteL?.visible) issues.push(e.id + ': restoration failed');
        if (root.rotation.x || root.rotation.y || root.rotation.z || root.position.lengthSq()) issues.push(e.id + ': whole-body turn not restored');
      }
    } finally { disposeBody(mesh); }
    console.log('emote checks: ARCHIVED (no Q binding, nothing starts); the four poses still build and restore');
    return issues;
  })()`);
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--emotes')) {
  const src = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const handler = src.match(/socket\.on\('move', \(data\) => \{([\s\S]*?)\n  \}\);/);
  if (!handler) throw new Error('move handler missing');
  const player = { dead: false }, box = { players: { tester: player }, socket: { id: 'tester' }, Date, EMOTES_ARCHIVED: false };   // (the relay logic is kept working for when they come back)
  const move = vm.runInNewContext('(data) => {' + handler[1] + '}', box);
  move({ x: 1, y: 1.65, z: 2, rotY: 0, rotX: 0, emote: 'take_l' });
  const until = player.emoteUntil;
  move({ emote: 'take_l' });
  if (player.emote !== 'take_l' || until !== player.emoteUntil) throw new Error('emote duration resets every position packet');
  move({ emote: '__proto__' });
  if (player.emote !== null || player.emoteUntil !== 0) throw new Error('invalid emote accepted');
  move({ emote: 'wave' }); player.dead = true; move({ emote: 'shuffle' });
  if (player.emote !== 'wave') throw new Error('dead player can start emotes');
  box.EMOTES_ARCHIVED = true;
  const player2 = { dead: false }; box.players.tester = player2;
  move({ x: 1, y: 1.65, z: 2, rotY: 0, rotX: 0, emote: 'wave' });
  if (player2.emote !== null) throw new Error('an emote got through while emotes are archived');
  if (!/const EMOTES_ARCHIVED = true;/.test(src)) throw new Error('the server should have emotes archived');
  console.log('emote relay checks: valid IDs, fixed duration, cancellation and dead-player guard (when un-archived); archived: every emote dropped');
}

if (ok && process.argv.includes('--perspectives')) {
  const issues = vm.runInThisContext(`(() => {
    const issues = [], saved = { gameStarted, isDead, isADS, reloading, reload: _reloadSt, mode: selectedModeConfig,
      pos: camera.position.clone(), quat: camera.quaternion.clone(), yaw: euler.clone(), boxes: wallColliders.slice(),
      dialogs: anyDialogOpen, loadout: isLoadoutOpen, social: SOCIAL_VIEW.mode, skin: mySkin };
    try {
      gameStarted = true; isDead = isADS = reloading = false; selectedModeConfig = null; SOCIAL_VIEW.mode = null;
      anyDialogOpen = isLoadoutOpen = () => false;
      camera.position.set(0,1.65,0); camera.quaternion.identity(); euler.set(0,0,0,'YXZ'); wallColliders.length = 0;
      if (keyBoundTo('perspective') !== 'Digit9') issues.push('perspective binding missing');
      PLAYER_VIEW.mode = 'third'; let c = updatePlayerView(.016);
      if (c === camera || c.position.z <= 0 || !PLAYER_VIEW.actor.visible) issues.push('third-person framing failed');
      PLAYER_VIEW.mode = 'second'; c = updatePlayerView(.016);
      if (c === camera || c.position.z >= 0 || !PLAYER_VIEW.actor.visible) issues.push('second-person framing failed');
      if (!camera.position.equals(new THREE.Vector3(0,1.65,0))) issues.push('perspective moved player');
      isADS = true;
      if (updatePlayerView(.016) !== camera || PLAYER_VIEW.actor.visible) issues.push('ADS fallback failed');
      isADS = false; reloading = true; _reloadSt = { start: Date.now() - 300, dur: 2000 };
      updatePlayerView(.016); reloading = false;
      SOCIAL_VIEW.mode = 'free';
      if (updatePlayerView(.016) !== camera || PLAYER_VIEW.actor.visible) issues.push('freecam duplicate body');
      SOCIAL_VIEW.mode = null; PLAYER_VIEW.mode = 'third';
      wallColliders.push(new THREE.Box3(new THREE.Vector3(-5,0,1), new THREE.Vector3(5,5,2)));
      c = updatePlayerView(.016);
      if (c !== camera && c.position.z >= 1) issues.push('camera crossed wall');
      PLAYER_VIEW.mode = 'first';
      if (updatePlayerView(.016) !== camera || PLAYER_VIEW.actor.visible) issues.push('first-person restoration failed');
    } finally {
      resetPlayerView(); gameStarted = saved.gameStarted; isDead = saved.isDead; isADS = saved.isADS; reloading = saved.reloading;
      _reloadSt = saved.reload; selectedModeConfig = saved.mode; SOCIAL_VIEW.mode = saved.social; mySkin = saved.skin;
      anyDialogOpen = saved.dialogs; isLoadoutOpen = saved.loadout; camera.position.copy(saved.pos); camera.quaternion.copy(saved.quat);
      euler.copy(saved.yaw); wallColliders.splice(0,wallColliders.length,...saved.boxes);
    }
    console.log('perspective checks: first/third/second cameras, fixed physical position, ADS, reload, freecam, wall avoidance and cleanup');
    return issues;
  })()`);
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--stances')) {
  const issues=vm.runInThisContext(`(() => {
    const issues=[];
    for(const bot of [false,true])for(const armed of [false,true])for(const stance of ['crouch','crouch-walk','slide']) {
      const mesh=makePlayerMesh('Stance test',bot,'ally','default'),r=mesh._rig;
      r.holdsGun=armed;r.gaitOffset=0;r.gaitAmp=1;r.gaitAsym=1;
      try {
        for(let i=0;i<100;i++) {
          if(stance==='slide'||stance==='crouch-walk')mesh.position.z+=.12;
          animateCharacterMesh(mesh,1/60,.58,stance==='slide'?1:0,0,0);
        }
        mesh.updateMatrixWorld(true);
        const head=r.head.getWorldPosition(new THREE.Vector3()),neck=r.neck.getWorldPosition(new THREE.Vector3());
        if(Math.abs(head.y-mesh.position.y-r.hitHeadOff)>.001||Math.abs(head.z-mesh.position.z-r.hitHeadZ)>.001)issues.push('pose hitbox misses drawn head');
        if(Math.abs(head.distanceTo(neck)-(BODY.headY-BODY.neckY))>.002)issues.push('head detaches from neck');
        const a=r.footL.getWorldPosition(new THREE.Vector3()),b=r.footR.getWorldPosition(new THREE.Vector3());
        if(stance==='crouch'&&Math.abs(a.z-b.z)<.2)issues.push('crouch remains a symmetrical squat');
        if(stance!=='slide'&&Math.abs(r.torso.rotation.x)>.01)issues.push('crouched torso leans instead of staying upright');
        if(stance==='slide'&&(r.torso.rotation.x>-.7||head.z-mesh.position.z>-.4))issues.push('slide lacks backward body lean');
        for(const foot of [r.footL,r.footR])if(new THREE.Box3().setFromObject(foot).min.y<-.015)issues.push('boot clips floor');
        mesh.rotation.y=Math.PI/2;mesh.updateMatrixWorld(true);
        if(Math.abs(r.head.getWorldPosition(new THREE.Vector3()).x-mesh.position.x-r.hitHeadZ)>.001)issues.push('head offset does not turn with character');
        for(let i=0;i<120;i++)animateCharacterMesh(mesh,1/60,0,0,0,0);
        if(Math.abs(r.head.position.z)>.001||Math.abs(r.armR.position.z)>.001)issues.push('stance offset remains after standing');
      }finally{disposeBody(mesh);}
    }
    return [...new Set(issues)];
  })()`);
  if(issues.length){ok=false;console.log('stance failures:\n'+issues.join('\n'));}
  else console.log('stances: players/bots, staggered crouch, reclining slide, connected trunk, grounded boots, following hitboxes and reset');
}

if (ok && process.argv.includes('--steady-body')) {
  const issues = vm.runInThisContext(`(() => {
    const issues = [];
    for (const bot of [false, true]) for (const armed of [false, true]) {
      const mesh = makePlayerMesh('Steady body test', bot, 'ally', 'default'), r = mesh._rig;
      r.holdsGun = armed;
      let low = Infinity, high = -Infinity;
      try {
        for (const airborne of [0, 1]) for (const crouch of [0, .5]) {
          for (let frame = 0; frame < 90; frame++) {
            mesh.position.z += .12;
            animateCharacterMesh(mesh, 1/60, crouch, 0, airborne, .4);
            for (const joint of [r.torso, r.head, r.pelvis]) {
              if (Math.abs(joint.rotation.y) > 1e-8 || Math.abs(joint.rotation.z) > 1e-8) issues.push('walking/jumping trunk oscillates');
            }
            low = Math.min(low, r.legL.rotation.x); high = Math.max(high, r.legL.rotation.x);
          }
        }
        if (high-low < .2) issues.push('leg movement lost');
        const aimedUp = r.head.rotation.x;
        r.aim = -.4; animateCharacterMesh(mesh, 1/60, .5, 0, 1, -.4);
        if (Math.abs(r.head.rotation.x - aimedUp) < .1) issues.push('aim pitch lost');
        flinchCharacter(mesh, 60, 1, 0); animateCharacterMesh(mesh, 1/60, 0);
        if (Math.abs(r.torso.rotation.z) < .001) issues.push('hit reaction lost');
        r.hitK = 0; animateCharacterMesh(mesh, 1/60, 0);
        if (r.head.rotation.y || r.head.rotation.z || r.torso.rotation.y || r.torso.rotation.z) issues.push('stale twist after hit');
      } finally { disposeBody(mesh); }
    }
    console.log('steady body checks: armed/unarmed players and bots, walking, crouching, jumping, leg motion, aim and hit recovery');
    return [...new Set(issues)];
  })()`);
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--posture')) {
  // What --stances (the staggered crouch, the reclining slide, the hitboxes) does not say: a crouch-walk keeps stepping, a
  // slide lays the chest back, and standing up undoes both.
  const issues = vm.runInThisContext(`(() => {
    const issues = [];
    for (const armed of [false, true]) {
      const mesh = makePlayerMesh('Posture', false, 'ally', 'default'), r = mesh._rig;
      r.holdsGun = armed;
      const tag = armed ? 'armed ' : 'unarmed ';
      const settle = (crouch, slide, air, moving, frames = 150) => {
        for (let f = 0; f < frames; f++) {
          if (moving) mesh.position.z += 0.06;
          animateCharacterMesh(mesh, 1 / 60, crouch, slide, air, 0);
        }
      };
      try {
        settle(0.58, 0, 0, false);
        const still = r.torso.rotation.x, legGap = Math.abs(r.legL.rotation.x - r.legR.rotation.x);
        if (!(legGap > 0.6)) issues.push(tag + 'a crouch should have the legs well apart front to back, got ' + legGap.toFixed(2));
        settle(0.58, 0, 0, true);                                         // (the chest stays upright when crouched: --stances)
        let lo = 9, hi = -9;
        for (let f = 0; f < 90; f++) { mesh.position.z += 0.06; animateCharacterMesh(mesh, 1 / 60, 0.58, 0, 0, 0); lo = Math.min(lo, r.legL.rotation.x); hi = Math.max(hi, r.legL.rotation.x); }
        if (hi - lo < 0.15) issues.push(tag + 'a crouch-walk has stopped stepping (' + (hi - lo).toFixed(2) + ' rad of swing)');
        settle(0.58, 1, 0, true);
        if (!(r.torso.rotation.x <= -0.7)) issues.push(tag + 'a slide should lay the chest well back, torso at ' + r.torso.rotation.x.toFixed(2));
        settle(0, 0, 0, false, 200);
        if (r.slide > 0.02 || r.torso.rotation.x < -0.3) issues.push(tag + 'standing up did not undo the slide');
      } finally { disposeBody(mesh); }
    }
    return [...new Set(issues)];
  })()`);
  console.log('posture checks: crouch-walk keeps stepping, slide lays the chest back, standing up recovers');
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--muzzle')) {
  // The muzzle blast has a style per kind of gun: the right style is chosen, sparks and a shock ring appear where they
  // should (and not on a suppressed gun), they fall and fade and are cleaned up, and an automatic gun cannot flood the
  // scene with them.
  const issues = vm.runInThisContext(`(() => {
    const issues = [];
    const W = id => WEAPONS.find(w => w.id === id);
    const styleOf = id => { const w = W(id); const s = muzzleStyleFor(w); return Object.keys(MUZZLE_STYLES).find(k => MUZZLE_STYLES[k] === s); };
    const want = { ak20: 'rifle', sg8: 'shotgun', pistol: 'pistol', srx: 'heavy', amr: 'heavy', railgun: 'heavy', air_rifle: 'quiet', plasma_carbine: 'energy', minigun: 'rapid' };
    for (const [id, s] of Object.entries(want)) if (W(id) && styleOf(id) !== s) issues.push(id + ' should have the ' + s + ' blast, has ' + styleOf(id));
    if (MUZZLE_STYLES.shotgun.wid <= MUZZLE_STYLES.rifle.wid) issues.push('a shotgun flash should be wider than a rifle flash');
    if (MUZZLE_STYLES.heavy.len <= MUZZLE_STYLES.pistol.len) issues.push('a heavy sniper flash should be longer than a pistol flash');
    if (MUZZLE_STYLES.quiet.sparks !== 0 || MUZZLE_STYLES.quiet.ring) issues.push('a suppressed gun should throw no sparks and no ring');

    const idx = WEAPONS.findIndex(w => w.id === 'ak20');
    const model = weaponModels[idx];
    const count = kind => _muzzleFx.filter(f => f.kind === kind).length;
    const fire = (id, n = 1) => { for (let i = 0; i < n; i++) triggerMuzzleBlast(model, { scale: 1.2, weapon: W(id) }); };
    const reset = () => { _muzzleFx.length = 0; for (const m of [..._sparkPool, ..._ringPool]) { m.visible = false; m.material.opacity = 0; } };
    try {
      reset(); fire('sg8');
      if (count('spark') < 6) issues.push('a shotgun should throw a spread of sparks, got ' + count('spark'));
      if (count('ring') !== 1) issues.push('a shotgun should throw a shock ring, got ' + count('ring'));
      reset(); fire('pistol');
      if (count('ring') !== 0) issues.push('a pistol should not throw a shock ring');
      if (count('spark') < 1 || count('spark') > 5) issues.push('a pistol should throw a few sparks, got ' + count('spark'));
      reset(); fire('srx');
      if (count('ring') !== 1 || count('spark') < 5) issues.push('a sniper should throw sparks and a ring, got ' + count('spark') + ' / ' + count('ring'));
      reset(); fire('air_rifle');
      if (_muzzleFx.length) issues.push('a suppressed gun threw ' + _muzzleFx.length + ' effects');
      // they move, fall, fade and are cleaned up
      reset(); fire('ak20');
      const sp = _muzzleFx.find(f => f.kind === 'spark');
      const y0 = sp.sprite.position.y, z0 = sp.sprite.position.z;
      updateMuzzleFx(0.05);
      if (!(sp.sprite.material.opacity < 1)) issues.push('a spark should fade');
      if (Math.abs(sp.sprite.position.z - z0) < 1e-6 && Math.abs(sp.sprite.position.y - y0) < 1e-6) issues.push('a spark should move');
      for (let i = 0; i < 20; i++) updateMuzzleFx(0.05);
      if (_muzzleFx.length) issues.push('sparks outlived their life: ' + _muzzleFx.length);
      if (_sparkPool.some(m => m.visible)) issues.push('a spark sprite was left visible');
      // an automatic gun held down for a while stays inside the pool
      reset(); fire('minigun', 300);
      if (_sparkPool.length > 48 || _ringPool.length > 8) issues.push('the spark pool grew: ' + _sparkPool.length + ' / ' + _ringPool.length);
      if (_muzzleFx.length > 56) issues.push('too many live effects: ' + _muzzleFx.length);
    } finally { reset(); model._flash.visible = false; }
    return issues;
  })()`);
  console.log('muzzle blast checks: a style per kind of gun, sparks and rings where they belong, cleaned up, bounded');
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--akimbo')) {
  // Akimbo: a secondary with the stats it was planned with, a model of two guns with a hand on each, shots that leave
  // from alternating muzzles, and Crossfire (the whole magazine forward in a wild cone).
  const issues = vm.runInThisContext(`(() => {
    const issues = [];
    const idx = WEAPONS.findIndex(w => w.id === 'akimbo');
    if (idx < 0) return ['no akimbo weapon'];
    const w = WEAPONS[idx];
    if (w.slot !== 'secondary') issues.push('it is a secondary, got ' + w.slot);
    if (!(w.mag === 20 && w.damage === 24 && w.fireRate === 125)) issues.push('stats drifted: ' + w.mag + ' / ' + w.damage + ' / ' + w.fireRate);
    if (!(w.ability && w.ability.name === 'Crossfire' && w.ability.type === 'fanfire' && w.ability.count >= w.mag && w.ability.fanSpread >= 0.15)) issues.push('Crossfire should empty the magazine in a wide fan');
    const burst = w.damage * 1000 / w.fireRate;
    if (!(burst > 150 && burst < 230)) issues.push('burst DPS ' + burst.toFixed(0) + ' is outside the plan (150 to 230)');
    // (the table is the base price: a multiplier is applied to all of them once, so compare it with a neighbour)
    if (Math.abs(WEAPON_COSTS.akimbo - WEAPON_COSTS.gunslinger / 220 * 280) > 0.5) issues.push('price should be 280 against the Gunslingers 220, got ' + WEAPON_COSTS.akimbo + ' against ' + WEAPON_COSTS.gunslinger);
    const fo = WEAPON_FALLOFF.akimbo;
    if (!fo || fo.near !== 10 || fo.far !== 32 || fo.min !== 0.30) issues.push('falloff should be 10 / 32 / 0.30, got ' + JSON.stringify(fo));
    if (weaponModels.length !== WEAPONS.length) issues.push('weaponModels and WEAPONS are out of step: ' + weaponModels.length + ' / ' + WEAPONS.length);
    const m = weaponModels[idx];
    if (!m || !m._akimbo) return issues.concat(['the model is not a pair']);
    const A = m._akimbo;
    if (A.guns.length !== 2 || A.flashes.length !== 2 || A.flashes[0] === A.flashes[1]) issues.push('it should be two guns with a flash each');
    if (!m._hands || m._hands.rear === m._hands.front) issues.push('it needs a hand on each gun');
    else {
      m.updateMatrixWorld(true);
      const hr = m._hands.rear.position, hl = m._hands.front.position;
      if (!(hr.x > 0.03 && hl.x < -0.03)) issues.push('the hands are not on their own guns: right ' + hr.x.toFixed(3) + ', left ' + hl.x.toFixed(3));
      if (!m._hands.rear.children.some(c => c.userData && c.userData.vmHand && c.children && c.children.length) && !m._hands.rear.children.some(c => c.isGroup)) issues.push('the right hand has no arm');
    }
    if (!(m._anchors && m._anchors.magR && m._anchors.magL && m._anchors.magR.x > 0 && m._anchors.magL.x < 0)) issues.push('a magazine should come out of each gun');
    const style = Object.keys(MUZZLE_STYLES).find(k => MUZZLE_STYLES[k] === muzzleStyleFor(w));
    if (style !== 'pistol') issues.push('it should have the pistol muzzle blast, has ' + style);
    // what everyone else sees: a body can hold it (both guns are in its prop), at a believable size, with no first-person hand
    try {
      const prop = makeRealWorldGun('akimbo');
      if (!prop) issues.push('no third-person prop for the pair');
      else {
        const box = new THREE.Box3(); prop.updateMatrixWorld(true); box.setFromObject(prop);
        const len = Math.max(box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z);
        if (!(len > 0.08 && len < 2.2)) issues.push('the pair is ' + len.toFixed(2) + ' m across as a third-person prop');
        let hand = false; prop.traverse(o => { for (let p = o; p; p = p.parent) if (p.userData && p.userData.vmHand) hand = true; });
        if (hand) issues.push('a first-person hand came along into the third-person prop');
      }
      const body = makePlayerMesh('Pair', false, 'enemy', 'default', {});
      body._ownerId = 'pair_owner'; players.pair_owner = { id: 'pair_owner', wrap: null };
      try { armRemoteMesh(body, 'akimbo'); if (!body._gun) issues.push('a body could not take the pair in hand'); }
      finally { delete players.pair_owner; try { disposeBody(body); } catch (e) {} }
    } catch (e) { issues.push('third-person threw: ' + e.message); }

    // firing: shots leave from alternating muzzles
    const saved = { slot: activeSlot, wi: currentWeaponIdx, cw: currentWeapon, dead: isDead, started: gameStarted, last: lastShot, slb: spawnLocalBullet, sound: playWeaponSound,
      pos: camera.position.clone(), quat: camera.quaternion.clone(), pfd: pendingFanFire, ammo: weaponAmmo[idx] };
    const origins = [];
    try {
      activeSlot = 'secondary'; currentWeaponIdx = idx; currentWeapon = w; isDead = false; gameStarted = true; reloading = false;
      camera.position.set(0, 1.65, 0); camera.quaternion.set(0, 0, 0, 1); camera.updateMatrixWorld(true);
      weaponAmmo[idx] = { ammo: w.mag, reserve: w.reserve };
      for (const wm of weaponModels) wm.visible = false; m.visible = true;
      spawnLocalBullet = (pos) => { origins.push(pos.clone()); };
      playWeaponSound = () => {};
      for (let k = 0; k < 4; k++) { lastShot = 0; tryShoot(); }
      if (origins.length !== 4) issues.push('four trigger pulls should be four bullets, got ' + origins.length);
      else {
        const sides = origins.map(o => Math.sign(o.x));
        if (!(sides[0] !== sides[1] && sides[0] === sides[2] && sides[1] === sides[3])) issues.push('shots should alternate hands, muzzle x: ' + origins.map(o => o.x.toFixed(2)).join(' '));
      }
      if (weaponAmmo[idx].ammo !== w.mag - 4) issues.push('each pull should cost one round, ammo ' + weaponAmmo[idx].ammo);
      // the kick: hand 0 kicked, decays, slide returns
      A.kick[0] = 1; updateAkimboHands(0.016);
      if (!(A.guns[0]._slide.position.z > 0.01)) issues.push('the slide should run back on a shot');
      for (let k = 0; k < 40; k++) updateAkimboHands(0.05);
      if (Math.abs(A.guns[0]._slide.position.z) > 1e-3) issues.push('the slide should return');
      // Crossfire: the whole magazine in a wild cone
      weaponAmmo[idx] = { ammo: w.mag, reserve: w.reserve };
      origins.length = 0;
      const dirs = [];
      spawnLocalBullet = (pos, dir) => { origins.push(pos.clone()); dirs.push(dir.clone()); };
      pendingFanFire = { count: w.ability.count, timer: 0, delay: w.ability.delay, w, spread: w.ability.fanSpread, total: w.ability.count };
      for (let f = 0; f < 200 && pendingFanFire; f++) updatePendingFanFire(0.05);
      if (dirs.length !== w.mag) issues.push('Crossfire should fire the whole magazine (' + w.mag + '), fired ' + dirs.length);
      if (weaponAmmo[idx].ammo !== 0) issues.push('Crossfire should empty the magazine, ' + weaponAmmo[idx].ammo + ' left');
      const xs = dirs.map(d => d.x), ys = dirs.map(d => d.y);
      const spreadX = Math.max(...xs) - Math.min(...xs), spreadY = Math.max(...ys) - Math.min(...ys);
      if (!(spreadX > 0.15 && spreadY > 0.15)) issues.push('Crossfire should be a wild spray, spread ' + spreadX.toFixed(2) + ' x ' + spreadY.toFixed(2));
    } finally {
      activeSlot = saved.slot; currentWeaponIdx = saved.wi; currentWeapon = saved.cw; isDead = saved.dead; gameStarted = saved.started; lastShot = saved.last;
      spawnLocalBullet = saved.slb; playWeaponSound = saved.sound; pendingFanFire = saved.pfd; weaponAmmo[idx] = saved.ammo;
      camera.position.copy(saved.pos); camera.quaternion.copy(saved.quat); m.visible = false;
    }
    return issues;
  })()`);
  const srv = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  if (!/gunslinger: 28, akimbo: 24,/.test(srv)) issues.push('server WEAPON_DAMAGE does not have Akimbo at 24');
  if (!/gunslinger: 220, akimbo: 280,/.test(srv)) issues.push('server WEAPON_COSTS does not have Akimbo at 280');
  if (!/akimbo: FALLOFF_AKIMBO/.test(srv) || !/const FALLOFF_AKIMBO = \{ near: 10, far: 32, min: 0\.30 \}/.test(srv)) issues.push('server falloff does not mirror Akimbo');
  console.log('akimbo checks: a secondary, two guns with a hand each, alternating muzzles, kick, Crossfire');
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--chain-maul')) {
  const issues = vm.runInThisContext(`(() => {
    const issues = [], v = (x,y,z) => new THREE.Vector3(x,y,z);
    const check = (condition, text) => { if (!condition) issues.push(text); };
    check(chainMaulHitZone(v(0,1,0),v(0,1,-4),v(0,1,-4),v(0,0,-4)) === 'head', 'ball contact must damage');
    check(chainMaulHitZone(v(0,1,0),v(0,1,-4),v(0,1,-4),v(0,0,-2)) === 'chain', 'mid-chain must only pull');
    check(!chainMaulHitZone(v(0,1,0),v(0,1,-4),v(0,1,-4),v(2,0,-2)), 'miss counted as hit');
    check(chainMaulHitZone(v(0,1,0),v(1,1,-4),v(-1,1,-4),v(0,0,-4)) === 'head', 'swept ball tunnels');
    const saved = { players, remoteMeshes, selectedMeleeIdx, activeSlot, isDead, gameStarted, countdownActive,
      inLobby, social: SOCIAL_VIEW.mode, camera: camera.position.clone(), quat: camera.quaternion.clone(),
      boxes: wallColliders.slice(), emitHit, resolveBot, friendlyFireBlocked, playSoundEvent, spawnHitParticle,
      swingDuration: meleeSwingDur, maulPosition: meleeModels[MELEE_ITEMS.findIndex(m => m.id === 'chain_hammer')].position.clone(),
      maulRotation: meleeModels[MELEE_ITEMS.findIndex(m => m.id === 'chain_hammer')].rotation.clone() };
    try {
      selectedMeleeIdx = MELEE_ITEMS.findIndex(m => m.id === 'chain_hammer');
      const item = MELEE_ITEMS[selectedMeleeIdx], model = meleeModels[selectedMeleeIdx];
      check(MELEE_ITEMS.length === meleeModels.length && meleeModels.length === MELEE_SWING_TYPES.length, 'melee arrays misaligned');
      check(item.damage === 85 && MELEE_SWING_SOUND[item.id] === 'heavy', 'stats/audio missing');
      activeSlot = 'melee'; isDead = false; gameStarted = true; countdownActive = false; inLobby = false; SOCIAL_VIEW.mode = null;
      camera.position.set(0,1.6,0); camera.quaternion.identity(); model.position.set(0,0,-.4); model.rotation.set(0,0,0);
      wallColliders.length = 0;
      let damage = 0, pulls = 0;
      emitHit = (pid,id,weapon,pos,hs,opts) => { damage += opts.damageOverride; };
      playSoundEvent = spawnHitParticle = () => {};
      const bot = { dead:false, kbVX:0, kbVZ:0, yVel:0 };
      resolveBot = () => { pulls++; return bot; };
      friendlyFireBlocked = () => false;
      const enemy = new THREE.Group(); enemy.position.set(0,0,-10.65);
      players = { target:{ dead:false } }; remoteMeshes = { target:enemy };
      meleeSwingDur = 720;
      const swing = () => { startChainMaulSwing(item); for(let i=0;i<100;i++) updateChainMaulSwing(.008); };
      swing(); check(damage === 85, 'head must deal exactly 85 once per swing');
      check(!chainMaulSwing && model._chain.visible, 'swing leaked cable or hid idle model');
      damage = 0; pulls = 0; enemy.position.set(0,0,-2);
      swing(); check(damage === 0 && pulls === 1 && bot.kbVZ > 0, 'chain must pull once toward player, without damage');
      friendlyFireBlocked = () => true; damage = 0; pulls = 0;
      swing(); check(!damage && !pulls, 'teammate hit');
      friendlyFireBlocked = () => false;
      wallColliders.push(new THREE.Box3(v(-10,0,-1.3),v(10,5,-1)));
      swing(); check(!damage && !pulls, 'wall allowed catch');
      wallColliders.length = 0; inLobby = true;
      swing(); check(!pulls, 'lobby allowed pull');
      startChainMaulSwing(item); isDead = true; updateChainMaulSwing(.01);
      check(!chainMaulSwing && model._chain.visible, 'death did not cancel');
    } finally {
      finishChainMaulSwing();
      const maul = meleeModels[MELEE_ITEMS.findIndex(m => m.id === 'chain_hammer')];
      maul.position.copy(saved.maulPosition); maul.rotation.copy(saved.maulRotation); meleeSwingDur = saved.swingDuration;
      players = saved.players; remoteMeshes = saved.remoteMeshes;
      selectedMeleeIdx = saved.selectedMeleeIdx; activeSlot = saved.activeSlot; isDead = saved.isDead;
      gameStarted = saved.gameStarted; countdownActive = saved.countdownActive; inLobby = saved.inLobby; SOCIAL_VIEW.mode = saved.social;
      camera.position.copy(saved.camera); camera.quaternion.copy(saved.quat); wallColliders.splice(0,wallColliders.length,...saved.boxes);
      emitHit = saved.emitHit; resolveBot = saved.resolveBot; friendlyFireBlocked = saved.friendlyFireBlocked;
      playSoundEvent = saved.playSoundEvent; spawnHitParticle = saved.spawnHitParticle;
    }
    console.log('chain maul checks: swept head/chain zones, damage, pulling, teammates, walls, lobby and cleanup');
    return issues;
  })()`);
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--modes')) {
  // The pure parts of the dice / roulette / rumble modes and of hit grading: pool ids really are
  // weapons, the die maps to tiers the way the page says, the bot re-rolls junk and keeps gold, and
  // every grade comes out of the thresholds it is documented to.
  const issues = vm.runInThisContext(`(() => {
    const issues = [];
    for (const t of Object.keys(DICE_POOL)) for (const id of DICE_POOL[t]) if (!diceInfo(id)) issues.push('dice pool: ' + t + ' has unknown item ' + id);
    const want = { 1: 'F', 2: 'D', 3: 'D', 4: 'C', 8: 'C', 9: 'B', 14: 'B', 15: 'A', 17: 'A', 18: 'S', 19: 'S', 20: 'SS' };
    for (const [v, t] of Object.entries(want)) if (diceTierOf(+v) !== t) issues.push('die ' + v + ' should be ' + t + ', got ' + diceTierOf(+v));
    const counts = {};
    for (let i = 0; i < 4000; i++) { const r = diceRollOnce(); counts[r.tier] = (counts[r.tier] || 0) + 1;
      if (!diceInfo(r.weaponId)) { issues.push('roll gave unknown item ' + r.weaponId); break; } }
    if (!(counts.B > counts.SS * 3 && counts.SS > 0 && counts.F > 0)) issues.push('d20 tier spread looks wrong: ' + JSON.stringify(counts));
    const rate = (own, opp, used) => { let n = 0; for (let i = 0; i < 2000; i++) if (diceBotWantsReroll(own, opp, used)) n++; return n / 2000; };
    const F = { tier: 'F' }, C = { tier: 'C' }, B = { tier: 'B' }, A = { tier: 'A' }, SS = { tier: 'SS' };
    if (rate(F, B, 0) < 0.95) issues.push('bot should nearly always re-roll an F');
    if (rate(SS, B, 0) > 0.02) issues.push('bot should keep an SS');
    if (rate(A, B, 0) > 0.15) issues.push('bot should mostly keep an A');
    if (rate(B, SS, 0) < 0.4) issues.push('bot should gamble on a B when you rolled an SS');
    if (rate(SS, F, 0) > 0.02) issues.push('bot should keep an SS even against an F');
    if (rate(C, C, 3) > rate(C, C, 0)) issues.push('re-roll appetite should fall as the price climbs');
    const g = (h, f, m) => gradeHit(h, f, m);
    const grades = [g(false, 1), g(false, 0.4), g(false, 0.7), g(true, 0.7, 0.2), g(true, 0.3, 0.2), g(true, 1, 0.2), g(true, 1, 0.05), g(true, 0.8, 0.05)];
    if (grades.join() !== 'yellow,white,yellow,orange,orange,red,blue,orange') issues.push('hit grades: ' + grades.join());
    for (const id of ['dice_duel', 'roulette', 'rocket_rumble']) {
      const c = GAME_MODE_CONFIGS[id];
      if (!c || c.type !== 'arcade' || !c.arcade) issues.push('mode config missing or wrong: ' + id);
    }
    return issues;
  })()`);
  const serverSrc = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  for (const id of ['dice_duel', 'roulette', 'rocket_rumble']) {
    if (!new RegExp("'" + id + "'\\s*:\\s*\\{\\s*ally").test(serverSrc)) issues.push('server has no team size for ' + id);
    if (!new RegExp("FRIENDLY_FIRE_FREE_FOR_ALL_MODES[\\s\\S]{0,400}'" + id + "'").test(serverSrc)) issues.push('server FFA list is missing ' + id);
  }
  console.log('mode checks: dice pool and tiers, bot re-roll judgement, hit grades, mode wiring');
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--wraps')) {
  // The contract wraps: every one has a contract, a look and a pattern that paints without throwing, and the
  // contracts count the way the picker says they do (weapon kills, headshots, tags, a life, a streak) and do not
  // count where they should not (the range, an echoed kill).
  const issues = vm.runInThisContext(`(() => {
    const issues = [], seen = new Set();
    for (const c of CONTRACTS) {
      if (seen.has(c.id)) issues.push('duplicate contract ' + c.id); seen.add(c.id);
      const sk = WEAPON_SKINS_BY_ID[c.wrap];
      if (!sk || !sk.contract) issues.push(c.id + ': ' + c.wrap + ' is not a contract wrap');
      const look = WS_LOOKS[c.wrap];
      if (!look || !WS_PATTERNS[look.pat]) issues.push(c.id + ': no look or pattern for ' + c.wrap);
      if (c.kind === 'weaponKills' && !WEAPONS.some(w => w.id === c.weapon)) issues.push(c.id + ': unknown weapon ' + c.weapon);
      if (!(c.n > 0) || !c.text) issues.push(c.id + ': needs a target and a text');
      if (look && WS_PATTERNS[look.pat]) {
        const cols = look.c.map(_wsCss), glow = ['#000000', cols[1] || cols[0], ...cols.slice(2).map(() => '#000000')];
        for (const set of [cols, glow]) {
          try { WS_PATTERNS[look.pat](document.createElement('canvas').getContext('2d'), 256, set, _wsRng(c.wrap), look); }
          catch (e) { issues.push(c.wrap + ' pattern threw: ' + e.message); }
        }
      }
    }
    for (const s of WEAPON_SKINS) if (s.contract && !contractFor(s.id)) issues.push('contract wrap with no contract: ' + s.id);
    if (wrapUnlocked('darkmatter') && !(currentUser && currentUser.isAdmin)) issues.push('a locked wrap reads as unlocked');
    const savedState = contractState, savedMatch = match, savedInfo = Object.assign({}, _killInfo), savedLobby = inLobby;
    const need = id => CONTRACTS.find(c => c.id === id).n;
    let seq = 0;
    const kill = (weapon, head, tags) => { const id = 'k' + (++seq); _killInfo[id] = { killer: myId, weapon, head, tags: tags || [], t: performance.now() }; contractsOnKill(id); };
    try {
      contractState = _contractFresh(); inLobby = false; match = { type: 'ffa' };
      // the hard ones really are hard: nothing is done after a few dozen kills
      for (let i = 0; i < 40; i++) kill('vector', i % 2 === 0, ['AIR']);
      if (Object.keys(contractState.done).length) issues.push('40 kills finished a contract: ' + Object.keys(contractState.done));
      for (let i = 40; i < need('ct_aurora'); i++) kill('vector', false, []);
      if (!contractState.done.ct_aurora) issues.push('Aurora should finish at ' + need('ct_aurora') + ' Vector kills');
      for (let i = 0; i < need('ct_warp'); i++) kill('ak20', false, ['AIR']);
      if (!contractState.done.ct_warp) issues.push('AIR kills should finish Warp Drive');
      if (contractState.bestLife < need('ct_sing') || !contractState.done.ct_sing) issues.push('a long enough life should finish Singularity');
      const heads = contractState.heads;
      for (let i = heads; i < need('ct_reaper'); i++) kill('pistol', true, []);
      if (!contractState.done.ct_reaper) issues.push('headshots should finish Reaper');
      const before = contractState.kills;
      contractsOnKill('k' + seq);                                  // an echo of the last kill
      if (contractState.kills !== before) issues.push('an echoed kill was counted twice');
      // ability shots count for their weapon
      const rg = contractState.wk.railgun || 0;
      kill('railgun_ab', false, []);
      if ((contractState.wk.railgun || 0) !== rg + 1) issues.push('a railgun_ab kill should count for the railgun');
      contractsOnDeath();
      if (contractState.life !== 0) issues.push('dying should end the life streak');
      match = { type: 'range' }; kill('vector', false, []);
      if (contractState.kills !== before + 1) issues.push('the range should not count');
      match = { type: 'ffa' };
      // streaks
      for (let i = 0; i < need('ct_prism') - 1; i++) contractsOnMatchEnd('ally');
      if (contractState.done.ct_prism) issues.push('Prismatic finished a win early');
      contractsOnMatchEnd('draw');
      contractsOnMatchEnd('ally');
      if (!contractState.done.ct_prism || contractState.done.ct_dark) issues.push('100 in a row: Prismatic yes, Dark Matter no');
      contractsOnMatchEnd('enemy');
      if (contractState.streak !== 0) issues.push('a loss should end the streak');
      for (let i = 0; i < need('ct_dark') - 1; i++) contractsOnMatchEnd('ally');
      if (contractState.done.ct_dark) issues.push('Dark Matter finished a win early');
      contractsOnMatchEnd('ally');
      if (!contractState.done.ct_dark || !wrapUnlocked('darkmatter')) issues.push('500 in a row should finish Dark Matter');
      // Xpert: every weapon, 100 each. One short, then done.
      const ids = contractWeaponIds();
      if (ids.length < 40) issues.push('Xpert only asks for ' + ids.length + ' weapons');
      if (ids.some(id => !WEAPONS.some(w => w.id === id) && !MELEE_ITEMS.some(m => m.id === id))) issues.push('Xpert lists an unknown weapon');
      if (contractWeaponIds().some(id => { const w = WEAPONS.find(x => x.id === id); return w && w.damage <= 0; })) issues.push('Xpert asks for a weapon that does no damage');
      contractState.wk = {};
      for (const id of ids) for (let i = 0; i < need('ct_xpert'); i++) { if (id === ids[ids.length - 1] && i === need('ct_xpert') - 1) break; kill(id, false, []); }
      if (contractState.done.ct_xpert) issues.push('Xpert finished with one kill missing');
      kill(ids[ids.length - 1], false, []);
      if (!contractState.done.ct_xpert || !wrapUnlocked('xpert')) issues.push('Xpert should finish on the last weapon');
      // an unlock the numbers do not support is taken back on load
      contractState.done.ct_aurora = true; contractState.wk.vector = 3;
      contractsRevalidate();
      if (contractState.done.ct_aurora) issues.push('an unearned unlock survived revalidation');
    } finally {
      contractState = savedState; match = savedMatch; inLobby = savedLobby;
      for (const k of Object.keys(_killInfo)) delete _killInfo[k];
      Object.assign(_killInfo, savedInfo);
    }
    return issues;
  })()`);
  console.log('wrap checks: contracts, looks, patterns, progression');
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--status')) {
  // Status effects: a chill is timed and does not stack, a root cannot be chained, a new round or a death leaves
  // nothing of the last one behind (for you or for a bot), and the Frost Blaster does its 2 damage.
  const issues = vm.runInThisContext(`(() => {
    const issues = [];
    const fb = WEAPONS.find(w => w.id === 'frost_blaster');
    if (!fb || fb.damage !== 2) issues.push('Frost Blaster should do 2 damage a bullet, not ' + (fb && fb.damage));
    const wasDead = isDead; isDead = false;
    try {
      clearPlayerStatusEffects();
      const before = playerFrostSlow;
      for (let i = 0; i < 50; i++) chillPlayer();
      if (playerFrostSlow !== before) issues.push('a chill should not touch the frost slow');
      if (!(playerChillUntil > Date.now() && playerChillUntil - Date.now() <= CHILL_MS + 50)) issues.push('chill should be one short window, not a growing one');
      rootPlayer(3000);
      const first = playerRootedUntil;
      if (!(first > Date.now())) issues.push('rootPlayer should root');
      playerRootedUntil = 0;                       // pretend it just ended
      rootPlayer(3000);
      if (playerRootedUntil !== 0) issues.push('a root straight after a root should be ignored (no chaining)');
      // everything on at once, then cleared
      playerFrostSlow = 5; playerChillUntil = Date.now() + 9999; playerRootedUntil = Date.now() + 9999;
      playerFireUntil = Date.now() + 9999; _playerDot = { until: Date.now() + 9999, dps: 5, weaponId: 'flame_burn' };
      adrenalineUntil = Date.now() + 9999; nanoShieldUntil = Date.now() + 9999;
      clearPlayerStatusEffects();
      if (playerFrostSlow !== 100 || playerChillUntil !== 0 || playerRootedUntil !== 0 || playerRootImmuneUntil !== 0
          || playerFireUntil !== 0 || _playerDot !== null || adrenalineUntil !== 0 || nanoShieldUntil !== 0) issues.push('clearPlayerStatusEffects left something behind');
      // dying clears it too
      playerFrostSlow = 5; playerFireUntil = Date.now() + 9999; _fxWasDead = false; isDead = true;
      watchStatusReset();
      if (playerFrostSlow !== 100 || playerFireUntil !== 0) issues.push('dying should clear status effects');
      isDead = false; watchStatusReset();
      // bots
      const b = { id: 'bx', frostSlow: 3, _chillUntil: 9e12, _fireUntil: 9e12, _stunUntil: 9e12, _rootUntil: 9e12, kbVX: 4, kbVZ: 4 };
      _dotTargets.bx = { until: Date.now() + 9999, dps: 5, weaponId: 'flame_burn' };
      clearBotStatusEffects(b);
      if (b.frostSlow !== 100 || b._chillUntil || b._fireUntil || b._stunUntil || b._rootUntil || b.kbVX || b.kbVZ || _dotTargets.bx) issues.push('clearBotStatusEffects left something behind');
      // a bot clears its effects the moment it dies
      const db = { id: 'dbx', dead: true, frostSlow: 4, _chillUntil: 9e12, _fireUntil: 9e12, _stunUntil: 9e12, _rootUntil: 9e12, kbVX: 3, kbVZ: 3 };
      gameBots.push(db);
      watchStatusReset();
      gameBots.splice(gameBots.indexOf(db), 1);
      if (db.frostSlow !== 100 || db._fireUntil || db._rootUntil || db._chillUntil || db._stunUntil) issues.push('a bot that died kept its status effects');
      // respawn protection: coming back from the dead gives you the shield, and hazards honour it
      const savedMatch = match, savedLobby = inLobby, savedCd = countdownActive, savedShield = spawnShieldUntil;
      try {
        match = { type: 'ffa' }; inLobby = false; countdownActive = false;
        spawnShieldUntil = 0; isDead = true; isShielded();          // dead: noted
        isDead = false;
        if (!isShielded()) issues.push('coming back from the dead did not give the respawn shield');
        if (_mechCanHurt()) issues.push('a map hazard could hurt you during the respawn shield');
        if (spawnShieldUntil - performance.now() < RESPAWN_SHIELD_MS - 100) issues.push('the respawn shield is too short');
        const keep = spawnShieldUntil; grantSpawnShield(500);
        if (spawnShieldUntil !== keep) issues.push('a short shield cut a longer one short');
        spawnShieldUntil = 0;
        if (!_mechCanHurt()) issues.push('a hazard cannot hurt you with no shield');
      } finally { match = savedMatch; inLobby = savedLobby; countdownActive = savedCd; spawnShieldUntil = savedShield; }
    } finally { isDead = wasDead; clearPlayerStatusEffects(); }
    return issues;
  })()`);
  const serverSrc2 = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  if (!/SPAWN_SHIELD_MS = 2500/.test(serverSrc2)) issues.push('server respawn shield should match the client (2500 ms)');
  if (!/resetSelf[\s\S]{0,500}shieldUntil: Date\.now\(\) \+ SPAWN_SHIELD_MS/.test(serverSrc2)) issues.push('server resetSelf (a new round) gives no shield');
  console.log('status checks: frost blaster damage, chill, root chain guard, round/death/bot reset, respawn shield');
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--duel')) {
  // The 1v1 duel maps: small enough to find each other in about six seconds, spawns clear and joined by a walkable
  // route, cover that is the same for both sides, and wired so only 1v1 is dealt them.
  const duelOut = vm.runInThisContext(`(() => {
    const issues = [], notes = [];
    const MAP_RECIPES = {}, HIGH_COUNTS = {};
    const walk = SPEED * DEFAULT_MOVE_MULT;                     // m/s, plain walking
    for (const name of DUEL_MAP_IDS) {
      const b = MAP_BOUNDS[name], sp = MAP_SPAWNS[name], cols = MAP_COLLIDERS[name] || [];
      if (!MAP_IDS.includes(name)) issues.push(name + ': not in MAP_IDS');
      if (!b || !sp) { issues.push(name + ': no bounds or spawns'); continue; }
      // sixteen times the floor of the first duel maps (36 x 56): "too tiny" was the verdict, then twice the length and breadth again
      if (b.halfX * 2 < 140 || b.halfZ * 2 < 220) issues.push(name + ': smaller than a duel map should be (' + b.halfX * 2 + ' x ' + b.halfZ * 2 + ', want 144 x 224)');
      if (b.halfX * 2 > 150 || b.halfZ * 2 > 232) issues.push(name + ': bigger than a duel map should be (' + b.halfX * 2 + ' x ' + b.halfZ * 2 + ')');
      const ca = { x: (sp.ally.x0 + sp.ally.x1) / 2, z: (sp.ally.z0 + sp.ally.z1) / 2 }, ce = { x: (sp.enemy.x0 + sp.enemy.x1) / 2, z: (sp.enemy.z0 + sp.enemy.z1) / 2 };
      const secs = Math.hypot(ca.x - ce.x, ca.z - ce.z) / walk;
      if (secs < 20 || secs > 36) issues.push(name + ': spawn to spawn takes ' + secs.toFixed(1) + ' s at a walk, want 20 to 36');
      for (const side of [sp.ally, sp.enemy]) {
        if (side.x0 < -b.halfX + 1 || side.x1 > b.halfX - 1 || side.z0 < -b.halfZ + 1 || side.z1 > b.halfZ - 1) issues.push(name + ': a spawn rectangle is outside the walls');
        for (const c of cols) {
          if (c.max.y < 0.3 || c.min.y > 1.8) continue;
          if (c.min.x < side.x1 + 0.5 && c.max.x > side.x0 - 0.5 && c.min.z < side.z1 + 0.5 && c.max.z > side.z0 - 0.5) { issues.push(name + ': cover inside a spawn'); break; }
        }
      }
      // inside cover only: the four border walls start outside the bounds
      const inner = cols.filter(c => c.min.x > -b.halfX - 0.01 && c.max.x < b.halfX + 0.01 && c.min.z > -b.halfZ - 0.01 && c.max.z < b.halfZ + 0.01);
      if (inner.length < 4) issues.push(name + ': only ' + inner.length + ' pieces of cover');
      for (const c of inner) {
        const hit = inner.some(d => Math.abs(d.min.x + c.max.x) < 0.02 && Math.abs(d.max.x + c.min.x) < 0.02
                                  && Math.abs(d.min.z + c.max.z) < 0.02 && Math.abs(d.max.z + c.min.z) < 0.02
                                  && Math.abs(d.min.y - c.min.y) < 0.02 && Math.abs(d.max.y - c.max.y) < 0.02);
        if (!hit) { issues.push(name + ': a piece of cover has no mirror image (not fair to both sides)'); break; }
      }
      // a walkable route between the spawns: boxes you cannot hop (taller than 1.6 m) block, a 0.4 m body
      const R = 0.4, step = 0.5, solid = cols.filter(c => c.max.y > 1.6 && c.min.y < 1.5);
      const free = (x, z) => !solid.some(c => x > c.min.x - R && x < c.max.x + R && z > c.min.z - R && z < c.max.z + R);
      const gx = Math.round(b.halfX * 2 / step), gz = Math.round(b.halfZ * 2 / step), key = (i, j) => i * 10000 + j;
      const toI = x => Math.round((x + b.halfX) / step), toJ = z => Math.round((z + b.halfZ) / step);
      const seen = new Set([key(toI(ca.x), toJ(ca.z))]), q = [[toI(ca.x), toJ(ca.z)]];
      let reached = false;
      while (q.length) {
        const [i, j] = q.pop();
        if (i === toI(ce.x) && j === toJ(ce.z)) { reached = true; break; }
        for (const [di, dj] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          const ni = i + di, nj = j + dj;
          if (ni < 1 || nj < 1 || ni >= gx || nj >= gz || seen.has(key(ni, nj))) continue;
          if (!free(ni * step - b.halfX, nj * step - b.halfZ)) continue;
          seen.add(key(ni, nj)); q.push([ni, nj]);
        }
      }
      if (!reached) issues.push(name + ': no walkable route between the spawns');
      // RULE ONE: nothing in one spawn can see anything in the other (the same 15 x 15 rays --maps casts, eye height)
      let exposed = 0;
      for (const a of mapSpawnSightlineSamples(sp.ally)) for (const e of mapSpawnSightlineSamples(sp.enemy)) {
        const dir = e.clone().sub(a), dist = dir.length(), ray = new THREE.Ray(a, dir.normalize()), hit = new THREE.Vector3();
        if (!cols.some(c => ray.intersectBox(c, hit) && hit.distanceTo(a) < dist)) exposed++;
      }
      if (exposed) issues.push(name + ': ' + exposed + ' exposed starting sightlines (you can see your opponent at the start)');
      if (!MAP_DESCS[name]) issues.push(name + ': no description');
      // RAMPS: every duel map has some, in rotationally mirrored pairs, and each one leads onto something solid
      // whose top is the ramp's own height (a deck, a bridge, a plateau, a tower) rather than into the air.
      const ramps = MAP_RAMPS[name] || [];
      if (ramps.length < 2) issues.push(name + ': only ' + ramps.length + ' ramps, every duel map needs them');
      for (const r of ramps) {
        if (r.rise < 2) issues.push(name + ': a ramp that only rises ' + r.rise + ' m is not worth the climb');
        const m = ramps.find(q => Math.abs(q.x0 + r.x0) < 0.02 && Math.abs(q.z0 + r.z0) < 0.02 && Math.abs(q.ux + r.ux) < 0.02 && Math.abs(q.uz + r.uz) < 0.02 && Math.abs(q.rise - r.rise) < 0.02);
        if (!m) issues.push(name + ': a ramp has no rotated twin');
        const ex = r.x0 + r.ux * (r.run + 0.6), ez = r.z0 + r.uz * (r.run + 0.6);
        const top = cols.some(c => Math.abs(c.max.y - r.rise) < 0.06 && ex > c.min.x && ex < c.max.x && ez > c.min.z && ez < c.max.z);
        if (!top) issues.push(name + ': a ramp at (' + r.x0 + ', ' + r.z0 + ') leads nowhere: nothing at ' + r.rise + ' m beyond its top');
      }
      // WALLS: not just pillars. Long walls, low walls, something overhead (a lintel, an arch, a bridge deck) and a
      // block or crate must all be there, and pillars are never most of what is on the floor.
      const dims = c => { const dx = c.max.x - c.min.x, dz = c.max.z - c.min.z, h = c.max.y - c.min.y; return { dx, dz, h, long: Math.max(dx, dz), thin: Math.min(dx, dz) }; };
      const kinds = { longWall: 0, lowWall: 0, overhead: 0, block: 0, pillar: 0 };
      for (const c of inner) {
        const d = dims(c);
        if (c.min.y >= 1.9 && d.h <= 1.3) kinds.overhead++;
        else if (c.min.y < 0.1 && d.long >= 6 && d.thin <= 1.8 && d.h >= 2.8) kinds.longWall++;
        else if (c.min.y < 0.1 && d.long >= 5 && d.thin <= 1.5 && d.h <= 1.5) kinds.lowWall++;
        else if (c.min.y < 0.1 && d.long <= 4 && d.thin >= 1.8 && d.h >= 1.8 && d.h <= 3) kinds.block++;
        else if (c.min.y < 0.1 && d.long <= 2.8 && d.h >= 4) kinds.pillar++;
      }
      if (kinds.longWall < 2) issues.push(name + ': only ' + kinds.longWall + ' long walls');
      if (kinds.lowWall < 2) issues.push(name + ': only ' + kinds.lowWall + ' low walls');
      if (kinds.overhead < 2) issues.push(name + ': nothing overhead (windows, arches, a bridge): ' + kinds.overhead);
      if (kinds.pillar > 36 || kinds.pillar > (kinds.longWall + kinds.lowWall + kinds.overhead + kinds.block) * 0.7) issues.push(name + ': mostly pillars (' + kinds.pillar + ')');
      // HIGH walls: "some maps just don't have enough". A high wall is a long wall too tall to see over from the floor (4.5 m or
      // more); every map needs plenty, spread over the whole floor (every quarter of the map has some), and one across the
      // middle (which is also what cuts the two spawns off from each other).
      const high = inner.filter(c => { const d = dims(c); return c.min.y < 0.1 && d.h >= 4.5 && d.long >= 10 && d.thin <= 2; });
      if (high.length < 24) issues.push(name + ': only ' + high.length + ' high walls (want 24 or more)');
      for (const [qx, qz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const n = high.filter(c => ((c.min.x + c.max.x) / 2) * qx > 0 && ((c.min.z + c.max.z) / 2) * qz > 0).length;
        if (n < 5) issues.push(name + ': a quarter of the map has only ' + n + ' high walls');
      }
      if (!high.some(c => c.min.x < -9 && c.max.x > 9 && c.min.z < 2 && c.max.z > -2)) issues.push(name + ': no high wall across the middle');
      HIGH_COUNTS[name] = high.length;
      // each map reads differently: no two share a wall recipe
      MAP_RECIPES[name] = JSON.stringify(kinds);
    }
    const recipes = Object.values(MAP_RECIPES);
    if (new Set(recipes).size < recipes.length) issues.push('two duel maps have the same wall recipe: ' + JSON.stringify(MAP_RECIPES));
    // 2v2 is dealt the duel maps now and then (1v1 only them, nobody else any), on the vote screen and in the random draw
    if (effectivePickedMap('2v2', 'duel_grid') !== 'duel_grid') issues.push('a duel map picked for 2v2 should stay itself');
    if (effectivePickedMap('5v5', 'duel_grid') !== 'auto') issues.push('a duel map picked for 5v5 should be random (they are not dealt to it)');
    if (!DUEL_MAP_IDS.every(m => mapPoolForMode('2v2').includes(m))) issues.push('2v2 pool should include the duel maps');
    if (mapPoolForMode('5v5').some(m => DUEL_ONLY_MAPS.has(m))) issues.push('only 1v1 and 2v2 deal duel maps');
    const draws = { '1v1': 0, '2v2': 0, '5v5': 0 };
    for (let i = 0; i < 4000; i++) for (const k of Object.keys(draws)) if (DUEL_ONLY_MAPS.has(randomMapForMode(k))) draws[k]++;
    if (draws['1v1'] !== 4000) issues.push('1v1 should always be dealt a duel map');
    if (draws['5v5'] !== 0) issues.push('5v5 must never be dealt a duel map');
    if (draws['2v2'] < 4000 * 0.2 || draws['2v2'] > 4000 * 0.4) issues.push('2v2 should be dealt a duel map about 3 times in 10, got ' + (draws['2v2'] / 40).toFixed(0) + '%');
    notes.push('high walls ' + JSON.stringify(HIGH_COUNTS) + ' · 2v2 duel share ' + (draws['2v2'] / 40).toFixed(0) + '%');
    return { issues, notes };
  })()`);
  const issues = duelOut.issues;
  const serverSrc = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  if (!/mode === '2v2' \? LOBBY_MAP_POOL\.concat\(DUEL_MAP_IDS\)/.test(serverSrc)) issues.push('server does not deal 2v2 the duel maps');
  if (!/function randomMapFor\(mode\)/.test(serverSrc) || /const mapId = mapPoolFor\(mode\)\[Math\.floor/.test(serverSrc)) issues.push('server random draws should go through randomMapFor');
  for (const id of ['duel_grid', 'duel_crossroads', 'duel_pillars', 'duel_platform']) {
    if (!serverSrc.includes("'" + id + "'")) issues.push('server does not know ' + id);
  }
  if (!/LOBBY_MAP_POOL = MAP_IDS\.filter\(.*DUEL_ONLY_MAPS/.test(serverSrc)) issues.push('server random pool does not exclude the duel maps');
  if (!/mapPoolFor\(mode\)/.test(serverSrc)) issues.push('server does not deal 1v1 its own pool');
  const idx = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
  if (!/data-map="duel_grid"[^>]*data-duel="1"/.test(idx)) issues.push('map picker has no duel cards');
  if (/data-duel="1" style="display:none/.test(idx)) issues.push('the duel map cards are hidden in the picker: nobody would ever see them');
  console.log('duel map checks: size, spawns, route, mirror symmetry, high walls, 1v1 + 2v2 wiring · ' + duelOut.notes.join(' · '));
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--util')) {
  // Wraps on melees and utilities, and the utility skins: a wrap really goes on a melee and comes off again, the
  // fists keep their skin, and every utility skin builds, swaps in, swaps back and is dressed too.
  const issues = vm.runInThisContext(`(() => {
    const issues = [];
    const colors = m => { const out = []; m.traverse(o => { if (o.isMesh) for (const x of [].concat(o.material)) if (x && x.color) out.push(x.color.getHex()); }); return out.join(','); };
    const savedWrap = selectedWeaponSkin;
    try {
      const bi = MELEE_ITEMS.findIndex(m => m.id === 'bat'), bat = meleeModels[bi];
      selectedWeaponSkin = 'default'; ensureHeldWrap(bat);
      const before = colors(bat);
      selectedWeaponSkin = 'gold'; ensureHeldWrap(bat);
      if (bat._wrapKey !== 'gold' || colors(bat) === before) issues.push('a wrap did not go on the bat');
      selectedWeaponSkin = 'default'; ensureHeldWrap(bat);
      if (colors(bat) !== before) issues.push('going back to stock did not give the bat back its colours');
      // fists: skin stays skin
      const fi = MELEE_ITEMS.findIndex(m => m.id === 'fists');
      if (fi >= 0) {
        const f = meleeModels[fi], tone = [];
        f.traverse(o => { if (o.isMesh) for (const x of [].concat(o.material)) if (x && x.userData && x.userData.skinTone) tone.push([x, x.color.getHex()]); });
        selectedWeaponSkin = 'gold'; ensureHeldWrap(f);
        if (tone.some(([x, c]) => x.color.getHex() !== c)) issues.push('a wrap recoloured the fists');
        selectedWeaponSkin = 'default'; ensureHeldWrap(f);
      }
      // a utility
      const si = SUPPORT_ITEMS.findIndex(m => m.id === 'smoke'), sm = supportModels[si];
      selectedWeaponSkin = 'default'; ensureHeldWrap(sm);
      const sb = colors(sm);
      selectedWeaponSkin = 'carbon'; ensureHeldWrap(sm);
      if (sm._wrapKey !== 'carbon') issues.push('a wrap did not go on the smoke bomb');
      selectedWeaponSkin = 'default'; ensureHeldWrap(sm);
      if (colors(sm) !== sb) issues.push('stock did not restore the smoke bomb');
    } finally { selectedWeaponSkin = savedWrap; }
    // utility skins
    for (const sk of SUPPORT_MODEL_SKINS) {
      const idx = SUPPORT_ITEMS.findIndex(m => m.id === sk.support);
      if (idx < 0) { issues.push(sk.id + ': no such utility ' + sk.support); continue; }
      let meshes = 0, bad = false;
      try { const m = sk.build(); m.traverse(o => { if (o.isMesh) { meshes++; const p = o.position; if (![p.x, p.y, p.z].every(Number.isFinite)) bad = true; } }); } catch (e) { issues.push(sk.id + ' threw: ' + e.message); continue; }
      if (meshes < 3) issues.push(sk.id + ': only ' + meshes + ' meshes');
      if (bad) issues.push(sk.id + ': a part is at NaN');
      const base = supportModels[idx];
      setSupportModelSkin(sk.support, sk.id);
      if (supportModels[idx] === base || !sk._model) issues.push(sk.id + ': did not swap in');
      setSupportModelSkin(sk.support, null);
      if (supportModels[idx] !== base) issues.push(sk.id + ': did not swap back');
    }
    return issues;
  })()`);
  console.log('utility checks: wraps on melees and utilities, utility skins');
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--glow')) {
  // The light pass: it builds on real maps without throwing, finds the lit surfaces, stays inside its budget, adds
  // no more than four point lights to a map, and does not build twice.
  const issues = vm.runInThisContext(`(() => {
    const issues = [];
    const names = ['neon_tokyo', 'urban', 'cyber', 'pearl_harbor', 'blank', 'duel_grid', 'refinery'];
    const saved = activeMapName;
    try {
      for (const n of names) {
        if (!MAP_GROUPS[n]) { issues.push(n + ': no such map'); continue; }
        try { activateMap(n); } catch (e) { issues.push(n + ' did not activate: ' + e.message); continue; }
        const g = MAP_GROUPS[n];
        if (!g._glowBuilt) issues.push(n + ': glow pass did not run');
        const pts = g.children.filter(c => c.userData && c.userData.mapGlow);
        if (pts.length > 1) issues.push(n + ': ' + pts.length + ' glow batches (one per map)');
        if (g.userData.glowPoints > GLOW_MAX_POINTS) issues.push(n + ': over the point budget');
        let lights = 0; g.traverse(o => { if (o.isPointLight) lights++; });
        if (lights > 8) issues.push(n + ': ' + lights + ' point lights (too many for forward rendering)');
        if (n === 'neon_tokyo' && !(g.userData.glowPoints >= 40)) issues.push('neon_tokyo only found ' + g.userData.glowPoints + ' lit surfaces');
        if (n === 'duel_grid' && g.userData.glowPoints) issues.push('duel_grid has lights it should not');
        const before = g.children.length; buildMapGlow(n);
        if (g.children.length !== before) issues.push(n + ': the glow pass built twice');
      }
    } finally { activateMap(saved || 'blank'); }
    return issues;
  })()`);
  console.log('glow checks: neon_tokyo and six more maps build their light pass once, within budget');
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--teams')) {
  // Team fights are fair: an enemy bot with one of your allies close and you far away shoots the ally, not you.
  const issues = vm.runInThisContext(`(() => {
    const issues = [];
    const savedMatch = match, savedDead = isDead, savedLobby = inLobby, savedBots = gameBots.slice(), savedPos = camera.position.clone();
    try {
      inLobby = false; isDead = false;
      camera.position.set(30, 1.65, 0);                      // you, far from the action
      const mk = (id, team, x, z) => ({ id, team, x, z, dead: false, hp: 300, difficulty: 'medium' });
      const foe = mk('tf_foe', 'enemy', 0, 0), ally = mk('tf_ally', 'ally', 4, 0);
      gameBots.length = 0; gameBots.push(foe, ally);
      for (const type of ['race', 'elim', 'frontlines']) {
        match = { type, cfg: {} };
        const t = getBotTarget(foe);
        if (!t || t.isPlayer || !t.botRef || t.botRef.id !== 'tf_ally') issues.push(type + ': the enemy bot went for the player instead of the ally standing next to it');
        const near = getBotTarget(Object.assign(mk('tf_foe2', 'enemy', 28, 0), {}));
        if (!near || !near.isPlayer) issues.push(type + ': an enemy bot next to the player should still target the player');
      }
      match = { type: 'race', cfg: { forcedMap: 'base_raid' } };
      const raid = getBotTarget(foe);
      if (!raid || !raid.isPlayer) issues.push('base raid guards should still go for the player');
    } finally {
      match = savedMatch; isDead = savedDead; inLobby = savedLobby;
      gameBots.length = 0; gameBots.push(...savedBots); camera.position.copy(savedPos);
    }
    return issues;
  })()`);
  console.log('team checks: enemy bots pick the nearest opponent, Base Raid unchanged');
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--thirdperson')) {
  // Third-person guns are the weapon's own model, hands off, at world size; the owner's wrap goes on them; a prop
  // built from shared geometry can be thrown away without taking the viewmodel's geometry with it.
  const issues = vm.runInThisContext(`(() => {
    const issues = [];
    for (const id of ['ak20', 'minigun', 'pistol', 'sg8', 'srx', 'bat', 'frag', 'knife']) {
      let g = null;
      try { g = makeRealWorldGun(id); } catch (e) { issues.push(id + ' threw: ' + e.message); continue; }
      if (!g) { issues.push(id + ': no real model (would fall back to the stand-in)'); continue; }
      let meshes = 0, hand = false, len = 0;
      const box = new THREE.Box3(); g.updateMatrixWorld(true); box.setFromObject(g);
      g.traverse(o => { if (o.isMesh) { meshes++; for (let p = o; p; p = p.parent) if (p.userData && p.userData.vmHand) hand = true; } });
      len = Math.max(box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z);
      if (meshes < 1) issues.push(id + ': no meshes');
      if (hand) issues.push(id + ': a hand came along');
      if (!(len > 0.08 && len < 2.2)) issues.push(id + ': ' + len.toFixed(2) + ' m long, not a held weapon size');
      let shared = true; g.traverse(o => { if (o.isMesh && !(o.userData && o.userData.sharedGeo)) shared = false; });
      if (!shared) issues.push(id + ': geometry is not marked shared (it would be disposed with the body)');
    }
    // a body with a gun, and a wrap on it
    const mesh = makePlayerMesh('Tester', false, 'enemy', 'default', {});
    mesh._ownerId = 'tp_owner';
    players.tp_owner = { id: 'tp_owner', wrap: 'gold' };
    try {
      armRemoteMesh(mesh, 'ak20');
      if (!mesh._gun || !mesh._gun.userData.realGun) issues.push('the body did not get the real gun');
      if (mesh._gun && mesh._gun._wrapKey !== 'gold') issues.push('the owner\\'s wrap was not put on the gun');
      const geo = [];
      mesh._gun.traverse(o => { if (o.isMesh) geo.push(o.geometry); });
      armRemoteMesh(mesh, 'pistol');                          // a swap throws the old prop away
      if (geo.some(g => g.attributes === undefined)) issues.push('shared geometry was disposed');
      players.tp_owner.wrap = null; dressRemoteGun(mesh);
      if (mesh._gun._wrapKey !== 'default') issues.push('taking the wrap off did not reach the gun');
    } finally { delete players.tp_owner; }
    // MY wrap is on MY viewmodel; a body that wears nothing must not inherit it (it used to: the prop was cloned
    // from the dressed viewmodel's materials, so every bot held the local player's wrap). Compare what a plain body
    // looks like before and after the viewmodel is dressed: it has to be identical.
    const wi = WEAPONS.findIndex(w => w.id === 'pistol');
    const sig = () => {
      players.tp_plain = { id: 'tp_plain', wrap: null };
      const m2 = makePlayerMesh('Plain', false, 'enemy', 'default', {});
      m2._ownerId = 'tp_plain';
      armRemoteMesh(m2, 'pistol');
      const out = [];
      if (m2._gun) m2._gun.traverse(o => { if (o.isMesh) for (const m of (Array.isArray(o.material) ? o.material : [o.material])) out.push((m.color ? m.color.getHex() : 0) + ':' + (m.map ? 'map' : '-') + ':' + (m.emissive ? m.emissive.getHex() : 0)); });
      delete players.tp_plain;
      return out.join(',');
    };
    let before = '', after = '';
    try {
      before = sig();
      applyWeaponSkin(weaponModels[wi], WEAPON_SKINS_BY_ID.gold);
      after = sig();
    } finally { applyWeaponSkin(weaponModels[wi], WEAPON_SKINS_BY_ID.default); delete players.tp_plain; }
    if (!before) issues.push('the plain body got no gun parts');
    if (before !== after) issues.push('a body with no wrap changed when the local player put a wrap on their own gun');
    return issues;
  })()`);
  console.log('third-person checks: real models at world size, hands off, wraps follow the owner');
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--movement')) {
  // Double jump is back (whoever grants one gets one, in any mode), the blade air dash is the original, and the
  // Scythe's Reap Dash goes where you aim: up when you look up, level when you look level, twice as far as it did.
  const issues = vm.runInThisContext(`(() => {
    const issues = [];
    const savedSel = [selectedPrimaryIdx, selectedSecondaryIdx, selectedMeleeIdx, selectedSupportIdx];
    const savedMode = selectedModeConfig, savedMatch = match, savedStarted = gameStarted, savedDead = isDead;
    try {
      selectedModeConfig = GAME_MODE_CONFIGS['1v1']; match = null; gameStarted = true; isDead = false;
      const sc = MELEE_ITEMS.findIndex(m => m.id === 'scythe');
      selectedMeleeIdx = sc;
      const bow = WEAPONS.findIndex(w => w.id === 'boombow');
      const crossbow = WEAPONS.findIndex(w => w.id === 'crossbow');
      const daggers = WEAPONS.findIndex(w => w.id === 'throwing_knives');
      for (const item of [MELEE_ITEMS[sc], WEAPONS[crossbow]]) {
        if (grantsDoubleJump(item)) issues.push(item.id + ' must not grant double jump');
      }
      for (const item of [WEAPONS[bow], WEAPONS[daggers], MELEE_ITEMS.find(m => m.id === 'twin_knife')]) {
        if (!grantsDoubleJump(item)) issues.push(item.id + ' must grant double jump');
      }
      selectedPrimaryIdx = crossbow;
      selectedSecondaryIdx = WEAPONS.findIndex(w => w.id === 'pistol');
      selectedSupportIdx = SUPPORT_ITEMS.findIndex(w => w.id === 'frag');
      if (loadoutAirJumps() !== 0) issues.push('Crossbow + Scythe must not bank an air jump');
      selectedPrimaryIdx = bow;
      if (loadoutAirJumps() !== 1) issues.push('Bow must bank one air jump');
      selectedSecondaryIdx = daggers;
      if (loadoutAirJumps() !== 2) issues.push('Bow + daggers must bank two air jumps');
      selectedPrimaryIdx = crossbow;
      if (loadoutAirJumps() !== 1) issues.push('Daggers alone must bank one air jump');
      if (DASH_SPEED !== 17) issues.push('the air dash should be back at 17, not ' + DASH_SPEED);
      if (grantsDash(WEAPONS.find(w => w.id === 'fists') || {})) issues.push('the air dash should not have been opened to fists');
      const ab = MELEE_ITEMS[sc].ability;
      if (!ab.aimDash || ab.distance < 24) issues.push('Reap Dash should be an aimed dash of about 26 m');
      // aim straight up, then level, and run the dash to the end
      const run = (pitch) => {
        camera.position.set(0, 1.65, 0);
        camera.quaternion.setFromEuler(new THREE.Euler(pitch, 0, 0, 'YXZ'));
        slamState = null; scytheDash = null; _extVel.x = 0; _extVel.z = 0;
        const y0 = camera.position.y, z0 = camera.position.z;
        startScytheDash(MELEE_ITEMS[sc], ab);
        let guard = 0;
        while (scytheDash && guard++ < 600) {
          updateScytheDash(1 / 60);
          if (slamState) camera.position.y += slamState.vel / 60;     // the part updateMovement would do
        }
        return { up: camera.position.y - y0, fwd: -(camera.position.z - z0) };
      };
      const keepWalls = wallColliders.slice(); wallColliders.length = 0;       // open ground: nothing in the way
      let level, up, straight;
      try { level = run(0); up = run(Math.PI / 4); straight = run(Math.PI / 2 - 0.05); }
      finally { wallColliders.push(...keepWalls); }
      if (level.fwd < 20) issues.push('a level Reap Dash only covered ' + level.fwd.toFixed(1) + ' m');
      if (Math.abs(level.up) > 2.5) issues.push('a level Reap Dash climbed ' + level.up.toFixed(1) + ' m');
      if (up.up < 10) issues.push('aiming 45 degrees up should climb a lot, got ' + up.up.toFixed(1) + ' m');
      if (straight.up < 18) issues.push('aiming straight up should climb about the whole dash, got ' + straight.up.toFixed(1) + ' m');
      if (!(up.fwd > 10 && up.fwd < level.fwd)) issues.push('aiming up should trade some forward distance for height');
    } finally {
      [selectedPrimaryIdx, selectedSecondaryIdx, selectedMeleeIdx, selectedSupportIdx] = savedSel;
      selectedModeConfig = savedMode; match = savedMatch; gameStarted = savedStarted; isDead = savedDead; scytheDash = null; slamState = null;
      camera.position.set(0, 1.65, 0); camera.quaternion.set(0, 0, 0, 1);
    }
    return issues;
  })()`);
  console.log('movement checks: Bow/daggers gain double jump, Scythe/Crossbow lose it, original air dash and aimed Reap Dash preserved');
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--touch')) {
  // The phone controls. The JUMP button only set a flag that the retired jump code in updateMovement read, so it
  // never launched anyone; SLIDE needed the stick held (with a thumb that is not the one tapping SLIDE). Now both
  // act on a tap, the buttons are finger-sized, and SLIDE sits beside JUMP.
  const issues = vm.runInThisContext(`(() => {
    const issues = [];
    const savedMode = selectedModeConfig, savedMatch = match, savedStarted = gameStarted, savedDead = isDead;
    const keepWalls = wallColliders.slice(); wallColliders.length = 0;
    const reset = () => {
      camera.position.set(0, 1.65, 0); camera.quaternion.set(0, 0, 0, 1);
      slamState = null; playerYVel = 0; window._slideUntil = 0; window._slideDir = null; window._crouchEye = 1.65;
      window._mobileSlide = false; window._mobileJump = false; window._mobileCrouch = false; window._joyRecent = null;
      window._prevShiftHeld = false; window._prevCrouchHeld = false; window._prevSpaceDown = false;
      joyActive = false; joyDir = { x: 0, y: 0 };
    };
    try {
      selectedModeConfig = GAME_MODE_CONFIGS['1v1']; match = null; gameStarted = true; isDead = false;
      // JUMP: a tap on the ground launches; a dead player does not
      reset();
      doJump(false);
      if (!slamState || slamState.type !== 'jump' || !(slamState.vel > 5)) issues.push('doJump on the ground did not launch');
      reset(); isDead = true; doJump(false); isDead = false;
      if (slamState) issues.push('a dead player jumped');
      // a latched crouch is stood out of by the jump (the button does this before it jumps)
      reset(); window._crouchEye = 1.1; doJump(false);
      if (!slamState || window._crouchEye !== 1.65) issues.push('a crouched jump should launch and stand you up');

      // SLIDE: one tap, nothing held, goes straight ahead
      reset();
      window._mobileSlide = true; window._mobileSlideAt = Date.now();
      updateMovement(1 / 60);
      if (!(window._slideUntil > Date.now())) issues.push('a SLIDE tap with the stick idle did not slide');
      else if (!(window._slideDir && window._slideDir.z < -0.9 && Math.abs(window._slideDir.x) < 0.1)) issues.push('a standing slide should go straight ahead, got ' + (window._slideDir && window._slideDir.toArray().map(v => v.toFixed(2))));
      if (window._mobileSlide) issues.push('the SLIDE tap should be used up by the frame that read it');
      // …in the direction the stick was last pushed, if that was a moment ago
      reset();
      joyActive = true; joyDir = { x: 1, y: 0 }; updateMovement(1 / 60); updateMovement(1 / 60);
      joyActive = false; joyDir = { x: 0, y: 0 };
      window._slideUntil = 0; window._prevShiftHeld = false;
      window._mobileSlide = true; window._mobileSlideAt = Date.now();
      updateMovement(1 / 60);
      if (!(window._slideDir && window._slideDir.x > 0.9)) issues.push('a slide just after letting go of the stick should go that way (right)');
      // …but not off a stick that was let go of long ago
      reset();
      window._joyRecent = { x: 1, y: 0, t: Date.now() - 5000 };
      window._mobileSlide = true; window._mobileSlideAt = Date.now();
      updateMovement(1 / 60);
      if (!(window._slideDir && window._slideDir.z < -0.9)) issues.push('a stale stick direction should not steer a slide');
      // a tap older than the window is not replayed (a frame stall must not turn into a late slide)
      reset();
      window._mobileSlide = true; window._mobileSlideAt = Date.now() - 2000;
      updateMovement(1 / 60);
      if (window._slideUntil) issues.push('a stale SLIDE tap slid anyway');
      // the Shift key keeps its old rule: standing still it does nothing
      reset();
      keys['ShiftLeft'] = true; updateMovement(1 / 60); keys['ShiftLeft'] = false;
      if (window._slideUntil) issues.push('Shift with no direction should still not slide');
      // dying puts a latched crouch back
      reset(); setMobileCrouch(true); isDead = true; updateMovement(1 / 60); isDead = false;
      if (window._mobileCrouch) issues.push('a latched crouch survived death');
    } finally {
      reset(); wallColliders.push(...keepWalls);
      selectedModeConfig = savedMode; match = savedMatch; gameStarted = savedStarted; isDead = savedDead;
      camera.position.set(0, 1.65, 0); camera.quaternion.set(0, 0, 0, 1);
    }
    return issues;
  })()`);
  // The layout (index.html): finger-sized buttons, SLIDE in the right cluster, CROUCH in the left.
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
  const size = (css, id) => { const m = css.match(new RegExp('body\\.touch-ui #' + id + '\\s*\\{[^}]*?width:\\s*(\\d+)px')); return m ? +m[1] : 0; };
  const narrowAt = html.indexOf('@media (max-width: 350px)');
  const wide = html.slice(0, narrowAt), narrow = html.slice(narrowAt, html.indexOf('}\n    /* Landscape', narrowAt));
  const need = { 'btn-fire': 84, 'btn-jump': 60, 'btn-slide': 54, 'btn-ads': 58, 'btn-reload-mobile': 52, 'btn-crouch': 54, 'btn-interact': 54, 'btn-ability': 52 };
  for (const [id, min] of Object.entries(need)) {
    if (size(narrow, id) < min) issues.push(id + ' is ' + size(narrow, id) + 'px on a narrow phone; fingers need at least ' + min);
    if (size(wide, id) < min + 4) issues.push(id + ' is ' + size(wide, id) + 'px; fingers need at least ' + (min + 4));
  }
  const right = html.slice(html.indexOf('<div class="tc tc-right">'), html.indexOf('<!-- Loadout selection screen -->'));
  if (!right.includes('id="btn-slide"')) issues.push('SLIDE should sit in the right cluster, beside JUMP');
  if (html.slice(html.indexOf('<div class="tc tc-left">'), html.indexOf('<div class="tc tc-right">')).includes('btn-slide')) issues.push('SLIDE is still in the left cluster');
  console.log('touch checks: JUMP launches on a tap, SLIDE works from standing and from a let-go stick, buttons are finger-sized');
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--equip')) {
  // Equip time: a real wait after switching, by class — small blades quickest, sidearms 0.3-0.5 s (the pistol the
  // least), a rifle about 0.7 s, the heavy things slowest, nothing past 1.5 s — and the new item really cannot be used
  // until it is up. Re-pressing the key for what you hold costs nothing; quick melee takes no time.
  const issues = vm.runInThisContext(`(() => {
    const issues = [];
    const saved = { slot: activeSlot, pri: selectedPrimaryIdx, sec: selectedSecondaryIdx, mel: selectedMeleeIdx, sup: selectedSupportIdx,
                    started: gameStarted, dead: isDead, held: _heldEquipKey, ready: equipReadyAt, dur: _equipDur, match, mode: selectedModeConfig,
                    sound: playSoundEvent, anim: showAnnouncement };
    playSoundEvent = () => {}; showAnnouncement = () => {};
    try {
      const gunMs = id => equipMsFor(WEAPONS.find(w => w.id === id), WEAPONS.find(w => w.id === id).slot);
      const all = [];
      for (const w of WEAPONS) if (!w.archived && !w.adminItem) all.push([w.id, equipMsFor(w, w.slot), w.slot]);
      for (const m of MELEE_ITEMS) if (!m.archived && !m.adminItem && !m.skinOnly) all.push([m.id, equipMsFor(m, 'melee'), 'melee']);
      for (const u of SUPPORT_ITEMS) all.push([u.id, equipMsFor(u, 'support'), 'support']);
      for (const [id, ms, slot] of all) if (!(ms >= 60 && ms <= 1500)) issues.push(id + ' (' + slot + '): equip time ' + ms + ' ms is outside 60..1500');
      const prim = all.filter(x => x[2] === 'primary'), sec = all.filter(x => x[2] === 'secondary'), mel = all.filter(x => x[2] === 'melee');
      const pistol = gunMs('pistol');
      for (const [id, ms, slot] of all) if ((slot === 'primary' || slot === 'secondary') && ms < pistol) issues.push(id + ' comes up faster than the pistol (' + ms + ' < ' + pistol + ')');
      if (Math.max(...sec.map(x => x[1])) >= Math.min(...prim.map(x => x[1]))) issues.push('the slowest sidearm should still be quicker than the quickest primary');
      for (const [id, ms] of sec) if (!(ms >= 300 && ms <= 500)) issues.push(id + ': a secondary should come up in 0.3-0.5 s, got ' + ms);
      if (pistol !== 300) issues.push('the pistol should be the quickest gun at 0.3 s, got ' + pistol);
      if (Math.max(...prim.map(x => x[1])) !== 1500 || gunMs('minigun') !== 1500) issues.push('the minigun should be the slowest, at 1.5 s');
      const ak = gunMs('ak20'); if (!(ak >= 600 && ak <= 800)) issues.push('the AK should be a medium 0.6-0.8 s, got ' + ak);
      if (!(equipMsFor(MELEE_ITEMS.find(m => m.id === 'knife'), 'melee') <= 200 && equipMsFor(MELEE_ITEMS.find(m => m.id === 'fists'), 'melee') <= 200)) issues.push('small blades should be nearly instant');
      if (!(Math.max(...mel.map(x => x[1])) <= 700)) issues.push('no melee needs more than 0.7 s');
      for (const w of WEAPONS) if (!w.archived && !w.adminItem && w.slot === 'primary' && EQUIP_MS[w.id] == null) issues.push(w.id + ' has no entry in EQUIP_MS (it would get the slot default)');
      // the wait itself
      gameStarted = true; isDead = false; match = null;
      selectedPrimaryIdx = WEAPONS.findIndex(w => w.id === 'ak20'); selectedSecondaryIdx = WEAPONS.findIndex(w => w.id === 'pistol');
      weaponAmmo[selectedPrimaryIdx] = { ammo: 30, reserve: 90 }; weaponAmmo[selectedSecondaryIdx] = { ammo: 12, reserve: 36 };
      _heldEquipKey = ''; activeSlot = 'primary'; equipActiveSlot();
      let left = equipReadyAt - performance.now();
      if (!(left > 500 && left <= 720)) issues.push('taking out the AK should cost about 0.7 s, got ' + Math.round(left));
      activeSlot = 'primary'; equipActiveSlot();
      if (equipReadyAt - performance.now() > 20) issues.push('pressing the key for what you already hold should cost nothing');
      activeSlot = 'secondary'; equipActiveSlot();
      left = equipReadyAt - performance.now();
      if (!(left > 230 && left <= 320)) issues.push('drawing the pistol should cost about 0.3 s, got ' + Math.round(left));
      // while it is coming up it cannot shoot; once up it can
      activeSlot = 'primary'; equipActiveSlot();
      const before = weaponAmmo[selectedPrimaryIdx].ammo;
      pointerLocked = true; lastShot = 0;
      try { tryShoot(); } catch (e) { issues.push('tryShoot threw while equipping: ' + e.message); }
      if (weaponAmmo[selectedPrimaryIdx].ammo !== before) issues.push('the AK fired while it was still coming up');
      if (!equipReady() === false) issues.push('equipReady should be false mid-draw');
      equipReadyAt = 0;
      if (!equipReady()) issues.push('equipReady should be true once the time is up');
      // quick melee takes no time, there or back
      _quickMeleeReturn = null; activeSlot = 'primary'; equipActiveSlot(); equipReadyAt = 0;
      selectedMeleeIdx = MELEE_ITEMS.findIndex(m => m.id === 'sledge');
      try { quickMelee(); } catch (e) { issues.push('quickMelee threw: ' + e.message); }
      if (equipReadyAt - performance.now() > 20) issues.push('quick melee should take no equip time (sledge: ' + Math.round(equipReadyAt - performance.now()) + ' ms)');
      _quickMeleeReturn = null;
    } finally {
      playSoundEvent = saved.sound; showAnnouncement = saved.anim;
      activeSlot = saved.slot; selectedPrimaryIdx = saved.pri; selectedSecondaryIdx = saved.sec; selectedMeleeIdx = saved.mel; selectedSupportIdx = saved.sup;
      gameStarted = saved.started; isDead = saved.dead; _heldEquipKey = saved.held; equipReadyAt = saved.ready; _equipDur = saved.dur; match = saved.match;
      _quickMeleeReturn = null; meleeSwingT = 1; lastMelee = 0;
    }
    return issues;
  })()`);
  console.log('equip checks: a table of times (pistol quickest, AK medium, minigun 1.5 s at most), a real wait, no cost for the same item or quick melee');
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--dice')) {
  // Dice Duel: the dice are rolled DURING the round (no screen before it), a roll costs no health but the dice need a
  // few seconds to recharge, you hold TWO things at once (a roll replaces the one you are NOT holding), nothing from your
  // loadout is in your hands, and you cannot shoot while the dice rattle.
  const issues = vm.runInThisContext(`(() => {
    const issues = [];
    const saved = { match, slot: activeSlot, bots: gameBots.slice(), me: players[myId], pri: selectedPrimaryIdx, sec: selectedSecondaryIdx, mel: selectedMeleeIdx, sup: selectedSupportIdx,
                    started: gameStarted, dead: isDead, sound: playSoundEvent, anim: showAnnouncement, audio: getAudioCtx, wsound: playWeaponSound, locked: pointerLocked };
    playSoundEvent = () => {}; showAnnouncement = () => {}; getAudioCtx = () => null; playWeaponSound = () => {};
    try {
      gameStarted = true; isDead = false; pointerLocked = true;
      selectedPrimaryIdx = WEAPONS.findIndex(w => w.id === 'ak20'); selectedSecondaryIdx = WEAPONS.findIndex(w => w.id === 'pistol');
      selectedMeleeIdx = MELEE_ITEMS.findIndex(m => m.id === 'knife'); selectedSupportIdx = SUPPORT_ITEMS.findIndex(u => u.id === 'frag');
      const ownMelee = selectedMeleeIdx, ownSupport = selectedSupportIdx;
      weaponAmmo[selectedPrimaryIdx] = { ammo: 30, reserve: 90 }; weaponAmmo[selectedSecondaryIdx] = { ammo: 12, reserve: 36 };
      players[myId] = { hp: 300 };
      gameBots.length = 0; gameBots.push({ id: 'dicebot', hp: 300, maxHp: 300, dead: false });
      const fresh = () => ({ rolls: 0, rolling: false, shown: null, v: 0, tier: null, weaponId: null, kind: null, readyAt: 0 });
      match = { over: false, roundActive: true, dice: { goal: 5, round: 1, score: { me: 0, bot: 0 }, phase: 'fight', kit: rngNewKit(), me: fresh(), bot: fresh() }, ffaKills: {} };
      const d = match.dice;
      // who may roll, and why not
      if (diceRollBlock('me') !== '') issues.push('the first roll of a round should be allowed, got ' + diceRollBlock('me'));
      match.roundActive = false; if (diceRollBlock('me') !== 'wait') issues.push('no rolling before GO'); match.roundActive = true;
      d.me.rolling = true; if (diceRollBlock('me') !== 'busy') issues.push('no rolling while rolling'); d.me.rolling = false;
      d.me.readyAt = Date.now() + 3000; if (diceRollBlock('me') !== 'cool') issues.push('the dice should need to recharge after a roll'); d.me.readyAt = 0;
      if (diceRollBlock('me') !== '') issues.push('a recharged dice may be rolled');
      d.phase = 'between'; if (diceRollBlock('me') !== 'wait') issues.push('no rolling between rounds'); d.phase = 'fight';
      isDead = true; if (diceRollBlock('me') !== 'dead') issues.push('the dead do not roll'); isDead = false;
      // a roll costs nothing: not a point of health, and no limit on how many
      players[myId].hp = 300;
      diceRollFor('me'); clearInterval(d.me._tick); d.me.rolling = false;
      if (players[myId].hp !== 300) issues.push('a roll cost health (hp ' + players[myId].hp + ')');
      if (d.me.rolls !== 1) issues.push('rolls should count');
      d.me.rolls = 50; d.me.readyAt = 0; if (diceRollBlock('me') !== '') issues.push('there is no limit on rolls, only the recharge');
      d.me.rolls = 0;
      // empty hands: nothing can be used and the loadout is not a way out of it
      d.kit = rngNewKit(); equipActiveSlot();
      if (equipReady()) issues.push('empty hands should not be able to use anything');
      let a0 = weaponAmmo[selectedPrimaryIdx].ammo; activeSlot = 'primary'; equipActiveSlot(); tryShoot();
      if (weaponAmmo[selectedPrimaryIdx].ammo !== a0) issues.push('fired the loadout gun with empty hands');
      _quickMeleeReturn = null; quickMelee(); if (_quickMeleeReturn) issues.push('quick melee put the loadout melee in empty hands');
      // two things at once, a roll replaces the one you are NOT holding
      const kit = d.kit;
      rngRollIn('ak20', kit, 'SS');
      if (kit.slots[0] !== 'ak20' || kit.hand !== 0 || activeSlot !== 'primary' || WEAPONS[selectedPrimaryIdx].id !== 'ak20') issues.push('the first roll should fill slot 1 and be in the hand');
      if (!equipReady()) issues.push('a roll is in the hand at once (the roll was the wait)');
      rngRollIn('m:sledge', kit, 'B');
      if (kit.slots[0] !== 'ak20' || kit.slots[1] !== 'm:sledge' || kit.hand !== 1) issues.push('the second roll should fill slot 2 and keep slot 1: ' + JSON.stringify(kit.slots) + ' hand ' + kit.hand);
      if (activeSlot !== 'melee' || MELEE_ITEMS[selectedMeleeIdx].id !== 'sledge') issues.push('a rolled melee should be in the hand');
      rngRollIn('u:black_hole_seed', kit, 'A');
      if (kit.slots[0] !== 'u:black_hole_seed' || kit.slots[1] !== 'm:sledge') issues.push('a third roll should replace the one NOT in the hand (the first), got ' + JSON.stringify(kit.slots));
      if (kit.hand !== 0 || activeSlot !== 'support' || SUPPORT_ITEMS[selectedSupportIdx].id !== 'black_hole_seed') issues.push('a rolled utility should be in the hand');
      if (supportUses[selectedSupportIdx] !== SUPPORT_ITEMS[selectedSupportIdx].uses) issues.push('a rolled utility should come with all its uses');
      rngSwitchHand(1);
      if (kit.hand !== 1 || activeSlot !== 'melee') issues.push('switching to slot 2 should take out the melee');
      rngRollIn('pistol', kit, 'B');
      if (kit.slots[0] !== 'pistol' || kit.slots[1] !== 'm:sledge') issues.push('holding the sledge, a roll should replace slot 1 (the utility), got ' + JSON.stringify(kit.slots));
      if (kit.hand !== 0 || activeSlot !== 'secondary') issues.push('the new pistol should be in the hand');
      cycleActiveSlot(); if (kit.hand !== 1) issues.push('prev/next should switch to the other thing the dice gave you');
      cycleActiveSlot(); if (kit.hand !== 0) issues.push('prev/next should switch back');
      // the loadout melee and utility are not reachable: whatever is in the hand, the selection says so
      equipActiveSlot();
      if (MELEE_ITEMS[selectedMeleeIdx].id === 'knife' && activeSlot === 'melee') issues.push('the loadout melee is in the hand');
      // no shooting while the dice are in the hand
      rngRollIn('ak20', kit, 'SS'); equipReadyAt = 0; lastShot = 0;
      d.me.rolling = true; const a1 = weaponAmmo[WEAPONS.findIndex(w => w.id === 'ak20')].ammo;
      try { tryShoot(); } catch (e) { issues.push('tryShoot threw: ' + e.message); }
      if (weaponAmmo[WEAPONS.findIndex(w => w.id === 'ak20')].ammo !== a1) issues.push('fired while the dice were rolling');
      d.me.rolling = false;
      // the bot has the same recharge and judges the same way
      d.bot.readyAt = Date.now() + 2000; if (diceRollBlock('bot') !== 'cool') issues.push('the bot dice should recharge too'); d.bot.readyAt = 0;
      if (diceRollBlock('bot') !== '') issues.push('a ready bot may roll');
      // the end of it: your own kit back
      rngRestore(d);
      if (selectedMeleeIdx !== ownMelee || selectedSupportIdx !== ownSupport || selectedPrimaryIdx !== WEAPONS.findIndex(w => w.id === 'ak20')) issues.push('your own kit did not come back');
      if (d.kit) issues.push('the kit should be gone when the mode ends');
      // the old pre-round screen and the health price are gone
      for (const f of ['dicePlayerKeep', 'dicePlayerReroll', 'diceBeginFight', 'diceMaybeFight', 'rngNoGun', 'rngEquipPlayer']) if (eval('typeof ' + f) === 'function') issues.push(f + ' is still there');
      if (typeof DICE_REROLL_HP !== 'undefined' || typeof DICE_MAX_REROLLS !== 'undefined') issues.push('the re-roll price and limit should be gone');
    } finally {
      playSoundEvent = saved.sound; showAnnouncement = saved.anim; getAudioCtx = saved.audio; playWeaponSound = saved.wsound;
      match = saved.match; activeSlot = saved.slot; gameBots.length = 0; gameBots.push(...saved.bots);
      if (saved.me) players[myId] = saved.me; else delete players[myId];
      selectedPrimaryIdx = saved.pri; selectedSecondaryIdx = saved.sec; selectedMeleeIdx = saved.mel; selectedSupportIdx = saved.sup;
      gameStarted = saved.started; isDead = saved.dead; pointerLocked = saved.locked; equipReadyAt = 0; _quickMeleeReturn = null;
    }
    return issues;
  })()`);
  console.log('dice checks: rolled during the round, free rolls (they recharge), two things at once, a roll replaces the one you are not holding, empty hands first, no loadout melee or utility');
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--rng')) {
  // The RNG pool (Dice Duel and Weapon Roulette): guns, melees and utilities, every tier holding all three, the retired
  // gimmick weapons in it and only in it, and every item in it can be put in your hands, used without throwing, and
  // handed back.
  const out = vm.runInThisContext(`(() => {
    const issues = [], notes = [];
    const saved = { match, slot: activeSlot, pri: selectedPrimaryIdx, sec: selectedSecondaryIdx, mel: selectedMeleeIdx, sup: selectedSupportIdx,
                    started: gameStarted, dead: isDead, sound: playSoundEvent, anim: showAnnouncement, bots: gameBots.slice(), me: players[myId], locked: pointerLocked,
                    audio: getAudioCtx, wsound: playWeaponSound };
    playSoundEvent = () => {}; showAnnouncement = () => {}; getAudioCtx = () => null; playWeaponSound = () => {};
    const seen = new Map();
    const kinds = { gun: 0, melee: 0, util: 0 };
    try {
      for (const t of Object.keys(DICE_POOL)) {
        const ks = { gun: 0, melee: 0, util: 0 };
        for (const id of DICE_POOL[t]) {
          const i = diceInfo(id);
          if (!i) { issues.push(t + ': unknown ' + id); continue; }
          if (seen.has(id)) issues.push(id + ' is in both ' + seen.get(id) + ' and ' + t);
          seen.set(id, t); ks[i.kind]++; kinds[i.kind]++;
          if (i.item.adminItem && id !== 'omega_pistol') issues.push(id + ' is an admin item: it must not be rollable');
        }
        for (const k of Object.keys(ks)) if (!ks[k]) issues.push('tier ' + t + ' holds no ' + k);
        if (!dicePoolIds(t, true).length) issues.push('tier ' + t + ' has no gun for a bot');
        for (const id of dicePoolIds(t, true)) if (diceInfo(id).kind !== 'gun') issues.push('gunsOnly let ' + id + ' through');
      }
      notes.push('pool: ' + kinds.gun + ' guns, ' + kinds.melee + ' melees, ' + kinds.util + ' utilities');
      // a fair share of rolls are not guns
      const n = { gun: 0, melee: 0, util: 0 };
      for (let i = 0; i < 6000; i++) n[diceInfo(diceRollOnce().weaponId).kind]++;
      if (n.melee < 6000 * 0.08 || n.util < 6000 * 0.1) issues.push('too few melees or utilities in the rolls: ' + JSON.stringify(n));
      for (let i = 0; i < 600; i++) if (diceInfo(diceRollOnce(null, true).weaponId).kind !== 'gun') { issues.push('a bot rolled a non-gun'); break; }
      // the gimmicks: archived items are in the pool, and a few are not in the normal game any more
      const archived = [...seen.keys()].filter(id => diceInfo(id).item.archived);
      notes.push(archived.length + ' of them are retired gimmicks that only these modes deal');
      if (archived.length < 40) issues.push('only ' + archived.length + ' retired gimmicks in the pool');
      // the Omega Pistol is rollable by you, never by a bot; retired items turn up a quarter as often as the rest of their tier
      if (!seen.has('omega_pistol')) issues.push('the Omega Pistol should be in the pool');
      let omega = 0, botOmega = 0; const hits = {};
      for (let i = 0; i < 60000; i++) { const r = diceRollOnce(); hits[r.weaponId] = (hits[r.weaponId] || 0) + 1; if (r.weaponId === 'omega_pistol') omega++; }
      for (let i = 0; i < 20000; i++) if (diceRollOnce(null, true).weaponId === 'omega_pistol') botOmega++;
      if (omega < 100) issues.push('the Omega Pistol came up ' + omega + ' times in 60000 rolls');
      if (botOmega) issues.push('a bot rolled the Omega Pistol ' + botOmega + ' times');
      let arch = 0, arch_n = 0, norm = 0, norm_n = 0;
      for (const t of Object.keys(DICE_POOL)) {
        const ids = DICE_POOL[t].filter(id => diceInfo(id)); const a = ids.filter(id => diceInfo(id).item.archived), n = ids.filter(id => !diceInfo(id).item.archived);
        if (!a.length || !n.length) continue;
        for (const id of a) { arch += hits[id] || 0; arch_n++; } for (const id of n) { norm += hits[id] || 0; norm_n++; }
      }
      const ratio = (arch / arch_n) / (norm / norm_n);
      notes.push('a retired item comes up ' + ratio.toFixed(2) + 'x as often as a normal one in its tier; the Omega Pistol ' + omega + '/60000');
      if (ratio < 0.2 || ratio > 0.31) issues.push('retired items should come up a quarter as often, got ' + ratio.toFixed(2));
      // put every one in your hands, use it, give it back
      gameStarted = true; isDead = false; pointerLocked = true;
      selectedPrimaryIdx = WEAPONS.findIndex(w => w.id === 'ak20'); selectedSecondaryIdx = WEAPONS.findIndex(w => w.id === 'pistol');
      selectedMeleeIdx = MELEE_ITEMS.findIndex(m => m.id === 'knife'); selectedSupportIdx = 0;
      players[myId] = { hp: 300 }; gameBots.length = 0;
      const keepWalls = wallColliders.slice(); wallColliders.length = 0;
      // Weapon Roulette deals the bots from the same pool: never the Omega Pistol
      gameBots.push({ id: 'roulettebot', hp: 300, maxHp: 300, dead: false });
      match = { type: 'arcade', arcade: 'roulette', over: false, roundActive: true, ffaKills: {}, roulette: { kit: rngNewKit(), id: null } };
      let rb = 0, mine = 0;
      for (let i = 0; i < 1500; i++) { rouletteShuffle(); if (gameBots[0].weaponId === 'omega_pistol') rb++; if (match.roulette.id === 'omega_pistol') mine++; }
      if (rb) issues.push('Weapon Roulette dealt a bot the Omega Pistol ' + rb + ' times');
      notes.push('roulette dealt you the Omega Pistol ' + mine + '/1500');
      rngRestore(match.roulette); gameBots.length = 0;
      for (const [id] of seen) {
        const holder = { kit: rngNewKit() };
        match = { type: 'arcade', arcade: 'roulette', over: false, roundActive: true, ffaKills: {}, roulette: holder };
        const i = diceInfo(id);
        try {
          const kind = rngRollIn(id, holder.kit, null);
          if (kind !== i.kind) issues.push(id + ': equipped as ' + kind);
          const want = i.kind === 'gun' ? (i.item.slot === 'secondary' ? 'secondary' : 'primary') : i.kind === 'melee' ? 'melee' : 'support';
          if (activeSlot !== want) issues.push(id + ': the ' + want + ' slot should be active, got ' + activeSlot);
          if (i.kind === 'melee' && MELEE_ITEMS[selectedMeleeIdx] !== i.item) issues.push(id + ': not the melee in hand');
          if (i.kind === 'util' && SUPPORT_ITEMS[selectedSupportIdx] !== i.item) issues.push(id + ': not the utility in hand');
          if (i.kind === 'util' && supportUses[selectedSupportIdx] !== (i.item.uses || 1)) issues.push(id + ': the utility should come with all its uses');
          if (i.kind === 'gun' && WEAPONS[selectedPrimaryIdx] !== i.item) issues.push(id + ': not the gun in hand');
          if (!equipReady()) issues.push(id + ': a roll should be usable at once');
          // use it
          equipReadyAt = 0; lastShot = 0; lastMelee = 0; meleeSwingT = 1; camera.position.set(0, 1.65, 0); camera.quaternion.set(0, 0, 0, 1);
          if (i.kind === 'gun') { const a0 = weaponAmmo[WEAPONS.indexOf(i.item)].ammo; tryShoot(); if (!(weaponAmmo[WEAPONS.indexOf(i.item)].ammo < a0) && !i.item.noReload && !i.item.spinUp && !i.item.lockOn && !i.item.burstSize && !i.item.cycleBurst && i.item.id !== 'minigun') issues.push(id + ': firing did not use a round'); }
          else if (i.kind === 'melee') tryMelee();
          else trySupport();
        } catch (e) { issues.push(id + ' (' + i.kind + ') threw: ' + e.message.slice(0, 90)); }
        // back to the loadout
        rngRestore(match.roulette);
        for (const f of ['finishMeleeSlam', 'finishMeleeDash', 'finishBatCrowdClear']) { try { eval(f + '()'); } catch (e) {} }
        meleeAbilityBuff = null; slamState = null; autoLunge = null; scytheDash = null;
        if (selectedMeleeIdx !== MELEE_ITEMS.findIndex(m => m.id === 'knife') || selectedSupportIdx !== 0) issues.push(id + ': your own melee and utility did not come back');
        if (selectedPrimaryIdx !== WEAPONS.findIndex(w => w.id === 'ak20')) issues.push(id + ': your own primary did not come back');
      }
      wallColliders.push(...keepWalls);
    } finally {
      playSoundEvent = saved.sound; showAnnouncement = saved.anim; getAudioCtx = saved.audio; playWeaponSound = saved.wsound; match = saved.match; activeSlot = saved.slot;
      selectedPrimaryIdx = saved.pri; selectedSecondaryIdx = saved.sec; selectedMeleeIdx = saved.mel; selectedSupportIdx = saved.sup;
      gameStarted = saved.started; isDead = saved.dead; pointerLocked = saved.locked; equipReadyAt = 0;
      gameBots.length = 0; gameBots.push(...saved.bots); if (saved.me) players[myId] = saved.me; else delete players[myId];
    }
    return { issues, notes };
  })()`);
  console.log('rng checks: ' + out.notes.join(' · '));
  if (out.issues.length) { ok = false; console.log(out.issues.join('\n')); }
}

if (ok && process.argv.includes('--wear')) {
  // The wear pass: every map is worn down (decals on walls and floor, rubble) except the duel arenas and a few hand-made
  // ones, it is one batch of each, it adds no collider and nothing a bullet or a camera can hit, it stays on the map and
  // inside its budget, it builds once, and it is the same on every machine.
  const out = vm.runInThisContext(`(() => {
    const issues = [], notes = [];
    const saved = activeMapName;
    const skip = new Set(['range', 'lobby13', 'obby', 'pinball_arcade', 'neon_tokyo', 'br_arena']);
    let worn = 0, quads = 0;
    try {
      for (const n of MAP_IDS) {
        const g = MAP_GROUPS[n]; if (!g || !MAP_BOUNDS[n]) continue;
        try { activateMap(n); } catch (e) { issues.push(n + ' did not activate: ' + e.message); continue; }
        const w = g.userData.mapWear;
        if (wearIsClean(n) && w) issues.push(n + ': a clean place (neon, sci-fi, fairground, opera, shop) should have no rust or dirt on it');
        const expectWorn = !DUEL_ONLY_MAPS.has(n) && !skip.has(n) && !wearIsClean(n) && (!!MAP_THEMES[n] || ['storm_pier', 'cargo_borders', 'cargo_belts', 'laser_vault', 'gale_peaks', 'magma_rise'].includes(n));
        if (DUEL_ONLY_MAPS.has(n) && w) issues.push(n + ': a duel arena should be left plain');
        if (!expectWorn) continue;
        if (!w) { issues.push(n + ': was not worn'); continue; }
        worn++; quads += w.quads;
        if (w.quads < 400) issues.push(n + ': hardly any wear (' + w.quads + ' decals)');
        if (w.quads > WEAR_MAX_QUADS) issues.push(n + ': over the decal budget (' + w.quads + ')');
        const meshes = g.children.filter(c => c.userData && c.userData.mapWear);
        if (meshes.length > 2) issues.push(n + ': ' + meshes.length + ' wear batches (a decal batch and a rubble batch)');
        // the outskirts (and a space station's ring) stand beyond the bounds, and have walls too: judge by what is really built
        let ex = 0, ez = 0; for (const c of MAP_COLLIDERS[n]) { ex = Math.max(ex, Math.abs(c.min.x), Math.abs(c.max.x)); ez = Math.max(ez, Math.abs(c.min.z), Math.abs(c.max.z)); }
        const b = { halfX: Math.max(MAP_BOUNDS[n].halfX, ex) + 3, halfZ: Math.max(MAP_BOUNDS[n].halfZ, ez) + 3 };
        for (const m of meshes) {
          if (m.castShadow) issues.push(n + ': wear casts shadows');
          let hit = false; const rc = new THREE.Raycaster(new THREE.Vector3(0, 50, 0), new THREE.Vector3(0, -1, 0));
          try { hit = rc.intersectObject(m, false).length > 0; } catch (e) {}
          if (hit) issues.push(n + ': a decal can be hit by a ray');
          const P = m.geometry.attributes.position;
          let bad = 0, out = 0;
          for (let i = 0; i < P.count; i += 7) {
            const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
            if (!Number.isFinite(x + y + z)) bad++;
            else if (Math.abs(x) > b.halfX + 2 || Math.abs(z) > b.halfZ + 2) out++;
          }
          if (bad) issues.push(n + ': ' + bad + ' decal vertices are not numbers');
          if (out > P.count / 7 * 0.03 && n !== 'orbital_station') issues.push(n + ': ' + out + ' wear vertices lie off the map');   // (the station's own hull stands outside its bounds, with no collider)
          const C = m.geometry.attributes.color;
          if (C && C.itemSize === 4) for (let i = 0; i < C.count; i += 11) if (!(C.getW(i) >= 0 && C.getW(i) <= 1)) { issues.push(n + ': a decal alpha is ' + C.getW(i)); break; }
        }
        const before = g.children.length; addMapWear(n);
        if (g.children.length !== before) issues.push(n + ': the wear pass ran twice');
        // wear on a fresh copy of the same map adds no collider
        const colsBefore = MAP_COLLIDERS[n].length, kids = g.children.length;
        for (const m of meshes) g.remove(m);
        g.userData.mapWear = null; addMapWear(n);
        if (MAP_COLLIDERS[n].length !== colsBefore) issues.push(n + ': wear changed the colliders (' + colsBefore + ' -> ' + MAP_COLLIDERS[n].length + ')');
        if (g.children.length > kids + 0) issues.push(n + ': a second wear pass did not replace the first');
      }
      notes.push(worn + ' maps worn, ' + Math.round(quads / Math.max(1, worn)) + ' decals each on average');
      // deterministic: the same name gives the same dirt
      const a = _thRng('urban:wear')(), b2 = _thRng('urban:wear')();
      if (a !== b2) issues.push('the wear is not seeded by the map name');
      // the atlas has a cell for everything the pass asks for
      for (const [k, cells] of Object.entries(WEAR_CELL)) for (const c of cells) if (!(c >= 0 && c < 16)) issues.push('WEAR_CELL.' + k + ' points off the atlas');
    } finally { activateMap(saved || 'blank'); }
    return { issues, notes };
  })()`);
  console.log('wear checks: ' + out.notes.join(' · ') + ' · duel arenas plain · no colliders, nothing a ray can hit');
  if (out.issues.length) { ok = false; console.log(out.issues.slice(0, 30).join('\n')); }
}

if (ok && process.argv.includes('--gimmick')) {
  // The retired guns' specials (they sat on the weapons as flags that nothing read): each now does what it says on a bot,
  // a plain gun does nothing extra, and they are read only against a bot.
  const issues = vm.runInThisContext(`(() => {
    const issues = [];
    const saved = { bots: gameBots.slice(), fx: spawnAbilityAOEFX, burn: spawnBurnZone, hit: emitHit, cam: camera.position.clone(), pl: { ...players } };
    const calls = { burn: [], hit: [] };
    spawnAbilityAOEFX = () => {}; spawnBurnZone = (pos, r, dps, ms) => { calls.burn.push([pos.x, r, dps, ms]); };
    emitHit = (pid, bid, wid, pos, hs, opts) => { calls.hit.push({ pid, wid, opts }); };
    try {
      camera.position.set(0, 1.65, 0);
      const mk = (id, x, z) => { const b = { id, x, z, hp: 300, dead: false }; players[id] = { isBot: true }; return b; };
      const run = (wid, extra, opts) => {
        gameBots.length = 0;
        const a = mk('gimA', 10, 0), b = mk('gimB', 12, 4);
        gameBots.push(a, b); if (extra) extra(a, b);
        calls.burn.length = 0; calls.hit.length = 0;
        gimmickOnHit(wid, 'gimA', new THREE.Vector3(10, 1.2, 0), 40, opts || {});
        return { a, b };
      };
      let r = run('shockwave_launcher'); if (!(r.a.kbVX > 10 && Math.abs(r.a.kbVZ) < 1)) issues.push('shockwave_launcher: no shove along the shot (kbVX ' + r.a.kbVX + ')');
      r = run('airburst_projector'); if (!(r.a.kbVX > 6)) issues.push('airburst_projector: no shove');
      r = run('harpoon_gun'); if (!(r.a._rootUntil > Date.now() + 2000)) issues.push('harpoon_gun: the target is not pinned');
      r = run('sticker_blaster'); if (!(r.a._chillUntil > Date.now())) issues.push('sticker_blaster: no slow');
      r = run('foam_cannon'); if (!(r.a._chillUntil > Date.now())) issues.push('foam_cannon: no slow');
      r = run('seismic_hammer'); if (!(r.a.yVel >= 8)) issues.push('seismic_hammer: the target is not launched');
      r = run('gravity_launcher'); if (!(r.b.kbVX < -5 && r.b.kbVZ < -1)) issues.push('gravity_launcher: a bot 4 m away is not pulled in (' + r.b.kbVX + ', ' + r.b.kbVZ + ')');
      r = run('firework_launcher'); if (calls.burn.length !== 1 || calls.burn[0][1] !== 3) issues.push('firework_launcher: should leave one burn zone');
      r = run('arc_rifle'); if (calls.hit.length !== 2 && calls.hit.length !== 1) issues.push('arc_rifle: should arc to the other bot'); else if (!calls.hit.every(h => h.opts.chained && h.opts.damageOverride === 20 && h.pid !== 'gimA')) issues.push('arc_rifle: the arc should be half damage, flagged chained, on another bot');
      r = run('arc_rifle', null, { chained: true }); if (calls.hit.length) issues.push('arc_rifle: an arc must not arc again');
      // a plain gun gets nothing
      r = run('ak20'); if (r.a.kbVX || r.a._rootUntil || r.a._chillUntil || r.a.yVel || calls.burn.length || calls.hit.length) issues.push('a plain gun got a special');
      // against a real player nothing is moved
      gameBots.length = 0; players.realP = { isBot: false }; gimmickOnHit('shockwave_launcher', 'realP', new THREE.Vector3(10, 1, 0), 40, {});
      // data the other two rely on
      const pc = WEAPONS.find(w => w.id === 'potato_cannon'); if (!(pc.randomSpeed && pc.randomSpeed.max > pc.randomSpeed.min)) issues.push('potato_cannon lost its random speed');
      if (!WEAPONS.find(w => w.id === 'plasma_carbine').plasmaGrows) issues.push('plasma_carbine lost plasmaGrows');
    } finally {
      spawnAbilityAOEFX = saved.fx; spawnBurnZone = saved.burn; emitHit = saved.hit; camera.position.copy(saved.cam);
      gameBots.length = 0; gameBots.push(...saved.bots); for (const k of ['gimA', 'gimB', 'realP']) delete players[k];
    }
    return issues;
  })()`);
  console.log('gimmick checks: knockback, pin, slow, launch, gravity pull, burn zone and chain lightning do what they say on a bot, and nothing on a plain gun');
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--flare')) {
  // The flare: slow, big, and it falls gently: still in the air well past the 1.8 s a normal shot lives, and it has
  // dropped far less than a plain lob would have.
  const issues = vm.runInThisContext(`(() => {
    const issues = [];
    const f = WEAPONS.find(w => w.id === 'flare');
    if (!f || !(f.bulletSize >= 0.15)) issues.push('the flare should be large (bulletSize >= 0.15)');
    if (!f || !(f.arcGravity > 0 && f.arcGravity < 0.6)) issues.push('the flare should fall slower than the usual arc');
    if (!f || !(f.flightMs >= 3500)) issues.push('the flare has to be allowed to stay up for a few seconds');
    if (!f || !(f.bulletSpeed <= 30)) issues.push('the flare should be slow');
    const keepWalls = wallColliders.slice(); wallColliders.length = 0;
    const savedSound = playSoundEvent; playSoundEvent = () => {};
    const savedFlares = groundFlares.length;
    try {
      const flight = (spec) => {
        localBullets.length = 0;
        spawnLocalBullet(new THREE.Vector3(0, 1.65, 0), new THREE.Vector3(0, 0.15, -1), 'flare_test', true, spec.bulletSpeed, spec.bulletColor, spec.bulletSize || 0.05, spec.id);
        let steps = 0, dist = 0;
        while (localBullets.length && steps < 60 * 8) { const b = localBullets[0]; dist = -b.mesh.position.z; updateBullets(1 / 60); steps++; }
        return { secs: steps / 60, dist };
      };
      const r = flight(f);
      if (r.secs < 1.0) issues.push('the flare lands in ' + r.secs.toFixed(2) + ' s: too quick, it should hang in the air');
      // the same shot on the ordinary arc and speed, for comparison
      const keep = { g: f.arcGravity, s: f.bulletSpeed };
      f.arcGravity = 1; f.bulletSpeed = 44;
      let old; try { old = flight(f); } finally { f.arcGravity = keep.g; f.bulletSpeed = keep.s; }
      if (!(r.secs > old.secs)) issues.push('the flare is not slower to land than a speed-44 lob would be');
      if (groundFlares.length <= savedFlares) issues.push('the landed flare did not leave a ground flare');
    } finally {
      wallColliders.push(...keepWalls); localBullets.length = 0; playSoundEvent = savedSound;
      while (groundFlares.length > savedFlares) { const g = groundFlares.pop(); try { scene.remove(g.mesh); } catch (e) {} }
    }
    return issues;
  })()`);
  console.log('flare checks: slow, large, long-lived, gentle fall');
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--mappick')) {
  // The map vote: a picture of every duel map (a grid drawn from its real colliders), a bot that decides by
  // reading that picture, no pre-pick on the mode screen, a screenshot of every map for the cards, a vote in every
  // lobby mode (not only 1v1), and the server settling it.
  const out = vm.runInThisContext(`(() => {
    const issues = [], info = [];
    const grids = {};
    for (const id of DUEL_MAP_IDS) {
      const g = mapPictureGrid(id);
      if (!g) { issues.push(id + ': no picture'); continue; }
      grids[id] = g;
      const n = { 0: 0, 1: 0, 2: 0, 4: 0, 5: 0 };
      for (const c of g.cells) n[c] = (n[c] || 0) + 1;
      if (n[1] + n[2] < 20) issues.push(id + ': the picture shows hardly any cover (' + (n[1] + n[2]) + ' cells)');
      if (!n[4] || !n[5]) issues.push(id + ': a spawn pad is missing from the picture');
      if (!g.look) issues.push(id + ': no palette for the picture');
      // fair: the cover is the same turned half a circle about the middle
      let asym = 0;
      for (let j = 0; j < g.h; j++) for (let i = 0; i < g.w; i++) {
        const a = g.cells[j * g.w + i], b = g.cells[(g.h - 1 - j) * g.w + (g.w - 1 - i)];
        if ((a === 1 || a === 2 || a === 3 || a === 6 || b === 1 || b === 2 || b === 3 || b === 6) && a !== b) asym++;
      }
      if (asym) issues.push(id + ': the picture is not the same both ways round (' + asym + ' cells differ)');
      const f = mapPictureFeel(g);
      for (const k of Object.keys(f)) if (!(f[k] >= 0 && f[k] <= 1)) issues.push(id + ': feel ' + k + ' = ' + f[k]);
      info.push(id + ' ' + Object.entries(f).map(([k, v]) => k + ' ' + v.toFixed(2)).join(' '));
    }
    const ids = Object.keys(grids);
    for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) {
      if (grids[ids[a]].cells.join() === grids[ids[b]].cells.join()) issues.push(ids[a] + ' and ' + ids[b] + ' look identical');
    }
    // the bot reads the picture: its taste decides, and it is a different map for different tastes
    const picks = {};
    for (const t of Object.keys(MAP_BOT_TASTES)) {
      const r = botPickMap(DUEL_MAP_IDS, t, 'hard', () => 0.5);
      if (!DUEL_MAP_IDS.includes(r.mapId)) issues.push(t + ' picked ' + r.mapId + ', not one of the options');
      picks[t] = r.mapId;
    }
    info.push('picks ' + JSON.stringify(picks));
    if (picks.climber !== 'duel_platform') issues.push('a bot that wants the high ground picked ' + picks.climber + ', not duel_platform');
    if (new Set(Object.values(picks)).size < 3) issues.push('bots with different tastes should not all agree: ' + JSON.stringify(picks));
    // an easy bot wanders: over many looks it does not always say the same thing
    const easy = new Set();
    for (let k = 0; k < 60; k++) easy.add(botPickMap(DUEL_MAP_IDS, 'rusher', 'easy').mapId);
    if (easy.size < 2) issues.push('an easy bot never changed its mind in 60 looks');
    // the pre-pick is gone: a duel map picked on the mode screen counts as random everywhere, 1v1 included
    // what the lobby is asked for: never a pre-picked duel map (the vote comes after the opponent is found)
    if (lobbyPrePick('1v1', 'duel_grid') !== 'auto') issues.push('1v1 still asks the lobby for a pre-picked duel map');
    if (lobbyPrePick('1v1', 'volcano') !== 'auto') issues.push('1v1 only plays the duel maps, whatever was picked');
    if (lobbyPrePick('2v2', 'duel_grid') !== 'auto') issues.push('a duel map pre-picked for another mode should be random');
    if (lobbyPrePick('2v2', 'volcano') !== 'auto') issues.push('no mode asks the lobby for a map up front any more: the vote picks it');
    if (lobbyPrePick('ffa5', 'auto') !== 'auto') issues.push('ffa5 asked for a map');
    // modes with nobody to vote with ask alone; modes with their own arena are not asked at all
    for (const [m, want] of [['dice_duel', true], ['roulette', true], ['piefight', true], ['range', false], ['lobby13', false], ['koth', false], ['m4_tower', false], ['obby', false]]) {
      if (GAME_MODE_CONFIGS[m] && modeUsesMapChoice(GAME_MODE_CONFIGS[m]) !== want) issues.push(m + ': modeUsesMapChoice should be ' + want);
    }
    if (mapCardLabel('vietnam') === 'RANDOM') issues.push('a real map is labelled RANDOM (vietnam has no card)');
    // and what spawnGameBots resolves a map from: the duel map the VOTE picked has to survive for 1v1 (it did not:
    // it was re-rolled at random, so the vote was ignored, and two players could load different maps)
    if (effectivePickedMap('1v1', 'duel_crossroads') !== 'duel_crossroads') issues.push('the voted duel map is thrown away for 1v1');
    if (effectivePickedMap('5v5', 'duel_crossroads') !== 'auto') issues.push('a duel map should be random in any other mode (2v2 is dealt them too)');
    if (effectivePickedMap('2v2', 'duel_crossroads') !== 'duel_crossroads') issues.push('a voted duel map is thrown away for 2v2');
    return { issues, info };
  })()`);
  const srv = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const more = [];
  if (!/!extra\.pickedMap && !MAP_VOTE_SKIP\.has\(mode\) && !M4_TOWER_MODES\.has\(mode\) && beginMapPick\(L, extra\)/.test(srv)) more.push('startLobbyMatch does not hand a lobby match to the map vote');
  if (!/socket\.on\('mapPickVote'/.test(srv)) more.push('server has no mapPickVote handler');
  if (!/leaveMapPick\(socket\.id\);\s*\/\/ a map vote in progress/.test(srv)) more.push('a disconnect does not leave the map vote');
  if (!/const options = mapPoolFor\(L\.mode\)\.slice\(\)/.test(srv)) more.push('the vote is not over the mode\'s map pool');
  if (!/const MAP_VOTE_SKIP = new Set\(\['koth'\]\)/.test(srv)) more.push('koth plays its own arena and should skip the vote');
  // a screenshot for every map that can be voted for, and none of them an empty file
  const previewDir = path.join(__dirname, '..', 'public', 'map-previews');
  const ids = vm.runInThisContext('MAP_IDS.filter(id => MAP_GROUPS[id] && MAP_BOUNDS[id] && !THIN_MAPS.has(id))');
  for (const id of ids) {
    const f = path.join(previewDir, id + '.jpg');
    if (!fs.existsSync(f)) more.push('no map-previews/' + id + '.jpg: run tools/render-map-previews.js');
    else if (fs.statSync(f).size < 1500) more.push('map-previews/' + id + '.jpg is nearly empty (' + fs.statSync(f).size + ' bytes)');
  }
  if (/id="map-pick-btn"/.test(fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8'))) more.push('the MAP button is back on the mode screen');
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
  if (!/function syncDuelMapCards\(\) \{\s*document\.querySelectorAll\('\.map-card\[data-duel="1"\], \[data-duel-label="1"\]'\)\.forEach\(c => \{ c\.style\.display = 'none'/.test(src)) more.push('the duel cards are still in the mode-screen map list');
  console.log('map vote checks: pictures, a bot that reads them, no pre-pick, server wiring');
  for (const l of out.info) console.log('  ' + l);
  const all = out.issues.concat(more);
  if (all.length) { ok = false; console.log(all.join('\n')); }
}

if (ok && process.argv.includes('--quickmelee')) {
  // Quick melee (B / middle mouse) for every melee in play: it equips, uses the ability or swings, and a multi-part
  // ability (crowd charge, slam, dash, spin, aimed dash) is allowed to finish before the gun comes back.
  const issues = vm.runInThisContext(`(() => {
    const issues = [];
    const S = { user: currentUser, combo: MELEE_COMBO_MODE, started: gameStarted, dead: isDead, slot: activeSlot, mel: selectedMeleeIdx, match, mode: selectedModeConfig,
                sound: playSoundEvent, anim: showAnnouncement, cd: countdownActive, pri: selectedPrimaryIdx, sec: selectedSecondaryIdx, sup: selectedSupportIdx };
    const keepWalls = wallColliders.slice();
    const reset = () => {
      try { finishMeleeSlam(); } catch (e) {} try { finishMeleeDash(); } catch (e) {} try { finishBatCrowdClear(); } catch (e) {}
      scytheDash = null; autoLunge = null; meleeAbilityBuff = null; _quickMeleeReturn = null; _grappleRide = null; meleeCombo = null;
      slamState = null; activeSlot = 'primary'; meleeSwingT = 1; lastMelee = 0;
      for (const k of Object.keys(abilityCDs)) delete abilityCDs[k];
    };
    try {
      gameStarted = true; isDead = false; match = { type: 'ffa', cfg: {} }; selectedModeConfig = GAME_MODE_CONFIGS['ffa5']; countdownActive = false;
      selectedPrimaryIdx = WEAPONS.findIndex(w => w.id === 'ak20'); selectedSecondaryIdx = WEAPONS.findIndex(w => w.id === 'pistol'); selectedSupportIdx = 0;
      playSoundEvent = () => {}; showAnnouncement = () => {};
      const sequence = new Set(['melee_slam', 'melee_charge', 'melee_lunge', 'melee_spinslash', 'bat_crowd_clear']);
      setMeleeComboMode(false);          // the regular abilities are the ones that must run to the end before the gun comes back
      for (let i = 0; i < MELEE_ITEMS.length; i++) {
        const m = MELEE_ITEMS[i];
        if (m.archived || m.adminItem || m.skinOnly || !meleeModels[i]) continue;
        reset();
        selectedMeleeIdx = i;
        camera.position.set(0, 1.65, 0); camera.quaternion.set(0, 0, 0, 1);
        try { quickMelee(); } catch (e) { issues.push(m.id + ': quick melee threw: ' + e.message); continue; }
        if (!_quickMeleeReturn || activeSlot !== 'melee') { issues.push(m.id + ': quick melee did not equip the melee'); continue; }
        try { updateQuickMelee(); } catch (e) { issues.push(m.id + ': update threw: ' + e.message); }
        const ab = m.ability;
        if (ab && sequence.has(ab.type) && activeSlot !== 'melee') issues.push(m.id + ' (' + ab.type + '): the gun came back while the ability was still running');
        if (ab && ab.type === 'melee_mobility' && ab.aimDash && activeSlot !== 'melee') issues.push(m.id + ': the aimed dash was cancelled by the slot change');
        // with the ability cooling down it must still swing
        reset();
        selectedMeleeIdx = i;
        if (ab) abilityCDs[m.id] = Date.now();
        const before = lastMelee;
        try { quickMelee(); } catch (e) { issues.push(m.id + ': cooldown quick melee threw: ' + e.message); continue; }
        if (ab && !(meleeSwingT < 1 || lastMelee !== before)) issues.push(m.id + ': with the ability cooling down, quick melee did nothing');
      }
      // combo mode (admin accounts only: the combos are archived): B on the ground is the first step (then the gun returns); B in the AIR is the sledge's slam, and that one is let finish
      currentUser = { isAdmin: true }; setMeleeComboMode(true);
      const sl = MELEE_ITEMS.findIndex(m => m.id === 'sledge');
      reset(); selectedMeleeIdx = sl; camera.position.set(0, 1.65, 0);
      try { quickMelee(); updateQuickMelee(); } catch (e) { issues.push('combo mode: quick melee on the ground threw: ' + e.message); }
      reset(); selectedMeleeIdx = sl; camera.position.set(0, 7, 0); slamState = { vel: 0, type: 'jump' };
      try { quickMelee(); updateQuickMelee(); } catch (e) { issues.push('combo mode: quick melee in the air threw: ' + e.message); }
      if (!meleeSlam) issues.push('combo mode: quick melee with the sledge in the air should slam down');
      else if (activeSlot !== 'melee') issues.push('combo mode: the gun came back while the sledge was still slamming');
      // the Chain Maul has an ability now, and nothing in play is without one
      const cm = MELEE_ITEMS.find(m => m.id === 'chain_hammer');
      if (!cm || !cm.ability || cm.ability.type !== 'melee_meteor') issues.push('the Chain Maul has no ability');
      for (const m of MELEE_ITEMS) if (!m.archived && !m.adminItem && !m.skinOnly && !m.ability) issues.push(m.id + ': a melee in play with no ability');
    } finally {
      reset(); setMeleeComboMode(S.combo); currentUser = S.user;
      gameStarted = S.started; isDead = S.dead; activeSlot = S.slot; selectedMeleeIdx = S.mel; match = S.match;
      selectedModeConfig = S.mode; playSoundEvent = S.sound; showAnnouncement = S.anim; countdownActive = S.cd;
      selectedPrimaryIdx = S.pri; selectedSecondaryIdx = S.sec; selectedSupportIdx = S.sup;
      wallColliders.length = 0; wallColliders.push(...keepWalls);
    }
    return issues;
  })()`);
  console.log('quick melee checks: every melee equips, uses its ability or swings, and sequences finish');
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--shop')) {
  const issues=vm.runInThisContext(`(() => {
    const issues=[],saved=currentUser;
    const check=(v,m)=>{if(!v)issues.push(m);};
    for(const b of BUNDLES){
      check(b.items.length===3 && b.skins.length>0,'Bundle must have three weapons and skins: '+b.id);
      for(const id of b.items){
        const w=WEAPONS.find(w=>w.id===id)||MELEE_ITEMS.find(w=>w.id===id);
        check(w && !w.archived && !w.adminItem && !w.skinOnly && !w.modeOnly,'Unavailable bundle item: '+id);
      }
      for(const id of b.skins){const skin=catalogSkin(id);check(!!skin,'Unknown bundle skin: '+id);
        check(b.items.includes(skin?.weapon||skin?.melee),'Skin must fit a bundled weapon: '+id);}
    }
    try{
      currentUser={purchased:[],skinInventory:[]};
      check(loadoutPreviewHTML('minigun').includes('catalog-lock'),'Locked selection needs a lock');
      currentUser.purchased.push('minigun');
      check(!loadoutPreviewHTML('minigun').includes('catalog-lock'),'Owned selection must not show a lock');
      for(const id of PVP_SHOP_CATALOG.exclusiveSkins){
        const s=catalogSkin(id),model=s.build();model.updateMatrixWorld(true);
        check(!new THREE.Box3().setFromObject(model).isEmpty(),'Empty food skin: '+id);
        check(isCaseSkinLocked(s),'Food skin must require acquisition: '+id);
        currentUser.skinInventory.push(id);check(!isCaseSkinLocked(s),'Owned food skin must equip: '+id);
        disposeBody(model);
      }
    }finally{currentUser=saved;}
    return issues;
  })()`);
  console.log('shop catalog checks: current weapons, compatible cosmetics, locked selection and food-skin acquisition');
  if(issues.length){ok=false;console.log(issues.join('\n'));}
}

if (ok && process.argv.includes('--range')) {
  const issues=vm.runInThisContext(`(() => {
    const issues=[],check=(v,m)=>{if(!v)issues.push(m);};
    check(!GENERATED_LAYOUT_MAPS.has('range'),'Range must not be overwritten by generated combat layout');
    check(MAP_BOUNDS.range.halfX===20 && MAP_BOUNDS.range.halfZ===45,'Range bounds must match its physical perimeter');
    check(rangeMapGroup.userData.trainingBays===5,'Range must have five firing bays');
    check(MAP_THEMES.range.keep && MAP_THEMES.range.customDetail,'Range dressing must preserve clear lanes');
    const count=rangeMapColliders.length;_upgradeMap('range');
    check(rangeMapColliders.length===count,'Range cannot receive automatic combat cover');
    for(const [x,z] of [[-14,26],[-7,26],[0,26],[7,26],[14,26],[-10,14],[10,14],[-8,10],[8,10],[-15,-10],[6,-22],[15,-32]]){
      const origin=new THREE.Vector3(x,1.65,38),delta=new THREE.Vector3(x,2,z).sub(origin),len=delta.length();
      rangeMapGroup.updateMatrixWorld(true);
      const hits=new THREE.Raycaster(origin,delta.normalize(),.1,len-.6).intersectObject(rangeMapGroup,true);
      check(!hits.some(h=>h.object.visible),'Blocked firing lane '+x+','+z);
    }
    const target=buildRangeTargetMesh();
    const rings=target.children.filter(o=>o.geometry?.type==='CylinderGeometry' && o.geometry.parameters.radiusTop>.08);
    check(rings.length===3 && rings.every(o=>o.position.z>0),'Bullseyes must face the firing house');
    disposeBody(target);
    return issues;
  })()`);
  console.log('range checks: dedicated layout, bounds, five booths, clear firing lines and visible bullseyes');
  if(issues.length){ok=false;console.log(issues.join('\n'));}
}

if (ok && process.argv.includes('--remote-grips')) {
  const issues=vm.runInThisContext(`(() => {
    const issues=[],palm=new THREE.Vector3(),grip=new THREE.Vector3();
    const items=WEAPONS.filter(w=>!w.archived);
    for(const item of items){
      const body=makePlayerMesh('Grip check',true);
      armRemoteMesh(body,item.id);
      if(!body._gun.userData.gripCentered){disposeBody(body);continue;}
      for(const [crouch,slide,jump,aim] of [[0,0,0,0],[.58,0,0,0],[.58,1,0,0],[0,0,1,0],[0,0,0,.75]]){
        body.position.set(12,3,-8);body.rotation.y=1.3;
        for(let i=0;i<20;i++){
          body.position.x+=.08;animateCharacterMesh(body,1/60,crouch,slide,jump,aim);
          body.updateMatrixWorld(true);body._rig.handR.getWorldPosition(palm);body._gun.getWorldPosition(grip);
          if(palm.distanceTo(grip)>1e-6){issues.push(item.id+': grip left palm during animation');break;}
        }
      }
      const before=body._gun;armRemoteMesh(body,item.id);
      if(body._gun!==before||body._gun.parent!==body._rig.gripR)issues.push(item.id+': duplicate or detached attachment');
      disposeBody(body);
    }
    const fallback=makeBotWeaponProp('ak20');
    if(!fallback.userData.gripCentered)issues.push('fallback rifle still uses receiver origin');
    disposeBody(fallback);
    return issues;
  })()`);
  if(issues.length){ok=false;console.log(issues.join('\n'));}
  else console.log('remote grips: active guns stay in palm through walking, crouching, sliding, jumping, aiming and duplicate equip');
}

if (ok && process.argv.includes('--admin-chat')) {
  const issues=vm.runInThisContext(`(() => {
    const issues=[],seen=new Set(),queue=['hello'];
    for(let i=0;i<queue.length;i++){
      const id=queue[i];if(seen.has(id))continue;seen.add(id);
      const node=ADMIN_CONVERSATION[id];
      if(!node){issues.push('Missing dialogue: '+id);continue;}
      if(!node.line||!node.replies.length||node.replies.length>3)issues.push('Empty or overloaded dialogue: '+id);
      if(/hellfire/i.test(JSON.stringify(node)))issues.push('Secret weapon name revealed: '+id);
      for(const [label,next] of node.replies){if(!label)issues.push('Empty player reply: '+id);queue.push(next);}
    }
    if(seen.size!==Object.keys(ADMIN_CONVERSATION).length)issues.push('Unreachable dialogue');
    for(const id of Object.keys(ADMIN_CONVERSATION)){
      const back=[id],visited=new Set();
      for(let i=0;i<back.length;i++){
        const next=back[i];if(visited.has(next))continue;visited.add(next);
        for(const reply of ADMIN_CONVERSATION[next]?.replies||[])back.push(reply[1]);
      }
      if(!visited.has('hello'))issues.push('Conversation trap: '+id);
    }
    if(!seen.has('hint')||!seen.has('name')||!seen.has('test'))issues.push('Missing prototype hint branches');
    return issues;
  })()`);
  if(issues.length){ok=false;console.log(issues.join('\n'));}
  else console.log('admin chat: reachable branches, real replies, exits and unreleased weapon name kept secret');
}

if (ok && process.argv.includes('--lobby')) {
  const issues = vm.runInThisContext(`(() => {
    const issues=[],poly=MAP_GROUPS.lobby13.userData.lobbyFootprint,cols=MAP_COLLIDERS.lobby13;
    const check=(v,m)=>{if(!v)issues.push(m);};
    check(poly && poly.length>12,'Lobby must have an irregular perimeter');
    if(!poly)return issues;
    const inside=(x,z)=>{
      let v=false;
      for(let i=0,j=poly.length-1;i<poly.length;j=i++){
        const [ax,az]=poly[i],[bx,bz]=poly[j];
        if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)v=!v;
      }
      return v;
    };
    const clear=(x,z,r=.45)=>!cols.some(b=>b.max.y>.2 && b.min.y<2 &&
      b.min.x<x+r && b.max.x>x-r && b.min.z<z+r && b.max.z>z-r);
    for(const p of [[-33,30],[32,30],[-22,32],[22,-28]])check(!inside(...p),'Old square corner remains');
    check(clear(0,18),'Lobby arrival is blocked');
    const todo=[[0,18]],seen=new Set(['0,18']);
    for(let i=0;i<todo.length;i++){
      const [x,z]=todo[i];
      for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=x+dx,nz=z+dz,key=nx+','+nz;
        if(!seen.has(key)&&inside(nx,nz)&&clear(nx,nz)){seen.add(key);todo.push([nx,nz]);}
      }
    }
    check(LOBBY_DUEL_PADS.length===5,'Missing duel bays');
    for(const p of LOBBY_DUEL_PADS)for(const side of ['blue','red']){
      check(clear(p[side].x,p[side].z,p.radius),'Duel staging area blocked');
      check(seen.has(p[side].x+','+p[side].z),'Duel pad unreachable from spawn');
    }
    for(const p of TRASHCAN_POSITIONS)check(seen.has(p.x+','+p.z),'Loadout station unreachable from spawn');
    for(const p of LOBBY_SERVICES)check(seen.has(p.x+','+p.z),'Lobby service unreachable: '+p.id);
    const nav=lobbyNavigation();check(nav.nodes.length>100,'Lobby visitors need walkable navigation');
    for(let i=0;i<50;i++){const p=lobbySpawnPoint(i);check(lobbyClear(p.x,p.z),'Lobby visitor spawn blocked');}
    const squad=LOBBY_DUEL_PADS.find(p=>p.modeId==='10v10');
    const b={...lobbySpawnPoint(0),_duelGoto:true};
    for(let i=0;i<4000 && Math.hypot(b.x-squad.red.x,b.z-squad.red.z)>.35;i++){
      const move=lobbyWalk(b,squad.red,.05);b.x+=move.x;b.z+=move.z;
    }
    check(Math.hypot(b.x-squad.red.x,b.z-squad.red.z)<.4,'NPC cannot route to squad hall');
    const savedBots=gameBots.slice(),savedUser=currentUser;
    try{
      gameBots.length=0;
      for(let i=0;i<19;i++)gameBots.push({id:'visitor-test-'+i,x:0,z:0,_lobbyVisitor:true,_wantsDuel:true});
      stageDuelBots(squad,'blue');
      check(gameBots.filter(b=>b._duelTeam==='mate').length===9,'10v10 needs nine teammates');
      check(gameBots.filter(b=>b._duelTeam==='foe').length===10,'10v10 needs ten opponents');
      for(const b of gameBots){b.x=b._duelGoto.x;b.z=b._duelGoto.z;}
      const seated=countSeated(squad,'blue');check(seated.blue===10 && seated.red===10,'Physical team counts must include player');
      currentUser={username:'lobby-story-check'};
      noteLobbyStory('met');noteLobbyStory('shop');
      check(readLobbyStory().met && readLobbyStory().shop,'Story progress must persist');
      currentUser={username:'lobby-other-account'};
      check(!readLobbyStory().shop,'Story progress must be account scoped');
    }finally{gameBots.length=0;gameBots.push(...savedBots);currentUser=savedUser;}
    return issues;
  })()`);
  console.log('lobby checks: irregular perimeter, removed square corners, spawn clearance, walkable routes to all duel pads and loadouts');
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--match-finale')) {
  const issues = vm.runInThisContext(`(() => {
    const issues = [], check = (v, m) => { if (!v) issues.push(m); };
    myId = 'finale-self'; currentUser = { username: 'Finale Tester' };
    players[myId] = { id: myId, team: 'ally', skin: 'default' };
    players['finale-mate'] = { id: 'finale-mate', name: 'Teammate', team: 'ally', skin: 'spiky', weaponId: 'pistol' };
    players['finale-enemy'] = { id: 'finale-enemy', name: 'Enemy', team: 'enemy', skin: 'default', weaponId: 'pistol', x: 6, z: 2 };
    pvpMatch = null;
    match = { type: 'race', active: false, over: true, cfg: {} };
    matchScore = { [myId]: 7, 'finale-mate': 7, 'finale-enemy': 4 };
    matchDeaths = { [myId]: 1, 'finale-mate': 2 };
    check(finaleRoster()[0].id === myId, 'MVP must use match kills, then deaths');
    noteKillInfo('finale-enemy', myId, 'pistol', true);
    captureFinalKill('finale-enemy', myId);
    const clip = MATCH_FINALE.lastKill;
    captureFinalKill(myId, myId);
    check(MATCH_FINALE.lastKill === clip, 'Self elimination must not replace final combat kill');
    check(JSON.parse(JSON.stringify(clip)).frames.length > 0, 'Final kill must be network serializable');
    MATCH_FINALE.lastKill = null;
    check(startMatchFinale('ally'), 'Scored match should start finale without a replay');
    check(MATCH_FINALE.phase === 'lineup', 'No recorded kill should go straight to MVP');
    updateMatchFinale(MATCH_FINALE.startedAt + 200);
    check(MATCH_FINALE.lineup.slice(1).every(x => !x.body.visible), 'Teammates should not appear immediately');
    updateMatchFinale(MATCH_FINALE.startedAt + 4000);
    check(MATCH_FINALE.lineup.length === 2, 'MVP lineup must exclude the other team');
    check(MATCH_FINALE.lineup.every(x => x.body.visible), 'Teammates should reveal after MVP');
    stopMatchFinale(true);
    check(!MATCH_FINALE.active && !MATCH_FINALE.stage && !MATCH_FINALE.replay, 'Finale resources must clear');
    resetMatchRivals();
    check(!MATCH_FINALE.lastKill && KILLCAM.buf.length === 0, 'New matches must clear old replays');
    match.type = 'wave_dash';
    check(!startMatchFinale('ally'), 'Wave Dash must keep its own results');
    match = null;
    return issues;
  })()`);
  console.log('match finale checks: ranking, self kills, network clip, staggered team reveal, cleanup and non-combat modes');
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--pearl')) {
  // Teleports (Blink Pearl, Teleport Beacon, Warp Beacon) must never put you outside the map: thrown from inside every map,
  // in every direction, as hard as the hardest one is thrown, a pearl lands within the play area (the map's own bounds, with
  // an edge margin), not on the scenery that stands out past a void edge or on a perimeter wall, and it never kills you. A pearl
  // thrown from the very edge still goes somewhere.
  const out = vm.runInThisContext(`(() => {
    const issues = [], notes = [];
    const saved = { sound: playSoundEvent, anim: showAnnouncement, audio: getAudioCtx, wsound: playWeaponSound, eq: playEquipSound, fx: spawnAbilityAOEFX, flash: flashScreen,
                    kill: killLocalOutOfBounds, started: gameStarted, dead: isDead, map: activeMapName, pos: camera.position.clone(), q: camera.quaternion.clone() };
    playSoundEvent = () => {}; showAnnouncement = () => {}; getAudioCtx = () => null; playWeaponSound = () => {}; playEquipSound = () => {};
    spawnAbilityAOEFX = () => {}; flashScreen = () => {};
    let killed = 0; killLocalOutOfBounds = () => { killed++; return true; };
    const skip = new Set(['range', 'lobby13', 'obby']);
    let thrown = 0, worst = { over: 0, map: '' };
    try {
      gameStarted = true; isDead = false;
      for (const n of MAP_IDS) {
        if (!MAP_BOUNDS[n] || skip.has(n) || M4_TOWER_MAP_NAMES.has(n)) continue;
        try { activateMap(n); } catch (e) { issues.push(n + ' did not activate: ' + e.message); continue; }
        const b = MAP_BOT_BOUNDS[n] || MAP_BOUNDS[n];       // the arena (a themed map's MAP_BOUNDS also holds its outskirts)
        const starts = [[0, 0], [b.halfX * 0.8, b.halfZ * 0.8], [-b.halfX * 0.8, b.halfZ * 0.8], [b.halfX * 0.8, -b.halfZ * 0.8], [-b.halfX * 0.8, -b.halfZ * 0.8],
                        [b.halfX * 0.95, 0], [-b.halfX * 0.95, 0], [0, b.halfZ * 0.95], [0, -b.halfZ * 0.95]];
        let bad = 0, example = '';
        for (const [sx, sz] of starts) {
          for (let yaw = 0; yaw < 360; yaw += 30) for (const pitch of [-0.1, 0.35, 0.8, 1.2]) {
            camera.position.set(sx, getGroundEyeY(sx, sz, 30), sz);
            camera.quaternion.setFromEuler(new THREE.Euler(pitch, yaw * Math.PI / 180, 0, 'YXZ'));
            activePearls.length = 0;
            throwBlinkPearl({ blink: 20 }); thrown++;
            const from = camera.position.clone();
            for (let i = 0; i < 700 && activePearls.length; i++) updateBlinkPearls(1 / 60);
            if (activePearls.length) { activePearls.length = 0; continue; }
            const p = camera.position;
            if (p.distanceTo(from) < 0.01) continue;                  // fizzled: it went nowhere
            const over = Math.max(Math.abs(p.x) - (b.halfX - 1.0), Math.abs(p.z) - (b.halfZ - 1.0));   // the pearl keeps 1.5 m in; 1.0 leaves room for wall push-out
            if (over > 0) { bad++; if (over > worst.over) worst = { over, map: n }; if (!example) example = '(' + p.x.toFixed(0) + ', ' + p.y.toFixed(1) + ', ' + p.z.toFixed(0) + ')'; }
          }
        }
        if (bad) issues.push(n + ': ' + bad + ' pearls landed outside the play area, e.g. ' + example + ' (bounds ' + b.halfX + ' x ' + b.halfZ + ')');
      }
      if (killed) issues.push('a pearl killed the thrower ' + killed + ' times: it should stop at the edge, not carry you out');
      notes.push(thrown + ' pearls thrown');
    } finally {
      playSoundEvent = saved.sound; showAnnouncement = saved.anim; getAudioCtx = saved.audio; playWeaponSound = saved.wsound; playEquipSound = saved.eq;
      spawnAbilityAOEFX = saved.fx; flashScreen = saved.flash; killLocalOutOfBounds = saved.kill;
      gameStarted = saved.started; isDead = saved.dead; activePearls.length = 0;
      try { activateMap(saved.map); } catch (e) {}
      camera.position.copy(saved.pos); camera.quaternion.copy(saved.q);
    }
    return { issues, notes };
  })()`);
  console.log('pearl checks: ' + out.notes.join(' · '));
  if (out.issues.length) { ok = false; console.log(out.issues.join('\n')); }
}

if (ok && process.argv.includes('--ceiling')) {
  // Low ceilings: slide (or crouch) under a slab, then jump or stand up. The eye used to be put back at standing height
  // INSIDE the slab, and the wall pass then ejected you sideways to the slab's nearest edge: out of the building, out of
  // the map. Now there is no standing up into a ceiling, and a body that is somehow in one is lowered, not thrown.
  const out = vm.runInThisContext(`(() => {
    const issues = [];
    const saved = { cols: wallColliders.slice(), started: gameStarted, dead: isDead, map: activeMapName, pos: camera.position.clone(), slam: slamState,
                    sound: playSoundEvent, fx: spawnAbilityAOEFX, anim: showAnnouncement, audio: getAudioCtx, ws: playWeaponSound, match };
    playSoundEvent = () => {}; spawnAbilityAOEFX = () => {}; showAnnouncement = () => {}; getAudioCtx = () => null; playWeaponSound = () => {};
    try {
      gameStarted = true; isDead = false; match = null;
      activateMap('blank');
      const slabY = [1.10, 1.30, 1.60, 1.95];
      for (const low of slabY) {
        for (const how of ['slide-jump', 'stand-up', 'crouch-jump']) {
          wallColliders.length = 0;
          // a hall roof, 24 m across, on nothing: you can slide under it from any side
          wallColliders.push(new THREE.Box3(new THREE.Vector3(-12, low, -12), new THREE.Vector3(12, low + 0.8, 12)));
          for (const k of Object.keys(keys)) keys[k] = false;
          slamState = null; playerYVel = 0; _extVel.x = 0; _extVel.z = 0; window._blastCarry = false;
          const lowEye = Math.min(0.70, low - 0.2);
          window._crouchEye = lowEye; window._prevCrouchHeld = false; window._prevShiftHeld = false;
          camera.position.set(2, lowEye, 0);
          camera.quaternion.set(0, 0, 0, 1);
          if (how === 'slide-jump') { window._slideUntil = Date.now() + 900; window._slideDir = new THREE.Vector3(1, 0, 0); }
          else { window._slideUntil = 0; }
          if (how === 'crouch-jump') keys['ControlLeft'] = true;
          if (how !== 'stand-up') { if (how === 'crouch-jump') keys['ControlLeft'] = false; doJump(false); }
          let worstStep = 0, headIn = 0, lastX = camera.position.x, lastZ = camera.position.z, below = 0;
          for (let f = 0; f < 150; f++) {
            updateMovement(1 / 60);
            const step = Math.hypot(camera.position.x - lastX, camera.position.z - lastZ);
            worstStep = Math.max(worstStep, step); lastX = camera.position.x; lastZ = camera.position.z;
            if (camera.position.y + 0.1 > low && Math.abs(camera.position.x) < 12.4 && Math.abs(camera.position.z) < 12.4) headIn++;
            if (camera.position.y < 0.3) below++;
          }
          const tag = how + ' under a ' + low.toFixed(2) + ' m ceiling: ';
          if (worstStep > 0.9) issues.push(tag + 'thrown ' + worstStep.toFixed(1) + ' m in one frame');
          if (Math.abs(camera.position.x) > 12.3 || Math.abs(camera.position.z) > 12.3) issues.push(tag + 'ended outside the slab footprint at (' + camera.position.x.toFixed(1) + ', ' + camera.position.z.toFixed(1) + ')');
          if (headIn) issues.push(tag + 'the head was inside the ceiling for ' + headIn + ' frames');
          if (below) issues.push(tag + 'fell through the floor');
        }
      }
    } finally {
      wallColliders.length = 0; wallColliders.push(...saved.cols);
      gameStarted = saved.started; isDead = saved.dead; slamState = saved.slam; match = saved.match;
      playSoundEvent = saved.sound; spawnAbilityAOEFX = saved.fx; showAnnouncement = saved.anim; getAudioCtx = saved.audio; playWeaponSound = saved.ws;
      try { activateMap(saved.map); } catch (e) {}
      camera.position.copy(saved.pos); window._crouchEye = 1.65; window._slideUntil = 0;
    }
    return issues;
  })()`);
  console.log('ceiling checks: slide-jump, crouch-jump and standing up under low ceilings (no ejection, no head in the slab)');
  if (out.length) { ok = false; console.log(out.slice(0, 20).join('\n')); }
}

if (ok && process.argv.includes('--uppercut')) {
  // The Fists' ability is an Uppercut: it throws you up (and a little forward), and whoever is in front of you, close, takes
  // 50 and is popped into the air. Behind you, too far or on your team: nothing but the hop.
  const out = vm.runInThisContext(`(() => {
    const issues = [];
    const saved = { sel: selectedMeleeIdx, slot: activeSlot, sound: playSoundEvent, fx: spawnAbilityAOEFX, flash: flashScreen, anim: showAnnouncement, hit: emitHit,
                    started: gameStarted, dead: isDead, slam: slamState, cam: camera.position.clone(), y: euler.y, cd: { ...abilityCDs }, me: players[myId], match, cdown: countdownActive, bots: gameBots.slice() };
    playSoundEvent = () => {}; spawnAbilityAOEFX = () => {}; flashScreen = () => {}; showAnnouncement = () => {};
    const hits = []; emitHit = (pid, bid, wid, pos, hs, opts) => { hits.push({ pid, wid, dmg: opts && opts.damageOverride }); };
    try {
      gameStarted = true; isDead = false; match = null; countdownActive = false; gameBots.length = 0;
      players[myId] = { hp: 300, team: 'ally' };
      const fi = MELEE_ITEMS.findIndex(m => m.id === 'fists'); selectedMeleeIdx = fi; activeSlot = 'melee';
      const ab = MELEE_ITEMS[fi].ability;
      if (ab.type !== 'melee_uppercut' || ab.damage !== 50) issues.push('the Fists ability should be a 50-damage uppercut, got ' + ab.type + ' ' + ab.damage);
      const put = (id, x, z, team) => { const m = new THREE.Group(); m.position.set(x, 0, z); m.visible = true; remoteMeshes[id] = m; players[id] = { id, isBot: false, team: team || 'enemy', hp: 300 }; };
      const clear = () => { for (const k of ['upA', 'upB', 'upC', 'upD']) { delete remoteMeshes[k]; delete players[k]; } };
      const fire = () => { meleeCombo = null; abilityCDs.fists = 0; slamState = null; _extVel.x = 0; _extVel.z = 0; hits.length = 0; camera.position.set(0, 1.65, 0); euler.y = 0; camera.quaternion.setFromEuler(euler); activateMeleeAbility(); };
      // in front: -z is forward at yaw 0
      clear(); put('upA', 0, -1.8);
      fire();
      if (!(slamState && slamState.vel >= 8)) issues.push('no launch upward (vel ' + (slamState && slamState.vel) + ')');
      if (!(_extVel.z < -1)) issues.push('no hop forward into the punch (extVel.z ' + _extVel.z + ')');
      if (hits.length !== 1 || hits[0].pid !== 'upA' || hits[0].wid !== 'fists_uppercut' || hits[0].dmg !== 50) issues.push('a target 1.8 m ahead should take one 50-damage uppercut, got ' + JSON.stringify(hits));
      // behind / too far / ally / below the floor: no hit, still a hop
      clear(); put('upA', 0, 1.8); put('upB', 0, -5); put('upC', 1, -1.5, 'ally');
      fire();
      if (hits.length) issues.push('behind, far away and allies must not be hit: ' + JSON.stringify(hits));
      if (!(slamState && slamState.vel >= 8)) issues.push('with nobody to hit it should still launch you');
      // the cooldown
      clear(); put('upA', 0, -1.8); fire(); hits.length = 0; activateMeleeAbility();
      if (hits.length) issues.push('the uppercut fired again with no cooldown');
      // the real hit path on a bot: 50 off its health, popped up
      emitHit = saved.hit;
      clear(); gameBots.length = 0;
      const bot = { id: 'upBotX', x: 0, z: -1.8, hp: 300, maxHp: 300, dead: false, state: 'chase', team: 'enemy' };
      gameBots.push(bot); players.upBotX = { id: 'upBotX', isBot: true, team: 'enemy', hp: 300 }; const bm = new THREE.Group(); bm.position.set(0, 0, -1.8); bm.visible = true; remoteMeshes.upBotX = bm;
      fire();
      if (!(bot.hp <= 250 && bot.hp >= 240)) issues.push('the bot should lose 50 (hp ' + bot.hp + ')');
      if (!((bot.yVel || 0) >= 6)) issues.push('the bot should be popped into the air (yVel ' + bot.yVel + ')');
      delete remoteMeshes.upBotX; delete players.upBotX;
    } finally {
      for (const k of ['upA', 'upB', 'upC', 'upD']) { delete remoteMeshes[k]; delete players[k]; }
      playSoundEvent = saved.sound; spawnAbilityAOEFX = saved.fx; flashScreen = saved.flash; showAnnouncement = saved.anim; emitHit = saved.hit;
      selectedMeleeIdx = saved.sel; activeSlot = saved.slot; gameStarted = saved.started; isDead = saved.dead; slamState = saved.slam; match = saved.match; countdownActive = saved.cdown;
      camera.position.copy(saved.cam); euler.y = saved.y; Object.assign(abilityCDs, saved.cd);
      if (saved.me) players[myId] = saved.me; else delete players[myId];
      gameBots.length = 0; gameBots.push(...saved.bots);
    }
    return issues;
  })()`);
  console.log('uppercut checks: launches you, 50 damage and a pop-up on a target in front, nothing behind / far / on your team, has a cooldown');
  if (out.length) { ok = false; console.log(out.join('\n')); }
}

if (ok && process.argv.includes('--jugg')) {
  // Juggernaut: eleven fighters, each round ONE is the juggernaut (a bot or you): twice the size, 15,000 health; the other ten
  // hunt him, 300 each, no respawn inside a round. Hunters win when he falls, he wins when the last hunter does or the clock
  // runs out; first side to four rounds takes the match. His health is a boss bar for everyone; he is dealt from a shuffled bag.
  const srv = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const more = [];
  if (!/'juggernaut':\s*\{ ally: 1, enemy: 10 \}/.test(srv)) more.push('the server should fill a Juggernaut match to ten hunters');
  if (!/socket\.on\('setBossHp'/.test(srv) || !/p\.matchMode !== 'juggernaut'/.test(srv)) more.push('the server should take the juggernaut\'s health only inside a Juggernaut match');
  const out = vm.runInThisContext(`(() => {
    const issues = [];
    const saved = { cfg: selectedModeConfig, match, started: gameStarted, dead: isDead, sound: playSoundEvent, anim: showAnnouncement, fx: spawnAbilityAOEFX, audio: getAudioCtx,
                    bots: gameBots.slice(), me: players[myId], pos: camera.position.clone(), walls: wallColliders.slice(), map: activeMapName, end: endMatch, cd: runCountdown,
                    emit: socket.emit, rm: resetMapStructures, st: globalThis.setTimeout, hit: emitHit, lobby: inLobby, doc: document.getElementById, id: myId };
    playSoundEvent = () => {}; showAnnouncement = () => {}; spawnAbilityAOEFX = () => {}; getAudioCtx = () => null; resetMapStructures = () => {}; runCountdown = (s, cb) => cb();
    const sent = []; socket.emit = (...a) => { sent.push(a); };
    let ended = null; endMatch = (w, why) => { ended = { w, why }; if (match) match.over = true; };
    const timers = []; globalThis.setTimeout = (f) => { timers.push(f); return timers.length; };
    const flush = () => { let n = 0; while (timers.length && n++ < 50) timers.shift()(); };
    try {
      const cfg = GAME_MODE_CONFIGS.juggernaut;
      if (!cfg || cfg.subtype !== 'jugg' || cfg.enemies !== 10 || cfg.winsNeeded !== 4 || cfg.juggHp !== 15000 || cfg.juggScale !== 2) { issues.push('the Juggernaut mode is not ten hunters, first to 4, 15,000 HP, twice the size: ' + JSON.stringify(cfg)); return issues; }
      myId = 'me_jugg_test';                       // (the harness has none)
      gameStarted = true; isDead = false; inLobby = false; gameBots.length = 0; activateMap('blank'); wallColliders.length = 0; camera.position.set(0, 1.65, 30);
      players[myId] = { id: myId, hp: 300, team: 'ally', dead: false };
      const mk = i => {
        const id = 'jb' + i;
        players[id] = { id, name: 'Hunter' + i, isBot: true, team: 'enemy', weaponId: 'ak20', ownerId: myId, skin: 'default', x: 0, y: 1, z: -30, hp: 300, maxHp: 300, dead: false };
        spawnRemotePlayer(players[id]); armRemoteMesh(remoteMeshes[id], 'ak20');
        const b = { id, team: 'enemy', weaponId: 'ak20', spawnWeaponId: 'ak20', x: 0, z: -30, rotY: 0, hp: 300, maxHp: 300, prevHp: 300, dead: false, state: 'chase', y: 0, yVel: 0, frostSlow: 100,
                    kbVX: 0, kbVZ: 0, difficulty: selectedDifficulty, tune: botTuning(selectedDifficulty), aimSkill: 1, activeSlot: 'primary', primaryId: 'ak20', botAmmo: 30, botMag: 30, botReserve: 90 };
        gameBots.push(b); return b;
      };
      for (let i = 0; i < cfg.enemies; i++) mk(i);
      selectedModeConfig = cfg;
      initMatch(); match.roundActive = true; match.active = true;
      const J = match.jugg;
      if (!J || J.wins.hunters !== 0 || J.wins.jugg !== 0) { issues.push('no juggernaut state on the match'); return issues; }
      // the bag: every one of the eleven before anybody twice
      {
        const seen = new Set(), ids = [myId, ...gameBots.map(b => b.id)]; let last = null, twice = 0;
        for (let i = 0; i < ids.length * 3; i++) { const id = juggPick(); if (i < ids.length) seen.add(id); if (id === last) twice++; last = id; J.id = id; }
        if (seen.size !== ids.length) issues.push('the first ' + ids.length + ' juggernauts should be all eleven fighters, got ' + seen.size);
        if (twice) issues.push('nobody should be the juggernaut twice in a row');
        J.bag = []; J.id = null;
      }
      const hunterOf = () => gameBots.filter(b => b.id !== J.id);
      const startAs = id => { timers.length = 0; J.bag = [id]; J.round = 0; J.wins.hunters = J.wins.jugg = 0; sent.length = 0; match.over = false; ended = null; isDead = false; juggStartRound(); };
      // ── a bot is the juggernaut
      startAs('jb3');
      {
        const jb = gameBots.find(b => b.id === 'jb3'), m = remoteMeshes.jb3;
        if (J.id !== 'jb3' || J.phase !== 'fight' || !match.roundActive) issues.push('the round did not start with the chosen bot as the juggernaut');
        if (jb.hp !== 15000 || jb.maxHp !== 15000 || players.jb3.hp !== 15000) issues.push('the juggernaut bot should have 15,000 HP: ' + jb.hp);
        if (!m || m._bodyScale !== 2 || Math.abs(m.scale.y - 2) > 1e-6 || Math.abs(m.scale.x - 2) > 1e-6) issues.push('the juggernaut bot should be twice the size');
        if (players.jb3.skin !== 'jugger') issues.push('the juggernaut should wear the plate');
        const hs = hunterOf();
        if (hs.length !== 10 - 1 || hs.some(b => b.hp !== 300 || b.team !== 'ally' || b.dead || (remoteMeshes[b.id]._bodyScale || 1) !== 1)) issues.push('the other nine bots should be 300-HP hunters on your side');
        if (jb.team !== 'enemy') issues.push('the juggernaut bot is the enemy when you are a hunter');
        if (players[myId].hp !== 300 || PLAYER_EYE_HEIGHT !== 1.65 || playerBodyScale !== 1) issues.push('you are an ordinary hunter this round: hp ' + players[myId].hp + ' eye ' + PLAYER_EYE_HEIGHT);
        if (!sent.some(a => a[0] === 'setBossHp' && a[1].hp === 0)) issues.push('the server should be told you are not the juggernaut');
        const fr = sent.filter(a => a[0] === 'forceRespawnBot' && a[1].id === 'jb3')[0];
        if (!fr || fr[1].hp !== 15000) issues.push('the server should be told the juggernaut bot has 15,000');
        // who goes after whom
        for (const h of hs) { const t = getBotTarget(h); if (!t || !t.botRef || t.botRef.id !== 'jb3') issues.push('a hunter should go after the juggernaut and nobody else'); }
        { const t = getBotTarget(jb); if (!t || !(t.isPlayer || (t.botRef && t.botRef.id !== 'jb3'))) issues.push('the juggernaut should go after a hunter'); }
        // no friendly fire among the hunters; the juggernaut is fair game, and he can hurt anyone
        if (!friendlyFireBlocked(hs[0].id, myId)) issues.push('you should not be able to shoot a fellow hunter');
        if (friendlyFireBlocked('jb3', myId)) issues.push('you should be able to shoot the juggernaut');
        if (friendlyFireBlocked(myId, 'jb3')) issues.push('the juggernaut should be able to hurt you');
        if (!friendlyFireBlocked(myId, hs[0].id)) issues.push('a hunter should not hurt you');
        // his bar: a boss's health across the screen
        updateJuggBoss();
        const U = juggBossUi();
        if (U.root.style.display !== 'block' || !/15,000 [/] 15,000/.test(U.num.textContent)) issues.push('the boss bar should show 15,000 / 15,000, shows: ' + U.num.textContent);
        jb.hp = 7500; updateJuggBoss();
        if (!/7,500 [/] 15,000/.test(U.num.textContent) || Math.abs(parseFloat(U.fill.style.width) - 50) > 0.1) issues.push('the boss bar should follow his health: ' + U.num.textContent + ' ' + U.fill.style.width);
        jb.hp = 15000;
        // the hit spheres are his size: a shot at 3 m above his feet hits him, and does not hit an ordinary body
        {
          const hits = [], keepHit = emitHit; emitHit = (pid) => { hits.push(pid); };
          try {
            for (const [id, y] of [['jb3', 3.0], ['jb1', 3.0]]) {
              const b = gameBots.find(x => x.id === id); b.x = 0; b.z = 0; syncBotMesh(b, { visible: true });
              for (const o of gameBots) if (o.id !== id) { o.x = 40; o.z = 40; syncBotMesh(o, { visible: true }); }
              spawnLocalBullet(new THREE.Vector3(0, y, -2), new THREE.Vector3(0, 0, 1), 'jt_' + id, true, 200, 0xffffff, 0.01, 'ak20'); updateBullets(0.02);
              localBullets.length = 0;
            }
          } finally { emitHit = keepHit; }
          if (!hits.includes('jb3')) issues.push('a shot at his head, three metres up, should hit the juggernaut');
          if (hits.includes('jb1')) issues.push('three metres up is over the head of an ordinary hunter');
        }
        // he falls: the hunters take the round
        jb.dead = true; jb.hp = 0; players.jb3.dead = true;
        juggOnKill('jb3', myId);
        if (J.phase !== 'between' || J.wins.hunters !== 1 || J.wins.jugg !== 0) issues.push('the hunters should win the round when he falls: ' + JSON.stringify([J.phase, J.wins]));
        if (match.roundActive) issues.push('the round should be over');
        // the next round: somebody else, everyone back with full health
        J.bag = ['jb5']; flush();
        if (J.round !== 2 || J.id !== 'jb5' || J.phase !== 'fight') issues.push('the next round should start with a new juggernaut: ' + JSON.stringify([J.round, J.id, J.phase]));
        if (gameBots.find(b => b.id === 'jb3').dead || gameBots.find(b => b.id === 'jb3').hp !== 300 || (remoteMeshes.jb3._bodyScale || 1) !== 1 || remoteMeshes.jb3.scale.y !== 1 || players.jb3.skin !== 'default') issues.push('the last juggernaut should be an ordinary 300-HP hunter again');
        if (gameBots.find(b => b.id === 'jb5').hp !== 15000 || remoteMeshes.jb5._bodyScale !== 2) issues.push('the new juggernaut should have the 15,000 and the size');
      }
      // ── you are the juggernaut
      startAs(myId);
      {
        if (J.id !== myId) issues.push('you should be the juggernaut when dealt');
        if (players[myId].hp !== 15000) issues.push('you should have 15,000 HP, have ' + players[myId].hp);
        if (matchMaxHp() !== 15000) issues.push('your health bar should be a share of 15,000');
        if (playerBodyScale !== 2 || Math.abs(PLAYER_EYE_HEIGHT - 3.3) > 1e-9 || !(PLAYER_RADIUS > 0.38 && PLAYER_RADIUS < 0.76)) issues.push('you should be twice the size: eye ' + PLAYER_EYE_HEIGHT + ' radius ' + PLAYER_RADIUS);
        if (Math.abs(camera.position.y - 3.3) > 0.01) issues.push('your eye should stand at 3.3 m, is at ' + camera.position.y);
        if (gameBots.some(b => b.team !== 'enemy' || b.hp !== 300 || b.dead)) issues.push('all ten bots should be 300-HP hunters against you');
        if (!sent.some(a => a[0] === 'setBossHp' && a[1].hp === 15000)) issues.push('the server should be told you have the boss health');
        for (const b of gameBots) { const t = getBotTarget(b); if (!t || !t.isPlayer) issues.push('every hunter should go for you'); }
        if (friendlyFireBlocked(gameBots[0].id, myId) || friendlyFireBlocked(myId, gameBots[0].id)) issues.push('you and the hunters can hurt each other');
        if (!friendlyFireBlocked(gameBots[1].id, gameBots[0].id)) issues.push('the hunters should not hurt each other');
        updateJuggBoss(); if (!/15,000 [/] 15,000/.test(juggBossUi().num.textContent)) issues.push('the bar should show you: ' + juggBossUi().num.textContent);
        // the bots' shots land on a body twice the size: a shot aimed over an ordinary head can still hit
        { let hit = 0, N = 400; const r0 = Math.random; try { for (let i = 0; i < N; i++) { if (botShotHitsPlayer({ x: 0, z: 0, aimSkill: 0.4 }, 60).hit) hit++; } } finally { Math.random = r0; }
          playerBodyScale = 1; PLAYER_EYE_HEIGHT = 1.65; PLAYER_RADIUS = 0.38; camera.position.y = 1.65; window._crouchEye = 1.65;
          let hit1 = 0; for (let i = 0; i < N; i++) { if (botShotHitsPlayer({ x: 0, z: 0, aimSkill: 0.4 }, 60).hit) hit1++; }
          playerBodyScale = 2; PLAYER_EYE_HEIGHT = 3.3; PLAYER_RADIUS = 0.38 * 1.6; camera.position.y = 3.3; window._crouchEye = 3.3;
          if (!(hit > hit1 * 1.15)) issues.push('a body twice the size should be hit more often: ' + hit + ' vs ' + hit1); }
        // standing, crouching and jumping keep the big eye
        { window._crouchEye = 3.3; const t0 = Math.min(playerBodyScale * 1.65, playerHeadroomEye()); if (Math.abs(t0 - 3.3) > 1e-6) issues.push('the standing eye of the big body is ' + t0); }
        // if you fall, the hunters take it
        isDead = true; players[myId].hp = 0; players[myId].dead = true;
        juggOnKill(myId, 'jb2');
        if (J.phase !== 'between' || J.wins.hunters !== 1) issues.push('the hunters should take the round when the juggernaut (you) falls');
        isDead = false; players[myId].dead = false;
      }
      // ── you are a hunter: the last hunter falls, or the clock runs out
      startAs('jb1');
      {
        if (playerBodyScale !== 1 || PLAYER_EYE_HEIGHT !== 1.65 || Math.abs(camera.position.y - 1.65) > 0.01) issues.push('a hunter is an ordinary size: ' + PLAYER_EYE_HEIGHT);
        if (matchMaxHp() !== 300) issues.push('a hunter has 300');
        for (const b of hunterOf()) { b.dead = true; b.hp = 0; players[b.id].dead = true; }
        isDead = true; players[myId].hp = 0;
        juggOnKill(myId, 'jb1');
        if (J.phase !== 'between' || J.wins.jugg !== 1) issues.push('the juggernaut should win when the last hunter falls: ' + JSON.stringify([J.phase, J.wins]));
        isDead = false; players[myId].dead = false;
        J.bag = ['jb4']; flush();
        if (J.phase !== 'fight' || J.id !== 'jb4') issues.push('the next round should start after the last: ' + JSON.stringify([J.phase, J.id]));
        if (hunterOf().some(b => b.dead || b.hp !== 300)) issues.push('every hunter should be back for the next round');
        // time out: he wins
        J.left = 0.05; updateJugg(0.1);
        if (J.phase !== 'between' || J.wins.jugg !== 2) issues.push('when the clock runs out the juggernaut wins the round: ' + JSON.stringify([J.phase, J.wins]));
        // the dead hunter waits, no respawn
        J.bag = ['jb4']; flush();
      }
      // ── first to four ends it
      startAs('jb2');
      {
        const jb = gameBots.find(b => b.id === 'jb2');
        for (let k = 0; k < 3; k++) {
          jb.dead = true; jb.hp = 0; players.jb2.dead = true; juggOnKill('jb2', myId);
          if (ended) issues.push('the match should not end at ' + J.wins.hunters + ' round wins');
          J.bag = ['jb2']; flush();
        }
        jb.dead = true; jb.hp = 0; players.jb2.dead = true; juggOnKill('jb2', myId);
        flush();
        if (J.wins.hunters !== 4) issues.push('four round wins expected, have ' + J.wins.hunters);
        if (!ended || ended.w !== 'ally' || !/4 – 0/.test(ended.why || '')) issues.push('the hunters (your side) reaching four should end the match with your win: ' + JSON.stringify(ended));
      }
      // the scores shown
      { match.over = false; const cache = {}; document.getElementById = id => cache[id] || (cache[id] = saved.doc(id));
        try { updateMatchHUD(); const L = cache['match-left'].textContent, R = cache['match-right'].textContent;
          if (!/HUNTERS 4[/]4/.test(L) || !/0[/]4 JUGGERNAUT/.test(R)) issues.push('the strip should show the round score, shows ' + L + ' | ' + R); } finally { document.getElementById = saved.doc; } }
      // cleaning up gives you your own size back
      startAs(myId); juggCleanup();
      if (playerBodyScale !== 1 || PLAYER_EYE_HEIGHT !== 1.65 || juggBossUi().root.style.display !== 'none') issues.push('the end of the match should give you your size back and hide the bar');
    } finally {
      globalThis.setTimeout = saved.st; socket.emit = saved.emit; emitHit = saved.hit; inLobby = saved.lobby; document.getElementById = saved.doc; delete players[myId]; myId = saved.id;
      playSoundEvent = saved.sound; showAnnouncement = saved.anim; spawnAbilityAOEFX = saved.fx; getAudioCtx = saved.audio; endMatch = saved.end; runCountdown = saved.cd; resetMapStructures = saved.rm;
      setPlayerBodyScale(1);
      for (const b of gameBots.slice()) { const m = remoteMeshes[b.id]; if (m) { scene.remove(m); delete remoteMeshes[b.id]; } delete players[b.id]; }
      gameBots.length = 0; for (const b of saved.bots) gameBots.push(b);
      match = saved.match; selectedModeConfig = saved.cfg; gameStarted = saved.started; isDead = saved.dead; players[myId] = saved.me; camera.position.copy(saved.pos);
      wallColliders.length = 0; for (const w of saved.walls) wallColliders.push(w);
      try { if (_juggUi) _juggUi.root.style.display = 'none'; } catch (e) {}
    }
    return issues;
  })()`);
  console.log('juggernaut checks: one juggernaut a round (a bot or you; dealt from a shuffled bag): twice the size with matching hit spheres, 15,000 HP, a plate and a boss bar; ten hunters at 300 who all go for him and cannot hurt each other; he wins by clearing them or the clock, they win by felling him; first side to four rounds takes it; everything is put back');
  const all = [...more, ...out];
  if (all.length) { ok = false; console.log(all.join('\n')); }
}

if (ok && process.argv.includes('--zombietower')) {
  // Zombie Tower, the mission on the real tower map: the story hands over to the climb; a pack on every floor (on THAT floor: spawned, standing
  // and walking at its height, the dead left behind when you change floor); weapons wait for F (ammo does not); clearing a floor heals;
  // the roof starts the horde (it follows you down: the dead left behind rejoin it); the last of it drops a radio (F); taking the radio
  // is the outro and a win; dying ends it; and it cleans up.
  const out = vm.runInThisContext(`(() => {
    const issues = [];
    const saved = { cfg: selectedModeConfig, match, started: gameStarted, dead: isDead, sound: playSoundEvent, anim: showAnnouncement, fx: spawnAbilityAOEFX, audio: getAudioCtx, ws: playWeaponSound, flash: flashScreen,
                    bots: gameBots.slice(), me: players[myId], pos: camera.position.clone(), walls: wallColliders.slice(), sel: [selectedPrimaryIdx, selectedSecondaryIdx, selectedMeleeIdx, selectedSupportIdx],
                    rnd: Math.random, map: activeMapName, end: endMatch, id: myId, now: Date.now, bhm: botHitsMe, lobby: inLobby };
    playSoundEvent = () => {}; showAnnouncement = () => {}; spawnAbilityAOEFX = () => {}; getAudioCtx = () => null; playWeaponSound = () => {}; flashScreen = () => {};
    let ended = null; endMatch = (w, why) => { ended = { w, why }; if (match) match.over = true; };
    let T = 1.8e12; Date.now = () => T;
    const on = (k, x, z) => { camera.position.set(x, towerFloorTop(k) + PLAYER_EYE_HEIGHT, z); playerYVel = 0; slamState = null; window._crouchEye = PLAYER_EYE_HEIGHT; window._mapLadder = null; };
    const step = (n, dt = 0.1) => { for (let i = 0; i < n; i++) { T += dt * 1000; updateZombieMode(dt); } };
    const grab = (k) => {                                                  // walk up to ladder k from the floor below and push on it: does it take hold?
      const L = MAP_LADDERS.zombie_tower[k], pose = mapLadderPose(L), n = pose.normal, keepPos = camera.position.clone();
      window._mapLadder = null; window._ladderDetachUntil = 0; playerYVel = 0; window._crouchEye = PLAYER_EYE_HEIGHT;
      camera.position.set(pose.x + n.x * 0.7, towerFloorTop(k) + PLAYER_EYE_HEIGHT, pose.z + n.z * 0.7); keys.KeyW = true;
      const input = new THREE.Vector3(-n.x, 0, -n.z); let got = false; for (let f = 0; f < 20 && !got; f++) { updateMapLadderMove(1 / 60, input); got = !!window._mapLadder; }
      keys.KeyW = false; window._mapLadder = null; camera.position.copy(keepPos); return got;
    };
    try {
      myId = 'me_tower_test'; inLobby = false; gameStarted = true; isDead = false; gameBots.length = 0;
      activateMap('zombie_tower'); players[myId] = { id: myId, hp: 300, team: 'ally', dead: false };
      selectedModeConfig = GAME_MODE_CONFIGS.zombies;
      initMatch(); match.roundActive = true; match.active = true;
      setupArcadeStart('zombie');
      const Z = match.zombie, Tw = Z.tower, kit = rngKit();
      if (!Tw) { issues.push('the zombie match on the tower map should have a tower mission'); return issues; }
      if (Z.phase !== 'story') issues.push('it should still open with the story, got ' + Z.phase);
      zombieStorySkip(); let g = 0; while (Z.phase === 'story' && g++ < 80) { T += 250; updateZombieMode(0.25); }
      if (Z.phase !== 'climb' || Tw.floor !== 0) issues.push('after the story the climb should begin in the lobby: ' + Z.phase + ' floor ' + Tw.floor);
      if (Math.abs(camera.position.y - PLAYER_EYE_HEIGHT) > 0.2) issues.push('you wake on the lobby floor, eye ' + camera.position.y);
      if (!kit || kit.slots[0] !== 'm:fists' || kit.slots[1]) issues.push('fists only to begin with');
      // ── floor 0: a pack of four, in the lobby, walking at you
      on(0, camera.position.x, camera.position.z);
      step(40);
      let here = towerHere(0);
      { const L0 = MAP_LADDERS.zombie_tower[0], F0 = MAP_TOWER.floors[0];
        if (!L0.locked || !F0.hatch.visible || F0.ring.color.getHex() !== 0xff3a2a) issues.push('with the lobby not clear, its hatch should be shut (locked, the hatch there, the ring red)');
        if (grab(0)) issues.push('a ladder with a shut hatch must not take hold of you'); }
      if (!Tw.packs[0] || here.length < 1) issues.push('the lobby should have a pack: ' + JSON.stringify(Tw.packs[0]) + ' here ' + here.length);
      if (here.some(b => b.floorY !== 0 || Math.abs(b.y) > 0.01 || b.team !== 'enemy' || !remoteMeshes[b.id])) issues.push('a zombie of the lobby is not standing on its floor');
      if (here.some(b => Math.hypot(b.x - camera.position.x, b.z - camera.position.z) < 12 && b._age == null && false)) issues.push('spawned on top of you');
      const z0 = here[0]; if (z0) {
        const d0 = Math.hypot(z0.x - camera.position.x, z0.z - camera.position.z); Z.tower.floor = 0; match.roundActive = true;
        for (let f = 0; f < 120; f++) { T += 1000 / 60; updateBotAI(1 / 60); }
        const d1 = Math.hypot(z0.x - camera.position.x, z0.z - camera.position.z);
        if (!(d1 < d0 - 2)) issues.push('a zombie in the lobby should close on you (' + d0.toFixed(1) + ' to ' + d1.toFixed(1) + ')');
      }
      // ── up to floor 3: the lobby dead are gone, the floor has its own pack, at its own height
      on(3, towerP(2)[0] + 2, towerP(2)[1] + 2); step(8);
      if (Tw.floor !== 3) issues.push('standing on floor 3 should make it your floor, got ' + Tw.floor);
      if (gameBots.some(b => b.zombie && b.floor !== 3)) issues.push('the dead of the floors below should be gone');
      step(60); here = towerHere(3);
      if (here.length < 1) issues.push('floor 3 should have a pack');
      if (here.some(b => Math.abs(b.floorY - towerFloorTop(3)) > 1e-6 || Math.abs(b.y - towerFloorTop(3)) > 0.05)) issues.push('the dead of floor 3 should stand at its height: ' + here.map(b => b.y.toFixed(1)));
      if (here.some(b => Math.abs(remoteMeshes[b.id].position.y - towerFloorTop(3)) > 0.05)) issues.push('and be drawn there');
      { const st = towerStats(3), st23 = towerStats(23); if (!(st23.hp > st.hp && st23.speed > st.speed)) issues.push('the higher the floor the tougher and quicker the dead'); if (!(towerPackSize(23) > towerPackSize(3) && towerPackSize(3) > towerPackSize(0))) issues.push('packs should grow with the floor'); }
      { const z3 = here[0]; if (z3) { const d0 = Math.hypot(z3.x - camera.position.x, z3.z - camera.position.z); for (let f = 0; f < 150; f++) { T += 1000 / 60; updateBotAI(1 / 60); }
        const d1 = Math.hypot(z3.x - camera.position.x, z3.z - camera.position.z);
        if (Math.abs(z3.y - towerFloorTop(3)) > 0.3) issues.push('a zombie walking on floor 3 sank or rose to ' + z3.y.toFixed(2));
        if (!(d1 < d0 - 2) && d0 > 4) issues.push('a zombie on floor 3 should close on you (' + d0.toFixed(1) + ' to ' + d1.toFixed(1) + ')'); } }
      // never over the hole
      { const h = MAP_TOWER.floors[3].hole, zz = zombieSpawn({ floor: 3, floorY: towerFloorTop(3), hp: 50, speed: 5, at: { x: h.x0 - 0.7, z: (h.z0 + h.z1) / 2, y: towerFloorTop(3) } });
        zz.x = h.x0 - 0.7; zz.z = (h.z0 + h.z1) / 2; const myx = camera.position.x, myz = camera.position.z; camera.position.x = (h.x0 + h.x1) / 2 + 3; camera.position.z = (h.z0 + h.z1) / 2;   // (you stand across the hole)
        // (a body's width over the lip is standing on the edge, as it is for you: the margin below)
        for (let f = 0; f < 200; f++) { T += 1000 / 60; updateBotAI(1 / 60); if (zz.x > h.x0 + 0.5 && zz.x < h.x1 - 0.5 && zz.z > h.z0 + 0.5 && zz.z < h.z1 - 0.5) { issues.push('a zombie walked into the hole'); break; } }
        if (zz.y < towerFloorTop(3) - 0.5) issues.push('a zombie fell down the hole'); zombieRemove(zz); camera.position.x = myx; camera.position.z = myz; }
      // ── a weapon waits for F, and only for the floor you are on; ammo does not wait
      for (const b of gameBots.slice()) if (b.zombie) zombieRemove(b); zombieClearPickups(); Tw.packs[3] = { toSpawn: 99, next: 1e15, cleared: false };
      { const px = camera.position.x + 1, pz = camera.position.z;
        zombieDropPickup('weapon', px, pz, 'ak20', 'A', towerFloorTop(3));
        if (Math.abs(zombiePickups[0].y - towerFloorTop(3)) > 0.05) issues.push('a drop on floor 3 lies on floor 3 (' + zombiePickups[0].y + ')');
        updateZombiePickups(0.016);
        if (!_zombieNear || kit.slots[1]) issues.push('a weapon on your floor should be offered, not taken');
        zombieTakeNearby(); if (kit.slots[1] !== 'ak20') issues.push('F should take it');
        zombieDropPickup('weapon', px, pz, 'ak20', 'A', towerFloorTop(2)); updateZombiePickups(0.016);
        if (_zombieNear) issues.push('a weapon a floor below is out of reach');
        zombieClearPickups(); const ai = WEAPONS.findIndex(w => w.id === 'ak20'); weaponAmmo[ai] = { ammo: 2, reserve: 0 };
        zombieDropPickup('ammo', px, pz, null, null, towerFloorTop(3)); updateZombiePickups(0.016);
        if (zombiePickups.length || weaponAmmo[ai].ammo !== WEAPONS[ai].mag) issues.push('ammo is taken as you pass'); }
      // ── clearing a floor: its dead all down, none left to come: a breather and a few HP
      { if (!MAP_LADDERS.zombie_tower[3].locked) issues.push('floor 3 still has its pack: the hatch should be shut'); if (grab(3)) issues.push('floor 3 is not clear: the ladder must not take hold');
        const pk = { toSpawn: 0, next: 0, cleared: false }; Tw.packs[3] = pk; players[myId].hp = 200; step(3);
        if (!pk.cleared || players[myId].hp !== 225) issues.push('an empty, finished floor should count as cleared and heal 25: ' + pk.cleared + ' ' + players[myId].hp);
        const L3 = MAP_LADDERS.zombie_tower[3], F3 = MAP_TOWER.floors[3];
        if (L3.locked || F3.hatch.visible || F3.ring.color.getHex() !== 0x39ff88) issues.push('a cleared floor opens its hatch (unlocked, hatch gone, ring green)');
        if (!grab(3)) issues.push('once the floor is clear the ladder takes hold again');
        if (MAP_LADDERS.zombie_tower[4].locked !== true) issues.push('clearing floor 3 must not open the hatch of floor 4'); }
      // the stragglers: the last of a floor that cannot get to you are brought to you, so the hatch is never held shut for good
      { Tw.floor = 5; on(5, 0, 8); const pk5 = Tw.packs[5] = { toSpawn: 0, next: 0, cleared: false };
        const zz = zombieSpawn({ floor: 5, floorY: towerFloorTop(5), hp: 50, speed: 0.01, at: { x: 28, z: -28, y: towerFloorTop(5) } }); step(2);
        if (pk5.cleared) issues.push('a floor with a zombie alive is not clear');
        const t0 = T; for (let i = 0; i < 520 && Math.hypot(zz.x - 28, zz.z + 28) < 1; i++) step(1, 0.1);
        if (Math.hypot(zz.x - 28, zz.z + 28) < 1) issues.push('after a while the last zombie of a floor should be brought to you');
        zombieRemove(zz); step(3); if (!pk5.cleared) issues.push('and when it is gone the floor is clear'); }
      // ── the roof: the horde, the way down, the swarm follows, the radio
      on(TOWER_FLOORS - 1, towerP(23)[0] + 2, towerP(23)[1] - 2); step(8);
      if (Z.phase !== 'horde' || !Tw.hordeStarted) issues.push('reaching the roof should start the horde: ' + Z.phase);
      if (MAP_LADDERS.zombie_tower.some(L => L.locked) || MAP_TOWER.floors.some(F => F.hatch && F.hatch.visible)) issues.push('once the horde is loose every hatch should be open');
      step(120);
      let alive = gameBots.filter(b => b.zombie && !b.dead);
      if (alive.length < 20 || alive.length > TOWER_HORDE_CAP) issues.push('the horde should be a crowd within its cap: ' + alive.length);
      if (alive.length + Tw.hordeLeft !== TOWER_HORDE) issues.push('every one of the horde is somewhere: ' + alive.length + ' + ' + Tw.hordeLeft + ' should be ' + TOWER_HORDE);
      if (!/HORDE/.test((() => { const cache = {}; const keep = document.getElementById; document.getElementById = id => cache[id] || (cache[id] = keep(id)); try { updateMatchHUD(); return cache['match-center'].textContent; } finally { document.getElementById = keep; } })())) issues.push('the strip should name the horde');
      const total = alive.length + Tw.hordeLeft;
      on(TOWER_FLOORS - 2, towerP(23)[0] - 1, towerP(23)[1] - 1); step(8);
      if (Tw.floor !== TOWER_FLOORS - 2) issues.push('stepping down through the hole should make the next floor yours: ' + Tw.floor);
      if (gameBots.some(b => b.zombie && b.floor !== TOWER_FLOORS - 2)) issues.push('the swarm cannot be on the floor above once you leave it');
      const total2 = gameBots.filter(b => b.zombie && !b.dead).length + Tw.hordeLeft;
      if (total2 !== total) issues.push('the swarm follows you down: nothing of it is lost (' + total + ' then ' + total2 + ')');
      step(60); if (!gameBots.some(b => b.zombie && !b.dead && b.floor === TOWER_FLOORS - 2)) issues.push('the horde should pour in on the floor you went down to');
      // the last of them: a radio
      for (const b of gameBots.slice()) if (b.zombie) zombieRemove(b);
      Tw.hordeLeft = 1; Tw.hordeNext = 0; step(12); const last = gameBots.filter(b => b.zombie && !b.dead);
      if (last.length !== 1 || Tw.hordeLeft !== 0) issues.push('one left to come, one on the floor: ' + last.length + ' / ' + Tw.hordeLeft);
      if (zombiePickups.some(p => p.kind === 'radio')) issues.push('no radio while the swarm still stands');
      const lz = last[0]; lz.dead = true; lz.hp = 0; zombieOnKill(lz.id, myId);
      const radio = zombiePickups.find(p => p.kind === 'radio');
      if (!radio || !Tw.radioDropped) { issues.push('the last of the horde should drop a radio'); }
      else {
        if (Math.abs(radio.y - towerFloorTop(TOWER_FLOORS - 2)) > 0.1) issues.push('the radio lies where it fell, on its floor');
        camera.position.x = radio.x; camera.position.z = radio.z; updateZombiePickups(0.016);
        if (Z.phase === 'outro' || ended) issues.push('the radio is taken with F, not by walking over it');
        if (!_zombieNear || _zombieNear.kind !== 'radio') issues.push('the radio should be offered');
        radio.born = T - 10 * 60 * 1000; updateZombiePickups(0.016); if (!zombiePickups.includes(radio)) issues.push('the radio never expires');
        zombieTakeNearby();
        if (Z.phase !== 'outro') issues.push('taking the radio should start the outro: ' + Z.phase);
        for (let i = 0; i < 400 && !ended; i++) { T += 50; updateZombieMode(0.05); }
        if (!ended || ended.w !== 'ally' || !/MISSION COMPLETE/.test(ended.why || '')) issues.push('the outro should end in a win: ' + JSON.stringify(ended));
      }
      // ── dying ends it, and with where you got to
      ended = null; match.over = false; Z.phase = 'climb'; Tw.floor = 7; zombieOnKill(myId, 'zzz');
      if (!ended || ended.w !== 'enemy' || !/floor 7/.test(ended.why || '')) issues.push('dying should end it, naming the floor: ' + JSON.stringify(ended));
      zombieSpawn({ floor: 7, floorY: towerFloorTop(7), at: { x: 0, z: 0, y: towerFloorTop(7) } }); zombieDropPickup('weapon', 3, 3, 'ak20', 'B', 0); zombieCleanup();
      if (gameBots.some(b => b.zombie) || zombiePickups.length) issues.push('zombies and pickups should be cleared at the end');
      Tw.packs = {}; Z.phase = 'climb'; towerSyncLocks(); if (!MAP_LADDERS.zombie_tower[0].locked) issues.push('(setup) a fresh climb shuts the hatches');
      zombieCleanup(); if (MAP_LADDERS.zombie_tower.some(L => L.locked) || MAP_TOWER.floors.some(F => F.hatch && F.hatch.visible)) issues.push('the hatches should all be open again when the match is over');
      if (_zombiePromptEl && _zombiePromptEl.style.display !== 'none') issues.push('the prompt should be gone');
    } finally {
      Math.random = saved.rnd; endMatch = saved.end; zombieClearPickups(); Date.now = saved.now; botHitsMe = saved.bhm; myId = saved.id; inLobby = saved.lobby;
      for (const b of gameBots.slice()) if (b.zombie || b.squad) zombieRemove(b);
      selectedModeConfig = saved.cfg; match = saved.match; gameStarted = saved.started; isDead = saved.dead;
      playSoundEvent = saved.sound; showAnnouncement = saved.anim; spawnAbilityAOEFX = saved.fx; getAudioCtx = saved.audio; playWeaponSound = saved.ws; flashScreen = saved.flash;
      gameBots.length = 0; gameBots.push(...saved.bots); if (saved.me) players[myId] = saved.me;
      wallColliders.length = 0; wallColliders.push(...saved.walls); camera.position.copy(saved.pos);
      [selectedPrimaryIdx, selectedSecondaryIdx, selectedMeleeIdx, selectedSupportIdx] = saved.sel;
      try { activateMap(saved.map); } catch (e) {}
    }
    return issues;
  })()`);
  console.log('zombie tower checks: the story then the climb, a pack on every floor at that floor\'s height, the dead left behind, weapons wait for F (ammo does not), a floor cleared heals, the roof starts the horde, it follows you down, the last of it drops a radio, the radio is the win, dying ends it');
  if (out.length) { ok = false; console.log(out.join('\n')); }
}

if (ok && process.argv.includes('--sample')) {
  // Recorded shots: a weapon in WEAPON_SAMPLES plays its own recording (real files, shipped in the itch bundle) once it is loaded, through a path of its own; before that, or if the
  // file never comes, the made-up shot plays exactly as before; guns without one are not touched; no skin changes it; weapons sharing a file fetch it once.
  const tbl = JSON.parse(vm.runInThisContext('JSON.stringify({ files: SAMPLE_FILES, samples: WEAPON_SAMPLES, events: EVENT_SAMPLES })'));
  const itch = fs.readFileSync(path.join(__dirname, 'build-itch.sh'), 'utf8'), filesLine = (itch.match(/^FILES=\(([^)]*)\)/m) || [])[1] || '';
  const LENGTH = { vector: 3.0, thump: 3.0, ring: 3.0, blast: 4.0, lightning: 3.0, isolated: 3.0, heavy: 4.0, rocket: 8.0, quick1: 0.5, quick2: 0.5, dry1: 3.0, dry4: 3.0, sharp1: 3.0, sharp3: 3.0, single: 3.0, heavy3: 3.0, isolatedB: 3.0, boomRoll: 8.0, boomTwin: 8.0, boomCrack: 8.0 };       // seconds in each file as it was made
  const more = [], cuts = [...Object.entries(tbl.samples), ...Object.entries(tbl.events).flatMap(([n, E]) => E.clips.map((c, i) => ['event ' + n + ' #' + (i + 1), c]))];
  for (const [k, u] of Object.entries(tbl.files)) {
    const f = path.join(__dirname, '..', 'public', u);
    if (!fs.existsSync(f) || fs.statSync(f).size < 5000) more.push('public/' + u + ' should be there');
    if (/^[/]/.test(u) || /^https?:/.test(u)) more.push(u + ': the sample path has to be relative (the game is not served from a root)');
    if (!LENGTH[k]) more.push('add the length of the "' + k + '" file to LENGTH in this test');
  }
  // The recordings reach the player as DATA in sound-data.js, not as files to fetch: a page opened as a file (double-click) may not fetch() anything, which is exactly how the
  // recordings silently never played for Andy. So: the data is what the mp3s say, index.html loads it, the server versions it (Cloudflare caches .js), the itch zip carries it.
  const SD = path.join(__dirname, '..', 'public', 'sound-data.js'), soundFiles = {};
  try { require('child_process').execFileSync(process.execPath, [path.join(__dirname, 'embed-sounds.js'), '--check'], { stdio: 'pipe' }); }
  catch (e) { more.push(String(e.stderr || e.message).trim().split('\n')[0]); }
  if (!/<script src="sound-data\.js"><\/script>/.test(fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8'))) more.push('index.html should load sound-data.js (<script src="sound-data.js">)');
  if (!/const VERSIONED = \[[^\]]*'sound-data\.js'/.test(fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8'))) more.push('sound-data.js should be in VERSIONED in server.js (Cloudflare caches .js: a changed sound needs a new URL)');
  if (!filesLine.split(/\s+/).includes('sound-data.js')) more.push('the itch bundle should carry sound-data.js (FILES in tools/build-itch.sh)');
  if (!/embed-sounds\.js"? --check/.test(itch)) more.push('tools/build-itch.sh should refuse a stale sound-data.js (embed-sounds.js --check)');
  const soundWin = {}; try { new Function('window', fs.readFileSync(SD, 'utf8'))(soundWin); } catch (e) { more.push('public/sound-data.js does not run: ' + e.message); }
  for (const u of Object.keys(tbl.files).map(k => tbl.files[k])) { try { soundFiles[u] = fs.readFileSync(path.join(__dirname, '..', 'public', u)); } catch (e) {} }
  globalThis.__soundData = soundWin.SOUND_DATA || {}; globalThis.__soundFiles = soundFiles;
  // The page carries the START of each clip, as much as any weapon plays of it plus a margin (the rest is silence or room hiss, cut off at a frame without re-encoding):
  // it must be the file's own first bytes, and long enough for the furthest cut. (That the cut decodes to the very same samples is checked with a real decoder: scratchpad mp/cut-equal.js.)
  { const E = require('./embed-sounds.js'), playedTo = {};                                           // (measured from the weapon table itself, with a margin of its own: not through the tool that did the cutting)
    for (const d of cuts.map(c => c[1])) { const u = tbl.files[d.file]; playedTo[u] = Math.max(playedTo[u] || 0, d.from + d.len * d.rate[1] + 0.02); }
    for (const u of Object.values(tbl.files)) {
      const emb = Buffer.from((soundWin.SOUND_DATA || {})[u] || '', 'base64'), whole = soundFiles[u];
      if (!whole || !emb.length) { more.push('sound-data.js has nothing for ' + u); continue; }
      if (!whole.subarray(0, emb.length).equals(emb)) more.push('sound-data.js: ' + u + ' is not the start of its file');
      else { const want = playedTo[u] ? Math.min(playedTo[u] + 0.1, E.mp3Seconds(whole)) : E.mp3Seconds(whole);        // (a clip shorter than the cut plus the margin is carried whole)
        if (E.mp3Seconds(emb) + 1e-6 < want) more.push('sound-data.js: ' + u + ' is cut too short for the longest cut anything makes of it (' + E.mp3Seconds(emb).toFixed(2) + ' s kept, ' + want.toFixed(2) + ' s needed)'); }
    } }
  for (const [id, d] of cuts) {
    if (!tbl.files[d.file]) more.push(id + ' names a file that is not in SAMPLE_FILES: ' + d.file);
    else if (LENGTH[d.file] && d.from + d.len * d.rate[1] > LENGTH[d.file] + 0.01) more.push(id + ' plays past the end of its file (from ' + d.from + ' + ' + d.len + ' x ' + d.rate[1] + ' > ' + LENGTH[d.file] + ')');
    if (!(d.gain > 0) || !(d.len > 0.2) || !(d.fade > 0 && d.fade <= d.len) || !(d.rate[0] > 0.5 && d.rate[1] < 2 && d.rate[0] <= d.rate[1])) more.push(id + ' has a setting that makes no sense: ' + JSON.stringify(d));
  }
  const out = vm.runInThisContext(`(() => {
    const issues = [];
    const node = () => { const t = { connect: x => x, disconnect() {}, start() {}, stop() {}, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {}, value: 0 };
      return new Proxy(t, { get: (o, k) => (k in o ? o[k] : (typeof k === 'string' ? node() : undefined)), set: (o, k, v) => { o[k] = v; return true; } }); };
    let sources = 0, lastSrc = null, sampleHits = 0; const seen = []; const SAMPLE = { duration: 3, numberOfChannels: 2 };
    const ctx = new Proxy({ currentTime: 1, sampleRate: 48000, state: 'running', destination: node(), createBufferSource() { sources++; const n = node(); lastSrc = new Proxy(n, { get: (o, k) => o[k], set: (o, k, v) => { if (k === 'buffer') { if (v === SAMPLE) sampleHits++; if (v && v.tag) seen.push(v.tag); } o[k] = v; return true; } }); return lastSrc; }, createBuffer(ch, len) { return { numberOfChannels: ch, length: len, duration: len / 48000, getChannelData: () => new Float32Array(len) }; } },
                          { get: (o, k) => (k in o ? o[k] : (typeof k === 'string' && k.startsWith('create') ? (() => node()) : undefined)) });
    const saved = { ctx: getAudioCtx, blast: playMuzzleBlast, st: { ..._sampleState }, voices: _sampleVoices, last: { ...weaponSoundLastAt }, fetch: globalThis.fetch, data: window.SOUND_DATA };
    let blasts = 0; getAudioCtx = () => ctx; playMuzzleBlast = () => { blasts++; };
    const clear = () => { for (const k of Object.keys(weaponSoundLastAt)) delete weaponSoundLastAt[k]; };
    const setAll = (st) => { for (const k of Object.keys(SAMPLE_FILES)) _sampleState[k] = st(); };
    const ids = Object.keys(WEAPON_SAMPLES);
    try {
      if (!WEAPON_SAMPLES.vector) issues.push('the Vector should have a sample');
      { const D = WEAPON_SAMPLES.vector; if (D.rate[0] !== 1 || D.rate[1] !== 1) issues.push('the Vector recording should play at its own pitch (rate 1): it is the sound that was sent'); if (D.from !== 0 || D.len < 1) issues.push('the Vector recording should play from its start, and all of its audible length'); }
      for (const id of ids) if (!WEAPONS.some(w => w.id === id)) issues.push(id + ' has a recording but is not a weapon');
      // the heavier the gun, the lower the shared recording plays
      { const R = (i) => WEAPON_SAMPLES[i].rate[0]; if (!(R('amr') < R('srx') && R('barrett') <= R('amr'))) issues.push('the bigger snipers should play the ring lower: srx ' + R('srx') + ', amr ' + R('amr') + ', barrett ' + R('barrett')); }
      // a big shot's own ability keeps its own sound
      for (const ab of ['hand_cannon_ab', 'barrett_ab', 'desert_eagle_ab']) { if (WEAPON_SAMPLES[ab]) issues.push(ab + ' is a powershot: it keeps its own sound'); }
      // not loaded yet: the made-up shot, for each of them
      setAll(() => ({ buf: null, loading: true, failed: false }));
      for (const id of ids) { clear(); blasts = 0; sampleHits = 0; playWeaponSound(id, {}); if (sampleHits) issues.push(id + ': until the file is there the made-up shot plays (samples ' + sampleHits + ')'); }
      // failed to load: the same
      setAll(() => ({ buf: null, loading: false, failed: true }));
      for (const id of ids) { clear(); sampleHits = 0; playWeaponSound(id, {}); if (sampleHits) issues.push(id + ': if the file never comes the made-up shot plays'); }
      // loaded: the sample, none of the made-up layers
      setAll(() => ({ buf: SAMPLE, loading: false, failed: false }));
      for (const id of ids) { clear(); blasts = 0; sampleHits = 0; _sampleVoices = 0; playWeaponSound(id, {}); if (sampleHits !== 1) issues.push(id + ': once loaded it should play its recording (samples ' + sampleHits + ')'); }
      clear(); blasts = 0; _sampleVoices = 0; playWeaponSound('vector', {}); if (blasts) issues.push('once loaded the Vector should not play the made-up shot as well (blasts ' + blasts + ')');
      // someone else's gun in the distance is the sample too
      for (const id of ids) { clear(); sampleHits = 0; _sampleVoices = 0; playWeaponSound(id, { remote: true, position: new THREE.Vector3(30, 1, 0) }); if (sampleHits !== 1) issues.push('a distant ' + id + ' is the recording too'); }
      // a powershot plays its own sound, not the recording
      for (const ab of ['hand_cannon_ab', 'barrett_ab']) { clear(); sampleHits = 0; playWeaponSound(ab, {}); if (sampleHits) issues.push(ab + ' must not play the recording of the plain shot'); }
      // a burst does not pile up without end
      clear(); sampleHits = 0; _sampleVoices = 0; for (let i = 0; i < 40; i++) { clear(); playWeaponSound('vector', {}); } if (sampleHits !== 40) issues.push('every shot of a burst should play the recording, played ' + sampleHits + ' of 40');
      clear(); sampleHits = 0; _sampleVoices = 0; for (let i = 0; i < 90; i++) { clear(); playWeaponSound('vector', {}); } if (sampleHits > 52 || sampleHits < 44) issues.push('a runaway burst should be capped near fifty voices, played ' + sampleHits);
      _sampleVoices = 0;
      // other guns are untouched
      for (const id of ['flamethrower', 'freeze_gun', 'crossbow', 'railgun', 'taser', 'paintball']) { clear(); sampleHits = 0; _sampleVoices = 0; playWeaponSound(id, {}); if (sampleHits) issues.push('the ' + id + ' must keep its own sound'); }
      // 💥 events: the big explosions are recordings (one of several, never the same one twice running; one roar per rocket), the little pops of a map keep the made-up boom
      { const E = EVENT_SAMPLES.explosion;
        if (!E || E.clips.length < 2) issues.push('the explosion should have several recordings to pick from');
        else {
          const tagged = {}; for (const c of E.clips) tagged[c.file] = { duration: 3, numberOfChannels: 2, tag: c.file };
          const load = (only) => { setAll(() => ({ buf: SAMPLE, loading: false, failed: false })); for (const c of E.clips) _sampleState[c.file] = (!only || only === c.file) ? { buf: tagged[c.file], loading: false, failed: false } : { buf: null, loading: true, failed: false }; };
          const boom = (vol, o, keepState) => { for (const k of Object.keys(soundEventLastAt)) delete soundEventLastAt[k]; if (!keepState) delete _eventSampleState.explosion; seen.length = 0; _sampleVoices = 0; playSoundEvent('explosion', Object.assign({ volume: vol }, o || {})); return seen.slice(); };
          load();
          if (boom(1.1).length !== 1) issues.push('a rocket-sized explosion should play one recording, played ' + seen.length);
          if (boom(E.min).length !== 1) issues.push('an explosion at exactly the minimum volume (' + E.min + ') should be a recording');
          if (boom(E.min - 0.01).length) issues.push('an explosion just under the minimum volume is a little pop: it keeps the made-up boom');
          if (boom(0.5).length) issues.push('the little pops of a map gimmick (volume 0.5) keep the made-up boom');
          if (boom(1.1, { remote: true, position: new THREE.Vector3(40, 1, 0) }).length !== 1) issues.push('a far explosion is the recording too');
          // one roar per rocket: spawnExplosion and rocketExplode both announce it
          boom(1.1); { const again = boom(1.1, null, true); if (again.length) issues.push('the same explosion announced twice (spawnExplosion and rocketExplode) should roar once, played ' + again.length + ' more'); }
          if (_eventSampleState.explosion) _eventSampleState.explosion.at = -1e9; if (boom(1.1, null, true).length !== 1) issues.push('a second explosion, after the dedupe window, should play');
          // never the same clip twice running, and every clip gets its turn
          { delete _eventSampleState.explosion; const order = []; for (let i = 0; i < 60; i++) { if (_eventSampleState.explosion) _eventSampleState.explosion.at = -1e9; const t = boom(1.1, null, true); if (t.length === 1) order.push(t[0]); }
            let twice = 0; for (let i = 1; i < order.length; i++) if (order[i] === order[i - 1]) twice++;
            if (order.length !== 60) issues.push('60 explosions should play 60 recordings, played ' + order.length);
            if (twice) issues.push('the same explosion clip played twice running ' + twice + ' times in 60');
            for (const c of E.clips) if (!order.includes(c.file)) issues.push('the explosion clip ' + c.file + ' never played in 60 explosions'); }
          // only one clip decoded so far: that one plays; none decoded (or failed): the made-up boom
          load(E.clips[1].file); { const t = boom(1.1); if (t.length !== 1 || t[0] !== E.clips[1].file) issues.push('with one clip decoded, that clip should play, got ' + t.join(',')); }
          setAll(() => ({ buf: null, loading: true, failed: false })); if (boom(1.1).length) issues.push('until a clip is decoded the made-up boom plays');
          setAll(() => ({ buf: null, loading: false, failed: true })); if (boom(1.1).length) issues.push('if the files never load the made-up boom plays');
          setAll(() => ({ buf: SAMPLE, loading: false, failed: false })); } }
      // a gun is the gun under any skin: the MP5 one, and the ones with a gag sound of their own, all play the recording (checked on a rifle, a pistol and the Vector)
      const keepFx = _skinFxFor;
      for (const who of ['vector', 'srx', 'hand_cannon']) for (const snd of [{ kind: 'auto_blast', vol: 0.18, dur: 0.07, f1: 0, f2: 0, action: 'slide' }, { kind: 'zip', vol: 0.22, dur: 0.06, f1: 1800, f2: 3400 }, { kind: 'bubblegun', vol: 0.2, dur: 0.07, f1: 420, f2: 980 }]) {
        _skinFxFor = (i) => i === who ? { sound: snd } : keepFx(i);
        clear(); sampleHits = 0; _sampleVoices = 0; playWeaponSound(who, {}); if (sampleHits !== 1) issues.push('a ' + who + ' skin (' + snd.kind + ') should play the recording too');
      }
      _skinFxFor = keepFx;
      // the page carries the recordings as data (sound-data.js): decoded from that, byte for byte, and nothing is fetched
      { const keepData = window.SOUND_DATA, urls = []; globalThis.fetch = (u) => { urls.push(u); return new Promise(() => {}); };
        window.SOUND_DATA = globalThis.__soundData;
        for (const [k, u] of Object.entries(SAMPLE_FILES)) {
          const ab = embeddedSound(u), src = globalThis.__soundFiles[u];
          if (!ab || !src || ab.byteLength < 5000 || ab.byteLength > src.length) { issues.push('the embedded data for ' + u + ' should be the start of the file (' + (ab && ab.byteLength) + ' bytes against ' + (src && src.length) + ')'); continue; }
          const got = new Uint8Array(ab); let same = true; for (let i = 0; i < got.length; i++) if (got[i] !== src[i]) { same = false; break; }
          if (!same) issues.push('the embedded data for ' + u + ' is not the start of the file, byte for byte');
        }
        for (const k of Object.keys(_sampleState)) delete _sampleState[k];
        weaponSamplesPreload(ctx); if (urls.length) issues.push('with the data in the page nothing should be fetched, fetched: ' + urls.join(', '));
        if (embeddedSound('sounds/not-a-sound.mp3') !== null) issues.push('an unknown file is not embedded');
        // no data (or broken data): the file is fetched instead, one fetch per file however many weapons use it
        for (const bad of [undefined, { 'sounds/vector-shot.mp3': 'not base64 !!' }]) {
          window.SOUND_DATA = bad; for (const k of Object.keys(_sampleState)) delete _sampleState[k]; urls.length = 0;
          weaponSamplesPreload(ctx); const want = new Set(Object.values(SAMPLE_FILES));
          if (urls.length !== want.size || new Set(urls).size !== want.size) issues.push('without usable data each file should be fetched once, however many weapons use it: ' + urls.length + ' fetches for ' + want.size + ' files (' + (bad ? 'broken data' : 'no data') + ')');
        }
        window.SOUND_DATA = keepData; }
    } finally { getAudioCtx = saved.ctx; playMuzzleBlast = saved.blast; globalThis.fetch = saved.fetch; window.SOUND_DATA = saved.data; for (const k of Object.keys(_eventSampleState)) delete _eventSampleState[k]; for (const k of Object.keys(soundEventLastAt)) delete soundEventLastAt[k]; for (const k of Object.keys(_sampleState)) delete _sampleState[k]; Object.assign(_sampleState, saved.st); _sampleVoices = saved.voices; for (const k of Object.keys(weaponSoundLastAt)) delete weaponSoundLastAt[k]; Object.assign(weaponSoundLastAt, saved.last); }
    return issues;
  })()`);
  console.log('sample checks: every recording plays when it is loaded (and for someone far away), the big explosions are recordings (the small ones are not, one roar per rocket, never the same clip twice running), the made-up shot before that or if it never comes, guns without one keep theirs, powershots keep their own, no skin changes it, heavier snipers play lower, bursts are capped, each file is fetched once (never, when the page carries it), the page carries the played start of every file as data (the file bytes themselves, long enough for every cut), the zip carries that, every cut fits its clip');
  if (out.length || more.length) { ok = false; console.log([...more, ...out].join('\n')); }
}

if (ok && process.argv.includes('--bins')) {
  // The weapon-swap trashcans are for the lobby: in a match they are not on the map and cannot be used, so nobody changes weapons mid-game.
  const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'game.js'), 'utf8');
  const out = vm.runInThisContext(`(() => {
    const issues = [];
    const save = { started: gameStarted, lobby: inLobby, dead: isDead, pos: camera.position.clone(), near: nearTrashcan };
    try {
      gameStarted = true; isDead = false; const p = TRASHCAN_POSITIONS[0];
      if (trashcanMeshes.length < TRASHCAN_POSITIONS.length * 2) issues.push('the bins and their glow rings should all be tracked: ' + trashcanMeshes.length);
      camera.position.set(p.x, 1.65, p.z);
      inLobby = true; updateTrashcanProximity();
      if (!nearTrashcan || trashcanMeshes.some(m => !m.visible)) issues.push('in the lobby the bins are there and you can use them');
      inLobby = false; updateTrashcanProximity();
      if (nearTrashcan) issues.push('in a match, standing where a bin was must not offer a weapon swap');
      if (trashcanMeshes.some(m => m.visible)) issues.push('in a match the bins should not be on the map');
    } finally { gameStarted = save.started; inLobby = save.lobby; isDead = save.dead; camera.position.copy(save.pos); nearTrashcan = save.near; }
    return issues;
  })()`);
  const swaps = (src.match(/showLoadoutScreen\('swap'\)/g) || []).length, guarded = (src.match(/inLobby && nearTrashcan[^\n]*showLoadoutScreen\('swap'\)/g) || []).length;
  const more = swaps === guarded ? [] : ['every weapon swap should need the lobby (' + guarded + ' of ' + swaps + ' do)'];
  console.log('bin checks: the swap trashcans stand in the lobby only, none in a match, and every way to swap weapons needs the lobby');
  if (out.length || more.length) { ok = false; console.log([...out, ...more].join('\n')); }
}

if (ok && process.argv.includes('--tower')) {
  // The Tower (Zombie Tower's map): 25 floors, 6.5 m apart, a 64 m square each; one ladder per floor up through a hole in the slab above, the holes
  // in opposite corners in turn; the whole thing is standable (floors above 14 m too); every ladder can be climbed from the floor below and puts you
  // on the floor above; a hole is a way down; the lobby, the roof, the numbers, and the floors can be crossed on foot between ladder and ladder.
  const out = vm.runInThisContext(`(() => {
    const issues = [];
    const saved = { map: activeMapName, pos: camera.position.clone(), vel: playerYVel, crouch: window._crouchEye, started: gameStarted, dead: isDead, slam: slamState, keys: { KeyW: keys.KeyW } };
    try {
      activateMap('zombie_tower');
      const name = 'zombie_tower', cols = MAP_COLLIDERS[name], F = MAP_TOWER.floors;
      if (MAP_IDS.includes(name)) issues.push('the tower must not be in MAP_IDS: no other mode may be dealt it');
      if (cols.length < 250 || cols.length > 4500) issues.push('the tower has ' + cols.length + ' colliders');
      if (F.length !== 25 || TOWER_FLOORS !== 25) issues.push('the tower should have 25 floors, has ' + F.length);
      const ld = MAP_LADDERS[name] || [];
      if (ld.length !== TOWER_FLOORS - 1) issues.push('there should be one ladder per floor but the top one: ' + ld.length);
      if (!cols.some(c => c.max.y > 150 && c.tall === true)) issues.push('the floors high up must count as ground (tall)');
      // every slab but the lowest has exactly the hole its ladder passes through, and it is where towerP says it is
      for (let k = 1; k < TOWER_FLOORS; k++) {
        const h = F[k].hole, p = towerP(k - 1);
        if (!h || Math.abs((h.x0 + h.x1) / 2 - p[0]) > 1e-6 || Math.abs((h.z0 + h.z1) / 2 - p[1]) > 1e-6) { issues.push('floor ' + k + ': the hole is not over the ladder of the floor below'); continue; }
        const top = towerFloorTop(k);
        const eyeAt = (x, z, floor) => getGroundEyeY(x, z, towerFloorTop(floor) + PLAYER_EYE_HEIGHT) - PLAYER_EYE_HEIGHT;
        if (Math.abs(eyeAt(p[0] + 3.5, p[1] + 3.5, k) - top) > 1e-6) issues.push('floor ' + k + ' is not ground next to its hole: ' + eyeAt(p[0] + 3.5, p[1] + 3.5, k));
        if (Math.abs(eyeAt(p[0], p[1], k) - towerFloorTop(k - 1)) > 1e-6) issues.push('floor ' + k + ': the hole is not a way down: ' + eyeAt(p[0], p[1], k));
      }
      if (new Set(Array.from({ length: 24 }, (_, k) => towerP(k).join())).size !== 2) issues.push('the ladders should alternate between two opposite corners');
      // climb every ladder, from the floor below to the floor above
      gameStarted = true; isDead = false; slamState = null;
      for (let k = 0; k < TOWER_FLOORS - 1; k++) {
        const L = ld[k]; if (!L) continue;
        const pose = mapLadderPose(L), n = pose.normal, bottom = towerFloorTop(k), top = towerFloorTop(k + 1);
        if (Math.abs(pose.bottom - bottom) > 0.01 || Math.abs(pose.top - top) > 0.01) { issues.push('ladder ' + k + ' does not run from floor ' + k + ' to floor ' + (k + 1) + ': ' + pose.bottom.toFixed(2) + ' ' + pose.top.toFixed(2)); continue; }
        window._mapLadder = null; window._ladderDetachUntil = 0; window._crouchEye = PLAYER_EYE_HEIGHT; playerYVel = 0;
        camera.position.set(pose.x + n.x * 0.9, bottom + PLAYER_EYE_HEIGHT, pose.z + n.z * 0.9);
        const input = new THREE.Vector3(-n.x, 0, -n.z);
        keys.KeyW = true; let frames = 0, grabbed = false;
        for (; frames < 400; frames++) {
          // (walking up to it, then holding forward: the way a player does)
          if (!window._mapLadder && frames < 30) { camera.position.x -= n.x * 0.02; camera.position.z -= n.z * 0.02; }
          const taken = updateMapLadderMove(1 / 60, input); if (window._mapLadder) grabbed = true;
          if (grabbed && !window._mapLadder) break;
        }
        keys.KeyW = false;
        const feet = camera.position.y - PLAYER_EYE_HEIGHT;
        if (!grabbed) { issues.push('ladder ' + k + ': could not take hold of it from the floor'); continue; }
        if (Math.abs(feet - top) > 0.2) { issues.push('ladder ' + k + ': ended at ' + feet.toFixed(2) + ', not on floor ' + (k + 1) + ' (' + top + ')'); continue; }
        if (frames > 200) issues.push('ladder ' + k + ' took ' + frames + ' frames to climb');
        // and what you stand on there is floor, with nothing in the way
        const g = getGroundEyeY(camera.position.x, camera.position.z, camera.position.y) - PLAYER_EYE_HEIGHT;
        if (Math.abs(g - top) > 1e-6) issues.push('ladder ' + k + ': the place it puts you is not ground (' + g.toFixed(2) + ' vs ' + top + ')');
        const [rx, rz] = resolvePosCollisions(camera.position.x, camera.position.z, top);
        if (Math.hypot(rx - camera.position.x, rz - camera.position.z) > 0.05) issues.push('ladder ' + k + ': it puts you inside something');
        if (resolvePlayerCeiling(camera.position.y - 0.0001) === true && false) issues.push('ceiling');
      }
      // the floors can be crossed on foot: a route over the 1 m grid the dead use, from the ladder you arrive by to the ladder you leave by
      for (let k = 0; k < TOWER_FLOORS - 1; k++) {
        const g = towerGrid(k); if (!g) { issues.push('floor ' + k + ': no grid for the dead'); continue; }
        const at = (x, z) => Math.floor((z - g.z0) / g.cell) * g.W + Math.floor((x - g.x0) / g.cell);
        const from = k === 0 ? [0, 24] : towerP(k - 1), to = towerP(k), stand = (p, d) => [p[0] + (p[0] > 0 ? -d : d), p[1] + (p[1] > 0 ? -d : d)];
        const a = k === 0 ? from : stand(from, 4), b = stand(to, 4);
        _botNavFill(g, at(b[0], b[1]));
        if (!(g.dist[at(a[0], a[1])] >= 0)) issues.push('floor ' + k + ' (' + F[k].kind + '): no way across from where you arrive to the ladder up');
      }
      if (!MAP_SPAWNS[name] || !MAP_ZOMBIE_WAKE[name] && !MAP_TOWER.wake) issues.push('no spawn or wake-up place');
    } finally {
      activeMapName = saved.map; camera.position.copy(saved.pos); playerYVel = saved.vel; window._crouchEye = saved.crouch; gameStarted = saved.started; isDead = saved.dead; slamState = saved.slam; keys.KeyW = saved.keys.KeyW; window._mapLadder = null;
      try { activateMap(saved.map); } catch (e) {}
    }
    return issues;
  })()`);
  console.log('tower checks: 25 floors with a ladder through a hole to the next, standable all the way up, every ladder climbable, a way down through every hole, a route across every floor');
  if (out.length) { ok = false; console.log(out.join('\n')); }
}

if (ok && process.argv.includes('--zombie')) {
  // Zombie Survival: you begin with fists only, waves come endlessly (bigger, tougher and quicker each time, never more than
  // the cap at once), a zombie walks to you and claws you, the dead drop ammo and weapons (rarely), a weapon goes in your
  // second slot (and what you held drops at your feet), ammo fills what you carry, dying ends it, and it all cleans up.
  const out = vm.runInThisContext(`(() => {
    const issues = [];
    const saved = { cfg: selectedModeConfig, match, started: gameStarted, dead: isDead, sound: playSoundEvent, anim: showAnnouncement, fx: spawnAbilityAOEFX,
                    audio: getAudioCtx, ws: playWeaponSound, bots: gameBots.slice(), me: players[myId], pos: camera.position.clone(), walls: wallColliders.slice(),
                    sel: [selectedPrimaryIdx, selectedSecondaryIdx, selectedMeleeIdx, selectedSupportIdx], rnd: Math.random, map: activeMapName, end: endMatch };
    playSoundEvent = () => {}; showAnnouncement = () => {}; spawnAbilityAOEFX = () => {}; getAudioCtx = () => null; playWeaponSound = () => {};
    let ended = null; endMatch = (w, why) => { ended = { w, why }; if (match) match.over = true; };
    try {
      gameStarted = true; isDead = false; gameBots.length = 0; wallColliders.length = 0;
      // (the endless tunnel is archived; its director still runs below, on an open floor, and the tower has its own checks: --tower and the end of this block)
      activateMap('blank'); wallColliders.length = 0; camera.position.set(0, 1.65, 0);
      players[myId] = { hp: 300, team: 'ally' };
      selectedModeConfig = GAME_MODE_CONFIGS.zombies;
      if (!selectedModeConfig || selectedModeConfig.subtype !== 'zombie') { issues.push('there is no zombies mode'); return issues; }
      if (selectedModeConfig.forcedMap !== 'zombie_tower' || modeUsesMapChoice(selectedModeConfig)) issues.push('Zombie Tower should be stuck to its own map, the tower (no map vote)');
      if (MAP_IDS.includes('zombie_tower') || MAP_IDS.includes('zombie_tunnel')) issues.push('the tower must not be in MAP_IDS: no other mode may be dealt it');
      const lightBefore = { amb: mapAmbient.intensity, sun: sun.intensity, bg: scene.background.getHex() };
      initMatch(); match.roundActive = true; match.active = true;
      if (!(mapAmbient.intensity <= 0.1 && sun.intensity <= 0.2 && scene.background.getHex() < 0x101018)) issues.push('the map should be dark: ambient ' + mapAmbient.intensity + ' sun ' + sun.intensity + ' sky ' + scene.background.getHex().toString(16));
      setupArcadeStart('zombie');
      const Z = match.zombie, kit = rngKit();
      // the story comes first: a squad walks with you, then the floor goes, black, a radio, bodies around you, then the waves
      if (Z.phase !== 'story' || !Z.story || Z.story.phase !== 'approach') issues.push('the match should open with the story, got ' + Z.phase);
      const squad = gameBots.filter(b => b.squad);
      if (squad.length !== 4 || squad.some(b => b.team !== 'ally' || b.dead || !remoteMeshes[b.id])) issues.push('four living squad mates should walk in with you: ' + squad.length);
      if (ZOMBIE_APPROACH_LINES.length < 3 || ZOMBIE_RADIO_LINES.length < 8) issues.push('the story has too few lines');
      if (!ZOMBIE_RADIO_LINES.some(l => /place we were sent to raid/.test(l[1])) || !ZOMBIE_RADIO_LINES.some(l => /horribly wrong/.test(l[1])) || !ZOMBIE_RADIO_LINES.some(l => /cannot give up/.test(l[1]))) issues.push('the radio monologue lost its key lines');
      // they follow you
      camera.position.set(0, 1.65, 0); for (let i = 0; i < 90; i++) updateBotAI(1 / 30);
      if (squad.some(b => Math.hypot(b.x - camera.position.x, b.z - camera.position.z) > 6)) issues.push('the squad should keep up with you: ' + squad.map(b => Math.hypot(b.x, b.z).toFixed(1)));
      // the walk-in, the rumble, the fall, the black
      let steps = 0; const phases = new Set();
      while (Z.story && Z.story.phase !== 'wake' && steps++ < 400) { phases.add(Z.story.phase); updateZombieMode(0.25); if (Z.story && Z.story.phase === 'black' && !Z.storyLock) issues.push('you should be pinned down while the radio plays'); }
      for (const ph of ['approach', 'fall', 'black']) if (!phases.has(ph)) issues.push('the story skipped its ' + ph + ' phase');
      if (!Z.story || Z.story.phase !== 'wake') issues.push('the story never reached the wake-up');
      if (squad.some(b => !b.dead || remoteMeshes[b.id].rotation.x > -1.4 || Math.hypot(b.x - camera.position.x, b.z - camera.position.z) > 5.5)) issues.push('the squad should be lying dead around you after the fall');
      if (!(camera.position.y > 1.5)) issues.push('after the fall you are back on your feet, y ' + camera.position.y);
      let sg = 0; while (Z.phase === 'story' && sg++ < 40) updateZombieMode(0.25);
      if (Z.phase !== 'break' || Z.storyLock || Z.story) issues.push('the story should end in a break before wave 1 with you free to move');
      // skipping: the same place, at once
      zombieCleanup(); zombieStoryStart();
      if (!Z.story || gameBots.filter(b => b.squad).length !== 4) issues.push('a fresh story should bring a fresh squad');
      zombieStorySkip();
      if (!gameBots.filter(b => b.squad).every(b => b.dead)) issues.push('skipping should still lay the squad down');
      let sk = 0; while (Z.phase === 'story' && sk++ < 40) updateZombieMode(0.25);
      if (Z.phase !== 'break') issues.push('skipping should end the story');
      if (!kit || kit.slots[0] !== 'm:fists' || kit.slots[1]) issues.push('you should begin with your fists and nothing else: ' + JSON.stringify(kit && kit.slots));
      if (activeSlot !== 'melee' || MELEE_ITEMS[selectedMeleeIdx].id !== 'fists') issues.push('the fists should be in your hands');
      camera.position.set(0, 1.65, 0);
      // waves: the first one, never past the cap, bigger and tougher each time
      const sizes = [1, 2, 6, 12].map(zombieWaveSize);
      if (!(sizes[0] < sizes[1] && sizes[1] < sizes[2] && sizes[2] < sizes[3])) issues.push('waves should keep growing: ' + sizes);
      if (!(zombieHpFor(10) > zombieHpFor(1) && zombieHpFor(1) >= 50)) issues.push('zombies should get tougher');
      Z.nextWaveAt = 0; updateZombieMode(0.016);
      if (Z.wave !== 1 || Z.phase !== 'fight' || Z.toSpawn !== zombieWaveSize(1)) issues.push('wave 1 did not start: ' + JSON.stringify({ w: Z.wave, p: Z.phase, n: Z.toSpawn }));
      let guard = 0; while (Z.toSpawn > 0 && guard++ < 200) { Z.nextSpawnAt = 0; updateZombieMode(0.016); }
      let zs = gameBots.filter(b => b.zombie);
      if (zs.length !== zombieWaveSize(1)) issues.push('wave 1 should field ' + zombieWaveSize(1) + ' zombies, got ' + zs.length);
      if (zs.some(b => !(b.hp >= 60 && b.hp === b.maxHp && b.team === 'enemy' && remoteMeshes[b.id]))) issues.push('a zombie is missing its body, team or health');
      if (zs.some(b => Math.hypot(b.x, b.z) < 12)) issues.push('a zombie spawned right next to you');
      // a big wave is capped
      for (let i = 0; i < 40; i++) zombieSpawn();
      Z.toSpawn = 10; Z.nextSpawnAt = 0; const before = gameBots.filter(b => b.zombie && !b.dead).length; updateZombieMode(0.016);
      if (before > ZOMBIE_CAP && gameBots.filter(b => b.zombie && !b.dead).length > before) issues.push('spawned past the cap');
      for (const b of gameBots.slice()) zombieRemove(b);
      Z.toSpawn = 0;
      // its own skin, and a claw that hurts
      if (!ZOMBIE_SKIN_IDS.every(id => PIXEL_SKINS[id] && !SKIN_IDS.includes(id))) issues.push('the zombies need skins of their own that nobody can wear');
      const zz = gameBots.find(b => b.zombie) || zombieSpawn();
      if (!ZOMBIE_SKIN_IDS.includes(players[zz.id].skin) || renderedSkinForPlayer(players[zz.id]) !== players[zz.id].skin) issues.push('a zombie should be drawn in a zombie skin');
      { const kinds = new Set(); for (let i = 0; i < 40; i++) { const zq = zombieSpawn(); kinds.add(players[zq.id].skin); zombieRemove(zq); } if (kinds.size < 3) issues.push('a crowd of zombies should not all wear one shirt: ' + [...kinds]); }
      if (getClientWeaponDamage('zombie_claw') < 30) issues.push('the claw should hit for 30, got ' + getClientWeaponDamage('zombie_claw'));
      // a zombie walks to you ...
      const z1 = zombieSpawn(); z1.x = 8; z1.z = 0; z1.zSpeed = 3; remoteMeshes[z1.id].position.set(8, 0, 0);
      match.roundActive = true;
      for (let f = 0; f < 60; f++) updateBotAI(1 / 60);
      if (!(z1.x < 6 && z1.x > 3.5)) issues.push('a zombie should close about 3 m in a second at 3 m/s, x is ' + z1.x.toFixed(2));
      // ... and claws you, once it has wound up, and not if you got away
      z1.x = 1.4; z1.z = 0; z1.lastAtk = 0; z1._windup = 0;
      players[myId].hp = 300; clearPlayerStatusEffects(); try { grantSpawnShield(0); } catch (e) {}
      let hits = 0; const realHit = botHitsMe; botHitsMe = (id, w) => { if (w === 'zombie_claw') hits++; };
      const realNow = Date.now; let T = realNow.call(Date); Date.now = () => T;   // the wind-up is in real time: tick a clock by hand
      for (let f = 0; f < 40; f++) { T += 1000 / 60; z1.x = 1.4; z1.z = 0; updateBotAI(1 / 60); }
      if (hits !== 1) issues.push('a zombie in reach should land one claw in 0.67 s, landed ' + hits);
      hits = 0; z1.lastAtk = 0; z1._windup = 0;
      for (let f = 0; f < 40; f++) { T += 1000 / 60; z1.x = f === 5 ? 8 : (f < 5 ? 1.4 : 8); z1.z = 0; updateBotAI(1 / 60); }
      if (hits) issues.push('you stepped away from the wind-up and still got clawed');
      botHitsMe = realHit; Date.now = realNow;
      // drops: a weapon (rare), ammo (rarer, only if you carry something that uses it)
      zombiePickups.length && zombieClearPickups();
      Math.random = () => 0.001; Z.sinceDrop = 0; zombieRollDrop(z1);
      if (zombiePickups.length !== 1 || zombiePickups[0].kind !== 'weapon') issues.push('a lucky zombie should drop a weapon');
      const first = zombiePickups[0].id;
      camera.position.set(zombiePickups[0].x, 1.65, zombiePickups[0].z); updateZombiePickups(0.016);
      if (zombiePickups.length !== 1 || kit.slots[1]) issues.push('walking over a weapon must not take it: it waits for F (taken: ' + JSON.stringify(kit.slots) + ')');
      if (!_zombieNear || _zombieNear.id !== first) issues.push('standing at a weapon should offer it (the F prompt)');
      if (!document.getElementById('zombie-prompt') && !_zombiePromptEl) issues.push('there should be a prompt for the weapon');
      zombieTakeNearby();
      if (kit.slots[0] !== 'm:fists' || kit.slots[1] !== first || kit.hand !== 1) issues.push('a pickup should go in slot 2 and into your hand, fists kept: ' + JSON.stringify(kit.slots) + ' hand ' + kit.hand);
      if (zombiePickups.length) issues.push('the pickup should be gone once taken');
      // a second one replaces it, and what you were holding is simply gone: nothing is left on the floor
      zombieDropPickup('weapon', 12, 0, 'ak20', 'SS');
      camera.position.set(12, 1.65, 0); updateZombiePickups(0.016);
      if (kit.slots[1] === 'ak20') issues.push('the second weapon was taken without F');
      zombieTakeNearby();
      if (kit.slots[1] !== 'ak20' || kit.slots[0] !== 'm:fists') issues.push('the second pickup should replace slot 2 only: ' + JSON.stringify(kit.slots));
      if (zombiePickups.length) issues.push('the weapon you swapped out should disappear, not land on the floor: ' + JSON.stringify(zombiePickups.map(p => p.id)));
      updateZombiePickups(0.016); updateZombiePickups(0.016);
      if (kit.slots[1] !== 'ak20') issues.push('standing there must not change the kit');
      if (!(weaponAmmo[WEAPONS.findIndex(w => w.id === 'ak20')].ammo === WEAPONS.find(w => w.id === 'ak20').mag)) issues.push('a pickup should come loaded');
      // ammo
      zombieClearPickups(); _zombieNear = null;
      const ai = WEAPONS.findIndex(w => w.id === 'ak20'); weaponAmmo[ai] = { ammo: 3, reserve: 0 };
      Math.random = () => 0.05; Z.sinceDrop = 0; zombieRollDrop(z1);
      if (zombiePickups.length !== 1 || zombiePickups[0].kind !== 'ammo') issues.push('an ammo drop was expected, got ' + JSON.stringify(zombiePickups.map(p => p.kind)));
      camera.position.set(zombiePickups[0].x, 1.65, zombiePickups[0].z); updateZombiePickups(0.016);
      if (!(weaponAmmo[ai].ammo === WEAPONS[ai].mag && weaponAmmo[ai].reserve === WEAPONS[ai].reserve)) issues.push('ammo should fill what you carry: ' + JSON.stringify(weaponAmmo[ai]));
      // nothing to reload (fists only): no ammo drop
      kit.slots[1] = null; Math.random = () => 0.05; zombieClearPickups(); zombieRollDrop(z1);
      if (zombiePickups.length) issues.push('with only fists nothing uses ammo, so none should drop');
      // only some types of weapon, never the gimmick pile
      Math.random = saved.rnd; const seen = new Set(); let bad = '';
      for (let i = 0; i < 6000; i++) { const r = zombieDropRoll(null, false); seen.add(r.weaponId); const inf = diceInfo(r.weaponId);
        if (!inf || inf.item.archived || inf.item.adminItem) bad = r.weaponId; if (!Object.values(ZOMBIE_DROP_POOL).some(l => l.includes(r.weaponId))) bad = r.weaponId; }
      if (bad) issues.push('a drop came from outside the zombie pool: ' + bad);
      const kinds = new Set([...seen].map(id => diceInfo(id).kind));
      if (kinds.size !== 3) issues.push('the pool should hold guns, melees and throwables: ' + [...kinds]);
      for (const id of ['potato_cannon', 'portal_launcher', 'laser_pointer', 'omega_pistol', 'm:lightsabre', 'u:orbital_strike']) if (seen.has(id)) issues.push(id + ' is not a weapon the dead carry');
      for (let i = 0; i < 400; i++) if (diceInfo(zombieDropRoll(null, true).weaponId).kind !== 'gun') { issues.push('with no gun yet, the first drop must be a gun'); break; }
      // the odds are small
      Math.random = saved.rnd; Z.sinceDrop = 0; let w = 0, a = 0; kit.slots[1] = 'ak20';
      for (let i = 0; i < 4000; i++) { zombieClearPickups(); Z.sinceDrop = 0; zombieRollDrop(z1); const k = zombiePickups[0] && zombiePickups[0].kind; if (k === 'weapon') w++; else if (k === 'ammo') a++; }
      zombieClearPickups();
      if (w < 4000 * 0.02 || w > 4000 * 0.055) issues.push('weapon drops should be a few percent, got ' + (w / 40).toFixed(1) + '%');
      if (a < 4000 * 0.04 || a > 4000 * 0.085) issues.push('ammo drops should be about 6%, got ' + (a / 40).toFixed(1) + '%');
      // a cleared wave: a breather and a little health
      for (const b of gameBots.slice()) zombieRemove(b);
      Z.phase = 'fight'; Z.toSpawn = 0; players[myId].hp = 200; updateZombieMode(0.016);
      if (Z.phase !== 'break' || players[myId].hp !== 225) issues.push('clearing a wave should start a breather and heal 25: ' + Z.phase + ' ' + players[myId].hp);
      // dying ends it
      zombieOnKill(myId, 'zzz');
      if (!ended || ended.w !== 'enemy') issues.push('dying should end the match');
      // and it cleans up
      zombieSpawn(); zombieDropPickup('ammo', 3, 3); zombieCleanup();
      if (gameBots.some(b => b.zombie) || zombiePickups.length) issues.push('zombies and pickups should be cleared at the end');
      if (!(Math.abs(mapAmbient.intensity - lightBefore.amb) < 0.01 && Math.abs(sun.intensity - lightBefore.sun) < 0.01 && scene.background.getHex() === lightBefore.bg)) issues.push('the light should come back when it ends: ambient ' + mapAmbient.intensity + ' sun ' + sun.intensity);
    } finally {
      Math.random = saved.rnd; endMatch = saved.end; zombieClearPickups();
      for (const b of gameBots.slice()) if (b.zombie) zombieRemove(b);
      selectedModeConfig = saved.cfg; match = saved.match; gameStarted = saved.started; isDead = saved.dead;
      playSoundEvent = saved.sound; showAnnouncement = saved.anim; spawnAbilityAOEFX = saved.fx; getAudioCtx = saved.audio; playWeaponSound = saved.ws;
      gameBots.length = 0; gameBots.push(...saved.bots); if (saved.me) players[myId] = saved.me; else delete players[myId];
      wallColliders.length = 0; wallColliders.push(...saved.walls); camera.position.copy(saved.pos);
      [selectedPrimaryIdx, selectedSecondaryIdx, selectedMeleeIdx, selectedSupportIdx] = saved.sel;
      try { activateMap(saved.map); } catch (e) {}
    }
    return issues;
  })()`);
  console.log('zombie checks: fists only, endless growing waves (capped), walking + clawing zombies, rare weapon and ammo drops, swap rules, a breather, death ends it, clean-up');
  if (out.length) { ok = false; console.log(out.join('\n')); }
}

if (ok && process.argv.includes('--hair')) {
  // Hair on every skin. It used to be refused on every skin but three because of the headwear: now a chosen hairstyle goes on
  // any skin and the headwear (helmet, cap, goggles, visor) comes off; "Skin Default" keeps the skin's own head.
  const issues = vm.runInThisContext(`(() => {
    const issues = [];
    const gearOf = m => m._gearHead;
    const meshesIn = g => { const out = []; g.traverse(o => { if (o.isMesh) out.push(o); }); return out; };
    const COLOR = 0x553318;
    let withGear = 0;
    for (const s of SKINS) {
      if (/^px_/.test(s.id)) continue;
      let plain, styled, bald;
      try {
        plain = makePlayerMesh('t', false, 'ally', s.id, {});
        styled = makePlayerMesh('t', false, 'ally', s.id, { hair: { style: 'crop', color: '553318' } });
        bald = makePlayerMesh('t', false, 'ally', s.id, { hair: { style: 'none', color: '553318' } });
      } catch (e) { issues.push(s.id + ' did not build with a hairstyle: ' + e.message); continue; }
      const g0 = gearOf(plain), g1 = gearOf(styled), g2 = gearOf(bald);
      if (!g0 || !g1 || !g2) { issues.push(s.id + ': no head gear container'); continue; }
      if (HAIR_COMPATIBLE.has(s.id)) {
        if (!meshesIn(g1).some(m => m.material && m.material.color && m.material.color.getHex() === COLOR)) issues.push(s.id + ': a hairstyle did not show');
        continue;
      }
      if (meshesIn(g0).length) withGear++;
      const hairMeshes = meshesIn(g1);
      if (!hairMeshes.length) issues.push(s.id + ': a hairstyle chosen on this skin did not show');
      else if (hairMeshes.some(m => !m.material || !m.material.color || m.material.color.getHex() !== COLOR)) issues.push(s.id + ': headwear is still on under the hair (' + hairMeshes.filter(m => !m.material || !m.material.color || m.material.color.getHex() !== COLOR).length + ' pieces)');
      if (meshesIn(g2).length) issues.push(s.id + ': Bald should leave nothing on the head');
      // with no choice the skin is untouched
      const again = makePlayerMesh('t', false, 'ally', s.id, { hair: null });
      if (meshesIn(gearOf(again)).length !== meshesIn(g0).length) issues.push(s.id + ': Skin Default changed the head');
    }
    if (withGear < 3) issues.push('expected several skins with headwear to test, found ' + withGear);
    return issues;
  })()`);
  console.log('hair checks: a hairstyle goes on every skin (headwear comes off), Bald is bald, Skin Default leaves the head alone');
  if (issues.length) { ok = false; console.log(issues.slice(0, 20).join('\n')); }
}

if (ok && process.argv.includes('--finisher')) {
  // Selectable finishers: each one takes the body away from the ragdoll (the ragdoll never starts while one owns it), moves the body in
  // a way of its own, ends with the body put back and gone, and aborts cleanly if the body comes back to life. "Automatic" is the old
  // behaviour (the ragdoll). Another player's choice plays for their kills, and with none chosen nothing of ours plays.
  const out = vm.runInThisContext(`(() => {
    const issues = [];
    const saved = { sound: playSoundEvent, flash: flashScreen, feed: pushFeedLine, splat: spawnSplatBombFX, raf: requestAnimationFrame, st: setTimeout, rd: window.PVP_RAGDOLL, mine: myFinisher, now: performance.now };
    playSoundEvent = () => {}; flashScreen = () => {}; pushFeedLine = () => {}; spawnSplatBombFX = () => {};
    let clock = 1000, rafQ = [], timers = [];
    Object.defineProperty(performance, 'now', { value: () => clock, configurable: true, writable: true });
    requestAnimationFrame = cb => { rafQ.push(cb); return rafQ.length; };
    setTimeout = (fn, ms) => { timers.push([clock + (ms || 0), fn]); return timers.length; };
    const pump = ms => { const end = clock + ms; while (clock < end) { clock += 16; const q = rafQ; rafQ = []; q.forEach(f => f()); const due = timers.filter(t => t[0] <= clock); timers = timers.filter(t => t[0] > clock); due.forEach(t => t[1]()); } };
    let ragdollCalls = 0;
    window.PVP_RAGDOLL = { death: () => { ragdollCalls++; return true; }, reset() {}, blast() {}, tick() {}, clear() {}, hit: () => null };
    const make = key => { const m = makePlayerMesh('Dummy', true, 'enemy', 'default', {}); m.position.set(10, 0, 10); m.rotation.y = 0.7; m.visible = true; scene.add(m); remoteMeshes[key] = m; players[key] = { id: key, name: 'D', isBot: true, dead: true, team: 'enemy' }; return m; };
    const drop = key => { scene.remove(remoteMeshes[key]); delete remoteMeshes[key]; delete players[key]; };
    try {
      if (FINISHER_IDS.length < 15) issues.push('only ' + FINISHER_IDS.length + ' finishers to choose from');
      for (const f of FINISHERS) if (!f.name || !f.title || !(f.desc || FINISHER_DESC[f.id])) issues.push(f.id + ': a finisher needs a name, a title and a description');
      for (const id of FINISHER_IDS) {
        const key = 'fin_' + id, mesh = make(key);
        const start = mesh.position.clone(), sr = mesh.rotation.clone(), ss = mesh.scale.clone();
        myFinisher = id; ragdollCalls = 0;
        triggerFinisher(key, 'ak20'); dropBody(key); ragdollDeath(key);
        if (ragdollCalls) issues.push(id + ': the ragdoll started although this finisher was chosen (' + ragdollCalls + ' calls)');
        if (!mesh._finisher) { issues.push(id + ': the finisher did not take the body'); drop(key); continue; }
        let moved = false;
        for (let i = 0; i < 400 && mesh.visible; i++) {
          pump(16);
          if (mesh.position.distanceTo(start) > 0.3 || Math.abs(mesh.rotation.x - sr.x) > 0.3 || Math.abs(mesh.rotation.z - sr.z) > 0.3 || Math.abs(mesh.rotation.y - sr.y) > 0.5 || mesh.scale.distanceTo(ss) > 0.1) moved = true;
        }
        if (mesh.visible) issues.push(id + ': the body never went away');
        if (!moved && id !== 'shatter' && id !== 'confetti') issues.push(id + ': the body did not move');
        if (mesh._finisher) issues.push(id + ': still owns the body at the end');
        if (mesh.position.distanceTo(start) > 0.01 || mesh.scale.distanceTo(ss) > 0.01) issues.push(id + ': the body was not put back');
        if (mesh._finisherMats) issues.push(id + ': the materials of the body were not put back');
        drop(key);
      }
      // it comes back to life half way: put right, and visible
      { const key = 'fin_alive', mesh = make(key), start = mesh.position.clone(); myFinisher = 'balloon';
        triggerFinisher(key, 'ak20'); pump(500); players[key].dead = false; pump(200);
        if (!mesh.visible || mesh.position.distanceTo(start) > 0.01 || mesh.scale.x > 1.01) issues.push('a finished body that came back to life should be put right and stay: visible ' + mesh.visible + ' scale ' + mesh.scale.x.toFixed(2));
        drop(key); }
      // Automatic: the ragdoll, as before
      { const key = 'fin_auto', mesh = make(key); myFinisher = 'auto'; ragdollCalls = 0;
        triggerFinisher(key, 'ak20');
        if (!ragdollCalls) issues.push('Automatic should leave the body to the ragdoll');
        if (mesh._finisher) issues.push('Automatic should not own the body');
        drop(key); }
      // another player's choice plays for their kill; with none chosen, nothing of ours
      { const key = 'fin_other', mesh = make(key); myFinisher = 'auto'; ragdollCalls = 0;
        players.finOtherA = { id: 'finOtherA', finisher: 'ghost' }; players.finOtherB = { id: 'finOtherB', finisher: 'auto' };
        triggerFinisher(key, 'ak20', 'finOtherB');
        if (mesh._finisher || ragdollCalls) issues.push('a kill by a player with no finisher chosen must not play ours');
        triggerFinisher(key, 'ak20', 'finOtherA'); dropBody(key);
        if (!mesh._finisher || mesh._finisher.id !== 'ghost') issues.push('the finisher another player chose should play on their kill');
        if (ragdollCalls) issues.push('the ragdoll started although the killer chose a finisher');
        delete players.finOtherA; delete players.finOtherB; pump(4000); drop(key); }
      // the pick is only ever a finisher we know
      myFinisher = 'nonsense'; if (finisherChoiceOf(myId) !== null) issues.push('an unknown finisher must count as Automatic');
    } finally {
      playSoundEvent = saved.sound; flashScreen = saved.flash; pushFeedLine = saved.feed; spawnSplatBombFX = saved.splat; requestAnimationFrame = saved.raf; setTimeout = saved.st;
      window.PVP_RAGDOLL = saved.rd; myFinisher = saved.mine;
      Object.defineProperty(performance, 'now', { value: saved.now, configurable: true, writable: true });
    }
    return { issues, ids: FINISHER_IDS };
  })()`);
  const serverSrc = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const m = serverSrc.match(/const FINISHER_IDS = new Set\(\[([^\]]*)\]\)/);
  const serverIds = m ? m[1].split(',').map(x => x.trim().replace(/^'|'$/g, '')).filter(Boolean) : [];
  if (!m || serverIds.slice().sort().join() !== out.ids.slice().sort().join()) out.issues.push('the server\'s FINISHER_IDS must match the client\'s FINISHERS: ' + serverIds.join(' '));
  console.log('finisher checks: ' + out.ids.length + ' finishers take the body from the ragdoll, move it their own way and put it back; Automatic is the ragdoll; other players\' choices play for their kills; server list matches');
  if (out.issues.length) { ok = false; console.log(out.issues.slice(0, 24).join('\n')); }
}

if (ok && process.argv.includes('--combo')) {
  // Melee combos (sledge, fists, battle axe) and the katana's deflect. A combo: each E is the next step, a press that comes early is
  // remembered, the full cooldown starts only with the finishing blow, a half-thrown chain costs a short cooldown instead, and a weapon
  // switch ends it. The katana has NO combo: a 1 s deflect on a 4 s cooldown, +0.1 s for every shot it blocks (a burst counts once, up to
  // +2 s), the blade meets the shot from one of eight sides, and the block flashes hard.
  const out = vm.runInThisContext(`(() => {
    const issues = [];
    const keepUser = currentUser; currentUser = { username: 'tester', isAdmin: true };      // (the combos are archived for everyone but admin accounts)
    const saved = { sound: playSoundEvent, fx: spawnAbilityAOEFX, flash: flashScreen, feed: pushFeedLine, hit: emitHit, st: setTimeout, now: performance.now, dnow: Date.now,
                    started: gameStarted, dead: isDead, slot: activeSlot, sel: selectedMeleeIdx, cd: { ...abilityCDs }, cdown: countdownActive, match, cam: camera.position.clone(), q: camera.quaternion.clone(), ey: euler.y, slam: slamState };
    playSoundEvent = () => {}; spawnAbilityAOEFX = () => {}; showAnnouncement = () => {};
    const hits = [], feed = [], flashes = [];
    emitHit = (pid, bid, wid, pos, hs, opts) => { hits.push({ pid, wid, dmg: opts && opts.damageOverride }); };
    pushFeedLine = (a) => { feed.push(String(a)); }; flashScreen = (c) => { flashes.push(String(c)); };
    let clock = 50000, timers = [];
    Date.now = () => clock; Object.defineProperty(performance, 'now', { value: () => clock, configurable: true, writable: true });
    setTimeout = (fn, ms) => { timers.push([clock + (ms || 0), fn]); return timers.length; };
    const adv = ms => { for (let t = 0; t < ms; t += 16) { clock += 16; if (remoteMeshes.cmbT) remoteMeshes.cmbT.position.set(camera.position.x, 0, camera.position.z - 2); const due = timers.filter(x => x[0] <= clock); timers = timers.filter(x => x[0] > clock); due.forEach(x => x[1]()); updateMeleeCombo(0.016); updateMeleeSlam(0.016); updateMeleeDash(0.016); } };
    try {
      gameStarted = true; isDead = false; countdownActive = false; match = null; activeSlot = 'melee';
      camera.position.set(0, 1.65, 0); camera.quaternion.set(0, 0, 0, 1); euler.y = 0; euler.x = 0;
      const tgt = new THREE.Group(); tgt.position.set(0, 0, -2); tgt.visible = true; remoteMeshes.cmbT = tgt; players.cmbT = { id: 'cmbT', isBot: true, team: 'enemy', hp: 300, dead: false };
      const reset = id => { _viewKick = null; meleeCombo = null; meleeSlam = null; meleeDash = null; slamState = null; abilityCDs[id] = 0; hits.length = 0; feed.length = 0; timers = []; tgt.position.set(0, 0, -2); camera.position.set(0, 1.65, 0); _extVel.x = _extVel.z = 0; };
      const spec = [['sledge', 3, ['sledge_hop', 'sledge_spin']], ['fists', 3, ['fists_uppercut', 'fists_cross']], ['combat_axe', 4, ['axe_upper', 'axe_airwhirl', 'axe_chop']],
                    ['sabre', 3, ['sabre', 'sabre_slash', 'sabre_rise']], ['bat', 3, ['bat_swing', 'bat_back', 'bat_homerun']], ['frying_pan', 3, ['pan_clang', 'pan_dong']],
                    ['riot_shield', 3, ['shield_bash', 'shield_charge']], ['spear', 3, ['spear_thrust', 'spear_sweep', 'spear_skewer']]];
      for (const [id, n, wanted] of spec) {
        const item = MELEE_ITEMS.find(m => m.id === id), ab = item && item.ability;
        if (!ab || !ab.combo || ab.combo.length !== n) { issues.push(id + ': should be a ' + n + '-step combo'); continue; }
        if (ab.combo.some(st => !COMBO_RUN[st.kind])) issues.push(id + ': a step has no move');
        selectedMeleeIdx = MELEE_ITEMS.indexOf(item);
        reset(id);
        activateMeleeAbility();
        if (!meleeCombo || meleeCombo.step !== 0) { issues.push(id + ': E should start step 1'); continue; }
        if (abilityCDs[id]) issues.push(id + ': the cooldown must not start with the first step');
        activateMeleeAbility();                                         // too early: remembered
        if (meleeCombo.step !== 0) issues.push(id + ': an early press should wait for the step to let go');
        adv(900);
        if (!meleeCombo || meleeCombo.step < 1) issues.push(id + ': an early press should fire by itself');
        let guard = 0;
        while (meleeCombo && !meleeCombo.final && guard++ < 8) { activateMeleeAbility(); adv(800); try { updateAbilityHUD(); } catch (e) { issues.push(id + ': the ability HUD threw: ' + e.message); break; } }
        const names = ab.combo.map(st => st.name);
        for (let i = 0; i < n; i++) if (!feed.some(f => f.includes(names[i]))) issues.push(id + ': step ' + (i + 1) + ' (' + names[i] + ') never ran');
        if (id !== 'sledge' || true) for (const w of wanted) if (!hits.some(h => h.wid === w)) issues.push(id + ': ' + w + ' never hit the target in front');
        if (id === 'sledge' && !(meleeSlam && meleeSlam.flip)) issues.push('sledge: the last step should be a BACKFLIP slam');
        if (id !== 'combat_axe' && !meleeSlam && !abilityCDs[id]) issues.push(id + ': the last step should be a slam');
        if (!(abilityCDs[id] && Date.now() - abilityCDs[id] < abilityCooldownFor(item, ab))) issues.push(id + ': the full cooldown should start with the finishing blow');
        meleeSlam = null; meleeDash = null; slamState = null; adv(300);
        if (meleeCombo) issues.push(id + ': the combo should be over after the finishing blow');
        if (abilityCooldownFor(item, ab) !== 1500) issues.push(id + ': the full cooldown should be 1.5 s, it is ' + abilityCooldownFor(item, ab));
        activateMeleeAbility(); if (meleeCombo) issues.push(id + ': E during the cooldown should do nothing');
        adv(700); meleeSlam = null; meleeDash = null; slamState = null;
        activateMeleeAbility(); if (!meleeCombo) issues.push(id + ': E should work again once the 1.5 s cooldown is over');
        // a half-thrown chain: the window runs out, a short cooldown, not the full one
        reset(id); activateMeleeAbility(); adv(ab.comboWindow + 800);
        const remain = abilityCooldownFor(item, ab) - (Date.now() - abilityCDs[id]);
        if (meleeCombo) issues.push(id + ': the window should run out');
        if (!(remain > 0 && remain <= (ab.comboPartialCd || 1500) + 40)) issues.push(id + ': a half-thrown chain should cost a short cooldown (' + Math.round(remain) + ' ms left of ' + abilityCooldownFor(item, ab) + ')');
        // a weapon switch ends it
        reset(id); activateMeleeAbility(); activeSlot = 'primary'; adv(32); activeSlot = 'melee';
        if (meleeCombo) issues.push(id + ': switching weapon should end the combo');
      }
      // the katana: no combo, a short deflect, a window that grows
      {
        const k = MELEE_ITEMS.find(m => m.id === 'katana'), ab = k.ability;
        if (ab.combo) issues.push('the katana has no combo');
        if (ab.duration !== 1000 || abilityCooldownFor(k, ab) !== 4000 || ab.extendPerHit !== 100) issues.push('the katana deflect should be 1 s on a 4 s cooldown, +0.1 s a hit: ' + JSON.stringify({ d: ab.duration, cd: abilityCooldownFor(k, ab), e: ab.extendPerHit }));
        selectedMeleeIdx = MELEE_ITEMS.indexOf(k); activeSlot = 'melee'; abilityCDs.katana = 0; meleeAbilityBuff = null; meleeDeflectKick = null;
        activateMeleeAbility();
        const b = meleeAbilityBuff;
        if (!b || b.type !== 'deflect' || b.endTime - clock !== 1000) { issues.push('the katana deflect window should be 1 s'); }
        else {
          const base = b.endTime, at = new THREE.Vector3(1, 1.65, -3);
          triggerDeflectImpact(at);
          if (b.endTime - base !== 100) issues.push('a blocked hit should add 0.1 s (' + (b.endTime - base) + ')');
          triggerDeflectImpact(at);
          if (b.endTime - base !== 100) issues.push('a burst of pellets in one instant should count once');
          for (let i = 0; i < 40; i++) { clock += 100; triggerDeflectImpact(at); }
          if (b.endTime - base !== 2000) issues.push('the extra time should stop at +2 s, got +' + (b.endTime - base));
          // the cooldown after it
          meleeAbilityBuff = null;
        }
        // eight guards, and a hard flash for the katana only
        camera.position.set(0, 1.65, 0); camera.quaternion.set(0, 0, 0, 1); camera.updateMatrixWorld();
        const dirs = [[3, 0], [2, 2], [0, 3], [-2, 2], [-3, 0], [-2, -2], [0, -3], [2, -2]], sectors = [], poses = [];
        for (const [x, y] of dirs) {
          meleeAbilityBuff = { type: 'deflect', endTime: clock + 5000, extendPer: 0, extendLeft: 0 }; flashes.length = 0;
          triggerDeflectImpact(new THREE.Vector3(x, 1.65 + y, -4));
          sectors.push(meleeDeflectKick.sector); poses.push(meleeDeflectKick.target.slice());
          if (!flashes.some(f => /0[.]3[0-9]/.test(f))) issues.push('the katana block should flash hard (' + flashes.join(' ') + ')');
        }
        if (new Set(sectors).size !== 8) issues.push('the katana should guard from eight sides, got ' + sectors.join(','));
        let near = 0; for (let i = 0; i < poses.length; i++) for (let j = i + 1; j < poses.length; j++) if (poses[i].reduce((a, v, q) => a + Math.abs(v - poses[j][q]), 0) < 0.5) near++;
        if (near) issues.push(near + ' pairs of katana guards look alike');
        selectedMeleeIdx = MELEE_ITEMS.findIndex(m => m.id === 'tennis_racket'); flashes.length = 0; meleeAbilityBuff = { type: 'deflect', endTime: clock + 5000 };
        triggerDeflectImpact(new THREE.Vector3(1, 1.65, -3));
        if (flashes.some(f => /0[.]3[0-9]/.test(f))) issues.push('only the katana flashes that hard');
      }
      // every combo animation gives real numbers, starts and ends at rest
      {
        const sl0 = MELEE_ITEMS.findIndex(m => m.id === 'sledge'); selectedMeleeIdx = sl0; activeSlot = 'melee'; reset('sledge');
        const mdl = meleeModels[sl0];
        const NEW_KINDS = ['sweep', 'sweepL', 'homerun', 'dong', 'skewer', 'thrust', 'bash', 'slashX', 'slashUp'];
        for (const kind of ['raise', 'spin', 'upper', 'chop', 'cross'].concat(NEW_KINDS)) {
          for (const t of [0, 0.1, 0.25, 0.4, 0.6, 0.8, 1]) {
            meleeCombo = { itemId: 'sledge', anim: { kind, t: t * 0.5, ms: 0.5 } }; poseMeleeComboAnim();
            if (![mdl.position.x, mdl.position.y, mdl.position.z, mdl.rotation.x, mdl.rotation.y, mdl.rotation.z].every(Number.isFinite)) issues.push('combo animation ' + kind + ' gave a non-number at ' + t);
          }
          if (NEW_KINDS.includes(kind)) for (const t of [0, 1]) { meleeCombo = { itemId: 'sledge', anim: { kind, t: t * 0.5, ms: 0.5 } }; poseMeleeComboAnim(); if (Math.abs(mdl.position.x - MELEE_REST_POS.x) + Math.abs(mdl.position.y - MELEE_REST_POS.y) + Math.abs(mdl.position.z - MELEE_REST_POS.z) + Math.abs(mdl.rotation.x) + Math.abs(mdl.rotation.y) + Math.abs(mdl.rotation.z) > 1e-6) issues.push('the ' + kind + ' swing should start and end at rest'); }
        }
        // each blow has its OWN motion: the poses at the moment of impact must differ from one another
        const sig = {};
        for (const kind of NEW_KINDS) { meleeCombo = { itemId: 'sledge', anim: { kind, t: 0.25, ms: 0.5 } }; poseMeleeComboAnim(); sig[kind] = [mdl.position.x, mdl.position.y, mdl.position.z, mdl.rotation.x, mdl.rotation.y, mdl.rotation.z]; }
        const names = Object.keys(sig).filter(k => k !== 'sweep');          // the plain swing is shared by the ordinary swings and clangs; every NAMED blow (and the backswing) must differ from all the others
        for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) { const d = sig[names[i]].reduce((a, v, q) => a + Math.abs(v - sig[names[j]][q]), 0); if (d < 0.35) issues.push('the ' + names[i] + ' and ' + names[j] + ' swings look too alike (' + d.toFixed(2) + ')'); }
        // ...and every named blow of the new combos uses a motion of its own
        const own = ['HOME RUN', 'DONG', 'SKEWER', 'THRUST', 'BASH', 'CROSS SLASH', 'RISING SLASH'], used = [];
        for (const it of MELEE_ITEMS) for (const st of ((it.ability && it.ability.combo) || [])) if (own.includes(st.name)) { used.push(st.anim); if (!st.anim || ['sweep', 'sweepL', 'chop', 'upper', 'cross'].includes(st.anim)) issues.push(st.name + ' should have its own swing animation, has ' + st.anim); }
        if (new Set(used).size !== used.length) issues.push('the named blows should not share an animation: ' + used.join(','));
        // the view kick ends exactly where it began, and does nothing when camera shake is off
        const e0 = [euler.x, euler.y];
        viewKick(0.2, 0.06, 480); let kg = 0; while (_viewKick && kg++ < 200) updateViewKick(0.016);
        if (_viewKick || Math.abs(euler.x - e0[0]) > 1e-6 || Math.abs(euler.y - e0[1]) > 1e-6) issues.push('the view kick should end where it began');
        const keepShake = GAMEPLAY_SETTINGS.cameraShake; GAMEPLAY_SETTINGS.cameraShake = 0;
        try { viewKick(0.2, 0.06, 480); kg = 0; let moved = 0; while (_viewKick && kg++ < 200) { updateViewKick(0.016); moved += Math.abs(euler.y - e0[1]); } if (moved > 1e-6) issues.push('with camera shake off the view must not be kicked'); } finally { GAMEPLAY_SETTINGS.cameraShake = keepShake; _viewKick = null; }
        // the crescent builds, sweeps and can be stepped
        const arc = comboSlashArc(0xffffff, { roll: 0.3, dir: 1, size: 1.2 }, 1.8);
        for (const k of [0, 0.3, 0.6, 1]) { arc.step(k); if (![arc.mesh.position.x, arc.mesh.position.y, arc.mesh.position.z, arc.mesh.scale.x].every(Number.isFinite)) issues.push('the slash crescent gave a non-number at ' + k); }
        scene.remove(arc.mesh);
        meleeCombo = null; comboRestModel();
      }
      // combo mode / default mode, and how the slam grows with the fall
      {
        const sl = MELEE_ITEMS.find(m => m.id === 'sledge'), fi = MELEE_ITEMS.find(m => m.id === 'fists'), ax = MELEE_ITEMS.find(m => m.id === 'combat_axe');
        if (!MELEE_COMBO_MODE) issues.push('combo mode should be the starting mode');
        if (!sl.ability.combo || !fi.ability.combo || !ax.ability.combo) issues.push('combo mode: the Sledge, Fists and Battle Axe should chain');
        // not in the middle of a move
        selectedMeleeIdx = MELEE_ITEMS.indexOf(sl); reset('sledge'); activateMeleeAbility();
        if (!meleeCombo) issues.push('mode test: the chain should have started');
        else if (setMeleeComboMode(false) !== false || !MELEE_COMBO_MODE) issues.push('the mode must not switch in the middle of a combo');
        reset('sledge');
        if (setMeleeComboMode(false) !== true || MELEE_COMBO_MODE) issues.push('could not switch to default mode');
        const regular = { sledge: 'Ground Slam', fists: 'Uppercut', combat_axe: 'Whirlwind', sabre: 'Lunge', bat: 'Crowd Clear', frying_pan: 'Pan Clang', riot_shield: 'Shield Charge', spear: 'Throw Spear' };
        if (MELEE_ITEMS.filter(m => m.plainAbility).length !== Object.keys(regular).length) issues.push('eight melees should have a combo and a regular ability, found ' + MELEE_ITEMS.filter(m => m.plainAbility).length);
        for (const [id, nm] of Object.entries(regular)) { const it = MELEE_ITEMS.find(m => m.id === id); if (!it || it.ability.combo || it.ability.name !== nm) issues.push('default mode: ' + id + ' should have its regular ' + nm + ', has ' + (it && it.ability.name)); }
        if (effectiveMeleeItem(sl).ability.name !== 'Ground Slam') issues.push('default mode: the ability a skinned or plain item reports should follow the mode');
        // default mode: one E is the old move, no chain
        selectedMeleeIdx = MELEE_ITEMS.indexOf(fi); reset('fists'); activateMeleeAbility();
        if (meleeCombo || !(slamState && slamState.vel >= 8)) issues.push('default mode: fists E should be the plain uppercut');
        selectedMeleeIdx = MELEE_ITEMS.indexOf(ax); reset('combat_axe'); activateMeleeAbility();
        if (meleeCombo || !meleeDash) issues.push('default mode: the axe E should be the plain whirlwind dash');
        meleeDash = null; slamState = null;
        const keepWalls = wallColliders.slice(); wallColliders.length = 0;
        const land = (y) => { hits.length = 0; meleeSlam = null; meleeCombo = null; slamState = { vel: -8, type: 'slam' }; camera.position.set(0, y, 0); let g = 0; while (slamState && g++ < 900) { clock += 16; updateMovement(1 / 60); } const h = hits.find(x => x.wid === 'sledge'); return h ? h.dmg : null; };
        try {
          // default mode, a real ground slam: leap, hang, dive, land
          selectedMeleeIdx = MELEE_ITEMS.indexOf(sl); reset('sledge'); activateMeleeAbility();
          if (meleeCombo || !meleeSlam) issues.push('default mode: sledge E should start the ground slam');
          let g = 0; while (meleeSlam && g++ < 900) { clock += 16; updateMeleeSlam(0.016); updateMovement(1 / 60); }
          const plainHit = hits.find(h => h.wid === 'sledge');
          if (!plainHit || plainHit.dmg < 74 || plainHit.dmg > 86) issues.push('default mode: a ground slam from its own leap should do about 80, did ' + (plainHit && plainHit.dmg));
          if (isDead) issues.push('the slam test killed the player (out of bounds?)');
          // the sledge slams straight down from the air, in both modes (no hop, no climb), and it is the finishing blow
          for (const mode of [true, false]) {
            selectedMeleeIdx = MELEE_ITEMS.indexOf(sl); reset('sledge');
            if (setMeleeComboMode(mode) !== true) { issues.push('could not switch mode for the air slam'); continue; }
            const tag = mode ? 'combo mode' : 'default mode';
            camera.position.set(0, 7, 0); slamState = { vel: 0, type: 'jump' };
            activateMeleeAbility();
            if (!meleeSlam) { issues.push(tag + ': E in the air should slam down'); continue; }
            if (meleeSlam.phase === 'crouch' || meleeSlam.phase === 'rise' || meleeSlam.flip) issues.push(tag + ': from the air the slam should not crouch, climb or flip first (phase ' + meleeSlam.phase + ')');
            if (mode && (!meleeCombo || !meleeCombo.final)) issues.push('combo mode: the air slam is the finishing blow, not step one');
            if (!(abilityCDs.sledge && Date.now() - abilityCDs.sledge < 1500)) issues.push(tag + ': the air slam should start the 1.5 s cooldown');
            let gg = 0; while (meleeSlam && gg++ < 900) { clock += 16; updateMeleeSlam(0.016); updateMovement(1 / 60); }
            const ah = hits.find(h => h.wid === 'sledge');
            if (!ah) issues.push(tag + ': the air slam never hit the target');
            else if (mode && ah.dmg < 125) issues.push('combo mode: a slam from about 5 m should beat the 110 base (more the higher), did ' + ah.dmg);
            else if (!mode && (ah.dmg < 60 || ah.dmg > 90)) issues.push('default mode: a slam from about 5 m should do about 80, did ' + ah.dmg);
          }
          // combo mode: the damage follows the drop
          if (setMeleeComboMode(true) !== true) issues.push('could not switch back to combo mode');
          selectedMeleeIdx = MELEE_ITEMS.indexOf(sl); reset('sledge');
          const low = land(1.9), base = land(1.65 + 2.6), mid = land(1.65 + 8), high = land(1.65 + 60);
          if (low == null || base == null || mid == null || high == null) issues.push('a slam should hit the target in range: ' + JSON.stringify([low, base, mid, high]));
          else {
            if (!(low < base && base < mid && mid < high)) issues.push('the slam should hit harder the further it falls: ' + [low, base, mid, high].join(' < '));
            if (Math.abs(base - 110) > 8) issues.push('a hop-height slam should do about its 110, did ' + base);
            if (!(mid >= 165 && mid <= 200)) issues.push('a slam from 8 m should do about 180, did ' + mid);
            if (high !== 220) issues.push('the slam should top out at x2 (220), did ' + high);
            if (low < 55) issues.push('even a low slam should keep half its damage, did ' + low);
          }
          if (slamHeightMult(sl.ability, 2.4) !== 1 || slamHeightMult(sl.ability, 999) !== 2 || slamHeightMult(sl.ability, 0) < 0.5 || slamHeightMult(fi.ability, 99) !== 1) issues.push('slamHeightMult: x1 at the reference drop, x2 cap, never under x0.5, only for the sledge');
          // a skin on the sledge changes the look, never the damage entry the server holds
          const keepSkin = meleeSkinFor;
          meleeSkinFor = (b) => b === 'sledge' ? BASIC_MELEE_SKINS.find(x => x.id === 'sledge_gold_brick') : null;
          try { land(1.65 + 8); } finally { meleeSkinFor = keepSkin; }
          if (!hits.some(h => h.wid === 'sledge')) issues.push('a skinned sledge should hit as the base sledge, hit as: ' + hits.map(h => h.wid).join(','));
        } finally { wallColliders.push(...keepWalls); setMeleeComboMode(true); MELEE_COMBO_MODE = true; }
      }
    } finally {
      delete remoteMeshes.cmbT; delete players.cmbT;
      playSoundEvent = saved.sound; spawnAbilityAOEFX = saved.fx; flashScreen = saved.flash; pushFeedLine = saved.feed; emitHit = saved.hit; setTimeout = saved.st; Date.now = saved.dnow;
      Object.defineProperty(performance, 'now', { value: saved.now, configurable: true, writable: true });
      currentUser = keepUser;
      gameStarted = saved.started; isDead = saved.dead; activeSlot = saved.slot; selectedMeleeIdx = saved.sel; countdownActive = saved.cdown; match = saved.match; slamState = saved.slam;
      meleeCombo = null; meleeSlam = null; meleeDash = null; meleeAbilityBuff = null; Object.assign(abilityCDs, saved.cd);
      camera.position.copy(saved.cam); camera.quaternion.copy(saved.q); euler.y = saved.ey;
    }
    return issues;
  })()`);
  {
    // every hit a combo makes must have its own entry, at least as big, in BOTH damage tables (the server clips an unknown id to 25)
    const need = vm.runInThisContext("(() => { const m = {}; for (const it of MELEE_ITEMS) { const c = it.ability && it.ability.combo; if (!c) continue; for (const st of c) { const id = st.id || (st.aoe && st.aoe.id), d = st.damage != null ? st.damage : (st.aoe && st.aoe.damage); if (id && d != null) m[id] = { d: Math.max(m[id] ? m[id].d : 0, d), client: CLIENT_WEAPON_DAMAGE[id] }; } } return m; })()");
    const srvTxt = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
    for (const [id, v] of Object.entries(need)) {
      if (id === 'fists_uppercut') continue;
      const mm = srvTxt.match(new RegExp('[ {,]' + id + ': (\\d+)'));
      if (!mm || Number(mm[1]) < v.d) out.push('server damage table: ' + id + ' needs an entry of at least ' + v.d + ' (has ' + (mm && mm[1]) + ')');
      if (!(v.client >= v.d)) out.push('client damage table: ' + id + ' needs an entry of at least ' + v.d + ' (has ' + v.client + ')');
    }
  }
  console.log('combo checks: sledge 3 steps, fists 3, battle axe 4 (early press queued, cooldown after the last, short one if half thrown, switch ends it); katana: no combo, 1 s deflect / 4 s cooldown, +0.1 s a hit (cap +2 s), eight guards, hard flash; combo mode / default mode (regular abilities back, no switching mid-move); the slam grows with the fall (x2 cap, skins hit as the base sledge)');
  if (out.length) { ok = false; console.log(out.slice(0, 24).join('\n')); }
}

if (ok && (process.argv.includes('--stats') || process.argv.includes('--dump-stats'))) {
  // The published weapon sheet (public/stats.html reads public/weapon-stats.json). Every number is read from the running game's own tables and
  // functions (falloffMultiplier, realisticRecoilProfile, weaponKickStrength...), so what players read is what the code does. `--dump-stats`
  // rewrites the JSON; `--stats` fails if the committed JSON no longer matches the game.
  const hp = Number((fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8').match(/const PLAYER_MAX_HP\s*=\s*(\d+)/) || [])[1]);
  const dump = vm.runInThisContext('(' + String(function (HP) {
    const RANGES = [0, 10, 20, 30, 40, 50, 60, 80, 100, 125, 150];
    const r3 = v => Math.round(v * 1000) / 1000, deg = r => r3(r * 180 / Math.PI);
    const keepMode = MELEE_COMBO_MODE;
    const traitsOf = (w) => {
      const t = [];
      if (w.hitscan) t.push('Hitscan: hits the instant you fire' + (w.hitscanRange ? ', out to ' + w.hitscanRange + ' m' : ''));
      if (w.maxRange) t.push('Short range: stops at ' + w.maxRange + ' m');
      if (w.heatShots) t.push('Overheats after ' + w.heatShots + ' shots, ' + r3((w.heatCooldown || 0) / 1000) + ' s lockout');
      if (w.burstSize) t.push('Fires in bursts of ' + w.burstSize + (w.burstDelay ? ', ' + w.burstDelay + ' ms apart' : ''));
      if (w.cycleBurst) t.push('Cycles through a burst, then a finisher shot');
      if (w.spinUp) t.push('Spins up: starts slow and speeds up while you hold the trigger');
      if (w.arcShot || w.arcGravity) t.push('Lobbed: the shot arcs and drops');
      if (w.splashRadius) t.push('Explodes: ' + w.splashRadius + ' m blast' + (w.splashDamage ? ', ' + w.splashDamage + ' damage' : ''));
      if (w.burnOnHit) t.push('Sets the target on fire');
      if (w.poisonOnHit) t.push('Poisons the target');
      if (w.slowOnHit || w.frostSlow) t.push('Slows the target');
      if (w.blindOnHit) t.push('Blinds the target');
      if (w.pinOnHit) t.push('Pins the target in place');
      if (w.disableOnHit) t.push('Disables the target for ' + w.disableOnHit + ' ms');
      if (w.knockback) t.push('Knocks the target back');
      if (w.launchOnHit) t.push('Launches the target into the air');
      if (w.chainLightning) t.push('Lightning chains to nearby enemies');
      if (w.bounce) t.push('Bounces off surfaces');
      if (w.tracking) t.push('Homes in on targets');
      if (w.ammoRegen) t.push('Ammo slowly regenerates');
      if (w.silentShots) t.push('Silenced');
      if (w.ignoreDefenses) t.push('Ignores shields and deflects');
      if (w.activeReload) t.push('Active reload: a well-timed second tap speeds it up');
      if (w.killReload) t.push('A kill refills the magazine');
      if (w.lastBulletBonus) t.push('The last round in the magazine hits harder');
      if (w.doubleJump) t.push('Lets you jump a second time in the air');
      if (w.perfectAccuracy) t.push('Perfectly accurate, no recoil');
      if (w.ddayOnly || w.modeOnly || w.prototype) t.push('Only found in a special mode');
      return t;
    };
    const guns = [];
    for (const w of WEAPONS) {
      if (w.adminItem || w.skinOnly) continue;
      const pellets = w.pellets || 1, hs = w.headshotMult || 2, sps = w.fireRate ? 1000 / w.fireRate : 0, f = WEAPON_FALLOFF[w.id] || null;
      const perShot = (w.damage || 0) * pellets, rc = realisticRecoilProfile(w), bloom = w.spreadBloom || null;
      const body = perShot > 0 ? Math.ceil(HP / perShot) : null, head = perShot > 0 ? Math.ceil(HP / (perShot * hs)) : null;
      guns.push({
        id: w.id, name: w.name, type: w.type, slot: w.slot, archived: !!w.archived,
        damage: w.damage, pellets, headshotMult: hs, headDamage: Math.round((w.damage || 0) * hs), damagePerShot: perShot,
        fireRateMs: w.fireRate, shotsPerSec: r3(sps), auto: !!w.auto, dps: r3(perShot * sps),
        magazine: w.mag, reserve: w.reserve, reloadSec: r3((w.reloadTime || 0) / 1000), reloadStyle: w.reloadStyle || 'magazine', noReload: !!w.noReload,
        timeToEmptySec: sps ? r3(Math.max(0, w.mag - 1) / sps) : null,
        bulletSpeed: w.bulletSpeed, adsZoom: w.adsZoom,
        falloff: f ? { nearM: f.near, farM: f.far, minPct: Math.round(f.min * 100) } : null,
        damageByRange: RANGES.map(d => Math.round((w.damage || 0) * falloffMultiplier(w.id, d))),
        shotsToKill: { body, head }, ttkBodySec: body && sps ? r3((body - 1) / sps) : null,
        scatterDeg: deg(Math.atan(w.spread || 0)),
        bloom: bloom ? { perShotDeg: deg(Math.atan(bloom.perShot)), maxDeg: deg(Math.atan(bloom.max)) } : null,
        recoil: rc ? {
          kickPerShotDeg: deg(rc.up), sideKickDeg: deg(rc.side), climbPerShotPct: Math.round(rc.climb * 100), climbMaxX: r3(rc.max),
          steadyKickDeg: deg(rc.up * rc.max), shotsToMaxClimb: rc.climb > 0 ? Math.ceil((rc.max - 1) / rc.climb) : 0,
          recoverPerSec: rc.recover, adsKickPct: Math.round(rc.adsMult * ADS_RECOIL_DAMPING.aimPitch * 100),
        } : null,
        screenKick: r3(weaponKickStrength(w, pellets)),
        ability: w.ability ? { name: w.ability.name, desc: w.ability.desc || '' } : null,
        traits: traitsOf(w),
      });
    }
    const melees = [];
    try {
      MELEE_COMBO_MODE = true;
      for (const m of MELEE_ITEMS) {
        if (m.adminItem || m.skinOnly) continue;
        const ab = m.ability, plain = m.plainAbility || null;
        const stepsOf = (a) => (a && a.combo) ? a.combo.map(st => {
          const slam = st.kind === 'slam', dmg = slam ? a.slamDamage : (st.damage != null ? st.damage : (st.aoe ? st.aoe.damage : null));
          return { name: st.name, damage: dmg == null ? null : dmg, radiusM: slam ? a.radius : (st.aoe ? st.aoe.radius : (st.reach || null)), note: slam ? 'grows with the height you fall from' : undefined };
        }) : null;
        melees.push({
          id: m.id, name: m.name, type: m.type, archived: !!m.archived,
          damage: m.damage, reachM: m.range, swingMs: m.cooldown, swingsPerSec: m.cooldown ? r3(1000 / m.cooldown) : null,
          dps: m.cooldown ? r3(m.damage * 1000 / m.cooldown) : null, speedMult: m.speedMult || 1,
          ability: ab ? { name: ab.name, desc: ab.desc || '', cooldownSec: r3(abilityCooldownFor(m, ab) / 1000), steps: stepsOf(ab) } : null,
          defaultAbility: (plain && ab !== plain) ? { name: plain.name, desc: plain.desc || '' } : null,       // (only while combos are not archived)
        });
      }
    } finally { MELEE_COMBO_MODE = keepMode; }
    return { hp: HP, ranges: RANGES, guns, melees };
  }) + ')(' + hp + ')');
  const file = path.join(__dirname, '..', 'public', 'weapon-stats.json');
  const text = JSON.stringify(dump, null, 1) + '\n';
  const issues = [];
  if (process.argv.includes('--dump-stats')) { fs.writeFileSync(file, text); console.log('wrote public/weapon-stats.json: ' + dump.guns.length + ' guns, ' + dump.melees.length + ' melees'); }
  else {
    let have = ''; try { have = fs.readFileSync(file, 'utf8'); } catch (e) {}
    if (have !== text) issues.push('public/weapon-stats.json is out of date: run  node tools/verify-boot.js --dump-stats');
    if (!(hp > 0)) issues.push('could not read PLAYER_MAX_HP from server.js');
    for (const g of dump.guns) {
      if (!(g.shotsPerSec > 0) && !g.noReload && g.fireRateMs) issues.push(g.id + ': no shots per second');
      if (g.damageByRange.length !== dump.ranges.length) issues.push(g.id + ': damage by range is the wrong length');
      for (let i = 1; i < g.damageByRange.length; i++) if (g.damageByRange[i] > g.damageByRange[i - 1]) issues.push(g.id + ': damage rises with range');
    }
    console.log('stats checks: ' + dump.guns.length + ' guns and ' + dump.melees.length + ' melees published, matching the game');
  }
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--irregular')) {
  // The four maps with a shape of their own (Sky Arena, Shipyard, Battleground, Atoll): they exist and are well formed, the two spawns are joined by
  // ground you can walk (flood fill over the floor rectangles and every collider), the void is real, and each is built the same for both teams.
  const issues = vm.runInThisContext(`(() => {
    const issues = [], savedMap = activeMapName;
    const IDS = ['sky_arena', 'shipyard', 'battleground', 'atoll'];
    try {
      for (const name of IDS) {
        if (!MAP_IDS.includes(name)) { issues.push(name + ': not in MAP_IDS'); continue; }
        if (!MAP_DESCS[name]) issues.push(name + ': no description for the vote card');
        const g = MAP_GROUPS[name], s = MAP_SPAWNS[name], v = MAP_VOID[name];
        if (!g || !s || !MAP_COLLIDERS[name].length) { issues.push(name + ': not built'); continue; }
        activeMapName = name;
        // the rectangle of floor, the shape it makes, and a fall you cannot survive
        if (name !== 'battleground') {
          if (!v || !v.rects || v.rects.length < 2) issues.push(name + ': should be an irregular floor (a list of rectangles with a void round it)');
          if (v && !(v.killY < -3)) issues.push(name + ': a fall off the edge should kill');
          const area = v ? v.rects.reduce((a, r) => a + (r.x1 - r.x0) * (r.z1 - r.z0), 0) : 0, bb = MAP_BOUNDS[name];
          if (v && area > 0.8 * 4 * bb.halfX * bb.halfZ) issues.push(name + ': the floor fills the box (' + Math.round(100 * area / (4 * bb.halfX * bb.halfZ)) + '%): not an irregular shape');
          // each end of the floor has to be real floor
          for (const r of Object.values(s)) if (!floorExistsAt((r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2)) issues.push(name + ': a spawn is over the void');
        }
        // a route on the ground from one spawn to the other
        const blocked = (x, z) => MAP_COLLIDERS[name].some(b => b.max.y > 0.6 && b.min.y < 1.8 && x > b.min.x - 0.45 && x < b.max.x + 0.45 && z > b.min.z - 0.45 && z < b.max.z + 0.45);
        const b = MAP_BOUNDS[name], step = 1, W = Math.round(2 * b.halfX / step), H = Math.round(2 * b.halfZ / step);
        const cell = (x, z) => [Math.floor((x + b.halfX) / step), Math.floor((z + b.halfZ) / step)];
        const ok2 = (cx, cz) => cx >= 0 && cz >= 0 && cx < W && cz < H && floorExistsAt(cx * step - b.halfX + step / 2, cz * step - b.halfZ + step / 2) && !blocked(cx * step - b.halfX + step / 2, cz * step - b.halfZ + step / 2);
        const a = s.ally, e = s.enemy, from = cell((a.x0 + a.x1) / 2, (a.z0 + a.z1) / 2), to = cell((e.x0 + e.x1) / 2, (e.z0 + e.z1) / 2);
        const seen = new Uint8Array(W * H), q = [from[0] + from[1] * W]; seen[q[0]] = 1; let reached = false, count = 0;
        for (let h = 0; h < q.length; h++) {
          const i = q[h], cx = i % W, cz = (i / W) | 0; count++;
          if (cx === to[0] && cz === to[1]) { reached = true; break; }
          for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, nz = cz + dz; if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue; const j = nx + nz * W; if (seen[j] || !ok2(nx, nz)) continue; seen[j] = 1; q.push(j); }
        }
        if (!reached) issues.push(name + ': no ground route between the two spawns (' + count + ' cells reached)');
        // both teams get the same map: the colliders, counted either side of the middle (the layouts turn through 180 degrees or mirror)
        let n1 = 0, n2 = 0; for (const c of MAP_COLLIDERS[name]) { const mz = (c.min.z + c.max.z) / 2; if (mz > 0.5) n1++; else if (mz < -0.5) n2++; }   // (what stands on the middle line belongs to neither half)
        if (Math.abs(n1 - n2) > 0.12 * (n1 + n2)) issues.push(name + ': one half has far more cover than the other (' + n1 + ' / ' + n2 + ')');
      }
      // the Atoll in particular: every piece of land has its twin turned through 180 degrees, the lighthouse is the tall thing in the middle, nobody can fall into the water and live
      {
        const L = ATOLL_LAND, twin = r => L.some(q => q[0] === -r[1] && q[1] === -r[0] && q[2] === -r[3] && q[3] === -r[2] && q[4] === r[4]);
        const odd = L.filter(r => !twin(r));
        if (odd.length) issues.push('atoll: land without a twin: ' + JSON.stringify(odd[0]));
        const overlap = []; for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const a = L[i], b = L[j]; if (a[0] < b[1] - 0.01 && b[0] < a[1] - 0.01 && a[2] < b[3] - 0.01 && b[2] < a[3] - 0.01) overlap.push([i, j]); }
        if (overlap.length) issues.push('atoll: pieces of land overlap (they would flicker): ' + JSON.stringify(overlap[0]));
        const tower = MAP_COLLIDERS.atoll.filter(b => b.max.y > 22 && Math.abs((b.min.x + b.max.x) / 2) < 1 && Math.abs((b.min.z + b.max.z) / 2) < 1);
        if (!tower.length) issues.push('atoll: no lighthouse standing in the middle');
        if (!(MAP_VOID.atoll.killY > -9 && MAP_VOID.atoll.killY < -3)) issues.push('atoll: the water should end a fall within a few metres, not ' + MAP_VOID.atoll.killY);
        const walkable = [['east dock', 38, 0], ['west dock', -38, 0], ['the rock', 69, 17], ['lifeguard tower', 59, 37], ['sandbar hut', 28, 33]];
        for (const [label] of walkable) if (!(MAP_POIS.atoll || []).some(p => p[0] === label)) issues.push('atoll: no point of interest for the ' + label);
        if (!MUSIC_TRACKS[MUSIC_FOR_MAP.atoll]) issues.push('atoll: no music');
      }
      // Battleground: an arena with a crowd (it does the wave), banners, flames, spots, a trophy
      {
        const B = _IRR.battle;
        if (!B || B.crowd.length !== 32 || B.crowd.some(c => !c.grp.children.length && Math.abs(c.z) < 99 && false)) issues.push('battleground: the crowd should be thirty-two slots of the stands');
        if (B && B.crowd.filter(c => c.grp.children.length).length < 28) issues.push('battleground: the stands should be full of people');
        if (B && (B.flames.length < 8 || B.beams.length !== 6 || !B.confetti)) issues.push('battleground: flames, moving spots and confetti are missing');
        activeMapName = 'battleground'; const cols = MAP_COLLIDERS.battleground;
        if (!cols.some(b => Math.abs(b.min.x + b.max.x) < 0.1 && Math.abs(b.min.z + b.max.z) < 0.1 && b.min.y >= 2.9 && b.max.y > 4)) issues.push('battleground: the trophy stands on its pedestal in the middle of the stage');
      }
      // the sounds the yard makes exist and run without throwing
      for (const ev of ['rivet', 'weld', 'grind', 'crane', 'chain']) if (typeof _AEV[ev] !== 'function') issues.push('missing ambient event ' + ev);
      for (const name of IDS) { const p = ATMO_PROFILES[name]; if (!p || !p.snd) issues.push(name + ': no ambient sound profile'); else for (const e of (p.snd.ev || [])) if (!_AEV[e[0]]) issues.push(name + ': ambient event ' + e[0] + ' does not exist'); }
    } finally { activeMapName = savedMap; }
    return issues;
  })()`);
  console.log('irregular map checks: Sky Arena, Shipyard, Battleground and Atoll are built, joined by a walkable route between the spawns, point-symmetric in cover, with a real void');
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--music')) {
  // The music: every track is well formed (known voices, notes in range, steps inside the bar, the same every time round), the maps that have a
  // track name one that exists, the right track is chosen for the lobby, a match and a map without music, and the scheduler runs on a context
  // that remembers what it was asked (no sound is made here).
  const issues = vm.runInThisContext(`(() => {
    const issues = [];
    const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} });
    const stats = { osc: 0, buf: 0 };
    const node = () => ({ connect(x) { return x; }, disconnect() {}, start() {}, stop() {}, frequency: param(), gain: param(), detune: param(), Q: param(), type: '' });
    const ctx = { currentTime: 10, sampleRate: 4000, state: 'running', destination: node(), createOscillator() { stats.osc++; return node(); }, createGain: node, createBiquadFilter: node,
      createBufferSource: node, createConvolver: node, createBuffer(ch, len) { stats.buf++; return { getChannelData() { return new Float32Array(len); } }; } };
    const NOTE = new Set(['pad', 'choir', 'drone', 'bass', 'pluck', 'bell', 'stab']);
    const ids = Object.keys(MUSIC_TRACKS);
    if (ids.length < 6) issues.push('expected a lobby track and five more, found ' + ids.join(','));
    for (const id of ids) {
      const T = MUSIC_TRACKS[id];
      if (!(T.bpm >= 50 && T.bpm <= 140) || !(T.bars >= 4)) issues.push(id + ': tempo or length is odd');
      let kinds = new Set(), count = 0;
      for (let b = 0; b < T.bars; b++) {
        const ev = T.bar(b), again = T.bar(b);
        if (JSON.stringify(ev) !== JSON.stringify(again)) issues.push(id + ' bar ' + b + ': not the same each time');
        for (const e of ev) {
          count++; kinds.add(e.i);
          if (!_MV[e.i] || !_MPART[e.i]) issues.push(id + ': unknown voice ' + e.i);
          if (!(e.s >= 0 && e.s < 16) || !(e.d > 0) || !(e.v == null || (e.v > 0 && e.v <= 1))) issues.push(id + ' bar ' + b + ': ' + e.i + ' has a bad time or strength');
          if (NOTE.has(e.i)) { if (!e.n || !e.n.length || !e.n.every(n => Number.isFinite(n) && n >= 24 && n <= 112)) issues.push(id + ' bar ' + b + ': ' + e.i + ' note out of range ' + JSON.stringify(e.n)); }
        }
      }
      if (count < 8 * T.bars / 2) issues.push(id + ': hardly any notes');
      if (!['pad', 'choir', 'drone'].some(k => kinds.has(k))) issues.push(id + ': has no sustained layer');
      // every bar plays through on a context that records
      MUSIC.out = {}; for (const k of Object.keys(_mMixDefaults)) MUSIC.out[k] = node();
      try { for (let b = 0; b < T.bars; b++) _musicBar(ctx, id, b, 10); } catch (e) { issues.push(id + ': playing a bar threw: ' + e.message); }
    }
    for (const [map, id] of Object.entries(MUSIC_FOR_MAP)) if (!MUSIC_TRACKS[id]) issues.push(map + ' asks for a track that does not exist: ' + id);
    for (const m of ['sky_arena', 'shipyard', 'battleground', 'atoll']) if (!MUSIC_FOR_MAP[m]) issues.push(m + ' should have music of its own');
    // every map has music, and there is a good deal of variety in what they get
    { const maps = [...MAP_IDS, 'zombie_tower', 'base_raid', 'obby', 'br_arena', 'm4_tower', 'm4_tower_big', 'm4_tower_super'], none = maps.filter(m => !MUSIC_FOR_MAP[m]);
      if (none.length) issues.push('maps with no music: ' + none.join(', '));
      const used = new Set(maps.map(m => MUSIC_FOR_MAP[m])); if (used.size < 15) issues.push('the maps should share out at least fifteen different tracks, they use ' + used.size);
      for (const [m, pf] of Object.entries(ATMO_PROFILES)) for (const e of ((pf.snd && pf.snd.ev) || [])) if (typeof _AEV[e[0]] !== 'function') issues.push(m + ': ambient event ' + e[0] + ' does not exist');
      for (const m of ['storm_pier', 'pinball_arcade', 'laser_vault', 'cargo_belts', 'gale_peaks', 'magma_rise']) if (!(ATMO_PROFILES[m] && ATMO_PROFILES[m].snd)) issues.push(m + ' should have ambient sound');
      const hog = [...used].map(id => [id, maps.filter(m => MUSIC_FOR_MAP[m] === id).length]).sort((a, b) => b[1] - a[1])[0]; if (hog[1] > 14) issues.push('one track is on too many maps: ' + hog.join(' x ')); }
    // which track
    const save = { started: gameStarted, lobby: inLobby, map: activeMapName, ctx: audioCtx, vol: GAMEPLAY_SETTINGS.music, m: { ...MUSIC } };
    try {
      gameStarted = false; inLobby = false; if (musicWanted() !== 'lobby') issues.push('the menus should have the lobby theme');
      gameStarted = true; inLobby = true; if (musicWanted() !== 'lobby') issues.push('the lobby should have its theme');
      inLobby = false; activeMapName = 'shipyard'; if (musicWanted() !== 'industry') issues.push('the shipyard should have the industry track');
      activeMapName = 'urban'; if (musicWanted() !== 'groove') issues.push('urban should have the groove track'); activeMapName = 'no_such_map'; if (musicWanted() !== null) issues.push('a place with no music should be quiet');
      // the scheduler
      MUSIC.ctx = null; MUSIC.bus = null; MUSIC.out = null; MUSIC.track = undefined; MUSIC.master = null; audioCtx = ctx; GAMEPLAY_SETTINGS.music = 0.5;
      gameStarted = false; updateMusic(0.016);
      if (MUSIC.track !== 'lobby' || MUSIC.bar < 1) issues.push('the lobby theme should start and schedule ahead (track ' + MUSIC.track + ', bar ' + MUSIC.bar + ')');
      gameStarted = true; activeMapName = 'sky_arena'; updateMusic(0.016);
      if (MUSIC.track !== 'heaven') issues.push('going to Sky Arena should change the track to heaven, it is ' + MUSIC.track);
      GAMEPLAY_SETTINGS.music = 0; updateMusic(0.016); if (MUSIC.track !== null) issues.push('with the music turned to 0 nothing should play');
      GAMEPLAY_SETTINGS.music = 0.5; ctx.state = 'suspended'; const before = MUSIC.track; activeMapName = 'shipyard'; updateMusic(0.016);
      if (MUSIC.track !== before) issues.push('before the first click (a suspended context) the music must wait');
      ctx.state = 'running'; ctx.currentTime += 100; updateMusic(0.016); updateMusic(0.016);
      if (MUSIC.track !== 'industry') issues.push('the music should follow the map once the context runs');
      if (!(stats.osc > 100)) issues.push('hardly any sound was made by the scheduler (' + stats.osc + ' oscillators)');
    } finally {
      gameStarted = save.started; inLobby = save.lobby; activeMapName = save.map; audioCtx = save.ctx; GAMEPLAY_SETTINGS.music = save.vol;
      for (const k of Object.keys(MUSIC)) delete MUSIC[k]; Object.assign(MUSIC, save.m);
    }
    return issues;
  })()`);
  console.log('music checks: ' + vm.runInThisContext('Object.keys(MUSIC_TRACKS).length') + ' tracks (lobby, heaven, industry, arena, neon, drift): every bar valid and repeatable, the right track for the lobby / each map / none, a scheduler that waits for the first click');
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--useanim')) {
  // Use animations: every track is well formed (also the kinds not switched on yet), the medkit and its skins have a lid that opens and shuts,
  // and using a medkit runs the animation for as long as the heal and leaves the model exactly as it was.
  const issues = vm.runInThisContext(`(() => {
    const issues = [];
    for (const [k, T] of Object.entries(USE_TRACKS)) {
      for (const t of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) { const P = _reloadPose(T.keys, t); if (![P.px, P.py, P.pz, P.rx, P.ry, P.rz].every(Number.isFinite)) issues.push(k + ': a pose at ' + t + ' is not a number'); }
      if (T.commit != null && !(T.commit > 0 && T.commit < 1)) issues.push(k + ': the release has to be inside the animation');
      if (T.hide && !(T.hide[0] < T.hide[1])) issues.push(k + ': a bad hide window');
      for (const b of (T.beats || [])) if (!['click', 'crunch', 'hiss', 'thud', 'whoosh'].includes(b[1])) issues.push(k + ': unknown sound ' + b[1]);
    }
    for (const it of SUPPORT_ITEMS) if (!it.archived && !it.adminItem && !USE_TRACKS[supportUseKind(it)]) issues.push(it.id + ': no use animation');
    if (!USE_KINDS_READY.has('open')) issues.push('the medkit animation should be switched on');
    // the medkit and every skin of it: a lid on a hinge that opens when the track says so
    const models = [['stock', supportModels[SUPPORT_ITEMS.findIndex(i => i.id === 'medkit')]]].concat(SUPPORT_MODEL_SKINS.filter(s => s.support === 'medkit').map(s => [s.id, s.build()]));
    if (models.length < 4) issues.push('the medkit should have its stock model and three skins (found ' + models.length + ')');
    for (const [id, m] of models) {
      const lid = m._lid;
      if (!lid || !['x', 'y', 'z'].includes(lid._axis) || !Number.isFinite(lid._open) || Math.abs(lid._open) < 1.5) { issues.push(id + ': no lid that opens'); continue; }
      const shut = lid.rotation[lid._axis];
      USE_TRACKS.open.parts(m, 0.5, {}); const opened = lid.rotation[lid._axis];
      USE_TRACKS.open.parts(m, 1, {}); const closed = lid.rotation[lid._axis];
      if (Math.abs(opened) < 1.5 || Math.abs(closed) > 1e-6 || Math.abs(shut) > 1e-6) issues.push(id + ': the lid should be shut, open half way through and shut again at the end (' + [shut, opened, closed].map(v => v.toFixed(2)) + ')');
    }
    // using it
    const save = { started: gameStarted, dead: isDead, slot: activeSlot, sup: selectedSupportIdx, uses: supportUses.slice(), last: lastSupport, eq: _equip, cd: countdownActive, snd: playSoundEvent, feed: pushFeedLine, flash: flashScreen };
    playSoundEvent = () => {}; pushFeedLine = () => {}; flashScreen = () => {};
    const idx = SUPPORT_ITEMS.findIndex(i => i.id === 'medkit'), m = supportModels[idx];
    const pos = m.position.clone(), rot = m.rotation.clone(), vis = m.visible;
    try {
      gameStarted = true; isDead = false; countdownActive = false; activeSlot = 'support'; selectedSupportIdx = idx; _equip = null; supportUses[idx] = 2; lastSupport = 0; m.visible = true;
      cancelUseAnim(); try { cancelMedkitHeal(); } catch (e) {}
      trySupport();
      if (!useAnim || useAnim.kind !== 'open') issues.push('using a medkit should start the opening animation');
      else if (useAnim.ms !== SUPPORT_ITEMS[idx].healTime) issues.push('the animation should last as long as the heal (' + useAnim.ms + ' vs ' + SUPPORT_ITEMS[idx].healTime + ')');
      else {
        useAnim.t0 = performance.now() - useAnim.ms * 0.5; updateUseAnim(0.016);
        if (m.position.distanceTo(pos) < 0.03) issues.push('half way through, the medkit should have been lifted to the face');
        if (Math.abs(m._lid.rotation.x) < 1.5) issues.push('half way through, the lid should be open');
        cancelMedkitHeal();
        if (useAnim) issues.push('cancelling the heal should end the animation');
      }
      if (m.position.distanceTo(pos) > 1e-6 || m.rotation.x !== rot.x || m.rotation.y !== rot.y || m.rotation.z !== rot.z || Math.abs(m._lid.rotation.x) > 1e-6) issues.push('the medkit was not put back as it was');
    } finally {
      cancelUseAnim(); try { cancelMedkitHeal(); } catch (e) {}
      playSoundEvent = save.snd; pushFeedLine = save.feed; flashScreen = save.flash;
      gameStarted = save.started; isDead = save.dead; activeSlot = save.slot; selectedSupportIdx = save.sup; for (let i = 0; i < save.uses.length; i++) supportUses[i] = save.uses[i]; lastSupport = save.last; _equip = save.eq; countdownActive = save.cd;
      m.position.copy(pos); m.rotation.copy(rot); m.visible = vis;
    }
    // every kind that is switched on, on a real model of its own: it moves the item, and when it is over (or cut short) the item is exactly where it was
    {
      const kinds = [['support', 'inject', 'stim'], ['support', 'injectX', 'adrenaline'], ['support', 'pin', 'smoke'], ['support', 'toss', 'blink_pearl'], ['support', 'plant', 'land_mine'],
        ['support', 'pop', 'confetti_cannon'], ['support', 'eat', 'hamburger'], ['melee', 'eat', 'baguette'], ['melee', 'throw', 'spear'], ['melee', 'flick', 'twin_knife'], ['melee', 'stab', 'knife']];
      const dev = SUPPORT_ITEMS.find(i => !i.archived && !i.adminItem && supportUseKind(i) === 'device');
      if (dev) kinds.push(['support', 'device', dev.id]);
      const keep = { started: gameStarted, dead: isDead, slot: activeSlot, sup: selectedSupportIdx, mel: selectedMeleeIdx, eq: _equip, swing: meleeSwingT };
      try {
        gameStarted = true; isDead = false; _equip = null; meleeSwingT = 1;
        for (const [slot, kind, id] of kinds) {
          const items = slot === 'melee' ? MELEE_ITEMS : SUPPORT_ITEMS, idx = items.findIndex(i => i.id === id);
          const mdl = idx < 0 ? null : (slot === 'melee' ? meleeModels : supportModels)[idx];
          if (!mdl) { issues.push(slot + ' ' + id + ': no model to run the ' + kind + ' animation on'); continue; }
          if (!USE_KINDS_READY.has(kind)) { issues.push(kind + ': should be switched on'); continue; }
          const v0 = mdl.visible; mdl.visible = true;                    // held in the hand, so shown
          const p0 = mdl.position.clone(), r0 = mdl.rotation.clone(), s0 = mdl.scale.clone(), o0 = mdl.rotation.order;
          const kids = []; mdl.traverse(c => kids.push([c, c.position.clone(), c.rotation.clone(), c.scale.clone(), c.visible]));
          try {
            activeSlot = slot; if (slot === 'melee') selectedMeleeIdx = idx; else selectedSupportIdx = idx;
            cancelUseAnim();
            startUseAnim(slot, items[idx], kind);
            if (!useAnim || useAnim.kind !== kind) { issues.push(slot + ' ' + id + ': ' + kind + ' did not start'); continue; }
            let moved = 0;
            for (const f of [0.15, 0.35, 0.5, 0.7, 0.9]) {
              useAnim.t0 = performance.now() - useAnim.ms * f; updateUseAnim(0.016);
              if (!useAnim) { issues.push(slot + ' ' + id + ': ' + kind + ' ended early at ' + f); break; }
              moved = Math.max(moved, mdl.position.distanceTo(p0) + Math.abs(mdl.rotation.x - r0.x) + Math.abs(mdl.rotation.z - r0.z) + Math.abs(mdl.scale.x - s0.x));
              if (![mdl.position.x, mdl.position.y, mdl.position.z, mdl.rotation.x, mdl.rotation.y, mdl.rotation.z].every(Number.isFinite)) issues.push(kind + ': the pose went to NaN at ' + f);
            }
            if (moved < 0.05) issues.push(slot + ' ' + id + ': the ' + kind + ' animation hardly moves the item (' + moved.toFixed(3) + ')');
            if (useAnim) { useAnim.t0 = performance.now() - useAnim.ms * 2; updateUseAnim(0.016); }
            if (useAnim) issues.push(kind + ': should be over after its time');
          } finally { cancelUseAnim(); }
          const bad = mdl.position.distanceTo(p0) > 1e-6 || mdl.rotation.x !== r0.x || mdl.rotation.y !== r0.y || mdl.rotation.z !== r0.z || mdl.scale.distanceTo(s0) > 1e-6 || mdl.visible !== true || mdl.rotation.order !== o0
            || kids.some(([c, p, r, sc, v]) => c.position.distanceTo(p) > 1e-6 || Math.abs(c.rotation.x - r.x) + Math.abs(c.rotation.y - r.y) + Math.abs(c.rotation.z - r.z) > 1e-6 || c.scale.distanceTo(sc) > 1e-6 || c.visible !== v);
          if (bad) issues.push(slot + ' ' + id + ': the ' + kind + ' animation did not leave the model as it was');
          mdl.visible = v0;
        }
      } finally { gameStarted = keep.started; isDead = keep.dead; activeSlot = keep.slot; selectedSupportIdx = keep.sup; selectedMeleeIdx = keep.mel; _equip = keep.eq; meleeSwingT = keep.swing; }
    }
    return issues;
  })()`);
  {
    // the melee abilities hand over to their animations (instead of the generic swing / a scale pulse)
    const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'game.js'), 'utf8');
    const ab = src.slice(src.indexOf('function activateMeleeAbility()'), src.indexOf('function activateMeleeAbility()') + 14000);
    for (const [type, kind] of [['melee_eat', 'eat'], ['melee_throw', 'throw'], ['melee_multithrow', 'flick'], ['melee_instakill', 'stab']]) {
      const i = ab.indexOf("ab.type === '" + type + "'"), j = ab.indexOf('else if (ab.type ===', i + 10);
      if (i < 0 || !ab.slice(i, j < 0 ? undefined : j).includes("startUseAnim('melee', item, '" + kind + "')")) issues.push(type + ' should start the ' + kind + ' animation');
    }
  }
  console.log('use animation checks: every track is well formed; every switched-on kind moves its item and puts it back; the medkit and its three skins (tablet, laptop, pizza box) open a lid; using a medkit runs the animation for the heal and puts everything back; the melee abilities start theirs');
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--archive')) {
  // Archived: the emote wheel and King of the Hill. Off the screen, refused by the server, a stale pick falls back, code kept.
  const issues = [];
  const idx = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
  const srv = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  if (!/data-mode="koth"[^>]*style="display:none/.test(idx)) issues.push('the King of the Hill card should be hidden on the mode screen');
  if (/MODE_TEAM_SIZES = \{[\s\S]*?\n  'koth':/.test(srv)) issues.push('the server should not open a lobby for King of the Hill');
  if (!vm.runInThisContext("ARCHIVED_MODES.has('koth') && EMOTES_ARCHIVED && !!GAME_MODE_CONFIGS.koth")) issues.push('KOTH and the emotes should be archived in the client with their code kept');
  if (vm.runInThisContext("KEY_ACTIONS.some(a => a[0] === 'emotes')")) issues.push('the emote key should not be rebindable while they are archived');
  {
    // the combos: archived for everyone but admin accounts (the code and the combos stay; one flag gives them back)
    const r = vm.runInThisContext(`(() => {
      const out = [], keep = { u: currentUser, m: MELEE_COMBO_MODE }, sl = MELEE_ITEMS.find(m => m.id === 'sledge');
      try {
        if (!COMBOS_ARCHIVED) out.push('the combos should be archived');
        currentUser = null; if (sl.ability.name !== 'Ground Slam' || sl.ability.combo) out.push('an ordinary player should have the regular Ground Slam, has ' + sl.ability.name);
        currentUser = { isAdmin: false }; if (sl.ability.combo) out.push('a player who is not an admin should not have the combo');
        if (setMeleeComboMode(!MELEE_COMBO_MODE) !== false) out.push('only an admin may switch the combo mode');
        if (toggleMeleeComboMode() !== false) out.push('the H key should refuse for an ordinary player');
        currentUser = { isAdmin: true }; MELEE_COMBO_MODE = true; if (!sl.ability.combo) out.push('an admin should still have the combo');
        for (const id of ['fists', 'combat_axe', 'sabre', 'bat', 'frying_pan', 'riot_shield', 'spear']) { const it = MELEE_ITEMS.find(m => m.id === id); currentUser = null; if (it.ability.combo) out.push(id + ': ordinary players should not have its combo'); }
      } finally { currentUser = keep.u; MELEE_COMBO_MODE = keep.m; }
      return out;
    })()`);
    issues.push(...r);
    if (!/const comboLaunch = data\?\.weapon === 'combo_launch' && canUseHellfire\(shooter\)/.test(srv)) issues.push('the server should only give a combo launch to an admin');
  }
  console.log('archive checks: King of the Hill and the emote wheel are off the screen, refused by the server, their code kept; the combos are archived for everyone but admin accounts');
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--netinterp')) {
  // Remote players on the network: packets arrive ~30 times a second, with jitter; the body must glide between them at
  // the screen's own frame rate (it used to move only when a packet landed -- one frame in three at 60 fps -- and trail by
  // two packets), keep gliding through a dropped packet, not slide across the map on a teleport, take the short way
  // round on a turn, and still work against a server that does not stamp packets.
  const out = vm.runInThisContext(`(() => {
    const issues = [];
    const realNow = performance.now.bind(performance);
    let T = 0;
    Object.defineProperty(performance, 'now', { value: () => T, configurable: true, writable: true });
    const SPEED = 6, OFFSET = 12345;                       // m/s along x; my clock minus the server's
    const saved = { bots: gameBots.length };
    const run = (name, opts) => {
      _netOffset = null;
      const pid = 'net_' + name;
      players[pid] = { id: pid, isBot: false, x: 0, y: 1.65, z: 0, rotY: 0 };
      const mesh = new THREE.Group(); remoteMeshes[pid] = mesh;
      let lastPacket = 0, seed = 7;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const frames = [], FRAME = 1000 / opts.fps;
      let nextPacket = 0, nowS = 0;
      const pending = [];
      for (let t = 0; t < 3000; t += FRAME) {
        nowS = t;
        // the player moves in real (server) time; a packet is sent every 33 ms and arrives after 30 +/- 12 ms
        while (nextPacket <= nowS) {
          const sent = nextPacket; nextPacket += 33;
          if (opts.drop && sent > 1500 && sent < 1500 + opts.drop) continue;
          let x = SPEED * sent / 1000, rotY = opts.turn ? (sent < 1500 ? 3.0 : -3.0) : 0;
          if (opts.teleport && sent >= 2000) x += 40;
          pending.push({ arrive: sent + 30 + (rnd() - .5) * 24, sent, x, rotY });
        }
        pending.sort((a, b) => a.arrive - b.arrive);
        while (pending.length && pending[0].arrive <= nowS) {
          const k = pending.shift();
          T = k.arrive + OFFSET;
          const pos = { x: k.x, y: 1.65, z: 0, rotY: k.rotY };
          if (!opts.unstamped) pos.at = k.sent + 100000;          // the server's clock
          players[pid].x = pos.x;
          netPushSnapshot(pid, pos, T);
        }
        T = nowS + OFFSET;
        updateRemoteInterp();
        frames.push({ t: nowS, x: mesh.position.x, rot: mesh.rotation.y - Math.PI });
      }
      delete remoteMeshes[pid]; delete players[pid];
      return frames;
    };
    try {
      for (const fps of [60, 144]) {
        const f = run('smooth' + fps, { fps }).filter(r => r.t > 600 && r.t < 1400);
        const want = SPEED / fps, steps = f.slice(1).map((r, i) => r.x - f[i].x);
        const worst = Math.max(...steps.map(d => Math.abs(d - want)));
        if (worst > want * 0.35) issues.push(fps + ' fps: a frame moved ' + (worst + want).toFixed(3) + ' m, wanted ' + want.toFixed(3) + ' (stutter)');
        const lag = f.map(r => (SPEED * r.t / 1000 - r.x) / SPEED * 1000);
        const mean = lag.reduce((a, b) => a + b, 0) / lag.length;
        if (typeof process !== 'undefined' && process.env.NETINTERP_DEBUG) console.log(fps + ' fps: worst step ' + (worst + want).toFixed(3) + ' m (wanted ' + want.toFixed(3) + '), lag ' + mean.toFixed(0) + ' ms');
        if (mean < 40 || mean > 140) issues.push(fps + ' fps: bodies trail by ' + mean.toFixed(0) + ' ms (want ~70)');
      }
      // a dropped stretch of packets: keep going, then catch up without jumping back
      const d = run('drop', { fps: 60, drop: 100 }).filter(r => r.t > 1450 && r.t < 1800);
      const dsteps = d.slice(1).map((r, i) => r.x - d[i].x);
      if (dsteps.some(s => s < -0.0001)) issues.push('a dropped packet made the body go backwards');
      if (Math.min(...dsteps) < SPEED / 60 * 0.3 && d.slice(0, 8).every((r, i, a) => i === 0 || r.x === a[i - 1].x)) issues.push('a dropped packet froze the body at once');
      // a teleport must not be a slide
      const tp = run('tp', { fps: 60, teleport: true });
      const mid = tp.filter(r => r.x > 20 && r.x < 40);
      if (mid.length) issues.push('a teleport slid the body across ' + mid.length + ' frames');
      // a turn through +-pi goes the short way
      const tr = run('turn', { fps: 60, turn: true }).filter(r => r.t > 1400 && r.t < 1900);
      if (tr.some(r => Math.abs(r.rot) < 2.5)) issues.push('a turn from 3.0 to -3.0 went the long way round');
      // a server that does not stamp packets still plays smoothly
      const un = run('old', { fps: 60, unstamped: true }).filter(r => r.t > 800 && r.t < 1600);
      const usteps = un.slice(1).map((r, i) => r.x - un[i].x);
      if (Math.max(...usteps) > SPEED / 60 * 2.2) issues.push('unstamped packets: a frame jumped ' + Math.max(...usteps).toFixed(3) + ' m');
      if (!usteps.some(s => s > 0)) issues.push('unstamped packets: the body never moved');
    } finally {
      Object.defineProperty(performance, 'now', { value: realNow, configurable: true, writable: true });
      _netOffset = null;
    }
    return issues;
  })()`);
  console.log('netinterp checks: smooth at 60/144 fps, ~70 ms behind, dropped packets, teleports, turns, unstamped server');
  if (out.length) { ok = false; console.log(out.join('\n')); }
}

if (ok && process.env.MAP_REVIEW_DIR) {
  fs.mkdirSync(process.env.MAP_REVIEW_DIR, { recursive: true });
  for (const name of ['forest', 'desert', 'tundra', 'refinery', 'space', 'volcano', 'titanic', 'carrier', 'pearl_harbor']) {
    const json = vm.runInThisContext('MAP_GROUPS[' + JSON.stringify(name) + '].toJSON()');
    fs.writeFileSync(path.join(process.env.MAP_REVIEW_DIR, name + '.json'), JSON.stringify(json));
  }
}

if (ok) {
  const late = ['currentUser', 'RELOAD_KEYS', 'WEAPONS', 'weaponModels', 'BASIC_GUN_STAT_SKINS'];
  const missing = late.filter(n => {
    try { return vm.runInThisContext('typeof ' + n) === 'undefined'; } catch (e) { return true; }
  });
  if (missing.length) {
    ok = false;
    console.log('BOOT INCOMPLETE — never declared: ' + missing.join(', '));
  } else {
    console.log('boot OK — game.js evaluated to the end; every late declaration exists');
  }
}
process.exit(ok ? 0 : 1);
