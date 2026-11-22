(() => {
  'use strict';
  const jets=new Map(),burns=new Map(),contacts=new Map();
  let geometry=null;
  function material(){
    return new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
      uniforms:{time:{value:0},front:{value:1},tail:{value:0},opacity:{value:.75}},
      vertexShader:`varying vec2 uvF;uniform float time;void main(){uvF=uv;vec3 p=position;float k=uv.y;
        p.x*=.08+.92*k;p.x+=sin(k*19.-time*8.)*.06*k;p.z+=sin(k*27.-time*11.)*.045*k;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
      fragmentShader:`varying vec2 uvF;uniform float time,front,tail,opacity;
        void main(){float k=uvF.y;float n=sin(uvF.x*13.+k*23.-time*13.)*.5+sin(uvF.x*17.-k*37.+time*17.)*.25;
        float edge=smoothstep(tail-.025,tail+.03,k)*(1.-smoothstep(front-.09+n*.025,front,k));
        float tongue=.5+.5*sin(uvF.x*16.+k*14.-time*7.);float hot=clamp(1.-k*.9+tongue*.25,0.,1.);
        vec3 c=mix(vec3(.8,.055,.008),vec3(1.,.56,.065),hot);c=mix(c,vec3(1.,.93,.57),pow(hot,7.)*.8);
        float feather=1.-smoothstep(.22,.5,abs(uvF.x-.5+sin(k*24.-time*12.)*.06));
        float a=edge*feather*(.18+.38*tongue)*opacity;if(a<.015)discard;gl_FragColor=vec4(c,a);}`});
  }
  function spray(origin,dir,owner){
    if(window.PVP_BATTLE_SIM?.lowEffects)return;
    const now=performance.now(),key=owner||'unknown';let f=jets.get(key);
    if(!f){geometry ||= new THREE.PlaneGeometry(1.1,PVP_FLAME_RULES.range,6,48);
      const mesh=new THREE.Group();mesh.material=material();mesh.name='continuous-flame-stream';
      for(let i=0;i<3;i++){const ribbon=new THREE.Mesh(geometry,mesh.material);ribbon.rotation.y=i*Math.PI/3;ribbon.frustumCulled=false;mesh.add(ribbon);}scene.add(mesh);
      f={mesh,start:now,epoch:matchEpoch};jets.set(key,f);}
    if(now-(f.last||0)>180)f.start=now;
    f.last=now;f.origin=origin.clone();f.dir=dir.clone().normalize();
  }
  function show(id,duration=8000){
    if(duration<=0){removeBurn(id);return;}
    const b=burns.get(id);if(b){b.until=Date.now()+duration;return;}
    burns.set(id,{until:Date.now()+duration,epoch:matchEpoch,fx:null});
  }
  function removeBurn(id){const b=burns.get(id);if(b?.fx){b.fx.removeFromParent();b.fx.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}burns.delete(id);}
  function contact(id){
    const now=Date.now(),state=PVP_FLAME_RULES.touch(contacts.get(id),now);
    if(!state)return false;contacts.set(id,state);show(id);return true;
  }
  function clear(){for(const f of jets.values()){f.mesh.removeFromParent();f.mesh.material.dispose();}jets.clear();
    for(const id of burns.keys())removeBurn(id);contacts.clear();}
  function scorch(mesh){
    const fx=new THREE.Group();fx.name='burning-scorch';
    // Flat charred patches sit on the torso; the face, sights and silhouette stay readable.
    for(const side of [-1,1])for(let i=0;i<3;i++){
      const m=new THREE.Mesh(new THREE.PlaneGeometry(.16,.23),new THREE.MeshBasicMaterial({color:i===1?0x7e1b10:0x231512,transparent:true,opacity:.72,side:THREE.DoubleSide,depthWrite:false}));
      m.position.set((i-1)*.15,.8+(i%2)*.17,side*.183);m.rotation.z=(i-1)*.19;fx.add(m);
    }
    for(let i=0;i<(window.PVP_BATTLE_SIM?.lowEffects?0:9);i++){
      const m=tongue(.16,.42,i);m.rotation.y=i*2.4;
      m.userData.flame=i;fx.add(m);
    }
    mesh.add(fx);return fx;
  }
  function step(){
    const now=Date.now(),clock=performance.now();
    for(const bot of gameBots)if(!bot.dead&&bot._fireUntil>now)show(bot.id,bot._fireUntil-now);
    for(const [id,d] of Object.entries(_dotTargets))if(d.weaponId==='flame_burn'&&d.until>now)show(id,d.until-now);
    for(const [key,f] of jets){
      const range=PVP_FLAME_RULES.range,speed=PVP_FLAME_RULES.speed/1000;
      const tail=Math.max(0,(clock-f.last-100)*speed/range);
      if(tail>=1||f.epoch!==matchEpoch){f.mesh.removeFromParent();f.mesh.material.dispose();jets.delete(key);continue;}
      let reach=Math.min(range,(clock-f.start)*speed+.4);
      const ray=new THREE.Ray(f.origin,f.dir),hit=new THREE.Vector3();
      for(const box of wallColliders)if(ray.intersectBox(box,hit))reach=Math.min(reach,f.origin.distanceTo(hit));
      f.mesh.position.copy(f.origin).addScaledVector(f.dir,range/2);f.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),f.dir);
      const u=f.mesh.material.uniforms;u.time.value=clock*.001;u.front.value=reach/range;u.tail.value=tail;
      u.opacity.value=window.PVP_BATTLE_SIM?.lowEffects?0:.75;
    }
    for(const [id,s] of contacts){
      if(now>s.until||players[id]?.dead){contacts.delete(id);continue;}
      const dummy=TRAINING_DUMMIES.find(d=>d.id===id);
      if(socket.connected&&!window.PVP_BATTLE_SIM?.active&&!dummy)continue;
      const damage=PVP_FLAME_RULES.tick(s,now);if(!damage)continue;
      if(id===myId){damagePlayerDOT(damage,'flamethrower_burn');continue;}
      const m=remoteMeshes[id];if(!m)continue;
      if(dummy)handleDummyHit(dummy,m,{damage,weaponId:'flamethrower_burn',periodic:true},m.position.clone());
      else emitHit(id,'flame_local_'+now+'_'+id,'flamethrower_burn',m.position.clone(),false,{damageOverride:damage,periodic:true});
    }
    for(const [id,b] of burns){
      const m=remoteMeshes[id];
      if(now>b.until||b.epoch!==matchEpoch||players[id]?.dead||id===myId&&isDead){removeBurn(id);continue;}
      if(!m||!m.visible||id===myId)continue;
      if(!b.fx)b.fx=scorch(m);
      const fade=Math.min(1,(b.until-now)/700);
      for(const o of b.fx.children){if(o.userData.flame===undefined){o.material.opacity=.72*fade;continue;}
        const i=o.userData.flame,t=(clock*.0014+i*.137)%1,a=i*2.4;
        o.position.set(Math.cos(a)*.28,.5+t*.9,Math.sin(a)*.22);o.rotation.z=Math.sin(clock*.006+i)*.18;
        o.scale.set(.7+.25*Math.sin(clock*.012+i),.7+.6*t,.7);o.material.uniforms.time.value=clock*.001;
        o.material.uniforms.fade.value=.8*Math.sin(t*Math.PI)*fade;
      }
    }
  }
  let connected=false;
  function update(){if(!connected){socket.on('flameExposure',d=>show(d.targetId,d.duration));connected=true;}step();}
  function tongue(width,height,phase){
    const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
      uniforms:{time:{value:phase},fade:{value:.8},phase:{value:phase}},
      vertexShader:`varying vec2 uvF;uniform float time,phase;void main(){uvF=uv;vec3 p=position;p.x+=sin(time*8.+uv.y*5.+phase)*uv.y*.045;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
      fragmentShader:`varying vec2 uvF;uniform float time,fade,phase;void main(){float y=uvF.y;
        float center=.5+sin(y*8.-time*7.+phase)*.08*y;float w=(1.-y)*.43+.015;
        float a=(1.-smoothstep(w*.4,w,abs(uvF.x-center)))*(1.-smoothstep(.72,1.,y))*fade;
        vec3 c=mix(vec3(1.,.13,.008),vec3(1.,.84,.32),pow(1.-y,2.));if(a<.015)discard;gl_FragColor=vec4(c,a*.8);}`});
    return new THREE.Mesh(new THREE.PlaneGeometry(width,height,1,6),mat);
  }
  function ground(radius,color=0xff731b){
    const shape=new THREE.Shape();
    for(let i=0;i<=16;i++){const a=i*Math.PI/8,r=radius*(.76+.12*Math.sin(i*2.7));i?shape.lineTo(Math.cos(a)*r,Math.sin(a)*r):shape.moveTo(Math.cos(a)*r,Math.sin(a)*r);}
    const root=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshBasicMaterial({color:0x271c17,transparent:true,opacity:.38,depthWrite:false,side:THREE.DoubleSide}));
    root.userData.firePatch=true;
    for(let i=0;i<18;i++){
      const a=i*2.39996,r=radius*Math.sqrt((i+.5)/18)*.85;
      const flame=tongue(.22+radius*.04,.55+(i%3)*.17,i);
      flame.position.set(Math.cos(a)*r,Math.sin(a)*r,.3);flame.rotation.x=Math.PI/2;flame.userData.fireTongue=i;root.add(flame);
    }
    return root;
  }
  function groundStep(root,now,fade){for(const f of root.children)if(f.userData.fireTongue!==undefined){const n=f.userData.fireTongue;
    f.scale.y=.65+.45*(1+Math.sin(now*.011+n*2.3));f.rotation.z=.16*Math.sin(now*.007+n);
    f.material.uniforms.time.value=now*.001;f.material.uniforms.fade.value=fade;}}
  function douse(id){const had=contacts.has(id)||burns.has(id);contacts.delete(id);removeBurn(id);return had;}
  window.PVP_FLAMES={spray,show,contact,clear,update,ground,groundStep,douse};
})();
