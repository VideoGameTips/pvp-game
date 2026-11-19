const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const skins=[
  {id:'vesper',width:1,height:1.74,cuff:.62,texture:'PVP_VESPER_FACES'},
  {id:'nova',width:.9,height:1.8,cuff:.675,texture:'PVP_NOVA_FACES'},
  {id:'ember',width:.9,height:1.8,cuff:.675,texture:'PVP_EMBER_FACES'},
  {id:'raven',width:.9,height:1.8,cuff:.675,texture:'PVP_RAVEN_FACES'},
  {id:'pixel',width:.9,height:1.8,cuff:.675,texture:'PVP_PIXEL_FACES'},
  ...['cipher','frost','atlas','ace','nomad'].map(id=>({id,width:.9,height:1.8,cuff:.675})),
];

(async () => {
  const browser = await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    const selected=skins.filter(skin=>process.argv.length===2||process.argv.slice(2).includes(skin.id));
    assert.ok(selected.length,'Unknown sheet character');
    for(const skin of selected)for(const width of [1280,390]) {
      const page=await browser.newPage({viewport:{width,height:844},hasTouch:width<500});
      const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/');
      await page.waitForFunction(()=>typeof openSkinsPanel==='function'&&window.PVP_RAGDOLL);
      await page.evaluate(()=>{requestAnimationFrame=()=>0;openSkinsPanel();});
      await page.locator('.skin-card[data-skin="'+skin.id+'"]').click();
      const result=await page.evaluate(async ({skin,desktop})=>{
        const check=(v,msg)=>{if(!v)throw Error(msg);};
        const id=skin.id;
        const panel=document.getElementById('skins-panel'),P=_hairPreview;
        check(mySkin===id&&localStorage.getItem('pvp_skin')===id,'Could not equip '+id);
        check(panel.getBoundingClientRect().width<=innerWidth&&panel.querySelector('#hair-style').disabled,'Skin UI overflow or hair over the reference');
        check(resolveSkinId(id)===id&&renderedSkinForPlayer({skin:id})===id,'Remote avatar rejected');
        const order=['right','left','top','bottom','front','back'];
        const reference=skin.texture?window[skin.texture]:window.PVP_ARENA_CHARACTER_FACES[id];
        const body=P.body, shapes=[];
        body.traverseVisible(o=>{if(o.isMesh)shapes.push(o);});
        const limb=shapes.filter(m=>m.isSkinnedMesh);
        check(shapes.length===6&&limb.length===4,'Expected six visible parts and four animated limbs');
        function matchFaces(mesh,part){
          for(const [i,name] of order.entries()){
            const t=mesh.material[i].map,c=t.image;
            check(c.width===16&&c.height===16&&t.magFilter===THREE.NearestFilter,'Face filtering changed');
            const rgb=atob(reference[part][name]);
            const rgba=c.getContext('2d').getImageData(0,0,16,16).data;
            for(let n=0;n<256;n++)for(let k=0;k<3;k++)check(rgba[n*4+k]===rgb.charCodeAt(n*3+k),'Face differs from sheet sample');
          }
        }
        matchFaces(body._rig.head,'head');matchFaces(body._rig.torso,'torso');
        limb.forEach((m,i)=>matchFaces(m,i<2?'arm':'leg'));
        const min=new THREE.Vector3(Infinity,Infinity,Infinity),max=new THREE.Vector3(-Infinity,-Infinity,-Infinity);
        for(const m of shapes){
          m.geometry.computeBoundingBox();min.min(m.geometry.boundingBox.min.clone().add(m.position));max.max(m.geometry.boundingBox.max.clone().add(m.position));
        }
        check(Math.abs(min.y)<1e-5&&Math.abs(max.y-skin.height)<1e-5&&Math.abs(max.x-min.x-skin.width)<1e-5,'Wrong reference proportions');
        check(_vmArmMats().f.map?.image.width===16,'Viewmodel sleeves did not pick up the skin');
        const shots=[];
        for(const yaw of [.12,Math.PI+.12]){
          body.rotation.y=yaw;P.renderer.render(P.scene,P.camera);
          const canvas=P.renderer.domElement,probe=document.createElement('canvas');
          probe.width=64;probe.height=76;const ctx=probe.getContext('2d');
          ctx.drawImage(canvas,0,0,64,76);const pixels=ctx.getImageData(0,0,64,76).data;
          let nonblank=0,accent=0;
          for(let i=0;i<pixels.length;i+=4){
            if(pixels[i+3]>120)nonblank++;
            const purple=pixels[i]>60&&pixels[i+2]>pixels[i+1]+25;
            const cyan=pixels[i+1]>85&&pixels[i+2]>85&&pixels[i+1]>pixels[i]+45;
            const orange=pixels[i]>140&&pixels[i]>pixels[i+1]+25&&pixels[i+1]>pixels[i+2]+25;
            const red=pixels[i]>95&&pixels[i]>pixels[i+1]+55&&pixels[i]>pixels[i+2]+55;
            const pink=pixels[i]>110&&pixels[i+2]>80&&pixels[i]>pixels[i+1]+35&&pixels[i+2]>pixels[i+1]+12;
            const blue=pixels[i+2]>100&&pixels[i+2]>pixels[i]+35&&pixels[i+2]>pixels[i+1]+25;
            const gray=pixels[i]>100&&Math.abs(pixels[i]-pixels[i+2])<36;
            const tan=pixels[i]>115&&pixels[i]>pixels[i+1]+14&&pixels[i+1]>pixels[i+2]+18;
            if(pixels[i+3]>120&&({raven:red,ember:orange,nova:cyan,pixel:pink,vesper:purple,
              cipher:purple,frost:blue,atlas:gray,ace:red,nomad:tan}[id]))accent++;
          }
          check(nonblank>750&&nonblank<4000&&accent>30,'Missing or incorrectly framed character render');
          shots.push(canvas.toDataURL('image/png').split(',')[1]);
        }
        if(desktop){
          const actor=makePlayerMesh('Sheet Test',false,'enemy',id);
          const actorId='sheet_test';remoteMeshes[actorId]=actor;scene.add(actor);
          const rig=actor._rig,arm=actor.children.find(m=>m.isSkinnedMesh&&m.skeleton.bones[0]===rig.armR);
          const i=Array.from({length:arm.geometry.attributes.position.count},(_,i)=>i)
            .find(i=>Math.abs(arm.geometry.attributes.position.getY(i)-skin.cuff)<1e-5);
          const point=new THREE.Vector3(),rest=arm.getVertexPosition(i,new THREE.Vector3());
          inLobby=false;armRemoteMesh(actor,'ak20',null);animateCharacterMesh(actor,.05,0,0,0);
          actor.updateMatrixWorld(true);arm.getVertexPosition(i,point);
          check(rest.distanceTo(point)>.04&&actor._gun?.parent===rig.gripR,'Armed stance did not move the box limb with the grip');
          await window.PVP_RAGDOLL.ready;
          check(window.PVP_RAGDOLL.death(actorId,'pistol'),'Sheet character ragdoll was not created');
          const entry=window.PVP_RAGDOLL.entries.find(e=>e.id===actorId);
          const rag=entry.visual.children.find(m=>m.isSkinnedMesh&&m.skeleton.bones[0]===entry.byName.armR.node);
          check(rag&&rag.skeleton!==arm.skeleton,'Ragdoll still bound to the living rig');
          for(let f=0;f<30;f++)window.PVP_RAGDOLL.tick(1/60);
          check(entry.byName.torso.body.position.y<rig.torso.position.y-.05,'Ragdoll did not fall');
          window.PVP_RAGDOLL.clear();delete remoteMeshes[actorId];actor.removeFromParent();disposeBody(actor);
        }
        return shots;
      },{skin,desktop:width>500});
      assert.deepEqual(errors,[]);
      if(process.env.SHEET_PREVIEW_DIR)result.forEach((png,i)=>fs.writeFileSync(
        process.env.SHEET_PREVIEW_DIR+'/'+skin.id+'-'+width+'-'+i+'.png',Buffer.from(png,'base64')));
      console.log(skin.id+' '+width+' px: 24 matching face tiles, six-part model, skin picker and sleeves'+(width>500?', armed pose and falling ragdoll':''));
      await page.close();
    }
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
