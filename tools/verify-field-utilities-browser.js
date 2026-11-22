const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
  const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{
    for(const width of [1280,390]){
      const page=await browser.newPage({viewport:{width,height:820},hasTouch:width<500});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.goto(process.env.PVP_TEST_URL||'http://localhost:3001/');
      await page.waitForFunction(()=>!!window.PVP_FIELD_UTILITIES&&!!window.PVP_BATTLE_SIM);
      const data=await page.evaluate(()=>{
        const check=(ok,m)=>{if(!ok)throw Error(m);};
        requestAnimationFrame=()=>0;
        socket.disconnect();
        check(SUPPORT_ITEMS.length===supportModels.length,'Support model indices');
        const jump=SUPPORT_ITEMS.find(u=>u.id==='bounce_pad'),trap=SUPPORT_ITEMS.find(u=>u.id==='bear_trap');
        check(jump&&!jump.archived&&jump.uses===2&&trap?.damage===35,'Utility definitions');
        check(WEAPON_COSTS.bounce_pad===1400&&WEAPON_COSTS.bear_trap===1600,'Shop prices');
        check(PVP_SHOP_CATALOG.category('bear_trap')==='normal'&&PVP_SHOP_CATALOG.category('bounce_pad')==='normal','Normal tier');
        currentUser={username:'Utility test',purchased:['bounce_pad','bear_trap'],unlocks:[],skinInventory:[]};
        check(isOwned('bounce_pad')&&isOwned('bear_trap'),'Ownership');
        document.getElementById('overlay').style.display='none';document.getElementById('mode-screen').style.display='none';
        requestPointerLockSafe=()=>{};showLoadoutScreen('swap');
        for(const id of ['bounce_pad','bear_trap'])check(document.querySelector('#loadout-support-list [data-item-id="'+id+'"]'),'Missing utility selection button: '+id);
        // Feed the same broadcast used by the multiplayer authority.
        const receive=socket.listeners('fieldUtility')[0];check(receive,'Network handler');
        myId='utility_test';players[myId]={id:myId,hp:300,team:'blue'};
        gameStarted=true;inLobby=false;isDead=false;
        camera.position.set(0,PLAYER_EYE_HEIGHT,0);
        const now=Date.now();
        receive({action:'place',field:{id:'pad_test',kind:'bounce_pad',ownerId:myId,x:0,y:0,z:0,ready:now-1,until:now+15000,remaining:3}});
        check(scene.getObjectByName('field-bounce_pad'),'Placed pad model');
        PVP_FIELD_UTILITIES.step(1/60);
        check(slamState?.type==='pad'&&Math.abs(slamState.vel-Math.sqrt(66*18))<.001,'Stepping onto pad did not launch');
        check(Math.abs(Math.hypot(_extVel.x,_extVel.z)-PVP_FIELD_RULES.launch(GRAVITY).forward)<.001,'Forward launch impulse');
        receive({action:'remove',id:'pad_test'});
        check(!scene.getObjectByName('field-bounce_pad'),'Removal');
        const shot={id:'trap_test',kind:'bear_trap',ownerId:'enemy_test',x:0,y:0,z:0,hp:30,ready:now+1000,remaining:1};
        receive({action:'place',field:shot});
        const b={id:'utility_bullet',isOwn:true,weaponId:'srx'};
        check(!PVP_FIELD_UTILITIES.hitBullet(b,-2,.1,0,4,0,0,.1),'Shot went through cover');
        check(PVP_FIELD_UTILITIES.hitBullet(b,-2,.1,0,4,0,0,1),'Shot failed to destroy trap');
        check(!scene.getObjectByName('field-bear_trap'),'Trap survived 95 damage');
        receive({action:'trigger',id:'root_test',kind:'bear_trap',targetId:myId});
        check(playerRootedUntil>=now+790&&thornRootedUntil>=playerRootedUntil,'Root duration / jump lock');
        PVP_FIELD_UTILITIES.clear();
        // Exercise the physical deployment arc through to ground placement.
        wallColliders.length=0;
        camera.position.set(0,PLAYER_EYE_HEIGHT,0);camera.rotation.set(0,0,0);
        PVP_FIELD_UTILITIES.deploy('bounce_pad');PVP_FIELD_UTILITIES.step(.5);
        const deployed=scene.getObjectByName('field-bounce_pad');
        check(deployed&&Math.abs(deployed.position.z+3)<.01&&Math.abs(deployed.position.y)<.01,'Throw did not land on the ground');
        PVP_FIELD_UTILITIES.clear();
        playerRootedUntil=thornRootedUntil=0;countdownActive=false;
        window._crouchEye=PLAYER_EYE_HEIGHT;
        for(const key of Object.keys(keys))keys[key]=false;
        receive({action:'trigger',kind:'bounce_pad',targetId:myId,dx:0,dz:-1});
        let peak=0;
        for(let i=0;i<270;i++){
          updateMovement(1/120,true);peak=Math.max(peak,camera.position.y-PLAYER_EYE_HEIGHT);
          if(i>10&&!slamState)break;
        }
        check(Math.abs(peak-18)<.1,'Actual launch height: '+peak);
        // Render both low-poly physical items and check actual canvas pixels.
        const render=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});render.setSize(600,360);
        const stage=new THREE.Scene();stage.background=new THREE.Color(0x293038);
        stage.add(new THREE.HemisphereLight(0xffffff,0x929aa2,2.5));
        const sun=new THREE.DirectionalLight(0xffffff,2);sun.position.set(2,4,3);stage.add(sun);
        const pad=buildFieldUtilityWorld('bounce_pad'),bear=buildFieldUtilityWorld('bear_trap');
        pad.position.x=-1;bear.position.x=1;stage.add(pad,bear);
        const view=new THREE.PerspectiveCamera(40,600/360,.01,50);view.position.set(0,3.7,4.5);view.lookAt(0,0,0);
        render.render(stage,view);const gl=render.getContext(),px=new Uint8Array(600*360*4);gl.readPixels(0,0,600,360,gl.RGBA,gl.UNSIGNED_BYTE,px);
        let colored=0;for(let i=0;i<px.length;i+=4)if(Math.max(px[i],px[i+1],px[i+2])-Math.min(px[i],px[i+1],px[i+2])>45)colored++;
        check(colored>100,'Blank models');
        const png=render.domElement.toDataURL().split(',')[1];render.dispose();
        return {png,colored};
      });
      assert.deepEqual(errors,[]);
      fs.writeFileSync('/tmp/pvp-field-utilities-'+width+'.png',Buffer.from(data.png,'base64'));
      console.log(width+': models, prices, ownership, pad impulse, root, shot collision and canvas pixels OK');
      await page.close();
    }
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
