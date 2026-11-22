// 🧱 Maps from the map maker, inside the game. Reads the maps saved in this browser (see voxel-core.js), builds each one as a map the game can play (a mesh, hidden-step colliders, the ramp list, spawn
// rectangles), adds it to the map picker, puts a MAP MAKER link in MORE, and runs  index.html?vxplay=<id>  (the editor's PLAY / TEST button): a free-for-all against bots on that map.
(() => {
  'use strict';
  const V = window.PVP_VOXEL;
  if (!V || typeof registerMap !== 'function') return;

  function buildInto(doc) {
    const id = doc.id, W = doc.nx * doc.cs, D = doc.nz * doc.cs;
    if (!MAP_GROUPS[id]) registerMap(id); else clearMapGroup(id);
    setMapBounds(id, W, D);
    const grp = MAP_GROUPS[id];
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshLambertMaterial({ color: doc.ground }));
    ground.rotation.x = -Math.PI / 2; ground.userData.mapStatic = true; grp.add(ground);
    if (doc.walls) for (const [x, z, w, d] of [[0, -D / 2 - 0.5, W + 2, 1], [0, D / 2 + 0.5, W + 2, 1], [-W / 2 - 0.5, 0, 1, D], [W / 2 + 0.5, 0, 1, D]]) addMapBox(id, x, 6, z, w, 12, d, 0x464646);
    const mesh = new THREE.Mesh(V.buildGeometry(THREE, doc), new THREE.MeshLambertMaterial({ vertexColors: true }));
    mesh.castShadow = true; mesh.receiveShadow = true; grp.add(mesh);
    const col = V.buildColliders(doc);
    for (const b of col.boxes) { const box = new THREE.Box3(new THREE.Vector3(b.x0, b.y0, b.z0), new THREE.Vector3(b.x1, b.y1, b.z1)); if (b.y1 > 14) box.tall = true; MAP_COLLIDERS[id].push(box); }
    for (const r of col.ramps) if (r.y === 0) registerRamp(id, { x0: r.x0, z0: r.z0, ux: r.ux, uz: r.uz, run: r.run, rise: r.rise, halfW: r.halfW });      // (a slide gains speed down a ramp)
    // spawn rectangles: the markers' spread, or a strip at each end
    const o = V.origin(doc), rect = team => {
      const ms = doc.markers.filter(m => m[0] === team); if (!ms.length) return null;
      const xs = ms.map(m => o.x + (m[1] + 0.5) * doc.cs), zs = ms.map(m => o.z + (m[3] + 0.5) * doc.cs);
      return { x0: Math.min(...xs) - 1.2, x1: Math.max(...xs) + 1.2, z0: Math.min(...zs) - 1.2, z1: Math.max(...zs) + 1.2 };
    };
    const hx = Math.min(8, W / 2 - 3);
    MAP_SPAWNS[id] = { ally: rect('a') || { x0: -hx, x1: hx, z0: D / 2 - 7, z1: D / 2 - 3 }, enemy: rect('b') || { x0: -hx, x1: hx, z0: -D / 2 + 3, z1: -D / 2 + 7 } };
    grp._skyColor = doc.sky; grp._customLabel = doc.name;
    MAP_DESCS[id] = 'Map Maker — ' + doc.cells.length + ' blocks, ' + W + ' x ' + D + ' m';
    return doc;
  }

  function syncCards() {
    const row = document.getElementById('map-row'); if (!row) return;
    row.querySelectorAll('.map-card[data-vx="1"]').forEach(el => el.remove());
    for (const doc of V.loadAll()) {
      const card = document.createElement('div');
      card.className = 'map-card'; card.dataset.map = doc.id; card.dataset.vx = '1'; card.textContent = '🧱 ' + doc.name.toUpperCase();
      card.style.cssText = 'padding:6px 14px;border:2px solid #4fd0c4;color:#7fe6dc;cursor:pointer;font-size:11px;letter-spacing:2px;border-radius:4px;';
      card.addEventListener('click', () => { selectMapPick(doc.id); closePickDialogs(); });
      row.appendChild(card);
    }
  }
  function loadAll() {
    for (const doc of V.loadAll()) { try { buildInto(doc); } catch (e) { console.warn('[map maker] could not build', doc.name, e); } }
    syncCards();
  }

  // PLAY / TEST: a free-for-all against bots on the map. It starts locally (no lobby, no other players) through the game's own spawn code, so bots, weapons and movement are the real thing.
  function playMap(id) {
    const doc = V.loadAll().find(m => m.id === id);
    if (!doc) { alert('That map is not saved in this browser.'); return; }
    buildInto(doc);
    selectedModeConfig = GAME_MODE_CONFIGS['ffa5'];
    selectedMap = pickedMap = id; pvpMatch = null;
    try { sanitizeLoadoutSlots(); } catch (e) {}
    for (const sid of ['overlay', 'mode-screen', 'loadout-screen']) { const el = document.getElementById(sid); if (el) el.style.display = 'none'; }
    try { resetCombatResources(); } catch (e) {}
    if (!gameStarted) { gameStarted = true; spawnGameBots(); requestPointerLockSafe(); startLoop(); }
  }

  // MORE -> MAP MAKER
  function addLink() {
    const wiki = document.querySelector('#more-menu a[href="wiki.html"]');
    if (!wiki || document.getElementById('map-maker-link')) return;
    const a = document.createElement('a'); a.id = 'map-maker-link'; a.href = 'map-maker.html'; a.target = '_blank'; a.textContent = '🧱 MAP MAKER'; wiki.after(a);
  }

  loadAll(); addLink();
  window.PVP_VOXEL_GAME = { loadAll, buildInto, playMap };

  // ?vxplay=<id>: the editor's PLAY button. The game wants a click before it can capture the mouse, so: one click anywhere, then you are on your map.
  const want = new URLSearchParams(location.search).get('vxplay');
  if (want) {
    const bar = document.createElement('div');
    bar.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(6,16,15,.9);color:#7fe6dc;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;font:16px "Courier New",monospace;letter-spacing:3px;text-align:center;cursor:pointer;';
    bar.innerHTML = '<div style="font-size:26px;">🧱 TEST YOUR MAP</div><div style="font-size:13px;opacity:.8;">free-for-all against bots · click to start</div>';
    bar.addEventListener('click', () => { bar.remove(); try { playMap(want); } catch (e) { console.error(e); alert('Could not start the test: ' + e.message); } });
    document.body.appendChild(bar);
  }
})();
