(function () {
  'use strict';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number = value => Number.isFinite(value) ? Number(value.toFixed(4)).toLocaleString('en-US', {maximumFractionDigits:4}) : value === Infinity ? 'Unlimited' : '\u2014';
  const time = seconds => seconds < 60 ? `${Math.floor(seconds)}s` : `${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 3600 / 60)}m`;
  const empty = () => ({since:Date.now(),seconds:0,wins:0,losses:0,draws:0,streak:0,best:0,kills:0,weapons:{}});
  let profile = null, record = empty(), lastTick = performance.now(), dirty = false, saveAt = 0, lastFocus = null;
  const results = new WeakSet();
  function baseWeapon(id) {
    if(typeof resolveMeleeLoadoutId==='function')id=resolveMeleeLoadoutId(id).id;
    if(typeof projectileWeaponSpec==='function')id=projectileWeaponSpec(id)?.id || id;
    return id;
  }
  function save() {
    if (!profile || !dirty) return;
    try { localStorage.setItem('pvp_player_record_v1:' + profile, JSON.stringify(record)); dirty = false; } catch (_) {}
  }
  function sync() {
    // this file loads before game.js, and its first tick comes a second later: on a slow first load (a 4.6 MB game.js on a
    // phone) there is no currentUser yet, and reading it threw -- the page's onerror showed every such player a red JS ERROR bar
    let username = null;
    try { username = currentUser?.username || null; } catch (_) {}
    if (username !== profile) {
      save(); profile = username; record = empty();
      try {
        const saved = JSON.parse(localStorage.getItem('pvp_player_record_v1:' + profile) || 'null');
        if (saved && typeof saved.weapons === 'object' && saved.weapons) {
          for (const key of ['since','seconds','wins','losses','draws','streak','best','kills']) {
            if (Number.isFinite(saved[key]) && saved[key] >= 0) record[key] = saved[key];
          }
          for (const [id, use] of Object.entries(saved.weapons)) {
            if (use && Number.isFinite(use.seconds) && Number.isFinite(use.kills)) record.weapons[id] = {seconds:Math.max(0,use.seconds),kills:Math.max(0,use.kills)};
          }
        }
      } catch (_) {}
      lastTick = performance.now();
    }
    return record;
  }
  function tick(now = performance.now()) {
    sync();
    const delta = Math.max(0, Math.min(2, (now - lastTick) / 1000)); lastTick = now;
    if (!profile || document.hidden || !gameStarted) return;
    record.seconds += delta; dirty = true;
    if (!inLobby && !isDead && match?.roundActive && !match.over) {
      const id = baseWeapon(currentEquippedId());
      if (id) { record.weapons[id] ||= {seconds:0,kills:0}; record.weapons[id].seconds += delta; }
    }
    if (now - saveAt >= 15000) { saveAt = now; save(); }
  }
  function result(matchObject, won, draw) {
    sync();
    if (!profile || !matchObject || results.has(matchObject) || ['range','aim_trainer','obby','wave_dash'].includes(matchObject.type)) return;
    results.add(matchObject);
    if (draw) record.draws++;
    else if (won) { record.wins++; record.streak++; record.best = Math.max(record.best, record.streak); }
    else { record.losses++; record.streak = 0; }
    dirty = true; save();
  }
  function kill(id) {
    sync(); if (!profile || inLobby || !match || match.over || ['range','aim_trainer'].includes(match.type)) return;
    id=baseWeapon(id);
    record.kills++; record.weapons[id] ||= {seconds:0,kills:0}; record.weapons[id].kills++;
    dirty = true;
  }
  const groups = () => [
    ...WEAPONS.filter(w => !w.archived && !w.skinOnly && !w.modeOnly && !w.ddayOnly).map(item => ({item,slot:item.slot === 'secondary'?'Secondary':'Primary',kind:'gun'})),
    ...MELEE_ITEMS.filter(w => !w.archived && !w.skinOnly).map(item => ({item,slot:'Melee',kind:'melee'})),
    ...SUPPORT_ITEMS.filter(w => !w.archived).map(item => ({item,slot:'Utility',kind:'support'})),
  ].filter(({item}) => isOwned(item.id));
  const pairs = rows => `<dl class="pr-facts">${rows.map(([label,value]) => `<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl>`;
  const section = (title, rows) => `<section class="pr-section"><h3>${escape(title)}</h3>${pairs(rows)}</section>`;
  const human = value => value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
  function fields(object, prefix = '', depth = 0) {
    const rows = [];
    for (const [key,value] of Object.entries(object || {})) {
      if (typeof value === 'function' || value == null || ['id','name','color','bulletColor','skinName','skinId','sw','build','equip','baseId'].includes(key)) continue;
      const label = prefix + human(key);
      if (typeof value === 'object' && depth < 3) rows.push(...fields(value, label + ' / ', depth + 1));
      else if (typeof value !== 'object') rows.push([label, typeof value === 'number'?number(value):typeof value === 'boolean'?(value?'Yes':'No'):value]);
    }
    return rows;
  }
  function weaponDetails(entry) {
    const {item,kind} = entry, w = kind === 'gun'?effectiveGunStats(item):kind === 'melee'?effectiveMeleeItem(item):item;
    let html = '';
    if (kind === 'gun') {
      const pellets = w.pellets || 1, rate = 1000 / w.fireRate;
      const speed = projectileBaseSpeed(w.id, w, w.bulletSpeed) * BULLET_SPEED_MULTIPLIER * (w.bulletSpeedMult || 1);
      html += section('Fire & ammunition', [
        ['Body damage per projectile', w.damageLabel || number(w.damage)], ['Projectiles per shot', number(pellets)],
        ['All-pellet body damage', number(w.damage * pellets)], ['Head multiplier', number(headshotMultFor(w.id)) + '\u00d7'],
        ['Fire interval', number(w.fireRate) + ' ms'], ['Theoretical shots / second', number(rate)],
        ['Magazine / reserve', number(w.mag) + ' / ' + number(w.reserve)], ['Reload', number(w.reloadTime / 1000) + ' s'],
        ['Projectile muzzle speed', number(speed) + ' studs/s'], ['Declared speed before scaling', number(w.bulletSpeed) + ' units/s'],
        ['Hip spread', number(w.spread || 0) + ' rad'], ['ADS field of view', number(w.adsZoom || 75) + '\u00b0'],
      ]);
      const falloff = WEAPON_FALLOFF[w.id];
      if (falloff && falloff.min < 1 && Number.isFinite(falloff.near) && Number.isFinite(falloff.far)) {
        html += section('Damage drop-off', [['Full damage through', number(falloff.near) + ' studs'],['Minimum damage from',number(falloff.far)+' studs'],['Minimum multiplier',number(falloff.min * 100)+'%']]);
        const distances = [...new Set([0,falloff.near,(falloff.near + falloff.far) / 2,falloff.far])];
        const hit = (d, head) => number(Math.max(1, Math.round(w.damage * (head ? headshotMultFor(w.id) : 1) * falloffMultiplier(w.id,d))));
        html += `<section class="pr-section"><table><caption>Base damage by distance (one projectile)</caption><thead><tr><th>Studs</th><th>Body</th><th>Head</th></tr></thead><tbody>${distances.map(d => `<tr><td>${number(d)}</td><td>${hit(d,false)}</td><td>${INSTAKILL_HS_WEAPONS.has(w.id)?'Lethal headshot':hit(d,true)}</td></tr>`).join('')}</tbody></table></section>`;
      } else html += section('Damage drop-off', [['Distance penalty','None']]);
      const rc = realisticRecoilProfile(w), deg = r => number(r * 180 / Math.PI) + '\u00b0';
      html += section('Aim recoil \u00b7 current realism setting', rc ? [
        ['First-shot vertical kick',deg(rc.up * .8) + ' to ' + deg(rc.up * 1.2)], ['First-shot horizontal kick','\u00b1' + deg(rc.side)],
        ['ADS vertical kick',deg(rc.up * rc.adsMult * ADS_RECOIL_DAMPING.aimPitch * .8) + ' to ' + deg(rc.up * rc.adsMult * ADS_RECOIL_DAMPING.aimPitch * 1.2)],
        ['ADS horizontal kick','\u00b1' + deg(rc.side * rc.adsMult * ADS_RECOIL_DAMPING.aimYaw)],
        ['Climb per consecutive shot',number(rc.climb)], ['Maximum kick multiplier',number(rc.max)+'\u00d7'], ['Recovery rate',number(rc.recover)+'/s'],
      ] : [['Aim recoil','None']]);
    } else if (kind === 'melee') {
      html += section('Melee', [['Damage',number(w.damage)],['Reach',number(w.range)+' studs'],['Attack interval',number(w.cooldown)+' ms'],['Attacks / second',number(1000/w.cooldown)]]);
    } else html += section('Utility', [['Damage',number(w.damage || 0)],['Healing',number(w.heal || 0)],['Uses',w.recharge?'Unlimited':number(w.uses)],[w.recharge?'Recharge time':'Use interval',number(w.cooldown || 0)+' ms']]);
    const ability = equippedAbility(item) || item.ability;
    if (ability) html += section('Ability \u00b7 ' + ability.name, [['Effective cooldown',number(abilityCooldownFor(item,ability) / 1000)+' s'], ...fields(ability)]);
    html += `<details class="pr-section"><summary>All configured parameters</summary>${pairs(fields(w))}</details>`;
    return html;
  }
  let view = 'overview', selected = null, category = 'All', query = '';
  function close() {
    const panel = document.getElementById('player-record-panel');
    if (panel) panel.style.display = 'none';
    if (lastFocus?.isConnected) lastFocus.focus();
  }
  function overview(panel) {
    const r = sync(), total = r.wins+r.losses+r.draws;
    const available = new Set(groups().map(entry => entry.item.id));
    const favourites = Object.entries(r.weapons).filter(([id])=>available.has(id)).sort((a,b) => b[1].seconds-a[1].seconds || b[1].kills-a[1].kills).slice(0,5);
    const name = id => [...WEAPONS,...MELEE_ITEMS,...SUPPORT_ITEMS].find(w=>w.id===id)?.name || id;
    panel.querySelector('.pr-content').innerHTML = `<div class="pr-overview"><h2>${escape(currentUser?.username || 'Player')}</h2><p class="pr-provenance">This device \u00b7 recorded since ${escape(new Date(r.since).toLocaleDateString())}</p>${section('Player record',[
      ['Recorded playtime',time(r.seconds)], ['Win rate',total?number(r.wins / total * 100)+'%':'\u2014'],
      ['Matches',number(total)], ['Wins / losses / draws',`${r.wins} / ${r.losses} / ${r.draws}`],
      ['Current win streak',number(r.streak)],['Highest win streak',number(Math.max(r.best,currentUser?.bestStreak||0))],
      ['Recorded eliminations',number(r.kills)], ['Level',number(currentUser?.level || 1)],
    ])}<section class="pr-section"><h3>Favourite weapons</h3>${favourites.length?favourites.map(([id,use])=>`<div class="pr-favourite">${loadoutPreviewHTML(id)}<span><strong>${escape(name(id))}</strong><small>${time(use.seconds)} equipped \u00b7 ${use.kills} eliminations</small></span></div>`).join(''):'<p class="pr-muted">No weapon usage recorded yet</p>'}</section></div>`;
    hydrateLoadoutPreviews(panel);
  }
  function renderWeapons(panel) {
    const all = groups(), entries = all.filter(e => (category === 'All'||e.slot===category)&&e.item.name.toLowerCase().includes(query.toLowerCase()));
    const entry = all.find(e=>e.item.id===selected);
    panel.querySelector('.pr-content').innerHTML = `<div class="pr-weapons" ${entry?'data-inspecting="true"':''}><div class="pr-browser"><div class="pr-categories" role="group" aria-label="Weapon slots">${['All','Primary','Secondary','Melee','Utility'].map(s=>`<button data-category="${s}" aria-pressed="${category===s}">${s}</button>`).join('')}</div><input type="search" class="pr-search" aria-label="Search owned weapons" placeholder="Search owned weapons" value="${escape(query)}"><div class="pr-owned-grid">${entries.map(({item,slot})=>`<button class="pr-weapon" data-weapon="${escape(item.id)}" aria-pressed="${selected===item.id}">${loadoutPreviewHTML(item.id)}<strong>${escape(item.name)}</strong><small>${slot}${item.archived?' \u00b7 Archived':''}</small></button>`).join('')||'<p class="pr-muted">No owned weapons match</p>'}</div></div><article class="pr-weapon-details">${entry?`<button class="pr-list-back">\u2190 Weapons</button><header class="pr-weapon-heading">${loadoutPreviewHTML(entry.item.id)}<div><h2>${escape(entry.item.name)}</h2><span>${entry.slot} \u00b7 ${escape(entry.item.type)}</span></div></header><p class="pr-provenance">Base values \u00b7 1 stud = 1 world unit \u00b7 damage before armour, buffs and special hit rules</p>${weaponDetails(entry)}`:'<h2>Weapon stats</h2><p class="pr-muted">Select an owned weapon</p>'}</article></div>`;
    panel.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{category=b.dataset.category;renderWeapons(panel);});
    const input = panel.querySelector('.pr-search');
    input.oninput = () => {
      const start=input.selectionStart;query=input.value;renderWeapons(panel);
      const fresh=panel.querySelector('.pr-search');fresh.focus();try{fresh.setSelectionRange(start,start);}catch(_){}
    };
    panel.querySelectorAll('[data-weapon]').forEach(b=>b.onclick=()=>{selected=b.dataset.weapon;renderWeapons(panel);panel.querySelector('.pr-list-back').focus();});
    panel.querySelector('.pr-list-back')?.addEventListener('click',()=>{selected=null;renderWeapons(panel);});
    if (entry) {
      const image=panel.querySelector('.pr-weapon-heading img'),src=weaponIconURL(entry.item.id,true);
      if(src){image.src=src;image.loading='eager';image.removeAttribute('data-loadout-icon');}
    }
    hydrateLoadoutPreviews(panel);
  }
  function open(tab = 'overview') {
    tick();save();view=tab;
    if(document.getElementById('player-record-panel')?.style.display!=='flex')lastFocus=document.activeElement;
    closeOtherDialogs('player-record-panel');releasePointer();
    let panel=document.getElementById('player-record-panel');
    if(!panel){panel=document.createElement('section');panel.id='player-record-panel';document.body.appendChild(panel);}
    panel.style.display='flex';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Player and weapon stats');
    panel.innerHTML=`<div class="pr-window"><header class="pr-header"><h1>Stats</h1><button class="pr-close" aria-label="Close stats">\u00d7</button></header><nav class="pr-tabs" role="tablist" aria-label="Stats pages"><button role="tab" data-view="overview" aria-selected="${view==='overview'}">My stats</button><button role="tab" data-view="weapons" aria-selected="${view==='weapons'}">Weapon stats</button></nav><div class="pr-content"></div></div>`;
    panel.querySelector('.pr-close').onclick=close;
    panel.querySelectorAll('[data-view]').forEach(button=>button.onclick=()=>{view=button.dataset.view;open(view);});
    panel.onkeydown=e=>{
      if(e.key==='Tab'){
        const controls=[...panel.querySelectorAll('button,input,summary')].filter(el=>el.getClientRects().length&&!el.disabled),first=controls[0],last=controls.at(-1);
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
      }
    };
    if(view==='overview')overview(panel);else renderWeapons(panel);
    panel.querySelector('[aria-selected="true"]').focus();
  }
  function showLobbyButton(show) {
    let button=document.getElementById('lobby-record-btn');
    if(!button){button=document.createElement('button');button.id='lobby-record-btn';button.textContent='STATS';button.onclick=()=>open();document.body.appendChild(button);}
    button.hidden=!show;
  }
  window.PVP_PLAYER_RECORD={open,showLobbyButton,result,kill,tick,get snapshot(){return JSON.parse(JSON.stringify(sync()));},weaponDetails};
  window.addEventListener('DOMContentLoaded',()=>{
    const button=document.createElement('button');button.id='player-record-btn';button.textContent='STATS';button.onclick=()=>open();
    document.getElementById('mode-tools')?.appendChild(button);
  });
  window.addEventListener('keydown',e=>{
    const panel=document.getElementById('player-record-panel');
    if(e.key==='Escape'&&panel?.style.display==='flex'){e.preventDefault();e.stopImmediatePropagation();close();}
  },true);
  document.addEventListener('visibilitychange',()=>{lastTick=performance.now();save();});
  window.addEventListener('pagehide',save);
  setInterval(()=>tick(),1000);
})();
