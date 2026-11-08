const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const browser = await chromium.launch({headless:true});
  try {
    const page = await browser.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/');
    await page.waitForFunction(()=>myId&&typeof moonMineEnemyNearby==='function');
    await page.evaluate(()=>{requestAnimationFrame=()=>0;});await page.waitForTimeout(100);
    const result=await page.evaluate(()=>{
      const check=(ok,msg)=>{if(!ok)throw Error(msg);},item=SUPPORT_ITEMS.find(x=>x.id==='moon_mine');
      const explode=explodeSupport,emit=socket.emit,savedWalls=wallColliders.splice(0),savedMode=match,savedLobby=inLobby;
      let explosions=0,at=null;
      socket.emit=()=>socket;explodeSupport=g=>{explosions++;at=g.mesh.position.clone();};
      function unit(id,team,x,y,z){
        const mesh=new THREE.Group();mesh.position.set(x,y,z);scene.add(mesh);remoteMeshes[id]=mesh;
        players[id]={id,hp:300,dead:false,team};return mesh;
      }
      const ids=['moon_test_enemy','moon_test_ally','moon_test_dummy'];
      function clear(){for(const g of activeGrenades)scene.remove(g.mesh);activeGrenades.length=0;for(const id of ids){remoteMeshes[id]?.removeFromParent();delete remoteMeshes[id];delete players[id];}wallColliders.length=0;explosions=0;}
      function mine(x=0,y=1,z=0){
        const mesh=new THREE.Group();mesh.position.set(x,y,z);scene.add(mesh);
        const g={mesh,id:'moon_test',isOwn:true,isSupport:true,itemRef:item,velX:0,velY:0,velZ:0,gravMult:.28,explodeOnImpact:false,explodeAt:Date.now()+4200};
        activeGrenades.push(g);return g;
      }
      try {
        match={type:'elim'};inLobby=false;players[myId].team='ally';
        unit(ids[0],'enemy',3,0,0);mine();updateGrenades(0);
        check(explosions===1&&activeGrenades.length===0,'Nearby enemy did not detonate');updateGrenades(0);check(explosions===1,'Mine exploded twice');clear();
        unit(ids[1],'ally',1,0,0);mine(camera.position.x,camera.position.y,camera.position.z);updateGrenades(0);
        check(explosions===0,'Owner triggered mine');clear();
        unit(ids[1],'ally',1,0,0);mine();updateGrenades(0);check(explosions===0,'Teammate triggered mine');clear();
        const enemy=unit(ids[0],'enemy',3,0,0);players[ids[0]].dead=true;mine();updateGrenades(0);check(!explosions,'Corpse triggered mine');
        players[ids[0]].dead=false;enemy.visible=false;updateGrenades(0);check(!explosions,'Hidden unit triggered mine');clear();
        unit(ids[2],'enemy',1,0,0);players[ids[2]].isDummy=true;mine();updateGrenades(0);check(!explosions,'Practice dummy triggered mine');clear();
        unit(ids[0],'enemy',5,0,0);mine();updateGrenades(0);check(!explosions,'Enemy outside radius triggered mine');clear();
        unit(ids[0],'enemy',0,7,0);mine();updateGrenades(0);check(!explosions,'Detection ignored vertical range');clear();
        unit(ids[0],'enemy',3,0,0);wallColliders.push(new THREE.Box3(new THREE.Vector3(1,0,-2),new THREE.Vector3(2,3,2)));mine();updateGrenades(0);check(!explosions,'Enemy behind wall triggered mine');clear();
        unit(ids[0],'enemy',0,2,0);wallColliders.push(new THREE.Box3(new THREE.Vector3(-2,1.8,-2),new THREE.Vector3(2,2,2)));mine();updateGrenades(0);check(!explosions,'Enemy through ceiling triggered mine');clear();
        match={type:'ffa'};unit(ids[1],'ally',2,0,0);mine();updateGrenades(0);check(explosions===1,'FFA opponent misclassified as teammate');clear();
        match={type:'elim'};unit(ids[0],'enemy',0,0,0);const fast=mine(-6,1,0);fast.velX=120;updateGrenades(.1);
        check(explosions===1&&Math.abs(at.x)<.1,'Fast mine skipped an enemy or detonated past blast range');clear();
        const fuse=mine();fuse.explodeAt=Date.now()-1;updateGrenades(0);check(explosions===1,'Backup fuse removed');clear();
        const regular=mine();regular.itemRef=SUPPORT_ITEMS.find(x=>x.id==='frag');unit(ids[0],'enemy',1,0,0);updateGrenades(0);check(!explosions,'Proximity change affected other grenades');clear();
        camera.position.set(0,1.65,0);throwSupportItem(item);
        const thrown=activeGrenades[0];check(thrown.itemRef===item&&thrown.gravMult===.28&&thrown.explodeAt>Date.now()+4000,'Real throw changed flight/fuse');
        unit(ids[0],'enemy',2,0,-1);updateGrenades(0);check(explosions===1,'Real thrown Moon Mine lacks proximity trigger');
        return {radius:item.proximityRadius,nearbyEnemy:true,ownerSafe:true,teammatesSafe:true,wallOcclusion:true,threeDimensionalRange:true,fastFlight:true,ffa:true,backupFuse:true,otherGrenadesUnchanged:true,realThrow:true};
      } finally {clear();wallColliders.push(...savedWalls);match=savedMode;inLobby=savedLobby;explodeSupport=explode;socket.emit=emit;}
    });
    assert.deepEqual(errors,[]);console.log('PASS',result);
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
