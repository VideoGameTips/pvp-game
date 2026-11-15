// ⏳ M1 Garand -> THE CLOCKWORK REQUIEM (Gen 3, mythic). An astronomical timepiece that fires lost time. A real remodel: ivory-and-gold plates that FLOAT round a black core (the stock is six
// separate pieces, the receiver is wrapped in plates that never quite touch it), an orrery above the receiver (a glass globe with a gold core, two armillary rings, three planets in orbit and a
// thin dial ring with its twelve marks), and gold rings down the barrel that are the shot. Same Garand underneath: the muzzle, the reach and the handling are the stock M1's.
//   idle     the rings tilt and turn, the planets orbit, the plates drift a hair, the globe breathes
//   fire     the rings LOCK (time stops) for ~80 ms, then SURGE forward one after another with the shot
//   reload   the Garand "ping": the empty clip is thrown up and time rewinds (a ring spins backward), eight new rounds assemble in the air one by one, the clip drops home, PING
//   inspect  it unfolds into a full astronomical clock (the globe rises, the planets sweep wide, the dial opens, the plates spread) and reassembles
//   kill     (look.hit 'clock', registered at the bottom) a huge clock face behind the target, its hands spinning backward, as the target breaks into fragments of time
function buildClockworkRequiem() {
  const g = new THREE.Group();
  const ivory = gpFinish(0xf0e6d2, 0.30, 0.10, 'steel'), gold = gpFinish(0xd7ab45, 0.22, 0.92, 'steel'), black = gpFinish(0x14110f, 0.4, 0.72, 'steel'), pale = gpFinish(0xf6efdc, 0.3, 0.1, 'steel');
  const glow = new THREE.MeshBasicMaterial({ color: 0xffc86a, toneMapped: false });
  const glass = new THREE.MeshPhongMaterial({ color: 0xa9b8ff, transparent: true, opacity: 0.34, shininess: 160, specular: 0xffffff, emissive: 0x1a2250, depthWrite: false });
  const rose = gpFinish(0xd9917f, 0.3, 0.6, 'steel');
  ivory.emissive = new THREE.Color(0x2c261a); gold.emissive = new THREE.Color(0x3d2a06);
  const pieces = [];                                                                   // floating plates: { m, home, ph }
  const plate = (mat, poly, w) => { gpPlate(g, mat, poly, w, 0); return g.children[g.children.length - 1]; };   // (gpPlate adds the plate and returns nothing)
  const float = (m, amp = 0.0022) => { pieces.push({ m, home: m.position.clone(), rot: m.rotation.clone(), ph: Math.random() * 6.28, amp }); return m; };
  // ── the black core: barrel, bolt, the thin receiver the plates float round ──
  gpCyl(g, black, 0.0072, 0.0072, 0.340, 14, 0, 0.008, -0.220);                        // barrel
  gpBox(g, black, 0.020, 0.030, 0.170, 0, 0.010, 0.050);                               // receiver core
  gpBox(g, black, 0.016, 0.014, 0.070, 0, 0.004, 0.224);                               // the spine the stock pieces hang on
  gpCyl(g, gold, 0.0050, 0.0050, 0.012, 10, 0, 0.008, -0.384);                         // muzzle crown
  // ── receiver plates: top, both sides, a gap of a few millimetres all round ──
  float(gpBox(g, ivory, 0.030, 0.006, 0.180, 0, 0.032, 0.050));
  for (const sd of [-1, 1]) {
    const sp = float(gpBox(g, ivory, 0.005, 0.040, 0.170, sd * 0.020, 0.010, 0.052));
    for (const y of [-0.0165, 0.0165]) { const line = new THREE.Mesh(new THREE.BoxGeometry(0.0012, 0.0016, 0.160), gold); line.position.set(sd * 0.0030, y, 0); sp.add(line); }        // a gold border
    for (let k = 0; k < 7; k++) { const star = new THREE.Mesh(new THREE.BoxGeometry(0.0014, 0.0030, 0.0030), gold); star.position.set(sd * 0.0030, ((k * 37) % 5 - 2) * 0.0055, -0.065 + k * 0.0215); star.rotation.x = k * 0.7; sp.add(star); }   // a scatter of constellations
  }
  gpBox(g, gold, 0.0030, 0.0030, 0.150, 0, 0.0365, 0.050);                            // a gold line down the top plate
  // ── the stock: six pieces with air between them ──
  const stockPieces = [
    [[0.150, -0.020], [0.160, 0.010], [0.190, 0.014], [0.192, -0.030], [0.165, -0.046]],
    [[0.200, -0.030], [0.202, 0.016], [0.236, 0.018], [0.240, -0.040], [0.214, -0.058]],
    [[0.248, -0.040], [0.246, 0.018], [0.282, 0.014], [0.286, -0.046], [0.262, -0.062]],
    [[0.294, -0.046], [0.292, 0.012], [0.322, -0.004], [0.326, -0.050], [0.306, -0.064]],
  ];
  stockPieces.forEach(poly => float(plate(ivory, poly, 0.038), 0.003));
  for (let i = 0; i < 2; i++) float(gpBox(g, ivory, 0.040, 0.012, 0.030, 0, 0.026 - i * 0.002, 0.230 + i * 0.070, i ? 0.10 : -0.08), 0.0025);   // the comb, in two shards
  // a sun engraved on the middle stock piece, both faces: a gold disc and eight rays
  for (const sd of [-1, 1]) {
    const sun = new THREE.Group(); sun.position.set(sd * 0.0198, -0.014, 0.244); g.add(sun);
    gpCyl(sun, gold, 0.0070, 0.0070, 0.0016, 14, 0, 0, 0, 0, Math.PI / 2);
    for (let r = 0; r < 8; r++) { const a = r / 8 * Math.PI * 2; gpBox(sun, gold, 0.0012, 0.0036, 0.0016, 0, Math.cos(a) * 0.0105, Math.sin(a) * 0.0105, a, 0, 0); }
  }
  gpPlate(g, gold, [[0.340, -0.030], [0.336, -0.052], [0.350, -0.052], [0.352, -0.026]], 0.044, 0);   // the butt, a gold cap
  // ── the orrery: a glass globe with a golden core, armillary rings and planets, low over the receiver (it must not fill the sight picture) ──
  const OR = new THREE.Group(); OR.position.set(0, 0.062, 0.034); g.add(OR);
  OR.add(new THREE.Mesh(new THREE.SphereGeometry(0.0205, 18, 14), glass));
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 12, 10), glow); OR.add(core);
  const armillary = [];
  [[0.030, 0.0011, 0.0, 0.0], [0.036, 0.0010, 1.15, 0.5]].forEach(([R, tb, rx, rz]) => {
    const pivot = new THREE.Group(); pivot.rotation.set(rx, 0, rz); OR.add(pivot);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R, tb, 5, 36), gold); pivot.add(ring);
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; const tick = new THREE.Mesh(new THREE.BoxGeometry(0.0014, 0.0030, 0.0014), gold); tick.position.set(Math.cos(a) * R, Math.sin(a) * R, 0); tick.rotation.z = a; pivot.add(tick); }
    armillary.push({ pivot, R });
  });
  const planets = [[0.044, 0.0050, rose, 0.9, 0.3], [0.054, 0.0066, gold, 0.55, 1.1], [0.062, 0.0040, pale, 1.3, 2.2]].map(([R, r, m, sp, tilt], i) => {
    const orbit = new THREE.Group(); orbit.rotation.set(tilt * 0.5, 0, tilt * 0.35); OR.add(orbit);
    const body = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), m); body.position.x = R; orbit.add(body);
    return { orbit, body, R, sp, ph: i * 2.1 };
  });
  // the dial: a thin ring in the plane of the gun, with its twelve marks (opens wide in the inspect)
  const dial = new THREE.Group(); dial.position.set(0, 0.062, 0.034); dial.rotation.y = Math.PI / 2; g.add(dial);
  dial.add(new THREE.Mesh(new THREE.TorusGeometry(0.050, 0.0012, 5, 48), gold));
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; const tick = new THREE.Mesh(new THREE.BoxGeometry(k % 3 ? 0.0012 : 0.0020, k % 3 ? 0.0034 : 0.0060, 0.0012), k % 3 ? gold : glow); tick.position.set(Math.cos(a) * 0.050, Math.sin(a) * 0.050, 0); tick.rotation.z = a; dial.add(tick); }
  // ── the barrel rings: they ARE the shot ──
  const rings = [];
  [-0.090, -0.150, -0.205, -0.258, -0.312].forEach((z, i) => {
    const R = 0.0150 + 0.0016 * (i % 2), piv = new THREE.Group(); piv.position.set(0, 0.008, z); g.add(piv);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.0011, 5, 30), gold); piv.add(ring);
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; const tick = new THREE.Mesh(new THREE.BoxGeometry(0.0012, 0.0032, 0.0012), glow); tick.position.set(Math.cos(a) * R, Math.sin(a) * R, 0); tick.rotation.z = a; piv.add(tick); }
    rings.push({ piv, z, i, spin: (i % 2 ? -1 : 1) * (0.7 + 0.12 * i) });
  });
  float(gpCyl(g, ivory, 0.0125, 0.0125, 0.050, 14, 0, 0.008, -0.170), 0.0016);        // two ivory sleeves on the barrel
  float(gpCyl(g, ivory, 0.0115, 0.0115, 0.040, 14, 0, 0.008, -0.290), 0.0016);
  // ── sights: a gold aperture at the back, a ringed post at the front ──
  const apt = new THREE.Mesh(new THREE.TorusGeometry(0.0060, 0.0013, 5, 14), gold); apt.position.set(0, 0.040, 0.128); g.add(apt);
  gpBox(g, black, 0.004, 0.014, 0.004, 0, 0.032, 0.128);
  const fsight = new THREE.Mesh(new THREE.TorusGeometry(0.0072, 0.0011, 5, 14), gold); fsight.position.set(0, 0.034, -0.368); g.add(fsight);
  gpBox(g, black, 0.003, 0.016, 0.003, 0, 0.024, -0.368);
  // ── trigger group ──
  const guard = new THREE.Mesh(new THREE.TorusGeometry(0.020, 0.0030, 6, 12, Math.PI * 1.05), gold); guard.rotation.set(0, Math.PI / 2, -0.4); guard.position.set(0, -0.034, 0.052); g.add(guard);
  gpBox(g, gold, 0.005, 0.015, 0.005, 0, -0.026, 0.052, 0.2);
  gpBox(g, black, 0.026, 0.014, 0.060, 0, -0.020, 0.044);
  // ── the clip: eight gold rounds in a black en-bloc clip, seen in the receiver's top slot; it is thrown out and rebuilt in the reload ──
  const clip = new THREE.Group(); clip.position.set(0, 0.030, 0.040); g.add(clip);
  clip.add(new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.004, 0.050), black));
  const rounds = [];
  for (let k = 0; k < 8; k++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.0024, 0.0024, 0.016, 8), gold); b.position.set(((k % 2) - 0.5) * 0.005, 0.010, -0.021 + k * 0.006); clip.add(b); rounds.push(b); const tip = new THREE.Mesh(new THREE.ConeGeometry(0.0024, 0.006, 8), rose); tip.position.y = 0.011; b.add(tip); }
  const rewind = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.0013, 5, 28), glow); rewind.visible = false; clip.add(rewind);
  const muzzleGlow = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd68a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  muzzleGlow.position.set(0, 0.008, -0.398); g.add(muzzleGlow);
  // ── motion ──
  const sm = k => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
  let fireT = 9, T = 0, pinged = false;
  g._onFire = () => { fireT = 0; };
  g._tick = (dt, now) => {
    T += dt; fireT += dt;
    const rel = g._reloadStart && g._reloadDur ? (Date.now() - g._reloadStart) / g._reloadDur : -1;
    const insp = !!g._inspectMode && rel >= 0 && rel <= 1;
    const reloading = !g._inspectMode && rel >= 0 && rel <= 1;
    // the inspect envelope: open out, hold, fold back
    const env = insp ? (rel < 0.2 ? sm(rel / 0.2) : rel < 0.72 ? 1 : 1 - sm((rel - 0.72) / 0.28)) : 0;
    // orrery: breathes at idle, rises and widens in the inspect
    OR.position.y = 0.062 + 0.040 * env; OR.scale.setScalar(1 + 1.6 * env);
    dial.position.y = OR.position.y; dial.scale.setScalar(1 + 1.1 * env);
    const spin = 1 + 5 * env;
    core.scale.setScalar(1 + 0.12 * Math.sin(T * 2.2) + 0.5 * env);
    armillary.forEach((a, i) => { a.pivot.rotation.y += dt * (0.5 + i * 0.35) * spin; a.pivot.rotation.x += dt * 0.25 * spin; });
    planets.forEach(p => { p.ph += dt * p.sp * spin; p.body.position.set(Math.cos(p.ph) * p.R * (1 + 0.8 * env), 0, Math.sin(p.ph) * p.R * (1 + 0.8 * env)); p.orbit.rotation.y += dt * 0.15; });
    dial.rotation.z += dt * (0.2 + 2.2 * env);
    // the plates drift (and spread in the inspect)
    pieces.forEach(p => { const a = Math.sin(T * 0.9 + p.ph) * p.amp, b = Math.cos(T * 0.7 + p.ph * 1.3) * p.amp; p.m.position.set(p.home.x + (p.home.x === 0 ? 0 : Math.sign(p.home.x) * 0.030 * env) + a * 0.5, p.home.y + b + 0.020 * env * (p.home.y > 0.01 ? 1 : -0.4), p.home.z + a); p.m.rotation.z = p.rot.z + Math.sin(T * 0.6 + p.ph) * 0.02 + 0.35 * env * Math.sin(p.ph); });
    // the barrel rings: turn at idle; on a shot they stop dead, then surge forward one after another
    const lock = fireT < 0.08, surge = fireT >= 0.08 && fireT < 0.34;
    rings.forEach(r => {
      if (!lock) r.piv.children[0].rotation.z += dt * r.spin * (surge ? 6 : 1) * spin;
      r.piv.rotation.x = lock ? 0 : Math.sin(T * 0.8 + r.i) * 0.30 * (1 - env);
      let z = r.z, s = 1;
      if (surge) { const u = (fireT - 0.08 - r.i * 0.022) / 0.14; if (u > 0 && u < 1) { z = r.z - 0.032 * Math.sin(u * Math.PI); s = 1 + 0.35 * Math.sin(u * Math.PI); } }
      if (insp) z = r.z - 0.020 * env * (r.i - 2);
      r.piv.position.z = z; r.piv.scale.setScalar(s);
    });
    muzzleGlow.material.opacity = fireT >= 0.08 && fireT < 0.28 ? 0.9 * (1 - (fireT - 0.08) / 0.2) : 0; muzzleGlow.scale.setScalar(0.6 + Math.min(1, Math.max(0, fireT - 0.08)) * 6);
    // the reload: throw the clip, rewind, rebuild the rounds one by one, drop it home, PING
    rewind.visible = false;
    if (reloading) {
      pinged = pinged && rel > 0.88;
      if (rel < 0.28) { const u = sm(rel / 0.28); clip.position.set(0.012 * u * 4, 0.030 + 0.070 * u, 0.040 - 0.030 * u); clip.rotation.set(-1.2 * u, 0, 0.9 * u); rounds.forEach(b => { b.visible = true; }); }
      else if (rel < 0.72) {
        const u = (rel - 0.28) / 0.44; clip.position.set(0.048, 0.100 + 0.004 * Math.sin(T * 6), 0.010); clip.rotation.set(-1.2 + Math.sin(T * 3) * 0.08, 0, 0.9);
        rewind.visible = true; rewind.rotation.z -= dt * 16; rewind.scale.setScalar(1 + 0.25 * Math.sin(u * 12));
        rounds.forEach((b, k) => { b.visible = u * 8 > k; });                          // new rounds appear in order, as time runs backward
      } else if (rel < 0.92) { const u = sm((rel - 0.72) / 0.2); clip.position.set(0.048 * (1 - u), 0.100 - 0.070 * u, 0.010 + 0.030 * u); clip.rotation.set(-1.2 * (1 - u), 0, 0.9 * (1 - u)); rounds.forEach(b => { b.visible = true; }); }
      else { clip.position.set(0, 0.030, 0.040); clip.rotation.set(0, 0, 0); if (!pinged) { pinged = true; try { playSoundEvent('deflect_ping', { volume: 0.7, pitch: 1.25, minGap: 0 }); } catch (e) {} } }
    } else { clip.position.set(0, 0.030, 0.040); clip.rotation.set(0, 0, 0); rounds.forEach(b => { b.visible = true; }); pinged = false; }
  };
  g._tick(0.016, 0);
  const flash = makeMuzzleFlash(); flash.position.set(0, 0.008, -0.392); g.add(flash);
  g._flash = flash; g._kickZ = 0.020; g._greebled = true; g._handDetailed = true;
  g.position.set(0.12, -0.1, -0.25);
  return g;
}

// ── the kill effect: a huge clock face behind the target, its hands spinning backward, the target breaking into fragments of time ──
// Registered when the page has loaded (game.js owns HIT_STYLES and FINISHER_MOVES; this file loads before it).
window.addEventListener('load', () => {
  try {
    if (typeof HIT_STYLES === 'object' && HIT_STYLES.gold && !HIT_STYLES.clock) {
      HIT_STYLES.clock = Object.assign({}, HIT_STYLES.gold, { coins: false, chars: 'IVXLC', glow: '#ffcf6a', fill: '#fff0c8', hit: 0xfff0c8, miss: 0xffd24a, screen: 'rgba(255,210,120,0.14)', num: '#ffe08a' });
    }
    if (typeof FINISHER_MOVES === 'object') FINISHER_MOVES.clock = clockworkFinisherMove;
  } catch (e) {}
});
let _clockTex;
function _clockFaceTexture() {
  if (_clockTex !== undefined) return _clockTex;
  try {
    const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
    x.fillStyle = 'rgba(20,15,8,0.55)'; x.beginPath(); x.arc(256, 256, 246, 0, 7); x.fill();
    x.strokeStyle = '#f0c25a'; x.lineWidth = 10; x.beginPath(); x.arc(256, 256, 240, 0, 7); x.stroke();
    x.lineWidth = 3; x.beginPath(); x.arc(256, 256, 214, 0, 7); x.stroke();
    x.fillStyle = '#ffe3a0'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = 'bold 54px serif'; x.shadowColor = '#ffb030'; x.shadowBlur = 14;
    ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'].forEach((t, i) => { const a = i / 12 * Math.PI * 2 - Math.PI / 2; x.fillText(t, 256 + Math.cos(a) * 180, 256 + Math.sin(a) * 180); });
    for (let k = 0; k < 60; k++) { const a = k / 60 * Math.PI * 2; x.lineWidth = k % 5 ? 2 : 5; x.beginPath(); x.moveTo(256 + Math.cos(a) * 222, 256 + Math.sin(a) * 222); x.lineTo(256 + Math.cos(a) * (k % 5 ? 232 : 238), 256 + Math.sin(a) * (k % 5 ? 232 : 238)); x.stroke(); }
    _clockTex = new THREE.CanvasTexture(c);
  } catch (e) { _clockTex = null; }
  return _clockTex;
}
function clockworkFinisherMove(mesh, id, c, killerId) {
  const body = _finisherMat('clock', 0xd8c9a8); body.color.setHex(0xd8c9a8); body.emissive.setHex(0x3a2a08);
  _finisherSwap(mesh, body);
  playSoundEvent('hitmarker', { position: mesh.position, volume: 0.6, minGap: 80 });
  const killer = killerId === myId ? camera.position : (remoteMeshes[killerId] && remoteMeshes[killerId].position);
  const away = new THREE.Vector3(mesh.position.x - (killer ? killer.x : mesh.position.x), 0, mesh.position.z - (killer ? killer.z : mesh.position.z - 1));
  if (away.lengthSq() < 0.01) away.set(0, 0, -1); away.normalize();
  const tex = _clockFaceTexture(), group = new THREE.Group();
  const face = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), new THREE.MeshBasicMaterial(tex ? { map: tex, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide } : { color: 0xd7ab45, transparent: true, opacity: 0, side: THREE.DoubleSide }));
  const handMat = new THREE.MeshBasicMaterial({ color: 0xffe3a0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const minute = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.25, 0.01), handMat), hour = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.8, 0.01), handMat);
  minute.geometry.translate(0, 0.62, 0); hour.geometry.translate(0, 0.4, 0);
  group.add(face, minute, hour);
  group.position.set(mesh.position.x + away.x * 1.0, mesh.position.y + 1.25, mesh.position.z + away.z * 1.0);
  group.lookAt(group.position.x + away.x, group.position.y, group.position.z + away.z);
  scene.add(group);
  let gone = false;
  const cleanup = () => { if (gone) return; gone = true; scene.remove(group); face.geometry.dispose(); face.material.dispose(); minute.geometry.dispose(); hour.geometry.dispose(); handMat.dispose(); };
  setTimeout(cleanup, 2600);
  let burst = false;
  _finisherDrive(mesh, id, 1700, (t, dt, st) => {
    const op = t < 0.12 ? t / 0.12 : t < 0.75 ? 1 : Math.max(0, 1 - (t - 0.75) / 0.25);
    face.material.opacity = 0.85 * op; handMat.opacity = 0.95 * op;
    group.scale.setScalar(0.8 + 0.2 * Math.min(1, t / 0.2));
    minute.rotation.z += dt * 14; hour.rotation.z += dt * 1.2;                       // backward: counter-clockwise as seen from the front is time running out the other way
    const shrink = t > 0.62 ? Math.max(0.02, 1 - (t - 0.62) / 0.38) : 1;
    mesh.position.set(st.p.x, st.p.y + 0.35 * Math.sin(Math.min(1, t / 0.6) * Math.PI / 2), st.p.z);   // it rises a little, as if lifted out of the moment
    mesh.rotation.y = st.r.y - t * 2.6; mesh.rotation.x = st.r.x; mesh.rotation.z = st.r.z;
    mesh.scale.set(st.s.x * shrink, st.s.y * shrink, st.s.z * shrink);
    if (t > 0.62 && !burst) {
      burst = true; const at = st.p.clone().setY(st.p.y + 1.2);
      _finisherBurst(at, 0xffd479, 40, [0xffd479, 0xfff2c9, 0xd8c9a8, 0x6a4a14]); _spawnFinisherRing(st.p.clone(), 0xffd479, 2.4);
      playSoundEvent('hitmarker', { position: at, volume: 0.9, minGap: 40 });
    }
  }, st => { cleanup(); });
}
function playClockFinisher(targetId, killerId) {
  const mesh = remoteMeshes[targetId];
  if (!mesh || !mesh.visible) return false;
  if (mesh._finisher && performance.now() < mesh._finisher.until) return true;
  mesh._finisher = { id: 'clock', until: performance.now() + 4200 };
  clockworkFinisherMove(mesh, targetId, 0xffd479, killerId);
  pushFeedLine('LOST TIME', players[targetId]?.name || 'Enemy', '#ffd479');
  return true;
}
