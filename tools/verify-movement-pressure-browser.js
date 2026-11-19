const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async()=>{
  const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    for(const width of [1280,390]){
      const page=await browser.newPage({viewport:{width,height:820}}), errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/');
      await page.waitForFunction(()=>typeof slideMomentumProfile==='function'&&!!window.PVP_BATTLE_SIM);
      await page.evaluate(()=>{
        const check=(ok,msg)=>{if(!ok)throw Error(msg);};
        requestAnimationFrame=()=>0;
        match={type:'ffa',active:true,roundActive:true,over:false};inLobby=false;isDead=false;
        document.getElementById('hud').style.display='block';
        check(slideMomentumProfile(1,1)>slideMomentumProfile(1,.28)&&slideMomentumProfile(.01,1)<1,'Slide does not reward entry speed and penalize a late exit');
        const V=(x,y,z)=>new THREE.Vector3(x,y,z);
        const wall=new THREE.Box3(V(0,0,-2),V(1,5,2));
        wallColliders.splice(0,wallColliders.length,wall);
        camera.position.set(-.48,3,0);window._crouchEye=PLAYER_EYE_HEIGHT;window._mapLadder=null;
        window._climbArmed=true;wallKickUsed=false;playerVelocity.set(0,0,5);
        check(wallKickNormal(camera.position,playerFeetY())?.x===-1,'Wrong wall face');
        doJump(false);
        check(wallKickUsed&&_extVel.x < -8&&_extVel.z>0&&slamState?.type==='jump','Wall kick missed, failed to carry tangent, or pushed into wall');
        window._climbArmed=true;check(!tryPlayerWallKick(),'Second wall kick before landing');
        check(!wallKickNormal(V(-.48,8,0),6.35),'Wall kick incorrectly allowed above the wall');
        check(!wallKickNormal(V(-.48,3,0),1.35,[new THREE.Box3(V(0,2.2,-2),V(1,2.5,2))]),'Wall kick accepted a low slab');
        const shot=()=>({ownerId:'other-test-shooter',weaponId:'ak20'});
        myId='pressure-test';camera.position.set(0,2,0);suppressionLevel=0;
        const q=camera.quaternion.clone(), angles=euler.clone();
        suppressionPass(shot(),.70,1.67,2,0,0,-4,.27);
        check(suppressionLevel===0,'Cover did not stop suppression');
        const bullet=shot();suppressionPass(bullet,.70,1.67,2,0,0,-4,1);
        const once=suppressionLevel;
        suppressionPass(bullet,.70,1.67,2,0,0,-4,1);
        check(once>0&&once===suppressionLevel,'One projectile counted twice');
        renderSuppression();
        const el=document.getElementById('suppression-edge');check(+el.style.opacity===0,'One shot triggered sustained pressure');
        for(let i=0;i<6;i++)suppressionPass(shot(),.70,1.67,2,0,0,-4,1);
        updateRealismFeedback(.016);
        check(+el.style.opacity>0&&+el.style.opacity<=.34,'Suppression overlay is missing or too strong');
        check(camera.quaternion.equals(q)&&euler.equals(angles),'Suppression moved aim');
        check(el.getBoundingClientRect().width===innerWidth&&getComputedStyle(el).pointerEvents==='none','Suppression overlay blocks play or overflows');
        suppressionAt-=2000;renderSuppression();check(+el.style.opacity===0,'Suppression failed to fade');
        const bounce=surfaceKind=>{
          const b={dir:V(1,-1,0).normalize(),speed:100,mesh:new THREE.Group()};
          bounceSlingshot(b,V(0,1,0),{surfaceKind},V(0,0,0));return b;
        };
        const metal=bounce('metal'),concrete=bounce('concrete'),wood=bounce('wood');
        check(metal.speed>concrete.speed&&concrete.speed>wood.speed&&metal.dir.y>concrete.dir.y&&concrete.dir.y>wood.dir.y,'Surface did not change bounce speed and angle');
        check(MAP_COLLIDERS.bridgeworks.some(c=>c.surfaceKind==='metal'),'Missing metal deck in a playable map');
      });
      assert.deepEqual(errors,[]);
      console.log(width+'px: slide profile, one wall kick, aim-neutral suppression with cover, and Slingshot surfaces verified');
      await page.close();
    }
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
