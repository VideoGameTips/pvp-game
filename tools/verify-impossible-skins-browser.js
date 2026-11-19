const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    for (const width of [1280, 390]) {
      const page = await browser.newPage({viewport:{width,height:820}});
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (/shader error|\[model skin\]/i.test(m.text())) errors.push(m.text()); });
      await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/');
      await page.waitForFunction(() => typeof SKIN_FX !== 'undefined' && !!window.PVP_IMPOSSIBLE_SKINS);
      const result = await page.evaluate(() => {
        const check = (condition, msg) => { if (!condition) throw Error(msg); };
        requestAnimationFrame = () => 0;
        currentUser = {username:'Impossible Test', purchased:[], skinInventory:[]};
        const IDs=['srx_dead_frequency','hand_cannon_hourglass','ak20_paper_kingdom','rpg_false_sun'];
        const panel=document.createElement('canvas'), pen=panel.getContext('2d'); panel.width=768;panel.height=728;
        pen.fillStyle='#1b2631';pen.fillRect(0,0,panel.width,panel.height);
        const render=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
        render.setSize(384,156);
        const stage=new THREE.Scene();stage.background=new THREE.Color(0x23313d);
        stage.add(new THREE.HemisphereLight(0xffffff,0x8598ac,2));
        const sun=new THREE.DirectionalLight(0xffefcc,2.5); sun.position.set(2,4,1); stage.add(sun);
        const view=new THREE.PerspectiveCamera(35,384/156,.01,10);
        function capture(model, x, y) {
          stage.add(model);model.visible=true;model.position.set(0,0,0);
          view.position.set(.75,.31,.28);view.lookAt(0,0,-.08);
          render.render(stage,view); pen.drawImage(render.domElement,x,y);
          const pixels=pen.getImageData(x+31,y+22,322,116).data, colors = new Set();
          let n=0;
          for(let k=0;k<pixels.length;k+=4) if(pixels[k]!==35||pixels[k+1]!==49||pixels[k+2]!==61){n++;colors.add(pixels[k]*65536+pixels[k+1]*256+pixels[k+2]);}
          check(n>500 && colors.size>50,'Blank or unlit render for '+model.name);
          stage.remove(model);
        }
        IDs.forEach((id,i)=>{
          const sk=MODEL_SKINS.find(s=>s.id===id), idx=WEAPONS.findIndex(w=>w.id===sk.weapon), w=WEAPONS[idx];
          const stock=weaponModels[idx];
          check(GEN3_SKIN_DEFS.includes(sk) && isCaseSkinLocked(sk),id+': not gated');
          setModelSkin(w.id,id);check(weaponModels[idx]===stock,id+': equipped while unowned');
          currentUser.skinInventory.push(id);setModelSkin(w.id,id);
          const m=weaponModels[idx];m.name=id;
          check(m!==stock && !_modelSkinLook[w.id] && effectiveGunStats(w)===w && !SKIN_FX[id].reload,id+': alters stock gameplay');
          m.traverse(n=>check(n.position.toArray().every(Number.isFinite),id+': invalid transform on '+n.name));
          const now=()=>performance.now()/1000;
          const part=s=>m.getObjectByName(s);
          const step=p=>{m._inspectMode=true;m._reloadDur=3300;m._reloadStart=Date.now()-3300*p;m._tick(.08,now(),false);};
          m._calm();const x=(i%2)*384,y=Math.floor(i/2)*364;
          capture(m,x,y+23);
          const snapshot=part(['frequency-receiver','hourglass-grain','kingdom-turret','eclipse-moon'][i]);
          const base=snapshot.position.clone(), initialPaint=snapshot.material;
          m._shotPose();m._tick(.08,now(),false);
          if(i===0)check(snapshot.material!==initialPaint,'Frequency did not become monochrome');
          if(i===1)check(snapshot.position.equals(base),'Hourglass sand did not freeze');
          if(i===2){m._tick(.04,now()+.12,false);check(part('kingdom-paper-fragment').visible,'Paper did not fragment');}
          if(i===3)check(part('eclipse-sun').visible && !snapshot.position.equals(base),'Sun did not emerge');
          m._tick(.32,now()+.4,false);
          if(i===0)check(snapshot.material===initialPaint,'Frequency paint did not restore');
          if(i===1){m._reloadStart=Date.now()-750;m._reloadDur=1500;m._tick(.08,now()+.4,false);check(Math.abs(part('hourglass-chamber').rotation.x)>1.3,'Hourglass did not flip');}
          if(i===3){
            check(!m._mech?.loaded,'A stock rocket protrudes from the eclipse');
            m._reloadDur=1500;m._reloadStart=Date.now()-400;m._tick(.08,now()+.4,false);
            const start=snapshot.position.x;
            m._reloadStart=Date.now()-1450;m._tick(.08,now()+.4,false);
            check(start<-.02 && Math.abs(snapshot.position.x)<.002,'The moon did not return in front of the sun on reload');
          }
          step(.5);
          if(i===0)check(part('frequency-scramble').visible,'Static inspect did not scramble');
          else check(snapshot.position.distanceTo(base)>.004,'Inspect did not transform '+id);
          capture(m,x,y+184);
          m._inspectMode=false;m._reloadStart=0;m._calm();
          if(i===0)check(!part('frequency-scramble').visible,'Cancel did not restore Frequency');
          if(i===2)check(!part('kingdom-flag').visible,'Cancel did not fold Paper Kingdom');
          if(i===3)check(!part('eclipse-sun').visible,'Cancel did not restore the eclipse');
          pen.fillStyle='#f4f6f8';pen.font='bold 14px sans-serif';pen.fillText(sk.name,x+12,y+16);
          pen.font='11px sans-serif';pen.fillText('INSPECT',x+12,y+196);
        });
        render.dispose();
        panel.style.cssText='position:fixed;inset:0;margin:auto;width:min(100vw,768px);height:auto;z-index:99999';document.body.append(panel);
        return IDs.length;
      });
      assert.equal(result,4);assert.deepEqual(errors,[]);
      if(process.env.WRAP_PREVIEW_DIR)await page.screenshot({path:process.env.WRAP_PREVIEW_DIR+'/impossible-skins-'+width+'.png'});
      console.log(width+'px: four distinct model renders, inspect and fire/reload reactions, stock stats and gate intact');
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e=>{ console.error(e); process.exitCode=1; });
