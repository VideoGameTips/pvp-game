/* 🗺️ Map outlines. Every map used to be a rectangle (or a square): a big plate with the spawns at the two short ends. This gives a map any outline
 * at all, and any size: the footprint is a REGION (polygons added together, polygons cut out), and once a map has been built and upgraded
 * (game.js _upgradeMap, and again after the theme dressing in activateMap) it is cut to its region:
 *   - the floor becomes the region's shape (one flat polygon per piece, with the map's own ground material), on a slab like the outskirts' one;
 *   - everything that stood outside it is taken away: meshes, colliders, props, gimmicks, ramps, ladders, points of interest, and the single triangles
 *     of the batched decor and wear;
 *   - MAP_VOID.inside (floorExistsAt asks it) says where floor is, so you fall off the real edge, bots keep to the floor, and MAP_VOID.rects (the old
 *     shape for placement code that reads rectangles) is the region sampled on a 4 m grid;
 *   - a line of tape and striped posts runs along the edge, like the outskirts' one;
 *   - a map that wants its spawns somewhere else says where (SHAPES[name].spawns), and the place is cleared and screened.
 * Nothing is built here: the layouts are the maps' own. The server never hears of any of it (positions and spawns are the client's).
 * tools/verify-boot.js --shapes checks every entry. */
(function () {
  'use strict';
  const TAU = Math.PI * 2;

  // ── polygons: lists of [x, z] ────────────────────────────────────────────────────────────────────────────────────────────────────────
  const P = {
    circle: (r, n = 32, cx = 0, cz = 0, rz = r) => Array.from({ length: n }, (_, i) => { const a = i / n * TAU; return [cx + Math.cos(a) * r, cz + Math.sin(a) * rz]; }),
    ngon: (n, r, phase = 0, cx = 0, cz = 0, rz = r) => Array.from({ length: n }, (_, i) => { const a = phase + i / n * TAU; return [cx + Math.cos(a) * r, cz + Math.sin(a) * rz]; }),
    rect: (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]],
    // N-S arm: half-width wns, half-length lns. E-W arm: half-width wew, half-length lew.
    cross: (wns, lns, wew, lew) => [[wns, lns], [wns, wew], [lew, wew], [lew, -wew], [wns, -wew], [wns, -lns], [-wns, -lns], [-wns, -wew], [-lew, -wew], [-lew, wew], [-wns, wew], [-wns, lns]],
    diamond: (rx, rz) => [[0, rz], [rx, 0], [0, -rz], [-rx, 0]],
    star: (n, ro, ri, phase = 0) => Array.from({ length: n * 2 }, (_, i) => { const a = phase + i / (n * 2) * TAU, r = i % 2 ? ri : ro; return [Math.cos(a) * r, Math.sin(a) * r]; }),
    // a thick line: a polyline of [x, z] with a width (a bridge, a river bend, a road)
    band: (pts, w) => {
      const L = [], R = [];
      pts.forEach((p, i) => {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
        const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz) || 1, nx = -dz / len, nz = dx / len;
        L.push([p[0] + nx * w / 2, p[1] + nz * w / 2]); R.push([p[0] - nx * w / 2, p[1] - nz * w / 2]);
      });
      return L.concat(R.reverse());
    },
    // a rounded, uneven island: the radius wobbles smoothly with the angle (deterministic from the seed)
    blob: (cx, cz, r, seed = 0, wob = 0.16, n = 28) => Array.from({ length: n }, (_, i) => {
      const a = i / n * TAU, k = 1 + wob * (Math.sin(3 * a + seed) + 0.6 * Math.sin(5 * a + seed * 1.7) + 0.4 * Math.sin(2 * a + seed * 0.6)) / 2;
      return [cx + Math.cos(a) * r * k, cz + Math.sin(a) * r * k];
    }),
    rot: (poly, a) => { const c = Math.cos(a), s = Math.sin(a); return poly.map(([x, z]) => [x * c - z * s, x * s + z * c]); },
    move: (poly, dx, dz) => poly.map(([x, z]) => [x + dx, z + dz]),
    scale: (poly, sx, sz = sx) => poly.map(([x, z]) => [x * sx, z * sz]),
    // turned half a circle about the middle: every shape that is made of a piece and this is point-symmetric, so neither team has the better side
    twin: (poly) => [poly, poly.map(([x, z]) => [-x, -z])],
  };

  // ── regions: polygons added, polygons cut out ─────────────────────────────────────────────────────────────────────────────────────────
  function inPoly(poly, x, z) {                                    // even-odd
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], zi = poly[i][1], xj = poly[j][0], zj = poly[j][1];
      if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c;
    }
    return c;
  }
  function makeRegion(spec) {
    const add = spec.add.filter(Boolean), sub = (spec.sub || []).filter(Boolean), over = (spec.over || []).filter(Boolean);
    const inside = (x, z) => {
      for (let i = 0; i < over.length; i++) if (inPoly(over[i], x, z)) return true;
      let a = false;
      for (let i = 0; i < add.length; i++) if (inPoly(add[i], x, z)) { a = true; break; }
      if (!a) return false;
      for (let i = 0; i < sub.length; i++) if (inPoly(sub[i], x, z)) return false;
      return true;
    };
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const p of add.concat(over)) for (const [x, z] of p) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    return { add, sub, over, inside, bbox: { x0, x1, z0, z1 }, halfX: Math.max(Math.abs(x0), Math.abs(x1)), halfZ: Math.max(Math.abs(z0), Math.abs(z1)) };
  }
  // the region sampled on a grid of `cell` metres: the cells that are wholly floor, a row of them merged into one rectangle (what the code that reads MAP_VOID.rects wants)
  function rasterize(R, cell = 4, box) {
    const rects = [], b = box || R.bbox, ix0 = Math.floor(b.x0 / cell), ix1 = Math.ceil(b.x1 / cell), iz0 = Math.floor(b.z0 / cell), iz1 = Math.ceil(b.z1 / cell);
    const full = (x, z) => R.inside(x + 0.01, z + 0.01) && R.inside(x + cell - 0.01, z + 0.01) && R.inside(x + 0.01, z + cell - 0.01) && R.inside(x + cell - 0.01, z + cell - 0.01) && R.inside(x + cell / 2, z + cell / 2);
    for (let iz = iz0; iz < iz1; iz++) {
      let start = null;
      for (let ix = ix0; ix <= ix1; ix++) {
        const on = ix < ix1 && full(ix * cell, iz * cell);
        if (on && start === null) start = ix;
        if (!on && start !== null) { rects.push({ x0: start * cell, x1: ix * cell, z0: iz * cell, z1: (iz + 1) * cell }); start = null; }
      }
    }
    return rects;
  }
  function area(R, cell = 2) {                                     // square metres of floor
    let n = 0;
    for (let x = R.bbox.x0; x < R.bbox.x1; x += cell) for (let z = R.bbox.z0; z < R.bbox.z1; z += cell) if (R.inside(x + cell / 2, z + cell / 2)) n++;
    return n * cell * cell;
  }

  // ── irregular outlines, made from a seed ───────────────────────────────────────────────────────────────────────────────────────────────
  // No map is a shape anyone could name. An outline is grown from the spawns outwards: a winding corridor of lumpy blobs from one spawn through the middle (and its half-turn
  // on to the other spawn), lobes and angled rooms budding off whatever is already floor, bites taken out of the edge, pits in the floor. Only one half is made: the other is it
  // turned half a circle about the middle, so neither team has the better side (at this size you cannot see that, and the edge is not a thing you see whole). The seed is the map's:
  // every player grows the same one. An outline that is too round, too boxy, too full or in pieces is thrown away and the next attempt (seed, attempt) is tried.
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = (t + Math.imul(t ^ t >>> 7, 61 | t)) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hull(pts) {                                              // convex hull (monotone chain)
    const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (const q of p.slice().reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }
  function polyArea(p) { let a = 0; for (let i = 0, j = p.length - 1; i < p.length; j = i++) a += (p[j][0] + p[i][0]) * (p[j][1] - p[i][1]); return Math.abs(a / 2); }
  // how irregular is a region: solidity (floor / the convex hull of it: 1 for a disc or a box, low for something with bays), circularity (1 for a circle) and how much of its bounding box it fills
  function measure(R, cellSize) {
    const cell = cellSize || 3, b = R.bbox, W = Math.ceil((b.x1 - b.x0) / cell), H = Math.ceil((b.z1 - b.z0) / cell), g = new Uint8Array(W * H);
    let n = 0;
    for (let i = 0; i < W; i++) for (let j = 0; j < H; j++) if (R.inside(b.x0 + (i + 0.5) * cell, b.z0 + (j + 0.5) * cell)) { g[i * H + j] = 1; n++; }
    let edges = 0;
    for (let i = 0; i < W; i++) for (let j = 0; j < H; j++) if (g[i * H + j]) { if (i === 0 || !g[(i - 1) * H + j]) edges++; if (i === W - 1 || !g[(i + 1) * H + j]) edges++; if (j === 0 || !g[i * H + j - 1]) edges++; if (j === H - 1 || !g[i * H + j + 1]) edges++; }
    const A = n * cell * cell, Pm = edges * cell * 0.82;           // (a staircase edge is longer than the line it follows: about 1/0.82 for a diagonal)
    const pts = []; for (const p of R.add.concat(R.over)) for (const q of p) pts.push(q);
    return { area: A, solidity: A / Math.max(1, polyArea(hull(pts))), circularity: Math.min(1.5, 4 * Math.PI * A / (Pm * Pm)), fill: A / Math.max(1, (b.x1 - b.x0) * (b.z1 - b.z0)) };
  }
  function connected(R, a, b, cell = 3) {                           // is there floor all the way from a to b (geometry only)
    const x0 = R.bbox.x0, z0 = R.bbox.z0, W = Math.ceil((R.bbox.x1 - x0) / cell), H = Math.ceil((R.bbox.z1 - z0) / cell);
    const at = ([x, z]) => [Math.floor((x - x0) / cell), Math.floor((z - z0) / cell)], seen = new Uint8Array(W * H), st = [at(a)], goal = at(b);
    while (st.length) {
      const [i, j] = st.pop(); if (i < 0 || j < 0 || i >= W || j >= H || seen[i * H + j]) continue;
      if (!R.inside(x0 + (i + 0.5) * cell, z0 + (j + 0.5) * cell)) continue;
      seen[i * H + j] = 1; if (i === goal[0] && j === goal[1]) return true;
      st.push([i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]);
    }
    return false;
  }
  const rectIn = (R, cx, cz, w, d) => { for (let i = 0; i <= 8; i++) for (let j = 0; j <= 4; j++) if (!R.inside(cx - w / 2 + w * i / 8, cz - d / 2 + d * j / 4)) return false; return true; };
  // o: ex, ez (the half-sizes it may use: inside the map's own floor), spawn [x, z] (the ally's; the enemy's is the half-turn), w (a spawn's width), pocket (the clear ground round a spawn),
  // spine (corridor width), wander (how far it strays), lobes, rmin, rmax (lobe radii), rooms (0..1: how often a lobe brings an angled room), bites, pits, fill [min, max] (of the box it may use)
  function irregular(seed, o) {
    const [sx, sz] = o.spawn, [rw, rd] = o.rect || [o.w || 40, 8], pocket = o.pocket || Math.max(26, Math.max(rw, rd) / 2 + 14), fl = o.fill || [0.34, 0.66];
    const twin = (arr) => arr.map(poly => poly.map(([x, z]) => [-x, -z])), fits = (poly) => poly.every(([x, z]) => Math.abs(x) <= o.ex && Math.abs(z) <= o.ez);
    const spawns = [[sx, sz], [-sx, -sz]], near = (x, z, d) => spawns.some(([qx, qz]) => Math.hypot(x - qx, z - qz) < d);
    let best = null;
    for (let attempt = 0; attempt < 40; attempt++) {
      const r = rng(seed * 7919 + attempt * 104729 + 17), U = (a, b) => a + (b - a) * r();
      const half = [], all = () => half.concat(twin(half));
      half.push(P.blob(sx, sz, pocket, U(0, 6), 0.16, 24));                                   // the spawn's own ground
      const steps = Math.max(3, Math.round(Math.hypot(sx, sz) / 15)), side = r() < 0.5 ? 1 : -1, wander = o.wander == null ? 26 : o.wander;
      for (let i = 1; i <= steps; i++) {                                                      // the corridor to the middle
        const t = i / steps, px = sx * (1 - t) + side * wander * Math.sin(Math.PI * t) * (0.6 + 0.8 * r()), pz = sz * (1 - t);
        half.push(P.blob(px, pz, (o.spine || 40) / 2 * U(0.8, 1.3), U(0, 6), 0.2, 22));
      }
      for (let k = 0; k < (o.lobes || 6); k++) {                                              // lobes bud off floor that is already there
        const cur = makeRegion({ add: all() }), rad = U(o.rmin || 16, o.rmax || 34);
        for (let tries = 0; tries < 60; tries++) {
          const x = U(-o.ex + rad, o.ex - rad), z = U(-o.ez + rad, o.ez - rad);
          if (!cur.inside(x, z)) continue;
          const lobe = P.blob(x, z, rad, U(0, 6), U(0.22, 0.42), 24);
          if (!fits(lobe)) continue;
          let room = null;
          if (r() < (o.rooms == null ? 0.4 : o.rooms)) {                                      // and some bring an angled room
            const rw = U(12, rad * 1.7), rd = U(10, rad * 1.3);
            room = P.move(P.rot(P.rect(-rw / 2, -rd / 2, rw / 2, rd / 2), U(0, Math.PI)), x + U(-0.2, 0.2) * rad, z + U(-0.2, 0.2) * rad);
            if (!fits(room)) room = null;
          }
          half.push(lobe); if (room) half.push(room);
          break;
        }
      }
      const R0 = makeRegion({ add: all() }), sub = [];
      for (let k = 0, tries = 0; k < (o.bites || 0) && tries < 200; tries++) {                // bites out of the edge
        const x = U(-o.ex, o.ex), z = U(-o.ez, o.ez);
        if (!R0.inside(x, z) || near(x, z, pocket + 12)) continue;
        let edge = false; for (const [dx, dz] of [[12, 0], [-12, 0], [0, 12], [0, -12], [9, 9], [-9, -9]]) if (!R0.inside(x + dx, z + dz)) { edge = true; break; }
        if (!edge) continue;
        sub.push(P.blob(x, z, U(7, 15), U(0, 6), 0.3, 16)); k++;
      }
      for (let k = 0, tries = 0; k < (o.pits || 0) && tries < 200; tries++) {                 // pits in the floor, away from the spawns and the way between them
        const x = U(-o.ex, o.ex), z = U(-o.ez, o.ez);
        if (!R0.inside(x, z) || near(x, z, pocket + 24) || Math.hypot(x, z) < 22) continue;
        let deep = true; for (const [dx, dz] of [[18, 0], [-18, 0], [0, 18], [0, -18]]) if (!R0.inside(x + dx, z + dz)) { deep = false; break; }
        if (!deep) continue;
        sub.push(P.blob(x, z, U(9, 16), U(0, 6), 0.25, 16)); k++;
      }
      const R = makeRegion({ add: all(), sub: sub.concat(twin(sub)) }), span = Math.max(R.bbox.x1 - R.bbox.x0, R.bbox.z1 - R.bbox.z0);
      if (!(rectIn(R, sx, sz, rw, rd) && rectIn(R, -sx, -sz, rw, rd) && connected(R, [sx, sz], [-sx, -sz], Math.max(3, span / 60)))) continue;
      const m = measure(R, Math.max(3, span / 60)), spec = { add: R.add, sub: R.sub, over: [], info: m, attempt };
      if (m.fill >= fl[0] && m.fill <= fl[1] && m.solidity <= (o.solid || 0.86) && m.circularity <= 0.62 && R.halfX <= o.ex + 1 && R.halfZ <= o.ez + 1) return spec;
      const d = Math.abs(m.fill - (fl[0] + fl[1]) / 2);
      if (!best || d < best.d) best = { d, spec };
    }
    return best ? best.spec : { add: [P.blob(0, 0, Math.min(o.ex, o.ez) * 0.8, seed, 0.3, 28)], sub: [], over: [], info: null, attempt: -1 };
  }

  // ── the outlines ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  // cls: 'cqb' (close quarters: about 100 m across or less, the spawns near), 'mid', 'big' (semi-massive, 230 m and up).
  // spawns (optional): { ally: [cx, cz], enemy: [cx, cz], w, d } where the two teams start; without it the map's own spawns stay (and must lie inside the region).
  const SHAPES = {};
  const shape = (name, cls, build, spawns, extra) => { SHAPES[name] = Object.assign({ cls, build, spawns: spawns || null }, extra || {}); };

  // `spawn` is the ally's centre (the enemy's is its half-turn); `ex`, `ez` are how much of the map's own floor the outline may use. Seeds are the maps': change one and the outline is a different one.
  // axis: which way the teams face each other. 'z' (as the maps always were), 'x' (east-west) or 'd' (corner to corner). The parameters are written for 'z' and turned for the others.
  const irr = (name, cls, seed, o0, axis = 'z') => {
    const o = Object.assign({}, o0), w = o.w || (cls === 'cqb' ? 20 : cls === 'big' ? 34 : 24);
    if (axis === 'x') { o.ex = o0.ez; o.ez = o0.ex; o.spawn = [o0.spawn[1], o0.spawn[0]]; o.rect = [6, w]; }
    else if (axis === 'd') { const k = Math.SQRT1_2, [x, z] = o0.spawn; o.spawn = [(x - z) * k * 1.04, (x + z) * k * 1.04]; o.ex = o.ez = Math.round(Math.max(o0.ex, o0.ez) * 0.92); o.rect = [w * 0.78, w * 0.78]; }
    else o.rect = [w, 6];
    shape(name, cls, () => irregular(seed, o), { ally: o.spawn, enemy: [-o.spawn[0], -o.spawn[1]], w: o.rect[0], d: o.rect[1] }, { family: 'irregular', seed, axis });
  };
  // close quarters: about 110 to 120 m across, the spawns 70 to 80 m apart
  irr('refinery',  'cqb', 11, { ex: 54, ez: 66, spawn: [10, 38], pocket: 24, spine: 26, wander: 14, lobes: 5, rmin: 11, rmax: 20, rooms: 0.5, bites: 3, pits: 0, fill: [0.4, 0.68] });
  irr('chernobyl', 'cqb', 23, { ex: 58, ez: 68, spawn: [-12, 40], pocket: 24, spine: 26, wander: 16, lobes: 5, rmin: 11, rmax: 21, rooms: 0.5, bites: 3, pits: 1, fill: [0.4, 0.68] }, 'x');
  irr('doomsday',  'cqb', 37, { ex: 52, ez: 64, spawn: [8, 36], pocket: 24, spine: 24, wander: 16, lobes: 6, rmin: 10, rmax: 19, rooms: 0.5, bites: 3, pits: 0, fill: [0.4, 0.68] }, 'd');
  irr('carnival',  'cqb', 41, { ex: 58, ez: 66, spawn: [-14, 38], pocket: 24, spine: 28, wander: 14, lobes: 5, rmin: 12, rmax: 21, rooms: 0.4, bites: 3, pits: 1, fill: [0.4, 0.68] }, 'x');
  irr('dreamscape','cqb', 53, { ex: 56, ez: 66, spawn: [12, 40], pocket: 24, spine: 22, wander: 18, lobes: 6, rmin: 10, rmax: 18, rooms: 0.3, bites: 4, pits: 1, fill: [0.34, 0.62] }, 'd');
  // middle sized: 160 to 200 m across
  irr('forest',    'mid', 101, { ex: 92, ez: 98, spawn: [-12, 60], spine: 44, wander: 30, lobes: 8, rmin: 18, rmax: 36, bites: 6, pits: 1 });
  irr('foundry',   'mid', 103, { ex: 94, ez: 98, spawn: [14, 62], spine: 40, wander: 34, lobes: 8, rmin: 16, rmax: 34, bites: 6, pits: 2 }, 'x');
  irr('pyongyang', 'mid', 107, { ex: 92, ez: 100, spawn: [-10, 64], spine: 46, wander: 24, lobes: 8, rmin: 18, rmax: 34, bites: 5, pits: 1 }, 'd');
  irr('arena',     'mid', 109, { ex: 92, ez: 94, spawn: [18, 56], spine: 44, wander: 28, lobes: 7, rmin: 18, rmax: 36, bites: 6, pits: 1 });
  irr('biosphere', 'mid', 113, { ex: 94, ez: 96, spawn: [-16, 60], spine: 42, wander: 32, lobes: 8, rmin: 16, rmax: 34, bites: 6, pits: 2 }, 'x');
  irr('holiday',   'mid', 127, { ex: 92, ez: 96, spawn: [12, 58], spine: 40, wander: 30, lobes: 8, rmin: 16, rmax: 32, bites: 7, pits: 1 }, 'd');
  irr('overgrowth','mid', 131, { ex: 96, ez: 100, spawn: [-14, 64], spine: 44, wander: 36, lobes: 9, rmin: 16, rmax: 34, bites: 7, pits: 1 });
  irr('vietnam',   'mid', 137, { ex: 94, ez: 100, spawn: [20, 62], spine: 42, wander: 38, lobes: 8, rmin: 16, rmax: 32, bites: 6, pits: 1 }, 'x');
  irr('traffic_cone_republic', 'mid', 139, { ex: 96, ez: 98, spawn: [-18, 58], spine: 46, wander: 24, lobes: 8, rmin: 18, rmax: 34, bites: 6, pits: 0 }, 'd');
  irr('cyber',     'mid', 149, { ex: 90, ez: 94, spawn: [10, 60], spine: 40, wander: 30, lobes: 8, rmin: 16, rmax: 32, bites: 6, pits: 2 });
  irr('flying_moai','mid', 151, { ex: 90, ez: 94, spawn: [-12, 58], spine: 36, wander: 34, lobes: 8, rmin: 14, rmax: 30, bites: 7, pits: 2, fill: [0.3, 0.6] }, 'x');
  irr('tundra',    'mid', 157, { ex: 96, ez: 100, spawn: [16, 62], spine: 38, wander: 34, lobes: 9, rmin: 14, rmax: 32, bites: 8, pits: 1, fill: [0.3, 0.6] }, 'd');
  irr('temple',    'mid', 163, { ex: 92, ez: 104, spawn: [-12, 64], spine: 44, wander: 26, lobes: 8, rmin: 18, rmax: 36, bites: 6, pits: 1 });
  irr('skydock',   'mid', 167, { ex: 96, ez: 96, spawn: [14, 66], spine: 40, wander: 36, lobes: 9, rmin: 16, rmax: 34, bites: 7, pits: 2 }, 'x');
  irr('glassworks','mid', 173, { ex: 94, ez: 100, spawn: [-14, 62], spine: 42, wander: 30, lobes: 8, rmin: 16, rmax: 34, bites: 6, pits: 1 }, 'd');
  irr('urban',     'mid', 179, { ex: 104, ez: 104, spawn: [16, 64], spine: 46, wander: 30, lobes: 10, rmin: 18, rmax: 38, bites: 8, pits: 1 });
  irr('desert',    'mid', 181, { ex: 104, ez: 104, spawn: [-18, 66], spine: 46, wander: 34, lobes: 10, rmin: 18, rmax: 38, bites: 8, pits: 1 }, 'x');
  irr('airport',   'mid', 191, { ex: 108, ez: 100, spawn: [-20, 66], spine: 50, wander: 28, lobes: 9, rmin: 20, rmax: 40, bites: 7, pits: 0 }, 'd');
  // (Battleground, Sky Arena, Shipyard and Atoll already have outlines of their own: they are not given one here)
  irr('neon_tokyo','cqb', 251, { ex: 46, ez: 54, spawn: [10, 32], pocket: 22, spine: 20, wander: 12, lobes: 5, rmin: 10, rmax: 17, rooms: 0.4, bites: 3, pits: 1, fill: [0.4, 0.68] });
  irr('space',     'cqb', 257, { ex: 50, ez: 72, spawn: [10, 46], pocket: 24, spine: 30, wander: 16, lobes: 6, rmin: 11, rmax: 21, rooms: 0.4, bites: 3, pits: 1, fill: [0.4, 0.7] });
  irr('trenches',  'mid', 263, { ex: 54, ez: 88, spawn: [-10, 58], spine: 40, wander: 20, lobes: 9, rmin: 14, rmax: 28, bites: 4, pits: 1, fill: [0.6, 0.88] });
  // semi-massive: 280 and 340 m across
  irr('big_arena',  'big', 211, { ex: 134, ez: 134, spawn: [24, 90], spine: 60, wander: 46, lobes: 14, rmin: 26, rmax: 52, bites: 12, pits: 3, fill: [0.34, 0.64] }, 'x');
  irr('super_arena','big', 223, { ex: 164, ez: 164, spawn: [-30, 120], spine: 70, wander: 60, lobes: 18, rmin: 30, rmax: 62, bites: 16, pits: 4, fill: [0.34, 0.64] }, 'd');

  // ── applying one ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const meshBox = (o) => { o.updateMatrixWorld(true); return new THREE.Box3().setFromObject(o); };
  function footprintOutside(R, x0, z0, x1, z1, slack) {            // how many of the four corners of a footprint are outside (by more than `slack` metres of the region)
    let out = 0;
    for (const [x, z] of [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]) {
      if (R.inside(x, z)) continue;
      if (slack > 0) {                                               // a corner that is just over the edge counts as inside
        let near = false;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (R.inside(x + dx * slack, z + dz * slack)) { near = true; break; }
        if (near) continue;
      }
      out++;
    }
    return out;
  }
  // should this footprint (a mesh's, or a collider's) go?
  function goes(R, x0, z0, x1, z1, flat) {
    if (!R.inside((x0 + x1) / 2, (z0 + z1) / 2)) return true;
    const out = footprintOutside(R, x0, z0, x1, z1, flat ? 1 : 0);
    return flat ? out >= 1 : out >= 2;
  }
  function cullTriangles(mesh, R) {                                 // the batched decor and wear: drop the triangles (or the 36-vertex boxes) whose middle is outside
    const geo = mesh.geometry, pos = geo.attributes.position; if (!pos) return;
    mesh.updateMatrixWorld(true);
    const n = geo.index ? geo.index.count : pos.count, idx = geo.index ? geo.index.array : null, keep = [];
    const v = new THREE.Vector3(), mid = (a, b, c) => { v.set((pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3, (pos.getY(a) + pos.getY(b) + pos.getY(c)) / 3, (pos.getZ(a) + pos.getZ(b) + pos.getZ(c)) / 3).applyMatrix4(mesh.matrixWorld); return v; };
    const perBox = !idx && n % 36 === 0 && !mesh.userData.mapWear;
    if (perBox) {
      for (let i = 0; i < n; i += 36) {
        let sx = 0, sz = 0; for (let k = 0; k < 36; k++) { v.set(pos.getX(i + k), 0, pos.getZ(i + k)).applyMatrix4(mesh.matrixWorld); sx += v.x; sz += v.z; }
        if (R.inside(sx / 36, sz / 36)) for (let k = 0; k < 36; k++) keep.push(i + k);
      }
    } else {
      for (let i = 0; i < n; i += 3) {
        const a = idx ? idx[i] : i, b = idx ? idx[i + 1] : i + 1, c = idx ? idx[i + 2] : i + 2, m = mid(a, b, c);
        if (!R.inside(m.x, m.z)) continue;
        if (mesh.userData.mapWear) { let all = true; for (const k of [a, b, c]) { v.set(pos.getX(k), pos.getY(k), pos.getZ(k)).applyMatrix4(mesh.matrixWorld); if (!R.inside(v.x, v.z)) { all = false; break; } } if (!all) continue; }   // (a decal that straddles the edge goes)
        keep.push(a, b, c);
      }
    }
    if (keep.length === n) return;
    // Only what is kept stays in the buffers (a culled triangle's vertices would still be uploaded, and still sit out beyond the edge).
    const plain = Object.values(geo.attributes).every(a => a && a.array && !a.isInterleavedBufferAttribute) && (!geo.groups || geo.groups.length <= 1) && !geo.morphAttributes.position;
    if (plain) {
      const remap = new Map(), order = [], newIdx = [];
      if (idx) { for (const k of keep) { let j = remap.get(k); if (j === undefined) { j = order.length; remap.set(k, j); order.push(k); } newIdx.push(j); } } else for (const k of keep) order.push(k);
      for (const [key, a] of Object.entries(geo.attributes)) {
        const sz = a.itemSize, arr = new a.array.constructor(order.length * sz);
        for (let i = 0; i < order.length; i++) for (let c = 0; c < sz; c++) arr[i * sz + c] = a.array[order[i] * sz + c];
        geo.setAttribute(key, new THREE.BufferAttribute(arr, sz, a.normalized));
      }
      if (idx) geo.setIndex(newIdx); else geo.setIndex(null);
      geo.clearGroups();
    } else geo.setIndex(keep);
    geo.computeBoundingSphere(); geo.computeBoundingBox();
  }
  // What a flat, wide thing is. 'remove': a plain ground plane, or the slab under the floor (the new floor and slab replace them). 'grid': a ground mesh made of many triangles (the
  // maps' arena floors have terrain relief): its triangles outside go. 'pad': a flat box (a painted pad, an ice sheet): it is redrawn as the runs of squares that are wholly inside.
  const flatKind = (o, b) => {
    const g = o.geometry; if (!g || !g.attributes.position) return null;
    const w = b.max.x - b.min.x, d = b.max.z - b.min.z, h = b.max.y - b.min.y, span = Math.max(w, d);
    if (g.type === 'PlaneGeometry' && Math.abs(b.max.y) < 0.3) return g.attributes.position.count > 100 ? 'grid' : 'remove';   // (a plane of many vertices is the atmosphere's textured ground: it keeps its look, clipped)
    if (b.max.y <= 0.1 && b.min.y <= -1 && span >= 25) return 'remove';
    if (b.max.y <= 0.8 && h <= 1.2 && Math.min(w, d) >= 14 && span >= 40) return g.attributes.position.count > 100 ? 'grid' : 'pad';
    return null;
  };
  function clipPad(o, b, R) {                                       // a big flat box, redrawn as the squares of it that are wholly inside the outline
    const rects = rasterize(R, 1, { x0: b.min.x, x1: b.max.x, z0: b.min.z, z1: b.max.z }), y = b.max.y + 0.005;
    const pos = [], nor = [];
    const oc = o.geometry.attributes.color, ou = o.geometry.attributes.uv, op = o.geometry.attributes.position, wm = o.matrixWorld;
    // the colour (the average of the old vertices) and the uv (the old quad's own mapping from the ground to the texture): without them a material that expects both draws black
    let avg = null; if (oc) { const st = Math.max(1, Math.floor(oc.count / 400)); let r = 0, gg = 0, bb = 0, n = 0; for (let i = 0; i < oc.count; i += st) { r += oc.getX(i); gg += oc.getY(i); bb += oc.getZ(i); n++; } avg = n ? [r / n, gg / n, bb / n] : [1, 1, 1]; }
    let aff = null;
    if (ou && op && op.count >= 3) {
      const V = i => { const v = new THREE.Vector3(op.getX(i), op.getY(i), op.getZ(i)).applyMatrix4(wm); return [v.x, v.z, ou.getX(i), ou.getY(i)]; };
      const a = V(0); let b = null, c = null;
      for (let i = 1; i < op.count && !c; i++) { const v = V(i); if (!b) { if (Math.hypot(v[0] - a[0], v[1] - a[1]) > 1e-3) b = v; } else if (Math.abs((b[0] - a[0]) * (v[1] - a[1]) - (b[1] - a[1]) * (v[0] - a[0])) > 1e-3) c = v; }
      if (b && c) { const det = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]); const solve = k => [((b[k] - a[k]) * (c[1] - a[1]) - (c[k] - a[k]) * (b[1] - a[1])) / det, ((c[k] - a[k]) * (b[0] - a[0]) - (b[k] - a[k]) * (c[0] - a[0])) / det]; aff = { a, u: solve(2), v: solve(3) }; }
    }
    const col = [], uvs = [];
    for (const r of rects) { const x0 = Math.max(r.x0, b.min.x), x1 = Math.min(r.x1, b.max.x), z0 = Math.max(r.z0, b.min.z), z1 = Math.min(r.z1, b.max.z); if (x1 - x0 < 0.01 || z1 - z0 < 0.01) continue; const q = [[x0, z0], [x0, z1], [x1, z1], [x0, z0], [x1, z1], [x1, z0]]; for (const [x, z] of q) { pos.push(x, y, z); nor.push(0, 1, 0); if (avg) col.push(avg[0], avg[1], avg[2]); if (aff) uvs.push(aff.u[0] * (x - aff.a[0]) + aff.u[1] * (z - aff.a[1]) + aff.a[2], aff.v[0] * (x - aff.a[0]) + aff.v[1] * (z - aff.a[1]) + aff.a[3]); } }
    if (!pos.length) { if (o.parent) o.parent.remove(o); return; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    if (avg) geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    if (aff) geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    const m = new THREE.Mesh(geo, o.material); Object.assign(m.userData, o.userData, { shapeKeep: true }); m.receiveShadow = true;
    (o.parent || MAP_GROUPS_ROOT).add(m); if (o.parent) o.parent.remove(o);
  }
  // A prop or breakable wall whose mesh has gone, whose collider has gone, or (when `gone` says so) that must go: it leaves the list too, so nothing can be shot or blown up that is not there.
  function dropDestructibles(name, gone) {
    const cols = MAP_COLLIDERS[name] || [];
    for (let i = mapDestructibles.length - 1; i >= 0; i--) {
      const d = mapDestructibles[i]; if (d.mapName !== name || !d.mesh) continue;
      if (d.mesh.parent && !d.structureKind && ((gone && gone(d)) || (d.colliderRef && cols.length && !cols.includes(d.colliderRef)))) d.mesh.parent.remove(d.mesh);
      if (!d.mesh.parent) mapDestructibles.splice(i, 1);
    }
  }
  let MAP_GROUPS_ROOT = null;
  // The old perimeter: a long, thin wall standing on the edge of the old rectangle. The outline is the edge now (its posts and tape), so these go; left standing they would draw the old rectangle across the new floor.
  const perimeterWall = (orig, x0, x1, z0, z1, y1) => {
    if (!orig || !Number.isFinite(orig.halfX) || !Number.isFinite(orig.halfZ) || orig.halfX > 400 || y1 < 1.2) return false;
    const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    return (w >= 40 && d <= 6 && Math.abs(cz) >= orig.halfZ - 8) || (d >= 40 && w <= 6 && Math.abs(cx) >= orig.halfX - 8);
  };
  function cull(name, R, orig) {
    const g = MAP_GROUPS[name]; if (!g) return;
    g.updateMatrixWorld(true); MAP_GROUPS_ROOT = g;
    const dead = [], pads = [];
    g.traverse(o => {
      if (o === g || o.userData.shapeKeep) return;
      if (o.isLight) { if (o.position && !R.inside(o.position.x, o.position.z)) dead.push(o); return; }
      if (o.isLineSegments && o.geometry && o.geometry.type === 'GridHelper') { dead.push(o); return; }
      if (!o.isMesh || !o.geometry) return;
      const b = meshBox(o), w = b.max.x - b.min.x, d = b.max.z - b.min.z, fk = flatKind(o, b);
      if (fk === 'remove') { dead.push(o); return; }
      if (fk === 'grid') { cullTriangles(o, R); return; }
      if (fk === 'pad') { if (!pads.includes(o)) pads.push({ o, b }); return; }
      if (o.userData.themeDecor || o.userData.mapWear || (o.geometry.attributes.position && o.geometry.attributes.position.count > 12000)) { cullTriangles(o, R); return; }
      if (perimeterWall(orig, b.min.x, b.max.x, b.min.z, b.max.z, b.max.y)) { dead.push(o); return; }
      if (!R.inside((b.min.x + b.max.x) / 2, (b.min.z + b.max.z) / 2)) { dead.push(o); return; }   // (even a big one: its middle is outside)
      if (Math.max(w, d) >= 30 && Math.min(w, d) <= 2.5 && b.max.y - b.min.y <= 1.2) {            // a long painted line or a low rail: it stays only where it is over floor all the way
        const along = w >= d, n = Math.ceil(Math.max(w, d) / 3); let out = 0;
        for (let i = 0; i <= n; i++) { const t = i / n, x = along ? b.min.x + w * t : (b.min.x + b.max.x) / 2, z = along ? (b.min.z + b.max.z) / 2 : b.min.z + d * t; if (!R.inside(x, z)) out++; }
        if (out > (n + 1) * 0.12) { dead.push(o); return; }
      }
      if (Math.max(w, d) >= 60) return;                                                       // a big piece cannot be clipped: it stays where its middle is
      if (goes(R, b.min.x, b.min.z, b.max.x, b.max.z, (b.max.y - b.min.y) < 0.35)) dead.push(o);
    });
    for (const o of dead) { if (o.parent) o.parent.remove(o); }
    for (const { o, b } of pads) clipPad(o, b, R);
    // the colliders (in place: other code holds the array)
    const cols = MAP_COLLIDERS[name];
    if (cols) { const keep = cols.filter(c => c.shapeWall || c.shapeProp || !(perimeterWall(orig, c.min.x, c.max.x, c.min.z, c.max.z, c.max.y) || goes(R, c.min.x, c.min.z, c.max.x, c.max.z, (c.max.y - c.min.y) < 0.35 && c.max.y < 0.6))); cols.length = 0; cols.push(...keep); }
    dropDestructibles(name, d => !d.propId && !R.inside(d.mesh.position.x, d.mesh.position.z));
    const at = (e) => { const x = e.x ?? e.cx ?? e.x0 ?? (e.pos && e.pos.x), z = e.z ?? e.cz ?? e.z0 ?? (e.pos && e.pos.z); return (Number.isFinite(x) && Number.isFinite(z)) ? R.inside(x, z) : true; };
    const gim = MAP_GIMMICKS[name]; if (gim) for (const k of Object.keys(gim)) if (Array.isArray(gim[k])) gim[k] = gim[k].filter(at);
    for (const reg of [MAP_LADDERS, MAP_POIS, MAP_RAMPS]) if (Array.isArray(reg[name])) reg[name] = reg[name].filter(at);
  }

  // the floor, the slab under it, the tape and the posts
  function buildFloor(name, R, ground, rock) {
    const g = MAP_GROUPS[name], meshes = [];
    const shapeOf = (poly) => {
      const s = new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z)));
      for (const h of R.sub) if (!R.over.includes(poly) && inPoly(poly, h[0][0], h[0][1])) s.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, -z))));
      return s;
    };
    // the colour of the floor as it looks: its material's, times the average of its vertex colours if it has them (the maps' relief floors do)
    const col = ground.material.color ? ground.material.color.clone() : new THREE.Color(0x777770);
    if (ground.material.vertexColors && ground.geometry && ground.geometry.attributes.color) {
      const ca = ground.geometry.attributes.color, step = Math.max(1, Math.floor(ca.count / 400)); let r = 0, gg = 0, b = 0, n = 0;
      for (let i = 0; i < ca.count; i += step) { r += ca.getX(i); gg += ca.getY(i); b += ca.getZ(i); n++; }
      if (n) col.multiply(new THREE.Color(r / n, gg / n, b / n));
    }
    const mat = new THREE.MeshLambertMaterial({ color: col, side: THREE.DoubleSide }), ud = Object.assign({}, ground.userData);
    for (const poly of R.add.concat(R.over)) {
      const shp = shapeOf(poly);
      const fg = new THREE.ShapeGeometry(shp); fg.rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(fg, mat); m.position.y = -0.045; Object.assign(m.userData, ud, { thCls: 'floor', shapeKeep: true }); m.receiveShadow = true; g.add(m); meshes.push(m);
      const sg = new THREE.ExtrudeGeometry(shp, { depth: 4, bevelEnabled: false }); sg.translate(0, 0, -4); sg.rotateX(-Math.PI / 2);
      const sl = new THREE.Mesh(sg, new THREE.MeshLambertMaterial({ color: rock })); sl.position.y = -0.08; sl.userData.mapStatic = true; sl.userData.shapeKeep = true; g.add(sl);
    }
    return meshes;
  }
  function buildEdge(name, R) {
    const g = MAP_GROUPS[name], posts = [];
    let pi = 0;
    const post = (x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.5, 0.3), new THREE.MeshLambertMaterial({ color: (pi++ & 1) ? 0xd23a2a : 0xf0f0ea })); m.position.set(x, 0.75, z); m.userData.mapStatic = true; m.userData.shapeKeep = true; g.add(m); };
    const tapeBox = (x0, z0, x1, z1) => { const L = Math.hypot(x1 - x0, z1 - z0); const m = new THREE.Mesh(new THREE.BoxGeometry(L, 0.06, 0.06), new THREE.MeshLambertMaterial({ color: 0xd8c43a })); m.position.set((x0 + x1) / 2, 1.25, (z0 + z1) / 2); m.rotation.y = -Math.atan2(z1 - z0, x1 - x0); m.userData.mapStatic = true; m.userData.shapeKeep = true; g.add(m); };
    for (const poly of R.add.concat(R.sub, R.over)) {
      let prev = null;
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i], b = poly[(i + 1) % poly.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.01) continue;
        const ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L, nx = -uz, nz = ux;
        const steps = Math.max(1, Math.round(L / 10));
        for (let k = 0; k < steps; k++) {
          const t = k / steps * L, x = a[0] + ux * t, z = a[1] + uz * t;
          const p1 = R.inside(x + nx * 0.8, z + nz * 0.8), p2 = R.inside(x - nx * 0.8, z - nz * 0.8);
          if (p1 === p2) { prev = null; continue; }                // inside the floor or outside it: not the edge
          const s = p1 ? 1.2 : -1.2, px = x + nx * s, pz = z + nz * s;
          if (!R.inside(px, pz)) { prev = null; continue; }
          post(px, pz); posts.push([px, pz]);
          if (prev && Math.hypot(px - prev[0], pz - prev[1]) < 13) tapeBox(prev[0], prev[1], px, pz);
          prev = [px, pz];
        }
      }
    }
    return posts.length;
  }

  // ── spawns ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  function clearRect(name, r, margin) {
    const g = MAP_GROUPS[name], x0 = r.x0 - margin, x1 = r.x1 + margin, z0 = r.z0 - margin, z1 = r.z1 + margin;
    const hit = (b, flat) => b.max.x > x0 && b.min.x < x1 && b.max.z > z0 && b.min.z < z1 && !flat;
    g.updateMatrixWorld(true);
    const dead = [];
    g.traverse(o => {
      if (o === g || !o.isMesh || !o.geometry || o.userData.shapeKeep || o.userData.themeDecor || o.userData.mapWear) return;
      const b = meshBox(o); if (b.max.y < 0.35) return;
      if (hit(b, false)) dead.push(o);
    });
    for (const o of dead) if (o.parent) o.parent.remove(o);
    const cols = MAP_COLLIDERS[name], keep = cols.filter(c => c.shapeWall || c.max.y < 0.35 || !hit(c, false));
    cols.length = 0; cols.push(...keep);
    dropDestructibles(name);
  }
  function exposed(name) {
    const s = MAP_SPAWNS[name], cols = MAP_COLLIDERS[name]; let n = 0;
    for (const a of mapSpawnSightlineSamples(s.ally)) for (const e of mapSpawnSightlineSamples(s.enemy)) {
      const dir = e.clone().sub(a), dist = dir.length(), ray = new THREE.Ray(a, dir.normalize()), hit = new THREE.Vector3();
      if (!cols.some(c => ray.intersectBox(c, hit) && hit.distanceTo(a) < dist)) n++;
    }
    return n;
  }
  // A wall (6 m tall, turned across the way) of `len` metres, centred at (x, z), shortened until both ends are over floor. (Its colliders are tagged: no later pass takes them away.)
  function wallAt(name, R, x, z, ux, uz, len, color, minLen = 6) {
    const px = -uz, pz = ux;
    let L = len;
    while (L >= minLen && !(R.inside(x + px * L / 2, z + pz * L / 2) && R.inside(x - px * L / 2, z - pz * L / 2))) L -= 2;
    if (L < minLen) return false;
    const cols = MAP_COLLIDERS[name];
    for (; L >= minLen; L -= 2) {
      const n0 = cols.length, m = addMapBox(name, x, 3, z, L, 6, 1.6, color, Math.atan2(ux, uz));
      for (let i = n0; i < cols.length; i++) cols[i].shapeWall = true;
      m.userData.shapeKeep = true;
      if (!route(name, R, true).blockers.length) return true;                       // it leaves a way round (of our own walls, nothing else counted yet)
      cols.length = n0; if (m.parent) m.parent.remove(m);                          // it shut the way: shorter
    }
    return false;
  }
  const nearRect = (x, z, r, m) => (x > r.x0 - m && x < r.x1 + m && z > r.z0 - m && z < r.z1 + m);
  // A screen in front of each spawn, as the maps always had: a little wider than the spawn, so that nothing leaves it in the direction of the other one in the open, and with room to go round
  // either end. Then a short wall on any line of sight between the spawns that is somehow still unbroken, at the legal place nearest the middle of it.
  function blockSightlines(name, R, rects, color) {
    for (const [team, r] of Object.entries(rects)) {
      const o = rects[team === 'ally' ? 'enemy' : 'ally'], cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2, dx = (o.x0 + o.x1) / 2 - cx, dz = (o.z0 + o.z1) / 2 - cz, L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L;
      const along = Math.abs(ux) * (r.x1 - r.x0) / 2 + Math.abs(uz) * (r.z1 - r.z0) / 2, across = Math.abs(uz) * (r.x1 - r.x0) + Math.abs(ux) * (r.z1 - r.z0);
      for (const gap of [6, 8, 10, 13]) { if (wallAt(name, R, cx + ux * (along + gap), cz + uz * (along + gap), ux, uz, across + 9, color, across)) break; }
    }
    for (let n = 0; n < 16; n++) {
      const s = MAP_SPAWNS[name], cols = MAP_COLLIDERS[name]; let bad = null;
      for (const a of mapSpawnSightlineSamples(s.ally)) { for (const e of mapSpawnSightlineSamples(s.enemy)) {
        const dir = e.clone().sub(a), dist = dir.length(), ray = new THREE.Ray(a, dir.clone().normalize()), hit = new THREE.Vector3();
        if (!cols.some(c => ray.intersectBox(c, hit) && hit.distanceTo(a) < dist)) { bad = [a, e, dist]; break; }
      } if (bad) break; }
      if (!bad) return;
      const [a, e, dist] = bad, ux = (e.x - a.x) / dist, uz = (e.z - a.z) / dist;
      const ts = []; for (let t = 0.06; t <= 0.94; t += 0.02) ts.push(t); ts.sort((p, q) => Math.abs(p - 0.5) - Math.abs(q - 0.5));
      let placed = false;
      for (const t of ts) {
        const x = a.x + ux * dist * t, z = a.z + uz * dist * t;
        if (!R.inside(x, z) || nearRect(x, z, rects.ally, 4) || nearRect(x, z, rects.enemy, 4)) continue;
        if (cols.some(c => c.max.y > 0.5 && x > c.min.x - 1.5 && x < c.max.x + 1.5 && z > c.min.z - 1.5 && z < c.max.z + 1.5)) continue;
        if (wallAt(name, R, x, z, ux, uz, 10, color, 6)) { placed = true; break; }
      }
      if (!placed) return;
    }
  }
  // ── a way from one spawn to the other ──────────────────────────────────────────────────────────────────────────────────────────────────
  // Whatever the map built that stands in the way is taken away: the cheapest route on a 2 m grid (a blocked cell costs 12, a free one 1) and the scenery on it, until the route costs only steps.
  function heapPush(h, it) { h.push(it); let i = h.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (h[p][0] <= h[i][0]) break; [h[p], h[i]] = [h[i], h[p]]; i = p; } }
  function heapPop(h) { const top = h[0], last = h.pop(); if (h.length) { h[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < h.length && h[l][0] < h[m][0]) m = l; if (r < h.length && h[r][0] < h[m][0]) m = r; if (m === i) break; [h[m], h[i]] = [h[i], h[m]]; i = m; } } return top; }
  function route(name, R, oursOnly) {
    const sp = MAP_SPAWNS[name], cell = 2, b = R.bbox, x0 = Math.floor(b.x0 / cell), z0 = Math.floor(b.z0 / cell), W = Math.ceil(b.x1 / cell) - x0, H = Math.ceil(b.z1 / cell) - z0, cols = MAP_COLLIDERS[name];
    const owner = new Array(W * H).fill(null), ours = new Uint8Array(W * H);
    cols.forEach((c, ci) => { if (!(c.max.y > 0.7 && c.min.y < 1.8) || (oursOnly && !c.shapeWall)) return; for (let i = Math.max(0, Math.floor((c.min.x - 0.45) / cell) - x0); i <= Math.min(W - 1, Math.floor((c.max.x + 0.45) / cell) - x0); i++) for (let j = Math.max(0, Math.floor((c.min.z - 0.45) / cell) - z0); j <= Math.min(H - 1, Math.floor((c.max.z + 0.45) / cell) - z0); j++) { (owner[i * H + j] ||= []).push(ci); if (c.shapeWall) ours[i * H + j] = 1; } });
    const mid = t => [(t.x0 + t.x1) / 2, (t.z0 + t.z1) / 2], a = mid(sp.ally), e = mid(sp.enemy), si = Math.floor(a[0] / cell) - x0, sj = Math.floor(a[1] / cell) - z0, gi = Math.floor(e[0] / cell) - x0, gj = Math.floor(e[1] / cell) - z0;
    const dist = new Float64Array(W * H).fill(1e9), prev = new Int32Array(W * H).fill(-1), heap = [];
    dist[si * H + sj] = 0; heapPush(heap, [0, si, sj]);
    while (heap.length) {
      const [d, i, j] = heapPop(heap); if (d > dist[i * H + j]) continue; if (i === gi && j === gj) break;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= W || nj >= H || !R.inside((x0 + ni + 0.5) * cell, (z0 + nj + 0.5) * cell)) continue;
        const nd = d + (owner[ni * H + nj] ? (ours[ni * H + nj] ? 1000 : 30) : 1); if (nd < dist[ni * H + nj]) { dist[ni * H + nj] = nd; prev[ni * H + nj] = i * H + j; heapPush(heap, [nd, ni, nj]); }
      }
    }
    const blockers = new Set(); let k = gi * H + gj;
    while (k >= 0) { if (owner[k]) owner[k].forEach(ci => blockers.add(ci)); k = prev[k]; }
    return { cost: dist[gi * H + gj], blockers: [...blockers] };
  }
  function ensureRoute(name, R) {
    const g = MAP_GROUPS[name], cols = MAP_COLLIDERS[name];
    for (let n = 0; n < 30; n++) {
      const r = route(name, R);
      if (!r.blockers.length) return n;
      g.updateMatrixWorld(true);
      const meshes = []; g.traverse(o => { if (o.isMesh && o.geometry && !o.userData.shapeKeep && !o.userData.themeDecor && !o.userData.mapWear) meshes.push({ o, b: new THREE.Box3().setFromObject(o) }); });
      const dead = new Set(), deadMesh = new Set();
      for (const ci of r.blockers) {
        const c = cols[ci]; if (!c || c.shapeWall) continue;
        dead.add(c);
        // the piece of scenery it belongs to: the smallest mesh whose box holds it. That goes, with every collider of that mesh.
        let best = null; const cx = (c.min.x + c.max.x) / 2, cz = (c.min.z + c.max.z) / 2, cy = (c.min.y + c.max.y) / 2;
        for (const m of meshes) { if (cx < m.b.min.x - 0.3 || cx > m.b.max.x + 0.3 || cz < m.b.min.z - 0.3 || cz > m.b.max.z + 0.3 || cy < m.b.min.y - 0.3 || cy > m.b.max.y + 0.3) continue; const v = (m.b.max.x - m.b.min.x) * (m.b.max.z - m.b.min.z); if (!best || v < best.v) best = { m, v }; }
        if (best) { deadMesh.add(best.m.o); for (const q of cols) if (!q.shapeWall && (q.min.x + q.max.x) / 2 >= best.m.b.min.x - 0.3 && (q.min.x + q.max.x) / 2 <= best.m.b.max.x + 0.3 && (q.min.z + q.max.z) / 2 >= best.m.b.min.z - 0.3 && (q.min.z + q.max.z) / 2 <= best.m.b.max.z + 0.3 && q.min.y >= best.m.b.min.y - 0.3 && q.max.y <= best.m.b.max.y + 0.3) dead.add(q); }
      }
      if (!dead.size) return -1;                                         // what is left in the way is the outline's own
      const keep = cols.filter(q => !dead.has(q)); cols.length = 0; cols.push(...keep);
      for (const o of deadMesh) if (o.parent) o.parent.remove(o);
      dropDestructibles(name);
    }
    return -1;
  }
  // ── the explosive barrels and crates ─────────────────────────────────────────────────────────────────────────────────────────────────────
  // They stood by the old walls, which are gone on most maps. A pair (or a stack) that is off the floor now moves as one to the nearest good spot on it: wholly on the floor with room to
  // spare, clear of other scenery, a long way from both spawns and from the other barrels. Where there is no such spot, it goes.
  function homeProps(name, R, rects) {
    const list = mapDestructibles.filter(d => d.mapName === name && d.propId && d.mesh && d.mesh.parent), cols = MAP_COLLIDERS[name];
    const roomy = (x, z, m) => R.inside(x, z) && R.inside(x + m, z) && R.inside(x - m, z) && R.inside(x, z + m) && R.inside(x, z - m);
    const farFromSpawns = (x, z) => Object.values(rects).every(r => Math.hypot(Math.max(r.x0 - x, 0, x - r.x1), Math.max(r.z0 - z, 0, z - r.z1)) > 10);
    const clearOf = (x, z, self) => !cols.some(c => !c.shapeProp && !self.has(c) && c.max.y > 0.5 && c.min.y < 2 && x > c.min.x - 1.8 && x < c.max.x + 1.8 && z > c.min.z - 1.8 && z < c.max.z + 1.8);
    const out = list.filter(d => !roomy(d.mesh.position.x, d.mesh.position.z, 1.5));
    const stay = list.filter(d => !out.includes(d)), placed = stay.map(d => [d.mesh.position.x, d.mesh.position.z]);
    // a cluster: barrels within 3 m of one another
    const clusters = [], seen = new Set();
    for (const d of out) { if (seen.has(d)) continue; const cl = [d]; seen.add(d); for (let i = 0; i < cl.length; i++) for (const e of out) if (!seen.has(e) && Math.hypot(e.mesh.position.x - cl[i].mesh.position.x, e.mesh.position.z - cl[i].mesh.position.z) <= 3) { seen.add(e); cl.push(e); } clusters.push(cl); }
    const b = R.bbox;
    for (const cl of clusters) {
      const cx = cl.reduce((t, d) => t + d.mesh.position.x, 0) / cl.length, cz = cl.reduce((t, d) => t + d.mesh.position.z, 0) / cl.length, self = new Set(cl.map(d => d.colliderRef));
      const cand = []; for (let x = Math.ceil(b.x0 / 2) * 2; x <= b.x1; x += 2) for (let z = Math.ceil(b.z0 / 2) * 2; z <= b.z1; z += 2) cand.push([x, z, Math.hypot(x - cx, z - cz)]);
      cand.sort((p, q) => p[2] - q[2]);
      let pick = null;
      for (const [x, z] of cand) {
        const ok = cl.every(d => { const px = d.mesh.position.x - cx + x, pz = d.mesh.position.z - cz + z; return roomy(px, pz, 2.5) && farFromSpawns(px, pz) && clearOf(px, pz, self) && placed.every(([qx, qz]) => Math.hypot(qx - px, qz - pz) > 6); });
        if (ok) { pick = [x, z]; break; }
      }
      for (const d of cl) {
        if (!pick) { d.mesh.parent.remove(d.mesh); continue; }
        const dx = pick[0] - cx, dz = pick[1] - cz;
        d.mesh.position.x += dx; d.mesh.position.z += dz; d.mesh.updateMatrixWorld(true);
        if (d.colliderRef) { d.colliderRef.min.x += dx; d.colliderRef.max.x += dx; d.colliderRef.min.z += dz; d.colliderRef.max.z += dz; if (!cols.includes(d.colliderRef)) cols.push(d.colliderRef); }
        const px = d.mesh.position.x, pz = d.mesh.position.z; placed.push([px, pz]);
        d.onDestroy = opts => detonateMapProp(name, new THREE.Vector3(px, 0.8, pz), opts);   // (it goes off where it stands now)
      }
    }
    dropDestructibles(name);
  }
  function placeSpawns(name, S, R) {
    const g0 = MAP_GROUPS[name], rw = S.spawns.w || 44, rd = S.spawns.d || 8, mk = ([cx, cz]) => ({ x0: cx - rw / 2, x1: cx + rw / 2, z0: cz - rd / 2, z1: cz + rd / 2 });
    const rects = { ally: mk(S.spawns.ally), enemy: mk(S.spawns.enemy) };
    for (const r of Object.values(rects)) clearRect(name, r, 1.5);
    MAP_SPAWNS[name] = rects;
    homeProps(name, R, rects);
    const th = MAP_THEMES[name] || {}, color = th.w != null ? th.w : 0x6a6a66;
    blockSightlines(name, R, rects, color);
    g0.userData.shapeRoute = ensureRoute(name, R);
    return exposed(name);
  }

  // ── the whole thing ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  function apply(name) {
    const S = SHAPES[name], g = typeof MAP_GROUPS !== 'undefined' ? MAP_GROUPS[name] : null;
    if (!S || !g) return false;
    if (g._shaped) { cull(name, g._shaped.region, g._shaped.core); if (S.spawns) g.userData.shapeRoute = ensureRoute(name, g._shaped.region); return true; }   // the later passes (the gimmick, the wear, the theme dressing): whatever they added outside goes, and what they put in the way
    const spec = S.build(), R = makeRegion(spec); S.info = spec.info;
    // the old ground: the biggest plane (its material is the map's floor), and the slab under it (its colour is the edge's)
    g.updateMatrixWorld(true);
    let ground = null, rock = 0x4a4a46;
    g.traverse(o => {
      if (!o.isMesh || !o.geometry) return;
      const b = meshBox(o), fk = flatKind(o, b), a = (b.max.x - b.min.x) * (b.max.z - b.min.z);
      // the floor: the maps' floors are flat quads (an arena floor, and four strips of ground round it). The strips carry the colour of most of an outline's floor, so one of them is the model; no strips: the arena.
      if (fk === 'pad' && o.geometry.type === 'BufferGeometry' && o.material && o.material.color && a >= 3000) {
        const mid = b.min.x <= 0 && b.max.x >= 0 && b.min.z <= 0 && b.max.z >= 0, rank = mid ? 0 : 1;
        if (!ground || rank > ground.rank || (rank === ground.rank && a > ground.area)) ground = { mesh: o, area: a, rank };
      }
      if (b.max.y <= 0.1 && b.min.y <= -1 && o.material && o.material.color && Math.max(b.max.x - b.min.x, b.max.z - b.min.z) >= 25) rock = o.material.color.getHex();
    });
    const v0 = MAP_VOID[name] || { killY: -45, far: 90 }, old0 = MAP_BOUNDS[name] || { halfX: 1e9, halfZ: 1e9 };
    const gmesh = ground ? ground.mesh : { material: new THREE.MeshLambertMaterial({ color: 0x777770 }), userData: {}, geometry: null };
    for (const d of mapDestructibles) if (d.mapName === name && d.propId && d.mesh) { d.mesh.traverse(o => { o.userData.shapeKeep = true; }); if (d.colliderRef) d.colliderRef.shapeProp = true; }   // (barrels are moved, not culled)
    const core0 = MAP_BOT_BOUNDS[name] || old0, core = { halfX: Math.min(old0.halfX, core0.halfX), halfZ: Math.min(old0.halfZ, core0.halfZ) };   // (the walls stand on the old core, inside the outskirts)
    cull(name, R, core);                                  // (the old floor and slab go with it: they are ground-like)
    buildFloor(name, R, gmesh, rock);
    MAP_VOID[name] = { halfX: R.halfX, halfZ: R.halfZ, rects: rasterize(R, 4), inside: R.inside, killY: v0.killY, far: v0.far };
    setMapBounds(name, R.halfX * 2, R.halfZ * 2);
    MAP_BOT_BOUNDS[name] = { halfX: Math.max(10, R.halfX - 1), halfZ: Math.max(10, R.halfZ - 1) };
    g._shaped = { region: R, posts: buildEdge(name, R), orig: { halfX: old0.halfX, halfZ: old0.halfZ }, core, info: S.info || null };
    if (S.spawns) g._shaped.exposed = placeSpawns(name, S, R);
    g.userData.shaped = S.cls;
    return true;
  }

  window.PVP_SHAPES = { SHAPES, P, apply, makeRegion, rasterize, area, inPoly, flatKind, meshBox, measure, connected, irregular, rng, route };
})();
