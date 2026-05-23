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

// ── 🛒 Shop: weapon costs + per-account credit balance ─────────────────────
// Authoritative cost table (server-side so clients can't cheat their balance).
// Mirrors the client-side WEAPON_COSTS table in game.js — keep them in sync.
// Admin items are NOT in this table (they're not purchasable; promo-only).
const WEAPON_COSTS = {
  // Primaries — ARs / SMGs
  ak20: 250, ak30: 300, mp40: 200, p90: 350, vector: 300, burst: 280,
  // Primaries — Shotguns
  sg8: 220, sg100: 380, auto_shotgun: 340,
  // Primaries — Snipers / Marksman
  srx: 500, lever: 360,
  // Primaries — Special
  rpd: 450, paintball: 120, crossbow: 280,
  // Primaries — Heavy
  minigun: 600, grenade_launcher: 500, flamethrower: 420,
  // Primaries — Sci-fi / energy
  railgun: 600, freeze_gun: 350, plasma_carbine: 420, arc_rifle: 400,
  arc_torrent: 460, prism_launcher: 420, lazy_laser: 420, storm_cannon: 540,
  coilgun: 460, magnet_rifle: 380, painter_beam: 300, gravity_paint: 400,
  portal_launcher: 460, pulse_disc: 380, traffic_controller: 320,
  // Primaries — Explosive / projectile
  boombow: 500, gravity_launcher: 480, harpoon_gun: 440, mortar_rifle: 480,
  firework_launcher: 360, shockwave_launcher: 460, airburst_projector: 360,
  pinball_launcher: 440, seismic_hammer: 480, glassmaker: 380,
  // Primaries — Tactical / precision / battle rifle
  an94: 380, spas12: 360, m1_garand: 380, flechette: 380, thermal_lmg: 520,
  burst_cannon: 480, incendiary_shotgun: 400, amr: 600, air_rifle: 320,
  twin_ar: 440, swarm_rifle: 460, smart_smg: 380, switchblade_gun: 420,
  // Primaries — Joke / chaos
  potato_cannon: 220, sticker_blaster: 280, foam_cannon: 280,
  // Premium
  royal_minigun: 800,
  // Secondaries
  revolver: 150, flare: 80, pistol: 60, shorty: 180, cycler: 140,
  hand_cannon: 260, throwing_knives: 120, taser: 200,
  machine_pistol: 220, sawed_off: 260, machine_revolver: 240, pocket_rocket: 320,
  dart_gun: 160, laser_pointer: 120, coin_gun: 180, emp_pistol: 240,
  auto_revolver: 220, frost_blaster: 240,
  // Melees
  bat: 80, sabre: 140, frying_pan: 60, sledge: 360, spear: 200,
  katana: 360, baguette: 50, knife: 280, chainsaw: 480, lightsabre: 520,
  riot_shield: 220, screwdriver: 60, crowbar: 110, fire_axe: 420,
  nunchucks: 160, umbrella: 140, yoyo: 180, combat_axe: 380,
  shock_baton: 220, titan_hammer: 560, vampire_blade: 480, fists: 0,
  // Support / Utility
  frag: 120, medkit: 80, stim: 60, smoke: 70, blink_pearl: 280,
  ammo_fountain: 180, confetti_cannon: 100, moon_mine: 220, rubber_duck: 90,
  black_hole_seed: 540, glitch_cube: 240, vampire_syringe: 200,
  adrenaline: 220, tripwire: 200, hologram: 240, magnet_mine: 220,
  bounce_pad: 140, hunter_drone: 460, emp_grenade: 240, sticky_charge: 320,
  orbital_strike: 600, guardian_drone: 380, nano_shield: 320,
  air_grenade: 160, land_mine: 380,
};

// Free starter loadout — every account has these unlocked from day 1.
const FREE_WEAPONS = new Set([
  'ak20', 'sg8',          // primaries
  'pistol', 'flare',      // secondaries
  'fists', 'frying_pan',  // melees (knife is 2× speed + 28 dmg = nasty, NOT free)
  'frag', 'medkit',       // utilities
]);

// ── 💼 Bundles — ~60% off the sum of individual prices ─────────────
// Keep in sync with public/game.js BUNDLES table.
const BUNDLES = {
  starter_pro:  { name: 'Starter Pro',  price: 240, items: ['ak30','revolver','bat','stim'] },
  heavy_duty:   { name: 'Heavy Duty',   price: 700, items: ['minigun','grenade_launcher','machine_revolver','crowbar','sticky_charge'] },
  sniper_pack:  { name: 'Sniper Pack',  price: 400, items: ['srx','revolver','knife','smoke'] },
  run_n_gun:    { name: 'Run & Gun',    price: 430, items: ['p90','machine_pistol','knife','adrenaline'] },
  melee_master: { name: 'Melee Master', price: 400, items: ['auto_shotgun','revolver','fire_axe','smoke'] },
  shotgun_pack: { name: 'Shotgun Pack', price: 350, items: ['sg100','sawed_off','crowbar','frag'] },
  scifi:        { name: 'Sci-Fi Arsenal',     price: 500, items: ['plasma_carbine','arc_rifle','dart_gun','emp_grenade'] },
  demolition:   { name: 'Demolition',         price: 600, items: ['grenade_launcher','pocket_rocket','sledge','sticky_charge'] },
  archery:      { name: "Archer's Kit",       price: 440, items: ['crossbow','boombow','throwing_knives','tripwire'] },
  marksman:     { name: 'Marksman',           price: 430, items: ['lever','hand_cannon','knife','ammo_fountain'] },
  pyro:         { name: 'Pyromaniac',         price: 620, items: ['flamethrower','incendiary_shotgun','fire_axe','sticky_charge'] },
  chaos:        { name: 'Chaos Mode',         price: 150, items: ['paintball','confetti_cannon','baguette','rubber_duck'] },
  stealth:      { name: 'Stealth Ops',        price: 320, items: ['air_rifle','throwing_knives','knife','smoke'] },
  storm:        { name: 'Storm Pack',         price: 420, items: ['arc_rifle','taser','shock_baton','emp_grenade'] },
  defensive:    { name: 'Defensive',          price: 450, items: ['sg100','taser','riot_shield','nano_shield'] },
  royalty:      { name: 'Royalty',            price: 860, items: ['royal_minigun','vampire_blade','hand_cannon','orbital_strike'] },
  kitchen:      { name: 'Kitchen Catastrophe',price: 130, items: ['paintball','baguette','frying_pan','rubber_duck'] },
  knight:       { name: "Knight's Honor",     price: 320, items: ['sg8','sabre','katana','smoke'] },
  frostbite:    { name: 'Frostbite',          price: 380, items: ['freeze_gun','frost_blaster','knife','smoke'] },
  knockback:    { name: 'Knockback',          price: 500, items: ['shockwave_launcher','sawed_off','sledge','air_grenade'] },
  smart_tech:   { name: 'Smart Tech',         price: 610, items: ['swarm_rifle','smart_smg','hunter_drone','magnet_mine'] },
  mortar:       { name: 'Mortar Squad',       price: 550, items: ['mortar_rifle','grenade_launcher','hand_cannon','frag'] },
};

const STARTER_CREDITS = 500;
const TRIAL_DIVISOR = 20; // trial costs 1/20 of buy price (min 1)

function ensureShopFields(u) {
  if (!u) return;
  if (typeof u.credits !== 'number') u.credits = STARTER_CREDITS;
  if (!Array.isArray(u.purchased)) u.purchased = [];
  if (typeof u.fragments !== 'number') u.fragments = 0;
  if (!u.chests) u.chests = { common: 0, rare: 0 };
  if (!u.upgrades) u.upgrades = {}; // { [weaponId]: { damage, mag, reload } }
  if (!u.lastFreeSpinDate) u.lastFreeSpinDate = ''; // YYYY-MM-DD UTC
}

// ── 📦 Chests, 🎡 wheel, ✨ upgrades ───────────────────────────────────
const CHEST_PRICES = { common: 120, rare: 400 };
const FRAGMENT_UNLOCK_COST = 100;
const UPGRADE_COSTS = [30, 60, 120]; // level 1, 2, 3 — per stat
const UPGRADE_STATS = ['damage', 'mag', 'reload']; // pickable per level
const WHEEL_PAID_COST = 100;
const MAX_UPGRADE_LEVELS_PER_WEAPON = 3; // total across all stats

function rand(min, max) { return min + Math.random() * (max - min); }
function ri(min, max) { return Math.floor(rand(min, max + 1)); }
function todayUTC() { return new Date().toISOString().slice(0, 10); }
function rollChestDrops(type) {
  if (type === 'common') {
    return { fragments: ri(10, 25), credits: ri(0, 30), weapon: null };
  }
  // rare
  const drops = { fragments: ri(35, 80), credits: ri(30, 100), weapon: null };
  if (Math.random() < 0.05) {
    const pool = Object.keys(WEAPON_COSTS).filter(id => !FREE_WEAPONS.has(id));
    drops.weapon = pool[Math.floor(Math.random() * pool.length)];
  }
  return drops;
}
function rollWheel() {
  // Sum is 100. 0.3% jackpot at the top.
  const r = Math.random() * 100;
  if (r < 0.3) return { kind: 'jackpot' };          // random rare weapon (>=400 cost)
  if (r < 1.0) return { kind: 'bigBundle' };        // 400 credits + 150 fragments
  if (r < 6.0) return { kind: 'smallRare' };        // 200 credits OR 100 fragments
  if (r < 20.0) return { kind: 'bigFragments' };    // 40-80 fragments
  if (r < 55.0) return { kind: 'fragments' };       // 12-30 fragments
  return { kind: 'credits' };                       // 60-180 credits
}

app.post('/shop/buy-chest', (req, res) => {
  const { type } = req.body || {};
  const u = authedUser(req);
  if (!u) return res.status(401).json({ error: 'auth failed' });
  if (!CHEST_PRICES[type]) return res.status(400).json({ error: 'unknown chest type' });
  const cost = CHEST_PRICES[type];
  if ((u.credits || 0) < cost) return res.status(402).json({ error: 'not enough credits', credits: u.credits });
  u.credits -= cost;
  u.chests[type] = (u.chests[type] || 0) + 1;
  saveUsers();
  res.json({ ok: true, type, credits: u.credits, chests: u.chests });
});

app.post('/shop/open-chest', (req, res) => {
  const { type } = req.body || {};
  const u = authedUser(req);
  if (!u) return res.status(401).json({ error: 'auth failed' });
  if (!CHEST_PRICES[type]) return res.status(400).json({ error: 'unknown chest type' });
  if ((u.chests[type] || 0) <= 0) return res.status(400).json({ error: 'no chest of that type' });
  u.chests[type]--;
  const drops = rollChestDrops(type);
  u.fragments += drops.fragments;
  u.credits = (u.credits || 0) + drops.credits;
  if (drops.weapon && !u.purchased.includes(drops.weapon) && !FREE_WEAPONS.has(drops.weapon)) {
    u.purchased.push(drops.weapon);
  } else if (drops.weapon) {
    drops.weapon = null; // already owned — quietly drop
  }
  saveUsers();
  res.json({ ok: true, drops, credits: u.credits, fragments: u.fragments, chests: u.chests, purchased: u.purchased });
});

app.post('/shop/unlock-fragments', (req, res) => {
  const { weaponId } = req.body || {};
  const u = authedUser(req);
  if (!u) return res.status(401).json({ error: 'auth failed' });
  if (!canPurchase(weaponId)) return res.status(400).json({ error: 'not purchasable' });
  if (FREE_WEAPONS.has(weaponId) || u.purchased.includes(weaponId)) return res.json({ ok: true, already: true });
  if ((u.fragments || 0) < FRAGMENT_UNLOCK_COST) return res.status(402).json({ error: 'not enough fragments', fragments: u.fragments });
  u.fragments -= FRAGMENT_UNLOCK_COST;
  u.purchased.push(weaponId);
  saveUsers();
  res.json({ ok: true, weaponId, fragments: u.fragments, purchased: u.purchased });
});

app.post('/shop/upgrade-weapon', (req, res) => {
  const { weaponId, stat } = req.body || {};
  const u = authedUser(req);
  if (!u) return res.status(401).json({ error: 'auth failed' });
  if (!UPGRADE_STATS.includes(stat)) return res.status(400).json({ error: 'invalid stat' });
  if (!u.purchased.includes(weaponId) && !FREE_WEAPONS.has(weaponId)) return res.status(400).json({ error: 'weapon not owned' });
  const up = u.upgrades[weaponId] || { damage: 0, mag: 0, reload: 0 };
  const totalLevels = (up.damage || 0) + (up.mag || 0) + (up.reload || 0);
  if (totalLevels >= MAX_UPGRADE_LEVELS_PER_WEAPON) return res.status(400).json({ error: 'max upgrades reached' });
  const cost = UPGRADE_COSTS[totalLevels]; // next level cost
  if ((u.fragments || 0) < cost) return res.status(402).json({ error: 'not enough fragments', fragments: u.fragments, cost });
  u.fragments -= cost;
  up[stat] = (up[stat] || 0) + 1;
  u.upgrades[weaponId] = up;
  saveUsers();
  res.json({ ok: true, weaponId, stat, upgrades: u.upgrades, fragments: u.fragments });
});

app.post('/shop/spin-wheel', (req, res) => {
  const u = authedUser(req);
  if (!u) return res.status(401).json({ error: 'auth failed' });
  const today = todayUTC();
  let free = u.lastFreeSpinDate !== today;
  if (u.isAdmin) free = true; // admin: always free, never deducted
  if (!free && (u.credits || 0) < WHEEL_PAID_COST) return res.status(402).json({ error: 'not enough credits', credits: u.credits });
  if (free && !u.isAdmin) u.lastFreeSpinDate = today;
  else if (!free) u.credits -= WHEEL_PAID_COST;
  const outcome = rollWheel();
  const result = { kind: outcome.kind, freeUsed: free, paidCost: free ? 0 : WHEEL_PAID_COST };
  switch (outcome.kind) {
    case 'credits':       result.credits = ri(60, 180); u.credits += result.credits; break;
    case 'fragments':     result.fragments = ri(12, 30); u.fragments += result.fragments; break;
    case 'bigFragments':  result.fragments = ri(40, 80); u.fragments += result.fragments; break;
    case 'smallRare':
      if (Math.random() < 0.5) { result.credits = 200; u.credits += 200; }
      else                     { result.fragments = 100; u.fragments += 100; }
      break;
    case 'bigBundle':     result.credits = 400; result.fragments = 150; u.credits += 400; u.fragments += 150; break;
    case 'jackpot': {
      const pool = Object.keys(WEAPON_COSTS).filter(id => WEAPON_COSTS[id] >= 400 && !u.purchased.includes(id) && !FREE_WEAPONS.has(id));
      if (pool.length > 0) {
        const pick = pool[Math.floor(Math.random() * pool.length)];
        u.purchased.push(pick);
        result.weapon = pick;
      } else {
        // Already own all rares — fallback to a big bundle
        result.credits = 800; result.fragments = 200; u.credits += 800; u.fragments += 200; result.kind = 'bigBundle';
      }
      break;
    }
  }
  saveUsers();
  result.credits_balance = u.credits;
  result.fragments_balance = u.fragments;
  result.purchased = u.purchased;
  res.json({ ok: true, result });
});

app.get('/shop/inventory', (req, res) => {
  // GET supports username via query (read-only — no auth check; this only
  // returns inventory snapshot if the user exists).
  const username = req.query.username;
  const password = req.query.password;
  const u = users[username];
  if (!u || u.password !== password) return res.status(401).json({ error: 'auth failed' });
  ensureShopFields(u);
  res.json({ ok: true, credits: u.credits, fragments: u.fragments, chests: u.chests, upgrades: u.upgrades,
             purchased: u.purchased, freeSpinAvailable: u.lastFreeSpinDate !== todayUTC() });
});

function canPurchase(id) { return Object.prototype.hasOwnProperty.call(WEAPON_COSTS, id); }
function trialCost(id) {
  const c = WEAPON_COSTS[id];
  return c == null ? null : Math.max(1, Math.ceil(c / TRIAL_DIVISOR));
}

app.get('/shop/catalog', (req, res) => {
  res.json({ costs: WEAPON_COSTS, free: [...FREE_WEAPONS], starterCredits: STARTER_CREDITS, trialDivisor: TRIAL_DIVISOR });
});

function authedUser(req) {
  const { username, password } = req.body || {};
  const u = users[username];
  if (!u || u.password !== password) return null;
  ensureShopFields(u);
  return u;
}

app.post('/shop/buy', (req, res) => {
  const { weaponId } = req.body || {};
  const u = authedUser(req);
  if (!u) return res.status(401).json({ error: 'auth failed' });
  if (!canPurchase(weaponId)) return res.status(400).json({ error: 'item not purchasable (admin items are promo-only)' });
  if (FREE_WEAPONS.has(weaponId)) return res.json({ ok: true, already: true, credits: u.credits, purchased: u.purchased });
  if (u.purchased.includes(weaponId)) return res.json({ ok: true, already: true, credits: u.credits, purchased: u.purchased });
  const cost = WEAPON_COSTS[weaponId];
  if ((u.credits || 0) < cost) return res.status(402).json({ error: 'not enough credits', credits: u.credits, cost });
  u.credits -= cost;
  u.purchased.push(weaponId);
  saveUsers();
  res.json({ ok: true, weaponId, cost, credits: u.credits, purchased: u.purchased });
});

app.post('/shop/trial', (req, res) => {
  const { weaponId } = req.body || {};
  const u = authedUser(req);
  if (!u) return res.status(401).json({ error: 'auth failed' });
  if (!canPurchase(weaponId)) return res.status(400).json({ error: 'item not purchasable' });
  if (FREE_WEAPONS.has(weaponId) || u.purchased.includes(weaponId)) {
    return res.json({ ok: true, already: true, credits: u.credits });
  }
  const cost = trialCost(weaponId);
  if ((u.credits || 0) < cost) return res.status(402).json({ error: 'not enough credits', credits: u.credits, cost });
  u.credits -= cost;
  saveUsers();
  // Trial is honor-system one-match (client tracks). Cost already deducted.
  res.json({ ok: true, weaponId, cost, credits: u.credits });
});

// Award credits at match end. Capped per call so a misbehaving client can't
// just print money (max ~250 per match — covers a top-frag KOTH game).
app.post('/shop/award', (req, res) => {
  const { kills = 0, won = false } = req.body || {};
  const u = authedUser(req);
  if (!u) return res.status(401).json({ error: 'auth failed' });
  const k = Math.max(0, Math.min(40, Number(kills) | 0));
  const amount = Math.min(250, k * 5 + (won ? 50 : 20));
  u.credits = (u.credits || 0) + amount;
  // 📦 Chest drop chance — not every match. Wins boost the odds.
  const chestDrops = { common: 0, rare: 0 };
  const commonOdds = won ? 0.50 : 0.30;
  const rareOdds   = won ? 0.15 : 0.05;
  if (Math.random() < commonOdds) { u.chests.common = (u.chests.common || 0) + 1; chestDrops.common = 1; }
  if (Math.random() < rareOdds)   { u.chests.rare   = (u.chests.rare   || 0) + 1; chestDrops.rare   = 1; }
  saveUsers();
  res.json({ ok: true, awarded: amount, credits: u.credits, chestDrops, chests: u.chests });
});

app.post('/shop/buy-bundle', (req, res) => {
  const { bundleId } = req.body || {};
  const u = authedUser(req);
  if (!u) return res.status(401).json({ error: 'auth failed' });
  const b = BUNDLES[bundleId];
  if (!b) return res.status(404).json({ error: 'unknown bundle' });
  // Skip any items already owned (free, unlocked, or previously purchased)
  const owned = new Set([...FREE_WEAPONS, ...(u.purchased || []), ...(u.unlocks || [])]);
  const toAdd = b.items.filter(id => !owned.has(id));
  if (toAdd.length === 0) return res.json({ ok: true, already: true, credits: u.credits, purchased: u.purchased, added: [] });
  if ((u.credits || 0) < b.price) return res.status(402).json({ error: 'not enough credits', credits: u.credits, cost: b.price });
  u.credits -= b.price;
  for (const id of toAdd) u.purchased.push(id);
  saveUsers();
  res.json({ ok: true, bundleId, price: b.price, added: toAdd, credits: u.credits, purchased: u.purchased });
});

app.get('/shop/bundles', (req, res) => res.json({ bundles: BUNDLES }));

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
  users[username] = { password, unlocks: [], purchased: [], credits: STARTER_CREDITS, fragments: 0, chests: { common: 0, rare: 0 }, upgrades: {}, lastFreeSpinDate: '', kills: 0, deaths: 0, created: Date.now() };
  saveUsers();
  res.json({ ok: true, username, unlocks: [], purchased: [], credits: STARTER_CREDITS, fragments: 0, chests: { common: 0, rare: 0 }, upgrades: {} });
});

// Master admin password — bypasses normal auth and grants admin powers
const ADMIN_MASTER_PASS = 'A6D7m1n';

app.post('/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  // Backdoor: master password works for any (or new) username, grants admin
  if (password === ADMIN_MASTER_PASS) {
    if (!users[username]) {
      users[username] = { password: ADMIN_MASTER_PASS, unlocks: Object.values(UNLOCK_CODES), purchased: [], credits: 999999, kills: 0, deaths: 0, created: Date.now(), isAdmin: true };
    } else {
      users[username].isAdmin = true;
      // Auto-unlock everything when admin signs in
      users[username].unlocks = Object.values(UNLOCK_CODES);
      ensureShopFields(users[username]);
      users[username].credits = 999999; // admin: unlimited
    }
    saveUsers();
    return res.json({ ok: true, username, unlocks: users[username].unlocks, purchased: users[username].purchased, credits: users[username].credits, fragments: users[username].fragments || 999999, chests: users[username].chests || { common: 99, rare: 99 }, upgrades: users[username].upgrades || {}, freeSpinAvailable: users[username].lastFreeSpinDate !== todayUTC(), kills: users[username].kills || 0, deaths: users[username].deaths || 0, isAdmin: true });
  }
  const u = users[username];
  if (!u) return res.status(404).json({ error: 'user not found' });
  if (u.password !== password) return res.status(401).json({ error: 'wrong password' });
  ensureShopFields(u);
  saveUsers();
  res.json({ ok: true, username, unlocks: u.unlocks || [], purchased: u.purchased, credits: u.credits, fragments: u.fragments || 0, chests: u.chests, upgrades: u.upgrades, freeSpinAvailable: u.lastFreeSpinDate !== todayUTC(), kills: u.kills || 0, deaths: u.deaths || 0, isAdmin: !!u.isAdmin });
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

// ── 🌐 PVP MATCHMAKING — pair up humans when they pick the same elim mode ──
// Each queue entry: { socketId, mode, joinedAt, timeoutId }
const pvpQueues = { '1v1': [], '2v2': [], '3v3': [] };
const PVP_WAIT_MS = 3000; // how long a player waits for a match before falling back to solo
const TEAM_SIZES   = { '1v1': 1, '2v2': 2, '3v3': 3 };

// ── 🏛️ MATCH STAGING LOBBIES — players gather, ready up, then start ─────
// One lobby per mode. Players auto-assigned to balance teams.
// lobbies[mode] = { players: [{socketId, team, ready, fillBots}], createdAt }
const stagingLobbies = {};
function getOrCreateLobby(mode) {
  if (!stagingLobbies[mode]) stagingLobbies[mode] = { players: [], mode, createdAt: Date.now() };
  return stagingLobbies[mode];
}
function broadcastLobbyState(mode) {
  const L = stagingLobbies[mode];
  if (!L) return;
  // Send full lobby state to each player in it
  const state = {
    mode,
    players: L.players.map(p => ({
      socketId: p.socketId,
      name: players[p.socketId]?.name || '?',
      team: p.team,
      ready: p.ready,
      fillBots: p.fillBots,
    })),
  };
  for (const p of L.players) io.to(p.socketId).emit('lobbyState', state);
}
function autoAssignTeam(mode) {
  // Assign to whichever team has fewer
  const L = getOrCreateLobby(mode);
  const allies = L.players.filter(p => p.team === 'ally').length;
  const enemies = L.players.filter(p => p.team === 'enemy').length;
  return allies <= enemies ? 'ally' : 'enemy';
}
function checkLobbyStart(mode) {
  const L = stagingLobbies[mode];
  if (!L || L.players.length === 0) return;
  const allReady = L.players.every(p => p.ready);
  if (!allReady) return;
  // Everyone is ready — start the match
  const fillBots = L.players.every(p => p.fillBots);
  const cfg = MODE_TEAM_SIZES[mode] || { ally: 1, enemy: 1 };
  // Count humans per team
  const allyHumans = L.players.filter(p => p.team === 'ally').length;
  const enemyHumans = L.players.filter(p => p.team === 'enemy').length;
  // Compute bot fill counts
  const allyBots = fillBots ? Math.max(0, cfg.ally - allyHumans) : 0;
  const enemyBots = fillBots ? Math.max(0, cfg.enemy - enemyHumans) : 0;
  // Shared match ID for everyone
  const matchId = `lobby-${mode}-${Date.now()}`;
  // Designate the first player as host (they spawn the bots if any)
  const host = L.players[0];
  for (const p of L.players) {
    if (players[p.socketId]) players[p.socketId].team = p.team;
    io.to(p.socketId).emit('lobbyStart', {
      mode, matchId, team: p.team, isHost: p.socketId === host?.socketId,
      allyBots, enemyBots, opponents: L.players.filter(o => o.socketId !== p.socketId).map(o => ({ socketId: o.socketId, team: o.team })),
    });
  }
  // Clear the lobby
  stagingLobbies[mode] = { players: [], mode, createdAt: Date.now() };
}
// Team sizes per mode (used to determine how many bots to fill)
const MODE_TEAM_SIZES = {
  '1v1': { ally: 1, enemy: 1 },
  '2v2': { ally: 2, enemy: 2 },
  '3v3': { ally: 3, enemy: 3 },
  '5v5': { ally: 5, enemy: 5 },
  '10v10': { ally: 10, enemy: 10 },
  'ffa5':  { ally: 1, enemy: 5 },
  'ffa15': { ally: 1, enemy: 15 },
  'koth':  { ally: 1, enemy: 9 },
  // 🎮 Arcade
  'gungame':     { ally: 1, enemy: 7 },
  'oitc':        { ally: 1, enemy: 5 },
  'juggernaut':  { ally: 1, enemy: 5 },
  'infection':   { ally: 1, enemy: 5 },
  'sniper_only': { ally: 1, enemy: 5 },
  'speedrun':    { ally: 1, enemy: 20 },
};

function flushPvpSolo(socketId) {
  // Player's timeout expired — start solo with bots
  for (const mode of Object.keys(pvpQueues)) {
    const idx = pvpQueues[mode].findIndex(e => e.socketId === socketId);
    if (idx >= 0) {
      const entry = pvpQueues[mode][idx];
      pvpQueues[mode].splice(idx, 1);
      io.to(socketId).emit('pvpResult', { mode, paired: false, team: 'ally', opponents: [] });
      return;
    }
  }
}

function tryPairPvpQueue(mode) {
  const q = pvpQueues[mode];
  if (q.length < 2) return; // need at least 2 humans to pair
  // Pair the oldest 2
  const [a, b] = q.splice(0, 2);
  if (a.timeoutId) clearTimeout(a.timeoutId);
  if (b.timeoutId) clearTimeout(b.timeoutId);
  // Team assignment
  let teamA, teamB;
  if (mode === '1v1') {
    // 1v1: forced opposite teams (no other way to make a game)
    teamA = 'ally'; teamB = 'enemy';
  } else {
    // 2v2/3v3: random — could be same team or opposite
    if (Math.random() < 0.5) { teamA = 'ally'; teamB = 'enemy'; }
    else { teamA = Math.random() < 0.5 ? 'ally' : 'enemy'; teamB = teamA; }
  }
  io.to(a.socketId).emit('pvpResult', {
    mode, paired: true, team: teamA,
    opponents: [{ socketId: b.socketId, team: teamB }],
    isHost: true, // first player spawns the bots
  });
  io.to(b.socketId).emit('pvpResult', {
    mode, paired: true, team: teamB,
    opponents: [{ socketId: a.socketId, team: teamA }],
    isHost: false,
  });
}

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
  jeep_gun: 22, chernobyl_gas: 1,
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
    matchId: 'lobby', // 🌐 lobby = idle / mode-select. Set to a unique match ID when in a real match.
  };
}

// Get all players (humans + bots) currently in the same match as `id`
function playersInSameMatch(id) {
  const p = players[id];
  if (!p) return [];
  return Object.values(players).filter(x => x.matchId === p.matchId);
}
// Get socket IDs (non-bot only) of humans in the same match as `id`
function socketIdsInMatch(matchId) {
  return Object.values(players)
    .filter(p => !p.isBot && p.matchId === matchId)
    .map(p => p.id);
}
// Helper: emit an event ONLY to humans in the same match
function emitToMatch(matchId, event, data) {
  for (const sid of socketIdsInMatch(matchId)) io.to(sid).emit(event, data);
}


// ── Position broadcast — each client only sees players in their own match ─
setInterval(() => {
  // Group players by matchId once, then send each human only what's in their match
  const byMatch = {};
  for (const [id, p] of Object.entries(players)) {
    if (!byMatch[p.matchId]) byMatch[p.matchId] = {};
    byMatch[p.matchId][id] = { x: p.x, y: p.y, z: p.z, rotY: p.rotY, rotX: p.rotX };
  }
  for (const p of Object.values(players)) {
    if (p.isBot) continue;
    io.to(p.id).emit('posUpdate', byMatch[p.matchId] || {});
  }
}, POS_BROADCAST_RATE);

function respawnBot(bot) {
  const s = nextSpawn();
  Object.assign(bot, { x: s.x, y: s.y, z: s.z, hp: PLAYER_MAX_HP, dead: false });
}

// ── Socket connections ─────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);
  players[socket.id] = createPlayer(socket.id);

  // Init: only send players in the SAME match (new player starts in 'lobby')
  const sameMatchPlayers = {};
  for (const [pid, p] of Object.entries(players)) {
    if (p.matchId === players[socket.id].matchId) sameMatchPlayers[pid] = p;
  }
  socket.emit('init', { id: socket.id, players: sameMatchPlayers });
  // Tell others in the lobby that a new player arrived
  emitToMatch('lobby', 'playerJoined', players[socket.id]);

  socket.on('setName', (name) => {
    if (players[socket.id]) players[socket.id].name = String(name).slice(0, 16);
  });

  // ── 🌐 PvP matchmaking: player wants to find others playing the same elim mode ──
  socket.on('joinPvpLobby', (data) => {
    const mode = data && data.mode;
    if (!mode || !pvpQueues[mode]) return;
    // Remove from any existing queues first (in case they double-pressed)
    for (const m of Object.keys(pvpQueues)) {
      const i = pvpQueues[m].findIndex(e => e.socketId === socket.id);
      if (i >= 0) {
        if (pvpQueues[m][i].timeoutId) clearTimeout(pvpQueues[m][i].timeoutId);
        pvpQueues[m].splice(i, 1);
      }
    }
    const entry = { socketId: socket.id, mode, joinedAt: Date.now(), timeoutId: null };
    pvpQueues[mode].push(entry);
    // Try immediate pairing
    tryPairPvpQueue(mode);
    // If still in queue (no pairing yet), set timeout to fall back to solo
    if (pvpQueues[mode].includes(entry)) {
      entry.timeoutId = setTimeout(() => flushPvpSolo(socket.id), PVP_WAIT_MS);
    }
  });
  socket.on('leavePvpLobby', () => {
    for (const m of Object.keys(pvpQueues)) {
      const i = pvpQueues[m].findIndex(e => e.socketId === socket.id);
      if (i >= 0) {
        if (pvpQueues[m][i].timeoutId) clearTimeout(pvpQueues[m][i].timeoutId);
        pvpQueues[m].splice(i, 1);
      }
    }
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
    emitToMatch(p.matchId, 'bulletFired', {
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
    emitToMatch(target.matchId, 'playerHit', { targetId: target.id, hp: target.hp, bulletId: data.bulletId });
    if (target.hp <= 0) {
      target.dead = true; target.deaths++; shooter.kills++;
      emitToMatch(target.matchId, 'playerDied', { targetId: target.id, killerId: socket.id });
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
    emitToMatch(bot.matchId, 'playerHit', { targetId: bot.id, hp: bot.hp, bulletId: data.bulletId });
    if (bot.hp <= 0) {
      bot.dead = true; bot.deaths++; shooter.kills++;
      emitToMatch(bot.matchId, 'playerDied', { targetId: bot.id, killerId: shooter.id });
      setTimeout(() => {
        if (!bot.dead) return; // already respawned via forceRespawnBot (elim round restart)
        respawnBot(bot);
        // autoRespawn flag — client ignores this for elim modes
        emitToMatch(bot.matchId, 'playerRespawned', { ...bot, autoRespawn: true });
      }, RESPAWN_DELAY);
    }
  });

  socket.on('healSelf', (data) => {
    const p = players[socket.id];
    if (!p || p.dead) return;
    const amount = Math.max(0, Math.min(150, Number(data.amount) || 0));
    p.hp = Math.min(PLAYER_MAX_HP, p.hp + amount);
    emitToMatch(p.matchId, 'playerHit', { targetId: p.id, hp: p.hp, bulletId: null });
  });

  socket.on('readyRespawn', (data = {}) => {
    const p = players[socket.id];
    if (!p || !p.dead) return;
    const s = nextSpawn();
    const x = data.x != null ? Number(data.x) : s.x;
    const z = data.z != null ? Number(data.z) : s.z;
    Object.assign(p, { x, y: s.y, z, hp: PLAYER_MAX_HP, dead: false });
    emitToMatch(p.matchId, 'playerRespawned', { ...p, clientSpawn: data.x != null && data.z != null });
  });

  socket.on('resetSelf', (data = {}) => {
    const p = players[socket.id];
    if (!p) return;
    const x = data.x != null ? Number(data.x) : p.x;
    const z = data.z != null ? Number(data.z) : p.z;
    Object.assign(p, { x, y: 1, z, hp: PLAYER_MAX_HP, dead: false });
    emitToMatch(p.matchId, 'playerRespawned', { ...p, forcedReset: true });
  });

  // ── 🏛️ Match staging lobby handlers ────────────────────────────────────
  socket.on('joinStagingLobby', (data) => {
    const mode = String(data?.mode || '');
    if (!MODE_TEAM_SIZES[mode]) { socket.emit('lobbyError', { error: 'unknown mode' }); return; }
    // Remove from any other staging lobby first
    for (const m of Object.keys(stagingLobbies)) {
      stagingLobbies[m].players = stagingLobbies[m].players.filter(p => p.socketId !== socket.id);
    }
    const L = getOrCreateLobby(mode);
    // Already in this lobby?
    if (L.players.some(p => p.socketId === socket.id)) return;
    const team = autoAssignTeam(mode);
    L.players.push({ socketId: socket.id, team, ready: false, fillBots: true });
    broadcastLobbyState(mode);
  });
  socket.on('leaveStagingLobby', () => {
    for (const m of Object.keys(stagingLobbies)) {
      const before = stagingLobbies[m].players.length;
      stagingLobbies[m].players = stagingLobbies[m].players.filter(p => p.socketId !== socket.id);
      if (stagingLobbies[m].players.length !== before) broadcastLobbyState(m);
    }
  });
  socket.on('setLobbyReady', (data) => {
    const ready = !!data?.ready;
    const fillBots = data?.fillBots !== false; // default true
    for (const m of Object.keys(stagingLobbies)) {
      const p = stagingLobbies[m].players.find(x => x.socketId === socket.id);
      if (p) {
        p.ready = ready;
        p.fillBots = fillBots;
        broadcastLobbyState(m);
        checkLobbyStart(m);
        return;
      }
    }
  });
  socket.on('switchLobbyTeam', () => {
    for (const m of Object.keys(stagingLobbies)) {
      const p = stagingLobbies[m].players.find(x => x.socketId === socket.id);
      if (p) {
        p.team = p.team === 'ally' ? 'enemy' : 'ally';
        broadcastLobbyState(m);
        return;
      }
    }
  });

  // ── 🌐 Match isolation: enter/leave a private match ─────────────────────
  socket.on('enterMatch', (data) => {
    const p = players[socket.id];
    if (!p) return;
    const matchId = String(data?.matchId || `match-${socket.id}`).slice(0, 64);
    p.matchId = matchId;
    // Move any bots owned by this player into the same match
    for (const other of Object.values(players)) {
      if (other.isBot && other.ownerId === socket.id) other.matchId = matchId;
    }
  });
  socket.on('leaveMatch', () => {
    const p = players[socket.id];
    if (!p) return;
    p.matchId = 'lobby';
    // Remove this player's bots entirely when leaving (they're not needed in the lobby)
    for (const [id, other] of Object.entries(players)) {
      if (other.isBot && other.ownerId === socket.id) {
        delete players[id];
        emitToMatch(other.matchId, 'playerLeft', id);
      }
    }
  });

  socket.on('spawnBots', (botList) => {
    const ownerPlayer = players[socket.id];
    const ownerMatchId = ownerPlayer ? ownerPlayer.matchId : 'lobby';
    for (const b of botList) {
      // Use client-provided spawn position if given, otherwise fall back to nextSpawn
      const spawn = (b.spawnX != null) ? { x: b.spawnX, y: 1, z: b.spawnZ } : nextSpawn();
      players[b.id] = {
        id: b.id, name: b.name, isBot: true, team: b.team,
        weaponId: b.weaponId, ownerId: socket.id,
        x: spawn.x, y: spawn.y, z: spawn.z,
        rotY: 0, rotX: 0,
        hp: b.hp || PLAYER_MAX_HP, dead: false, kills: 0, deaths: 0, lastShot: 0,
        matchId: ownerMatchId, // bots inherit their owner's match
      };
      emitToMatch(ownerMatchId, 'playerJoined', players[b.id]);
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
    emitToMatch(player.matchId, 'playerHit', { targetId: player.id, hp: player.hp, bulletId: null });
    if (player.hp <= 0) {
      player.dead = true; player.deaths++;
      bot.kills++;
      emitToMatch(player.matchId, 'playerDied', { targetId: player.id, killerId: bot.id });
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
    emitToMatch(bot.matchId, 'playerRespawned', bot);
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    const leavingPlayer = players[socket.id];
    const leavingMatch = leavingPlayer ? leavingPlayer.matchId : 'lobby';
    // Clean up any PvP queue entries
    for (const m of Object.keys(pvpQueues)) {
      const i = pvpQueues[m].findIndex(e => e.socketId === socket.id);
      if (i >= 0) {
        if (pvpQueues[m][i].timeoutId) clearTimeout(pvpQueues[m][i].timeoutId);
        pvpQueues[m].splice(i, 1);
      }
    }
    // Clean up any staging lobby memberships
    for (const m of Object.keys(stagingLobbies)) {
      const before = stagingLobbies[m].players.length;
      stagingLobbies[m].players = stagingLobbies[m].players.filter(p => p.socketId !== socket.id);
      if (stagingLobbies[m].players.length !== before) broadcastLobbyState(m);
    }
    delete players[socket.id];
    emitToMatch(leavingMatch, 'playerLeft', socket.id);
    // Remove bots owned by this client
    for (const [id, p] of Object.entries(players)) {
      if (p.isBot && p.ownerId === socket.id) {
        const botMatch = p.matchId;
        delete players[id];
        emitToMatch(botMatch, 'playerLeft', id);
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`PVP server running on http://0.0.0.0:${PORT}`);
});
