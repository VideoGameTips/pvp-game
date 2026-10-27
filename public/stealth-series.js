/* Cosmetic spy hardware keeps the host weapon's ammunition and moving assemblies. */
(function(){
  'use strict';
  function build(id){
    const g=id==='pistol'?buildPistol():id==='srx'?buildSRX():buildAK20();
    const steel=gpFinish(0x53616a,.22,.94,'steel'),black=gpFinish(0x202a2f,.32,.9,'steel');
    const bright=gpFinish(0xaab8b9,.16,.98,'steel'),rubber=gpFinish(0x12191b,.78,.03,'polymer');
    const dark=gpFinish(0x0b1013,.6,.4,'shadow'),red=new THREE.MeshBasicMaterial({color:0xff334c});
    const replacements=new Map();
    g.traverse(o=>{
      if(!o.isMesh||o.material?.isMeshBasicMaterial||o.material?.transparent)return;
      const remap=m=>{
        if(replacements.has(m))return replacements.get(m);
        const role=m.userData.weaponMaterial;
        let next=role==='polymer'?rubber:role==='shadow'?dark:role==='wood'?black:role==='steel'?(m.roughness<.22?bright:steel):null;
        if(!next){
          const c=m.color?.clone().convertLinearToSRGB(),light=c?(c.r+c.g+c.b)/3:.2;
          next=light<.08?dark:light>.45?bright:light>.2?steel:black;
        }
        replacements.set(m,next);return next;
      };
      o.material=Array.isArray(o.material)?o.material.map(remap):remap(o.material);
    });
    const pistol=id==='pistol',sniper=id==='srx';
    const y=pistol?.02:.018,z=pistol?-.19:sniper?-.555:-.625,length=pistol?.15:.13;
    const can=gpOpenMuzzle(g,.019,.0065,length,0,y,z,black,dark);
    can.userData.stealthSuppressor=true;
    for(let i=0;i<7;i++){
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.01925,.0009,6,32),i===0||i===6?bright:steel);
      ring.position.set(0,y,z-length*.39+i*length*.13);g.add(ring);
    }
    for(const s of [-1,1])for(let i=0;i<6;i++)gpBox(g,steel,.001,.009,.005,s*.019,y,z-.045+i*.016);
    if(g._flash)g._flash.position.set(0,y,z-length/2-.014);
    // Rail-mounted optic, with actual clamp feet and an open objective, not a capped ring.
    if(!sniper){
      gpBox(g,black,.031,.009,pistol?.048:.13,0,pistol?.049:.068,pistol?-.012:-.035);
      gpOptic(g,0,pistol?.078:.103,pistol?-.015:-.035,pistol?.065:.105,pistol?.009:.013,pistol?.052:.072);
    }
    const lx=pistol?0:.041,ly=pistol?-.015:.027,lz=pistol?-.088:sniper?-.24:-.19;
    gpBox(g,black,.022,.021,.064,lx,ly,lz);
    gpBox(g,steel,pistol?.023:.035,.008,.04,pistol?0:.027,pistol?-.002:ly,lz+.007);
    gpCyl(g,bright,.007,.007,.007,24,lx,ly,lz-.034);
    gpCyl(g,red,.0035,.0035,.002,24,lx,ly,lz-.039);
    const emitter=new THREE.Object3D();emitter.position.set(lx,ly,lz-.042);g.add(emitter);
    // Exposed operating rod and spring: they compress when firing or inspecting.
    const rx=pistol?.021:.027,ry=pistol?.026:.063,rz=pistol?-.05:-.11,L=pistol?.046:.115;
    for(const zz of [rz-L/2,rz+L/2])gpBox(g,black,.012,.016,.008,rx,ry,zz);
    gpCyl(g,bright,.0023,.0023,L+ .008,20,rx,ry,rz);
    const points=[];
    for(let i=0;i<=160;i++){
      const t=i/160,a=t*Math.PI*18;
      points.push(new THREE.Vector3(Math.cos(a)*.005,Math.sin(a)*.005,(t-.5)*L*.8));
    }
    const spring=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),160,.00085,5,false),bright);
    spring.position.set(rx,ry,rz);spring.userData.stealthSpring=true;g.add(spring);
    const carriage=gpBox(g,steel,.013,.012,.015,rx,ry,rz-L*.35);
    for(const side of [-1,1]){
      const face=pistol?.016:.026;
      for(let i=0;i<5;i++){
        gpCyl(g,bright,.0019,.0019,.0013,16,side*face,pistol?.012:.015,(pistol?-.06:-.11)+i*.021,0,Math.PI/2);
        gpBox(g,dark,.00025,.0006,.0028,side*(face+.00075),pistol?.012:.015,(pistol?-.06:-.11)+i*.021);
      }
    }
    const legend=document.createElement('canvas');legend.width=512;legend.height=128;
    const ink=legend.getContext('2d');ink.fillStyle='#263438';ink.fillRect(0,0,512,128);
    ink.fillStyle='#b1c1c2';ink.font='bold 46px monospace';ink.fillText(pistol?'CIPHER // 01':sniper?'LONGWATCH // 03':'GHOSTLINE // 02',20,59,472);
    ink.font='22px monospace';ink.fillStyle='#718a8b';ink.fillText('STL / PRECISION SYSTEMS',20,100,472);
    const marking=new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(legend),metalness:.86,roughness:.28,color:0xffffff});
    marking.userData.metalDone=true;marking.userData.weaponMaterial='steel';
    for(const side of [-1,1]){
      const plaque=new THREE.Mesh(new THREE.PlaneGeometry(pistol?.055:.13,pistol?.014:.031),marking);
      plaque.position.set(side*(pistol?.0123:sniper?.0202:.0262),pistol?-.007:-.015,pistol?-.015:-.025);plaque.rotation.y=side*Math.PI/2;
      plaque.userData.stealthMarking=true;g.add(plaque);
    }
    const optics=[];g.traverse(o=>{if(o.userData.weaponOptic)optics.push(o);});
    for(const optic of optics){
      const radius=pistol?.009:sniper?.015:.013;
      for(let i=0;i<16;i++){
        const a=i*Math.PI/8;
        gpBox(optic,bright,.0014,.002,.002,radius*1.6,Math.cos(a)*radius*.57,Math.sin(a)*radius*.57,0,0,a);
      }
    }
    if(!pistol&&g._parts?.main){
      const part=g._parts.main,hy=sniper?.028:.046,hz=sniper?-.006:-.03;
      gpCyl(part,steel,.003,.003,.018,20,.036,hy,hz,0,Math.PI/2);
      gpCyl(part,black,.006,.006,.007,24,.048,hy,hz,0,Math.PI/2);
      for(let i=0;i<12;i++){
        const a=i*Math.PI/6;
        gpBox(part,bright,.007,.0008,.0014,.048,hy+Math.cos(a)*.006,hz+Math.sin(a)*.006,0,0,a);
      }
    }
    let kick=0;
    const rest=()=>{kick=0;spring.scale.z=1;carriage.position.z=rz-L*.35;};
    g._tick=(dt,now,assembling)=>{
      if(assembling){rest();return;}
      kick=g._flash?.visible?1:kick*Math.exp(-dt*22);
      const motion=g._inspectMode?Math.pow(Math.max(0,Math.sin(now*5)),3):kick;
      spring.scale.z=1-motion*.30;carriage.position.z=rz-L*.35+motion*L*.18;
    };
    g._calm=rest;g._stealth={id,emitter,spring,carriage};g._rackReload=true;
    g.position.x*=.55;
    return g;
  }
  let rig,line,dot;
  const origin=new THREE.Vector3(),direction=new THREE.Vector3(),end=new THREE.Vector3(),hit=new THREE.Vector3();
  const ray=new THREE.Ray(),segment=new THREE.Ray();
  function update(model,allowed){
    if(rig)rig.visible=false;
    if(!allowed||!model?.visible||!model._stealth||model._inspectMode||reloading||isDead||inLobby||!gameStarted||_equip)return;
    if(!rig){
      rig=new THREE.Group();rig.userData.stealthLaser=true;
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(6),3));
      line=new THREE.Line(geo,new THREE.LineBasicMaterial({color:0xff2f49,transparent:true,opacity:.28,depthWrite:false}));
      dot=new THREE.Mesh(new THREE.SphereGeometry(.035,12,8),new THREE.MeshBasicMaterial({color:0xff5365}));
      line.raycast=dot.raycast=()=>{};rig.add(line,dot);scene.add(rig);
    }
    camera.updateWorldMatrix(true,true);model._stealth.emitter.getWorldPosition(origin);
    if(wallColliders.some(box=>box.containsPoint(origin)))return;
    camera.getWorldDirection(direction);ray.set(camera.position,direction);let distance=100;
    for(const box of wallColliders)if(ray.intersectBox(box,hit)){
      const d=hit.distanceTo(camera.position);if(d>.04)distance=Math.min(distance,d);
    }
    ray.at(distance,end);direction.copy(end).sub(origin).normalize();segment.set(origin,direction);
    let length=origin.distanceTo(end);
    for(const box of wallColliders)if(segment.intersectBox(box,hit))length=Math.min(length,hit.distanceTo(origin));
    segment.at(Math.max(.001,length-.015),end);
    const p=line.geometry.attributes.position;p.setXYZ(0,origin.x,origin.y,origin.z);p.setXYZ(1,end.x,end.y,end.z);p.needsUpdate=true;line.geometry.computeBoundingSphere();
    dot.position.copy(end);dot.visible=distance<99.99||length<99;rig.visible=true;
  }
  function drawScope(ctx,cx,cy,r){
    ctx.strokeStyle='rgba(255,70,88,.9)';ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=1;
    for(const s of [-1,1]){
      ctx.beginPath();ctx.moveTo(cx+s*10,cy);ctx.lineTo(cx+s*r*.82,cy);ctx.stroke();
      ctx.beginPath();ctx.moveTo(cx,cy+s*10);ctx.lineTo(cx,cy+s*r*.82);ctx.stroke();
      for(let i=1;i<=5;i++){
        const u=s*i*r*.11;ctx.fillRect(cx+u-.5,cy-3,1,6);ctx.fillRect(cx-3,cy+u-.5,6,1);
      }
    }
    ctx.beginPath();ctx.arc(cx,cy,1.8,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(211,234,235,.7)';
    for(const s of [-1,1])for(const t of [-1,1]){
      ctx.beginPath();ctx.moveTo(cx+s*r*.62,cy+t*r*.31);ctx.lineTo(cx+s*r*.62,cy+t*r*.43);ctx.lineTo(cx+s*r*.47,cy+t*r*.43);ctx.stroke();
    }
  }
  window.PVE_STEALTH={build,update,drawScope,get laser(){return rig;}};
})();
