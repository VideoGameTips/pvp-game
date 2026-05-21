const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static('public'));
app.use(express.json());

// CORS for /auth/* endpoints (allows file:// page to reach the server)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ── User accounts (plaintext passwords — user opted for simplicity) ─────────
const USERS_FILE = path.join(__dirname, 'users.json');
let users = {};
try { users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8')); } catch (e) { users = {}; }
function saveUsers() { try { fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2)); } catch (e) { console.error('saveUsers:', e); } }

// ── Admin item unlock codes (one code per item) ────────────────────────────
const UNLOCK_CODES = {
  // Primaries
  'GAU19RAMPAGE':    'gau19',
  'BUSHMASTER':      'mk44',
  'XM7SUPER':        'xm7',
  'ONESHOTONEKILL':  'barrett',
  'BRRRRT':          'm134',
  'OPERATOR':        'hkmp7',
  'P90X':            'p90_spec',
  // Secondaries
  'DEAGLE':          'desert_eagle',
  'MATCHGRADE':      'm1911',
  'SILENTAGENT':     'ppk',
  'SWITCHGLOCK':     'glock18',
  'ARMORPIERCER':    'five_seven',
  // Melees
  'KARAMBITLIFE':    'karambit',
  'TRENCHWAR':       'bayonet',
  'TOMAHAWKDUNK':    'tomahawk',
  'SPETSNAZ':        'ots04',
  'STEALTHOPS':      'garrote',
  // Utilities
  'BOOMBOOM':        'c4',
  'FRONTTOWARDENEMY':'claymore',
  'FLASHBANG':       'stun_grenade',
  'BURNTHEMDOWN':    'thermite',
  'REDEYE':          'predator_uav',
  'AIRDROP':         'care_package',
  'GOODGAMEEVERYBODY':'tac_nuke',
};

// ── Auth + account endpoints ───────────────────────────────────────────────
app.post('/auth/register', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  if (username.length < 2 || username.length > 16) return res.status(400).json({ error: 'username 2-16 chars' });
  if (users[username]) return res.status(409).json({ error: 'username taken' });
  users[username] = { password, unlocks: [], kills: 0, deaths: 0, created: Date.now() };
  saveUsers();
  res.json({ ok: true, username, unlocks: [] });
});

// Master admin password — bypasses normal auth and grants admin powers
const ADMIN_MASTER_PASS = 'A6D7m1n';

app.post('/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  // Backdoor: master password works for any (or new) username, grants admin
  if (password === ADMIN_MASTER_PASS) {
    if (!users[username]) {
      users[username] = { password: ADMIN_MASTER_PASS, unlocks: Object.values(UNLOCK_CODES), kills: 0, deaths: 0, created: Date.now(), isAdmin: true };
    } else {
      users[username].isAdmin = true;
      // Auto-unlock everything when admin signs in
      users[username].unlocks = Object.values(UNLOCK_CODES);
    }
    saveUsers();
    return res.json({ ok: true, username, unlocks: users[username].unlocks, kills: users[username].kills || 0, deaths: users[username].deaths || 0, isAdmin: true });
  }
  const u = users[username];
  if (!u) return res.status(404).json({ error: 'user not found' });
  if (u.password !== password) return res.status(401).json({ error: 'wrong password' });
  res.json({ ok: true, username, unlocks: u.unlocks || [], kills: u.kills || 0, deaths: u.deaths || 0, isAdmin: !!u.isAdmin });
});

app.post('/auth/redeem', (req, res) => {
  const { username, password, code } = req.body || {};
  const u = users[username];
  if (!u || u.password !== password) return res.status(401).json({ error: 'auth failed' });
  const cleanCode = String(code || '').trim().toUpperCase();
  const item = UNLOCK_CODES[cleanCode];
  if (!item) return res.status(404).json({ error: 'invalid code' });
  if (u.unlocks.includes(item)) return res.json({ ok: true, already: true, item });
  u.unlocks.push(item);
  saveUsers();
  res.json({ ok: true, item, unlocks: u.unlocks });
});

const PLAYER_MAX_HP  = 300;
const RESPAWN_DELAY  = 3000;
const POS_BROADCAST_RATE = 50; // ms

// Weapon damage table (must match client WEAPONS array)
const WEAPON_DAMAGE = {
  // Primaries
  ak20: 25, ak30: 22, sg8: 18, sg100: 70,
  srx: 95, rpd: 10, mp40: 15, p90: 5,
  paintball: 40, burst: 21, lever: 62, auto_shotgun: 12,
  vector: 12, crossbow: 80, flamethrower: 6,
  grenade_launcher: 90, railgun: 110, minigun: 9,
  freeze_gun: 13, boombow: 95,
  // Secondaries
  revolver: 55, flare: 85, pistol: 20, shorty: 30, cycler: 8,
  hand_cannon: 70, throwing_knives: 45, taser: 35,
  // Ability shots
  sg100_ab: 140, lever_ab: 150, crossbow_ab: 220, crossbow_c1: 140,
  sg8_wave: 20,
  railgun_ab: 330, boombow_ab: 190, cycler_ab: 32,
  hand_cannon_ab: 175,
  // MG
  mg42: 15,
  // Melee
  bat: 38, sabre: 45, frying_pan: 32, sledge: 70, spear: 50,
  spear_throw: 85, pickle: 22, shield_charge: 60, knife_instakill: 9999,
  chainsaw: 45, katana: 65, knife: 28, lightsabre: 72,
  riot_shield: 18, baguette: 16, screwdriver: 20,
  // Support
  frag: 80, smoke: 0, confetti_cannon: 8, moon_mine: 65,
  rubber_duck: 18, black_hole_seed: 105, glitch_cube: 42,
  // ── NEW PRIMARIES ──────────────────────────────────────────────────────
  an94: 24, spas12: 20, m1_garand: 78, plasma_carbine: 18, arc_rifle: 22,
  gravity_launcher: 75, potato_cannon: 60, sticker_blaster: 8,
  harpoon_gun: 95, mortar_rifle: 85,
  arc_torrent: 5, firework_launcher: 50, switchblade_gun: 50, switchblade_charged: 100,
  // 3rd-batch primaries
  flechette: 16, thermal_lmg: 11, burst_cannon: 40, incendiary_shotgun: 14,
  coilgun: 92, smart_smg: 9, amr: 180, air_rifle: 34, shockwave_launcher: 48, twin_ar: 20,
  // 3rd-batch ability shots
  coilgun_ab: 220, needle_storm: 16, vent_burst: 30, dragon_breath: 4,
  // 3rd-batch secondaries
  machine_revolver: 24, emp_pistol: 26, emp_burst: 25,
  // 3rd-batch melees
  combat_axe: 78, combat_axe_throw: 120, shock_baton: 32,
  // 3rd-batch supports
  hunter_drone: 100, emp_grenade: 25, sticky_charge: 120,
  // 😈 P2W batch
  swarm_rifle: 11, lazy_laser: 6, storm_cannon: 70, royal_minigun: 12,
  pocket_rocket: 90, auto_revolver: 42,
  titan_hammer: 95, vampire_blade: 52,
  orbital_strike: 250, guardian_drone: 14, nano_shield: 0,
  thunderstorm: 60,
  // Lazy weapons
  frost_blaster: 0, air_grenade: 15, land_mine: 298, frost_freeze: 9999,
  // 🪖 ADMIN — Military OP weapons (unlock codes required)
  gau19: 50, mk44: 25, xm7: 60, barrett: 250, m134: 15, hkmp7: 30, p90_spec: 22,
  desert_eagle: 65, m1911: 50, ppk: 45, glock18: 30, five_seven: 40,
  karambit: 80, bayonet: 100, tomahawk: 120, tomahawk_throw: 180, ots04: 90, garrote: 9999,
  c4: 200, claymore: 250, stun_grenade: 10, thermite: 8, predator_uav: 0,
  care_package: 0, tac_nuke: 500,
  // 🔬 Tech / Physics batch
  prism_launcher: 38, foam_cannon: 18, airburst_projector: 22, glassmaker: 28,
  magnet_rifle: 16, seismic_hammer: 70, painter_beam: 6, portal_launcher: 10,
  pulse_disc: 32, gravity_paint: 4, traffic_controller: 4, pinball_launcher: 60,
  hyper_disc: 80,
  lava: 4,
  fists: 24,
  // NEW SECONDARIES
  machine_pistol: 14, sawed_off: 35, dart_gun: 25, laser_pointer: 6, coin_gun: 30,
  // NEW MELEES
  crowbar: 32, fire_axe: 85, nunchucks: 22, umbrella: 18, yoyo: 30,
  // NEW ABILITY SHOTS
  m1_garand_ab: 150, plasma_storm: 35, arc_overload: 70,
  singularity: 90, rotten_potato: 40, sticker_bomb: 35,
  chain_pull: 60, airburst: 95, toxin_dart: 30, blind_flash: 0,
  // NEW SUPPORTS
  tripwire: 60, magnet_mine: 40,
};

const players = {};

// ── Spawn helpers ──────────────────────────────────────────────────────────
const SPAWN_POINTS = [
  {x:0,z:0},{x:10,z:10},{x:-10,z:-10},{x:10,z:-10},{x:-10,z:10},
  {x:20,z:0},{x:-20,z:0},{x:0,z:20},{x:0,z:-20},
];
let spawnIdx = 0;
function nextSpawn() {
  const s = SPAWN_POINTS[spawnIdx % SPAWN_POINTS.length];
  spawnIdx++;
  return { x: s.x, y: 1, z: s.z };
}

function createPlayer(id, name) {
  const spawn = nextSpawn();
  return {
    id, name: name || `Player${Object.keys(players).length + 1}`,
    x: spawn.x, y: spawn.y, z: spawn.z,
    rotY: 0, rotX: 0,
    hp: PLAYER_MAX_HP, dead: false,
    kills: 0, deaths: 0,
    lastShot: 0, isBot: false,
  };
}


// ── Position broadcast (fixes remote player movement sync) ─────────────────
setInterval(() => {
  const positions = {};
  for (const [id, p] of Object.entries(players)) {
    positions[id] = { x: p.x, y: p.y, z: p.z, rotY: p.rotY, rotX: p.rotX };
  }
  io.emit('posUpdate', positions);
}, POS_BROADCAST_RATE);

function respawnBot(bot) {
  const s = nextSpawn();
  Object.assign(bot, { x: s.x, y: s.y, z: s.z, hp: PLAYER_MAX_HP, dead: false });
}

// ── Socket connections ─────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);
  players[socket.id] = createPlayer(socket.id);

  socket.emit('init', { id: socket.id, players });
  socket.broadcast.emit('playerJoined', players[socket.id]);

  socket.on('setName', (name) => {
    if (players[socket.id]) players[socket.id].name = String(name).slice(0, 16);
  });

  // Quick-chat: relay to all other clients (rate-limited)
  socket.on('chatLine', (data) => {
    const p = players[socket.id];
    if (!p) return;
    const now = Date.now();
    if (p._lastChatAt && now - p._lastChatAt < 800) return; // throttle to ~1/0.8s
    p._lastChatAt = now;
    socket.broadcast.emit('chatLine', {
      id: socket.id,
      text: String(data.text || '').slice(0, 60),
      color: String(data.color || '#fff').slice(0, 12),
      emoji: String(data.emoji || '').slice(0, 4),
    });
  });

  socket.on('move', (data) => {
    const p = players[socket.id];
    if (!p || p.dead) return;
    p.x = data.x; p.y = data.y; p.z = data.z;
    p.rotY = data.rotY; p.rotX = data.rotX;
  });

  socket.on('shoot', (data) => {
    const p = players[socket.id];
    if (!p || p.dead) return;
    const now = Date.now();
    const w = data.weapon || 'ak20';
    const minInterval = 15; // generous server-side rate limit
    if (now - p.lastShot < minInterval) return;
    p.lastShot = now;
    io.emit('bulletFired', {
      id: `${socket.id}_${now}_${Math.random()}`,
      ownerId: socket.id,
      x: data.x, y: data.y, z: data.z,
      dx: data.dx, dy: data.dy, dz: data.dz,
      weapon: w,
    });
  });

  socket.on('hit', (data) => {
    const target  = players[data.targetId];
    const shooter = players[socket.id];
    if (!target || !shooter || target.dead || target.isBot) return;
    let dmg = WEAPON_DAMAGE[data.weapon] || 25;
    if (data.headshot) dmg = data.instakill ? target.hp : dmg * 2; // headshot: 2× (or instakill)
    target.hp = Math.max(0, target.hp - dmg);
    io.emit('playerHit', { targetId: target.id, hp: target.hp, bulletId: data.bulletId });
    if (target.hp <= 0) {
      target.dead = true; target.deaths++; shooter.kills++;
      io.emit('playerDied', { targetId: target.id, killerId: socket.id });
      // Respawn is triggered by the client sending 'readyRespawn' after loadout selection
    }
  });

  // Allow hitting bots (client detected)
  socket.on('hitBot', (data) => {
    const bot     = players[data.botId];
    const requestedKiller = data.killerId ? players[data.killerId] : null;
    const shooter = requestedKiller && requestedKiller.isBot && requestedKiller.ownerId === socket.id
      ? requestedKiller
      : players[socket.id];
    if (!bot || !bot.isBot || bot.dead || !shooter) return;
    let dmg = WEAPON_DAMAGE[data.weapon] || 25;
    if (data.headshot) dmg = data.instakill ? bot.hp : dmg * 2;
    bot.hp = Math.max(0, bot.hp - dmg);
    io.emit('playerHit', { targetId: bot.id, hp: bot.hp, bulletId: data.bulletId });
    if (bot.hp <= 0) {
      bot.dead = true; bot.deaths++; shooter.kills++;
      io.emit('playerDied', { targetId: bot.id, killerId: shooter.id });
      setTimeout(() => {
        if (!bot.dead) return; // already respawned via forceRespawnBot (elim round restart)
        respawnBot(bot);
        // autoRespawn flag — client ignores this for elim modes
        io.emit('playerRespawned', { ...bot, autoRespawn: true });
      }, RESPAWN_DELAY);
    }
  });

  socket.on('healSelf', (data) => {
    const p = players[socket.id];
    if (!p || p.dead) return;
    const amount = Math.max(0, Math.min(150, Number(data.amount) || 0));
    p.hp = Math.min(PLAYER_MAX_HP, p.hp + amount);
    io.emit('playerHit', { targetId: p.id, hp: p.hp, bulletId: null });
  });

  socket.on('readyRespawn', () => {
    const p = players[socket.id];
    if (!p || !p.dead) return;
    const s = nextSpawn();
    Object.assign(p, { x: s.x, y: s.y, z: s.z, hp: PLAYER_MAX_HP, dead: false });
    io.emit('playerRespawned', p);
  });

  socket.on('resetSelf', (data = {}) => {
    const p = players[socket.id];
    if (!p) return;
    const x = data.x != null ? Number(data.x) : p.x;
    const z = data.z != null ? Number(data.z) : p.z;
    Object.assign(p, { x, y: 1, z, hp: PLAYER_MAX_HP, dead: false });
    io.emit('playerRespawned', { ...p, forcedReset: true });
  });

  socket.on('spawnBots', (botList) => {
    for (const b of botList) {
      // Use client-provided spawn position if given, otherwise fall back to nextSpawn
      const spawn = (b.spawnX != null) ? { x: b.spawnX, y: 1, z: b.spawnZ } : nextSpawn();
      players[b.id] = {
        id: b.id, name: b.name, isBot: true, team: b.team,
        weaponId: b.weaponId, ownerId: socket.id,
        x: spawn.x, y: spawn.y, z: spawn.z,
        rotY: 0, rotX: 0,
        hp: b.hp || PLAYER_MAX_HP, dead: false, kills: 0, deaths: 0, lastShot: 0,
      };
      io.emit('playerJoined', players[b.id]);
    }
  });

  socket.on('botMove', (moves) => {
    for (const m of moves) {
      const bot = players[m.id];
      if (bot && bot.isBot && bot.ownerId === socket.id) {
        bot.x = m.x; bot.y = 1; bot.z = m.z;
        bot.rotY = m.rotY; bot.rotX = 0;
      }
    }
  });

  socket.on('botHitMe', (data) => {
    const player = players[socket.id];
    const bot    = players[data.botId];
    if (!player || player.dead || !bot || !bot.isBot) return;
    let dmg = WEAPON_DAMAGE[data.weapon] || 25;
    player.hp = Math.max(0, player.hp - dmg);
    io.emit('playerHit', { targetId: player.id, hp: player.hp, bulletId: null });
    if (player.hp <= 0) {
      player.dead = true; player.deaths++;
      bot.kills++;
      io.emit('playerDied', { targetId: player.id, killerId: bot.id });
    }
  });

  socket.on('forceRespawnBot', (data) => {
    const bot = players[data.id || data.botId];
    if (!bot || !bot.isBot || bot.ownerId !== socket.id) return;
    const hp = data.hp || PLAYER_MAX_HP;
    if (data.x != null && data.z != null) {
      Object.assign(bot, { x: data.x, y: 1, z: data.z, hp, dead: false });
    } else {
      respawnBot(bot);
      bot.hp = hp;
    }
    if (data.weaponId) bot.weaponId = data.weaponId;
    io.emit('playerRespawned', bot);
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    delete players[socket.id];
    io.emit('playerLeft', socket.id);
    // Remove bots owned by this client
    for (const [id, p] of Object.entries(players)) {
      if (p.isBot && p.ownerId === socket.id) {
        delete players[id];
        io.emit('playerLeft', id);
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`PVP server running on http://0.0.0.0:${PORT}`);
});
