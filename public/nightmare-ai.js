// 😈 NIGHTMARE BOT, the smart half. game.js keeps the bot's body and its state machine; this file is what makes a Nightmare bot hunt like a strong player.
// Priorities, in order, unchanged: DAMAGE (secure eliminations) > POSITION (height, cover, angles) > SELF-PRESERVATION (dodge, deflect) > the opponent's position (track, pursue, flank).
//
// What it adds, and where game.js calls it (every call is guarded: no NM, or a non-Nightmare bot, and the old behaviour runs):
//   NM.kit()                   at spawn: a primary picked from the strongest legal guns (not always the Crossbow), the best sidearm, a Katana, a Frag.
//   NM.chooseSlot(bot, ...)    every frame: primary or sidearm by expected damage per second at the real distance, with hysteresis (no flip-flopping).
//   NM.perceive(bot, target)   what the bot KNOWS. In line of sight it is the real target; out of it, a remembered / predicted / searched point (never a wall-hack).
//   NM.think(bot, ...)         unpredictable strafing, relentless pursuit, never getting stuck, never peeking the same angle twice, anti-oscillation.
//   NM.deflect(bot, now)       predicts incoming rounds and raises the Katana guard in time, when that is physically possible.
//   NM.fleeDecision(bot, ...)  finish a weak enemy instead of running; do not run just because it is reloading (it swaps).
//   NM.utility(bot, ...)       a Frag only when it will matter (a camper, a corner, a runner), never at random.
// It reads only what a player at that bot's position could: line of sight, what it saw and heard (a shot within earshot), visible projectiles. Never inputs, never walls.
(function () {
  'use strict';
  const NM = window.NM = { version: 1 };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const T = () => (typeof BOT_DIFFICULTY_TUNING !== 'undefined' && BOT_DIFFICULTY_TUNING.nightmare) || { fireMin: 330, fireRand: 170, reloadMin: 650, reloadRand: 200 };
  const A = bot => bot._nm2 || (bot._nm2 = { mem: null, search: null, plan: null, hist: [], spots: [], flips: 0, flipAt: 0, last: { x: bot.x, z: bot.z, t: Date.now() }, style: {}, slotAt: 0, utilAt: 0, seen: {} });
  const realOf = t => (t && t._phantom) ? t._real : t;
  const posOf = t => t.isPlayer ? { x: camera.position.x, z: camera.position.z } : { x: t.x, z: t.z };

  // ── 1. weapons: what is this gun worth, here, against someone who moves? ──
  // Expected damage per second at `dist`: damage x pellets x range falloff x the chance the round meets a body (spread, and the lead a moving target costs) x the gun's real
  // cadence (a Nightmare bot's own fire interval and reload, not the box-art numbers) x the share of time it is not reloading.
  NM.weaponValue = function (w, dist, lateral = 4) {
    if (!w) return 0;
    const t = T(), pel = w.pellets || 1, spread = w.spread || 0;
    const fall = typeof falloffMultiplier === 'function' ? falloffMultiplier(w.id, dist) : 1;
    const dmg = (w.damage || 0) * pel * fall;
    const tol = 0.42;                                                              // metres of body the round has to land inside
    const cone = spread * dist;
    let p = cone <= tol ? 1 : Math.pow(tol / cone, pel > 1 ? 1.3 : 1);
    const speed = (w.bulletSpeed || 120) * (typeof BULLET_SPEED_MULTIPLIER === 'number' ? BULLET_SPEED_MULTIPLIER : 2.3) * (w.bulletSpeedMult || 1);
    const flight = dist / Math.max(20, speed);
    p *= 1 / (1 + flight * lateral * 0.13);                                        // a strong aimer leads; the rest of the flight is luck
    let shots = 1, cycle;
    if (w.auto) { shots = 12; cycle = shots * Math.max(55, w.fireRate || 100) + t.fireMin + t.fireRand / 2; }
    else cycle = Math.max(w.fireRate || 400, t.fireMin) + t.fireRand / 2;
    const mag = Math.max(1, w.mag || 1), perMag = (mag / shots) * cycle, reload = t.reloadMin + t.reloadRand / 2;
    const up = perMag / (perMag + reload);
    return (shots * dmg * p / cycle) * 1000 * up;
  };
  const legal = (list, slot) => list.filter(w => w && w.slot === slot && !w.adminItem && !w.archived && !w.skinOnly && !w.modeOnly && !w.ddayOnly && !w.playerOnly
    && !/Paint|Beam|Energy|Plasma|Cryo|Void|Gravity|Launcher|Rocket|Explosive|Mortar|Spatial|Refract|Lightning/i.test(w.type || '') && !/paint|hellfire|omega/.test(w.id));   // (plain guns only: a mechanic gun's numbers do not say what it does)
  NM.kit = function () {
    const prim = legal(WEAPONS, 'primary'), sec = legal(WEAPONS, 'secondary');
    const val = (w, d) => NM.weaponValue(w, d[0]) * 0.3 + NM.weaponValue(w, d[1]) * 0.4 + NM.weaponValue(w, d[2]) * 0.3;
    const top = prim.map(w => ({ id: w.id, v: val(w, [7, 15, 30]) })).sort((a, b) => b.v - a.v).slice(0, 6);
    const styled = ['sg8', 'srx', 'p90', 'crossbow', 'lever', 'm1_garand'].filter(id => prim.some(w => w.id === id));   // the playstyles in PROFILES: a third of the time one of those
    const pick = (styled.length && Math.random() < 0.34) ? { id: styled[Math.floor(Math.random() * styled.length)] } : (top[Math.floor(Math.random() * top.length)] || { id: 'ak20' });
    const side = sec.map(w => ({ id: w.id, v: val(w, [3, 9, 18]) })).sort((a, b) => b.v - a.v)[0];
    const roll = (list) => { let r = Math.random() * list.reduce((t, x) => t + x[1], 0); for (const [id, w] of list) { if ((r -= w) <= 0) return id; } return list[0][0]; };
    const has = (list, id) => list.some(x => x.id === id && !x.archived);
    const melee = roll([['katana', 55], ['spear', 25], ['chain_hammer', 20]].filter(([id]) => has(MELEE_ITEMS, id)));
    const utility = roll([['frag', 40], ['medkit', 15], ['blink_pearl', 15], ['land_mine', 10], ['grapple_hook', 10], ['black_hole_seed', 10]].filter(([id]) => has(SUPPORT_ITEMS, id)));
    return { primary: pick.id, secondary: side ? side.id : 'pistol', melee: melee || 'katana', utility: utility || 'frag' };
  };
  NM.chooseSlot = function (bot, dist, now) {
    const S = A(bot);
    const cur = bot.activeSlot || 'primary';
    const pw = WEAPONS.find(w => w.id === bot.primaryId), sw = WEAPONS.find(w => w.id === bot.secondaryId);
    if (!pw || !sw) return cur;
    const st = S.style, d = dist * (st.rush ? 0.6 : (st.camp || st.retreat) ? 1.2 : 1);
    const tHp = (typeof players !== 'undefined' && players[myId] && players[myId].hp != null) ? players[myId].hp : 300, weak = tHp < 300 * 0.4;
    const mod = (w, v) => ((w.id === 'duelist_pistol') ? (weak ? 2.6 : 0.3) : (w.id === 'revolver' || w.id === 'auto_revolver' || w.id === 'snub_revolver') && weak ? 1.4 : 1) * v;   // a duelist saves its shot for a finish; a revolver finishes eagerly
    const vp = mod(pw, NM.weaponValue(pw, d)), vs = mod(sw, NM.weaponValue(sw, d));
    const reloading = bot.reloadUntil && now < bot.reloadUntil;
    const best = vs > vp * 1.18 ? 'secondary' : vp > vs * 1.18 ? 'primary' : cur;    // a clear winner, or stay
    if (best === cur) return cur;
    if (now - S.slotAt < 900) return cur;                                            // never flip-flop
    if (reloading && (cur === 'primary' ? vs : vp) < 0.5 * (cur === 'primary' ? vp : vs)) return cur;   // not worth throwing the reload away
    S.slotAt = now; if (reloading) bot.reloadUntil = 0;
    return best;
  };

  // ── 2. memory: what the bot knows about where you are ──
  function sample(bot, real, now) {
    const S = A(bot), p = posOf(real), h = S.hist;
    if (!h.length || now - h[h.length - 1].t >= 250) { h.push({ x: p.x, z: p.z, t: now }); if (h.length > 28) h.shift(); }
  }
  function observe(bot, real, now) {                                               // how this opponent plays, from what the bot has watched
    const S = A(bot), h = S.hist; if (h.length < 8) return;
    const a = h[h.length - 1], b = h[Math.max(0, h.length - 24)], span = (a.t - b.t) / 1000; if (span < 3) return;
    const vx = (a.x - b.x) / span, vz = (a.z - b.z) / span, sp = Math.hypot(vx, vz);
    let path = 0; for (let i = Math.max(1, h.length - 24); i < h.length; i++) path += Math.hypot(h[i].x - h[i - 1].x, h[i].z - h[i - 1].z);
    const away = ((a.x - bot.x) * vx + (a.z - bot.z) * vz) / (Math.hypot(a.x - bot.x, a.z - bot.z) || 1);
    S.style = { retreat: away > 2.2 && sp > 2.4, rush: away < -3.2, camp: path / span < 1.1 };
  }
  NM.perceive = function (bot, real, now) {
    if (!real || (!real.isPlayer && !real.botRef)) return real;
    const S = A(bot), p = posOf(real), d = Math.hypot(p.x - bot.x, p.z - bot.z);
    if (!(d < 95) || hasLineOfSight(bot.x, bot.z, p.x, p.z)) {                       // seen (or too far to care: the old logic handles that)
      const m = S.mem;
      if (m && now - m.t < 900 && now > m.t) { const dt = (now - m.t) / 1000; m.vx = (p.x - m.x) / dt * 0.6 + m.vx * 0.4; m.vz = (p.z - m.z) / dt * 0.6 + m.vz * 0.4; }
      S.mem = Object.assign(S.mem || { vx: 0, vz: 0 }, { x: p.x, z: p.z, t: now }); S.search = null;
      sample(bot, real, now); observe(bot, real, now);
      return real;
    }
    if (!S.mem) S.mem = { x: p.x, z: p.z, vx: 0, vz: 0, t: now - 2500 };           // round start: it knows roughly where the other side spawns
    const m = S.mem;
    if (typeof lastShot === 'number' && now - lastShot < 350 && d < 42 && real.isPlayer && now - (S.heardAt || 0) > 700) {   // a shot within earshot: roughly where
      S.heardAt = now; m.x = p.x + (Math.random() - 0.5) * 9; m.z = p.z + (Math.random() - 0.5) * 9; m.t = now - 400; m.vx *= 0.3; m.vz *= 0.3; S.search = null;
    }
    if (real.isPlayer && typeof playerVelocity !== 'undefined' && d < 24 && Math.hypot(playerVelocity.x, playerVelocity.z) > 3.2 && now - (S.stepAt || 0) > 600) {   // footsteps: a runner within earshot, roughly where
      S.stepAt = now; m.x = p.x + (Math.random() - 0.5) * 8; m.z = p.z + (Math.random() - 0.5) * 8; m.t = now - 600; m.vx = playerVelocity.x * 0.5; m.vz = playerVelocity.z * 0.5; S.search = null;
    }
    const age = (now - m.t) / 1000;
    let goal;
    if (age < 1.6) {                                                                  // just lost them: run to where they are heading (a runner does not stop at the corner)
      const k = Math.min(age, 1.1);
      goal = { x: m.x + m.vx * (0.8 + k), z: m.z + m.vz * (0.8 + k) };
    } else goal = searchGoal(bot, S, m, now);
    return { x: goal.x, z: goal.z, y: real.y, isPlayer: real.isPlayer, botRef: real.botRef, _phantom: true, _real: real, _age: age };
  };
  // a systematic search: the last place seen, then along the way they were going, then rings round it, nearest first, a short look at each, widening as it fails
  function searchGoal(bot, S, m, now) {
    const build = (ring, since) => {
      const sp = Math.hypot(m.vx, m.vz), ux = sp > 0.5 ? m.vx / sp : 0, uz = sp > 0.5 ? m.vz / sp : 0, r = 6 + ring * 7, pts = ring === 1 ? [{ x: m.x, z: m.z }] : [];
      if (sp > 0.5) for (const k of [0.8, 1.6]) pts.push({ x: m.x + ux * r * k, z: m.z + uz * r * k });
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + (ring % 2) * 0.5; pts.push({ x: m.x + Math.cos(a) * r, z: m.z + Math.sin(a) * r }); }
      const ok = pts.filter(q => hasLineOfSight(m.x, m.z, q.x, q.z));                // only places that could actually hold them (no walls)
      return { pts: ok.length ? ok : pts, ring, until: 0, cur: null, dwell: 0, since };
    };
    let s = S.search; if (!s) s = S.search = build(1, now);
    const arrived = s.cur && Math.hypot(s.cur.x - bot.x, s.cur.z - bot.z) < 2.4;
    if (!s.cur || now > s.until || arrived) {
      if (arrived && !s.dwell) s.dwell = now + 650;                                  // arrived: a short look
      if (s.dwell && now < s.dwell) return s.cur;
      s.dwell = 0; s.cur = null;
      if (!s.pts.length) s = S.search = build(Math.min(4, s.ring + 1), s.since);       // that ring is clear: a wider one
      let bi = 0, bd = 1e9; for (let i = 0; i < s.pts.length; i++) { const dd = Math.hypot(s.pts[i].x - bot.x, s.pts[i].z - bot.z); if (dd < bd) { bd = dd; bi = i; } }
      s.cur = s.pts.splice(bi, 1)[0]; s.until = now + 4500;
    }
    return s.cur;
  }

  // ── Nightmare playstyles per weapon: the spacing it wants, and how it fights with it ──
  //   band: the range it fights at · close: it closes in on its own · shot: relocate after each shot · peek: expose / hide cycle (ms) · burst: cover between bursts · hold: suppress, less strafing
  // Classes: a playstyle is a spacing band plus a few verbs. band: the range it fights at · close: it closes in on its own · shot: a new position after every shot · peek: [expose, hide] ms
  //   burst: cover between bursts · hold: suppress, little strafing · press: strafes hard · retreatAfterShot: strikes, then backs off · jumpy: jumps after a shot (double-jump skirmisher) · finisher: saved for a weak enemy
  const C = {
    ar:       { band: [8, 22], burst: true },
    ambush:   { band: [2.5, 8], close: true, retreatAfterShot: true },
    sniper:   { band: [26, 48], shot: true },
    smg:      { band: [3.5, 12], close: true, press: true },
    peek:     { band: [14, 30], peek: [650, 900] },
    patient:  { band: [14, 30] },
    lmg:      { band: [12, 26], hold: true },
    marksman: { band: [12, 24] },
    explosive:{ band: [16, 34], shot: true },                                       // targets corners, cover edges and escape routes from range, never in the same spot twice
    control:  { band: [9, 18], jumpy: true },                                       // slows / freezes, then stays out of reach
    skirmish: { band: [8, 18], jumpy: true, retreatAfterShot: true },               // poison / chip: a shot, a jump, away
    duel:     { band: [8, 20], peek: [500, 700] },
    cannon:   { band: [8, 22], peek: [700, 1000], shot: true },
    backup:   { band: [2, 8], close: true, press: true },
    thrown:   { band: [8, 18], jumpy: true },
    flame:    { band: [2, 7], close: true, press: true },
  };
  const PROFILES = {
    // primaries
    ak20: C.ar, burst: C.ar, sg8: C.ambush, storm_bloom: C.ambush, srx: C.sniper, railgun: C.sniper, air_rifle: C.sniper, p90: C.smg, mp40: C.smg, vector: C.smg,
    lever: C.peek, crossbow: Object.assign({}, C.patient, { patient: true }), minigun: C.lmg, rpd: C.lmg, chain_gun: C.lmg, m1_garand: C.marksman,
    rpg: C.explosive, grenade_launcher: C.explosive, mortar_rifle: Object.assign({}, C.explosive, { band: [24, 46] }), boombow: C.explosive, javelin_launcher: C.explosive,
    freeze_gun: C.control, cyroclasm: C.control, flamethrower: C.flame, paintball: C.skirmish,
    // secondaries
    revolver: C.duel, auto_revolver: C.duel, snub_revolver: Object.assign({}, C.duel, { band: [5, 14] }), mauser: C.duel, hand_cannon: C.cannon, duelist_pistol: Object.assign({}, C.duel, { band: [10, 24], finisher: true }),
    machine_pistol: C.backup, akimbo: C.backup, cycler: C.backup, nail_gun: Object.assign({}, C.backup, { band: [4, 12] }), continuum: C.skirmish,
    sawed_off: C.ambush, gunslinger: Object.assign({}, C.ambush, { band: [3, 10] }), gatecrasher: C.duel, pistol: C.duel,
    dart_gun: C.skirmish, slingshot: Object.assign({}, C.skirmish, { band: [10, 22], peek: [600, 800] }),                         // slingshot: attacks from behind cover, ricochet angles by peeking at walls
    taser: C.control, flare: C.thrown, laser_pointer: C.patient, throwing_knives: C.thrown, traffic_cone: C.thrown, cream_pie: C.thrown,
  };
  const BY_TYPE = [[/sniper/i, 'srx'], [/shotgun/i, 'sg8'], [/smg/i, 'p90'], [/lmg|heavy|chain|gatling/i, 'minigun'], [/marksman|battle/i, 'lever'], [/secondary|pistol|revolver/i, 'revolver']];
  const DEFAULT = { band: [8, 22] };
  function profileFor(bot) {
    if (PROFILES[bot.weaponId]) return PROFILES[bot.weaponId];
    const w = WEAPONS.find(x => x.id === bot.weaponId), t = (w && w.type) || '';
    for (const [re, id] of BY_TYPE) if (re.test(t) || re.test(w ? w.id : '')) return PROFILES[id];
    return DEFAULT;
  }
  function coverPoint(bot, S, real, now) {
    if (now - (S.coverAt || 0) > 450) { S.coverAt = now; try { S.cover = typeof findBotCover === 'function' ? findBotCover(bot, real) : null; } catch (e) { S.cover = null; } }
    return S.cover;
  }

  // ── 3. movement: relentless, unpredictable, never stuck ──
  // moves in / out as {x, z} in metres this frame. `ctx`: { dt, now, onGround, wasHit, real, blind }.
  NM.think = function (bot, target, mv, ctx) {
    const S = A(bot), now = ctx.now, dt = ctx.dt, real = realOf(target); if (!real) return mv;
    let { x: mx, z: mz } = mv;
    const rp = posOf(real), dxr = rp.x - bot.x, dzr = rp.z - bot.z, dist = Math.hypot(dxr, dzr) || 1, ux = dxr / dist, uz = dzr / dist;
    const hasLOS = !target._phantom && hasLineOfSight(bot.x, bot.z, rp.x, rp.z);
    // never stuck: under half a metre in 1.3 s while it wants to move
    if (now - S.last.t > 1300) {
      const moved = Math.hypot(bot.x - S.last.x, bot.z - S.last.z);
      if (moved < 0.5 && dist > 5 && !(bot.reloadUntil && now < bot.reloadUntil && bot.state === 'cover')) {
        const side = Math.random() < 0.5 ? 1 : -1, ang = Math.atan2(uz, ux) + side * (1.0 + Math.random() * 0.8);
        S.unstick = { until: now + 650, x: Math.cos(ang), z: Math.sin(ang) };
        if (ctx.onGround) { bot.yVel = 13; bot.y = bot.y || 0; }
      }
      S.last = { x: bot.x, z: bot.z, t: now };
    }
    if (S.unstick && now < S.unstick.until) return { x: S.unstick.x * 9 * dt, z: S.unstick.z * 9 * dt };
    // blind: search the way a good player does, round corners by the route and sprint
    if (target._phantom) {
      const wp = typeof botNavPoint === 'function' ? botNavPoint(bot, target) : null;
      const tx = (wp ? wp.x : target.x) - bot.x, tz = (wp ? wp.z : target.z) - bot.z, tl = Math.hypot(tx, tz);
      if (tl < 0.6) { S.last = { x: bot.x, z: bot.z, t: now }; return { x: 0, z: 0 }; }      // looking (standing still on purpose is not being stuck)
      const sp = 9.5 * dt * (now < (bot._slideUntil || 0) ? 1.0 : 1);
      if (ctx.onGround && tl > 14 && now >= (bot._slideUntil || 0) && now >= (bot._nextSlideAt || 0)) { bot._slideUntil = now + 850; bot._nextSlideAt = now + 1500; }
      return { x: tx / tl * sp, z: tz / tl * sp };
    }
    if (bot.state === 'cover' || bot.state === 'melee_charge') return mv;           // those states move for their own reasons
    // sighted. Three things on top of the stock movement: (a) a strafe that is not a pattern, (b) a hard pursuit of anyone who keeps running, (c) a new angle when the old one stopped working
    const st = S.style, spd = Math.max(Math.hypot(mx, mz), 8 * dt);
    let f = mx * ux + mz * uz, l = mx * -uz + mz * ux;                              // forward (toward the opponent) and lateral parts of the planned step
    if (!S.plan || now > S.plan.until) {                                            // a strafe plan: a direction, a strength, a short life; sometimes a stop, sometimes a reversal
      const r = Math.random();
      S.plan = { until: now + 220 + Math.random() * 650, dir: S.plan && r < 0.7 ? -S.plan.dir : (Math.random() < 0.5 ? 1 : -1), k: r < 0.12 ? 0.0 : 0.5 + Math.random() * 0.9 };
    }
    if (dist < 40) l = S.plan.dir * S.plan.k * spd * 0.85 + l * 0.15;
    const pursue = (st.retreat || (S.mem && now - (S.mem.t || 0) < 3000 && dist > 16)) && !(bot.reloadUntil && now < bot.reloadUntil && dist < 12);
    if (pursue) { f = Math.max(f, spd * 0.95); if (ctx.onGround && dist > 11 && now >= (bot._slideUntil || 0) && now >= (bot._nextSlideAt || 0)) { bot._slideUntil = now + 850; bot._nextSlideAt = now + 1200; } }
    if (st.rush && dist < 9) f = Math.min(f, -spd * 0.35);                           // a rush: give ground while shooting
    if (st.camp && dist > 14 && S.spotsHit) { f = Math.max(f, spd * 0.7); }          // a camper: come at them, from a different side
    // the weapon's own playstyle: spacing, an ambush's retreat, a sniper's new position, a peek, cover between bursts
    const P = profileFor(bot);
    const reachItem = (bot.meleeId === 'spear' || bot.meleeId === 'chain_hammer') ? MELEE_ITEMS.find(m => m.id === bot.meleeId) : null;
    const reloadingNow = bot.reloadUntil && now < bot.reloadUntil;
    if (reachItem && reloadingNow && hasLOS && dist > reachItem.range - 0.6) f = Math.max(f, spd * 1.0);       // reloading: close to the melee's reach (the spear's, or the Chain Maul's 10 m) instead of hiding
    else if (!pursue || dist < P.band[1]) {
      if (dist < P.band[0]) f = Math.min(f, -spd * (P.close ? 0.25 : 0.7));
      else if (dist > P.band[1]) f = Math.max(f, spd * (P.close ? 1.0 : 0.85));
      else f *= 0.35;
    }
    if (S.shotSeen !== bot.lastShot) {
      S.shotSeen = bot.lastShot;
      if (P.shot && hasLOS) planRelocate(bot, S, real, rp, now);
      if (P.retreatAfterShot && dist < 11) S.retreatUntil = now + 1100;
    }
    if (S.retreatUntil && now < S.retreatUntil) f = -spd * 1.1;
    if (P.jumpy && S.jumpAt2 !== bot.lastShot && now - (bot.lastShot || 0) < 250 && ctx.onGround && dist > 4) { S.jumpAt2 = bot.lastShot; bot.yVel = 12.5; bot.y = bot.y || 0; bot._airJumpUsed = false; }   // a shot, then up (the second jump is the bot's usual double jump)
    if (P.peek && hasLOS) {
      if (!S.peek || now > S.peek.until) S.peek = { hide: !(S.peek && S.peek.hide), until: now + (S.peek && !S.peek.hide ? P.peek[1] : P.peek[0]) * (0.8 + Math.random() * 0.4) };
      if (S.peek.hide) { const cp = coverPoint(bot, S, real, now); if (cp) { const cx = cp.x - bot.x, cz = cp.z - bot.z, cl = Math.hypot(cx, cz); if (cl > 1.2) return { x: cx / cl * 9 * dt, z: cz / cl * 9 * dt }; } f = Math.min(f, -spd * 0.5); }
    } else if (P.burst && hasLOS && (bot.burstLeft || 0) <= 0 && now - (bot.lastShot || 0) > 280 && now - (bot.lastShot || 0) < 900) {
      const cp = coverPoint(bot, S, real, now); if (cp) { const cx = cp.x - bot.x, cz = cp.z - bot.z, cl = Math.hypot(cx, cz); if (cl > 1.2 && cl < 9) return { x: cx / cl * 8 * dt, z: cz / cl * 8 * dt }; }
    }
    if (P.hold) l *= 0.45;                                                           // a suppressor does not dance
    if (P.press) l *= 1.25;                                                          // a pressure gun strafes harder
    if (S.healUntil && now < S.healUntil) { const cp = coverPoint(bot, S, real, now); if (cp) { const cx = cp.x - bot.x, cz = cp.z - bot.z, cl = Math.hypot(cx, cz) || 1; return { x: cl > 1.2 ? cx / cl * 8 * dt : 0, z: cl > 1.2 ? cz / cl * 8 * dt : 0 }; } f = -spd * 0.9; }
    // a fresh angle: the engagement spot repeats, or the position barely changes over several seconds -> relocate
    const spot = (bot.state === 'chase' || bot.state === 'flank') && hasLOS;
    if (spot && !S.inFight) { S.inFight = true; const here = { x: bot.x, z: bot.z }; if (S.spots.some(p => Math.hypot(p.x - here.x, p.z - here.z) < 3.6)) S.spotsHit = (S.spotsHit || 0) + 1, planRelocate(bot, S, real, rp, now); S.spots.push(here); if (S.spots.length > 3) S.spots.shift(); }
    else if (!hasLOS) S.inFight = false;
    if (S.reloc && now < S.reloc.until && Math.hypot(S.reloc.x - bot.x, S.reloc.z - bot.z) > 1.8) {
      const rx = S.reloc.x - bot.x, rz = S.reloc.z - bot.z, rl = Math.hypot(rx, rz);
      return { x: rx / rl * 9 * dt, z: rz / rl * 9 * dt };
    }
    // no conflicting decisions: a state that flips more than four times in two seconds is pinned to chase for a moment
    if (S.stateWas !== bot.state) { S.stateWas = bot.state; if (now - S.flipAt > 2000) { S.flips = 0; S.flipAt = now; } S.flips++; if (S.flips > 4) { bot.state = 'chase'; bot.tacTimer = 1.4; S.flips = 0; S.flipAt = now; } }
    return { x: ux * f + (-uz) * l, z: uz * f + ux * l };
  };
  function planRelocate(bot, S, real, rp, now) {
    const base = Math.atan2(bot.z - rp.z, bot.x - rp.x), dist = clamp(Math.hypot(bot.x - rp.x, bot.z - rp.z), 9, profileFor(bot).band[1]);
    const dir = Math.random() < 0.5 ? 1 : -1;
    for (const off of [1.0, 1.5, 0.7, 2.0, 1.2]) {
      const a = base + dir * off, c = { x: rp.x + Math.cos(a) * dist, z: rp.z + Math.sin(a) * dist };
      if (hasLineOfSight(bot.x, bot.z, c.x, c.z) && hasLineOfSight(c.x, c.z, rp.x, rp.z)) { S.reloc = { x: c.x, z: c.z, until: now + 2600 }; return; }
    }
  }

  // ── Spear and Chain Maul: strike from reach, with the item's own damage and cooldown ──
  // A Spear pokes from 3 m while it strafes; a Chain Maul swings at up to 10 m, which a gun duel does not expect. It strikes when its gun is reloading, when the enemy is weak, or when the
  // item out-damages the gun at that distance; never into a guard, never through a wall.
  NM.reachStrike = function (bot, target, now) {
    if ((bot.meleeId !== 'spear' && bot.meleeId !== 'chain_hammer') || !target || target._phantom || !target.isPlayer || isDead || bot._regularMelee) return false;
    const S = A(bot); if (now < (S.reachAt || 0)) return false;
    const item = MELEE_ITEMS.find(m => m.id === bot.meleeId && !m.archived); if (!item) return false;
    if ((typeof isShielded === 'function' && isShielded()) || (typeof meleeAbilityBuff !== 'undefined' && meleeAbilityBuff && ['parry', 'deflect'].includes(meleeAbilityBuff.type))) return false;
    const px = camera.position.x, pz = camera.position.z, dist = Math.hypot(px - bot.x, pz - bot.z);
    if (dist > item.range - 0.35 || Math.abs((camera.position.y - 1.65) - (bot.y || 0)) > 2.5 || !hasLineOfSight(bot.x, bot.z, px, pz)) return false;
    const gun = WEAPONS.find(w => w.id === bot.weaponId), gunDps = gun ? NM.weaponValue(gun, dist) : 0, meleeDps = (item.damage || 0) / ((item.cooldown || 800) / 1000);
    const tHp = (players[myId] && players[myId].hp != null) ? players[myId].hp : 300;
    if (!(bot.reloadUntil && now < bot.reloadUntil) && tHp > 300 * 0.35 && meleeDps * 0.9 < gunDps) return false;
    S.reachAt = now + (item.cooldown || 800) * 1.1;
    try { botHitsMe(bot.id, item.id); } catch (e) { return false; }
    try {
      armRemoteMesh(remoteMeshes[bot.id], item.id); setTimeout(() => { try { if (!bot.dead) armRemoteMesh(remoteMeshes[bot.id], bot.weaponId); } catch (e) {} }, 420);
      playSoundEvent('melee_heavy', { position: new THREE.Vector3(bot.x, (bot.y || 0) + 1, bot.z), remote: true, volume: 0.7, minGap: 80 });
      spawnHitParticle(new THREE.Vector3(px, 1.3, pz));
    } catch (e) {}
    return true;
  };

  // ── 4. the Katana: predict the round and raise the guard in time ──
  NM.deflect = function (bot, now) {
    if (bot.meleeId !== 'katana' || bot._regularMelee || now < (bot._meleeAbilityAt || 0) || typeof localBullets === 'undefined') return false;
    const item = MELEE_ITEMS.find(m => m.id === 'katana' && !m.archived), ab = item && item.ability; if (!ab || ab.type !== 'melee_deflect') return false;
    const S = A(bot), cx = bot.x, cy = (bot.y || 0) + 1.0, cz = bot.z;
    for (const b of localBullets) {
      if (!b.isOwn || !b.mesh || !b.dir || !b.speed || b.hitDone) continue;                        // the player's rounds
      const wspec = typeof projectileWeaponSpec === 'function' ? projectileWeaponSpec(b.weaponId) : null;
      if (!wspec || (typeof EXPLOSIVE_KINDS !== 'undefined' && EXPLOSIVE_KINDS.has(projectileKind(b.weaponId)))) continue;
      if (((wspec.damage || 0) * (wspec.pellets || 1)) < 20) continue;                              // not worth a guard
      const p = b.mesh.position, vx = b.dir.x * b.speed, vy = b.dir.y * b.speed, vz = b.dir.z * b.speed, vv = vx * vx + vy * vy + vz * vz; if (vv < 1) continue;
      const rx = cx - p.x, ry = cy - p.y, rz = cz - p.z, t = (rx * vx + ry * vy + rz * vz) / vv; if (t <= 0 || t > 0.5) continue;
      const mx = rx - vx * t, my = ry - vy * t, mz = rz - vz * t; if (mx * mx + my * my + mz * mz > 0.8 * 0.8) continue;   // it will not reach the body
      const first = S.seen[b.id] || (S.seen[b.id] = now);
      if (now - first < 85) continue;                                                              // a human-fast reaction, not an instant one
      if (t < 0.07) continue;                                                                      // too late to raise it: the arm cannot move that fast
      bot._deflectUntil = now + (ab.duration || 1000); bot._meleeAbilityAt = now + (ab.cd || 4000);
      bot._regularMelee = { guard: true, item: item.id, start: now, duration: ab.duration || 1000, delay: Infinity };
      try { armRemoteMesh(remoteMeshes[bot.id], item.id); startDeflectGlow(remoteMeshes[bot.id], ab.duration || 1000); playSoundEvent('katana_deflect', { position: new THREE.Vector3(bot.x, (bot.y || 0) + 1, bot.z), remote: true, minGap: 50 }); } catch (e) {}
      for (const k in S.seen) if (now - S.seen[k] > 3000) delete S.seen[k];
      return true;
    }
    return false;
  };

  // ── 5. fleeing, only when it is the right call ──
  NM.fleeDecision = function (bot, dist) {
    const playerHp = (players[myId] && players[myId].hp != null) ? players[myId].hp : 300, maxP = 300;
    if (!isDead && playerHp < maxP * 0.34 && bot.hp > 55) return null;                // they are nearly dead: finish them
    if (bot.hp > (bot.maxHp || 300) * 0.55 && A(bot).style.retreat) return null;       // they keep running: hunt, do not turn back
    return undefined;                                                                  // otherwise the usual reasons apply
  };

  // ── 6. utilities, each used for what it is for ──
  //   frag / explosives: the GRENADE JUMP first (an explosive at its own feet to launch it to height or toward the enemy, a little self-damage), a flush of a camper second.
  //   Medkit: only when safely disengaged. Blink Pearl: a flank, or out of a bad fight. Land Mine: on the route it predicts. Grapple: up to the high ground.
  const EXPLOSIVE = new Set(['frag', 'moon_mine', 'black_hole_seed', 'dynamite', 'sticky_charge']);
  function uses(bot, util) { const S = A(bot); if (S.uses == null) S.uses = {}; if (S.uses[util.id] == null) S.uses[util.id] = util.uses || 1; return S.uses[util.id]; }
  function launch(bot, now, up, dirx, dirz, carry) {
    bot.yVel = Math.max(bot.yVel || 0, up); bot.y = Math.max(bot.y || 0, (bot.y || 0) + 0.05);
    bot._airCarryX = dirx * carry; bot._airCarryZ = dirz * carry; bot._airCarryUntil = now + 900; bot._slideUntil = 0;
  }
  const mines = [];
  NM.utility = function (bot, target, now, ctx) {
    const S = A(bot), real = realOf(target), blind = !!(target && target._phantom), onGround = ctx ? ctx.onGround : true;
    // mines already laid by this bot: they go off when an enemy walks onto them (and fade after 40 s)
    for (let i = mines.length - 1; i >= 0; i--) {
      const m = mines[i]; if (m.owner !== bot.id) continue;
      if (now > m.until) { try { scene.remove(m.mesh); } catch (e) {} mines.splice(i, 1); continue; }
      if (!isDead && Math.abs(camera.position.y - 1.65 - (m.y || 0)) < 2.2 && Math.hypot(camera.position.x - m.x, camera.position.z - m.z) < 1.8) {
        try { applyBotDamageToPlayer(m.id, bot.id); spawnAbilityAOEFX(new THREE.Vector3(m.x, 0.2, m.z), 2.6, 0xff5533); scene.remove(m.mesh); } catch (e) {}
        mines.splice(i, 1);
      }
    }
    if (!bot.utilityId || isDead || bot.dead) return;
    const util = SUPPORT_ITEMS.find(u => u.id === bot.utilityId); if (!util || uses(bot, util) <= 0 || now < (S.utilAt || 0)) return;
    const maxHp = bot.maxHp || 300, rp = real ? posOf(real) : null, dist = rp ? Math.hypot(bot.x - rp.x, bot.z - rp.z) : 999;
    const hasLOS = !!rp && !blind && hasLineOfSight(bot.x, bot.z, rp.x, rp.z);
    const use = (cd) => { S.uses[util.id]--; S.utilAt = now + cd; bot.utilityUsesLeft = Math.max(0, S.uses[util.id]); };
    // 💣 explosives
    if (EXPLOSIVE.has(util.id)) {
      const g = bot._hgGoal, ty = rp && real && real.isPlayer ? camera.position.y - 1.65 : ((real && real.y) || 0);
      const wantHeight = (g && g.y > (bot.y || 0) + 1.5 && Math.hypot(g.x - bot.x, g.z - bot.z) < 20) || (rp && ty > (bot.y || 0) + 2 && dist < 32);
      const wantClose = rp && dist > 24 && (S.style.retreat || (S.mem && now - S.mem.t < 3000)) && bot.hp > maxHp * 0.45;
      if (onGround && (wantHeight || wantClose) && bot.hp > maxHp * 0.3) {           // the grenade jump: throw it at the feet, ride the blast
        const tx = (g ? g.x : rp ? rp.x : bot.x) - bot.x, tz = (g ? g.z : rp ? rp.z : bot.z) - bot.z, tl = Math.hypot(tx, tz) || 1;
        launch(bot, now, wantHeight ? 19 : 14, tx / tl, tz / tl, wantHeight ? 8 : 13);
        bot.hp = Math.max(1, bot.hp - 14);                                          // the self-damage of a blast at its own feet
        try { spawnAbilityAOEFX(new THREE.Vector3(bot.x, 0.2, bot.z), 2.4, 0xffa040); playSoundEvent('explosion', { position: new THREE.Vector3(bot.x, 0.5, bot.z), volume: 0.6, remote: true, minGap: 60 }); } catch (e) {}
        use(6500); return;
      }
      const still = typeof playerVelocity !== 'undefined' && Math.hypot(playerVelocity.x, playerVelocity.z) < 0.8;   // flush a camper / a runner / finish the close fight
      if (hasLOS && dist > 5 && dist < 16 && ((S.style.camp && still) || S.style.retreat || (bot.hp < maxHp * 0.5 && dist < 9)) && (util.damage || 0) >= 40) {
        try { applyBotDamageToPlayer(util.id, bot.id); spawnAbilityAOEFX(new THREE.Vector3(rp.x, 0.1, rp.z), util.radius || 4, util.bulletColor || 0xff8844); } catch (e) {}
        use(9000);
      }
      return;
    }
    // 🩹 medkit: heal when it is safe, never in the middle of a fight
    if (util.id === 'medkit') {
      if (S.healUntil) {
        if (ctx && ctx.wasHit) { S.healUntil = 0; S.utilAt = now + 4000; }          // hit: the heal is broken off (and not wasted: it is kept)
        else if (now >= S.healUntil) { bot.hp = Math.min(maxHp, bot.hp + (util.heal || 100)); S.healUntil = 0; use(1000); }
        return;
      }
      if (bot.hp < maxHp * 0.5 && !hasLOS && (!S.mem || now - S.mem.t > 1500)) S.healUntil = now + (util.healTime || 2500);
      return;
    }
    // ✨ blink pearl: out of a losing fight, or to a new angle on a hunt
    if (util.id === 'blink_pearl') {
      const reach = util.blink || 10; let dir = null;
      if (hasLOS && ctx && ctx.wasHit && bot.hp < maxHp * 0.45) dir = Math.atan2(bot.z - rp.z, bot.x - rp.x) + (Math.random() - 0.5) * 1.2;          // away
      else if (blind && S.search && S.search.cur && now - (S.mem ? S.mem.t : now) > 3000 && Math.hypot(S.search.cur.x - bot.x, S.search.cur.z - bot.z) > reach + 4) dir = Math.atan2(S.search.cur.z - bot.z, S.search.cur.x - bot.x);   // closer
      else if (hasLOS && S.reloc && now < S.reloc.until && Math.hypot(S.reloc.x - bot.x, S.reloc.z - bot.z) > reach) dir = Math.atan2(S.reloc.z - bot.z, S.reloc.x - bot.x);       // a flank
      if (dir == null) return;
      const nx = bot.x + Math.cos(dir) * reach, nz = bot.z + Math.sin(dir) * reach;
      if (isBotOutOfBoundsXZ && isBotOutOfBoundsXZ(nx, nz)) return;
      if (!hasLineOfSight(bot.x, bot.z, nx, nz)) return;                              // never through a wall
      try { spawnAbilityAOEFX(new THREE.Vector3(bot.x, 0.5, bot.z), 1.6, 0x66ccff); } catch (e) {}
      bot.x = nx; bot.z = nz; bot.kbVX = bot.kbVZ = 0;
      try { spawnAbilityAOEFX(new THREE.Vector3(nx, 0.5, nz), 1.6, 0x66ccff); } catch (e) {}
      use(8000); return;
    }
    // 💣 land mine: on the route it predicts for a runner (visible, and it fades)
    if (util.id === 'land_mine') {
      if (mines.filter(m => m.owner === bot.id).length >= 2 || !S.mem) return;
      const age = (now - S.mem.t) / 1000;
      if (!(blind ? (age > 1.2 && age < 6) : (S.style.retreat && dist > 10 && dist < 22 && hasLOS))) return;
      const px = S.mem.x + S.mem.vx * 1.6, pz = S.mem.z + S.mem.vz * 1.6;
      if (!hasLineOfSight(bot.x, bot.z, px, pz) && Math.hypot(px - bot.x, pz - bot.z) > 14) return;
      let mesh = null; try { mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 14), new THREE.MeshBasicMaterial({ color: 0xff3a2a })); mesh.position.set(px, 0.05, pz); scene.add(mesh); } catch (e) {}
      mines.push({ id: util.id, owner: bot.id, x: px, z: pz, y: 0, mesh, until: now + 40000 });
      use(7000); return;
    }
    // 🪝 grapple: up to the high ground it is heading for
    if (util.id === 'grapple_hook') {
      const g = bot._hgGoal; if (!g || !onGround) return;
      const gx = g.x - bot.x, gz = g.z - bot.z, gl = Math.hypot(gx, gz);
      if (gl < 6 || gl > (util.range || 36) || g.y < (bot.y || 0) + 1.5 || !hasLineOfSight(bot.x, bot.z, g.x, g.z)) return;
      launch(bot, now, 13, gx / gl, gz / gl, Math.min(18, (util.pullVel || 30) * 0.5)); use(3500); return;
    }
  };
})();
