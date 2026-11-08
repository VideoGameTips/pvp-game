(() => {
  'use strict';
  // Swap Gun portals: a shot that lands on a wall, a floor, a roof or a ceiling opens a portal there. Two portals from the same
  // shooter are linked, so going into one comes out of the other. A third shot replaces the oldest. Every client draws them (the
  // shooter relays each one as 'swapPortal') and moves only its own player and, on the host, the bots.
  //   wall    an upright oval you walk into; you come out of the other one facing away from its wall
  //   floor   a round hole you walk or fall onto; you come out of it flung upwards
  //   ceiling a round hole you jump into; you come out of it dropping
  const LIFE = 25000, HALF_W = 0.58, HALF_H = 1.05, FLAT_R = 0.85, EXIT_GAP = 0.85;
  const EYE = 1.65;                                            // the eye is this far above the feet
  const COLORS = [0xff8a22, 0x2a8cff];
  const owners = new Map();                                    // ownerId -> [portal, portal], oldest first
  let exitLock = null, lockUntil = 0;                          // the portal I just came out of: it cannot send me straight back
  const live = () => gameStarted && !isDead && !countdownActive && !match?.over;
  const ang = v => Math.atan2(v.x, v.z);                       // the yaw convention: facing a direction has yaw = ang(dir) - PI
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // Drawn over whatever it lies on: pulled forward in depth, so the painted floors, rugs and road strips some maps lay a few
  // centimetres above the ground cannot swallow a portal; and drawn late, after the other see-through things.
  const glow = (color, opacity) => new THREE.MeshBasicMaterial({
    color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  function build(color, flat) {
    const g = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1, 32), glow(color, 0.5));
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.82, 1, 40), glow(color, 0.95));
    ring.position.z = 0.01;
    disc.renderOrder = ring.renderOrder = 998;
    g.add(disc, ring);
    if (flat) {                                               // a hole in the floor is hard to see edge-on and from far away: it gets a beam of light
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1.8, 28, 1, true), glow(color, 0.16));
      beam.rotation.x = Math.PI / 2; beam.position.z = 0.9; beam.renderOrder = 997;
      g.add(beam); g._beam = beam;
      g.scale.set(FLAT_R, FLAT_R, 1);
    } else g.scale.set(HALF_W, HALF_H, 1);
    g._disc = disc; g._ring = ring;
    return g;
  }
  function paint(p, i) {
    p.group._disc.material.color.setHex(COLORS[i]);
    p.group._ring.material.color.setHex(COLORS[i]);
    if (p.group._beam) p.group._beam.material.color.setHex(COLORS[i]);
  }
  function dispose(p) {
    if (exitLock === p) exitLock = null;
    p.group.removeFromParent();
    p.group.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  }
  function drop(ownerId) {
    for (const p of owners.get(ownerId) || []) dispose(p);
    owners.delete(ownerId);
  }
  function clear() { for (const id of [...owners.keys()]) drop(id); }

  // The portal sits on its surface, its middle at (x, y, z), facing along n (out of the surface).
  function open(ownerId, x, y, z, nx, ny, nz) {
    const n = new THREE.Vector3(nx, ny || 0, nz);
    if (n.lengthSq() < 0.01) return null;
    n.normalize();
    const kind = n.y > 0.5 ? 'floor' : n.y < -0.5 ? 'ceiling' : 'wall';
    if (kind === 'wall') { n.y = 0; n.normalize(); } else n.set(0, n.y > 0 ? 1 : -1, 0);
    const flat = kind !== 'wall';
    const list = owners.get(ownerId) || [];
    if (list.length >= 2) dispose(list.shift());
    const group = build(COLORS[0], flat);
    const lift = flat ? 0.06 : 0.03;
    group.position.set(x + n.x * lift, y + n.y * lift, z + n.z * lift);
    group.up.set(flat ? 0 : 0, flat ? 0 : 1, flat ? 1 : 0);
    group.lookAt(x + n.x, y + n.y, z + n.z);
    scene.add(group);
    const p = { owner: ownerId, kind, pos: new THREE.Vector3(x, y, z), n, t: flat ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(-n.z, 0, n.x),
      born: performance.now(), epoch: matchEpoch, group };
    list.push(p);
    list.forEach(paint);
    owners.set(ownerId, list);
    try { playSoundEvent('air_launch', { volume: 0.5, minGap: 120, position: p.pos }); } catch (e) {}
    return p;
  }

  // Called by the bullet code when MY swap shot lands on something solid.
  function place(pt, normal, dir) {
    if (!pt || !normal) return;
    let nx = normal.x, ny = normal.y, nz = normal.z;
    if (dir && nx * dir.x + ny * dir.y + nz * dir.z > 0) { nx = -nx; ny = -ny; nz = -nz; }   // the face has to look back at the shooter
    let p;
    if (Math.abs(ny) > 0.5) {
      // A floor portal sits on the surface a person would stand on there (a ramp or a raised patch is a little above where the
      // shot happened to land), never under it.
      let y = pt.y;
      if (ny > 0) {
        let g = NaN;
        try { g = getGroundEyeY(pt.x, pt.z, pt.y + PLAYER_EYE_HEIGHT + 0.3) - PLAYER_EYE_HEIGHT; } catch (e) {}
        if (g > -1000 && g > y && g - y < 0.7) y = g;
      }
      p = open(myId, pt.x, y, pt.z, 0, ny > 0 ? 1 : -1, 0);
    } else {
      const len = Math.hypot(nx, nz) || 1;
      // The floor is read in FRONT of the wall: on the wall itself it can be the top of that wall, which put portals out of reach.
      // And the portal always sits where a person can walk into it, however high up the wall the shot landed.
      const fx = pt.x + (nx / len) * 0.7, fz = pt.z + (nz / len) * 0.7;
      let ground = getGroundEyeY(fx, fz, pt.y + PLAYER_EYE_HEIGHT) - PLAYER_EYE_HEIGHT;
      if (!(ground > -1000)) ground = 0;
      const y = Math.min(Math.max(pt.y, ground + HALF_H), ground + HALF_H + 0.6);
      p = open(myId, pt.x, y, pt.z, nx, 0, nz);
    }
    if (p && socket.connected) socket.emit('swapPortal', { x: p.pos.x, y: p.pos.y, z: p.pos.z, nx: p.n.x, ny: p.n.y, nz: p.n.z });
  }

  function partner(p) {
    const list = owners.get(p.owner);
    return list && list.length === 2 ? (list[0] === p ? list[1] : list[0]) : null;
  }

  // Is a body whose head is at (x, y, z) touching this portal? The body is a post 0.38 m wide, feet 1.65 m below the head.
  function inside(p, x, y, z) {
    const rx = x - p.pos.x, rz = z - p.pos.z;
    if (p.kind === 'wall') {
      const d = rx * p.n.x + rz * p.n.z, lat = rx * p.t.x + rz * p.t.z;
      if (d < -0.3 || d > 0.8) return false;
      const off = Math.max(0, Math.abs(lat) - HALF_W);
      if (Math.hypot(d, off) > 0.8) return false;
      return y - EYE - 0.05 < p.pos.y + HALF_H && y + 0.15 > p.pos.y - HALF_H;
    }
    if (Math.hypot(rx, rz) > FLAT_R - 0.05) return false;
    if (p.kind === 'floor') { const feet = y - EYE; return feet < p.pos.y + 0.3 && feet > p.pos.y - 2.2; }
    return y + 0.15 > p.pos.y - 0.3 && y < p.pos.y + 1.4;           // ceiling: the head reaches it
  }

  // Take a body (head at x, y, z; moving at `speed`, with vertical speed vy) from portal `from` out of `to`.
  function carry(from, to, x, y, z, speed, vy) {
    const out = { x: to.pos.x, y: to.pos.y, z: to.pos.z, turn: 0, yaw: null, vy: null, ext: null };
    if (to.kind === 'wall') {
      out.x += to.n.x * EXIT_GAP; out.z += to.n.z * EXIT_GAP;
      if (from.kind === 'wall') {
        const lat = (x - from.pos.x) * from.t.x + (z - from.pos.z) * from.t.z;
        out.x -= to.t.x * lat; out.z -= to.t.z * lat;
        out.y = to.pos.y + (y - from.pos.y);
        out.turn = ang(to.n) - ang(from.n.clone().negate());
      } else {                                                       // fell or jumped in: leaves the wall at that speed, facing out
        let ge = NaN;
        try { ge = getGroundEyeY(out.x, out.z, to.pos.y + 0.6); } catch (e) {}
        out.y = ge > -1000 ? ge + 0.05 : to.pos.y + 0.6;              // on the floor in front of it, not hanging off the portal's height
        out.yaw = Math.atan2(-to.n.x, -to.n.z);
        const s = clamp(speed, 6, 22);
        out.ext = { x: to.n.x * s, z: to.n.z * s };
        out.vy = 0;
      }
    } else if (to.kind === 'floor') {                                // out of the floor, thrown up
      out.y = to.pos.y + EYE + 0.05;
      out.vy = clamp(Math.max(speed, -vy), 7, 24);
      out.ext = { x: 0, z: 0 };
    } else {                                                         // out of the ceiling, dropping
      out.y = to.pos.y - 0.25;
      out.vy = -clamp(Math.max(speed, vy), 3, 20);
      out.ext = { x: 0, z: 0 };
    }
    return out;
  }

  const prev = new THREE.Vector3();
  let havePrev = false, peak = 0;                                  // peak: how fast I have been going lately (a wall stops you, the speed before it still counts)
  function hopPlayer(now, dt) {
    const cam = camera.position;
    let mx = havePrev ? cam.x - prev.x : 0, my = havePrev ? cam.y - prev.y : 0, mz = havePrev ? cam.z - prev.z : 0;
    if (Math.hypot(mx, my, mz) > 3) { mx = my = mz = 0; peak = 0; }       // I was moved (a swap, a respawn): not a stride
    prev.copy(cam); havePrev = true;
    if (dt > 0) peak = Math.max(Math.hypot(mx, mz) / dt, peak * Math.exp(-dt * 6));
    if (exitLock && (now > lockUntil || !inside(exitLock, cam.x, cam.y, cam.z))) exitLock = null;
    for (const list of owners.values()) for (const p of list) {
      if (p === exitLock) continue;
      const to = partner(p);
      if (!to || !inside(p, cam.x, cam.y, cam.z)) continue;
      if (p.kind === 'wall' && mx * p.n.x + mz * p.n.z > 0.02) continue;     // moving away from it: not going in
      if (p.kind === 'floor' && my > 0.02) continue;
      if (p.kind === 'ceiling' && my < -0.02) continue;
      const speed = Math.max(peak, Math.hypot(_extVel.x, _extVel.z));
      const c = carry(p, to, cam.x, cam.y, cam.z, speed, playerYVel);
      cam.set(c.x, c.y, c.z);
      if (c.yaw !== null) euler.y = c.yaw; else euler.y += c.turn;
      if (c.ext) { _extVel.x = c.ext.x; _extVel.z = c.ext.z; }
      else {
        const s = Math.sin(c.turn), k = Math.cos(c.turn), vx = _extVel.x, vz = _extVel.z;
        _extVel.x = vx * k + vz * s; _extVel.z = vz * k - vx * s;
      }
      if (c.vy !== null) { playerYVel = c.vy; slamState = null; }
      lastPlayerPos.copy(cam); prev.copy(cam);
      try { resolveWallCollisions(); } catch (e) {}
      exitLock = to; lockUntil = now + 1500;                          // the way out cannot send me back until I have stepped clear of it
      peak = Math.max(speed, 0);                                      // and the speed goes with me, into the next portal if it is right there
      try { playSoundEvent('air_launch', { volume: 0.7, minGap: 90 }); flashScreen('rgba(120,200,255,.28)', 160); } catch (e) {}
      return;
    }
  }
  function hopBots(now) {
    if (typeof gameBots === 'undefined' || (typeof mpGuest === 'function' && mpGuest())) return;
    for (const bot of gameBots) {
      if (bot.dead || now < (bot._portalUntil || 0)) continue;
      const head = (bot.y || 0) + EYE;
      for (const list of owners.values()) for (const p of list) {
        const to = partner(p);
        if (!to || !inside(p, bot.x, head, bot.z)) continue;
        const c = carry(p, to, bot.x, head, bot.z, 0, 0);
        bot.x = c.x; bot.z = c.z; bot.y = Math.max(0, c.y - EYE); bot.yVel = 0; bot.kbVX = bot.kbVZ = 0;
        bot._portalUntil = now + 800;
        return;
      }
    }
  }

  function step(dt) {
    if (!owners.size) { havePrev = false; return; }
    const now = performance.now();
    for (const [id, list] of [...owners]) {
      for (const p of list.slice()) {
        if (p.epoch !== matchEpoch || now - p.born > LIFE) { dispose(p); list.splice(list.indexOf(p), 1); continue; }
        const left = LIFE - (now - p.born), fade = left < 3000 ? left / 3000 : 1;
        const pulse = 0.5 + 0.12 * Math.sin(now / 160 + p.born);
        p.group._disc.material.opacity = (partner(p) ? pulse : pulse * 0.45) * fade;   // a portal with no partner yet is dim
        p.group._ring.material.opacity = 0.95 * fade;
        if (p.group._beam) p.group._beam.material.opacity = (partner(p) ? 0.16 : 0.07) * fade;
      }
      if (!list.length) owners.delete(id); else list.forEach(paint);
    }
    if (live()) hopPlayer(now, dt || 0.016); else havePrev = false;
    hopBots(now);
  }

  socket.on('swapPortal', d => {
    if (!d || d.ownerId === myId || !gameStarted) return;
    if (![d.x, d.y, d.z, d.nx, d.nz].every(Number.isFinite)) return;
    open(d.ownerId, d.x, d.y, d.z, d.nx, Number.isFinite(d.ny) ? d.ny : 0, d.nz);
  });
  socket.on('playerLeft', id => drop(id));
  window.PVP_SWAP_PORTALS = { place, step, clear };
})();
