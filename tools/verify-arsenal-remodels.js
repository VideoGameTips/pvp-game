const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    for (const width of [1280, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 820 }, hasTouch: width < 500 });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/');
      await page.waitForFunction(() => typeof openItemSkins === 'function' && MODEL_SKINS.some(s => s.id === 'revolver_deadeye'));
      const result = await page.evaluate(() => {
        const check = (value, msg) => { if (!value) throw Error(msg); };
        const ids = ['flamethrower_dragons_maw','revolver_deadeye','crossbow_permafrost','m1_garand_thunderclap',
          'amr_event_horizon','minigun_iron_behemoth','chain_hammer_bonebreaker','katana_glass_fang'];
        currentUser = { username:'Remodel Test', purchased:[], skinInventory:[] };
        const canvas=document.createElement('canvas');canvas.width=640;canvas.height=ids.length*120;
        const ctx=canvas.getContext('2d');
        ctx.fillStyle='#263039';ctx.fillRect(0,0,canvas.width,canvas.height);
        const layouts=[];
        const bounds = root => {
          const out = new THREE.Box3();
          for(const {obj,box} of _localPartBoxes(root)) {
            let skip=false;
            for(let o=obj;o&&o!==root;o=o.parent) if(!o.visible||o.userData.vmHand||o.userData.eqFx||o===root._flash) skip=true;
            if(!skip) out.union(box);
          }
          return out;
        };
        for (const [i,id] of ids.entries()) {
          const s=GEN3_SKIN_DEFS.find(s=>s.id===id);
          check(s&&isCaseSkinLocked(s),id+': ownership');
          currentUser.skinInventory.push(id);
          const gun=!!s.weapon,wid=s.weapon||s.melee;
          const items=gun?WEAPONS:MELEE_ITEMS,models=gun?weaponModels:meleeModels;
          const idx=items.findIndex(w=>w.id===wid),w=items[idx],stock=models[idx],stats=JSON.stringify(w);
          openItemSkins(gun?'gun':'melee',wid);
          const card=document.querySelector('[data-preview-skin="'+id+'"]');
          check(card,id+': missing picker entry');
          card.click();
          const m=models[idx];
          check(m!==stock&&JSON.stringify(w)===stats,id+': equip or stats');
          const a=bounds(stock),b=bounds(m),size=v=>v.getSize(new THREE.Vector3()).toArray();
          const [ax,ay,az]=size(a),[bx,by,bz]=size(b);
          check(bx<=ax*1.15+.012&&by<=ay*1.15+.012&&bz<=az*1.10+.012,id+': oversize '+[ax,ay,az,bx,by,bz]);
          check(Math.abs(ax-bx)+Math.abs(ay-by)+Math.abs(az-bz)>.006,id+': same dimensions');
          layouts.push([id,size(a).map(v=>+v.toFixed(3)),size(b).map(v=>+v.toFixed(3))]);
          if(gun){
            check(m._flash.position.equals(stock._flash.position)&&m._hipPosition.equals(stock._hipPosition)&&
              weaponSightPose(m).position.equals(weaponSightPose(stock).position)&&m._kickZ===stock._kickZ&&
              effectiveGunStats(w)===w&&skinLookFor(s)===null,id+': handling mismatch');
          } else {
            check(effectiveMeleeItem(w)===w,id+': melee reach mismatch');
          }
          if(id==='revolver_deadeye') {
            const yoke=m.getObjectByName('deadeye-yoke'), cage=m._parts.main, hammer=m._parts.hammer;
            m._onFire();m._tick();
            check(hammer.rotation.x<-.4&&cage._chambers===6,'Deadeye hammer and cylinder');
            m._reloadDur=w.reloadTime;m._reloadStart=Date.now()-.6*w.reloadTime;m._tick();
            check(yoke.rotation.z>1&&cage.rotation.z>1,'Deadeye reload yoke and cylinder');
            m._reloadStart=0;m._calm();
            check(yoke.rotation.z===0&&hammer.rotation.x===0&&SKIN_FX[id].inspect.some(k=>k.ry<0)&&
              SKIN_FX[id].inspect.some(k=>k.ry>0),'Deadeye reset and inspect');
          }
          if(id==='chain_hammer_bonebreaker'){
            selectedMeleeIdx=idx;startChainMaulSwing(w);
            check(chainMaulSwing.cable._ball.children.length===7&&chainMaulSwing.cable._links.length===Math.ceil(w.range/.105),'Bonebreaker combat cable');
            finishChainMaulSwing();
          }
          const src=catalogSkinImage(id);
          check(src?.startsWith('data:image/png'),id+': missing model thumbnail');
          layouts[i].push(src);
          if(gun)setModelSkin(wid,null);else setMeleeModelSkin(wid,null);
        }
        const ak=MODEL_SKINS.find(s=>s.id==='ak20_phoenix_reign');
        check(ak.finishOnly&&isCaseSkinLocked(ak)&&!GEN3_SKIN_DEFS.includes(ak)&&!SKIN_FX[ak.id],'Phoenix Reign wrap or exclusivity');
        openItemSkins('gun','ak20');
        check(document.querySelector('[data-preview-skin="'+ak.id+'"]')?.parentElement?.parentElement.textContent.trimStart().startsWith('WEAPON-SPECIFIC WRAPS'),
          'Phoenix Reign is not under wraps');
        return Promise.all(layouts.map(async ([id,a,b,src],i)=>{
          const img=new Image();img.src=src;await img.decode();
          const probe=document.createElement('canvas');probe.width=img.width;probe.height=img.height;
          const pc=probe.getContext('2d');pc.drawImage(img,0,0);
          const data=pc.getImageData(0,0,img.width,img.height).data;
          let count=0;for(let k=3;k<data.length;k+=4) if(data[k]>127)count++;
          check(count>500&&count<data.length/8,id+': blank or cropped preview');
          ctx.drawImage(img,20,i*120,360,120);
          ctx.fillStyle='#fff';ctx.font='15px system-ui';ctx.fillText(id,385,i*120+61);
          return [id,a,b,count];
        })).then(rows=>({rows,png:canvas.toDataURL().split(',')[1]}));
      });
      if (process.env.FINISH_PREVIEW_DIR) fs.writeFileSync(process.env.FINISH_PREVIEW_DIR+'/arsenal-remodels-'+width+'.png', Buffer.from(result.png,'base64'));
      assert.deepEqual(errors, []);
      console.log(width, JSON.stringify(result.rows));
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
