const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    for (const width of [1280, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 950 }, hasTouch: width < 500 });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (/shader error|\[model skin\]|\[melee skin\]/i.test(m.text())) errors.push(m.text()); });
      await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/');
      await page.waitForFunction(() => typeof SKIN_FX !== 'undefined' && !!window.PVP_IMPOSSIBLE_ROUND4);
      const count = await page.evaluate(() => {
        const check = (condition, msg) => { if (!condition) throw Error(msg); };
        requestAnimationFrame = () => 0;
        currentUser = { username: 'Round 4 Test', purchased: [], skinInventory: [] };
        const ids=['p90_nullspace','rpg_leviathan','revolver_crown_of_thorns','lever_afterimage','spear_hollow_king','srx_glass_cathedral'];
        const world=new THREE.Scene(); world.background=new THREE.Color(0x273544);
        world.add(new THREE.HemisphereLight(0xe9f5ff,0x7c7b8e,2.25));
        const light=new THREE.DirectionalLight(0xffedd1,2.15);light.position.set(2,3,-2);world.add(light);
        const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
        renderer.setSize(336,130);
        const cam=new THREE.OrthographicCamera(-.51,.51,.197,-.197,.01,10);
        const sheet=document.createElement('canvas');sheet.width=1008;sheet.height=6*152+23;
        const pen=sheet.getContext('2d');pen.fillStyle='#121922';pen.fillRect(0,0,sheet.width,sheet.height);
        function render(m,row,col,spear){
          world.add(m);m.position.set(0,0,0);m.rotation.set(0,0,0);
          cam.position.set(2,.26,.50);cam.lookAt(0,col===2?(row===5?.088:spear?.062:.005):-.006,-.040);
          cam.zoom=col===2 && (row===3||row===5) ? .88 : 1;
          cam.updateProjectionMatrix();
          renderer.render(world,cam);
          const x=col*336,y=24+row*152;pen.drawImage(renderer.domElement,x,y);
          const pixels=pen.getImageData(x,y,336,130).data;
          const color=new Set();for(let j=0;j<pixels.length;j+=4)color.add(pixels[j]*65536+pixels[j+1]*256+pixels[j+2]);
          check(color.size>45,m.name+': blank or clipped phase '+col);world.remove(m);
        }
        const now=()=>performance.now()/1000;
        let savedEmit=socket.emit;
        const shots=[];
        socket.emit=(ev,d)=>{if(ev==='shoot')shots.push(d);};
        for(const [i,id] of ids.entries()){
          const sk=GEN3_SKIN_DEFS.find(s=>s.id===id), melee=!!sk?.melee;
          check(sk?.rarity==='mythic' && isCaseSkinLocked(sk),id+': missing gate');
          const idx=melee?MELEE_ITEMS.findIndex(w=>w.id===sk.melee):WEAPONS.findIndex(w=>w.id===sk.weapon);
          const set=melee?setMeleeModelSkin:setModelSkin, models=melee?meleeModels:weaponModels;
          const key=sk.melee||sk.weapon, stock=models[idx];
          set(key,id); check(models[idx]===stock,id+': equipped while locked');
          currentUser.skinInventory.push(id);set(key,id);
          const held=models[idx];check(held!==stock,id+': failed to equip');
          const byName=(g,name)=>{const p=g.getObjectByName(name);check(p,id+': missing '+name);return p;};
          if(!melee){
            const w=WEAPONS[idx];
            check(effectiveGunStats(w)===w && !_modelSkinLook[w.id],id+': changed stats or projectile FX');
            check(held._stockShotOrigin.equals(stock._flash.position) && held._hipPosition.equals(stock._hipPosition),id+': changed launch origin');
            currentWeaponIdx=idx;currentWeapon=w;activeSlot=w.slot;
            gameStarted=true;isDead=false;inLobby=false;reloading=false;countdownActive=false;
            equipReadyAt=0;finishEquip();lastShot=0;
            weaponAmmo[idx]={ammo:w.mag,reserve:w.reserve};
            const before=shots.length;
            tryShoot();
            check(weaponAmmo[idx].ammo===w.mag-1 && shots.length===before+1 && shots.at(-1).weapon===w.id,id+': did not fire the stock projectile once');
            startReload();
            check(_reloadSt?.dur===w.reloadTime,id+': changed reload duration');
            if(id==='revolver_crown_of_thorns'){
              held._reloadStart=Date.now()-w.reloadTime*.5;held._tick(1/60,now(),false);
              check(byName(held,'thorn-3').position.length()>.064,'Thorns failed to bloom during the real reload');
            }
            cancelReload();
            startInspect();check(held._inspectMode,id+': real inspect did not start');cancelInspect();
          }else{
            activeSlot='melee';selectedMeleeIdx=idx;held.visible=true;equipReadyAt=0;finishEquip();
            check(!(_modelSkinLook[key]),'Spear changed melee effects');
            check(startItemInspect(),'Spear inspect did not start');
            itemInspect.t0=performance.now()-1700;updateItemInspect();
            check(byName(held,'hollow-king-crown').position.y>.14,'Crown did not lift off the shaft');
            cancelItemInspect();
            check(byName(held,'hollow-king-crown').position.y===0,'Crown did not return after cancel');
          }
          const m=sk.build();m.name=id;
          m.traverse(p=>check(p.position.toArray().every(Number.isFinite),id+': invalid position '+p.name));
          render(m,i,0,melee);
          if(melee){
            m._onSwing();check(byName(m,'hollow-king-point-1').position.length()<.004,'Spear attack did not converge');
          }else{
            m._onFire();m._tick(1/60,now()+.045,false);
            if(i===0)check(Math.abs(byName(m,'nullspace-grip').position.y)<.006,'P90 failed to align');
            if(i===1)check(byName(m,'leviathan-vertebra-2').rotation.x>.12,'Spine did not contract');
            if(i===2)check(byName(m,'thorn-0').children.some(o=>o.material.color.r>.9),'Thorn did not flash crimson');
            if(i===3)check(!byName(m,'afterimage-phase-0').visible && !byName(m,'afterimage-phase-1').visible,'Barrel echoes did not converge');
            if(i===5)check(Math.abs(byName(m,'cathedral-pane-2').rotation.y)>.35,'Glass did not scatter');
          }
          render(m,i,1,melee);m._calm();
          if(melee){m._itemInspectFrame(.5);}
          else {m._inspectMode=true;m._reloadDur=3300;m._reloadStart=Date.now()-1650;m._tick(.1,now(),false);}
          if(i===0)check(byName(m,'nullspace-twin').visible && byName(m,'nullspace-twin').position.distanceTo(byName(m,'nullspace-original').position)>.12,'Inspect did not separate both copies');
          if(i===1)check(Math.abs(byName(m,'leviathan-vertebra-8').position.x)>.08,'Spine did not curve on inspect');
          if(i===3)check(byName(m,'afterimage-action-1').visible && byName(m,'afterimage-action-1').getObjectByName('afterimage-lever').rotation.x < -1,'Open lever state missing');
          if(i===5)check(byName(m,'cathedral-figure').visible && Math.abs(byName(m,'cathedral-pane-2').position.z)<.002,'Cathedral window did not assemble');
          render(m,i,2,melee);m._calm();
          pen.fillStyle='#f8f6ec';pen.font='bold 14px sans-serif';pen.fillText(sk.name,12,24+i*152+146);
          set(key,null);check(models[idx]===stock,id+': stock was not restored');
        }
        socket.emit=savedEmit;
        pen.fillStyle='#bac8d7';pen.font='bold 13px sans-serif';
        ['IDLE','ATTACK','INSPECT'].forEach((v,i)=>pen.fillText(v,12+i*336,17));
        renderer.dispose();document.body.append(sheet);
        sheet.style.cssText='position:fixed;inset:0;margin:auto;z-index:99999;width:min(100vw,1008px);max-height:100vh;object-fit:contain;height:auto';
        return ids.length;
      });
      assert.equal(count,6);assert.deepEqual(errors,[]);
      if(process.env.WRAP_PREVIEW_DIR) await page.screenshot({path:process.env.WRAP_PREVIEW_DIR+'/impossible-round4-'+width+'.png'});
      console.log(width+'px: six Mythic skins equip, animate, and restore stock; stock shots and reload timing verified');
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
