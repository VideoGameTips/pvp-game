// 🧱 The map maker: a 3D grid, six shapes, orbit camera. Everything about the shapes (geometry, colliders, saving) lives in voxel-core.js, shared with the game.
(() => {
  'use strict';
  const V = window.PVP_VOXEL, T = THREE;
  const $ = id => document.getElementById(id);
  const canvas = $('view');
  const renderer = new T.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(55, 1, 0.1, 600);
  scene.add(new T.AmbientLight(0xffffff, 0.62));
  const sun = new T.DirectionalLight(0xffffff, 0.85); sun.position.set(0.5, 1, 0.35); scene.add(sun);
  const sun2 = new T.DirectionalLight(0xbcd0ff, 0.25); sun2.position.set(-0.6, 0.3, -0.7); scene.add(sun2);

  // ── state ──
  let doc = V.cleanDoc(V.loadAll().slice(-1)[0] || V.defaultDoc('My Map'));
  const sel = { shape: 0, rot: 0, flip: 0, color: 0, tool: 'place', layer: 0 };
  let cellIndex = new Map();                                    // 'x,y,z' -> index in doc.cells
  let mapMesh = null, ghost = null, hover = null, markerGroup = new T.Group(), gridLines = null, boundsBox = null, groundPlane = null;
  let dirty = true, saveTimer = 0, undoStack = [], redoStack = [], stroke = null;
  scene.add(markerGroup);
  const key = (x, y, z) => x + ',' + y + ',' + z;

  // ── the view: orbit round a target ──
  const cam = { yaw: 0.8, pitch: 0.7, dist: 34, tx: 0, ty: 0, tz: 0 };
  function placeCamera() {
    const cp = Math.cos(cam.pitch);
    camera.position.set(cam.tx + Math.sin(cam.yaw) * cp * cam.dist, cam.ty + Math.sin(cam.pitch) * cam.dist, cam.tz + Math.cos(cam.yaw) * cp * cam.dist);
    camera.lookAt(cam.tx, cam.ty, cam.tz);
  }
  function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize); resize();

  // ── the UI ──
  const shapeButtons = [];
  V.SHAPES.forEach((s, i) => {
    const b = document.createElement('button'); b.title = V.SHAPE_NAMES[s] + '  (' + (i + 1) + ')';
    const c = document.createElement('canvas'); c.width = c.height = 72; b.appendChild(c);
    const t = document.createElement('div'); t.textContent = V.SHAPE_NAMES[s]; b.appendChild(t);
    b.onclick = () => { sel.shape = i; if (sel.tool !== 'erase') setTool('place'); refreshUI(); };
    $('shapes').appendChild(b); shapeButtons.push({ b, c });
  });
  const colorButtons = V.PALETTE.map((hex, i) => {
    const b = document.createElement('button'); b.style.background = '#' + hex.toString(16).padStart(6, '0');
    b.onclick = () => { sel.color = i; refreshUI(); }; $('colors').appendChild(b); return b;
  });
  function setTool(t) { sel.tool = t; refreshUI(); }
  function refreshUI() {
    shapeButtons.forEach(({ b, c }, i) => { b.classList.toggle('on', sel.shape === i && sel.tool === 'place'); V.drawIcon(c, V.SHAPES[i], sel.rot, sel.flip, V.PALETTE[sel.color]); });
    colorButtons.forEach((b, i) => b.classList.toggle('on', sel.color === i));
    for (const [id, t] of [['tPlace', 'place'], ['tErase', 'erase'], ['tA', 'spawnA'], ['tB', 'spawnB']]) $(id).classList.toggle('on', sel.tool === t);
    $('layer').textContent = sel.layer;
    $('flip').classList.toggle('on', !!sel.flip);
    rebuildGhost();
    updateStatus();
  }
  function updateStatus(extra) {
    const t = sel.tool === 'place' ? V.SHAPE_NAMES[V.SHAPES[sel.shape]] + '  turn ' + sel.rot * 90 + '°' + (sel.flip ? '  flipped' : '') : sel.tool === 'erase' ? 'ERASE' : sel.tool === 'spawnA' ? 'SPAWN A (blue team)' : 'SPAWN B (red team)';
    $('status').textContent = t + '   ·   layer ' + sel.layer + '   ·   ' + doc.cells.length + ' blocks' + (hover ? '   ·   cell ' + hover.x + ',' + hover.y + ',' + hover.z : '') + (extra ? '   ·   ' + extra : '');
  }
  function fillDocUI() {
    $('name').value = doc.name; $('nx').value = doc.nx; $('ny').value = doc.ny; $('nz').value = doc.nz; $('cs').value = String(doc.cs); $('walls').value = doc.walls ? '1' : '0';
    $('sky').value = '#' + doc.sky.toString(16).padStart(6, '0'); $('ground').value = '#' + doc.ground.toString(16).padStart(6, '0');
    const list = V.loadAll(); const sel2 = $('maps'); sel2.innerHTML = '';
    for (const m of list) { const o = document.createElement('option'); o.value = m.id; o.textContent = m.name + '  (' + m.cells.length + ')'; sel2.appendChild(o); }
    sel2.value = doc.id;
  }

  // ── building the scene from the doc ──
  function reindex() { cellIndex = new Map(); doc.cells.forEach((c, i) => cellIndex.set(key(c[0], c[1], c[2]), i)); }
  const mapMat = new T.MeshLambertMaterial({ vertexColors: true });
  function rebuild() {
    dirty = false; reindex();
    if (mapMesh) { scene.remove(mapMesh); mapMesh.geometry.dispose(); }
    mapMesh = new T.Mesh(V.buildGeometry(T, doc), mapMat); scene.add(mapMesh);
    // the floor, the bounds and the layer grid
    const W = doc.nx * doc.cs, D = doc.nz * doc.cs, H = doc.ny * doc.cs;
    if (groundPlane) { scene.remove(groundPlane); groundPlane.geometry.dispose(); groundPlane.material.dispose(); }
    groundPlane = new T.Mesh(new T.PlaneGeometry(W, D), new T.MeshLambertMaterial({ color: doc.ground })); groundPlane.rotation.x = -Math.PI / 2; groundPlane.position.y = -0.01; scene.add(groundPlane);
    scene.background = new T.Color(doc.sky);
    if (boundsBox) { scene.remove(boundsBox); boundsBox.geometry.dispose(); }
    boundsBox = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(W, H, D)), new T.LineBasicMaterial({ color: 0x5d7a99, transparent: true, opacity: 0.55 })); boundsBox.position.y = H / 2; scene.add(boundsBox);
    rebuildGrid(); rebuildMarkers();
    updateStatus();
  }
  let gridOn = true;
  function rebuildGrid() {
    if (gridLines) { scene.remove(gridLines); gridLines.geometry.dispose(); gridLines = null; }
    if (!gridOn) return;
    const o = V.origin(doc), pts = [], y = sel.layer * doc.cs + 0.02;
    for (let i = 0; i <= doc.nx; i++) pts.push(o.x + i * doc.cs, y, o.z, o.x + i * doc.cs, y, o.z + doc.nz * doc.cs);
    for (let i = 0; i <= doc.nz; i++) pts.push(o.x, y, o.z + i * doc.cs, o.x + doc.nx * doc.cs, y, o.z + i * doc.cs);
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
    gridLines = new T.LineSegments(g, new T.LineBasicMaterial({ color: 0xaac7a0, transparent: true, opacity: 0.32 })); scene.add(gridLines);
  }
  function rebuildMarkers() {
    while (markerGroup.children.length) { const c = markerGroup.children.pop(); c.geometry && c.geometry.dispose(); }
    const o = V.origin(doc);
    for (const [t, x, y, z] of doc.markers) {
      const m = new T.Mesh(new T.CylinderGeometry(doc.cs * 0.3, doc.cs * 0.3, doc.cs * 1.6, 12), new T.MeshBasicMaterial({ color: t === 'a' ? 0x4aa3ff : 0xff5a5a, transparent: true, opacity: 0.75 }));
      m.position.set(o.x + (x + 0.5) * doc.cs, y * doc.cs + doc.cs * 0.8, o.z + (z + 0.5) * doc.cs); markerGroup.add(m);
    }
  }
  const ghostMatOk = new T.MeshBasicMaterial({ color: 0x35ff65, transparent: true, opacity: 0.42, depthWrite: false }), ghostMatErase = new T.MeshBasicMaterial({ color: 0xff4040, transparent: true, opacity: 0.35, depthWrite: false });
  function rebuildGhost() {
    if (ghost) { scene.remove(ghost); ghost.traverse(o => o.geometry && o.geometry.dispose()); ghost = null; }
    if (sel.tool === 'place') {
      const one = { cs: doc.cs, nx: 1, ny: 1, nz: 1, cells: [[0, 0, 0, sel.shape, sel.rot, sel.flip, sel.color]] };
      const g = V.buildGeometry(T, one); ghost = new T.Group();
      ghost.add(new T.Mesh(g, ghostMatOk)); ghost.add(new T.LineSegments(new T.EdgesGeometry(g, 20), new T.LineBasicMaterial({ color: 0xcfffd8 })));
    } else {
      const g = new T.BoxGeometry(doc.cs * 1.02, doc.cs * 1.02, doc.cs * 1.02); g.translate(0, doc.cs / 2, 0);
      ghost = new T.Group(); ghost.add(new T.Mesh(g, sel.tool === 'erase' ? ghostMatErase : new T.MeshBasicMaterial({ color: sel.tool === 'spawnA' ? 0x4aa3ff : 0xff5a5a, transparent: true, opacity: 0.4, depthWrite: false })));
    }
    ghost.visible = false; scene.add(ghost);
  }

  // ── what is under the mouse ──
  const ray = new T.Raycaster(), mouse = new T.Vector2();
  const plane = new T.Plane(new T.Vector3(0, 1, 0), 0);
  function pick(ev) {
    mouse.set((ev.clientX / innerWidth) * 2 - 1, -(ev.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    const o = V.origin(doc), cs = doc.cs;
    const inGrid = (x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < doc.nx && y < doc.ny && z < doc.nz;
    let best = null, bestT = Infinity;
    if (mapMesh) {
      const hits = ray.intersectObject(mapMesh);
      if (hits.length) {
        const h = hits[0], ci = mapMesh.geometry.userData.triCell[h.faceIndex], c = doc.cells[ci];
        if (c) {
          const n = h.face.normal, ax = Math.abs(n.x) > Math.abs(n.y) && Math.abs(n.x) > Math.abs(n.z) ? 'x' : Math.abs(n.z) > Math.abs(n.y) ? 'z' : 'y', sgn = Math.sign(n[ax]) || 1;
          const nb = { x: c[0] + (ax === 'x' ? sgn : 0), y: c[1] + (ax === 'y' ? sgn : 0), z: c[2] + (ax === 'z' ? sgn : 0) };
          best = { hit: { x: c[0], y: c[1], z: c[2] }, next: nb }; bestT = h.distance;
        }
      }
    }
    plane.constant = -sel.layer * cs;
    const p = new T.Vector3();
    if (ray.ray.intersectPlane(plane, p)) {
      const d = p.distanceTo(ray.ray.origin);
      const x = Math.floor((p.x - o.x) / cs), z = Math.floor((p.z - o.z) / cs);
      if (d < bestT && x >= 0 && z >= 0 && x < doc.nx && z < doc.nz) { best = { hit: null, next: { x, y: sel.layer, z } }; bestT = d; }
    }
    if (!best) return null;
    if (sel.tool === 'erase') return best.hit ? { x: best.hit.x, y: best.hit.y, z: best.hit.z, erase: true } : null;
    const nx = best.next;
    return inGrid(nx.x, nx.y, nx.z) ? { x: nx.x, y: nx.y, z: nx.z, eraseHit: best.hit } : null;
  }
  function eraseTarget(ev) {                                                    // for the right button: the block under the pointer
    const keep = sel.tool; sel.tool = 'erase'; const t = pick(ev); sel.tool = keep; return t;
  }

  // ── editing, with undo ──
  function setCell(x, y, z, cell) {                                             // cell: [s, r, f, col] or null; records the change in the open stroke
    const k = key(x, y, z), i = cellIndex.get(k), before = i != null ? doc.cells[i].slice() : null;
    const after = cell ? [x, y, z, cell[0], cell[1], cell[2], cell[3]] : null;
    if (JSON.stringify(before) === JSON.stringify(after)) return false;
    if (stroke) stroke.push({ k, before, after });
    if (i != null) doc.cells.splice(i, 1);
    if (after) doc.cells.push(after);
    reindex(); dirty = true; scheduleSave(); return true;
  }
  const beginStroke = () => { stroke = []; };
  const endStroke = () => { if (stroke && stroke.length) { undoStack.push(stroke); redoStack = []; if (undoStack.length > 300) undoStack.shift(); } stroke = null; };
  function applyChanges(list, forward) {
    for (const ch of forward ? list : list.slice().reverse()) {
      const [x, y, z] = ch.k.split(',').map(Number), i = cellIndex.get(ch.k), want = forward ? ch.after : ch.before;
      if (i != null) doc.cells.splice(i, 1);
      if (want) doc.cells.push(want.slice());
      reindex();
    }
    dirty = true; scheduleSave();
  }
  const undo = () => { const s = undoStack.pop(); if (s) { applyChanges(s, false); redoStack.push(s); } };
  const redo = () => { const s = redoStack.pop(); if (s) { applyChanges(s, true); undoStack.push(s); } };
  function act(t, erase) {
    if (!t) return;
    if (erase || sel.tool === 'erase') { setCell(t.x, t.y, t.z, null); return; }
    if (sel.tool === 'place') { setCell(t.x, t.y, t.z, [sel.shape, sel.rot, sel.flip, sel.color]); return; }
    // a spawn marker: click again on the same cell to take it away
    const team = sel.tool === 'spawnA' ? 'a' : 'b', i = doc.markers.findIndex(m => m[1] === t.x && m[2] === t.y && m[3] === t.z);
    if (i >= 0) doc.markers.splice(i, 1); else doc.markers.push([team, t.x, t.y, t.z]);
    rebuildMarkers(); scheduleSave();
  }
  function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(() => saveNow(true), 700); }
  function saveNow(quiet) {
    doc.name = $('name').value.trim() || doc.name;
    const c = V.saveDoc(doc); if (!c) { updateStatus('could not save (storage full?)'); return false; }
    fillDocUI(); updateInfo(); if (!quiet) updateStatus('saved'); return true;
  }
  function updateInfo() {
    const col = V.buildColliders(doc);
    $('info').textContent = doc.cells.length + ' blocks · ' + col.boxes.length + ' collision boxes' + (col.boxes.length > 4000 ? ' (a lot: the game may slow down)' : '') + ' · ' + doc.markers.length + ' spawn markers';
  }

  // ── mouse + keyboard ──
  let down = null, lastKey = '';
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('mousedown', e => {
    down = { b: e.button, x: e.clientX, y: e.clientY, moved: false, shift: e.shiftKey };
    if (e.button === 0) {
      beginStroke(); const t = pick(e); if (t) { lastKey = key(t.x, t.y, t.z); act(t); }
    }
  });
  addEventListener('mousemove', e => {
    if (down && (down.b === 2 || down.b === 1)) {
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) down.moved = true;
      if (down.moved) {
        if (down.b === 1 || down.shift) {                                       // pan
          const k = cam.dist * 0.0016, rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw), fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw);
          cam.tx -= (rx * dx - fx * dy) * k; cam.tz -= (rz * dx - fz * dy) * k;
        } else { cam.yaw -= dx * 0.006; cam.pitch = Math.max(0.05, Math.min(1.5, cam.pitch + dy * 0.006)); }
        down.x = e.clientX; down.y = e.clientY;
      }
    }
    const t = (e.target === canvas) ? pick(e) : null;
    hover = t; if (ghost) { ghost.visible = !!t; if (t) { const o = V.origin(doc); ghost.position.set(o.x + (t.x + 0.5) * doc.cs, t.y * doc.cs, o.z + (t.z + 0.5) * doc.cs); } }
    if (down && down.b === 0 && t && sel.tool !== 'spawnA' && sel.tool !== 'spawnB') { const k = key(t.x, t.y, t.z); if (k !== lastKey) { lastKey = k; act(t); } }
    updateStatus();
  });
  addEventListener('mouseup', e => {
    if (!down) return;
    if (down.b === 2 && !down.moved) { const t = eraseTarget(e); beginStroke(); act(t, true); endStroke(); }
    if (down.b === 0) endStroke();
    down = null;
  });
  canvas.addEventListener('wheel', e => { e.preventDefault(); cam.dist = Math.max(3, Math.min(260, cam.dist * Math.exp(e.deltaY * 0.0011))); }, { passive: false });
  const keysDown = new Set();
  addEventListener('keydown', e => {
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
    keysDown.add(e.code);
    if (e.ctrlKey || e.metaKey) { if (e.code === 'KeyZ') { e.preventDefault(); e.shiftKey ? redo() : undo(); } else if (e.code === 'KeyY') { e.preventDefault(); redo(); } else if (e.code === 'KeyS') { e.preventDefault(); saveNow(); } return; }
    if (/^Digit[1-6]$/.test(e.code)) { sel.shape = +e.code.slice(5) - 1; if (sel.tool !== 'erase') sel.tool = 'place'; refreshUI(); }
    else if (e.code === 'KeyR') { sel.rot = (sel.rot + (e.shiftKey ? 3 : 1)) & 3; refreshUI(); }
    else if (e.code === 'KeyF') { sel.flip ^= 1; refreshUI(); }
    else if (e.code === 'KeyC') { sel.color = (sel.color + 1) % V.PALETTE.length; refreshUI(); }
    else if (e.code === 'KeyX') { setTool(sel.tool === 'erase' ? 'place' : 'erase'); }
    else if (e.code === 'BracketRight' || e.code === 'PageUp') { sel.layer = Math.min(doc.ny - 1, sel.layer + 1); rebuildGrid(); refreshUI(); }
    else if (e.code === 'BracketLeft' || e.code === 'PageDown') { sel.layer = Math.max(0, sel.layer - 1); rebuildGrid(); refreshUI(); }
    else if (e.code === 'KeyG') { gridOn = !gridOn; rebuildGrid(); }
  });
  addEventListener('keyup', e => keysDown.delete(e.code));
  $('rot').onclick = () => { sel.rot = (sel.rot + 1) & 3; refreshUI(); };
  $('flip').onclick = () => { sel.flip ^= 1; refreshUI(); };
  $('tPlace').onclick = () => setTool('place'); $('tErase').onclick = () => setTool('erase'); $('tA').onclick = () => setTool('spawnA'); $('tB').onclick = () => setTool('spawnB');
  $('layUp').onclick = () => { sel.layer = Math.min(doc.ny - 1, sel.layer + 1); rebuildGrid(); refreshUI(); };
  $('layDown').onclick = () => { sel.layer = Math.max(0, sel.layer - 1); rebuildGrid(); refreshUI(); };

  // ── the document: new / load / save / size / share / play ──
  function openDoc(d) { doc = V.cleanDoc(d); sel.layer = Math.min(sel.layer, doc.ny - 1); undoStack = []; redoStack = []; reindex(); fillDocUI(); dirty = true; resetView(); rebuildGhost(); refreshUI(); updateInfo(); }
  function resetView() { cam.tx = 0; cam.tz = 0; cam.ty = 0; cam.dist = Math.max(14, Math.max(doc.nx, doc.nz) * doc.cs * 0.95); }
  $('new').onclick = () => { if (!doc.cells.length || confirm('Start a new map? (the current one stays saved)')) { saveNow(true); openDoc(V.defaultDoc($('name').value ? 'New Map' : 'My Map')); saveNow(true); } };
  $('save').onclick = () => saveNow();
  $('load').onclick = () => { const m = V.loadAll().find(x => x.id === $('maps').value); if (m) { saveNow(true); openDoc(m); } };
  $('del').onclick = () => { if (confirm('Delete "' + doc.name + '"?')) { V.deleteDoc(doc.id); const rest = V.loadAll(); openDoc(rest.length ? rest[rest.length - 1] : V.defaultDoc('My Map')); saveNow(true); } };
  $('name').onchange = () => { doc.name = $('name').value.trim() || doc.name; scheduleSave(); };
  for (const id of ['nx', 'ny', 'nz', 'cs', 'walls', 'sky', 'ground']) $(id).onchange = () => {
    const hex = v => parseInt(v.slice(1), 16);
    const d = { ...doc, nx: +$('nx').value, ny: +$('ny').value, nz: +$('nz').value, cs: +$('cs').value, walls: $('walls').value === '1', sky: hex($('sky').value), ground: hex($('ground').value) };
    const changedCs = d.cs !== doc.cs;
    if (changedCs && doc.cells.length && !confirm('Changing the cell size rescales the whole map. Continue?')) { $('cs').value = String(doc.cs); return; }
    doc = V.cleanDoc(d); sel.layer = Math.min(sel.layer, doc.ny - 1); fillDocUI(); dirty = true; resetView(); rebuildGhost(); refreshUI(); scheduleSave();
  };
  $('export').onclick = async () => { const s = JSON.stringify(V.cleanDoc(doc)); $('io').value = s; try { await navigator.clipboard.writeText(s); updateStatus('copied'); } catch (e) { $('io').select(); } };
  $('import').onclick = () => { try { const d = JSON.parse($('io').value); const c = V.cleanDoc(d); c.id = 'vx_' + Date.now().toString(36); saveNow(true); openDoc(c); saveNow(true); updateStatus('imported'); } catch (e) { updateStatus('that is not map data'); } };
  $('play').onclick = () => { if (saveNow(true)) location.href = 'index.html?vxplay=' + encodeURIComponent(doc.id); };

  // ── the loop ──
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (dirty) rebuild();
    if (!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {                // WASD / arrows slide the view
      const sp = cam.dist * 0.9 * dt, f = (keysDown.has('KeyW') || keysDown.has('ArrowUp') ? 1 : 0) - (keysDown.has('KeyS') || keysDown.has('ArrowDown') ? 1 : 0), r = (keysDown.has('KeyD') || keysDown.has('ArrowRight') ? 1 : 0) - (keysDown.has('KeyA') || keysDown.has('ArrowLeft') ? 1 : 0);
      if (f || r) { cam.tx += (-Math.sin(cam.yaw) * f + Math.cos(cam.yaw) * r) * sp; cam.tz += (-Math.cos(cam.yaw) * f - Math.sin(cam.yaw) * r) * sp; }
    }
    placeCamera(); renderer.render(scene, camera);
  }
  fillDocUI(); reindex(); resetView(); refreshUI(); updateInfo();
  window.PVP_MAPMAKER = { get doc() { return doc; }, sel, cam, setCell, rebuild, undo, redo };   // (for poking at it from the console)
  requestAnimationFrame(frame);
})();
