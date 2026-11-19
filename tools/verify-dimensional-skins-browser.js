const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async()=>{
  const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{
    for(const width of [1280,390]){
      const page=await browser.newPage({viewport:{width,height:820},hasTouch:width<500});
      const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      page.on('console',m=>{if(/shader error|\[model skin\]/i.test(m.text()))errors.push(m.text());});
      await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/');
      await page.waitForFunction(()=>typeof SKIN_FX!=='undefined' && !!SKIN_FX.crossbow_axiom);
      const png=await page.evaluate(()=>{
        const check=(ok,msg)=>{if(!ok)throw Error(msg);};
        requestAnimationFrame=()=>0;
        currentUser={username:'Dimensional preview',purchased:[],skinInventory:[]};
        const display=document.createElement('canvas');display.width=500;display.height=756;
        const pen=display.getContext('2d');
        pen.fillStyle='#161d28';pen.fillRect(0,0,500,756);
        const r=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
        r.setSize(250,224);
        const stage=new THREE.Scene();stage.background=new THREE.Color(0x222d39);
        stage.add(new THREE.HemisphereLight(0xfffafa,0x95abc9,2.65));
        const light=new THREE.DirectionalLight(0xffffff,2.35);light.position.set(2,2,1);stage.add(light);
        const view=new THREE.PerspectiveCamera(37,250/224,.01,10);
        const now=()=>performance.now()/1000;
        const ids=['revolver_sixth_dimension','sg8_twin_paradox','crossbow_axiom'];
        for(const [i,id] of ids.entries()){
          const s=GEN3_SKIN_DEFS.find(k=>k.id===id);
          check(s?.rarity==='legendary' && isCaseSkinLocked(s),id+': award or rarity');
          const idx=WEAPONS.findIndex(w=>w.id===s.weapon), w=WEAPONS[idx], stock=weaponModels[idx];
          setModelSkin(w.id,id);
          check(weaponModels[idx]===stock,id+': ownership bypass');
          currentUser.skinInventory.push(id);setModelSkin(w.id,id);
          const m=weaponModels[idx];
          check(m!==stock && effectiveGunStats(w)===w && m._kickZ===stock._kickZ &&
            m._flash.position.equals(stock._flash.position) && m._hipPosition.equals(stock._hipPosition) &&
            weaponSightPose(m).position.equals(weaponSightPose(stock).position),id+': changed handling');
          const part=name=>m.getObjectByName(name);
          const step=(inspect,p,t=now())=>{
            m._inspectMode=inspect;m._reloadDur=4000;m._reloadStart=p<0?0:Date.now()-p*4000;m._tick(.016,t,false);
          };
          const capture=(x,y)=>{
            const prize=m.clone();prize.position.set(0,0,0);prize.scale.setScalar(1);prize.visible=true;
            const remove=[];prize.traverse(o=>{if(o.userData.vmHand||o.name==='view-arms')remove.push(o);});
            remove.forEach(o=>o.removeFromParent());stage.add(prize);
            const d=[.62,1.15,.92][i];
            view.position.set(d*.9,d*.33,d*.42);view.lookAt(0,-.005,i===1?-.02:-.045);
            r.render(stage,view);pen.drawImage(r.domElement,x,y);
            stage.remove(prize);
            const pixels=pen.getImageData(x,y,250,224).data, colors=new Set();
            for(let j=0;j<pixels.length;j+=4) colors.add(pixels[j]*65536+pixels[j+1]*256+pixels[j+2]);
            check(colors.size>100,id+': blank render');
          };
          const row=i*252;
          step(false,-1);capture(0,row+22);
          if(i===0){
            const chamber=part('sixth-chamber-0'), original=chamber.position.length();
            const layers=m.children.filter(o=>o.name.startsWith('sixth-layer-'));
            check(layers.length===6,'Missing any of six inspect layers');
            step(false,.43);
            check(chamber.position.length()>original+.028 && part('sixth-round-0').visible &&
              part('sixth-round-0').position.z>part('sixth-round-0').scale.z*.001,'Chambers did not scatter and load');
            step(false,.73);
            check(Array.from({length:6},(_,j)=>part('sixth-round-'+j)).every(o=>o.visible),'Not all chambers receive a round');
            step(true,.51);
            check(layers.every(o=>o.rotation.toArray().slice(0,3).some(a=>Math.abs(a)>.1)),'Not all six layers rotate');
          }else if(i===1){
            const a=part('paradox-housing--1'), b=part('paradox-housing-1');
            m._onFire();
            check(a.position.distanceTo(b.position)<.001,'Crescents did not slam together');
            step(false,-1,now()+.165);
            check(a.position.distanceTo(b.position)>.055 && m._parts.main.position.z>.01,'Crescents and pump did not recoil');
            let last=null, travel=0;
            for(const p of [.14,.27,.40,.53,.66,.79,.92]){
              step(true,p);
              check(a.position.distanceTo(b.position)>.042,'Crescents touched in inspect');
              if(last)travel+=a.position.distanceTo(last);last=a.position.clone();
            }
            check(travel>.27,'Inspect orbit incomplete');step(true,.46);
          }else{
            const rings=Array.from({length:3},(_,j)=>part('axiom-ring-'+j));
            m._onFire();
            check(rings.every(o=>!o.rotation.x&&!o.rotation.y),'Release did not align all rings');
            step(false,-1);
            check(rings.every(o=>!o.rotation.x&&!o.rotation.y),'No rendered aligned frame');
            step(true,.5,now()+.4);
            const normals=rings.map(o=>new THREE.Vector3(0,0,1).applyQuaternion(o.quaternion));
            check(normals.every((n,j)=>normals.every((v,k)=>j===k||Math.abs(n.dot(v))<.02)) &&
              rings.every(o=>o.position.distanceTo(rings[0].position)<.001),'Ring sphere was not formed');
          }
          capture(250,row+22);
          pen.fillStyle='#ffffff';pen.font='bold 14px sans-serif';
          pen.fillText(s.name,12,row+16);pen.fillText('Inspect',262,row+16);
          m._inspectMode=false;m._reloadStart=0;m._calm();
        }
        r.dispose();return display.toDataURL().split(',')[1];
      });
      assert.deepEqual(errors,[]);
      if(process.env.DIMENSIONAL_PREVIEW_DIR)fs.writeFileSync(process.env.DIMENSIONAL_PREVIEW_DIR+'/dimensional-'+width+'.png',Buffer.from(png,'base64'));
      console.log(width+': three skins rendered, ownership and handling held, reload/fire/inspect checked');
      await page.close();
    }
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
