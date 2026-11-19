const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

function verifyRelay() {
  const source = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
  const start = source.indexOf("socket.on('shoot',");
  const shots = [], player = { id: 'tester', matchId: 'duel', lastShot: 0 };
  let handler, now = 10000;
  vm.runInNewContext(source.slice(start, source.indexOf('\n  });', start)+7), {
    players: { tester: player }, socket: { id: player.id, on: (_, fn) => handler = fn },
    Date: { now: () => now }, hellfireWeapon: () => false,
    emitToMatch: (room, event, data) => { assert.equal(room, 'duel'); assert.equal(event, 'bulletFired'); shots.push(data); },
  });
  for (const [weapon, fuse, expected] of [
    ['frag', 25, 25], ['frag', 0, 0], ['frag', 5000, 3000], ['frag', -5, 0],
    ['frag', NaN, undefined], ['frag', '25', undefined], ['pistol', 25, undefined],
  ]) {
    now += 100;
    handler({ weapon, fragFuseMs: fuse, skin: 'frag_stopwatch' });
    assert.equal(shots.at(-1).fragFuseMs, expected);
    assert.equal(shots.at(-1).skin, 'frag_stopwatch');
  }
}

(async () => {
  verifyRelay();
  const browser = await chromium.launch({ headless:true });
  try {
    const page = await browser.newPage({ viewport:{width:390,height:844}, hasTouch:true });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/');
    await page.waitForFunction(() => myId && typeof releaseFragCook==='function');
    await page.evaluate(() => { window.requestAnimationFrame=()=>0; });
    await page.waitForTimeout(100);
    await page.evaluate(() => {
      const check=(ok,msg)=>{if(!ok)throw Error(msg);};
      const realNow=Date.now, realEmit=socket.emit, realExplosion=spawnExplosion;
      const frag=SUPPORT_ITEMS.findIndex(s=>s.id==='frag'), me=players[myId], meter=document.getElementById('frag-fuse');
      const events=[], explosions=[], receive=socket.listeners('bulletFired')[0];
      let now=Date.now();
      Date.now=()=>now;
      socket.emit=(event,data)=>{events.push({event,data});return socket;};
      spawnExplosion=(pos,theme)=>explosions.push({pos,theme});
      const mouse=type=>renderer.domElement.dispatchEvent(new MouseEvent(type,{button:0,bubbles:true}));
      const touch=(type,id)=>{
        const finger=new Touch({identifier:id,target:btnFire,clientX:370,clientY:720});
        btnFire.dispatchEvent(new TouchEvent(type,{changedTouches:[finger],bubbles:true,cancelable:true}));
      };
      function ready(skin) {
        resetFragWindup();
        for(const g of activeGrenades)scene.remove(g.mesh);
        activeGrenades.length=0;events.length=0;explosions.length=0;
        gameStarted=true;inLobby=false;isDead=false;countdownActive=false;match=null;
        spawnShieldUntil=0;_ssWasDead=false;equipReadyAt=0;lastSupport=0;shooting=false;
        currentUser={isAdmin:true};adminCheats.godMode=false;
        activeSlot='support';selectedSupportIdx=frag;supportUses[frag]=2;me.hp=300;
        equippedSupportModelSkins.frag=skin;
        camera.position.set(0,1.65,0);camera.quaternion.identity();
        wallColliders.length=0;
      }
      const shots=()=>events.filter(e=>e.event==='shoot').map(e=>e.data);
      try {
        ready();mouse('mousedown');
        const deadline=now+GRENADE_FUSE;
        check(fragCook?.explodeAt===deadline&&supportUses[frag]===1&&!meter.hidden,'Press did not prime one grenade');
        now+=2600;for(let i=0;i<50;i++)updateGrenadeWindup(.05);
        check(fragCook&&grenadeWindupT===.38&&!shots().length&&!activeGrenades.length,'Held grenade threw itself early');
        check(meter.value===400&&meter.classList.contains('urgent'),'Last-second fuse warning did not update');
        now=deadline-12;mouse('mouseup');
        check(!fragCook&&meter.hidden&&activeGrenades.length===1&&shots().length===1,'Release did not spawn immediately');
        check(activeGrenades[0].explodeAt===deadline&&shots()[0].fragFuseMs===12,'Throw reset the fuse');
        mouse('mouseup');now=deadline;updateGrenades(.016);updateGrenades(.016);
        check(explosions.length===1&&me.hp===300&&!activeGrenades.length,'Released grenade exploded twice or damaged its owner');

        ready('frag_stopwatch');mouse('mousedown');now+=GRENADE_FUSE;updateGrenadeWindup(.016);mouse('mouseup');
        check(!fragCook&&!activeGrenades.length&&shots().length===1&&shots()[0].fragFuseMs===0,'Expired fuse produced a late throw');
        check(me.hp===220&&explosions.length===1&&explosions[0].theme?.stopwatch,'In-hand explosion lost damage or skin');
        check(events.some(e=>e.event==='environmentDamage'&&e.data.amount===80),'In-hand damage was not synced');

        ready('frag_spider');touch('touchstart',7);now+=750;touch('touchend',8);
        check(fragCook&&!shots().length,'An unrelated touch released the grenade');
        touch('touchend',7);
        check(activeGrenades[0]?.spider&&shots()[0]?.fragFuseMs===2250,'Mobile release lost fuse or skin');

        ready('frag_tactical_quack');touch('touchstart',9);now+=600;touch('touchcancel',9);
        check(activeGrenades.length===1&&shots()[0].fragFuseMs===2400,'Cancelled touch lost its live grenade');
        check(!shots()[0].dx&&!shots()[0].dy&&!shots()[0].dz,'Cancelled touch threw instead of dropping');

        ready();mouse('mousedown');resetFragWindup();now+=GRENADE_FUSE;mouse('mouseup');updateGrenadeWindup(.016);
        check(!shots().length&&!explosions.length&&meter.hidden,'Reset left a grenade armed');

        ready();mouse('mousedown');now+=400;
        selectedPrimaryIdx=WEAPONS.findIndex(w=>w.id==='ak20');activeSlot='primary';equipActiveSlot();
        check(!fragCook&&activeGrenades.length===1&&shots()[0].fragFuseMs===2600&&shots()[0].dz===0,'Switching slots lost or threw the live grenade');

        ready();
        const packet={weapon:'frag',ownerId:'opponent',id:'remote-frag',x:0,y:1.5,z:0,dx:0,dy:0,dz:-1};
        for(const skin of [undefined,'frag_spider','frag_stopwatch','frag_tactical_quack','frag_hacker']) {
          receive({...packet,skin,fragFuseMs:90});
          check(activeGrenades.at(-1)?.explodeAt===now+90&&activeGrenades.at(-1)?.visualOnly,'Remote skin lost its shared fuse');
        }
        receive({...packet,id:'remote-burst',fragFuseMs:0});
        check(explosions.length===1&&activeGrenades.length===5&&me.hp===300,'Remote in-hand burst spawned flight or duplicate damage');
        receive({...packet,id:'legacy-frag'});
        check(activeGrenades.at(-1)?.explodeAt===now+GRENADE_FUSE,'Missing network fuse broke the legacy default');
      } finally {
        resetFragWindup();Date.now=realNow;socket.emit=realEmit;spawnExplosion=realExplosion;
      }
    });
    await page.evaluate(async () => {
      const emit=socket.emit, explosion=spawnExplosion, me=players[myId];
      let bursts=0;
      socket.emit=()=>socket;
      spawnExplosion=()=>bursts++;
      try {
        for(const g of activeGrenades)scene.remove(g.mesh);
        activeGrenades.length=0;
        selectedSupportIdx=SUPPORT_ITEMS.findIndex(item=>item.id==='frag');
        activeSlot='support';me.hp=300;
        primeFrag(Date.now());
        await new Promise(resolve=>setTimeout(resolve,GRENADE_FUSE+100));
        if(fragCook||bursts!==1||me.hp!==220||activeGrenades.length)throw Error('Fuse did not expire exactly once without animation frames');
      } finally {
        resetFragWindup();socket.emit=emit;spawnExplosion=explosion;
      }
    });
    assert.deepEqual(errors,[]);
    console.log('Frag: mouse and touch cooking, deadline-preserving release, in-hand damage, safe reset, skins and multiplayer fuse relay');
  } finally { await browser.close(); }
})().catch(e=>{ console.error(e);process.exitCode=1; });
