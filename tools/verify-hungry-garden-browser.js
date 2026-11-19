const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  try {
    for (const width of [1280,390]) {
      const page=await browser.newPage({viewport:{width,height:810}}), errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/');
      await page.waitForFunction(()=>typeof SKIN_FX!=='undefined'&&window.PVP_HUNGRY_GARDEN);
      await page.evaluate(()=>{
        const check=(v,msg)=>{if(!v)throw Error(msg);};
        const frames=[];requestAnimationFrame=fn=>{frames.push(fn);return 1;};
        currentUser={username:'Garden Test',purchased:[],skinInventory:[]};
        const id='minigun_hungry_garden', idx=WEAPONS.findIndex(w=>w.id==='minigun'), w=WEAPONS[idx];
        const stock=weaponModels[idx], def=MODEL_SKINS.find(s=>s.id===id);
        check(def.rarity==='mythic'&&isCaseSkinLocked(def)&&GEN3_SKIN_DEFS.includes(def),'Missing Mythic gate');
        setModelSkin(w.id,id);check(weaponModels[idx]===stock,'Locked skin equipped');
        currentUser.skinInventory.push(id);setModelSkin(w.id,id);finishEquip();
        const m=weaponModels[idx], pool=weaponAmmo[idx], get=n=>m.getObjectByName(n);
        check(m!==stock&&effectiveGunStats(w)===w&&m._stockShotOrigin.equals(stock._flash.position)&&skinPitchFor(w.id)===1&&!SKIN_FX[id].reload,'Gameplay or audio changed');
        const saved={match,inLobby,idx:currentWeaponIdx,pos:camera.position.clone(),rot:camera.quaternion.clone(),colliders:wallColliders.slice()};
        const enemy=new THREE.Group(), lock=new THREE.Vector3();
        const liveMeshes=Object.values(remoteMeshes).filter(mesh=>mesh.visible);
        for(const mesh of liveMeshes)mesh.visible=false;
        match={active:true,type:'ffa'};inLobby=false;currentWeaponIdx=idx;
        camera.position.set(0,1.05,0);camera.quaternion.identity();camera.updateMatrixWorld(true);
        enemy.position.set(1,0,-7);remoteMeshes.garden_focus_test=enemy;wallColliders.length=0;
        hungryGardenFocus(m,lock);check(lock.x>.01,'Idle stalks did not find a visible enemy');
        lock.set(0,0,0);wallColliders.push(new THREE.Box3(new THREE.Vector3(-2,0,-4),new THREE.Vector3(2,3,-3)));
        hungryGardenFocus(m,lock);check(lock.lengthSq()===0,'Idle stalks tracked through cover');
        delete remoteMeshes.garden_focus_test;wallColliders.splice(0,wallColliders.length,...saved.colliders);
        for(const mesh of liveMeshes)mesh.visible=true;
        match=saved.match;inLobby=saved.inLobby;currentWeaponIdx=saved.idx;camera.position.copy(saved.pos);camera.quaternion.copy(saved.rot);
        pool.ammo=180;pool.reserve=30;m._calm();
        const petals=get('garden-petal-0'), initial=petals.rotation.x;
        let stalks=0;m.traverse(o=>{if(/^garden-stalk-/.test(o.name))stalks++;});
        check(stalks===6,'Not six stalks');
        const deck=document.createElement('canvas');deck.width=720;deck.height=412;
        const pen=deck.getContext('2d');pen.fillStyle='#19241d';pen.fillRect(0,0,720,412);
        const render=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});render.setSize(360,175);
        const stage=new THREE.Scene();stage.background=new THREE.Color(0x283038);
        stage.add(new THREE.HemisphereLight(0xfff3d9,0x7e97b0,2.4));
        const key=new THREE.DirectionalLight(0xffdcb4,2.6);key.position.set(2,5,-3);stage.add(key);
        const eye=new THREE.PerspectiveCamera(34,360/175,.01,20);
        function capture(object,x,y,world=false){
          const parent=object.parent;stage.add(object);object.visible=true;object.position.set(0,0,0);
          eye.position.set(...(world?[3,1.9,3]:[.81,.41,-.29]));eye.lookAt(0,world?.9:0,world?0:-.10);
          render.render(stage,eye);pen.drawImage(render.domElement,x,y);
          const q=pen.getImageData(x+18,y+12,324,150).data, colors=new Set();
          for(let j=0;j<q.length;j+=4)colors.add(q[j]*65536+q[j+1]*256+q[j+2]);
          check(colors.size>60,'Blank render');stage.remove(object);parent?.add(object);
        }
        capture(m,0,24);
        pool.ammo=168;m._onFire();m._tick(.075,performance.now()/1000,false);
        check(petals.rotation.x>initial+.2,'Firing did not open bud');
        check(get('garden-seed-pod-14').children.slice(1).some(o=>o.visible),'Firing did not burst a pod');
        capture(m,360,24);
        const projectile=makeBulletMesh(0,.04,w.id,true);
        check(projectile.children.length===4&&projectile._alignToDir&&skinLookById(id)?.shot?.shape==='garden_thorn','Missing thorn visual');
        pool.ammo=0;m._reloadStart=Date.now()-2500;m._reloadDur=4200;m._tick(.12,performance.now()/1000+.3,false);
        const root=get('garden-reload-root');
        check(root.visible&&root.geometry.drawRange.count>0,'No roots during reload');
        check(get('garden-seed-pod-0').children[0].visible&&!get('garden-seed-pod-14').children[0].visible,'Partial reload does not reflect reserve');
        capture(m,0,230);
        remoteMeshes.garden_test_target=new THREE.Group();frames.length=0;
        triggerFinisher('garden_test_target','minigun','remote-shooter',id);
        const fx=scene.getObjectByName('garden-elimination-vines');
        check(fx&&frames.length===1,'Finisher did not attach');
        check(playHungryGardenFinisher('garden_test_target')&&frames.length===1,'Duplicate finisher');
        frames.shift()(performance.now()+360);
        capture(fx,360,230,true);
        frames.shift()(performance.now()+1300);
        check(!fx.parent,'Vines did not clean up');
        for(const [x,y,label] of [[11,17,'Dormant bud'],[371,17,'Firing'],[11,223,'Reload roots'],[371,223,'Elimination vines']]){
          pen.fillStyle='#eee';pen.font='bold 13px sans-serif';pen.fillText(label,x,y);
        }
        render.dispose();deck.style.cssText='position:fixed;inset:0;margin:auto;width:min(100vw,720px);height:auto;z-index:99999';document.body.append(deck);
      });
      assert.deepEqual(errors,[]);
      if(process.env.WRAP_PREVIEW_DIR)await page.screenshot({path:process.env.WRAP_PREVIEW_DIR+'/hungry-garden-'+width+'.png'});
      await page.close();console.log(width+'px: six firing stalks, ammo burst, partial reload, thorns and vines with stock stats and audio');
    }
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
