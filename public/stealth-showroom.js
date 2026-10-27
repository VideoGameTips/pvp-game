(function(){
  'use strict';
  let selected='pistol_stealth_cipher',yaw=.3,ticket=0;
  const previews=new Map();
  function preview(skin){
    if(!previews.has(skin.id))previews.set(skin.id,prepViewModel(_smoothModelSkin(skin.build()),skin.weapon));
    return previews.get(skin.id);
  }
  function equip(skin){
    setModelSkin(skin.weapon,skin.id);
    if(!inLiveMatch()){
      const idx=WEAPONS.findIndex(w=>w.id===skin.weapon);
      if(WEAPONS[idx].slot==='secondary')selectedSecondaryIdx=idx;else selectedPrimaryIdx=idx;
    }
  }
  function open(){
    closeOtherDialogs('stealth-panel');releasePointer();
    let panel=document.getElementById('stealth-panel');
    if(!panel){panel=document.createElement('section');panel.id='stealth-panel';document.body.appendChild(panel);}
    const skins=MODEL_SKINS.filter(s=>s.series==='stealth');
    if(!skins.some(s=>s.id===selected))selected=skins[0].id;
    const skin=skins.find(s=>s.id===selected),base=WEAPONS.find(w=>w.id===skin.weapon);
    panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Stealth Collection');panel.style.display='flex';
    panel.innerHTML=`<div class="st-window"><header><h2>Stealth Collection</h2><button class="st-close" aria-label="Close">&#215;</button></header>
      <nav role="tablist" aria-label="Stealth weapons">${skins.map(s=>`<button role="tab" data-stealth-skin="${s.id}" aria-selected="${s.id===selected}">${WEAPONS.find(w=>w.id===s.weapon).name}</button>`).join('')}</nav>
      <div class="st-stage"><img alt="${skin.name} 3D weapon preview" draggable="false"></div>
      <div class="st-meta"><div><h3>${skin.name}</h3><div class="st-base">${base.name} &middot; Rare</div></div><span class="st-state"></span>
      <label class="st-rotation">Rotation<input aria-label="Weapon rotation" type="range" min="-180" max="180" value="${Math.round(yaw*180/Math.PI)}"></label></div>
      <footer><button class="st-equip"></button><button class="st-range">Try in Range</button></footer></div>`;
    const image=panel.querySelector('img'),slider=panel.querySelector('input'),button=panel.querySelector('.st-equip');
    const paint=()=>{
      const model=preview(skin),src=_renderWeaponIcon(model,{large:true,yaw});if(src)image.src=src;
      const on=equippedModelSkins[skin.weapon]===skin.id;
      panel.querySelector('.st-state').textContent=on?'Equipped':'Available';button.textContent=on?'Equipped':'Equip';button.disabled=on;
    };
    let queued=false,drag=null;
    const queue=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;if(panel.style.display!=='none'&&selected===skin.id)paint();});};
    slider.oninput=()=>{yaw=Number(slider.value)*Math.PI/180;queue();};
    const stage=panel.querySelector('.st-stage');
    stage.onpointerdown=e=>{drag={x:e.clientX,yaw};stage.setPointerCapture(e.pointerId);};
    stage.onpointermove=e=>{if(!drag)return;yaw=THREE.MathUtils.clamp(drag.yaw+(e.clientX-drag.x)*.012,-Math.PI,Math.PI);slider.value=Math.round(yaw*180/Math.PI);queue();};
    stage.onpointerup=stage.onpointercancel=()=>drag=null;
    panel.querySelectorAll('[data-stealth-skin]').forEach(b=>b.onclick=()=>{selected=b.dataset.stealthSkin;yaw=.3;open();});
    button.onclick=()=>{equip(skin);paint();panel.querySelector('[aria-selected="true"]').focus();};
    panel.querySelector('.st-range').onclick=async()=>{
      if(document.getElementById('overlay').style.display!=='none'){
        document.getElementById('play-btn').click();
        const started=await new Promise(resolve=>{
          let tries=0;const wait=()=>{if(inLobby&&currentUser){resolve(true);return;}if(++tries>=80){resolve(false);return;}setTimeout(wait,100);};wait();
        });
        if(!started){panel.querySelector('.st-state').textContent='Local profile could not start.';return;}
      }
      if(inLiveMatch()&&!await uiConfirm('Leave this match and test '+skin.name+' in the shooting range?'))return;
      equip(skin);closeOtherDialogs();teardownMatchWorld();
      const idx=WEAPONS.findIndex(w=>w.id===skin.weapon);
      if(WEAPONS[idx].slot==='secondary')selectedSecondaryIdx=idx;else selectedPrimaryIdx=idx;
      selectMode('range');
      const run=++ticket;let tries=0;
      const ready=()=>{
        if(run!==ticket||selectedModeConfig!==GAME_MODE_CONFIGS.range)return;
        if(match?.roundActive&&!countdownActive){activeSlot=WEAPONS[idx].slot||'primary';switchWeapon(idx);return;}
        if(++tries<60)setTimeout(ready,200);
      };ready();
    };
    const close=()=>{panel.style.display='none';document.getElementById(document.getElementById('overlay').style.display==='none'?'stealth-open-btn':'stealth-login-btn')?.focus();};
    panel.querySelector('.st-close').onclick=close;
    panel.onkeydown=e=>{
      if(e.key==='Escape'){e.stopPropagation();close();}
      if(e.key==='Tab'){
        const controls=[...panel.querySelectorAll('button:not(:disabled),input')],first=controls[0],last=controls.at(-1);
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
      }
    };
    paint();panel.querySelector('[aria-selected="true"]').focus();
  }
  window.PVE_STEALTH_SHOWROOM={open};
  window.addEventListener('keydown',e=>{
    const panel=document.getElementById('stealth-panel');
    if(e.key==='Escape'&&panel?.style.display==='flex'){
      e.preventDefault();e.stopImmediatePropagation();panel.querySelector('.st-close').click();
    }
  },true);
  window.addEventListener('DOMContentLoaded',()=>{
    for(const id of ['stealth-open-btn','stealth-login-btn'])document.getElementById(id)?.addEventListener('click',open);
  });
})();
