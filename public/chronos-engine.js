// ⏳ Crossbow -> CHRONOS ENGINE (Gen 3, legendary). A pocket watch turned into a crossbow. A real remodel, not a paint job: the middle of the weapon is a tall circular clock casing the
// bolt rail runs through, with an exposed escape wheel and a balance wheel inside it; the limbs are two hinged clock-hand arms with tension cables to a carriage on the rail; a winding
// key sticks out of the right side; and the stock is a hollow brass frame with a pendulum hanging in it. It stays the Crossbow: same reach, same hitbox, same muzzle (the bolt tip).
//   idle     the balance wheel rocks, the escape wheel ticks round, the pendulum swings
//   fire     the arms snap inward, the clock hands spin, the pendulum stops for a moment, then the arms draw back out
//   reload   the key winds, the arms unfold wide and reset, the carriage draws back and a new bolt appears on the rail
//   inspect  the escape wheel and hands run fast and the balance wheel swings wide (the global inspect roll shows the mechanism off)
function buildChronosEngine() {
  const g = new THREE.Group();
  const brass = gpFinish(0xc79a45, 0.30, 0.80, 'steel'), bronze = gpFinish(0x7a5424, 0.40, 0.70, 'steel'), steel = gpFinish(0xcfd4dc, 0.26, 0.85, 'steel');
  const dark = gpFinish(0x1c1a18, 0.50, 0.40, 'steel'), face = gpFinish(0xe9e1c8, 0.60, 0.05, 'steel'), leather = GUN_MATS.grip();
  const amber = new THREE.MeshBasicMaterial({ color: 0xffa42e, toneMapped: false });
  const R = 0.046, CZ = -0.040;                                                         // the clock casing: radius, and where along the rail its centre is
  // ── the bolt rail, passing straight through the casing ──
  gpBox(g, bronze, 0.016, 0.008, 0.330, 0, -0.006, -0.085);
  gpBox(g, dark, 0.006, 0.003, 0.310, 0, -0.0005, -0.085);                              // the groove
  gpPart(g, 'ammo', () => {
    gpCyl(g, steel, 0.0032, 0.0032, 0.200, 8, 0, 0.003, -0.150);                        // the bolt
    gpCyl(g, steel, 0.0004, 0.0046, 0.026, 8, 0, 0.003, -0.263);                        // its head
    gpBox(g, brass, 0.012, 0.0016, 0.012, 0, 0.003, -0.056);                            // and its brass flights
  });
  // ── the clock casing: a thick brass bezel, a back plate with the dial rings, open in the middle so the works show ──
  const bez = (x, r, t) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, t, 8, 40), brass); m.rotation.y = Math.PI / 2; m.position.set(x, 0, CZ); g.add(m); return m; };
  for (const sx of [-1, 1]) { bez(sx * 0.0125, R, 0.0036); bez(sx * 0.0125, R * 0.72, 0.0016); }
  gpCyl(g, bronze, R, R, 0.0050, 28, 0, 0, CZ, 0, Math.PI / 2);                         // the middle plate the works are mounted on
  for (let i = 0; i < 12; i++) {                                                        // the twelve hour marks, both faces
    const a = i / 12 * Math.PI * 2, y = Math.cos(a) * R * 0.86, z = CZ + Math.sin(a) * R * 0.86;
    for (const sx of [-1, 1]) gpBox(g, i % 3 ? steel : amber, 0.0022, i % 3 ? 0.0034 : 0.0062, 0.0026, sx * 0.0148, y, z, a, 0, 0);
  }
  // the escape wheel (toothed, above the rail) and the balance wheel (a spoked ring, below it)
  const escape = new THREE.Group(); escape.position.set(0, 0.021, CZ); g.add(escape);
  gpCyl(escape, steel, 0.0150, 0.0150, 0.0036, 12, 0, 0, 0, 0, Math.PI / 2);
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; gpBox(escape, steel, 0.0034, 0.0050, 0.0030, 0, Math.cos(a) * 0.0165, Math.sin(a) * 0.0165, a, 0, 0); }
  gpCyl(escape, amber, 0.0045, 0.0045, 0.0050, 8, 0, 0, 0, 0, Math.PI / 2);
  const balance = new THREE.Group(); balance.position.set(0, -0.0205, CZ); g.add(balance);
  { const rim = new THREE.Mesh(new THREE.TorusGeometry(0.0150, 0.0020, 6, 20), brass); rim.rotation.y = Math.PI / 2; balance.add(rim); }
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI; const s = gpBox(balance, brass, 0.0020, 0.0300, 0.0020, 0, 0, 0); s.rotation.x = a; }
  gpCyl(balance, amber, 0.0030, 0.0030, 0.0050, 8, 0, 0, 0, 0, Math.PI / 2);
  // the two clock hands on each face, on a shared centre pin above the rail
  const hands = [];
  for (const sx of [-1, 1]) {
    const hub = new THREE.Group(); hub.position.set(sx * 0.0160, 0.021, CZ); g.add(hub);
    gpCyl(hub, brass, 0.0042, 0.0042, 0.0022, 10, 0, 0, 0, 0, Math.PI / 2);
    const hr = new THREE.Group(), mn = new THREE.Group(); hub.add(hr); hub.add(mn);
    gpBox(hr, dark, 0.0016, 0.0125, 0.0038, 0, 0.0062, 0); gpBox(mn, dark, 0.0012, 0.0200, 0.0024, 0, 0.0100, 0);
    hands.push({ hr, mn, sx });
  }
  // ── the winding key, out of the right side of the casing ──
  const key = new THREE.Group(); key.position.set(0.0235, -0.020, CZ + 0.020); g.add(key);
  gpCyl(g, brass, 0.0042, 0.0042, 0.016, 10, 0.0215, -0.020, CZ + 0.020, 0, Math.PI / 2);   // the shaft stub
  gpBox(key, brass, 0.0040, 0.0040, 0.0040, 0.0115, 0, 0);
  for (const sd of [-1, 1]) { const wing = gpBox(key, brass, 0.0040, 0.0120, 0.0090, 0.0150, sd * 0.0095, 0); }     // the two wings of the key
  { const eye = new THREE.Mesh(new THREE.TorusGeometry(0.0038, 0.0014, 5, 10), brass); eye.rotation.y = Math.PI / 2; eye.position.set(0.0170, 0, 0); key.add(eye); }
  // ── the limbs: two hinged clock-hand arms from the casing's sides, each an upper arm, an elbow and a forearm, with a cable to a carriage on the rail ──
  const L1 = 0.140, L2 = 0.085, arms = [];
  for (const sd of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(sd * 0.0185, -0.004, CZ - 0.012); piv.rotation.order = 'YXZ'; g.add(piv);
    gpCyl(piv, bronze, 0.0075, 0.0075, 0.0120, 10, 0, 0, 0, 0, 0);
    const upper = gpBox(piv, brass, 0.0060, 0.0070, L1, 0, 0, -L1 / 2);
    gpBox(piv, steel, 0.0020, 0.0075, L1 * 0.8, 0, 0.0036, -L1 * 0.5);                     // a steel inlay down the arm
    const elbow = new THREE.Group(); elbow.position.z = -L1; piv.add(elbow);
    gpCyl(elbow, bronze, 0.0068, 0.0068, 0.0110, 10, 0, 0, 0, 0, 0);
    gpBox(elbow, brass, 0.0050, 0.0060, L2, 0, 0, -L2 / 2);
    gpBox(elbow, brass, 0.0120, 0.0080, 0.0150, 0, 0, -L2);                                // the clock-hand's spade tip
    gpCyl(elbow, amber, 0.0024, 0.0024, 0.0100, 6, 0, 0, -L2 + 0.002, 0, 0);   // the cable anchor
    arms.push({ piv, elbow, sd });
  }
  const carriage = new THREE.Group(); carriage.position.set(0, 0.0, 0.020); g.add(carriage);
  gpBox(carriage, steel, 0.020, 0.0070, 0.014, 0, 0.0, 0);
  const cables = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.0010, 0.0010, 1, 4), dark); g.add(m); return m; });
  const A = new THREE.Vector3(), B = new THREE.Vector3(), _cv = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  const setRod = (m, a, b) => { B.copy(b).sub(a); const len = B.length(); m.position.copy(a).addScaledVector(B, 0.5); m.scale.set(1, len, 1); m.quaternion.setFromUnitVectors(UP, B.normalize()); };
  // ── the stock: a skeletal brass frame with a pendulum hanging in it ──
  const sz0 = 0.040, sz1 = 0.215;
  for (const sd of [-1, 1]) {
    gpBox(g, brass, 0.0046, 0.0046, sz1 - sz0, sd * 0.0090, 0.022, (sz0 + sz1) / 2);       // the top rails
    const low = gpBox(g, brass, 0.0046, 0.0046, sz1 - sz0 - 0.006, sd * 0.0090, -0.046, (sz0 + sz1) / 2 + 0.014); low.rotation.x = 0.0;
    gpBox(g, brass, 0.0046, 0.0720, 0.0046, sd * 0.0090, -0.012, sz0 + 0.002);              // the front posts
    gpBox(g, brass, 0.0046, 0.0560, 0.0046, sd * 0.0090, -0.016, sz1 - 0.004);              // and the back posts
  }
  gpBox(g, bronze, 0.0230, 0.0600, 0.0090, 0, -0.012, sz1 + 0.002);                         // the butt plate
  gpBox(g, brass, 0.0150, 0.0040, 0.0060, 0, 0.022, sz1 - 0.004);
  const pend = new THREE.Group(); pend.position.set(0, 0.0185, 0.105); g.add(pend);
  gpBox(g, steel, 0.0180, 0.0030, 0.0030, 0, 0.0185, 0.105);                                // the pivot bar across the frame
  gpCyl(pend, steel, 0.0014, 0.0014, 0.0480, 6, 0, -0.0240, 0, 0, 0);             // the rod
  { const bob = new THREE.Mesh(new THREE.SphereGeometry(0.0125, 12, 8), brass); bob.scale.set(0.7, 1, 1); bob.position.set(0, -0.0540, 0); pend.add(bob); }
  { const rim = new THREE.Mesh(new THREE.TorusGeometry(0.0105, 0.0016, 5, 14), steel); rim.rotation.y = Math.PI / 2; rim.position.set(0, -0.0540, 0); pend.add(rim); }
  // ── the grip under the rail, behind the casing ──
  _skGrip(g, leather, -0.004);
  // ── motion ──
  const REST = 0.80, BEND = 0.55;                                                           // arm angle out from the rail, and the elbow's fold, when cocked
  let snap = 0, stopT = 0, key0 = 0, hand0 = 0, tx = 0;
  g._onFire = () => { snap = 1; stopT = 0.28; };
  g._tick = (dt, now) => {
    tx += dt;
    const rel = g._reloadStart && g._reloadDur ? (Date.now() - g._reloadStart) / g._reloadDur : -1;
    const insp = !!g._inspectMode && rel >= 0 && rel <= 1;
    snap = Math.max(0, snap - dt * 2.6); stopT = Math.max(0, stopT - dt);
    // arm angle and the carriage's place on the rail
    let a = REST, bend = BEND, cz = 0.020, kRate = 0;
    if (g._reloadStart && !g._inspectMode && rel >= 0 && rel <= 1) {
      const wide = rel < 0.45 ? _eqSm(rel / 0.45) : 1 - _eqSm((rel - 0.45) / 0.35);       // unfold wide, then reset
      a = REST + 0.50 * Math.max(0, wide); bend = BEND - 0.30 * Math.max(0, wide);
      cz = rel < 0.45 ? -0.200 : -0.200 + 0.220 * _eqSm((rel - 0.45) / 0.35);              // the carriage waits forward, then is drawn back
      if (rel >= 0.80) { a = REST; bend = BEND; cz = 0.020; }
      kRate = rel < 0.80 ? 11 : 0;                                                          // the key winds the whole time the arms work
    } else if (snap > 0) {                                                                  // a shot: the arms snap in, then draw back out
      const f = snap > 0.82 ? (1 - snap) / 0.18 : _eqSm(snap / 0.82);
      a = 0.22 + (REST - 0.22) * (1 - f); bend = 0.10 + (BEND - 0.10) * (1 - f);
      cz = -0.200 + 0.220 * (1 - f);
    }
    for (const r of arms) { r.piv.rotation.y = -r.sd * a; r.elbow.rotation.y = r.sd * bend; }
    carriage.position.z = cz;
    for (let i = 0; i < 2; i++) {                                                           // each cable runs from an arm's cable anchor to the carriage (worked out in the weapon's own space)
      const r = arms[i], sd = r.sd, p0 = r.piv.position, d1 = a, d2 = a - bend;
      A.set(p0.x + sd * (L1 * Math.sin(d1) + (L2 - 0.002) * Math.sin(d2)), p0.y, p0.z - (L1 * Math.cos(d1) + (L2 - 0.002) * Math.cos(d2)));
      setRod(cables[i], A, _cv.set(sd * 0.008, 0, cz));
    }
    // the works
    const run = insp ? 3.4 : 1;
    const tick = Math.floor(tx * 3.2 * run);                                                // the escape wheel advances in steps, like a real one
    escape.rotation.x = -(tick * (Math.PI * 2 / 14) + _eqSm((tx * 3.2 * run) % 1) * (Math.PI * 2 / 14));
    balance.rotation.x = Math.sin(tx * 6.2 * run) * (insp ? 1.25 : 0.55);
    const spin = (snap > 0 ? snap * 26 : 0) + (insp ? 9 : 0);
    hand0 += dt * (0.5 + spin);
    for (const h of hands) { h.mn.rotation.x = -h.sx * hand0 * 2.6; h.hr.rotation.x = -h.sx * hand0 * 0.22; }
    key0 += dt * kRate; key.rotation.x = key0;
    // the pendulum swings gently, and stops for a moment when it fires
    const swing = stopT > 0 ? 0 : 1;
    pend.rotation.x = pend.rotation.x * (1 - Math.min(1, dt * 6)) + Math.sin(tx * 2.4) * 0.38 * swing * Math.min(1, dt * 6);
  };
  g._tick(0.016, 0);
  return _skFinish(g, -0.275, 0.004, 0.008);
}

