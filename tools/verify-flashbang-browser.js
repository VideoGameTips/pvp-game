const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
  const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{
    for(const width of [1280,390]){
      const page=await browser.newPage({viewport:{width,height:820},hasTouch:width<500});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.goto(process.env.PVP_TEST_URL||'http://localhost:3001/');
      await page.waitForFunction(()=>{try{return SUPPORT_ITEMS.find(s=>s.id==='flashbang_basic')?.blindDur===2500;}catch{return false;}});
      const rendered=await page.evaluate(()=>{
        const check=(v,m)=>{if(!v)throw Error(m);};requestAnimationFrame=()=>0;socket.disconnect();
        const item=SUPPORT_ITEMS.find(s=>s.id==='flashbang_basic');
        check(!item.archived&&item.damage===0&&item.uses===2&&item.fuseMs===1500&&WEAPON_COSTS[item.id]===900,'Stats / purchase');
        check(SUPPORT_ITEMS.length===supportModels.length&&supportModels[SUPPORT_ITEMS.indexOf(item)],'Model alignment');
        currentUser={username:'Flash test',purchased:[item.id],unlocks:[],skinInventory:[]};
        document.getElementById('overlay').style.display='none';document.getElementById('mode-screen').style.display='none';
        requestPointerLockSafe=()=>{};showLoadoutScreen('swap');
        check(document.querySelector('#loadout-support-list [data-item-id="flashbang_basic"]'),'Missing utility button');
        wallColliders.length=0;
        const origin=new THREE.Vector3(0,1.3,-1),eye=new THREE.Vector3(0,1.65,0),fwd=new THREE.Vector3(0,0,-1);
        const near=flashbangExposure(origin,eye,fwd),away=flashbangExposure(origin,eye,fwd.clone().negate());
        check(near>.8&&away<near*.3,'Facing attenuation');
        check(flashbangExposure(origin,new THREE.Vector3(30,1,0),fwd)===0,'Range');
        wallColliders.push(new THREE.Box3(new THREE.Vector3(-2,0,-.7),new THREE.Vector3(2,4,-.5)));
        check(flashbangExposure(origin,eye,fwd)===0,'Flash goes through cover');wallColliders.length=0;
        gameStarted=true;inLobby=false;isDead=false;myId='flash_test';players[myId]={id:myId,hp:300};
        camera.position.copy(eye);camera.rotation.set(0,0,0);
        gameBots.push({id:'flash_bot',x:0,y:0,z:1,rotY:0,hp:300,team:'enemy'});
        const oldEmit=socket.emit,packets=[];socket.emit=(...args)=>packets.push(args);
        try{
          const count=activeGrenades.length;throwFlashbang(item);
          check(activeGrenades.length===count+1,'No grenade projectile');
          const g=activeGrenades.pop();let meshCount=0;g.mesh.traverse(o=>{if(o.isMesh)meshCount++;});
          check(!g.explodeOnImpact&&g.explodeAt-Date.now()>0&&meshCount>3,'Fuse / physical model '+JSON.stringify({impact:g.explodeOnImpact,left:g.explodeAt-Date.now(),meshCount}));
          check(packets.some(([event,data])=>event==='shoot'&&data.weapon===item.id),'No multiplayer throw');
          g.mesh.position.copy(origin);explodeSupport(g);scene.remove(g.mesh);
          check(flashBlindUntil>Date.now()+1500,'Player not blinded');
          check(flashBlindElement.style.pointerEvents==='none'&&Number(flashBlindElement.style.opacity)>.8,'Missing white overlay or blocked controls');
          const bot=gameBots.find(b=>b.id==='flash_bot');
          check(bot._flashBlindUntil>Date.now()&&bot.hp===300&&!bot._stunUntil,'Bots not blinded / took damage / immobilized');
          check(players[myId].hp===300,'Flashbang caused health damage');
          clearFlashBlind();check(flashBlindElement.style.display==='none'&&flashBlindUntil===0,'Blindness cleanup');
        }finally{socket.emit=oldEmit;}
        const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(400,320);
        const stage=new THREE.Scene();stage.background=new THREE.Color(0x22292d);
        stage.add(new THREE.HemisphereLight(0xffffff,0x999999,2.5));
        const model=handcraftedSupport(item.id);model.position.set(0,0,0);stage.add(model);
        const box=new THREE.Box3().setFromObject(model),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
        model.position.sub(center);
        const view=new THREE.PerspectiveCamera(35,400/320,.001,10),scale=Math.max(size.x,size.y,size.z);
        view.position.set(scale*2.2,scale*1.4,scale*2.2);view.lookAt(0,0,0);renderer.render(stage,view);
        const gl=renderer.getContext(),px=new Uint8Array(400*320*4);gl.readPixels(0,0,400,320,gl.RGBA,gl.UNSIGNED_BYTE,px);
        let lit=0;for(let i=0;i<px.length;i+=4)if(px[i]>100&&px[i+1]>100)lit++;
        check(lit>100,'Blank flashbang model');
        const png=renderer.domElement.toDataURL().split(',')[1];renderer.dispose();return {png};
      });
      fs.writeFileSync('/tmp/pvp-flashbang-'+width+'.png',Buffer.from(rendered.png,'base64'));
      assert.deepEqual(errors,[]);console.log(width+': picker, prices, physical throw, fuse, multiplayer packet, range, facing, walls, player/bot blindness, zero damage and cleanup passed');
      await page.close();
    }
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
