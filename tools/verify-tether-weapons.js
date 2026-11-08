const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {mkdtempSync,rmSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {join}=require('node:path');
const {io}=require('socket.io-client');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const port=42000+Math.floor(Math.random()*1000),url='http://localhost:'+port;
const dir=mkdtempSync(join(tmpdir(),'pvp-tether-'));
const server=spawn(process.execPath,[join(__dirname,'../server.js')],{env:{...process.env,PORT:String(port),DATA_DIR:dir},stdio:'ignore'});
const sockets=[],sleep=ms=>new Promise(r=>setTimeout(r,ms));
function event(s,name){
  return new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>{s.off(name,on);reject(Error('Timeout: '+name));},4000);
    function on(data){clearTimeout(timeout);resolve(data);}
    s.once(name,on);
  });
}
(async()=>{
  let browser;
  try{
    let ready=false;
    for(let i=0;i<60&&!ready;i++){try{ready=(await fetch(url)).ok;}catch{}if(!ready)await sleep(100);}
    assert(ready,'Test server did not start');
    const [A,B,C]=await Promise.all(Array.from({length:3},async()=>{
      const s=io(url,{autoConnect:false,transports:['websocket']});sockets.push(s);
      const init=event(s,'init');s.connect();await init;return s;
    }));
    await Promise.all([A,B,C].map(s=>{
      const roster=event(s,'matchRoster');s.emit('enterMatch',{matchId:'tether-test',mode:'ffa5'});return roster;
    }));
    const move=(s,x,z)=>s.emit('move',{x,y:1.65,z,rotY:0,rotX:0});
    move(A,0,0);move(B,0,55);move(C,0,25);
    await sleep(100);
    const shoot=(weapon,n)=>{
      const id=`local_${A.id}_${n}`;
      A.emit('setWeapon',{weaponId:weapon});
      A.emit('shoot',{weapon,projectileId:id,x:0,y:1.1,z:0,dx:0,dy:0,dz:1});
      return id;
    };
    let id=shoot('harpoon_gun',1),seen=event(B,'harpoonState');
    const automaticPull=event(B,'grapplePulled');
    A.emit('harpoonLatch',{id,targetId:B.id,x:0,y:1.1,z:55});
    assert.equal((await seen).targetId,B.id);
    const pull=await automaticPull;assert.equal(pull.z,-1);assert.equal(pull.force,34);
    seen=event(B,'playerHit');A.emit('hit',{targetId:B.id,weapon:'harpoon_gun',bulletId:id});
    assert.equal((await seen).hp,205);
    for(const n of [2,3]){
      await sleep(30);
      const other=shoot('harpoon_gun',n);seen=event(B,'harpoonState');
      A.emit('harpoonLatch',{id:other,x:0,y:1.1,z:50});
      assert.equal((await seen).id,other);
    }
    const extra=[];B.on('bulletFired',d=>extra.push(d));
    await sleep(30);shoot('harpoon_gun',4);await sleep(100);
    assert.equal(extra.length,0,'A fourth harpoon fired');
    seen=event(C,'harpoonTripped');A.emit('harpoonTrip',{id,targetId:C.id});
    assert.equal((await seen).id,C.id);
    seen=event(C,'harpoonState');A.emit('harpoonRecall',{id});
    assert.equal((await seen).point,undefined);
    move(B,0,10);
    await sleep(100);
    const hits=[],swaps=[];B.on('playerHit',d=>hits.push(d));B.on('weaponSwap',d=>swaps.push(d));
    id=shoot('swap_gun',2);seen=event(B,'weaponSwap');
    A.emit('swapGunHit',{id,targetId:B.id});A.emit('swapGunHit',{id,targetId:B.id});
    A.emit('hit',{targetId:B.id,weapon:'swap_gun',bulletId:id});
    const {positions}=await seen;
    assert.deepEqual(positions.map(p=>[p.id,p.z]),[[A.id,10],[B.id,0]]);
    await sleep(100);assert.equal(swaps.length,1);assert.equal(hits.length,0);
    console.log('PASS: server latch, pull, trip, recall and one-use zero-damage swap');

    browser=await chromium.launch({headless:true});
    const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(url);
    await page.waitForFunction(()=>window.PVP_TETHER_WEAPONS&&myId);
    await page.evaluate(()=>{requestAnimationFrame=()=>0;});await page.waitForTimeout(100);
    await page.evaluate(async()=>{
      const check=(ok,message)=>{if(!ok)throw Error(message);};
      await PVP_RAGDOLL.ready;
      gameStarted=true;inLobby=false;isDead=false;countdownActive=false;
      activateMap('boss_arena');match=null;camera.position.set(30,1.65,30);
      wallColliders.length=0;wallColliders.push(new THREE.Box3(new THREE.Vector3(28,0,39),new THREE.Vector3(32,4,40)));
      const idx=WEAPONS.findIndex(w=>w.id==='harpoon_gun'),w=WEAPONS[idx];
      check(w.damage===95&&w.maxRange===60&&projectileBaseSpeed(w.id,w,w.bulletSpeed)===220,'Harpoon balance mismatch');
      currentWeaponIdx=idx;currentWeapon=w;activeSlot='primary';
      const origin=new THREE.Vector3(30,1.1,30),dir=new THREE.Vector3(0,0,1);
      spawnLocalBullet(origin,dir,'test_harpoon',true,w.bulletSpeed,w.bulletColor,w.bulletSize,w.id);
      check(weaponAmmo[idx].ammo===2,'Bolt not consumed');
      for(let i=0;i<20;i++){updateBullets(1/60);PVP_TETHER_WEAPONS.step(1/60);}
      check(PVP_TETHER_WEAPONS.latched,'Native projectile missed wall');
      PVP_TETHER_WEAPONS.reel();check(_extVel.z>0,'Wall tether did not pull player');
      for(let n=2;n<=3;n++)spawnLocalBullet(origin,dir,'test_harpoon_'+n,true,w.bulletSpeed,w.bulletColor,w.bulletSize,w.id);
      check(PVP_TETHER_WEAPONS.full&&weaponAmmo[idx].ammo===0,'Three-bolt capacity not enforced');
      PVP_TETHER_WEAPONS.recall();
      for(let i=0;i<60;i++)PVP_TETHER_WEAPONS.step(1/60);
      check(!PVP_TETHER_WEAPONS.deployed&&weaponAmmo[idx].ammo===3,'Recall failed to restore all three bolts');
      check(PVP_RAGDOLL.knockdown(myId)&&PVP_RAGDOLL.controlling,'Trip did not enter nonfatal ragdoll');
      for(let i=0;i<100;i++)PVP_RAGDOLL.tick(1/60);
      check(!PVP_RAGDOLL.controlling&&!isDead,'Trip did not recover');
      const swapIdx=WEAPONS.findIndex(w=>w.id==='swap_gun');
      check(weaponModels[swapIdx]?.children.length>3&&getClientWeaponDamage('swap_gun')===0,'Swap model or damage incorrect');
      socket.disconnect();
      camera.position.set(30,1.65,30);wallColliders.length=0;
      const target='swap_fixture',mesh=makePlayerMesh('Fixture');
      mesh.position.set(30,0,36);remoteMeshes[target]=mesh;scene.add(mesh);
      players[target]={id:target,x:30,y:1.65,z:36,hp:300,dead:false};
      const swap=WEAPONS[swapIdx];currentWeaponIdx=swapIdx;currentWeapon=swap;activeSlot='secondary';
      spawnLocalBullet(origin,dir,'test_swap',true,swap.bulletSpeed,swap.bulletColor,swap.bulletSize,swap.id);
      for(let i=0;i<12;i++)updateBullets(1/60);
      check(camera.position.z===36&&mesh.position.z===30&&players[target].hp===300,'Native Swap Gun collision did not swap positions without damage');
    });
    assert.deepEqual(errors,[]);
    console.log('PASS: browser wall collision, tether pull, recall, ragdoll recovery and native zero-damage swap');
  }finally{
    await browser?.close();
    sockets.forEach(s=>s.close());server.kill();
    if(server.exitCode===null&&server.signalCode===null)await new Promise(r=>server.once('exit',r));
    rmSync(dir,{recursive:true,force:true});
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
