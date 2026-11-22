// 🧱 VOXEL MAP CORE: the six block shapes, the geometry they make, and the colliders that make them walkable. Shared by the map maker (map-maker.html) and the game (voxel-maps.js).
//
// A map is a 3D grid of cells. Each cell holds one of six shapes, turned to face one of four ways and optionally flipped upside-down, in one of 12 colours. Everything below is written for ONE
// unit cell (x, y, z in 0..1) and moved into place afterwards, so a shape is defined once, in its rotation 0 and right-way-up:
//
//   BLOCK        the whole cube.
//   SLAB         the bottom half of the cube.
//   RAMP         a wedge: the cube cut edge to edge. High side at +x.            (h = x)
//   SIDE RAMP    the cube cut from one corner to the opposite corner: one sloping plane through the cube's own diagonal, climbing toward the corner at (+x, +z).    (h = (x + z) / 2)
//   DOUBLE RAMP  a corner pyramid: it starts at the top corner (+x, +z) and slopes down on two sides to the two bottom edges beside the opposite corner.    (h = min(x, z))
//   STAIR        four steps (more on a big cell: the riser is always 0.25 m), the top step at +x.
//
// Turning (rot 0..3) swings the high side round: +x, +z, -x, -z. Flip turns the shape upside-down (a ceiling piece).
(function (root) {
  'use strict';

  const SHAPES = ['block', 'slab', 'ramp', 'sideramp', 'doubleramp', 'stair'];
  const SHAPE_NAMES = { block: 'BLOCK', slab: 'SLAB', ramp: 'RAMP', sideramp: 'SIDE RAMP', doubleramp: 'DOUBLE SIDE RAMP', stair: 'STAIR' };
  const PALETTE = [0x8f979e, 0xc9ced3, 0x4a5058, 0xb5654a, 0xd9a441, 0x6c9a4e, 0x3f8f8b, 0x4a78b8, 0x7a5fb0, 0xb0507a, 0x6b4a2f, 0xe9e2d0];
  const STORE = 'pvpArena.voxelMaps.v1';
  const LIMITS = { maxXZ: 96, maxY: 48, maxCells: 40000 };

  // ── the shapes as convex pieces: { v: [[x,y,z]...], f: [[vertex index...]...] } ──
  const box = (x0, y0, z0, x1, y1, z1) => ({
    v: [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]],
    f: [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]],
  });
  function pieces(shape, cs) {
    switch (shape) {
      case 'block': return [box(0, 0, 0, 1, 1, 1)];
      case 'slab': return [box(0, 0, 0, 1, 0.5, 1)];
      case 'ramp': return [{ v: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1], [1, 1, 0], [1, 1, 1]], f: [[0, 1, 2, 3], [1, 4, 5, 2], [0, 3, 5, 4], [0, 1, 4], [3, 2, 5]] }];
      case 'sideramp': return [{ v: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1], [1, 0.5, 0], [1, 1, 1], [0, 0.5, 1]], f: [[0, 1, 2, 3], [0, 4, 5, 6], [1, 4, 5, 2], [3, 2, 5, 6], [0, 3, 6], [0, 1, 4]] }];
      case 'doubleramp': return [{ v: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1], [1, 1, 1]], f: [[0, 1, 2, 3], [1, 2, 4], [3, 2, 4], [0, 3, 4], [0, 1, 4]] }];
      case 'stair': { const n = stairSteps(cs), out = []; for (let i = 0; i < n; i++) out.push(box(i / n, 0, 0, (i + 1) / n, (i + 1) / n, 1)); return out; }
    }
    return [];
  }
  const stairSteps = cs => Math.max(4, Math.round(cs / 0.25));

  // the surface of a shape (rotation 0, right-way-up): height of the top at (x, z), 0..1
  function topAt(shape, x, z, cs) {
    switch (shape) {
      case 'block': return 1;
      case 'slab': return 0.5;
      case 'ramp': return x;
      case 'sideramp': return (x + z) / 2;
      case 'doubleramp': return Math.min(x, z);
      case 'stair': { const n = stairSteps(cs); return Math.min(1, (Math.floor(Math.min(0.9999, x) * n) + 1) / n); }
    }
    return 0;
  }

  // ── turning and flipping, in the unit cell ──
  const rotXZ = (x, z, r) => r === 0 ? [x, z] : r === 1 ? [1 - z, x] : r === 2 ? [1 - x, 1 - z] : [z, 1 - x];      // the high side goes +x, +z, -x, -z
  const unrotXZ = (x, z, r) => r === 0 ? [x, z] : r === 1 ? [z, 1 - x] : r === 2 ? [1 - x, 1 - z] : [1 - z, x];
  function transformPiece(p, rot, flip) {
    const v = p.v.map(([x, y, z]) => { const [rx, rz] = rotXZ(x, z, rot); return [rx, flip ? 1 - y : y, rz]; });
    const f = flip ? p.f.map(face => face.slice().reverse()) : p.f;       // a mirror turns the faces inside out
    return { v, f };
  }

  // ── a doc is the saved map ──
  function defaultDoc(name) {
    return { v: 1, id: 'vx_' + Date.now().toString(36), name: name || 'My Map', cs: 1, nx: 24, ny: 12, nz: 24, sky: 0x9eaab8, ground: 0x5f6f58, walls: true, cells: [], markers: [] };
  }
  function cleanDoc(d) {
    const doc = d && typeof d === 'object' ? d : {};
    const num = (x, lo, hi, dflt) => { x = Number(x); return Number.isFinite(x) ? Math.max(lo, Math.min(hi, x)) : dflt; };
    const id = String(doc.id || '').toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const out = {
      v: 1, id: id.startsWith('vx_') ? id : 'vx_' + (id || Date.now().toString(36)),
      name: String(doc.name || 'My Map').slice(0, 40),
      cs: [0.5, 1, 2, 4].includes(Number(doc.cs)) ? Number(doc.cs) : 1,
      nx: Math.round(num(doc.nx, 4, LIMITS.maxXZ, 24)), ny: Math.round(num(doc.ny, 1, LIMITS.maxY, 12)), nz: Math.round(num(doc.nz, 4, LIMITS.maxXZ, 24)),
      sky: num(doc.sky, 0, 0xffffff, 0x9eaab8) | 0, ground: num(doc.ground, 0, 0xffffff, 0x5f6f58) | 0, walls: doc.walls !== false, cells: [], markers: [],
    };
    const seen = new Set();
    for (const c of Array.isArray(doc.cells) ? doc.cells : []) {
      if (!Array.isArray(c) || out.cells.length >= LIMITS.maxCells) continue;
      const [x, y, z, s, r, f, col] = c.map(Number);
      if (![x, y, z, s].every(Number.isInteger) || x < 0 || y < 0 || z < 0 || x >= out.nx || y >= out.ny || z >= out.nz || s < 0 || s >= SHAPES.length) continue;
      const k = x + ',' + y + ',' + z; if (seen.has(k)) continue; seen.add(k);
      out.cells.push([x, y, z, s, (r | 0) & 3, f ? 1 : 0, Math.max(0, Math.min(PALETTE.length - 1, col | 0))]);
    }
    for (const m of Array.isArray(doc.markers) ? doc.markers.slice(0, 64) : []) {
      if (!Array.isArray(m)) continue;
      const [t, x, y, z] = [m[0] === 'b' ? 'b' : 'a', Number(m[1]), Number(m[2]), Number(m[3])];
      if ([x, y, z].every(Number.isInteger) && x >= 0 && z >= 0 && y >= 0 && x < out.nx && z < out.nz && y < out.ny) out.markers.push([t, x, y, z]);
    }
    return out;
  }
  function loadAll() { try { const a = JSON.parse(localStorage.getItem(STORE) || '[]'); return Array.isArray(a) ? a.map(cleanDoc) : []; } catch (e) { return []; } }
  function saveAll(list) { try { localStorage.setItem(STORE, JSON.stringify(list)); return true; } catch (e) { return false; } }
  function saveDoc(doc) { const list = loadAll(), i = list.findIndex(m => m.id === doc.id), c = cleanDoc(doc); if (i >= 0) list[i] = c; else list.push(c); return saveAll(list) ? c : null; }
  function deleteDoc(id) { saveAll(loadAll().filter(m => m.id !== id)); }

  // where a cell sits in the world: the grid is centred on the origin, the floor is y = 0
  const origin = doc => ({ x: -doc.nx * doc.cs / 2, z: -doc.nz * doc.cs / 2 });

  // ── geometry: ONE merged mesh for the whole map. triCell says which cell each triangle came from (the editor picks with it). ──
  function buildGeometry(THREE, doc, opts = {}) {
    const cs = doc.cs, o = origin(doc), pos = [], nor = [], col = [], triCell = [];
    const cache = new Map();
    const c3 = new THREE.Color();
    for (let ci = 0; ci < doc.cells.length; ci++) {
      const [cx, cy, cz, s, rot, flip, colorIdx] = doc.cells[ci], shape = SHAPES[s];
      const key = shape + ':' + rot + ':' + flip;
      let ps = cache.get(key);
      if (!ps) { ps = pieces(shape, cs).map(p => transformPiece(p, rot, flip)); cache.set(key, ps); }
      c3.setHex(PALETTE[colorIdx] != null ? PALETTE[colorIdx] : 0x888888);
      const ox = o.x + cx * cs, oy = cy * cs, oz = o.z + cz * cs;
      for (const p of ps) {
        // the piece's middle, so every face can be turned to face outward whatever the winding it came with
        let mx = 0, my = 0, mz = 0; for (const v of p.v) { mx += v[0]; my += v[1]; mz += v[2]; } mx /= p.v.length; my /= p.v.length; mz /= p.v.length;
        for (const face of p.f) {
          const a = p.v[face[0]], b = p.v[face[1]], c = p.v[face[2]];
          let nx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
          const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
          const out = (a[0] - mx) * nx + (a[1] - my) * ny + (a[2] - mz) * nz;
          const idx = out >= 0 ? face : face.slice().reverse(), sgn = out >= 0 ? 1 : -1;
          for (let k = 1; k < idx.length - 1; k++) {
            for (const vi of [idx[0], idx[k], idx[k + 1]]) {
              const v = p.v[vi]; pos.push(ox + v[0] * cs, oy + v[1] * cs, oz + v[2] * cs); nor.push(nx * sgn, ny * sgn, nz * sgn); col.push(c3.r, c3.g, c3.b);
            }
            triCell.push(ci);
          }
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.userData.triCell = triCell;
    return g;
  }

  // ── colliders. The game's floors are axis-aligned boxes, so a slope is a staircase of hidden steps a quarter metre wide: fine enough to walk like a ramp. (The same trick as the game's own ramps.)
  // Every cell is sampled on a grid of 0.25 m columns; each column becomes a box from the shape's underside to its top (a touch lower on a slope, since the body
  // checks half a body ahead), then identical neighbours are merged into big boxes. Returns { boxes: [{x0,y0,z0,x1,y1,z1}], ramps: [{x0,z0,ux,uz,run,rise,halfW}] } in world metres.
  function buildColliders(doc) {
    const cs = doc.cs, o = origin(doc), sub = Math.max(1, Math.round(cs / 0.25)), s = cs / sub;       // sub columns each way, each s metres
    const cols = new Map();                                                                             // 'bottom|top' -> Map('ix,iz' -> [ix, iz])
    const add = (ix, iz, b, t) => {
      if (t - b < 0.01) return;
      const key = b.toFixed(3) + '|' + t.toFixed(3);
      let m = cols.get(key); if (!m) cols.set(key, m = new Map());
      m.set(ix + ',' + iz, [ix, iz]);
    };
    const R = 0.38 + 0.125;
    for (const [cx, cy, cz, si, rot, flip] of doc.cells) {
      const shape = SHAPES[si], base = cy * cs;
      for (let a = 0; a < sub; a++) for (let b = 0; b < sub; b++) {
        const u = (a + 0.5) / sub, w = (b + 0.5) / sub, [sx, sz] = unrotXZ(u, w, rot);
        const h = topAt(shape, sx, sz, cs);
        // the slope here: how much the height changes across one column (in metres per metre)
        const e = 0.5 / sub, [ex1, ez1] = unrotXZ(Math.min(1, u + e), w, rot), [ex0, ez0] = unrotXZ(Math.max(0, u - e), w, rot), [fx1, fz1] = unrotXZ(u, Math.min(1, w + e), rot), [fx0, fz0] = unrotXZ(u, Math.max(0, w - e), rot);
        const gu = (topAt(shape, ex1, ez1, cs) - topAt(shape, ex0, ez0, cs)) * cs / (2 * e * cs), gv = (topAt(shape, fx1, fz1, cs) - topAt(shape, fx0, fz0, cs)) * cs / (2 * e * cs);
        const grad = shape === 'stair' ? 0 : Math.min(1.2, Math.hypot(gu, gv));
        let top = h * cs, bot = 0;
        if (flip) { bot = (1 - h) * cs; top = cs; } else if (grad > 0) top = Math.max(0.05, top - grad * R * 0.85);
        if (flip && grad > 0) bot = Math.min(cs - 0.05, bot + grad * R * 0.85);
        add(cx * sub + a, cz * sub + b, base + bot, base + top);
      }
    }
    const boxes = [];
    for (const [key, m] of cols) {
      const [b, t] = key.split('|').map(Number);
      // merge into rows along x, then stack rows of the same span along z
      const rows = new Map();                                                                           // iz -> sorted ix list
      for (const [ix, iz] of m.values()) { let r = rows.get(iz); if (!r) rows.set(iz, r = []); r.push(ix); }
      const runsByRow = new Map();
      for (const [iz, xs] of rows) { xs.sort((p, q) => p - q); const runs = []; let st = xs[0], pv = xs[0]; for (let i = 1; i <= xs.length; i++) { if (i < xs.length && xs[i] === pv + 1) { pv = xs[i]; continue; } runs.push([st, pv]); st = xs[i]; pv = xs[i]; } runsByRow.set(iz, runs); }
      const open = new Map();                                                                           // 'x0,x1' -> { x0, x1, z0, z1 }
      const izs = [...runsByRow.keys()].sort((p, q) => p - q);
      let prev = null;
      const flush = () => { for (const r of open.values()) boxes.push({ x0: o.x + r.x0 * s, x1: o.x + (r.x1 + 1) * s, y0: b, y1: t, z0: o.z + r.z0 * s, z1: o.z + (r.z1 + 1) * s }); open.clear(); };
      for (const iz of izs) {
        if (prev != null && iz !== prev + 1) flush();
        const seen = new Set();
        for (const [x0, x1] of runsByRow.get(iz)) {
          const k = x0 + ',' + x1; seen.add(k);
          const r = open.get(k); if (r && r.z1 === iz - 1) r.z1 = iz; else { if (r) { boxes.push({ x0: o.x + r.x0 * s, x1: o.x + (r.x1 + 1) * s, y0: b, y1: t, z0: o.z + r.z0 * s, z1: o.z + (r.z1 + 1) * s }); } open.set(k, { x0, x1, z0: iz, z1: iz }); }
        }
        for (const [k, r] of [...open]) if (!seen.has(k)) { boxes.push({ x0: o.x + r.x0 * s, x1: o.x + (r.x1 + 1) * s, y0: b, y1: t, z0: o.z + r.z0 * s, z1: o.z + (r.z1 + 1) * s }); open.delete(k); }
        prev = iz;
      }
      flush();
    }
    // the game's own slope list (a slide gains speed down one, a slide-jump launches up one): every right-way-up wedge ramp
    const ramps = [], dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    for (const [cx, cy, cz, si, rot, flip] of doc.cells) {
      if (SHAPES[si] !== 'ramp' || flip) continue;
      const [ux, uz] = dirs[rot], mx = o.x + (cx + 0.5) * cs, mz = o.z + (cz + 0.5) * cs;
      ramps.push({ x0: mx - ux * cs / 2, z0: mz - uz * cs / 2, ux, uz, run: cs, rise: cs, halfW: cs / 2, y: cy * cs });
    }
    return { boxes, ramps };
  }

  // ── a little picture of a shape (for buttons): a flat-shaded isometric drawing on a 2D canvas ──
  function drawIcon(canvas, shape, rot, flip, colorHex) {
    const g = canvas.getContext('2d'), W = canvas.width, H = canvas.height; g.clearRect(0, 0, W, H);
    const S = Math.min(W, H) * 0.52, cx = W / 2, cy = H * 0.52;
    // viewed from the front-right and well above (so a slope that climbs away from you still shows its face)
    const dl = Math.hypot(1, 1.5, 1.25), d = [1 / dl, 1.5 / dl, 1.25 / dl];
    let rr = [d[2], 0, -d[0]]; const rl = Math.hypot(rr[0], rr[1], rr[2]); rr = rr.map(v => v / rl);
    const uu = [d[1] * rr[2] - d[2] * rr[1], d[2] * rr[0] - d[0] * rr[2], d[0] * rr[1] - d[1] * rr[0]];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const proj = v => { const p = [v[0] - 0.5, v[1] - 0.5, v[2] - 0.5]; return [cx + dot(p, rr) * S, cy - dot(p, uu) * S]; };
    const base = [(colorHex >> 16) & 255, (colorHex >> 8) & 255, colorHex & 255];
    const faces = [];
    for (const p0 of pieces(shape, 1)) {
      const p = transformPiece(p0, rot, flip);
      let mx = 0, my = 0, mz = 0; for (const v of p.v) { mx += v[0]; my += v[1]; mz += v[2]; } mx /= p.v.length; my /= p.v.length; mz /= p.v.length;
      for (const f of p.f) {
        const vs = f.map(i => p.v[i]), a = vs[0], b = vs[1], c = vs[2];
        let nx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
        const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
        if ((a[0] - mx) * nx + (a[1] - my) * ny + (a[2] - mz) * nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
        if (dot([nx, ny, nz], d) <= 0.001) continue;                                                       // facing away
        const depth = vs.reduce((s, v) => s + dot(v, d), 0) / vs.length;
        const light = Math.max(0.4, Math.min(1.15, 0.5 + 0.55 * ny + 0.12 * nx - 0.08 * nz));
        faces.push({ pts: vs.map(proj), depth, light });
      }
    }
    faces.sort((p, q) => p.depth - q.depth);
    for (const fc of faces) {
      g.beginPath(); fc.pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath();
      g.fillStyle = 'rgb(' + base.map(c => Math.round(Math.min(255, c * fc.light))).join(',') + ')'; g.fill();
      g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1; g.stroke();
    }
  }

  root.PVP_VOXEL = { SHAPES, SHAPE_NAMES, PALETTE, LIMITS, STORE, pieces, topAt, rotXZ, unrotXZ, defaultDoc, cleanDoc, loadAll, saveAll, saveDoc, deleteDoc, origin, buildGeometry, buildColliders, drawIcon, transformPiece };
})(typeof window !== 'undefined' ? window : globalThis);
