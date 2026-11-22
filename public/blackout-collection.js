(function(root) {
  'use strict';
  const ids = (`ak20 sg8 srx rpd mp40 p90 paintball burst m4a1_arena lever vector crossbow flamethrower grenade_launcher railgun minigun freeze_gun boombow revolver flare pistol cycler hand_cannon throwing_knives taser harpoon_gun mortar_rifle air_rifle machine_pistol gatecrasher sawed_off dart_gun laser_pointer auto_revolver snub_revolver duelist_pistol mauser nail_gun fission_disc slingshot gau19 mk44 xm7 barrett m134 hkmp7 p90_spec desert_eagle m1911 glock18 five_seven mg42 rpg traffic_cone cream_pie cyroclasm continuum storm_bloom chain_gun gunslinger javelin_launcher akimbo hellfire omega_pistol swap_gun phase_rifle chrono_pistol twin_burst energy_rifle gravity_cannon thorncaster m4_commando m12 mmg rad_pulse asmg9
    bat sabre frying_pan sledge spear katana baguette knife chainsaw riot_shield combat_axe fists karambit bayonet tomahawk ots04 garrote scythe chain_hammer
    frag medkit stim smoke blink_pearl ammo_fountain moon_mine black_hole_seed adrenaline bounce_pad land_mine air_blaster grapple_hook molotov acid_grenade bee_jar mini_turret c4 claymore stun_grenade thermite predator_uav care_package tac_nuke satchel freeze_ray bear_trap`).trim().split(/\s+/);
  const names={ak20:'Assault',sg8:'Breacher',srx:'Phantom',rpd:'Juggernaut',mp40:'Reaper',p90:'Viper',paintball:'Splatter',burst:'Striker',lever:'Outlaw',vector:'Spectre',crossbow:'Hunter',flamethrower:'Inferno',grenade_launcher:'Havoc',railgun:'Oblivion',minigun:'Titan',freeze_gun:'Frostbite',boombow:'Archer',harpoon_gun:'Leviathan',mortar_rifle:'Siege',air_rifle:'Pressure',rpg:'Demolition',cyroclasm:'Zero',storm_bloom:'Tempest',chain_gun:'Overdrive',javelin_launcher:'Predator',energy_rifle:'Voltage',gravity_cannon:'Singularity',m4_commando:'Operator',m12:'Rampage',mmg:'Wraith',rad_pulse:'Fallout',thorncaster:'Briar',sledge:'Hammer',sawed_off:'Shorty'};
  const ITEM_PRICE=2500, BUNDLE_UNIT=1800;
  const skinId=id=>'blackout_'+id;
  const valid=new Set(ids.map(skinId));
  const looks={},patterns={};
  let definitions=[];
  function catalog(groups) {
    definitions=groups.flatMap(([kind,items])=>items.filter(w=>!w.archived&&!w.skinOnly&&ids.includes(w.id)).map(w=>({
      id:skinId(w.id),targetItem:w.id,kind,slot:w.slot||kind,itemName:w.name,restricted:!!(w.adminItem||w.modeOnly||w.ddayOnly||w.prototype),
      name:'Blackout '+(names[w.id]||w.name),rarity:'legendary',blackout:true,body:0x0b0d10,accent:0xd21d38,sw:['#0b0d10','#d21d38'],
      role:kind==='melee'?(w.id==='fists'?'gloves':'blade'):kind==='support'?'equipment':/Sniper|Marksman|Rail/i.test(w.type)?'precision':/Shotgun/i.test(w.type)?'breach':w.slot==='secondary'?'sidearm':'assault'
    })));
    for(const s of definitions)looks[s.id]={pat:'blackoutWeave',c:[0x0b0d10,0xd21d38,0x202630],metal:.42,rough:.72,noSwap:true,glow:true,role:s.role};
    return definitions;
  }
  patterns.blackoutWeave=(g,n,c,rnd,look)=>{
    g.fillStyle=c[0];g.fillRect(0,0,n,n);
    // Tileable twill, with broad black negative space around the red inlays.
    for(let y=0;y<n;y+=4)for(let x=0;x<n;x+=4){
      g.fillStyle=((x+y)/4)%4<2?c[2]:c[0];g.globalAlpha=.48;
      g.fillRect(x,y,3,2);g.fillRect(x+1,y+2,3,1);
    }
    g.globalAlpha=1;g.fillStyle=c[2];g.fillRect(0,n*.66,n,n*.10);
    g.strokeStyle=c[1];g.lineWidth=look.role==='breach'?4:2;
    g.beginPath();g.moveTo(0,n*.66);g.lineTo(n,n*.66);g.stroke();
    for(let x=12;x<n;x+=32){
      g.strokeStyle=c[1];g.lineWidth=1.5;g.beginPath();
      if(look.role==='precision'){g.moveTo(x,n*.68);g.lineTo(x,n*.73);}
      else if(look.role==='gloves'){g.roundRect(x,n*.68,14,8,2);}
      else if(look.role==='blade'){g.moveTo(x,n*.72);g.lineTo(x+10,n*.72);g.lineTo(x+15,n*.69);}
      else {g.moveTo(x,n*.69);g.lineTo(x+8,n*.73);g.lineTo(x+16,n*.69);}
      g.stroke();
    }
    // A small, deterministic serial keeps individual finishes identifiable.
    const serial=Math.floor(rnd()*9000)+1000;
    g.fillStyle=c[1];g.font='9px monospace';g.fillText('BLK / '+serial,12,30);
    if(look.role==='equipment'){g.fillRect(n*.77,15,3,17);g.fillRect(n*.745,22,16,3);}
  };
  function finish(model,skin) {
    if(!model)return;
    const on=!!skin?.blackout;
    model.traverse(o=>{
      if(!o.isMesh||!o.material)return;
      for(let p=o;p;p=p.parent)if(p.userData?.vmHand)return;
      const mats=Array.isArray(o.material)?o.material:[o.material];
      const next=mats.map(m=>{
        if(!m.color||!m.isMeshBasicMaterial||m.map||m.transparent&&m.opacity<.95)return m;
        if(on&&m.userData.blackoutOriginal===undefined){const copy=m.clone();copy.userData={...m.userData,blackoutOriginal:m.color.getHex()};m=copy;}
        if(m.userData.blackoutOriginal!==undefined)m.color.setHex(on?0xd21d38:m.userData.blackoutOriginal);
        return m;
      });
      o.material=Array.isArray(o.material)?next:next[0];
    });
  }
  let trailGeometry=null,trailMaterial=null;
  function projectile(mesh,weaponId) {
    if(!['bullet','bolt','nail','slug','stone'].includes(projectileKind(weaponId)))return;
    trailGeometry ||= new THREE.CylinderGeometry(.002,.007,.28,4);
    trailMaterial ||= new THREE.MeshBasicMaterial({color:0xcb2140,transparent:true,opacity:.55,depthWrite:false});
    const trail=new THREE.Mesh(trailGeometry,trailMaterial);mesh.add(trail);
    if(mesh._alignToDir)trail.position.y=-.18;
    else {trail.rotation.x=Math.PI/2;trail.position.z=.18;}
  }
  function slash(itemId) {
    if(WEAPON_SKINS_BY_ID[wrapIdFor(itemId)]?.blackout&&gameplaySettingMult('screenFx')>0)
      comboSlashArc(0xcd2440,{ms:110,size:.20,dir:1},.35);
  }
  function deployed(mesh,itemId,ownerId=myId) {
    const id=ownerId===myId?wrapIdFor(itemId):players[ownerId]?.wrap;
    const skin=WEAPON_SKINS_BY_ID[id];
    if(skin?.blackout&&skin.targetItem===itemId)applyWeaponSkin(mesh,skin);
  }
  function confirmPurchase(text) {
    if(!document.getElementById('blackout-collection')?.open)return uiConfirm(text);
    return new Promise(resolve=>{
      const d=document.createElement('dialog');d.className='blackout-collection bo-confirm';
      d.setAttribute('aria-label','Confirm Blackout purchase');
      d.innerHTML=`<h3>${escHtml(text)}</h3><div class="bo-summary"><button type="button" data-cancel>Cancel</button><button type="button" data-confirm>Unlock</button></div>`;
      const done=ok=>{d.close();d.remove();resolve(ok);};
      d.oncancel=e=>{e.preventDefault();done(false);};
      d.querySelector('[data-cancel]').onclick=()=>done(false);d.querySelector('[data-confirm]').onclick=()=>done(true);
      document.body.appendChild(d);d.showModal();
    });
  }
  async function purchase(itemId) {
    if(!currentUser){alert('Log in first.');return false;}
    const missing=definitions.filter(s=>!wrapUnlocked(s.id));
    const cost=itemId==='all'?missing.length*BUNDLE_UNIT:ITEM_PRICE;
    if(!await confirmPurchase('Unlock '+(itemId==='all'?'Blackout collection':definitions.find(s=>s.targetItem===itemId)?.name)+' for '+money(cost)+' donuts?'))return false;
    const r=await authRequest('/shop/blackout',{username:currentUser.username,password:currentUser.password,itemId});
    if(!r||r.error){alert(r?.error||'Purchase failed.');return false;}
    currentUser.skinInventory=r.skinInventory;currentUser.credits=r.credits;updateUserInfoBar();return true;
  }
  function equip(s) {
    if(!wrapUnlocked(s.id))return false;
    setItemWrap(s.kind,s.targetItem,s.id);emitMyWrap();return true;
  }
  const previews=new Map();
  let observer=null;
  function preview(s) {
    if(previews.has(s.id))return previews.get(s.id);
    const items=s.kind==='gun'?WEAPONS:s.kind==='melee'?MELEE_ITEMS:SUPPORT_ITEMS;
    const models=s.kind==='gun'?weaponModels:s.kind==='melee'?meleeModels:supportModels;
    const source=models[items.findIndex(w=>w.id===s.targetItem)];if(!source)return null;
    const clone=source.clone(true),geometries=new Set(),materials=new Set();
    source.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])materials.add(m);});
    applyWeaponSkin(clone,s);const url=_renderWeaponIcon(clone);
    clone.traverse(o=>{if(o.geometry&&!geometries.has(o.geometry))o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])if(!materials.has(m))m.dispose();});
    previews.set(s.id,url);return url;
  }
  function hydrate(dialog) {
    observer?.disconnect();
    observer=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){
      observer.unobserve(e.target);const s=definitions.find(s=>s.id===e.target.dataset.blackoutPreview);
      const url=s&&preview(s);if(url)e.target.src=url;
    }},{root:dialog,rootMargin:'120px'});
    dialog.querySelectorAll('[data-blackout-preview]').forEach(img=>observer.observe(img));
  }
  function open(focusId) {
    let dialog=document.getElementById('blackout-collection');
    if(!dialog){dialog=document.createElement('dialog');dialog.id='blackout-collection';document.body.appendChild(dialog);}
    dialog.className='blackout-collection';
    let tab=definitions.find(s=>s.targetItem===focusId)?.slot||'primary',query='',busy=false;
    const render=()=>{
      const admin=!!currentUser?.isAdmin,missing=definitions.filter(s=>!wrapUnlocked(s.id));
      const rows=definitions.filter(s=>s.slot===tab&&(!s.restricted||admin)&&(!query||(s.name+' '+s.itemName).toLowerCase().includes(query.toLowerCase())));
      dialog.innerHTML=`<header><div><h2>BLACKOUT</h2><span class="bo-legend">LEGENDARY COLLECTION</span></div><button type="button" data-close aria-label="Close collection" title="Close">&#215;</button></header>
        <div class="bo-controls"><div role="tablist">${['primary','secondary','melee','support'].map(t=>`<button role="tab" type="button" aria-selected="${t===tab}" data-tab="${t}">${t==='support'?'Utilities':t[0].toUpperCase()+t.slice(1)}</button>`).join('')}</div><input type="search" placeholder="Search collection" aria-label="Search collection" value="${escHtml(query)}"></div>
        <div class="bo-summary"><span>${definitions.length-missing.length} / ${definitions.length} owned</span><button type="button" data-bundle ${busy||!missing.length?'disabled':''}>${missing.length?'Unlock Collection · '+money(missing.length*BUNDLE_UNIT):'Collection Owned'}</button><button type="button" data-equip-all>Equip Owned</button></div>
        <div class="bo-items">${rows.map(s=>{const own=wrapUnlocked(s.id),on=equippedWraps[s.targetItem]===s.id;return `<article><img data-blackout-preview="${s.id}" alt="${escHtml(s.itemName)}"><span>${escHtml(s.itemName)}</span><h3>${escHtml(s.name)}</h3><button type="button" data-item="${s.id}" ${busy||on?'disabled':''}>${on?'Equipped':own?'Equip':'Unlock · '+money(ITEM_PRICE)}</button></article>`;}).join('')||'<p>No matching items.</p>'}</div><p role="status" class="bo-status"></p>`;
      hydrate(dialog);
      dialog.querySelector('[data-close]').onclick=()=>dialog.close();
      dialog.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;render();});
      dialog.querySelector('input').oninput=e=>{const input=e.target,at=input.selectionStart;query=input.value;render();const n=dialog.querySelector('input');n.focus();try{n.setSelectionRange(at,at);}catch{}};
      const buy=async(id,skin)=>{if(busy)return;busy=true;render();try{if(await purchase(id)){if(skin)equip(skin);}}finally{busy=false;render();}};
      dialog.querySelector('[data-bundle]').onclick=()=>buy('all');
      dialog.querySelector('[data-equip-all]').onclick=()=>{let count=0;for(const s of definitions)if((!s.restricted||admin)&&wrapUnlocked(s.id)){equip(s);count++;}render();dialog.querySelector('[role="status"]').textContent=count+' finishes equipped.';};
      dialog.querySelectorAll('[data-item]').forEach(b=>b.onclick=()=>{const s=definitions.find(s=>s.id===b.dataset.item);if(wrapUnlocked(s.id)){equip(s);render();}else buy(s.targetItem,s);});
    };
    render();if(!dialog.open)dialog.showModal();
  }
  const api={ids,skinId,valid,ITEM_PRICE,BUNDLE_UNIT,catalog,looks,patterns,finish,projectile,slash,deployed,preview,open,equip,purchase,get definitions(){return definitions;}};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PVP_BLACKOUT=api;
})(typeof window!=='undefined'?window:globalThis);
