const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({headless:true});
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/');
    await page.waitForFunction(() => typeof doJump==='function' && typeof updateMovement==='function');
    await page.evaluate(() => { window.requestAnimationFrame=()=>0; });
    const result = await page.evaluate(() => {
      const check=(ok,msg)=>{if(!ok)throw Error(msg);};
      const eye=PLAYER_EYE_HEIGHT, mapId='warehouse_box';
      const frag=SUPPORT_ITEMS.findIndex(s=>s.id==='frag');
      function setup(x,y,z) {
        activateMap(mapId);
        gameStarted=true;isDead=false;match=null;inLobby=false;countdownActive=false;
        activeSlot='support';selectedSupportIdx=frag;
        for(const k of Object.keys(keys))keys[k]=false;
        joyDir={x:0,y:0};joyActive=false;
        window._crouchEye=eye;window._launchFeet=null;window._slideUntil=0;
        window._mobileJump=false;window._mobileCrouch=false;window._mobileSlide=false;
        window._climbArmed=false;window._airJumpsLeft=0;window._blastJumpsLeft=0;
        window._blastCarry=false;_extVel.x=0;_extVel.z=0;
        airTime=0;playerYVel=0;slamState=null;
        camera.position.set(x,y,z);
      }
      function hop(dt,groundY,trigger) {
        trigger();
        check(slamState?.vel>0,'Jump did not launch');
        let apex=camera.position.y;
        for(let frame=0;frame<300&&slamState;frame++){
          updateMovement(dt);
          apex=Math.max(apex,camera.position.y);
          check(!isDead&&camera.position.y>=groundY-.002,'Jump fell through solid ground');
        }
        check(!slamState&&Math.abs(camera.position.y-groundY)<.002,'Jump missed its landing surface');
        check(airTime===0&&playerYVel===0,'Landing left gravity or velocity behind');
        return apex-groundY;
      }
      const trigger=()=>{
        document.dispatchEvent(new KeyboardEvent('keydown',{code:'Space',bubbles:true}));
        document.dispatchEvent(new KeyboardEvent('keyup',{code:'Space',bubbles:true}));
      };
      const results=[];
      for(const fps of [20,30,60,120]) {
        setup(0,eye,(MAP_SPAWNS[mapId].ally.z0+MAP_SPAWNS[mapId].ally.z1)/2);
        const heights=Array.from({length:12},()=>hop(1/fps,eye,trigger));
        check(heights[0]>2.0&&heights[0]<2.7&&Math.max(...heights)-Math.min(...heights)<.002,'Spam jumping changed jump height at '+fps+' fps');
        results.push(fps+' fps: '+heights[0].toFixed(2)+' m on every hop');
      }

      setup(0,eye+2.75,0);
      wallColliders.splice(0,wallColliders.length,new THREE.Box3(
        new THREE.Vector3(-4,2.25,-4),new THREE.Vector3(4,2.75,4)));
      const platformHop=hop(1/30,eye+2.75,()=>doJump(false));
      check(platformHop>2.0,'Jump from a thin raised deck lost height');
      // Both vertical paths must catch a fast descent and immediately forget the fall.
      for(const useSlam of [false,true]){
        camera.position.y=eye+4;airTime=7.5;
        playerYVel=useSlam?0:-65;slamState=useSlam?{type:'fall',vel:-65}:null;
        updateMovement(.05);
        check(!slamState&&playerYVel===0&&airTime===0&&Math.abs(camera.position.y-eye-2.75)<.002,'Fast fall tunnelled through deck');
        check(hop(.05,eye+2.75,()=>doJump(false))>2.0,'Jump after hard landing inherited gravity');
      }

      setup(0,eye,0);wallColliders.length=0;
      window._crouchEye=1.1;camera.position.y=1.4;
      check(!isPlayerGrounded(),'Crouching in midair was mistaken for landing');
      window._crouchEye=eye;camera.position.y=eye;playerYVel=5;
      check(!isPlayerGrounded(),'An upward launch was mistaken for standing');
      camera.position.y=eye+8;airTime=2;playerYVel=0;slamState={type:'fall',vel:-3};
      window._airJumpsLeft=1;doJump(false);
      check(slamState.vel===AIR_JUMP_VEL&&window._airJumpsLeft===0&&airTime===2,'Double jump changed the continuous-air rule');
      updateMovement(1/60);
      check(airTime>2,'Extra gravity no longer builds in one uninterrupted flight');

      setup(MAP_BOUNDS[mapId].halfX+1,eye,0);wallColliders.length=0;
      const realKill=killLocalOutOfBounds;
      let fell=false;
      killLocalOutOfBounds=()=>{fell=true;};
      try {
        doJump(false);
        check(!slamState,'Jump launched from empty space');
        for(let i=0;i<240&&!fell;i++)updateMovement(1/60);
        check(fell,'A real void fall no longer triggers ring-out');
      } finally {killLocalOutOfBounds=realKill;}
      return results;
    });
    assert.deepEqual(errors,[]);
    console.log('Jump landing: '+result.join(', ')+'; fast landings on raised decks, crouch and launch checks, double jump, and real void fall');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
