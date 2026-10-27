/* Small receiver hardware is mounted in the host part's local coordinates. */
(function(){
  'use strict';
  const roster=new Set(['ak20','pistol','sg8','revolver','vector','p90','mp40','srx','burst','minigun','cyroclasm','continuum','storm_bloom']);
  let materials;
  let reflection;
  function environment(renderer){
    if(reflection)return reflection;
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const ctx=canvas.getContext('2d');
    const base=ctx.createLinearGradient(0,0,0,256);base.addColorStop(0,'#465568');base.addColorStop(.5,'#84909d');base.addColorStop(.65,'#353e48');base.addColorStop(1,'#151c25');ctx.fillStyle=base;ctx.fillRect(0,0,512,256);
    for(const [x,width,color] of [[92,58,'255,249,237'],[330,22,'195,225,255'],[490,36,'235,242,255']]){
      const light=ctx.createLinearGradient(x-width/2,0,x+width/2,0);light.addColorStop(0,'rgba('+color+',0)');light.addColorStop(.25,'rgba('+color+',.9)');light.addColorStop(.75,'rgba('+color+',.9)');light.addColorStop(1,'rgba('+color+',0)');ctx.fillStyle=light;ctx.fillRect(x-width/2,30,width,130);
    }
    const source=new THREE.CanvasTexture(canvas);source.mapping=THREE.EquirectangularReflectionMapping;source.colorSpace=THREE.SRGBColorSpace;
    const generator=new THREE.PMREMGenerator(renderer);reflection=generator.fromEquirectangular(source).texture;generator.dispose();source.dispose();return reflection;
  }
  function detail(root,id){
    if(!root || root._precisionFinish || !roster.has(id))return;
    const candidates=[];
    root.traverse(o=>{
      if(!o.isMesh || !o.geometry || Array.isArray(o.material) || !o.material || o.material.transparent || o.material.isMeshBasicMaterial || o.material.userData.weaponMaterial==='wood')return;
      for(let p=o;p&&p!==root;p=p.parent)if(p.userData.vmHand || p.userData.eqFx)return;
      if(!['BoxGeometry','ExtrudeGeometry'].includes(o.geometry.type))return;
      o.geometry.computeBoundingBox();const b=o.geometry.boundingBox,s=b.getSize(new THREE.Vector3());
      if(s.z<.06 || s.x<.012 || s.x>.15 || s.y<.012 || s.z<s.y*1.15)return;
      candidates.push({o,b,s,score:s.x*s.y*s.z*s.z/s.y});
    });
    candidates.sort((a,b)=>b.score-a.score);const host=candidates[0];if(!host)return;
    materials ||= [new THREE.MeshStandardMaterial({color:0x9daab6,roughness:.24,metalness:.88}),new THREE.MeshStandardMaterial({color:0x10151b,roughness:.65,metalness:.08}),new THREE.MeshStandardMaterial({color:0x435563,roughness:.3,metalness:.75})];
    for(const mat of materials)mat.envMap=environment(renderer);
    const buffers=materials.map(()=>({p:[],n:[]})),{b,s,o}=host,c=b.getCenter(new THREE.Vector3());
    function append(geo,mat,pos,rot=new THREE.Quaternion()){
      const source=geo,g=geo.index?geo.toNonIndexed():geo;g.applyMatrix4(new THREE.Matrix4().compose(pos,rot,new THREE.Vector3(1,1,1)));
      const out=buffers[mat],p=g.attributes.position,n=g.attributes.normal;
      for(let i=0;i<p.count;i++){out.p.push(p.getX(i),p.getY(i),p.getZ(i));out.n.push(n.getX(i),n.getY(i),n.getZ(i));}
      g.dispose();if(g!==source)source.dispose();
    }
    const box=(mat,x,y,z,w,h,d)=>append(new THREE.BoxGeometry(w,h,d),mat,new THREE.Vector3(x,y,z));
    const radius=Math.min(.0032,s.y*.045,s.z*.025),rotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),Math.PI/2);
    for(const side of [-1,1]){
      const face=side>0?b.max.x:b.min.x;
      for(const y of [b.min.y+s.y*.22,b.max.y-s.y*.22])for(const z of [b.min.z+s.z*.16,b.max.z-s.z*.16]){
        append(new THREE.CylinderGeometry(radius,radius,.0014,12),0,new THREE.Vector3(face,y,z),rotation);
        box(1,face+side*.00076,y,z,.00012,radius*.38,radius*1.35);
      }
      const z=c.z+s.z*.19,h=s.y*.27,d=s.z*.25;
      box(2,face,c.y,z,.0016,h+.002,d+.002);
      box(1,face+side*.00085,c.y,z,.00016,h,d);
      box(0,face+side*.00095,c.y-h*.3,z,.00012,.00065,d*.65);
      for(let i=0;i<3;i++)box(1,face+side*.00018,c.y-s.y*.16,b.min.z+s.z*(.24+i*.07),.00065,s.y*.14,s.z*.025);
    }
    for(let i=0;i<buffers.length;i++){
      const data=buffers[i];if(!data.p.length)continue;
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(data.p,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(data.n,3));
      const mesh=new THREE.Mesh(geometry,materials[i]);mesh.userData.precisionHardware=true;mesh.castShadow=false;o.add(mesh);
    }
    root._precisionFinish=true;
  }
  window.PVE_WEAPON_FINISH={detail,environment};
})();
