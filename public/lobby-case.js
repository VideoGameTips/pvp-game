(function () {
  'use strict';
  let state = null;
  const colors = { lame:0xa1aab4, basic:0x79b8ef, good:0x62e8a0, rare:0xa78bfa, legend:0xffca55, donut:0xff80b8 };
  const ease = t => { t=Math.max(0,Math.min(1,t));return t*t*(3-2*t); };
  function sound(name,volume=.6) { try { playSoundEvent(name,{volume,minGap:0}); } catch (_) {} }
  function mesh(parent,geometry,material,x=0,y=0,z=0) {
    const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;
  }
  function prizeFor(skin) {
    let source;
    if (skin.build) source=skin._caseSource || (skin._caseSource=skin.build());
    else source=_iconModelFor(skin.weapon || skin.melee || skin.skinFor,false)?.model;
    if(!source)throw Error('No model for skin '+skin.id);
    const model=source.clone(true);model.position.set(0,0,0);model.rotation.set(0,0,0);model.scale.setScalar(1);model.visible=true;
    const remove=[];
    const stripFlash=(original,copy)=>{if(original===source._flash){remove.push(copy);return;}for(let i=0;i<original.children.length;i++)stripFlash(original.children[i],copy.children[i]);};
    stripFlash(source,model);
    model.traverse(o=>{
      if(o.userData.vmHand || o.userData.eqFx || o.isLight || o.isSprite || (o.material?.isMeshBasicMaterial && !o.visible))remove.push(o);
    });
    for(const o of remove)o.removeFromParent();
    model.traverse(o=>{if(o.isMesh && o.material)o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();});
    if(!skin.build && skin.body!=null)applyWeaponSkin(model,skin);
    const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
    const scale=1.5/Math.max(size.x,size.y,size.z,.01);
    model.scale.setScalar(scale);model.position.copy(center).multiplyScalar(-scale);
    const holder=new THREE.Group();holder.add(model);holder.rotation.y=Math.PI/2;return holder;
  }
  function equip(skin) {
    if(MODEL_SKINS.some(s=>s.id===skin.id))setModelSkin(skin.weapon,skin.id);
    else if(MELEE_MODEL_SKINS.some(s=>s.id===skin.id))setMeleeModelSkin(skin.melee,skin.id);
    else if(skin.weapon)setGunStatSkin(skin.weapon,skin.id);
    else if(skin.skinFor)setMeleeSkin(skin.skinFor,skin.id);
  }
  function finish(reopen=true) {
    const s=state;if(!s)return;state=null;
    s.root.removeFromParent();s.ui.remove();
    const geometries=new Set(),materials=new Set();
    s.root.traverse(o=>{
      if(o.geometry && !s.prizeParts.has(o))geometries.add(o.geometry);
      if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);
    });
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
    if(inLobby && activeMapName===s.map) {
      camera.position.copy(s.position);camera.quaternion.copy(s.quaternion);camera.fov=s.fov;camera.updateProjectionMatrix();euler.copy(s.euler);
      for(const [o,visible]of s.held)o.visible=visible;
      if(reopen){for(const [el,display]of s.panels)if(el.isConnected)el.style.display=display;openWeaponSkinsPanel();}
    }
    for(const k of Object.keys(keys))keys[k]=false;
    shooting=false;
  }
  function show(skinId,duplicate,caseId) {
    if(!inLobby)return false;
    if(state)finish(false);
    const skin=skinDefById(skinId),def=skinCaseDef(caseId),accent=new THREE.Color(def.accent || '#88ccff'),rarity=colors[skin.rarity] || colors.basic;
    const root=new THREE.Group(),base=new THREE.Group(),lid=new THREE.Group();root.name='lobby-skin-case';root.add(base);
    const metal=new THREE.MeshStandardMaterial({color:0x303c48,metalness:.78,roughness:.29});
    const dark=new THREE.MeshStandardMaterial({color:0x111820,metalness:.42,roughness:.58});
    const trim=new THREE.MeshStandardMaterial({color:0x9caebb,metalness:.88,roughness:.23});
    const glow=new THREE.MeshStandardMaterial({color:accent,emissive:accent,emissiveIntensity:1.8,roughness:.35});
    const box=(p,m,w,h,d,x,y,z)=>mesh(p,new THREE.BoxGeometry(w,h,d),m,x,y,z);
    // A hollow lower shell: the reward rises from its lit interior, not a solid cube.
    box(base,dark,1.9,.12,1.1,0,.16,0);
    for(const x of [-.78,.78])for(const z of [-.43,.43])box(base,dark,.18,.14,.18,x,.07,z);
    for(const x of [-.9,.9])box(base,metal,.12,.53,1.1,x,.4,0);
    for(const z of [-.5,.5])box(base,metal,1.8,.53,.1,0,.4,z);
    box(base,glow,1.65,.015,.84,0,.23,0);
    for(const x of [-.78,.78])for(const z of [-.43,.43])box(base,trim,.18,.56,.18,x,.4,z);
    for(const x of [-.63,.63])box(base,glow,.045,.3,.012,x,.43,.557);
    lid.position.set(0,.67,-.53);base.add(lid);
    box(lid,metal,1.9,.15,1.1,0,.02,.53);
    box(lid,dark,1.55,.018,.8,0,.105,.53);
    for(const x of [-.7,.7])box(lid,trim,.1,.04,1.03,x,.12,.53);
    const latches=[];for(const x of [-.53,.53]){const latch=new THREE.Group();latch.position.set(x,.59,.57);base.add(latch);box(latch,trim,.16,.21,.065,0,0,0);latches.push(latch);}
    const floor=mesh(root,new THREE.CircleGeometry(1.32,48),new THREE.MeshBasicMaterial({color:accent,transparent:true,opacity:.15,depthWrite:false}),0,.025,0);floor.rotation.x=-Math.PI/2;
    const prize=prizeFor(skin),prizeParts=new Set();prize.traverse(o=>prizeParts.add(o));prize.visible=false;root.add(prize);
    const beam=mesh(root,new THREE.CylinderGeometry(.7,.45,2,32,1,true),new THREE.MeshBasicMaterial({color:rarity,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}),0,1.3,0);
    const light=new THREE.PointLight(rarity,0,6);light.position.set(0,1.5,.5);root.add(light);
    const front=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);front.y=0;if(front.lengthSq()<.01)front.set(0,0,-1);front.normalize();
    const feet=playerFeetY();
    for(const angle of [0,.6,-.6,1.2,-1.2,Math.PI]) {
      const direction=front.clone().applyAxisAngle(new THREE.Vector3(0,1,0),angle);
      root.position.copy(camera.position).addScaledVector(direction,3.4);root.position.y=feet+.03;
      const bounds=new THREE.Box3(root.position.clone().add(new THREE.Vector3(-1.2,.12,-1.2)),root.position.clone().add(new THREE.Vector3(1.2,2.5,1.2)));
      if(!wallColliders.some(b=>b.intersectsBox(bounds))){front.copy(direction);break;}
    }
    root.rotation.y=Math.atan2(-front.x,-front.z);scene.add(root);
    const target=root.position.clone().add(new THREE.Vector3(0,1.15,0));
    const panels=[];
    for(const id of [...DIALOG_IDS,'shop-screen','loadout-screen','menu-screen']){const el=document.getElementById(id);if(el && getComputedStyle(el).display!=='none'){panels.push([el,el.style.display]);el.style.display='none';}}
    releasePointer();shooting=false;setADS(false);
    const held=camera.children.filter(o=>!o.isLight).map(o=>[o,o.visible]);
    const ui=document.createElement('div');ui.id='skin-case-opening';ui.setAttribute('role','dialog');ui.setAttribute('aria-label',def.name);ui.setAttribute('aria-modal','true');
    ui.style.cssText='position:fixed;inset:0;z-index:12000;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:24px 16px max(24px,env(safe-area-inset-bottom));box-sizing:border-box;color:white;text-align:center;font-family:Arial,sans-serif;background:linear-gradient(#080e18aa,transparent 28%,transparent 60%,#080e18e8);';
    const heading=document.createElement('div');heading.textContent=def.name.toUpperCase();heading.style.cssText='font-size:16px;font-weight:700;text-shadow:0 2px 6px #000;';ui.appendChild(heading);
    const result=document.createElement('div');result.style.cssText='visibility:hidden;max-width:560px;';result.setAttribute('aria-live','polite');
    const label=document.createElement('div');label.textContent=duplicate?'DUPLICATE': 'NEW SKIN';label.style.cssText='font-size:12px;color:#b9cad6;';
    const name=document.createElement('div');name.textContent=skin.name;name.style.cssText='font-size:26px;font-weight:700;margin:6px 0;color:#'+rarity.toString(16).padStart(6,'0');
    const rarityLabel=document.createElement('div');rarityLabel.textContent=(skin.rarity || 'basic').toUpperCase();rarityLabel.style.cssText='font-size:12px;margin-bottom:12px;color:#b9cad6;';
    result.append(label,name,rarityLabel);
    const actions=document.createElement('div');actions.style.cssText='display:flex;gap:12px;justify-content:center;';
    const button=(text,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.style.cssText='min-height:48px;min-width:112px;padding:10px 18px;border:1px solid #91aabd;border-radius:4px;background:#182733;color:white;font:700 14px Arial;cursor:pointer;';b.onclick=fn;return b;};
    if(skin.weapon || skin.melee || skin.skinFor)actions.appendChild(button('Equip',()=>{try{finish();equip(skin);openWeaponSkinsPanel();}catch(e){console.warn('[case equip]',e);}}));
    actions.appendChild(button('Collect',()=>finish()));result.appendChild(actions);ui.appendChild(result);
    const skip=button('Skip',()=>{if(state)state.elapsed=Math.max(state.elapsed,3.5);});skip.style.cssText+='position:absolute;right:16px;top:58px;min-width:64px;background:#111d28bb;';ui.appendChild(skip);
    ui.addEventListener('pointerdown',e=>e.stopPropagation());ui.addEventListener('click',e=>e.stopPropagation());
    ui.addEventListener('keydown',e=>e.stopPropagation());
    ui.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();if(state?.revealed)finish();else if(state)state.elapsed=3.5;}if(e.key==='Tab'){const buttons=[...ui.querySelectorAll('button')].filter(b=>b.offsetParent!==null && getComputedStyle(b).visibility==='visible');const n=buttons.indexOf(document.activeElement);e.preventDefault();buttons[(n+(e.shiftKey?-1:1)+buttons.length)%buttons.length]?.focus();}},true);
    document.body.appendChild(ui);
    state={root,base,lid,latches,prize,prizeParts,beam,light,ui,result,skip,panels,held,target,map:activeMapName,position:camera.position.clone(),quaternion:camera.quaternion.clone(),euler:euler.clone(),fov:camera.fov,elapsed:0,revealed:false,unlatched:false,opened:false};
    skip.focus();sound('ammo_refill');return true;
  }
  function tick(dt) {
    const s=state;if(!s)return false;
    if(!inLobby || s.map!==activeMapName || isDead){finish(false);return false;}
    s.elapsed+=Math.min(dt,.1);const t=s.elapsed;
    s.base.scale.setScalar(Math.max(.01,ease(t/.55)));
    s.base.position.y=t<.65?Math.sin(Math.min(1,t/.65)*Math.PI)*.45:0;
    const unlock=ease((t-.85)/.4);s.latches.forEach((l,i)=>{l.rotation.x=unlock*1.4;l.rotation.z=(i?1:-1)*unlock*.25;});
    s.lid.rotation.x=-ease((t-1.3)/.85)*1.95;
    if(t>.85&&!s.unlatched){s.unlatched=true;try{playEquipSound('click');}catch(_) {}}
    if(t>1.3&&!s.opened){s.opened=true;sound('ammo_refill',.35);}
    const reveal=ease((t-1.9)/1);s.prize.visible=t>1.9;s.prize.position.set(0,.45+reveal*1.7+Math.sin(t*1.8)*.035,reveal*.65);
    s.prize.scale.setScalar(Math.max(.01,reveal));s.prize.rotation.y=Math.PI/2+Math.sin(t*.55)*.45;
    s.beam.material.opacity=Math.sin(reveal*Math.PI)*.15+reveal*.04;s.light.intensity=reveal*2;
    if(t>=3.25&&!s.revealed){s.revealed=true;s.result.style.visibility='visible';s.skip.remove();s.result.querySelector('button')?.focus();sound('kill',.7);}
    camera.position.copy(s.position);camera.lookAt(s.target);camera.fov=innerWidth/innerHeight<.65?80:62;camera.updateProjectionMatrix();
    for(const[o]of s.held)o.visible=false;
    if(PLAYER_VIEW.actor)PLAYER_VIEW.actor.visible=false;
    return true;
  }
  window.PVP_LOBBY_CASE={show,tick,close:finish,get active(){return !!state;}};
})();
