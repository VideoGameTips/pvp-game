/* An authored caldera: geometry, hazard exclusions and navigation share the same routes. */
(function () {
  'use strict';
  const footprint = [
    {x0:-48,x1:48,z0:-60,z1:60}, {x0:-30,x1:30,z0:60,z1:76}, {x0:-30,x1:30,z0:-76,z1:-60},
    {x0:-64,x1:-48,z0:-36,z1:36}, {x0:48,x1:64,z0:-36,z1:36},
  ];
  const outline = [[-30,-76],[30,-76],[30,-60],[48,-60],[48,-36],[64,-36],[64,36],[48,36],[48,60],[30,60],[30,76],[-30,76],[-30,60],[-48,60],[-48,36],[-64,36],[-64,-36],[-48,-36],[-48,-60],[-30,-60]];
  const safe = [];
  const rect = (x,z,w,d) => ({x,z,w,d,rot:0});
  for(const sign of [-1,1]) {
    safe.push(rect(0,sign*67,56,18),rect(0,sign*55,88,12),rect(0,sign*44,88,12));
    safe.push(rect(sign*36,0,16,112),rect(0,sign*39,16,36),rect(0,sign*25,80,12));
    safe.push(rect(sign*39,0,38,16),rect(0,sign*16.5,36,13),rect(sign*16.5,0,13,24));
    for(const other of [-1,1])safe.push(rect(sign*15,other*15,8,8));
  }
  const inside = (x,z,r) => x>=r.x0&&x<=r.x1&&z>=r.z0&&z<=r.z1;
  const floorAt = (x,z) => footprint.some(r=>inside(x,z,r));
  const safeAt = (x,z,pad=0) => floorAt(x,z)&&safe.some(r=>Math.abs(x-r.x)<=r.w/2-pad&&Math.abs(z-r.z)<=r.d/2-pad);
  function lineSafe(x0,z0,x1,z1,pad=.65) {
    const n=Math.max(1,Math.ceil(Math.hypot(x1-x0,z1-z0)));
    for(let i=0;i<=n;i++)if(!safeAt(x0+(x1-x0)*i/n,z0+(z1-z0)*i/n,pad))return false;
    return true;
  }
  function rockMaterial(color) {
    return new THREE.MeshStandardMaterial({color,roughness:.62,metalness:.18,flatShading:true});
  }
  function stoneTexture() {
    const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
    const ctx=canvas.getContext('2d'),rnd=_thRng('caldera:stone');ctx.fillStyle='#b3b8bd';ctx.fillRect(0,0,256,256);
    for(let i=0;i<3000;i++){const k=130+Math.floor(rnd()*65);ctx.fillStyle=`rgba(${k},${k+3},${k+6},.24)`;ctx.fillRect(rnd()*256,rnd()*256,.5+rnd()*2,.5+rnd()*2);}
    for(let i=0;i<22;i++){
      let x=rnd()*256,y=rnd()*256;ctx.beginPath();ctx.moveTo(x,y);
      for(let j=0;j<4;j++){x+=(rnd()-.5)*45;y+=6+rnd()*18;ctx.lineTo(x,y);}
      ctx.strokeStyle='#6b747d';ctx.lineWidth=.7;ctx.stroke();
    }
    const tex=new THREE.CanvasTexture(canvas);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.colorSpace=THREE.SRGBColorSpace;return tex;
  }
  function lavaTexture() {
    const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
    const ctx=canvas.getContext('2d'),rnd=_thRng('caldera:molten');
    ctx.fillStyle='#9b2406';ctx.fillRect(0,0,256,256);
    for(let i=0;i<95;i++) {
      const x=rnd()*256,y=rnd()*256,r=3+rnd()*18;
      ctx.fillStyle=i%3?'#d43d07':'#5e1c0d';ctx.beginPath();
      for(let k=0;k<6;k++){const a=k*Math.PI/3,rr=r*(.6+rnd()*.4);k?ctx.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr):ctx.moveTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}
      ctx.closePath();ctx.fill();
    }
    for(let i=0;i<38;i++) {
      let x=rnd()*256,y=rnd()*256;ctx.beginPath();ctx.moveTo(x,y);
      for(let k=0;k<5;k++){x+=(rnd()-.5)*40;y+=8+rnd()*14;ctx.lineTo(x,y);}
      ctx.strokeStyle='#ff5e0b';ctx.lineWidth=4;ctx.stroke();ctx.strokeStyle='#ffbd43';ctx.lineWidth=.8;ctx.stroke();
    }
    const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
    texture.repeat.set(14,16);texture.colorSpace=THREE.SRGBColorSpace;return texture;
  }
  function build() {
    const name='volcano';resetMapContents(name);MAP_RAMPS[name]=[];MAP_POIS[name]=[];
    const K=_bkit(name),G=MAP_GROUPS[name];setMapBounds(name,128,152);
    MAP_BOT_BOUNDS[name]={halfX:64,halfZ:76};
    MAP_VOID[name]={halfX:64,halfZ:76,rects:footprint.map(r=>({...r})),killY:-12,far:30};
    G.userData.authoredVolcano=true;G.userData.footprint=footprint;G.userData.safeRoutes=safe;
    G.userData.identityRefined=true;   // authored detail is its identity pass, like the other custom layouts (refineMapIdentity skips customDetail maps)
    G.userData.ventSpots=[{x:-53,z:0},{x:53,z:0}];
    G._skyColor=0x39414d;
    const basalt=rockMaterial(0x30363d),cut=rockMaterial(0x414953),dark=rockMaterial(0x20262b),lip=rockMaterial(0x59606a);
    const stone=stoneTexture();for(const material of [basalt,cut,dark]){material.map=stone;material.bumpMap=stone;material.bumpScale=.012;}
    const tex=lavaTexture(),molten=new THREE.MeshStandardMaterial({color:0xff762a,map:tex,emissive:0xff5416,emissiveMap:tex,emissiveIntensity:1.1,roughness:.36,metalness:.12});
    G.userData.lavaTexture=tex;
    for(const r of footprint) {
      const geo=new THREE.PlaneGeometry(r.x1-r.x0,r.z1-r.z0),uv=geo.attributes.uv;
      for(let i=0;i<uv.count;i++)uv.setXY(i,(r.x0+uv.getX(i)*(r.x1-r.x0))/10,(r.z1-uv.getY(i)*(r.z1-r.z0))/10);
      const mesh=new THREE.Mesh(geo,molten);
      mesh.rotation.x=-Math.PI/2;mesh.position.set((r.x0+r.x1)/2,.015,(r.z0+r.z1)/2);mesh.receiveShadow=true;G.add(mesh);
    }
    MAP_GIMMICKS[name].damageZones.push({x:0,z:0,w:128,d:152,rot:0,dps:120,type:'lava',safeRects:safe,surfaceY:.02});
    // Split the rock surface at all route intersections, avoiding coplanar overlapping plates.
    const xs=[...new Set([...footprint.flatMap(r=>[r.x0,r.x1]),...safe.flatMap(r=>[r.x-r.w/2,r.x+r.w/2])])].sort((a,b)=>a-b);
    const zs=[...new Set([...footprint.flatMap(r=>[r.z0,r.z1]),...safe.flatMap(r=>[r.z-r.d/2,r.z+r.d/2])])].sort((a,b)=>a-b);
    tex.repeat.set(1,1);
    const pos=[],normal=[],colors=[],uvs=[],rnd=_thRng('caldera:plates');
    const quad=(x0,x1,z0,z1,y,color)=>{
      for(const [x,z] of [[x0,z0],[x0,z1],[x1,z1],[x0,z0],[x1,z1],[x1,z0]]){pos.push(x,y,z);normal.push(0,1,0);colors.push(color.r,color.g,color.b);uvs.push(x/5,z/5);}
    };
    for(let i=1;i<xs.length;i++)for(let j=1;j<zs.length;j++) {
      const x=(xs[i-1]+xs[i])/2,z=(zs[j-1]+zs[j])/2;if(!safeAt(x,z))continue;
      const color=new THREE.Color(0x424950).multiplyScalar(.88+rnd()*.22);quad(xs[i-1],xs[i],zs[j-1],zs[j],.16,color);
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normal,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
    const paving=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({map:stone,bumpMap:stone,bumpScale:.018,vertexColors:true,roughness:.74,metalness:.12}));paving.receiveShadow=true;G.add(paving);
    for(const r of safe)for(const f of footprint){
      const x0=Math.max(r.x-r.w/2,f.x0),x1=Math.min(r.x+r.w/2,f.x1),z0=Math.max(r.z-r.d/2,f.z0),z1=Math.min(r.z+r.d/2,f.z1);
      if(x1>x0&&z1>z0){const m=K.box((x0+x1)/2,0,(z0+z1)/2,x1-x0,.15,z1-z0,0x30363d);m.visible=false;}
    }
    const rock=(x,z,w,h,d,material=basalt,y=0)=>{
      const mesh=K.box(x,y,z,w,h,d,material.color.getHex());mesh.material=material;
      const shape=new THREE.Shape(),a=w/2,b=d/2,c=Math.min(w,d)*.15;
      [[-a+c,-b],[a-c,-b],[a,-b+c],[a,b-c],[a-c,b],[-a+c,b],[-a,b-c],[-a,-b+c]].forEach(([u,v],i)=>i?shape.lineTo(u,v):shape.moveTo(u,v));shape.closePath();
      const geo=new THREE.ExtrudeGeometry(shape,{depth:h,bevelEnabled:false});geo.rotateX(-Math.PI/2);geo.translate(0,-h/2,0);mesh.geometry.dispose();mesh.geometry=geo;
      mesh.castShadow=mesh.receiveShadow=true;return mesh;
    };
    const columns=[];
    const column=(x,z,r,h,y=0)=>{
      const c=new THREE.Box3(new THREE.Vector3(x-r*.866,y,z-r),new THREE.Vector3(x+r*.866,y+h,z+r));MAP_COLLIDERS[name].push(c);
      columns.push({x,z,r,h,y});
    };
    // The enclosing rock face follows the cut-in shoreline instead of a square perimeter.
    for(let i=0;i<outline.length;i++) {
      const a=outline[i],b=outline[(i+1)%outline.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
      rock((a[0]+b[0])/2,(a[1]+b[1])/2,Math.abs(b[0]-a[0])||3,16,Math.abs(b[1]-a[1])||3,dark);
      const n=Math.ceil(length/6);
      for(let k=0;k<n;k++){const t=(k+.5)/n,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;column(x,z,1.9,16+rnd()*4);}
    }
    // Two high dogleg screens protect the entire spawn rectangle, including jump-height sightlines.
    for(const sign of [-1,1]) {
      rock(0,sign*54,34,12,5,dark);
      for(const x of [-13,-6.5,0,6.5,13])column(x,sign*54,2.6,12+rnd()*2);
      rock(sign*25,sign*42,8,7,5,basalt);
      rock(-sign*34,sign*13,6,5.8,8,basalt);
      rock(sign*36,sign*32,6,4,6,cut);
    }
    // The raised rim is a grounded octagonal landform, not a floating arena platform.
    const shape=new THREE.Shape();
    const rim=[[-12,-23],[12,-23],[23,-12],[23,12],[12,23],[-12,23],[-23,12],[-23,-12]];
    rim.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
    const hole=new THREE.Path();hole.moveTo(-10,-10);hole.lineTo(-10,10);hole.lineTo(10,10);hole.lineTo(10,-10);hole.closePath();shape.holes.push(hole);
    const rimGeo=new THREE.ExtrudeGeometry(shape,{depth:4.8,bevelEnabled:false});rimGeo.rotateX(-Math.PI/2);
    const rimMesh=new THREE.Mesh(rimGeo,basalt);rimMesh.castShadow=rimMesh.receiveShadow=true;G.add(rimMesh);
    const solid=(x,z,w,d)=>{rock(x,z,w,4.8,d,basalt).visible=false;};
    for(const s of [-1,1]){solid(0,s*16.5,24,13);solid(s*16.5,0,13,24);for(const t of [-1,1])solid(s*14.75,t*14.75,5.5,5.5);}
    for(const [x,z,ux,uz] of [[0,39,0,-1],[0,-39,0,1],[39,0,-1,0],[-39,0,1,0]]) {
      const start=MAP_COLLIDERS[name].length;
      addRamp(name,x,z,ux,uz,{width:8,rise:4.8,run:17,landing:0,color:0x4b515a});
      for(const c of MAP_COLLIDERS[name].slice(start))c.volcanoRamp=true;
      K.poi('rim access',x,z,.16);
    }
    for(const [x,z] of [[-15,-15],[15,15]]) {
      column(x,z,2.0,7.5,4.8);column(x+2.5,z,1.5,5.4,4.8);
    }
    // Rock strata, mineral seams, and cooled crust stay attached to the rock that carries them.
    const shafts=new THREE.InstancedMesh(new THREE.CylinderGeometry(.85,1,1,6),cut,columns.length);
    const seams=new THREE.InstancedMesh(new THREE.CylinderGeometry(1,1,1,6,1,true),lip,columns.length*3);
    const matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion(),position=new THREE.Vector3(),scale=new THREE.Vector3();let seam=0;
    columns.forEach((c,i)=>{
      matrix.compose(position.set(c.x,c.y+c.h/2,c.z),rotation,scale.set(c.r,c.h,c.r));shafts.setMatrixAt(i,matrix);
      for(let j=1;j<4;j++){
        const r=c.r*(1-.15*j/4)+.008;
        matrix.compose(position.set(c.x,c.y+c.h*j/4,c.z),rotation,scale.set(r,.07,r));seams.setMatrixAt(seam++,matrix);
      }
    });
    shafts.castShadow=shafts.receiveShadow=true;G.add(shafts,seams);
    const shards=[];
    for(let i=0;i<120;i++) {
      const x=(rnd()-.5)*112,z=(rnd()-.5)*138;if(!safeAt(x,z,1.5)||Math.abs(x)<5&&Math.abs(z)<42)continue;
      shards.push({x,z,r:.12+rnd()*.2,h:.08+rnd()*.12});
    }
    if(shards.length){const pieces=new THREE.InstancedMesh(new THREE.ConeGeometry(1,1,4),dark,shards.length);shards.forEach((s,i)=>{matrix.compose(position.set(s.x,.16+s.h/2,s.z),rotation,scale.set(s.r,s.h,s.r));pieces.setMatrixAt(i,matrix);});G.add(pieces);}
    // Background volcanoes are grounded outside the boundary; no orbiting/floating boulders.
    for(const [x,z,r,h] of [[-105,-108,46,62],[105,100,48,58],[-115,100,44,54]]) {
      const mountain=new THREE.Mesh(new THREE.CylinderGeometry(8,r,h,9,3,true),dark);mountain.position.set(x,h/2-5,z);G.add(mountain);
      const mouth=new THREE.Mesh(new THREE.CircleGeometry(7.8,18),new THREE.MeshBasicMaterial({color:0xff682a}));mouth.rotation.x=-Math.PI/2;mouth.position.set(x,h-4.9,z);G.add(mouth);
    }
    for(const x of [-46,0,46]){const glow=new THREE.PointLight(0xff762b,3.5,42,2);glow.position.set(x,1.5,0);G.add(glow);}
    K.spawn({x0:-14,x1:14,z0:66,z1:71},{x0:-14,x1:14,z0:-71,z1:-66});
    K.poi('west flank',-36,0,.16);K.poi('east flank',36,0,.16);K.poi('north rim',0,-16,4.8);K.poi('south rim',0,16,4.8);
    G.userData.caldera={lavaDps:120,ramps:4,wallHeight:16,columns:columns.length};
  }
  function animate(X) {
    X.on((dt,A,t)=>{
      const texture=X.G.userData.lavaTexture;
      if(texture){texture.offset.x=(t*.003)%1;texture.offset.y=(t*.0015)%1;}
    });
  }
  window.PVP_VOLCANO={build,animate,floorAt,safeAt,lineSafe};
})();
