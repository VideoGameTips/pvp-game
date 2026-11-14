// 🎯 COMBAT VISUALS: the muzzle-flash / tracer settings and the HUD polish. Nothing in here touches damage, recoil, spread, fire rate, projectile speed, hitboxes or maps.
//
//   Settings (saved on this device, in the SHOOT FX panel under "COMBAT VISUALS"):
//     muzzle   0 off · 0.6 small · 1 normal · 1.3 big      (scales every muzzle flash; 0 keeps the case ejection and the gun's own reaction)
//     tracer   'streak' a thin warm-white streak · 'classic' the old cartridge with its afterburn · 'off' no bullet is drawn
//     quality  'high' everything · 'medium' no shock ring, one smoke puff · 'low' flash and light only, tracers thinned out
//   game.js reads these through window.PVP_COMBAT_FX (triggerMuzzleBlast, makeBulletMesh, spawnLocalBullet). The HUD look is the CSS block below; its pieces are
//   #health-bar, #ammo and #killfeed. The little animations are classes this file puts on those elements for 100-250 ms.
(function () {
  'use strict';
  const KEY = 'pvp_combat_fx';
  const DEF = { muzzle: 1, tracer: 'streak', quality: 'high' };
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } };
  const S = Object.assign({}, DEF, load());
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };

  // ── what game.js asks ──
  const lastTracer = {};
  const FX = window.PVP_COMBAT_FX = {
    get muzzle() { return S.muzzle; },
    get tracer() { return S.tracer; },
    get quality() { return S.quality; },
    set(key, value) { S[key] = value; save(); },
    reset() { Object.assign(S, DEF); save(); },
    // Should this round be DRAWN? (The round itself always flies: this only decides whether it has a mesh you can see.) A fast gun is thinned out so a Minigun does not
    // put dozens of glowing objects in the air a second: your own at most one in ~45 ms, other people's one in ~70 ms, twice as sparse on low quality.
    tracerVisible(weaponId, isOwn, who) {
      if (S.tracer === 'off') return false;
      const now = performance.now(), key = (who || (isOwn ? 'me' : '?')) + '|' + weaponId, gap = (isOwn ? 45 : 70) * (S.quality === 'low' ? 2 : 1);
      if (lastTracer[key] && now - lastTracer[key] < gap) return false;
      lastTracer[key] = now;
      return true;
    },
  };

  // ── the thin tracer: a streak with a bright white-yellow core and fading edges, shared geometry and materials (built once per size) ──
  const streaks = new Map();
  FX.buildStreak = function (color, r, rifle) {
    const key = (rifle ? 'r' : 'p') + '|' + r.toFixed(3);
    let P = streaks.get(key);
    if (!P) {
      const len = rifle ? 7.5 : 5.5, R = Math.min(0.018, Math.max(0.007, r * 0.22));
      const mk = (radius, l, hot) => {
        const g = new THREE.CylinderGeometry(radius, 0.0015, l, 6, 6, true);
        g.translate(0, -l / 2, 0);                                   // the head at the origin, the streak running back from it
        const pos = g.attributes.position, col = new Float32Array(pos.count * 3);
        for (let i = 0; i < pos.count; i++) {
          const t = Math.max(0, Math.min(1, 1 + pos.getY(i) / l));   // 0 at the tail, 1 at the head
          const k = Math.pow(t, 1.5), h = Math.max(0, (t - 0.6) / 0.4);
          col[i * 3] = k * (1.0); col[i * 3 + 1] = k * (hot ? 0.98 : 0.86 + 0.1 * h); col[i * 3 + 2] = k * (hot ? 0.88 : 0.52 + 0.3 * h);
        }
        g.setAttribute('color', new THREE.BufferAttribute(col, 3));
        return g;
      };
      const mat = () => new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      P = { outer: mk(R, len, false), core: mk(R * 0.4, len * 0.7, true), outerM: mat(), coreM: mat() };
      streaks.set(key, P);
    }
    const g = new THREE.Group();
    g.add(new THREE.Mesh(P.outer, P.outerM), new THREE.Mesh(P.core, P.coreM));
    g._alignToDir = true;
    return g;
  };

  // ── HUD ──
  const css = `
  /* health: bottom-left, big readable number, a thin bar that eases (never jumps) */
  body:not(.touch-ui) #health-bar { left: 26px; bottom: 26px; width: 236px; padding: 9px 22px 11px 14px; display: grid; grid-template-columns: auto 1fr; align-items: end; column-gap: 12px; row-gap: 6px;
    background: linear-gradient(90deg, rgba(7,11,17,.78), rgba(7,11,17,.38)); border-left: 3px solid #3fe39a; clip-path: polygon(0 0, 100% 0, calc(100% - 14px) 100%, 0 100%);
    transition: border-color .18s ease, background .18s ease; font-family: "Segoe UI", system-ui, -apple-system, sans-serif; }
  body:not(.touch-ui) #health-label { grid-column: 1 / 3; grid-row: 1; margin: 0; font-size: 10px; font-weight: 700; letter-spacing: .26em; color: #8ea2b6; }
  body:not(.touch-ui) #health-num { grid-column: 1; grid-row: 2; margin: 0; font-size: 46px; line-height: .92; font-weight: 800; font-variant-numeric: tabular-nums; letter-spacing: -.01em; text-shadow: 0 2px 8px rgba(0,0,0,.65); transition: color .18s ease, transform .18s ease; transform-origin: 0 100%; }
  body:not(.touch-ui) #health-track { grid-column: 1 / 3; grid-row: 3; width: auto; height: 5px; border-radius: 0; background: rgba(255,255,255,.13); }
  body:not(.touch-ui) #health-fill { border-radius: 0; background: linear-gradient(90deg, #22c07a, #55f0b0); transition: width .2s ease-out, background .2s ease; }
  #health-bar[data-hp="low"]  { border-left-color: #ffb43a; } #health-bar[data-hp="low"]  #health-fill { background: linear-gradient(90deg, #e58a12, #ffc65a); }
  #health-bar[data-hp="crit"] { border-left-color: #ff4d4d; } #health-bar[data-hp="crit"] #health-fill { background: linear-gradient(90deg, #d93030, #ff7070); } #health-bar[data-hp="crit"] #health-num { color: #ff6b6b; }
  #health-bar.cv-hit  { border-left-color: #ff3b3b; background: linear-gradient(90deg, rgba(120,12,12,.8), rgba(7,11,17,.38)); } #health-bar.cv-hit #health-num { color: #ff5a5a; transform: scale(1.06); }
  #health-bar.cv-heal { border-left-color: #6dffc0; } #health-bar.cv-heal #health-num { color: #7dffc8; }

  /* ammo: bottom-right, a big magazine count, the reserve small beside it, reload status under it */
  body:not(.touch-ui) #ammo { right: 26px; bottom: 26px; min-width: 150px; padding: 8px 14px 9px 24px; display: flex; flex-wrap: wrap; align-items: baseline; justify-content: flex-end; column-gap: 8px;
    background: linear-gradient(270deg, rgba(7,11,17,.78), rgba(7,11,17,.38)); border-right: 3px solid #e8eef5; clip-path: polygon(14px 0, 100% 0, 100% 100%, 0 100%); font-family: "Segoe UI", system-ui, -apple-system, sans-serif; transition: border-color .18s ease; }
  body:not(.touch-ui) #ammo-gun { flex: 0 0 100%; text-align: right; margin: 0 0 2px; font-size: 11px; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; color: #8ea2b6; }
  body:not(.touch-ui) #ammo-count { font-size: 56px; line-height: .9; font-weight: 800; letter-spacing: -.01em; font-variant-numeric: tabular-nums; text-shadow: 0 2px 8px rgba(0,0,0,.7); transition: color .15s ease; transform-origin: 100% 100%; }
  body:not(.touch-ui) #ammo-reserve { font-size: 19px; font-weight: 700; color: #9aaabb; font-variant-numeric: tabular-nums; text-shadow: 0 1px 4px rgba(0,0,0,.7); }
  #ammo.cv-tick #ammo-count { transform: scale(1.07); transition: none; }
  #ammo.reloading { border-right-color: #ffd23f; } #ammo.reloading #ammo-count { color: #8a93a0; }
  #ammo.reloading:after { content: "RELOADING"; flex: 0 0 100%; text-align: right; margin-top: 4px; font-size: 11px; font-weight: 800; letter-spacing: .3em; color: #ffd23f; animation: cvBlink .6s ease-in-out infinite alternate; }
  #ammo.cv-reloaded { border-right-color: #7dffc8; } #ammo.cv-reloaded #ammo-count { color: #7dffc8; }
  @keyframes cvBlink { from { opacity: .55 } to { opacity: 1 } }
  body:not(.touch-ui) #ability-hud { bottom: 150px; right: 26px; }    /* (rides above the taller ammo block) */
  /* the old centre-screen RELOADING text gets out of the way: the ammo block says it */
  body:not(.touch-ui) #reload-flash { display: none !important; }

  /* kill feed: upper right, newest at the bottom, short and quiet */
  #killfeed .kf-row { animation-duration: .16s; }
  @media (prefers-reduced-motion: reduce) { #health-bar, #health-num, #health-fill, #ammo, #ammo-count { transition: none !important; } #ammo.reloading:after { animation: none; } }
  `;
  const st = document.createElement('style'); st.id = 'combat-visuals-style'; st.textContent = css; document.head.appendChild(st);

  const $ = id => document.getElementById(id);
  const num = el => { const v = parseInt(((el && el.textContent) || '').replace(/[^0-9-]/g, ''), 10); return Number.isFinite(v) ? v : null; };
  const flash = (el, cls, ms) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); clearTimeout(el['_t' + cls]); el['_t' + cls] = setTimeout(() => el.classList.remove(cls), ms); };

  function wireHud() {
    const hb = $('health-bar'), hn = $('health-num'), am = $('ammo'), ac = $('ammo-count'), rf = $('reload-flash'), kf = () => $('killfeed');
    if (!hb || !hn || !am || !ac) return false;
    // health: colour by how much is left, a red flash when it drops, a green one when it rises
    let hp = num(hn), maxHp = 100;
    const hpLook = () => { const v = num(hn); if (v == null) return; maxHp = Math.max(maxHp, v); hb.dataset.hp = v <= maxHp * 0.2 ? 'crit' : v <= maxHp * 0.4 ? 'low' : 'ok'; };
    new MutationObserver(() => { const v = num(hn); if (v == null) return; if (hp != null) { if (v < hp) flash(hb, 'cv-hit', 220); else if (v > hp) flash(hb, 'cv-heal', 240); } hp = v; hpLook(); }).observe(hn, { childList: true, characterData: true, subtree: true });
    hpLook();
    // ammo: a tiny tick on every change (at most once per 80 ms, so a full-auto gun does not strobe it)
    let ammo = num(ac), tickAt = 0;
    new MutationObserver(() => { const v = num(ac); if (v == null) return; const now = performance.now(); if (v !== ammo && now - tickAt > 80) { tickAt = now; flash(am, 'cv-tick', 90); } ammo = v; }).observe(ac, { childList: true, characterData: true, subtree: true });
    // reload: the ammo block says RELOADING while the old banner is up, and flashes green for 220 ms when it ends
    if (rf) {
      let was = false;
      const reloading = () => rf.style.display === 'block';        // (game.js shows the banner with an inline display:block and hides it with display:none)
      const sync = () => { const on = reloading(); if (on !== was) { am.classList.toggle('reloading', on); if (was && !on) flash(am, 'cv-reloaded', 220); was = on; } };
      new MutationObserver(sync).observe(rf, { attributes: true, attributeFilter: ['style', 'class'] });
    }
    // kill feed: at most five rows on screen
    const trim = () => { const box = kf(); if (!box) return; const rows = box.querySelectorAll('.kf-row:not(.out)'); for (let i = 0; i < rows.length - 5; i++) rows[i].classList.add('out'); };
    new MutationObserver(trim).observe(document.body, { childList: true, subtree: true });
    return true;
  }
  if (!wireHud()) { document.addEventListener('DOMContentLoaded', wireHud); window.addEventListener('load', wireHud); }

  // ── settings, added to the SHOOT FX panel each time it is (re)built ──
  function addSettings(panel) {
    if (!panel || panel.querySelector('#cv-section')) return;
    const sec = document.createElement('div'); sec.id = 'cv-section'; sec.style.cssText = 'margin-top:16px;padding-top:12px;border-top:1px solid #553388;';
    const sel = (id, label, opts, val) => `<label style="display:flex;justify-content:space-between;align-items:center;margin:8px 0;font-size:12px;color:#ddccff;"><span>${label}</span>
      <select id="${id}" style="background:#120a1c;color:#fff;border:1px solid #6a44aa;border-radius:3px;padding:3px 6px;font-family:inherit;">${opts.map(([v, t]) => `<option value="${v}"${String(v) === String(val) ? ' selected' : ''}>${t}</option>`).join('')}</select></label>`;
    sec.innerHTML = `<div style="font-size:13px;letter-spacing:3px;color:#cc99ff;margin-bottom:6px;">✦ COMBAT VISUALS</div>`
      + sel('cv-muzzle', 'Muzzle flash', [[0, 'Off'], [0.6, 'Small'], [1, 'Normal'], [1.3, 'Big']], S.muzzle)
      + sel('cv-tracer', 'Bullet tracers', [['streak', 'Thin streak'], ['classic', 'Classic bullet'], ['off', 'Off']], S.tracer)
      + sel('cv-quality', 'Effect quality', [['high', 'High'], ['medium', 'Medium'], ['low', 'Low (best FPS)']], S.quality);
    const anchor = panel.querySelector('#sfx-test'); const row = anchor && anchor.parentElement;
    if (row) panel.insertBefore(sec, row); else panel.appendChild(sec);
    sec.querySelector('#cv-muzzle').addEventListener('change', e => FX.set('muzzle', parseFloat(e.target.value)));
    sec.querySelector('#cv-tracer').addEventListener('change', e => FX.set('tracer', e.target.value));
    sec.querySelector('#cv-quality').addEventListener('change', e => FX.set('quality', e.target.value));
  }
  new MutationObserver(() => {
    const p = $('shoot-fx-panel');
    if (p && !p._cvWatch) { p._cvWatch = true; new MutationObserver(() => addSettings(p)).observe(p, { childList: true }); }
    if (p) addSettings(p);
  }).observe(document.body, { childList: true });
})();
