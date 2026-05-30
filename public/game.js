const socket = window.location.protocol === 'file:'
  ? io('http://localhost:3001')
  : io();

// ── Weapon definitions ─────────────────────────────────────────────────────
const WEAPONS = [
  {
    id: 'ak20',  name: 'AK20',  type: 'AR', slot: 'primary',
    mag: 30,  reserve: 90,  damage: 25, fireRate: 150,  reloadTime: 2000,
    auto: true,  pellets: 1, spread: 0,    adsZoom: 45, bulletSpeed: 120, noReload: false,
    ability: { name: 'Focus Fire', cd: 8000, desc: '3s · laser-accurate · +40% dmg', type: 'buff', duration: 3000, spreadMult: 0, dmgMult: 1.4 },
  },
  {
    id: 'ak30',  name: 'AK30',  type: 'AR+', slot: 'primary',
    mag: 45,  reserve: 135, damage: 22, fireRate: 140,  reloadTime: 2000,
    auto: true,  pellets: 1, spread: 0,    adsZoom: 45, bulletSpeed: 124, noReload: false,
    ability: { name: 'Armor Pierce', cd: 10000, desc: '4s · +50% dmg · ignores distance', type: 'buff', duration: 4000, spreadMult: 0.5, dmgMult: 1.5 },
  },
  {
    id: 'sg8',   name: 'SG-8',  type: 'Shotgun', slot: 'primary',
    mag: 8,   reserve: 32,  damage: 18, fireRate: 900,  reloadTime: 2500,
    auto: false, pellets: 6, spread: 0.08, adsZoom: 55, bulletSpeed: 110, noReload: false,
    ability: { name: 'Bullet Wave', cd: 12000, desc: '6×6 grid · 36 bullets · 20 dmg each', type: 'bulletwave', noADS: true },
  },
  {
    id: 'sg100', name: 'SG100', type: 'Shotgun+', slot: 'primary',
    mag: 10,  reserve: 50,  damage: 70, fireRate: 700,  reloadTime: 2800,
    auto: false, pellets: 2, spread: 0.04, adsZoom: 52, bulletSpeed: 116, noReload: false,
    ability: { name: 'Fan Hammer', cd: 14000, desc: 'Rapidly fires all remaining shots', type: 'fanfire_all', delay: 80, noADS: true },
  },
  {
    id: 'srx',   name: 'SR-X',  type: 'Sniper', slot: 'primary',
    mag: 5,   reserve: 20,  damage: 95, fireRate: 1200, reloadTime: 3000,
    auto: false, pellets: 1, spread: 0,    adsZoom: 15, bulletSpeed: 200, noReload: false,
    ability: { name: 'Light Speed', cd: 16000, desc: 'Next bullet at 10× speed', type: 'powershot', pellets: 1, spreadMult: 0, speedMult: 10 },
  },
  {
    id: 'rpd',   name: 'RPD',   type: 'LMG', slot: 'primary',
    mag: 300, reserve: 0,   damage: 10, fireRate: 60,   reloadTime: 99999,
    auto: true,  pellets: 1, spread: 0.012, adsZoom: 48, bulletSpeed: 130, noReload: true,
    ability: { name: 'Overclock', cd: 12000, desc: '5s · fire rate ×2', type: 'buff', duration: 5000, rateMult: 0.5 },
  },
  {
    id: 'mp40',  name: 'MP-40', type: 'SMG', slot: 'primary',
    mag: 40,  reserve: 120, damage: 15, fireRate: 80,   reloadTime: 1600,
    auto: true,  pellets: 1, spread: 0.01, adsZoom: 50, bulletSpeed: 116, noReload: false,
    ability: { name: 'Piercing Round', cd: 7000, desc: 'Entire magazine fires at 3× bullet speed', type: 'buff', duration: 99999, speedMult: 3, shotsFromMag: true },
  },
  {
    id: 'p90',   name: 'P90',   type: 'SMG+', slot: 'primary',
    mag: 50,  reserve: 150, damage: 5,  fireRate: 20,   reloadTime: 1400,
    auto: true,  pellets: 1, spread: 0.015, adsZoom: 50, bulletSpeed: 140, noReload: false,
    ability: { name: 'Hyperspin', cd: 15000, desc: '3s · fire rate ×4', type: 'buff', duration: 3000, rateMult: 0.25 },
  },
  {
    id: 'paintball', name: 'Paintball', type: 'Paintball', slot: 'primary',
    mag: 8,   reserve: 48,  damage: 40, fireRate: 200,  reloadTime: 1600,
    auto: true,  pellets: 1, spread: 0.018, adsZoom: 52, bulletSpeed: 84, noReload: false,
    randomBulletColor: true, bulletSize: 0.07,
    ability: { name: 'Splat Bomb', cd: 10000, desc: 'Launch a paint bomb · explodes on impact · 4m AOE', type: 'throwbomb', radius: 4, color: 0xff44ff, noADS: true },
  },
  {
    id: 'burst', name: 'Burst Rifle', type: 'Burst AR', slot: 'primary',
    mag: 36, reserve: 108, damage: 21, fireRate: 95, reloadTime: 1900,
    auto: true, pellets: 1, spread: 0.006, adsZoom: 43, bulletSpeed: 136, noReload: false,
    bulletColor: 0xffdd66,
    ability: { name: 'Triple Burst', cd: 9000, desc: 'Fire 3 rapid bursts instantly', type: 'fanfire', count: 9, delay: 40, noADS: true },
  },
  {
    id: 'lever', name: 'Lever Rifle', type: 'Marksman', slot: 'primary',
    mag: 8, reserve: 40, damage: 62, fireRate: 520, reloadTime: 2300,
    auto: false, pellets: 1, spread: 0.002, adsZoom: 32, bulletSpeed: 184, noReload: false,
    ability: { name: 'Deadeye', cd: 16000, desc: 'Next shot deals 150 dmg', type: 'powershot', pellets: 1, spreadMult: 0, weaponAbId: 'lever_ab' },
  },
  {
    id: 'auto_shotgun', name: 'Auto Shotgun', type: 'Shotgun', slot: 'primary',
    mag: 12, reserve: 48, damage: 12, fireRate: 260, reloadTime: 2600,
    auto: true, pellets: 7, spread: 0.095, adsZoom: 58, bulletSpeed: 108, noReload: false,
    ability: { name: 'Tight Choke', cd: 11000, desc: '3s · spread ×0.3 · +20% dmg', type: 'buff', duration: 3000, spreadMult: 0.3, dmgMult: 1.2 },
  },
  {
    id: 'vector', name: 'Vector SMG', type: 'SMG', slot: 'primary',
    mag: 32, reserve: 160, damage: 12, fireRate: 45, reloadTime: 1500,
    auto: true, pellets: 1, spread: 0.017, adsZoom: 50, bulletSpeed: 128, noReload: false,
    ability: { name: 'Overdrive', cd: 13000, desc: '2s · fire rate ×5', type: 'buff', duration: 2000, rateMult: 0.2 },
  },
  {
    id: 'crossbow', name: 'Crossbow', type: 'Projectile', slot: 'primary',
    mag: 1, reserve: 18, damage: 80, fireRate: 650, reloadTime: 1200,
    auto: false, pellets: 1, spread: 0.001, adsZoom: 42, bulletSpeed: 72, noReload: false,
    bulletColor: 0x8b5a2b, bulletSize: 0.09,
    ability: { name: 'Power Charge', cd: 0, type: 'charge', desc: 'Hold fire · release to shoot · longer = more dmg' },
  },
  {
    id: 'flamethrower', name: 'Flamethrower', type: 'Area', slot: 'primary',
    mag: 80, reserve: 160, damage: 6, fireRate: 35, reloadTime: 3200,
    auto: true, pellets: 4, spread: 0.16, adsZoom: 60, bulletSpeed: 48, noReload: false,
    bulletColor: 0xff6600, bulletSize: 0.11,
    ability: { name: 'Propane Burst', cd: 12000, desc: 'Blast 22 concentrated flames directly forward', type: 'multishot', count: 22, spread: 0.025, noADS: true },
  },
  {
    id: 'grenade_launcher', name: 'Grenade Launcher', type: 'Explosive', slot: 'primary',
    mag: 1, reserve: 12, damage: 90, fireRate: 900, reloadTime: 1800,
    auto: false, pellets: 1, spread: 0.006, adsZoom: 52, bulletSpeed: 52, noReload: false,
    bulletColor: 0x2f8f2f, bulletSize: 0.14,
    ability: { name: 'Cluster', cd: 15000, desc: 'Fire 3 grenades in a spread', type: 'multishot', count: 3, spread: 0.12, noADS: true },
  },
  {
    id: 'railgun', name: 'Railgun', type: 'Charge', slot: 'primary',
    mag: 3, reserve: 12, damage: 110, fireRate: 1400, reloadTime: 3000,
    auto: false, pellets: 1, spread: 0, adsZoom: 25, bulletSpeed: 280, noReload: false,
    bulletColor: 0x66ccff, bulletSize: 0.055,
    ability: { name: 'Overcharge', cd: 20000, desc: 'Triple-power shot (330 dmg)', type: 'powershot', pellets: 1, spreadMult: 0, weaponAbId: 'railgun_ab' },
  },
  {
    id: 'minigun', name: 'Minigun', type: 'Heavy', slot: 'primary',
    mag: 180, reserve: 360, damage: 9, fireRate: 32, reloadTime: 4200,
    auto: true, pellets: 1, spread: 0.026, adsZoom: 55, bulletSpeed: 144, noReload: false,
    ability: { name: 'Spin-Up', cd: 16000, desc: '4s · fire rate ×2 · barrels spin faster', type: 'buff', duration: 4000, rateMult: 0.5, spinBoost: true },
  },
  {
    id: 'freeze_gun', name: 'Freeze Gun', type: 'Control', slot: 'primary',
    mag: 30, reserve: 90, damage: 13, fireRate: 110, reloadTime: 2100,
    auto: true, pellets: 1, spread: 0.01, adsZoom: 48, bulletSpeed: 116, noReload: false,
    bulletColor: 0x99ddff,
    ability: { name: 'Cryo Nova', cd: 14000, desc: 'AOE freeze blast 4 m · 50 dmg each', type: 'aoe', radius: 4, damage: 50, color: 0x99ddff },
  },
  {
    id: 'boombow', name: 'Boombow', type: 'Explosive Bow', slot: 'primary',
    mag: 1, reserve: 14, damage: 95, fireRate: 750, reloadTime: 1400,
    auto: false, pellets: 1, spread: 0.004, adsZoom: 42, bulletSpeed: 68, noReload: false,
    bulletColor: 0xffaa22, bulletSize: 0.10,
    ability: { name: 'Power Draw', cd: 17000, desc: 'Next arrow · 190 dmg', type: 'powershot', pellets: 1, spreadMult: 0, weaponAbId: 'boombow_ab' },
  },
  // ── Secondaries ────────────────────────────────────────────────────────────
  {
    id: 'revolver', name: 'Revolver', type: 'Secondary', slot: 'secondary',
    mag: 6,   reserve: 18,  damage: 55, fireRate: 350,  reloadTime: 2200,
    auto: false, pellets: 1, spread: 0.004, adsZoom: 48, bulletSpeed: 170, noReload: false,
    ability: { name: 'Fan Hammer', cd: 9000, desc: 'Rapidly fire all chambers', type: 'fanfire', count: 6, delay: 70 },
  },
  {
    id: 'flare',    name: 'Flare',    type: 'Secondary', slot: 'secondary',
    mag: 1,   reserve: 6,   damage: 85, fireRate: 200,  reloadTime: 2500,
    auto: false, pellets: 1, spread: 0,    adsZoom: 55, bulletSpeed: 44, noReload: false,
    bulletColor: 0xff5500,
    ability: { name: 'Signal Flare', cd: 22000, desc: 'Reveal all enemies 4 s + AOE 50 dmg', type: 'aoe', radius: 8, damage: 50, color: 0xff5500, reveal: true, revealDur: 4000 },
  },
  {
    id: 'pistol',   name: 'Pistol',   type: 'Secondary', slot: 'secondary',
    mag: 15,  reserve: 45,  damage: 20, fireRate: 200,  reloadTime: 1400,
    auto: false, pellets: 1, spread: 0.005, adsZoom: 52, bulletSpeed: 150, noReload: false,
    ability: { name: 'Rapid Fire', cd: 8000, desc: '1 s burst · shoot 8 times fast', type: 'fanfire', count: 8, delay: 55 },
  },
  {
    id: 'shorty',   name: 'Shorty',   type: 'Secondary', slot: 'secondary',
    mag: 2,   reserve: 10,  damage: 30, fireRate: 700,  reloadTime: 1800,
    auto: false, pellets: 4, spread: 0.10,  adsZoom: 58, bulletSpeed: 96, noReload: false,
    ability: { name: 'Point Blank', cd: 12000, desc: 'Next shot · 10 pellets · max spread', type: 'powershot', pellets: 10, spreadMult: 0.01, dmgMult: 1.3 },
  },
  {
    id: 'cycler',   name: 'Cycler',   type: 'Secondary', slot: 'secondary',
    mag: 100, reserve: 0,   damage: 8,  fireRate: 50,   reloadTime: 99999,
    auto: true,  pellets: 1, spread: 0,    adsZoom: 48, bulletSpeed: 160, noReload: true,
    ammoRegen: 3, bulletColor: 0x00ffee,
    ability: { name: 'Surge', cd: 12000, desc: 'Fire 4 large energy balls', type: 'multishot', count: 4, spread: 0.06, weaponAbId: 'cycler_ab' },
  },
  {
    id: 'hand_cannon', name: 'Hand Cannon', type: 'Secondary+', slot: 'secondary',
    mag: 5, reserve: 20, damage: 70, fireRate: 520, reloadTime: 2400,
    auto: false, pellets: 1, spread: 0.014, adsZoom: 48, bulletSpeed: 164, noReload: false,
    ability: { name: 'Execution', cd: 16000, desc: 'Next shot · 175 dmg', type: 'powershot', pellets: 1, spreadMult: 0, weaponAbId: 'hand_cannon_ab' },
  },
  {
    id: 'throwing_knives', name: 'Throwing Knives', type: 'Thrown', slot: 'secondary',
    mag: 3, reserve: 18, damage: 45, fireRate: 240, reloadTime: 1200,
    auto: false, pellets: 1, spread: 0.006, adsZoom: 55, bulletSpeed: 88, noReload: false,
    bulletColor: 0xd8d8d8, bulletSize: 0.045,
    ability: { name: 'Volley', cd: 9000, desc: 'Throw 3 knives simultaneously', type: 'multishot', count: 3, spread: 0.08 },
  },
  {
    id: 'taser', name: 'Taser', type: 'Control', slot: 'secondary',
    mag: 2, reserve: 16, damage: 35, fireRate: 450, reloadTime: 1300,
    auto: false, pellets: 1, spread: 0.004, adsZoom: 52, bulletSpeed: 92, noReload: false,
    bulletColor: 0xffff55, bulletSize: 0.06,
    ability: { name: 'Discharge', cd: 11000, desc: 'AOE electric burst 2.5 m · 70 dmg', type: 'aoe', radius: 2.5, damage: 70, color: 0xffff44 },
  },
  // ── New primaries ──────────────────────────────────────────────────────────
  {
    id: 'an94', name: 'AN-94', type: 'Hyperburst AR', slot: 'primary',
    mag: 30, reserve: 90, damage: 24, fireRate: 130, reloadTime: 2000,
    auto: true, pellets: 1, spread: 0.004, adsZoom: 44, bulletSpeed: 134, noReload: false,
    hyperburstFirst2: true, // first 2 rounds after re-pull fire at 25ms
    ability: { name: 'Hyperburst', cd: 5000, desc: 'Fire 2 instant bullets', type: 'fanfire', count: 2, delay: 25 },
  },
  {
    id: 'spas12', name: 'SPAS-12', type: 'Tactical Shotgun', slot: 'primary',
    mag: 8, reserve: 24, damage: 20, fireRate: 800, reloadTime: 2600,
    auto: false, pellets: 8, spread: 0.085, adsZoom: 56, bulletSpeed: 112, noReload: false,
    ability: { name: 'Slam Fire', cd: 13000, desc: 'Unload tube rapidly', type: 'fanfire_all', delay: 90, noADS: true },
  },
  {
    id: 'm1_garand', name: 'M1 Garand', type: 'Battle Rifle', slot: 'primary',
    mag: 8, reserve: 32, damage: 78, fireRate: 400, reloadTime: 2200,
    auto: false, pellets: 1, spread: 0.003, adsZoom: 35, bulletSpeed: 188, noReload: false,
    lastBulletBonus: 60, // last bullet of mag deals +60 dmg with a "PING" sound
    bulletColor: 0xddc066,
    ability: { name: 'Last Ping', cd: 14000, desc: 'Instantly empty to last round · 150 dmg', type: 'powershot', pellets: 1, spreadMult: 0, weaponAbId: 'm1_garand_ab' },
  },
  {
    id: 'plasma_carbine', name: 'Plasma Carbine', type: 'Energy Rifle', slot: 'primary',
    mag: 25, reserve: 100, damage: 18, fireRate: 140, reloadTime: 2300,
    auto: true, pellets: 1, spread: 0.008, adsZoom: 46, bulletSpeed: 96, noReload: false,
    bulletColor: 0x66ff99, bulletSize: 0.07,
    plasmaGrows: true, // damage scales 1× → 2.2× over 0–30m flight
    ability: { name: 'Plasma Storm', cd: 13000, desc: 'Fire 8 exploding plasma bolts', type: 'multishot', count: 8, spread: 0.10, noADS: true, weaponAbId: 'plasma_storm' },
  },
  {
    id: 'arc_rifle', name: 'Arc Rifle', type: 'Lightning', slot: 'primary',
    mag: 20, reserve: 80, damage: 22, fireRate: 220, reloadTime: 2400,
    auto: true, pellets: 1, spread: 0.005, adsZoom: 48, bulletSpeed: 200, noReload: false,
    bulletColor: 0xaaeeff, bulletSize: 0.06,
    chainLightning: { chains: 2, range: 6, falloff: 0.6 }, // hit then chain to up to 2 nearby enemies
    ability: { name: 'Overload', cd: 16000, desc: 'Massive chain lightning · all enemies in 12 m', type: 'aoe', radius: 12, damage: 70, color: 0xaaeeff, weaponAbId: 'arc_overload' },
  },
  {
    id: 'gravity_launcher', name: 'Gravity Launcher', type: 'Heavy', slot: 'primary',
    mag: 2, reserve: 10, damage: 75, fireRate: 850, reloadTime: 2800,
    auto: false, pellets: 1, spread: 0.005, adsZoom: 50, bulletSpeed: 60, noReload: false,
    bulletColor: 0x7744cc, bulletSize: 0.16, doubleJump: true,
    gravityPull: 6, // pulls enemies 6m radius toward impact point
    ability: { name: 'Singularity', cd: 20000, desc: 'Mini black hole · 8 m pull · 90 dmg', type: 'aoe', radius: 8, damage: 90, color: 0x4400aa, weaponAbId: 'singularity' },
  },
  {
    id: 'potato_cannon', name: 'Potato Cannon', type: 'Joke Launcher', slot: 'primary',
    mag: 1, reserve: 10, damage: 60, fireRate: 750, reloadTime: 1800,
    auto: false, pellets: 1, spread: 0.012, adsZoom: 50, bulletSpeed: 70, noReload: false,
    bulletColor: 0xc89060, bulletSize: 0.14,
    randomSpeed: { min: 0.5, max: 1.8 }, // multiplier on bulletSpeed per shot
    ability: { name: 'Rotten Potato', cd: 12000, desc: 'Toxic cloud · 5 m · 40 dmg', type: 'aoe', radius: 5, damage: 40, color: 0x88aa44, weaponAbId: 'rotten_potato' },
  },
  {
    id: 'sticker_blaster', name: 'Sticker Blaster', type: 'SMG', slot: 'primary',
    mag: 50, reserve: 200, damage: 8, fireRate: 60, reloadTime: 1700,
    auto: true, pellets: 1, spread: 0.018, adsZoom: 52, bulletSpeed: 110, noReload: false,
    randomBulletColor: true, bulletSize: 0.055,
    slowOnHit: { factor: 0.7, dur: 1000 }, // slow target 30%
    ability: { name: 'Sticker Bomb', cd: 11000, desc: 'Throw sticker · 1 s immobilize · 35 dmg', type: 'throwbomb', radius: 3, color: 0xff44ff, weaponAbId: 'sticker_bomb' },
  },
  {
    id: 'harpoon_gun', name: 'Harpoon Gun', type: 'Heavy Projectile', slot: 'primary',
    mag: 1, reserve: 6, damage: 95, fireRate: 1100, reloadTime: 2400,
    auto: false, pellets: 1, spread: 0.002, adsZoom: 40, bulletSpeed: 110, noReload: false,
    bulletColor: 0xb8b8b8, bulletSize: 0.08,
    pinOnHit: { dur: 1500 }, // pin target for 1.5s (heavy slow)
    ability: { name: 'Chain Pull', cd: 13000, desc: 'Drag hit enemy toward you', type: 'powershot', pellets: 1, spreadMult: 0, weaponAbId: 'chain_pull' },
  },
  {
    id: 'mortar_rifle', name: 'Mortar Rifle', type: 'Indirect Explosive', slot: 'primary',
    mag: 3, reserve: 12, damage: 85, fireRate: 1200, reloadTime: 2800,
    auto: false, pellets: 1, spread: 0.006, adsZoom: 48, bulletSpeed: 60, noReload: false,
    bulletColor: 0x445533, bulletSize: 0.13,
    arcShot: true, // gravity-affected trajectory
    ability: { name: 'Airburst', cd: 14000, desc: 'Shell explodes above target · 5 m AOE · 95 dmg', type: 'aoe', radius: 5, damage: 95, color: 0xffaa55, weaponAbId: 'airburst' },
  },
  {
    id: 'arc_torrent', name: 'Arc Torrent', type: 'Beam', slot: 'primary',
    mag: 100, reserve: 200, damage: 5, fireRate: 100, reloadTime: 2400,
    auto: true, pellets: 1, spread: 0.006, adsZoom: 50, bulletSpeed: 240, noReload: false,
    bulletColor: 0xaaeeff, bulletSize: 0.045,
    maxRange: 5, // bullets vanish past 5 m → effective short range
    disableOnHit: 2000, // 2 s bot weapon disable
    ability: { name: 'Surge', cd: 12000, desc: '5 m AOE shock · 80 dmg · 3 s disable', type: 'aoe', radius: 5, damage: 80, color: 0xaaeeff },
  },
  {
    id: 'firework_launcher', name: 'Firework Launcher', type: 'Explosive', slot: 'primary',
    mag: 2, reserve: 10, damage: 50, fireRate: 850, reloadTime: 2400,
    auto: false, pellets: 1, spread: 0.008, adsZoom: 48, bulletSpeed: 58, noReload: false,
    bulletColor: 0xff44aa, bulletSize: 0.13,
    leaveBurnZone: { radius: 3, dps: 3, dur: 10000 }, // walk-through DOT
    ability: { name: 'Grand Finale', cd: 14000, desc: 'Fire 5 fireworks in a spread', type: 'multishot', count: 5, spread: 0.14, noADS: true },
  },
  {
    id: 'switchblade_gun', name: 'Switchblade Gun', type: 'Adaptive', slot: 'primary',
    mag: 12, reserve: 36, damage: 50, fireRate: 350, reloadTime: 2000,
    auto: false, pellets: 1, spread: 0.004, adsZoom: 48, bulletSpeed: 160, noReload: false,
    bulletColor: 0xcc66ff, bulletSize: 0.06,
    splitMechanic: true, // first shot of "cycle" = 100 dmg; lands hit → resets to charged
    ability: { name: 'Recombine', cd: 9000, desc: 'Instantly reset to charged form', type: 'switchblade_reset' },
  },
  // ── 3rd-batch primaries ───────────────────────────────────────────────────
  {
    id: 'flechette', name: 'Flechette Rifle', type: 'Precision AR', slot: 'primary',
    mag: 40, reserve: 120, damage: 16, fireRate: 70, reloadTime: 2000,
    auto: true, pellets: 1, spread: 0.003, adsZoom: 44, bulletSpeed: 175, noReload: false,
    bulletColor: 0xcccccc, bulletSize: 0.04,
    headshotMult: 2, // doubled headshot multiplier (stub — base headshot is already x2, this would be x4)
    ability: { name: 'Needle Storm', cd: 9000, desc: 'Fire 12 flechettes instantly', type: 'fanfire', count: 12, delay: 22 },
  },
  {
    id: 'thermal_lmg', name: 'Thermal LMG', type: 'Heavy LMG', slot: 'primary',
    mag: 180, reserve: 360, damage: 11, fireRate: 55, reloadTime: 4000,
    auto: true, pellets: 1, spread: 0.022, adsZoom: 50, bulletSpeed: 135, noReload: false,
    bulletColor: 0xff6644, bulletSize: 0.05,
    heatsUp: true, // sustained fire ramps damage 11 → 15
    ability: { name: 'Vent Burst', cd: 14000, desc: 'AOE heatwave · 4 m · 30 dmg', type: 'aoe', radius: 4, damage: 30, color: 0xff6644 },
  },
  {
    id: 'burst_cannon', name: 'Burst Cannon', type: 'Heavy Burst Rifle', slot: 'primary',
    mag: 24, reserve: 72, damage: 40, fireRate: 420, reloadTime: 2200,
    auto: true, pellets: 1, spread: 0.007, adsZoom: 42, bulletSpeed: 155, noReload: false,
    bulletColor: 0xffaa22, bulletSize: 0.05,
    burstSize: 3, burstDelay: 65, // 3-round bursts
    ability: { name: 'Stabilizer', cd: 10000, desc: '4 s · zero recoil + tight spread', type: 'buff', duration: 4000, spreadMult: 0.1 },
  },
  {
    id: 'incendiary_shotgun', name: 'Incendiary Shotgun', type: 'Fire Shotgun', slot: 'primary',
    mag: 8, reserve: 32, damage: 14, fireRate: 780, reloadTime: 2500,
    auto: false, pellets: 8, spread: 0.075, adsZoom: 56, bulletSpeed: 105, noReload: false,
    bulletColor: 0xff5522, bulletSize: 0.06,
    burnOnHit: { dps: 4, dur: 6000 }, // ignites target — 4 dmg/sec for 6 sec
    ability: { name: 'Dragon Breath', cd: 12000, desc: 'Cone of fire · pellets ignite enemies', type: 'fanfire_all', delay: 100, noADS: true },
  },
  {
    id: 'coilgun', name: 'Coilgun', type: 'Electromagnetic Rifle', slot: 'primary',
    mag: 5, reserve: 20, damage: 92, fireRate: 900, reloadTime: 2800,
    auto: false, pellets: 1, spread: 0, adsZoom: 30, bulletSpeed: 320, noReload: false,
    bulletColor: 0x66ddff, bulletSize: 0.055,
    ability: { name: 'Overcharge', cd: 17000, desc: 'Piercing 220 dmg shot', type: 'powershot', pellets: 1, spreadMult: 0, weaponAbId: 'coilgun_ab' },
  },
  {
    id: 'smart_smg', name: 'Smart SMG', type: 'Tracking SMG', slot: 'primary',
    mag: 36, reserve: 144, damage: 9, fireRate: 45, reloadTime: 1700,
    auto: true, pellets: 1, spread: 0.015, adsZoom: 50, bulletSpeed: 140, noReload: false,
    bulletColor: 0x99ff99, bulletSize: 0.05,
    tracking: 0.15, // slight magnetism toward nearest target (stub)
    ability: { name: 'Target Link', cd: 13000, desc: '3 s · enhanced bullet tracking', type: 'buff', duration: 3000, spreadMult: 0.3, trackingBoost: true },
  },
  {
    id: 'amr', name: 'Anti-Material Rifle', type: 'Heavy Sniper', slot: 'primary',
    mag: 3, reserve: 12, damage: 180, fireRate: 1600, reloadTime: 3400,
    auto: false, pellets: 1, spread: 0, adsZoom: 14, bulletSpeed: 260, noReload: false,
    bulletColor: 0xddaa44, bulletSize: 0.075,
    ignoreDefenses: true, // bypasses parry/deflect/spawn shield/riot shield
    ability: { name: 'Armor Break', cd: 18000, desc: 'Next shot ignores all armor', type: 'powershot', pellets: 1, spreadMult: 0, weaponAbId: 'amr' },
  },
  {
    id: 'air_rifle', name: 'Compressed Air Rifle', type: 'Silent Rifle', slot: 'primary',
    mag: 20, reserve: 80, damage: 34, fireRate: 180, reloadTime: 2000,
    auto: false, pellets: 1, spread: 0.004, adsZoom: 38, bulletSpeed: 145, noReload: false,
    bulletColor: 0xaaccff, bulletSize: 0.04,
    silentShots: true, // bots can't "hear" gunfire (stub — bots don't track audio yet)
    ability: { name: 'Silent Step', cd: 11000, desc: '5 s · reduced footstep noise', type: 'buff', duration: 5000, stealth: true },
  },
  {
    id: 'shockwave_launcher', name: 'Shockwave Launcher', type: 'Knockback Heavy', slot: 'primary',
    mag: 4, reserve: 16, damage: 48, fireRate: 950, reloadTime: 2600,
    auto: false, pellets: 1, spread: 0.005, adsZoom: 48, bulletSpeed: 80, noReload: false,
    bulletColor: 0xddddff, bulletSize: 0.13,
    knockback: 8, // pushes target 8 units away on hit (stub)
    ability: { name: 'Concussion Blast', cd: 13000, desc: 'Huge knockback pulse · 5 m AOE', type: 'aoe', radius: 5, damage: 48, color: 0xddddff },
  },
  {
    id: 'twin_ar', name: 'Twin Barrel AR', type: 'Dual Rifle', slot: 'primary',
    mag: 32, reserve: 96, damage: 20, fireRate: 150, reloadTime: 2200,
    auto: true, pellets: 2, spread: 0.012, adsZoom: 44, bulletSpeed: 150, noReload: false,
    bulletColor: 0xffcc66, bulletSize: 0.04,
    ability: { name: 'Dual Burst', cd: 9000, desc: 'Fire both barrels at once · heavy recoil', type: 'fanfire', count: 4, delay: 30 },
  },
  // ── 😈 P2W primaries ──────────────────────────────────────────────────────
  {
    id: 'swarm_rifle', name: 'Swarm Rifle', type: 'Tracking AR', slot: 'primary',
    mag: 60, reserve: 180, damage: 11, fireRate: 45, reloadTime: 2300,
    auto: true, pellets: 1, spread: 0.018, adsZoom: 50, bulletSpeed: 110, noReload: false,
    bulletColor: 0xff00ff, bulletSize: 0.05,
    tracking: 0.45, // STRONG bullet magnetism (much higher than smart_smg's 0.15)
    ability: { name: 'Hive Mode', cd: 11000, desc: 'Bullets split into 3 tracking rounds for 3 s', type: 'buff', duration: 3000, pelletsAdd: 2, trackingBoost: true },
  },
  {
    id: 'lazy_laser', name: 'Lazy Laser', type: 'Wide Beam', slot: 'primary',
    mag: 120, reserve: 240, damage: 6, fireRate: 95, reloadTime: 2600,
    auto: true, pellets: 1, spread: 0.05, adsZoom: 50, bulletSpeed: 260, noReload: false,
    bulletColor: 0xff44ff, bulletSize: 0.08,
    maxRange: 18, slowOnHit: { factor: 0.7, dur: 600 },
    ability: { name: 'Full Sweep', cd: 12000, desc: '3 s · massive beam width', type: 'buff', duration: 3000, spreadMult: 4.0, sweepBeam: true },
  },
  {
    id: 'storm_cannon', name: 'Storm Cannon', type: 'Lightning Explosive', slot: 'primary',
    mag: 4, reserve: 16, damage: 70, fireRate: 600, reloadTime: 2400,
    auto: false, pellets: 1, spread: 0.005, adsZoom: 46, bulletSpeed: 90, noReload: false,
    bulletColor: 0xaaeeff, bulletSize: 0.14,
    splashRadius: 4, splashDamage: 50,
    ability: { name: 'Thunderstorm', cd: 15000, desc: 'Random lightning strikes · 5 bolts · 60 dmg ea.', type: 'aoe', radius: 10, damage: 60, color: 0xaaeeff, weaponAbId: 'thunderstorm' },
  },
  {
    id: 'royal_minigun', name: 'Royal Minigun', type: 'Premium Heavy', slot: 'primary',
    mag: 400, reserve: 400, damage: 12, fireRate: 35, reloadTime: 4500,
    auto: true, pellets: 1, spread: 0.008, adsZoom: 50, bulletSpeed: 160, noReload: false,
    bulletColor: 0xffd700, bulletSize: 0.045,
    ability: { name: 'Golden Overheat', cd: 18000, desc: '4 s · infinite ammo · +rate', type: 'buff', duration: 4000, rateMult: 0.7, infiniteAmmo: true },
  },
  // ── 🔬 Tech / Physics primaries ──────────────────────────────────────────
  {
    id: 'prism_launcher', name: 'Prism Launcher', type: 'Bouncing Light', slot: 'primary',
    mag: 12, reserve: 36, damage: 38, fireRate: 380, reloadTime: 2200,
    auto: false, pellets: 1, spread: 0.004, adsZoom: 46, bulletSpeed: 100, noReload: false,
    bulletColor: 0xffaaff, bulletSize: 0.08,
    bounce: { maxBounces: 4, speedMult: 1.2 }, // each bounce speeds up
    ability: { name: 'Rainbow Split', cd: 12000, desc: 'Fire 5 prisms in a spread', type: 'multishot', count: 5, spread: 0.18, noADS: true },
  },
  {
    id: 'foam_cannon', name: 'Foam Cannon', type: 'Industrial Utility', slot: 'primary',
    mag: 6, reserve: 24, damage: 18, fireRate: 700, reloadTime: 2200,
    auto: false, pellets: 1, spread: 0.008, adsZoom: 50, bulletSpeed: 70, noReload: false,
    bulletColor: 0xddddee, bulletSize: 0.12,
    foamWall: true, slowOnHit: { factor: 0.5, dur: 2000 },
    ability: { name: 'Foam Fortress', cd: 14000, desc: 'Wall of foam in front · blocks shots', type: 'aoe', radius: 4, damage: 0, color: 0xddddee, foamFortress: true },
  },
  {
    id: 'airburst_projector', name: 'Airburst Projector', type: 'Knockback Tech', slot: 'primary',
    mag: 8, reserve: 32, damage: 22, fireRate: 500, reloadTime: 2000,
    auto: true, pellets: 1, spread: 0.006, adsZoom: 48, bulletSpeed: 200, noReload: false,
    bulletColor: 0xaaffff, bulletSize: 0.07,
    knockback: 5, // pushes target on hit
    ability: { name: 'Cyclone Pulse', cd: 11000, desc: 'AOE 5 m · launch all hit enemies up', type: 'aoe', radius: 5, damage: 30, color: 0xaaffff, launchVel: 12 },
  },
  {
    id: 'glassmaker', name: 'Glassmaker', type: 'Caustic Projectile', slot: 'primary',
    mag: 10, reserve: 40, damage: 28, fireRate: 320, reloadTime: 2200,
    auto: true, pellets: 1, spread: 0.005, adsZoom: 48, bulletSpeed: 95, noReload: false,
    bulletColor: 0xccffee, bulletSize: 0.07,
    leaveShards: { dur: 5000, dps: 6 }, // leaves a sharp glass field (DOT)
    ability: { name: 'Crystal Rain', cd: 13000, desc: 'Fire 6 glass blobs · sharp field everywhere', type: 'multishot', count: 6, spread: 0.14, noADS: true },
  },
  {
    id: 'magnet_rifle', name: 'Magnet Rifle', type: 'Electromagnetic', slot: 'primary',
    mag: 24, reserve: 96, damage: 16, fireRate: 140, reloadTime: 2200,
    auto: true, pellets: 1, spread: 0.005, adsZoom: 48, bulletSpeed: 175, noReload: false,
    bulletColor: 0xff77cc, bulletSize: 0.05,
    bendProjectiles: 4, pull: 1.5,
    ability: { name: 'Polar Shift', cd: 13000, desc: '4 s · pulls all enemy projectiles toward you', type: 'buff', duration: 4000, polarShift: true },
  },
  {
    id: 'seismic_hammer', name: 'Seismic Hammer', type: 'Ground Shockwave', slot: 'primary',
    mag: 4, reserve: 16, damage: 70, fireRate: 950, reloadTime: 2600,
    auto: false, pellets: 1, spread: 0.003, adsZoom: 46, bulletSpeed: 65, noReload: false,
    bulletColor: 0x885522, bulletSize: 0.12,
    groundWave: true, launchOnHit: 10,
    ability: { name: 'Earthbreaker', cd: 16000, desc: 'Massive ground slam · 8 m · launch all', type: 'aoe', radius: 8, damage: 80, color: 0x885522, launchVel: 14 },
  },
  {
    id: 'painter_beam', name: 'Painter Beam', type: 'Effect Painter', slot: 'primary',
    mag: 60, reserve: 180, damage: 6, fireRate: 80, reloadTime: 2400,
    auto: true, pellets: 1, spread: 0.012, adsZoom: 50, bulletSpeed: 145, noReload: false,
    bulletColor: 0xffff44, bulletSize: 0.06,
    paintEffect: true, // cycles colors → various ground effects (stub)
    ability: { name: 'Spectrum Blast', cd: 12000, desc: 'All 4 paint effects at once · 6 m AOE', type: 'aoe', radius: 6, damage: 0, color: 0xffff44, spectrumBlast: true },
  },
  {
    id: 'portal_launcher', name: 'Portal Launcher', type: 'Spatial', slot: 'primary',
    mag: 6, reserve: 12, damage: 10, fireRate: 500, reloadTime: 2400,
    auto: false, pellets: 1, spread: 0.005, adsZoom: 50, bulletSpeed: 95, noReload: false,
    bulletColor: 0x66ccff, bulletSize: 0.10,
    portal: true, portalDur: 4000,
    ability: { name: 'Portal Storm', cd: 18000, desc: '3 portals at random spots', type: 'multishot', count: 3, spread: 0.20, noADS: true },
  },
  {
    id: 'pulse_disc', name: 'Pulse Disc Launcher', type: 'Bouncing Disc', slot: 'primary',
    mag: 8, reserve: 32, damage: 32, fireRate: 420, reloadTime: 2200,
    auto: false, pellets: 1, spread: 0.003, adsZoom: 50, bulletSpeed: 110, noReload: false,
    bulletColor: 0x44ddff, bulletSize: 0.09,
    bounce: { maxBounces: 6, speedMult: 1.3 }, // accelerates more per bounce than prism
    ability: { name: 'Hyper Disc', cd: 13000, desc: 'Giant spinning disc · 80 dmg', type: 'powershot', pellets: 1, spreadMult: 0, weaponAbId: 'hyper_disc' },
  },
  {
    id: 'gravity_paint', name: 'Gravity Paint', type: 'Reality Paint', slot: 'primary',
    mag: 30, reserve: 90, damage: 4, fireRate: 120, reloadTime: 2500,
    auto: true, pellets: 1, spread: 0.01, adsZoom: 50, bulletSpeed: 110, noReload: false,
    bulletColor: 0xaa44ff, bulletSize: 0.06,
    gravityZone: true, // paints altered-gravity zones (stub)
    ability: { name: 'Anti-Grav Field', cd: 15000, desc: '5 m zone · low gravity · 8 s', type: 'aoe', radius: 5, damage: 0, color: 0xaa44ff, antiGrav: true },
  },
  {
    id: 'traffic_controller', name: 'Traffic Controller', type: 'Signal Painter', slot: 'primary',
    mag: 18, reserve: 54, damage: 4, fireRate: 200, reloadTime: 2000,
    auto: false, pellets: 1, spread: 0.005, adsZoom: 50, bulletSpeed: 130, noReload: false,
    bulletColor: 0xff2200, bulletSize: 0.07,
    trafficCycle: ['red','yellow','green'], // sign color cycles per shot
    ability: { name: 'Gridlock', cd: 13000, desc: 'AOE red sign · 4 m · freeze 2 s', type: 'aoe', radius: 4, damage: 0, color: 0xff2200, trafficStop: true },
  },
  {
    id: 'pinball_launcher', name: 'Pinball Launcher', type: 'Chaos Heavy', slot: 'primary',
    mag: 3, reserve: 12, damage: 60, fireRate: 900, reloadTime: 2800,
    auto: false, pellets: 1, spread: 0.004, adsZoom: 46, bulletSpeed: 90, noReload: false,
    bulletColor: 0xffaa44, bulletSize: 0.14,
    bounce: { maxBounces: 10, speedMult: 1.4 }, // most bounces, biggest accel
    ability: { name: 'Multiball', cd: 14000, desc: 'Fire 3 pinballs in a cone', type: 'multishot', count: 3, spread: 0.12, noADS: true },
  },
  // ── New secondaries ────────────────────────────────────────────────────────
  {
    id: 'machine_pistol', name: 'Machine Pistol', type: 'Secondary', slot: 'secondary',
    mag: 24, reserve: 96, damage: 14, fireRate: 70, reloadTime: 1500,
    auto: true, pellets: 1, spread: 0.013, adsZoom: 50, bulletSpeed: 130, noReload: false,
    ability: { name: 'Akimbo', cd: 8000, desc: 'Dual-wield · 2 shots per trigger for 4 s', type: 'buff', duration: 4000, rateMult: 0.5, akimbo: true },
  },
  {
    id: 'sawed_off', name: 'Sawed-Off', type: 'Secondary', slot: 'secondary',
    mag: 2, reserve: 8, damage: 35, fireRate: 750, reloadTime: 2000,
    auto: false, pellets: 5, spread: 0.13, adsZoom: 58, bulletSpeed: 88, noReload: false,
    ability: { name: 'Double Barrel', cd: 11000, desc: 'Fire both barrels at once · 10 pellets', type: 'powershot', pellets: 10, spreadMult: 1.2, dmgMult: 1.1 },
  },
  {
    id: 'dart_gun', name: 'Dart Gun', type: 'Secondary', slot: 'secondary',
    mag: 6, reserve: 18, damage: 25, fireRate: 350, reloadTime: 1600,
    auto: false, pellets: 1, spread: 0.004, adsZoom: 50, bulletSpeed: 92, noReload: false,
    bulletColor: 0x44ff66, bulletSize: 0.04,
    poisonOnHit: { dps: 12, dur: 4000 }, // 48 dmg over 4 s
    ability: { name: 'Toxin Dart', cd: 12000, desc: 'Next dart · poison DOT 80 dmg over 4 s', type: 'powershot', pellets: 1, spreadMult: 0, weaponAbId: 'toxin_dart' },
  },
  {
    id: 'laser_pointer', name: 'Laser Pointer', type: 'Secondary', slot: 'secondary',
    mag: 50, reserve: 0, damage: 6, fireRate: 80, reloadTime: 99999,
    auto: true, pellets: 1, spread: 0, adsZoom: 50, bulletSpeed: 240, noReload: true,
    bulletColor: 0xff2222, bulletSize: 0.03,
    ammoRegen: 6,
    blindOnHit: { dur: 800 }, // brief screen flash on player hit
    ability: { name: 'Blinding Flash', cd: 12000, desc: 'Strobe enemies in front · blinds 2 s', type: 'aoe', radius: 8, damage: 0, color: 0xffffff, weaponAbId: 'blind_flash' },
  },
  {
    id: 'coin_gun', name: 'Coin Gun', type: 'Secondary', slot: 'secondary',
    mag: 8, reserve: 32, damage: 30, fireRate: 280, reloadTime: 1800,
    auto: false, pellets: 1, spread: 0.006, adsZoom: 52, bulletSpeed: 158, noReload: false,
    bulletColor: 0xffd700, bulletSize: 0.045,
    ricochet: { bounces: 2, dmgMult: 0.85 }, // up to 2 wall bounces
    ability: { name: 'Jackpot', cd: 10000, desc: 'Fire 3 bouncing coins in a spread', type: 'multishot', count: 3, spread: 0.10 },
  },
  // ── 3rd-batch secondaries ─────────────────────────────────────────────────
  {
    id: 'machine_revolver', name: 'Machine Revolver', type: 'Secondary', slot: 'secondary',
    mag: 8, reserve: 24, damage: 24, fireRate: 75, reloadTime: 2000,
    auto: true, pellets: 1, spread: 0.03, adsZoom: 50, bulletSpeed: 165, noReload: false,
    ability: { name: 'Wild Spin', cd: 11000, desc: 'Fan-fire all rounds instantly', type: 'fanfire_all', delay: 35 },
  },
  {
    id: 'emp_pistol', name: 'EMP Pistol', type: 'Secondary', slot: 'secondary',
    mag: 12, reserve: 48, damage: 26, fireRate: 240, reloadTime: 1600,
    auto: false, pellets: 1, spread: 0.005, adsZoom: 50, bulletSpeed: 140, noReload: false,
    bulletColor: 0x66ccff, bulletSize: 0.045,
    empOnHit: 3000, // disables enemy abilities for 3 s on hit (stub)
    ability: { name: 'EMP Burst', cd: 14000, desc: 'AOE · disable abilities 4 s · 25 dmg', type: 'aoe', radius: 6, damage: 25, color: 0x66ccff },
  },
  // ── 😈 P2W secondaries ────────────────────────────────────────────────────
  {
    id: 'pocket_rocket', name: 'Pocket Rocket', type: 'Secondary', slot: 'secondary',
    mag: 1, reserve: 6, damage: 90, fireRate: 850, reloadTime: 2200,
    auto: false, pellets: 1, spread: 0.005, adsZoom: 48, bulletSpeed: 78, noReload: false,
    bulletColor: 0xff8800, bulletSize: 0.13,
    splashRadius: 4, splashDamage: 60,
    ability: { name: 'Mini Barrage', cd: 14000, desc: 'Fire 4 rockets in a spread', type: 'multishot', count: 4, spread: 0.10, noADS: true },
  },
  {
    id: 'auto_revolver', name: 'Auto Revolver', type: 'Secondary', slot: 'secondary',
    mag: 6, reserve: 24, damage: 42, fireRate: 120, reloadTime: 2000,
    auto: true, pellets: 1, spread: 0.002, adsZoom: 50, bulletSpeed: 175, noReload: false,
    tracking: 0.10, // mild aim assist
    ability: { name: 'Deadeye', cd: 11000, desc: '3 s · strong aim assist', type: 'buff', duration: 3000, spreadMult: 0.1, trackingBoost: true },
  },
  {
    id: 'frost_blaster', name: 'Frost Blaster', type: 'Secondary', slot: 'secondary',
    mag: 50, reserve: 0, damage: 0, fireRate: 100, reloadTime: 99999,
    auto: true, pellets: 1, spread: 0.01, adsZoom: 50, bulletSpeed: 120, noReload: true,
    bulletColor: 0x99eeff, bulletSize: 0.05,
    ammoRegen: 5, // recovers 5/sec
    frostSlow: 3, // each shot subtracts 3 speed points from target
    ability: { name: 'Cryo Burst', cd: 12000, desc: 'Frost AOE · -25 speed all targets in 5 m', type: 'aoe', radius: 5, damage: 0, color: 0x99eeff, frostBurst: 25 },
  },
  // ── 🆕 More secondaries — batch 4 ────────────────────────────────────────
  { id: 'snub_revolver', name: 'Snubnose', type: 'Secondary', slot: 'secondary',
    mag: 6, reserve: 18, damage: 32, fireRate: 280, reloadTime: 1800,
    auto: false, pellets: 1, spread: 0.008, adsZoom: 50, bulletSpeed: 160, noReload: false,
    ability: { name: 'Fan', cd: 7000, desc: 'Empty cylinder fast', type: 'fanfire', count: 6, delay: 60 } },
  { id: 'duelist_pistol', name: 'Duelist', type: 'Secondary', slot: 'secondary',
    mag: 1, reserve: 8, damage: 90, fireRate: 350, reloadTime: 1600,
    auto: false, pellets: 1, spread: 0.001, adsZoom: 44, bulletSpeed: 200, noReload: false,
    bulletColor: 0xddccaa,
    ability: { name: 'Honor Shot', cd: 12000, desc: 'Next shot 1-hit kill on under-50 HP', type: 'powershot', pellets: 1, spreadMult: 0, dmgMult: 2.0 } },
  { id: 'mauser', name: 'Mauser C96', type: 'Secondary', slot: 'secondary',
    mag: 10, reserve: 30, damage: 24, fireRate: 150, reloadTime: 1800,
    auto: false, pellets: 1, spread: 0.006, adsZoom: 50, bulletSpeed: 150, noReload: false,
    ability: { name: 'Rapid Strip', cd: 9000, desc: 'Empty mag at 2× rate', type: 'fanfire', count: 10, delay: 60 } },
  { id: 'mini_uzi', name: 'Mini Uzi', type: 'Secondary', slot: 'secondary',
    mag: 25, reserve: 75, damage: 12, fireRate: 70, reloadTime: 1500,
    auto: true, pellets: 1, spread: 0.012, adsZoom: 52, bulletSpeed: 130, noReload: false,
    ability: { name: 'Spray', cd: 8000, desc: '3s · spread halved', type: 'buff', duration: 3000, spreadMult: 0.5 } },
  { id: 'nail_gun', name: 'Nail Gun', type: 'Secondary', slot: 'secondary',
    mag: 20, reserve: 60, damage: 18, fireRate: 110, reloadTime: 1600,
    auto: true, pellets: 1, spread: 0.005, adsZoom: 48, bulletSpeed: 140, noReload: false,
    bulletColor: 0xccccaa, bulletSize: 0.03,
    ability: { name: 'Pin Down', cd: 8000, desc: 'Next shot deals 3× damage', type: 'powershot', pellets: 1, spreadMult: 0, dmgMult: 3 } },
  { id: 'boomstick', name: 'Boomstick', type: 'Secondary', slot: 'secondary',
    mag: 2, reserve: 12, damage: 35, fireRate: 600, reloadTime: 2000,
    auto: false, pellets: 5, spread: 0.12, adsZoom: 56, bulletSpeed: 100, noReload: false,
    ability: { name: 'Both Barrels', cd: 11000, desc: 'Empty both at once', type: 'fanfire', count: 2, delay: 40 } },
  { id: 'signal_pistol', name: 'Signal Pistol', type: 'Secondary', slot: 'secondary',
    mag: 1, reserve: 5, damage: 70, fireRate: 250, reloadTime: 2400,
    auto: false, pellets: 1, spread: 0, adsZoom: 54, bulletSpeed: 60, noReload: false,
    bulletColor: 0xffaa44,
    ability: { name: 'Beacon', cd: 18000, desc: 'Reveal enemies 3 s + 40 dmg AOE', type: 'aoe', radius: 6, damage: 40, color: 0xffaa44, reveal: true, revealDur: 3000 } },
  { id: 'throwing_axes', name: 'Throwing Axes', type: 'Thrown', slot: 'secondary',
    mag: 1, reserve: 5, damage: 70, fireRate: 700, reloadTime: 1400,
    auto: false, pellets: 1, spread: 0.01, adsZoom: 50, bulletSpeed: 70, noReload: false,
    bulletColor: 0x8a5a2a, bulletSize: 0.10,
    ability: { name: 'Triple Toss', cd: 11000, desc: 'Throw 3 axes in a spread', type: 'multishot', count: 3, spread: 0.12 } },
  { id: 'shuriken', name: 'Shuriken', type: 'Thrown', slot: 'secondary',
    mag: 8, reserve: 24, damage: 22, fireRate: 180, reloadTime: 1400,
    auto: false, pellets: 1, spread: 0.008, adsZoom: 52, bulletSpeed: 110, noReload: false,
    bulletColor: 0xcccccc, bulletSize: 0.05,
    ability: { name: 'Star Storm', cd: 10000, desc: 'Throw 8 shurikens in rapid burst', type: 'fanfire', count: 8, delay: 50 } },
  { id: 'boomerang', name: 'Boomerang', type: 'Thrown', slot: 'secondary',
    mag: 1, reserve: 4, damage: 35, fireRate: 800, reloadTime: 1200,
    auto: false, pellets: 1, spread: 0, adsZoom: 50, bulletSpeed: 80, noReload: false,
    bulletColor: 0xcc8855,
    ability: { name: 'Trick Shot', cd: 9000, desc: 'Next throw deals 2× damage', type: 'powershot', pellets: 1, spreadMult: 0, dmgMult: 2 } },
  { id: 'slingshot', name: 'Slingshot', type: 'Secondary', slot: 'secondary',
    mag: 1, reserve: 12, damage: 24, fireRate: 400, reloadTime: 700,
    auto: false, pellets: 1, spread: 0.008, adsZoom: 48, bulletSpeed: 80, noReload: false,
    bulletColor: 0x666666,
    ability: { name: 'Volley', cd: 8000, desc: 'Loose 5 pellets in a spread', type: 'multishot', count: 5, spread: 0.18 } },
  { id: 'blowgun', name: 'Blowgun', type: 'Secondary', slot: 'secondary',
    mag: 1, reserve: 10, damage: 32, fireRate: 600, reloadTime: 800,
    auto: false, pellets: 1, spread: 0.002, adsZoom: 50, bulletSpeed: 120, noReload: false,
    bulletColor: 0x33aa55, bulletSize: 0.025,
    ability: { name: 'Toxic Dart', cd: 10000, desc: 'Next dart deals 3× damage', type: 'powershot', pellets: 1, spreadMult: 0, dmgMult: 3 } },

  // ── 🌌 SCI-FI P2W PRIMARIES (very expensive, fantasy-tier mechanics) ────
  { id: 'event_horizon', name: 'Event Horizon Rifle', type: 'Gravity AR', slot: 'primary',
    mag: 18, reserve: 54, damage: 75, fireRate: 280, reloadTime: 2400,
    auto: true, pellets: 1, spread: 0.005, adsZoom: 46, bulletSpeed: 140, noReload: false,
    bulletColor: 0x6633ff, bulletSize: 0.07,
    ability: { name: 'Collapse', cd: 14000, desc: 'Gravity field · 8 m AOE 80 dmg · slows', type: 'aoe', radius: 8, damage: 80, color: 0x6633ff, frostBurst: 30 } },
  { id: 'storm_core', name: 'Storm Core', type: 'Plasma Heavy', slot: 'primary',
    mag: 24, reserve: 72, damage: 55, fireRate: 220, reloadTime: 2300,
    auto: true, pellets: 1, spread: 0.008, adsZoom: 50, bulletSpeed: 130, noReload: false,
    bulletColor: 0x88ddff, bulletSize: 0.08, emissive: true,
    ability: { name: 'Supercell', cd: 16000, desc: 'Lightning storm · 10 m AOE 100 dmg', type: 'aoe', radius: 10, damage: 100, color: 0xaaeeff, launchVel: 6 } },
  { id: 'abs_zero', name: 'Absolute Zero Projector', type: 'Cryo', slot: 'primary',
    mag: 30, reserve: 90, damage: 35, fireRate: 100, reloadTime: 2400,
    auto: true, pellets: 1, spread: 0.010, adsZoom: 48, bulletSpeed: 120, noReload: false,
    bulletColor: 0x99eeff, bulletSize: 0.06,
    ability: { name: 'Cryostasis', cd: 18000, desc: 'Freeze 9 m AOE · slows all', type: 'aoe', radius: 9, damage: 30, color: 0x99eeff, frostBurst: 60 } },
  { id: 'solar_lance', name: 'Solar Lance', type: 'Beam', slot: 'primary',
    mag: 200, reserve: 0, damage: 12, fireRate: 40, reloadTime: 99999,
    auto: true, pellets: 1, spread: 0.002, adsZoom: 44, bulletSpeed: 220, noReload: true, ammoRegen: 2,
    bulletColor: 0xffee44, bulletSize: 0.05, emissive: true,
    ability: { name: 'Solar Flare', cd: 14000, desc: 'Blinding beam burst · 7 m AOE 90 dmg', type: 'aoe', radius: 7, damage: 90, color: 0xffee44, reveal: true, revealDur: 3000 } },
  { id: 'phase_driver', name: 'Phase Driver', type: 'Phasing AR', slot: 'primary',
    mag: 20, reserve: 60, damage: 60, fireRate: 200, reloadTime: 2200,
    auto: true, pellets: 1, spread: 0.004, adsZoom: 46, bulletSpeed: 180, noReload: false,
    bulletColor: 0xaa66ff, bulletSize: 0.06, emissive: true, doubleJump: true,
    ability: { name: 'Ghost Protocol', cd: 18000, desc: '4 s · +50% speed · shots ignore cover · DOUBLE JUMP', type: 'buff', duration: 4000, speedMult: 1.5, dmgMult: 1.3 } },
  { id: 'quantum_repeater', name: 'Quantum Repeater', type: 'Time-Shift AR', slot: 'primary',
    mag: 22, reserve: 66, damage: 50, fireRate: 200, reloadTime: 2300,
    auto: true, pellets: 1, spread: 0.005, adsZoom: 48, bulletSpeed: 150, noReload: false,
    bulletColor: 0x66ffcc, bulletSize: 0.06,
    ability: { name: 'Timeline Break', cd: 15000, desc: 'Replay last mag instantly · 12 shots fast', type: 'fanfire', count: 12, delay: 40 } },
  { id: 'magnetar', name: 'Magnetar Cannon', type: 'Magnetic Heavy', slot: 'primary',
    mag: 12, reserve: 36, damage: 90, fireRate: 500, reloadTime: 2600,
    auto: false, pellets: 1, spread: 0.003, adsZoom: 44, bulletSpeed: 140, noReload: false,
    bulletColor: 0xff77cc, bulletSize: 0.09,
    ability: { name: 'Polar Collapse', cd: 16000, desc: 'Magnetic implosion · 8 m AOE 120 dmg', type: 'aoe', radius: 8, damage: 120, color: 0xff77cc, launchVel: 14 } },
  { id: 'nebula_mortar', name: 'Nebula Mortar', type: 'Cosmic Indirect', slot: 'primary',
    mag: 4, reserve: 16, damage: 110, fireRate: 800, reloadTime: 3000,
    auto: false, pellets: 1, spread: 0.002, adsZoom: 38, bulletSpeed: 70, noReload: false,
    bulletColor: 0x9966ff, bulletSize: 0.14,
    ability: { name: 'Starfall', cd: 20000, desc: 'Meteor shower · 12 m AOE 180 dmg', type: 'aoe', radius: 12, damage: 180, color: 0xaa88ff, launchVel: 8 } },
  { id: 'prism_engine', name: 'Prism Engine', type: 'Refractive Beam', slot: 'primary',
    mag: 50, reserve: 150, damage: 22, fireRate: 70, reloadTime: 2200,
    auto: true, pellets: 1, spread: 0.004, adsZoom: 48, bulletSpeed: 160, noReload: false,
    bulletColor: 0xffaaff, bulletSize: 0.05, emissive: true,
    ability: { name: 'Refraction Overload', cd: 14000, desc: 'Fire 14 split-beams', type: 'multishot', count: 14, spread: 0.20 } },
  { id: 'void_harvester', name: 'Void Harvester', type: 'Void Heavy', slot: 'primary',
    mag: 6, reserve: 24, damage: 130, fireRate: 700, reloadTime: 3000,
    auto: false, pellets: 1, spread: 0.002, adsZoom: 42, bulletSpeed: 120, noReload: false,
    bulletColor: 0x220033, bulletSize: 0.11, emissive: true,
    ability: { name: 'Consume', cd: 22000, desc: 'Detonate all remnants · 15 m AOE 250 dmg', type: 'aoe', radius: 15, damage: 250, color: 0x440066, frostBurst: 40 } },

  // ── 🌌 SCI-FI P2W SECONDARIES ────────────────────────────────────────────
  { id: 'pulse_needle', name: 'Pulse Needle', type: 'Tracking Secondary', slot: 'secondary',
    mag: 12, reserve: 36, damage: 14, fireRate: 110, reloadTime: 1500,
    auto: true, pellets: 1, spread: 0.003, adsZoom: 50, bulletSpeed: 160, noReload: false,
    bulletColor: 0xff66cc, bulletSize: 0.03,
    ability: { name: 'Detonate', cd: 10000, desc: 'All pulse marks explode · 12-shot burst', type: 'fanfire', count: 12, delay: 30 } },
  { id: 'phase_pistol', name: 'Phase Pistol', type: 'Phasing Secondary', slot: 'secondary',
    mag: 8, reserve: 24, damage: 45, fireRate: 280, reloadTime: 1600,
    auto: false, pellets: 1, spread: 0.002, adsZoom: 50, bulletSpeed: 200, noReload: false,
    bulletColor: 0xaa66ff, bulletSize: 0.05, emissive: true, doubleJump: true,
    ability: { name: 'Blink Shot', cd: 11000, desc: 'Next shot · 3× damage · DOUBLE JUMP equipped', type: 'powershot', pellets: 1, spreadMult: 0, dmgMult: 3 } },
  { id: 'ion_revolver', name: 'Ion Revolver', type: 'Electric Revolver', slot: 'secondary',
    mag: 6, reserve: 18, damage: 50, fireRate: 320, reloadTime: 2000,
    auto: false, pellets: 1, spread: 0.005, adsZoom: 48, bulletSpeed: 170, noReload: false,
    bulletColor: 0x66ccff, bulletSize: 0.05, emissive: true,
    ability: { name: 'Arc Burst', cd: 12000, desc: 'Empty cylinder · chain shots', type: 'fanfire', count: 6, delay: 60 } },

  // ── 🪖 ADMIN PRIMARIES (locked behind unlock codes) ──────────────────────
  {
    id: 'gau19', name: 'GAU-19 Heavy', type: 'Admin · Mounted MG', slot: 'primary',
    mag: 500, reserve: 1000, damage: 50, fireRate: 18, reloadTime: 4000,
    auto: true, pellets: 1, spread: 0.01, adsZoom: 50, bulletSpeed: 180, noReload: false,
    bulletColor: 0xffaa22, bulletSize: 0.06, adminItem: true,
    ability: { name: 'Sustained Fire', cd: 18000, desc: '8 s · double fire rate', type: 'buff', duration: 8000, rateMult: 0.5 },
  },
  {
    id: 'mk44', name: 'MK-44 Bushmaster', type: 'Admin · Chain Gun', slot: 'primary',
    mag: 360, reserve: 720, damage: 25, fireRate: 40, reloadTime: 3500,
    auto: true, pellets: 1, spread: 0.015, adsZoom: 48, bulletSpeed: 160, noReload: false,
    bulletColor: 0xddcc44, bulletSize: 0.055, adminItem: true,
    ability: { name: 'Saturation', cd: 14000, desc: '4 s · zero spread + fire rate', type: 'buff', duration: 4000, spreadMult: 0, rateMult: 0.6 },
  },
  {
    id: 'xm7', name: 'XM7 Service Rifle', type: 'Admin · Battle AR', slot: 'primary',
    mag: 40, reserve: 120, damage: 60, fireRate: 80, reloadTime: 1800,
    auto: true, pellets: 1, spread: 0, adsZoom: 42, bulletSpeed: 180, noReload: false,
    adminItem: true,
    ability: { name: 'Precision Fire', cd: 10000, desc: '5 s · perfect accuracy · +30% dmg', type: 'buff', duration: 5000, spreadMult: 0, dmgMult: 1.3 },
  },
  {
    id: 'barrett', name: 'Barrett M82', type: 'Admin · Anti-Material', slot: 'primary',
    mag: 5, reserve: 15, damage: 250, fireRate: 1100, reloadTime: 3200,
    auto: false, pellets: 1, spread: 0, adsZoom: 12, bulletSpeed: 320, noReload: false,
    bulletColor: 0xffcc66, bulletSize: 0.08, adminItem: true,
    ability: { name: '.50 BMG Overload', cd: 16000, desc: 'Next shot · 600 dmg · pierces walls', type: 'powershot', pellets: 1, spreadMult: 0, weaponAbId: 'barrett_ab' },
  },
  {
    id: 'm134', name: 'M134 Minigun', type: 'Admin · Gatling', slot: 'primary',
    mag: 800, reserve: 0, damage: 15, fireRate: 25, reloadTime: 99999,
    auto: true, pellets: 1, spread: 0.018, adsZoom: 50, bulletSpeed: 170, noReload: true,
    bulletColor: 0xffaa44, bulletSize: 0.05, adminItem: true,
    ability: { name: 'Brrrrt!', cd: 15000, desc: '6 s · fire rate ×2', type: 'buff', duration: 6000, rateMult: 0.5 },
  },
  {
    id: 'hkmp7', name: 'HK-MP7 Operator', type: 'Admin · PDW', slot: 'primary',
    mag: 60, reserve: 240, damage: 30, fireRate: 50, reloadTime: 1400,
    auto: true, pellets: 1, spread: 0, adsZoom: 50, bulletSpeed: 175, noReload: false,
    adminItem: true,
    ability: { name: 'Silenced Burst', cd: 9000, desc: '3 s · silent + ×0 spread', type: 'buff', duration: 3000, spreadMult: 0, stealth: true },
  },
  {
    id: 'p90_spec', name: 'FN P-90 Special', type: 'Admin · Bullpup SMG', slot: 'primary',
    mag: 80, reserve: 240, damage: 22, fireRate: 60, reloadTime: 1500,
    auto: true, pellets: 1, spread: 0, adsZoom: 50, bulletSpeed: 165, noReload: false,
    adminItem: true,
    ability: { name: 'Spec Ops Drill', cd: 11000, desc: '4 s · piercing rounds', type: 'buff', duration: 4000, dmgMult: 1.5 },
  },
  // ── 🪖 ADMIN SECONDARIES ─────────────────────────────────────────────────
  {
    id: 'desert_eagle', name: 'Desert Eagle', type: 'Admin · Hand Cannon', slot: 'secondary',
    mag: 7, reserve: 28, damage: 65, fireRate: 200, reloadTime: 1900,
    auto: false, pellets: 1, spread: 0.003, adsZoom: 48, bulletSpeed: 180, noReload: false,
    adminItem: true,
    ability: { name: 'Hand Cannon', cd: 10000, desc: 'Next shot · 195 dmg', type: 'powershot', pellets: 1, spreadMult: 0, weaponAbId: 'desert_eagle_ab' },
  },
  {
    id: 'm1911', name: 'M1911 Match', type: 'Admin · Match Pistol', slot: 'secondary',
    mag: 8, reserve: 32, damage: 50, fireRate: 120, reloadTime: 1300,
    auto: false, pellets: 1, spread: 0, adsZoom: 50, bulletSpeed: 175, noReload: false,
    adminItem: true,
    ability: { name: 'Mozambique', cd: 7000, desc: 'Triple-tap · 3 shots in 90ms', type: 'fanfire', count: 3, delay: 30 },
  },
  {
    id: 'ppk', name: 'Walther PPK', type: 'Admin · Spy Pistol', slot: 'secondary',
    mag: 8, reserve: 24, damage: 45, fireRate: 100, reloadTime: 1300,
    auto: false, pellets: 1, spread: 0, adsZoom: 50, bulletSpeed: 165, noReload: false,
    bulletColor: 0x666666, bulletSize: 0.035, adminItem: true,
    silentShots: true,
    ability: { name: 'Stealth Strike', cd: 9000, desc: 'Next shot · 135 dmg silent', type: 'powershot', pellets: 1, spreadMult: 0, weaponAbId: 'ppk_ab' },
  },
  {
    id: 'glock18', name: 'Glock-18 Auto', type: 'Admin · Full-Auto Pistol', slot: 'secondary',
    mag: 33, reserve: 99, damage: 30, fireRate: 70, reloadTime: 1500,
    auto: true, pellets: 1, spread: 0.008, adsZoom: 50, bulletSpeed: 160, noReload: false,
    adminItem: true,
    ability: { name: 'Mag Dump', cd: 8000, desc: 'Empty 12 rounds instantly', type: 'fanfire', count: 12, delay: 30 },
  },
  {
    id: 'five_seven', name: 'Five-seveN', type: 'Admin · Armor Piercer', slot: 'secondary',
    mag: 20, reserve: 60, damage: 40, fireRate: 130, reloadTime: 1400,
    auto: false, pellets: 1, spread: 0.003, adsZoom: 50, bulletSpeed: 200, noReload: false,
    bulletColor: 0xddddff, bulletSize: 0.035, adminItem: true,
    ignoreDefenses: true,
    ability: { name: 'AP Burst', cd: 12000, desc: '3 s · all shots pierce defenses', type: 'buff', duration: 3000, dmgMult: 1.3 },
  },
  {
    id: 'mg42', name: 'MG-42', type: 'MG', slot: 'primary',
    mag: 5000, reserve: 0, damage: 15, fireRate: 50, reloadTime: 99999,
    auto: true, pellets: 1, spread: 0.06, adsZoom: 55, bulletSpeed: 145, noReload: true,
    bulletColor: 0xffcc55, bulletSize: 0.055,
    ddayOnly: true,
    ability: null,
  },
];

const MELEE_ITEMS = [
  { id: 'bat',        name: 'Bat',        type: 'Melee',       damage: 38, range: 2.1, cooldown: 520,
    ability: { name: 'Heavy Strike', cd: 8000,  desc: 'Next hit deals 2× damage', type: 'melee_heavy' } },
  { id: 'sabre',      name: 'Sabre',      type: 'Melee',       damage: 45, range: 2.4, cooldown: 620,
    ability: { name: 'Lunge',        cd: 7000,  desc: 'Dash forward · hit all in path', type: 'melee_lunge', distance: 6 } },
  { id: 'frying_pan', name: 'Frying Pan', type: 'Melee',       damage: 32, range: 1.8, cooldown: 420,
    ability: { name: 'Pickle Throw', cd: 9000,  desc: 'Hurl 3 fried pickles · 22 dmg each', type: 'melee_pickle' } },
  { id: 'sledge',     name: 'Sledge',     type: 'Heavy Melee', damage: 70, range: 1.9, cooldown: 900,
    ability: { name: 'Ground Slam',  cd: 12000, desc: 'Leap up · slam · AOE 4m · 80 dmg', type: 'melee_slam', radius: 4, damage: 80 } },
  { id: 'spear',      name: 'Spear',      type: 'Reach Melee', damage: 50, range: 3.0, cooldown: 760,
    ability: { name: 'Throw Spear',  cd: 15000, desc: 'Hurl spear · 85 dmg · weapon gone until CD', type: 'melee_throw' } },
  { id: 'katana',     name: 'Katana',     type: 'Melee',       damage: 65, range: 2.8, cooldown: 480,
    ability: { name: 'Deflect',      cd: 14000, desc: '2s · reflect bullets back at enemies', type: 'melee_deflect', duration: 2000 } },
  { id: 'baguette',   name: 'Baguette',   type: 'Melee',       damage: 16, range: 2.0, cooldown: 350,
    ability: { name: 'Eat It',       cd: 20000, desc: 'Munch the baguette · restore 40 HP', type: 'melee_eat', heal: 40 } },
  { id: 'knife',      name: 'Knife',      type: 'Melee',       damage: 28, range: 1.6, cooldown: 260, speedMult: 2.0,
    ability: { name: 'Death Touch',  cd: 18000, desc: 'Next hit · instant kill · 9999 dmg', type: 'melee_instakill' } },
  { id: 'chainsaw',   name: 'Chainsaw',   type: 'Heavy Melee', damage: 45, range: 1.9, cooldown: 150,
    ability: { name: 'Rev Up',       cd: 12000, desc: '2s · 10× swing speed · 3× move speed', type: 'melee_revup', duration: 2000 } },
  { id: 'lightsabre', name: 'Lightsabre', type: 'Melee · Jedi',  damage: 72, range: 2.5, cooldown: 420, doubleJump: true,
    ability: { name: 'Parry',        cd: 10000, desc: '1.5s · absorb all incoming bullets · DOUBLE JUMP', type: 'melee_parry', duration: 1500 } },
  { id: 'riot_shield',name: 'Riot Shield',type: 'Shield',      damage: 18, range: 1.7, cooldown: 700, shield: true,
    ability: { name: 'Shield Charge',cd: 9000,  desc: 'Charge forward · ram enemies · 60 dmg', type: 'melee_charge', distance: 7, damage: 60 } },
  { id: 'screwdriver',name: 'Screwdriver',type: 'Melee',       damage: 20, range: 1.5, cooldown: 220,
    ability: { name: 'Spin Mode',    cd: 15000, desc: '3s · auto-damage nearby foes · 180 dmg/s', type: 'melee_spin', duration: 3000 } },
  // ── New melees ───────────────────────────────────────────────────────────
  { id: 'crowbar',    name: 'Crowbar',    type: 'Utility Melee', damage: 32, range: 1.8, cooldown: 320,
    ability: { name: 'Pry',          cd: 7000,  desc: 'Knock target back 4 m + 50 dmg', type: 'melee_charge', distance: 4, damage: 50 } },
  { id: 'fire_axe',   name: 'Fire Axe',   type: 'Heavy Melee',   damage: 85, range: 2.0, cooldown: 950,
    ability: { name: 'Hellfire Swing', cd: 13000, desc: 'AOE flame swing · 4 m · 90 dmg + burn', type: 'melee_slam', radius: 4, damage: 90 } },
  { id: 'nunchucks',  name: 'Nunchucks',  type: 'Melee',         damage: 22, range: 1.9, cooldown: 180, speedMult: 1.7,
    ability: { name: 'Combo Frenzy', cd: 10000, desc: '2 s · ×2 swing speed · ×1.5 dmg', type: 'melee_revup', duration: 2000 } },
  { id: 'umbrella',   name: 'Umbrella',   type: 'Shield',        damage: 18, range: 1.8, cooldown: 600, shield: true,
    ability: { name: 'Bumbershoot', cd: 9000,  desc: '2 s · block all incoming bullets', type: 'melee_parry', duration: 2000 } },
  { id: 'yoyo',       name: 'Yo-Yo',      type: 'Reach Melee',   damage: 30, range: 3.5, cooldown: 500,
    ability: { name: 'Loop the World', cd: 11000, desc: '3 m spin · auto-hit nearby foes · 150 dmg/s', type: 'melee_spin', duration: 2500 } },
  // ── 3rd-batch melees ─────────────────────────────────────────────────────
  { id: 'combat_axe', name: 'Combat Axe', type: 'Heavy Melee',   damage: 78, range: 2.2, cooldown: 820,
    ability: { name: 'Throw Axe',    cd: 14000, desc: 'Hurl axe · 120 dmg · weapon gone until CD', type: 'melee_throw' } },
  { id: 'shock_baton',name: 'Shock Baton',type: 'Melee',         damage: 32, range: 2.0, cooldown: 300,
    ability: { name: 'Static Shock', cd: 9000,  desc: 'Hit · slows enemy fire rate briefly', type: 'melee_charge', distance: 3, damage: 40 } },
  // ── 😈 P2W melees ────────────────────────────────────────────────────────
  { id: 'titan_hammer', name: 'Titan Hammer', type: 'Heavy AOE',  damage: 95, range: 2.3, cooldown: 700,
    aoeOnSwing: 3, // every swing hits in 3m AOE
    ability: { name: 'Earthquake',   cd: 14000, desc: 'Knock down all enemies in 6 m · 120 dmg', type: 'melee_slam', radius: 6, damage: 120 } },
  { id: 'vampire_blade',name: 'Vampire Blade', type: 'Lifesteal Melee', damage: 52, range: 2.2, cooldown: 480,
    healOnHit: 20, // heals 20 HP per landed swing
    ability: { name: 'Blood Frenzy', cd: 12000, desc: '4 s · double lifesteal (40/hit)', type: 'melee_revup', duration: 4000, lifestealMult: 2 } },
  // ── The Classic ──────────────────────────────────────────────────────────
  { id: 'fists',      name: 'Fists',      type: 'Brass Knuckles', damage: 24, range: 1.4, cooldown: 220, speedMult: 1.6,
    ability: { name: 'Haymaker',     cd: 8000,  desc: 'Wind-up · next punch · 90 dmg + knockback', type: 'melee_heavy' } },
  // ── 🪖 ADMIN MELEES (locked behind unlock codes) ─────────────────────────
  // ── 🆕 More melees — batch 4 ─────────────────────────────────────────────
  { id: 'brass_knuckles', name: 'Brass Knuckles', type: 'Punch',     damage: 28, range: 1.5, cooldown: 200, speedMult: 1.6,
    ability: { name: 'Haymaker', cd: 8000, desc: '2× damage on next hit', type: 'melee_heavy' } },
  { id: 'hatchet',        name: 'Hatchet',        type: 'Throwable Melee', damage: 50, range: 1.9, cooldown: 480,
    ability: { name: 'Throw Hatchet', cd: 11000, desc: 'Hurl · 90 dmg · weapon gone until CD', type: 'melee_throw' } },
  { id: 'machete',        name: 'Machete',        type: 'Bleed Melee', damage: 56, range: 2.4, cooldown: 520,
    bleedOnHit: { dps: 8, dur: 4000, radius: 0.8, color: 0xaa0000 },
    ability: { name: 'Slash Combo',cd: 10000, desc: '2.5 s · auto-slash · every hit bleeds', type: 'melee_revup', duration: 2500 } },
  { id: 'cane',           name: 'Walking Cane',   type: 'Reach Melee', damage: 30, range: 2.2, cooldown: 440,
    ability: { name: 'Yank',       cd: 8000,  desc: 'Pull target 4 m toward you',         type: 'melee_pull', distance: 4 } },
  { id: 'cricket_bat',    name: 'Launching Melee', type: 'Melee', damage: 42, range: 2.3, cooldown: 540,
    launchOnHit: 8, // every hit pops target up
    ability: { name: 'Homerun',    cd: 9000,  desc: '2.5× dmg · launch target HIGH',     type: 'melee_heavy', launchMult: 2 } },
  { id: 'pipe',           name: 'Lead Pipe',      type: 'Chain Melee', damage: 44, range: 2.0, cooldown: 500,
    chainOnHit: { radius: 2.5, mult: 0.5 }, // splash damages nearby
    ability: { name: 'Bonk',       cd: 8000,  desc: 'Next hit deals 2× dmg + chains',    type: 'melee_heavy' } },
  { id: 'wrench',         name: 'Wrench',         type: 'Utility Melee', damage: 36, range: 1.8, cooldown: 380,
    ability: { name: 'Spanner Toss', cd: 10000, desc: 'Hurl wrench · 90 dmg · weapon gone until CD', type: 'melee_throw' } },
  { id: 'shovel',         name: 'Shovel',         type: 'AOE Melee', damage: 55, range: 2.2, cooldown: 620,
    ability: { name: 'Ground Slam',cd: 11000, desc: 'Slam · 4 m AOE knockback',          type: 'melee_slam' } },
  { id: 'golf_club',      name: 'Golf Club',      type: 'Launching Melee', damage: 40, range: 2.4, cooldown: 500,
    launchOnHit: 6,
    ability: { name: 'Fore!',      cd: 9000,  desc: '2.5× dmg · launch target SKY-HIGH', type: 'melee_heavy', launchMult: 3 } },
  { id: 'tennis_racket',  name: 'Tennis Racket',  type: 'Reflect Melee', damage: 26, range: 2.2, cooldown: 360,
    ability: { name: 'Backhand',   cd: 8000,  desc: '2 s · deflect incoming bullets',    type: 'melee_deflect', duration: 2000 } },
  { id: 'fire_poker',     name: 'Fire Poker',     type: 'Burn Melee', damage: 38, range: 2.6, cooldown: 460,
    burnOnHit: { dps: 7, dur: 4000, radius: 1.2, color: 0xff6622 },
    ability: { name: 'Hot Brand',  cd: 9000,  desc: 'Next hit deals 2× dmg + ignites',   type: 'melee_heavy' } },
  { id: 'meat_cleaver',   name: 'Meat Cleaver',   type: 'Vampiric Melee', damage: 60, range: 1.7, cooldown: 540,
    lifestealOnHit: 10,
    ability: { name: 'Butcher',    cd: 10000, desc: '3 s · auto-chop · double lifesteal', type: 'melee_revup', duration: 3000, lifestealMult: 2 } },
  // ── 🌌 SCI-FI P2W MELEES ──────────────────────────────────────────────────
  { id: 'phase_blade',   name: 'Phase Blade',     type: 'Phasing Melee',  damage: 90, range: 2.6, cooldown: 380, speedMult: 1.4, doubleJump: true,
    ability: { name: 'Ghost Dash', cd: 9000,  desc: 'Dash 7 m through enemies · 110 dmg', type: 'melee_lunge', distance: 7, damage: 110 } },
  { id: 'gravity_hammer',name: 'Gravity Hammer',  type: 'Heavy AOE',      damage: 110, range: 2.3, cooldown: 700, doubleJump: true,
    aoeOnSwing: 3.5,
    ability: { name: 'Singularity Slam', cd: 14000, desc: 'Slam · 6 m AOE knockback', type: 'melee_slam' } },
  { id: 'volt_whip',     name: 'Volt Whip',       type: 'Long Electric',  damage: 50, range: 4.0, cooldown: 420,
    chainOnHit: { radius: 3.0, mult: 0.6 },
    ability: { name: 'Thunder Lash', cd: 11000, desc: '3 s spin · chain electric hits', type: 'melee_spin', duration: 3000 } },
  { id: 'karambit',   name: 'Karambit',     type: 'Admin · Combat Knife', damage: 80, range: 1.6, cooldown: 200, speedMult: 1.8,
    adminItem: true,
    ability: { name: 'Stealth Stab', cd: 9000,  desc: 'Next hit · instakill from behind', type: 'melee_instakill' } },
  { id: 'bayonet',    name: 'Trench Bayonet', type: 'Admin · Reach Knife', damage: 100, range: 3.0, cooldown: 320,
    adminItem: true,
    ability: { name: 'Charge!',      cd: 8000,  desc: 'Dash 7 m + 130 dmg ram', type: 'melee_charge', distance: 7, damage: 130 } },
  { id: 'tomahawk',   name: 'Tactical Tomahawk', type: 'Admin · Throwable Axe', damage: 120, range: 2.0, cooldown: 700,
    adminItem: true,
    ability: { name: 'Throw Tomahawk', cd: 11000, desc: 'Hurl · 180 dmg · weapon gone until CD', type: 'melee_throw' } },
  { id: 'ots04',      name: 'OTs-04 Bayonet', type: 'Admin · Spetsnaz Blade', damage: 90, range: 1.8, cooldown: 240, speedMult: 1.7,
    adminItem: true,
    ability: { name: 'Spetsnaz Combo', cd: 8000,  desc: '3 s · auto-stab combo', type: 'melee_revup', duration: 3000 } },
  { id: 'garrote',    name: 'Spec-Ops Garrote', type: 'Admin · Silent Kill', damage: 9999, range: 1.5, cooldown: 1200,
    adminItem: true,
    ability: { name: 'Lights Out',   cd: 16000, desc: '5 s · all hits instakill', type: 'melee_revup', duration: 5000 } },
];

const SUPPORT_ITEMS = [
  { id: 'frag', name: 'Frag Grenade', type: 'Explosive', uses: 2, damage: 80, cooldown: 900, bulletSpeed: 56, bulletColor: 0x4d7f36, bulletSize: 0.14 },
  { id: 'medkit', name: 'Medkit', type: 'Heal', uses: 1, heal: 45, cooldown: 1200 },
  { id: 'stim', name: 'Stim Shot', type: 'Quick Heal', uses: 2, heal: 22, cooldown: 650 },
  { id: 'smoke', name: 'Smoke Bomb', type: 'Utility', uses: 2, damage: 0, cooldown: 700, bulletSpeed: 48, bulletColor: 0xcccccc, bulletSize: 0.18 },
  { id: 'blink_pearl', name: 'Blink Pearl', type: 'Teleport', uses: 2, blink: 10, cooldown: 900 },
  { id: 'ammo_fountain', name: 'Ammo Fountain', type: 'Resupply', uses: 1, refill: 0.65, cooldown: 1000 },
  { id: 'confetti_cannon', name: 'Confetti Cannon', type: 'Chaos', uses: 3, damage: 8, burst: 14, spread: 0.85, cooldown: 520, bulletSpeed: 76, randomBulletColor: true, bulletSize: 0.055 },
  { id: 'moon_mine', name: 'Moon Mine', type: 'Floaty Bomb', uses: 2, damage: 65, cooldown: 800, bulletSpeed: 32, bulletColor: 0xbca7ff, bulletSize: 0.16 },
  { id: 'rubber_duck', name: 'Rubber Duck', type: 'Bouncer', uses: 4, damage: 18, cooldown: 360, bulletSpeed: 68, bulletColor: 0xffe55c, bulletSize: 0.12 },
  { id: 'black_hole_seed', name: 'Black Hole Seed', type: 'Void', uses: 1, damage: 105, burst: 6, spread: 0.35, cooldown: 1300, bulletSpeed: 36, bulletColor: 0x4b0082, bulletSize: 0.20 },
  { id: 'glitch_cube', name: 'Glitch Cube', type: 'Wild Card', uses: 2, damage: 42, burst: 5, spread: 0.55, cooldown: 780, bulletSpeed: 92, randomBulletColor: true, bulletSize: 0.10 },
  { id: 'vampire_syringe', name: 'Vampire Syringe', type: 'Risk Heal', uses: 2, heal: 35, selfDamage: 10, cooldown: 700 },
  // ── New supports ─────────────────────────────────────────────────────────
  { id: 'adrenaline', name: 'Adrenaline Pack', type: 'Buff', uses: 1, cooldown: 1500, speedBuff: 1.6, reloadBuff: 0.5, buffDur: 5000 },
  { id: 'tripwire', name: 'Tripwire', type: 'Trap', uses: 2, damage: 60, cooldown: 1100, bulletSpeed: 30, bulletColor: 0xff3344, bulletSize: 0.05, isTripwire: true },
  { id: 'hologram', name: 'Hologram Decoy', type: 'Decoy', uses: 1, cooldown: 2000, decoyDur: 8000 },
  { id: 'magnet_mine', name: 'Magnet Mine', type: 'Magnet', uses: 2, damage: 40, cooldown: 900, bulletSpeed: 36, bulletColor: 0xff8844, bulletSize: 0.12, magnetRadius: 5 },
  { id: 'bounce_pad', name: 'Bounce Pad', type: 'Mobility', uses: 2, cooldown: 900, bounceVel: 14 },
  // ── 3rd-batch supports ───────────────────────────────────────────────────
  { id: 'hunter_drone', name: 'Hunter Drone', type: 'Drone', uses: 1, damage: 100, cooldown: 1200, droneDur: 10000, droneRange: 25 },
  { id: 'emp_grenade', name: 'EMP Grenade', type: 'Disable', uses: 2, damage: 25, cooldown: 950, bulletSpeed: 50, bulletColor: 0x66ccff, bulletSize: 0.12, empRadius: 6, empDur: 4000 },
  { id: 'sticky_charge', name: 'Sticky Charge', type: 'Explosive', uses: 2, damage: 120, cooldown: 850, bulletSpeed: 40, bulletColor: 0xff5555, bulletSize: 0.10, stickyFuse: 1500 },
  // ── 😈 P2W supports ──────────────────────────────────────────────────────
  { id: 'orbital_strike', name: 'Orbital Strike', type: 'Doom', uses: 1, damage: 250, radius: 8, cooldown: 2000, delay: 2000 },
  { id: 'guardian_drone', name: 'Guardian Drone', type: 'Auto Turret', uses: 1, damage: 14, fireRate: 100, droneDur: 10000, cooldown: 1500 },
  { id: 'nano_shield', name: 'Nano Shield', type: 'Auto Heal', uses: 1, healPerSec: 20, shieldDur: 6000, cooldown: 1800 },
  // ── 😈 Lazy weapons batch ─────────────────────────────────────────────────
  { id: 'air_grenade', name: 'Air Grenade', type: 'Launch', uses: 2, damage: 15, cooldown: 950, bulletSpeed: 50, bulletColor: 0xaaccff, bulletSize: 0.11, launchVel: 14, launchRadius: 4 },
  { id: 'land_mine', name: 'Land Mine', type: 'Trap', uses: 2, damage: 298, cooldown: 1100, mineRadius: 1.8, launchVel: 16 },
  // ── 🪖 ADMIN UTILITIES (locked behind unlock codes) ──────────────────────
  // ── 🆕 More utilities — batch 4 ──────────────────────────────────────────
  { id: 'flashbang_basic', name: 'Flashbang',    type: 'Stun',       uses: 2, damage: 5,  cooldown: 900, bulletSpeed: 50, bulletColor: 0xffffff, bulletSize: 0.10, stunDur: 2500, stunRadius: 6 },
  { id: 'proximity_mine',  name: 'Proximity Mine', type: 'Trap',     uses: 2, damage: 70, cooldown: 1100, bulletSpeed: 30, bulletColor: 0xff5555, bulletSize: 0.06, isTripwire: true },
  { id: 'dynamite',        name: 'Dynamite Bundle', type: 'Explosive', uses: 2, damage: 120, cooldown: 1200, bulletSpeed: 48, bulletColor: 0xdd4422, bulletSize: 0.13 },
  { id: 'drone_strike',    name: 'Mini Drone Strike', type: 'Doom',  uses: 1, damage: 140, radius: 5, cooldown: 1800, delay: 1500 },
  { id: 'healing_pulse',   name: 'Healing Pulse', type: 'Heal',      uses: 1, heal: 60, cooldown: 1500 },
  { id: 'teleport_beacon', name: 'Teleport Beacon', type: 'Teleport', uses: 1, blink: 12, cooldown: 1200 },
  { id: 'cloak',           name: 'Cloak',         type: 'Buff',      uses: 1, cooldown: 1800, speedBuff: 1.3, buffDur: 4000 },
  { id: 'berserker_serum', name: 'Berserker Serum', type: 'Buff',    uses: 1, cooldown: 1800, speedBuff: 1.4, reloadBuff: 0.6, buffDur: 4000 },
  { id: 'taser_grenade',   name: 'Taser Grenade', type: 'Disable',   uses: 2, damage: 15, cooldown: 950, bulletSpeed: 50, bulletColor: 0x66ccff, bulletSize: 0.10, empRadius: 5, empDur: 3000 },
  { id: 'ink_bomb',        name: 'Ink Bomb',      type: 'Utility',   uses: 2, damage: 0, cooldown: 800, bulletSpeed: 48, bulletColor: 0x111111, bulletSize: 0.18 },
  { id: 'siren',           name: 'Distraction Siren', type: 'Decoy', uses: 1, cooldown: 2000, decoyDur: 6000 },
  { id: 'caltrops',        name: 'Caltrops',      type: 'Trap',      uses: 3, damage: 30, cooldown: 700, bulletSpeed: 28, bulletColor: 0x888888, bulletSize: 0.05, isTripwire: true },

  // ── 🌌 SCI-FI P2W UTILITIES ─────────────────────────────────────────────
  { id: 'nano_swarm',     name: 'Nano Swarm',     type: 'Heal Drone',   uses: 1, heal: 120, cooldown: 1800 },
  { id: 'warp_beacon',    name: 'Warp Beacon',    type: 'Teleport',     uses: 2, blink: 20, cooldown: 1500 },
  { id: 'stasis_mine',    name: 'Stasis Mine',    type: 'Time Trap',    uses: 2, damage: 20, cooldown: 1200, bulletSpeed: 30, bulletColor: 0x66ccff, bulletSize: 0.07, isTripwire: true, stunDur: 4000 },
  { id: 'specter_drone',  name: 'Specter Drone',  type: 'Stealth Drone', uses: 1, damage: 160, cooldown: 1800, droneDur: 14000, droneRange: 32 },
  { id: 'quantum_barrier',name: 'Quantum Barrier',type: 'Shield',       uses: 1, healPerSec: 12, shieldDur: 9000, cooldown: 2000 },


  { id: 'c4', name: 'C4 Charge', type: 'Admin · Explosive', uses: 2, damage: 200, cooldown: 1200, bulletSpeed: 40, bulletColor: 0x664433, bulletSize: 0.11, c4Detonate: true, adminItem: true },
  { id: 'claymore', name: 'Claymore Mine', type: 'Admin · Directional Mine', uses: 2, damage: 250, cooldown: 1100, claymoreRadius: 4, claymoreArc: 1.2, adminItem: true },
  { id: 'stun_grenade', name: 'M84 Stun Grenade', type: 'Admin · Flashbang', uses: 3, damage: 10, cooldown: 800, bulletSpeed: 56, bulletColor: 0xffffff, bulletSize: 0.10, stunDur: 4000, stunRadius: 8, adminItem: true },
  { id: 'thermite', name: 'Thermite Charge', type: 'Admin · Burn Zone', uses: 2, damage: 8, cooldown: 1000, bulletSpeed: 36, bulletColor: 0xff8822, bulletSize: 0.11, burnDps: 8, burnDur: 12000, burnRadius: 3.5, adminItem: true },
  { id: 'predator_uav', name: 'Predator UAV', type: 'Admin · Recon', uses: 1, cooldown: 2000, uavDur: 10000, adminItem: true },
  { id: 'care_package', name: 'Care Package', type: 'Admin · Random Drop', uses: 1, cooldown: 1500, adminItem: true },
  { id: 'tac_nuke', name: 'Tactical Nuke', type: 'Admin · End the Match', uses: 1, damage: 500, cooldown: 3000, nukeRadius: 25, nukeDelay: 5000, adminItem: true },
];

// ── State ──────────────────────────────────────────────────────────────────
let myId = null;
let players = {};
let remoteMeshes = {};
let localBullets = [];

let currentWeaponIdx = 0;
let currentWeapon = WEAPONS[0];
let ammo = currentWeapon.mag;
let reserve = currentWeapon.reserve;
let reloading = false, lastShot = 0, shooting = false;
let isADS = false, adsFOV = 75, targetFOV = 75;

let myKills = 0, isDead = false, gameStarted = false;
let spawnShieldUntil = 0; // timestamp: player is invincible until this time
let spectatorState = null; // { idx, lastSwitch } — set when dead and watching teammates

function grantSpawnShield(ms) {
  // Cap at 1.5s — long enough to orient, short enough that you can still be killed
  const cap = Math.min(ms, 1500);
  spawnShieldUntil = performance.now() + cap;
  const el = document.getElementById('spawn-shield');
  if (el) el.style.display = 'block';
  setTimeout(() => {
    if (performance.now() >= spawnShieldUntil - 50) {
      spawnShieldUntil = 0;
      if (el) el.style.display = 'none';
    }
  }, cap);
}
function expireSpawnShield() {
  if (spawnShieldUntil === 0) return;
  spawnShieldUntil = 0;
  const el = document.getElementById('spawn-shield');
  if (el) el.style.display = 'none';
}

function isShielded() {
  return performance.now() < spawnShieldUntil;
}

// ── Game mode / bot system ─────────────────────────────────────────────────
const GAME_MODE_CONFIGS = {
  // Elimination: no respawn, rounds, first to winsNeeded rounds wins
  '1v1':   { type: 'elim', allies: 0, enemies: 1,  winsNeeded: 4, roundTimeLimit: 60 },
  '2v2':   { type: 'elim', allies: 1, enemies: 2,  winsNeeded: 4, roundTimeLimit: 60 },
  '3v3':   { type: 'elim', allies: 2, enemies: 3,  winsNeeded: 4, roundTimeLimit: 60 },
  // Race: respawn, first to killGoal wins or most kills when timer ends
  '5v5':   { type: 'race', allies: 4, enemies: 5,  killGoal: 100, timeLimit: 120 },
  '10v10': { type: 'race', allies: 9, enemies: 10, killGoal: 100, timeLimit: 180 },
  // FFA: respawn, most kills when timer ends
  'ffa5':  { type: 'ffa',  allies: 0, enemies: 5,  timeLimit: 300 },
  'ffa15': { type: 'ffa',  allies: 0, enemies: 15, timeLimit: 300 },
  // Special modes
  'frontlines': { type: 'frontlines', allies: 4, enemies: 5 },
  'laststand':  { type: 'laststand',  allies: 0, enemies: 0 },
  'dday':       { type: 'dday',       allies: 3, enemies: 0 },
  'range':      { type: 'range',      allies: 0, enemies: 0 },
  // King of the Hill / Battle Royale: massive map, 10 players FFA, 3 lives each, last alive wins
  'koth':       { type: 'br',         allies: 0, enemies: 9, livesPerPlayer: 3, mapSize: 250 },
  // 🎮 ARCADE MODES — fast & gimmicky FFA variants
  'gungame':    { type: 'arcade', subtype: 'gungame',  allies: 0, enemies: 7, timeLimit: 300, arcade: true },
  'oitc':       { type: 'arcade', subtype: 'oitc',     allies: 0, enemies: 5, timeLimit: 240, arcade: true }, // One in the Chamber
  'juggernaut': { type: 'arcade', subtype: 'jugg',     allies: 0, enemies: 5, timeLimit: 240, arcade: true },
  'infection':  { type: 'arcade', subtype: 'infect',   allies: 0, enemies: 5, timeLimit: 180, arcade: true },
  'sniper_only':{ type: 'arcade', subtype: 'sniper',   allies: 0, enemies: 5, timeLimit: 240, arcade: true },
  'speedrun':   { type: 'arcade', subtype: 'speedrun', allies: 0, enemies: 20,timeLimit: 0,   arcade: true }, // solo
};
let selectedModeConfig = null;
const gameBots = [];       // {id, team, weaponId, x, z, rotY, hp, dead, state, wanderAngle, wanderTimer, lastShot, lastBotMove}
let botMoveTimer = 0;
let rangeTargets = []; // { id, baseX, z, moving, dir, speed, respawnAt }
let rangeStats   = { shots: 0, hits: 0 };
const BOT_MOVE_INTERVAL = 0.05; // send position updates every 50ms

// ── 🛒 Shop: weapon cost table (mirrors server.js WEAPON_COSTS) ────────────
// Admin items are NOT priced — they're claimed via promo codes only.
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
  burst_cannon: 480, incendiary_shotgun: 400, amr: 2000, air_rifle: 320,
  twin_ar: 440, swarm_rifle: 460, smart_smg: 380, switchblade_gun: 420,
  // Primaries — Joke / chaos
  potato_cannon: 220, sticker_blaster: 280, foam_cannon: 280,
  // Premium / P2W — ridiculously expensive on purpose
  royal_minigun: 3500,
  // 🌌 Sci-fi P2W primaries
  event_horizon: 24000, storm_core: 20000, abs_zero: 22000, solar_lance: 26000,
  phase_driver: 30000, quantum_repeater: 28000, magnetar: 25000,
  nebula_mortar: 35000, prism_engine: 27000, void_harvester: 40000,
  // Secondaries
  revolver: 150, flare: 80, pistol: 60, shorty: 180, cycler: 140,
  hand_cannon: 260, throwing_knives: 120, taser: 200,
  machine_pistol: 220, sawed_off: 260, machine_revolver: 240, pocket_rocket: 320,
  dart_gun: 160, laser_pointer: 120, coin_gun: 180, emp_pistol: 240,
  auto_revolver: 220, frost_blaster: 240,
  // Batch-4 secondaries
  snub_revolver: 140, duelist_pistol: 280, mauser: 200, mini_uzi: 240,
  nail_gun: 180, boomstick: 220, signal_pistol: 200, throwing_axes: 240,
  shuriken: 160, boomerang: 180, slingshot: 100, blowgun: 200,
  // 🌌 Sci-fi P2W secondaries
  pulse_needle: 12000, phase_pistol: 16000, ion_revolver: 14000,
  // Melees
  bat: 80, sabre: 140, frying_pan: 60, sledge: 360, spear: 200,
  katana: 360, baguette: 50, knife: 280, chainsaw: 1400, lightsabre: 1800,
  riot_shield: 220, screwdriver: 60, crowbar: 110, fire_axe: 420,
  nunchucks: 160, umbrella: 140, yoyo: 180, combat_axe: 380,
  shock_baton: 220, titan_hammer: 2400, vampire_blade: 2000, fists: 0,
  // Batch-4 melees
  brass_knuckles: 200, hatchet: 220, machete: 260, cane: 140, cricket_bat: 200,
  pipe: 160, wrench: 180, shovel: 280, golf_club: 200, tennis_racket: 100,
  fire_poker: 200, meat_cleaver: 260,
  // 🌌 Sci-fi P2W melees
  phase_blade: 18000, gravity_hammer: 22000, volt_whip: 17000,
  // Support / Utility
  frag: 120, medkit: 80, stim: 60, smoke: 70, blink_pearl: 280,
  ammo_fountain: 180, confetti_cannon: 100, moon_mine: 220, rubber_duck: 90,
  black_hole_seed: 2200, glitch_cube: 240, vampire_syringe: 200,
  adrenaline: 220, tripwire: 200, hologram: 240, magnet_mine: 220,
  bounce_pad: 140, hunter_drone: 460, emp_grenade: 240, sticky_charge: 320,
  orbital_strike: 2500, guardian_drone: 380, nano_shield: 320,
  air_grenade: 160, land_mine: 380,
  // Batch-4 utilities
  flashbang_basic: 200, proximity_mine: 220, dynamite: 280, drone_strike: 340,
  healing_pulse: 200, teleport_beacon: 260, cloak: 280, berserker_serum: 240,
  taser_grenade: 220, ink_bomb: 140, siren: 200, caltrops: 180,
  // 🌌 Sci-fi P2W utilities
  nano_swarm: 20000, warp_beacon: 25000, stasis_mine: 18000,
  specter_drone: 30000, quantum_barrier: 21000,
};
const FREE_WEAPONS = new Set([
  'ak20','sg8','pistol','flare','fists','frying_pan','frag','medkit',
]);
const TRIAL_DIVISOR = 20;
const trialingThisMatch = new Set(); // ids the player paid a trial for this match

// ── 💼 Loadout BUNDLES — ~60% off the sum of individual prices ─────────
// Mirrors server.js BUNDLES (server is authoritative on price/contents).
const BUNDLES = [
  { id: 'pitiful',     name: 'Pitiful Pack', icon: '🪖', price: 420,
    desc: 'Classic loadout: AR · shotgun · pistol · melee · smoke',
    items: ['ak30','sg100','revolver','bat','smoke'] },
  { id: 'retro',       name: 'Retro Pack',   icon: '🕹️', price: 145,
    desc: 'Quirky old-school weapons · 70% off',
    items: ['paintball','laser_pointer','baguette','rubber_duck','confetti_cannon'] },
  { id: 'starter_pro', name: 'Starter Pro',  icon: '🎯', price: 330,
    desc: 'Upgrade past the freebies',
    items: ['ak30','revolver','bat','stim'] },
  { id: 'heavy_duty',  name: 'Heavy Duty',   icon: '💥', price: 700,
    desc: 'Minigun · GL · machine revolver',
    items: ['minigun','grenade_launcher','machine_revolver','crowbar','sticky_charge'] },
  { id: 'sniper_pack', name: 'Sniper Pack',  icon: '🎯', price: 580,
    desc: 'Long-range duelist kit',
    items: ['srx','revolver','knife','smoke'] },
  { id: 'run_n_gun',   name: 'Run & Gun',    icon: '⚡', price: 430,
    desc: 'Fast SMGs + speed boost',
    items: ['p90','machine_pistol','knife','adrenaline'] },
  { id: 'melee_master',name: 'Melee Master', icon: '⚔️', price: 480,
    desc: 'Get up close and stay there',
    items: ['auto_shotgun','revolver','fire_axe','smoke'] },
  { id: 'shotgun_pack',name: 'Shotgun Pack', icon: '🔫', price: 430,
    desc: 'Close-range chaos',
    items: ['sg100','sawed_off','crowbar','frag'] },
  { id: 'scifi',       name: 'Sci-Fi Arsenal', icon: '🔬', price: 500,
    desc: 'Energy weapons & EMP',
    items: ['plasma_carbine','arc_rifle','dart_gun','emp_grenade'] },
  { id: 'demolition',  name: 'Demolition',   icon: '💣', price: 600,
    desc: 'Blow stuff up',
    items: ['grenade_launcher','pocket_rocket','sledge','sticky_charge'] },
  { id: 'archery',     name: "Archer's Kit", icon: '🏹', price: 580,
    desc: 'Bows, knives, traps',
    items: ['crossbow','boombow','throwing_knives','tripwire'] },
  { id: 'marksman',    name: 'Marksman',     icon: '🎯', price: 430,
    desc: 'Patient precision shooter',
    items: ['lever','hand_cannon','knife','ammo_fountain'] },
  { id: 'pyro',        name: 'Pyromaniac',   icon: '🔥', price: 620,
    desc: 'Burn it all down',
    items: ['flamethrower','incendiary_shotgun','fire_axe','sticky_charge'] },
  { id: 'chaos',       name: 'Chaos Mode',   icon: '🤡', price: 150,
    desc: 'Goofy weapons only',
    items: ['paintball','confetti_cannon','baguette','rubber_duck'] },
  { id: 'stealth',     name: 'Stealth Ops',  icon: '🥷', price: 360,
    desc: 'Silent, deadly, hidden',
    items: ['air_rifle','throwing_knives','knife','smoke'] },
  { id: 'storm',       name: 'Storm Pack',   icon: '⚡', price: 420,
    desc: 'Electricity and shocks',
    items: ['arc_rifle','taser','shock_baton','emp_grenade'] },
  { id: 'defensive',   name: 'Defensive',    icon: '🛡️', price: 450,
    desc: 'Tank-style survival',
    items: ['sg100','taser','riot_shield','nano_shield'] },
  { id: 'royalty',     name: 'Royalty',      icon: '💎', price: 4500,
    desc: 'High-end P2W power fantasy · ~45% off',
    items: ['royal_minigun','vampire_blade','hand_cannon','orbital_strike'] },
  { id: 'kitchen',     name: 'Kitchen Catastrophe', icon: '🍳', price: 130,
    desc: 'Household weapons only',
    items: ['paintball','baguette','frying_pan','rubber_duck'] },
  { id: 'knight',      name: "Knight's Honor", icon: '🤺', price: 410,
    desc: 'Swords and shotguns',
    items: ['sg8','sabre','katana','smoke'] },
  { id: 'frostbite',   name: 'Frostbite',    icon: '🧊', price: 380,
    desc: 'Freeze, blast, finish',
    items: ['freeze_gun','frost_blaster','knife','smoke'] },
  { id: 'knockback',   name: 'Knockback',    icon: '🌪️', price: 500,
    desc: 'Send them flying',
    items: ['shockwave_launcher','sawed_off','sledge','air_grenade'] },
  { id: 'smart_tech',  name: 'Smart Tech',   icon: '👁️', price: 610,
    desc: 'Tracking, drones, mines',
    items: ['swarm_rifle','smart_smg','hunter_drone','magnet_mine'] },
  { id: 'mortar',      name: 'Mortar Squad', icon: '🪂', price: 550,
    desc: 'Indirect fire specialists',
    items: ['mortar_rifle','grenade_launcher','hand_cannon','frag'] },
  { id: 'cosmic_p2w',  name: 'Cosmic P2W',   icon: '🌌', price: 80000,
    desc: 'Every sci-fi P2W item · 30% off',
    items: ['event_horizon','storm_core','abs_zero','solar_lance','phase_driver',
            'quantum_repeater','magnetar','nebula_mortar','prism_engine','void_harvester',
            'pulse_needle','phase_pistol','ion_revolver',
            'phase_blade','gravity_hammer','volt_whip',
            'nano_swarm','warp_beacon','stasis_mine','specter_drone','quantum_barrier'] },
];

function shopCost(id)      { return WEAPON_COSTS[id]; }
function shopTrialCost(id) { const c = WEAPON_COSTS[id]; return c == null ? null : Math.max(1, Math.ceil(c / TRIAL_DIVISOR)); }
function isOwned(id) {
  if (!id) return true;
  if (FREE_WEAPONS.has(id)) return true;
  if (trialingThisMatch.has(id)) return true;
  if (!currentUser) return false;
  if (currentUser.isAdmin) return true;
  if (adminPassActive()) return true; // 10-min trial-everything pass
  if (currentUser.purchased && currentUser.purchased.includes(id)) return true;
  if (currentUser.unlocks && currentUser.unlocks.includes(id)) return true; // admin items
  return false;
}
function adminPassActive() {
  if (!currentUser) return false;
  if (currentUser.isAdmin) return true;
  return (currentUser.adminPassExpiresAt || 0) > Date.now();
}
function adminPassMsLeft() {
  if (!currentUser) return 0;
  return Math.max(0, (currentUser.adminPassExpiresAt || 0) - Date.now());
}

const PRIMARY_WEAPON_IDS = WEAPONS.filter(w => w.slot === 'primary' && !w.ddayOnly).map(w => w.id);
function randomPrimaryId() { return PRIMARY_WEAPON_IDS[Math.floor(Math.random() * PRIMARY_WEAPON_IDS.length)]; }

let match = null; // active match state (see initMatch)
let frontlineState = null;
let lastStandState = null;
let ddayState = null;
let ddayGrenades = []; // falling grenade meshes for the opening barrage

const CLIENT_SPAWN_POINTS = [
  {x:0,z:0},{x:10,z:10},{x:-10,z:-10},{x:10,z:-10},{x:-10,z:10},
  {x:20,z:0},{x:-20,z:0},{x:0,z:20},{x:0,z:-20},
];
function getRandomSpawn() {
  return CLIENT_SPAWN_POINTS[Math.floor(Math.random() * CLIENT_SPAWN_POINTS.length)];
}
function formatMatchTime(secs) {
  const s = Math.max(0, Math.ceil(secs));
  return `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;
}

// ── Loadout state ──────────────────────────────────────────────────────────
let selectedDifficulty = 'medium'; // 'easy' | 'medium' | 'hard' | 'expert' — gates bot AI features
let selectedMap = 'auto'; // 'auto' = random | specific map name from MAP_GROUPS
let selectedPrimaryIdx   = null;
let selectedSecondaryIdx = null;
let selectedMeleeIdx     = null;
let selectedSupportIdx   = null;
let activeSlot = 'primary'; // 'primary' | 'secondary' | 'melee' | 'support'
let loadoutMode = 'death';  // 'death' | 'swap' (swap = mid-game trashcan)
let lastMelee = 0, lastSupport = 0;

// ── Melee swing animation state ────────────────────────────────────────────
let meleeSwingT    = 1;       // 1 = idle/done, 0 = just started
let meleeAbilityBuff = null; // { type, endTime?, usesLeft?, lastSpinHits? }
let slamState = null;        // { vel } — for sledge ground slam animation
let spearThrown = false;     // true while spear weapon is "in the air"
let meleeSwingDur  = 400;     // ms for full swing arc
let meleeSwingType = 'slash'; // 'slash' | 'slam' | 'thrust' | 'spin' | 'stab' | 'bash' | 'chop'
// Swing style per MELEE_ITEMS index — must align with MELEE_ITEMS order!
const MELEE_SWING_TYPES = [
  'slash',   //  0 bat          → baseball swing
  'slash',   //  1 sabre        → fencer slash
  'slam',    //  2 frying_pan   → overhead bonk
  'slam',    //  3 sledge       → heavy overhead slam
  'thrust',  //  4 spear        → long forward jab
  'slash',   //  5 katana       → wide samurai slash
  'slash',   //  6 baguette     → silly slash
  'stab',    //  7 knife        → fast forward stab
  'spin',    //  8 chainsaw     → spinning blade
  'slash',   //  9 lightsabre   → jedi slash
  'bash',    // 10 riot_shield  → shield bash forward
  'spin',   // 11 screwdriver  → spin attack
  'chop',    // 12 crowbar      → fast hook chop
  'chop',    // 13 fire_axe     → heavy chop
  'spin',    // 14 nunchucks    → spinning combo
  'bash',    // 15 umbrella     → shield-like bash
  'spin',    // 16 yoyo         → spin throw
  'chop',    // 17 combat_axe   → axe chop
  'stab',    // 18 shock_baton  → fast electric jab
  'slam',    // 19 titan_hammer → massive overhead slam
  'slash',   // 20 vampire_blade→ vampiric slash
  'punch',   // 21 fists        → alternating fast punches
  // ── New melees (batch 4) ─────────────────────────────────────
  'punch',   // 22 brass_knuckles
  'chop',    // 23 hatchet
  'slash',   // 24 machete
  'bash',    // 25 cane
  'slash',   // 26 cricket_bat
  'bash',    // 27 pipe
  'bash',    // 28 wrench
  'slam',    // 29 shovel
  'slash',   // 30 golf_club
  'bash',    // 31 tennis_racket
  'thrust',  // 32 fire_poker
  'chop',    // 33 meat_cleaver
  // ── Sci-fi P2W melees ─────────────────────────────────────────────
  'slash',   // 34 phase_blade
  'slam',    // 35 gravity_hammer
  'spin',    // 36 volt_whip
];

// ── Weapon ability system ──────────────────────────────────────────────────
const abilityCDs = {};           // weaponId → timestamp of last use
let abilityBuff = null;          // active stat-override buff
/* abilityBuff shape:
   { weaponId, endTime, spreadMult?, dmgMult?, rateMult?,
     shotsLeft?,           // for powershot/multishot (consumed per shot)
     weaponAbId?,          // override weapon ID sent to server for damage
     explodeOnHit?         // crossbow AOE
   }
*/
let pendingFanFire = null;       // { shots remaining, delay, weaponRef }
let revealActive   = false;
let revealEndTime  = 0;
const burnZones    = [];          // { x, z, radius, dps, until, mesh, lastTick }
const traps        = [];          // { type:'tripwire'|'magnet'|'bounce', x, z, radius, mesh, ... }
const decoys       = [];          // { mesh, until }
let adrenalineUntil = 0;          // timestamp player adrenaline buff expires
let nanoShieldUntil = 0;          // timestamp Nano Shield expires (heal-over-time)
const guardianDrones = [];        // {mesh, until, lastShot}
const orbitalMarkers = [];        // {mesh, x, z, fireAt, damage, radius}
let playerFrostSlow = 100;        // 100 = full speed, 0 = frozen + dead. Frost Blaster reduces this on hit.
let playerYVel = 0;               // Player vertical velocity (for air grenades launching the player)
let switchbladeCharged = true;    // Switchblade Gun: true → next shot is 100 dmg
let switchbladeMode = 'pistol';   // When !charged: 'pistol' (ranged 50 dmg) or 'knife' (melee 50 dmg) — toggle with E
let lastPlayerPos = new THREE.Vector3();    // For computing player velocity (bots use this for bullet leading)
let playerVelocity = new THREE.Vector3();   // Smoothed
// EXPERT: track recent player positions to predict trajectory (last 8 samples)
const playerPosHistory = [];                // [{x, z, t}, …]
// EXPERT: telepathic team comms — last known player sighting (shared across all expert bots on a team)
const teamSightings = { ally: null, enemy: null }; // each: { x, z, t }
// EXPERT: precomputed weapon DPS lookup
const WEAPON_DPS_CACHE = (() => {
  const out = {};
  for (const w of WEAPONS) {
    out[w.id] = (w.damage || 0) * (w.pellets || 1) * (1000 / Math.max(20, w.fireRate || 200));
  }
  return out;
})();
// EXPERT: weapon "class" — used for engagement-distance decisions
function classifyWeapon(weaponId) {
  const w = WEAPONS.find(x => x.id === weaponId);
  if (!w) return 'unknown';
  if (w.type === 'Sniper' || w.type === 'Marksman' || w.type === 'Charge' || w.type === 'Explosive Bow') return 'long';
  if (w.type?.includes('Shotgun') || w.type === 'Area' || w.type === 'Beam') return 'close';
  if (w.type === 'Heavy' || w.type === 'LMG' || w.type === 'MG') return 'medium';
  return 'medium';
}

// Weapon → preferred personality. Bots usually but not always pick the matching one.
function preferredPersonalityFor(weaponId) {
  const w = WEAPONS.find(x => x.id === weaponId);
  if (!w) return 'balanced';
  // Long-range tools want distance
  if (w.type === 'Sniper' || w.type === 'Marksman' || w.type === 'Charge' || w.type === 'Explosive Bow') return 'sniper';
  // Close-range demolishers want to push
  if (w.type?.includes('Shotgun') || w.type === 'Beam' || w.id === 'flamethrower' || w.id === 'arc_torrent') return 'aggressor';
  // Heavy suppression weapons want to hold from cover
  if (w.type === 'Heavy' || w.type === 'LMG' || w.type === 'MG') return 'camper';
  // Slow heavy projectiles want angles, not pushes
  if (w.type === 'Explosive' || w.type === 'Indirect Explosive' || w.type === 'Heavy Projectile' || w.id === 'gravity_launcher') return 'camper';
  // Standard ARs and middle-range stuff
  return 'tactician';
}
// Pick the spawn personality for a bot, with weighted variance.
// At higher difficulties, bots are more likely to pick the "correct" personality but never 100%.
function rollPersonality(weaponId, difficulty) {
  if (difficulty === 'easy' || difficulty === 'medium') return 'balanced';
  const preferred = preferredPersonalityFor(weaponId);
  const all = ['aggressor', 'camper', 'sniper', 'tactician'];
  // Match probability: hard 70%, expert 80%. Otherwise pick a random alternative.
  const matchChance = difficulty === 'expert' ? 0.80 : 0.70;
  if (Math.random() < matchChance) return preferred;
  // Off-roll: pick something else, but bias slightly toward the "neutral" tactician
  const alternatives = all.filter(p => p !== preferred);
  // 35% chance the off-roll is specifically tactician (less extreme than aggressor/sniper)
  if (Math.random() < 0.35) return 'tactician';
  return alternatives[Math.floor(Math.random() * alternatives.length)];
}

// Weapons that demolish anyone within ~10 m. Hard/expert bots will refuse to close on these.
const SCARY_CLOSE_WEAPONS = new Set([
  // Shotguns
  'sg8', 'sg100', 'auto_shotgun', 'spas12', 'shorty', 'sawed_off',
  // Continuous-fire close
  'flamethrower', 'arc_torrent',
  // High-DPS melees
  'chainsaw', 'lightsabre', 'katana', 'fire_axe', 'sledge',
  // The instakill threat
  'knife', // knife has Death Touch ability
]);

const BOT_DIFFICULTY_TUNING = {
  easy:   { aimMin: 0.75, aimRand: 0.25, reactMin: 320, reactRand: 260, fireMin: 1200, fireRand: 650, reloadMin: 2200, reloadRand: 800, hitRunChance: 0.00, initialShotDelay: 1800 },
  medium: { aimMin: 0.70, aimRand: 0.35, reactMin: 260, reactRand: 280, fireMin: 1050, fireRand: 650, reloadMin: 1900, reloadRand: 700, hitRunChance: 0.00, initialShotDelay: 1400 },
  hard:   { aimMin: 1.05, aimRand: 0.45, reactMin: 120, reactRand: 180, fireMin: 760,  fireRand: 380, reloadMin: 1300, reloadRand: 450, hitRunChance: 0.20, initialShotDelay: 900 },
  expert: { aimMin: 1.85, aimRand: 0.45, reactMin: 20,  reactRand: 70,  fireMin: 420,  fireRand: 180, reloadMin: 700,  reloadRand: 250, hitRunChance: 0.18, initialShotDelay: 350 },
};

function botTuning(diff) {
  return BOT_DIFFICULTY_TUNING[diff] || BOT_DIFFICULTY_TUNING.medium;
}

// Returns true if the player currently has a scary close-range weapon equipped/active OR a chainsaw-tier melee selected.
function playerHasScaryCloseWeapon() {
  if (typeof currentWeapon !== 'undefined' && currentWeapon && SCARY_CLOSE_WEAPONS.has(currentWeapon.id)) return true;
  // Also check what's in the player's melee slot, even if not currently active (they can swap fast)
  if (typeof selectedMeleeIdx === 'number') {
    const m = MELEE_ITEMS[selectedMeleeIdx];
    if (m && SCARY_CLOSE_WEAPONS.has(m.id)) return true;
  }
  return false;
}

// ── Player communication wheels (Z = primary, X = secondary) ──────────────
let commsMenuOpen = false;
let commsMenuKind = 'z'; // 'z' = primary, 'x' = secondary
const COMMS_LINES_PRIMARY = [
  { txt: 'Run!',           color: '#ff8866', emoji: '🏃' },
  { txt: 'Charge!',        color: '#ff4444', emoji: '⚔️' },
  { txt: 'Cover me!',      color: '#ffcc44', emoji: '🛡️' },
  { txt: 'Enemy spotted!', color: '#ff6666', emoji: '👁️' },
  { txt: 'Push together!', color: '#44ff66', emoji: '👊' },
  { txt: 'Fall back!',     color: '#ff8866', emoji: '⬅️' },
  { txt: 'Sorry!',         color: '#aaaaff', emoji: '🙏' },
  { txt: 'Nice shot!',     color: '#44ddff', emoji: '👍' },
  { txt: 'Scatter!',       color: '#ffaa66', emoji: '💨' },
];
const COMMS_LINES_SECONDARY = [
  { txt: "We need to break the deadlock!", color: '#ff44aa', emoji: '🤔' },
  { txt: 'Hold position!',                 color: '#ffaa44', emoji: '🛑' },
  { txt: 'Regroup on me!',                 color: '#44aaff', emoji: '🎯' },
  { txt: 'Sniper!',                        color: '#ff2222', emoji: '🔭' },
  { txt: 'Watch your flank!',              color: '#ffcc22', emoji: '⚠️' },
  { txt: 'Low HP!',                        color: '#ff4444', emoji: '❤️' },
  { txt: 'Thanks!',                        color: '#88ff88', emoji: '🙌' },
  { txt: 'GG!',                            color: '#cc88ff', emoji: '🏆' },
  { txt: 'Distract them!',                 color: '#ff66cc', emoji: '🎭' },
];
function getActiveCommsLines() {
  return commsMenuKind === 'x' ? COMMS_LINES_SECONDARY : COMMS_LINES_PRIMARY;
}
function openCommsMenu(kind = 'z') {
  commsMenuKind = kind;
  let menu = document.getElementById('comms-menu');
  if (!menu) {
    menu = document.createElement('div');
    menu.id = 'comms-menu';
    menu.style.cssText = 'position:fixed;left:50%;bottom:120px;transform:translateX(-50%);'
      + 'z-index:9600;background:rgba(15,15,20,0.92);border:2px solid #888;border-radius:12px;'
      + 'padding:12px 14px;font-family:Arial,sans-serif;color:#fff;display:flex;flex-direction:column;gap:6px;'
      + 'box-shadow:0 4px 16px rgba(0,0,0,0.6);min-width:300px;';
    document.body.appendChild(menu);
  }
  const lines = getActiveCommsLines();
  const headerLabel = kind === 'x' ? 'SECONDARY CHAT [X]' : 'PRIMARY CHAT [Z]';
  const headerColor = kind === 'x' ? '#ffaa66' : '#66ccff';
  const altKey = kind === 'x' ? 'Z' : 'X';
  // Build the option list
  menu.innerHTML = `<div style="font-size:11px;letter-spacing:3px;color:${headerColor};margin-bottom:6px;text-align:center;">${headerLabel} — press 1–9</div>`
    + lines.map((l, i) =>
        `<div data-idx="${i}" class="comms-opt" style="display:flex;align-items:center;gap:10px;padding:6px 10px;background:rgba(40,40,50,0.7);border-radius:6px;cursor:pointer;border-left:3px solid ${l.color};">
          <span style="color:${l.color};font-weight:bold;font-size:13px;min-width:14px;">${i+1}</span>
          <span style="font-size:14px;">${l.emoji}</span>
          <span style="font-size:13px;flex:1;">${l.txt}</span>
        </div>`
      ).join('')
    + `<div style="font-size:10px;color:#666;margin-top:4px;text-align:center;">[${altKey}] for other wheel · [Esc] or [${kind.toUpperCase()}] to close</div>`;
  menu.style.display = 'flex';
  // Click handlers
  Array.from(menu.querySelectorAll('.comms-opt')).forEach(el => {
    el.addEventListener('click', () => pickCommsLine(parseInt(el.dataset.idx)));
  });
  commsMenuOpen = true;
}
function closeCommsMenu() {
  const menu = document.getElementById('comms-menu');
  if (menu) menu.style.display = 'none';
  commsMenuOpen = false;
}
function pickCommsLine(idx) {
  const lines = getActiveCommsLines();
  const line = lines[idx];
  if (!line) return;
  closeCommsMenu();
  // Show in chat feed
  pushChatLine(`You: ${line.emoji} ${line.txt}`, line.color);
  // Show speech bubble over the player's own mesh (other players will see this; locally we still get the feed)
  socket.emit('chatLine', { text: line.txt, color: line.color, emoji: line.emoji });
  // Have nearby ally bots react with a follow-up thought
  reactAllyBotsToComms(line.txt);
}
// Map player command → (a) command override type + (b) gating function (returns "got it" or "nope" reason)
const COMMAND_PHYSICAL = {
  'Run!': {
    type: 'run',
    duration: 6000,
    gate: (bot) => true, // always comply — running is free
    okLines:   ['Got it!', 'Falling back!', 'Retreating!'],
    nopeLines: [], // never refuses
  },
  'Charge!': {
    type: 'charge',
    duration: 6000,
    gate: (bot) => bot.hp >= 120,
    okLines:   ['Got it!', "Let's go!", 'On it!', 'Pushing!'],
    nopeLines: ['Nope, too hurt!', 'No way, I\'m low!', 'Negative!'],
  },
  'Cover me!': {
    type: 'cover_player',
    duration: 7000,
    gate: (bot) => bot.hp >= 90,
    okLines:   ['Got it!', "I got you!", 'Covering!', 'On it!'],
    nopeLines: ['Nope, can\'t!', 'I\'m dying!'],
  },
  'Enemy spotted!': {
    type: 'spotted',
    duration: 4000,
    gate: (bot) => true, // intel is free
    okLines:   ['Got it!', 'Engaging!', 'On the way!', 'I see them!'],
    nopeLines: [],
  },
  'Push together!': {
    type: 'group_push',
    duration: 6000,
    gate: (bot) => bot.hp >= 110,
    okLines:   ['Got it!', "Let's go!", 'Pushing!', 'Together!'],
    nopeLines: ['Nope, low HP!', 'Can\'t push!'],
  },
  'We need to break the deadlock!': {
    type: 'flank',
    duration: 8000,
    gate: (bot) => bot.hp >= 80,
    okLines:   ['Got it!', "I'll flank!", 'Going wide!', 'On it!'],
    nopeLines: ['Nope, hurt!', 'Can\'t flank!'],
  },
  'Fall back!': {
    type: 'fallback',
    duration: 8000,
    gate: (bot) => true,
    okLines:   ['Got it!', 'Falling back!', 'Retreating!'],
    nopeLines: [],
  },
  'Nice shot!': {
    type: null, // no physical action
    duration: 0,
    gate: () => true,
    okLines:   ['Thanks!', '👍', 'Appreciate it!'],
    nopeLines: [],
  },
  // ── Secondary wheel commands ──────────────────────────────────────────────
  'Sorry!': {
    type: null,
    duration: 0,
    gate: () => true,
    okLines:   ['No worries!', "It's fine!", 'All good!'],
    nopeLines: [],
  },
  'Hold position!': {
    type: 'hold',
    duration: 8000,
    gate: (bot) => bot.hp >= 70,
    okLines:   ['Holding!', 'Got it!', 'Locked in!'],
    nopeLines: ['Can\'t hold, hurt!', 'Need cover!'],
  },
  'Regroup on me!': {
    type: 'regroup',
    duration: 6000,
    gate: () => true,
    okLines:   ['On my way!', 'Coming!', 'Got it!'],
    nopeLines: [],
  },
  'Sniper!': {
    type: 'cover_sniper',
    duration: 5000,
    gate: () => true,
    okLines:   ['Cover!', 'Got it!', 'Heads down!'],
    nopeLines: [],
  },
  'Watch your flank!': {
    type: 'watch_flank',
    duration: 4000,
    gate: () => true,
    okLines:   ['Checking!', 'Got it!', 'Eyes peeled!'],
    nopeLines: [],
  },
  'Low HP!': {
    type: 'cover_player',  // reuse: allies converge to defend the low-HP player
    duration: 6000,
    gate: (bot) => bot.hp >= 90,
    okLines:   ['On the way!', 'Coming to help!', "I'll cover you!"],
    nopeLines: ['Can\'t, I\'m low too!', 'Need help myself!'],
  },
  'Thanks!': {
    type: null,
    duration: 0,
    gate: () => true,
    okLines:   ['Anytime!', 'You got it!', '👍'],
    nopeLines: [],
  },
  'GG!': {
    type: null,
    duration: 0,
    gate: () => true,
    okLines:   ['GG!', 'Good game!', 'GGWP!'],
    nopeLines: [],
  },
  'Scatter!': {
    type: 'scatter',
    duration: 5000,
    gate: () => true,
    okLines:   ['Scattering!', 'Got it!', 'Spreading out!', 'Splitting up!'],
    nopeLines: [],
  },
  'Distract them!': {
    type: 'distract',
    duration: 6000,
    gate: (bot) => bot.hp >= 100, // need health to be a viable distraction
    okLines:   ["I'll bait 'em!", 'Drawing fire!', 'Look at me!', 'Going loud!'],
    nopeLines: ["I'm too low!", "Can't, hurt!"],
  },
};

function reactAllyBotsToComms(playerSaid) {
  const cmd = COMMAND_PHYSICAL[playerSaid];
  if (!cmd) return;
  // All ally bots within 30m respond and physically react
  const nearbyAllies = gameBots
    .filter(b => !b.dead && b.team === 'ally')
    .map(b => ({ b, d: Math.hypot(b.x - camera.position.x, b.z - camera.position.z) }))
    .filter(x => x.d < 30)
    .sort((a,b) => a.d - b.d);
  nearbyAllies.forEach((x, i) => {
    setTimeout(() => {
      const willComply = cmd.gate(x.b);
      // Verbal reaction
      const pool = willComply ? cmd.okLines : (cmd.nopeLines.length ? cmd.nopeLines : cmd.okLines);
      const reply = pool[Math.floor(Math.random() * pool.length)];
      showBotSpeech(x.b, reply, 2000, willComply ? '#88ccff' : '#ffaa66');
      pushChatLine(`${players[x.b.id]?.name || 'Ally'}: ${reply}`, willComply ? '#88ccff' : '#ffaa66');
      // Physical reaction: set command override
      if (willComply && cmd.type) {
        x.b._commandOverride = {
          type: cmd.type,
          until: Date.now() + cmd.duration,
          // For cover_player + fallback we need the target position
          coverPos: { x: camera.position.x, z: camera.position.z },
        };
      }
    }, 400 + i * 250);
  });
}

// Chat feed in bottom-left corner — shows last 5 lines
const chatLog = [];
function pushChatLine(text, color) {
  chatLog.push({ text, color: color || '#fff', t: Date.now() });
  if (chatLog.length > 5) chatLog.shift();
  renderChatFeed();
}
function renderChatFeed() {
  let feed = document.getElementById('chat-feed');
  if (!feed) {
    feed = document.createElement('div');
    feed.id = 'chat-feed';
    feed.style.cssText = 'position:fixed;left:16px;bottom:120px;z-index:9400;'
      + 'font-family:Arial,sans-serif;font-size:13px;display:flex;flex-direction:column;gap:3px;'
      + 'pointer-events:none;max-width:380px;';
    document.body.appendChild(feed);
  }
  feed.innerHTML = chatLog.map(line => {
    const age = (Date.now() - line.t) / 1000;
    const op = age > 6 ? Math.max(0, 1 - (age - 6) / 2) : 1;
    return `<div style="background:rgba(0,0,0,0.6);padding:4px 9px;border-radius:5px;border-left:3px solid ${line.color};color:${line.color};opacity:${op};text-shadow:1px 1px 0 #000;">${line.text}</div>`;
  }).join('');
}
function updateChatFeed() {
  // Re-render every 0.5s to fade old lines
  if (!window._lastChatRender || Date.now() - window._lastChatRender > 500) {
    window._lastChatRender = Date.now();
    // Trim fully-faded
    const now = Date.now();
    while (chatLog.length && now - chatLog[0].t > 9000) chatLog.shift();
    renderChatFeed();
  }
}

// ── Bot speech bubbles: bots say what they're thinking ───────────────────
// Lines library per reason. Each picks a random variation.
const BOT_THOUGHTS = {
  // Flee reasons
  low_hp:       ["I'm hurt!", "Need to retreat!", "Falling back!", "I'm dying!"],
  reloading:    ["Reloading!", "Cover me!", "One sec!"],
  frosted:      ["I'm freezing!", "Can't move!", "Cold!!"],
  panic:        ["Where'd that come from?!", "Get me outta here!", "AAAAH!"],
  outnumbered:  ["Too many of them!", "Need backup!", "Outnumbered!"],
  last_one:     ["Need backup...", "Just me left...", "This is bad."],
  player_buffed:["He's buffed up!", "Wait for it to wear off!", "Don't engage!"],
  scary_close:  ["Stay back from that!", "Keep distance!", "That'll shred me!"],
  losing_trade: ["He's better than me!", "Reset, reset!", "Bad trade!"],
  outmatched:   ["He's full HP!", "Bad fight!", "Need to reset!"],
  // Charge reasons
  finisher:     ["GOING FOR THE KILL!", "He's almost dead!", "Finish him!"],
  punish_reload:["He's reloading!", "ATTACK NOW!", "Free kill!"],
  slowed_target:["He's frozen!", "Easy target!", "Get him while he's slow!"],
  airborne:     ["He's in the air!", "Sitting duck!", "Catch him mid-air!"],
  team_advantage:["Push together!", "Team push!", "We got him!"],
  dps_lead:     ["I outgun him!", "Rush him!", "I got the better gun!"],
  aggressor_push:["Push!", "Get close!", "In your face!"],
  opportunistic:["Got him on the ropes!", "Pressing the advantage!", "Now's the time!"],
  // States
  melee_charge: ["MELEE!", "RAAAH!", "INCOMING!"],
  cover:        ["Behind cover!", "Hiding!", "Wait..."],
  spotted:      ["I see him!", "Target!", "There!"],
  killed_enemy: ["GOT ONE!", "Down!", "Kill confirmed!"],
  // Personality flavor
  sniper_idle:  ["Holding position", "Long range", "Scoping in"],
  camper_idle:  ["Holding here", "Defensive"],
  aggressor_idle:["Where are you...", "Hunting", "Come out!"],
};

// Show a speech bubble over a bot for `duration` ms with the given text
function showBotSpeech(bot, text, duration = 2200, color = '#fff') {
  if (!bot || bot.dead) return;
  // Throttle: don't replace if same text shown recently, and rate-limit per bot
  const now = Date.now();
  if (bot._lastSpeechAt && now - bot._lastSpeechAt < 1800) return;
  bot._lastSpeechAt = now;
  // Create or reuse the bubble div
  if (!bot._bubble) {
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed;pointer-events:none;user-select:none;z-index:9500;'
      + 'background:rgba(20,20,20,0.85);color:#fff;font-family:Arial,sans-serif;font-size:13px;'
      + 'padding:5px 10px;border-radius:10px;border:2px solid #fff;white-space:nowrap;'
      + 'transform:translate(-50%,-100%);transition:opacity 0.25s;text-shadow:none;'
      + 'box-shadow:0 2px 6px rgba(0,0,0,0.4);';
    document.body.appendChild(div);
    bot._bubble = div;
  }
  bot._bubble.textContent = text;
  bot._bubble.style.color = color;
  bot._bubble.style.opacity = '1';
  bot._bubble.style.display = 'block';
  bot._bubbleHideAt = now + duration;
}

// Pick a random thought line for a reason key
function pickThought(key) {
  const lines = BOT_THOUGHTS[key];
  if (!lines || !lines.length) return null;
  return lines[Math.floor(Math.random() * lines.length)];
}

// Update bubble positions + hide expired ones
function updateBotSpeech(dt) {
  const now = Date.now();
  for (const bot of gameBots) {
    if (!bot._bubble) continue;
    if (bot.dead || (bot._bubbleHideAt && now >= bot._bubbleHideAt)) {
      bot._bubble.style.opacity = '0';
      bot._bubbleHideAt = 0;
      // Fully hide after fade
      setTimeout(() => { if (bot._bubble && (!bot._bubbleHideAt || Date.now() >= bot._bubbleHideAt - 1)) bot._bubble.style.display = 'none'; }, 250);
      continue;
    }
    // Position over the bot's head
    const mesh = remoteMeshes[bot.id];
    if (!mesh) { bot._bubble.style.display = 'none'; continue; }
    const headPos = mesh.position.clone(); headPos.y += 2.5;
    const sc = worldToScreen(headPos);
    if (!sc) { bot._bubble.style.display = 'none'; continue; }
    bot._bubble.style.display = 'block';
    bot._bubble.style.left = sc.x + 'px';
    bot._bubble.style.top  = sc.y + 'px';
  }
}

// Comprehensive "should this bot flee?" check — returns null OR a reason string.
// Applies to hard/expert. Multiple conditions trigger retreat.
function botShouldFlee(bot, dist) {
  if (!bot.difficulty || (bot.difficulty !== 'hard' && bot.difficulty !== 'expert')) return null;
  const playerHp = players[myId]?.hp ?? 300;
  const targetingPlayer = !isDead;
  // EXPERT bots are confident — much stricter flee thresholds. They want to fight, not run.
  const expert = bot.difficulty === 'expert';
  const lowHpThresh    = expert ? 45  : 75;   // sub-15% expert / sub-25% hard
  const panicDmg       = expert ? 100 : 40;   // huge burst required for expert panic
  const outnumThresh   = expert ? 3   : 2;    // need 3 enemies close before expert flees
  const outnumHp       = expert ? 110 : 180;
  const lastOneHp      = expert ? 90  : 200;
  const losingHits     = expert ? 5   : 3;
  const outmatchedHp   = expert ? 80  : 130;
  // 1. Critical HP
  if (bot.hp < lowHpThresh) return 'low_hp';
  // 2. Reloading → seek cover
  if (bot.reloadUntil && Date.now() < bot.reloadUntil) return 'reloading';
  // 3. Frost-slowed badly
  if ((bot.frostSlow || 100) < 60) return 'frosted';
  // 4. Heavy damage spike
  if (bot._recentDmg && (Date.now() - bot._lastBigHit < 1500) && bot._recentDmg > panicDmg) return 'panic';
  // 5. Genuinely outnumbered (3+ for expert, 2+ for hard)
  let enemiesNearMe = 0;
  for (const ob of gameBots) {
    if (ob.dead || ob.team === bot.team || ob.id === bot.id) continue;
    const d = Math.hypot(ob.x - bot.x, ob.z - bot.z);
    if (d < 18) enemiesNearMe++;
  }
  if (enemiesNearMe >= outnumThresh && bot.hp < outnumHp) return 'outnumbered';
  // 6. Last one standing — expert only flees if also low HP
  const livingAllies = gameBots.filter(b => b.team === bot.team && !b.dead && b.id !== bot.id);
  if (livingAllies.length === 0 && bot.hp < lastOneHp && bot.team === 'enemy') return 'last_one';
  // 7. Player buffed — only HARD bots flee from this; EXPERT plays around it
  if (!expert && targetingPlayer && typeof abilityBuff !== 'undefined' && abilityBuff && (abilityBuff.dmgMult > 1.2 || abilityBuff.trackingBoost)) return 'player_buffed';
  // 8. Scary close weapon at close range — still applies to expert (chainsaw really would kill them)
  if (targetingPlayer && dist < 10 && typeof playerHasScaryCloseWeapon === 'function' && playerHasScaryCloseWeapon()) return 'scary_close';
  // 9. Losing trade — requires more consecutive hits for expert
  if (targetingPlayer && bot._consecutiveHits >= losingHits) return 'losing_trade';
  // 10. Outmatched — only matters at very low HP for expert
  if (targetingPlayer && playerHp >= 280 && bot.hp < outmatchedHp) return 'outmatched';
  return null;
}

// Inverse of botShouldFlee — bot has a clear advantage and should aggressively close the distance.
// Returns null OR a reason string. Hard/expert only.
function botShouldCharge(bot, dist) {
  if (!bot.difficulty || (bot.difficulty !== 'hard' && bot.difficulty !== 'expert')) return null;
  const playerHp = players[myId]?.hp ?? 300;
  const expert = bot.difficulty === 'expert';
  // Hard veto: never charge into a scary close weapon (chainsaw, flamethrower, shotgun, etc.)
  if (typeof playerHasScaryCloseWeapon === 'function' && playerHasScaryCloseWeapon()) return null;
  // Expert is willing to commit at lower HP (90 vs 130)
  const minChargeHp = expert ? 90 : 130;
  if (bot.hp < minChargeHp) return null;
  // 1. Player critically low HP — expert pushes at 90, hard at 60
  if ((expert ? playerHp < 90 : playerHp < 60) && !isDead) return 'finisher';
  // 2. Player is reloading — punish (expert has slightly more lenient ammo check)
  if (typeof reloading !== 'undefined' && reloading && bot.botAmmo > (expert ? 1 : 3)) return 'punish_reload';
  // 3. Player is frost-slowed
  if (playerFrostSlow < (expert ? 80 : 70)) return 'slowed_target';
  // 4. Airborne
  if (typeof slamState !== 'undefined' && slamState && slamState.vel > 3) return 'airborne';
  // 5. Numbers advantage — for expert, 2+ allies near is enough even with player allies alive
  let alliesNearMe = 0;
  for (const ob of gameBots) {
    if (ob.dead || ob.team !== bot.team || ob.id === bot.id) continue;
    if (Math.hypot(ob.x - bot.x, ob.z - bot.z) < 20) alliesNearMe++;
  }
  const playerAlliesAlive = gameBots.filter(b => b.team !== bot.team && !b.dead).length;
  if (alliesNearMe >= 2 && (expert ? playerAlliesAlive <= alliesNearMe : playerAlliesAlive === 0)) return 'team_advantage';
  // 6. DPS lead — expert pushes at 1.2x, hard at 1.5x
  if (typeof currentWeapon !== 'undefined' && currentWeapon && bot.hp >= (expert ? 160 : 200)) {
    const playerDPS = WEAPON_DPS_CACHE[currentWeapon.id] || 150;
    if (bot.dps > playerDPS * (expert ? 1.2 : 1.5)) return 'dps_lead';
  }
  // 7. Aggressor personality push — expert lowers HP requirement
  if (bot.personality === 'aggressor' && bot.hp >= (expert ? 140 : 180) && dist < 18 && dist > 3) return 'aggressor_push';
  // 8. EXPERT-ONLY: opportunistic push when player is at < 200 HP and we have >220 HP
  if (expert && !isDead && playerHp < 200 && bot.hp > 220 && dist < 20 && dist > 4) return 'opportunistic';
  return null;
}

// Does this bot have a clear advantage to win a close-range brawl with the player?
// Requires multiple criteria to all favor the bot — otherwise it should back away.
function hasCloseRangeAdvantage(bot) {
  if (typeof currentWeapon === 'undefined' || !currentWeapon) return true; // no player weapon → no risk
  const playerDPS = WEAPON_DPS_CACHE[currentWeapon.id] || 150;
  const playerHp = players[myId]?.hp ?? 300;
  const botClass = classifyWeapon(bot.weaponId);
  const playerClass = classifyWeapon(currentWeapon.id);
  // Strong DPS lead OR a close-range weapon advantage AND not at a HP disadvantage
  const dpsLead   = bot.dps > playerDPS * 1.2;
  const classLead = botClass === 'close' && playerClass !== 'close';
  const hpLead    = bot.hp >= playerHp;
  return (dpsLead || classLead) && hpLead;
}

// ── Crossbow hold-charge state ─────────────────────────────────────────────
let crossbowCharging   = false;
let crossbowChargeStart = 0;

// ── Grenade wind-up & throw state ─────────────────────────────────────────
let grenadeWindupT    = 1;     // 1 = idle
let grenadeThrowFired = false; // has the projectile been spawned this throw?
const GRENADE_WINDUP_DUR = 620; // ms (pull-back + hold + throw)

// World-space grenades (physics objects, not camera-children)
const activeGrenades = [];
const GRENADE_GRAVITY = 16; // m/s²
const GRENADE_FUSE    = 3000; // ms before detonation

// Mobile joystick direction (-1..1), read by updateMovement
let joyDir = { x: 0, y: 0 }, joyActive = false;

// Per-weapon ammo pools (so switching preserves ammo)
const weaponAmmo = WEAPONS.map(w => ({ ammo: w.mag, reserve: w.reserve }));
const supportUses = SUPPORT_ITEMS.map(s => s.uses);

// ── Three.js setup ─────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
renderer.domElement.style.touchAction = 'none'; // prevent iOS scroll/zoom on canvas

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 40, 120);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 200);
camera.position.set(0, 1.65, 0);

// Procedural weapon audio: no asset files needed, unlocked by the first player gesture.
let audioCtx = null;
let weaponSoundLastAt = {};
let soundEventLastAt = {};
// Master mix scale — bumped to 1.15 for a fuller mix
const SOUND_MIX = 1.15;

// 🎛️ Player-tweakable shoot-sound modulator (sliders in settings panel).
// Each axis multiplies the corresponding aspect of the muzzle blast.
let SHOOT_FX = { pitch: 1.0, vol: 1.0, attack: 1.0, body: 1.0, dur: 1.0 };
try {
  const s = JSON.parse(localStorage.getItem('pvp_shoot_fx') || 'null');
  if (s) SHOOT_FX = { ...SHOOT_FX, ...s };
} catch (e) {}
function saveShootFx() { try { localStorage.setItem('pvp_shoot_fx', JSON.stringify(SHOOT_FX)); } catch(e) {} }
function getAudioCtx() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  return audioCtx;
}
function unlockAudio() {
  const ctx = getAudioCtx();
  if (ctx && ctx.state === 'suspended') {
    const resume = ctx.resume();
    if (resume && resume.catch) resume.catch(() => {});
  }
}
['pointerdown', 'keydown', 'touchstart'].forEach(evt => {
  window.addEventListener(evt, unlockAudio, { once: true, passive: true });
});
function soundDistanceGain(pos, remote) {
  if (!remote) return 1;
  if (!pos) return 0.45;
  const d = camera.position.distanceTo(pos);
  return Math.max(0.05, Math.min(0.55, 1 - d / 55));
}
function weaponAudioProfile(id, baseWeapon) {
  const w = baseWeapon || WEAPONS.find(x => x.id === id) || {};
  const type = (w.type || '').toLowerCase();
  const lowerId = String(id || w.id || '').toLowerCase();
  // ── Explicit per-weapon profiles (each unique-ish) ─────────────────────
  if (lowerId === 'p90' || lowerId === 'p90_spec') return { kind:'auto_blast', vol:0.20, dur:0.075, f1:760, f2:240, action:'water_smg' };
  if (lowerId === 'firework_launcher') return { kind:'firework', vol:0.36, dur:0.26, f1:130, f2:55 };
  if (lowerId === 'arc_torrent') return { kind:'arc', vol:0.26, dur:0.11, f1:980, f2:320 };
  if (lowerId === 'arc_rifle')   return { kind:'arc', vol:0.30, dur:0.13, f1:1240, f2:380 };
  if (lowerId === 'freeze_gun' || lowerId === 'frost_blaster') return { kind:'freeze', vol:0.24, dur:0.16, f1:680, f2:420 };
  if (lowerId === 'flamethrower') return { kind:'flamethrower', vol:0.24, dur:0.18, f1:95, f2:58 };
  if (lowerId === 'plasma_carbine') return { kind:'energy', vol:0.30, dur:0.14, f1:880, f2:540 };
  if (lowerId === 'railgun')        return { kind:'energy', vol:0.42, dur:0.32, f1:1620, f2:120 };
  if (lowerId === 'coilgun')        return { kind:'energy', vol:0.36, dur:0.24, f1:1320, f2:160 };
  if (lowerId === 'lazy_laser')     return { kind:'energy', vol:0.28, dur:0.18, f1:760, f2:1180 };
  if (lowerId === 'arc_rifle')      return { kind:'arc',    vol:0.30, dur:0.13, f1:1240, f2:380 };
  if (lowerId === 'cycler')         return { kind:'energy', vol:0.26, dur:0.10, f1:1080, f2:520 };
  if (lowerId === 'paintball')      return { kind:'pop',    vol:0.32, dur:0.11, f1:480, f2:160 };
  if (lowerId === 'sticker_blaster')return { kind:'pop',    vol:0.26, dur:0.10, f1:680, f2:240 };
  if (lowerId === 'potato_cannon')  return { kind:'thump',  vol:0.36, dur:0.18, f1:140, f2:60, action:'single' };
  if (lowerId === 'foam_cannon')    return { kind:'flame',  vol:0.20, dur:0.14, f1:160, f2:90 };
  if (lowerId === 'taser')          return { kind:'arc',    vol:0.22, dur:0.20, f1:880, f2:1180 };
  if (lowerId === 'glassmaker')     return { kind:'energy', vol:0.30, dur:0.16, f1:1480, f2:680 };
  if (lowerId === 'magnet_rifle')   return { kind:'energy', vol:0.30, dur:0.18, f1:560, f2:880 };
  if (lowerId === 'shockwave_launcher') return { kind:'thump', vol:0.46, dur:0.30, f1:80, f2:30, action:'single' };
  if (lowerId === 'seismic_hammer') return { kind:'thump', vol:0.50, dur:0.34, f1:55, f2:22, action:'single' };
  if (lowerId === 'mortar_rifle' || lowerId === 'grenade_launcher') return { kind:'thump', vol:0.44, dur:0.28, f1:120, f2:48, action:'single' };
  // Sci-fi P2W primaries — each gets a distinctive synth blip
  if (lowerId === 'event_horizon')   return { kind:'energy', vol:0.32, dur:0.18, f1:380, f2:120 };
  if (lowerId === 'storm_core')      return { kind:'arc',    vol:0.34, dur:0.16, f1:1080, f2:540 };
  if (lowerId === 'abs_zero')        return { kind:'freeze', vol:0.28, dur:0.18, f1:980, f2:380 };
  if (lowerId === 'solar_lance')     return { kind:'energy', vol:0.36, dur:0.22, f1:1480, f2:880 };
  if (lowerId === 'phase_driver')    return { kind:'energy', vol:0.30, dur:0.14, f1:1180, f2:720 };
  if (lowerId === 'quantum_repeater')return { kind:'energy', vol:0.28, dur:0.10, f1:920, f2:1320 };
  if (lowerId === 'magnetar')        return { kind:'energy', vol:0.40, dur:0.26, f1:580, f2:120 };
  if (lowerId === 'nebula_mortar')   return { kind:'thump',  vol:0.48, dur:0.32, f1:90, f2:32, action:'single' };
  if (lowerId === 'prism_engine')    return { kind:'energy', vol:0.28, dur:0.14, f1:1380, f2:980 };
  if (lowerId === 'void_harvester')  return { kind:'energy', vol:0.44, dur:0.30, f1:280, f2:60 };
  if (lowerId === 'pulse_needle')    return { kind:'energy', vol:0.22, dur:0.08, f1:1880, f2:780 };
  if (lowerId === 'phase_pistol')    return { kind:'energy', vol:0.26, dur:0.10, f1:1280, f2:540 };
  if (lowerId === 'ion_revolver')    return { kind:'arc',    vol:0.30, dur:0.12, f1:980, f2:380 };
  // Throwables
  if (lowerId.includes('crossbow') || lowerId.includes('bow') || lowerId.includes('harpoon') || lowerId === 'slingshot') return { kind:'twang', vol:0.34, dur:0.18, f1:420, f2:130 };
  if (lowerId === 'blowgun')        return { kind:'throw', vol:0.18, dur:0.09, f1:660, f2:140 };
  if (lowerId === 'boomerang')      return { kind:'twang', vol:0.20, dur:0.16, f1:380, f2:180 };
  if (lowerId === 'throwing_axes' || lowerId === 'shuriken' || lowerId === 'throwing_knives' || lowerId === 'spear_throw') return { kind:'throw', vol:0.23, dur:0.12, f1:780, f2:260 };
  // Pattern fallbacks
  if (lowerId.includes('rail') || lowerId.includes('coil') || lowerId.includes('laser')) return { kind:'energy', vol:0.32, dur:0.20, f1:920, f2:170 };
  if (lowerId.includes('freeze') || lowerId.includes('cryo')) return { kind:'energy', vol:0.26, dur:0.22, f1:740, f2:260 };
  if (lowerId.includes('flame') || lowerId.includes('firework')) return { kind:'flame', vol:0.22, dur:0.16, f1:120, f2:70 };
  if (lowerId.includes('grenade') || lowerId.includes('boombow') || lowerId.includes('rocket') || lowerId.includes('flare')) return { kind:'thump', vol:0.42, dur:0.28, f1:110, f2:45, action:'single' };
  if (lowerId.includes('paint')) return { kind:'pop', vol:0.28, dur:0.13, f1:520, f2:190 };
  if (lowerId.includes('knife') || lowerId.includes('throwing')) return { kind:'throw', vol:0.23, dur:0.12, f1:780, f2:260 };
  if (type.includes('shotgun') || lowerId.includes('shotgun') || lowerId.includes('sg8') || lowerId.includes('sg100') || lowerId.includes('shorty') || lowerId.includes('sawed') || lowerId === 'boomstick' || lowerId.includes('spas')) return { kind:'boom', vol:0.48, dur:0.22, f1:150, f2:55, action:'shotgun' };
  if (type.includes('sniper') || type.includes('marksman') || lowerId.includes('srx') || lowerId.includes('lever') || lowerId === 'amr' || lowerId === 'm1_garand' || lowerId === 'air_rifle' || lowerId === 'duelist_pistol') return { kind:'crack', vol:0.44, dur:0.18, f1:680, f2:95, action:'bolt' };
  if (type.includes('smg') || lowerId.includes('vector') || lowerId.includes('mp40') || lowerId === 'mini_uzi' || lowerId === 'machine_pistol' || lowerId === 'hkmp7' || lowerId === 'smart_smg') return { kind:'auto_blast', vol:0.20, dur:0.075, f1:430, f2:160, action:'water_smg' };
  if (type.includes('lmg') || type.includes('heavy') || lowerId.includes('minigun') || lowerId.includes('rpd') || lowerId === 'gau19' || lowerId === 'm134' || lowerId === 'thermal_lmg') return { kind:'auto_blast_heavy', vol:0.27, dur:0.11, f1:230, f2:80, action:'water_belt' };
  if (type.includes('secondary') || lowerId.includes('pistol') || lowerId.includes('revolver') || lowerId.includes('hand_cannon') || lowerId === 'mauser' || lowerId === 'nail_gun') return { kind:'pistol', vol:0.34, dur:0.12, f1:540, f2:120, action: lowerId.includes('revolver') ? 'revolver' : 'slide' };
  return w.auto ? { kind:'auto_blast', vol:0.23, dur:0.080, f1:145, f2:52, action:'water_rifle' }
                : { kind:'rifle', vol:0.38, dur:0.10, f1:145, f2:52, action:'rifle' };
}
function playNoise(ctx, start, dur, outNode, volume, tone = 0.5) {
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) * tone;
  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  src.buffer = buffer;
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(900 + tone * 2200, start);
  filter.Q.value = 0.7;
  src.connect(filter).connect(gain).connect(outNode);
  gain.gain.setValueAtTime(Math.max(0.001, volume), start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
  src.start(start);
  src.stop(start + dur + 0.02);
}
function playFilteredNoise(ctx, start, dur, outNode, volume, filterType, freq, q = 0.7, attack = 0.001) {
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) {
    const t = i / len;
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 1.8);
  }
  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  src.buffer = buffer;
  filter.type = filterType;
  filter.frequency.setValueAtTime(freq, start);
  filter.Q.value = q;
  src.connect(filter).connect(gain).connect(outNode);
  gain.gain.setValueAtTime(0.001, start);
  gain.gain.linearRampToValueAtTime(Math.max(0.001, volume), start + attack);
  gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
  src.start(start);
  src.stop(start + dur + 0.02);
}
function playTone(ctx, start, dur, outNode, freqA, freqB, volume, type = 'square') {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqA, start);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqB), start + dur);
  osc.connect(gain).connect(outNode);
  gain.gain.setValueAtTime(Math.max(0.001, volume), start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}
function playMuzzleBlast(ctx, start, outNode, kind, volume) {
  // Apply player FX modulator
  const FX = SHOOT_FX;
  volume *= FX.vol;
  // Helper wrappers that fold FX scaling into the layered calls below
  const PFN = (s, dur, gain, type, freq, q) =>
    playFilteredNoise(ctx, s, dur * FX.dur, outNode, gain * FX.attack, type, freq * FX.pitch, q);
  const PT = (s, dur, freq1, freq2, gain, wave) =>
    playTone(ctx, s, dur * FX.dur, outNode, freq1 * FX.pitch, freq2 * FX.pitch, gain * FX.body, wave);
  if (kind === 'boom') {
    PFN(start, 0.13, volume * 1.3, 'lowpass', 1200, 0.7);
    PFN(start, 0.028, volume * 1.0, 'highpass', 1800, 0.5);
    PT(start, 0.07, 92, 46, volume * 0.32, 'sine');
  } else if (kind === 'crack') {
    PFN(start, 0.030, volume * 0.72, 'highpass', 1900, 0.45);
    PFN(start, 0.075, volume * 0.95, 'bandpass', 760, 0.75);
    PT(start, 0.075, 118, 52, volume * 0.26, 'sine');
  } else if (kind === 'pistol') {
    PFN(start, 0.04, volume * 1.2, 'bandpass', 1550, 0.7);
    PFN(start + 0.015, 0.055, volume * 0.55, 'lowpass', 820, 0.7);
  } else if (kind === 'auto_blast') {
    PFN(start, 0.075, volume * 0.70, 'bandpass', 1180, 0.28);
    PFN(start + 0.010, 0.110, volume * 0.92, 'lowpass', 540, 0.55);
    PFN(start + 0.030, 0.070, volume * 0.42, 'bandpass', 260, 0.85);
    PT(start, 0.070, 66, 38, volume * 0.14, 'sine');
    PT(start + 0.014, 0.070, 170, 118, volume * 0.075, 'triangle');
  } else if (kind === 'auto_blast_heavy') {
    PFN(start, 0.085, volume * 0.62, 'bandpass', 980, 0.35);
    PFN(start + 0.006, 0.130, volume * 1.05, 'lowpass', 460, 0.68);
    PFN(start + 0.035, 0.080, volume * 0.42, 'bandpass', 230, 0.9);
    PT(start, 0.085, 72, 34, volume * 0.18, 'sine');
  } else if (kind === 'tick' || kind === 'p90') {
    PFN(start, 0.028, volume * 1.05, 'bandpass', kind === 'p90' ? 2100 : 1600, 0.55);
    PFN(start + 0.012, 0.032, volume * 0.35, 'highpass', 2400, 0.4);
  } else if (kind === 'heavy') {
    PFN(start, 0.05, volume * 1.15, 'bandpass', 980, 0.65);
    PT(start, 0.05, 120, 64, volume * 0.18, 'sine');
  } else if (kind === 'thump') {
    PFN(start, 0.11, volume * 0.95, 'lowpass', 900, 0.7);
    PT(start, 0.11, 88, 36, volume * 0.34, 'sine');
  } else {
    PFN(start, 0.030, volume * 0.52, 'bandpass', 1550, 0.45);
    PFN(start, 0.085, volume * 1.22, 'lowpass', 980, 0.75);
    PFN(start + 0.018, 0.050, volume * 0.42, 'bandpass', 430, 0.8);
    PT(start, 0.070, 96, 48, volume * 0.24, 'sine');
  }
}
function playGunAction(ctx, start, outNode, action, volume) {
  if (!action) return;
  const waterAction = action === 'water_smg' || action === 'water_rifle' || action === 'water_belt';
  const clickVol = volume * (waterAction ? 0.18 : action === 'smg' || action === 'rifle' || action === 'belt' ? 0.24 : 0.42);
  if (action === 'shotgun') {
    playFilteredNoise(ctx, start + 0.11, 0.035, outNode, clickVol, 'bandpass', 950, 1.0);
    playFilteredNoise(ctx, start + 0.19, 0.045, outNode, clickVol * 0.85, 'bandpass', 620, 1.0);
  } else if (action === 'bolt') {
    playFilteredNoise(ctx, start + 0.13, 0.030, outNode, clickVol, 'bandpass', 1250, 1.2);
    playFilteredNoise(ctx, start + 0.23, 0.040, outNode, clickVol * 0.75, 'bandpass', 720, 1.1);
  } else if (action === 'revolver') {
    playFilteredNoise(ctx, start + 0.055, 0.024, outNode, clickVol * 0.8, 'bandpass', 1350, 1.2);
  } else if (action === 'belt') {
    playFilteredNoise(ctx, start + 0.035, 0.026, outNode, clickVol * 0.8, 'bandpass', 760, 1.0);
  } else if (waterAction) {
    const delay = action === 'water_smg' ? 0.030 : action === 'water_belt' ? 0.040 : 0.052;
    playTone(ctx, start + 0.006, 0.070, outNode, 155, 190, clickVol * 0.75, 'triangle');
    playFilteredNoise(ctx, start + delay, 0.026, outNode, clickVol, 'bandpass', 980, 0.75);
    playFilteredNoise(ctx, start + delay + 0.030, 0.018, outNode, clickVol * 0.52, 'bandpass', 1450, 0.55);
  } else {
    playFilteredNoise(ctx, start + (action === 'smg' ? 0.026 : 0.045), 0.024, outNode, clickVol, 'bandpass', action === 'slide' ? 1650 : 1050, 1.0);
    playFilteredNoise(ctx, start + (action === 'smg' ? 0.048 : 0.075), 0.018, outNode, clickVol * 0.55, 'highpass', 2200, 0.6);
  }
}
function playWeaponSound(idOrWeapon, opts = {}) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const base = opts.baseWeapon || (typeof idOrWeapon === 'object' ? idOrWeapon : null);
  const id = typeof idOrWeapon === 'object' ? idOrWeapon.id : idOrWeapon;
  const key = `${id || base?.id || 'weapon'}_${opts.remote ? 'r' : 'l'}`;
  const nowMs = performance.now();
  const minGap = opts.minGap ?? (opts.remote ? 55 : 18);
  if (weaponSoundLastAt[key] && nowMs - weaponSoundLastAt[key] < minGap) return;
  weaponSoundLastAt[key] = nowMs;
  unlockAudio();

  const p = weaponAudioProfile(id, base);
  const distGain = soundDistanceGain(opts.position, opts.remote);
  const mult = (opts.volume ?? 1) * distGain * (opts.remote ? 0.75 : 1) * SOUND_MIX;
  const start = ctx.currentTime + 0.002;
  const mainGain = ctx.createGain();
  const comp = ctx.createDynamicsCompressor();
  mainGain.connect(comp).connect(ctx.destination);

  if (p.kind === 'auto_blast' || p.kind === 'auto_blast_heavy') {
    playMuzzleBlast(ctx, start, mainGain, p.kind, p.vol * mult);
    playGunAction(ctx, start, mainGain, p.action, p.vol * mult);
  } else if (p.kind === 'firework') {
    playTone(ctx, start, 0.10, mainGain, p.f1, p.f2, p.vol * mult, 'sine');
    playTone(ctx, start + 0.055, 0.20, mainGain, 620, 1080, p.vol * 0.22 * mult, 'triangle');
    playNoise(ctx, start + 0.09, 0.13, mainGain, p.vol * 0.42 * mult, 0.9);
  } else if (p.kind === 'arc') {
    // Sharp attack transient + sustained arc tone + crackling noise tail
    playFilteredNoise(ctx, start, 0.022, mainGain, p.vol * 0.9 * mult, 'highpass', 2400, 0.4);
    playTone(ctx, start, p.dur, mainGain, p.f1, p.f2, p.vol * mult, 'sawtooth');
    playNoise(ctx, start, p.dur, mainGain, p.vol * 0.55 * mult, 1.0);
  } else if (p.kind === 'freeze') {
    playNoise(ctx, start, p.dur, mainGain, p.vol * mult, 0.52);
    playTone(ctx, start + 0.035, 0.08, mainGain, p.f1, p.f2, p.vol * 0.36 * mult, 'triangle');
  } else if (p.kind === 'flamethrower') {
    playNoise(ctx, start, p.dur, mainGain, p.vol * mult, 0.22);
    playTone(ctx, start, p.dur * 0.8, mainGain, p.f1, p.f2, p.vol * 0.20 * mult, 'sawtooth');
  } else if (p.kind === 'rifle') {
    playMuzzleBlast(ctx, start, mainGain, p.kind, p.vol * mult);
    playGunAction(ctx, start, mainGain, p.action, p.vol * mult);
  } else if (p.kind === 'energy') {
    // Click-attack transient so it feels like the gun fired, then the energy tone
    playFilteredNoise(ctx, start, 0.018, mainGain, p.vol * 0.7 * mult, 'highpass', 2800, 0.5);
    playTone(ctx, start, p.dur, mainGain, p.f1, p.f2, p.vol * mult, 'sawtooth');
    playTone(ctx, start + 0.01, p.dur * 0.65, mainGain, p.f1 * 1.7, p.f2 * 1.2, p.vol * 0.30 * mult, 'sine');
  } else if (p.kind === 'twang') {
    playTone(ctx, start, p.dur, mainGain, p.f1, p.f2, p.vol * mult, 'triangle');
    playNoise(ctx, start + 0.015, 0.08, mainGain, p.vol * 0.25 * mult, 0.3);
  } else if (p.kind === 'flame') {
    playNoise(ctx, start, p.dur, mainGain, p.vol * mult, 0.25);
    playTone(ctx, start, p.dur * 0.7, mainGain, p.f1, p.f2, p.vol * 0.25 * mult, 'sawtooth');
  } else if (p.kind === 'pop' || p.kind === 'throw') {
    playTone(ctx, start, p.dur, mainGain, p.f1, p.f2, p.vol * mult, 'triangle');
    playNoise(ctx, start, p.dur * 0.55, mainGain, p.vol * 0.18 * mult, 0.35);
  } else if (['boom', 'crack', 'tick', 'heavy', 'pistol', 'thump'].includes(p.kind)) {
    playMuzzleBlast(ctx, start, mainGain, p.kind, p.vol * mult);
    playGunAction(ctx, start, mainGain, p.action, p.vol * mult);
  } else {
    playMuzzleBlast(ctx, start, mainGain, 'rifle', p.vol * mult);
    playGunAction(ctx, start, mainGain, p.action || 'rifle', p.vol * mult);
  }
}
function playReloadSound(w) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  unlockAudio();
  const start = ctx.currentTime + 0.002;
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  const low = w?.noReload ? 120 : 210;
  playTone(ctx, start, 0.055, gain, 360, low, 0.10, 'square');
  playTone(ctx, start + 0.13, 0.07, gain, 180, 320, 0.08, 'triangle');
}
function playSoundEvent(name, opts = {}) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const nowMs = performance.now();
  const key = `${name}_${opts.remote ? 'r' : 'l'}`;
  const minGap = opts.minGap ?? 80;
  if (soundEventLastAt[key] && nowMs - soundEventLastAt[key] < minGap) return;
  soundEventLastAt[key] = nowMs;
  unlockAudio();

  const posGain = soundDistanceGain(opts.position, opts.remote);
  const mult = (opts.volume ?? 1) * posGain * (opts.remote ? 0.8 : 1) * SOUND_MIX;
  const start = ctx.currentTime + 0.002;
  const out = ctx.createGain();
  const comp = ctx.createDynamicsCompressor();
  out.connect(comp).connect(ctx.destination);

  if (name === 'hitmarker') {
    // Sharp transient "snap" — no tonal beep, just a percussive crack
    playFilteredNoise(ctx, start, 0.020, out, 0.18 * mult, 'highpass', 3200, 0.4);
    playFilteredNoise(ctx, start, 0.035, out, 0.10 * mult, 'lowpass', 1400, 0.6);
    playTone(ctx, start, 0.028, out, 220, 80, 0.10 * mult, 'sine'); // tiny low thud body
  } else if (name === 'headshot') {
    // Sharper snap + brief metallic ring
    playFilteredNoise(ctx, start, 0.022, out, 0.22 * mult, 'highpass', 4200, 0.35);
    playTone(ctx, start, 0.10, out, 1860, 940, 0.10 * mult, 'triangle');
    playTone(ctx, start, 0.05, out, 280, 110, 0.14 * mult, 'sine');
  } else if (name === 'kill') {
    playTone(ctx, start, 0.18, out, 125, 48, 0.22 * mult, 'sine');
    playNoise(ctx, start, 0.07, out, 0.08 * mult, 0.45);
  } else if (name === 'low_hp') {
    playTone(ctx, start, 0.13, out, 82, 68, 0.16 * mult, 'sine');
    playTone(ctx, start + 0.18, 0.10, out, 92, 74, 0.12 * mult, 'sine');
    playTone(ctx, start + 0.03, 0.42, out, 1850, 1580, 0.035 * mult, 'triangle');
  } else if (name === 'freeze_shatter') {
    playNoise(ctx, start, 0.35, out, 0.32 * mult, 1.0);
    playTone(ctx, start, 0.22, out, 240, 72, 0.24 * mult, 'sawtooth');
    playTone(ctx, start + 0.04, 0.16, out, 1260, 420, 0.14 * mult, 'triangle');
  } else if (name === 'chainsaw_idle') {
    // 2-stroke engine: 3 quick pulses simulating piston firing + steady saw raspChainsaw
    for (let i = 0; i < 3; i++) {
      const t = start + i * 0.04;
      playTone(ctx, t, 0.035, out, 88, 82, 0.20 * mult, 'sawtooth');
      playFilteredNoise(ctx, t, 0.035, out, 0.22 * mult, 'highpass', 1800, 0.4);
    }
    playTone(ctx, start, 0.16, out, 58, 60, 0.16 * mult, 'sawtooth'); // steady idle drone
    playTone(ctx, start, 0.16, out, 32, 34, 0.14 * mult, 'sine');     // sub
  } else if (name === 'chainsaw_rev') {
    // Full throttle — 4 rapid pulses (higher RPM) + screaming top end
    for (let i = 0; i < 4; i++) {
      const t = start + i * 0.025;
      playTone(ctx, t, 0.022, out, 135, 128, 0.26 * mult, 'sawtooth');
      playFilteredNoise(ctx, t, 0.022, out, 0.28 * mult, 'highpass', 2200, 0.35);
    }
    playTone(ctx, start, 0.13, out, 78, 82, 0.20 * mult, 'sawtooth'); // rev drone
    playTone(ctx, start, 0.13, out, 240, 280, 0.10 * mult, 'square'); // shrieky harmonic
  } else if (name === 'chainsaw_hit') {
    // Crunching wood/flesh impact
    playFilteredNoise(ctx, start, 0.14, out, 0.42 * mult, 'lowpass', 1400, 0.6);
    playTone(ctx, start, 0.10, out, 165, 65, 0.26 * mult, 'sawtooth');
    playNoise(ctx, start + 0.02, 0.12, out, 0.30 * mult, 0.85);
  } else if (name === 'blink') {
    playTone(ctx, start, 0.18, out, 180, 720, 0.18 * mult, 'triangle');
    playNoise(ctx, start + 0.03, 0.20, out, 0.18 * mult, 0.7);
    playTone(ctx, start + 0.18, 0.11, out, 90, 48, 0.16 * mult, 'sine');
  } else if (name === 'drone_fly') {
    playTone(ctx, start, 0.26, out, 390, 430, 0.10 * mult, 'sawtooth');
    playNoise(ctx, start, 0.20, out, 0.04 * mult, 0.25);
  } else if (name === 'drone_lock') {
    playTone(ctx, start, 0.05, out, 980, 980, 0.11 * mult, 'square');
    playTone(ctx, start + 0.12, 0.04, out, 1180, 1180, 0.13 * mult, 'square');
  } else if (name === 'drone_dive') {
    playTone(ctx, start, 0.55, out, 520, 1260, 0.18 * mult, 'sawtooth');
    playTone(ctx, start + 0.45, 0.22, out, 110, 42, 0.22 * mult, 'sine');
  } else if (name === 'air_burst') {
    playTone(ctx, start, 0.35, out, 95, 38, 0.28 * mult, 'sine');
    playNoise(ctx, start, 0.26, out, 0.16 * mult, 0.22);
  } else if (name === 'air_launch') {
    playTone(ctx, start, 0.38, out, 260, 920, 0.12 * mult, 'triangle');
  } else if (name === 'blackhole_activate') {
    playTone(ctx, start, 0.45, out, 62, 38, 0.30 * mult, 'sine');
    playNoise(ctx, start, 0.30, out, 0.12 * mult, 0.18);
  } else if (name === 'blackhole_collapse') {
    playNoise(ctx, start, 0.24, out, 0.26 * mult, 0.9);
    playTone(ctx, start + 0.08, 0.36, out, 72, 28, 0.34 * mult, 'sawtooth');
  } else if (name === 'fire_sizzle') {
    playNoise(ctx, start, 0.32, out, 0.10 * mult, 0.75);
    playTone(ctx, start + 0.04, 0.08, out, 720, 980, 0.035 * mult, 'triangle');
  } else if (name === 'melee_swing') {
    playFilteredNoise(ctx, start, 0.10, out, 0.18 * mult, 'bandpass', 1200, 1.6);
    playTone(ctx, start, 0.08, out, 880, 240, 0.04 * mult, 'sine');
  } else if (name === 'melee_heavy') {
    playFilteredNoise(ctx, start, 0.16, out, 0.30 * mult, 'lowpass', 600, 0.8);
    playTone(ctx, start, 0.12, out, 140, 60, 0.20 * mult, 'sine');
  } else if (name === 'melee_blade') {
    playFilteredNoise(ctx, start, 0.10, out, 0.16 * mult, 'highpass', 2400, 0.5);
    playTone(ctx, start, 0.06, out, 1480, 380, 0.06 * mult, 'triangle');
  }
  // 🦶 Footsteps — short low thud, alternates pitch for L/R variation
  else if (name === 'footstep') {
    const f = opts.pitch || 1.0;
    playFilteredNoise(ctx, start, 0.06, out, 0.10 * mult, 'lowpass', 240 * f, 0.7);
    playTone(ctx, start, 0.04, out, 120 * f, 60 * f, 0.06 * mult, 'sine');
  }
  // ⚔️ Specific weapon ability sounds
  else if (name === 'katana_deflect') {
    // Metallic "shiing" — bright sustained ring + sharp attack
    playFilteredNoise(ctx, start, 0.022, out, 0.18 * mult, 'highpass', 3600, 0.4);
    playTone(ctx, start, 0.32, out, 2200, 1640, 0.16 * mult, 'triangle');
    playTone(ctx, start + 0.02, 0.26, out, 3400, 2400, 0.10 * mult, 'sine');
  }
  else if (name === 'parry_deflect') {
    // Similar but heavier/lower for shield bash deflect
    playFilteredNoise(ctx, start, 0.030, out, 0.22 * mult, 'highpass', 2400, 0.4);
    playTone(ctx, start, 0.30, out, 1480, 920, 0.18 * mult, 'triangle');
  }
  else if (name === 'vampire_slash') {
    // Wet squelch + bloody chime
    playFilteredNoise(ctx, start, 0.10, out, 0.22 * mult, 'lowpass', 800, 0.7);
    playTone(ctx, start + 0.04, 0.10, out, 880, 220, 0.10 * mult, 'sine');
  }
  else if (name === 'instakill_zip') {
    // Quick zip for knife stealth stab
    playFilteredNoise(ctx, start, 0.04, out, 0.20 * mult, 'highpass', 3000, 0.5);
    playTone(ctx, start, 0.07, out, 1980, 380, 0.10 * mult, 'sawtooth');
  }
  else if (name === 'silent_kill') {
    // Garrote — barely audible thud + breath
    playFilteredNoise(ctx, start, 0.18, out, 0.06 * mult, 'lowpass', 300, 0.6);
  }
  else if (name === 'spin_revup') {
    // Chainsaw revup-style for spin abilities (yoyo, screwdriver, nunchucks)
    playTone(ctx, start, 0.20, out, 320, 540, 0.12 * mult, 'sawtooth');
    playFilteredNoise(ctx, start, 0.20, out, 0.10 * mult, 'bandpass', 760, 0.9);
  }
  else if (name === 'heavy_buff') {
    // Generic "heavy swing buff active" cue — low resonant pulse
    playTone(ctx, start, 0.18, out, 88, 132, 0.20 * mult, 'sine');
    playTone(ctx, start + 0.04, 0.12, out, 220, 110, 0.10 * mult, 'triangle');
  }
  else if (name === 'pull_yank') {
    // Cane yank — whoosh + thud
    playFilteredNoise(ctx, start, 0.18, out, 0.20 * mult, 'bandpass', 480, 1.2);
    playTone(ctx, start + 0.06, 0.10, out, 220, 80, 0.16 * mult, 'sine');
  }
  // 💉 Heal — soft chime + bubble (medkit, stim, healing_pulse, nano_swarm)
  else if (name === 'heal') {
    playTone(ctx, start, 0.22, out, 660, 990, 0.18 * mult, 'sine');
    playTone(ctx, start + 0.06, 0.16, out, 1320, 1760, 0.12 * mult, 'triangle');
    playFilteredNoise(ctx, start, 0.18, out, 0.08 * mult, 'lowpass', 380, 0.5);
  }
  // 💉 Inject — short syringe push (adrenaline, berserker, cloak)
  else if (name === 'inject') {
    playFilteredNoise(ctx, start, 0.10, out, 0.18 * mult, 'highpass', 1800, 0.6);
    playTone(ctx, start + 0.04, 0.10, out, 520, 200, 0.12 * mult, 'sawtooth');
  }
  // 🔫 Ammo refill clack (ammo_fountain)
  else if (name === 'ammo_refill') {
    playFilteredNoise(ctx, start, 0.06, out, 0.20 * mult, 'highpass', 2200, 0.4);
    playTone(ctx, start, 0.10, out, 420, 240, 0.14 * mult, 'triangle');
    playTone(ctx, start + 0.10, 0.08, out, 320, 180, 0.10 * mult, 'square');
  }
  // 💨 Smoke / ink release — pressurized hiss
  else if (name === 'smoke_hiss') {
    playFilteredNoise(ctx, start, 0.40, out, 0.26 * mult, 'bandpass', 2400, 0.8);
    playFilteredNoise(ctx, start, 0.40, out, 0.10 * mult, 'lowpass', 600, 0.5);
  }
  // 🪤 Mine / trap arm — beep beep
  else if (name === 'mine_arm') {
    playTone(ctx, start,        0.04, out, 1320, 1320, 0.12 * mult, 'square');
    playTone(ctx, start + 0.12, 0.04, out, 1320, 1320, 0.12 * mult, 'square');
  }
  // 🪁 Bounce pad — boing
  else if (name === 'bounce') {
    playTone(ctx, start, 0.18, out, 220, 880, 0.22 * mult, 'sine');
  }
  // 🤖 Drone launch — fan whirr ramp
  else if (name === 'drone_launch') {
    playFilteredNoise(ctx, start, 0.50, out, 0.20 * mult, 'bandpass', 1800, 0.9);
    playTone(ctx, start, 0.50, out, 240, 540, 0.10 * mult, 'sawtooth');
  }
  // ⚡ EMP / taser zap — buzzing burst
  else if (name === 'emp_zap') {
    playTone(ctx, start, 0.16, out, 80, 110, 0.22 * mult, 'square');
    playFilteredNoise(ctx, start, 0.16, out, 0.30 * mult, 'highpass', 2400, 0.5);
  }
  // 🛡️ Shield activate — energy hum (nano_shield, quantum_barrier)
  else if (name === 'shield_up') {
    playTone(ctx, start, 0.32, out, 220, 440, 0.20 * mult, 'sine');
    playTone(ctx, start + 0.04, 0.28, out, 660, 880, 0.10 * mult, 'triangle');
  }
  // ⚠️ Incoming strike siren (orbital_strike / drone_strike — pre-explosion)
  else if (name === 'incoming_siren') {
    playTone(ctx, start,        0.18, out, 1200, 1800, 0.16 * mult, 'triangle');
    playTone(ctx, start + 0.22, 0.18, out, 1200, 1800, 0.16 * mult, 'triangle');
    playTone(ctx, start + 0.44, 0.18, out, 1200, 1800, 0.16 * mult, 'triangle');
  }
  // ⚪ Flashbang — bright pop + ringing whine
  else if (name === 'flashbang') {
    playFilteredNoise(ctx, start, 0.08, out, 0.40 * mult, 'highpass', 3200, 0.5);
    playTone(ctx, start, 0.05, out, 2200, 1200, 0.20 * mult, 'sine');
    playTone(ctx, start + 0.05, 0.80, out, 3200, 3200, 0.08 * mult, 'sine'); // tinnitus ring
  }
  // 🔥 Thermite ignite — fire whoosh
  else if (name === 'thermite_ignite') {
    playFilteredNoise(ctx, start, 0.40, out, 0.30 * mult, 'bandpass', 1200, 0.7);
    playTone(ctx, start, 0.25, out, 180, 360, 0.14 * mult, 'sawtooth');
  }
  // 🛰️ Radar / UAV ping
  else if (name === 'radar_ping') {
    playTone(ctx, start, 0.32, out, 1480, 980, 0.16 * mult, 'sine');
    playTone(ctx, start + 0.05, 0.22, out, 2480, 1980, 0.08 * mult, 'triangle');
  }
  // 📦 Care package drop — distant horn
  else if (name === 'air_drop') {
    playTone(ctx, start, 0.40, out, 320, 240, 0.22 * mult, 'sawtooth');
    playTone(ctx, start, 0.40, out, 160, 120, 0.18 * mult, 'sine');
  }
  // ☢️ Tac-nuke siren — long descending warble
  else if (name === 'nuke_siren') {
    playTone(ctx, start, 1.2, out, 220, 880, 0.32 * mult, 'sawtooth');
    playTone(ctx, start, 1.2, out, 110, 440, 0.22 * mult, 'sine');
  }
  // 💣 C4 / claymore place — double click
  else if (name === 'c4_place') {
    playTone(ctx, start,        0.03, out, 1200, 800, 0.16 * mult, 'square');
    playTone(ctx, start + 0.08, 0.03, out, 1200, 800, 0.16 * mult, 'square');
  }
  // 🦆 Quack — rubber duck
  else if (name === 'quack') {
    playTone(ctx, start, 0.12, out, 480, 320, 0.24 * mult, 'sawtooth');
    playTone(ctx, start + 0.10, 0.10, out, 420, 280, 0.20 * mult, 'sawtooth');
  }
  // 🚨 Siren utility — short klaxon
  else if (name === 'siren_loop') {
    playTone(ctx, start,        0.18, out, 480, 880, 0.22 * mult, 'sawtooth');
    playTone(ctx, start + 0.20, 0.18, out, 480, 880, 0.22 * mult, 'sawtooth');
  }
  // 🎉 Confetti / firework burst (confetti cannon, sticker blaster)
  else if (name === 'confetti_blast') {
    for (let i = 0; i < 6; i++) {
      const t = start + i * 0.04;
      playTone(ctx, t, 0.05, out, 600 + Math.random() * 1200, 200, 0.10 * mult, 'square');
    }
    playFilteredNoise(ctx, start, 0.12, out, 0.20 * mult, 'highpass', 2400, 0.5);
  }
  // 💣 Grenade throw — quick whoosh
  else if (name === 'grenade_throw') {
    playFilteredNoise(ctx, start, 0.18, out, 0.28 * mult, 'bandpass', 620, 0.9);
    playTone(ctx, start, 0.10, out, 360, 180, 0.10 * mult, 'sine');
  }
  // 💥 Explosion — sub-bass thump + cracking noise + low-pass smoke rumble
  else if (name === 'explosion') {
    // Sharp transient crack
    playFilteredNoise(ctx, start, 0.06, out, 0.42 * mult, 'highpass', 1800, 0.5);
    // Body — big low-end thump
    playTone(ctx, start, 0.30, out, 90, 28, 0.55 * mult, 'sine');
    playTone(ctx, start, 0.30, out, 180, 60, 0.30 * mult, 'triangle');
    // Smoky tail
    playFilteredNoise(ctx, start + 0.05, 0.40, out, 0.22 * mult, 'lowpass', 540, 0.6);
    // Debris pops
    for (let i = 0; i < 4; i++) {
      const t = start + 0.08 + Math.random() * 0.30;
      playTone(ctx, t, 0.04, out, 220 + Math.random() * 200, 80, 0.10 * mult, 'square');
    }
  }
  else {
    // Sub-bass thud (not a beep) for any unhandled event
    playFilteredNoise(ctx, start, 0.10, out, 0.10 * mult, 'lowpass', 400, 0.6);
    playTone(ctx, start, 0.08, out, 110, 60, 0.08 * mult, 'sine');
  }
}

// ── Lighting ───────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(30, 50, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 200;
sun.shadow.camera.left = -60; sun.shadow.camera.right = 60;
sun.shadow.camera.top = 60;  sun.shadow.camera.bottom = -60;
scene.add(sun);

// ── Wall collision boxes ────────────────────────────────────────────────────
// Populated by buildMap(); used by resolveWallCollisions() each frame.
const wallColliders = []; // Array of THREE.Box3
const PLAYER_EYE_HEIGHT = 1.65;
const PLAYER_RADIUS = 0.38;

function getGroundEyeY(px = camera.position.x, pz = camera.position.z, eyeY = camera.position.y) {
  let groundY = PLAYER_EYE_HEIGHT;
  const feetY = eyeY - PLAYER_EYE_HEIGHT;
  for (const box of wallColliders) {
    if (box.max.y <= 0.05 || box.max.y > 14) continue;
    if (feetY + 0.35 < box.max.y) continue;
    if (px < box.min.x - PLAYER_RADIUS || px > box.max.x + PLAYER_RADIUS) continue;
    if (pz < box.min.z - PLAYER_RADIUS || pz > box.max.z + PLAYER_RADIUS) continue;
    groundY = Math.max(groundY, box.max.y + PLAYER_EYE_HEIGHT);
  }
  return groundY;
}

function isPlayerGrounded() {
  return camera.position.y <= getGroundEyeY() + 0.04 && (!slamState || slamState.vel <= 0);
}

// 🧗 Returns a wall collider the player is currently pressed up against and
// could climb (tall enough above the feet, within reach), or null. Used by the
// wall-climb movement: jump into a wall and you can scramble up it.
function nearClimbableWall() {
  const px = camera.position.x, pz = camera.position.z;
  const feetY = camera.position.y - PLAYER_EYE_HEIGHT;
  const R = PLAYER_RADIUS;
  const margin = 0.28; // contact band — how close counts as "touching" the face
  for (const box of wallColliders) {
    if (box.max.y <= feetY + 0.45) continue;   // nothing left above us to climb
    if (box.min.y > feetY + 1.4) continue;     // wall starts above our reach
    // Closest point on the box footprint (XZ) to the player
    const cx = Math.max(box.min.x, Math.min(px, box.max.x));
    const cz = Math.max(box.min.z, Math.min(pz, box.max.z));
    const dx = px - cx, dz = pz - cz;
    if (dx * dx + dz * dz <= (R + margin) * (R + margin)) return box;
  }
  return null;
}

function resolveWallCollisions() {
  const RADIUS = PLAYER_RADIUS; // player footprint radius
  let px = camera.position.x;
  let pz = camera.position.z;
  const py = camera.position.y;
  let feetY = py - PLAYER_EYE_HEIGHT;
  for (const box of wallColliders) {
    if (feetY >= box.max.y - 0.08) continue;
    // Quick vertical cull — player occupies y ∈ [0.65, 2.65]
    if (py + 1.0 < box.min.y || py - 1.0 > box.max.y) continue;
    // Expand box horizontally by player radius (Minkowski sum)
    const exMinX = box.min.x - RADIUS;
    const exMaxX = box.max.x + RADIUS;
    const exMinZ = box.min.z - RADIUS;
    const exMaxZ = box.max.z + RADIUS;
    if (px <= exMinX || px >= exMaxX || pz <= exMinZ || pz >= exMaxZ) continue;
    if (box.max.y > feetY && box.max.y <= feetY + 0.65) {
      camera.position.y = box.max.y + PLAYER_EYE_HEIGHT;
      feetY = box.max.y;
      continue;
    }
    // Inside — find smallest push-out distance and eject on that axis
    const dLeft  = px - exMinX;
    const dRight = exMaxX - px;
    const dFront = pz - exMinZ;
    const dBack  = exMaxZ - pz;
    const minD = Math.min(dLeft, dRight, dFront, dBack);
    if      (minD === dLeft)  px = exMinX;
    else if (minD === dRight) px = exMaxX;
    else if (minD === dFront) pz = exMinZ;
    else                      pz = exMaxZ;
  }
  camera.position.x = px;
  camera.position.z = pz;
}

// feetY = the moving entity's feet height. Defaults to 0 (ground) because this
// helper resolves BOT movement — bots stand on the floor. (Earlier it read the
// PLAYER's camera height, so when the player jumped / climbed high, low walls
// got skipped and bots phased straight through them.)
function resolvePosCollisions(px, pz, feetY = 0) {
  const RADIUS = PLAYER_RADIUS;
  for (const box of wallColliders) {
    if (feetY >= box.max.y - 0.08) continue;
    const exMinX = box.min.x - RADIUS, exMaxX = box.max.x + RADIUS;
    const exMinZ = box.min.z - RADIUS, exMaxZ = box.max.z + RADIUS;
    if (px <= exMinX || px >= exMaxX || pz <= exMinZ || pz >= exMaxZ) continue;
    const dL = px - exMinX, dR = exMaxX - px, dF = pz - exMinZ, dB = exMaxZ - pz;
    const m = Math.min(dL, dR, dF, dB);
    if (m === dL) px = exMinX; else if (m === dR) px = exMaxX;
    else if (m === dF) pz = exMinZ; else pz = exMaxZ;
  }
  return [px, pz];
}

// ── Map Groups ──────────────────────────────────────────────────────────────
const MAP_GROUPS = {};
const MAP_COLLIDERS = {};
// Per-map gimmicks — { damageZones, jumpPads, iceZones, oilZones, lowGravZones } (each is array of {x,z,r})
const MAP_GIMMICKS = {};
let activeMapName = 'blank';
let activeMapGimmicks = { damageZones: [], jumpPads: [], iceZones: [], oilZones: [], lowGravZones: [] };

function registerMap(name) {
  const group = new THREE.Group();
  scene.add(group);
  group.visible = false;
  MAP_GROUPS[name] = group;
  MAP_COLLIDERS[name] = [];
  MAP_GIMMICKS[name] = { damageZones: [], jumpPads: [], iceZones: [], oilZones: [], lowGravZones: [] };
}

// Legacy refs for existing buildBlankMap/Battlefield/Range — bridge them to the registry
registerMap('blank');
registerMap('battlefield');
registerMap('range');
const blankMapGroup       = MAP_GROUPS.blank;
const battlefieldMapGroup = MAP_GROUPS.battlefield;
const rangeMapGroup       = MAP_GROUPS.range;
const blankMapColliders       = MAP_COLLIDERS.blank;
const battlefieldMapColliders = MAP_COLLIDERS.battlefield;
const rangeMapColliders       = MAP_COLLIDERS.range;

function activateMap(name) {
  for (const [n, g] of Object.entries(MAP_GROUPS)) g.visible = (n === name);
  wallColliders.length = 0;
  if (MAP_COLLIDERS[name]) wallColliders.push(...MAP_COLLIDERS[name]);
  activeMapName = name;
  activeMapGimmicks = MAP_GIMMICKS[name] || { damageZones: [], jumpPads: [], iceZones: [], oilZones: [], lowGravZones: [] };
  // Reset batch-5 stateful mechanics so a re-entered map starts fresh
  if (typeof _batch5 !== 'undefined') {
    if (_batch5.orbital_station) { _batch5.orbital_station.broken = false; _batch5.orbital_station.hp = 200;
      if (_batch5.orbital_station.windowMesh) _batch5.orbital_station.windowMesh.visible = true; }
    if (_batch5.lockdown) { _batch5.lockdown.lightsOut = false; _batch5.lockdown.hp = 80;
      if (_batch5.lockdown.fuseBox) _batch5.lockdown.fuseBox.visible = true;
      if (scene.fog) scene.fog.density = 0; }
    if (_batch5.opera) { _batch5.opera.falling = false; _batch5.opera.hit = false; _batch5.opera.hp = 60; _batch5.opera.vy = 0;
      if (_batch5.opera.chand) _batch5.opera.chand.position.y = 12; }
    if (_batch5.doomsday) {
      for (const d of _batch5.doomsday.debris) if (d.mesh) scene.remove(d.mesh);
      _batch5.doomsday.debris = []; _batch5.doomsday.debrisTimer = 2;
    }
    if (_batch5.biosphere) { _batch5.biosphere.t = 0; _batch5.biosphere.lastPhase = -1; }
  }
}

function buildBlankMap() {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshLambertMaterial({ color: 0x7a9e5f })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  blankMapGroup.add(ground);

  const grid = new THREE.GridHelper(100, 50, 0x4a7a3f, 0x4a7a3f);
  grid.position.y = 0.01;
  blankMapGroup.add(grid);

  const wallMat = new THREE.MeshLambertMaterial({ color: 0x8b7355 });
  [
    [100,4,1, 0,2,-50], [100,4,1, 0,2,50],
    [1,4,100,-50,2,0],  [1,4,100, 50,2,0],
  ].forEach(([w,h,d,x,y,z]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), wallMat);
    m.position.set(x,y,z); m.castShadow = true; m.receiveShadow = true;
    blankMapGroup.add(m);
    m.updateMatrixWorld(true);
    blankMapColliders.push(new THREE.Box3().setFromObject(m));
  });

  const cMat     = new THREE.MeshLambertMaterial({ color: 0xa0522d });
  const cMatDark = new THREE.MeshLambertMaterial({ color: 0x5c3317 });

  const wallDefs = [
    [  0, 1.5,  -8,  12, 3, 1.5, 0,            cMat ],
    [  0, 1.5,   8,  12, 3, 1.5, 0,            cMat ],
    [ -8, 1.5,   0, 1.5, 3,  12, 0,            cMat ],
    [  8, 1.5,   0, 1.5, 3,  12, 0,            cMat ],
    [-16, 1.5,   0,   8, 3,   2, 0,            cMatDark ],
    [ 16, 1.5,   0,   8, 3,   2, 0,            cMatDark ],
    [  0, 1.5, -16,   2, 3,   8, 0,            cMatDark ],
    [  0, 1.5,  16,   2, 3,   8, 0,            cMatDark ],
    [-22, 1.5, -22,  10, 3,   2, 0,            cMat ],
    [-22, 1.5,  22,  10, 3,   2, 0,            cMat ],
    [ 22, 1.5, -22,  10, 3,   2, 0,            cMat ],
    [ 22, 1.5,  22,  10, 3,   2, 0,            cMat ],
    [-25, 1.5, -19,   2, 3,   8, 0,            cMat ],
    [-25, 1.5,  19,   2, 3,   8, 0,            cMat ],
    [ 25, 1.5, -19,   2, 3,   8, 0,            cMat ],
    [ 25, 1.5,  19,   2, 3,   8, 0,            cMat ],
    [-12, 1.5,  12,   6, 3,   2,  Math.PI/4,   cMatDark ],
    [ 12, 1.5, -12,   6, 3,   2,  Math.PI/4,   cMatDark ],
    [-12, 1.5, -12,   6, 3,   2, -Math.PI/4,   cMatDark ],
    [ 12, 1.5,  12,   6, 3,   2, -Math.PI/4,   cMatDark ],
  ];

  wallDefs.forEach(([x,y,z,w,h,d,rot,mat]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.rotation.y = rot;
    m.castShadow = true; m.receiveShadow = true;
    blankMapGroup.add(m);
    m.updateMatrixWorld(true);
    blankMapColliders.push(new THREE.Box3().setFromObject(m));
  });

  const markerMat = new THREE.MeshLambertMaterial({ color: 0xdddddd });
  [[0,0],[10,10],[-10,-10],[10,-10],[-10,10]].forEach(([x,z]) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(1.2,1.2,0.05,16), markerMat);
    m.position.set(x,0.03,z); blankMapGroup.add(m);
  });
}

// ── Battlefield Map ──────────────────────────────────────────────────────────
// Layout: defenders (player + allies) in 4 bunkers at z≈24
//         barbed wire at z≈0 and z≈4
//         enemies attack from z≈-38
function buildBattlefieldMap() {
  const addBF = (x, y, z, w, h, d, mat, collide, rotY) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    if (rotY) m.rotation.y = rotY;
    battlefieldMapGroup.add(m);
    if (collide) { m.updateMatrixWorld(true); battlefieldMapColliders.push(new THREE.Box3().setFromObject(m)); }
  };

  // Ground (muddy green)
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100),
    new THREE.MeshLambertMaterial({ color: 0x5e7a3a }));
  ground.rotation.x = -Math.PI / 2;
  battlefieldMapGroup.add(ground);

  // Hill platform (visual: raised ground behind barbed wire)
  const hillMat = new THREE.MeshLambertMaterial({ color: 0x6a8a40 });
  addBF(0, 0.3, 22, 100, 0.6, 36, hillMat, false); // z=4 to z=40

  // Grid helper
  const grid = new THREE.GridHelper(100, 50, 0x3a5a22, 0x3a5a22);
  grid.position.y = 0.01;
  battlefieldMapGroup.add(grid);

  // Boundary walls (same footprint as blank map)
  const wallMat = new THREE.MeshLambertMaterial({ color: 0x4a3a20 });
  [
    [100,4,1, 0,2,-50], [100,4,1, 0,2,50],
    [1,4,100,-50,2,0],  [1,4,100, 50,2,0],
  ].forEach(([w,h,d,x,y,z]) => {
    addBF(x, y, z, w, h, d, wallMat, true);
  });

  // Hill front cliff wall at z=6 — with 3 ramp gaps at x=-20, 0, +20
  // Segments: x=-50 to -24, x=-16 to -4, x=+4 to +16, x=+24 to +50
  const cliffMat = new THREE.MeshLambertMaterial({ color: 0x4a3c24 });
  [
    [-37, 2.5, 6, 26, 5, 1],  // far left
    [-10, 2.5, 6, 12, 5, 1],  // center-left
    [+10, 2.5, 6, 12, 5, 1],  // center-right
    [+37, 2.5, 6, 26, 5, 1],  // far right
  ].forEach(([x,y,z,w,h,d]) => addBF(x, y, z, w, h, d, cliffMat, true));

  // Barbed wire — 2 rows before the hill
  const wireMat  = new THREE.MeshLambertMaterial({ color: 0x777777 });
  const postMat  = new THREE.MeshLambertMaterial({ color: 0x555555 });
  for (const wireZ of [-1, 3]) {
    for (let x = -48; x < 50; x += 4) {
      // Vertical post (with collider to slow bots)
      addBF(x, 0.7, wireZ, 0.14, 1.4, 0.14, postMat, true);
      // Upper wire (visual)
      addBF(x+2, 0.95, wireZ, 4, 0.04, 0.04, wireMat, false);
      // Lower wire (visual)
      addBF(x+2, 0.55, wireZ, 4, 0.04, 0.04, wireMat, false);
    }
  }

  // Bunker materials
  const concreteMat  = new THREE.MeshLambertMaterial({ color: 0x7a7a6a });
  const concreteRoof = new THREE.MeshLambertMaterial({ color: 0x5a5a52 });
  const sandbagMat   = new THREE.MeshLambertMaterial({ color: 0x8B7340 });
  const metalMat     = new THREE.MeshLambertMaterial({ color: 0x333333 });
  const woodMat2     = new THREE.MeshLambertMaterial({ color: 0x5a3010 });

  // ── 4 enclosed bunkers at x = -22, -7, +7, +22  (center z = 24) ──────────
  // Each bunker: concrete walls + roof + back door + front shooting slit
  //   Interior: 7 wide × 7 deep, walls 0.5 thick, height 2.6, roof 0.35
  //   Front wall: slit opening at y=1.25–1.65 (eye level)
  //   Back wall: door opening 2 wide × 2.2 tall, centred
  const BUNKER_XS = [-22, -7, 7, 22];
  const BZ = 24;
  BUNKER_XS.forEach(cx => {
    const fz = BZ - 3.75; // front wall centre z
    const bkz = BZ + 3.75; // back wall centre z

    // ── Front wall  (split into lower + upper to leave shooting slit) ──────
    addBF(cx, 0.625, fz, 8, 1.25, 0.5, concreteMat, true); // lower  y=0–1.25
    addBF(cx, 2.175, fz, 8, 0.95, 0.5, concreteMat, true); // upper  y=1.65–2.60

    // ── Side walls (full height, span front-to-back wall) ──────────────────
    addBF(cx - 4, 1.3, BZ, 0.5, 2.6, 8.5, concreteMat, true); // left
    addBF(cx + 4, 1.3, BZ, 0.5, 2.6, 8.5, concreteMat, true); // right

    // ── Back wall with door (door: 2 wide × 2.2 tall, centred) ────────────
    addBF(cx - 2.5, 1.3,  bkz, 3, 2.6, 0.5, concreteMat, true);  // left of door
    addBF(cx + 2.5, 1.3,  bkz, 3, 2.6, 0.5, concreteMat, true);  // right of door
    addBF(cx,       2.45, bkz, 2, 0.3, 0.5, concreteMat, false); // lintel — no collider (2D physics would block door)

    // ── Roof ────────────────────────────────────────────────────────────────
    addBF(cx, 2.775, BZ, 9, 0.35, 8.5, concreteRoof, false);

    // ── MG42 turret prop inside, aimed through slit ─────────────────────────
    const tg = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const ang = (i / 3) * Math.PI * 2;
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.85, 0.06), metalMat);
      leg.position.set(Math.cos(ang)*0.32, 0.42, Math.sin(ang)*0.32);
      tg.add(leg);
    }
    const tbody   = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.20, 0.68), metalMat);
    tbody.position.set(0, 0.98, 0);   tg.add(tbody);
    const tbarrel = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.75), metalMat);
    tbarrel.position.set(0, 0.98, -0.68); tg.add(tbarrel);
    const tjacket = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.45),
                     new THREE.MeshLambertMaterial({ color: 0x444444 }));
    tjacket.position.set(0, 0.98, -0.46); tg.add(tjacket);
    const tstock  = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.12, 0.28), woodMat2);
    tstock.position.set(0, 0.97, 0.38);   tg.add(tstock);
    const tdrum   = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.14, 0.26), metalMat);
    tdrum.position.set(0.24, 1.02, 0.04); tg.add(tdrum);
    tg.position.set(cx, 0, fz + 1.2); // inside bunker, behind slit
    tg.rotation.y = Math.PI;
    battlefieldMapGroup.add(tg);
  });

  // Scattered sandbag cover in the open field (enemy approach zone)
  const coverPositions = [
    [-18,-22], [-5,-28], [12,-18], [25,-30],
    [-30,-15], [8,-10], [-12,-32], [20,-12],
  ];
  coverPositions.forEach(([x, z]) => {
    // small L-shaped sandbag cover
    addBF(x,      0.5, z,   3, 1, 0.5, sandbagMat, true);
    addBF(x-1.75, 0.5, z+1, 0.5, 1, 2, sandbagMat, true);
  });
}

function buildRangeMap() {
  const addRM = (x, y, z, w, h, d, mat, collide) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    rangeMapGroup.add(m);
    m.castShadow = true; m.receiveShadow = true;
    if (collide) { m.updateMatrixWorld(true); rangeMapColliders.push(new THREE.Box3().setFromObject(m)); }
  };

  // Floor — concrete/tan
  const floorMat = new THREE.MeshLambertMaterial({ color: 0xb8a88a });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 90), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  rangeMapGroup.add(floor);

  // Faint grid
  const grid = new THREE.GridHelper(90, 45, 0x999080, 0x999080);
  grid.position.y = 0.02;
  rangeMapGroup.add(grid);

  // Wall materials
  const wallMat  = new THREE.MeshLambertMaterial({ color: 0x7a7060 });
  const bermMat  = new THREE.MeshLambertMaterial({ color: 0x4a7a30 });
  const roofMat  = new THREE.MeshLambertMaterial({ color: 0x555045 });
  const divMat   = new THREE.MeshLambertMaterial({ color: 0x9a8a70 });

  // Outer side walls x=±20
  addRM(-20, 2, 0,  1, 4, 90, wallMat, true);
  addRM( 20, 2, 0,  1, 4, 90, wallMat, true);
  // Back wall behind shooter z=45
  addRM(0, 2, 45, 40, 4, 1, wallMat, true);
  // Safety berm at back z=-42, tall green earth wall
  addRM(0, 3, -42, 40, 6, 4, bermMat, true);

  // Shooter canopy roof (visual only) — covers z=38 to 45, y=3.0
  const canopyMesh = new THREE.Mesh(new THREE.BoxGeometry(40, 0.3, 7), roofMat);
  canopyMesh.position.set(0, 3.0, 41.5);
  rangeMapGroup.add(canopyMesh);

  // Lane dividers — half-walls at x=-12, 0, +12, z from -10 to z=26, h=1.5 (visual only)
  [-12, 0, 12].forEach(lx => {
    const dm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.5, 36), divMat);
    dm.position.set(lx, 0.75, 8);
    rangeMapGroup.add(dm);
  });

  // Distance marker bands on floor
  const markerColors = [0x44cc88, 0x4488cc, 0xcc8844, 0xcc4444];
  const markerZs     = [28, 18, 8, -2];
  markerZs.forEach((mz, i) => {
    const mm = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 0.4),
      new THREE.MeshLambertMaterial({ color: markerColors[i] })
    );
    mm.rotation.x = -Math.PI / 2;
    mm.position.set(0, 0.02, mz);
    rangeMapGroup.add(mm);
  });
}

function buildRangeTargetMesh() {
  const group = new THREE.Group();

  // Pole
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6), poleMat);
  pole.position.set(0, 1.1, 0);
  group.add(pole);

  // Base
  const baseMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.5), baseMat);
  base.position.set(0, 0.04, 0);
  group.add(base);

  // Board (white backing)
  const boardMat = new THREE.MeshLambertMaterial({ color: 0xf5f5f5 });
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.05), boardMat);
  board.position.set(0, 2.0, 0);
  group.add(board);

  // Bullseye rings — using flat discs (CylinderGeometry rotated x=PI/2)
  const rings = [
    { r: 0.30, color: 0xcc2222, z: -0.035 },
    { r: 0.20, color: 0x2244cc, z: -0.038 },
    { r: 0.09, color: 0xffdd00, z: -0.040 },
  ];
  rings.forEach(({ r, color, z }) => {
    const rm = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, 0.06, 16),
      new THREE.MeshLambertMaterial({ color })
    );
    rm.rotation.x = Math.PI / 2;
    rm.position.set(0, 2.0, z);
    group.add(rm);
  });

  return group;
}

// ──────────────────────────────────────────────────────────────────────────
// 8 NEW MAPS — each with theme, layout, and gimmicks
// ──────────────────────────────────────────────────────────────────────────

// Shared helper: add a wall/prop to a map and register its collider
function addMapBox(mapName, x, y, z, w, h, d, color, rotY = 0, opacity = 1) {
  const mat = new THREE.MeshLambertMaterial({ color, transparent: opacity < 1, opacity });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  if (rotY) m.rotation.y = rotY;
  MAP_GROUPS[mapName].add(m);
  m.updateMatrixWorld(true);
  MAP_COLLIDERS[mapName].push(new THREE.Box3().setFromObject(m));
  return m;
}
function addMapMesh(mapName, mesh, collide = false) {
  MAP_GROUPS[mapName].add(mesh);
  if (collide) {
    mesh.updateMatrixWorld(true);
    MAP_COLLIDERS[mapName].push(new THREE.Box3().setFromObject(mesh));
  }
}
function addMapGround(mapName, color, gridColor) {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshLambertMaterial({ color }));
  ground.rotation.x = -Math.PI / 2;
  MAP_GROUPS[mapName].add(ground);
  if (gridColor != null) {
    const grid = new THREE.GridHelper(100, 50, gridColor, gridColor);
    grid.position.y = 0.01;
    MAP_GROUPS[mapName].add(grid);
  }
}
function addOuterWalls(mapName, color) {
  [[100,4,1,0,2,-50],[100,4,1,0,2,50],[1,4,100,-50,2,0],[1,4,100,50,2,0]].forEach(([w,h,d,x,y,z]) => {
    addMapBox(mapName, x, y, z, w, h, d, color);
  });
}
function addJumpPad(mapName, x, z, r = 1.5, vel = 14, color = 0xffcc22) {
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r * 0.9, 0.15, 16), new THREE.MeshBasicMaterial({ color }));
  pad.position.set(x, 0.08, z);
  MAP_GROUPS[mapName].add(pad);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.08, 4, 20), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  ring.rotation.x = Math.PI / 2;
  ring.position.set(x, 0.16, z);
  MAP_GROUPS[mapName].add(ring);
  MAP_GIMMICKS[mapName].jumpPads.push({ x, z, r, vel });
}
function addSlickZone(mapName, x, z, r, color = 0x111111) {
  const slick = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, 0.04, 22),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.62 })
  );
  slick.position.set(x, 0.035, z);
  MAP_GROUPS[mapName].add(slick);
  MAP_GIMMICKS[mapName].oilZones.push({ x, z, r });
}
function addExplosiveBarrel(mapName, x, z, color = 0xb52b20) {
  const barrel = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.25, 14), new THREE.MeshLambertMaterial({ color }));
  body.position.y = 0.72;
  barrel.add(body);
  const bandMat = new THREE.MeshBasicMaterial({ color: 0xffcc33 });
  [-0.34, 0.34].forEach(y => {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.63, 0.035, 5, 14), bandMat);
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.72 + y;
    barrel.add(band);
  });
  barrel.position.set(x, 0, z);
  MAP_GROUPS[mapName].add(barrel);
  barrel.updateMatrixWorld(true);
  MAP_COLLIDERS[mapName].push(new THREE.Box3().setFromObject(barrel));
  mapDestructibles.push({
    mesh: barrel, hp: 60, maxHp: 60, type: 'explosive_barrel', mapName,
    colliderRef: MAP_COLLIDERS[mapName][MAP_COLLIDERS[mapName].length - 1],
    onDestroy: () => {
      spawnAbilityAOEFX(new THREE.Vector3(x, 0.5, z), 7, 0xff7722);
      flashScreen('rgba(255,120,20,0.35)', 450);
      for (const bot of gameBots) {
        if (bot.dead) continue;
        const dx = bot.x - x, dz = bot.z - z;
        if (dx*dx + dz*dz < 49) {
          const mesh = remoteMeshes[bot.id];
          const hp = mesh ? mesh.position.clone().setY(1.0) : new THREE.Vector3(bot.x, 1, bot.z);
          emitHit(bot.id, `barrel_${Date.now()}_${bot.id}`, 'explosive_barrel', hp);
        }
      }
      const pdx = camera.position.x - x, pdz = camera.position.z - z;
      if (pdx*pdx + pdz*pdz < 49) applyBotDamageToPlayer('explosive_barrel', null);
    },
  });
}

// ──────────────────────────────────────────────────────────────────────────
// 1. URBAN PLAZA — buildings as corner cover, cars as low cover in plaza
// ──────────────────────────────────────────────────────────────────────────
registerMap('urban');
function buildUrbanMap() {
  const m = 'urban';
  addMapGround(m, 0x6b6b6b, 0x4a4a4a); // asphalt grey
  addOuterWalls(m, 0x5a5a5a);
  // Sidewalks
  addMapBox(m, 0, 0.05, -25, 50, 0.10, 6, 0x9a9a9a);
  addMapBox(m, 0, 0.05,  25, 50, 0.10, 6, 0x9a9a9a);
  // 4 hollow corner skyscrapers with roof access
  const bldg = 0x8b6f4e;
  const roofMat = 0x6d563a;
  const stairMat = 0x7c6750;
  const wnd  = 0x44ddff;
  const addUrbanSkyscraper = (x, z) => {
    const size = 14, half = size / 2, wallT = 0.9, height = 10;
    const innerZ = z < 0 ? z + half - wallT / 2 : z - half + wallT / 2;
    const outerZ = z < 0 ? z - half + wallT / 2 : z + half - wallT / 2;
    addMapBox(m, x, 5, outerZ, size, height, wallT, bldg);
    addMapBox(m, x - 4.4, 5, innerZ, 3.4, height, wallT, bldg);
    addMapBox(m, x + 4.4, 5, innerZ, 3.4, height, wallT, bldg);
    addMapBox(m, x - half + wallT / 2, 5, z, wallT, height, size, bldg);
    addMapBox(m, x + half - wallT / 2, 5, z, wallT, height, size, bldg);
    addMapBox(m, x, height + 0.15, z, size, 0.3, size, roofMat);
    // Windows (purely visual)
    for (let i = -1; i <= 1; i++) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(2, 1.4, 0.1), new THREE.MeshBasicMaterial({ color: wnd }));
      w.position.set(x + i * 4, 3, z + (z < 0 ? 7.05 : -7.05));
      MAP_GROUPS[m].add(w);
    }
    const dirX = x < 0 ? 1 : -1;
    const dirZ = z < 0 ? 1 : -1;
    const steps = 24;
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const stepH = 0.35 + t * 9.9;
      const sx = x;
      const sz = z + dirZ * (half + 11.2 - i * 0.42);
      addMapBox(m, sx, stepH / 2, sz, 3.2, stepH, 0.75, stairMat);
    }
    const landingX = x;
    const landingZ = z + dirZ * (half + 0.7);
    addMapBox(m, landingX, height + 0.05, landingZ, 3.2, 0.2, 3.2, stairMat);
  };
  [[-32,-32],[32,-32],[-32,32],[32,32]].forEach(([x,z]) => addUrbanSkyscraper(x,z));
  // Cars as low cover scattered in plaza
  const carMat = new THREE.MeshLambertMaterial({ color: 0x4a8aff });
  [[-10,-5,0],[10,5,0.5],[0,12,-0.3],[-12,15,1],[14,-10,0],[6,-15,0.5]].forEach(([x,z,rot]) => {
    addMapBox(m, x, 0.8, z, 2.4, 1.5, 4.5, 0x4a8aff, rot);
  });
  // Lamp posts (decorative)
  [[-20,-20],[20,-20],[-20,20],[20,20]].forEach(([x,z]) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 4, 6), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    post.position.set(x, 2, z); MAP_GROUPS[m].add(post);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff6bf }));
    lamp.position.set(x, 4.1, z); MAP_GROUPS[m].add(lamp);
  });
  // Sky tint — urban smoggy sky
  MAP_GROUPS[m]._skyColor = 0x9eaab8;
}
buildUrbanMap();

// ──────────────────────────────────────────────────────────────────────────
// 2. WAREHOUSE — crates and pipes, narrow lanes, central open
// ──────────────────────────────────────────────────────────────────────────
registerMap('warehouse');
function buildWarehouseMap() {
  const m = 'warehouse';
  addMapGround(m, 0x5a5550, null);
  addOuterWalls(m, 0x44403a);
  // Concrete floor stripes
  for (let i = -40; i <= 40; i += 10) {
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(80, 0.3), new THREE.MeshBasicMaterial({ color: 0xddcc22 }));
    stripe.rotation.x = -Math.PI / 2; stripe.position.set(0, 0.02, i);
    MAP_GROUPS[m].add(stripe);
  }
  // Stacked crates (wood + metal)
  const wood = 0x8b5a2b, metal = 0x778899;
  const cratePositions = [
    [-25,-15,2],[-25,-12,4],[-23,-15,2],
    [25,-15,2],[25,-12,4],[23,-15,2],
    [-25,15,2],[-25,12,4],
    [25,15,2],[23,12,4],
    [-15,0,2],[-12,2,2],[0,-25,2],[0,25,2],
    [12,2,2],[15,0,2],
    [-8,-8,3],[8,-8,3],[-8,8,3],[8,8,3],
  ];
  cratePositions.forEach(([x,z,size]) => {
    addMapBox(m, x, size/2, z, size, size, size, x % 2 === 0 ? wood : metal);
  });
  // Pipe rows (low cover, vertical)
  for (let i = 0; i < 6; i++) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 50, 8), new THREE.MeshLambertMaterial({ color: 0x999999 }));
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(0, 4 + i * 0.3, -35 + i * 8);
    MAP_GROUPS[m].add(pipe);
  }
  // Forklift-style obstacles
  addMapBox(m, -18, 1, 0, 3, 2, 5, 0xddaa22);
  addMapBox(m,  18, 1, 0, 3, 2, 5, 0xddaa22);
  MAP_GROUPS[m]._skyColor = 0x666b78;
}
buildWarehouseMap();

// ──────────────────────────────────────────────────────────────────────────
// 3. FOREST CLEARING — trees as cover, mostly open
// ──────────────────────────────────────────────────────────────────────────
registerMap('forest');
function buildForestMap() {
  const m = 'forest';
  addMapGround(m, 0x3a7a2f, null); // grass green
  // No outer walls (open feel) but invisible boundary walls
  addOuterWalls(m, 0x2a4a1f);
  // Trees: cylindrical trunk + conical foliage cluster
  const treeMat = new THREE.MeshLambertMaterial({ color: 0x4a2e0e });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x1f5a1f });
  const treePositions = [
    [-30,-30],[-20,-25],[-25,-10],[-30,5],[-20,20],[-25,30],
    [30,-30],[20,-25],[25,-10],[30,5],[20,20],[25,30],
    [0,-25],[0,25],[-10,-15],[10,15],[-15,10],[15,-10],
    [-5,5],[5,-5],[-12,0],[12,0],
  ];
  treePositions.forEach(([x,z]) => {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 3.5, 8), treeMat);
    trunk.position.set(x, 1.75, z);
    MAP_GROUPS[m].add(trunk);
    trunk.updateMatrixWorld(true);
    MAP_COLLIDERS[m].push(new THREE.Box3().setFromObject(trunk));
    // 3 stacked cone foliage
    for (let i = 0; i < 3; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.6 - i * 0.4, 1.5, 8), leafMat);
      leaf.position.set(x, 3.5 + i * 0.8, z);
      MAP_GROUPS[m].add(leaf);
    }
  });
  // Rocks as low cover
  const rockMat = new THREE.MeshLambertMaterial({ color: 0x808080 });
  [[-8,8],[8,-8],[-15,15],[15,-15],[0,12],[0,-12]].forEach(([x,z]) => {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2, 0), rockMat);
    rock.position.set(x, 0.6, z); rock.rotation.set(Math.random(), Math.random(), Math.random());
    MAP_GROUPS[m].add(rock);
    rock.updateMatrixWorld(true);
    MAP_COLLIDERS[m].push(new THREE.Box3().setFromObject(rock));
  });
  MAP_GROUPS[m]._skyColor = 0x6fb2dd;
}
buildForestMap();

// ──────────────────────────────────────────────────────────────────────────
// 4. VOLCANO — rocky terrain with LAVA DAMAGE ZONES (4 dmg/sec when standing)
// ──────────────────────────────────────────────────────────────────────────
registerMap('volcano');
function buildVolcanoMap() {
  const m = 'volcano';
  addMapGround(m, 0x3a2418, null); // dark volcanic rock
  addOuterWalls(m, 0x1f1208);
  // Lava pools (visual + gimmick)
  const lavaMat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
  const lavaPools = [[-15, -10, 4], [15, 12, 5], [0, 20, 4.5], [-22, 25, 3.5], [22, -22, 4]];
  lavaPools.forEach(([x, z, r]) => {
    const lava = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.12, 16), lavaMat);
    lava.position.set(x, 0.06, z);
    MAP_GROUPS[m].add(lava);
    // Glowing ring around it
    const glow = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.4, 24), new THREE.MeshBasicMaterial({ color: 0xff8822, side: THREE.DoubleSide, transparent: true, opacity: 0.6 }));
    glow.rotation.x = -Math.PI / 2; glow.position.set(x, 0.07, z);
    MAP_GROUPS[m].add(glow);
    // Register as damage zone
    MAP_GIMMICKS[m].damageZones.push({ x, z, r, dps: 4, type: 'lava' });
  });
  // Black rock spires for cover
  const rockMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  [[-8,-8],[8,-8],[-8,8],[8,8],[-20,0],[20,0],[0,-30],[0,30],[-15,15],[15,-15]].forEach(([x,z]) => {
    const spire = new THREE.Mesh(new THREE.ConeGeometry(1.6, 4.5, 6), rockMat);
    spire.position.set(x, 2.25, z);
    MAP_GROUPS[m].add(spire);
    spire.updateMatrixWorld(true);
    MAP_COLLIDERS[m].push(new THREE.Box3().setFromObject(spire));
  });
  // Central volcano in the middle (decorative)
  const cone = new THREE.Mesh(new THREE.ConeGeometry(5, 8, 12), new THREE.MeshLambertMaterial({ color: 0x1a0e08 }));
  cone.position.set(0, 4, 0);
  MAP_GROUPS[m].add(cone);
  cone.updateMatrixWorld(true);
  MAP_COLLIDERS[m].push(new THREE.Box3().setFromObject(cone));
  // Lava in volcano crater
  const crater = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 0.5, 12), lavaMat);
  crater.position.set(0, 8, 0); MAP_GROUPS[m].add(crater);
  MAP_GROUPS[m]._skyColor = 0x4a1808;
}
buildVolcanoMap();

// ──────────────────────────────────────────────────────────────────────────
// 5. CYBER ALLEY — neon city with JUMP PADS
// ──────────────────────────────────────────────────────────────────────────
registerMap('cyber');
function buildCyberMap() {
  const m = 'cyber';
  addMapGround(m, 0x0a0a18, 0x223344);
  addOuterWalls(m, 0x0a0a30);
  // Neon-lit buildings forming alleys
  const wallColors = [0x1a1a44, 0x2a1a44, 0x1a2a44];
  const wallDefs = [
    [-20, 3, -20, 12, 6, 12], [20, 3, -20, 12, 6, 12],
    [-20, 3, 20, 12, 6, 12], [20, 3, 20, 12, 6, 12],
    [0, 3, -30, 8, 6, 6], [0, 3, 30, 8, 6, 6],
  ];
  wallDefs.forEach(([x,y,z,w,h,d], i) => {
    addMapBox(m, x, y, z, w, h, d, wallColors[i % wallColors.length]);
  });
  // Neon strips (visual only)
  const neonColors = [0xff00ff, 0x00ffff, 0xffff00, 0xff0088];
  for (let i = 0; i < 16; i++) {
    const c = neonColors[i % 4];
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4, 0.3), new THREE.MeshBasicMaterial({ color: c }));
    const angle = (i / 16) * Math.PI * 2;
    strip.position.set(Math.cos(angle) * 32, 2, Math.sin(angle) * 32);
    MAP_GROUPS[m].add(strip);
  }
  // Jump pads (gimmick)
  const padMat = new THREE.MeshBasicMaterial({ color: 0xffcc22 });
  [[-10, 0], [10, 0], [0, -10], [0, 10]].forEach(([x, z]) => {
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.15, 14), padMat);
    pad.position.set(x, 0.08, z);
    MAP_GROUPS[m].add(pad);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.08, 4, 18), new THREE.MeshBasicMaterial({ color: 0xff8800 }));
    ring.rotation.x = Math.PI / 2; ring.position.set(x, 0.15, z);
    MAP_GROUPS[m].add(ring);
    MAP_GIMMICKS[m].jumpPads.push({ x, z, r: 1.5, vel: 14 });
  });
  MAP_GROUPS[m]._skyColor = 0x110030;
}
buildCyberMap();

// ──────────────────────────────────────────────────────────────────────────
// 6. DESERT RUINS — sandy + scattered broken pillars
// ──────────────────────────────────────────────────────────────────────────
registerMap('desert');
function buildDesertMap() {
  const m = 'desert';
  addMapGround(m, 0xd4b078, null); // sand
  addOuterWalls(m, 0x8a6638);
  // Sand-tone walls (low)
  const sand1 = 0xa8856a, sand2 = 0x6e553a;
  // Broken pillars (varying heights)
  const pillarPositions = [
    [-22, -15, 5], [22, -15, 4], [-22, 15, 5], [22, 15, 6],
    [0, -25, 3.5], [0, 25, 4], [-15, 0, 5], [15, 0, 4.5],
    [-10, -10, 3], [10, 10, 3.5], [10, -10, 4], [-10, 10, 3],
  ];
  pillarPositions.forEach(([x, z, h]) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, h, 8), new THREE.MeshLambertMaterial({ color: sand1 }));
    p.position.set(x, h/2, z); MAP_GROUPS[m].add(p);
    p.updateMatrixWorld(true);
    MAP_COLLIDERS[m].push(new THREE.Box3().setFromObject(p));
  });
  // Crumbled walls (low cover)
  [[-12, 5, 6], [12, -5, 6], [5, 12, 4], [-5, -12, 4]].forEach(([x, z, w]) => {
    addMapBox(m, x, 1.0, z, w, 2, 1.2, sand2);
  });
  // Sand dunes (large gentle bumps - just visual)
  for (let i = 0; i < 6; i++) {
    const dune = new THREE.Mesh(new THREE.SphereGeometry(4, 8, 4, 0, Math.PI*2, 0, Math.PI/2), new THREE.MeshLambertMaterial({ color: 0xc8a065 }));
    dune.position.set((Math.random()-0.5)*60, 0, (Math.random()-0.5)*60);
    dune.scale.y = 0.4;
    MAP_GROUPS[m].add(dune);
  }
  MAP_GROUPS[m]._skyColor = 0xeed098;
}
buildDesertMap();

// ──────────────────────────────────────────────────────────────────────────
// 7. SNOW TUNDRA — frozen with SLIPPERY ICE PATCHES
// ──────────────────────────────────────────────────────────────────────────
registerMap('tundra');
function buildTundraMap() {
  const m = 'tundra';
  addMapGround(m, 0xe8eef8, null); // snow white
  addOuterWalls(m, 0x88a0bb);
  // Snow drifts as low cover (rounded shapes)
  const snow = 0xddeaee, dark = 0x556677;
  [[-12,-8],[12,-8],[-12,8],[12,8],[0,-18],[0,18],[-18,0],[18,0]].forEach(([x,z]) => {
    const drift = new THREE.Mesh(new THREE.SphereGeometry(1.8, 8, 5, 0, Math.PI*2, 0, Math.PI/2), new THREE.MeshLambertMaterial({ color: snow }));
    drift.scale.y = 0.7; drift.position.set(x, 0, z); MAP_GROUPS[m].add(drift);
    drift.updateMatrixWorld(true);
    MAP_COLLIDERS[m].push(new THREE.Box3().setFromObject(drift));
  });
  // Frozen logs / wreckage
  [[-22, 5], [22, -5], [-5, -22], [5, 22]].forEach(([x,z]) => {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 4, 8), new THREE.MeshLambertMaterial({ color: dark }));
    log.rotation.z = Math.PI/2; log.position.set(x, 0.6, z); MAP_GROUPS[m].add(log);
    log.updateMatrixWorld(true);
    MAP_COLLIDERS[m].push(new THREE.Box3().setFromObject(log));
  });
  // Ice patches (gimmick — slippery, no friction)
  const iceMat = new THREE.MeshBasicMaterial({ color: 0xa0d8ff, transparent: true, opacity: 0.55 });
  [[-8, -8, 4], [8, 8, 5], [0, 0, 6], [-15, 15, 3.5], [15, -15, 3.5]].forEach(([x,z,r]) => {
    const ice = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.05, 16), iceMat);
    ice.position.set(x, 0.04, z); MAP_GROUPS[m].add(ice);
    MAP_GIMMICKS[m].iceZones.push({ x, z, r });
  });
  MAP_GROUPS[m]._skyColor = 0xc2d4e4;
}
buildTundraMap();

// ──────────────────────────────────────────────────────────────────────────
// 8. SPACE STATION — sci-fi with LOW-GRAVITY ZONES
// ──────────────────────────────────────────────────────────────────────────
registerMap('space');
function buildSpaceMap() {
  const m = 'space';
  addMapGround(m, 0x111122, 0x334466);
  addOuterWalls(m, 0x223344);
  // Sci-fi panel walls
  const panel1 = 0x334466, panel2 = 0x556688;
  const wallDefs = [
    [-15, 2, -10, 8, 4, 1], [15, 2, -10, 8, 4, 1],
    [-15, 2, 10, 8, 4, 1], [15, 2, 10, 8, 4, 1],
    [-1, 2, -22, 1, 4, 10], [1, 2, 22, 1, 4, 10],
    [-22, 2, 0, 1, 4, 8], [22, 2, 0, 1, 4, 8],
  ];
  wallDefs.forEach(([x,y,z,w,h,d], i) => {
    addMapBox(m, x, y, z, w, h, d, i % 2 === 0 ? panel1 : panel2);
    // Glowing trim
    const trim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.05, 0.15, d + 0.05), new THREE.MeshBasicMaterial({ color: 0x44ddff }));
    trim.position.set(x, y + h/2 + 0.05, z); MAP_GROUPS[m].add(trim);
  });
  // Low-gravity zones (gimmick — you jump higher / fall slower)
  const gravMat = new THREE.MeshBasicMaterial({ color: 0xaa44ff, transparent: true, opacity: 0.18, side: THREE.DoubleSide });
  [[-10, -10, 4], [10, 10, 4], [0, 0, 5]].forEach(([x,z,r]) => {
    const zone = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 6, 12), gravMat);
    zone.position.set(x, 3, z); MAP_GROUPS[m].add(zone);
    // Bottom indicator ring
    const ring = new THREE.Mesh(new THREE.RingGeometry(r * 0.95, r, 18), new THREE.MeshBasicMaterial({ color: 0xaa44ff, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI/2; ring.position.set(x, 0.04, z); MAP_GROUPS[m].add(ring);
    MAP_GIMMICKS[m].lowGravZones.push({ x, z, r });
  });
  // Holographic stars (visual)
  for (let i = 0; i < 30; i++) {
    const star = new THREE.Mesh(new THREE.SphereGeometry(0.08, 4, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    star.position.set((Math.random()-0.5)*80, 5 + Math.random()*15, (Math.random()-0.5)*80);
    MAP_GROUPS[m].add(star);
  }
  MAP_GROUPS[m]._skyColor = 0x000010;
}
buildSpaceMap();

// ──────────────────────────────────────────────────────────────────────────
// SPECIAL MAP MECHANIC STATE
// ──────────────────────────────────────────────────────────────────────────
const mapDestructibles = []; // [{ mesh, hp, maxHp, type, mapName, onDestroy }]
const mapMortars       = []; // [{ mesh, ammo, maxAmmo, hp, x, z, pilotedBy: null|'player'|botId, side }]
let airportLightLevel  = 1.0; // 1=full bright, 0=pitch black — controlled by airport map
let chernobylGasActive = false; // when true, player takes 1 dmg/sec
let lastChernobylTick  = 0;

// ──────────────────────────────────────────────────────────────────────────
// 9. AIRPORT — bright lights + breakable glass; gets darker as lights go out
// ──────────────────────────────────────────────────────────────────────────
registerMap('airport');
function buildAirportMap() {
  const m = 'airport';
  addMapGround(m, 0xeeeeee, 0xaaaaaa); // pale terminal floor
  addOuterWalls(m, 0xcccccc);
  // Terminal walls — high glass panels mixed with structural columns
  const wallMat = new THREE.MeshLambertMaterial({ color: 0xdddde2 });
  // Outer terminal structure
  [[-30,3,0,2,6,40],[30,3,0,2,6,40],[0,3,-30,40,6,2],[0,3,30,40,6,2]].forEach(([x,y,z,w,h,d]) => {
    addMapBox(m, x, y, z, w, h, d, 0xcccccc);
  });
  // Structural support columns
  for (let i = -25; i <= 25; i += 12.5) {
    [[i, -25], [i, 25]].forEach(([cx, cz]) => {
      const col = new THREE.Mesh(new THREE.BoxGeometry(1.2, 8, 1.2), wallMat);
      col.position.set(cx, 4, cz);
      MAP_GROUPS[m].add(col);
      col.updateMatrixWorld(true);
      MAP_COLLIDERS[m].push(new THREE.Box3().setFromObject(col));
    });
  }
  // ── Breakable glass panels (between columns) ──
  const glassMat = new THREE.MeshBasicMaterial({ color: 0x88ccee, transparent: true, opacity: 0.45 });
  const glassPositions = [];
  for (let i = -19; i <= 19; i += 12.5) {
    glassPositions.push([i, 4, -25, 11, 7, 0.15]);
    glassPositions.push([i, 4,  25, 11, 7, 0.15]);
  }
  glassPositions.forEach(([x, y, z, w, h, d]) => {
    const g = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), glassMat);
    g.position.set(x, y, z);
    MAP_GROUPS[m].add(g);
    g.updateMatrixWorld(true);
    MAP_COLLIDERS[m].push(new THREE.Box3().setFromObject(g));
    mapDestructibles.push({
      mesh: g, hp: 30, maxHp: 30, type: 'glass', mapName: 'airport',
      colliderRef: MAP_COLLIDERS[m][MAP_COLLIDERS[m].length - 1],
    });
  });
  // ── Breakable overhead lights ──
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffcc });
  const lightPositions = [];
  for (let i = -22; i <= 22; i += 11) {
    for (let j = -16; j <= 16; j += 8) {
      lightPositions.push([i, 5.5, j]);
    }
  }
  lightPositions.forEach(([x, y, z]) => {
    const l = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.2, 0.5), lightMat);
    l.position.set(x, y, z);
    MAP_GROUPS[m].add(l);
    mapDestructibles.push({
      mesh: l, hp: 5, maxHp: 5, type: 'airport_light', mapName: 'airport',
      onDestroy: () => {
        // Each broken light darkens the map slightly
        airportLightLevel = Math.max(0.1, airportLightLevel - 1 / lightPositions.length);
      },
    });
  });
  // Baggage carousels / luggage as low cover
  const lugMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  [[0,-5,4,1.4,5], [0,5,4,1.4,5], [-12,0,5,1.2,3], [12,0,5,1.2,3]].forEach(([x,z,w,h,d]) => {
    addMapBox(m, x, h/2, z, w, h, d, 0x444444);
    addMapBox(m, x, h+0.05, z, w*1.05, 0.10, d*1.05, 0x666666); // top trim
  });
  // Check-in counter rows
  [-14, 14].forEach(x => {
    addMapBox(m, x, 0.6, 0, 2, 1.2, 14, 0x884422);
  });
  MAP_GROUPS[m]._skyColor = 0xddeeff;
}
buildAirportMap();

// ──────────────────────────────────────────────────────────────────────────
// 10. MILITARY TRENCH FIELD — hills, barbed wire, trenches, crates, mortars
// ──────────────────────────────────────────────────────────────────────────
registerMap('trenches');
function buildTrenchesMap() {
  const m = 'trenches';
  addMapGround(m, 0x6b5a3a, null); // muddy dirt
  addOuterWalls(m, 0x3a2a18);
  // Hills (raised mounds across the middle)
  for (let i = 0; i < 8; i++) {
    const hill = new THREE.Mesh(new THREE.SphereGeometry(4, 8, 5, 0, Math.PI*2, 0, Math.PI/2), new THREE.MeshLambertMaterial({ color: 0x7a6940 }));
    hill.position.set((Math.random()-0.5)*35, 0, (Math.random()-0.5)*15);
    hill.scale.y = 0.4 + Math.random() * 0.3;
    MAP_GROUPS[m].add(hill);
  }
  // Barbed wire (decorative + low cover) — 3 horizontal lines down the middle (along X axis)
  const wireMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
  for (let row = -1; row <= 1; row++) {
    const x0 = row * 3;
    for (let zi = -20; zi <= 20; zi += 4) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 6), wireMat);
      post.position.set(x0, 0.6, zi); MAP_GROUPS[m].add(post);
    }
    const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 40, 4), wireMat);
    wire.rotation.x = Math.PI/2; wire.position.set(x0, 0.9, 0); MAP_GROUPS[m].add(wire);
  }
  // Trenches (carved-out long strips on north and south — run East-West along X axis)
  const trenchMat = new THREE.MeshLambertMaterial({ color: 0x3a2a18 });
  [[0, -35], [0, 35]].forEach(([x, z]) => {
    const trench = new THREE.Mesh(new THREE.BoxGeometry(40, 0.5, 8), trenchMat);
    trench.position.set(x, -0.20, z); MAP_GROUPS[m].add(trench);
    // Sandbag walls along the inside edge (facing no-man's-land)
    const sandMat = new THREE.MeshLambertMaterial({ color: 0x8a7440 });
    for (let xi = -18; xi <= 18; xi += 2.5) {
      const bag = new THREE.Mesh(new THREE.SphereGeometry(0.6, 6, 5), sandMat);
      bag.scale.y = 0.5;
      bag.position.set(xi, 0.6, z + (z < 0 ? 4 : -4));
      MAP_GROUPS[m].add(bag);
      bag.updateMatrixWorld(true);
      MAP_COLLIDERS[m].push(new THREE.Box3().setFromObject(bag));
    }
  });
  // Wooden crates in the center for cover
  const crateMat = new THREE.MeshLambertMaterial({ color: 0x8a5a2a });
  [[-6, 0], [6, 0], [0, -6], [0, 6], [-3, 3], [3, -3]].forEach(([x, z]) => {
    const c = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), crateMat);
    c.position.set(x, 1, z); MAP_GROUPS[m].add(c);
    c.updateMatrixWorld(true);
    MAP_COLLIDERS[m].push(new THREE.Box3().setFromObject(c));
  });
  // ── Mortar emplacements (2 per side) ──
  const mortarBase = new THREE.MeshLambertMaterial({ color: 0x444444 });
  const mortarTube = new THREE.MeshLambertMaterial({ color: 0x222222 });
  // Mortars sit behind each trench (at z=±38, in line with the trench)
  [
    { x: -10, z:  38, side: 'ally'  }, // south trench (player side)
    { x:  10, z:  38, side: 'ally'  },
    { x: -10, z: -38, side: 'enemy' }, // north trench
    { x:  10, z: -38, side: 'enemy' },
  ].forEach(({ x, z, side }) => {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.0, 0.3, 8), mortarBase);
    base.position.y = 0.15; g.add(base);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.2, 8), mortarTube);
    tube.rotation.x = side === 'ally' ? -0.5 : -0.5; tube.position.set(0, 0.7, 0); g.add(tube);
    g.position.set(x, 0, z);
    MAP_GROUPS[m].add(g);
    g.updateMatrixWorld(true);
    MAP_COLLIDERS[m].push(new THREE.Box3().setFromObject(g));
    mapMortars.push({ mesh: g, x, z, side, ammo: 5, maxAmmo: 5, hp: 20, maxHp: 20, pilotedBy: null, lastShot: 0, mapName: 'trenches' });
  });
  MAP_GROUPS[m]._skyColor = 0x6b6b4b;
}
buildTrenchesMap();

// ──────────────────────────────────────────────────────────────────────────
// 11. CHERNOBYL SITE — toxic green gas, 4 destroyable reactors
// ──────────────────────────────────────────────────────────────────────────
registerMap('chernobyl');
function buildChernobylMap() {
  const m = 'chernobyl';
  addMapGround(m, 0x2a3a22, null); // contaminated soil
  addOuterWalls(m, 0x1a2a18);
  // Toxic green fog layer covering the whole map (ground level wisps)
  const gasMat = new THREE.MeshBasicMaterial({ color: 0x44aa22, transparent: true, opacity: 0.18 });
  for (let i = 0; i < 12; i++) {
    const g = new THREE.Mesh(new THREE.SphereGeometry(8, 10, 6), gasMat);
    g.position.set((Math.random()-0.5)*80, 1.5, (Math.random()-0.5)*80);
    g.scale.y = 0.4;
    MAP_GROUPS[m].add(g);
  }
  // Concrete blocks scattered as cover
  const concMat = new THREE.MeshLambertMaterial({ color: 0x666666 });
  for (let i = 0; i < 14; i++) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(2, 2.5, 2), concMat);
    c.position.set((Math.random()-0.5)*60, 1.25, (Math.random()-0.5)*60);
    c.rotation.y = Math.random() * Math.PI;
    MAP_GROUPS[m].add(c);
    c.updateMatrixWorld(true);
    MAP_COLLIDERS[m].push(new THREE.Box3().setFromObject(c));
  }
  // ── 4 Reactors (one in each quadrant) — each is a destructible ──
  const reactorPositions = [[-20, -20], [20, -20], [-20, 20], [20, 20]];
  reactorPositions.forEach(([x, z], idx) => {
    const reactor = new THREE.Group();
    const towerMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
    const coreMat  = new THREE.MeshBasicMaterial({ color: 0xff8822 });
    // Main cooling tower (hyperboloid-ish)
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(3, 4, 12, 12), towerMat);
    tower.position.y = 6; reactor.add(tower);
    // Glowing core at top
    const core = new THREE.Mesh(new THREE.SphereGeometry(1.5, 10, 8), coreMat);
    core.position.y = 10; reactor.add(core);
    // Top vent ring
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3, 0.3, 6, 16), towerMat);
    ring.rotation.x = Math.PI/2; ring.position.y = 11.8; reactor.add(ring);
    reactor.position.set(x, 0, z);
    MAP_GROUPS[m].add(reactor);
    reactor.updateMatrixWorld(true);
    MAP_COLLIDERS[m].push(new THREE.Box3().setFromObject(reactor));
    mapDestructibles.push({
      mesh: reactor, core, hp: 500, maxHp: 500, type: 'reactor', mapName: 'chernobyl',
      x, z, idx,
      onDestroy: () => {
        // Big explosion: 12m AOE, 250 dmg
        spawnAbilityAOEFX(new THREE.Vector3(x, 1, z), 12, 0xffaa22);
        flashScreen('rgba(255,170,34,0.5)', 800);
        for (const bot of gameBots) {
          if (bot.dead) continue;
          const dx = bot.x - x, dz = bot.z - z;
          if (dx*dx + dz*dz < 144) {
            const mesh = remoteMeshes[bot.id];
            const hp = mesh ? mesh.position.clone().setY(1.0) : new THREE.Vector3(bot.x, 1, bot.z);
            emitHit(bot.id, `reactor_${idx}_${Date.now()}_${bot.id}`, 'tac_nuke', hp);
          }
        }
        // Player damage if close
        const pdx = camera.position.x - x, pdz = camera.position.z - z;
        if (pdx*pdx + pdz*pdz < 144) applyBotDamageToPlayer('tac_nuke', null);
      },
    });
  });
  MAP_GROUPS[m]._skyColor = 0x2a3a18;
}
buildChernobylMap();

// ──────────────────────────────────────────────────────────────────────────
// 12. OIL REFINERY — slick ground, pipe cover, explosive barrels
// ──────────────────────────────────────────────────────────────────────────
registerMap('refinery');
function buildRefineryMap() {
  const m = 'refinery';
  addMapGround(m, 0x34312b, 0x4c4638);
  addOuterWalls(m, 0x28241d);
  [[-20,-18,8], [17,14,7], [0,0,5.5], [-24,19,4.5], [24,-20,4.5]].forEach(([x,z,r]) => addSlickZone(m, x, z, r));
  [[-14,-6], [14,6], [-6,18], [8,-20], [0,28], [28,0], [-28,0], [20,22]].forEach(([x,z]) => addExplosiveBarrel(m, x, z));
  const pipeMat = new THREE.MeshLambertMaterial({ color: 0x777064 });
  [[0,-28,34,0], [0,28,34,0], [-28,0,34,Math.PI/2], [28,0,34,Math.PI/2]].forEach(([x,z,len,rot]) => {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, len, 12), pipeMat);
    pipe.rotation.z = Math.PI / 2;
    pipe.rotation.y = rot;
    pipe.position.set(x, 1.0, z);
    addMapMesh(m, pipe, true);
  });
  [[-12,12,10,3], [12,-12,10,3], [0,18,3,10], [0,-18,3,10]].forEach(([x,z,w,d]) => {
    addMapBox(m, x, 1.0, z, w, 2, d, 0x5b5144);
  });
  MAP_GROUPS[m]._skyColor = 0x4b4741;
}
buildRefineryMap();

// ──────────────────────────────────────────────────────────────────────────
// 13. SKYDOCK LAUNCH — jump pads and raised gantry cover
// ──────────────────────────────────────────────────────────────────────────
registerMap('skydock');
function buildSkydockMap() {
  const m = 'skydock';
  addMapGround(m, 0x263544, 0x5b7c93);
  addOuterWalls(m, 0x1d2a36);
  [[-22,-22], [22,-22], [-22,22], [22,22], [0,0], [0,-28], [0,28]].forEach(([x,z], i) => addJumpPad(m, x, z, i === 4 ? 2.1 : 1.55, i === 4 ? 18 : 15, 0x44ddff));
  [[0,-18,28,1.2], [0,18,28,1.2], [-18,0,1.2,28], [18,0,1.2,28]].forEach(([x,z,w,d]) => {
    addMapBox(m, x, 2.2, z, w, 0.35, d, 0x7a8a94);
    addMapBox(m, x, 1.0, z, w, 2, d < 2 ? 0.45 : 0.45, 0x44515b, 0, 0.8);
  });
  [[-8,-8], [8,8], [-8,8], [8,-8]].forEach(([x,z]) => addMapBox(m, x, 1.2, z, 5, 2.4, 1.2, 0x334c62, Math.PI / 4));
  MAP_GROUPS[m]._skyColor = 0x6aa2c8;
}
buildSkydockMap();

// ──────────────────────────────────────────────────────────────────────────
// 14. ACID SEWER — toxic channels force bridge fights
// ──────────────────────────────────────────────────────────────────────────
registerMap('sewer');
function buildSewerMap() {
  const m = 'sewer';
  addMapGround(m, 0x263123, null);
  addOuterWalls(m, 0x182015);
  const acidMat = new THREE.MeshBasicMaterial({ color: 0x55ff22, transparent: true, opacity: 0.72 });
  [[0,0,8], [-25,0,5], [25,0,5], [0,-25,5], [0,25,5]].forEach(([x,z,r]) => {
    const acid = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.08, 20), acidMat);
    acid.position.set(x, 0.05, z);
    MAP_GROUPS[m].add(acid);
    MAP_GIMMICKS[m].damageZones.push({ x, z, r, dps: 6, type: 'acid' });
  });
  [[0,-13,36,2], [0,13,36,2], [-13,0,2,36], [13,0,2,36]].forEach(([x,z,w,d]) => addMapBox(m, x, 0.25, z, w, 0.5, d, 0x5a5141));
  [[-30,-30], [30,-30], [-30,30], [30,30], [-8,0], [8,0]].forEach(([x,z]) => addMapBox(m, x, 1.5, z, 5, 3, 5, 0x3b4234));
  MAP_GROUPS[m]._skyColor = 0x182318;
}
buildSewerMap();

// ──────────────────────────────────────────────────────────────────────────
// 15. GRAVITY LAB — low-grav domes plus launch pads for aerial duels
// ──────────────────────────────────────────────────────────────────────────
registerMap('gravity_lab');
function buildGravityLabMap() {
  const m = 'gravity_lab';
  addMapGround(m, 0x202232, 0x445577);
  addOuterWalls(m, 0x181a28);
  const zoneMat = new THREE.MeshBasicMaterial({ color: 0x66aaff, transparent: true, opacity: 0.16, side: THREE.DoubleSide });
  [[-18,-18,7], [18,-18,7], [-18,18,7], [18,18,7], [0,0,8]].forEach(([x,z,r]) => {
    const zone = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 6, 18), zoneMat);
    zone.position.set(x, 3, z);
    MAP_GROUPS[m].add(zone);
    const ring = new THREE.Mesh(new THREE.RingGeometry(r * 0.93, r, 22), new THREE.MeshBasicMaterial({ color: 0x66aaff, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, 0.04, z);
    MAP_GROUPS[m].add(ring);
    MAP_GIMMICKS[m].lowGravZones.push({ x, z, r });
  });
  [[0,-18], [0,18], [-18,0], [18,0]].forEach(([x,z]) => addJumpPad(m, x, z, 1.35, 13, 0x66aaff));
  [[0,-30,18,1], [0,30,18,1], [-30,0,1,18], [30,0,1,18], [0,0,5,5]].forEach(([x,z,w,d]) => addMapBox(m, x, 1.4, z, w, 2.8, d, 0x3a4060));
  MAP_GROUPS[m]._skyColor = 0x0b0d24;
}
buildGravityLabMap();

// ──────────────────────────────────────────────────────────────────────────
// 16. GLASSWORKS — breakable glass maze with a few barrel traps
// ──────────────────────────────────────────────────────────────────────────
registerMap('glassworks');
function buildGlassworksMap() {
  const m = 'glassworks';
  addMapGround(m, 0xdce8ec, 0xaad0dd);
  addOuterWalls(m, 0x9eb6bf);
  const glassMat = new THREE.MeshBasicMaterial({ color: 0x8ee8ff, transparent: true, opacity: 0.38 });
  const panels = [
    [0,-24,32,5,0], [0,24,32,5,0], [-24,0,5,32,0], [24,0,5,32,0],
    [-10,0,1,28,0], [10,0,1,28,0], [0,-10,28,1,0], [0,10,28,1,0],
    [-28,-28,12,1,Math.PI/4], [28,28,12,1,Math.PI/4], [-28,28,12,1,-Math.PI/4], [28,-28,12,1,-Math.PI/4],
  ];
  panels.forEach(([x,z,w,d,rot]) => {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(w, 4.5, d), glassMat);
    panel.position.set(x, 2.25, z);
    panel.rotation.y = rot;
    MAP_GROUPS[m].add(panel);
    panel.updateMatrixWorld(true);
    MAP_COLLIDERS[m].push(new THREE.Box3().setFromObject(panel));
    mapDestructibles.push({
      mesh: panel, hp: 45, maxHp: 45, type: 'glass', mapName: m,
      colliderRef: MAP_COLLIDERS[m][MAP_COLLIDERS[m].length - 1],
    });
  });
  [[-16,-16], [16,-16], [-16,16], [16,16]].forEach(([x,z]) => addExplosiveBarrel(m, x, z, 0x2b86b5));
  [[0,0], [-33,0], [33,0], [0,-33], [0,33]].forEach(([x,z]) => addMapBox(m, x, 0.55, z, 5, 1.1, 5, 0xb8c7cc));
  MAP_GROUPS[m]._skyColor = 0xcfefff;
}
buildGlassworksMap();

// ──────────────────────────────────────────────────────────────────────────
// BATCH-5 MAPS (16) — thematic builds + special mechanics in updateBatch5
// ──────────────────────────────────────────────────────────────────────────
// Per-map mutable state (set by builders, read by updateBatch5 each frame).
const _batch5 = {
  train:           { rails: [], cars: [], scroll: 0 },
  orbital_station: { windowMesh: null, hp: 200, broken: false },
  biosphere:       { t: 0, lastPhase: -1, particles: [] },
  lockdown:        { fuseBox: null, hp: 80, lightsOut: false, origAmbient: 1.0 },
  opera:           { chand: null, hp: 60, falling: false, vy: 0, hit: false },
  doomsday:        { debrisTimer: 0, debris: [] },
};

registerMap('carrier');
function buildCarrierMap() {
  const m = 'carrier';
  addMapGround(m, 0x3a4248);
  // Runway center stripes
  for (let z = -40; z <= 40; z += 8) addMapBox(m, 0, 0.06, z, 1.5, 0.04, 4, 0xffffff);
  // Control tower
  addMapBox(m, -30, 4, -30, 8, 8, 8, 0x6a727a);
  addMapBox(m, -30, 8.5, -30, 6, 1, 6, 0x2a3030);
  // Hangar boxes
  for (let i = 0; i < 4; i++) addMapBox(m, -38 + i * 7, 1.5, 32, 6, 3, 6, 0x5a626a);
  // Jet wings (decorative)
  addMapBox(m, 20, 1, 0, 12, 1.5, 4, 0xd0d4d8);
  addMapBox(m, 20, 1.6, -5, 1.2, 2.2, 1.2, 0x666);
  MAP_GROUPS[m]._skyColor = 0x6b88a0;
}
buildCarrierMap();

registerMap('overgrowth');
function buildOvergrowthMap() {
  const m = 'overgrowth';
  addMapGround(m, 0x4a6a3a);
  // Crumbling buildings
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const r = 18 + (i % 2) * 10;
    addMapBox(m, Math.cos(ang) * r, 3, Math.sin(ang) * r, 7, 6, 7, 0x6a6a5a);
    // Vines (green pillars)
    addMapBox(m, Math.cos(ang) * r + 3, 4, Math.sin(ang) * r, 0.4, 8, 0.4, 0x3a8a3a);
  }
  // Foliage clusters
  for (let i = 0; i < 25; i++) {
    const x = (Math.random() - 0.5) * 80, z = (Math.random() - 0.5) * 80;
    addMapBox(m, x, 0.8, z, 2, 1.6, 2, 0x2a6a2a);
  }
  MAP_GROUPS[m]._skyColor = 0x4a5a3a;
}
buildOvergrowthMap();

registerMap('orbital_station');
function buildOrbitalStationMap() {
  const m = 'orbital_station';
  addMapGround(m, 0x2a3848);
  // Modular pods around the edge
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    addMapBox(m, Math.cos(ang) * 22, 2, Math.sin(ang) * 22, 8, 4, 8, 0xb8c4d4);
    addMapBox(m, Math.cos(ang) * 22, 4.5, Math.sin(ang) * 22, 4, 1, 4, 0x6a88aa, ang);
  }
  // Breakable airlock window on pod 0 — destroys → vacuum suction
  const winMesh = addMapBox(m, 22, 2, 0, 0.4, 3, 3, 0x88ddff);
  _batch5.orbital_station.windowMesh = winMesh;
  // Central hub
  addMapBox(m, 0, 3, 0, 14, 6, 14, 0x9aaabb);
  // Antenna spire
  addMapBox(m, 0, 9, 0, 0.6, 6, 0.6, 0xddeeff);
  MAP_GROUPS[m]._skyColor = 0x000010;
}
buildOrbitalStationMap();

registerMap('foundry');
function buildFoundryMap() {
  const m = 'foundry';
  addMapGround(m, 0x2a2418);
  // Conveyor belts
  for (let i = 0; i < 3; i++) {
    addMapBox(m, -20 + i * 20, 0.8, -10, 14, 0.5, 3, 0x4a4030);
  }
  // Molten steel pools (glowing red)
  const moltenMat = new THREE.MeshBasicMaterial({ color: 0xff5522 });
  for (const [x, z] of [[-15, 18], [15, 18], [0, 30]]) {
    const pool = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.2, 16), moltenMat);
    pool.position.set(x, 0.1, z);
    MAP_GROUPS[m].add(pool);
  }
  // Giant gears (rings)
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2;
    const gear = new THREE.Mesh(new THREE.TorusGeometry(3, 0.6, 6, 16),
      new THREE.MeshLambertMaterial({ color: 0x6a6a6a }));
    gear.rotation.x = Math.PI / 2;
    gear.position.set(Math.cos(ang) * 30, 5, Math.sin(ang) * 30);
    MAP_GROUPS[m].add(gear);
  }
  MAP_GROUPS[m]._skyColor = 0x553322;
}
buildFoundryMap();

registerMap('carnival');
function buildCarnivalMap() {
  const m = 'carnival';
  addMapGround(m, 0x3a2a4a);
  // Ferris wheel
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(8, 0.5, 6, 24),
    new THREE.MeshLambertMaterial({ color: 0xffaa44 }));
  wheel.position.set(0, 9, -30); MAP_GROUPS[m].add(wheel);
  // Spokes
  for (let i = 0; i < 8; i++) {
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.3, 16, 0.3),
      new THREE.MeshLambertMaterial({ color: 0xddbb44 }));
    sp.position.set(0, 9, -30); sp.rotation.z = (i / 8) * Math.PI * 2;
    MAP_GROUPS[m].add(sp);
  }
  // Tents (colored cones)
  for (let i = 0; i < 5; i++) {
    const ang = (i / 5) * Math.PI * 2;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(3, 5, 6),
      new THREE.MeshLambertMaterial({ color: [0xff4488, 0x44ff88, 0xff8844, 0x4488ff, 0xff44ff][i] }));
    cone.position.set(Math.cos(ang) * 18, 2.5, Math.sin(ang) * 18);
    MAP_GROUPS[m].add(cone);
  }
  // Bumper-car arena floor
  addMapBox(m, 15, 0.1, 15, 16, 0.05, 16, 0x886644);
  MAP_GROUPS[m]._skyColor = 0x1a0a2a;
}
buildCarnivalMap();

registerMap('biosphere');
function buildBiosphereMap() {
  const m = 'biosphere';
  addMapGround(m, 0x4a6a4a);
  // 4 climate sectors
  addMapBox(m, -22, 0.06,  22, 30, 0.05, 30, 0x4a8a3a); // jungle (green)
  addMapBox(m,  22, 0.06,  22, 30, 0.05, 30, 0xddbb66); // desert (sand)
  addMapBox(m, -22, 0.06, -22, 30, 0.05, 30, 0xddeeff); // frozen (ice)
  addMapBox(m,  22, 0.06, -22, 30, 0.05, 30, 0x6a4a3a); // dirt
  // Dome ring
  for (let i = 0; i < 16; i++) {
    const ang = (i / 16) * Math.PI * 2;
    addMapBox(m, Math.cos(ang) * 46, 8, Math.sin(ang) * 46, 0.8, 16, 0.8, 0xaaddee, ang);
  }
  // Central control room
  addMapBox(m, 0, 2, 0, 8, 4, 8, 0x666688);
  MAP_GROUPS[m]._skyColor = 0x88aacc;
}
buildBiosphereMap();

registerMap('lockdown');
function buildLockdownMap() {
  const m = 'lockdown';
  addMapGround(m, 0x4a4a3a);
  // Cell blocks (two rows of cells)
  for (let i = -3; i <= 3; i++) {
    addMapBox(m, i * 6, 1.5, -16, 5, 3, 4, 0x5a5a5a);
    addMapBox(m, i * 6, 1.5,  16, 5, 3, 4, 0x5a5a5a);
    // Bars (thin pillars front of cells)
    for (let j = 0; j < 3; j++) {
      addMapBox(m, i * 6 - 2 + j * 2, 1.5, -14, 0.15, 3, 0.15, 0x222222);
      addMapBox(m, i * 6 - 2 + j * 2, 1.5,  14, 0.15, 3, 0.15, 0x222222);
    }
  }
  // Security tower
  addMapBox(m, 0, 5, 0, 4, 10, 4, 0x3a3a3a);
  addMapBox(m, 0, 10.5, 0, 6, 1, 6, 0x222222);
  // Fuse box on the tower wall — destroy → lights out (dark fog + reduced ambient)
  const fuse = addMapBox(m, 2.05, 1.5, 0, 0.2, 1, 1, 0xffaa22);
  _batch5.lockdown.fuseBox = fuse;
  MAP_GROUPS[m]._skyColor = 0x3a3a3a;
}
buildLockdownMap();

registerMap('studio');
function buildStudioMap() {
  const m = 'studio';
  addMapGround(m, 0x252525);
  // Western town set
  addMapBox(m, -28, 2,  20, 8, 4, 4, 0xaa8855);
  addMapBox(m, -20, 2,  20, 8, 4, 4, 0x886633);
  addMapBox(m, -12, 1.5, 22, 6, 3, 1, 0x442200); // saloon facade
  // Spaceship set (smooth metal)
  addMapBox(m, 22, 2, -20, 12, 4, 6, 0xaaccdd);
  addMapBox(m, 22, 4.5, -20, 8, 1, 4, 0xddeeff);
  // Castle set (stone)
  addMapBox(m, -22, 4, -22, 10, 8, 4, 0x888888);
  for (let i = -2; i <= 2; i++) addMapBox(m, -22 + i * 2, 8.5, -22, 1, 1, 1, 0x666666); // crenellations
  // Green screens
  addMapBox(m, 30, 4, 20, 0.3, 8, 8, 0x22ff22);
  addMapBox(m, -30, 4, 0, 0.3, 8, 8, 0x22ff22);
  MAP_GROUPS[m]._skyColor = 0x1a1a1a;
}
buildStudioMap();

registerMap('temple');
function buildTempleMap() {
  const m = 'temple';
  addMapGround(m, 0x6a5a3a);
  // Columns in a square
  for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
    if (Math.abs(i) < 2 && Math.abs(j) < 2) continue;
    addMapBox(m, i * 10, 4, j * 10, 1.4, 8, 1.4, 0xcccc99);
  }
  // Giant statue (central pillar + head)
  addMapBox(m, 0, 4, 0, 3, 8, 3, 0x8a7a4a);
  addMapBox(m, 0, 9, 0, 2.5, 2.5, 2.5, 0x6a5a2a);
  // Trap pits (decorative dark squares)
  addMapBox(m, 15, 0.04, 15, 4, 0.05, 4, 0x111111);
  addMapBox(m, -15, 0.04, -15, 4, 0.05, 4, 0x111111);
  MAP_GROUPS[m]._skyColor = 0xddaa66;
}
buildTempleMap();

registerMap('holiday');
function buildHolidayMap() {
  const m = 'holiday';
  addMapGround(m, 0xf0f5ff);
  // Christmas tree (cone)
  const tree = new THREE.Mesh(new THREE.ConeGeometry(5, 14, 8),
    new THREE.MeshLambertMaterial({ color: 0x2a6a2a }));
  tree.position.set(0, 7, 0); MAP_GROUPS[m].add(tree);
  // Star on top
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.8),
    new THREE.MeshBasicMaterial({ color: 0xffee44 }));
  star.position.set(0, 14.5, 0); MAP_GROUPS[m].add(star);
  // Cozy houses
  for (let i = 0; i < 5; i++) {
    const ang = (i / 5) * Math.PI * 2;
    addMapBox(m, Math.cos(ang) * 22, 2, Math.sin(ang) * 22, 6, 4, 6, 0x8a4a3a);
    // Snow roof
    addMapBox(m, Math.cos(ang) * 22, 4.5, Math.sin(ang) * 22, 6.5, 1, 6.5, 0xffffff);
  }
  // Frozen lake
  addMapBox(m, -28, 0.04, -28, 16, 0.05, 16, 0xaaddff);
  MAP_GROUPS[m]._skyColor = 0xccd8e8;
}
buildHolidayMap();

registerMap('labyrinth');
function buildLabyrinthMap() {
  const m = 'labyrinth';
  addMapGround(m, 0x2a2a2a);
  // Maze walls — a hand-drawn-ish pattern
  const walls = [
    [-30, 0, 20, 4], [30, 0, 20, 4], [0, -30, 4, 20], [0, 30, 4, 20],
    [-20, -10, 4, 12], [20, -10, 4, 12], [-10, 10, 12, 4], [10, 10, 12, 4],
    [-10, -20, 4, 8], [10, -20, 4, 8], [0, 0, 6, 4], [0, 0, 4, 6],
    [-25, 15, 10, 4], [25, 15, 10, 4], [-25, -25, 4, 10], [25, -25, 4, 10],
  ];
  for (const [x, z, w, d] of walls) addMapBox(m, x, 2, z, w, 4, d, 0x4a4a4a);
  MAP_GROUPS[m]._skyColor = 0x1a1a1a;
}
buildLabyrinthMap();

registerMap('arena');
function buildArenaMap() {
  const m = 'arena';
  addMapGround(m, 0x2a6a2a); // green field
  // Field markings
  addMapBox(m, 0, 0.06, 0, 50, 0.05, 0.3, 0xffffff);
  addMapBox(m, 0, 0.06, 0, 0.3, 0.05, 30, 0xffffff);
  const circle = new THREE.Mesh(new THREE.TorusGeometry(5, 0.15, 4, 24),
    new THREE.MeshLambertMaterial({ color: 0xffffff }));
  circle.rotation.x = Math.PI / 2; circle.position.set(0, 0.07, 0);
  MAP_GROUPS[m].add(circle);
  // Stadium walls (tall bleachers)
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2;
    addMapBox(m, Math.cos(ang) * 40, 6, Math.sin(ang) * 40, 8, 12, 8, 0x666688, ang);
  }
  // Catwalks (decorative high beams)
  addMapBox(m, 0, 14, -30, 30, 0.4, 1.5, 0x3a3a3a);
  addMapBox(m, 0, 14,  30, 30, 0.4, 1.5, 0x3a3a3a);
  MAP_GROUPS[m]._skyColor = 0x0a1a3a;
}
buildArenaMap();

registerMap('opera');
function buildOperaMap() {
  const m = 'opera';
  addMapGround(m, 0x4a2a3a); // red velvet carpet
  // Stage
  addMapBox(m, 0, 1, -25, 30, 2, 8, 0x6a4a4a);
  // Curtains (tall red panels)
  addMapBox(m, -15, 6, -28, 1, 10, 4, 0x882233);
  addMapBox(m,  15, 6, -28, 1, 10, 4, 0x882233);
  // Balconies (left + right tiered)
  for (let i = 0; i < 3; i++) {
    addMapBox(m, -30, 3 + i * 3, -10 + i * 6, 8, 1, 8, 0x6a4a3a);
    addMapBox(m,  30, 3 + i * 3, -10 + i * 6, 8, 1, 8, 0x6a4a3a);
  }
  // Chandelier — destructible, falls when shot
  const chand = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffee88 }));
  chand.position.set(0, 12, 0); MAP_GROUPS[m].add(chand);
  _batch5.opera.chand = chand;
  MAP_GROUPS[m]._skyColor = 0x1a0a1a;
}
buildOperaMap();

registerMap('doomsday');
function buildDoomsdayMap() {
  const m = 'doomsday';
  addMapGround(m, 0x3a2a1a);
  // Collapsing buildings (tilted boxes)
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    addMapBox(m, Math.cos(ang) * 25, 4, Math.sin(ang) * 25, 7, 8, 7, 0x5a4a3a, ang * 0.1);
  }
  // Fire pillars
  for (const [x, z] of [[-15, 0], [15, 0], [0, -20], [0, 20]]) {
    const fire = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.5, 4, 8),
      new THREE.MeshBasicMaterial({ color: 0xff5522 }));
    fire.position.set(x, 2, z); MAP_GROUPS[m].add(fire);
  }
  // Abandoned helicopter
  addMapBox(m, 30, 1.5, 30, 6, 2, 3, 0x4a4a4a);
  addMapBox(m, 30, 2.6, 30, 8, 0.2, 0.4, 0x222222); // blade
  MAP_GROUPS[m]._skyColor = 0x441111;
}
buildDoomsdayMap();

registerMap('train');
function buildTrainMap() {
  const m = 'train';
  addMapGround(m, 0x222222);
  // 6 train cars in a long row
  for (let i = -3; i < 3; i++) {
    addMapBox(m, 0, 2, i * 14, 5, 4, 12, 0x4a3a5a);
    addMapBox(m, 0, 4.2, i * 14, 5.4, 0.4, 13, 0x222);
  }
  // Coupling rods
  for (let i = -2; i < 3; i++) addMapBox(m, 0, 1, i * 14 - 7, 2, 0.4, 0.4, 0x666);
  // Engine front
  addMapBox(m, 0, 2.5, -45, 6, 5, 6, 0x6a2a2a);
  addMapBox(m, 0, 6, -45, 1.2, 1.5, 1.2, 0x222); // chimney
  // Side rails (tracks) — scrolled by updateBatch5 to fake motion
  for (let r = 0; r < 30; r++) {
    const tie = addMapBox(m, 0, 0.05, -45 + r * 3, 6, 0.06, 0.6, 0x553322);
    _batch5.train.rails.push(tie);
  }
  addMapBox(m, -3, 0.1, 0, 0.3, 0.05, 90, 0x222);
  addMapBox(m,  3, 0.1, 0, 0.3, 0.05, 90, 0x222);
  MAP_GROUPS[m]._skyColor = 0x222233;
}
buildTrainMap();

registerMap('dreamscape');
function buildDreamscapeMap() {
  const m = 'dreamscape';
  addMapGround(m, 0x2a1a3a);
  // Floating staircases
  for (let i = 0; i < 8; i++) {
    addMapBox(m, -25 + (i % 4) * 6, 1 + i * 0.6, -20 + Math.floor(i / 4) * 12, 4, 0.4, 4, 0xff88cc);
  }
  // Upside-down rooms (inverted boxes high up)
  addMapBox(m, 20, 10, 0, 8, 0.5, 8, 0x44ddff);
  addMapBox(m, 20, 8, -3, 0.5, 4, 4, 0x44ddff);
  addMapBox(m, 20, 8, 3, 0.5, 4, 4, 0x44ddff);
  // Giant floating impossible shapes
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    const shape = new THREE.Mesh(new THREE.OctahedronGeometry(2),
      new THREE.MeshLambertMaterial({ color: [0xff4488, 0x44ffcc, 0xffcc44, 0xcc44ff, 0x44ccff, 0xffff44][i] }));
    shape.position.set(Math.cos(ang) * 30, 6 + Math.sin(i) * 2, Math.sin(ang) * 30);
    MAP_GROUPS[m].add(shape);
  }
  MAP_GROUPS[m]._skyColor = 0x4a2a6a;
}
buildDreamscapeMap();

// ──────────────────────────────────────────────────────────────────────────
// 17. KING OF THE HILL / BR ARENA — massive map with vehicles + helicopters
// ──────────────────────────────────────────────────────────────────────────
registerMap('br_arena');
function buildBrArenaMap() {
  const m = 'br_arena';
  const SIZE = 250; // 250x250 — 6x bigger than standard maps
  // Ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE), new THREE.MeshLambertMaterial({ color: 0x5a7440 }));
  ground.rotation.x = -Math.PI / 2;
  MAP_GROUPS[m].add(ground);
  // Outer perimeter walls — thicker (3 units) + taller (8 units) so they're visible from far away
  const half = SIZE / 2;
  const wallT = 3; // thickness
  const wallH = 8; // height
  [
    [SIZE+wallT, wallH, wallT, 0, wallH/2, -half - wallT/2 + 1.5], // north
    [SIZE+wallT, wallH, wallT, 0, wallH/2,  half + wallT/2 - 1.5], // south
    [wallT, wallH, SIZE+wallT, -half - wallT/2 + 1.5, wallH/2, 0], // west
    [wallT, wallH, SIZE+wallT,  half + wallT/2 - 1.5, wallH/2, 0], // east
  ].forEach(([w,h,d,x,y,z]) => addMapBox(m, x, y, z, w, h, d, 0x4a4a3a));
  // ── Town zones: 5 cluster areas with buildings (scattered across map) ──
  const buildingClusters = [
    [-80, -80], [80, -80], [-80, 80], [80, 80], [0, 0],
    [-40, 40], [40, -40], [-100, 0], [100, 0], [0, -100], [0, 100]
  ];
  const bMatA = 0x8b7355, bMatB = 0x6a5540;
  buildingClusters.forEach(([cx, cz], idx) => {
    // Each cluster has 3-5 buildings
    const n = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const bx = cx + (Math.random() - 0.5) * 22;
      const bz = cz + (Math.random() - 0.5) * 22;
      const bw = 6 + Math.random() * 6;
      const bd = 6 + Math.random() * 6;
      const bh = 4 + Math.random() * 6;
      addMapBox(m, bx, bh / 2, bz, bw, bh, bd, (idx + i) % 2 ? bMatA : bMatB);
    }
  });
  // Roads (visual stripes)
  const roadMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
  for (let r = -100; r <= 100; r += 50) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, 4), roadMat);
    road.rotation.x = -Math.PI / 2; road.position.set(0, 0.02, r);
    MAP_GROUPS[m].add(road);
    const road2 = new THREE.Mesh(new THREE.PlaneGeometry(4, SIZE), roadMat);
    road2.rotation.x = -Math.PI / 2; road2.position.set(r, 0.02, 0);
    MAP_GROUPS[m].add(road2);
  }
  // ── Mortar cannons (6 stationary ones, scattered) ──
  const mortarPositions = [[-60, -60], [60, 60], [-60, 60], [60, -60], [0, -90], [0, 90]];
  mortarPositions.forEach(([x, z]) => {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 0.4, 8), new THREE.MeshLambertMaterial({ color: 0x444444 }));
    base.position.y = 0.2; g.add(base);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.24, 1.4, 8), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    tube.rotation.x = -0.5; tube.position.set(0, 0.85, 0); g.add(tube);
    g.position.set(x, 0, z); MAP_GROUPS[m].add(g);
    g.updateMatrixWorld(true);
    MAP_COLLIDERS[m].push(new THREE.Box3().setFromObject(g));
    mapMortars.push({ mesh: g, x, z, side: 'neutral', ammo: 8, maxAmmo: 8, hp: 30, maxHp: 30, pilotedBy: null, lastShot: 0, mapName: 'br_arena' });
  });
  // ── Ground vehicles (4 jeeps) ──
  const vehiclePositions = [[-30, -50, 0], [30, 50, Math.PI], [-50, 30, Math.PI / 2], [50, -30, -Math.PI / 2]];
  vehiclePositions.forEach(([x, z, yaw]) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.0, 3.5), new THREE.MeshLambertMaterial({ color: 0x4a5a3a }));
    body.position.y = 0.8; g.add(body);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 1.4), new THREE.MeshLambertMaterial({ color: 0x2a3a2a }));
    cab.position.set(0, 1.6, 0.4); g.add(cab);
    for (const [wx, wz] of [[-1.0, 1.2], [1.0, 1.2], [-1.0, -1.2], [1.0, -1.2]]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10), new THREE.MeshLambertMaterial({ color: 0x111111 }));
      wheel.rotation.z = Math.PI / 2; wheel.position.set(wx, 0.42, wz); g.add(wheel);
    }
    g.position.set(x, 0, z); g.rotation.y = yaw;
    MAP_GROUPS[m].add(g);
    g.updateMatrixWorld(true);
    MAP_COLLIDERS[m].push(new THREE.Box3().setFromObject(g));
    mapVehicles.push({
      mesh: g, x, z, rotY: yaw, hp: 80, maxHp: 80, pilotedBy: null,
      type: 'jeep', mapName: 'br_arena',
      maxSpeed: 18, // m/s
      gunDmg: 22, gunFireRate: 200, lastShot: 0,
    });
  });
  // ── Helicopters (2) ──
  const heliPositions = [[-90, 90], [90, -90]];
  heliPositions.forEach(([x, z]) => {
    const g = new THREE.Group();
    const fuselage = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.4, 4.5), new THREE.MeshLambertMaterial({ color: 0x3a4a3a }));
    fuselage.position.y = 1.4; g.add(fuselage);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 2.5), new THREE.MeshLambertMaterial({ color: 0x3a4a3a }));
    tail.position.set(0, 1.8, -3.0); g.add(tail);
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(7, 0.08, 0.4), new THREE.MeshLambertMaterial({ color: 0x111111 }));
    rotor.position.set(0, 2.4, 0); g.add(rotor);
    const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.06), new THREE.MeshLambertMaterial({ color: 0x111111 }));
    tailRotor.position.set(0, 1.8, -4.0); g.add(tailRotor);
    for (let i = 0; i < 4; i++) {
      const skid = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 2), new THREE.MeshLambertMaterial({ color: 0x222222 }));
      skid.position.set(i < 2 ? -0.9 : 0.9, 0.4, i % 2 ? 0.6 : -0.6);
      g.add(skid);
    }
    g.position.set(x, 0, z); MAP_GROUPS[m].add(g);
    g.updateMatrixWorld(true);
    MAP_COLLIDERS[m].push(new THREE.Box3().setFromObject(g));
    mapVehicles.push({
      mesh: g, x, z, y: 0, rotY: 0, hp: 100, maxHp: 100, pilotedBy: null,
      type: 'heli', mapName: 'br_arena',
      maxSpeed: 28, rotor, tailRotor,
      gunDmg: 18, gunFireRate: 100, lastShot: 0,
    });
  });
  // Scattered cover rocks
  for (let i = 0; i < 30; i++) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1 + Math.random() * 1.5, 0), new THREE.MeshLambertMaterial({ color: 0x808080 }));
    rock.position.set((Math.random() - 0.5) * 220, 0.5, (Math.random() - 0.5) * 220);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    MAP_GROUPS[m].add(rock);
    rock.updateMatrixWorld(true);
    MAP_COLLIDERS[m].push(new THREE.Box3().setFromObject(rock));
  }
  MAP_GROUPS[m]._skyColor = 0x88aacc;
}
// Vehicles array — populated by br_arena
const mapVehicles = [];
buildBrArenaMap();

buildBlankMap();
buildBattlefieldMap();
buildRangeMap();
activateMap('blank');

// ── Weapon view models ─────────────────────────────────────────────────────
const bMat  = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
const sMat  = new THREE.MeshLambertMaterial({ color: 0x4a2a0e });
const mMat  = new THREE.MeshLambertMaterial({ color: 0x333333 });
const rMat  = new THREE.MeshLambertMaterial({ color: 0x222222 });

function makeMuzzleFlash() {
  // Composite muzzle flash: inner bright core + outer flare + 4 spike rays for character
  const g = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.022, 6, 5),
    new THREE.MeshBasicMaterial({ color: 0xffffaa })
  );
  g.add(core);
  const flare = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.55 })
  );
  g.add(flare);
  // 4 radial spikes (small flattened cones) — the "star" shape
  const spikeMat = new THREE.MeshBasicMaterial({ color: 0xffdd44, transparent: true, opacity: 0.7 });
  for (let i = 0; i < 4; i++) {
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.06, 4), spikeMat);
    sp.rotation.z = (i * Math.PI) / 2;
    sp.position.set(Math.cos(i * Math.PI/2) * 0.045, Math.sin(i * Math.PI/2) * 0.045, 0);
    g.add(sp);
  }
  // Expose material so callers can recolor (e.g. green plasma → green flash)
  g.material = core.material;
  g.visible = false;
  return g;
}

// AK20
function buildAK20() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.04,0.06,0.32), bMat); g.add(body);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.008,0.008,0.22,8), mMat);
  barrel.rotation.x = Math.PI/2; barrel.position.set(0,0.01,-0.27); g.add(barrel);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.03,0.045,0.14), sMat);
  stock.position.set(0,-0.01,0.18); g.add(stock);
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.025,0.09,0.04), bMat);
  mag.position.set(0,-0.065,0.02); g.add(mag);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.025,0.07,0.035), sMat);
  grip.rotation.x = 0.3; grip.position.set(0,-0.06,0.1); g.add(grip);
  const flash = makeMuzzleFlash(); flash.position.set(0,0.01,-0.38); g.add(flash);
  g._flash = flash; g._kickZ = 0.015; g.position.set(0.12,-0.1,-0.25); return g;
}

// AK30 — longer mag, tan/desert colour
function buildAK30() {
  const tan = new THREE.MeshLambertMaterial({ color: 0x8b7040 });
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.042,0.062,0.34), tan); g.add(body);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.009,0.009,0.24,8), mMat);
  barrel.rotation.x = Math.PI/2; barrel.position.set(0,0.012,-0.29); g.add(barrel);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.03,0.045,0.15), sMat);
  stock.position.set(0,-0.01,0.195); g.add(stock);
  // Longer extended mag
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.026,0.115,0.042), tan);
  mag.position.set(0,-0.075,0.02); g.add(mag);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.026,0.07,0.036), sMat);
  grip.rotation.x = 0.3; grip.position.set(0,-0.062,0.1); g.add(grip);
  // Rail on top
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.015,0.01,0.18), mMat);
  rail.position.set(0,0.038,0.0); g.add(rail);
  const flash = makeMuzzleFlash(); flash.position.set(0,0.012,-0.41); g.add(flash);
  g._flash = flash; g._kickZ = 0.015; g.position.set(0.12,-0.1,-0.25); return g;
}

// SG-8
function buildSG8() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.05,0.07,0.28), bMat); g.add(body);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014,0.014,0.18,8), mMat);
  barrel.rotation.x = Math.PI/2; barrel.position.set(0,0.025,-0.23); g.add(barrel);
  const pump = new THREE.Mesh(new THREE.BoxGeometry(0.04,0.04,0.09), mMat);
  pump.position.set(0,0.01,-0.18); g.add(pump);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.035,0.05,0.16), sMat);
  stock.position.set(0,-0.01,0.16); g.add(stock);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.03,0.08,0.04), sMat);
  grip.rotation.x = 0.25; grip.position.set(0,-0.065,0.08); g.add(grip);
  const flash = makeMuzzleFlash(); flash.position.set(0,0.025,-0.32); g.add(flash);
  g._flash = flash; g._kickZ = 0.025; g.position.set(0.12,-0.1,-0.25); return g;
}

// SG100 — double barrel, heavy
function buildSG100() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.07,0.075,0.26), bMat); g.add(body);
  // Double barrel side by side
  const bL = new THREE.Mesh(new THREE.CylinderGeometry(0.013,0.013,0.2,8), mMat);
  bL.rotation.x = Math.PI/2; bL.position.set(-0.018,0.025,-0.23); g.add(bL);
  const bR = new THREE.Mesh(new THREE.CylinderGeometry(0.013,0.013,0.2,8), mMat);
  bR.rotation.x = Math.PI/2; bR.position.set( 0.018,0.025,-0.23); g.add(bR);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.055,0.055,0.18), sMat);
  stock.position.set(0,-0.005,0.17); g.add(stock);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04,0.09,0.045), sMat);
  grip.rotation.x = 0.2; grip.position.set(0,-0.075,0.07); g.add(grip);
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.035,0.08,0.05), bMat);
  mag.position.set(0,-0.07,0.0); g.add(mag);
  const flash = makeMuzzleFlash(); flash.position.set(0,0.025,-0.33); g.add(flash);
  g._flash = flash; g._kickZ = 0.03; g.position.set(0.12,-0.1,-0.25); return g;
}

// SR-X sniper
function buildSRX() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.035,0.055,0.38), bMat); g.add(body);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.007,0.007,0.32,8), mMat);
  barrel.rotation.x = Math.PI/2; barrel.position.set(0,0.01,-0.35); g.add(barrel);
  const scopeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.014,0.014,0.18,8), rMat);
  scopeBody.rotation.x = Math.PI/2; scopeBody.position.set(0,0.05,-0.05); g.add(scopeBody);
  const scopeL = new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.012,0.01,8), mMat);
  scopeL.rotation.x = Math.PI/2; scopeL.position.set(0,0.05,-0.14); g.add(scopeL);
  const scopeR = new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.012,0.01,8), mMat);
  scopeR.rotation.x = Math.PI/2; scopeR.position.set(0,0.05,0.04); g.add(scopeR);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.03,0.05,0.14), sMat);
  stock.position.set(0,-0.005,0.22); g.add(stock);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.025,0.07,0.035), sMat);
  grip.rotation.x = 0.3; grip.position.set(0,-0.06,0.1); g.add(grip);
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.02,0.07,0.035), bMat);
  mag.position.set(0,-0.06,0.02); g.add(mag);
  const flash = makeMuzzleFlash(); flash.position.set(0,0.01,-0.51); g.add(flash);
  g._flash = flash; g._kickZ = 0.01; g.position.set(0.12,-0.1,-0.25); return g;
}

// RPD — LMG with huge drum, olive green
function buildRPD() {
  const olive = new THREE.MeshLambertMaterial({ color: 0x4a5240 });
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.055,0.07,0.42), olive); g.add(body);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.011,0.011,0.36,8), mMat);
  barrel.rotation.x = Math.PI/2; barrel.position.set(0,0.015,-0.39); g.add(barrel);
  // Bipod stubs
  const bipL = new THREE.Mesh(new THREE.BoxGeometry(0.005,0.06,0.01), mMat);
  bipL.position.set(-0.025,-0.06,-0.28); g.add(bipL);
  const bipR = new THREE.Mesh(new THREE.BoxGeometry(0.005,0.06,0.01), mMat);
  bipR.position.set( 0.025,-0.06,-0.28); g.add(bipR);
  // Big drum mag
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.058,0.058,0.045,16), bMat);
  drum.rotation.x = Math.PI/2; drum.position.set(0,-0.07,0.04); g.add(drum);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.04,0.055,0.14), sMat);
  stock.position.set(0,-0.005,0.245); g.add(stock);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.03,0.08,0.04), sMat);
  grip.rotation.x = 0.2; grip.position.set(0,-0.07,0.12); g.add(grip);
  const flash = makeMuzzleFlash(); flash.position.set(0,0.015,-0.57); g.add(flash);
  g._flash = flash; g._kickZ = 0.008; g.position.set(0.12,-0.1,-0.25); return g;
}

// MP-40
function buildMP40() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.04,0.055,0.24), bMat); g.add(body);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.008,0.008,0.14,8), mMat);
  barrel.rotation.x = Math.PI/2; barrel.position.set(0,0.01,-0.19); g.add(barrel);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.038,0.038,0.04,12), bMat);
  drum.rotation.x = Math.PI/2; drum.position.set(0,-0.06,0.0); g.add(drum);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.025,0.04,0.1), sMat);
  stock.position.set(0,0,0.16); g.add(stock);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.025,0.065,0.03), sMat);
  grip.rotation.x = 0.2; grip.position.set(0,-0.055,0.08); g.add(grip);
  const flash = makeMuzzleFlash(); flash.position.set(0,0.01,-0.26); g.add(flash);
  g._flash = flash; g._kickZ = 0.012; g.position.set(0.12,-0.1,-0.25); return g;
}

// P90 — futuristic bullpup, translucent top mag
function buildP90() {
  const blue = new THREE.MeshLambertMaterial({ color: 0x1a2a4a });
  const g = new THREE.Group();
  // Bullpup body (stock integrated)
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.042,0.058,0.32), blue); g.add(body);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.007,0.007,0.16,8), mMat);
  barrel.rotation.x = Math.PI/2; barrel.position.set(0,0.01,-0.24); g.add(barrel);
  // Top horizontal magazine (P90 signature)
  const topMag = new THREE.Mesh(new THREE.BoxGeometry(0.038,0.022,0.22), new THREE.MeshLambertMaterial({ color: 0x334466 }));
  topMag.position.set(0,0.042,0.02); g.add(topMag);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.03,0.072,0.038), blue);
  grip.rotation.x = 0.15; grip.position.set(0,-0.06,0.06); g.add(grip);
  // Rear scope rail
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.016,0.012,0.12), mMat);
  rail.position.set(0,0.058,0.06); g.add(rail);
  const flash = makeMuzzleFlash(); flash.position.set(0,0.01,-0.32); g.add(flash);
  g._flash = flash; g._kickZ = 0.006; g.position.set(0.12,-0.1,-0.25); return g;
}

// ── Paintball Gun ─────────────────────────────────────────────────────────
function buildPaintball() {
  const lime  = new THREE.MeshLambertMaterial({ color: 0x44dd00 });
  const white = new THREE.MeshLambertMaterial({ color: 0xeeeeee });
  const blk   = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const g = new THREE.Group();
  // Receiver body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.038,0.052,0.22), lime); g.add(body);
  // Long thin barrel
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.008,0.008,0.24,8), blk);
  barrel.rotation.x = Math.PI/2; barrel.position.set(0,0.014,-0.23); g.add(barrel);
  // Hopper (ball feed dome on top) — signature paintball look
  const hopper = new THREE.Mesh(new THREE.SphereGeometry(0.055,10,8,0,Math.PI*2,0,Math.PI/1.6), white);
  hopper.position.set(0,0.068,0.02); g.add(hopper);
  const hopperNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.022,0.022,0.028,8), white);
  hopperNeck.position.set(0,0.038,0.02); g.add(hopperNeck);
  // Grip
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.028,0.070,0.034), blk);
  grip.rotation.x = 0.18; grip.position.set(0,-0.058,0.055); g.add(grip);
  // Air tank underneath (long tube at the back)
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.018,0.14,10), blk);
  tank.rotation.x = Math.PI/2; tank.position.set(0,-0.038,0.10); g.add(tank);
  // Trigger guard
  const guard = new THREE.Mesh(new THREE.TorusGeometry(0.018,0.003,4,8,Math.PI), blk);
  guard.rotation.x = Math.PI/2; guard.position.set(0,-0.024,0.020); g.add(guard);
  const flash = makeMuzzleFlash(); flash.position.set(0,0.014,-0.35); g.add(flash);
  g._flash = flash; g._kickZ = 0.010; g.position.set(0.12,-0.1,-0.25); return g;
}

// ── Revolver ──────────────────────────────────────────────────────────────
function buildRevolver() {
  const steel = new THREE.MeshLambertMaterial({ color: 0x555560 });
  const wood  = new THREE.MeshLambertMaterial({ color: 0x6b3a2a });
  const g = new THREE.Group();
  // Frame
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.028,0.055,0.13), steel); g.add(frame);
  // Long barrel
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.009,0.009,0.20,8), steel);
  barrel.rotation.x = Math.PI/2; barrel.position.set(0,0.016,-0.15); g.add(barrel);
  // Cylinder (6-shot)
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.026,0.026,0.038,6), steel);
  cyl.rotation.x = Math.PI/2; cyl.position.set(0,0.008,-0.01); g.add(cyl);
  // Grip
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.022,0.072,0.038), wood);
  grip.rotation.x = 0.25; grip.position.set(0,-0.062,0.065); g.add(grip);
  // Hammer
  const hammer = new THREE.Mesh(new THREE.BoxGeometry(0.012,0.022,0.012), steel);
  hammer.position.set(0,0.038,0.06); g.add(hammer);
  const flash = makeMuzzleFlash(); flash.position.set(0,0.016,-0.255); g.add(flash);
  g._flash = flash; g._kickZ = 0.022; g.position.set(0.1,-0.1,-0.22); return g;
}

// ── Flare Gun ─────────────────────────────────────────────────────────────
function buildFlare() {
  const orange = new THREE.MeshLambertMaterial({ color: 0xcc4400 });
  const blk    = new THREE.MeshLambertMaterial({ color: 0x222222 });
  const g = new THREE.Group();
  // Chunky body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.042,0.055,0.10), orange); g.add(body);
  // Wide short barrel
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.020,0.018,0.11,8), blk);
  barrel.rotation.x = Math.PI/2; barrel.position.set(0,0.014,-0.105); g.add(barrel);
  // Grip
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.030,0.075,0.034), blk);
  grip.rotation.x = 0.2; grip.position.set(0,-0.064,0.040); g.add(grip);
  // Trigger guard
  const guard = new THREE.Mesh(new THREE.TorusGeometry(0.018,0.004,4,8,Math.PI), blk);
  guard.rotation.x = Math.PI/2; guard.position.set(0,-0.028,0.012); g.add(guard);
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.030,6,6), new THREE.MeshBasicMaterial({ color: 0xff5500 }));
  flash.visible = false; flash.position.set(0,0.014,-0.165); g.add(flash);
  g._flash = flash; g._kickZ = 0.030; g.position.set(0.1,-0.1,-0.22); return g;
}

// ── Pistol ────────────────────────────────────────────────────────────────
function buildPistol() {
  const dark = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.026,0.048,0.11), dark); g.add(body);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.007,0.007,0.12,8), mMat);
  barrel.rotation.x = Math.PI/2; barrel.position.set(0,0.012,-0.115); g.add(barrel);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.024,0.068,0.034), dark);
  grip.rotation.x = 0.18; grip.position.set(0,-0.056,0.045); g.add(grip);
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.020,0.056,0.028), mMat);
  mag.position.set(0,-0.052,0.038); g.add(mag);
  // Slide serrations
  const slide = new THREE.Mesh(new THREE.BoxGeometry(0.028,0.016,0.06), mMat);
  slide.position.set(0,0.022,0.005); g.add(slide);
  const flash = makeMuzzleFlash(); flash.position.set(0,0.012,-0.175); g.add(flash);
  g._flash = flash; g._kickZ = 0.018; g.position.set(0.1,-0.1,-0.22); return g;
}

// ── Shorty ────────────────────────────────────────────────────────────────
function buildShorty() {
  const g = new THREE.Group();
  // Very stubby body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.052,0.060,0.09), bMat); g.add(body);
  // Short fat barrel
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.016,0.016,0.09,8), mMat);
  barrel.rotation.x = Math.PI/2; barrel.position.set(0,0.020,-0.09); g.add(barrel);
  // Pistol grip (no stock)
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.030,0.075,0.036), sMat);
  grip.rotation.x = 0.22; grip.position.set(0,-0.066,0.040); g.add(grip);
  // Folded stock stub
  const stub = new THREE.Mesh(new THREE.BoxGeometry(0.028,0.020,0.06), mMat);
  stub.position.set(0,0.005,0.065); g.add(stub);
  const flash = makeMuzzleFlash(); flash.position.set(0,0.020,-0.135); g.add(flash);
  g._flash = flash; g._kickZ = 0.028; g.position.set(0.1,-0.1,-0.22); return g;
}

// ── Cycler (energy weapon) ─────────────────────────────────────────────────
function buildCycler() {
  const navy  = new THREE.MeshLambertMaterial({ color: 0x0a1628 });
  const cyan  = new THREE.MeshLambertMaterial({ color: 0x00cccc });
  const glow  = new THREE.MeshBasicMaterial({ color: 0x00ffee });
  const g = new THREE.Group();
  // Sleek body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.036,0.052,0.24), navy); g.add(body);
  // Glowing barrel tube
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.009,0.009,0.19,8), cyan);
  barrel.rotation.x = Math.PI/2; barrel.position.set(0,0.013,-0.215); g.add(barrel);
  // Inner glow core
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.005,0.005,0.24,8), glow);
  core.rotation.x = Math.PI/2; core.position.set(0,0.013,-0.12); g.add(core);
  // Energy cell (side tank)
  const cell = new THREE.Mesh(new THREE.CylinderGeometry(0.022,0.022,0.11,10), cyan);
  cell.rotation.x = Math.PI/2; cell.position.set(0,-0.052,0.01); g.add(cell);
  // Cell glow ring
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.022,0.005,6,12), glow);
  ring.position.set(0,-0.052,0.01); g.add(ring);
  // Grip
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.028,0.065,0.032), navy);
  grip.rotation.x = 0.15; grip.position.set(0,-0.060,0.090); g.add(grip);
  // Vent slits
  [-0.05, 0.02].forEach(z => {
    const vent = new THREE.Mesh(new THREE.BoxGeometry(0.040,0.006,0.012), glow);
    vent.position.set(0,0.030,z); g.add(vent);
  });
  // Muzzle flash (cyan)
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.016,6,6), new THREE.MeshBasicMaterial({ color: 0x00ffee }));
  flash.visible = false; flash.position.set(0,0.013,-0.315); g.add(flash);
  g._flash = flash; g._kickZ = 0.004; g.position.set(0.1,-0.1,-0.22); return g;
}

// ── Individually hand-crafted weapon builders ─────────────────────────────

function buildBurstRifle() {
  // Futuristic burst AR — blue-grey body, 3-vent ports on left side
  const g = new THREE.Group();
  const bodyMat  = new THREE.MeshLambertMaterial({ color: 0x3f4f5f });
  const darkMat  = new THREE.MeshLambertMaterial({ color: 0x1f2328 });
  const ventMat  = new THREE.MeshBasicMaterial({ color: 0x88bbff });
  // Main receiver body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.058, 0.32), bodyMat);
  g.add(body);
  // Barrel
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.24, 8), darkMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.014, -0.28); g.add(barrel);
  // 3 vent ports on left side
  [-0.07, -0.01, 0.05].forEach(z => {
    const vent = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.018, 0.020), ventMat);
    vent.position.set(-0.024, 0.010, z); g.add(vent);
  });
  // Scope rail on top
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.012, 0.22), darkMat);
  rail.position.set(0, 0.037, -0.04); g.add(rail);
  // Scope body
  const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.14, 8), darkMat);
  scope.rotation.x = Math.PI / 2; scope.position.set(0, 0.050, -0.04); g.add(scope);
  // Grip
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.068, 0.034), darkMat);
  grip.rotation.x = 0.22; grip.position.set(0, -0.058, 0.060); g.add(grip);
  // Mag
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.078, 0.038), bodyMat);
  mag.position.set(0, -0.062, -0.005); g.add(mag);
  // Stock
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.042, 0.13), darkMat);
  stock.position.set(0, -0.005, 0.215); g.add(stock);
  // Muzzle flash
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffdd66 }));
  flash.visible = false; flash.position.set(0, 0.014, -0.405); g.add(flash);
  g._flash = flash; g._kickZ = 0.016; g.position.set(0.12, -0.1, -0.25); return g;
}

function buildLeverRifle() {
  // Western lever-action — brown wood, visible lever loop under receiver
  const g = new THREE.Group();
  const woodMat  = new THREE.MeshLambertMaterial({ color: 0x6b3a20 });
  const metalMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
  // Long receiver body (wood)
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.040, 0.052, 0.34), woodMat);
  g.add(body);
  // Long barrel
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.30, 8), metalMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.014, -0.32); g.add(barrel);
  // Lever loop — a flat elongated box forming the characteristic loop
  const leverBase = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.060, 0.070), metalMat);
  leverBase.position.set(0, -0.062, 0.030); g.add(leverBase);
  // Loop sides
  const leverL = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.070), metalMat);
  leverL.position.set(-0.016, -0.090, 0.030); g.add(leverL);
  const leverR = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.070), metalMat);
  leverR.position.set(0.016, -0.090, 0.030); g.add(leverR);
  // Grip / wrist of stock
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.062, 0.038), woodMat);
  grip.rotation.x = 0.18; grip.position.set(0, -0.055, 0.065); g.add(grip);
  // Long wooden stock
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.044, 0.18), woodMat);
  stock.position.set(0, -0.004, 0.240); g.add(stock);
  // Scope
  const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.16, 8), metalMat);
  scope.rotation.x = Math.PI / 2; scope.position.set(0, 0.048, -0.02); g.add(scope);
  // Flash
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffcc66 }));
  flash.visible = false; flash.position.set(0, 0.014, -0.475); g.add(flash);
  g._flash = flash; g._kickZ = 0.024; g.position.set(0.12, -0.1, -0.25); return g;
}

function buildAutoShotgun() {
  // Auto shotgun with large drum mag, dark
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x242424 });
  const trimMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
  // Wide receiver
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.065, 0.30), bodyMat);
  g.add(body);
  // Wide short barrel
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.18, 8), trimMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.016, -0.24); g.add(barrel);
  // Large drum magazine
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.048, 14), trimMat);
  drum.rotation.x = Math.PI / 2; drum.position.set(0, -0.070, 0.015); g.add(drum);
  // Drum hub
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.020, 0.052, 8), bodyMat);
  hub.rotation.x = Math.PI / 2; hub.position.set(0, -0.070, 0.015); g.add(hub);
  // Grip
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.072, 0.038), bodyMat);
  grip.rotation.x = 0.22; grip.position.set(0, -0.060, 0.062); g.add(grip);
  // Stock
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.050, 0.13), bodyMat);
  stock.position.set(0, -0.006, 0.215); g.add(stock);
  // Flash
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.030, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff8800 }));
  flash.visible = false; flash.position.set(0, 0.016, -0.345); g.add(flash);
  g._flash = flash; g._kickZ = 0.028; g.position.set(0.12, -0.1, -0.25); return g;
}

function buildVectorSMG() {
  // Extremely compact Vector SMG — very short body, no stock, visible bolt rail on side
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x20262f });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const railMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
  // Short wide body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.050, 0.058, 0.22), bodyMat);
  g.add(body);
  // Short barrel
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.13, 8), darkMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.012, -0.175); g.add(barrel);
  // Visible bolt rail on right side — distinctive Vector feature
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.010, 0.18), railMat);
  rail.position.set(0.030, 0.012, 0.008); g.add(rail);
  const boltHandle = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.016, 0.018), darkMat);
  boltHandle.position.set(0.036, 0.012, 0.020); g.add(boltHandle);
  // Tall magazine
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.090, 0.034), bodyMat);
  mag.position.set(0, -0.072, -0.010); g.add(mag);
  // Compact grip (no stock)
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.062, 0.036), darkMat);
  grip.rotation.x = 0.20; grip.position.set(0, -0.055, 0.072); g.add(grip);
  // Front grip / handguard
  const foregrip = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.024, 0.10), darkMat);
  foregrip.position.set(0, -0.026, -0.060); g.add(foregrip);
  // Flash
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffee88 }));
  flash.visible = false; flash.position.set(0, 0.012, -0.245); g.add(flash);
  g._flash = flash; g._kickZ = 0.008; g.position.set(0.12, -0.1, -0.25); return g;
}

function buildCrossbow() {
  // Proper crossbow — horizontal bow arms along X axis, stock, track groove, bolt
  const g = new THREE.Group();
  const woodMat  = new THREE.MeshLambertMaterial({ color: 0x6b4324 });
  const darkMat  = new THREE.MeshLambertMaterial({ color: 0x151515 });
  const stringMat= new THREE.MeshBasicMaterial({ color: 0x888888 });
  const boltMat  = new THREE.MeshLambertMaterial({ color: 0xccaa44 });
  // Main stock — runs along Z
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.040, 0.34), woodMat);
  g.add(stock);
  // Track groove on top of stock
  const groove = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.008, 0.28), darkMat);
  groove.position.set(0, 0.024, -0.01); g.add(groove);
  // Bow arms — horizontal, going LEFT and RIGHT on X axis
  const bowArms = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.016, 0.025), woodMat);
  bowArms.position.set(0, 0.014, -0.09); g.add(bowArms);
  // Arm tips angled back slightly
  const tipL = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.012, 0.020), darkMat);
  tipL.rotation.y = 0.25; tipL.position.set(-0.125, 0.014, -0.104); g.add(tipL);
  const tipR = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.012, 0.020), darkMat);
  tipR.rotation.y = -0.25; tipR.position.set(0.125, 0.014, -0.104); g.add(tipR);
  // Bowstring — thin box from arm to arm
  const str = new THREE.Mesh(new THREE.BoxGeometry(0.220, 0.004, 0.004), stringMat);
  str.position.set(0, 0.013, -0.082); g.add(str);
  // Bolt/arrow — thin cylinder along Z
  const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.22, 6), boltMat);
  bolt.rotation.x = Math.PI / 2; bolt.position.set(0, 0.018, -0.070); g.add(bolt);
  // Arrowhead
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0, 0.007, 0.022, 4), darkMat);
  head.rotation.x = Math.PI / 2; head.position.set(0, 0.018, -0.190); g.add(head);
  // Grip
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.070, 0.038), woodMat);
  grip.rotation.x = 0.18; grip.position.set(0, -0.055, 0.060); g.add(grip);
  // Trigger guard
  const trig = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.006, 0.055), darkMat);
  trig.position.set(0, -0.028, 0.040); g.add(trig);
  // Flash at bolt front
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), new THREE.MeshBasicMaterial({ color: 0x8b5a2b }));
  flash.visible = false; flash.position.set(0, 0.018, -0.205); g.add(flash);
  g._flash = flash; g._kickZ = 0.018; g.position.set(0.12, -0.1, -0.25); return g;
}

function buildFlamethrower() {
  // Fuel tank under barrel, wide nozzle tip
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x8a2f16 });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  const tankMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
  // Main body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.060, 0.30), bodyMat);
  g.add(body);
  // Barrel — wider tube
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.20, 8), darkMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.016, -0.25); g.add(barrel);
  // Flared nozzle tip
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.030, 0.018, 0.040, 8), darkMat);
  nozzle.rotation.x = Math.PI / 2; nozzle.position.set(0, 0.016, -0.375); g.add(nozzle);
  // Fuel tank under barrel — cylindrical, runs along body
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.22, 10), tankMat);
  tank.rotation.x = Math.PI / 2; tank.position.set(0, -0.048, 0.040); g.add(tank);
  // Tank cap
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.016, 10), darkMat);
  cap.rotation.x = Math.PI / 2; cap.position.set(0, -0.048, 0.155); g.add(cap);
  // Fuel hose connecting tank to body
  const hose = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.052, 6), darkMat);
  hose.position.set(0, -0.024, -0.060); g.add(hose);
  // Grip
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.070, 0.036), darkMat);
  grip.rotation.x = 0.20; grip.position.set(0, -0.058, 0.065); g.add(grip);
  // Stock
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.046, 0.12), darkMat);
  stock.position.set(0, -0.006, 0.210); g.add(stock);
  // Flash — fire orange
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.038, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff6600 }));
  flash.visible = false; flash.position.set(0, 0.016, -0.400); g.add(flash);
  g._flash = flash; g._kickZ = 0.006; g.position.set(0.12, -0.1, -0.25); return g;
}

function buildGrenadeLauncher() {
  // 6-shot revolver cylinder + short wide barrel
  const g = new THREE.Group();
  const bodyMat  = new THREE.MeshLambertMaterial({ color: 0x315c30 });
  const darkMat  = new THREE.MeshLambertMaterial({ color: 0x1b1b1b });
  const cylMat   = new THREE.MeshLambertMaterial({ color: 0x3d3d3d });
  // Main receiver body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.062, 0.28), bodyMat);
  g.add(body);
  // Revolver cylinder — distinctive feature, large diameter
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.050, 12), cylMat);
  cyl.rotation.x = Math.PI / 2; cyl.position.set(0, -0.010, 0.010); g.add(cyl);
  // Cylinder chambers (6 holes visual) — small dark circles
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.054, 6), darkMat);
    ch.rotation.x = Math.PI / 2;
    ch.position.set(Math.sin(angle) * 0.038, Math.cos(angle) * 0.038 - 0.010, 0.010);
    g.add(ch);
  }
  // Short wide barrel
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.17, 8), darkMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.016, -0.225); g.add(barrel);
  // Grip
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.075, 0.038), darkMat);
  grip.rotation.x = 0.22; grip.position.set(0, -0.062, 0.070); g.add(grip);
  // Stock
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.048, 0.13), darkMat);
  stock.position.set(0, -0.005, 0.210); g.add(stock);
  // Flash
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.032, 6, 6), new THREE.MeshBasicMaterial({ color: 0x99cc44 }));
  flash.visible = false; flash.position.set(0, 0.016, -0.315); g.add(flash);
  g._flash = flash; g._kickZ = 0.030; g.position.set(0.12, -0.1, -0.25); return g;
}

function buildRailgun() {
  // Long sleek body, glowing blue charge coils along barrel
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x18283a });
  const coilMat = new THREE.MeshBasicMaterial({ color: 0x66ccff });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x0d1520 });
  // Long sleek body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.040, 0.048, 0.38), bodyMat);
  g.add(body);
  // Long barrel
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.36, 8), darkMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.014, -0.37); g.add(barrel);
  // Glowing charge coils along the barrel
  [-0.28, -0.20, -0.12, -0.04, 0.04].forEach(z => {
    const coil = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.014, 8), coilMat);
    coil.rotation.x = Math.PI / 2; coil.position.set(0, 0.014, z); g.add(coil);
  });
  // Rail rails on sides
  const railL = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.008, 0.34), coilMat);
  railL.position.set(-0.022, 0.014, -0.05); g.add(railL);
  const railR = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.008, 0.34), coilMat);
  railR.position.set(0.022, 0.014, -0.05); g.add(railR);
  // Scope
  const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.16, 8), darkMat);
  scope.rotation.x = Math.PI / 2; scope.position.set(0, 0.046, 0.020); g.add(scope);
  // Grip
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.068, 0.034), darkMat);
  grip.rotation.x = 0.22; grip.position.set(0, -0.056, 0.082); g.add(grip);
  // Stock
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.040, 0.13), darkMat);
  stock.position.set(0, -0.004, 0.255); g.add(stock);
  // Flash — blue
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.020, 6, 6), new THREE.MeshBasicMaterial({ color: 0x66ccff }));
  flash.visible = false; flash.position.set(0, 0.014, -0.560); g.add(flash);
  g._flash = flash; g._kickZ = 0.014; g.position.set(0.12, -0.1, -0.25); return g;
}

function buildMinigun() {
  // 3 rotating barrels in triangular cluster, large drum below
  const g = new THREE.Group();
  const bodyMat  = new THREE.MeshLambertMaterial({ color: 0x3c3c3c });
  const darkMat  = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const drumMat  = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
  // Very wide main body housing
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.070, 0.36), bodyMat);
  g.add(body);
  // Three barrels in a triangular cluster inside a sub-group.
  // Spinning the sub-group on Z rotates the whole cluster around the forward axis.
  const barrelCluster = new THREE.Group();
  barrelCluster.position.set(0, 0.004, -0.30); // centred on the shroud
  g.add(barrelCluster);
  const bGeo = new THREE.CylinderGeometry(0.010, 0.010, 0.32, 8);
  const b1 = new THREE.Mesh(bGeo, darkMat);
  b1.rotation.x = Math.PI / 2; b1.position.set(0, 0.022, 0); barrelCluster.add(b1);
  const b2 = new THREE.Mesh(bGeo, darkMat);
  b2.rotation.x = Math.PI / 2; b2.position.set(-0.022, -0.011, 0); barrelCluster.add(b2);
  const b3 = new THREE.Mesh(bGeo, darkMat);
  b3.rotation.x = Math.PI / 2; b3.position.set( 0.022, -0.011, 0); barrelCluster.add(b3);
  g._barrelCluster = barrelCluster; // spin THIS group, not individual barrels
  g._spinRate = 10;
  // Barrel shroud / housing at front
  const shroud = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.18, 10), bodyMat);
  shroud.rotation.x = Math.PI / 2; shroud.position.set(0, 0.004, -0.290); g.add(shroud);
  // Rear housing ring
  const rearRing = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.030, 10), darkMat);
  rearRing.rotation.x = Math.PI / 2; rearRing.position.set(0, 0.004, -0.130); g.add(rearRing);
  // Large drum magazine below
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.055, 14), drumMat);
  drum.rotation.x = Math.PI / 2; drum.position.set(0, -0.075, 0.020); g.add(drum);
  // Feed chute from drum to body
  const chute = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.030, 0.040), darkMat);
  chute.position.set(0, -0.038, 0.010); g.add(chute);
  // Grip
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.072, 0.040), darkMat);
  grip.rotation.x = 0.20; grip.position.set(0, -0.060, 0.090); g.add(grip);
  // Stock / rear handle
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.040, 0.052, 0.14), bodyMat);
  stock.position.set(0, -0.006, 0.240); g.add(stock);
  // Flash
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.026, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffcc00 }));
  flash.visible = false; flash.position.set(0, 0.004, -0.465); g.add(flash);
  g._flash = flash; g._kickZ = 0.006; g.position.set(0.12, -0.1, -0.25); return g;
}

function buildFreezeGun() {
  // Ice-blue hopper/tank, fat cryo barrel
  const g = new THREE.Group();
  const iceMat  = new THREE.MeshLambertMaterial({ color: 0xd7f5ff });
  const blueMat = new THREE.MeshLambertMaterial({ color: 0x2f7fa3 });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x99ddff });
  // Main body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.060, 0.26), iceMat);
  g.add(body);
  // Fat cryo barrel
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.014, 0.22, 10), blueMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.018, -0.24); g.add(barrel);
  // Cryo tip with frost ring
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.020, 0.028, 10), glowMat);
  tip.rotation.x = Math.PI / 2; tip.position.set(0, 0.018, -0.365); g.add(tip);
  // Ice-blue hopper/tank on top — distinctive
  const tank = new THREE.Mesh(new THREE.BoxGeometry(0.040, 0.052, 0.14), iceMat);
  tank.position.set(0, 0.058, 0.030); g.add(tank);
  const tankCap = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.016, 0.12), blueMat);
  tankCap.position.set(0, 0.090, 0.030); g.add(tankCap);
  // Side tank under barrel
  const sideTank = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.16, 8), blueMat);
  sideTank.rotation.x = Math.PI / 2; sideTank.position.set(0, -0.042, 0.08); g.add(sideTank);
  // Grip
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.070, 0.036), blueMat);
  grip.rotation.x = 0.22; grip.position.set(0, -0.058, 0.062); g.add(grip);
  // Stock
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.044, 0.12), iceMat);
  stock.position.set(0, -0.005, 0.200); g.add(stock);
  // Flash
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.026, 6, 6), new THREE.MeshBasicMaterial({ color: 0x99ddff }));
  flash.visible = false; flash.position.set(0, 0.018, -0.385); g.add(flash);
  g._flash = flash; g._kickZ = 0.007; g.position.set(0.12, -0.1, -0.25); return g;
}

function buildBoombow() {
  // Traditional vertical bow — riser up/down, two limbs curving away, bowstring, nocked arrow
  const g = new THREE.Group();
  const woodMat   = new THREE.MeshLambertMaterial({ color: 0x57351d });
  const orangeMat = new THREE.MeshBasicMaterial({ color: 0xffaa22 });
  const accentMat = new THREE.MeshLambertMaterial({ color: 0xffaa22 });
  const stringMat = new THREE.MeshBasicMaterial({ color: 0x888866 });
  const arrowMat  = new THREE.MeshLambertMaterial({ color: 0xccaa55 });
  // Riser (center grip piece) — vertical
  const riser = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.18, 0.030), woodMat);
  riser.position.set(0, 0, 0); g.add(riser);
  // Orange accent strips on riser
  const strip1 = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.018, 0.008), orangeMat);
  strip1.position.set(0, 0.050, 0.012); g.add(strip1);
  const strip2 = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.018, 0.008), orangeMat);
  strip2.position.set(0, -0.050, 0.012); g.add(strip2);
  // Upper limb — angled outward
  const upperLimb = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.11, 0.022), woodMat);
  upperLimb.rotation.z = 0.20;
  upperLimb.position.set(0.010, 0.145, 0.0); g.add(upperLimb);
  // Upper limb tip
  const upperTip = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.055, 0.018), accentMat);
  upperTip.rotation.z = 0.38;
  upperTip.position.set(0.030, 0.225, 0.0); g.add(upperTip);
  // Lower limb — mirrors upper
  const lowerLimb = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.11, 0.022), woodMat);
  lowerLimb.rotation.z = -0.20;
  lowerLimb.position.set(0.010, -0.145, 0.0); g.add(lowerLimb);
  // Lower limb tip
  const lowerTip = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.055, 0.018), accentMat);
  lowerTip.rotation.z = -0.38;
  lowerTip.position.set(0.030, -0.225, 0.0); g.add(lowerTip);
  // Bowstring — thin box from top to bottom
  const bowstring = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.50, 0.003), stringMat);
  bowstring.position.set(0.052, 0, 0.002); g.add(bowstring);
  // Arrow — cylinder along Z, pointing forward
  const arrow = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.003, 0.26, 6), arrowMat);
  arrow.rotation.x = Math.PI / 2;
  arrow.position.set(0.035, 0.006, -0.090); g.add(arrow);
  // Glowing orange explosive tip at front of arrow
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 6), orangeMat);
  tip.position.set(0.035, 0.006, -0.225); g.add(tip);
  // Flash
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffaa22 }));
  flash.visible = false; flash.position.set(0.035, 0.006, -0.232); g.add(flash);
  g._flash = flash; g._kickZ = 0.022; g.position.set(0.12, -0.1, -0.25); return g;
}

function buildHandCannon() {
  // Massive single-shot pistol with huge wide barrel
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x4b4b52 });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  // Wide beefy receiver
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.060, 0.072, 0.15), bodyMat);
  g.add(body);
  // Huge wide barrel — very exaggerated
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.20, 8), darkMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.020, -0.175); g.add(barrel);
  // Barrel shroud/compensator on end
  const shroud = new THREE.Mesh(new THREE.CylinderGeometry(0.030, 0.028, 0.030, 8), bodyMat);
  shroud.rotation.x = Math.PI / 2; shroud.position.set(0, 0.020, -0.285); g.add(shroud);
  // Chunky grip — no stock
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.085, 0.046), darkMat);
  grip.rotation.x = 0.20; grip.position.set(0, -0.070, 0.045); g.add(grip);
  // Exposed hammer on top
  const hammer = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.030, 0.022), darkMat);
  hammer.position.set(0, 0.048, 0.048); g.add(hammer);
  // Trigger guard — large
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.010, 0.070), darkMat);
  guard.position.set(0, -0.028, 0.018); g.add(guard);
  // Flash
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.030, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffcc44 }));
  flash.visible = false; flash.position.set(0, 0.020, -0.305); g.add(flash);
  g._flash = flash; g._kickZ = 0.030; g.position.set(0.1, -0.1, -0.22); return g;
}

function buildThrowingKnives() {
  // Actual knife/blade shape — flat blade + handle, NOT a gun
  const g = new THREE.Group();
  const bladeMat  = new THREE.MeshLambertMaterial({ color: 0xc0c8cc });
  const darkMat   = new THREE.MeshLambertMaterial({ color: 0x202020 });
  const wrapMat   = new THREE.MeshLambertMaterial({ color: 0x3a2a18 });
  const glintMat  = new THREE.MeshBasicMaterial({ color: 0xeef5ff });
  // Flat blade — thin and wide
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.045, 0.16), bladeMat);
  blade.position.set(0, 0.006, -0.040); g.add(blade);
  // Blade edge bevel (slightly thinner strip on side)
  const bevel = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.010, 0.14), glintMat);
  bevel.position.set(0.004, 0.010, -0.040); g.add(bevel);
  // Tapered pointed tip
  const tipGeo = new THREE.CylinderGeometry(0, 0.008, 0.025, 4);
  const tip = new THREE.Mesh(tipGeo, darkMat);
  tip.rotation.x = Math.PI / 2;
  tip.position.set(0, 0.006, -0.135); g.add(tip);
  // Guard crosspiece
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.010, 0.010), darkMat);
  guard.position.set(0, 0.006, 0.042); g.add(guard);
  // Wrapped handle
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.048, 0.055), wrapMat);
  handle.position.set(0, 0.006, 0.082); g.add(handle);
  // Handle wrap ridges
  [-0.005, 0.010, 0.025].forEach(z => {
    const wrap = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.050, 0.005), darkMat);
    wrap.position.set(0, 0.006, 0.070 + z); g.add(wrap);
  });
  // Pommel
  const pommel = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.022, 0.018), darkMat);
  pommel.position.set(0, 0.006, 0.118); g.add(pommel);
  // Glint flash
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 6), new THREE.MeshBasicMaterial({ color: 0xd8d8d8 }));
  flash.visible = false; flash.position.set(0, 0.006, -0.148); g.add(flash);
  g._flash = flash; g._kickZ = 0.010; g.position.set(0.1, -0.1, -0.22); return g;
}

function buildTaser() {
  // T-shaped stun gun — compact grip, two side prongs sticking out front, yellow
  const g = new THREE.Group();
  const yellowMat = new THREE.MeshLambertMaterial({ color: 0xf0d94a });
  const darkMat   = new THREE.MeshLambertMaterial({ color: 0x222222 });
  // Main grip (vertical part of T)
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.080, 0.040), yellowMat);
  grip.position.set(0, 0, 0); g.add(grip);
  // Top horizontal piece (the T bar)
  const topBar = new THREE.Mesh(new THREE.BoxGeometry(0.080, 0.030, 0.045), yellowMat);
  topBar.position.set(0, 0.055, 0.0); g.add(topBar);
  // Dark activation button on top bar
  const button = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.014, 0.020), darkMat);
  button.position.set(0, 0.072, -0.006); g.add(button);
  // Two prong cylinders on front of top bar — left and right
  const prongL = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.025, 6), darkMat);
  prongL.rotation.x = Math.PI / 2;
  prongL.position.set(-0.022, 0.055, -0.035); g.add(prongL);
  const prongR = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.025, 6), darkMat);
  prongR.rotation.x = Math.PI / 2;
  prongR.position.set(0.022, 0.055, -0.035); g.add(prongR);
  // Yellow arc tips on prongs
  const tipL = new THREE.Mesh(new THREE.SphereGeometry(0.007, 5, 4), new THREE.MeshBasicMaterial({ color: 0xffff00 }));
  tipL.position.set(-0.022, 0.055, -0.050); g.add(tipL);
  const tipR2 = new THREE.Mesh(new THREE.SphereGeometry(0.007, 5, 4), new THREE.MeshBasicMaterial({ color: 0xffff00 }));
  tipR2.position.set(0.022, 0.055, -0.050); g.add(tipR2);
  // Safety label strip on grip
  const label = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.016, 0.006), new THREE.MeshBasicMaterial({ color: 0xffff55 }));
  label.position.set(0, 0.010, 0.023); g.add(label);
  // Flash — yellow electric arc between prongs
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffff55 }));
  flash.visible = false; flash.position.set(0, 0.055, -0.052); g.add(flash);
  g._flash = flash; g._kickZ = 0.012; g.position.set(0.1, -0.1, -0.22); return g;
}

// ── Trashcan model ────────────────────────────────────────────────────────
function buildTrashcan() {
  const g = new THREE.Group();
  const binMat  = new THREE.MeshLambertMaterial({ color: 0x1e6b1e }); // dark green
  const lidMat  = new THREE.MeshLambertMaterial({ color: 0x155215 }); // darker green lid
  const metalMat= new THREE.MeshLambertMaterial({ color: 0x7a8c7a }); // grey metal trim

  // Main body — slightly tapered (wider at bottom)
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.27, 0.88, 10), binMat);
  body.position.y = 0.44; g.add(body);

  // Metal rim at top
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.04, 10), metalMat);
  rim.position.y = 0.90; g.add(rim);

  // Lid (slightly wider than rim, angled)
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.25, 0.09, 10), lidMat);
  lid.position.y = 0.97; g.add(lid);

  // Handle on lid
  const handleGeo = new THREE.TorusGeometry(0.06, 0.016, 5, 10, Math.PI);
  const handle = new THREE.Mesh(handleGeo, metalMat);
  handle.rotation.x = -Math.PI / 2;
  handle.position.y = 1.06; g.add(handle);

  // Bottom disc (cap)
  const bottom = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.04, 10), metalMat);
  bottom.position.y = 0.02; g.add(bottom);

  // Recycle symbol panel (sticker-like rectangle on front)
  const sticker = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.28, 0.01), new THREE.MeshLambertMaterial({ color: 0x2a9a2a }));
  sticker.position.set(0, 0.46, 0.23); g.add(sticker);

  g.castShadow = true; g.receiveShadow = true;
  return g;
}

// Trashcan positions in world space (x, z)
const TRASHCAN_POSITIONS = [
  { x:  6, z:  3 },
  { x: -6, z: -3 },
];
const trashcanMeshes = [];
let nearTrashcan = false;

function placeTrashcans() {
  TRASHCAN_POSITIONS.forEach(pos => {
    const tc = buildTrashcan();
    tc.position.set(pos.x, 0, pos.z);
    // Slightly rotate each for variety
    tc.rotation.y = Math.random() * Math.PI * 2;
    scene.add(tc);
    trashcanMeshes.push(tc);
    // Subtle glow ring on ground under it
    const glow = new THREE.Mesh(
      new THREE.RingGeometry(0.30, 0.42, 16),
      new THREE.MeshBasicMaterial({ color: 0x22aa22, side: THREE.DoubleSide, transparent: true, opacity: 0.4 })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(pos.x, 0.02, pos.z);
    scene.add(glow);
  });
}
placeTrashcans();

function buildMG42() {
  const g = new THREE.Group();
  const metalMat = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });
  const darkMat  = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
  const woodMat  = new THREE.MeshLambertMaterial({ color: 0x5a3010 });
  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.07, 0.55), metalMat);
  body.position.set(0.06, -0.09, -0.28);
  g.add(body);
  // Long barrel
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, 0.65), darkMat);
  barrel.position.set(0.06, -0.09, -0.72);
  g.add(barrel);
  // Barrel jacket (perforated look - just a slightly larger cylinder approximation)
  const jacket = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.075, 0.42), metalMat);
  jacket.position.set(0.06, -0.09, -0.55);
  g.add(jacket);
  // Stock
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.065, 0.26), woodMat);
  stock.position.set(0.06, -0.10, 0.05);
  g.add(stock);
  // Ammo belt box (right side)
  const ammoBox = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.11, 0.22), darkMat);
  ammoBox.position.set(0.13, -0.12, -0.22);
  g.add(ammoBox);
  // Top carry handle
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.045, 0.14), metalMat);
  handle.position.set(0.06, -0.04, -0.22);
  g.add(handle);
  // Grip
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.085, 0.04), woodMat);
  grip.position.set(0.065, -0.155, -0.06);
  g.add(grip);
  // Muzzle flash (at barrel tip)
  const flash = makeMuzzleFlash();
  flash.position.set(0.06, -0.09, -1.07);
  g.add(flash);
  g._flash = flash; g._kickZ = 0.008;
  g.position.set(0.18, -0.14, -0.32);
  return g;
}

// ── Rich weapon model factory with shape variants, scopes, accessories ────
// opts: {
//   bodyShape: 'classic'|'bullpup'|'pistol'|'compact'|'sniper'|'shotgun'|'futuristic'|'heavy'
//   bodyColor, accentColor, barrelColor
//   barrelLen, barrelR, barrelCount (1=normal, 2=double-barrel)
//   suppressor: boolean
//   scope: 'none'|'red_dot'|'acog'|'sniper'|'holo'
//   foregrip: boolean
//   magType: 'box'|'drum'|'banana'|'pan'|'hidden'
//   stock: 'classic'|'skeleton'|'folding'|'hidden'|'bullpup'
//   topRail: boolean (rail along top)
//   emissive: boolean (use MeshBasicMaterial for accent glow effect)
//   ejectionPort: boolean
//   flashColor: hex (muzzle flash color)
//   kickZ: number
// }
function _genericGun(opts) {
  opts = opts || {};
  const shape = opts.bodyShape || 'classic';
  const bc = opts.bodyColor ?? 0x222222;
  const ac = opts.accentColor ?? 0x666666;
  const bodyMat = new THREE.MeshLambertMaterial({ color: bc });
  const accentMat = opts.emissive
    ? new THREE.MeshBasicMaterial({ color: ac })
    : new THREE.MeshLambertMaterial({ color: ac });
  const dark = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
  const metal = new THREE.MeshLambertMaterial({ color: opts.barrelColor ?? 0x333333 });
  const g = new THREE.Group();

  // Body shape — different proportions
  let bodyW, bodyH, bodyD;
  switch (shape) {
    case 'bullpup':   bodyW=0.052; bodyH=0.075; bodyD=0.30; break;
    case 'pistol':    bodyW=0.038; bodyH=0.085; bodyD=0.16; break;
    case 'compact':   bodyW=0.045; bodyH=0.060; bodyD=0.20; break;
    case 'sniper':    bodyW=0.040; bodyH=0.052; bodyD=0.40; break;
    case 'shotgun':   bodyW=0.060; bodyH=0.065; bodyD=0.34; break;
    case 'futuristic':bodyW=0.055; bodyH=0.070; bodyD=0.30; break;
    case 'heavy':     bodyW=0.075; bodyH=0.082; bodyD=0.38; break;
    default:          bodyW=0.048; bodyH=0.058; bodyD=opts.bodyLen ?? 0.30;
  }
  const body = new THREE.Mesh(new THREE.BoxGeometry(bodyW, bodyH, bodyD), bodyMat);
  g.add(body);

  // Barrel(s)
  const barrelLen = opts.barrelLen ?? (shape === 'sniper' ? 0.34 : shape === 'pistol' ? 0.10 : shape === 'shotgun' ? 0.18 : 0.22);
  const barrelR = opts.barrelR ?? (shape === 'shotgun' ? 0.014 : shape === 'sniper' ? 0.010 : shape === 'heavy' ? 0.016 : 0.010);
  const barrelCount = opts.barrelCount || 1;
  const barrelZ = -(bodyD * 0.5 + barrelLen * 0.5 - 0.02);
  if (barrelCount === 1) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(barrelR, barrelR, barrelLen, 10), metal);
    barrel.rotation.x = Math.PI/2; barrel.position.set(0, 0.014, barrelZ); g.add(barrel);
  } else {
    for (let i = 0; i < barrelCount; i++) {
      const offset = (i - (barrelCount-1)/2) * 0.022;
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(barrelR, barrelR, barrelLen, 8), metal);
      barrel.rotation.x = Math.PI/2; barrel.position.set(offset, 0.014, barrelZ); g.add(barrel);
    }
  }

  // Suppressor — fatter cylinder past barrel
  if (opts.suppressor) {
    const supp = new THREE.Mesh(new THREE.CylinderGeometry(barrelR * 1.8, barrelR * 1.8, 0.10, 10), dark);
    supp.rotation.x = Math.PI/2;
    supp.position.set(0, 0.014, barrelZ - barrelLen * 0.5 - 0.05); g.add(supp);
  }

  // Stock
  const stockKind = opts.stock || (shape === 'pistol' ? 'hidden' : shape === 'bullpup' ? 'bullpup' : 'classic');
  if (stockKind !== 'hidden') {
    let stockGeo, stockPos;
    switch (stockKind) {
      case 'skeleton':
        // Wire-frame style: two thin rails
        const r1 = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.16), dark);
        r1.position.set(0, 0.012, 0.20); g.add(r1);
        const r2 = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.16), dark);
        r2.position.set(0, -0.020, 0.20); g.add(r2);
        const buttplate = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.052, 0.012), dark);
        buttplate.position.set(0, -0.004, 0.28); g.add(buttplate);
        break;
      case 'folding':
        stockGeo = new THREE.BoxGeometry(0.025, 0.038, 0.10);
        const s = new THREE.Mesh(stockGeo, dark); s.position.set(0, 0.010, 0.16); g.add(s);
        break;
      case 'bullpup':
        const sb = new THREE.Mesh(new THREE.BoxGeometry(bodyW, bodyH * 0.7, 0.08), bodyMat);
        sb.position.set(0, -0.01, bodyD * 0.5 + 0.04); g.add(sb);
        break;
      default:
        stockGeo = new THREE.BoxGeometry(0.034, 0.048, 0.14);
        const sc = new THREE.Mesh(stockGeo, sMat); sc.position.set(0, -0.005, bodyD * 0.5 + 0.07); g.add(sc);
    }
  }

  // Magazine — varies by type
  const magType = opts.magType || 'box';
  if (magType !== 'hidden') {
    let mag;
    switch (magType) {
      case 'drum':
        mag = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.038, 12), accentMat);
        mag.rotation.x = Math.PI/2; mag.position.set(0, -0.085, 0.02); g.add(mag);
        break;
      case 'banana':
        mag = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.13, 0.045), accentMat);
        mag.rotation.x = 0.20; mag.position.set(0, -0.085, 0.04); g.add(mag);
        break;
      case 'pan':
        mag = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.018, 14), accentMat);
        mag.position.set(0, 0.060, 0.02); g.add(mag);
        break;
      default: // 'box'
        mag = new THREE.Mesh(new THREE.BoxGeometry(0.026, opts.magH ?? 0.085, 0.040), accentMat);
        mag.position.set(0, -0.062, 0.02); g.add(mag);
    }
  }

  // Grip
  const gripGeo = new THREE.BoxGeometry(0.028, 0.072, 0.040);
  const grip = new THREE.Mesh(gripGeo, sMat);
  grip.rotation.x = 0.28; grip.position.set(0, -0.060, shape === 'bullpup' ? 0.02 : 0.08); g.add(grip);

  // Foregrip (vertical front grip)
  if (opts.foregrip) {
    const fg = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.060, 0.028), sMat);
    fg.position.set(0, -0.058, -(bodyD * 0.4)); g.add(fg);
  }

  // Top rail
  if (opts.topRail || opts.scope) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.012, bodyD * 0.85), dark);
    rail.position.set(0, 0.038, 0); g.add(rail);
  }

  // Scope
  if (opts.scope && opts.scope !== 'none') {
    switch (opts.scope) {
      case 'red_dot':
        const rd = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.022, 0.04), dark);
        rd.position.set(0, 0.058, -0.02); g.add(rd);
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.005, 6, 5), new THREE.MeshBasicMaterial({ color: 0xff2200 }));
        dot.position.set(0, 0.058, -0.022); g.add(dot);
        break;
      case 'acog':
        const acog = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.07, 8), dark);
        acog.rotation.x = Math.PI/2; acog.position.set(0, 0.058, -0.02); g.add(acog);
        const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.005, 8), new THREE.MeshBasicMaterial({ color: 0x44ff44 }));
        lens.rotation.x = Math.PI/2; lens.position.set(0, 0.058, 0.020); g.add(lens);
        break;
      case 'sniper':
        const sn = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.14, 10), dark);
        sn.rotation.x = Math.PI/2; sn.position.set(0, 0.066, -0.04); g.add(sn);
        const lensSn = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.005, 10), new THREE.MeshBasicMaterial({ color: 0x88aaff }));
        lensSn.rotation.x = Math.PI/2; lensSn.position.set(0, 0.066, 0.030); g.add(lensSn);
        break;
      case 'holo':
        const ho = new THREE.Mesh(new THREE.BoxGeometry(0.040, 0.024, 0.038), dark);
        ho.position.set(0, 0.060, 0); g.add(ho);
        const reticle = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.018, 0.005),
          new THREE.MeshBasicMaterial({ color: opts.accentColor || 0x44ffff, transparent: true, opacity: 0.7 }));
        reticle.position.set(0, 0.060, -0.020); g.add(reticle);
        break;
    }
  }

  // Emissive accent strips (glow trails on sci-fi guns)
  if (opts.emissive) {
    const e1 = new THREE.Mesh(new THREE.BoxGeometry(bodyW + 0.002, 0.006, bodyD * 0.7),
      new THREE.MeshBasicMaterial({ color: ac }));
    e1.position.set(0, 0.025, 0); g.add(e1);
    const e2 = e1.clone(); e2.position.set(0, -0.030, 0); g.add(e2);
  }

  // Ejection port (a small notch on the side)
  if (opts.ejectionPort) {
    const eject = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.6, 0.012, 0.030), dark);
    eject.position.set(bodyW * 0.5 + 0.001, 0.020, -0.02); g.add(eject);
  }

  // Muzzle flash
  const flash = makeMuzzleFlash();
  if (opts.flashColor && flash.material) flash.material.color.setHex(opts.flashColor);
  flash.position.set(0, 0.014, barrelZ - barrelLen * 0.5 - 0.01 - (opts.suppressor ? 0.10 : 0));
  g.add(flash);
  g._flash = flash;
  g._kickZ = opts.kickZ ?? 0.014;
  g.position.set(0.12, -0.1, -0.25);
  return g;
}
function buildAN94()           { return _genericGun({ bodyShape:'classic', bodyColor:0x2a2a2a, accentColor:0x6a6a6a, magType:'banana', topRail:true, scope:'red_dot', ejectionPort:true }); }
function buildSPAS12()         { return _genericGun({ bodyShape:'shotgun', bodyColor:0x1b1b1b, accentColor:0x8a4a1a, magType:'hidden', foregrip:true, scope:'holo', barrelR:0.014 }); }
function buildM1Garand()       { return _genericGun({ bodyShape:'sniper', bodyColor:0x5a3a18, accentColor:0xddc066, magType:'hidden', stock:'classic', ejectionPort:true }); }
function buildPlasmaCarbine()  { return _genericGun({ bodyShape:'futuristic', bodyColor:0x224400, accentColor:0x66ff99, magType:'box', emissive:true, scope:'holo', flashColor:0x66ff99 }); }
function buildArcRifle()       { return _genericGun({ bodyShape:'futuristic', bodyColor:0x223344, accentColor:0xaaeeff, magType:'box', emissive:true, scope:'red_dot', flashColor:0xaaeeff }); }
function buildGravityLauncher(){ return _genericGun({ bodyShape:'heavy', bodyColor:0x331144, accentColor:0x7744cc, magType:'drum', emissive:true, flashColor:0xaa44ff, kickZ:0.030 }); }
function buildPotatoCannon()   { return _genericGun({ bodyShape:'heavy', bodyColor:0x6a4422, accentColor:0xc89060, magType:'hidden', foregrip:true, barrelR:0.016, flashColor:0xc89060 }); }
function buildStickerBlaster() { return _genericGun({ bodyShape:'compact', bodyColor:0xff66cc, accentColor:0xffff66, magType:'drum', emissive:true, flashColor:0xff44ff }); }
function buildHarpoonGun()     { return _genericGun({ bodyShape:'sniper', bodyColor:0x445566, accentColor:0xb8b8b8, magType:'hidden', suppressor:true, foregrip:true, barrelR:0.013 }); }
function buildMortarRifle()    { return _genericGun({ bodyShape:'heavy', bodyColor:0x445533, accentColor:0x223322, magType:'banana', foregrip:true, scope:'acog' }); }
function buildMachinePistol()  { return _genericGun({ bodyShape:'pistol', bodyColor:0x222222, accentColor:0x444444, magType:'banana', stock:'folding' }); }
function buildSawedOff()       { return _genericGun({ bodyShape:'compact', bodyColor:0x301810, accentColor:0x5a2a10, magType:'hidden', barrelCount:2, barrelR:0.012, stock:'hidden' }); }
function buildDartGun()        { return _genericGun({ bodyShape:'pistol', bodyColor:0x224422, accentColor:0x44ff66, magType:'box', suppressor:true, flashColor:0x44ff66 }); }
function buildLaserPointer()   { return _genericGun({ bodyShape:'pistol', bodyColor:0x111111, accentColor:0xff2222, magType:'hidden', emissive:true, scope:'red_dot', flashColor:0xff2222 }); }
function buildCoinGun()        { return _genericGun({ bodyShape:'pistol', bodyColor:0xddaa22, accentColor:0xffd700, magType:'hidden', emissive:true, flashColor:0xffd700 }); }
function buildArcTorrent()     { return _genericGun({ bodyShape:'futuristic', bodyColor:0x113355, accentColor:0xaaeeff, magType:'box', emissive:true, foregrip:true, flashColor:0xaaeeff, barrelR:0.015 }); }
function buildFireworkLauncher(){ return _genericGun({ bodyShape:'heavy', bodyColor:0x551133, accentColor:0xff44aa, magType:'drum', emissive:true, flashColor:0xff44aa, kickZ:0.028 }); }
function buildSwitchbladeGun() { return _genericGun({ bodyShape:'compact', bodyColor:0x442266, accentColor:0xcc66ff, magType:'banana', emissive:true, scope:'holo', flashColor:0xcc66ff }); }
// 3rd-batch primary models
function buildFlechette()        { return _genericGun({ bodyShape:'bullpup', bodyColor:0xb0b0b0, accentColor:0xeeeeee, magType:'box', scope:'sniper', suppressor:true, flashColor:0xcccccc }); }
function buildThermalLMG()       { return _genericGun({ bodyShape:'heavy', bodyColor:0x661a1a, accentColor:0xff6644, magType:'drum', foregrip:true, emissive:true, flashColor:0xff6644 }); }
function buildBurstCannon()      { return _genericGun({ bodyShape:'bullpup', bodyColor:0x554433, accentColor:0xffaa22, magType:'banana', scope:'acog', foregrip:true }); }
function buildIncendiaryShotgun(){ return _genericGun({ bodyShape:'shotgun', bodyColor:0x331100, accentColor:0xff5522, magType:'hidden', foregrip:true, emissive:true, flashColor:0xff5522, barrelR:0.014 }); }
function buildCoilgun()          { return _genericGun({ bodyShape:'sniper', bodyColor:0x223344, accentColor:0x66ddff, magType:'box', scope:'sniper', emissive:true, flashColor:0x66ddff }); }
function buildSmartSMG()         { return _genericGun({ bodyShape:'compact', bodyColor:0x114433, accentColor:0x99ff99, magType:'banana', scope:'holo', emissive:true, flashColor:0x99ff99 }); }
function buildAMR()              { return _genericGun({ bodyShape:'sniper', bodyColor:0x554422, accentColor:0xddaa44, magType:'box', scope:'sniper', suppressor:true, foregrip:true, barrelR:0.014 }); }
function buildAirRifle()         { return _genericGun({ bodyShape:'sniper', bodyColor:0x223355, accentColor:0xaaccff, magType:'hidden', suppressor:true, scope:'sniper' }); }
function buildShockwaveLauncher(){ return _genericGun({ bodyShape:'heavy', bodyColor:0x333366, accentColor:0xddddff, magType:'hidden', barrelR:0.022, emissive:true, flashColor:0xddddff, kickZ:0.030 }); }
function buildTwinAR()           { return _genericGun({ bodyShape:'classic', bodyColor:0x332211, accentColor:0xffcc66, magType:'banana', barrelCount:2, scope:'red_dot' }); }
function buildMachineRevolver()  { return _genericGun({ bodyShape:'pistol', bodyColor:0x222222, accentColor:0xaaaaaa, magType:'hidden', barrelR:0.013 }); }
function buildEMPPistol()        { return _genericGun({ bodyShape:'pistol', bodyColor:0x113355, accentColor:0x66ccff, magType:'hidden', emissive:true, flashColor:0x66ccff }); }
// 😈 P2W models
function buildSwarmRifle()       { return _genericGun({ bodyShape:'futuristic', bodyColor:0x440044, accentColor:0xff00ff, magType:'banana', scope:'holo', emissive:true, flashColor:0xff44ff }); }
function buildLazyLaser()        { return _genericGun({ bodyShape:'futuristic', bodyColor:0x550055, accentColor:0xff44ff, magType:'box', barrelR:0.024, emissive:true, flashColor:0xff44ff, foregrip:true }); }
function buildStormCannon()      { return _genericGun({ bodyShape:'heavy', bodyColor:0x113355, accentColor:0xaaeeff, magType:'drum', emissive:true, flashColor:0xaaeeff, foregrip:true }); }
function buildRoyalMinigun()     { return _genericGun({ bodyShape:'heavy', bodyColor:0x554400, accentColor:0xffd700, magType:'pan', barrelCount:6, barrelR:0.008, foregrip:true, emissive:true, flashColor:0xffd700 }); }
function buildPocketRocket()     { return _genericGun({ bodyShape:'pistol', bodyColor:0x331100, accentColor:0xff8800, magType:'hidden', barrelR:0.020, emissive:true, flashColor:0xff8800 }); }
function buildAutoRevolver()     { return _genericGun({ bodyShape:'pistol', bodyColor:0x222211, accentColor:0xffcc88, magType:'hidden', scope:'red_dot' }); }
function buildFrostBlaster()     { return _genericGun({ bodyShape:'compact', bodyColor:0x113344, accentColor:0x99eeff, magType:'box', emissive:true, scope:'holo', flashColor:0x99eeff }); }

// 🆕 Batch-4 secondaries — gun-shaped ones reuse _genericGun, throwables get bespoke shapes
function buildSnubRevolver()  { return _genericGun({ bodyShape:'pistol', bodyColor:0x222222, accentColor:0x888888, magType:'hidden', barrelR:0.011 }); }
function buildDuelistPistol() { return _genericGun({ bodyShape:'pistol', bodyColor:0x331111, accentColor:0xddccaa, magType:'hidden', barrelR:0.012, scope:'red_dot' }); }
function buildMauser()        { return _genericGun({ bodyShape:'pistol', bodyColor:0x442211, accentColor:0xaa8844, magType:'hidden', barrelR:0.012 }); }
function buildMiniUzi()       { return _genericGun({ bodyShape:'compact', bodyColor:0x1a1a1a, accentColor:0x555555, magType:'banana' }); }
function buildNailGun()       { return _genericGun({ bodyShape:'compact', bodyColor:0xaa6622, accentColor:0xccccaa, magType:'box', barrelR:0.014 }); }
function buildBoomstick()     { return _genericGun({ bodyShape:'pistol', bodyColor:0x553311, accentColor:0x886644, magType:'hidden', barrelR:0.022, barrelCount:2 }); }
function buildSignalPistol()  { return _genericGun({ bodyShape:'pistol', bodyColor:0xffaa44, accentColor:0xffcc66, magType:'hidden', barrelR:0.024, emissive:true, flashColor:0xff8800 }); }

// Throwable models — built from primitives, no gun chassis.
// IMPORTANT: must include a `_flash` Object3D — the fire/fanfire code
// accesses model._flash.visible / .getWorldPosition unconditionally.
function _throwableHolder(meshFn) {
  const g = new THREE.Group();
  meshFn(g);
  // Invisible muzzle stand-in so firing code doesn't crash on undefined.
  const flash = new THREE.Object3D();
  flash.position.set(0, 0, -0.20); // pretend muzzle ~20cm in front
  g.add(flash);
  g._flash = flash;
  g.position.set(0.16, -0.10, -0.22);
  return g;
}
function buildThrowingAxes() {
  return _throwableHolder(g => {
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.22, 8),
      new THREE.MeshLambertMaterial({ color: 0x553322 }));
    handle.rotation.x = Math.PI / 2; handle.position.set(0, 0, -0.02); g.add(handle);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.10, 0.03),
      new THREE.MeshLambertMaterial({ color: 0x8a5a2a }));
    head.position.set(0, 0.06, -0.10); g.add(head);
  });
}
function buildShuriken() {
  return _throwableHolder(g => {
    const mat = new THREE.MeshLambertMaterial({ color: 0xcccccc, metalness: 0.5 });
    // 4-pointed star made of crossing rectangles
    const a = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.025, 0.005), mat);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.14, 0.005), mat);
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.10, 0.005), mat);
    c.rotation.z = Math.PI / 4;
    a.position.set(0, 0, -0.06); b.position.set(0, 0, -0.06); c.position.set(0, 0, -0.061);
    g.add(a); g.add(b); g.add(c);
  });
}
function buildBoomerang() {
  return _throwableHolder(g => {
    const mat = new THREE.MeshLambertMaterial({ color: 0xcc8855 });
    const arm1 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.02), mat);
    const arm2 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.02), mat);
    arm1.rotation.z = Math.PI / 6; arm2.rotation.z = -Math.PI / 6;
    arm1.position.set(-0.04, 0.02, -0.06); arm2.position.set(0.04, 0.02, -0.06);
    g.add(arm1); g.add(arm2);
  });
}
function buildSlingshot() {
  return _throwableHolder(g => {
    const wood = new THREE.MeshLambertMaterial({ color: 0x6a4a2a });
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.16, 6), wood);
    handle.rotation.x = Math.PI / 2; handle.position.set(0, -0.02, 0.03); g.add(handle);
    const left  = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.12, 6), wood);
    const right = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.12, 6), wood);
    left.rotation.z = Math.PI / 6;  right.rotation.z = -Math.PI / 6;
    left.position.set(-0.05, 0.07, -0.05); right.position.set(0.05, 0.07, -0.05);
    g.add(left); g.add(right);
    // band
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.006, 0.002),
      new THREE.MeshLambertMaterial({ color: 0x000000 }));
    band.position.set(0, 0.12, -0.05); g.add(band);
  });
}
// 🌌 Sci-fi P2W models — emissive, futuristic chassis
function buildEventHorizonRifle() { return _genericGun({ bodyShape:'futuristic', bodyColor:0x220033, accentColor:0x6633ff, magType:'box', emissive:true, scope:'holo', flashColor:0x9966ff, kickZ:0.025 }); }
function buildStormCore()         { return _genericGun({ bodyShape:'heavy',      bodyColor:0x113355, accentColor:0x88ddff, magType:'drum', emissive:true, foregrip:true, flashColor:0xaaeeff }); }
function buildAbsZero()           { return _genericGun({ bodyShape:'futuristic', bodyColor:0x113344, accentColor:0x99eeff, magType:'pan', emissive:true, scope:'holo', flashColor:0xaaffff, barrelR:0.020 }); }
function buildSolarLance()        { return _genericGun({ bodyShape:'futuristic', bodyColor:0xaa6611, accentColor:0xffee44, magType:'hidden', emissive:true, scope:'sniper', flashColor:0xffee88, barrelR:0.014 }); }
function buildPhaseDriver()       { return _genericGun({ bodyShape:'classic',    bodyColor:0x331144, accentColor:0xaa66ff, magType:'banana', emissive:true, scope:'holo', flashColor:0xcc99ff }); }
function buildQuantumRepeater()   { return _genericGun({ bodyShape:'futuristic', bodyColor:0x224455, accentColor:0x66ffcc, magType:'box', emissive:true, scope:'holo', flashColor:0x88ffdd }); }
function buildMagnetar()          { return _genericGun({ bodyShape:'heavy',      bodyColor:0x441133, accentColor:0xff77cc, magType:'drum', emissive:true, foregrip:true, flashColor:0xff99dd, barrelR:0.022, kickZ:0.030 }); }
function buildNebulaMortar()      { return _genericGun({ bodyShape:'heavy',      bodyColor:0x331144, accentColor:0x9966ff, magType:'hidden', emissive:true, foregrip:true, flashColor:0xaa88ff, barrelR:0.028, kickZ:0.040 }); }
function buildPrismEngine()       { return _genericGun({ bodyShape:'futuristic', bodyColor:0x442266, accentColor:0xffaaff, magType:'drum', emissive:true, scope:'holo', flashColor:0xffccff }); }
function buildVoidHarvester()     { return _genericGun({ bodyShape:'heavy',      bodyColor:0x110011, accentColor:0x440066, magType:'box', emissive:true, foregrip:true, flashColor:0x6633aa, barrelR:0.024, kickZ:0.035 }); }
function buildPulseNeedle()       { return _genericGun({ bodyShape:'compact',    bodyColor:0x331133, accentColor:0xff66cc, magType:'box', emissive:true, flashColor:0xff99dd }); }
function buildPhasePistol()       { return _genericGun({ bodyShape:'pistol',     bodyColor:0x222244, accentColor:0xaa66ff, magType:'hidden', emissive:true, scope:'red_dot', flashColor:0xcc99ff }); }
function buildIonRevolver()       { return _genericGun({ bodyShape:'pistol',     bodyColor:0x114455, accentColor:0x66ccff, magType:'hidden', emissive:true, flashColor:0x99ddff }); }

function buildBlowgun() {
  return _throwableHolder(g => {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.50, 10),
      new THREE.MeshLambertMaterial({ color: 0x33aa55 }));
    tube.rotation.x = Math.PI / 2; tube.position.set(0, 0, -0.20); g.add(tube);
    const mouth = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.018, 0.04, 8),
      new THREE.MeshLambertMaterial({ color: 0x223a33 }));
    mouth.rotation.x = Math.PI / 2; mouth.position.set(0, 0, 0.02); g.add(mouth);
  });
}
// 🔬 Tech / Physics models
function buildPrismLauncher()    { return _genericGun({ bodyShape:'futuristic', bodyColor:0x440044, accentColor:0xffaaff, magType:'pan', emissive:true, scope:'holo', flashColor:0xffaaff }); }
function buildFoamCannon()       { return _genericGun({ bodyShape:'heavy', bodyColor:0x445566, accentColor:0xddddee, magType:'drum', barrelR:0.020, foregrip:true, flashColor:0xeeeeff }); }
function buildAirburstProjector(){ return _genericGun({ bodyShape:'futuristic', bodyColor:0x224455, accentColor:0xaaffff, magType:'box', barrelR:0.018, emissive:true, flashColor:0xaaffff }); }
function buildGlassmaker()       { return _genericGun({ bodyShape:'futuristic', bodyColor:0x337755, accentColor:0xccffee, magType:'box', emissive:true, scope:'holo', flashColor:0xccffee }); }
function buildMagnetRifle()      { return _genericGun({ bodyShape:'futuristic', bodyColor:0x441133, accentColor:0xff77cc, magType:'banana', scope:'red_dot', emissive:true, flashColor:0xff77cc }); }
function buildSeismicHammer()    { return _genericGun({ bodyShape:'heavy', bodyColor:0x442211, accentColor:0x885522, magType:'hidden', barrelR:0.024, foregrip:true, kickZ:0.032, flashColor:0xaa5522 }); }
function buildPainterBeam()      { return _genericGun({ bodyShape:'futuristic', bodyColor:0x556622, accentColor:0xffff44, magType:'drum', emissive:true, flashColor:0xffff44 }); }
function buildPortalLauncher()   { return _genericGun({ bodyShape:'futuristic', bodyColor:0x113355, accentColor:0x66ccff, magType:'box', emissive:true, scope:'holo', flashColor:0x66ccff, barrelR:0.018 }); }
function buildPulseDisc()        { return _genericGun({ bodyShape:'futuristic', bodyColor:0x112244, accentColor:0x44ddff, magType:'pan', emissive:true, flashColor:0x44ddff }); }
function buildGravityPaint()     { return _genericGun({ bodyShape:'futuristic', bodyColor:0x331144, accentColor:0xaa44ff, magType:'drum', emissive:true, scope:'holo', flashColor:0xaa44ff }); }
function buildTrafficController(){ return _genericGun({ bodyShape:'compact', bodyColor:0x332211, accentColor:0xff2200, magType:'box', scope:'holo', emissive:true, flashColor:0xffaa00 }); }
function buildPinballLauncher()  { return _genericGun({ bodyShape:'heavy', bodyColor:0x551111, accentColor:0xffaa44, magType:'pan', barrelR:0.024, emissive:true, foregrip:true, flashColor:0xffaa44, kickZ:0.030 }); }
// 🪖 ADMIN weapon models — military theme, mostly olive/gunmetal + tactical accessories
function buildGAU19()        { return _genericGun({ bodyShape:'heavy', bodyColor:0x2a3526, accentColor:0x6a6a6a, magType:'drum', barrelCount:3, barrelR:0.012, foregrip:true, topRail:true, kickZ:0.020 }); }
function buildMK44()         { return _genericGun({ bodyShape:'heavy', bodyColor:0x3a3a2a, accentColor:0x666633, magType:'drum', barrelR:0.015, foregrip:true, scope:'acog' }); }
function buildXM7()          { return _genericGun({ bodyShape:'classic', bodyColor:0x222222, accentColor:0x888888, magType:'banana', scope:'acog', foregrip:true, ejectionPort:true }); }
function buildBarrett()      { return _genericGun({ bodyShape:'sniper', bodyColor:0x2a2a1a, accentColor:0xddaa44, magType:'box', scope:'sniper', suppressor:true, foregrip:true, barrelR:0.014 }); }
function buildM134()         { return _genericGun({ bodyShape:'heavy', bodyColor:0x333333, accentColor:0x222222, magType:'pan', barrelCount:6, barrelR:0.009, foregrip:true, kickZ:0.020 }); }
function buildHKMP7()        { return _genericGun({ bodyShape:'compact', bodyColor:0x1a1a1a, accentColor:0x555555, magType:'banana', scope:'holo', suppressor:true, foregrip:true }); }
function buildP90Spec()      { return _genericGun({ bodyShape:'bullpup', bodyColor:0x1a1a1a, accentColor:0x444444, magType:'pan', scope:'red_dot', topRail:true }); }
function buildDesertEagle()  { return _genericGun({ bodyShape:'pistol', bodyColor:0xa68b3a, accentColor:0xddc466, magType:'hidden', barrelR:0.014, scope:'red_dot' }); }
function buildM1911()        { return _genericGun({ bodyShape:'pistol', bodyColor:0x222222, accentColor:0x888888, magType:'hidden', ejectionPort:true }); }
function buildPPK()          { return _genericGun({ bodyShape:'pistol', bodyColor:0x1a1a1a, accentColor:0x444444, magType:'hidden', suppressor:true }); }
function buildGlock18()      { return _genericGun({ bodyShape:'pistol', bodyColor:0x222222, accentColor:0x555555, magType:'banana' }); }
function buildFiveSeven()    { return _genericGun({ bodyShape:'pistol', bodyColor:0x333333, accentColor:0xddddff, magType:'hidden', scope:'red_dot' }); }

// Order must match WEAPONS array.
const weaponModels = [
  buildAK20(), buildAK30(), buildSG8(), buildSG100(),
  buildSRX(), buildRPD(), buildMP40(), buildP90(),
  buildPaintball(), buildBurstRifle(), buildLeverRifle(), buildAutoShotgun(),
  buildVectorSMG(), buildCrossbow(), buildFlamethrower(), buildGrenadeLauncher(),
  buildRailgun(), buildMinigun(), buildFreezeGun(), buildBoombow(),
  buildRevolver(), buildFlare(), buildPistol(), buildShorty(), buildCycler(),
  buildHandCannon(), buildThrowingKnives(), buildTaser(),
  // ── New primaries ──────────────────────────────────────────────────────
  buildAN94(), buildSPAS12(), buildM1Garand(), buildPlasmaCarbine(), buildArcRifle(),
  buildGravityLauncher(), buildPotatoCannon(), buildStickerBlaster(), buildHarpoonGun(), buildMortarRifle(),
  buildArcTorrent(), buildFireworkLauncher(), buildSwitchbladeGun(),
  // ── 3rd-batch primaries ──────────────────────────────────────────────────
  buildFlechette(), buildThermalLMG(), buildBurstCannon(), buildIncendiaryShotgun(),
  buildCoilgun(), buildSmartSMG(), buildAMR(), buildAirRifle(),
  buildShockwaveLauncher(), buildTwinAR(),
  // ── 😈 P2W primaries ─────────────────────────────────────────────────────
  buildSwarmRifle(), buildLazyLaser(), buildStormCannon(), buildRoyalMinigun(),
  // ── 🔬 Tech / Physics primaries ──────────────────────────────────────────
  buildPrismLauncher(), buildFoamCannon(), buildAirburstProjector(), buildGlassmaker(),
  buildMagnetRifle(), buildSeismicHammer(), buildPainterBeam(), buildPortalLauncher(),
  buildPulseDisc(), buildGravityPaint(), buildTrafficController(), buildPinballLauncher(),
  // ── New secondaries ────────────────────────────────────────────────────
  buildMachinePistol(), buildSawedOff(), buildDartGun(), buildLaserPointer(), buildCoinGun(),
  // ── 3rd-batch secondaries ─────────────────────────────────────────────────
  buildMachineRevolver(), buildEMPPistol(),
  // ── 😈 P2W secondaries ───────────────────────────────────────────────────
  buildPocketRocket(), buildAutoRevolver(), buildFrostBlaster(),
  // ── 🆕 Batch-4 secondaries (must match WEAPONS order) ──────────────────
  buildSnubRevolver(), buildDuelistPistol(), buildMauser(), buildMiniUzi(),
  buildNailGun(), buildBoomstick(), buildSignalPistol(), buildThrowingAxes(),
  buildShuriken(), buildBoomerang(), buildSlingshot(), buildBlowgun(),
  // ── 🌌 SCI-FI P2W primaries ─────────────────────────────────────────────
  buildEventHorizonRifle(), buildStormCore(), buildAbsZero(), buildSolarLance(),
  buildPhaseDriver(), buildQuantumRepeater(), buildMagnetar(), buildNebulaMortar(),
  buildPrismEngine(), buildVoidHarvester(),
  // ── 🌌 SCI-FI P2W secondaries ───────────────────────────────────────────
  buildPulseNeedle(), buildPhasePistol(), buildIonRevolver(),
  // ── 🪖 ADMIN primaries ───────────────────────────────────────────────────
  buildGAU19(), buildMK44(), buildXM7(), buildBarrett(), buildM134(), buildHKMP7(), buildP90Spec(),
  // ── 🪖 ADMIN secondaries ─────────────────────────────────────────────────
  buildDesertEagle(), buildM1911(), buildPPK(), buildGlock18(), buildFiveSeven(),
  buildMG42(),
];
weaponModels.forEach((m,i) => { m.visible = i === 0; camera.add(m); });
scene.add(camera);

// ── Melee item model builders ─────────────────────────────────────────────

function buildBat() {
  const g = new THREE.Group();
  const woodMat  = new THREE.MeshLambertMaterial({ color: 0x8b5a2b });
  const darkMat  = new THREE.MeshLambertMaterial({ color: 0x5a3810 });
  // Barrel (wide end)
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.015, 0.38, 8), woodMat);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0, -0.06); g.add(barrel);
  // Grip (narrow handle)
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.012, 0.12, 8), darkMat);
  handle.rotation.x = Math.PI / 2; handle.position.set(0, 0, 0.155); g.add(handle);
  // Knob at end of handle
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.014, 0.022, 8), darkMat);
  knob.rotation.x = Math.PI / 2; knob.position.set(0, 0, 0.228); g.add(knob);
  g.position.set(0.10, -0.12, -0.20); return g;
}

function buildSabre() {
  const g = new THREE.Group();
  const silverMat = new THREE.MeshLambertMaterial({ color: 0xc0c8cc });
  const goldMat   = new THREE.MeshLambertMaterial({ color: 0xddaa22 });
  const wrapMat   = new THREE.MeshLambertMaterial({ color: 0x2a1a0a });
  // Flat blade
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.006, 0.28), silverMat);
  blade.position.set(0, 0, -0.08); g.add(blade);
  // Fuller groove
  const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.003, 0.22), new THREE.MeshBasicMaterial({ color: 0x8899aa }));
  fuller.position.set(0.005, 0, -0.08); g.add(fuller);
  // Guard crosspiece
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.018, 0.016), goldMat);
  guard.position.set(0, 0, 0.065); g.add(guard);
  // Grip
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.055, 0.016), wrapMat);
  grip.position.set(0, 0, 0.112); g.add(grip);
  // Pommel
  const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 5), goldMat);
  pommel.position.set(0, 0, 0.150); g.add(pommel);
  g.position.set(0.10, -0.12, -0.20); return g;
}

function buildFryingPan() {
  const g = new THREE.Group();
  const panMat    = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
  const handleMat = new THREE.MeshLambertMaterial({ color: 0x5a3810 });
  // Pan disc (flat cylinder)
  const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.018, 12), panMat);
  pan.rotation.x = Math.PI / 2; pan.position.set(0, 0, -0.06); g.add(pan);
  // Rim around pan
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.100, 0.008, 5, 12), panMat);
  rim.position.set(0, 0, -0.052); g.add(rim);
  // Long handle
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.016, 0.20), handleMat);
  handle.position.set(0, 0, 0.130); g.add(handle);
  g.position.set(0.10, -0.12, -0.20); return g;
}

function buildSledge() {
  const g = new THREE.Group();
  const headMat   = new THREE.MeshLambertMaterial({ color: 0x333333 });
  const handleMat = new THREE.MeshLambertMaterial({ color: 0x6b3a20 });
  // Heavy hammer head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.060, 0.055), headMat);
  head.position.set(0, 0, -0.100); g.add(head);
  // Metal face plates on head
  const faceF = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.058, 0.006), new THREE.MeshLambertMaterial({ color: 0x555555 }));
  faceF.position.set(0, 0, -0.131); g.add(faceF);
  // Long wooden handle
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.016, 0.30), handleMat);
  handle.position.set(0, 0, 0.075); g.add(handle);
  // Handle wrap rings
  [0.050, 0.120, 0.190].forEach(z => {
    const ring = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.022, 0.008), headMat);
    ring.position.set(0, 0, z); g.add(ring);
  });
  g.position.set(0.10, -0.12, -0.20); return g;
}

function buildSpear() {
  const g = new THREE.Group();
  const shaftMat = new THREE.MeshLambertMaterial({ color: 0x7a4f28 });
  const tipMat   = new THREE.MeshLambertMaterial({ color: 0xc0c8cc });
  // Long shaft
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.52, 6), shaftMat);
  shaft.rotation.x = Math.PI / 2; shaft.position.set(0, 0, 0.040); g.add(shaft);
  // Pointed metal tip
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0, 0.012, 0.04, 4), tipMat);
  tip.rotation.x = Math.PI / 2; tip.position.set(0, 0, -0.240); g.add(tip);
  // Tip base ring
  const tipBase = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.010, 0.012, 6), tipMat);
  tipBase.rotation.x = Math.PI / 2; tipBase.position.set(0, 0, -0.218); g.add(tipBase);
  // Butt cap
  const butt = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.008, 0.018, 6), tipMat);
  butt.rotation.x = Math.PI / 2; butt.position.set(0, 0, 0.314); g.add(butt);
  g.position.set(0.10, -0.12, -0.20); return g;
}

function buildKatana() {
  const g = new THREE.Group();
  const bladeMat  = new THREE.MeshLambertMaterial({ color: 0xe8eef4 });
  const edgeMat   = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const wrapMat   = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
  const guardMat  = new THREE.MeshLambertMaterial({ color: 0x7a6a30 });
  // Long curved blade (approximated with slightly angled box)
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.018, 0.40), bladeMat);
  blade.position.set(0, 0.002, -0.16); g.add(blade);
  // Cutting edge highlight
  const edge = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.003, 0.38), edgeMat);
  edge.position.set(0.006, -0.006, -0.16); g.add(edge);
  // Round tsuba guard
  const tsuba = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.008, 8), guardMat);
  tsuba.rotation.x = Math.PI / 2; tsuba.position.set(0, 0, 0.060); g.add(tsuba);
  // Tsuka grip
  const tsuka = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.022, 0.16), wrapMat);
  tsuka.position.set(0, 0, 0.150); g.add(tsuka);
  // Ito wrapping diamonds
  for (let i = 0; i < 5; i++) {
    const ito = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.020, 0.008), guardMat);
    ito.position.set(0, 0, 0.075 + i * 0.030); g.add(ito);
  }
  g.position.set(0.10, -0.12, -0.20); return g;
}

function buildBaguette() {
  const g = new THREE.Group();
  const breadMat  = new THREE.MeshLambertMaterial({ color: 0xd4882a });
  const crustMat  = new THREE.MeshLambertMaterial({ color: 0xb06010 });
  // Main loaf (long cylinder)
  const loaf = new THREE.Mesh(new THREE.CylinderGeometry(0.040, 0.030, 0.48, 8), breadMat);
  loaf.rotation.x = Math.PI / 2; loaf.position.set(0, 0, 0.04); g.add(loaf);
  // Score marks on top
  for (let i = 0; i < 4; i++) {
    const score = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.005, 0.055), crustMat);
    score.rotation.z = 0.25;
    score.position.set(0.018, 0.038, -0.130 + i * 0.085); g.add(score);
  }
  // Pointy end
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0, 0.030, 0.055, 6), crustMat);
  tip.rotation.x = Math.PI / 2; tip.position.set(0, 0, -0.252); g.add(tip);
  g.position.set(0.10, -0.12, -0.20); return g;
}

function buildKnife() {
  const g = new THREE.Group();
  const bladeMat  = new THREE.MeshLambertMaterial({ color: 0xd0d8e0 });
  const edgeMat   = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const gripMat   = new THREE.MeshLambertMaterial({ color: 0x2a1a0a });
  const boltMat   = new THREE.MeshLambertMaterial({ color: 0x888888 });
  // Short blade
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.022, 0.16), bladeMat);
  blade.position.set(0, 0, -0.04); g.add(blade);
  // Blade tip triangle
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0, 0.012, 0.040, 3), bladeMat);
  tip.rotation.x = Math.PI / 2; tip.position.set(0, 0, -0.140); g.add(tip);
  // Edge
  const edge = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.003, 0.15), edgeMat);
  edge.position.set(0.007, -0.010, -0.040); g.add(edge);
  // Guard
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.012, 0.010), boltMat);
  guard.position.set(0, 0, 0.045); g.add(guard);
  // Grip
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.030, 0.11), gripMat);
  grip.position.set(0, 0, 0.108); g.add(grip);
  // Grip rivets
  [0.075, 0.120].forEach(z => {
    const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.005, 4, 3), boltMat);
    rivet.position.set(0.010, 0, z); g.add(rivet);
  });
  g.position.set(0.10, -0.12, -0.20); return g;
}

function buildChainsaw() {
  const g = new THREE.Group();
  const bodyMat   = new THREE.MeshLambertMaterial({ color: 0xff6600 });
  const darkMat   = new THREE.MeshLambertMaterial({ color: 0x222222 });
  const chainMat  = new THREE.MeshLambertMaterial({ color: 0x888888 });
  const handleMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
  // Engine housing body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.080, 0.065, 0.18), bodyMat);
  body.position.set(0, 0, 0.060); g.add(body);
  // Exhaust vents on top
  for (let i = 0; i < 3; i++) {
    const vent = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.010, 0.030), darkMat);
    vent.position.set(-0.025 + i * 0.024, 0.038, 0.035 + i * 0.010); g.add(vent);
  }
  // Guide bar (flat blade bar)
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.035, 0.30), darkMat);
  bar.position.set(0, 0.005, -0.11); g.add(bar);
  // Chain teeth along bar
  for (let i = 0; i < 8; i++) {
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.008, 0.010), chainMat);
    tooth.position.set(0, 0.020, -0.255 + i * 0.038); g.add(tooth);
  }
  // Rear handle
  const rearHandle = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.060, 0.016), handleMat);
  rearHandle.position.set(0, 0, 0.195); g.add(rearHandle);
  // Top front handle
  const frontHandle = new THREE.Mesh(new THREE.BoxGeometry(0.080, 0.016, 0.016), handleMat);
  frontHandle.position.set(0, 0.055, 0.055); g.add(frontHandle);
  g.position.set(0.10, -0.12, -0.20); return g;
}

function buildLightsabre() {
  const g = new THREE.Group();
  const gripMat   = new THREE.MeshLambertMaterial({ color: 0x555555 });
  const ringMat   = new THREE.MeshLambertMaterial({ color: 0x888888 });
  const bladeMat  = new THREE.MeshBasicMaterial({ color: 0x00ddff }); // glowing cyan
  const coreMat   = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const emitterMat= new THREE.MeshLambertMaterial({ color: 0x333333 });
  // Metal grip cylinder
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.014, 0.14, 8), gripMat);
  grip.rotation.x = Math.PI / 2; grip.position.set(0, 0, 0.125); g.add(grip);
  // Grip detail rings
  [0.068, 0.100, 0.140, 0.170].forEach(z => {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.008, 8), ringMat);
    ring.rotation.x = Math.PI / 2; ring.position.set(0, 0, z); g.add(ring);
  });
  // Emitter shroud
  const emitter = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.016, 0.028, 8), emitterMat);
  emitter.rotation.x = Math.PI / 2; emitter.position.set(0, 0, 0.042); g.add(emitter);
  // Glowing energy blade
  const blade = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.007, 0.36, 8), bladeMat);
  blade.rotation.x = Math.PI / 2; blade.position.set(0, 0, -0.155); g.add(blade);
  // Bright core
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.003, 0.36, 6), coreMat);
  core.rotation.x = Math.PI / 2; core.position.set(0, 0, -0.155); g.add(core);
  // Blade tip glow
  const tipGlow = new THREE.Mesh(new THREE.SphereGeometry(0.010, 6, 4), bladeMat);
  tipGlow.position.set(0, 0, -0.338); g.add(tipGlow);
  g.position.set(0.10, -0.12, -0.20); return g;
}

function buildRiotShield() {
  const g = new THREE.Group();
  const shellMat   = new THREE.MeshLambertMaterial({ color: 0x2255aa, transparent: true, opacity: 0.75 });
  const frameMat   = new THREE.MeshLambertMaterial({ color: 0x333a44 });
  const viewportMat= new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.50 });
  const gripMat    = new THREE.MeshLambertMaterial({ color: 0x222222 });
  // Main shield face (wide and tall)
  const face = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.30, 0.016), shellMat);
  face.position.set(-0.04, 0, -0.10); g.add(face);
  // Outer frame border
  const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.30, 0.022), frameMat);
  frameL.position.set(-0.223, 0, -0.10); g.add(frameL);
  const frameR = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.30, 0.022), frameMat);
  frameR.position.set(0.143, 0, -0.10); g.add(frameR);
  const frameT = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.014, 0.022), frameMat);
  frameT.position.set(-0.04, 0.157, -0.10); g.add(frameT);
  const frameB = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.014, 0.022), frameMat);
  frameB.position.set(-0.04, -0.157, -0.10); g.add(frameB);
  // Transparent viewport window
  const viewport = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.095, 0.012), viewportMat);
  viewport.position.set(-0.04, 0.055, -0.097); g.add(viewport);
  // Center grip handle
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.140, 0.018), gripMat);
  grip.position.set(0.055, 0, 0.025); g.add(grip);
  // Forearm strap
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.080, 0.018, 0.014), gripMat);
  strap.position.set(0.010, -0.055, 0.022); g.add(strap);
  g.position.set(0.10, -0.12, -0.20); return g;
}

function buildScrewdriver() {
  const g = new THREE.Group();
  const handleMat = new THREE.MeshLambertMaterial({ color: 0xcc3300 });
  const neckMat   = new THREE.MeshLambertMaterial({ color: 0xaaaaaa });
  const shaftMat  = new THREE.MeshLambertMaterial({ color: 0xcccccc });
  const tipMat    = new THREE.MeshLambertMaterial({ color: 0x888888 });
  // Handle body (fat cylinder)
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.022, 0.13, 8), handleMat);
  handle.rotation.x = Math.PI / 2; handle.position.set(0, 0, 0.128); g.add(handle);
  // Yellow grip bands
  const bandMat = new THREE.MeshLambertMaterial({ color: 0xffcc00 });
  [0.085, 0.165].forEach(z => {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.030, 0.030, 0.014, 8), bandMat);
    band.rotation.x = Math.PI / 2; band.position.set(0, 0, z); g.add(band);
  });
  // Metal neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.022, 0.028, 6), neckMat);
  neck.rotation.x = Math.PI / 2; neck.position.set(0, 0, 0.048); g.add(neck);
  // Shaft
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.18, 6), shaftMat);
  shaft.rotation.x = Math.PI / 2; shaft.position.set(0, 0, -0.055); g.add(shaft);
  // Flathead tip
  const tip = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.006, 0.018), tipMat);
  tip.position.set(0, 0, -0.154); g.add(tip);
  g.position.set(0.10, -0.12, -0.20); return g;
}

// ── Riot Shield blocking helper ───────────────────────────────────────────────
function isRiotShieldBlocking() {
  if (activeSlot !== 'melee') return false;
  const item = MELEE_ITEMS[selectedMeleeIdx];
  if (!item || !item.shield) return false;
  // Blocking = shield equipped AND not mid-swing
  return meleeSwingT >= 1;
}

// ── New melee model builders (simple themed shapes) ─────────────────────
function _genericMelee(opts) {
  // opts: { handleColor, headColor, headShape='box', length=0.35 }
  const g = new THREE.Group();
  const handleMat = new THREE.MeshLambertMaterial({ color: opts.handleColor ?? 0x4a2a0e });
  const headMat   = new THREE.MeshLambertMaterial({ color: opts.headColor ?? 0xaaaaaa });
  // Handle
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, opts.length ?? 0.35, 8), handleMat);
  handle.rotation.x = Math.PI/2; handle.position.set(0, 0, 0); g.add(handle);
  // Head/business end (forward)
  let head;
  if (opts.headShape === 'sphere') head = new THREE.Mesh(new THREE.SphereGeometry(opts.headSize ?? 0.04, 8, 6), headMat);
  else if (opts.headShape === 'axe') {
    head = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.10, 0.10), headMat);
  } else {
    head = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.05), headMat);
  }
  head.position.set(0, 0, -(opts.length ?? 0.35) / 2 - 0.03); g.add(head);
  g.position.set(0.14, -0.12, -0.3);
  return g;
}
function buildCrowbar()    { return _genericMelee({ handleColor: 0xaa3322, headColor: 0xaa3322, length: 0.34, headShape: 'box' }); }
function buildFireAxe()    { return _genericMelee({ handleColor: 0x5a3a18, headColor: 0xcc4422, length: 0.38, headShape: 'axe' }); }
function buildNunchucks()  { return _genericMelee({ handleColor: 0x1a1a1a, headColor: 0xddaa22, length: 0.20, headShape: 'sphere', headSize: 0.035 }); }
function buildUmbrella()   {
  const g = new THREE.Group();
  const shaftMat = new THREE.MeshLambertMaterial({ color: 0x222244 });
  const canopyMat = new THREE.MeshLambertMaterial({ color: 0x3344aa });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.34, 8), shaftMat);
  shaft.rotation.x = Math.PI/2; g.add(shaft);
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.06, 8), canopyMat);
  canopy.rotation.x = -Math.PI/2; canopy.position.set(0, 0, -0.17); g.add(canopy);
  g.position.set(0.14, -0.12, -0.3); return g;
}
function buildYoyo()       {
  const g = new THREE.Group();
  const yoMat = new THREE.MeshLambertMaterial({ color: 0xff4444 });
  const stringMat = new THREE.MeshLambertMaterial({ color: 0xeeeeee });
  const disc1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.022, 16), yoMat);
  disc1.rotation.z = Math.PI/2; disc1.position.set(0, -0.05, -0.18); g.add(disc1);
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.15, 4), stringMat);
  string.position.set(0, 0.02, -0.13); g.add(string);
  g.position.set(0.12, -0.10, -0.25); return g;
}
function buildCombatAxe()  { return _genericMelee({ handleColor: 0x222222, headColor: 0xaaaaaa, length: 0.36, headShape: 'axe' }); }
function buildShockBaton() {
  const g = new THREE.Group();
  const matBlack = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const matCyan  = new THREE.MeshLambertMaterial({ color: 0x44ddff });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.32, 8), matBlack);
  shaft.rotation.x = Math.PI/2; g.add(shaft);
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.04, 8), matCyan);
  tip.rotation.x = Math.PI/2; tip.position.set(0, 0, -0.18); g.add(tip);
  g.position.set(0.14, -0.12, -0.3); return g;
}
function buildTitanHammer() {
  const g = new THREE.Group();
  const matWood = new THREE.MeshLambertMaterial({ color: 0x4a2a0e });
  const matStone = new THREE.MeshLambertMaterial({ color: 0x666666 });
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.40, 8), matWood);
  handle.rotation.x = Math.PI/2; g.add(handle);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.12, 0.14), matStone);
  head.position.set(0, 0, -0.23); g.add(head);
  g.position.set(0.14, -0.12, -0.30); return g;
}
function buildVampireBlade() {
  const g = new THREE.Group();
  const matBlade = new THREE.MeshLambertMaterial({ color: 0x880022 });
  const matEdge  = new THREE.MeshLambertMaterial({ color: 0xff4466 });
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.05, 0.34), matBlade);
  blade.position.set(0, 0, -0.05); g.add(blade);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.012, 0.30), matEdge);
  edge.position.set(0.008, 0.01, -0.05); g.add(edge);
  g.position.set(0.14, -0.12, -0.30); return g;
}
// 🪖 ADMIN melee models
function buildKarambit()   { return _genericMelee({ handleColor: 0x111111, headColor: 0xaaaaaa, length: 0.18, headShape: 'sphere', headSize: 0.025 }); }
function buildBayonet()    { return _genericMelee({ handleColor: 0x333322, headColor: 0xcccccc, length: 0.42, headShape: 'box' }); }
function buildTomahawk()   { return _genericMelee({ handleColor: 0x553322, headColor: 0x444444, length: 0.30, headShape: 'axe' }); }
function buildOts04()      { return _genericMelee({ handleColor: 0x222244, headColor: 0xcccccc, length: 0.22, headShape: 'box' }); }
function buildGarrote()    {
  const g = new THREE.Group();
  const wire = new THREE.MeshLambertMaterial({ color: 0x222222 });
  const handle = new THREE.MeshLambertMaterial({ color: 0x553322 });
  const h1 = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.08, 6), handle);
  h1.rotation.x = Math.PI/2; h1.position.set(-0.06, 0, -0.04); g.add(h1);
  const h2 = h1.clone(); h2.position.set(0.06, 0, -0.04); g.add(h2);
  const w = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.14, 4), wire);
  w.rotation.z = Math.PI/2; w.position.set(0, 0, -0.04); g.add(w);
  g.position.set(0.14, -0.12, -0.30); return g;
}
function buildFists() {
  // Simple skin-tone block — no knuckles, no fingers, no brass.
  const g = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: 0xeac39a });
  const block = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.10, 0.14), skin);
  block.position.set(0, 0, -0.05);
  g.add(block);
  g.position.set(0.16, -0.10, -0.22);
  return g;
}

// Generic placeholder melee model — used for the batch-4 melees so we don't
// need 12 hand-modeled meshes. Each variant just adjusts shape + color.
function buildSimpleMelee(shape, color) {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color });
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.18, 6), new THREE.MeshLambertMaterial({ color: 0x553322 }));
  grip.rotation.x = Math.PI / 2; grip.position.set(0, 0, 0.05); g.add(grip);
  let head;
  if (shape === 'blade')       head = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.32, 0.10), mat);
  else if (shape === 'pipe')   head = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.36, 8), mat);
  else if (shape === 'club')   head = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.025, 0.28, 8), mat);
  else if (shape === 'axe')    head = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.04), mat);
  else if (shape === 'sphere') head = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), mat);
  else                         head = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.20, 0.04), mat);
  head.position.set(0, 0.14, -0.08);
  g.add(head);
  g.position.set(0.16, -0.10, -0.22);
  return g;
}
const meleeModels = [
  buildBat(), buildSabre(), buildFryingPan(), buildSledge(), buildSpear(),
  buildKatana(), buildBaguette(), buildKnife(), buildChainsaw(), buildLightsabre(),
  buildRiotShield(), buildScrewdriver(),
  // New melees (must match MELEE_ITEMS order)
  buildCrowbar(), buildFireAxe(), buildNunchucks(), buildUmbrella(), buildYoyo(),
  // 3rd-batch melees
  buildCombatAxe(), buildShockBaton(),
  // 😈 P2W melees
  buildTitanHammer(), buildVampireBlade(),
  // The classic
  buildFists(),
  // 🆕 Batch-4 melees (simple placeholder models)
  buildSimpleMelee('sphere', 0xddaa22), // brass_knuckles
  buildSimpleMelee('axe',    0x8a6a3a), // hatchet
  buildSimpleMelee('blade',  0x9a9a9a), // machete
  buildSimpleMelee('pipe',   0x6a4a2a), // cane
  buildSimpleMelee('club',   0xaa6633), // cricket_bat
  buildSimpleMelee('pipe',   0x888888), // pipe
  buildSimpleMelee('axe',    0x5a5a5a), // wrench (chunky)
  buildSimpleMelee('blade',  0x6a5a4a), // shovel
  buildSimpleMelee('club',   0x8a8a4a), // golf_club
  buildSimpleMelee('axe',    0xddaa88), // tennis_racket
  buildSimpleMelee('pipe',   0xcc6622), // fire_poker
  buildSimpleMelee('axe',    0xcccccc), // meat_cleaver
  // 🌌 Sci-fi P2W melees (color-coded placeholders)
  buildSimpleMelee('blade',  0xaa66ff), // phase_blade
  buildSimpleMelee('club',   0x6633ff), // gravity_hammer
  buildSimpleMelee('pipe',   0x66ccff), // volt_whip
  // 🪖 ADMIN melees
  buildKarambit(), buildBayonet(), buildTomahawk(), buildOts04(), buildGarrote(),
];
meleeModels.forEach(m => { m.visible = false; camera.add(m); });

// ── Support item model builders ───────────────────────────────────────────

function buildFragGrenade() {
  const g = new THREE.Group();
  const oliveMat = new THREE.MeshLambertMaterial({ color: 0x4a5a28 });
  const darkMat  = new THREE.MeshLambertMaterial({ color: 0x222222 });
  // Main body
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), oliveMat);
  g.add(body);
  // Segmented ridges
  for (let i = 0; i < 4; i++) {
    const ridge = new THREE.Mesh(new THREE.TorusGeometry(0.030, 0.006, 4, 8), darkMat);
    ridge.rotation.y = (i / 4) * Math.PI; g.add(ridge);
  }
  // Top neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.018, 6), darkMat);
  neck.position.y = 0.048; g.add(neck);
  // Safety pin wire
  const pin = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.003, 4, 8, Math.PI), darkMat);
  pin.position.set(0, 0.058, 0); g.add(pin);
  g.position.set(0.10, -0.12, -0.20); return g;
}

function buildMedkit() {
  const g = new THREE.Group();
  const whiteMat = new THREE.MeshLambertMaterial({ color: 0xeeeeee });
  const redMat   = new THREE.MeshBasicMaterial({ color: 0xcc1111 });
  // White box
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.05), whiteMat);
  g.add(box);
  // Red cross — vertical bar
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.050, 0.006), redMat);
  crossV.position.set(0, 0, -0.028); g.add(crossV);
  // Red cross — horizontal bar
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.050, 0.014, 0.006), redMat);
  crossH.position.set(0, 0, -0.028); g.add(crossH);
  // Handle on top
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.040, 0.012, 0.014), new THREE.MeshLambertMaterial({ color: 0xcccccc }));
  handle.position.set(0, 0.048, 0); g.add(handle);
  g.position.set(0.10, -0.12, -0.20); return g;
}

function buildStimShot() {
  const g = new THREE.Group();
  const clearMat = new THREE.MeshLambertMaterial({ color: 0xaaddff, transparent: true, opacity: 0.8 });
  const darkMat  = new THREE.MeshLambertMaterial({ color: 0x113355 });
  const needleMat= new THREE.MeshLambertMaterial({ color: 0xcccccc });
  // Syringe barrel
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.16, 8), clearMat);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0, 0); g.add(barrel);
  // Liquid fill (blue)
  const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.10, 8), new THREE.MeshBasicMaterial({ color: 0x3399ff }));
  liquid.rotation.x = Math.PI / 2; liquid.position.set(0, 0, 0.020); g.add(liquid);
  // Plunger
  const plunger = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.016, 8), darkMat);
  plunger.rotation.x = Math.PI / 2; plunger.position.set(0, 0, 0.086); g.add(plunger);
  // Plunger rod
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.040, 6), needleMat);
  rod.rotation.x = Math.PI / 2; rod.position.set(0, 0, 0.108); g.add(rod);
  // Needle tip
  const needle = new THREE.Mesh(new THREE.CylinderGeometry(0, 0.005, 0.022, 6), needleMat);
  needle.rotation.x = Math.PI / 2; needle.position.set(0, 0, -0.091); g.add(needle);
  g.position.set(0.10, -0.12, -0.20); return g;
}

function buildSmokeBomb() {
  const g = new THREE.Group();
  const greyMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
  // Main cylinder
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.030, 0.032, 0.10, 10), greyMat);
  body.rotation.x = Math.PI / 2; g.add(body);
  // Top cap
  const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.030, 0.014, 10), darkMat);
  capTop.rotation.x = Math.PI / 2; capTop.position.set(0, 0, -0.058); g.add(capTop);
  // Smoke vent hole on top
  const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.010, 6), darkMat);
  vent.rotation.x = Math.PI / 2; vent.position.set(0, 0, -0.070); g.add(vent);
  // Bottom ring
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.030, 0.006, 5, 10), darkMat);
  ring.position.set(0, 0, 0.055); g.add(ring);
  // Safety pin
  const pin = new THREE.Mesh(new THREE.TorusGeometry(0.010, 0.003, 4, 8, Math.PI), greyMat);
  pin.position.set(0, 0.032, -0.058); pin.rotation.z = Math.PI / 2; g.add(pin);
  g.position.set(0.10, -0.12, -0.20); return g;
}

function buildBlinkPearl() {
  const g = new THREE.Group();
  const tealMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x33ddaa });
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x008866 });
  // Glowing teal sphere
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 10), bodyMat);
  g.add(sphere);
  // Glowing inner core
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.036, 8, 6), tealMat);
  g.add(core);
  // Orbit ring 1
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.070, 0.005, 4, 16), ringMat);
  ring1.rotation.x = Math.PI / 3; g.add(ring1);
  // Orbit ring 2
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.070, 0.005, 4, 16), ringMat);
  ring2.rotation.x = -Math.PI / 5; ring2.rotation.z = Math.PI / 4; g.add(ring2);
  g.position.set(0.10, -0.12, -0.20); return g;
}

function buildAmmoFountain() {
  const g = new THREE.Group();
  const oliveMat  = new THREE.MeshLambertMaterial({ color: 0x556622 });
  const bulletMat = new THREE.MeshLambertMaterial({ color: 0xccaa33 });
  const darkMat   = new THREE.MeshLambertMaterial({ color: 0x222222 });
  // Small olive box body
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.07, 0.06), oliveMat);
  g.add(box);
  // Stencil markings strip
  const strip = new THREE.Mesh(new THREE.BoxGeometry(0.096, 0.012, 0.004), new THREE.MeshBasicMaterial({ color: 0xffdd44 }));
  strip.position.set(0, 0.016, -0.032); g.add(strip);
  // Bullet cylinders on top
  [-0.030, -0.010, 0.010, 0.030].forEach(x => {
    const bullet = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.005, 0.036, 6), bulletMat);
    bullet.position.set(x, 0.054, 0); g.add(bullet);
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0, 0.006, 0.012, 6), darkMat);
    tip.position.set(x, 0.078, 0); g.add(tip);
  });
  g.position.set(0.10, -0.12, -0.20); return g;
}

function buildConfettiCannon() {
  const g = new THREE.Group();
  const festMat  = new THREE.MeshLambertMaterial({ color: 0xff44aa });
  const darkMat  = new THREE.MeshLambertMaterial({ color: 0x222222 });
  const goldMat  = new THREE.MeshBasicMaterial({ color: 0xffdd00 });
  // Wide short tube body
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.040, 0.12, 10), festMat);
  body.rotation.x = Math.PI / 2; g.add(body);
  // Flared tip
  const flare = new THREE.Mesh(new THREE.CylinderGeometry(0.060, 0.045, 0.022, 10), festMat);
  flare.rotation.x = Math.PI / 2; flare.position.set(0, 0, -0.072); g.add(flare);
  // Gold stripe rings
  [-0.020, 0.020].forEach(z => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.006, 4, 10), goldMat);
    ring.position.set(0, 0, z); g.add(ring);
  });
  // Handle
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.055, 0.022), darkMat);
  handle.rotation.x = 0.20; handle.position.set(0, -0.058, 0.040); g.add(handle);
  g.position.set(0.10, -0.12, -0.20); return g;
}

function buildMoonMine() {
  const g = new THREE.Group();
  const purpleMat = new THREE.MeshLambertMaterial({ color: 0x6633aa });
  const spikeMat  = new THREE.MeshLambertMaterial({ color: 0x442288 });
  const glowMat   = new THREE.MeshBasicMaterial({ color: 0xaa44ff });
  // Main sphere body
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), purpleMat);
  g.add(body);
  // Glowing center core
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.030, 6, 5), glowMat);
  g.add(core);
  // 4 spike cylinders radiating out
  const dirs = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0]];
  dirs.forEach(([x, y, z]) => {
    const spike = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.002, 0.055, 5), spikeMat);
    spike.position.set(x * 0.068, y * 0.068, z * 0.068);
    if (x !== 0) spike.rotation.z = Math.PI / 2;
    g.add(spike);
  });
  g.position.set(0.10, -0.12, -0.20); return g;
}

function buildRubberDuck() {
  const g = new THREE.Group();
  const yellowMat = new THREE.MeshLambertMaterial({ color: 0xffdd00 });
  const orangeMat = new THREE.MeshLambertMaterial({ color: 0xff8800 });
  const darkMat   = new THREE.MeshLambertMaterial({ color: 0x111111 });
  // Main body — flattened sphere
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), yellowMat);
  body.scale.y = 0.75; g.add(body);
  // Head sphere
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.030, 8, 6), yellowMat);
  head.position.set(0, 0.040, -0.034); g.add(head);
  // Bill/beak
  const bill = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.014, 0.024), orangeMat);
  bill.position.set(0, 0.038, -0.062); g.add(bill);
  // Eye
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.006, 4, 4), darkMat);
  eye.position.set(0.016, 0.048, -0.056); g.add(eye);
  // Tail nub
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 5), yellowMat);
  tail.scale.z = 0.6; tail.position.set(0, 0.018, 0.056); g.add(tail);
  g.position.set(0.10, -0.12, -0.20); return g;
}

function buildBlackHoleSeed() {
  const g = new THREE.Group();
  const darkMat  = new THREE.MeshLambertMaterial({ color: 0x110022 });
  const ringMat  = new THREE.MeshBasicMaterial({ color: 0x441166 });
  const glowMat  = new THREE.MeshBasicMaterial({ color: 0x220044 });
  // Very dark purple sphere
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.040, 10, 8), darkMat);
  g.add(sphere);
  // Inner glow
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), glowMat);
  g.add(glow);
  // Two dark ring geometries at different angles
  const r1 = new THREE.Mesh(new THREE.TorusGeometry(0.060, 0.006, 4, 16), ringMat);
  r1.rotation.x = Math.PI / 4; g.add(r1);
  const r2 = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.005, 4, 16), ringMat);
  r2.rotation.x = -Math.PI / 3; r2.rotation.z = Math.PI / 5; g.add(r2);
  g.position.set(0.10, -0.12, -0.20); return g;
}

function buildGlitchCube() {
  const g = new THREE.Group();
  // BoxGeometry with random colored face materials (6 colors)
  const colors = [0xff0044, 0x00ff88, 0x4444ff, 0xffff00, 0xff8800, 0x00ffff];
  const mats = colors.map(c => new THREE.MeshBasicMaterial({ color: c }));
  const cube = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.07), mats);
  cube.rotation.set(0.3, 0.5, 0.1); g.add(cube);
  // Glitch fragments
  const fragMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const frag = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.025), fragMat);
  frag.rotation.set(0.8, 1.2, 0.4); frag.position.set(0.040, 0.030, 0.020); g.add(frag);
  g.position.set(0.10, -0.12, -0.20); return g;
}

function buildVampireSyringe() {
  const g = new THREE.Group();
  const redMat   = new THREE.MeshLambertMaterial({ color: 0xcc0011 });
  const darkMat  = new THREE.MeshLambertMaterial({ color: 0x330000 });
  const needleMat= new THREE.MeshLambertMaterial({ color: 0xaaaaaa });
  // Syringe barrel — red tinted
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.16, 8), new THREE.MeshLambertMaterial({ color: 0x991122, transparent: true, opacity: 0.85 }));
  barrel.rotation.x = Math.PI / 2; g.add(barrel);
  // Blood fill
  const blood = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 8), new THREE.MeshBasicMaterial({ color: 0xcc0000 }));
  blood.rotation.x = Math.PI / 2; blood.position.set(0, 0, 0.012); g.add(blood);
  // Dark plunger
  const plunger = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.016, 8), darkMat);
  plunger.rotation.x = Math.PI / 2; plunger.position.set(0, 0, 0.086); g.add(plunger);
  // Plunger rod
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.040, 6), darkMat);
  rod.rotation.x = Math.PI / 2; rod.position.set(0, 0, 0.108); g.add(rod);
  // Sharper needle tip
  const needle = new THREE.Mesh(new THREE.CylinderGeometry(0, 0.004, 0.030, 6), needleMat);
  needle.rotation.x = Math.PI / 2; needle.position.set(0, 0, -0.095); g.add(needle);
  // Red band rings
  [-0.020, 0.020].forEach(z => {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.008, 8), redMat);
    band.rotation.x = Math.PI / 2; band.position.set(0, 0, z); g.add(band);
  });
  g.position.set(0.10, -0.12, -0.20); return g;
}

function buildAdrenaline() {
  const g = new THREE.Group();
  const tubeMat = new THREE.MeshLambertMaterial({ color: 0xee2244 });
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.10, 10), tubeMat);
  tube.rotation.z = Math.PI/2; g.add(tube);
  const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.04, 6), new THREE.MeshLambertMaterial({ color: 0xcccccc }));
  needle.rotation.z = Math.PI/2; needle.position.set(-0.07, 0, 0); g.add(needle);
  g.position.set(0.10, -0.12, -0.18); return g;
}
function buildTripwire() {
  const g = new THREE.Group();
  const baseMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  const wireMat = new THREE.MeshLambertMaterial({ color: 0xff3344 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.04), baseMat); g.add(box);
  const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.20, 4), wireMat);
  wire.rotation.z = Math.PI/2; wire.position.set(0.08, 0, 0); g.add(wire);
  g.position.set(0.10, -0.12, -0.18); return g;
}
function buildHologram() {
  const g = new THREE.Group();
  const orbMat = new THREE.MeshLambertMaterial({ color: 0x44ccff, transparent: true, opacity: 0.7 });
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), orbMat); g.add(orb);
  g.position.set(0.10, -0.12, -0.18); return g;
}
function buildMagnetMine() {
  const g = new THREE.Group();
  const redMat = new THREE.MeshLambertMaterial({ color: 0xff4444 });
  const grayMat = new THREE.MeshLambertMaterial({ color: 0x999999 });
  const horseshoe = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 6, 12, Math.PI), redMat);
  g.add(horseshoe);
  const tip1 = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.025, 0.025), grayMat);
  tip1.position.set(-0.04, -0.025, 0); g.add(tip1);
  const tip2 = tip1.clone(); tip2.position.set(0.04, -0.025, 0); g.add(tip2);
  g.position.set(0.10, -0.12, -0.18); return g;
}
function buildBouncePad() {
  const g = new THREE.Group();
  const padMat = new THREE.MeshLambertMaterial({ color: 0xffcc22 });
  const ringMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.02, 12), padMat);
  pad.rotation.x = Math.PI/2; g.add(pad);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.054, 0.006, 4, 16), ringMat);
  g.add(ring);
  g.position.set(0.10, -0.12, -0.18); return g;
}
function buildHunterDrone() {
  const g = new THREE.Group();
  const matMetal = new THREE.MeshLambertMaterial({ color: 0x444466 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 0.07), matMetal); g.add(body);
  const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.005, 8), new THREE.MeshLambertMaterial({ color: 0xaaaaaa }));
  rotor.position.y = 0.03; g.add(rotor);
  g.position.set(0.10, -0.12, -0.18); return g;
}
function buildEMPGrenade() {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0x224466 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), mat); g.add(body);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.005, 4, 14), new THREE.MeshLambertMaterial({ color: 0x66ccff }));
  band.rotation.x = Math.PI/2; g.add(band);
  g.position.set(0.10, -0.12, -0.18); return g;
}
function buildStickyCharge() {
  const g = new THREE.Group();
  const red = new THREE.MeshLambertMaterial({ color: 0xcc2222 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x222222 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.07), red); g.add(body);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 5), dark);
  dot.position.set(0, 0.027, 0); g.add(dot);
  g.position.set(0.10, -0.12, -0.18); return g;
}
function buildOrbitalStrike() {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0xeeeeff });
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.10), mat); g.add(box);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.08, 4), new THREE.MeshLambertMaterial({ color: 0xff2200 }));
  antenna.position.y = 0.06; g.add(antenna);
  g.position.set(0.10, -0.12, -0.18); return g;
}
function buildGuardianDrone() {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0xddcc66 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), mat); g.add(body);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.006, 4, 14), new THREE.MeshLambertMaterial({ color: 0x222222 }));
  ring.rotation.x = Math.PI/2; g.add(ring);
  g.position.set(0.10, -0.12, -0.18); return g;
}
function buildNanoShield() {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0x66ddaa, transparent: true, opacity: 0.6 });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8, 0, Math.PI*2, 0, Math.PI/2), mat);
  g.add(dome);
  g.position.set(0.10, -0.12, -0.18); return g;
}
function buildAirGrenade() {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0xaaccff });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), mat); g.add(body);
  const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.006, 4, 12), new THREE.MeshLambertMaterial({ color: 0xffffff }));
  stripe.rotation.x = Math.PI/2; g.add(stripe);
  g.position.set(0.10, -0.12, -0.18); return g;
}
function buildC4()           { const g=new THREE.Group(); const m=new THREE.MeshLambertMaterial({color:0xbbaa66}); const led=new THREE.MeshBasicMaterial({color:0xff2222}); const body=new THREE.Mesh(new THREE.BoxGeometry(0.10,0.04,0.07),m); g.add(body); const l=new THREE.Mesh(new THREE.SphereGeometry(0.010,4,4),led); l.position.set(0.03,0.025,0); g.add(l); g.position.set(0.10,-0.12,-0.18); return g; }
function buildClaymore()     { const g=new THREE.Group(); const m=new THREE.MeshLambertMaterial({color:0x2a3a26}); const body=new THREE.Mesh(new THREE.BoxGeometry(0.10,0.06,0.025),m); body.rotation.x=-0.2; g.add(body); const leg1=new THREE.Mesh(new THREE.CylinderGeometry(0.005,0.005,0.05,4),m); leg1.position.set(-0.04,-0.025,0.018); g.add(leg1); const leg2=leg1.clone(); leg2.position.set(0.04,-0.025,0.018); g.add(leg2); g.position.set(0.10,-0.12,-0.18); return g; }
function buildStunGrenade()  { const g=new THREE.Group(); const m=new THREE.MeshLambertMaterial({color:0x666666}); const lid=new THREE.MeshLambertMaterial({color:0x222222}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.045,0.10,8),m); g.add(body); const cap=new THREE.Mesh(new THREE.CylinderGeometry(0.030,0.030,0.012,8),lid); cap.position.y=0.056; g.add(cap); g.position.set(0.10,-0.12,-0.18); return g; }
function buildThermite()     { const g=new THREE.Group(); const m=new THREE.MeshLambertMaterial({color:0x884422}); const top=new THREE.MeshBasicMaterial({color:0xff6622}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.040,0.040,0.09,8),m); g.add(body); const stripe=new THREE.Mesh(new THREE.TorusGeometry(0.042,0.005,4,12),top); stripe.rotation.x=Math.PI/2; g.add(stripe); g.position.set(0.10,-0.12,-0.18); return g; }
function buildPredatorUAV()  { const g=new THREE.Group(); const m=new THREE.MeshLambertMaterial({color:0x444444}); const screen=new THREE.MeshBasicMaterial({color:0x44ff44}); const body=new THREE.Mesh(new THREE.BoxGeometry(0.10,0.06,0.025),m); g.add(body); const sc=new THREE.Mesh(new THREE.PlaneGeometry(0.07,0.04),screen); sc.position.set(0,0.02,0.013); g.add(sc); g.position.set(0.10,-0.12,-0.18); return g; }
function buildCarePackage()  { const g=new THREE.Group(); const m=new THREE.MeshLambertMaterial({color:0x336622}); const tag=new THREE.MeshBasicMaterial({color:0xff2222}); const body=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.08,0.08),m); g.add(body); const t=new THREE.Mesh(new THREE.BoxGeometry(0.082,0.012,0.082),tag); t.position.y=0.025; g.add(t); g.position.set(0.10,-0.12,-0.18); return g; }
function buildTacNuke()      { const g=new THREE.Group(); const m=new THREE.MeshLambertMaterial({color:0xdddddd}); const yellow=new THREE.MeshLambertMaterial({color:0xffcc22}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.06,0.14,12),m); g.add(body); const stripe=new THREE.Mesh(new THREE.TorusGeometry(0.045,0.007,4,14),yellow); stripe.rotation.x=Math.PI/2; stripe.position.y=0.03; g.add(stripe); g.position.set(0.10,-0.12,-0.18); return g; }
function buildLandMine() {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0x664422 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 12), mat);
  body.rotation.x = Math.PI/2; g.add(body);
  const stud = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.015, 6), new THREE.MeshLambertMaterial({ color: 0x222222 }));
  stud.rotation.x = Math.PI/2; stud.position.set(0, 0, -0.015); g.add(stud);
  g.position.set(0.10, -0.12, -0.18); return g;
}

// Generic placeholder support model — used for the batch-4 utilities.
function buildSimpleSupport(color, shape = 'sphere') {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color });
  let body;
  if (shape === 'cube')      body = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.10, 0.10), mat);
  else if (shape === 'disc') body = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 12), mat);
  else if (shape === 'caps') body = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.12, 8), mat);
  else                       body = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), mat);
  g.add(body);
  g.position.set(0.16, -0.10, -0.22);
  return g;
}
const supportModels = [buildFragGrenade(), buildMedkit(), buildStimShot(), buildSmokeBomb(),
  buildBlinkPearl(), buildAmmoFountain(), buildConfettiCannon(), buildMoonMine(),
  buildRubberDuck(), buildBlackHoleSeed(), buildGlitchCube(), buildVampireSyringe(),
  // New supports
  buildAdrenaline(), buildTripwire(), buildHologram(), buildMagnetMine(), buildBouncePad(),
  // 3rd-batch supports
  buildHunterDrone(), buildEMPGrenade(), buildStickyCharge(),
  // 😈 P2W supports
  buildOrbitalStrike(), buildGuardianDrone(), buildNanoShield(),
  // Lazy weapons supports
  buildAirGrenade(), buildLandMine(),
  // 🆕 Batch-4 utilities (placeholder models)
  buildSimpleSupport(0xffffff, 'sphere'),  // flashbang_basic
  buildSimpleSupport(0xff5555, 'disc'),    // proximity_mine
  buildSimpleSupport(0xdd4422, 'caps'),    // dynamite
  buildSimpleSupport(0x88aaff, 'cube'),    // drone_strike
  buildSimpleSupport(0x66ff99, 'sphere'),  // healing_pulse
  buildSimpleSupport(0xaa44ff, 'cube'),    // teleport_beacon
  buildSimpleSupport(0x666688, 'sphere'),  // cloak
  buildSimpleSupport(0xff6644, 'caps'),    // berserker_serum
  buildSimpleSupport(0x66ccff, 'sphere'),  // taser_grenade
  buildSimpleSupport(0x111111, 'sphere'),  // ink_bomb
  buildSimpleSupport(0xffaa44, 'cube'),    // siren
  buildSimpleSupport(0x888888, 'disc'),    // caltrops
  // 🌌 Sci-fi P2W utilities
  buildSimpleSupport(0x66ffcc, 'sphere'),   // nano_swarm
  buildSimpleSupport(0xaa66ff, 'cube'),     // warp_beacon
  buildSimpleSupport(0x66ccff, 'disc'),     // stasis_mine
  buildSimpleSupport(0x444466, 'cube'),     // specter_drone
  buildSimpleSupport(0xaaccff, 'sphere'),   // quantum_barrier
  // 🪖 ADMIN supports
  buildC4(), buildClaymore(), buildStunGrenade(), buildThermite(),
  buildPredatorUAV(), buildCarePackage(), buildTacNuke()];
supportModels.forEach(m => { m.visible = false; camera.add(m); });

// ── Roblox-style player mesh factory ──────────────────────────────────────
const SHIRT_COLORS = [0xe03131,0x1971c2,0x2f9e44,0xf08c00,0x9c36b5,0x0c8599,0xd6336c];
let colorIndex = 0;

function makeFaceTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffcc99'; ctx.fillRect(0,0,64,64);
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(14,22,10,10); ctx.fillRect(40,22,10,10);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(15,23,4,4); ctx.fillRect(41,23,4,4);
  ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(32,42,10,0.1,Math.PI-0.1); ctx.stroke();
  return new THREE.CanvasTexture(c);
}

function darkenColor(hex, f) {
  return (Math.floor(((hex>>16)&0xff)*f)<<16)|(Math.floor(((hex>>8)&0xff)*f)<<8)|(Math.floor((hex&0xff)*f));
}

// ── 🎭 Character skins (inspired by the comic crew) ─────────────────────────
// Each skin recolors the blocky body and/or adds accessories. 'crown' is NOT a
// skin — it's an overlay added on top of any skin for the admin / match leader.
const SKINS = [
  { id: 'default',     name: 'Recruit',       desc: 'Standard issue. Random shirt color.' },
  { id: 'swat',        name: 'SWAT',          desc: 'Black tactical armor + glowing blue visor.' },
  { id: 'swat_shades', name: 'SWAT · Shades', desc: 'Tactical armor with cool sunglasses.' },
  { id: 'riot_chad',   name: 'Riot Chad',     desc: 'Dark jacket + red bandana. Has patience.' },
  { id: 'soldier',     name: 'Soldier',       desc: 'Olive fatigues + combat helmet.' },
  { id: 'spiky',       name: 'Spiky',         desc: 'Spiky hair, no helmet. Your P90 does 5 damage.' },
  { id: 'green_cap',   name: 'Green Cap',     desc: 'Soft green cap. Default loadout enjoyer.' },
  { id: 'shadow',      name: 'Shadow',        desc: 'All black, pale face. The strongest wear crowns.' },
];
const SKIN_IDS = SKINS.map(s => s.id);

// Build a white "shadow" face (the comic protagonist's blank/angry look)
function makeShadowFaceTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f4f4f4'; ctx.fillRect(0,0,64,64);
  ctx.fillStyle = '#111';
  // angry slanted eyes  >  <
  ctx.fillRect(13,24,12,4); ctx.fillRect(13,28,7,4);
  ctx.fillRect(39,24,12,4); ctx.fillRect(44,28,7,4);
  // small mouth
  ctx.fillRect(28,46,8,3);
  return new THREE.CanvasTexture(c);
}

function applyCharacterSkin(skinId, parts) {
  const { group, head, headMats, faceMat, torso, torsoMat, armLimbs, legLimbs } = parts;
  const setBody = (hex) => {
    torsoMat.color.setHex(hex);
    armLimbs.forEach(m => m.material.color.setHex(hex));
  };
  const setLegs = (hex) => legLimbs.forEach(m => m.material.color.setHex(hex));
  const setHeadAll = (hex) => headMats.forEach((m,i) => { if (i !== 4) m.color.setHex(hex); });

  switch (skinId) {
    case 'swat': {
      setBody(0x23272e); setLegs(0x16181c); setHeadAll(0x1a1d22);
      // Replace face with a glowing blue visor strip
      faceMat.map = null; faceMat.color.setHex(0x10131a);
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.04),
        new THREE.MeshLambertMaterial({ color: 0x0a0d12, emissive: 0x2f7dff, emissiveIntensity: 1.2 }));
      visor.position.set(0, 1.87, 0.255); group.add(visor);
      _addHelmet(group, 0x14171c);
      break;
    }
    case 'swat_shades': {
      setBody(0x2a2e35); setLegs(0x1a1d22); setHeadAll(0xffcc99);
      // Keep the skin-tone face, add black sunglasses across the eyes
      const shades = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.10, 0.04),
        new THREE.MeshLambertMaterial({ color: 0x080808 }));
      shades.position.set(0, 1.90, 0.255); group.add(shades);
      _addHelmet(group, 0x14171c);
      break;
    }
    case 'riot_chad': {
      setBody(0x33271f); setLegs(0x20272e); setHeadAll(0xffcc99);
      // Red bandana around the neck / lower face
      const bandana = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.16, 0.34),
        new THREE.MeshLambertMaterial({ color: 0xc62828 }));
      bandana.position.set(0, 1.66, 0); group.add(bandana);
      break;
    }
    case 'soldier': {
      setBody(0x4b5320); setLegs(0x3a4019); setHeadAll(0xffcc99);
      _addHelmet(group, 0x3d4a24);
      break;
    }
    case 'spiky': {
      setBody(0x5a2a2a); setLegs(0x222831); setHeadAll(0xffcc99);
      _addSpikyHair(group, 0x2b1a10);
      break;
    }
    case 'green_cap': {
      setBody(0x6b5d3a); setLegs(0x4a4327); setHeadAll(0xffcc99);
      _addCap(group, 0x3f6b2f);
      break;
    }
    case 'shadow': {
      setBody(0x121212); setLegs(0x0c0c0c); setHeadAll(0x141414);
      faceMat.map = makeShadowFaceTexture(); faceMat.color.setHex(0xffffff); faceMat.needsUpdate = true;
      // hood peak
      _addHelmet(group, 0x0c0c0c);
      break;
    }
    // 'default' → leave the randomly-colored recruit as-is
  }
}

// Simple combat helmet / hood cap that sits on top of the head box
function _addHelmet(group, color) {
  const helm = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.22, 0.56),
    new THREE.MeshLambertMaterial({ color }));
  helm.position.set(0, 2.13, 0); helm.castShadow = true; group.add(helm);
}

// Spiky hair — a cluster of little cones on top of the head (no helmet)
function _addSpikyHair(group, color) {
  const mat = new THREE.MeshLambertMaterial({ color });
  // a thin base layer so the scalp isn't bald skin
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.10, 0.52), mat);
  base.position.set(0, 2.07, 0); group.add(base);
  const spikes = [[-0.15,0.07,-0.1],[0.16,0.06,-0.12],[0,0.10,0.0],[-0.12,0.06,0.14],[0.13,0.07,0.13],[0,0.08,-0.16],[-0.05,0.09,0.05]];
  spikes.forEach(([x,yy,z]) => {
    const s = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.20, 5), mat);
    s.position.set(x, 2.12 + yy, z);
    s.rotation.z = (x) * 0.8; s.rotation.x = (-z) * 0.8; // fan outward
    s.castShadow = true; group.add(s);
  });
}

// Soft cap with a forward brim (the green-cap "default loadout" guy)
function _addCap(group, color) {
  const mat = new THREE.MeshLambertMaterial({ color });
  const dome = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.16, 0.54), mat);
  dome.position.set(0, 2.10, 0); dome.castShadow = true; group.add(dome);
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.05, 0.20), mat);
  brim.position.set(0, 2.04, 0.32); brim.castShadow = true; group.add(brim);
}

// Gold crown overlay — toggled for admin / match leader. Idempotent.
function setMeshCrown(group, on) {
  if (!group) return;
  if (on) {
    if (group._crown) return;
    const crown = new THREE.Group();
    const gold = new THREE.MeshLambertMaterial({ color: 0xffd227, emissive: 0x6b4e00, emissiveIntensity: 0.5 });
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.10, 10), gold);
    band.position.y = 0; crown.add(band);
    for (let i = 0; i < 5; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 6), gold);
      const a = (i / 5) * Math.PI * 2;
      spike.position.set(Math.cos(a) * 0.18, 0.12, Math.sin(a) * 0.18);
      crown.add(spike);
    }
    crown.position.set(0, 2.30, 0);
    group.add(crown); group._crown = crown;
  } else if (group._crown) {
    group.remove(group._crown);
    group._crown.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    group._crown = null;
  }
}

function makePlayerMesh(name, isBot = false, team = 'enemy', skinId = 'default', opts = {}) {
  const group = new THREE.Group();
  const shirt = SHIRT_COLORS[colorIndex % SHIRT_COLORS.length]; colorIndex++;
  const pant  = darkenColor(shirt, 0.55);
  const skin  = 0xffcc99;

  const mkMat = c => new THREE.MeshLambertMaterial({ color: c });

  // Head with face — keep the material array so skins can recolor / reface it
  const headGeo = new THREE.BoxGeometry(0.5,0.5,0.5);
  const ft = makeFaceTexture();
  const faceMat = new THREE.MeshLambertMaterial({ map: ft });
  const headMats = [ mkMat(skin), mkMat(skin), mkMat(skin), mkMat(skin), faceMat, mkMat(skin) ];
  const head = new THREE.Mesh(headGeo, headMats);
  head.position.set(0,1.85,0); head.castShadow = true; group.add(head);

  // Torso
  const torsoMat = mkMat(shirt);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55,0.65,0.3), torsoMat);
  torso.position.set(0,1.2,0); torso.castShadow = true; group.add(torso);

  // Arms — wrapped in a shoulder pivot so they can swing about the shoulder joint
  const armMeshes = [];   // pivots
  const armLimbs = [];    // the actual limb meshes (for recolor)
  [-0.39,0.39].forEach(x => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 1.5, 0);            // shoulder joint (top of arm)
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.22,0.6,0.22), mkMat(shirt));
    arm.position.set(0, -0.3, 0);             // hang down from the joint
    arm.castShadow = true; pivot.add(arm);
    group.add(pivot); armMeshes.push(pivot); armLimbs.push(arm);
  });

  // Legs — wrapped in a hip pivot so they can swing about the hip joint
  const legMeshes = [];   // pivots
  const legLimbs = [];    // the actual limb meshes (for recolor)
  [-0.155,0.155].forEach(x => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.875, 0);          // hip joint (top of leg)
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.24,0.65,0.26), mkMat(pant));
    leg.position.set(0, -0.325, 0);           // hang down from the joint
    leg.castShadow = true; pivot.add(leg);
    group.add(pivot); legMeshes.push(pivot); legLimbs.push(leg);
  });

  // ── Apply skin (recolor + accessories) ────────────────────────────────────
  applyCharacterSkin(skinId, { group, head, headMats, faceMat, torso, torsoMat, armLimbs, legLimbs });
  if (opts.crown) setMeshCrown(group, true);

  // Name tag
  const cv = document.createElement('canvas'); cv.width=256; cv.height=64;
  const ctx = cv.getContext('2d');
  const isAlly = isBot && team === 'ally';
  ctx.fillStyle = isBot ? (isAlly ? 'rgba(0,80,180,0.75)' : 'rgba(160,0,0,0.75)') : 'rgba(0,0,0,0.65)';
  ctx.roundRect(4,8,248,48,8); ctx.fill();
  ctx.fillStyle = isBot ? (isAlly ? '#aaccff' : '#ffaaaa') : '#fff';
  ctx.font='bold 26px Arial'; ctx.textAlign='center';
  ctx.fillText(isBot ? `🤖 ${name}` : name, 128, 44);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthTest: false }));
  sprite.scale.set(1.5,0.37,1); sprite.position.y = 2.35; group.add(sprite);

  // ── Animation rig: store limb pivots + per-character walk state ───────────
  group._rig = {
    legL: legMeshes[0], legR: legMeshes[1],
    armL: armMeshes[0], armR: armMeshes[1],
    head, torso,
    phase: 0,            // walk-cycle phase
    speedSmooth: 0,      // smoothed horizontal speed
    crouch: 0,           // 0 = standing, 1 = fully crouched/sliding
    prevX: null, prevZ: null,
  };
  group._skinId = skinId;
  group._head = head; // crown attaches here

  return group;
}

// ── Character walk / slide animation ────────────────────────────────────────
// Drives leg + arm swing from how far the mesh actually moved, plus a crouch/
// slide pose. Works uniformly for bots and remote players. `crouchTarget` is
// 0..1 (1 = sliding/crouched); pass null to auto-keep current.
function animateCharacterMesh(mesh, dt, crouchTarget) {
  const rig = mesh && mesh._rig;
  if (!rig) return;
  // Horizontal distance moved since last frame → speed estimate
  const px = mesh.position.x, pz = mesh.position.z;
  let dist = 0;
  if (rig.prevX !== null) {
    const dx = px - rig.prevX, dz = pz - rig.prevZ;
    dist = Math.sqrt(dx*dx + dz*dz);
  }
  rig.prevX = px; rig.prevZ = pz;
  const speed = dt > 0 ? dist / dt : 0;
  rig.speedSmooth += (speed - rig.speedSmooth) * Math.min(1, dt * 12);
  const moving = rig.speedSmooth > 0.6;

  // Advance phase by distance travelled so stride length stays natural
  rig.phase += dist * 5.5;
  if (!moving) {
    // Ease the phase back toward a neutral standing pose
    rig.phase += (Math.round(rig.phase / Math.PI) * Math.PI - rig.phase) * Math.min(1, dt * 8);
  }

  // Crouch / slide blend
  if (crouchTarget !== null && crouchTarget !== undefined) {
    rig.crouch += (crouchTarget - rig.crouch) * Math.min(1, dt * 10);
  } else {
    rig.crouch += (0 - rig.crouch) * Math.min(1, dt * 6);
  }
  const crouch = rig.crouch;

  const amp   = moving ? 0.7 : 0.0;       // leg swing amplitude (radians)
  const swing = Math.sin(rig.phase) * amp;
  const armAmp = moving ? 0.5 : 0.0;
  const armSwing = Math.sin(rig.phase) * armAmp;

  if (crouch < 0.5) {
    // Upright walking: legs + arms swing in opposition
    rig.legL.rotation.x =  swing;
    rig.legR.rotation.x = -swing;
    if (rig.holdsGun) {
      // Right arm stays raised forward holding the weapon; left arm swings a bit
      rig.armR.rotation.x = -1.25;
      rig.armL.rotation.x = -armSwing * 0.5;
    } else {
      rig.armL.rotation.x = -armSwing;
      rig.armR.rotation.x =  armSwing;
    }
    rig.torso.rotation.x = 0;
    rig.head.rotation.x  = 0;
  }

  // Slide / crouch pose: tuck legs forward, lean torso back, arms back
  if (crouch > 0.01) {
    const c = crouch;
    rig.legL.rotation.x = THREE.MathUtils.lerp(rig.legL.rotation.x,  1.1, c);
    rig.legR.rotation.x = THREE.MathUtils.lerp(rig.legR.rotation.x,  0.4, c);
    rig.armL.rotation.x = THREE.MathUtils.lerp(rig.armL.rotation.x, -0.8, c);
    rig.armR.rotation.x = THREE.MathUtils.lerp(rig.armR.rotation.x, -0.8, c);
    rig.torso.rotation.x = THREE.MathUtils.lerp(0, -0.45, c);
    rig.head.rotation.x  = THREE.MathUtils.lerp(0,  0.45, c);
  }
}

// ── Bot world-space weapon prop ────────────────────────────────────────────
function makeBotWeaponProp(weaponId) {
  const w = WEAPONS.find(w => w.id === weaponId) || WEAPONS[0];
  const g = new THREE.Group();
  const metalMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  const bodyMat  = new THREE.MeshLambertMaterial({ color: w.bulletColor ? w.bulletColor : 0x2a3a4a });
  const woodMat  = new THREE.MeshLambertMaterial({ color: 0x6b3a20 });

  const isShotgun  = w.type?.includes('Shotgun');
  const isSniper   = w.type === 'Sniper';
  const isLMG      = w.type === 'LMG';
  const isMelee    = w.slot === 'melee';
  const isSupport  = w.slot === 'support';

  if (isMelee) {
    // Simple club/bat shape
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.45), woodMat);
    handle.position.z = -0.05; g.add(handle);
  } else if (isSupport) {
    // Grenade / round shape
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), metalMat);
    g.add(body);
  } else {
    // Receiver body
    const bw = isShotgun ? 0.07 : isLMG ? 0.072 : 0.055;
    const bh = isShotgun ? 0.065 : isLMG ? 0.07  : 0.055;
    const bd = isSniper  ? 0.30  : isShotgun ? 0.20 : isLMG ? 0.28 : 0.22;
    const body = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), bodyMat);
    g.add(body);

    // Barrel
    const barrelLen = isSniper ? 0.36 : isShotgun ? 0.15 : isLMG ? 0.26 : 0.22;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, barrelLen, 7), metalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.012, -(bd / 2 + barrelLen / 2));
    g.add(barrel);

    // Grip
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.085, 0.038), woodMat);
    grip.rotation.x = 0.25;
    grip.position.set(0, -0.065, bd * 0.1);
    g.add(grip);

    // LMG drum mag
    if (isLMG) {
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.04, 10), metalMat);
      drum.rotation.x = Math.PI / 2;
      drum.position.set(0, -0.06, -0.02);
      g.add(drum);
    }
  }
  return g;
}

// ── Bullet visuals ─────────────────────────────────────────────────────────
const PAINTBALL_COLORS = [
  0xff2244, 0x00ccff, 0x22ee44, 0xff8800,
  0xff00ee, 0xffee00, 0x00ffcc, 0xaa00ff,
];

function makeBulletMesh(color, size) {
  const isCycler = color === 0x00ffee;
  const r = size || 0.04;
  return new THREE.Mesh(
    isCycler ? new THREE.CylinderGeometry(0.015, 0.015, 0.18, 6) : new THREE.SphereGeometry(r, 5, 5),
    new THREE.MeshBasicMaterial({ color: color || 0xffee44 })
  );
}

// ── Pointer Lock / ADS / Camera ────────────────────────────────────────────
let pointerLocked = false;
const euler = new THREE.Euler(0,0,0,'YXZ');
const SENS = 0.002;
const ARROW_SENS = 0.03;

document.addEventListener('pointerlockchange', () => {
  pointerLocked = document.pointerLockElement === renderer.domElement;
});
document.addEventListener('mousemove', e => {
  if ((!pointerLocked && !gameStarted) || isDead) return;
  euler.y -= e.movementX * SENS;
  euler.x -= e.movementY * SENS;
  euler.x = Math.max(-Math.PI/2.2, Math.min(Math.PI/2.2, euler.x));
  camera.quaternion.setFromEuler(euler);
});

// ── Input ──────────────────────────────────────────────────────────────────
const keys = {};
document.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (!gameStarted) return;
  // Spectator cycling while dead
  if (spectatorState) {
    if (e.code === 'ArrowLeft')  { spectatorCycle(-1); e.preventDefault(); return; }
    if (e.code === 'ArrowRight') { spectatorCycle( 1); e.preventDefault(); return; }
  }
  if (e.code==='KeyR' && (activeSlot === 'primary' || activeSlot === 'secondary') && !reloading && !currentWeapon.noReload && weaponAmmo[currentWeaponIdx].ammo < currentWeapon.mag && weaponAmmo[currentWeaponIdx].reserve > 0) startReload();
  // Spacebar — jump (only when on the ground)
  if (e.code === 'Space') {
    e.preventDefault();
    if (!isDead && isPlayerGrounded()) {
      slamState = { vel: 13, type: 'jump' }; // ~2x the old jump height with 28 m/s² gravity
    }
  }
  // ── Admin cheat hotkeys (only when admin) ────────────────────────────────
  if (currentUser?.isAdmin && !e.repeat && !commsMenuOpen) {
    // Hotkeys use letters that don't conflict with WASD/QER/G/Z/X/1-4
    const adminMap = { KeyH:'fly', KeyJ:'godMode', KeyL:'infiniteAmmo', KeyK:'killAura', KeyB:'aimbot', KeyN:'speed', KeyM:'freezeBots' };
    // Only fire admin hotkeys when not typing in an input field
    if (document.activeElement?.tagName !== 'INPUT') {
      if (e.code === 'F2') { e.preventDefault(); toggleAdminPanel(); return; }
      if (adminMap[e.code]) {
        e.preventDefault();
        adminCheats[adminMap[e.code]] = !adminCheats[adminMap[e.code]];
        showAnnouncement(adminCheats[adminMap[e.code]] ? `⚡ ${adminMap[e.code]} ON` : `${adminMap[e.code]} OFF`,
                         '', adminCheats[adminMap[e.code]] ? '#ff4444' : '#888888', 900);
        if (adminPanelOpen) openAdminPanel(); // refresh checkbox states
      }
    }
  }
  // ── Z key: primary comms wheel ───────────────────────────────────────────
  if (e.code === 'KeyZ' && !e.repeat) {
    e.preventDefault();
    if (commsMenuOpen && commsMenuKind === 'z') closeCommsMenu();
    else openCommsMenu('z');
  }
  // ── X key: secondary comms wheel ─────────────────────────────────────────
  if (e.code === 'KeyX' && !e.repeat) {
    e.preventDefault();
    if (commsMenuOpen && commsMenuKind === 'x') closeCommsMenu();
    else openCommsMenu('x');
  }
  // Number keys 1-9 while comms menu is open: pick a phrase
  if (commsMenuOpen) {
    const num = ['Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8','Digit9'].indexOf(e.code);
    if (num >= 0) { e.preventDefault(); pickCommsLine(num); return; }
    if (e.code === 'Escape') { e.preventDefault(); closeCommsMenu(); return; }
  }
  if (e.code==='Tab') { e.preventDefault(); showScoreboard(true); }
  if (e.code==='KeyE') {
    // Switchblade Gun: in split state, E toggles pistol ↔ knife instead of ADS
    if (activeSlot === 'primary' && currentWeapon?.id === 'switchblade_gun' && !switchbladeCharged) {
      switchbladeMode = (switchbladeMode === 'pistol') ? 'knife' : 'pistol';
      showAnnouncement(switchbladeMode.toUpperCase(), switchbladeMode === 'knife' ? 'Melee · 50 dmg' : 'Ranged · 50 dmg', '#cc66ff', 900);
      updateSwitchbladeHUD();
    } else {
      toggleADS();
    }
  }
  if (e.code==='KeyF' && nearTrashcan && !isDead) { showLoadoutScreen('swap'); }
  // F = enter/exit a mortar (trench map)
  if (e.code==='KeyF' && !nearTrashcan && !isDead && activeMapName === 'trenches' && !e.repeat) {
    e.preventDefault();
    tryEnterMortar();
  }
  // F = enter/exit a vehicle (BR arena) or pilot a mortar
  if (e.code==='KeyF' && !nearTrashcan && !isDead && activeMapName === 'br_arena' && !e.repeat) {
    e.preventDefault();
    if (pilotedVehicle) { exitVehicle(); }
    else if (pilotedMortar) { exitMortar(); }
    else {
      // Prefer vehicle if both nearby
      const nearV = mapVehicles.find(v => v.mapName === activeMapName && v.hp > 0 && !v.pilotedBy
        && Math.hypot(v.x - camera.position.x, v.z - camera.position.z) < 4);
      if (nearV) tryEnterVehicle();
      else tryEnterMortar();
    }
  }
  if (e.code === 'KeyG') {
    // C4: if any are placed, G detonates them all instead of triggering ability
    if (placedC4s.length > 0 && activeSlot === 'support' && SUPPORT_ITEMS[selectedSupportIdx]?.id === 'c4') {
      detonateAllC4();
    } else {
      activateAbility();
    }
  }
  if (e.code==='KeyQ' || e.code==='Digit1' || e.code==='Digit2' || e.code==='Digit3' || e.code==='Digit4') {
    if (!loadoutReady()) return;
    if (e.code==='KeyQ') cycleActiveSlot();
    if (e.code==='Digit1') activeSlot = 'primary';
    if (e.code==='Digit2') activeSlot = 'secondary';
    if (e.code==='Digit3') activeSlot = 'melee';
    if (e.code==='Digit4') activeSlot = 'support';
    equipActiveSlot();
  }
});
document.addEventListener('keyup', e => {
  keys[e.code] = false;
  if (e.code==='Tab') showScoreboard(false);
});
document.addEventListener('mousedown', e => {
  // Spectator: any click cycles to next ally
  if (spectatorState && e.button === 0) { spectatorCycle(1); return; }
  // Mortar: LMB fires a grenade instead of the equipped weapon
  if (pilotedMortar && e.button === 0) { fireMortar(); return; }
  // Vehicle: LMB fires the vehicle's gun
  if (pilotedVehicle && e.button === 0) { fireVehicleGun(); return; }
  if (spectatorState && e.button === 2) { spectatorCycle(-1); return; }
  if (e.button !== 0) return;
  shooting = true;
  // Crossbow charge: start charging instead of shooting
  if (activeSlot === 'primary' && currentWeapon?.id === 'crossbow' && !isDead && gameStarted) {
    crossbowCharging    = true;
    crossbowChargeStart = Date.now();
    return; // don't fire yet
  }
  tryUseActive();
});
document.addEventListener('mouseup', e => {
  if (e.button !== 0) return;
  shooting = false;
  if (crossbowCharging) {
    crossbowCharging = false;
    fireCrossbowCharge();
  }
});

// ── Weapon switching ───────────────────────────────────────────────────────
function switchWeapon(idx) {
  if (idx === null || idx === undefined || idx < 0) return;
  if (idx === currentWeaponIdx || reloading) return;
  meleeModels.forEach(m => m.visible = false);
  supportModels.forEach(m => m.visible = false);
  weaponModels[currentWeaponIdx].visible = false;
  currentWeaponIdx = idx;
  currentWeapon = applyUpgrades(WEAPONS[idx]);
  weaponModels[idx].visible = true;
  ammo    = weaponAmmo[idx].ammo;
  reserve = weaponAmmo[idx].reserve;
  if (isADS) { isADS=false; targetFOV=75; setWeaponADSPos(false); }
  updateAmmoHUD();
  updateWeaponHUD();
}

function loadoutReady() {
  return selectedPrimaryIdx !== null && selectedSecondaryIdx !== null &&
    selectedMeleeIdx !== null && selectedSupportIdx !== null &&
    selectedPrimaryIdx >= 0 && selectedSecondaryIdx >= 0 &&
    selectedMeleeIdx >= 0 && selectedSupportIdx >= 0;
}

function resetCombatResources() {
  if (!loadoutReady()) return;
  for (const b of localBullets) scene.remove(b.mesh);
  localBullets.length = 0;
  for (const g of activeGrenades) scene.remove(g.mesh);
  activeGrenades.length = 0;
  const isRange = match?.type === 'range';
  const isDDay = match?.type === 'dday';
  if (isRange) {
    weaponAmmo.forEach((_, idx) => { weaponAmmo[idx] = { ammo: 999999, reserve: 999999 }; });
  } else if (isDDay) {
    weaponAmmo[selectedPrimaryIdx] = { ammo: 5000, reserve: 0 };
    weaponAmmo[selectedSecondaryIdx] = { ammo: 30, reserve: 999999 };
  } else {
    const pw = applyUpgrades(WEAPONS[selectedPrimaryIdx]);
    const sw = applyUpgrades(WEAPONS[selectedSecondaryIdx]);
    weaponAmmo[selectedPrimaryIdx]   = { ammo: pw.mag, reserve: pw.reserve };
    weaponAmmo[selectedSecondaryIdx] = { ammo: sw.mag, reserve: sw.reserve };
  }
  supportUses[selectedSupportIdx] = SUPPORT_ITEMS[selectedSupportIdx].uses;
  reloading = false; shooting = false; isADS = false; targetFOV = 75;
  abilityBuff = null; meleeAbilityBuff = null; pendingFanFire = null;
  crossbowCharging = false; crossbowChargeStart = 0;
  spearThrown = false; revealActive = false; revealEndTime = 0;
  meleeSwingT = 1; grenadeWindupT = 1; grenadeThrowFired = false;
  const reloadEl = document.getElementById('reload-flash');
  if (reloadEl) reloadEl.style.display = 'none';
  activeSlot = 'primary';
  equipActiveSlot();
}

function localPlayerTeam() {
  return pvpMatch?.team === 'enemy' ? 'enemy' : 'ally';
}

function teamSideSpawn(team = 'ally', spread = 36, depth = 38) {
  const side = team === 'enemy' ? -1 : 1;
  return {
    x: (Math.random() - 0.5) * spread,
    z: side * (depth + Math.random() * 8),
    yaw: team === 'enemy' ? 0 : Math.PI,
  };
}

function placePlayerAtTeamSpawn(team = localPlayerTeam(), spread = 36, depth = 38) {
  const sp = teamSideSpawn(team, spread, depth);
  camera.position.set(sp.x, 1.65, sp.z);
  euler.y = sp.yaw + (Math.random() - 0.5) * 0.6;
  camera.quaternion.setFromEuler(euler);
  return sp;
}

function resetPlayerForRound(x = null, z = null) {
  isDead = false;
  if (players[myId]) {
    players[myId].hp = 300;
    players[myId].dead = false;
  }
  updateHealthHUD(300);
  resetCombatResources();
  let sp;
  if (x == null || z == null) {
    sp = placePlayerAtTeamSpawn();
  } else {
    camera.position.set(x, 1.65, z);
    euler.y = z < 0 ? 0 : Math.PI;
    camera.quaternion.setFromEuler(euler);
    sp = { x, z };
  }
  document.getElementById('waiting-screen').style.display = 'none';
  document.getElementById('death-screen').style.display = 'none';
  socket.emit('resetSelf', { x: sp.x, z: sp.z });
}

function cycleActiveSlot() {
  const slots = ['primary', 'secondary', 'melee', 'support'];
  activeSlot = slots[(slots.indexOf(activeSlot) + 1) % slots.length];
}

function equipActiveSlot() {
  // Reset any in-progress melee swing before hiding
  meleeSwingT = 1;
  meleeModels.forEach(m => { m.position.copy(MELEE_REST_POS); m.rotation.set(0, 0, 0); });
  // Reset grenade windup
  grenadeWindupT = 1;
  // Hide all guns, melee, support first
  weaponModels.forEach(m => m.visible = false);
  meleeModels.forEach(m => m.visible = false);
  supportModels.forEach(m => m.visible = false);
  if (isADS) { isADS = false; targetFOV = 75; setWeaponADSPos(false); }

  if (activeSlot === 'primary') {
    currentWeaponIdx = selectedPrimaryIdx;
    currentWeapon = applyUpgrades(WEAPONS[selectedPrimaryIdx]);
    weaponModels[selectedPrimaryIdx].visible = true;
    ammo = weaponAmmo[selectedPrimaryIdx].ammo;
    reserve = weaponAmmo[selectedPrimaryIdx].reserve;
  } else if (activeSlot === 'secondary') {
    currentWeaponIdx = selectedSecondaryIdx;
    currentWeapon = applyUpgrades(WEAPONS[selectedSecondaryIdx]);
    weaponModels[selectedSecondaryIdx].visible = true;
    ammo = weaponAmmo[selectedSecondaryIdx].ammo;
    reserve = weaponAmmo[selectedSecondaryIdx].reserve;
  } else if (activeSlot === 'melee') {
    if (selectedMeleeIdx !== null && selectedMeleeIdx >= 0)
      meleeModels[selectedMeleeIdx].visible = true;
  } else if (activeSlot === 'support') {
    if (selectedSupportIdx !== null && selectedSupportIdx >= 0)
      supportModels[selectedSupportIdx].visible = true;
  }
  updateAmmoHUD(); updateWeaponHUD(); updateWeaponSelector();
}

// ── ADS ────────────────────────────────────────────────────────────────────
function toggleADS() {
  if (isDead) return;
  isADS = !isADS;
  targetFOV = isADS ? currentWeapon.adsZoom : 75;
  setWeaponADSPos(isADS);
  const isSniperADS = isADS && currentWeapon.id === 'srx';
  const overlay = document.getElementById('scope-overlay');
  overlay.style.display = isSniperADS ? 'block' : 'none';
  if (isSniperADS) drawScope();
  // Hide crosshair and weapon model when scoped
  document.getElementById('crosshair').style.display = isSniperADS ? 'none' : 'block';
  weaponModels[currentWeaponIdx].visible = !isSniperADS;
}

function drawScope() {
  const canvas = document.getElementById('scope-canvas');
  const W = window.innerWidth, H = window.innerHeight;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const cx = W / 2, cy = H / 2;
  const r = Math.min(W, H) * 0.38;

  // Black border mask around the circle
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  // Cut out the circle — make it transparent so the 3D scene shows through
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  // Scope rim
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  // Green reticle crosshair
  ctx.strokeStyle = 'rgba(0,255,80,0.9)';
  ctx.lineWidth = 1.5;
  const gap = r * 0.18;
  // Horizontal
  ctx.beginPath(); ctx.moveTo(cx - r + 10, cy); ctx.lineTo(cx - gap, cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + gap, cy);      ctx.lineTo(cx + r - 10, cy); ctx.stroke();
  // Vertical
  ctx.beginPath(); ctx.moveTo(cx, cy - r + 10); ctx.lineTo(cx, cy - gap); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy + gap);      ctx.lineTo(cx, cy + r - 10); ctx.stroke();

  // Center dot
  ctx.fillStyle = 'rgba(0,255,80,0.95)';
  ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, Math.PI * 2); ctx.fill();

  // Range stadia marks below center
  ctx.strokeStyle = 'rgba(0,255,80,0.6)';
  ctx.lineWidth = 1;
  [[0.06,16],[0.12,12],[0.18,9]].forEach(([offset, half]) => {
    const y = cy + r * offset;
    ctx.beginPath(); ctx.moveTo(cx - half, y); ctx.lineTo(cx + half, y); ctx.stroke();
  });
}

window.addEventListener('resize', () => {
  if (isADS && currentWeapon.id === 'srx') drawScope();
});

function setWeaponADSPos(ads) {
  const model = weaponModels[currentWeaponIdx];
  if (ads) {
    model.position.set(0, -0.1, -0.25);
  } else {
    model.position.set(0.12, -0.1, -0.25);
  }
}

// ── Movement ───────────────────────────────────────────────────────────────
const SPEED = 7.5; // base movement speed (was 5 — bumped 1.5× for snappier feel)

// ── 🏆 WEAPON MASTERY — per-weapon kill counts + title progression
const MASTERY_TIERS = [
  { kills: 10,   title: 'Apprentice', color: '#88ccff' },
  { kills: 25,   title: 'Adept',      color: '#88ff99' },
  { kills: 100,  title: 'Veteran',    color: '#ffcc66' },
  { kills: 500,  title: 'Master',     color: '#ff8844' },
  { kills: 1000, title: 'Legend',     color: '#ff44dd' },
  { kills: 5000, title: 'Mythic',     color: '#ddccff' },
];
let weaponKills = {};
try { weaponKills = JSON.parse(localStorage.getItem('pvp_weapon_kills') || '{}'); } catch (e) {}
function saveWeaponKills() { try { localStorage.setItem('pvp_weapon_kills', JSON.stringify(weaponKills)); } catch(e) {} }
function weaponTitleFor(id) {
  const n = weaponKills[id] || 0;
  let t = null;
  for (const tier of MASTERY_TIERS) if (n >= tier.kills) t = tier;
  return t;
}
function weaponTitleString(id) {
  const t = weaponTitleFor(id);
  return t ? `${t.title}` : '';
}
function creditWeaponKill(weaponId) {
  if (!weaponId) return;
  const before = weaponKills[weaponId] || 0;
  const after  = before + 1;
  weaponKills[weaponId] = after;
  saveWeaponKills();
  // Did we just cross a tier threshold?
  for (const tier of MASTERY_TIERS) {
    if (before < tier.kills && after >= tier.kills) {
      const wname = WEAPONS.find(w => w.id === weaponId)?.name
                 || MELEE_ITEMS.find(m => m.id === weaponId)?.name
                 || SUPPORT_ITEMS.find(s => s.id === weaponId)?.name
                 || weaponId;
      showAnnouncement(`🏆 ${tier.title.toUpperCase()}`, `${wname} · ${tier.kills} kills`, tier.color, 3500);
      break;
    }
  }
}
function currentEquippedId() {
  if (activeSlot === 'primary')   return WEAPONS[selectedPrimaryIdx]?.id;
  if (activeSlot === 'secondary') return WEAPONS[selectedSecondaryIdx]?.id;
  if (activeSlot === 'melee')     return MELEE_ITEMS[selectedMeleeIdx]?.id;
  if (activeSlot === 'support')   return SUPPORT_ITEMS[selectedSupportIdx]?.id;
  return null;
}

// ── 🎬 KILLCAM — record positions of all entities, play back from killer POV on death
const KILLCAM = {
  buf: [],                // ring of frames { t, entities: { id: {x,y,z,rotY} } }
  capacity: 100,          // 100 frames × 100 ms = 10 s (the 10 s before the kill)
  lastSampleAt: 0,
  active: false,
  startedAt: 0,
  durationMs: 2200,
  killerId: null,
  deathPos: null,         // {x,y,z} where player died
  savedCamPos: null,
  savedCamQuat: null,
  banner: null,
};
function killcamSample(now) {
  if (now - KILLCAM.lastSampleAt < 100) return;
  KILLCAM.lastSampleAt = now;
  const ents = {};
  ents[myId] = { x: camera.position.x, y: camera.position.y, z: camera.position.z, rotY: euler.y, rotX: euler.x };
  for (const b of gameBots) {
    if (!b) continue;
    ents[b.id] = { x: b.x, y: (b.y || 0) + 1, z: b.z, rotY: b.rotY || 0, rotX: b.rotX || 0 };
  }
  KILLCAM.buf.push({ t: now, entities: ents });
  if (KILLCAM.buf.length > KILLCAM.capacity) KILLCAM.buf.shift();
}
function startKillcam(killerId) {
  if (KILLCAM.active) return;
  if (!killerId || killerId === myId) return; // no self-kill killcam
  if (KILLCAM.buf.length < 4) return;          // not enough recorded frames
  KILLCAM.active = true;
  KILLCAM.startedAt = performance.now();
  KILLCAM.killerId = killerId;
  KILLCAM.deathPos = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
  KILLCAM.savedCamPos = camera.position.clone();
  KILLCAM.savedCamQuat = camera.quaternion.clone();
  // Banner
  if (!KILLCAM.banner) {
    KILLCAM.banner = document.createElement('div');
    KILLCAM.banner.style.cssText = 'position:fixed;top:60px;left:50%;transform:translateX(-50%);z-index:9700;'
      + 'background:rgba(20,0,0,0.85);color:#ff8888;border:2px solid #ff4444;padding:10px 24px;'
      + 'font-family:"Courier New",monospace;font-size:14px;letter-spacing:3px;border-radius:6px;display:none;';
    document.body.appendChild(KILLCAM.banner);
  }
  const killerName = players[killerId]?.name || 'an enemy';
  KILLCAM.banner.textContent = `🎬 KILLCAM · killed by ${killerName}`;
  KILLCAM.banner.style.display = 'block';
  // Hide death screen during killcam
  const ds = document.getElementById('death-screen');
  if (ds) ds.style.display = 'none';
}
function stopKillcam() {
  if (!KILLCAM.active) return;
  KILLCAM.active = false;
  if (KILLCAM.banner) KILLCAM.banner.style.display = 'none';
  if (KILLCAM.savedCamPos) camera.position.copy(KILLCAM.savedCamPos);
  if (KILLCAM.savedCamQuat) camera.quaternion.copy(KILLCAM.savedCamQuat);
  // Show the actual death screen (if still dead)
  if (isDead) {
    const ds = document.getElementById('death-screen');
    if (ds && match?.type !== 'elim') ds.style.display = 'flex';
  }
}
function updateKillcam(now) {
  if (!KILLCAM.active) return;
  const t = (now - KILLCAM.startedAt) / KILLCAM.durationMs;
  if (t >= 1) { stopKillcam(); return; }
  // Map t (0..1) over only the last ~3 s of the buffer (the buffer now holds 10 s
  // for the kill-log theater, but the death killcam stays a quick last-moments cam).
  const tail = Math.min(KILLCAM.buf.length, 30);
  const base = KILLCAM.buf.length - tail;
  const i = base + Math.min(tail - 1, Math.floor(t * tail));
  const frame = KILLCAM.buf[i];
  if (!frame) return;
  const killer = frame.entities[KILLCAM.killerId];
  const victim = frame.entities[myId];
  if (!killer) return;
  // Camera ~2.5 m behind and 0.6 m above the killer, looking at the player
  const fwd = new THREE.Vector3(-Math.sin(killer.rotY), 0, -Math.cos(killer.rotY));
  const camPos = new THREE.Vector3(killer.x, killer.y + 0.6, killer.z).addScaledVector(fwd, -2.5);
  camera.position.copy(camPos);
  const look = victim
    ? new THREE.Vector3(victim.x, victim.y, victim.z)
    : new THREE.Vector3(KILLCAM.deathPos.x, KILLCAM.deathPos.y, KILLCAM.deathPos.z);
  camera.lookAt(look);
}

// ── 📹 KILL LOG — save your kills and replay them from 6 cameras at once ──
// Each entry: { ts, victim, weapon, frames, killerId, victimId, favorite, pinned }
let killLog = [];
const KILL_LOG_CAP = 20; // auto-cleanup keeps newest 20 (favorites/pins immune)
try {
  const saved = JSON.parse(localStorage.getItem('pvp_kill_log') || '[]');
  if (Array.isArray(saved)) killLog = saved;
} catch (e) {}
function saveKillLogToDisk() {
  try { localStorage.setItem('pvp_kill_log', JSON.stringify(killLog)); }
  catch (e) { /* quota — drop oldest non-favorite and retry once */
    const i = killLog.map((k,idx)=>({k,idx})).reverse().find(o=>!o.k.favorite && !o.k.pinned);
    if (i) { killLog.splice(i.idx, 1); try { localStorage.setItem('pvp_kill_log', JSON.stringify(killLog)); } catch(e2){} }
  }
}
function rd(n) { return Math.round(n * 100) / 100; } // round to 2dp to shrink storage
function saveKillReplay(victimId, weaponId) {
  if (!KILLCAM.buf.length) return;
  // Deep-copy + round the recent frames so storage stays compact
  const frames = KILLCAM.buf.map(f => ({
    entities: Object.fromEntries(Object.entries(f.entities).map(([id, e]) =>
      [id, { x: rd(e.x), y: rd(e.y), z: rd(e.z), rotY: rd(e.rotY||0), rotX: rd(e.rotX||0) }])),
  }));
  const victimName = players[victimId]?.name || 'Enemy';
  const wname = WEAPONS.find(w => w.id === weaponId)?.name
             || MELEE_ITEMS.find(m => m.id === weaponId)?.name
             || SUPPORT_ITEMS.find(s => s.id === weaponId)?.name || (weaponId || 'weapon');
  // Simple "score" heuristic: # of frames where target was alive (longer chase = higher)
  const score = frames.length;
  killLog.unshift({ ts: Date.now(), victim: victimName, weapon: wname, mapId: activeMapName,
                    frames, killerId: myId, victimId, favorite: false, pinned: false, score });
  autoCleanupKillLog();
  saveKillLogToDisk();
}
// 🤖 Keep newest KILL_LOG_CAP, but never evict favorited or pinned entries.
function autoCleanupKillLog() {
  // Sort so pinned float to the top, then newest first
  killLog.sort((a, b) => (b.pinned - a.pinned) || (b.ts - a.ts));
  if (killLog.length <= KILL_LOG_CAP) return;
  // Remove the oldest non-protected entries until under cap
  for (let i = killLog.length - 1; i >= 0 && killLog.length > KILL_LOG_CAP; i--) {
    if (!killLog[i].favorite && !killLog[i].pinned) killLog.splice(i, 1);
  }
}

// ── 6-camera replay theater ──────────────────────────────────────────────
const THEATER = {
  active: false,
  replay: null,
  startedAt: 0,
  durationMs: 4000,    // slow-mo: 3 s of action stretched to 4 s
  ghosts: {},          // id -> { mesh } temporary actor meshes
  ghostGroup: null,
  cams: [],            // 6 THREE.PerspectiveCamera
  labels: ['TOP','1ST PERSON','LEFT','RIGHT','3RD PERSON','OPPONENT'],
};
function buildTheaterCams() {
  if (THEATER.cams.length) return;
  for (let i = 0; i < 6; i++) {
    const c = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    THEATER.cams.push(c);
  }
}
function openKillTheater(index) {
  const replay = killLog[index];
  if (!replay) return;
  buildTheaterCams();
  THEATER.active = true;
  THEATER.replay = replay;
  THEATER.startedAt = performance.now();
  // Play at 1.5× the real event speed. Frames were sampled every ~100 ms, so the
  // real clip length is frames*100 ms; divide by 1.5 to compress the playback.
  THEATER.durationMs = Math.max(700, (replay.frames.length * 100) / 1.5);
  // The 6-cam theater renders to the WebGL canvas (low z-index). Any full-screen
  // menu (e.g. #mode-screen, ~93% opaque black) would cover it, so hide them
  // while the theater is open and restore them on close.
  THEATER._hidden = [];
  for (const sel of ['mode-screen', 'shop-screen', 'loadout-screen', 'login-screen', 'overlay']) {
    const el = document.getElementById(sel);
    if (el && el.style.display !== 'none' && getComputedStyle(el).display !== 'none') {
      THEATER._hidden.push([el, el.style.display]);
      el.style.display = 'none';
    }
  }
  // Build ghost actor meshes for every entity in the replay
  THEATER.ghostGroup = new THREE.Group();
  scene.add(THEATER.ghostGroup);
  THEATER.ghosts = {};
  // Show the ACTUAL map the kill happened on. Maps are persistent groups toggled
  // by activateMap(); we record the kill's map in the replay (mapId) and switch
  // to it here, restoring the previous map on close. Old replays without a mapId
  // (or an unknown map) fall back to a generic lit stage so they're still visible.
  THEATER._prevMap = activeMapName;
  THEATER._prevBg = scene.background;
  const realMap = replay.mapId && MAP_GROUPS[replay.mapId] ? replay.mapId : null;
  THEATER.stageGround = THEATER.stageGrid = THEATER.stageLight = null;
  if (realMap) {
    activateMap(realMap);
    const sky = MAP_GROUPS[realMap]._skyColor;
    scene.background = new THREE.Color(sky != null ? sky : 0x87ceeb);
  } else {
    // Fallback generic stage: a big lit ground plane + bright light follow the action.
    const stageGround = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshLambertMaterial({ color: 0x2a3340 }));
    stageGround.rotation.x = -Math.PI / 2;
    THEATER.ghostGroup.add(stageGround);
    THEATER.stageGround = stageGround;
    const stageGrid = new THREE.GridHelper(200, 80, 0x4a5a6a, 0x33414f);
    THEATER.ghostGroup.add(stageGrid);
    THEATER.stageGrid = stageGrid;
    const stageLight = new THREE.PointLight(0xffffff, 1.1, 0, 1.2);
    THEATER.ghostGroup.add(stageLight);
    THEATER.stageLight = stageLight;
    scene.background = new THREE.Color(0x10141c);
  }
  THEATER._lastT = performance.now();
  const f0 = replay.frames[0];
  for (const id of Object.keys(f0.entities)) {
    const isKiller = id === replay.killerId;
    const isVictim = id === replay.victimId;
    // Real character model instead of a plain capsule. Replays don't store
    // skins, so use the default model and tint the shirt blue (killer) / red
    // (victim) to keep the who's-who color cue. The killer holds a gun pose.
    const name = isKiller ? (id === replay.killerId && replay.killer ? replay.killer : (id === myId ? (currentUser?.username || 'You') : 'Killer'))
               : isVictim ? (replay.victim || 'Victim') : 'Player';
    const team = isKiller ? 'ally' : 'enemy';
    const body = makePlayerMesh(name, false, team, 'default', {});
    // Tint shirt + arms to the team color for at-a-glance identification.
    const tint = isKiller ? 0x3a72d6 : isVictim ? 0xd63a3a : 0x9a9a9a;
    if (body._rig) {
      body._rig.torso.material.color.setHex(tint);
      body._rig.armL.children[0].material.color.setHex(tint);
      body._rig.armR.children[0].material.color.setHex(tint);
      body._rig.holdsGun = isKiller; // killer keeps the weapon arm raised
    }
    // Give the killer a visible weapon in hand (generic gun, barrel along -Z).
    if (isKiller) {
      const gun = _genericGun({ bodyShape: 'classic', bodyColor: 0x222222, accentColor: 0x6a6a6a, magType: 'banana', topRail: true });
      gun.scale.setScalar(1.25);
      gun.position.set(0.26, 1.34, -0.34); // right-hand, forward of the chest
      body.add(gun);
      body._gun = gun;
    }
    THEATER.ghostGroup.add(body);
    THEATER.ghosts[id] = { mesh: body, isKiller, isVictim };
  }
  // Bullet/muzzle-flash FX layer for the replay.
  THEATER.fxGroup = new THREE.Group();
  THEATER.ghostGroup.add(THEATER.fxGroup);
  THEATER.tracers = [];
  THEATER.fireTimer = 0;
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffdd66, transparent: true, opacity: 0 }));
  THEATER.fxGroup.add(flash);
  THEATER.muzzleFlash = flash;
  // Overlay frame with 6 labeled panes + close button
  let ov = document.getElementById('theater-overlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'theater-overlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:9600;pointer-events:none;font-family:"Courier New",monospace;';
    document.body.appendChild(ov);
  }
  ov.style.display = 'block';
  ov.innerHTML = `
    <div style="position:absolute;top:8px;left:50%;transform:translateX(-50%);color:#ffcc66;font-size:14px;letter-spacing:3px;background:rgba(0,0,0,0.6);padding:6px 16px;border-radius:6px;">
      📹 KILL LOG · ${replay.victim} · ${replay.weapon}
    </div>
    <button id="theater-close" style="position:absolute;top:8px;right:12px;pointer-events:all;background:#3a1a1a;color:#ff8888;border:1px solid #ff4444;padding:6px 14px;cursor:pointer;font-family:inherit;border-radius:4px;">✕ CLOSE</button>
    <button id="theater-rec" style="position:absolute;top:8px;right:120px;pointer-events:all;background:#1a3a1a;color:#88ff99;border:1px solid #44aa66;padding:6px 14px;cursor:pointer;font-family:inherit;border-radius:4px;">🎬 SAVE CLIP</button>
    ${THEATER.labels.map((l,i) => {
      const col = i % 2, row = Math.floor(i / 2);
      return `<div style="position:absolute;left:${col*50}%;top:${row*33.33}%;width:50%;color:#fff;font-size:10px;letter-spacing:2px;padding:4px 8px;text-shadow:0 0 4px #000;">${l}</div>`;
    }).join('')}
  `;
  document.getElementById('theater-close').addEventListener('click', closeKillTheater);
  document.getElementById('theater-rec').addEventListener('click', recordTheaterClip);
  // The theater drives its OWN render loop. The main game loop() only runs after
  // a match has started, but the kill log is opened from the cold menu/lobby —
  // so without this the viewports never get drawn (pure black). theaterTick()
  // owns rendering while active; loop() defers to it (see loop()).
  requestAnimationFrame(theaterTick);
}
function theaterTick() {
  if (!THEATER.active) return;
  renderTheater();
  requestAnimationFrame(theaterTick);
}

// 🎬 Record the 6-cam theater canvas to a downloadable webm video (~5 s)
function recordTheaterClip() {
  const btn = document.getElementById('theater-rec');
  if (!btn || btn._recording) return;
  if (!renderer.domElement.captureStream) { alert('Your browser does not support canvas video capture.'); return; }
  btn._recording = true;
  btn.textContent = '● REC…';
  btn.style.background = '#5a1a1a';
  const stream = renderer.domElement.captureStream(30);
  const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
  const chunks = [];
  let rec;
  try { rec = new MediaRecorder(stream, { mimeType: mime }); }
  catch (e) { alert('Recording not supported: ' + e.message); btn._recording = false; btn.textContent = '🎬 SAVE CLIP'; return; }
  rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  rec.onstop = () => {
    const blob = new Blob(chunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const r = THEATER.replay;
    a.href = url;
    a.download = `killcam_${r ? r.victim.replace(/\s+/g,'_') : 'clip'}_${Date.now()}.webm`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    btn._recording = false;
    btn.textContent = '🎬 SAVE CLIP';
    btn.style.background = '#1a3a1a';
  };
  rec.start();
  setTimeout(() => { if (rec.state !== 'inactive') rec.stop(); }, 5000); // 5-second clip
}
function closeKillTheater() {
  THEATER.active = false;
  if (THEATER.ghostGroup) { scene.remove(THEATER.ghostGroup); THEATER.ghostGroup = null; }
  THEATER.ghosts = {};
  THEATER.stageGround = THEATER.stageGrid = THEATER.stageLight = null;
  THEATER.fxGroup = null; THEATER.tracers = null; THEATER.muzzleFlash = null;
  // Restore the map that was active before the theater swapped to the replay's map.
  if (THEATER._prevMap && MAP_GROUPS[THEATER._prevMap]) { activateMap(THEATER._prevMap); THEATER._prevMap = null; }
  if (THEATER._prevBg !== undefined) { scene.background = THEATER._prevBg; THEATER._prevBg = undefined; }
  const ov = document.getElementById('theater-overlay');
  if (ov) ov.style.display = 'none';
  // Restore any menu screens we hid when the theater opened.
  if (THEATER._hidden) {
    for (const [el, disp] of THEATER._hidden) { el.style.display = disp || 'flex'; }
    THEATER._hidden = null;
  }
}
function renderTheater() {
  const replay = THEATER.replay;
  if (!replay || !replay.frames.length) { closeKillTheater(); return; }
  const t = (performance.now() - THEATER.startedAt) / THEATER.durationMs;
  // Play ONCE (no loop): clamp progress to the last frame and freeze on the
  // kill moment when finished. `done` stops the gunfire FX after the kill.
  const done = t >= 1;
  const clampT = Math.min(0.99999, t);
  const i = Math.min(replay.frames.length - 1, Math.floor(clampT * replay.frames.length));
  const frame = replay.frames[i];
  // dt for the walk animation (clamped). theaterTick/loop both call us per frame.
  const nowMs = performance.now();
  const dt = Math.min(0.05, Math.max(0, (nowMs - (THEATER._lastT || nowMs)) / 1000));
  THEATER._lastT = nowMs;
  // Position ghosts. Models have their origin at the feet; recorded e.y is the
  // eye/upper-body height, so drop ~1.6 m to stand them on the ground.
  for (const [id, e] of Object.entries(frame.entities)) {
    const g = THEATER.ghosts[id];
    if (g) {
      g.mesh.position.set(e.x, Math.max(0, (e.y || 1) - 1.6), e.z);
      g.mesh.rotation.y = e.rotY || 0;
      animateCharacterMesh(g.mesh, dt, 0); // walk-cycle from distance moved
    }
  }
  const killer = frame.entities[replay.killerId];
  const victim = frame.entities[replay.victimId];
  // ── Bullets + muzzle flash: fire tracers from the killer's gun at the victim ──
  if (THEATER.fxGroup && killer && victim) {
    const kFeet = Math.max(0, (killer.y || 1) - 1.6);
    const fwd = new THREE.Vector3(-Math.sin(killer.rotY || 0), 0, -Math.cos(killer.rotY || 0));
    const muzzle = new THREE.Vector3(killer.x + fwd.x * 0.7, kFeet + 1.34, killer.z + fwd.z * 0.7);
    const target = new THREE.Vector3(victim.x, Math.max(0, (victim.y || 1) - 1.6) + 1.2, victim.z);
    THEATER.fireTimer -= dt;
    if (!done && THEATER.fireTimer <= 0) {
      THEATER.fireTimer = 0.11; // cyclic fire while replaying
      // Tracer: a thin bright cylinder that flies muzzle -> victim chest.
      const dir = target.clone().sub(muzzle); const len = Math.max(0.4, dir.length());
      const geo = new THREE.CylinderGeometry(0.025, 0.025, 0.8, 6);
      const mat = new THREE.MeshBasicMaterial({ color: 0xfff0a0 });
      const tr = new THREE.Mesh(geo, mat);
      tr.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      tr.userData = { from: muzzle.clone(), to: target.clone(), t: 0, speed: 9 };
      THEATER.fxGroup.add(tr);
      THEATER.tracers.push(tr);
      // Muzzle flash blip
      if (THEATER.muzzleFlash) { THEATER.muzzleFlash.position.copy(muzzle); THEATER.muzzleFlash.material.opacity = 1; }
    }
    if (THEATER.muzzleFlash) THEATER.muzzleFlash.material.opacity = Math.max(0, THEATER.muzzleFlash.material.opacity - dt * 14);
    // Advance existing tracers along their path; remove on arrival.
    for (let k = THEATER.tracers.length - 1; k >= 0; k--) {
      const tr = THEATER.tracers[k], u = tr.userData;
      u.t += dt * u.speed;
      if (u.t >= 1) { THEATER.fxGroup.remove(tr); tr.geometry.dispose(); tr.material.dispose(); THEATER.tracers.splice(k, 1); continue; }
      tr.position.lerpVectors(u.from, u.to, u.t);
    }
  }
  const cx = killer && victim ? (killer.x + victim.x) / 2 : (killer?.x || 0);
  const cz = killer && victim ? (killer.z + victim.z) / 2 : (killer?.z || 0);
  const center = new THREE.Vector3(cx, 1.2, cz);
  // Keep the stage ground/grid/light centered on the action so it's always in view.
  if (THEATER.stageGround) THEATER.stageGround.position.set(cx, 0, cz);
  if (THEATER.stageGrid) THEATER.stageGrid.position.set(cx, 0.02, cz);
  if (THEATER.stageLight) THEATER.stageLight.position.set(cx, 12, cz);
  const cams = THEATER.cams;
  // 0 TOP
  cams[0].position.set(cx, 24, cz); cams[0].lookAt(center);
  // 1 FIRST PERSON (killer eyes)
  if (killer) {
    const f = new THREE.Vector3(-Math.sin(killer.rotY), 0, -Math.cos(killer.rotY));
    cams[1].position.set(killer.x, (killer.y || 1) + 0.6, killer.z);
    cams[1].lookAt(cams[1].position.clone().add(f));
  }
  // 2 LEFT
  cams[2].position.set(cx - 10, 3, cz); cams[2].lookAt(center);
  // 3 RIGHT
  cams[3].position.set(cx + 10, 3, cz); cams[3].lookAt(center);
  // 4 THIRD PERSON (behind killer)
  if (killer) {
    const f = new THREE.Vector3(-Math.sin(killer.rotY), 0, -Math.cos(killer.rotY));
    cams[4].position.set(killer.x - f.x*4, (killer.y||1)+2.5, killer.z - f.z*4);
    cams[4].lookAt(center);
  }
  // 5 OPPONENT POV (victim eyes)
  if (victim) {
    const f = new THREE.Vector3(-Math.sin(victim.rotY), 0, -Math.cos(victim.rotY));
    cams[5].position.set(victim.x, (victim.y||1)+0.6, victim.z);
    cams[5].lookAt(cams[5].position.clone().add(f));
  }
  // Render the 6 viewports in a 2-col × 3-row grid
  const W = renderer.domElement.width, H = renderer.domElement.height;
  const cw = W / 2, ch = H / 3;
  renderer.setScissorTest(true);
  for (let k = 0; k < 6; k++) {
    const col = k % 2, rowFromTop = Math.floor(k / 2);
    const x = col * cw;
    const y = H - (rowFromTop + 1) * ch; // GL origin is bottom-left
    renderer.setViewport(x, y, cw, ch);
    renderer.setScissor(x, y, cw, ch);
    cams[k].aspect = cw / ch; cams[k].updateProjectionMatrix();
    renderer.render(scene, cams[k]);
  }
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, W, H);
}

// 🏋️ Weapon weights — how much the equipped item slows your move speed.
// 0 = no penalty (fast), 1 = -100% (frozen). Floor of 0.15 enforced.
// Override per-weapon by adding `weight: 0.x` in the item definition.
// Defaults are heuristic from type / damage / mag size:
function getDefaultWeaponWeight(item) {
  if (!item) return 0;
  const id = item.id;
  // Fixed targets requested by design:
  const FIXED = {
    fists: 0.00, knife: 0.05, baguette: 0.02, screwdriver: 0.05,
    minigun: 0.40, royal_minigun: 0.70, m134: 0.55, gau19: 0.50, mk44: 0.45,
    barrett: 0.45, amr: 0.45, thermal_lmg: 0.40, rpd: 0.30,
    flamethrower: 0.35, mortar_rifle: 0.40, gravity_launcher: 0.35,
    grenade_launcher: 0.30, sledge: 0.30, titan_hammer: 0.45, gravity_hammer: 0.30,
    fire_axe: 0.20, combat_axe: 0.18, chainsaw: 0.25, lightsabre: 0.05,
    riot_shield: 0.20, vampire_blade: 0.10, katana: 0.08, sabre: 0.06,
    spear: 0.10, bat: 0.05, crowbar: 0.05, hatchet: 0.07, machete: 0.06,
    shovel: 0.15, fire_poker: 0.06, meat_cleaver: 0.10,
    void_harvester: 0.55, nebula_mortar: 0.50, storm_core: 0.40, prism_engine: 0.30,
    pinball_launcher: 0.40, seismic_hammer: 0.45, harpoon_gun: 0.30,
  };
  if (FIXED[id] != null) return FIXED[id];
  // Secondaries: light by default
  if (item.slot === 'secondary') return 0.05;
  // Melees: tiny default
  if (item.range != null && item.cooldown != null && !item.slot) return 0.07; // melee
  // Support items: usually light unless they're huge
  if (item.uses != null && item.cooldown && !item.slot) return 0.05;
  // Primaries: scale with damage * mag
  const dmg = item.damage || 20;
  const mag = item.mag || 30;
  // Loosely: 6 × 30 = 180 → 0.10. 95 × 5 = 475 → ~0.20. 100 × 12 = 1200 → ~0.30.
  const raw = (dmg * mag) / 5000;
  return Math.max(0.05, Math.min(0.40, raw));
}
const dir = new THREE.Vector3();
const BOUNDS = 48;
// Map-aware boundary (BR arena is 6× larger). 123 lets player reach the actual wall surface (walls at ±125, 3 thick).
function getMapBounds() { return activeMapName === 'br_arena' ? 123 : BOUNDS; }

function updateMovement(dt) {
  if (isDead) return;
  if (match && !match.roundActive) return; // frozen during countdown
  if (pilotedVehicle) return; // piloting handles its own movement

  // Arrow key look
  if (keys['ArrowLeft'])  { euler.y += ARROW_SENS; camera.quaternion.setFromEuler(euler); }
  if (keys['ArrowRight']) { euler.y -= ARROW_SENS; camera.quaternion.setFromEuler(euler); }
  if (keys['ArrowUp'])    { euler.x = Math.min(Math.PI/2.2, euler.x + ARROW_SENS); camera.quaternion.setFromEuler(euler); }
  if (keys['ArrowDown'])  { euler.x = Math.max(-Math.PI/2.2, euler.x - ARROW_SENS); camera.quaternion.setFromEuler(euler); }

  // WASD movement
  const fwd   = new THREE.Vector3(-Math.sin(euler.y), 0, -Math.cos(euler.y));
  const right = new THREE.Vector3( Math.cos(euler.y), 0, -Math.sin(euler.y));
  dir.set(0,0,0);
  if (keys['KeyW'] || joyDir.y < -0.15) dir.add(fwd);
  if (keys['KeyS'] || joyDir.y >  0.15) dir.sub(fwd);
  if (keys['KeyA'] || joyDir.x < -0.15) dir.sub(right);
  if (keys['KeyD'] || joyDir.x >  0.15) dir.add(right);
  if (dir.lengthSq()>0) dir.normalize();
  const joyMag = joyActive ? Math.max(0.3, Math.min(1, Math.sqrt(joyDir.x**2+joyDir.y**2))) : 1;
  // 🏋️ Weapon-weight slow: heavier guns drop your move speed. Computed
  // from each item's `weight` (0 = no penalty, 1 = -100%). Defaults below.
  const equippedItem = activeSlot === 'primary'   ? WEAPONS[selectedPrimaryIdx]
                     : activeSlot === 'secondary' ? WEAPONS[selectedSecondaryIdx]
                     : activeSlot === 'melee'     ? MELEE_ITEMS[selectedMeleeIdx]
                     : activeSlot === 'support'   ? SUPPORT_ITEMS[selectedSupportIdx]
                     : null;
  const weight = (equippedItem && equippedItem.weight != null) ? equippedItem.weight : getDefaultWeaponWeight(equippedItem);
  const weightMult = Math.max(0.15, 1 - weight); // floor at 15% so you're never frozen
  const baseSpeedMult = (activeSlot === 'melee'
    ? (meleeAbilityBuff?.type === 'revup' ? 3.0 : (MELEE_ITEMS[selectedMeleeIdx]?.speedMult || 1.5))
    : 1) * weightMult;
  const adrenalineActive = Date.now() < adrenalineUntil;
  // Frost slow: 100 = normal, 0 = frozen. Linear scale.
  const frostMult = Math.max(0, playerFrostSlow) / 100;
  // ⚡ Admin speed boost: 3× speed
  const adminSpeedMult = (adminCheats.speed && currentUser?.isAdmin) ? 3 : 1;
  // 🏃 Sprint (Shift): +50% speed.  🦆 Crouch (Ctrl/C): -45% speed.
  // Mobile mirrors via mobileSprintHeld / mobileCrouchHeld toggles.
  const crouchHeld = !!(keys['ControlLeft'] || keys['ControlRight'] || keys['KeyC'] || window._mobileCrouch);
  // 🛹 Slide: edge-detect SHIFT (or mobile slide button) → 0.8s slide burst.
  // No sustained sprint — SHIFT only triggers a slide while you're moving.
  const shiftHeld = !!(keys['ShiftLeft'] || keys['ShiftRight'] || window._mobileSlide);
  const shiftEdge = shiftHeld && !window._prevShiftHeld;
  window._prevShiftHeld = shiftHeld;
  const nowMs = Date.now();
  if (shiftEdge && dir.lengthSq() > 0.001 && !window._slideUntil) {
    window._slideUntil = nowMs + 800; // 0.8s slide
    window._slideDir = dir.clone();
  }
  const sliding = window._slideUntil && nowMs < window._slideUntil;
  if (sliding) {
    // Lock direction to the slide vector + force crouch posture
    dir.copy(window._slideDir);
  } else if (window._slideUntil) {
    window._slideUntil = 0; // ended
  }
  const crouchMult = (crouchHeld && !sliding) ? 0.55 : 1;
  // Slide gives a tapered burst: starts at 2.0×, decays to ~1.0× by the end
  let slideMult = 1;
  if (sliding) {
    const t = (window._slideUntil - nowMs) / 800; // 1 → 0
    slideMult = 1.0 + 1.0 * t; // 2.0× → 1.0×
  }
  const speedMult = baseSpeedMult * (adrenalineActive ? 1.6 : 1) * frostMult * adminSpeedMult * crouchMult * slideMult;
  // Drop the camera when crouching / sliding (eased)
  if (!window._crouchEye) window._crouchEye = 1.65;
  // Slide drops the eye to 0.70 m so the view clearly dips below normal
  const targetEye = sliding ? 0.70 : (crouchHeld ? 1.10 : 1.65);
  // Slide transitions faster (~25/sec rate) so the drop is snappy at start of slide
  const easeRate = sliding ? 25 : 12;
  window._crouchEye += (targetEye - window._crouchEye) * Math.min(1, dt * easeRate);
  // 🦘 Jump physics — Space (or mobile button). Skip in slam/heli/mortar states.
  // ✨ Some weapons grant a mid-air double jump (sci-fi / gravity / jedi).
  if (!slamState && !pilotedVehicle && !pilotedMortar) {
    const groundEyeY = getGroundEyeY() + (window._crouchEye - 1.65);
    const isGrounded = camera.position.y <= groundEyeY + 0.05 && playerYVel <= 0;
    // Edge-detect Space so a held key doesn't auto-trigger the air jump
    const spaceDown = (keys['Space'] || window._mobileJump) && !crouchHeld;
    const spaceEdge = spaceDown && !window._prevSpaceDown;
    window._prevSpaceDown = spaceDown;
    // Does the currently equipped item grant a double jump?
    const equipped = activeSlot === 'primary'   ? currentWeapon
                   : activeSlot === 'secondary' ? currentWeapon
                   : activeSlot === 'melee'     ? MELEE_ITEMS[selectedMeleeIdx]
                   : activeSlot === 'support'   ? SUPPORT_ITEMS[selectedSupportIdx]
                   : null;
    const grantsDouble = !!(equipped && equipped.doubleJump);
    if (isGrounded) {
      window._airJumpsLeft = grantsDouble ? 1 : 0;
      window._climbArmed = false;   // wall-climb only after an actual jump
      window._climbBudget = 1.4;    // refill ~1.4s of climb stamina on landing
      window._climbing = false;
    }
    if (spaceEdge && isGrounded) {
      playerYVel = 9;
      window._climbArmed = true;    // a real jump arms the wall-climb
      window._mobileJump = false;
    } else if (spaceEdge && !isGrounded && grantsDouble && (window._airJumpsLeft || 0) > 0) {
      // ✨ Double jump in mid-air — reset velocity to full jump, brief sparkle FX
      playerYVel = 9;
      window._airJumpsLeft = 0;
      window._climbArmed = true;    // an air jump re-arms the climb too
      window._mobileJump = false;
      spawnAbilityAOEFX(camera.position.clone().setY(0.3), 1.2, 0xaaccff);
    }
    // 🧗 Wall-climb — airborne, you jumped (armed), you're pressing into a tall
    // wall, and you still have climb stamina. Negates gravity and scrambles up.
    let climbing = false;
    if (!isGrounded && window._climbArmed && (window._climbBudget || 0) > 0 && dir.lengthSq() > 0.01) {
      const wall = nearClimbableWall();
      // Must be pushing roughly INTO the wall, not along/away from it
      const cx = Math.max(wall ? wall.min.x : 0, Math.min(camera.position.x, wall ? wall.max.x : 0));
      const cz = Math.max(wall ? wall.min.z : 0, Math.min(camera.position.z, wall ? wall.max.z : 0));
      const intoWall = wall && (dir.x * (cx - camera.position.x) + dir.z * (cz - camera.position.z)) > -0.05;
      if (wall && intoWall) {
        climbing = true;
        window._climbing = true;
        window._climbBudget -= dt;
        playerYVel = 5.4;           // steady upward scramble
        window._climbFxT = (window._climbFxT || 0) + dt;
        if (window._climbFxT > 0.16) {
          window._climbFxT = 0;
          spawnHitParticle(camera.position.clone().setY(camera.position.y - 1.2));
          playSoundEvent('footstep', { volume: 0.32, pitch: 1.5, minGap: 100 });
        }
      }
    }
    if (!climbing) window._climbing = false;
    if (!isGrounded) {
      if (!climbing) playerYVel -= 28 * dt; // gravity (suspended while climbing)
      camera.position.y += playerYVel * dt;
      if (camera.position.y <= groundEyeY) {
        camera.position.y = groundEyeY;
        playerYVel = 0;
      }
    } else {
      // glue to ground when not jumping
      camera.position.y = groundEyeY;
      playerYVel = 0;
    }
  }
  // Ice: blend current input direction with last frame's direction for a slide feel
  if (typeof playerOnIce !== 'undefined' && playerOnIce()) {
    if (!window._iceDir) window._iceDir = new THREE.Vector3();
    window._iceDir.lerp(dir, 0.10); // very slow to change direction
    dir.copy(window._iceDir);
  } else if (window._iceDir) {
    window._iceDir.copy(dir); // off ice = instant follow
  }
  // Frost regen +2/sec (capped at 100)
  playerFrostSlow = Math.min(100, playerFrostSlow + dt * 2);
  // Trigger death if completely frozen
  if (playerFrostSlow <= 0 && !isDead) {
    playerFrostSlow = 0;
    applyBotDamageToPlayer('frost_freeze', null); // routes through death handler
  }
  // Track player velocity (smoothed) for bot bullet leading
  if (dt > 0.001) {
    const vx = (camera.position.x - lastPlayerPos.x) / dt;
    const vz = (camera.position.z - lastPlayerPos.z) / dt;
    playerVelocity.x = playerVelocity.x * 0.7 + vx * 0.3;
    playerVelocity.z = playerVelocity.z * 0.7 + vz * 0.3;
  }
  // EXPERT: keep a rolling history of player positions for trajectory prediction
  playerPosHistory.push({ x: camera.position.x, z: camera.position.z, t: Date.now() });
  if (playerPosHistory.length > 8) playerPosHistory.shift();
  lastPlayerPos.copy(camera.position);
  const moveDist = SPEED * speedMult * joyMag * dt;
  camera.position.addScaledVector(dir, moveDist);
  const _mb = getMapBounds();
  camera.position.x = Math.max(-_mb, Math.min(_mb, camera.position.x));
  camera.position.z = Math.max(-_mb, Math.min(_mb, camera.position.z));
  // 🦶 Footsteps — accumulate distance, fire on every ~1.5 m of grounded travel
  if (dir.lengthSq() > 0.001 && !slamState && !pilotedVehicle && !pilotedMortar && !isDead) {
    window._stepDist = (window._stepDist || 0) + moveDist;
    const stride = sliding ? 0.0 : (crouchHeld ? 1.8 : 1.4); // no steps during slide
    if (stride > 0 && window._stepDist >= stride) {
      window._stepDist = 0;
      window._stepAlt = !window._stepAlt;
      playSoundEvent('footstep', { volume: crouchHeld ? 0.4 : 0.7, pitch: window._stepAlt ? 1.0 : 1.15, minGap: 120 });
    }
  } else {
    window._stepDist = 0;
  }
  if (slamState) {
    // Low-grav zones reduce gravity to 1/3
    const gravMult = (typeof _playerInLowGrav !== 'undefined' && _playerInLowGrav) ? 0.33 : 1;
    slamState.vel -= 28 * dt * gravMult; // gravity
    camera.position.y += slamState.vel * dt;
    const groundEyeY = getGroundEyeY();
    if (camera.position.y <= groundEyeY) {
      camera.position.y = groundEyeY;
      if (slamState.type === 'slam') {
        // Slam AOE inline (can't use doAbilityAOE since it uses currentWeapon.id)
        const slamOrigin = camera.position.clone();
        const slamRadius = 4, slamColor = 0xff6600;
        spawnAbilityAOEFX(slamOrigin.clone().setY(0.15), slamRadius, slamColor);
        flashScreen('rgba(255,100,0,0.30)', 350);
        for (const [pid, mesh] of Object.entries(remoteMeshes)) {
          const d = slamOrigin.distanceTo(mesh.position.clone().setY(1.0));
          if (d < slamRadius) {
            const hp = mesh.position.clone().setY(1.0);
            const dummy = TRAINING_DUMMIES.find(dd => dd.id === pid);
            if (dummy) handleDummyHit(dummy, mesh, { damage: 80 }, hp);
            else emitHit(pid, `slam_${myId}_${Date.now()}_${pid}`, 'sledge', hp);
            spawnHitParticle(hp);
          }
        }
      }
      slamState = null;
    }
  } else {
    // Crouch / slide eye-height delta. window._crouchEye is the *target* eye
    // height (1.65 standing, 1.10 crouched, 0.95 sliding); subtract from
    // 1.65 to get the y offset to apply on top of the ground.
    const crouchDelta = (window._crouchEye != null) ? (window._crouchEye - 1.65) : 0;
    const groundEyeY = getGroundEyeY() + crouchDelta;
    if (camera.position.y > groundEyeY + 0.04 && (window._playerYVel || playerYVel) === 0) {
      // We're somehow above ground without active jump velocity — drop us
      slamState = { vel: 0, type: 'fall' };
    } else if (Math.abs(camera.position.y - groundEyeY) < 0.5) {
      // Standing on (or just above) ground — snap to crouch-adjusted height
      camera.position.y = groundEyeY;
    }
  }
  resolveWallCollisions();

  // 🛹 First-person slide feedback — only while in normal first-person control
  // (skip during killcam / theater / piloted camera overrides, which own the camera).
  const fpControl = !KILLCAM.active && !THEATER.active && !pilotedVehicle && !pilotedMortar && !isDead;
  if (fpControl) {
    // Camera lean (roll about the view axis) — doesn't affect aim direction.
    const rollTarget = sliding ? 0.14 : 0;
    window._viewRoll = (window._viewRoll || 0) + (rollTarget - (window._viewRoll || 0)) * Math.min(1, dt * 10);
    if (Math.abs(window._viewRoll) > 0.0005 || euler.z !== 0) {
      euler.z = Math.abs(window._viewRoll) < 0.0005 ? 0 : window._viewRoll;
      camera.quaternion.setFromEuler(euler);
    }
    // Slide FOV kick for a sense of speed (don't fight ADS zoom).
    if (!isADS) targetFOV = sliding ? 84 : 75;
  }

  // Smooth FOV for ADS / slide kick
  if (Math.abs(camera.fov - targetFOV) > 0.5) {
    camera.fov += (targetFOV - camera.fov) * 0.18;
    camera.updateProjectionMatrix();
  }
}

// ── Shooting ───────────────────────────────────────────────────────────────
// ── Ability helpers ────────────────────────────────────────────────────────
function abilityReady(w) {
  if (!w?.ability) return false;
  return Date.now() - (abilityCDs[w.id] || 0) >= w.ability.cd;
}

function activateMeleeAbility() {
  const item = MELEE_ITEMS[selectedMeleeIdx];
  if (!item?.ability) return;
  if (countdownActive) return;
  const ab = item.ability;
  const now = Date.now();
  if (now - (abilityCDs[item.id] || 0) < ab.cd) return; // on cooldown
  abilityCDs[item.id] = now;

  if (ab.type === 'melee_heavy') {
    meleeAbilityBuff = { type: 'heavy', usesLeft: 1 };
    flashAbilityName(ab.name);
    playSoundEvent('heavy_buff', { volume: 0.9 });
  }
  else if (ab.type === 'melee_lunge' || ab.type === 'melee_charge') {
    const dist    = ab.distance || 6;
    const dmg     = ab.damage   || 0;
    const fwd     = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
    fwd.y = 0; fwd.normalize();
    // Dash forward in small steps (collision-safe)
    for (let step = 0; step < 14; step++) {
      camera.position.addScaledVector(fwd, dist / 14);
      camera.position.x = Math.max(-BOUNDS, Math.min(BOUNDS, camera.position.x));
      camera.position.z = Math.max(-BOUNDS, Math.min(BOUNDS, camera.position.z));
      resolveWallCollisions();
    }
    // Check for enemies within 2.2 units after dash
    const weaponId = ab.type === 'melee_charge' ? 'shield_charge' : item.id;
    let hitSomething = false;
    for (const [pid, mesh] of Object.entries(remoteMeshes)) {
      const dist2 = camera.position.distanceTo(mesh.position.clone().setY(camera.position.y));
      if (dist2 > 2.2) continue;
      const hitPos = mesh.position.clone().setY(1.0);
      const dummy = TRAINING_DUMMIES.find(d => d.id === pid);
      if (dummy) handleDummyHit(dummy, mesh, { damage: dmg || item.damage }, hitPos);
      else emitHit(pid, `lunge_${myId}_${now}`, weaponId, hitPos);
      spawnHitParticle(hitPos);
      hitSomething = true;
      break;
    }
    if (!hitSomething) spawnHitParticle(camera.position.clone().setY(1.0));
    flashAbilityName(ab.name);
  }
  else if (ab.type === 'melee_pickle') {
    // Throw 3 pickles
    const origin = new THREE.Vector3();
    camera.getWorldPosition(origin);
    origin.add(new THREE.Vector3(0.10, -0.10, -0.35).applyQuaternion(camera.quaternion));
    const spreads = [-0.06, 0, 0.06];
    spreads.forEach((offset, i) => {
      const dir = new THREE.Vector3(offset, 0.04, -1).applyQuaternion(camera.quaternion).normalize();
      const pid = `pickle_${myId}_${now}_${i}`;
      socket.emit('shoot', { x: origin.x, y: origin.y, z: origin.z, dx: dir.x, dy: dir.y, dz: dir.z, weapon: 'pickle' });
      spawnLocalBullet(origin.clone(), dir, pid, true, 55, 0x88cc44, 0.10, 'pickle');
    });
    flashAbilityName(ab.name);
  }
  else if (ab.type === 'melee_slam') {
    slamState = { vel: 9.5, type: 'slam' };
    flashAbilityName(ab.name);
  }
  else if (ab.type === 'melee_throw') {
    if (spearThrown) return; // can't throw twice
    const origin = new THREE.Vector3();
    camera.getWorldPosition(origin);
    origin.add(new THREE.Vector3(0.10, -0.10, -0.35).applyQuaternion(camera.quaternion));
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
    const sid = `spear_${myId}_${now}`;
    socket.emit('shoot', { x: origin.x, y: origin.y, z: origin.z, dx: dir.x, dy: dir.y, dz: dir.z, weapon: 'spear_throw' });
    spawnLocalBullet(origin, dir, sid, true, 110, 0xccaa66, 0.09, 'spear_throw');
    spearThrown = true;
    // Hide spear model while it's "in flight"
    if (meleeModels[selectedMeleeIdx]) meleeModels[selectedMeleeIdx].visible = false;
    flashAbilityName(ab.name);
  }
  else if (ab.type === 'melee_deflect') {
    meleeAbilityBuff = { type: 'deflect', endTime: now + (ab.duration || 2000) };
    flashAbilityName(ab.name);
    flashScreen('rgba(200,220,255,0.18)', 300);
    // Katana / Tennis-Racket: bright metallic "shiing"; Riot-shield: heavier parry
    playSoundEvent(item.id === 'riot_shield' ? 'parry_deflect' : 'katana_deflect', { volume: 1.0 });
  }
  else if (ab.type === 'melee_eat') {
    socket.emit('healSelf', { amount: ab.heal || 40 });
    const me = players[myId];
    if (me) { me.hp = Math.min(300, (me.hp || 0) + (ab.heal || 40)); updateHealthHUD(me.hp); }
    spawnHitParticle(camera.position.clone().setY(1.3));
    // Briefly scale the baguette model as an "eating" animation
    const m = meleeModels[selectedMeleeIdx];
    if (m) {
      let t = 0;
      const eat = setInterval(() => {
        t += 0.06;
        if (t >= 1) { m.scale.set(1,1,1); clearInterval(eat); return; }
        const s = 1 - Math.sin(t * Math.PI) * 0.35;
        m.scale.set(s, s, s);
      }, 30);
    }
    flashAbilityName(ab.name);
  }
  else if (ab.type === 'melee_instakill') {
    playSoundEvent('instakill_zip', { volume: 1.0 });
    // Immediately lunge and instakill nearest enemy in 2× range; buff next swing if miss
    const fwd2 = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
    let hitSomeone = false;
    for (const [pid, mesh] of Object.entries(remoteMeshes)) {
      const toT = mesh.position.clone().sub(camera.position); toT.y = 0;
      const dist = toT.length();
      if (dist > item.range * 2.5 || dist < 0.05) continue;
      if (fwd2.dot(toT.normalize()) < 0.4) continue;
      const hp = mesh.position.clone().setY(1.0);
      const dummy2 = TRAINING_DUMMIES.find(d => d.id === pid);
      if (dummy2) handleDummyHit(dummy2, mesh, { damage: 9999 }, hp);
      else emitHit(pid, `knife_ab_${myId}_${now}`, 'knife_instakill', hp);
      spawnHitParticle(hp);
      flashScreen('rgba(255,0,0,0.40)', 300);
      hitSomeone = true;
      break;
    }
    if (!hitSomeone) {
      // Miss — buff the next manual swing instead
      meleeAbilityBuff = { type: 'instakill', usesLeft: 1 };
    }
    flashAbilityName(ab.name);
  }
  else if (ab.type === 'melee_revup') {
    meleeAbilityBuff = { type: 'revup', endTime: now + (ab.duration || 2000) };
    flashAbilityName(ab.name);
    flashScreen('rgba(255,150,0,0.18)', 300);
    // Item-specific cue: vampire-blade is wet, garrote silent, others are spin-revup
    playSoundEvent(
      item.id === 'vampire_blade' ? 'vampire_slash'
      : item.id === 'garrote'     ? 'silent_kill'
      : 'spin_revup',
      { volume: 0.9 }
    );
  }
  else if (ab.type === 'melee_parry') {
    meleeAbilityBuff = { type: 'parry', endTime: now + (ab.duration || 1500) };
    flashAbilityName(ab.name);
    flashScreen('rgba(0,200,255,0.20)', 300);
  }
  else if (ab.type === 'melee_spin') {
    meleeAbilityBuff = { type: 'spin', endTime: now + (ab.duration || 3000), lastSpinHits: {} };
    flashAbilityName(ab.name);
    flashScreen('rgba(255,255,0,0.15)', 300);
  }
  else if (ab.type === 'melee_pull') {
    playSoundEvent('pull_yank', { volume: 1.0 });
    // Walking Cane "Yank" — pull the closest enemy in melee range toward us.
    const pullDist = ab.distance || 4;
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
    fwd.y = 0; fwd.normalize();
    let bestPid = null, bestDist = Infinity;
    for (const [pid, mesh] of Object.entries(remoteMeshes)) {
      const toT = mesh.position.clone().sub(camera.position); toT.y = 0;
      const d = toT.length();
      if (d > item.range * 2.5 || d < 0.05) continue;
      if (fwd.dot(toT.clone().normalize()) < 0.5) continue;
      if (d < bestDist) { bestDist = d; bestPid = pid; }
    }
    if (bestPid) {
      const bot = gameBots.find(b => b.id === bestPid);
      if (bot) {
        // Move the bot toward the player by pullDist (clamped to "almost touching")
        const dx = camera.position.x - bot.x;
        const dz = camera.position.z - bot.z;
        const d  = Math.hypot(dx, dz) || 1;
        const step = Math.min(pullDist, d - 0.6);
        bot.x += (dx / d) * step;
        bot.z += (dz / d) * step;
        const mesh = remoteMeshes[bestPid];
        if (mesh) mesh.position.set(bot.x, mesh.position.y, bot.z);
        spawnHitParticle(camera.position.clone().setY(1.0));
      } else {
        // Remote player — tell server to teleport them via emitHit hack (skip; no-op)
      }
    }
    flashScreen('rgba(220,200,140,0.18)', 250);
    flashAbilityName(ab.name);
  }

  updateAbilityHUD();
}

function activateAbility() {
  const w = currentWeapon;
  const ab = w?.ability;
  if (!gameStarted || isDead) return;
  if (countdownActive) return; // ability locked during pre-round countdown
  if (activeSlot === 'melee') { activateMeleeAbility(); return; }
  if (!ab || ab.type === 'charge') return; // crossbow charge: no G-key activation
  if (!isADS && !ab.noADS) return;         // most abilities need ADS unless noADS flag
  if (!abilityReady(w)) return;
  abilityCDs[w.id] = Date.now();

  if (ab.type === 'buff') {
    const pool = weaponAmmo[currentWeaponIdx];
    abilityBuff = {
      weaponId: w.id,
      endTime:  Date.now() + (ab.duration || 3000),
      spreadMult: ab.spreadMult ?? 1,
      dmgMult:    ab.dmgMult    ?? 1,
      rateMult:   ab.rateMult   ?? 1,
      speedMult:  ab.speedMult  ?? 1,
      spinBoost:  ab.spinBoost  || false,
      ...(ab.shotsFromMag ? { shotsLeft: pool.ammo } : {}),
    };
    if (ab.spinBoost && weaponModels[currentWeaponIdx]?._barrelCluster)
      weaponModels[currentWeaponIdx]._spinRate = 22;
    flashAbilityName(ab.name);
  }
  else if (ab.type === 'powershot') {
    abilityBuff = {
      weaponId:     w.id,
      endTime:      Date.now() + 8000,
      shotsLeft:    1,
      pellets:      ab.pellets      ?? w.pellets,
      spreadMult:   ab.spreadMult   ?? 1,
      dmgMult:      ab.dmgMult      ?? 1,
      speedMult:    ab.speedMult    ?? 1,
      weaponAbId:   ab.weaponAbId   || null,
      explodeOnHit: ab.explodeOnHit || false,
    };
    flashAbilityName(ab.name);
  }
  else if (ab.type === 'fanfire') {
    pendingFanFire = { count: ab.count, delay: ab.delay || 60, timer: 0, w };
    flashAbilityName(ab.name);
  }
  else if (ab.type === 'fanfire_all') {
    // Fire all remaining shots rapidly (SG100 Fan Hammer)
    const pool = weaponAmmo[currentWeaponIdx];
    if (pool.ammo > 0)
      pendingFanFire = { count: pool.ammo, delay: ab.delay || 80, timer: 0, w };
    flashAbilityName(ab.name);
  }
  else if (ab.type === 'bulletwave') {
    doBulletWave(w);
    flashAbilityName(ab.name);
  }
  else if (ab.type === 'throwbomb') {
    doThrowBomb(w, ab);
    flashAbilityName(ab.name);
  }
  else if (ab.type === 'multishot') {
    doMultishot(w, ab);
    flashAbilityName(ab.name);
  }
  else if (ab.type === 'aoe') {
    doAbilityAOE(ab);
    if (ab.reveal) { revealActive = true; revealEndTime = Date.now() + (ab.revealDur || 3000); }
    flashAbilityName(ab.name);
  }
  else if (ab.type === 'dash') {
    const right = new THREE.Vector3(Math.cos(euler.y), 0, -Math.sin(euler.y));
    const side = (Math.random() > 0.5 ? 1 : -1);
    camera.position.addScaledVector(right, side * (ab.distance || 5));
    camera.position.x = Math.max(-48, Math.min(48, camera.position.x));
    camera.position.z = Math.max(-48, Math.min(48, camera.position.z));
    resolveWallCollisions();
    flashAbilityName(ab.name);
    spawnHitParticle(camera.position.clone().setY(1.65));
  }
  // Switchblade Gun: force back to charged form
  else if (ab.type === 'switchblade_reset') {
    switchbladeCharged = true;
    switchbladeMode = 'pistol';
    flashAbilityName(ab.name);
    showAnnouncement('RECOMBINED', 'Next shot: 100 dmg', '#cc66ff', 1200);
    updateSwitchbladeHUD();
  }

  updateAbilityHUD();
}

function doBulletWave(w) {
  const GRID = 6;
  const STEP = 0.038; // radian spacing between bullets
  const origin = new THREE.Vector3();
  camera.getWorldPosition(origin);
  origin.add(new THREE.Vector3(0, -0.12, -0.5).applyQuaternion(camera.quaternion));
  const fwd   = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
  const right = new THREE.Vector3(1, 0,  0).applyQuaternion(camera.quaternion).normalize();
  const up    = new THREE.Vector3(0, 1,  0).applyQuaternion(camera.quaternion).normalize();
  const now   = Date.now();
  playWeaponSound('sg8_wave', { baseWeapon: w, volume: 1.1 });
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const oH = (col - (GRID - 1) / 2) * STEP;
      const oV = (row - (GRID - 1) / 2) * STEP;
      const d = fwd.clone().addScaledVector(right, oH).addScaledVector(up, oV).normalize();
      const bid = `wave_${myId}_${now}_${row * GRID + col}`;
      socket.emit('shoot', { x: origin.x, y: origin.y, z: origin.z, dx: d.x, dy: d.y, dz: d.z, weapon: 'sg8_wave' });
      spawnLocalBullet(origin.clone(), d, bid, true, w.bulletSpeed, w.bulletColor, w.bulletSize, 'sg8_wave');
    }
  }
}

function doThrowBomb(w, ab) {
  const origin = new THREE.Vector3();
  camera.getWorldPosition(origin);
  origin.add(new THREE.Vector3(0.10, -0.10, -0.40).applyQuaternion(camera.quaternion));
  const dir = new THREE.Vector3(0, 0.08, -1).applyQuaternion(camera.quaternion).normalize();
  const id  = `paintbomb_${myId}_${Date.now()}`;
  const color = ab.color || 0xff44ff;
  playWeaponSound(w.id, { baseWeapon: w, volume: 0.95 });
  spawnLocalBullet(origin, dir, id, true, 22, color, 0.13, w.id,
    { isPaintBomb: true, paintRadius: ab.radius || 4, paintColor: color });
}

function fireCrossbowCharge() {
  if (!gameStarted || isDead) return;
  if (activeSlot !== 'primary' || currentWeapon?.id !== 'crossbow') return;
  const pool = weaponAmmo[currentWeaponIdx];
  if (pool.ammo <= 0) { if (pool.reserve > 0 && !currentWeapon.noReload) startReload(); return; }
  if (reloading) return;
  const chargeMs = Math.min(Date.now() - crossbowChargeStart, 2000);
  // Tier: tap (<400ms) = base, medium (400-1200ms) = c1, full (>=1200ms) = ab
  let weaponId = 'crossbow';
  if (chargeMs >= 1200) weaponId = 'crossbow_ab';
  else if (chargeMs >= 400) weaponId = 'crossbow_c1';

  const now = Date.now();
  if (now - lastShot < currentWeapon.fireRate) return;
  lastShot = now;
  pool.ammo--; ammo = pool.ammo; updateAmmoHUD();

  const model = weaponModels[currentWeaponIdx];
  model._flash.visible = true;
  setTimeout(() => model._flash.visible = false, 60);
  model.position.z += model._kickZ;
  setTimeout(() => model.position.z = -0.25, 80);

  const muzzleWorld = new THREE.Vector3();
  model._flash.getWorldPosition(muzzleWorld);
  const d = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();

  socket.emit('shoot', { x: muzzleWorld.x, y: muzzleWorld.y, z: muzzleWorld.z, dx: d.x, dy: d.y, dz: d.z, weapon: weaponId });
  playWeaponSound(weaponId, { baseWeapon: currentWeapon, volume: 1 + chargeMs / 3500 });
  // Speed also scales with charge
  const speedScale = chargeMs >= 1200 ? 2.5 : chargeMs >= 400 ? 1.6 : 1.0;
  spawnLocalBullet(muzzleWorld, d, `cb_${myId}_${now}`, true, currentWeapon.bulletSpeed * speedScale, currentWeapon.bulletColor, currentWeapon.bulletSize * (1 + chargeMs / 2000 * 0.6), weaponId);

  // Flash charge tier
  const tierName = chargeMs >= 1200 ? 'FULL CHARGE!' : chargeMs >= 400 ? 'MEDIUM CHARGE' : 'TAP';
  flashAbilityName(tierName);
  crossbowChargeStart = 0;
}

function doAbilityAOE(ab) {
  const origin = camera.position.clone();
  // Place the visual at ground level so it's visible from first-person
  const groundPos = origin.clone().setY(0.15);
  spawnAbilityAOEFX(groundPos, ab.radius, ab.color || 0xff8800);

  // Paintball Splat Bomb: extra paint burst FX + screen flash
  if (ab.color === 0xff44ff) {
    spawnSplatBombFX(groundPos);
    flashScreen('rgba(255,68,255,0.30)', 350);
  }

  for (const [pid, mesh] of Object.entries(remoteMeshes)) {
    const dist = origin.distanceTo(mesh.position.clone().setY(1.0));
    if (dist < (ab.radius || 3)) {
      const target = mesh.position.clone().setY(1.0);
      const dummy = TRAINING_DUMMIES.find(d => d.id === pid);
      if (dummy) {
        handleDummyHit(dummy, mesh, { damage: ab.damage || currentWeapon.damage }, target);
      } else {
        emitHit(pid, `aoe_${myId}_${Date.now()}_${pid}`, currentWeapon.id, target);
      }
      spawnHitParticle(target);
    }
  }
}

function spawnSplatBombFX(origin) {
  const count = 16;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const upward = 0.15 + Math.random() * 0.35;
    const dir = new THREE.Vector3(Math.cos(angle), upward, Math.sin(angle)).normalize();
    const color = PAINTBALL_COLORS[Math.floor(Math.random() * PAINTBALL_COLORS.length)];
    const mat  = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
    const blob = new THREE.Mesh(new THREE.SphereGeometry(0.075 + Math.random() * 0.05, 5, 4), mat);
    blob.position.copy(origin);
    scene.add(blob);
    const speed = 9 + Math.random() * 5;
    let elapsed = 0;
    const tick = () => {
      elapsed += 16;
      const dt = 0.016;
      blob.position.addScaledVector(dir, speed * dt);
      dir.y -= 6 * dt; // gravity drag
      const frac = elapsed / 700;
      mat.opacity = Math.max(0, 1 - frac);
      if (frac < 1) requestAnimationFrame(tick);
      else scene.remove(blob);
    };
    requestAnimationFrame(tick);
  }
}

function flashScreen(cssColor, durationMs) {
  const div = document.createElement('div');
  div.style.cssText = `position:fixed;inset:0;background:${cssColor};pointer-events:none;z-index:999;transition:opacity ${durationMs}ms ease-out`;
  div.style.opacity = '1';
  document.body.appendChild(div);
  requestAnimationFrame(() => requestAnimationFrame(() => { div.style.opacity = '0'; }));
  setTimeout(() => div.remove(), durationMs + 60);
}

function spawnAbilityAOEFX(pos, radius, color) {
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 });
  const ring = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), mat);
  ring.position.copy(pos); scene.add(ring);
  let t = 0;
  const tick = () => {
    t += 0.03;
    ring.scale.setScalar(1 + t * (radius / 0.2) * 0.9);
    mat.opacity = 0.7 * (1 - t);
    if (t < 1) requestAnimationFrame(tick); else scene.remove(ring);
  };
  requestAnimationFrame(tick);
}

function doMultishot(w, ab) {
  const origin = new THREE.Vector3();
  camera.getWorldPosition(origin);
  origin.add(new THREE.Vector3(0, -0.12, -0.7).applyQuaternion(camera.quaternion));
  const base = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
  const now = Date.now();
  const pool = weaponAmmo[currentWeaponIdx];
  // Draw from mag first, then reserve — so low-mag weapons (GL: mag 1) still fire full count
  const totalAvail = pool.ammo + pool.reserve;
  const shots = Math.min(ab.count || 3, totalAvail);
  if (shots > 0) playWeaponSound(ab.weaponAbId || w.id, { baseWeapon: w, volume: Math.min(1.25, 0.85 + shots * 0.02) });
  for (let i = 0; i < shots; i++) {
    const d = base.clone();
    d.x += (Math.random() - 0.5) * (ab.spread || 0.08);
    d.y += (Math.random() - 0.5) * (ab.spread || 0.08);
    d.normalize();
    const bid = `mshot_${myId}_${now}_${i}`;
    const wid = ab.weaponAbId || w.id;
    socket.emit('shoot', { x: origin.x, y: origin.y, z: origin.z, dx: d.x, dy: d.y, dz: d.z, weapon: wid });
    spawnLocalBullet(origin.clone(), d, bid, true, w.bulletSpeed, w.bulletColor, w.bulletSize, wid);
  }
  // Deduct from mag first, overflow into reserve
  const fromMag = Math.min(shots, pool.ammo);
  const fromReserve = shots - fromMag;
  pool.ammo    = Math.max(0, pool.ammo    - fromMag);
  pool.reserve = Math.max(0, pool.reserve - fromReserve);
  ammo = pool.ammo; updateAmmoHUD();
}

function updatePendingFanFire(dt) {
  if (!pendingFanFire) return;
  pendingFanFire.timer -= dt * 1000;
  if (pendingFanFire.timer > 0) return;
  const { w } = pendingFanFire;
  const pool = weaponAmmo[currentWeaponIdx];
  if (pendingFanFire.count > 0 && pool.ammo > 0) {
    // fire one shot
    const origin = new THREE.Vector3(); camera.getWorldPosition(origin);
    origin.add(new THREE.Vector3(0, -0.12, -0.7).applyQuaternion(camera.quaternion));
    const d = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
    const now2 = Date.now();
    const bid = `fan_${myId}_${now2}_${pendingFanFire.count}`;
    socket.emit('shoot', { x: origin.x, y: origin.y, z: origin.z, dx: d.x, dy: d.y, dz: d.z, weapon: w.id });
    playWeaponSound(w.id, { baseWeapon: w, minGap: 25 });
    spawnLocalBullet(origin, d, bid, true, w.bulletSpeed, w.bulletColor, w.bulletSize, w.id);
    const model = weaponModels[currentWeaponIdx];
    if (model) { model._flash.visible = true; setTimeout(() => { if (model) model._flash.visible = false; }, 50); }
    pool.ammo--; ammo = pool.ammo; updateAmmoHUD();
    pendingFanFire.count--;
    pendingFanFire.timer = pendingFanFire.delay;
  } else {
    pendingFanFire = null;
  }
}

function updateAbilityBuff(dt) {
  if (!abilityBuff) return;
  const now = Date.now();
  if (now > abilityBuff.endTime && abilityBuff.shotsLeft === undefined) {
    // buff expired — restore spinRate
    if (abilityBuff.spinBoost && weaponModels[currentWeaponIdx]?._barrelCluster)
      weaponModels[currentWeaponIdx]._spinRate = 10;
    abilityBuff = null;
  }
  if (revealActive && now > revealEndTime) revealActive = false;
  updateAbilityHUD();
}

function flashAbilityName(name) {
  const el = document.getElementById('ability-activated');
  if (!el) return;
  el.textContent = name.toUpperCase() + '!';
  el.style.opacity = '1';
  el.style.transform = 'translateX(-50%) scale(1.2)';
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(-50%) scale(1)';
  }, 900);
}

function updateAbilityHUD() {
  const nameEl = document.getElementById('ability-name');
  const fillEl = document.getElementById('ability-cd-fill');
  const descEl = document.getElementById('ability-desc');
  const keyEl  = document.getElementById('ability-key-hint');
  if (!nameEl || !fillEl) return;

  // Show melee ability when melee slot is active
  if (activeSlot === 'melee' && selectedMeleeIdx !== null && selectedMeleeIdx >= 0) {
    const item = MELEE_ITEMS[selectedMeleeIdx];
    const ab = item?.ability;
    if (!ab) { nameEl.textContent = '—'; fillEl.style.width = '100%'; fillEl.style.background='#555'; return; }
    nameEl.textContent = ab.name;
    if (descEl) descEl.textContent = ab.desc || '';
    if (keyEl) { keyEl.textContent = '[G]'; keyEl.style.opacity = '1'; }
    const elapsed = Date.now() - (abilityCDs[item.id] || 0);
    const pct = Math.min(1, elapsed / ab.cd);
    fillEl.style.width = (pct * 100) + '%';
    fillEl.style.background = pct >= 1 ? '#4caf50' : '#e74c3c';
    if (keyEl) keyEl.style.opacity = pct >= 1 ? '1' : '0.4';
    return;
  }

  // Default: show gun weapon ability
  const w = currentWeapon;
  if (!w?.ability) { nameEl.textContent = '—'; fillEl.style.width = '100%'; fillEl.style.background='#555'; if (keyEl) keyEl.textContent='[G]'; if (descEl) descEl.textContent=''; return; }
  if (w.ability.type === 'charge') {
    nameEl.textContent = w.ability.name;
    if (descEl) descEl.textContent = w.ability.desc || '';
    fillEl.style.width = '100%';
    fillEl.style.background = '#4caf50';
    if (keyEl) { keyEl.textContent = '[HOLD]'; keyEl.style.opacity = '1'; }
    return;
  }
  nameEl.textContent = w.ability.name;
  if (descEl) descEl.textContent = w.ability.desc || '';
  if (keyEl) keyEl.textContent = '[G]';
  const elapsed = Date.now() - (abilityCDs[w.id] || 0);
  const pct = Math.min(1, elapsed / w.ability.cd);
  fillEl.style.width = (pct * 100) + '%';
  fillEl.style.background = pct >= 1 ? '#4caf50' : '#e74c3c';
  if (keyEl) keyEl.style.opacity = pct >= 1 ? '1' : '0.4';
}

function tryShoot() {
  if ((!pointerLocked && !gameStarted) || isDead || reloading) return;
  if (countdownActive) return; // can't fire during pre-round countdown
  if (KILLCAM.active) return;  // killcam playback is locked
  const now = Date.now();
  // Switchblade Gun: in knife mode → swing a close-range melee instead of firing
  if (currentWeapon.id === 'switchblade_gun' && !switchbladeCharged && switchbladeMode === 'knife') {
    if (now - lastShot < 280) return; // knife swing CD
    lastShot = now;
    doSwitchbladeKnifeSwing();
    return;
  }
  const activeRateMult = (abilityBuff?.weaponId === currentWeapon.id && abilityBuff.rateMult) ? abilityBuff.rateMult : 1;
  if (now - lastShot < currentWeapon.fireRate * activeRateMult) return;
  const pool = weaponAmmo[currentWeaponIdx];
  const adminInfAmmo = adminCheats.infiniteAmmo && currentUser?.isAdmin;
  if (pool.ammo <= 0 && !adminInfAmmo) { if (pool.reserve > 0 && !currentWeapon.noReload) startReload(); return; }

  lastShot = now;
  if (!adminInfAmmo) pool.ammo--; // ⚡ admin infinite ammo: don't decrement
  ammo = pool.ammo;
  updateAmmoHUD();
  expireSpawnShield(); // firing breaks the spawn shield
  if (match?.type === 'range') { rangeStats.shots++; updateRangeHUD(); updateMatchHUD(); }

  const model = weaponModels[currentWeaponIdx];
  model._flash.visible = true;
  setTimeout(() => model._flash.visible = false, 60);
  model.position.z += model._kickZ;
  setTimeout(() => model.position.z = isADS ? -0.25 : -0.25, 80);

  const muzzleWorld = new THREE.Vector3();
  model._flash.getWorldPosition(muzzleWorld);
  let baseDir = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).normalize();
  // ⚡ Admin aimbot: snap aim direction to nearest enemy
  if (adminCheats.aimbot && currentUser?.isAdmin) {
    let best = null, bestDist = Infinity;
    for (const bot of gameBots) {
      if (bot.dead || bot.team === 'ally') continue;
      const d = Math.hypot(bot.x - camera.position.x, bot.z - camera.position.z);
      if (d < bestDist && d < 50) { bestDist = d; best = bot; }
    }
    if (best) {
      const mesh = remoteMeshes[best.id];
      const targetPos = mesh ? mesh.position.clone().setY(mesh.position.y + 1.0) : new THREE.Vector3(best.x, 1, best.z);
      baseDir = targetPos.clone().sub(camera.position).normalize();
    }
  }

  // Apply ability buff for this shot
  const ab = (abilityBuff && abilityBuff.weaponId === currentWeapon.id) ? abilityBuff : null;
  const shotPellets  = ab?.pellets      ?? currentWeapon.pellets;
  const shotSpread   = currentWeapon.spread * (ab?.spreadMult ?? 1);
  let shotWeaponId   = ab?.weaponAbId   ?? currentWeapon.id;
  const shotSpeed    = currentWeapon.bulletSpeed * (ab?.speedMult ?? 1);

  // Switchblade Gun: charged state fires a 100-dmg shot; subsequent shots are 50 dmg until a hit lands
  if (currentWeapon.id === 'switchblade_gun') {
    if (switchbladeCharged) {
      shotWeaponId = 'switchblade_charged';
      switchbladeCharged = false;
      switchbladeMode = 'pistol'; // start split state in pistol mode
      updateSwitchbladeHUD();
    }
    // else stays as 'switchblade_gun' → 50 dmg
  }
  if (ab && ab.shotsLeft !== undefined) {
    ab.shotsLeft--;
    if (ab.shotsLeft <= 0) abilityBuff = null;
  }
  if (ab?.explodeOnHit) {
    // Schedule AOE at muzzle forward ~3 units after a short delay
    setTimeout(() => {
      doAbilityAOE({ radius: 3, damage: 80, color: 0xff8800 });
    }, 300);
  }

  playWeaponSound(shotWeaponId, { baseWeapon: currentWeapon, volume: Math.min(1.2, 0.9 + shotPellets * 0.03) });

  for (let p = 0; p < shotPellets; p++) {
    const spreadDir = baseDir.clone();
    if (shotSpread > 0) {
      spreadDir.x += (Math.random()-0.5)*shotSpread*2;
      spreadDir.y += (Math.random()-0.5)*shotSpread*2;
      spreadDir.normalize();
    }
    socket.emit('shoot', {
      x: muzzleWorld.x, y: muzzleWorld.y, z: muzzleWorld.z,
      dx: spreadDir.x, dy: spreadDir.y, dz: spreadDir.z,
      weapon: shotWeaponId,
    });
    const bColor = currentWeapon.randomBulletColor
      ? PAINTBALL_COLORS[Math.floor(Math.random() * PAINTBALL_COLORS.length)]
      : currentWeapon.bulletColor;
    spawnLocalBullet(muzzleWorld, spreadDir, `local_${myId}_${now}_${p}`, true, shotSpeed, bColor, currentWeapon.bulletSize, currentWeapon.id);
  }
}

function tryUseActive() {
  if (activeSlot === 'melee') return tryMelee();
  if (activeSlot === 'support') return trySupport();
  return tryShoot();
}

function tryMelee() {
  if (!gameStarted || isDead) return;
  if (countdownActive) return;
  const item = MELEE_ITEMS[selectedMeleeIdx];
  if (!item) return;
  const now = Date.now();
  const effectiveCooldown = meleeAbilityBuff?.type === 'revup' ? 15 : item.cooldown;
  if (now - lastMelee < effectiveCooldown) return;
  lastMelee = now;
  if (item.id === 'chainsaw') {
    playSoundEvent(meleeAbilityBuff?.type === 'revup' ? 'chainsaw_rev' : 'chainsaw_idle', { volume: 1.25, minGap: 120 });
  } else {
    // Per-type swing sound for every other melee
    const isBlade = /blade|sabre|katana|machete|spear|hatchet|axe|cleaver|knife|karambit|bayonet|poker|fire_axe|garrote|lightsabre|machete|tomahawk/.test(item.id);
    const isHeavy = item.type && (item.type.toLowerCase().includes('heavy') || /sledge|hammer|shovel|bat|pipe|wrench|cricket|brass_knuckles|fists|nunchucks/.test(item.id));
    const ev = isHeavy ? 'melee_heavy' : isBlade ? 'melee_blade' : 'melee_swing';
    playSoundEvent(ev, { volume: 0.85, minGap: 80 });
  }

  // Trigger swing animation — each swing type has its own characteristic duration
  meleeSwingType = MELEE_SWING_TYPES[selectedMeleeIdx] || 'slash';
  const cd = item.cooldown;
  meleeSwingDur = meleeSwingType === 'slam'   ? Math.min(cd * 0.78, 600)   // slow, weighty overhead
                : meleeSwingType === 'chop'   ? Math.min(cd * 0.62, 380)   // faster than slam, less wind-up
                : meleeSwingType === 'bash'   ? Math.min(cd * 0.70, 440)   // medium shove
                : meleeSwingType === 'thrust' ? Math.min(cd * 0.58, 380)   // lunge + recover
                : meleeSwingType === 'stab'   ? Math.min(cd * 0.42, 260)   // very fast snap
                : meleeSwingType === 'punch'  ? Math.min(cd * 0.40, 220)   // very fast jab
                : meleeSwingType === 'spin'   ? Math.min(cd * 0.85, 500)   // full rotation needs more time
                : Math.min(cd * 0.65, 440);                                // slash default
  meleeSwingT = 0;

  const forward = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).normalize();
  let hitPos = null;
  for (const [pid, mesh] of Object.entries(remoteMeshes)) {
    const toTarget = mesh.position.clone().sub(camera.position);
    toTarget.y = 0;
    const dist = toTarget.length();
    if (dist > item.range || dist < 0.05) continue;
    const dir = toTarget.normalize();
    if (forward.dot(dir) < 0.55) continue;
    hitPos = mesh.position.clone(); hitPos.y += 1.0;

    // Determine effective weapon ID and handle buffs
    let effectiveWeaponId = item.id;
    if (meleeAbilityBuff?.type === 'instakill' && meleeAbilityBuff.usesLeft > 0) {
      effectiveWeaponId = 'knife_instakill';
      meleeAbilityBuff.usesLeft--;
      if (meleeAbilityBuff.usesLeft <= 0) meleeAbilityBuff = null;
      flashScreen('rgba(255,0,0,0.35)', 250);
    } else if (meleeAbilityBuff?.type === 'heavy' && meleeAbilityBuff.usesLeft > 0) {
      // Double damage: emit hit twice
      meleeAbilityBuff.usesLeft--;
      if (meleeAbilityBuff.usesLeft <= 0) meleeAbilityBuff = null;
      const dummy = TRAINING_DUMMIES.find(d => d.id === pid);
      if (dummy) { handleDummyHit(dummy, mesh, { weaponId: item.id }, hitPos.clone()); handleDummyHit(dummy, mesh, { weaponId: item.id }, hitPos.clone()); }
      else { emitHit(pid, `melee_${myId}_${now}_a`, item.id, hitPos.clone()); emitHit(pid, `melee_${myId}_${now}_b`, item.id, hitPos.clone()); }
      spawnHitParticle(hitPos);
      break;
    }

    const dummy = TRAINING_DUMMIES.find(d => d.id === pid);
    if (item.id === 'chainsaw') playSoundEvent('chainsaw_hit', { volume: 1.35, minGap: 80 });
    if (dummy) handleDummyHit(dummy, mesh, { weaponId: effectiveWeaponId }, hitPos.clone());
    else emitHit(pid, `melee_${myId}_${now}`, effectiveWeaponId, hitPos.clone());
    // Vampire Blade / Meat Cleaver: heal on hit
    const healPerHit = item.healOnHit || (item.lifestealOnHit && meleeAbilityBuff?.type === 'revup' ? item.lifestealOnHit : 0);
    if (healPerHit) {
      const mult = meleeAbilityBuff?.lifestealMult || 1;
      const healAmt = healPerHit * mult;
      socket.emit('healSelf', { amount: healAmt });
      const me = players[myId];
      if (me) { me.hp = Math.min(300, (me.hp || 300) + healAmt); updateHealthHUD(me.hp); }
      flashScreen('rgba(136,0,34,0.18)', 200);
    }
    // 🔥 Burn DOT (fire_poker) — drop a small burn zone at target
    if (item.burnOnHit) {
      const b = item.burnOnHit;
      spawnBurnZone(mesh.position.clone(), b.radius, b.dps, b.dur);
    }
    // 🩸 Bleed DOT (machete) — only applies while Slash Combo is active
    if (item.bleedOnHit && meleeAbilityBuff?.type === 'revup') {
      const b = item.bleedOnHit;
      spawnBurnZone(mesh.position.clone(), b.radius, b.dps, b.dur);
    }
    // ⬆️ Launch (cricket_bat / golf_club) — pop the target up
    if (item.launchOnHit) {
      const mult = (meleeAbilityBuff?.type === 'heavy' && item.ability?.launchMult) ? item.ability.launchMult : 1;
      const launchVel = item.launchOnHit * mult;
      const bot = gameBots.find(b => b.id === pid);
      if (bot) { bot.yVel = launchVel; bot.y = bot.y || 0; }
    }
    // 🔗 Chain (pipe) — splash to nearby enemies in radius at reduced damage
    if (item.chainOnHit) {
      const { radius, mult } = item.chainOnHit;
      for (const [pid2, mesh2] of Object.entries(remoteMeshes)) {
        if (pid2 === pid) continue;
        if (mesh.position.distanceTo(mesh2.position) > radius) continue;
        const hp2 = mesh2.position.clone().setY(1.0);
        const d2 = TRAINING_DUMMIES.find(d => d.id === pid2);
        if (d2) handleDummyHit(d2, mesh2, { weaponId: item.id, dmgMult: mult }, hp2);
        else emitHit(pid2, `chain_${myId}_${now}_${pid2}`, item.id, hp2);
        spawnHitParticle(hp2);
      }
    }
    // Titan Hammer: AOE on every swing — hit ALL enemies in radius around contact
    if (item.aoeOnSwing) {
      const radius = item.aoeOnSwing;
      for (const [pid2, mesh2] of Object.entries(remoteMeshes)) {
        if (pid2 === pid) continue;
        if (mesh.position.distanceTo(mesh2.position) > radius) continue;
        const hp2 = mesh2.position.clone().setY(1.0);
        const d2 = TRAINING_DUMMIES.find(d => d.id === pid2);
        if (d2) handleDummyHit(d2, mesh2, { weaponId: item.id }, hp2);
        else emitHit(pid2, `melee_aoe_${myId}_${now}_${pid2}`, item.id, hp2);
        spawnHitParticle(hp2);
      }
    }
    break;
  }
  spawnHitParticle(hitPos || camera.position.clone().addScaledVector(forward, Math.min(item.range, 1.6)));
}

// Items that use arc (grenade) physics instead of straight bullets
const THROWABLE_SUPPORT_IDS = new Set(['frag','smoke','confetti_cannon','moon_mine','rubber_duck','black_hole_seed','glitch_cube']);

// Map every utility ID to the right sound event name (or null if it has its own already)
const SUPPORT_SOUND = {
  medkit: 'heal', stim: 'heal', healing_pulse: 'heal', nano_swarm: 'heal', vampire_syringe: 'inject',
  adrenaline: 'inject', berserker_serum: 'inject', cloak: 'inject',
  smoke: 'smoke_hiss', ink_bomb: 'smoke_hiss', siren: 'siren_loop',
  bounce_pad: 'bounce', rubber_duck: 'quack',
  ammo_fountain: 'ammo_refill',
  tripwire: 'mine_arm', magnet_mine: 'mine_arm', proximity_mine: 'mine_arm', land_mine: 'mine_arm',
  stasis_mine: 'mine_arm', caltrops: 'mine_arm', claymore: 'mine_arm', sticky_charge: 'c4_place', c4: 'c4_place',
  hunter_drone: 'drone_launch', guardian_drone: 'drone_launch', specter_drone: 'drone_launch',
  emp_grenade: 'emp_zap', taser_grenade: 'emp_zap',
  nano_shield: 'shield_up', quantum_barrier: 'shield_up',
  orbital_strike: 'incoming_siren', drone_strike: 'incoming_siren',
  stun_grenade: 'flashbang', flashbang_basic: 'flashbang',
  thermite: 'thermite_ignite', predator_uav: 'radar_ping', warp_beacon: 'radar_ping', teleport_beacon: 'radar_ping',
  care_package: 'air_drop', tac_nuke: 'nuke_siren',
  confetti_cannon: 'confetti_blast',
  // hologram, glitch_cube, moon_mine, black_hole_seed already use their own sounds or none
};

function trySupport() {
  if (!gameStarted || isDead) return;
  if (countdownActive) return;
  const item = SUPPORT_ITEMS[selectedSupportIdx];
  if (!item || supportUses[selectedSupportIdx] <= 0) return;
  const now = Date.now();
  if (now - lastSupport < item.cooldown) return;

  // ── Frag grenade: wind-up + delayed throw ─────────────────────────────────
  if (item.id === 'frag') {
    if (grenadeWindupT < 1) return;
    lastSupport = now;
    supportUses[selectedSupportIdx]--;
    updateAmmoHUD();
    grenadeWindupT   = 0;
    grenadeThrowFired = false;
    return;
  }

  lastSupport = now;
  supportUses[selectedSupportIdx]--;
  updateAmmoHUD();
  // 🎵 Per-utility sound (mapped above). Some items override this with their own.
  if (SUPPORT_SOUND[item.id]) playSoundEvent(SUPPORT_SOUND[item.id], { volume: 1.0 });

  // ── Instant-use consumables ────────────────────────────────────────────────
  if (item.heal) {
    socket.emit('healSelf', { amount: item.heal });
    const me = players[myId];
    if (me) {
      me.hp = Math.max(1, Math.min(300, me.hp + item.heal - (item.selfDamage || 0)));
      updateHealthHUD(me.hp);
    }
    spawnHitParticle(camera.position.clone().setY(1.4));
    return;
  }

  if (item.refill) {
    [selectedPrimaryIdx, selectedSecondaryIdx].forEach(idx => {
      const w = WEAPONS[idx];
      const pool = weaponAmmo[idx];
      if (!w || !pool || w.noReload) return;
      pool.ammo = w.mag;
      pool.reserve = Math.min(w.reserve, pool.reserve + Math.ceil(w.reserve * item.refill));
    });
    updateAmmoHUD();
    spawnHitParticle(camera.position.clone().setY(1.4));
    return;
  }

  if (item.blink) {
    playSoundEvent('blink', { volume: 1.15 });
    const dir = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).normalize();
    camera.position.addScaledVector(dir, item.blink);
    camera.position.x = Math.max(-48, Math.min(48, camera.position.x));
    camera.position.z = Math.max(-48, Math.min(48, camera.position.z));
    resolveWallCollisions();
    spawnHitParticle(camera.position.clone().setY(1.4));
    return;
  }

  // ── Throwable support items — arc physics ─────────────────────────────────
  if (THROWABLE_SUPPORT_IDS.has(item.id)) {
    throwSupportItem(item);
    return;
  }

  // ── New supports ──────────────────────────────────────────────────────────
  if (item.id === 'adrenaline') {
    applyAdrenaline(item);
    return;
  }
  if (item.id === 'tripwire') {
    placeTripwire(item);
    return;
  }
  if (item.id === 'hologram') {
    spawnHologramDecoy(item);
    return;
  }
  if (item.id === 'magnet_mine') {
    placeMagnetMine(item);
    return;
  }
  if (item.id === 'bounce_pad') {
    placeBouncePad(item);
    return;
  }
  if (item.id === 'orbital_strike') {
    callOrbitalStrike(item);
    return;
  }
  if (item.id === 'guardian_drone') {
    deployGuardianDrone(item);
    return;
  }
  if (item.id === 'nano_shield') {
    activateNanoShield(item);
    return;
  }
  if (item.id === 'air_grenade') {
    throwAirGrenade(item);
    return;
  }
  if (item.id === 'land_mine') {
    placeLandMine(item);
    return;
  }
  // ── 🪖 ADMIN utilities ────────────────────────────────────────────────────
  if (item.id === 'c4')            { placeC4(item); return; }
  if (item.id === 'claymore')      { placeClaymore(item); return; }
  if (item.id === 'stun_grenade')  { throwStunGrenade(item); return; }
  if (item.id === 'thermite')      { throwThermite(item); return; }
  if (item.id === 'predator_uav')  { activateUAV(item); return; }
  if (item.id === 'care_package')  { dropCarePackage(item); return; }
  if (item.id === 'tac_nuke')      { dropTacNuke(item); return; }

  // ── Fallback: straight bullet (shouldn't reach here for defined items) ─────
  const origin = new THREE.Vector3();
  camera.getWorldPosition(origin);
  origin.add(new THREE.Vector3(0, -0.12, -0.7).applyQuaternion(camera.quaternion));
  const dir = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).normalize();
  const shots = item.burst || 1;
  for (let i = 0; i < shots; i++) {
    const shotDir = dir.clone();
    if (item.spread) {
      shotDir.x += (Math.random()-0.5)*item.spread;
      shotDir.y += (Math.random()-0.5)*item.spread;
      shotDir.normalize();
    }
    socket.emit('shoot', { x: origin.x, y: origin.y, z: origin.z, dx: shotDir.x, dy: shotDir.y, dz: shotDir.z, weapon: item.id });
    const color = item.randomBulletColor ? PAINTBALL_COLORS[Math.floor(Math.random()*PAINTBALL_COLORS.length)] : item.bulletColor;
    spawnLocalBullet(origin, shotDir, `support_${myId}_${now}_${i}`, true, item.bulletSpeed, color, item.bulletSize, item.id);
  }
}

function throwSupportItem(item) {
  const origin = new THREE.Vector3();
  camera.getWorldPosition(origin);
  origin.add(new THREE.Vector3(0.12, -0.18, -0.30).applyQuaternion(camera.quaternion));
  if (item.id === 'black_hole_seed') playSoundEvent('blackhole_activate', { volume: 1.05 });

  // Arc: slightly upward from aim direction
  const aimDir = new THREE.Vector3(0, 0.18, -1).applyQuaternion(camera.quaternion).normalize();
  const speed  = (item.bulletSpeed || 20) * 1.1;

  // Build a simple sphere mesh for the projectile
  const color = item.randomBulletColor
    ? PAINTBALL_COLORS[Math.floor(Math.random() * PAINTBALL_COLORS.length)]
    : (item.bulletColor || 0xffffff);
  const size = item.bulletSize || 0.12;
  const mat  = new THREE.MeshBasicMaterial({ color });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(size, 7, 5), mat);
  mesh.position.copy(origin);
  scene.add(mesh);

  const id = `supp_${myId}_${Date.now()}`;
  socket.emit('shoot', { x: origin.x, y: origin.y, z: origin.z, dx: aimDir.x, dy: aimDir.y, dz: aimDir.z, weapon: item.id });

  // Per-item physics config
  const gravMult      = item.id === 'moon_mine' ? 0.28 : 1.0;
  const fuseDur       = item.id === 'moon_mine' ? 4200 : null; // ms fuse, null = impact
  const explodeOnImpact = fuseDur === null; // everything else explodes on ground touch
  const maxBounces    = item.id === 'rubber_duck' ? 4 : 0;

  activeGrenades.push({
    mesh, id, isOwn: true, isSupport: true, itemRef: item,
    velX: aimDir.x * speed,
    velY: aimDir.y * speed,
    velZ: aimDir.z * speed,
    gravMult,
    explodeOnImpact,
    maxBounces,
    bounceCount: 0,
    explodeAt: fuseDur ? Date.now() + fuseDur : null,
  });
}

function startReload() {
  const pool = weaponAmmo[currentWeaponIdx];
  if (reloading || pool.ammo === currentWeapon.mag || pool.reserve === 0) return;
  reloading = true;
  playReloadSound(currentWeapon);
  document.getElementById('reload-flash').style.display = 'block';
  const dur = currentWeapon.reloadTime * (Date.now() < adrenalineUntil ? 0.5 : 1);
  // Trigger reload animation on the current weapon model
  const model = weaponModels[currentWeaponIdx];
  if (model) {
    model._reloadStart = Date.now();
    model._reloadDur = dur;
  }
  setTimeout(() => {
    const need = currentWeapon.mag - pool.ammo;
    const take = Math.min(need, pool.reserve);
    pool.ammo += take; pool.reserve -= take;
    ammo = pool.ammo; reserve = pool.reserve;
    reloading = false;
    document.getElementById('reload-flash').style.display = 'none';
    if (model) { model._reloadStart = 0; }
    updateAmmoHUD();
  }, dur);
}

// Map gimmicks: lava DOT, jump pads, ice, low-grav
let _lavaTickAt = 0;
let _playerInLowGrav = false;
function updateMapGimmicks(dt) {
  const g = activeMapGimmicks;
  if (!g) return;
  const now = Date.now();
  // ── Damage zones (lava etc.) — tick every 500ms ─────────────────────────
  if (g.damageZones && g.damageZones.length && now - _lavaTickAt >= 500) {
    _lavaTickAt = now;
    // Player
    if (!isDead && match?.type !== 'range') {
      for (const z of g.damageZones) {
        const dx = camera.position.x - z.x, dz = camera.position.z - z.z;
        if (dx*dx + dz*dz < z.r * z.r) {
          // Apply half a second's worth (since tick is 500ms)
          const dmg = (z.dps || 4) / 2;
          const me = players[myId];
          if (me) {
            me.hp = Math.max(0, me.hp - dmg);
            updateHealthHUD(me.hp);
            flashHitIndicator();
            if (me.hp <= 0 && !isDead) applyBotDamageToPlayer(z.type || 'lava', null);
          }
          break;
        }
      }
    }
    // Bots
    for (const bot of gameBots) {
      if (bot.dead) continue;
      for (const z of g.damageZones) {
        const dx = bot.x - z.x, dz = bot.z - z.z;
        if (dx*dx + dz*dz < z.r * z.r) {
          const mesh = remoteMeshes[bot.id];
          const hp = mesh ? mesh.position.clone().setY(1.0) : new THREE.Vector3(bot.x, 1, bot.z);
          emitHit(bot.id, `lava_${bot.id}_${now}`, z.type || 'lava', hp);
          break;
        }
      }
    }
  }
  // ── Jump pads — launch player straight up on contact ────────────────────
  if (g.jumpPads && g.jumpPads.length) {
    for (const p of g.jumpPads) {
      const dx = camera.position.x - p.x, dz = camera.position.z - p.z;
      if (dx*dx + dz*dz < p.r * p.r && camera.position.y < 2.2) {
        slamState = { vel: p.vel || 14 };
        flashScreen('rgba(255,204,34,0.18)', 200);
        break;
      }
    }
    // Bots
    for (const bot of gameBots) {
      if (bot.dead) continue;
      for (const p of g.jumpPads) {
        const dx = bot.x - p.x, dz = bot.z - p.z;
        if (dx*dx + dz*dz < p.r * p.r && (bot.y || 0) < 0.5) {
          bot.yVel = p.vel || 14; bot.y = bot.y || 0;
          break;
        }
      }
    }
  }
  // ── Low-grav zones: store player flag — used by updateMovement gravity ──
  _playerInLowGrav = false;
  if (g.lowGravZones && g.lowGravZones.length) {
    for (const z of g.lowGravZones) {
      const dx = camera.position.x - z.x, dz = camera.position.z - z.z;
      if (dx*dx + dz*dz < z.r * z.r) { _playerInLowGrav = true; break; }
    }
  }
  // Ice and oil slicks are handled inline in updateMovement (friction reduction)
}

function playerOnIce() {
  const g = activeMapGimmicks;
  if (!g) return false;
  const slicks = [];
  if (g.iceZones && g.iceZones.length) slicks.push(...g.iceZones);
  if (g.oilZones && g.oilZones.length) slicks.push(...g.oilZones);
  for (const z of slicks) {
    const dx = camera.position.x - z.x, dz = camera.position.z - z.z;
    if (dx*dx + dz*dz < z.r * z.r) return true;
  }
  return false;
}

// Animate reload: weapon tilts down + rotates as if dropping/inserting mag
function updateReloadAnim() {
  const model = weaponModels[currentWeaponIdx];
  if (!model) return;
  if (!model._reloadStart || !model._reloadDur) {
    // Restore base position if we just exited reload
    if (model._wasReloading) {
      model.position.y = -0.1; model.rotation.x = 0; model.rotation.z = 0;
      model._wasReloading = false;
    }
    return;
  }
  model._wasReloading = true;
  const t = (Date.now() - model._reloadStart) / model._reloadDur;
  if (t >= 1) return;
  // 3-phase animation: 0–0.3 tilt down + rotate, 0.3–0.7 hold (mag swap), 0.7–1.0 tilt back up
  let tiltAmt, rotAmt;
  if (t < 0.3) {
    const p = t / 0.3;
    tiltAmt = p; rotAmt = p;
  } else if (t < 0.7) {
    tiltAmt = 1; rotAmt = 1 + Math.sin((t - 0.3) * 10) * 0.15;
  } else {
    const p = 1 - ((t - 0.7) / 0.3);
    tiltAmt = p; rotAmt = p;
  }
  model.position.y = -0.1 - tiltAmt * 0.08;
  model.rotation.x = rotAmt * 0.45;  // tilt forward
  model.rotation.z = rotAmt * 0.18;  // slight roll
}

function spawnLocalBullet(origin, dir, id, isOwn, speed, color, size, weaponId, opts = {}) {
  const mesh = makeBulletMesh(color, size);
  mesh.position.copy(origin);
  // Orient cylindrical energy beams along direction of travel
  if (color === 0x00ffee) {
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir.clone().normalize());
  }
  scene.add(mesh);
  // Track origin and max range for short-range weapons (arc torrent)
  const wSpec = WEAPONS.find(w => w.id === weaponId);
  const maxRange = opts.maxRange || wSpec?.maxRange;
  localBullets.push({ mesh, dir: dir.clone(), createdAt: Date.now(), id, isOwn, speed: speed||120, weaponId,
    spawnX: origin.x, spawnY: origin.y, spawnZ: origin.z, maxRange, ...opts });
}

// ── Floating damage numbers ────────────────────────────────────────────────

const damageTracker = {}; // targetId → { total, lastHit, el, mesh }

function dmgColor(d) {
  return d >= 150 ? '#ff2222' : d >= 75 ? '#ff8822' : d >= 25 ? '#ffee22' : '#ffffff';
}

function worldToScreen(worldPos) {
  const v = worldPos.clone().project(camera);
  if (v.z > 1) return null;
  return { x: (v.x * 0.5 + 0.5) * window.innerWidth, y: (-v.y * 0.5 + 0.5) * window.innerHeight };
}

const DMG_BASE_STYLE = [
  'position:fixed', 'pointer-events:none', 'user-select:none',
  'z-index:99999', 'font-family:Arial Black,Arial,sans-serif', 'font-weight:900',
  'text-shadow:-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000',
  'transform:translate(-50%,-50%)',
].join(';');

function showDamageNumber(worldPos, damage, headshot = false) {
  if (!(damage > 0)) return;
  const sc = worldToScreen(worldPos);
  if (!sc) return;
  const el = document.createElement('div');
  el.setAttribute('style', DMG_BASE_STYLE);
  el.style.color    = headshot ? '#ffd700' : dmgColor(damage);
  el.style.fontSize = Math.min(36, (headshot ? 18 : 14) + Math.floor(damage / 9)) + 'px';
  el.style.left     = (sc.x + (Math.random() - 0.5) * 30) + 'px';
  el.style.top      = sc.y + 'px';
  el.textContent    = damage;
  document.body.appendChild(el);

  const startY = sc.y, t0 = performance.now(), dur = 1300;
  const tick = () => {
    const t = (performance.now() - t0) / dur;
    if (t >= 1) { el.remove(); return; }
    el.style.top     = (startY + t * 70) + 'px';
    el.style.opacity = t < 0.25 ? '1' : String(Math.max(0, 1 - (t - 0.25) / 0.75));
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

const DMG_TOTAL_STYLE = [
  'position:fixed', 'pointer-events:none', 'user-select:none',
  'z-index:99999', 'font-family:Arial Black,Arial,sans-serif', 'font-weight:900',
  'font-size:19px', 'color:#ff4400',
  'text-shadow:-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000',
  'background:rgba(0,0,0,0.45)', 'padding:1px 6px', 'border-radius:4px',
  'transform:translate(-50%,-100%)',
].join(';');

function trackTotalDamage(targetId, damage, targetMesh) {
  if (!(damage > 0) || !targetMesh) return;
  if (!damageTracker[targetId]) {
    const el = document.createElement('div');
    el.setAttribute('style', DMG_TOTAL_STYLE);
    document.body.appendChild(el);
    damageTracker[targetId] = { total: 0, lastHit: 0, el, mesh: targetMesh };
  }
  const tr = damageTracker[targetId];
  tr.total  += damage;
  tr.lastHit = performance.now();
  tr.el.textContent  = tr.total;
  tr.el.style.opacity = '1';
}

function updateDamageNumbers() {
  if (!gameStarted) return;
  const now = performance.now();
  for (const [id, tr] of Object.entries(damageTracker)) {
    if (!tr.mesh || !tr.el) { delete damageTracker[id]; continue; }
    const age = now - tr.lastHit;
    if (age > 3500) { tr.el.remove(); delete damageTracker[id]; continue; }
    tr.el.style.opacity = age > 3000 ? String(1 - (age - 3000) / 500) : '1';
    const sc = worldToScreen(tr.mesh.position.clone().setY(tr.mesh.position.y + 2.6));
    if (!sc) { tr.el.style.display = 'none'; continue; }
    tr.el.style.display = 'block';
    tr.el.style.left = sc.x + 'px';
    tr.el.style.top  = sc.y + 'px';
  }
}

// Weapons that one-shot on headshot
const INSTAKILL_HS_WEAPONS = new Set(['srx', 'railgun', 'lever', 'boombow', 'boombow_ab', 'boombow_c1', 'railgun_ab']);

// 🤫 Secret weapon category sets used for hidden synergy mechanics
const ELECTRIC_WEAPONS = new Set(['arc_rifle','arc_torrent','taser','emp_pistol','shock_baton','storm_core','ion_revolver','magnet_rifle','coilgun','plasma_carbine']);
const FIRE_WEAPONS     = new Set(['flamethrower','firework_launcher','incendiary_shotgun','fire_axe','fire_poker','thermite']);
const GRAVITY_WEAPONS  = new Set(['gravity_launcher','gravity_hammer','gravity_paint','event_horizon','magnetar','void_harvester','black_hole_seed']);
const FROST_WEAPONS    = new Set(['freeze_gun','frost_blaster','abs_zero']);

// Returns a synergy multiplier for damage based on map zones + weapon category.
// Examples:
//   electric weapons on ice/water = ×1.5
//   fire weapons on forest map    = ×1.3 (and target keeps burning)
//   gravity weapons in low-grav   = ×1.5
//   frost weapons on tundra/space = ×1.4
// All bonuses are discoverable, never advertised in the UI.
function getSecretSynergy(weaponId, hitPos) {
  if (!weaponId || !hitPos) return 1;
  // Electric synergy with water/ice zones (frozen lake on holiday, ice patches on tundra, sewer pools)
  if (ELECTRIC_WEAPONS.has(weaponId)) {
    const ice = activeMapGimmicks.iceZones || [];
    for (const z of ice) {
      const dx = hitPos.x - z.x, dz = hitPos.z - z.z;
      if (dx*dx + dz*dz < z.r * z.r) return 1.5;
    }
    if (activeMapName === 'sewer' || activeMapName === 'holiday') return 1.25;
  }
  // Fire synergy with foliage maps
  if (FIRE_WEAPONS.has(weaponId)) {
    if (activeMapName === 'forest' || activeMapName === 'overgrowth') return 1.30;
  }
  // Gravity synergy in low-grav zones
  if (GRAVITY_WEAPONS.has(weaponId)) {
    const lg = activeMapGimmicks.lowGravZones || [];
    for (const z of lg) {
      const dx = hitPos.x - z.x, dz = hitPos.z - z.z;
      if (dx*dx + dz*dz < z.r * z.r) return 1.5;
    }
    if (activeMapName === 'space' || activeMapName === 'orbital_station' || activeMapName === 'gravity_lab') return 1.25;
  }
  // Frost synergy on cold maps
  if (FROST_WEAPONS.has(weaponId)) {
    if (activeMapName === 'tundra' || activeMapName === 'space' || activeMapName === 'holiday') return 1.40;
  }
  return 1;
}

// Helper: emit hit to server AND show damage numbers AND apply damage client-authoritatively
function emitHit(pid, bulletId, weaponId, hitWorldPos, headshot = false) {
  const isBot    = players[pid] && players[pid].isBot;
  const instakill = headshot && INSTAKILL_HS_WEAPONS.has(weaponId);
  socket.emit(isBot ? 'hitBot' : 'hit', {
    [isBot ? 'botId' : 'targetId']: pid,
    bulletId, weapon: weaponId,
    headshot, instakill,
  });
  const baseDmg = getClientWeaponDamage(weaponId);
  // 🤫 Secret synergy: certain weapons get a damage bonus in matching map zones
  const synergy = getSecretSynergy(weaponId, hitWorldPos);
  const dmg     = (headshot ? (instakill ? 999 : baseDmg * 2) : baseDmg) * synergy;
  const mesh    = remoteMeshes[pid];
  if (hitWorldPos) showDamageNumber(hitWorldPos, dmg, headshot || synergy > 1);
  // Briefly tint the damage number / spawn a synergy spark for player discovery
  if (synergy > 1 && hitWorldPos) {
    spawnAbilityAOEFX(hitWorldPos.clone().setY(hitWorldPos.y + 0.4), 0.6,
      ELECTRIC_WEAPONS.has(weaponId) ? 0x66ccff :
      FIRE_WEAPONS.has(weaponId)     ? 0xff6622 :
      GRAVITY_WEAPONS.has(weaponId)  ? 0xaa44ff : 0x99eeff);
  }
  if (mesh)        trackTotalDamage(pid, dmg, mesh);
  playSoundEvent(headshot ? 'headshot' : 'hitmarker', { volume: headshot ? 1.15 : 0.75, minGap: headshot ? 60 : 35 });
  if (headshot)    flashHeadshot(instakill);
  // Switchblade Gun: any successful hit re-charges to the 100-dmg shot
  if (weaponId === 'switchblade_gun' || weaponId === 'switchblade_charged') {
    switchbladeCharged = true;
    showAnnouncement('CHARGED', 'Next shot: 100 dmg', '#cc66ff', 800);
    updateSwitchbladeHUD();
  }
  // Frost Blaster: subtract 3 speed points on hit; lethal at 0
  if (weaponId === 'frost_blaster') {
    const bot = gameBots.find(b => b.id === pid);
    if (bot && !bot.dead) {
      bot.frostSlow = Math.max(0, (bot.frostSlow || 100) - 3);
      // Visual: brief cyan particle (already from spawnHitParticle in caller)
    }
  }

  // ── Client-authoritative damage: apply HP loss locally (works offline too) ─
  if (isBot) {
    const bot = gameBots.find(b => b.id === pid);
    if (bot && !bot.dead) {
      const effective = instakill ? 9999 : dmg;
      bot.hp = Math.max(0, bot.hp - effective);
      if (players[pid]) players[pid].hp = bot.hp;
      // Flee-trigger metrics: track recent damage + consecutive hits
      const nowT = Date.now();
      if (!bot._lastBigHit || nowT - bot._lastBigHit > 1500) bot._recentDmg = 0;
      bot._recentDmg = (bot._recentDmg || 0) + effective;
      bot._lastBigHit = nowT;
      if (!bot._lastHitAt || nowT - bot._lastHitAt < 1200) bot._consecutiveHits = (bot._consecutiveHits || 0) + 1;
      else bot._consecutiveHits = 1;
      bot._lastHitAt = nowT;
      if (bot.hp <= 0) {
        bot.dead = true;
        if (players[pid]) players[pid].dead = true;
        if (mesh) mesh.visible = false;
        myKills++;
        creditWeaponKill(currentEquippedId());
        saveKillReplay(pid, currentEquippedId());
        const kc = document.getElementById('kill-count');
        if (kc) kc.textContent = `Kills: ${myKills}`;
        const botName = players[pid]?.name || 'Bot';
        playSoundEvent('kill', { volume: 1.05, minGap: 80 });
        showAnnouncement('ELIMINATED', botName, '#ff4444', 1200);
        onEntityDied(pid, myId);
        // Schedule local respawn after 3s (in case server isn't responding)
        setTimeout(() => clientRespawnBot(pid), 3000);
      }
    }
  }
}

// Local bot respawn (fallback when server is unavailable)
function clientRespawnBot(botId) {
  const bot = gameBots.find(b => b.id === botId);
  if (!bot || !bot.dead) return;
  // Only respawn in modes where bots should respawn (not elim - that handles rounds separately)
  if (match?.type === 'elim') return;
  const teamBots = gameBots.filter(b => b.team === bot.team);
  const idx = teamBots.indexOf(bot);
  const sp = botSideSpawn(idx, teamBots.length, bot.team);
  bot.x = sp.x; bot.z = sp.z;
  bot.hp = 300; bot.dead = false;
  bot.prevHp = 300; bot.stuckTimer = 0;
  if (bot.state !== 'turret') bot.state = 'chase';
  if (players[botId]) { players[botId].hp = 300; players[botId].dead = false; players[botId].x = sp.x; players[botId].z = sp.z; }
  const mesh = remoteMeshes[botId];
  if (mesh) { mesh.position.set(sp.x, 0, sp.z); mesh.visible = true; }
}

function flashHeadshot(instakill) {
  // Floating "HEADSHOT" label on screen
  const el = document.createElement('div');
  el.textContent = instakill ? '💀 HEADSHOT' : 'HEADSHOT';
  el.setAttribute('style', [
    'position:fixed', 'pointer-events:none', 'user-select:none', 'z-index:99999',
    'font-family:Arial Black,Arial,sans-serif', 'font-weight:900',
    `font-size:${instakill ? 32 : 26}px`,
    `color:${instakill ? '#ff2222' : '#ffd700'}`,
    'text-shadow:-2px -2px 0 #000,2px -2px 0 #000,-2px 2px 0 #000,2px 2px 0 #000',
    'top:28%', 'left:50%', 'transform:translate(-50%,-50%)',
  ].join(';'));
  document.body.appendChild(el);
  const t0 = performance.now();
  const tick = () => {
    const t = (performance.now() - t0) / 900;
    if (t >= 1) { el.remove(); return; }
    el.style.top     = (28 - t * 6) + '%';
    el.style.opacity = t < 0.3 ? '1' : String(1 - (t - 0.3) / 0.7);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  flashScreen(instakill ? 'rgba(255,0,0,0.18)' : 'rgba(255,215,0,0.15)', 300);
}

// ── Training dummies ───────────────────────────────────────────────────────
const TRAINING_DUMMIES = [
  { id: 'dummy_100', label: '300 HP', hp: 300, maxHp: 300, infinite: false, x:  7, z: 5, color: 0xdd4422 },
  { id: 'dummy_inf', label: '∞ HP',   hp: 999, maxHp: 999, infinite: true,  x: -7, z: 5, color: 0x2255dd },
];

function getClientWeaponDamage(weaponId) {
  const w = WEAPONS.find(x => x.id === weaponId);
  if (w) return w.damage;
  const m = MELEE_ITEMS.find(x => x.id === weaponId);
  if (m) return m.damage;
  const s = SUPPORT_ITEMS.find(x => x.id === weaponId && x.damage);
  if (s) return s.damage;
  const ab = { sg8_wave:20, crossbow_ab:220, crossbow_c1:140, sg100_ab:140, lever_ab:150,
               railgun_ab:330, boombow_ab:250, boombow_c1:160, cycler_ab:32, hand_cannon_ab:175 };
  return ab[weaponId] || 10;
}

function makeTrainingDummyMesh(dummy) {
  const g    = new THREE.Group();
  const mat  = new THREE.MeshLambertMaterial({ color: dummy.color });
  const dark = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
  const wood = new THREE.MeshLambertMaterial({ color: 0x7a5230 });

  // Vertical post
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.0, 8), wood);
  post.position.y = 0.5; g.add(post);

  // Body (torso)
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.18, 0.75, 8), mat);
  torso.position.y = 1.25; g.add(torso);

  // Arms crossbar
  const arms = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.0, 6), mat);
  arms.rotation.z = Math.PI / 2; arms.position.y = 1.55; g.add(arms);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.20, 8, 7), mat);
  head.position.y = 1.90; g.add(head);

  // Face X markers
  const xMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const x1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, 0.025), xMat);
  x1.position.set(0.055, 1.895, -0.195); x1.rotation.z = Math.PI/4; g.add(x1);
  const x2 = x1.clone(); x2.rotation.z = -Math.PI/4; g.add(x2);
  const x3 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, 0.025), xMat);
  x3.position.set(-0.055, 1.895, -0.195); x3.rotation.z = Math.PI/4; g.add(x3);
  const x4 = x3.clone(); x4.rotation.z = -Math.PI/4; g.add(x4);

  // HP bar background
  const hpBg = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.08, 0.04),
    new THREE.MeshBasicMaterial({ color: 0x222222 }));
  hpBg.position.y = 2.35; g.add(hpBg);

  // HP bar fill
  const fillColor = dummy.infinite ? 0x22aaff : 0x44ee44;
  const hpFillMat = new THREE.MeshBasicMaterial({ color: fillColor });
  const hpFill = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.06, 0.05), hpFillMat);
  hpFill.position.y = 2.35; g.add(hpFill);

  g._hpFill    = hpFill;
  g._hpFillMat = hpFillMat;
  g._bodyMat   = mat;
  g._dummy     = dummy;
  return g;
}

function spawnTrainingDummies() {
  TRAINING_DUMMIES.forEach(dummy => {
    const mesh = makeTrainingDummyMesh(dummy);
    mesh.position.set(dummy.x, 0, dummy.z);
    scene.add(mesh);
    remoteMeshes[dummy.id] = mesh;
    players[dummy.id] = { id: dummy.id, name: dummy.label, hp: dummy.hp, x: dummy.x, y: 0, z: dummy.z, isDummy: true };
  });
}
spawnTrainingDummies(); // safe here — TRAINING_DUMMIES const is already initialised above

function handleDummyHit(dummy, mesh, opts, hitPos) {
  const dmg = opts.damage ?? getClientWeaponDamage(opts.weaponId);
  if (hitPos) showDamageNumber(hitPos, dmg);
  trackTotalDamage(dummy.id, dmg, mesh);
  if (dummy.infinite) {
    flashDummyMesh(mesh);
    return;
  }
  dummy.hp = Math.max(0, dummy.hp - dmg);

  // Update HP bar scale (pivot is at bar center so shift left as it shrinks)
  const ratio = dummy.hp / dummy.maxHp;
  if (mesh._hpFill) {
    mesh._hpFill.scale.x = Math.max(0.001, ratio);
    mesh._hpFill.position.x = -(0.66 * (1 - ratio)) / 2;
  }

  flashDummyMesh(mesh);

  if (dummy.hp <= 0) {
    // Temporarily grey out, then respawn after 2s
    if (mesh._bodyMat) mesh._bodyMat.color.setHex(0x666666);
    setTimeout(() => {
      dummy.hp = dummy.maxHp;
      if (mesh._hpFill) { mesh._hpFill.scale.x = 1; mesh._hpFill.position.x = 0; }
      if (mesh._bodyMat) mesh._bodyMat.color.setHex(dummy.color);
    }, 2000);
  }
}

function flashDummyMesh(mesh) {
  if (!mesh._bodyMat) return;
  const orig = mesh._bodyMat.color.getHex();
  mesh._bodyMat.color.setHex(0xffffff);
  setTimeout(() => mesh._bodyMat?.color.setHex(orig), 90);
}

// ── Bullet update & hit detection ─────────────────────────────────────────
const _bpos = new THREE.Vector3(), _ppos = new THREE.Vector3();
// Scratch objects for wall-bullet collision (reused every frame to avoid GC)
const _bulletRay   = new THREE.Ray();
const _bulletRayDir = new THREE.Vector3();
const _bulletPrev  = new THREE.Vector3();
const _wallHitPt   = new THREE.Vector3();

// ── Line-of-sight check (bots) — 2D segment-AABB test ────────────────────
// Returns false if any wall box's XZ footprint intersects the segment from
// (x1,z1) to (x2,z2). Uses parametric slab method; t ∈ [0.08, 0.92] so
// the shooter's own position and target's own position are never counted.
function hasLineOfSight(x1, z1, x2, z2) {
  const dx = x2 - x1, dz = z2 - z1;
  if (dx === 0 && dz === 0) return true;
  for (const box of wallColliders) {
    let tmin = 0.08, tmax = 0.92;
    // X slab
    if (Math.abs(dx) < 1e-9) {
      if (x1 < box.min.x || x1 > box.max.x) continue;
    } else {
      const inv = 1 / dx;
      let t1 = (box.min.x - x1) * inv, t2 = (box.max.x - x1) * inv;
      if (t1 > t2) { const s = t1; t1 = t2; t2 = s; }
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
      if (tmin > tmax) continue;
    }
    // Z slab
    if (Math.abs(dz) < 1e-9) {
      if (z1 < box.min.z || z1 > box.max.z) continue;
    } else {
      const inv = 1 / dz;
      let t1 = (box.min.z - z1) * inv, t2 = (box.max.z - z1) * inv;
      if (t1 > t2) { const s = t1; t1 = t2; t2 = s; }
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
      if (tmin > tmax) continue;
    }
    return false; // wall blocks the segment
  }
  return true;
}

function updateBullets(dt) {
  const now = Date.now();
  const toRemove = [];
  for (let i = localBullets.length-1; i>=0; i--) {
    const b = localBullets[i];
    const maxAge = b.weaponId === 'frag' ? 3500 : 1800;
    if (now - b.createdAt > maxAge) {
      if (b.isPaintBomb) triggerPaintExplosion(b.mesh.position.clone(), b);
      scene.remove(b.mesh); toRemove.push(i); continue;
    }
    // Save start position for swept (CCD) hit detection
    const px0 = b.mesh.position.x, py0 = b.mesh.position.y, pz0 = b.mesh.position.z;
    b.mesh.position.addScaledVector(b.dir, b.speed * dt);
    _bpos.copy(b.mesh.position);

    // ── Wall collision (swept ray vs all wall AABBs) ─────────────────────
    let wallHitPt = null;
    let wallHitT = Infinity;
    if (!b.isPaintBomb) {
      const tDx = _bpos.x - px0, tDy = _bpos.y - py0, tDz = _bpos.z - pz0;
      const travelDist = Math.sqrt(tDx*tDx + tDy*tDy + tDz*tDz);
      if (travelDist > 0.001) {
        _bulletPrev.set(px0, py0, pz0);
        _bulletRayDir.set(tDx / travelDist, tDy / travelDist, tDz / travelDist);
        _bulletRay.set(_bulletPrev, _bulletRayDir);
        let wallHit = false;
        for (const box of wallColliders) {
          if (_bulletRay.intersectBox(box, _wallHitPt)) {
            // intersectBox gives closest entry; accept if within travel distance
            const hitDistSq = _wallHitPt.distanceToSquared(_bulletPrev);
            if (hitDistSq <= (travelDist + 0.1) * (travelDist + 0.1)) {
              const hitT = Math.sqrt(hitDistSq) / travelDist;
              if (hitT < wallHitT) {
                wallHitT = hitT;
                wallHitPt = _wallHitPt.clone();
                wallHit = true;
              }
            }
          }
        }
        if (wallHit && !b.isOwn) {
          spawnHitParticle(wallHitPt);
          scene.remove(b.mesh); toRemove.push(i);
          continue;
        }
      }
    }

    // Paint bomb: gravity + ground impact
    if (b.isPaintBomb) {
      b.dir.y -= 9.8 * dt; // arc gravity
      if (_bpos.y < 0.25) {
        triggerPaintExplosion(_bpos.clone(), b);
        scene.remove(b.mesh); toRemove.push(i); continue;
      }
    }

    if (b.isOwn) {
      // Segment vector for this frame's bullet travel
      const sx = _bpos.x - px0, sy = _bpos.y - py0, sz = _bpos.z - pz0;
      const segLenSq = sx*sx + sy*sy + sz*sz;
      let bestHit = null;

      for (const [pid, mesh] of Object.entries(remoteMeshes)) {
        if (!mesh.visible) continue;           // skip dead/hidden entities
        if (players[pid]?.dead) continue;      // skip server-confirmed dead
        // ── Swept sphere-segment test (CCD) ──────────────────────────────
        // Returns t ∈ [0,1] of closest approach on segment to sphere center,
        // then tests distance. Falls back to point-test if bullet didn't move.
        let isHeadshot = false, isBodyHit = false;
        let hitX = _bpos.x, hitY = _bpos.y, hitZ = _bpos.z;
        let hitT = 1;

        // 🛹 Crouch/slide lowers the hitbox so it matches the visual pose.
        // rig.crouch is 0 (standing) .. 1 (fully sliding). Head drops 0.75 m,
        // body drops 0.45 m, so a sliding target's spheres sit much lower.
        const _cr = mesh._rig ? mesh._rig.crouch : 0;
        const headOff = 1.65 - _cr * 0.75;   // 1.65 → 0.90
        const bodyOff = 1.0  - _cr * 0.45;   // 1.00 → 0.55

        if (segLenSq > 0.0001) {
          // --- Head sphere: center at (mesh.x, mesh.y+headOff, mesh.z), r=0.28
          let dox = mesh.position.x - px0, doy = mesh.position.y + headOff - py0, doz = mesh.position.z - pz0;
          let t = Math.max(0, Math.min(1, (dox*sx + doy*sy + doz*sz) / segLenSq));
          let cx = px0 + t*sx - mesh.position.x, cy = py0 + t*sy - (mesh.position.y+headOff), cz = pz0 + t*sz - mesh.position.z;
          if (cx*cx + cy*cy + cz*cz < 0.28*0.28) {
            isHeadshot = true; hitX = px0+t*sx; hitY = py0+t*sy; hitZ = pz0+t*sz;
            hitT = t;
          }
          if (!isHeadshot) {
            // --- Body sphere: center at (mesh.x, mesh.y+bodyOff, mesh.z), r=0.65
            dox = mesh.position.x - px0; doy = mesh.position.y + bodyOff - py0; doz = mesh.position.z - pz0;
            t = Math.max(0, Math.min(1, (dox*sx + doy*sy + doz*sz) / segLenSq));
            cx = px0+t*sx - mesh.position.x; cy = py0+t*sy - (mesh.position.y+bodyOff); cz = pz0+t*sz - mesh.position.z;
            if (cx*cx + cy*cy + cz*cz < 0.65*0.65) {
              isBodyHit = true; hitX = px0+t*sx; hitY = py0+t*sy; hitZ = pz0+t*sz;
              hitT = t;
            }
          }
        } else {
          // Bullet didn't travel this frame — plain point test
          const headPos = _ppos.set(mesh.position.x, mesh.position.y + headOff, mesh.position.z);
          isHeadshot = _bpos.distanceTo(headPos) < 0.28;
          _ppos.set(mesh.position.x, mesh.position.y + bodyOff, mesh.position.z);
          isBodyHit = !isHeadshot && _bpos.distanceTo(_ppos) < 0.65;
        }
        if (!isHeadshot && !isBodyHit) continue;

        if (!bestHit || hitT < bestHit.t) {
          bestHit = { pid, mesh, t: hitT, pos: new THREE.Vector3(hitX, hitY, hitZ), headshot: isHeadshot };
        }
      }

      if (wallHitPt && (!bestHit || wallHitT <= bestHit.t)) {
        spawnHitParticle(wallHitPt);
        // ── Batch-5 special destructibles (orbital window, fuse box, chandelier) ──
        const S = _batch5[activeMapName];
        if (S) {
          const targets = [S.windowMesh, S.fuseBox, S.chand].filter(Boolean);
          for (const t of targets) {
            const tp = new THREE.Vector3();
            t.getWorldPosition(tp);
            if (tp.distanceTo(wallHitPt) < 3) { batch5OnHit(t); break; }
          }
        }
        // ── Check if a destructible (glass, light, reactor) was hit ──
        const destDmg = getClientWeaponDamage(b.weaponId) || 25;
        for (const dest of mapDestructibles) {
          if (dest.mapName !== activeMapName) continue;
          if (!dest.mesh) continue;
          const dpos = new THREE.Vector3();
          dest.mesh.getWorldPosition(dpos);
          if (dpos.distanceTo(wallHitPt) < (dest.type === 'reactor' ? 4 : dest.type === 'glass' ? 6 : dest.type === 'explosive_barrel' ? 2.2 : 1.5)) {
            damageDestructible(dest, destDmg);
            break;
          }
        }
        // Firework Launcher: leave a burn zone where it lands
        if (b.weaponId === 'firework_launcher') {
          spawnBurnZone(wallHitPt, 3, 3, 10000);
        }
        // Bouncing weapons (prism, pulse disc, pinball): reflect off wall and speed up
        const wSpec = WEAPONS.find(w => w.id === b.weaponId);
        if (wSpec?.bounce && (b.bouncesLeft == null ? wSpec.bounce.maxBounces : b.bouncesLeft) > 0) {
          // Initialize bounces remaining
          if (b.bouncesLeft == null) b.bouncesLeft = wSpec.bounce.maxBounces;
          b.bouncesLeft--;
          // Reflect direction: figure out which axis hit (X or Z slab) and flip that component.
          // Cheap heuristic: choose axis with greater normal magnitude (use mesh delta vs box center).
          // Walls in this game are axis-aligned boxes — we can pick the dominant axis of approach.
          // Find which box was hit by walking through wallColliders again to identify it:
          for (const box of wallColliders) {
            if (wallHitPt.x >= box.min.x - 0.05 && wallHitPt.x <= box.max.x + 0.05 &&
                wallHitPt.z >= box.min.z - 0.05 && wallHitPt.z <= box.max.z + 0.05) {
              // Determine which face: compare distance from hit point to each face
              const distX = Math.min(Math.abs(wallHitPt.x - box.min.x), Math.abs(wallHitPt.x - box.max.x));
              const distZ = Math.min(Math.abs(wallHitPt.z - box.min.z), Math.abs(wallHitPt.z - box.max.z));
              if (distX < distZ) b.dir.x = -b.dir.x; else b.dir.z = -b.dir.z;
              break;
            }
          }
          // Move the bullet slightly off the wall so it doesn't immediately re-collide
          b.mesh.position.copy(wallHitPt).addScaledVector(b.dir, 0.15);
          // Speed up per bounce
          b.speed *= wSpec.bounce.speedMult || 1.2;
          // Reset spawn position for max-range checks (so each bounce gets its full range)
          b.spawnX = b.mesh.position.x; b.spawnY = b.mesh.position.y; b.spawnZ = b.mesh.position.z;
          continue; // keep the bullet alive
        }
        scene.remove(b.mesh); toRemove.push(i);
        continue;
      }

      // Secondary 2D LOS check: catches bullets that arced OVER short walls (e.g. flamethrower's vertical spread)
      if (bestHit && !hasLineOfSight(px0, pz0, bestHit.mesh.position.x, bestHit.mesh.position.z)) {
        // There's a wall between the bullet origin and the target in 2D — reject the hit
        spawnHitParticle(_bpos);
        scene.remove(b.mesh); toRemove.push(i);
        continue;
      }

      if (bestHit) {
        _bpos.copy(bestHit.pos); // use actual contact point
        const dummy = TRAINING_DUMMIES.find(d => d.id === bestHit.pid);
        if (dummy) {
          if (b.isPaintBomb) triggerPaintExplosion(_bpos.clone(), b);
          else {
            const baseDmg = getClientWeaponDamage(b.weaponId);
            const dmg = bestHit.headshot ? baseDmg * 2 : baseDmg;
            handleDummyHit(dummy, bestHit.mesh, { damage: dmg }, _bpos.clone());
            if (bestHit.headshot) flashHeadshot(false);
          }
        } else if (b.isPaintBomb) {
          triggerPaintExplosion(_bpos.clone(), b);
        } else {
          emitHit(bestHit.pid, b.id, b.weaponId || currentWeapon.id, _bpos.clone(), bestHit.headshot);
        }
        // Firework Launcher: also spawn burn zone on direct hit
        if (b.weaponId === 'firework_launcher') {
          spawnBurnZone(_bpos.clone(), 3, 3, 10000);
        }
        scene.remove(b.mesh); toRemove.push(i);
        spawnHitParticle(_bpos);
        continue;
      }
    }
    // Short-range weapons (Arc Torrent): cull bullet past maxRange
    if (b.maxRange) {
      const dx = _bpos.x - b.spawnX, dy = _bpos.y - b.spawnY, dz = _bpos.z - b.spawnZ;
      if (dx*dx + dy*dy + dz*dz > b.maxRange * b.maxRange) {
        scene.remove(b.mesh); toRemove.push(i); continue;
      }
    }
    if (Math.abs(_bpos.x)>50||Math.abs(_bpos.z)>50||_bpos.y<0||_bpos.y>30) {
      if (b.isPaintBomb) triggerPaintExplosion(_bpos.clone(), b);
      scene.remove(b.mesh); toRemove.push(i);
    }
  }
  for (let i=toRemove.length-1; i>=0; i--) localBullets.splice(toRemove[i],1);
}

// ── New support items ─────────────────────────────────────────────────────
function applyAdrenaline(item) {
  adrenalineUntil = Date.now() + (item.buffDur || 5000);
  showAnnouncement('ADRENALINE', `${(item.speedBuff||1.6).toFixed(1)}× speed · faster reload`, '#ee2244', 1400);
  flashScreen('rgba(255,40,80,0.18)', 240);
}
function placeTripwire(item) {
  const fwd = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).normalize();
  fwd.y = 0; fwd.normalize();
  const pos = camera.position.clone().addScaledVector(fwd, 1.6); pos.y = 0;
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.16), new THREE.MeshLambertMaterial({ color: 0x222222 }));
  box.position.y = 0.04; g.add(box);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.01,0.01,3,4), new THREE.MeshBasicMaterial({ color: 0xff3344, transparent:true, opacity:0.5 }));
  beam.rotation.z = Math.PI/2; beam.position.y = 0.3; g.add(beam);
  g.position.set(pos.x, 0, pos.z);
  scene.add(g);
  traps.push({ type:'tripwire', x: pos.x, z: pos.z, radius: 1.8, damage: item.damage || 60, mesh: g, ownerId: myId });
  showAnnouncement('TRIPWIRE SET', '', '#ff3344', 700);
}
function spawnHologramDecoy(item) {
  const fwd = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).normalize();
  fwd.y = 0; fwd.normalize();
  const pos = camera.position.clone().addScaledVector(fwd, 2);
  // Crude humanoid: blue translucent
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0x44ccff, transparent:true, opacity:0.6 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6,0.9,0.35), mat); torso.position.y = 1.05; g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), mat); head.position.y = 1.78; g.add(head);
  g.position.set(pos.x, 0, pos.z);
  scene.add(g);
  decoys.push({ mesh: g, until: Date.now() + (item.decoyDur || 8000) });
  showAnnouncement('DECOY DEPLOYED', `${(item.decoyDur||8000)/1000}s`, '#44ccff', 900);
}
function placeMagnetMine(item) {
  const fwd = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).normalize();
  fwd.y = 0; fwd.normalize();
  const pos = camera.position.clone().addScaledVector(fwd, 1.6); pos.y = 0;
  const g = new THREE.Group();
  const red = new THREE.MeshLambertMaterial({ color: 0xff4444 });
  const horseshoe = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.05, 6, 14, Math.PI), red);
  horseshoe.position.y = 0.18; g.add(horseshoe);
  g.position.set(pos.x, 0, pos.z);
  scene.add(g);
  traps.push({ type:'magnet', x: pos.x, z: pos.z, radius: item.magnetRadius || 5, damage: item.damage || 40, mesh: g, lastPulse: 0, until: Date.now() + 12000 });
  showAnnouncement('MAGNET MINE', `${item.magnetRadius || 5}m pull radius`, '#ff8844', 900);
}
function callOrbitalStrike(item) {
  // Drop a targeted strike where the player is aiming (ray-to-ground)
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const t = -camera.position.y / (fwd.y || -1); // intersect y=0 plane
  const tx = camera.position.x + fwd.x * Math.max(2, Math.min(40, t));
  const tz = camera.position.z + fwd.z * Math.max(2, Math.min(40, t));
  // Place a marker ring on the ground
  const ringGeo = new THREE.RingGeometry(item.radius * 0.9, item.radius, 24);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xff2200, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(tx, 0.05, tz);
  scene.add(ring);
  orbitalMarkers.push({ mesh: ring, x: tx, z: tz, fireAt: Date.now() + (item.delay || 2000), damage: item.damage || 250, radius: item.radius || 8 });
  showAnnouncement('ORBITAL STRIKE INCOMING', `${(item.delay||2000)/1000}s · ${item.damage} dmg`, '#ff2200', 1500);
}
function deployGuardianDrone(item) {
  // Spawn an orbiting drone mesh that auto-shoots nearby enemies
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0xddcc66 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), mat); g.add(body);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), new THREE.MeshBasicMaterial({ color: 0xff2200 }));
  eye.position.set(0, 0, -0.16); g.add(eye);
  g.position.set(camera.position.x, 1.6, camera.position.z + 1);
  scene.add(g);
  guardianDrones.push({ mesh: g, until: Date.now() + (item.droneDur || 10000), lastShot: 0, fireRate: item.fireRate || 100, damage: item.damage || 14, orbitAngle: 0 });
  showAnnouncement('GUARDIAN DRONE', `${(item.droneDur||10000)/1000}s`, '#ddcc66', 1200);
}
function throwAirGrenade(item) {
  // Throw forward with arc, explodes on contact and launches everyone in radius upward
  const origin = new THREE.Vector3();
  camera.getWorldPosition(origin);
  origin.add(new THREE.Vector3(0.12, -0.18, -0.30).applyQuaternion(camera.quaternion));
  playSoundEvent('air_burst', { volume: 0.65 });
  const aimDir = new THREE.Vector3(0, 0.20, -1).applyQuaternion(camera.quaternion).normalize();
  const speed = item.bulletSpeed || 50;
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(item.bulletSize || 0.11, 8, 6),
    new THREE.MeshBasicMaterial({ color: item.bulletColor || 0xaaccff }));
  mesh.position.copy(origin);
  scene.add(mesh);
  activeGrenades.push({
    mesh, id: `air_${Date.now()}`, isOwn: true, isSupport: true, itemRef: item,
    velX: aimDir.x * speed, velY: aimDir.y * speed, velZ: aimDir.z * speed,
    gravMult: 1.0, explodeOnImpact: true, maxBounces: 0, bounceCount: 0,
    explodeAt: null, _isAirGrenade: true,
  });
}
function placeLandMine(item) {
  // Drop at player's feet, lies in wait for an enemy bot to step on it
  const pos = camera.position.clone().setY(0.05);
  const g = new THREE.Group();
  const matBody = new THREE.MeshLambertMaterial({ color: 0x553322 });
  const matStud = new THREE.MeshLambertMaterial({ color: 0xff2222 });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.22, 0.05, 12), matBody);
  disc.position.y = 0.03; g.add(disc);
  const stud = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 5), matStud);
  stud.position.y = 0.075; g.add(stud);
  g.position.set(pos.x, 0, pos.z);
  scene.add(g);
  traps.push({
    type: 'landmine', x: pos.x, z: pos.z, radius: item.mineRadius || 1.8,
    damage: item.damage || 298, launchVel: item.launchVel || 16,
    mesh: g, until: Date.now() + 60000, // 1 min lifespan
    ownerId: myId,
  });
  showAnnouncement('LAND MINE ARMED', `${item.damage} dmg + launch`, '#ff2200', 900);
}
// ── Destructible map objects (glass, lights, reactors) ───────────────────
function damageDestructible(dest, dmg) {
  if (dest.hp <= 0) return;
  dest.hp = Math.max(0, dest.hp - dmg);
  // Show damage number above the object
  const dpos = new THREE.Vector3();
  dest.mesh.getWorldPosition(dpos);
  dpos.y += dest.type === 'reactor' ? 8 : 1;
  showDamageNumber(dpos, dmg, false);
  if (dest.hp <= 0) {
    // Visual destruction: hide mesh, remove collider
    dest.mesh.visible = false;
    if (dest.colliderRef && wallColliders.includes(dest.colliderRef)) {
      const idx = wallColliders.indexOf(dest.colliderRef);
      if (idx >= 0) wallColliders.splice(idx, 1);
    }
    // Particle burst at the object's position
    spawnHitParticle(dpos.clone().setY(dpos.y - 0.5));
    if (dest.onDestroy) dest.onDestroy();
    if (dest.type === 'glass') showAnnouncement('🔨 GLASS BROKEN', '', '#88ccee', 700);
    if (dest.type === 'airport_light') showAnnouncement('💡 LIGHT OUT', `${Math.round(airportLightLevel * 100)}% brightness`, '#888888', 700);
    if (dest.type === 'reactor') showAnnouncement('☢️ REACTOR DESTROYED', '12 m AOE explosion!', '#ffaa22', 2400);
    if (dest.type === 'explosive_barrel') showAnnouncement('BARREL BOOM', '7 m AOE explosion!', '#ff7722', 1400);
  }
}

// Per-frame map-effect tick (called from main loop)
function updateBatch5(dt) {
  const m = activeMapName; if (!m || !_batch5[m]) return;
  const S = _batch5[m];
  const now = Date.now();

  if (m === 'train') {
    // Scroll all rail-ties backward to fake forward motion. Wrap when off the end.
    S.scroll += dt * 18;
    for (const tie of S.rails) {
      tie.position.z = ((-45 + S.scroll + (S.rails.indexOf(tie) * 3)) % 90 + 90) % 90 - 45;
    }
  }
  else if (m === 'orbital_station') {
    // Once the window has been "shot" enough (hit-count tracked by mapDestructibles),
    // apply suction toward it on the player.
    if (S.broken) {
      const dx = 22 - camera.position.x, dz = 0 - camera.position.z;
      const d  = Math.hypot(dx, dz);
      if (d < 30 && d > 0.1) {
        const pull = 6 * dt; // m/s
        camera.position.x += (dx / d) * pull;
        camera.position.z += (dz / d) * pull;
        if (d < 2.5 && !isDead) {
          applyBotDamageToPlayer && applyBotDamageToPlayer('vacuum', null);
        }
      }
    }
  }
  else if (m === 'biosphere') {
    // Cycle 4 climates every 30s. Lerp sky color through phase index.
    S.t = (S.t + dt) % 30;
    const phase = Math.floor(S.t / 7.5) % 4;
    if (phase !== S.lastPhase) {
      S.lastPhase = phase;
      const colors = [0x4a8a3a, 0xddbb66, 0xddeeff, 0x88aacc]; // jungle/desert/frozen/clear
      if (scene.background?.setHex) scene.background.setHex(colors[phase]);
    }
  }
  else if (m === 'lockdown') {
    // Fuse box destroyed → fog + ambient drops
    if (S.lightsOut) {
      if (scene.fog) scene.fog.density = Math.min(0.15, (scene.fog.density || 0) + dt * 0.05);
      else scene.fog = new THREE.FogExp2(0x000000, 0.02);
    }
  }
  else if (m === 'opera') {
    // Chandelier falling animation + AOE on impact
    if (S.falling && S.chand) {
      S.vy -= 30 * dt;
      S.chand.position.y += S.vy * dt;
      if (S.chand.position.y <= 1) {
        S.chand.position.y = 1;
        S.falling = false;
        if (!S.hit) {
          S.hit = true;
          // 6m AOE damage at (0, 1, 0)
          for (const bot of gameBots) {
            if (bot.dead) continue;
            const bd = Math.hypot(bot.x, bot.z);
            if (bd < 6) {
              bot.hp -= 200;
              if (bot.hp <= 0) { bot.dead = true; if (remoteMeshes[bot.id]) remoteMeshes[bot.id].visible = false; }
            }
          }
          const pd = Math.hypot(camera.position.x, camera.position.z);
          if (pd < 6 && !isDead) applyBotDamageToPlayer && applyBotDamageToPlayer('chandelier', null);
          spawnAbilityAOEFX(new THREE.Vector3(0, 0.1, 0), 6, 0xffee88);
        }
      }
    }
  }
  else if (m === 'doomsday') {
    // Spawn falling debris from above every ~2 s; damage if hit
    S.debrisTimer -= dt;
    if (S.debrisTimer <= 0) {
      S.debrisTimer = 1.5 + Math.random() * 1.5;
      const dx = (Math.random() - 0.5) * 60, dz = (Math.random() - 0.5) * 60;
      const debris = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5),
        new THREE.MeshLambertMaterial({ color: 0x6a4a3a }));
      debris.position.set(dx, 25, dz);
      scene.add(debris);
      S.debris.push({ mesh: debris, x: dx, z: dz, vy: 0, alive: true });
    }
    for (let i = S.debris.length - 1; i >= 0; i--) {
      const d = S.debris[i];
      if (!d.alive) continue;
      d.vy -= 28 * dt;
      d.mesh.position.y += d.vy * dt;
      d.mesh.rotation.x += dt * 2;
      d.mesh.rotation.y += dt * 3;
      if (d.mesh.position.y <= 0.75) {
        d.mesh.position.y = 0.75;
        d.alive = false;
        // Damage anyone within 3m
        const pd = Math.hypot(camera.position.x - d.x, camera.position.z - d.z);
        if (pd < 3 && !isDead) applyBotDamageToPlayer && applyBotDamageToPlayer('debris', null);
        for (const bot of gameBots) {
          if (bot.dead) continue;
          if (Math.hypot(bot.x - d.x, bot.z - d.z) < 3) {
            bot.hp -= 120;
            if (bot.hp <= 0) { bot.dead = true; if (remoteMeshes[bot.id]) remoteMeshes[bot.id].visible = false; }
          }
        }
        setTimeout(() => { scene.remove(d.mesh); S.debris.splice(S.debris.indexOf(d), 1); }, 4000);
      }
    }
  }
}

// Called from the bullet-hit pipeline when a hitscan/projectile strikes a special target
function batch5OnHit(meshHit) {
  if (!activeMapName || !_batch5[activeMapName]) return false;
  const S = _batch5[activeMapName];
  if (activeMapName === 'orbital_station' && meshHit === S.windowMesh && !S.broken) {
    S.hp -= 25;
    if (S.hp <= 0) {
      S.broken = true;
      if (S.windowMesh) S.windowMesh.visible = false;
      showAnnouncement('🌌 HULL BREACH', 'The vacuum is pulling everyone in!', '#88ddff', 3500);
    }
    return true;
  }
  if (activeMapName === 'lockdown' && meshHit === S.fuseBox && !S.lightsOut) {
    S.hp -= 25;
    if (S.hp <= 0) {
      S.lightsOut = true;
      if (S.fuseBox) S.fuseBox.visible = false;
      showAnnouncement('🚨 LIGHTS OUT', 'Power failure — visibility cut!', '#ffaa44', 3500);
    }
    return true;
  }
  if (activeMapName === 'opera' && meshHit === S.chand && !S.falling) {
    S.hp -= 25;
    if (S.hp <= 0) {
      S.falling = true;
      S.vy = 0;
      showAnnouncement('🎭 CHANDELIER!', 'CLEAR THE CENTER!', '#ffee88', 3000);
    }
    return true;
  }
  return false;
}

function updateMapEffects(dt) {
  const now = Date.now();
  // Airport darkness: lerp scene background toward black as lights break
  if (activeMapName === 'airport' && scene.background?.setHex) {
    // Original sky 0xddeeff → dark navy as lights die
    const t = airportLightLevel;
    const r = Math.round(0xdd * t + 0x05 * (1-t));
    const g = Math.round(0xee * t + 0x05 * (1-t));
    const b = Math.round(0xff * t + 0x10 * (1-t));
    scene.background.setHex((r<<16) | (g<<8) | b);
  }
  // Chernobyl gas: 1 dmg/sec while alive on this map
  if (activeMapName === 'chernobyl' && !isDead && match?.roundActive) {
    if (now - lastChernobylTick >= 1000) {
      lastChernobylTick = now;
      const me = players[myId];
      if (me && !isShielded() && !(adminCheats.godMode && currentUser?.isAdmin)) {
        me.hp = Math.max(0, me.hp - 1);
        updateHealthHUD(me.hp);
        if (me.hp <= 0) applyBotDamageToPlayer('chernobyl_gas', null);
      }
    }
  }
  // Mortar interaction prompts
  updateMortarPrompt();
}

// ── 🪖 ADMIN utility implementations ──────────────────────────────────────
// ── Vehicle piloting (BR arena: jeeps + helicopters) ─────────────────────
let pilotedVehicle = null; // { ref to mapVehicles entry }
function updateVehiclePrompt() {
  if (pilotedVehicle) return;
  const near = mapVehicles.find(v => v.mapName === activeMapName && v.hp > 0 && !v.pilotedBy
    && Math.hypot(v.x - camera.position.x, v.z - camera.position.z) < 4);
  let prompt = document.getElementById('vehicle-prompt');
  if (near) {
    if (!prompt) {
      prompt = document.createElement('div');
      prompt.id = 'vehicle-prompt';
      prompt.style.cssText = 'position:fixed;bottom:200px;left:50%;transform:translateX(-50%);'
        + 'z-index:9000;color:#88ccff;font-family:"Courier New",monospace;font-size:14px;'
        + 'background:rgba(0,0,0,0.7);padding:8px 18px;border:2px solid #88ccff;border-radius:6px;letter-spacing:2px;';
      document.body.appendChild(prompt);
    }
    const icon = near.type === 'heli' ? '🚁' : '🚙';
    prompt.innerHTML = `${icon} Press <b>F</b> to pilot ${near.type === 'heli' ? 'helicopter' : 'jeep'} · HP ${near.hp}/${near.maxHp}`;
    prompt.style.display = 'block';
  } else if (prompt) prompt.style.display = 'none';
}
function tryEnterVehicle() {
  if (pilotedVehicle) { exitVehicle(); return; }
  const near = mapVehicles.find(v => v.mapName === activeMapName && v.hp > 0 && !v.pilotedBy
    && Math.hypot(v.x - camera.position.x, v.z - camera.position.z) < 4);
  if (!near) return;
  pilotedVehicle = near;
  near.pilotedBy = 'player';
  showAnnouncement(`${near.type === 'heli' ? '🚁' : '🚙'} ENTERED ${near.type.toUpperCase()}`,
    near.type === 'heli' ? 'WASD move · Space up · Ctrl down · LMB fire · F exit' : 'WASD drive · LMB fire · F exit',
    '#88ccff', 2400);
}
function exitVehicle() {
  if (!pilotedVehicle) return;
  pilotedVehicle.pilotedBy = null;
  pilotedVehicle = null;
}
function updateVehiclePiloting(dt) {
  if (!pilotedVehicle) return;
  const v = pilotedVehicle;
  if (v.hp <= 0) { exitVehicle(); return; }
  // Steering — rotate via A/D
  if (keys['KeyA']) v.rotY += 2.0 * dt;
  if (keys['KeyD']) v.rotY -= 2.0 * dt;
  // Forward/back via W/S
  const speed = (keys['KeyW'] ? 1 : 0) - (keys['KeyS'] ? 1 : 0);
  if (speed !== 0) {
    const fwdX = -Math.sin(v.rotY), fwdZ = -Math.cos(v.rotY);
    v.x += fwdX * speed * v.maxSpeed * dt;
    v.z += fwdZ * speed * v.maxSpeed * dt;
    const vBound = activeMapName === 'br_arena' ? 122 : 47;
    v.x = Math.max(-vBound, Math.min(vBound, v.x));
    v.z = Math.max(-vBound, Math.min(vBound, v.z));
  }
  // Helicopter vertical movement
  if (v.type === 'heli') {
    v.y = v.y || 0;
    if (keys['Space']) v.y += 12 * dt;
    if (keys['ControlLeft'] || keys['ControlRight'] || keys['ShiftLeft']) v.y -= 12 * dt;
    v.y = Math.max(0, Math.min(28, v.y));
    // Spin rotor (visual)
    if (v.rotor) v.rotor.rotation.y += 25 * dt;
    if (v.tailRotor) v.tailRotor.rotation.x += 25 * dt;
  }
  // Update mesh transform
  v.mesh.position.set(v.x, v.y || 0, v.z);
  v.mesh.rotation.y = v.rotY;
  // Camera attaches to vehicle (third-person-ish for vehicles, first-person-ish for heli)
  const camHeight = v.type === 'heli' ? 1.4 : 1.6;
  camera.position.set(v.x, (v.y || 0) + camHeight, v.z);
  // Allow free look — don't override euler from vehicle rotation
}
function fireVehicleGun() {
  if (!pilotedVehicle) return;
  const v = pilotedVehicle;
  const now = Date.now();
  if (now - (v.lastShot || 0) < (v.gunFireRate || 200)) return;
  v.lastShot = now;
  const origin = new THREE.Vector3(v.x, (v.y || 0) + 1.2, v.z);
  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
  spawnLocalBullet(origin, dir, `veh_${v.type}_${now}`, true, 180, 0xffaa44, 0.05, 'jeep_gun');
}

// ── Mortar piloting (trench map) ──────────────────────────────────────────
let pilotedMortar = null; // { ref to mapMortars entry } when player is piloting
function updateMortarPrompt() {
  // Show "Press F to pilot" prompt when near a mortar
  let prompt = document.getElementById('mortar-prompt');
  if (pilotedMortar) {
    if (prompt) prompt.style.display = 'none';
    return;
  }
  const near = mapMortars.find(mor => mor.mapName === activeMapName && mor.hp > 0 && !mor.pilotedBy
    && Math.hypot(mor.x - camera.position.x, mor.z - camera.position.z) < 3.5);
  if (near) {
    if (!prompt) {
      prompt = document.createElement('div');
      prompt.id = 'mortar-prompt';
      prompt.style.cssText = 'position:fixed;bottom:200px;left:50%;transform:translateX(-50%);'
        + 'z-index:9000;color:#ffcc44;font-family:"Courier New",monospace;font-size:14px;'
        + 'background:rgba(0,0,0,0.7);padding:8px 18px;border:2px solid #ffcc44;border-radius:6px;letter-spacing:2px;';
      document.body.appendChild(prompt);
    }
    prompt.innerHTML = `🎯 Press <b>F</b> to pilot mortar · ${near.ammo}/${near.maxAmmo} shells · HP ${near.hp}/${near.maxHp}`;
    prompt.style.display = 'block';
  } else if (prompt) {
    prompt.style.display = 'none';
  }
}
function tryEnterMortar() {
  if (pilotedMortar) { exitMortar(); return; }
  const near = mapMortars.find(mor => mor.mapName === activeMapName && mor.hp > 0 && !mor.pilotedBy
    && Math.hypot(mor.x - camera.position.x, mor.z - camera.position.z) < 3.5);
  if (!near) return;
  pilotedMortar = near;
  near.pilotedBy = 'player';
  showAnnouncement('🎯 MORTAR ARMED', `${near.ammo}/${near.maxAmmo} shells · LMB to fire · F to exit`, '#ffcc44', 2200);
}
function exitMortar() {
  if (!pilotedMortar) return;
  pilotedMortar.pilotedBy = null;
  pilotedMortar = null;
  showAnnouncement('LEFT MORTAR', '', '#888', 600);
}
function fireMortar() {
  if (!pilotedMortar || pilotedMortar.ammo <= 0) return;
  const now = Date.now();
  if (now - (pilotedMortar.lastShot || 0) < 800) return;
  pilotedMortar.lastShot = now;
  pilotedMortar.ammo--;
  // Fire a grenade-like arcing shell in the direction the camera is facing
  const origin = new THREE.Vector3(pilotedMortar.x, 1.5, pilotedMortar.z);
  const aim = new THREE.Vector3(0, 0.55, -1).applyQuaternion(camera.quaternion).normalize();
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), new THREE.MeshLambertMaterial({ color: 0x666622 }));
  mesh.position.copy(origin); scene.add(mesh);
  const fragRef = SUPPORT_ITEMS.find(s => s.id === 'frag') || { damage: 80 };
  activeGrenades.push({
    mesh, id: `mortar_${now}`, isOwn: true, isSupport: true, itemRef: fragRef,
    velX: aim.x * 38, velY: aim.y * 38, velZ: aim.z * 38,
    gravMult: 1.0, explodeOnImpact: false, maxBounces: 0, bounceCount: 0,
    explodeAt: now + 2000,
  });
  if (pilotedMortar.ammo <= 0) {
    showAnnouncement('OUT OF SHELLS', '', '#ff6666', 1200);
    setTimeout(() => exitMortar(), 600);
  }
}

let placedC4s = []; // {mesh, x, z, damage, ownerId}
function placeC4(item) {
  const fwd = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).normalize();
  fwd.y = 0; fwd.normalize();
  const pos = camera.position.clone().addScaledVector(fwd, 1.6); pos.y = 0;
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.2), new THREE.MeshLambertMaterial({ color: 0xbbaa66 }));
  body.position.y = 0.06; g.add(body);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 5), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
  led.position.set(0.1, 0.14, 0); g.add(led);
  g.position.set(pos.x, 0, pos.z); scene.add(g);
  placedC4s.push({ mesh: g, led, x: pos.x, z: pos.z, damage: item.damage || 200, ownerId: myId });
  showAnnouncement('💣 C4 PLACED', 'Press G to detonate', '#ff4444', 1400);
}
function detonateAllC4() {
  if (placedC4s.length === 0) return false;
  for (const c4 of placedC4s) {
    spawnAbilityAOEFX(new THREE.Vector3(c4.x, 0.3, c4.z), 5, 0xff5500);
    flashScreen('rgba(255,100,0,0.4)', 500);
    for (const bot of gameBots) {
      if (bot.dead) continue;
      const dx = bot.x - c4.x, dz = bot.z - c4.z;
      if (dx*dx + dz*dz < 25) {
        const mesh = remoteMeshes[bot.id];
        const hp = mesh ? mesh.position.clone().setY(1.0) : new THREE.Vector3(bot.x, 1, bot.z);
        emitHit(bot.id, `c4_${myId}_${Date.now()}_${bot.id}`, 'c4', hp);
      }
    }
    scene.remove(c4.mesh);
  }
  placedC4s = [];
  return true;
}
function placeClaymore(item) {
  // Place a directional mine; goes off when an enemy is in the arc
  const fwd = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).normalize();
  fwd.y = 0; fwd.normalize();
  const pos = camera.position.clone().addScaledVector(fwd, 1.2); pos.y = 0;
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.18, 0.07), new THREE.MeshLambertMaterial({ color: 0x2a3a26 }));
  body.position.y = 0.10; g.add(body);
  const yaw = Math.atan2(-fwd.x, -fwd.z);
  g.rotation.y = yaw;
  g.position.set(pos.x, 0, pos.z); scene.add(g);
  traps.push({
    type: 'claymore', x: pos.x, z: pos.z, fx: fwd.x, fz: fwd.z,
    radius: item.claymoreRadius || 4, damage: item.damage || 250,
    mesh: g, until: Date.now() + 120000, ownerId: myId,
  });
  showAnnouncement('💣 CLAYMORE ARMED', 'Front-facing trap', '#ff4444', 1200);
}
function throwStunGrenade(item) {
  const origin = new THREE.Vector3();
  camera.getWorldPosition(origin);
  origin.add(new THREE.Vector3(0.12, -0.18, -0.30).applyQuaternion(camera.quaternion));
  const aimDir = new THREE.Vector3(0, 0.20, -1).applyQuaternion(camera.quaternion).normalize();
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.10, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  mesh.position.copy(origin); scene.add(mesh);
  activeGrenades.push({
    mesh, id: `stun_${Date.now()}`, isOwn: true, isSupport: true, itemRef: item,
    velX: aimDir.x * 56, velY: aimDir.y * 56, velZ: aimDir.z * 56,
    gravMult: 1.0, explodeOnImpact: false, maxBounces: 2, bounceCount: 0,
    explodeAt: Date.now() + 1500, _isStun: true,
  });
}
let stunUntil = 0; // bot stun timer
function throwThermite(item) {
  const origin = new THREE.Vector3();
  camera.getWorldPosition(origin);
  origin.add(new THREE.Vector3(0.12, -0.18, -0.30).applyQuaternion(camera.quaternion));
  const aimDir = new THREE.Vector3(0, 0.15, -1).applyQuaternion(camera.quaternion).normalize();
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.10, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff6622 }));
  mesh.position.copy(origin); scene.add(mesh);
  activeGrenades.push({
    mesh, id: `therm_${Date.now()}`, isOwn: true, isSupport: true, itemRef: item,
    velX: aimDir.x * 36, velY: aimDir.y * 36, velZ: aimDir.z * 36,
    gravMult: 1.0, explodeOnImpact: true, maxBounces: 0, bounceCount: 0,
    explodeAt: null, _isThermite: true,
  });
}
let uavUntil = 0; // recon overlay timer
function activateUAV(item) {
  uavUntil = Date.now() + (item.uavDur || 10000);
  showAnnouncement('🛰️ PREDATOR UAV', `${(item.uavDur || 10000)/1000}s · enemies revealed`, '#44ff66', 1800);
  // Create or show the overhead minimap-style overlay
  let mm = document.getElementById('uav-overlay');
  if (!mm) {
    mm = document.createElement('div');
    mm.id = 'uav-overlay';
    mm.style.cssText = 'position:fixed;top:80px;right:20px;width:200px;height:200px;'
      + 'border:2px solid #44ff66;background:rgba(0,40,20,0.7);z-index:9700;'
      + 'border-radius:8px;overflow:hidden;';
    document.body.appendChild(mm);
  }
  mm.style.display = 'block';
}
function updateUAV(dt) {
  const mm = document.getElementById('uav-overlay');
  if (!mm) return;
  if (Date.now() >= uavUntil) { mm.style.display = 'none'; return; }
  if (mm.style.display === 'none') return;
  // Render dots: player center, enemies red, allies green
  const scale = 3.5; // px per meter (200px / ~56m visible)
  let html = '<div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);'
    + 'width:8px;height:8px;background:#44ff66;border-radius:50%;"></div>';
  for (const bot of gameBots) {
    if (bot.dead) continue;
    const dx = (bot.x - camera.position.x) * scale + 100;
    const dz = (bot.z - camera.position.z) * scale + 100;
    if (dx < 0 || dx > 200 || dz < 0 || dz > 200) continue;
    const color = bot.team === 'enemy' ? '#ff4444' : '#44aaff';
    html += `<div style="position:absolute;left:${dx}px;top:${dz}px;width:6px;height:6px;background:${color};border-radius:50%;transform:translate(-50%,-50%);"></div>`;
  }
  mm.innerHTML = html;
}
function dropCarePackage(item) {
  // Drop a crate that grants a random P2W item when player walks over it
  const fwd = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).normalize();
  fwd.y = 0; fwd.normalize();
  const pos = camera.position.clone().addScaledVector(fwd, 2); pos.y = 0;
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), new THREE.MeshLambertMaterial({ color: 0x336622 }));
  body.position.y = 0.3; g.add(body);
  const tag = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.10, 0.62), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
  tag.position.y = 0.55; g.add(tag);
  g.position.set(pos.x, 0, pos.z); scene.add(g);
  traps.push({
    type: 'care_package', x: pos.x, z: pos.z, mesh: g, until: Date.now() + 60000,
  });
  showAnnouncement('📦 CARE PACKAGE', 'Walk to the box for a random buff', '#88ff88', 1400);
}
function dropTacNuke(item) {
  // Big delayed AOE wipes most of the arena
  const fwd = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
  const t = -camera.position.y / (fwd.y || -1);
  const tx = camera.position.x + fwd.x * Math.max(2, Math.min(40, t));
  const tz = camera.position.z + fwd.z * Math.max(2, Math.min(40, t));
  // Big warning ring on the ground
  const ringGeo = new THREE.RingGeometry((item.nukeRadius || 25) * 0.95, (item.nukeRadius || 25), 32);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xff2200, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI/2; ring.position.set(tx, 0.05, tz);
  scene.add(ring);
  orbitalMarkers.push({
    mesh: ring, x: tx, z: tz, fireAt: Date.now() + (item.nukeDelay || 5000),
    damage: item.damage || 500, radius: item.nukeRadius || 25,
  });
  showAnnouncement('☢️ TACTICAL NUKE INBOUND', `${(item.nukeDelay || 5000)/1000}s · ${item.nukeRadius || 25}m AOE`, '#ff2200', 2200);
  flashScreen('rgba(255,30,0,0.25)', 600);
}

function activateNanoShield(item) {
  nanoShieldUntil = Date.now() + (item.shieldDur || 6000);
  showAnnouncement('NANO SHIELD', `+${item.healPerSec} HP/s · ${(item.shieldDur||6000)/1000}s`, '#66ddaa', 1400);
  flashScreen('rgba(102,221,170,0.2)', 320);
}
function placeBouncePad(item) {
  const fwd = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).normalize();
  fwd.y = 0; fwd.normalize();
  const pos = camera.position.clone().addScaledVector(fwd, 1.6); pos.y = 0;
  const g = new THREE.Group();
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 0.12, 16), new THREE.MeshLambertMaterial({ color: 0xffcc22 }));
  pad.position.y = 0.06; g.add(pad);
  g.position.set(pos.x, 0, pos.z);
  scene.add(g);
  traps.push({ type:'bounce', x: pos.x, z: pos.z, radius: 0.9, bounceVel: item.bounceVel || 14, mesh: g, until: Date.now() + 30000 });
  showAnnouncement('BOUNCE PAD', `Launches up at ${item.bounceVel||14} m/s`, '#ffcc22', 900);
}
// 😈 P2W per-frame: orbital strikes, guardian drones, nano shield heal-over-time
function updateP2WSystems(dt) {
  const now = Date.now();
  // Nano Shield: tick HP regen every 250ms while active
  if (now < nanoShieldUntil) {
    const me = players[myId];
    if (me && !isDead && (me.hp || 0) < 300) {
      // Heal 20/sec → ~5 HP every 250ms
      if (!_nanoTickAt || now >= _nanoTickAt) {
        _nanoTickAt = now + 250;
        const heal = 5;
        me.hp = Math.min(300, me.hp + heal);
        updateHealthHUD(me.hp);
        socket.emit('healSelf', { amount: heal });
      }
    }
  }
  // Orbital strikes: fire when their countdown ends
  for (let i = orbitalMarkers.length - 1; i >= 0; i--) {
    const o = orbitalMarkers[i];
    // Pulse the ring opacity for warning
    if (o.mesh.material) o.mesh.material.opacity = 0.4 + 0.4 * Math.sin(now * 0.012);
    if (now >= o.fireAt) {
      // Big visual flash + damage everyone in radius
      spawnAbilityAOEFX(new THREE.Vector3(o.x, 0.2, o.z), o.radius, 0xff2200);
      flashScreen('rgba(255,34,0,0.4)', 500);
      // Damage all bots in radius
      for (const bot of gameBots) {
        if (bot.dead) continue;
        const dx = bot.x - o.x, dz = bot.z - o.z;
        if (dx*dx + dz*dz < o.radius * o.radius) {
          const mesh = remoteMeshes[bot.id];
          const hp = mesh ? mesh.position.clone().setY(1.0) : new THREE.Vector3(bot.x, 1, bot.z);
          emitHit(bot.id, `orbital_${myId}_${now}_${bot.id}`, 'orbital_strike', hp);
        }
      }
      // Damage player if standing on it (yes, you can orbital yourself)
      const pdx = camera.position.x - o.x, pdz = camera.position.z - o.z;
      if (pdx*pdx + pdz*pdz < o.radius * o.radius) {
        applyBotDamageToPlayer('orbital_strike', null);
      }
      scene.remove(o.mesh);
      orbitalMarkers.splice(i, 1);
    }
  }
  // Guardian drones: orbit the player, shoot nearby enemies
  for (let i = guardianDrones.length - 1; i >= 0; i--) {
    const d = guardianDrones[i];
    if (now >= d.until) { scene.remove(d.mesh); guardianDrones.splice(i, 1); continue; }
    // Orbit around player
    d.orbitAngle += dt * 1.8;
    d.mesh.position.set(
      camera.position.x + Math.cos(d.orbitAngle) * 1.4,
      1.9 + Math.sin(now * 0.005) * 0.1,
      camera.position.z + Math.sin(d.orbitAngle) * 1.4
    );
    d.mesh.rotation.y = d.orbitAngle;
    // Find nearest enemy bot and shoot
    if (now - d.lastShot >= d.fireRate) {
      let nearest = null, nearDist = Infinity;
      for (const bot of gameBots) {
        if (bot.dead || bot.team !== 'enemy') continue;
        const dx = bot.x - d.mesh.position.x, dz = bot.z - d.mesh.position.z;
        const dd = Math.hypot(dx, dz);
        if (dd < nearDist && dd < 20) { nearDist = dd; nearest = bot; }
      }
      if (nearest) {
        d.lastShot = now;
        const mesh = remoteMeshes[nearest.id];
        const hp = mesh ? mesh.position.clone().setY(1.0) : new THREE.Vector3(nearest.x, 1, nearest.z);
        emitHit(nearest.id, `drone_${myId}_${now}`, 'guardian_drone', hp);
        // Visual: small bullet from drone to target
        const origin = d.mesh.position.clone();
        const dir = new THREE.Vector3(nearest.x - d.mesh.position.x, 0, nearest.z - d.mesh.position.z).normalize();
        spawnLocalBullet(origin, dir, `drone_b_${now}`, false, 200, 0xffcc66, 0.04, 'guardian_drone');
      }
    }
  }
}
let _nanoTickAt = 0;
function updateTraps(dt) {
  const now = Date.now();
  // Decoys
  for (let i = decoys.length - 1; i >= 0; i--) {
    const d = decoys[i];
    if (now >= d.until) { scene.remove(d.mesh); decoys.splice(i, 1); }
  }
  // Traps
  for (let i = traps.length - 1; i >= 0; i--) {
    const t = traps[i];
    if (t.until && now >= t.until) { scene.remove(t.mesh); traps.splice(i, 1); continue; }
    if (t.type === 'tripwire') {
      // Detonate on bot proximity
      for (const bot of gameBots) {
        if (bot.dead) continue;
        const dx = bot.x - t.x, dz = bot.z - t.z;
        if (dx*dx + dz*dz < t.radius * t.radius) {
          const mesh = remoteMeshes[bot.id];
          const hitPos = mesh ? mesh.position.clone().setY(1.0) : new THREE.Vector3(t.x, 1, t.z);
          // AOE damage
          for (const bot2 of gameBots) {
            if (bot2.dead) continue;
            const ddx = bot2.x - t.x, ddz = bot2.z - t.z;
            if (ddx*ddx + ddz*ddz < (t.radius*1.5)*(t.radius*1.5)) {
              const m2 = remoteMeshes[bot2.id];
              const hp2 = m2 ? m2.position.clone().setY(1.0) : new THREE.Vector3(bot2.x, 1, bot2.z);
              emitHit(bot2.id, `trip_${myId}_${now}_${bot2.id}`, 'tripwire', hp2);
            }
          }
          spawnAbilityAOEFX(new THREE.Vector3(t.x, 0.2, t.z), t.radius*1.5, 0xff3344);
          scene.remove(t.mesh); traps.splice(i, 1); break;
        }
      }
    }
    else if (t.type === 'magnet') {
      // Pull nearby bullets (other-owned) toward the mine
      if (now - (t.lastPulse || 0) > 50) {
        t.lastPulse = now;
        for (const b of localBullets) {
          if (b.isOwn) continue; // only attract enemy fire
          const dx = t.x - b.mesh.position.x, dz = t.z - b.mesh.position.z;
          const dist = Math.hypot(dx, dz);
          if (dist > t.radius || dist < 0.1) continue;
          const pull = 0.06; // small per-tick bend
          b.dir.x += (dx / dist) * pull;
          b.dir.z += (dz / dist) * pull;
          b.dir.normalize();
        }
        // Pulse visual
        t.mesh.rotation.y += dt * 4;
      }
      // Explode on bot proximity
      for (const bot of gameBots) {
        if (bot.dead) continue;
        const dx = bot.x - t.x, dz = bot.z - t.z;
        if (dx*dx + dz*dz < 1.0) {
          for (const bot2 of gameBots) {
            if (bot2.dead) continue;
            const ddx = bot2.x - t.x, ddz = bot2.z - t.z;
            if (ddx*ddx + ddz*ddz < 9) {
              const m2 = remoteMeshes[bot2.id];
              const hp2 = m2 ? m2.position.clone().setY(1.0) : new THREE.Vector3(bot2.x, 1, bot2.z);
              emitHit(bot2.id, `mag_${myId}_${now}_${bot2.id}`, 'magnet_mine', hp2);
            }
          }
          spawnAbilityAOEFX(new THREE.Vector3(t.x, 0.2, t.z), 3, 0xff8844);
          scene.remove(t.mesh); traps.splice(i, 1); break;
        }
      }
    }
    else if (t.type === 'landmine') {
      // Detonate when an enemy bot (or player) walks within radius
      for (const bot of gameBots) {
        if (bot.dead) continue;
        const dx = bot.x - t.x, dz = bot.z - t.z;
        if (dx*dx + dz*dz < t.radius * t.radius) {
          // Big AOE damage + launch
          const mesh = remoteMeshes[bot.id];
          const hp = mesh ? mesh.position.clone().setY(1.0) : new THREE.Vector3(bot.x, 1, bot.z);
          emitHit(bot.id, `mine_${myId}_${now}_${bot.id}`, 'land_mine', hp);
          // Launch any bot in the radius upward
          for (const bot2 of gameBots) {
            if (bot2.dead) continue;
            const ddx = bot2.x - t.x, ddz = bot2.z - t.z;
            if (ddx*ddx + ddz*ddz < (t.radius * 1.6) * (t.radius * 1.6)) {
              bot2.yVel = t.launchVel || 16; bot2.y = bot2.y || 0;
            }
          }
          spawnAbilityAOEFX(new THREE.Vector3(t.x, 0.2, t.z), t.radius * 1.6, 0xff2200);
          flashScreen('rgba(255,80,0,0.30)', 350);
          scene.remove(t.mesh); traps.splice(i, 1); break;
        }
      }
    }
    else if (t.type === 'claymore') {
      // Detonate when an enemy bot is in front (within the forward arc)
      for (const bot of gameBots) {
        if (bot.dead) continue;
        const dx = bot.x - t.x, dz = bot.z - t.z;
        const dd = Math.hypot(dx, dz);
        if (dd > t.radius || dd < 0.1) continue;
        // Check the bot is in front (dot product with claymore forward)
        const dot = (dx / dd) * t.fx + (dz / dd) * t.fz;
        if (dot < 0.2) continue; // behind or to the side
        // Detonate — damage all in front of the claymore
        for (const bot2 of gameBots) {
          if (bot2.dead) continue;
          const ex = bot2.x - t.x, ez = bot2.z - t.z;
          const ed = Math.hypot(ex, ez);
          if (ed > t.radius + 1.5) continue;
          if (((ex/ed) * t.fx + (ez/ed) * t.fz) < 0.0) continue;
          const m2 = remoteMeshes[bot2.id];
          const hp2 = m2 ? m2.position.clone().setY(1.0) : new THREE.Vector3(bot2.x, 1, bot2.z);
          emitHit(bot2.id, `cmy_${myId}_${now}_${bot2.id}`, 'claymore', hp2);
        }
        spawnAbilityAOEFX(new THREE.Vector3(t.x, 0.2, t.z), t.radius, 0xff2200);
        flashScreen('rgba(255,60,0,0.35)', 320);
        scene.remove(t.mesh); traps.splice(i, 1); break;
      }
    }
    else if (t.type === 'care_package') {
      // Player walks over it → grants a random temporary buff
      const pdx = camera.position.x - t.x, pdz = camera.position.z - t.z;
      if (pdx*pdx + pdz*pdz < 1.2 * 1.2) {
        // Pick a random buff
        const buffs = [
          { name: '💉 Full Heal',        apply: () => { const me = players[myId]; if (me) { me.hp = 300; updateHealthHUD(300); } } },
          { name: '⚡ Adrenaline 10s',   apply: () => { adrenalineUntil = Date.now() + 10000; } },
          { name: '🛡️ Nano Shield 8s',  apply: () => { nanoShieldUntil = Date.now() + 8000; } },
          { name: '📦 Full Ammo',         apply: () => {
              weaponAmmo.forEach((_, idx) => {
                const w = WEAPONS[idx];
                if (w) weaponAmmo[idx] = { ammo: w.mag, reserve: w.reserve === 0 ? 99999 : w.reserve };
              });
              supportUses.forEach((_, i2) => { supportUses[i2] = SUPPORT_ITEMS[i2]?.uses || 1; });
              updateAmmoHUD();
            } },
          { name: '❄️ Mass Frost',       apply: () => {
              for (const bot of gameBots) { if (!bot.dead) bot.frostSlow = 30; }
            } },
        ];
        const pick = buffs[Math.floor(Math.random() * buffs.length)];
        pick.apply();
        showAnnouncement('📦 CARE PACKAGE', pick.name, '#88ff88', 2000);
        scene.remove(t.mesh); traps.splice(i, 1);
      }
    }
    else if (t.type === 'bounce') {
      // If player walks on it, launch upward
      const dx = camera.position.x - t.x, dz = camera.position.z - t.z;
      if (dx*dx + dz*dz < t.radius * t.radius && camera.position.y < 2.2) {
        // Set vertical velocity using existing slamState pattern (reuse for upward jump)
        slamState = { vel: t.bounceVel }; // positive vel = up; existing camera.y code handles gravity
        flashScreen('rgba(255,204,34,0.18)', 200);
      }
    }
  }
}
// ── Switchblade Gun: knife-mode melee swing ───────────────────────────────
function doSwitchbladeKnifeSwing() {
  // Range ≈ 2 m close-range melee. Hit nearest enemy in front.
  const RANGE = 2.2;
  const camPos = camera.position.clone();
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
  let best = null, bestDot = -1;
  for (const [pid, mesh] of Object.entries(remoteMeshes)) {
    if (!mesh.visible) continue;
    if (players[pid]?.dead) continue;
    const toTarget = mesh.position.clone().setY(camPos.y).sub(camPos);
    const dist = toTarget.length();
    if (dist > RANGE) continue;
    toTarget.normalize();
    const d = fwd.dot(toTarget);
    if (d > 0.6 && d > bestDot) { bestDot = d; best = { pid, mesh, dist }; }
  }
  // Swing animation: nudge weapon model forward briefly
  const model = weaponModels[currentWeaponIdx];
  if (model) { model.position.z += 0.06; setTimeout(() => model.position.z -= 0.06, 110); }
  if (best) {
    const hitPos = best.mesh.position.clone().setY(1.0);
    emitHit(best.pid, `swkn_${myId}_${Date.now()}`, 'switchblade_gun', hitPos);
    spawnHitParticle(hitPos);
    // emitHit already calls switchbladeCharged = true via its hook
  } else {
    // Whiff: small particle in front
    spawnHitParticle(camPos.clone().addScaledVector(fwd, 1.5).setY(1.4));
  }
}

function updateSwitchbladeHUD() {
  let hud = document.getElementById('switchblade-hud');
  if (!hud) {
    hud = document.createElement('div');
    hud.id = 'switchblade-hud';
    hud.style.cssText = 'position:fixed;right:18px;top:50%;transform:translateY(-50%);z-index:9000;'
      + 'background:rgba(0,0,0,0.6);border:2px solid #cc66ff;color:#fff;font-family:monospace;'
      + 'padding:8px 14px;border-radius:6px;text-align:center;pointer-events:none;font-size:13px;';
    document.body.appendChild(hud);
  }
  const showIt = activeSlot === 'primary' && currentWeapon?.id === 'switchblade_gun';
  hud.style.display = showIt ? 'block' : 'none';
  if (!showIt) return;
  const state = switchbladeCharged ? 'CHARGED · 100 dmg'
              : switchbladeMode === 'knife' ? 'KNIFE · melee · 50 dmg'
              : 'PISTOL · ranged · 50 dmg';
  hud.innerHTML = `<div style="font-size:11px;opacity:0.7;letter-spacing:2px;">SWITCHBLADE</div>`
    + `<div style="font-size:16px;color:#cc66ff;font-weight:bold;margin:3px 0;">${state}</div>`
    + (!switchbladeCharged ? `<div style="font-size:10px;opacity:0.7;">[E] swap mode</div>` : '');
}

// ── Firework Launcher: burn-zone system ────────────────────────────────────
function spawnBurnZone(pos, radius, dps, durationMs) {
  const ringGeo = new THREE.RingGeometry(radius * 0.85, radius, 24);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xff5522, side: THREE.DoubleSide, transparent: true, opacity: 0.55 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(pos.x, 0.04, pos.z);
  scene.add(ring);
  playSoundEvent('fire_sizzle', { position: pos, volume: 0.85, minGap: 180 });
  burnZones.push({ x: pos.x, z: pos.z, radius, dps, until: Date.now() + durationMs, mesh: ring, lastTick: 0 });
}
function updateBurnZones(dt) {
  const now = Date.now();
  for (let i = burnZones.length - 1; i >= 0; i--) {
    const z = burnZones[i];
    if (now >= z.until) { scene.remove(z.mesh); burnZones.splice(i, 1); continue; }
    // Pulse opacity
    z.mesh.material.opacity = 0.35 + 0.2 * Math.sin(now * 0.008);
    // Tick DOT every 1s
    if (now - z.lastTick >= 1000) {
      z.lastTick = now;
      playSoundEvent('fire_sizzle', { position: new THREE.Vector3(z.x, 0, z.z), remote: true, volume: 0.55, minGap: 260 });
      // Damage player
      const pdx = camera.position.x - z.x, pdz = camera.position.z - z.z;
      if (pdx*pdx + pdz*pdz < z.radius * z.radius) {
        applyBotDamageToPlayer && (function(){
          // synthesize a low DOT tick — same flow as bot damage
          const me = players[myId];
          if (me && !isDead && !isShielded() && !isRiotShieldBlocking() && match?.type !== 'range') {
            me.hp = Math.max(0, me.hp - z.dps);
            updateHealthHUD(me.hp);
            flashHitIndicator();
            if (me.hp <= 0 && !isDead) {
              applyBotDamageToPlayer('firework_launcher', null); // route through death handler
            }
          }
        })();
      }
      // Damage bots
      for (const bot of gameBots) {
        if (bot.dead) continue;
        const bdx = bot.x - z.x, bdz = bot.z - z.z;
        if (bdx*bdx + bdz*bdz < z.radius * z.radius) {
          const mesh = remoteMeshes[bot.id];
          const hitPos = mesh ? mesh.position.clone().setY(1.0) : new THREE.Vector3(bot.x, 1, bot.z);
          emitHit(bot.id, `burn_${myId}_${now}_${bot.id}`, 'firework_launcher', hitPos);
        }
      }
    }
  }
}

function triggerPaintExplosion(pos, b) {
  const radius = b.paintRadius || 4;
  const color  = b.paintColor  || 0xff44ff;
  spawnAbilityAOEFX(pos.clone().setY(0.15), radius, color);
  spawnSplatBombFX(pos.clone().setY(0.15));
  flashScreen('rgba(255,68,255,0.22)', 320);
  if (!b.isOwn) return;
  for (const [pid, mesh] of Object.entries(remoteMeshes)) {
    const target = mesh.position.clone(); target.y += 1.0;
    if (pos.distanceTo(target) < radius) {
      const dummy = TRAINING_DUMMIES.find(d => d.id === pid);
      if (dummy) { handleDummyHit(dummy, mesh, { weaponId: b.weaponId }, target); spawnHitParticle(target); continue; }
      emitHit(pid, b.id + '_paint', b.weaponId, target);
      spawnHitParticle(target);
    }
  }
}

function spawnHitParticle(pos) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.08,4,4), new THREE.MeshBasicMaterial({ color: 0xff4400 }));
  m.position.copy(pos); scene.add(m);
  setTimeout(() => scene.remove(m), 200);
}

// ── HUD ────────────────────────────────────────────────────────────────────
function updateAmmoHUD() {
  if (activeSlot === 'melee' || activeSlot === 'support') {
    updateWeaponHUD();
    return;
  }
  const pool = weaponAmmo[currentWeaponIdx];
  document.getElementById('ammo-count').textContent = pool.ammo;
  document.getElementById('ammo-reserve').textContent =
    currentWeapon.ammoRegen ? '↑ AUTO' : `/ ${pool.reserve}`;
}
function updateWeaponHUD() {
  if (activeSlot === 'melee' && selectedMeleeIdx !== null && selectedMeleeIdx >= 0) {
    document.getElementById('ammo-gun').textContent = MELEE_ITEMS[selectedMeleeIdx].name;
    document.getElementById('ammo-count').textContent = 'MELEE';
    document.getElementById('ammo-reserve').textContent = 'RANGE';
    return;
  }
  if (activeSlot === 'support' && selectedSupportIdx !== null && selectedSupportIdx >= 0) {
    const item = SUPPORT_ITEMS[selectedSupportIdx];
    document.getElementById('ammo-gun').textContent = item.name;
    document.getElementById('ammo-count').textContent = supportUses[selectedSupportIdx];
    document.getElementById('ammo-reserve').textContent = 'USES';
    return;
  }
  document.getElementById('ammo-gun').textContent = currentWeapon.name;
}
function updateHealthHUD(hp) {
  document.getElementById('health-fill').style.width = `${(hp / 300 * 100).toFixed(1)}%`;
  document.getElementById('health-num').textContent = hp;
}
function flashHitIndicator() {
  const el = document.getElementById('hit-indicator');
  el.classList.add('flash');
  setTimeout(() => el.classList.remove('flash'), 200);
}

// ── Spectator mode (watch teammates after dying) ────────────────────────────
function getLiveAllies() {
  return gameBots.filter(b => b.team === 'ally' && !b.dead);
}
function enterSpectator() {
  const allies = getLiveAllies();
  if (allies.length === 0) return; // nobody to spectate
  spectatorState = { idx: 0, lastSwitch: 0 };
  showSpectatorHUD();
  updateSpectatorHUD();
}
function exitSpectator() {
  if (!spectatorState) return;
  spectatorState = null;
  const hud = document.getElementById('spectator-hud');
  if (hud) hud.style.display = 'none';
}
function spectatorCycle(dir) {
  if (!spectatorState) return;
  const allies = getLiveAllies();
  if (allies.length === 0) { exitSpectator(); return; }
  spectatorState.idx = ((spectatorState.idx + dir) % allies.length + allies.length) % allies.length;
  spectatorState.lastSwitch = performance.now();
  updateSpectatorHUD();
}
function updateSpectatorCamera(dt) {
  if (!spectatorState) return;
  if (!isDead) { exitSpectator(); return; } // auto-exit on respawn
  const allies = getLiveAllies();
  if (allies.length === 0) { exitSpectator(); return; }
  // Clamp idx in case allies died
  if (spectatorState.idx >= allies.length) spectatorState.idx = 0;
  const ally = allies[spectatorState.idx];
  // Third-person follow camera: behind and slightly above the ally
  const back = 3.5, height = 2.5;
  const ax = ally.x, az = ally.z, ay = 1.0;
  const camX = ax - Math.sin(ally.rotY) * (-back);
  const camZ = az - Math.cos(ally.rotY) * (-back);
  camera.position.set(camX, ay + height, camZ);
  // Look at the ally's chest level
  camera.lookAt(ax, ay + 1.0, az);
}
function showSpectatorHUD() {
  let hud = document.getElementById('spectator-hud');
  if (!hud) {
    hud = document.createElement('div');
    hud.id = 'spectator-hud';
    hud.style.cssText = 'position:fixed;top:18%;left:50%;transform:translateX(-50%);z-index:9000;'
      + 'background:rgba(0,0,0,0.7);border:2px solid #4cf;color:#fff;font-family:monospace;'
      + 'padding:10px 18px;border-radius:6px;text-align:center;pointer-events:none;font-size:14px;';
    document.body.appendChild(hud);
  }
  hud.style.display = 'block';
}
function updateSpectatorHUD() {
  const hud = document.getElementById('spectator-hud');
  if (!hud || !spectatorState) return;
  const allies = getLiveAllies();
  if (allies.length === 0) { hud.style.display = 'none'; return; }
  const ally = allies[spectatorState.idx];
  const name = players[ally.id]?.name || 'Ally';
  hud.innerHTML = `<div style="font-size:11px;opacity:0.7;letter-spacing:2px;">SPECTATING</div>`
    + `<div style="font-size:22px;color:#4cf;font-weight:bold;margin:2px 0;">${name}</div>`
    + `<div style="font-size:11px;opacity:0.8;">[ ← / → ] or [ CLICK ] to cycle · ${spectatorState.idx + 1}/${allies.length}</div>`;
}

// Client-side bot damage to player (applies immediately; server also processes for auth)
const CLIENT_WEAPON_DAMAGE = Object.fromEntries([
  ...WEAPONS.map(w => [w.id, w.damage]),
  ...MELEE_ITEMS.map(m => [m.id, m.damage]),
  ['mg42', 15], ['bat', 38], ['sabre', 45], ['frying_pan', 32], ['sledge', 70],
  ['spear', 50], ['spear_throw', 85], ['pickle', 22], ['shield_charge', 60],
  ['knife_instakill', 9999], ['chainsaw', 45], ['katana', 65], ['knife', 28],
  ['lightsabre', 72], ['riot_shield', 18], ['baguette', 16], ['screwdriver', 20],
  // New ability-shot weapon ids
  ['m1_garand_ab', 150], ['plasma_storm', 35], ['arc_overload', 70],
  ['singularity', 90], ['rotten_potato', 40], ['sticker_bomb', 35],
  ['chain_pull', 60], ['airburst', 95], ['toxin_dart', 30], ['blind_flash', 0],
  ['arc_torrent', 5], ['firework_launcher', 50], ['switchblade_gun', 50], ['switchblade_charged', 100],
  // 3rd-batch primaries + abilities
  ['flechette', 16], ['thermal_lmg', 11], ['burst_cannon', 40], ['incendiary_shotgun', 14],
  ['coilgun', 92], ['smart_smg', 9], ['amr', 180], ['air_rifle', 34],
  ['shockwave_launcher', 48], ['twin_ar', 20],
  ['coilgun_ab', 220], ['needle_storm', 16], ['vent_burst', 30], ['dragon_breath', 4],
  // 3rd-batch secondaries
  ['machine_revolver', 24], ['emp_pistol', 26], ['emp_burst', 25],
  // 3rd-batch melees
  ['combat_axe', 78], ['combat_axe_throw', 120], ['shock_baton', 32],
  // 3rd-batch supports
  ['hunter_drone', 100], ['emp_grenade', 25], ['sticky_charge', 120],
  // 😈 P2W batch
  ['swarm_rifle', 11], ['lazy_laser', 6], ['storm_cannon', 70], ['royal_minigun', 12],
  ['pocket_rocket', 90], ['auto_revolver', 42],
  ['titan_hammer', 95], ['vampire_blade', 52],
  ['orbital_strike', 250], ['guardian_drone', 14], ['nano_shield', 0],
  ['thunderstorm', 60],
  // Lazy weapons batch
  ['frost_blaster', 0], ['air_grenade', 15], ['land_mine', 298], ['frost_freeze', 9999],
  // 🔬 Tech / Physics batch
  ['prism_launcher', 38], ['foam_cannon', 18], ['airburst_projector', 22], ['glassmaker', 28],
  ['magnet_rifle', 16], ['seismic_hammer', 70], ['painter_beam', 6], ['portal_launcher', 10],
  ['pulse_disc', 32], ['gravity_paint', 4], ['traffic_controller', 4], ['pinball_launcher', 60],
  ['hyper_disc', 80],
  // Map hazards
  ['lava', 4],
  ['acid', 6],
  ['explosive_barrel', 100],
  // The classic
  ['fists', 24],
  // 👑 BR vehicle guns
  ['jeep_gun', 22],
  // 🪖 ADMIN weapons + ability shots
  ['gau19', 50], ['mk44', 25], ['xm7', 60], ['barrett', 250], ['barrett_ab', 600],
  ['m134', 15], ['hkmp7', 30], ['p90_spec', 22],
  ['desert_eagle', 65], ['desert_eagle_ab', 195], ['m1911', 50], ['ppk', 45], ['ppk_ab', 135],
  ['glock18', 30], ['five_seven', 40],
  ['karambit', 80], ['bayonet', 100], ['tomahawk', 120], ['tomahawk_throw', 180],
  ['ots04', 90], ['garrote', 9999],
  ['c4', 200], ['claymore', 250], ['stun_grenade', 10], ['thermite', 8],
  ['predator_uav', 0], ['care_package', 0], ['tac_nuke', 500],
  // New melees
  ['crowbar', 32], ['fire_axe', 85], ['nunchucks', 22], ['umbrella', 18], ['yoyo', 30],
]);
// 🛹 Does a bot's shot actually connect with the player's hitbox this frame?
// Models the bot firing from gun height toward a "standing center-mass" aim
// point (with skill/distance vertical spread), then tests that point against
// the player's crouch-adjusted hit spheres — mirrors the player→entity hitbox
// in updateBullets. Result: crouching/sliding (which lowers the spheres) makes
// the bot's shot sail overhead, so duck-and-slide actually dodges bot fire.
function botShotHitsPlayer(bot, dist) {
  const curEye = window._crouchEye || 1.65;
  const feetY  = camera.position.y - curEye;
  const crouch = Math.max(0, Math.min(1, (1.65 - curEye) / (1.65 - 0.70)));
  // Crouch-adjusted sphere centers (match the remote-mesh hitbox offsets)
  const headY = feetY + (1.65 - crouch * 0.75); // 1.65 → 0.90 above feet
  const bodyY = feetY + (1.0  - crouch * 0.45); // 1.00 → 0.55 above feet
  const headR = 0.28, bodyR = 0.65;
  // Bot aims for STANDING chest height (it doesn't perfectly track your duck),
  // with vertical spread that grows with range and shrinks with aim skill.
  const skill   = bot.aimSkill || 1;
  const aimBase = feetY + 1.25;
  const vSpread = (0.30 + dist * 0.018) * (1.6 - Math.min(1.2, skill));
  const aimY    = aimBase + (Math.random() * 2 - 1) * vSpread;
  const inHead = Math.abs(aimY - headY) < headR;
  const inBody = !inHead && Math.abs(aimY - bodyY) < bodyR;
  return { hit: inHead || inBody, headshot: inHead };
}

function applyBotDamageToPlayer(weaponId, botId) {
  // ⚡ Admin god mode: no damage taken
  if (adminCheats.godMode && currentUser?.isAdmin) { flashHitIndicator(); return; }
  // Frost Blaster: doesn't deal HP damage, just reduces speed (lethal at 0)
  if (weaponId === 'frost_blaster') {
    if (isDead || match?.type === 'range') return;
    playerFrostSlow = Math.max(0, playerFrostSlow - 3);
    flashHitIndicator();
    return;
  }
  // Frost-freeze death routes via this function with a special weapon ID
  if (weaponId === 'frost_freeze') {
    if (isDead) return;
    const me = players[myId];
    if (me) me.hp = 0;
    playSoundEvent('freeze_shatter', { volume: 1.1 });
    updateHealthHUD(0);
    isDead = true;
    showAnnouncement('FROZEN', 'You turned to ice', '#99eeff', 1800);
    const ds = document.getElementById('death-screen');
    if (ds) ds.style.display = 'flex';
    onEntityDied(myId, botId || null);
    return;
  }
  if (isDead || isShielded() || isRiotShieldBlocking()) return;
  if (meleeAbilityBuff?.type === 'parry' || meleeAbilityBuff?.type === 'deflect') return;
  if (match?.type === 'range') return;
  const dmg = CLIENT_WEAPON_DAMAGE[weaponId] || 25;
  const me = players[myId];
  if (!me || !dmg) { console.warn('[damage] no me or dmg', me, dmg); return; }
  const oldHp = me.hp;
  me.hp = Math.max(0, me.hp - dmg);
  console.log(`[damage] bot hit: ${weaponId}(${dmg}dmg) ${oldHp}→${me.hp}`);
  updateHealthHUD(me.hp);
  if (oldHp > 75 && me.hp <= 75 && me.hp > 0) playSoundEvent('low_hp', { volume: 1.0, minGap: 2500 });
  flashHitIndicator();
  if (me.hp <= 0 && !isDead) {
    isDead = true;
    isADS = false; targetFOV = 75; shooting = false;
    reloading = false;
    // Clear any active buffs so bots stop reacting to a dead player's lingering effects
    abilityBuff = null; meleeAbilityBuff = null; pendingFanFire = null;
    const scope = document.getElementById('scope-overlay');
    if (scope) scope.style.display = 'none';
    const ds = document.getElementById('death-screen');
    const ws = document.getElementById('waiting-screen');
    const killerName = (botId && players[botId]?.name) || 'Enemy';
    showAnnouncement('YOU DIED', `Killed by ${killerName}`, '#ff4444', 1800);
    // Speech bubble: killer bot taunts
    if (botId) {
      const killerBot = gameBots.find(b => b.id === botId);
      if (killerBot) {
        const line = pickThought('killed_enemy');
        if (line) showBotSpeech(killerBot, line, 2500, '#44ff44');
      }
    }
    // Notify match logic (round end / kill tracking)
    onEntityDied(myId, botId || null);
    if (match && match.type === 'elim' && !match.over) {
      if (ds) ds.style.display = 'none';
      if (ws) ws.style.display = 'flex';
      const dmEl = document.getElementById('death-msg');
      if (dmEl) dmEl.textContent = 'Waiting for round to end...';
      updateRoundScoreDisplay && updateRoundScoreDisplay();
      enterSpectator(); // watch live teammates while waiting
    } else if (match && match.type === 'arcade') {
      // Arcade: brief death screen, scheduleArcadeRespawn handles the actual respawn
      if (ds) {
        ds.style.display = 'flex';
        const dm = document.getElementById('death-msg');
        if (dm) dm.textContent = 'Respawning in 2.5s...';
      }
      setTimeout(() => { if (ds) ds.style.display = 'none'; }, 2400);
    } else if (match && match.type === 'br') {
      // BR: respawn handled by onEntityDied. Show brief death screen.
      const livesLeft = Math.max(0, (match.lives[myId] || 0) - 1);
      if (ds) {
        ds.style.display = 'flex';
        const dm = document.getElementById('death-msg');
        if (dm) dm.textContent = livesLeft > 0 ? `Respawning in 4s · ${livesLeft} lives left` : 'You\'re out of lives — spectating';
      }
      if (livesLeft <= 0) {
        // Out of lives — go into spectator mode for the rest of the match
        setTimeout(() => { if (ds) ds.style.display = 'none'; enterSpectator(); }, 1500);
      } else {
        // Hide death screen when respawn fires (handled in onEntityDied)
        setTimeout(() => { if (ds) ds.style.display = 'none'; }, 3800);
      }
    } else if (match && match.type === 'dday') {
      if (ds) { ds.style.display = 'flex'; const dm = document.getElementById('death-msg'); if (dm) dm.textContent = 'Respawning in 3s...'; }
      setTimeout(() => {
        if (!isDead) return;
        if (ds) ds.style.display = 'none';
        isDead = false;
        me.hp = 300; updateHealthHUD(300);
        camera.position.set(-22, 1.65, 22); euler.y = 0; camera.quaternion.setFromEuler(euler);
        grantSpawnShield(3000);
        requestPointerLockSafe();
      }, 3000);
    } else {
      if (ds) { ds.style.display = 'flex'; const dm = document.getElementById('death-msg'); if (dm) dm.textContent = 'Select your loadout...'; }
      setTimeout(() => { if (ds) ds.style.display='none'; showLoadoutScreen('death'); }, 1500);
    }
  }
}
function showScoreboard(v) {
  const el = document.getElementById('scoreboard');
  if (!v) { el.style.display='none'; return; }
  el.style.display='block';
  const tbody = document.getElementById('score-body');
  tbody.innerHTML='';
  Object.values(players).sort((a,b)=>b.kills-a.kills).forEach(p => {
    const tr = document.createElement('tr');
    if (p.id===myId) tr.className='me';
    tr.innerHTML=`<td>${p.name}</td><td>${p.kills}</td><td>${p.deaths}</td><td>${p.hp}</td>`;
    tbody.appendChild(tr);
  });
}

// Weapon selector HUD — shows only the 2 chosen loadout slots
function updateWeaponSelector() {
  const pSlot = document.getElementById('ws-primary');
  const sSlot = document.getElementById('ws-secondary');
  const mSlot = document.getElementById('ws-melee');
  const uSlot = document.getElementById('ws-support');
  if (pSlot) {
    pSlot.querySelector('.ws-name').textContent = selectedPrimaryIdx !== null ? WEAPONS[selectedPrimaryIdx].name : '—';
    pSlot.classList.toggle('active', activeSlot === 'primary');
  }
  if (sSlot) {
    sSlot.querySelector('.ws-name').textContent = selectedSecondaryIdx !== null ? WEAPONS[selectedSecondaryIdx].name : '—';
    sSlot.classList.toggle('active', activeSlot === 'secondary');
  }
  if (mSlot) {
    mSlot.querySelector('.ws-name').textContent = selectedMeleeIdx !== null && selectedMeleeIdx >= 0 ? MELEE_ITEMS[selectedMeleeIdx].name : '—';
    mSlot.classList.toggle('active', activeSlot === 'melee');
  }
  if (uSlot) {
    uSlot.querySelector('.ws-name').textContent = selectedSupportIdx !== null && selectedSupportIdx >= 0 ? SUPPORT_ITEMS[selectedSupportIdx].name : '—';
    uSlot.classList.toggle('active', activeSlot === 'support');
  }
}

// ── Socket events ──────────────────────────────────────────────────────────
const WEAPON_DAMAGE = Object.fromEntries(WEAPONS.map(w=>[w.id, w.damage]));

socket.on('init', data => {
  myId = data.id; players = data.players;
  Object.entries(players).forEach(([pid,p]) => { if(pid!==myId) spawnRemotePlayer(p); });
  const me = players[myId];
  if (me) { camera.position.set(me.x, me.y+0.65, me.z); updateHealthHUD(me.hp); }
});
socket.on('connect_error', () => {
  const el = document.getElementById('err');
  el.style.display = 'block';
  el.textContent = 'Cannot reach the game server. Start it, then open http://localhost:3001';
});
// Staging-lobby socket events
socket.on('lobbyState', data => {
  stagingLobbyState = data;
  if (stagingLobbyMode === data.mode) renderStagingLobby();
});
socket.on('lobbyStart', data => {
  // Server says: time to start the match. Set up pvpMatch + spawn flow.
  hideStagingLobby();
  stagingLobbyMode = null;
  stagingLobbyState = null;
  pvpMatch = {
    mode: data.mode,
    team: data.team,
    opponents: data.opponents || [],
    isHost: !!data.isHost,
    allyBotsToSpawn: data.allyBots || 0,
    enemyBotsToSpawn: data.enemyBots || 0,
    mapId: data.mapId || null, // 🗺️ server-picked map; overrides client's random pick
  };
  // Force every paired client to use the same map
  if (data.mapId) selectedMap = data.mapId;
  showAnnouncement('MATCH FOUND',
    `${data.opponents.length + 1} player(s) · You are ${data.team.toUpperCase()}${pvpMatch.isHost ? ' (HOST)' : ''}`,
    '#44ff66', 2200);
  // Now spawn the game (will use pvpMatch.isHost to decide bot spawning)
  if (!gameStarted) {
    gameStarted = true;
    spawnGameBots();
    requestPointerLockSafe();
    loop();
  }
});
socket.on('chatLine', data => {
  // From another player
  if (data.id === myId) return;
  const name = players[data.id]?.name || 'Player';
  pushChatLine(`${name}: ${data.emoji || '💬'} ${data.text}`, data.color || '#fff');
});
socket.on('playerJoined', p => {
  players[p.id] = p;
  // Skip mesh creation for bots we already spawned locally (avoid duplicates)
  if (p.id !== myId && !remoteMeshes[p.id]) spawnRemotePlayer(p);
  // If it's our bot and not yet in gameBots (edge-case fallback), add it
  if (p.isBot && p.ownerId === myId && !gameBots.find(b => b.id === p.id)) {
    gameBots.push({
      id: p.id, team: p.team, weaponId: p.weaponId,
      x: p.x, z: p.z, rotY: 0, hp: p.hp || 300,
      dead: false, state: 'chase',
      wanderAngle: Math.random() * Math.PI * 2, wanderTimer: 0,
      lastShot: 0, strafeDir: 1, strafeFlipTimer: 0, tacTimer: 0,
      prevHp: p.hp || 300, coverPt: null,
    });
    const mesh = remoteMeshes[p.id];
    if (mesh) mesh.position.set(p.x, 0, p.z);
  }
});
socket.on('playerLeft',   id => {
  delete players[id];
  if (remoteMeshes[id]) { scene.remove(remoteMeshes[id]); delete remoteMeshes[id]; }
});
// 🎭 A player changed skin (or their admin flag arrived) — rebuild their mesh
socket.on('skinChanged', ({ id, skin, isAdmin }) => {
  if (id === myId) return; // local player has no body mesh
  if (players[id]) { players[id].skin = skin; players[id].isAdmin = isAdmin; }
  const old = remoteMeshes[id];
  if (!old) return;
  const wasVisible = old.visible;
  scene.remove(old);
  const p = players[id] || { name: '', isBot: false, team: 'enemy', x: old.position.x, z: old.position.z };
  const mesh = makePlayerMesh(p.name, p.isBot, p.team || 'enemy',
                              SKIN_IDS.includes(skin) ? skin : 'default', { crown: !!isAdmin });
  mesh.position.copy(old.position); mesh.rotation.y = old.rotation.y; mesh.visible = wasVisible;
  scene.add(mesh); remoteMeshes[id] = mesh;
});
socket.on('bulletFired', b => {
  if (b.ownerId===myId) return;
  const w = WEAPONS.find(x=>x.id===b.weapon)||WEAPONS[0];
  const origin = new THREE.Vector3(b.x,b.y,b.z);
  playWeaponSound(b.weapon || w.id, { baseWeapon: w, remote: true, position: origin });
  spawnLocalBullet(origin, new THREE.Vector3(b.dx,b.dy,b.dz), b.id, false, w.bulletSpeed, w.bulletColor, w.bulletSize, w.id);
});
socket.on('playerHit', data => {
  // Range mode: player is invincible — just ignore any damage (no healSelf to avoid server loop)
  if (data.targetId === myId && match?.type === 'range') {
    updateHealthHUD(300);
    if (players[myId]) players[myId].hp = 300;
    return;
  }
  // If it's us and we have spawn shield, absorb the hit visually but ignore HP change
  if (data.targetId === myId && isShielded()) {
    flashHitIndicator(); // show we were hit but shield absorbed it
    if (data.bulletId) {
      for (let i=localBullets.length-1; i>=0; i--) {
        if (localBullets[i].id===data.bulletId) { scene.remove(localBullets[i].mesh); localBullets.splice(i,1); break; }
      }
    }
    return; // don't apply HP loss
  }
  // Lightsabre parry: absorb incoming damage
  if (data.targetId === myId && meleeAbilityBuff?.type === 'parry') {
    const oldHp = players[myId]?.hp ?? data.hp;
    const dmgAbsorbed = Math.max(0, oldHp - data.hp);
    flashHitIndicator();
    if (dmgAbsorbed > 0) socket.emit('healSelf', { amount: dmgAbsorbed });
    if (data.bulletId) {
      for (let i=localBullets.length-1; i>=0; i--) {
        if (localBullets[i].id===data.bulletId) { scene.remove(localBullets[i].mesh); localBullets.splice(i,1); break; }
      }
    }
    return;
  }
  // Katana deflect: absorb AND reflect damage back to nearest enemy
  if (data.targetId === myId && meleeAbilityBuff?.type === 'deflect') {
    const oldHp = players[myId]?.hp ?? data.hp;
    const dmgAbsorbed = Math.max(0, oldHp - data.hp);
    flashHitIndicator();
    if (dmgAbsorbed > 0) socket.emit('healSelf', { amount: dmgAbsorbed });
    // Reflect: hit nearest enemy bot
    let nearest = null, nearDist = Infinity;
    for (const bot of gameBots) {
      if (bot.dead || bot.team !== 'enemy') continue;
      const d = Math.hypot(bot.x - camera.position.x, bot.z - camera.position.z);
      if (d < nearDist) { nearDist = d; nearest = bot; }
    }
    if (nearest && nearDist < 30) {
      const mesh = remoteMeshes[nearest.id];
      const hitPos = mesh ? mesh.position.clone().setY(1.0) : camera.position.clone();
      emitHit(nearest.id, `deflect_${myId}_${Date.now()}`, 'katana', hitPos);
      spawnHitParticle(hitPos);
    }
    if (data.bulletId) {
      for (let i=localBullets.length-1; i>=0; i--) {
        if (localBullets[i].id===data.bulletId) { scene.remove(localBullets[i].mesh); localBullets.splice(i,1); break; }
      }
    }
    return;
  }
  // Riot shield blocks frontal hits when not swinging
  if (data.targetId === myId && isRiotShieldBlocking()) {
    const oldHp = players[myId]?.hp ?? data.hp;
    const dmgAbsorbed = Math.max(0, oldHp - data.hp);
    flashHitIndicator(); // shield clang
    if (dmgAbsorbed > 0) socket.emit('healSelf', { amount: dmgAbsorbed });
    if (data.bulletId) {
      for (let i=localBullets.length-1; i>=0; i--) {
        if (localBullets[i].id===data.bulletId) { scene.remove(localBullets[i].mesh); localBullets.splice(i,1); break; }
      }
    }
    return;
  }
  if (players[data.targetId]) {
    const tgt = players[data.targetId];
    if (tgt.isBot) {
      // Bot HP: never let server-reported HP raise local value (in-flight hits)
      const curHp = tgt.hp ?? data.hp;
      if (data.hp < curHp) tgt.hp = data.hp;
    } else {
      tgt.hp = data.hp; // player: trust server (heals/damage both valid)
    }
    if ((tgt.hp ?? 0) <= 0) tgt.dead = true;
  }
  const hitBot = gameBots.find(b => b.id === data.targetId);
  if (hitBot && !hitBot.dead) {
    // Only sync HP from server if it would LOWER our local HP (avoid race where in-flight
    // local hits put us below the server's view, and a stale server message bumps us back up)
    if (data.hp < hitBot.hp) hitBot.hp = data.hp;
    hitBot.prevHp = hitBot.hp;
    if (hitBot.hp <= 0) {
      hitBot.dead = true;
      if (remoteMeshes[data.targetId]) remoteMeshes[data.targetId].visible = false;
      myKills++;
      creditWeaponKill(currentEquippedId());
      saveKillReplay(data.targetId, currentEquippedId());
      const kc = document.getElementById('kill-count');
      if (kc) kc.textContent = `Kills: ${myKills}`;
      const botName = players[data.targetId]?.name || 'Bot';
      showAnnouncement('ELIMINATED', botName, '#ff4444', 1200);
      onEntityDied(data.targetId, myId);
    }
  }
  if (data.targetId===myId) { updateHealthHUD(data.hp); flashHitIndicator(); }
  if (data.bulletId) {
    for (let i=localBullets.length-1; i>=0; i--) {
      if (localBullets[i].id===data.bulletId) { scene.remove(localBullets[i].mesh); localBullets.splice(i,1); break; }
    }
  }
});
socket.on('playerDied', data => {
  if (players[data.targetId]) { players[data.targetId].hp = 0; players[data.targetId].dead = true; }
  // Only count kill if playerHit didn't already count it (check if bot.dead was already set)
  const _alreadyDead = gameBots.find(b => b.id === data.targetId)?.dead;
  if (data.killerId===myId && !_alreadyDead) { myKills++; creditWeaponKill(currentEquippedId()); saveKillReplay(data.targetId, currentEquippedId()); const kc=document.getElementById('kill-count'); if(kc) kc.textContent=`Kills: ${myKills}`; }
  if (data.targetId===myId) {
    isDead=true; isADS=false; targetFOV=75; shooting=false;
    reloading=false;
    // Clear lingering buffs so bots resume normal AI
    abilityBuff=null; meleeAbilityBuff=null; pendingFanFire=null;
    document.getElementById('scope-overlay').style.display='none';
    // 🎬 Start killcam — overrides camera + hides death screen for ~2.2s
    startKillcam(data.killerId);
    const ds = document.getElementById('death-screen');
    if (!KILLCAM.active) ds.style.display='flex';
    if (match && match.type === 'elim' && !match.over) {
      // No respawn in elimination — wait for round to end
      document.getElementById('death-msg').textContent = 'Waiting for round to end...';
      ds.style.display = 'none';
      document.getElementById('waiting-screen').style.display = 'flex';
      updateRoundScoreDisplay();
      enterSpectator(); // watch live teammates while waiting
    } else if (match && match.tiebreaker) {
      document.getElementById('death-msg').textContent = 'Tiebreaker — eliminated!';
      // endMatch called via onEntityDied
    } else if (match && match.type === 'arcade') {
      document.getElementById('death-msg').textContent = 'Respawning in 2.5s...';
      setTimeout(() => { ds.style.display = 'none'; }, 2400);
    } else if (match && match.type === 'range') {
      // Range mode: instant respawn (player shouldn't die here, but just in case)
      ds.style.display = 'none';
      isDead = false;
      camera.position.set(0, 1.65, 38);
      euler.y = Math.PI;
      camera.quaternion.setFromEuler(euler);
      socket.emit('readyRespawn', { x: camera.position.x, z: camera.position.z });
      requestPointerLockSafe();
    } else if (match && match.type === 'dday') {
      // D-Day: auto-respawn at bunker 0 after 3 seconds, same weapons
      document.getElementById('death-msg').textContent = 'Respawning in 3s...';
      setTimeout(() => {
        if (!match || match.over || !isDead) return;
        ds.style.display = 'none';
        isDead = false;
        camera.position.set(-22, 1.65, 22); // back to bunker 0 slit
        euler.y = 0; // face toward enemies (-Z)
        camera.quaternion.setFromEuler(euler);
        socket.emit('readyRespawn', { x: camera.position.x, z: camera.position.z });
        grantSpawnShield(3000);
        requestPointerLockSafe();
      }, 3000);
    } else if (!match || match.cfg?.type !== 'elim') {
      document.getElementById('death-msg').textContent = 'Select your loadout...';
      setTimeout(() => { ds.style.display='none'; showLoadoutScreen('death'); }, 1500);
    }
  }
  if (remoteMeshes[data.targetId]) remoteMeshes[data.targetId].visible=false;
  const bot = gameBots.find(b => b.id === data.targetId);
  if (bot) { bot.dead = true; bot.hp = 0; }
  if (players[data.targetId]) players[data.targetId].dead = true;
  // Show kill feed
  if (data.killerId === myId && data.targetId !== myId) {
    const botName = players[data.targetId]?.name || 'Bot';
    showAnnouncement('ELIMINATED', botName, '#ff4444', 1400);
  }
  onEntityDied(data.targetId, data.killerId);
});
socket.on('playerRespawned', p => {
  // Elim modes (1v1, 2v2, 3v3): bots stay dead until the round ends. Ignore server auto-respawns.
  if (p.autoRespawn && p.isBot && match?.type === 'elim') return;
  players[p.id]=p;
  if (p.id===myId) {
    isDead = false;
    updateHealthHUD(p.hp || 300);
    resetCombatResources();
    if (match && match.type === 'dday') {
      // D-Day: position already set by the 3s respawn timer, just refresh HP
      if (p.forcedReset) camera.position.set(p.x, 1.65, p.z);
    } else {
      // Always teleport to the player's team side — never trust server's center-ish spawn.
      if (p.forcedReset || p.clientSpawn) {
        camera.position.set(p.x, 1.65, p.z);
        euler.y = p.z < 0 ? 0 : Math.PI;
      } else {
        placePlayerAtTeamSpawn(localPlayerTeam(), 24, 38);
      }
      camera.quaternion.setFromEuler(euler);
    }
  } else if (remoteMeshes[p.id]) {
    const bot = gameBots.find(b => b.id === p.id);
    if (bot) {
      // Respawn bot on its correct side, not the server's center spawn point
      const idx = gameBots.filter(b => b.team === bot.team).indexOf(bot);
      const totalOnTeam = gameBots.filter(b => b.team === bot.team).length;
      const sp = botSideSpawn(idx, totalOnTeam, bot.team);
      bot.x = sp.x; bot.z = sp.z;
      bot.hp = p.hp || 300; bot.dead = false;
      if (bot.state !== 'turret') { bot.state = 'chase'; }
      bot.stuckTimer = 0;
      remoteMeshes[p.id].position.set(bot.x, 0, bot.z);
    } else {
      remoteMeshes[p.id].position.set(p.x, 0, p.z);
    }
    remoteMeshes[p.id].visible = true;
    players[p.id].hp = p.hp || 300;
    players[p.id].dead = false;
  }
});

function spawnRemotePlayer(p) {
  const skinId = SKIN_IDS.includes(p.skin) ? p.skin : 'default';
  const mesh = makePlayerMesh(p.name, p.isBot, p.team || 'enemy', skinId, { crown: !!p.isAdmin });
  mesh.position.set(p.x,0,p.z);
  scene.add(mesh); remoteMeshes[p.id]=mesh;
}

// Position sync — server broadcasts all positions every 50ms
socket.on('posUpdate', positions => {
  for (const [pid, pos] of Object.entries(positions)) {
    if (pid === myId) continue;
    // Skip bots we own — the bot AI drives their mesh directly; server data always lags
    if (gameBots.some(b => b.id === pid)) continue;
    if (players[pid]) {
      players[pid].x = pos.x; players[pid].y = pos.y; players[pid].z = pos.z;
      players[pid].rotY = pos.rotY; players[pid].rotX = pos.rotX;
    }
    const mesh = remoteMeshes[pid];
    if (!mesh) continue;
    mesh.position.x += (pos.x - mesh.position.x) * 0.35;
    mesh.position.z += (pos.z - mesh.position.z) * 0.35;
    mesh.rotation.y  = pos.rotY + Math.PI;
  }
});

setInterval(()=>{
  if (!myId || isDead) return;
  socket.emit('move',{ x:camera.position.x, y:camera.position.y, z:camera.position.z, rotY:euler.y, rotX:euler.x });
},50);

// Auto-fire loop
setInterval(()=>{ if(shooting && (activeSlot === 'primary' || activeSlot === 'secondary') && currentWeapon.auto) tryShoot(); }, 50);

// Cycler ammo regen (and any future ammoRegen weapons)
let _regenLast = performance.now();
setInterval(() => {
  const now = performance.now();
  const dt = (now - _regenLast) / 1000;
  _regenLast = now;
  WEAPONS.forEach((w, i) => {
    if (!w.ammoRegen) return;
    const pool = weaponAmmo[i];
    if (pool.ammo >= w.mag) return;
    pool._accum = (pool._accum || 0) + w.ammoRegen * dt;
    const gain = Math.floor(pool._accum);
    if (gain > 0) {
      pool.ammo = Math.min(w.mag, pool.ammo + gain);
      pool._accum -= gain;
      if (i === currentWeaponIdx) { ammo = pool.ammo; updateAmmoHUD(); }
    }
  });
}, 200);

// ── Trashcan proximity check ──────────────────────────────────────────────
function updateTrashcanProximity() {
  if (!gameStarted || isDead) {
    if (nearTrashcan) { nearTrashcan = false; setInteractVisible(false); }
    return;
  }
  const px = camera.position.x, pz = camera.position.z;
  let wasNear = nearTrashcan;
  nearTrashcan = TRASHCAN_POSITIONS.some(pos => {
    const dx = px - pos.x, dz = pz - pos.z;
    return Math.sqrt(dx*dx + dz*dz) < 2.4;
  });
  if (nearTrashcan !== wasNear) setInteractVisible(nearTrashcan);
}

function setInteractVisible(v) {
  const hint = document.getElementById('interact-hint');
  if (hint) hint.style.display = v ? 'block' : 'none';
  const btn = document.getElementById('btn-interact');
  if (btn) btn.style.display = v ? 'flex' : 'none';
}

// ── Grenade functions ──────────────────────────────────────────────────────
function makeWorldGrenadeMesh() {
  const g = new THREE.Group();
  const oliveMat = new THREE.MeshLambertMaterial({ color: 0x4a5a28 });
  const darkMat  = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), oliveMat);
  g.add(body);
  // Segmentation band
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.009, 4, 10), darkMat);
  band.rotation.x = Math.PI / 2; g.add(band);
  // Safety lever strip
  const lever = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.004, 0.09), darkMat);
  lever.position.set(0, 0.042, 0); g.add(lever);
  // Fuse cap on top
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.020, 0.022, 6), darkMat);
  cap.position.y = 0.075; g.add(cap);
  return g;
}

function doThrowGrenade() {
  const origin = new THREE.Vector3();
  camera.getWorldPosition(origin);
  // Offset to right-hand position
  origin.add(new THREE.Vector3(0.12, -0.18, -0.30).applyQuaternion(camera.quaternion));

  // Aim slightly upward from look direction for a natural arc
  const aimDir = new THREE.Vector3(0, 0.18, -1).applyQuaternion(camera.quaternion).normalize();

  const mesh = makeWorldGrenadeMesh();
  mesh.position.copy(origin);
  scene.add(mesh);

  const id = `gren_${myId}_${Date.now()}`;
  activeGrenades.push({
    mesh,
    velX: aimDir.x * 20,
    velY: aimDir.y * 20,
    velZ: aimDir.z * 20,
    id,
    isOwn: true,
    explodeAt: Date.now() + GRENADE_FUSE,
  });

  // Tell server so other clients see a projectile
  socket.emit('shoot', {
    x: origin.x, y: origin.y, z: origin.z,
    dx: aimDir.x, dy: aimDir.y, dz: aimDir.z,
    weapon: 'frag',
  });
}

function updateGrenades(dt) {
  const now = Date.now();
  for (let i = activeGrenades.length - 1; i >= 0; i--) {
    const g = activeGrenades[i];
    const grav = GRENADE_GRAVITY * (g.gravMult ?? 1);
    // Gravity
    g.velY -= grav * dt;
    // Move
    g.mesh.position.x += g.velX * dt;
    g.mesh.position.y += g.velY * dt;
    g.mesh.position.z += g.velZ * dt;

    // Ground interaction
    const groundY = g.isSupport ? (g.itemRef?.bulletSize || 0.12) : 0.10;
    if (g.mesh.position.y < groundY) {
      g.mesh.position.y = groundY;
      if (g.explodeOnImpact) {
        // Explode on first ground contact
        explodeSupport(g);
        scene.remove(g.mesh);
        activeGrenades.splice(i, 1);
        continue;
      }
      // Bounce
      g.bounceCount = (g.bounceCount || 0) + 1;
      if (g.maxBounces && g.bounceCount > g.maxBounces) {
        // Rubber duck: explode after max bounces
        explodeSupport(g);
        scene.remove(g.mesh);
        activeGrenades.splice(i, 1);
        continue;
      }
      g.velY = Math.abs(g.velY) * 0.38;
      g.velX *= 0.70;
      g.velZ *= 0.70;
    }

    // Tumble spin
    g.mesh.rotation.x += dt * 5;
    g.mesh.rotation.z += dt * 3;

    // Fuse blink (frag and moon_mine)
    if (g.explodeAt) {
      const timeLeft = g.explodeAt - now;
      if (timeLeft < 1200 && !g.isSupport) {
        // Only blink cap for frag (which has structured children)
        const blink = Math.floor(timeLeft / 180) % 2 === 0;
        const cap = g.mesh.children[4];
        if (cap && cap.material) cap.material.color.setHex(blink ? 0xff2200 : 0x1a1a1a);
      }
      if (now >= g.explodeAt) {
        if (g.isSupport) explodeSupport(g);
        else explodeGrenade(g);
        scene.remove(g.mesh);
        activeGrenades.splice(i, 1);
      }
    }
  }
}

function explodeGrenade(g) {
  const pos = g.mesh.position.clone();
  spawnExplosion(pos);
  if (!g.isOwn) return;
  const RADIUS = 5.5;
  for (const [pid, mesh] of Object.entries(remoteMeshes)) {
    const target = mesh.position.clone(); target.y += 1.0;
    const dist = pos.distanceTo(target);
    if (dist < RADIUS) {
      // Route through emitHit so damage applies locally + shows numbers + handles death
      emitHit(pid, g.id + '_x', 'frag', target);
      spawnHitParticle(target);
    }
  }
  // Also damage the player if they're in range
  if (camera.position.distanceTo(pos.clone().setY(camera.position.y)) < RADIUS) {
    applyBotDamageToPlayer('frag', null);
  }
}

function explodeSupport(g) {
  if (!g.isSupport) { explodeGrenade(g); return; }
  const item = g.itemRef;
  if (!item) return;
  const pos = g.mesh.position.clone();

  // 🪖 Admin stun grenade — flash + temporarily stop bot AI in radius
  if (item.id === 'stun_grenade') {
    spawnAbilityAOEFX(pos, item.stunRadius || 8, 0xffffff);
    flashScreen('rgba(255,255,255,0.75)', 600);
    const r2 = (item.stunRadius || 8) * (item.stunRadius || 8);
    for (const bot of gameBots) {
      if (bot.dead) continue;
      const dx = bot.x - pos.x, dz = bot.z - pos.z;
      if (dx*dx + dz*dz < r2) {
        bot._stunUntil = Date.now() + (item.stunDur || 4000);
        const mesh = remoteMeshes[bot.id];
        const hp = mesh ? mesh.position.clone().setY(1.0) : new THREE.Vector3(bot.x, 1, bot.z);
        emitHit(bot.id, `stun_${myId}_${Date.now()}_${bot.id}`, 'stun_grenade', hp);
      }
    }
    return;
  }
  // 🪖 Admin thermite — burning zone DOT (reuses firework burn-zone system)
  if (item.id === 'thermite') {
    spawnAbilityAOEFX(pos, item.burnRadius || 3.5, 0xff6622);
    spawnBurnZone(pos, item.burnRadius || 3.5, item.burnDps || 8, item.burnDur || 12000);
    return;
  }

  // Visual effect
  if (item.id === 'smoke') {
    spawnSmokeCloud(pos);
  } else {
    const color = item.randomBulletColor ? 0xffaa00 : (item.bulletColor || 0xff7700);
    spawnAbilityAOEFX(pos, getSupportRadius(item), color);
    if (item.id === 'black_hole_seed') playSoundEvent('blackhole_collapse', { position: pos, volume: 1.15 });
    else if (item.id === 'air_grenade') playSoundEvent('air_burst', { position: pos, volume: 1.15 });
    spawnExplosion(pos);
  }

  if (!g.isOwn || !item.damage) return;

  const radius = getSupportRadius(item);
  // Burst items: fire projectiles radially from explosion point
  if (item.burst && item.burst > 1) {
    const now2 = Date.now();
    for (let b = 0; b < item.burst; b++) {
      const d = new THREE.Vector3(
        (Math.random()-0.5)*2, (Math.random()-0.5)*0.6, (Math.random()-0.5)*2
      ).normalize();
      if (item.spread) {
        d.x += (Math.random()-0.5)*item.spread;
        d.z += (Math.random()-0.5)*item.spread;
        d.normalize();
      }
      const bcolor = item.randomBulletColor
        ? PAINTBALL_COLORS[Math.floor(Math.random()*PAINTBALL_COLORS.length)]
        : (item.bulletColor || 0xffffff);
      spawnLocalBullet(pos.clone(), d, `supp_b_${myId}_${now2}_${b}`, true, (item.bulletSpeed || 20) * 1.4, bcolor, item.bulletSize, item.id);
    }
    return;
  }

  // Damage players in radius (route through emitHit for client-side damage + UI)
  for (const [pid, mesh] of Object.entries(remoteMeshes)) {
    const target = mesh.position.clone(); target.y += 1.0;
    if (pos.distanceTo(target) < radius) {
      emitHit(pid, g.id + '_x', item.id, target);
      // Air Grenade: launch each hit bot upward
      if (item.id === 'air_grenade') {
        const bot = gameBots.find(b => b.id === pid);
        if (bot) { bot.yVel = item.launchVel || 14; bot.y = bot.y || 0; }
        playSoundEvent('air_launch', { position: target, remote: true, volume: 0.9, minGap: 90 });
      }
      spawnHitParticle(target);
    }
  }
  // Also affect the player if they're in range
  if (camera.position.distanceTo(pos.clone().setY(camera.position.y)) < radius) {
    if (item.id === 'air_grenade') {
      // Launch self upward (reuse slam-state vertical physics)
      slamState = { vel: item.launchVel || 14 };
      playSoundEvent('air_launch', { volume: 1.0, minGap: 90 });
      flashScreen('rgba(170,204,255,0.2)', 250);
      applyBotDamageToPlayer(item.id, null); // also do the small damage
    } else {
      applyBotDamageToPlayer(item.id, null);
    }
  }
}

function getSupportRadius(item) {
  const radii = { smoke: 4, confetti_cannon: 3, moon_mine: 5.5, rubber_duck: 3.5, black_hole_seed: 7, glitch_cube: 4 };
  return radii[item.id] || 4;
}

function spawnSmokeCloud(pos) {
  // Spawn 5 overlapping puffs at slightly offset positions for a chunky cloud
  const GROW_MS   = 1400;  // expand phase
  const HOLD_MS   = 7000;  // linger phase
  const FADE_MS   = 2000;  // fade-out phase
  const TOTAL_MS  = GROW_MS + HOLD_MS + FADE_MS;

  const puffs = [
    { ox:  0.0, oy: 0.6, oz:  0.0, r: 2.2, maxOp: 0.72 },
    { ox:  1.1, oy: 0.4, oz:  0.4, r: 1.6, maxOp: 0.60 },
    { ox: -1.0, oy: 0.5, oz: -0.3, r: 1.7, maxOp: 0.58 },
    { ox:  0.3, oy: 1.4, oz:  0.6, r: 1.4, maxOp: 0.50 },
    { ox: -0.4, oy: 0.2, oz:  1.0, r: 1.5, maxOp: 0.55 },
  ];

  const meshes = puffs.map(p => {
    const mat  = new THREE.MeshBasicMaterial({ color: 0xb0b0b0, transparent: true, opacity: 0 });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(p.r, 8, 6), mat);
    mesh.position.set(pos.x + p.ox, pos.y + p.oy, pos.z + p.oz);
    scene.add(mesh);
    return { mesh, mat, maxOp: p.maxOp };
  });

  const start = performance.now();
  const tick = () => {
    const elapsed = performance.now() - start;
    if (elapsed > TOTAL_MS) {
      meshes.forEach(({ mesh }) => scene.remove(mesh));
      return;
    }

    meshes.forEach(({ mesh, mat, maxOp }) => {
      let opacity, scale;
      if (elapsed < GROW_MS) {
        // Grow: scale 0.3→1, opacity 0→maxOp
        const k = elapsed / GROW_MS;
        scale   = 0.3 + k * 0.7;
        opacity = k * maxOp;
      } else if (elapsed < GROW_MS + HOLD_MS) {
        // Hold: slight gentle drift upward, full opacity
        scale   = 1.0 + ((elapsed - GROW_MS) / HOLD_MS) * 0.18;
        opacity = maxOp;
      } else {
        // Fade out
        const k = (elapsed - GROW_MS - HOLD_MS) / FADE_MS;
        scale   = 1.18 + k * 0.10;
        opacity = maxOp * (1 - k);
      }
      mesh.scale.setScalar(scale);
      mat.opacity = opacity;
    });

    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function spawnExplosion(pos) {
  // 💥 Boom — positional volume based on distance from camera
  playSoundEvent('explosion', { position: pos, remote: pos.distanceTo(camera.position) > 5, volume: 1.1, minGap: 80 });
  // ── Fireball (grows + fades) ──
  const fbMat = new THREE.MeshBasicMaterial({ color: 0xff7700, transparent: true, opacity: 0.92 });
  const fb = new THREE.Mesh(new THREE.SphereGeometry(0.30, 8, 6), fbMat);
  fb.position.copy(pos); scene.add(fb);

  // ── White inner flash ──
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1 });
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.18, 7, 5), coreMat);
  core.position.copy(pos); scene.add(core);

  // ── Smoke ring ──
  const smokeMat = new THREE.MeshBasicMaterial({ color: 0x444444, transparent: true, opacity: 0.55 });
  const smoke = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), smokeMat);
  smoke.position.copy(pos).setY(pos.y + 0.3); scene.add(smoke);

  // Animate over ~700ms
  let elapsed = 0;
  const DURATION = 700;
  const tick = () => {
    elapsed += 16;
    const t = Math.min(1, elapsed / DURATION);
    const easeOut = 1 - Math.pow(1 - t, 2);

    // Fireball grows 0→5 units, fades out
    fb.scale.setScalar(1 + easeOut * 14);
    fbMat.opacity = 0.92 * (1 - t);
    // White core pops and fades quickly
    core.scale.setScalar(1 + easeOut * 8);
    coreMat.opacity = Math.max(0, 1 - t * 4);
    // Smoke drifts up and expands
    smoke.position.y = pos.y + 0.3 + easeOut * 2.5;
    smoke.scale.setScalar(1 + easeOut * 6);
    smokeMat.opacity = 0.55 * (1 - t * 0.8);

    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      scene.remove(fb); scene.remove(core); scene.remove(smoke);
    }
  };
  requestAnimationFrame(tick);

  // ── Debris chunks ──
  for (let i = 0; i < 14; i++) {
    const hue = i % 3 === 0 ? 0xff4400 : (i % 3 === 1 ? 0xffaa22 : 0x888888);
    const dMat = new THREE.MeshBasicMaterial({ color: hue });
    const chunk = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, 0.055), dMat);
    chunk.position.copy(pos);
    scene.add(chunk);
    const vx = (Math.random() - 0.5) * 18, vy = Math.random() * 12 + 4, vz = (Math.random() - 0.5) * 18;
    let dvx = vx, dvy = vy, dvz = vz;
    let dt2 = 0;
    const debrisTick = () => {
      dt2 += 0.016;
      dvy -= 18 * 0.016;
      chunk.position.x += dvx * 0.016;
      chunk.position.y += dvy * 0.016;
      chunk.position.z += dvz * 0.016;
      if (chunk.position.y < 0.05) { chunk.position.y = 0.05; dvy *= -0.25; dvx *= 0.5; dvz *= 0.5; }
      chunk.rotation.x += 0.18; chunk.rotation.z += 0.13;
      if (dt2 < 1.2) requestAnimationFrame(debrisTick);
      else scene.remove(chunk);
    };
    requestAnimationFrame(debrisTick);
  }

  // ── Screen flash if close ──
  if (camera.position.distanceTo(pos) < 9) {
    const alpha = Math.max(0, 0.65 - camera.position.distanceTo(pos) / 9 * 0.65);
    const fl = document.createElement('div');
    fl.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,160,30,${alpha.toFixed(2)});pointer-events:none;z-index:89;transition:opacity 0.18s`;
    document.body.appendChild(fl);
    requestAnimationFrame(() => { fl.style.opacity = '0'; setTimeout(() => fl.remove(), 200); });
  }
}

// ── Grenade wind-up animation ──────────────────────────────────────────────
function updateGrenadeWindup(dt) {
  if (grenadeWindupT >= 1) return;
  if (activeSlot !== 'support' || SUPPORT_ITEMS[selectedSupportIdx]?.id !== 'frag') {
    grenadeWindupT = 1; return;
  }
  const model = supportModels[selectedSupportIdx];
  if (!model) { grenadeWindupT = 1; return; }

  grenadeWindupT = Math.min(1, grenadeWindupT + dt * 1000 / GRENADE_WINDUP_DUR);
  const t = grenadeWindupT;
  const lerp = (a, b, s) => a + (b - a) * s;
  let px, py, pz, rx, rz;

  if (t < 0.38) {
    // Pull arm back-up (wind-up)
    const s = t / 0.38, e = s * s;
    px = lerp(0.10, 0.17, e);
    py = lerp(-0.12, -0.02, e); // raise
    pz = lerp(-0.20, -0.10, e); // pull back
    rx = lerp(0, -0.55, e);
    rz = lerp(0, 0.38, e);
  } else if (t < 0.52) {
    // Hold + slight shake (tension before throw)
    const shake = Math.sin((t - 0.38) / 0.14 * Math.PI * 5) * 0.010;
    px = 0.17 + shake; py = -0.02; pz = -0.10;
    rx = -0.55; rz = 0.38;
  } else if (t < 0.80) {
    // Fast throw forward
    const s = (t - 0.52) / 0.28, e = 1 - Math.pow(1 - s, 3); // cubic ease-out
    px = lerp(0.17, 0.03, e);
    py = lerp(-0.02, -0.20, e);
    pz = lerp(-0.10, -0.40, e); // extend forward
    rx = lerp(-0.55, 0.90, e);
    rz = lerp(0.38, -0.18, e);
    // Spawn the actual grenade at ~70% of the throw arc
    if (!grenadeThrowFired && e >= 0.70) {
      grenadeThrowFired = true;
      model.visible = false; // hand "releases" grenade
      playSoundEvent('grenade_throw', { volume: 0.85 });
      doThrowGrenade();
    }
  } else {
    // Return to rest (empty hand)
    const s = (t - 0.80) / 0.20, e = s * (2 - s);
    px = lerp(0.03, 0.10, e);
    py = lerp(-0.20, -0.12, e);
    pz = lerp(-0.40, -0.20, e);
    rx = lerp(0.90, 0, e);
    rz = lerp(-0.18, 0, e);
    if (!model.visible) model.visible = true;
  }

  if (model.visible) {
    model.position.set(px, py, pz);
    model.rotation.set(rx, 0, rz);
  }
  if (t >= 1) {
    model.position.set(0.10, -0.12, -0.20);
    model.rotation.set(0, 0, 0);
  }
}

// ── Melee swing animation ──────────────────────────────────────────────────
const MELEE_REST_POS = new THREE.Vector3(0.10, -0.12, -0.20);

function updateMeleeSwing(dt) {
  if (meleeSwingT >= 1) return;
  if (activeSlot !== 'melee' || selectedMeleeIdx === null) { meleeSwingT = 1; return; }
  const model = meleeModels[selectedMeleeIdx];
  if (!model || !model.visible) { meleeSwingT = 1; return; }

  meleeSwingT = Math.min(1, meleeSwingT + dt * 1000 / meleeSwingDur);
  const t = meleeSwingT;
  const lerp = (a, b, s) => a + (b - a) * s;
  let px, py, pz, rx, rz;

  if (meleeSwingType === 'thrust') {
    // Pull back, then fast lunge forward, then return
    if (t < 0.28) {
      const s = t / 0.28;
      px = lerp(0.10, 0.13, s);
      py = lerp(-0.12, -0.10, s);
      pz = lerp(-0.20, -0.09, s); // pull back
      rx = lerp(0, 0.18, s);  rz = 0;
    } else if (t < 0.58) {
      const s = (t - 0.28) / 0.30;
      const e = 1 - Math.pow(1 - s, 3); // cubic ease-out: fast lunge
      px = lerp(0.13, 0.10, e);
      py = lerp(-0.10, -0.13, e);
      pz = lerp(-0.09, -0.44, e); // lunge forward
      rx = lerp(0.18, -0.08, e); rz = 0;
    } else {
      const s = (t - 0.58) / 0.42;
      const e = s * (2 - s); // ease in-out: smooth pull back to rest
      px = lerp(0.10, 0.10, e);
      py = lerp(-0.13, -0.12, e);
      pz = lerp(-0.44, -0.20, e);
      rx = lerp(-0.08, 0, e); rz = 0;
    }

  } else if (meleeSwingType === 'slam') {
    // Raise up high, then crash straight down, then bounce back up to rest
    if (t < 0.40) {
      const s = t / 0.40;
      const e = s * s; // ease-in: slow heavy raise
      px = lerp(0.10, 0.07, e);
      py = lerp(-0.12, 0.10, e);  // lift high
      pz = lerp(-0.20, -0.15, e);
      rx = lerp(0, -1.5, e);  // tilt all the way back over head
      rz = lerp(0, 0.18, e);
    } else if (t < 0.65) {
      const s = (t - 0.40) / 0.25;
      const e = 1 - Math.pow(1 - s, 2); // ease-out: fast slam
      px = lerp(0.07, 0.10, e);
      py = lerp(0.10, -0.22, e);  // crash down
      pz = lerp(-0.15, -0.34, e);
      rx = lerp(-1.5, 0.75, e);   // swing way forward
      rz = lerp(0.18, 0, e);
    } else {
      const s = (t - 0.65) / 0.35;
      const e = s * (2 - s);
      px = lerp(0.10, 0.10, e);
      py = lerp(-0.22, -0.12, e);
      pz = lerp(-0.34, -0.20, e);
      rx = lerp(0.75, 0, e);  rz = 0;
    }

  } else if (meleeSwingType === 'punch') {
    // PUNCH — fast straight jab. Alternates left/right hand each swing.
    const left = (model._punchLeft = !(model._punchLeft || false));
    const side = left ? -1 : 1;
    if (t < 0.18) {
      const s = t / 0.18;
      const e = s * s;
      px = lerp(0.10, 0.04 * side, e);   // pull back slightly to the side
      py = lerp(-0.12, -0.08, e);
      pz = lerp(-0.20, -0.10, e);
      rx = lerp(0, 0.10, e);  rz = 0;
    } else if (t < 0.40) {
      const s = (t - 0.18) / 0.22;
      const e = 1 - Math.pow(1 - s, 3); // explosive forward jab
      px = lerp(0.04 * side, 0.08, e);
      py = lerp(-0.08, -0.12, e);
      pz = lerp(-0.10, -0.42, e);
      rx = lerp(0.10, -0.05, e);  rz = 0;
    } else {
      const s = (t - 0.40) / 0.60;
      const e = s * (2 - s);
      px = lerp(0.08, 0.10, e);
      py = lerp(-0.12, -0.12, e);
      pz = lerp(-0.42, -0.20, e);
      rx = lerp(-0.05, 0, e);  rz = 0;
    }

  } else if (meleeSwingType === 'spin') {
    // SPIN — full 360° rotation around the Z axis (nunchucks, yo-yo, screwdriver)
    // No wind-up; just whip through one or two revolutions.
    const fullRot = Math.PI * 2 * 1.5; // 1.5 spins
    const e = t; // linear spin
    px = 0.10 + Math.sin(t * Math.PI * 2) * 0.04;
    py = -0.12 + Math.sin(t * Math.PI * 4) * 0.03;
    pz = lerp(-0.20, -0.30, t * (1 - t) * 4); // push forward at mid-swing
    rx = 0;
    rz = fullRot * e;

  } else if (meleeSwingType === 'stab') {
    // STAB — very fast forward jab. Minimal wind-up, snap forward, snap back.
    if (t < 0.15) {
      const s = t / 0.15;
      const e = s * s;
      px = lerp(0.10, 0.12, e);
      py = lerp(-0.12, -0.10, e);
      pz = lerp(-0.20, -0.14, e); // tiny pull back
      rx = lerp(0, 0.12, e);  rz = 0;
    } else if (t < 0.45) {
      const s = (t - 0.15) / 0.30;
      const e = 1 - Math.pow(1 - s, 4); // very fast lunge
      px = lerp(0.12, 0.09, e);
      py = lerp(-0.10, -0.14, e);
      pz = lerp(-0.14, -0.48, e); // explosive forward stab
      rx = lerp(0.12, -0.10, e); rz = 0;
    } else {
      const s = (t - 0.45) / 0.55;
      const e = s * (2 - s);
      px = lerp(0.09, 0.10, e);
      py = lerp(-0.14, -0.12, e);
      pz = lerp(-0.48, -0.20, e);
      rx = lerp(-0.10, 0, e); rz = 0;
    }

  } else if (meleeSwingType === 'bash') {
    // BASH — shield/umbrella forward shove. Push the whole model forward without rotation.
    if (t < 0.20) {
      const s = t / 0.20;
      const e = s * s;
      px = lerp(0.10, 0.10, e);
      py = lerp(-0.12, -0.10, e);
      pz = lerp(-0.20, -0.10, e); // pull back to wind up
      rx = lerp(0, -0.15, e); rz = 0;
    } else if (t < 0.50) {
      const s = (t - 0.20) / 0.30;
      const e = 1 - Math.pow(1 - s, 3);
      px = lerp(0.10, 0.10, e);
      py = lerp(-0.10, -0.12, e);
      pz = lerp(-0.10, -0.42, e); // explosive shield push
      rx = lerp(-0.15, 0.05, e); rz = 0;
    } else {
      const s = (t - 0.50) / 0.50;
      const e = s * (2 - s);
      px = lerp(0.10, 0.10, e);
      py = lerp(-0.12, -0.12, e);
      pz = lerp(-0.42, -0.20, e);
      rx = lerp(0.05, 0, e); rz = 0;
    }

  } else if (meleeSwingType === 'chop') {
    // CHOP — fast vertical down-strike, less wind-up than slam (for crowbar/fire axe)
    if (t < 0.22) {
      const s = t / 0.22;
      const e = s * s;
      px = lerp(0.10, 0.09, e);
      py = lerp(-0.12, 0.04, e);    // raise modest amount
      pz = lerp(-0.20, -0.18, e);
      rx = lerp(0, -0.90, e);        // tilt back ~50°
      rz = lerp(0, 0.10, e);
    } else if (t < 0.50) {
      const s = (t - 0.22) / 0.28;
      const e = 1 - Math.pow(1 - s, 3);
      px = lerp(0.09, 0.10, e);
      py = lerp(0.04, -0.20, e);     // chop down
      pz = lerp(-0.18, -0.32, e);
      rx = lerp(-0.90, 0.50, e);
      rz = lerp(0.10, 0, e);
    } else {
      const s = (t - 0.50) / 0.50;
      const e = s * (2 - s);
      px = lerp(0.10, 0.10, e);
      py = lerp(-0.20, -0.12, e);
      pz = lerp(-0.32, -0.20, e);
      rx = lerp(0.50, 0, e); rz = 0;
    }

  } else {
    // SLASH — wide horizontal arc, right shoulder → forward → left
    if (t < 0.27) {
      const s = t / 0.27;
      const e = s * s; // ease-in: wind up
      px = lerp(0.10, 0.18, e);   // shift right
      py = lerp(-0.12, -0.05, e); // raise
      pz = lerp(-0.20, -0.16, e);
      rx = lerp(0, -0.38, e);     // tilt back
      rz = lerp(0, -0.60, e);     // rotate to right-up
    } else if (t < 0.60) {
      const s = (t - 0.27) / 0.33;
      const e = 1 - Math.pow(1 - s, 2); // ease-out: fast swing
      px = lerp(0.18, 0.01, e);   // sweep left
      py = lerp(-0.05, -0.20, e); // arc down
      pz = lerp(-0.16, -0.32, e); // push forward
      rx = lerp(-0.38, 0.32, e);
      rz = lerp(-0.60, 0.70, e);  // big arc
    } else {
      const s = (t - 0.60) / 0.40;
      const e = s * (2 - s);
      px = lerp(0.01, 0.10, e);
      py = lerp(-0.20, -0.12, e);
      pz = lerp(-0.32, -0.20, e);
      rx = lerp(0.32, 0, e);
      rz = lerp(0.70, 0, e);
    }
  }

  model.position.set(px, py, pz);
  model.rotation.set(rx, 0, rz);

  if (t >= 1) {
    model.position.copy(MELEE_REST_POS);
    model.rotation.set(0, 0, 0);
  }
}

// ── Match system ───────────────────────────────────────────────────────────
// ── 🎮 Arcade mode helpers ──────────────────────────────────────────────
// Gun Game tier ladder (weak → strong → knife at the top to "win"). Player advances on each kill.
const GUN_GAME_TIERS = [
  'pistol', 'cycler', 'machine_pistol', 'sg8', 'mp40',
  'ak20', 'sg100', 'srx', 'rpd', 'paintball',
  'burst', 'flamethrower', 'vector', 'crossbow', 'lever',
  'minigun', 'railgun', 'boombow', 'auto_shotgun', 'hand_cannon',
  'knife', // final tier — kill with knife to win
];
const SPEEDRUN_KILL_GOAL = 20;

// Called from startMatchRound once bots exist — handles each mode's start state
function setupArcadeStart(subtype) {
  if (!match) return;
  switch (subtype) {
    case 'gungame': {
      // Everyone (player + bots) starts at tier 0
      const startWeapon = GUN_GAME_TIERS[0];
      for (const b of gameBots) {
        match.gunTier[b.id] = 0;
        b.weaponId = startWeapon; // force all bots to the starter weapon
        b.team = 'enemy';         // FFA: every bot is hostile
        if (players[b.id]) players[b.id].weaponId = startWeapon;
      }
      match.gunTier[myId] = 0;
      forcePlayerWeapon(startWeapon);
      showAnnouncement('🔫 GUN GAME', `Climb ${GUN_GAME_TIERS.length} weapon tiers · knife wins!`, '#ff44ff', 3000);
      return;
    }
    case 'oitc': {
      // One in the Chamber: force pistol everywhere, every shot 1-hit kill.
      // Player gets 1 bullet; bots' fire is just their normal pistol cadence.
      forcePlayerWeapon('pistol');
      const idx = WEAPONS.findIndex(w => w.id === 'pistol');
      if (idx >= 0) weaponAmmo[idx] = { ammo: 1, reserve: 0 };
      // Force every bot to pistol too — and FFA them
      for (const b of gameBots) {
        b.weaponId = 'pistol';
        b.team = 'enemy';
        if (players[b.id]) players[b.id].weaponId = 'pistol';
      }
      // Override pistol damage to 999 while in this match — restored when match ends
      const pw = WEAPONS.find(w => w.id === 'pistol');
      if (pw) {
        match._oitcOrigDmg = pw.damage;
        pw.damage = 999;
        if (currentWeapon && currentWeapon.id === 'pistol') currentWeapon.damage = 999;
      }
      updateAmmoHUD();
      showAnnouncement('🎯 ONE IN THE CHAMBER', '1 bullet · 1-shot kill · refill on kill', '#ffcc22', 3000);
      return;
    }
    case 'jugg': {
      // Juggernaut: 50% chance player starts as juggernaut, else random bot
      const candidates = [myId, ...gameBots.filter(b => !b.dead).map(b => b.id)];
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      match.juggernautId = pick;
      if (pick === myId) {
        // Player becomes the juggernaut: 1000 HP + admin gun
        const me = players[myId]; if (me) { me.hp = 1000; updateHealthHUD(1000); }
        forcePlayerWeapon('gau19'); // admin item — works even if not unlocked, for arcade
        showAnnouncement('🛡️ YOU ARE JUGGERNAUT', '1000 HP · GAU-19 · kill them all', '#ff2222', 3000);
      } else {
        const bot = gameBots.find(b => b.id === pick);
        if (bot) { bot.hp = 1000; bot.maxHp = 1000; bot.weaponId = 'gau19'; }
        showAnnouncement('🛡️ JUGGERNAUT', `${players[pick]?.name || 'A bot'} is the juggernaut!`, '#ff2222', 3000);
      }
      return;
    }
    case 'infect': {
      // 1 random bot starts as the zombie (uses knife) — others must survive
      const startZombie = gameBots[Math.floor(Math.random() * gameBots.length)];
      if (startZombie) {
        match.infectedIds[startZombie.id] = true;
        startZombie.weaponId = 'knife'; // melee-only zombie
        startZombie.team = 'enemy';     // they hunt the player
      }
      showAnnouncement('🧟 INFECTION', 'Zombies infect on hit · last human wins!', '#44ff44', 3000);
      return;
    }
    case 'sniper': {
      forcePlayerWeapon('srx');
      // Force bots to SR-X too
      for (const b of gameBots) b.weaponId = 'srx';
      showAnnouncement('🔭 SNIPER ONLY', 'SR-X only · long-range chess match', '#aaeeff', 3000);
      return;
    }
    case 'speedrun': {
      match.speedrunStart = 0;
      match.speedrunKills = 0;
      showAnnouncement('⏱️ SPEEDRUN', `Kill ${SPEEDRUN_KILL_GOAL} bots as fast as possible!`, '#ff8844', 3000);
      // Personal best display
      const pb = parseFloat(localStorage.getItem('pvp_speedrun_pb') || '0');
      if (pb > 0) showAnnouncement('🏅 YOUR PB', `${pb.toFixed(1)}s`, '#ffcc44', 2200);
      return;
    }
  }
}

function initArcadeMode(subtype) {
  if (!match) return;
  // Gun Game: everyone starts at tier 0
  if (subtype === 'gungame') {
    match.gunTier[myId] = 0;
    // bots will get gun tiers after they spawn
  }
  // Juggernaut: random player starts as juggernaut (50% chance for player, else a bot — set after bots spawn)
  // (handled in startMatchRound)
  // Infection: 1 random infected (set in startMatchRound after bots spawn)
}

// Override a player's primary weapon (used by sniper-only, gun-game, etc.)
function forcePlayerWeapon(weaponId, slot = 'primary') {
  const idx = WEAPONS.findIndex(w => w.id === weaponId);
  if (idx < 0) return;
  if (slot === 'primary') selectedPrimaryIdx = idx;
  else selectedSecondaryIdx = idx;
  const w = WEAPONS[idx];
  weaponAmmo[idx] = { ammo: w.mag, reserve: w.reserve };
  activeSlot = slot;
  currentWeaponIdx = idx; currentWeapon = w;
  weaponModels.forEach(m => m.visible = false);
  if (weaponModels[idx]) weaponModels[idx].visible = true;
  updateAmmoHUD(); updateWeaponHUD(); updateWeaponSelector();
}

// Advance a player's or bot's gun tier (called on any kill in Gun Game)
function gunGameAdvance(killerId) {
  if (match?.arcade !== 'gungame') return;
  const cur = match.gunTier[killerId] || 0;
  const next = cur + 1;
  match.gunTier[killerId] = next;
  if (killerId === myId) {
    if (next >= GUN_GAME_TIERS.length) {
      // Won! Last tier (knife) kill → victory
      endMatch('ally', `🏆 GUN GAME WIN · You climbed the ladder!`);
      return;
    }
    const newWeapon = GUN_GAME_TIERS[next];
    if (newWeapon === 'knife') {
      // Final tier — give them the knife as melee
      const knifeIdx = MELEE_ITEMS.findIndex(m => m.id === 'knife');
      if (knifeIdx >= 0) selectedMeleeIdx = knifeIdx;
      activeSlot = 'melee';
      showAnnouncement('⚔️ FINAL TIER', 'Get a knife kill to win!', '#ff44ff', 2500);
    } else {
      forcePlayerWeapon(newWeapon);
      showAnnouncement(`TIER ${next + 1}/${GUN_GAME_TIERS.length}`, newWeapon.toUpperCase(), '#ff44ff', 1800);
    }
  } else {
    // Bot got a kill — advance their weapon too so they keep up
    const bot = gameBots.find(b => b.id === killerId);
    if (bot) {
      if (next >= GUN_GAME_TIERS.length) {
        endMatch('enemy', `💀 ${players[killerId]?.name || 'A bot'} climbed the ladder first!`);
        return;
      }
      const newWeapon = GUN_GAME_TIERS[next];
      bot.weaponId = newWeapon;
      if (players[bot.id]) players[bot.id].weaponId = newWeapon;
      // Show a small notice so the player can see who's catching up
      if (next >= 15) showAnnouncement('⚠️ THREAT', `${players[killerId]?.name || 'A bot'} reached tier ${next + 1}!`, '#ff8844', 1400);
    }
  }
}

function initMatch() {
  const cfg = selectedModeConfig;
  if (!cfg) return;
  frontlineState = null;
  lastStandState = null;
  match = {
    type: cfg.type,                        // 'elim' | 'race' | 'ffa' | 'frontlines' | 'laststand' | 'br'
    cfg,
    // Elimination
    round: 1,
    roundWins: { ally: 0, enemy: 0 },
    roundActive: false,
    aliveAllies:  new Set(),
    aliveEnemies: new Set(),
    playerAlive: true,
    // Race / FFA
    teamKills: { ally: 0, enemy: 0 },
    ffaKills: {},                          // entityId → kills
    timeLeft: cfg.timeLimit || 0,
    // King-of-the-Hill / BR: per-entity lives
    lives: {},                             // entityId → lives remaining
    // 🎮 Arcade mode state
    arcade: cfg.subtype || null,           // gungame | oitc | jugg | infect | sniper | speedrun
    gunTier: {},                           // entityId → gun tier index (Gun Game)
    juggernautId: null,                    // entityId of the juggernaut (Juggernaut)
    infectedIds: {},                       // entityId → true (Infection: who's a zombie)
    speedrunStart: 0,                      // timestamp first kill (Speedrun)
    speedrunKills: 0,                      // (Speedrun)
    // Common
    active: false,
    over: false,
    tiebreaker: false,
  };
  // Init lives for BR mode
  if (cfg.type === 'br') {
    const livesEach = cfg.livesPerPlayer || 3;
    match.lives[myId] = livesEach;
    // Bot lives initialized after they spawn (in startMatchRound)
  }
  // 🎮 Init for arcade modes
  if (cfg.type === 'arcade') initArcadeMode(cfg.subtype);
  if (cfg.type === 'frontlines') initFrontlines();
  if (cfg.type === 'laststand')  initLastStand();
  if (cfg.type === 'dday')       initDDay();
  if (cfg.type === 'range')      initRange();
}

// ── Pre-round 5-second countdown, then fires callback ─────────────────────
// Helper: true if the loadout screen is currently visible (player is mid-pick)
function isLoadoutOpen() {
  const el = document.getElementById('loadout-screen');
  return el && el.style.display !== 'none' && el.style.display !== '';
}

let countdownActive = false; // gates firing/abilities during pre-round countdown
function runCountdown(seconds, onDone) {
  const overlay = document.getElementById('countdown-overlay');
  const lblEl   = document.getElementById('countdown-label');
  let remaining  = seconds;
  countdownActive = true;

  function tick() {
    // PAUSE: if the loadout screen is open, hide countdown + re-check every 0.5s without ticking down
    if (isLoadoutOpen()) {
      overlay.style.display = 'none';
      setTimeout(tick, 500);
      return;
    }
    if (remaining <= 0) {
      overlay.style.display = 'none';
      countdownActive = false;
      onDone();
      return;
    }
    overlay.style.display = 'flex';

    // Re-trigger CSS pop animation by replacing the node each tick
    const parent = document.getElementById('countdown-number').parentNode;
    const oldNum = document.getElementById('countdown-number');
    const newNum = document.createElement('div');
    newNum.id = 'countdown-number';
    newNum.textContent = remaining;
    parent.replaceChild(newNum, oldNum);

    lblEl.textContent = remaining === 1 ? 'GO!' : 'GET READY';
    remaining--;
    setTimeout(tick, 1000);
  }
  tick();
}

function startMatchRound() {
  if (!match) return;
  // Show countdown, then actually start
  const doStart = () => {
    // Hard guard: if loadout opened between countdown end and now, wait for confirm
    if (isLoadoutOpen()) { setTimeout(doStart, 400); return; }
    // For elim rounds: respawn the player now (after countdown)
    if (isDead) {
      isDead = false;
      placePlayerAtTeamSpawn(localPlayerTeam(), 24, 38);
      socket.emit('readyRespawn', { x: camera.position.x, z: camera.position.z });
      requestPointerLockSafe();
    }
    match.roundActive = true;
    match.active = true;
    // Grant player a 2s spawn shield
    grantSpawnShield(3000);
    if (match.type === 'elim') {
      match.aliveAllies  = new Set(gameBots.filter(b => b.team === 'ally'  && !b.dead).map(b => b.id));
      match.aliveEnemies = new Set(gameBots.filter(b => b.team === 'enemy' && !b.dead).map(b => b.id));
      match.playerAlive  = !isDead;
      // 🧑‍🤝‍🧑 Track REMOTE HUMAN opponents too — they aren't in gameBots.
      // An opponent on my team → aliveAllies; otherwise → aliveEnemies.
      if (pvpMatch && pvpMatch.opponents) {
        for (const opp of pvpMatch.opponents) {
          if (!opp.socketId) continue;
          if (opp.team === pvpMatch.team) match.aliveAllies.add(opp.socketId);
          else                            match.aliveEnemies.add(opp.socketId);
        }
      }
      // Start the 60-second per-round timer
      match.roundTimeLeft = match.cfg.roundTimeLimit || 0;
      const subTxt = `First to ${match.cfg.winsNeeded} round wins`;
      showAnnouncement(`ROUND ${match.round}`, subTxt, '#ffffff', 2800);
    } else if (match.type === 'race') {
      showAnnouncement('MATCH START', `First to ${match.cfg.killGoal} kills · ${formatMatchTime(match.cfg.timeLimit)}`, '#ffffff', 2800);
    } else if (match.type === 'frontlines') {
      showAnnouncement('FRONTLINES', 'Push the battle line to their base!', '#4cff4c', 2800);
    } else if (match.type === 'dday') {
      showAnnouncement('D-DAY', 'Defend the hill! Enemies incoming!', '#ff9944', 2800);
      setTimeout(() => startDDayPhase('grenades'), 3000);
    } else if (match.type === 'laststand') {
      // laststand waves are managed by initLastStand / startNextWave
    } else if (match.type === 'range') {
      showAnnouncement('SHOOTING RANGE', 'Hit the targets · No enemies!', '#44ddff', 2800);
      grantSpawnShield(0);
    } else if (match.type === 'br') {
      // Init bot lives now that bots exist
      const livesEach = match.cfg.livesPerPlayer || 3;
      for (const bot of gameBots) match.lives[bot.id] = livesEach;
      showAnnouncement('👑 KING OF THE HILL', `${gameBots.length + 1} players · 3 lives each · last alive wins`, '#ffaa44', 3200);
    } else if (match.type === 'arcade') {
      setupArcadeStart(match.arcade);
    } else {
      showAnnouncement('MATCH START', `Most kills in ${formatMatchTime(match.cfg.timeLimit)}`, '#ffffff', 2800);
    }
    updateMatchHUD();
    // 💡 Show a fun fact ~3 s after the MATCH START banner clears
    setTimeout(() => {
      if (match && !match.over) showAnnouncement('💡 DID YOU KNOW?', pickFunFact(), '#ffcc66', 5500);
    }, 3000);
  };
  runCountdown(5, doStart);
}

function showAnnouncement(text, sub, color, duration) {
  const el = document.getElementById('match-announce');
  const tEl = document.getElementById('announce-text');
  const sEl = document.getElementById('announce-sub');
  tEl.textContent = text; tEl.style.color = color || '#fff';
  sEl.textContent = sub || '';
  el.style.display = 'flex'; el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => { el.style.display = 'none'; el.style.opacity = '1'; }, 420);
  }, duration - 420);
}

function updateMatchHUD() {
  if (!match) return;
  const hud = document.getElementById('match-hud');
  hud.style.display = 'flex';
  const L = document.getElementById('match-left');
  const C = document.getElementById('match-center');
  const R = document.getElementById('match-right');
  if (match.type === 'elim') {
    const w = match.cfg.winsNeeded;
    L.textContent = `YOUR TEAM  ${match.roundWins.ally}/${w}`;
    // Show round number + round timer countdown (when active)
    const t = match.roundTimeLeft;
    if (match.roundActive && t != null && t > 0) {
      C.textContent = `R${match.round}  ·  ${formatMatchTime(t)}`;
      // Tint red in the last 10 seconds
      C.style.color = t < 10 ? '#ff5555' : '';
    } else {
      C.textContent = `R${match.round}`;
      C.style.color = '';
    }
    R.textContent = `${match.roundWins.enemy}/${w}  ENEMY`;
  } else if (match.type === 'race') {
    const g = match.cfg.killGoal;
    L.textContent = `ALLY  ${match.teamKills.ally}/${g}`;
    C.textContent = formatMatchTime(match.timeLeft);
    R.textContent = `${match.teamKills.enemy}/${g}  ENEMY`;
  } else if (match.type === 'frontlines') {
    L.textContent = 'ALLY ◀';
    if (frontlineState) {
      const pct = Math.round((frontlineState.z + 38) / 76 * 100);
      const allyBlocks  = Math.round((100 - pct) / 20);
      const enemyBlocks = Math.round(pct / 20);
      C.textContent = `${'█'.repeat(allyBlocks)}${'░'.repeat(5-allyBlocks)}|${'░'.repeat(5-enemyBlocks)}${'█'.repeat(enemyBlocks)}`;
    } else { C.textContent = '░░░░░|░░░░░'; }
    R.textContent = '▶ ENEMY';
  } else if (match.type === 'dday') {
    const dd = ddayState;
    L.textContent = dd ? `WAVE ${dd.wavesSent}/3` : '---';
    C.textContent = dd ? `${dd.enemiesAlive} ENEMIES` : '---';
    R.textContent = dd ? (dd.phase === 'complete' ? 'CLEAR!' : dd.phase.toUpperCase()) : '---';
  } else if (match.type === 'laststand') {
    const ls = lastStandState;
    L.textContent = ls ? `WAVE ${ls.wave}` : '---';
    C.textContent = ls && ls.phase === 'fight' ? `${gameBots.filter(b=>b.team==='enemy'&&!b.dead).length} LEFT` : ls ? `BUY ${Math.ceil(ls.buyTimer)}s` : '---';
    R.textContent = ls ? `COINS: ${ls.coins}` : '---';
  } else if (match.type === 'range') {
    L.textContent = `SHOTS ${rangeStats.shots}`;
    C.textContent = 'RANGE';
    R.textContent = `ACC ${rangeStats.shots > 0 ? Math.round(rangeStats.hits / rangeStats.shots * 100) : 0}%`;
  } else if (match.type === 'br') {
    const myLives = match.lives[myId] ?? 0;
    const alive = Object.values(match.lives).filter(v => v > 0).length;
    L.textContent = `❤️ ${myLives}/${match.cfg.livesPerPlayer || 3} LIVES`;
    C.textContent = `👑 KING OF THE HILL`;
    R.textContent = `${alive} PLAYERS ALIVE`;
  } else if (match.type === 'arcade') {
    const sub = match.arcade;
    if (sub === 'gungame') {
      const t = match.gunTier[myId] || 0;
      L.textContent = `TIER ${t + 1}/${GUN_GAME_TIERS.length}`;
      C.textContent = `🔫 GUN GAME`;
      R.textContent = GUN_GAME_TIERS[t]?.toUpperCase() || '';
    } else if (sub === 'speedrun') {
      const elapsed = match.speedrunStart ? (Date.now() - match.speedrunStart) / 1000 : 0;
      L.textContent = `KILLS ${match.speedrunKills}/${SPEEDRUN_KILL_GOAL}`;
      C.textContent = `⏱️ ${elapsed.toFixed(1)}s`;
      R.textContent = `PB ${localStorage.getItem('pvp_speedrun_pb') || '—'}s`;
    } else if (sub === 'jugg') {
      const juggName = match.juggernautId === myId ? 'YOU' : (players[match.juggernautId]?.name || '???');
      L.textContent = `🛡️ JUGG: ${juggName}`;
      C.textContent = `JUGGERNAUT`;
      R.textContent = `YOUR KILLS: ${match.ffaKills[myId] || 0}`;
    } else if (sub === 'infect') {
      const zCount = Object.keys(match.infectedIds).length;
      L.textContent = `🧟 ${zCount} INFECTED`;
      C.textContent = `INFECTION`;
      R.textContent = match.infectedIds[myId] ? 'YOU ARE ZOMBIE' : 'YOU ARE HUMAN';
    } else if (sub === 'oitc') {
      const idx = WEAPONS.findIndex(w => w.id === 'pistol');
      const ammo = idx >= 0 ? weaponAmmo[idx]?.ammo : 0;
      L.textContent = `BULLETS: ${ammo}`;
      C.textContent = `🎯 ONE IN THE CHAMBER`;
      R.textContent = `KILLS: ${match.ffaKills[myId] || 0}`;
    } else {
      L.textContent = `KILLS: ${match.ffaKills[myId] || 0}`;
      C.textContent = `🎮 ARCADE`;
      R.textContent = formatMatchTime(match.timeLeft);
    }
  } else {
    const pk = match.ffaKills[myId] || 0;
    const topBot = Object.entries(match.ffaKills).filter(([k]) => k !== myId).sort(([,a],[,b]) => b-a)[0];
    L.textContent = `YOU: ${pk} kills`;
    C.textContent = formatMatchTime(match.timeLeft);
    R.textContent = topBot ? `TOP BOT: ${topBot[1]}` : '';
  }
}

// 🎮 Handle a kill in an arcade mode
function handleArcadeKill(targetId, killerId) {
  if (!match) return;
  const sub = match.arcade;
  // Gun Game: each kill upgrades the killer's weapon tier
  if (sub === 'gungame') {
    if (killerId) gunGameAdvance(killerId);
    // Also: auto-respawn the dead player/bot after 3s with their current tier
    if (targetId === myId) scheduleArcadeRespawn();
    else scheduleBotArcadeRespawn(targetId);
    return;
  }
  // One in the Chamber: killer gets 1 bullet back, victim respawns
  if (sub === 'oitc') {
    if (killerId === myId) {
      const idx = WEAPONS.findIndex(w => w.id === 'pistol');
      if (idx >= 0) { weaponAmmo[idx] = { ammo: 1, reserve: 0 }; updateAmmoHUD(); }
    }
    // Score = ffaKills
    match.ffaKills[killerId] = (match.ffaKills[killerId] || 0) + 1;
    if (targetId === myId) scheduleArcadeRespawn();
    else scheduleBotArcadeRespawn(targetId);
    updateMatchHUD();
    return;
  }
  // Juggernaut: if the juggernaut dies, killer becomes the new juggernaut
  if (sub === 'jugg') {
    if (targetId === match.juggernautId) {
      // Transfer juggernaut to killer
      const oldJugg = match.juggernautId;
      match.juggernautId = killerId;
      if (killerId === myId) {
        const me = players[myId]; if (me) { me.hp = 1000; updateHealthHUD(1000); }
        forcePlayerWeapon('gau19');
        showAnnouncement('🛡️ YOU ARE JUGGERNAUT', '1000 HP · GAU-19 · kill them all', '#ff2222', 2500);
      } else {
        const bot = gameBots.find(b => b.id === killerId);
        if (bot) { bot.hp = 1000; bot.maxHp = 1000; bot.weaponId = 'gau19'; }
        showAnnouncement('🛡️ NEW JUGGERNAUT', `${players[killerId]?.name || 'A bot'} took the crown`, '#ff2222', 2200);
      }
    }
    match.ffaKills[killerId] = (match.ffaKills[killerId] || 0) + 1;
    if (targetId === myId) scheduleArcadeRespawn();
    else scheduleBotArcadeRespawn(targetId);
    updateMatchHUD();
    return;
  }
  // Infection: if a zombie kills someone, that someone becomes a zombie
  if (sub === 'infect') {
    const killerIsZombie = match.infectedIds[killerId];
    if (killerIsZombie && targetId !== myId) {
      // Bot becomes zombie
      match.infectedIds[targetId] = true;
      const bot = gameBots.find(b => b.id === targetId);
      if (bot) { bot.weaponId = 'knife'; bot.team = 'enemy'; }
      showAnnouncement('🧟 INFECTED', `${players[targetId]?.name || 'Someone'} turned!`, '#44ff44', 1600);
    } else if (killerIsZombie && targetId === myId) {
      // Player turned — they lose
      endMatch('enemy', '🧟 INFECTED — You\'re a zombie now');
      return;
    }
    // Check win condition: all bots infected = humans lost; no zombies left = humans won
    const livingBots = gameBots.filter(b => !b.dead);
    const allInfected = livingBots.every(b => match.infectedIds[b.id]);
    const noZombies = livingBots.every(b => !match.infectedIds[b.id]);
    if (allInfected && !isDead) {
      endMatch('enemy', '🧟 LAST HUMAN STANDING... not quite');
    } else if (noZombies) {
      endMatch('ally', '🏆 ZOMBIES ELIMINATED');
    }
    if (targetId === myId) scheduleArcadeRespawn();
    else scheduleBotArcadeRespawn(targetId);
    return;
  }
  // Sniper Only: standard FFA kill counting + respawn
  if (sub === 'sniper') {
    match.ffaKills[killerId] = (match.ffaKills[killerId] || 0) + 1;
    if (targetId === myId) scheduleArcadeRespawn();
    else scheduleBotArcadeRespawn(targetId);
    updateMatchHUD();
    return;
  }
  // Speedrun: count player kills, time tracked, end at goal
  if (sub === 'speedrun') {
    if (killerId === myId) {
      if (!match.speedrunStart) match.speedrunStart = Date.now();
      match.speedrunKills++;
      if (match.speedrunKills >= SPEEDRUN_KILL_GOAL) {
        const elapsedSec = (Date.now() - match.speedrunStart) / 1000;
        const pb = parseFloat(localStorage.getItem('pvp_speedrun_pb') || '0');
        let pbMsg = '';
        if (pb === 0 || elapsedSec < pb) {
          localStorage.setItem('pvp_speedrun_pb', elapsedSec.toFixed(2));
          pbMsg = '🏅 NEW PERSONAL BEST!';
        } else {
          pbMsg = `PB: ${pb.toFixed(1)}s (this: ${elapsedSec.toFixed(1)}s)`;
        }
        endMatch('ally', `⏱️ SPEEDRUN COMPLETE · ${elapsedSec.toFixed(2)}s\n${pbMsg}`);
        return;
      }
    }
    if (targetId === myId) {
      // Speedrun fail
      endMatch('enemy', `💀 SPEEDRUN FAILED · ${match.speedrunKills}/${SPEEDRUN_KILL_GOAL}`);
      return;
    }
    if (targetId !== myId) scheduleBotArcadeRespawn(targetId);
    updateMatchHUD();
    return;
  }
}

// Respawn the player after a brief delay (arcade modes are usually instant-respawn)
function scheduleArcadeRespawn() {
  setTimeout(() => {
    if (!match || match.over || !isDead) return;
    isDead = false;
    const me = players[myId];
    if (me) { me.hp = (match.juggernautId === myId) ? 1000 : 300; updateHealthHUD(me.hp); }
    placePlayerAtTeamSpawn(localPlayerTeam(), 24, 38);
    grantSpawnShield(2000);
    document.getElementById('death-screen').style.display = 'none';
    document.getElementById('waiting-screen').style.display = 'none';
    socket.emit('readyRespawn', { x: camera.position.x, z: camera.position.z });
    requestPointerLockSafe();
  }, 2500);
}
function scheduleBotArcadeRespawn(botId) {
  const bot = gameBots.find(b => b.id === botId);
  if (!bot) return;
  setTimeout(() => {
    if (!bot || match?.over) return;
    const ang = Math.random() * Math.PI * 2;
    const r = 30 + Math.random() * 15;
    bot.x = Math.cos(ang) * r; bot.z = Math.sin(ang) * r;
    bot.hp = (match.juggernautId === botId) ? 1000 : 300;
    bot.dead = false; bot.prevHp = bot.hp; bot.stuckTimer = 0;
    if (players[bot.id]) { players[bot.id].hp = bot.hp; players[bot.id].dead = false; }
    const mesh = remoteMeshes[bot.id];
    if (mesh) { mesh.position.set(bot.x, 0, bot.z); mesh.visible = true; }
    socket.emit('forceRespawnBot', { botId: bot.id, x: bot.x, z: bot.z });
  }, 2500);
}

function checkBrWin() {
  if (!match || match.type !== 'br' || match.over) return;
  // Count entities with lives > 0
  let alive = 0;
  let lastAliveId = null;
  for (const [id, lives] of Object.entries(match.lives)) {
    if (lives > 0) { alive++; lastAliveId = id; }
  }
  if (alive <= 1) {
    if (lastAliveId === myId) endMatch('ally', '👑 LAST ONE STANDING!');
    else endMatch('enemy', '💀 BETTER LUCK NEXT TIME');
  }
}

function onEntityDied(targetId, killerId) {
  if (!match || match.over) return;
  if (match.tiebreaker) {
    // Whoever dies first loses the match
    if (targetId === myId) endMatch('enemy', 'TIEBREAKER — You fell first');
    else endMatch('ally', 'TIEBREAKER — You survived!');
    return;
  }
  // ── 🎮 ARCADE MODES ──────────────────────────────────────────────────
  if (match.type === 'arcade') {
    handleArcadeKill(targetId, killerId);
    return;
  }
  // ── 👑 KING OF THE HILL / BR mode ──────────────────────────────────────
  if (match.type === 'br') {
    // Decrement lives
    const remaining = Math.max(0, (match.lives[targetId] || 0) - 1);
    match.lives[targetId] = remaining;
    // Show life update for player
    if (targetId === myId) {
      if (remaining > 0) {
        showAnnouncement('💔 LIFE LOST', `${remaining}/${match.cfg.livesPerPlayer || 3} lives remaining`, '#ffaa44', 2000);
        // Auto-respawn after 4s at random map position
        setTimeout(() => {
          if (!match || match.over || !isDead) return;
          const ang = Math.random() * Math.PI * 2;
          const r = 80 + Math.random() * 30;
          isDead = false;
          const me = players[myId];
          if (me) { me.hp = 300; updateHealthHUD(300); }
          camera.position.set(Math.cos(ang) * r, 1.65, Math.sin(ang) * r);
          euler.y = ang + Math.PI; camera.quaternion.setFromEuler(euler);
          grantSpawnShield(3000);
          document.getElementById('death-screen').style.display = 'none';
          document.getElementById('waiting-screen').style.display = 'none';
          socket.emit('readyRespawn', { x: camera.position.x, z: camera.position.z });
          requestPointerLockSafe();
        }, 4000);
      } else {
        showAnnouncement('💀 ELIMINATED', 'You\'re out of lives', '#ff2222', 3000);
      }
    } else {
      // Bot died — respawn if it has lives left
      const bot = gameBots.find(b => b.id === targetId);
      if (bot && remaining > 0) {
        setTimeout(() => {
          if (!bot || match?.over) return;
          const ang = Math.random() * Math.PI * 2;
          const r = 90 + Math.random() * 25;
          bot.x = Math.cos(ang) * r; bot.z = Math.sin(ang) * r;
          bot.hp = 300; bot.dead = false; bot.prevHp = 300; bot.stuckTimer = 0;
          if (players[bot.id]) { players[bot.id].hp = 300; players[bot.id].dead = false; }
          const mesh = remoteMeshes[bot.id];
          if (mesh) { mesh.position.set(bot.x, 0, bot.z); mesh.visible = true; }
          socket.emit('forceRespawnBot', { botId: bot.id, x: bot.x, z: bot.z });
        }, 4000);
      }
    }
    checkBrWin();
    return;
  }
  if (match.type === 'elim') {
    if (targetId === myId) match.playerAlive = false;
    else {
      const b = gameBots.find(g => g.id === targetId);
      if (b) {
        if (b.team === 'ally')  match.aliveAllies.delete(targetId);
        else                    match.aliveEnemies.delete(targetId);
      } else {
        // Remote HUMAN opponent died — remove from whichever set holds them
        match.aliveAllies.delete(targetId);
        match.aliveEnemies.delete(targetId);
      }
    }
    checkElimRound();
  } else if (match.type === 'race') {
    // Credit kill to killer's team
    if (killerId === myId) {
      match.teamKills.ally++;
    } else {
      const kb = gameBots.find(g => g.id === killerId);
      if (kb) { if (kb.team === 'ally') match.teamKills.ally++; else match.teamKills.enemy++; }
    }
    checkRaceWin();
    updateMatchHUD();
  } else if (match.type === 'frontlines') {
    onFrontlinesKill(targetId, killerId);
  } else if (match.type === 'laststand') {
    onLastStandKill(killerId, targetId);
  } else if (match.type === 'dday') {
    onDDayKill(targetId, killerId);
  } else if (match.type === 'range') {
    if (targetId !== myId) {
      rangeStats.hits++;
      updateRangeHUD();
      updateMatchHUD();
      const rt = rangeTargets.find(r => r.id === targetId);
      if (rt) {
        rt.respawnAt = Date.now() + 2000;
        const bot = gameBots.find(b => b.id === targetId);
        if (bot) bot.dead = true;
        if (players[targetId]) players[targetId].dead = true;
        const mesh = remoteMeshes[targetId];
        if (mesh) mesh.rotation.x = Math.PI / 2; // tip target over
      }
    }
    return; // never call endMatch in range mode
  } else { // ffa
    if (killerId === myId) match.ffaKills[myId] = (match.ffaKills[myId] || 0) + 1;
    else {
      const kb = gameBots.find(g => g.id === killerId);
      if (kb) match.ffaKills[kb.id] = (match.ffaKills[kb.id] || 0) + 1;
    }
    updateMatchHUD();
  }
}

function checkElimRound() {
  if (!match || !match.roundActive) return;
  const allyAlive  = match.playerAlive || match.aliveAllies.size  > 0;
  const enemyAlive = match.aliveEnemies.size > 0;
  if (allyAlive && enemyAlive) return; // round still ongoing
  match.roundActive = false;
  if (!allyAlive && !enemyAlive) {
    showAnnouncement('DRAW', 'Round replayed', '#aaaaaa', 2500);
    setTimeout(() => restartElimRound(null), 2600);
  } else if (!enemyAlive) {
    match.roundWins.ally++;
    updateMatchHUD();
    updateRoundScoreDisplay();
    if (match.roundWins.ally >= match.cfg.winsNeeded) {
      showAnnouncement('YOUR TEAM WINS!', `${match.roundWins.ally} – ${match.roundWins.enemy}`, '#4cff4c', 3000);
      setTimeout(() => endMatch('ally'), 3100);
    } else {
      showAnnouncement('ROUND WIN!', `Score ${match.roundWins.ally} – ${match.roundWins.enemy}`, '#4cff4c', 2500);
      setTimeout(() => restartElimRound('ally'), 2600);
    }
  } else {
    match.roundWins.enemy++;
    updateMatchHUD();
    updateRoundScoreDisplay();
    if (match.roundWins.enemy >= match.cfg.winsNeeded) {
      showAnnouncement('ENEMY WINS!', `${match.roundWins.ally} – ${match.roundWins.enemy}`, '#ff5555', 3000);
      setTimeout(() => endMatch('enemy'), 3100);
    } else {
      showAnnouncement('ROUND LOST', `Score ${match.roundWins.ally} – ${match.roundWins.enemy}`, '#ff5555', 2500);
      setTimeout(() => restartElimRound('enemy'), 2600);
    }
  }
}

// ── Frontlines mode ───────────────────────────────────────────────────────
// 5 sectors along Z: [-40,-24], [-24,-8], [-8,+8], [+8,+24], [+24,+40]
// frontlineState.z tracks the current battle-line position (-38…+38).
// Ally kills push it negative (toward enemy base); enemy kills push it positive.
const FL_SECTORS = [
  { minZ: -40, maxZ: -24 },
  { minZ: -24, maxZ:  -8 },
  { minZ:  -8, maxZ:   8 },
  { minZ:   8, maxZ:  24 },
  { minZ:  24, maxZ:  40 },
];
const FL_WIN  = -36;  // ally wins when frontlineZ <= this
const FL_LOSE =  36;  // enemy wins when frontlineZ >= this
const FL_PUSH =  2.5; // units per kill

function initFrontlines() {
  frontlineState = { z: 0 };
  const hud = document.getElementById('frontline-hud');
  if (hud) hud.style.display = 'flex';
  updateFrontlineHUD();
}

function updateFrontlineHUD() {
  const hud = document.getElementById('frontline-hud');
  if (!hud || !frontlineState) return;
  const sectors = hud.querySelectorAll('.frontline-sector');
  FL_SECTORS.forEach((s, i) => {
    const el = sectors[i];
    if (!el) return;
    if (frontlineState.z <= s.minZ) {
      // Fully ally-owned
      el.style.background = 'rgba(0,180,80,0.55)';
      el.style.borderColor = '#00cc55';
      el.textContent = '';
    } else if (frontlineState.z >= s.maxZ) {
      // Fully enemy-owned
      el.style.background = 'rgba(200,40,40,0.55)';
      el.style.borderColor = '#cc3333';
      el.textContent = '';
    } else {
      // Contested sector — show the frontline here
      const pct = ((frontlineState.z - s.minZ) / (s.maxZ - s.minZ) * 100).toFixed(0);
      el.style.background = `linear-gradient(to left, rgba(0,180,80,0.55) ${100-pct}%, rgba(200,40,40,0.55) ${100-pct}%)`;
      el.style.borderColor = '#ffffff';
      el.textContent = '⚔';
    }
  });
}

function onFrontlinesKill(targetId, killerId) {
  if (!frontlineState || !match) return;
  const killerBot = gameBots.find(b => b.id === killerId);
  const targetBot = gameBots.find(b => b.id === targetId);
  const killerIsAlly = killerId === myId || (killerBot && killerBot.team === 'ally');

  if (killerIsAlly) frontlineState.z = Math.max(-38, frontlineState.z - FL_PUSH);
  else              frontlineState.z = Math.min( 38, frontlineState.z + FL_PUSH);

  updateMatchHUD();
  updateFrontlineHUD();

  // Win/lose check
  if (frontlineState.z <= FL_WIN) {
    showAnnouncement('BASE CAPTURED!', 'Your team pushed to the enemy base!', '#4cff4c', 3000);
    setTimeout(() => endMatch('ally', 'FRONTLINE REACHED ENEMY BASE'), 3100);
    return;
  }
  if (frontlineState.z >= FL_LOSE) {
    showAnnouncement('BASE LOST!', 'Enemy pushed through to your base!', '#ff5555', 3000);
    setTimeout(() => endMatch('enemy', 'FRONTLINE REACHED YOUR BASE'), 3100);
    return;
  }

  // Auto-respawn dead bots after 3 s
  if (targetBot) {
    setTimeout(() => {
      if (!match || match.over || !targetBot.dead) return;
      const idx = gameBots.filter(b => b.team === targetBot.team).indexOf(targetBot);
      const total = gameBots.filter(b => b.team === targetBot.team).length;
      // Re-roll a fresh randomized spawn so respawning bots don't conga-line
      // back onto the exact slot they died at.
      const sp = botSideSpawn(idx, Math.max(total, 3), targetBot.team);
      targetBot.dead = false; targetBot.hp = 300; targetBot.prevHp = 300; targetBot.stuckTimer = 0;
      targetBot.weaponId = targetBot.spawnWeaponId || targetBot.weaponId;
      targetBot.x = sp.x; targetBot.z = sp.z;
      if (players[targetBot.id]) {
        players[targetBot.id].hp = 300;
        players[targetBot.id].dead = false;
        players[targetBot.id].weaponId = targetBot.weaponId;
      }
      const mesh = remoteMeshes[targetBot.id];
      if (mesh) { mesh.position.set(targetBot.x, 0, targetBot.z); mesh.visible = true; }
      socket.emit('forceRespawnBot', { id: targetBot.id, x: targetBot.x, z: targetBot.z, weaponId: targetBot.weaponId });
    }, 3000);
  }

  // Player auto-respawns in frontlines
  if (targetId === myId) {
    setTimeout(() => {
      if (!match || match.over || !isDead) return;
      isDead = false;
      placePlayerAtTeamSpawn(localPlayerTeam(), 24, 38);
      socket.emit('readyRespawn', { x: camera.position.x, z: camera.position.z });
      grantSpawnShield(3000);
      requestPointerLockSafe();
    }, 3000);
  }
}

// ── Last Stand stubs (not yet implemented) ─────────────────────────────────
function initLastStand() {}
function onLastStandKill() {}

// ── D-Day mode ──────────────────────────────────────────────────────────────
const DDAY_BUNKER_XS = [-22, -7, 7, 22];
const DDAY_BUNKER_Z  = 24;

function initDDay() {
  ddayState = {
    phase: 'prep',
    wavesSent: 0,
    enemiesAlive: 0,
    totalKills: 0,
    wave2Timer: null,
    wave3Timer: null,
  };
  // Switch to battlefield map
  activateMap('battlefield');
  // Mark ally bots as stationary turrets and give them MG42
  for (const bot of gameBots) {
    if (bot.team === 'ally') {
      bot.state = 'turret';
      bot.weaponId = 'mg42';
    }
  }
  // Show the D-Day HUD
  const hud = document.getElementById('dday-hud');
  if (hud) hud.style.display = 'flex';
  updateMatchHUD();
}

function startDDayPhase(phase) {
  if (!ddayState || !match || match.over) return;
  ddayState.phase = phase;
  if (phase === 'grenades') {
    spawnDDayGrenadeRain();
    showAnnouncement('INCOMING FIRE!', 'Grenade barrage — take cover!', '#ff4444', 3000);
    setTimeout(() => startDDayPhase('wave1'), 5000);
  } else if (phase === 'wave1') {
    ddayState.wavesSent = 1;
    showAnnouncement('WAVE 1', '20 troops charging the hill!', '#ff9944', 2800);
    spawnDDayWave(20, 1);
    ddayState.wave2Timer = setTimeout(() => startDDayPhase('wave2'), 10000);
  } else if (phase === 'wave2') {
    ddayState.wavesSent = 2;
    showAnnouncement('WAVE 2', '20 more troops incoming!', '#ff7722', 2800);
    spawnDDayWave(20, 2);
    ddayState.wave3Timer = setTimeout(() => startDDayPhase('wave3'), 30000);
  } else if (phase === 'wave3') {
    ddayState.wavesSent = 3;
    showAnnouncement('FINAL WAVE', '50 troops — HOLD THE LINE!', '#ff2222', 3000);
    spawnDDayWave(50, 3);
    ddayState.phase = 'final';
  }
  updateMatchHUD();
}

function spawnDDayWave(count, waveNum) {
  if (!match || match.over) return;
  const now = Date.now();
  const botList = [];
  const spread  = 80;
  for (let i = 0; i < count; i++) {
    const id = `dday_w${waveNum}_${i}_${now}`;
    const xPos = ((i / Math.max(count-1, 1)) - 0.5) * spread + (Math.random()-0.5) * 3;
    const zPos = -40 - Math.random() * 4;
    const weaponId = randomPrimaryId();
    const pData = {
      id, name: `Trooper ${waveNum}-${i+1}`, isBot: true, team: 'enemy',
      weaponId, ownerId: myId, skin: ['swat','swat_shades','soldier'][Math.floor(Math.random()*3)],
      x: xPos, y: 1, z: zPos, rotY: 0, rotX: 0,
      hp: 300, dead: false, kills: 0, deaths: 0,
    };
    players[id] = pData;
    spawnRemotePlayer(pData);
    remoteMeshes[id].position.set(xPos, 0, zPos);
    const mesh = remoteMeshes[id];
    if (mesh) {
      const gun = makeBotWeaponProp(weaponId);
      gun.position.set(0.38, 1.18, -0.22);
      mesh.add(gun);
      if (mesh._rig) mesh._rig.holdsGun = true;
    }
    gameBots.push({
      id, team: 'enemy', weaponId,
      x: xPos, z: zPos, rotY: 0, hp: 300,
      dead: false, state: 'dday_attacker',
      wanderAngle: Math.random() * Math.PI * 2,
      wanderTimer: 0, lastShot: Date.now() + Math.random() * 1500,
      stuckTimer: 0,
    });
    botList.push({ id, name: pData.name, team: 'enemy', weaponId, spawnX: xPos, spawnZ: zPos });
    ddayState.enemiesAlive++;
  }
  socket.emit('spawnBots', botList);
}

function onDDayKill(targetId, killerId) {
  if (!ddayState || !match) return;
  const targetBot = gameBots.find(b => b.id === targetId);
  if (targetBot && targetBot.team === 'enemy') {
    ddayState.enemiesAlive = Math.max(0, ddayState.enemiesAlive - 1);
    ddayState.totalKills = (ddayState.totalKills || 0) + 1;
    updateMatchHUD();
    // Win check: all 3 waves sent AND no enemies alive
    if (ddayState.wavesSent >= 3 && ddayState.enemiesAlive === 0 && ddayState.phase === 'final') {
      ddayState.phase = 'complete';
      setTimeout(() => {
        if (!match.over) {
          showAnnouncement('VICTORY!', 'The hill is defended! Operation successful!', '#4cff4c', 3000);
          setTimeout(() => endMatch('ally', 'All enemy waves repelled'), 3200);
        }
      }, 1500);
    }
  }
  if (targetId === myId) {
    // Player died — D-Day doesn't auto-respawn; show loadout like normal
    // endMatch is NOT triggered just by player death — allies can still hold
  }
  // Lose: all ally turret bots wiped out (player can respawn but bunkers are empty)
  const allyBotsAlive = gameBots.some(b => b.team === 'ally' && !b.dead);
  if (!allyBotsAlive && !match.over) {
    setTimeout(() => {
      if (!match.over) {
        showAnnouncement('BUNKERS LOST', 'All gunners eliminated!', '#ff2222', 3000);
        setTimeout(() => endMatch('enemy', 'All defenders eliminated'), 3100);
      }
    }, 1500);
  }
}

function spawnDDayGrenadeRain() {
  const mat = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
  ddayGrenades.length = 0;
  for (let i = 0; i < 35; i++) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), mat);
    const x  = (Math.random()-0.5) * 90;
    const gz = Math.random() * 80 - 38; // whole map
    mesh.position.set(x, 22 + Math.random() * 12, gz);
    scene.add(mesh);
    ddayGrenades.push({
      mesh,
      vy: -(16 + Math.random() * 12),
      delay: Math.random() * 3.0,
    });
  }
}

function updateDDayGrenades(dt) {
  for (let i = ddayGrenades.length - 1; i >= 0; i--) {
    const g = ddayGrenades[i];
    if (g.delay > 0) { g.delay -= dt; continue; }
    g.mesh.position.y += g.vy * dt;
    if (g.mesh.position.y <= 0.08) {
      // Grenade landed — flash effect
      const lx = g.mesh.position.x, lz = g.mesh.position.z;
      scene.remove(g.mesh);
      ddayGrenades.splice(i, 1);
      // Visual explosion ring
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.1, 0.5, 12),
        new THREE.MeshBasicMaterial({ color: 0xff6600, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(lx, 0.05, lz);
      scene.add(ring);
      let rt = 0;
      function ringTick() {
        rt += 0.04;
        ring.scale.setScalar(1 + rt * 6);
        ring.material.opacity = Math.max(0, 0.85 - rt * 2.2);
        if (rt < 0.4) requestAnimationFrame(ringTick);
        else scene.remove(ring);
      }
      requestAnimationFrame(ringTick);
    }
  }
}

function updateDDay(dt) {
  if (!ddayState || !match || match.over) return;
  if (ddayGrenades.length) updateDDayGrenades(dt);
}

function updateRoundScoreDisplay() {
  if (!match) return;
  const el = document.getElementById('round-score-display');
  if (el) el.textContent = `${match.roundWins.ally} – ${match.roundWins.enemy}`;
}

function restartElimRound(lastWinner) {
  if (!match) return;
  if (lastWinner !== null) match.round++;
  resetPlayerForRound();
  grantSpawnShield(3000);
  requestPointerLockSafe();
  // Respawn all bots back to their team edges with full health and fresh weapons
  const allyCount   = gameBots.filter(b => b.team === 'ally').length;
  const enemyCount  = gameBots.filter(b => b.team === 'enemy').length;
  const allyIdx     = { i: 0 }, enemyIdx = { i: 0 };
  for (const bot of gameBots) {
    const isAlly = bot.team === 'ally';
    const count  = isAlly ? allyCount : enemyCount;
    const idx    = isAlly ? allyIdx.i++ : enemyIdx.i++;
    const sp     = botSideSpawn(idx, count, bot.team);
    bot.dead = false; bot.hp = 300; bot.prevHp = 300; bot.stuckTimer = 0;
    bot.state = bot.team === 'ally' ? 'chase' : 'chase';
    bot.weaponId = bot.spawnWeaponId || bot.weaponId;
    bot.lastShot = Date.now() + Math.random() * 1500;
    if (players[bot.id]) {
      players[bot.id].hp = 300;
      players[bot.id].dead = false;
      players[bot.id].weaponId = bot.weaponId;
    }
    bot.x = sp.x; bot.z = sp.z;
    bot.wanderAngle = Math.random() * Math.PI * 2;
    const mesh = remoteMeshes[bot.id];
    if (mesh) { mesh.position.set(bot.x, 0, bot.z); mesh.visible = true; }
    socket.emit('forceRespawnBot', { id: bot.id, x: bot.x, z: bot.z, weaponId: bot.weaponId });
  }
  setTimeout(() => startMatchRound(), 1200);
}

function checkRaceWin() {
  if (!match || match.type !== 'race') return;
  if (match.teamKills.ally  >= match.cfg.killGoal) endMatch('ally',  'KILL GOAL REACHED');
  else if (match.teamKills.enemy >= match.cfg.killGoal) endMatch('enemy', 'KILL GOAL REACHED');
}

function updateMatchTimer(dt) {
  if (!match || !match.active || match.over) return;
  // ── Elim mode: per-round 60-second timer ─────────────────────────────────
  if (match.type === 'elim') {
    if (!match.roundActive) return;
    if (match.roundTimeLeft == null || match.roundTimeLeft <= 0) return;
    match.roundTimeLeft -= dt;
    if (match.roundTimeLeft <= 0) {
      match.roundTimeLeft = 0;
      resolveElimRoundByHP();
    }
    updateMatchHUD();
    return;
  }
  if (!match.cfg.timeLimit) return; // frontlines / dday / laststand have no timer
  match.timeLeft -= dt;
  if (match.timeLeft <= 0) { match.timeLeft = 0; onTimeUp(); }
  // Update HUD timer every second is enough — but we call it every frame for smooth display
  updateMatchHUD();
}

// When the elim round timer hits 0: team with highest combined HP wins.
function resolveElimRoundByHP() {
  if (!match || !match.roundActive) return;
  // Sum HP per side (player counts as ally team if alive)
  let allyHP = 0, enemyHP = 0;
  if (!isDead) allyHP += (players[myId]?.hp ?? 0);
  for (const bot of gameBots) {
    if (bot.dead) continue;
    if (bot.team === 'ally') allyHP += bot.hp;
    else if (bot.team === 'enemy') enemyHP += bot.hp;
  }
  match.roundActive = false;
  if (allyHP > enemyHP) {
    match.roundWins.ally++;
    updateMatchHUD(); updateRoundScoreDisplay();
    if (match.roundWins.ally >= match.cfg.winsNeeded) {
      showAnnouncement('YOUR TEAM WINS!', `TIMEOUT · HP ${Math.round(allyHP)} vs ${Math.round(enemyHP)}`, '#4cff4c', 3000);
      setTimeout(() => endMatch('ally'), 3100);
    } else {
      showAnnouncement('ROUND WIN!', `TIMEOUT · HP ${Math.round(allyHP)} vs ${Math.round(enemyHP)}`, '#4cff4c', 2500);
      setTimeout(() => restartElimRound('ally'), 2600);
    }
  } else if (enemyHP > allyHP) {
    match.roundWins.enemy++;
    updateMatchHUD(); updateRoundScoreDisplay();
    if (match.roundWins.enemy >= match.cfg.winsNeeded) {
      showAnnouncement('ENEMY WINS!', `TIMEOUT · HP ${Math.round(enemyHP)} vs ${Math.round(allyHP)}`, '#ff5555', 3000);
      setTimeout(() => endMatch('enemy'), 3100);
    } else {
      showAnnouncement('ROUND LOST', `TIMEOUT · HP ${Math.round(enemyHP)} vs ${Math.round(allyHP)}`, '#ff5555', 2500);
      setTimeout(() => restartElimRound('enemy'), 2600);
    }
  } else {
    // Exact tie → replay
    showAnnouncement('DRAW', `TIMEOUT · Both at ${Math.round(allyHP)} HP`, '#aaaaaa', 2500);
    setTimeout(() => restartElimRound(null), 2600);
  }
}

function onTimeUp() {
  if (!match || match.over) return;
  if (match.type === 'race') {
    const a = match.teamKills.ally, e = match.teamKills.enemy;
    if (a > e)        endMatch('ally',  'TIME UP · Most kills wins');
    else if (e > a)   endMatch('enemy', 'TIME UP · Most kills wins');
    else              startTiebreaker();
  } else { // ffa
    const pk = match.ffaKills[myId] || 0;
    const topBot = gameBots.reduce((best, b) => {
      const k = match.ffaKills[b.id] || 0;
      return (!best || k > (match.ffaKills[best.id] || 0)) ? b : best;
    }, null);
    const bk = topBot ? (match.ffaKills[topBot.id] || 0) : 0;
    if (pk > bk)      endMatch('ally',  'TIME UP · You had the most kills!');
    else if (bk > pk) endMatch('enemy', 'TIME UP · Bot had more kills');
    else              startTiebreaker();
  }
}

function startTiebreaker() {
  if (!match || match.over) return;
  showAnnouncement('⚔️ TIEBREAKER', 'No respawn · whoever dies first loses', '#ffd700', 3200);
  setTimeout(() => {
    if (!match || match.over) return;
    match.tiebreaker = true;
    match.active = true;
    // Kill all bots except the one with most kills on enemy side
    const topEnemy = [...gameBots]
      .filter(b => b.team === 'enemy')
      .sort((a, b) => (match.ffaKills[b.id] || match.teamKills?.enemy || 0)
                    - (match.ffaKills[a.id] || match.teamKills?.ally  || 0))[0]
      || gameBots.find(b => b.team === 'enemy');
    for (const bot of gameBots) {
      if (bot === topEnemy) continue;
      bot.dead = true;
      const mesh = remoteMeshes[bot.id];
      if (mesh) mesh.visible = false;
    }
    // Ensure player is alive
    if (isDead) {
      isDead = false;
      document.getElementById('waiting-screen').style.display = 'none';
      document.getElementById('death-screen').style.display   = 'none';
      placePlayerAtTeamSpawn(localPlayerTeam(), 24, 38);
      socket.emit('readyRespawn', { x: camera.position.x, z: camera.position.z });
      requestPointerLockSafe();
    }
    if (topEnemy) { topEnemy.dead = false; const m = remoteMeshes[topEnemy.id]; if (m) m.visible = true; }
  }, 3300);
}

function endMatch(winner, reason) {
  if (!match || match.over) return;
  match.over   = true;
  match.active = false;
  // Restore OITC pistol damage override (if any)
  if (match._oitcOrigDmg != null) {
    const pw = WEAPONS.find(w => w.id === 'pistol');
    if (pw) pw.damage = match._oitcOrigDmg;
    if (currentWeapon && currentWeapon.id === 'pistol') currentWeapon.damage = match._oitcOrigDmg;
  }
  const isWin  = winner === 'ally';
  const el     = document.getElementById('match-over-screen');
  const title  = document.getElementById('match-over-title');
  title.textContent = isWin ? '🏆  VICTORY' : '💀  DEFEAT';
  title.style.color = isWin ? '#ffd700' : '#e74c3c';
  document.getElementById('match-over-sub').textContent = reason || '';
  let scoreText = '';
  if (match.type === 'elim') {
    scoreText = `Rounds  ${match.roundWins.ally} – ${match.roundWins.enemy}`;
  } else if (match.type === 'race') {
    scoreText = `Kills  Your Team ${match.teamKills.ally}  ·  Enemy ${match.teamKills.enemy}  (goal ${match.cfg.killGoal})`;
  } else if (match.type === 'dday') {
    const dd = ddayState;
    scoreText = dd ? `Waves survived: ${dd.wavesSent}/3  ·  Enemies killed: ${dd.totalKills || 0}` : '';
  } else {
    const pk = match.ffaKills[myId] || 0;
    const topBotKills = Math.max(0, ...gameBots.map(b => match.ffaKills[b.id] || 0));
    scoreText = `Your kills: ${pk}  ·  Top bot: ${topBotKills}`;
  }
  document.getElementById('match-over-score').textContent = scoreText;
  document.getElementById('death-screen').style.display   = 'none';
  document.getElementById('waiting-screen').style.display = 'none';
  el.style.display = 'flex';

  // ── 💰 Award shop credits ────────────────────────────────────────────
  const playerKills = (match.ffaKills?.[myId])
    ?? (players[myId]?.kills)
    ?? 0;
  awardMatchCredits(playerKills, isWin);
  // Trials are one-match only — clear them so they re-cost next time.
  trialingThisMatch.clear();
}

// ── Bot AI ─────────────────────────────────────────────────────────────────
function botSideSpawn(idx, count, team) {
  // D-Day ally bots: place in bunkers 1, 2, 3 (player is in bunker 0)
  if (selectedModeConfig && selectedModeConfig.type === 'dday' && team === 'ally') {
    const bunkerXs = [-7, 7, 22]; // bunkers 1, 2, 3
    return { x: bunkerXs[idx] || 0, z: 22 }; // near slit, inside bunker
  }
  // BR mode: scatter bots randomly around the perimeter of the big map
  if (selectedModeConfig && selectedModeConfig.type === 'br') {
    const ang = (idx / count) * Math.PI * 2 + Math.random() * 0.5;
    const r = 90 + Math.random() * 20;
    return { x: Math.cos(ang) * r, z: Math.sin(ang) * r };
  }
  // Allies at z≈+32 (behind player); enemies at z≈-20 (close enough to navigate quickly)
  const isAlly = team === 'ally';
  // Use a wider spread floor so 1v1 / 1v2 don't stack everyone on x=0
  const spread = Math.min(36, Math.max(14, count * 4));
  const baseX  = count <= 1
    ? (Math.random() - 0.5) * spread * 2          // lone bot: fully random across the spread
    : ((idx / (count - 1)) - 0.5) * 2 * spread;
  const xJit   = (Math.random() - 0.5) * 6;
  const zJit   = (Math.random() - 0.5) * 6;
  return { x: baseX + xJit, z: (isAlly ? 32 : -20) + zJit };
}

function spawnGameBots() {
  if (!selectedModeConfig) return;
  // 🌐 Enter a private match BEFORE spawning bots — server will isolate this player's bots
  // from other players who aren't in the same match.
  const matchId = (pvpMatch && pvpMatch.mode)
    ? `pvp-${[myId, ...(pvpMatch.opponents || []).map(o => o.socketId)].sort().join('-')}` // shared ID for PvP-paired players
    : `match-${myId}-${Date.now()}`;
  socket.emit('enterMatch', { matchId });

  // ── Clean up bots/meshes/bubbles from any previous mode session ──────────
  for (const bot of gameBots) {
    if (remoteMeshes[bot.id]) { scene.remove(remoteMeshes[bot.id]); delete remoteMeshes[bot.id]; }
    if (bot._bubble) { bot._bubble.remove(); bot._bubble = null; }
    delete players[bot.id];
  }
  gameBots.length = 0;
  rangeTargets = [];
  // Reset destructibles (heal back all glass/lights/reactors) and mortars
  for (const d of mapDestructibles) {
    d.hp = d.maxHp;
    if (d.mesh) d.mesh.visible = true;
    if (d.colliderRef && !wallColliders.includes(d.colliderRef) && d.mapName === activeMapName) {
      // collider will be re-added when activateMap runs below
    }
  }
  for (const mor of mapMortars) {
    mor.hp = mor.maxHp;
    mor.ammo = mor.maxAmmo;
    mor.pilotedBy = null;
    if (mor.mesh) mor.mesh.visible = true;
  }
  for (const v of mapVehicles) {
    v.hp = v.maxHp;
    v.pilotedBy = null;
    // Reset to spawn positions (no easy way — would need to store originals; just clear pilot state)
  }
  airportLightLevel = 1.0;
  if (pilotedMortar) { pilotedMortar.pilotedBy = null; pilotedMortar = null; }
  if (pilotedVehicle) { pilotedVehicle.pilotedBy = null; pilotedVehicle = null; }
  const mp = document.getElementById('mortar-prompt'); if (mp) mp.style.display = 'none';
  const vp = document.getElementById('vehicle-prompt'); if (vp) vp.style.display = 'none';
  // ──────────────────────────────────────────────────────────────────────────

  // ── Pick & activate map (skip D-Day and Range — they use their own maps) ──
  if (selectedModeConfig.type === 'br') {
    // King of the Hill: always use the giant BR arena
    activateMap('br_arena');
  } else if (selectedModeConfig.type !== 'dday' && selectedModeConfig.type !== 'range') {
    const pool = ['blank','urban','warehouse','forest','volcano','cyber','desert','tundra','space','airport','trenches','chernobyl','refinery','skydock','sewer','gravity_lab','glassworks','carrier','overgrowth','orbital_station','foundry','carnival','biosphere','lockdown','studio','temple','holiday','labyrinth','arena','opera','doomsday','train','dreamscape'];
    const chosen = (selectedMap === 'auto' || !MAP_GROUPS[selectedMap]) ? pool[Math.floor(Math.random()*pool.length)] : selectedMap;
    activateMap(chosen);
    // Update sky color if the map specifies one
    const sky = MAP_GROUPS[chosen]?._skyColor;
    if (sky != null && scene.background?.setHex) scene.background.setHex(sky);
  }

  let { allies, enemies } = selectedModeConfig;
  // ── 🏛️ Lobby-driven bot counts: server already computed how many bots to fill ─
  if (pvpMatch && (pvpMatch.allyBotsToSpawn != null || pvpMatch.enemyBotsToSpawn != null)) {
    if (!pvpMatch.isHost) {
      // Guest: don't spawn any bots, host will broadcast them via networking
      allies = 0; enemies = 0;
    } else {
      // Host spawns exactly what the server told us to
      allies = pvpMatch.allyBotsToSpawn || 0;
      enemies = pvpMatch.enemyBotsToSpawn || 0;
      // If the player is on the enemy team, swap allies↔enemies in our local model
      // (the existing code treats the player as 'ally' team by convention)
      if (pvpMatch.team === 'enemy') {
        const tmp = allies; allies = enemies; enemies = tmp;
      }
    }
  }
  const now = Date.now();
  const botList = [];

  // Move the player to their team side before the round begins
  if (selectedModeConfig && selectedModeConfig.type === 'dday') {
    camera.position.set(-22, 1.65, 22); euler.y = 0; // D-Day: inside bunker 0, facing enemies
  } else if (selectedModeConfig && selectedModeConfig.type === 'range') {
    camera.position.set(0, 1.65, 38); euler.y = Math.PI; // Shooting range: face -z toward targets
  } else if (selectedModeConfig && selectedModeConfig.type === 'br') {
    // BR: spawn at random spot in the big map
    const ang = Math.random() * Math.PI * 2;
    const r = 80 + Math.random() * 30;
    camera.position.set(Math.cos(ang) * r, 1.65, Math.sin(ang) * r);
    euler.y = ang + Math.PI; // face toward center
  } else {
    placePlayerAtTeamSpawn();
  }
  socket.emit('resetSelf', { x: camera.position.x, z: camera.position.z });

  const makeBot = (idx, team) => {
    const isAlly   = team === 'ally';
    const count    = isAlly ? allies : enemies;
    const sp       = botSideSpawn(idx, count, team);
    const sx = sp.x, sz = sp.z;
    const id       = `bot_${team}_${now}_${idx}`;
    const name     = isAlly ? `Ally ${idx+1}` : `Enemy ${idx+1}`;
    const weaponId = randomPrimaryId();
    // 🆕 Full bot loadout — secondary, melee, utility (random non-admin picks)
    const SECONDARIES = WEAPONS.filter(w => w.slot === 'secondary' && !w.adminItem && !w.ddayOnly);
    const MELEES_NONADMIN = MELEE_ITEMS.filter(m => !m.adminItem);
    const UTILS_NONADMIN  = SUPPORT_ITEMS.filter(s => !s.adminItem);
    const botSecondaryId = SECONDARIES[Math.floor(Math.random() * SECONDARIES.length)]?.id || 'pistol';
    const botMeleeId     = MELEES_NONADMIN[Math.floor(Math.random() * MELEES_NONADMIN.length)]?.id || 'bat';
    const botUtilityId   = UTILS_NONADMIN[Math.floor(Math.random() * UTILS_NONADMIN.length)]?.id || 'frag';

    // ── Create locally RIGHT NOW (no network round-trip needed) ──────────
    // Bots wear comic-crew skins: enemies = SWAT crew, allies = soldiers.
    const botSkin = isAlly
      ? (['soldier','default'][Math.floor(Math.random()*2)])
      : (['swat','swat_shades','soldier'][Math.floor(Math.random()*3)]);
    const pData = { id, name, isBot: true, team, weaponId, ownerId: myId, skin: botSkin,
                    x: sx, y: 1, z: sz, rotY: 0, rotX: 0,
                    hp: 300, dead: false, kills: 0, deaths: 0 };
    players[id] = pData;
    spawnRemotePlayer(pData);                    // adds mesh to scene immediately
    remoteMeshes[id].position.set(sx, 0, sz);   // make sure position is exact

    // ── Attach weapon prop to bot mesh ────────────────────────────────────
    const mesh = remoteMeshes[id];
    if (mesh) {
      const gun = makeBotWeaponProp(weaponId);
      // Right-arm position in bot-local space, pointing forward (−Z)
      gun.position.set(0.38, 1.18, -0.22);
      gun.rotation.y = 0; // faces forward with the bot
      mesh.add(gun);
      if (mesh._rig) mesh._rig.holdsGun = true;
    }

    // Per-bot difficulty rolls
    const w = WEAPONS.find(ww => ww.id === weaponId) || WEAPONS[0];
    const diff = selectedDifficulty;
    const tune = botTuning(diff);
    const aimSkill   = tune.aimMin + Math.random() * tune.aimRand;
    const reactionMs = tune.reactMin + Math.random() * tune.reactRand;
    // Personality: weapon-matched mostly (70% hard / 80% expert), with off-roll variance for unpredictability
    const personality = rollPersonality(weaponId, diff);
    const botDPS = WEAPON_DPS_CACHE[weaponId] || 150;
    gameBots.push({ id, team, weaponId, spawnWeaponId: weaponId, x: sx, z: sz, rotY: 0, hp: 300,
                    // 🆕 Full loadout — bot will switch between these based on engagement range
                    primaryId: weaponId, secondaryId: botSecondaryId,
                    meleeId: botMeleeId, utilityId: botUtilityId,
                    activeSlot: 'primary',          // 'primary' | 'secondary' | 'melee'
                    nextUtilityAt: Date.now() + 6000 + Math.random() * 6000,
                    utilityUsesLeft: 2,
                    dead: false, state: 'chase',
                    wanderAngle: Math.random() * Math.PI * 2, wanderTimer: 0,
                    lastShot: Date.now() + Math.random() * tune.initialShotDelay, stuckTimer: 0,
                    strafeDir: Math.random() < 0.5 ? 1 : -1,
                    strafeFlipTimer: 0, tacTimer: 0, prevHp: 300, coverPt: null,
                    // Difficulty fields
                    difficulty: diff, aimSkill, reactionMs, personality, dps: botDPS, tune,
                    botAmmo: w.mag || 30, botMag: w.mag || 30, botReserve: (w.reserve === 0 ? 99999 : w.reserve) || 90,
                    reloadUntil: 0,
                    firstSeenAt: 0, lastSeenPos: null, lastSeenAt: 0,
                    nextAbilityAt: Date.now() + 5000 + Math.random() * 8000,
                    meleeChargeAbandonDist: 18,
                    // EXPERT fields
                    hitAndRunUntil: 0,        // timestamp: bot is in hit-and-run reposition
                    hitAndRunTarget: null,    // {x, z} — destination for hit-and-run
                    nextRunCheck: 0,          // throttle hit-and-run decisions
                    currentTargetId: null,
                    // Lazy-weapon fields
                    y: 0, yVel: 0,            // vertical position + velocity (for air grenades)
                    frostSlow: 100,           // 100 = full speed, 0 = frozen → instakill
                    onLandMine: null });      // tracks which mine was triggering (prevents double-hit)

    // Tell server so hit-detection events work and other players see bots
    botList.push({ id, name, team, weaponId, spawnX: sx, spawnZ: sz });
  };

  for (let i = 0; i < allies;   i++) makeBot(i, 'ally');
  for (let i = 0; i < enemies;  i++) makeBot(i, 'enemy');

  socket.emit('spawnBots', botList);
  initMatch();
  setTimeout(() => startMatchRound(), 400 + (allies + enemies) * 40);
}

// ── Shooting Range: target spawning ────────────────────────────────────────
function spawnRangeTargets() {
  rangeTargets = [];
  const now = Date.now();
  const botList = [];

  const targetDefs = [
    // Close row (z=26): 5 static targets
    { tx: -14, tz: 26, moving: false },
    { tx:  -7, tz: 26, moving: false },
    { tx:   0, tz: 26, moving: false },
    { tx:   7, tz: 26, moving: false },
    { tx:  14, tz: 26, moving: false },
    // Mid row (z=14): 3 static targets
    { tx: -10, tz: 14, moving: false },
    { tx:   0, tz: 14, moving: false },
    { tx:  10, tz: 14, moving: false },
    // Moving targets at z=10
    { tx:  -8, tz: 10, moving: true },
    { tx:   8, tz: 10, moving: true },
  ];

  targetDefs.forEach(({ tx, tz, moving }, i) => {
    const id = `range_target_${now}_${i}`;
    const pData = {
      id, name: `Target ${i+1}`, isBot: true, team: 'enemy',
      weaponId: 'ak20', ownerId: myId,
      x: tx, y: 0, z: tz, rotY: Math.PI, rotX: 0,
      hp: 100, dead: false, kills: 0, deaths: 0,
    };
    players[id] = pData;

    const mesh = buildRangeTargetMesh();
    mesh.position.set(tx, 0, tz);
    scene.add(mesh);
    remoteMeshes[id] = mesh;

    gameBots.push({
      id, team: 'enemy', weaponId: 'ak20',
      x: tx, z: tz, rotY: Math.PI, hp: 100, dead: false,
      state: 'target',
      wanderAngle: 0, wanderTimer: 0, lastShot: 0,
      stuckTimer: 0, strafeDir: 1, strafeFlipTimer: 0,
      tacTimer: 0, prevHp: 100, coverPt: null,
    });

    botList.push({ id, name: `Target ${i+1}`, team: 'enemy', weaponId: 'ak20', spawnX: tx, spawnZ: tz, hp: 100 });

    rangeTargets.push({ id, baseX: tx, z: tz, moving, dir: 1, speed: 3, respawnAt: 0 });
  });

  socket.emit('spawnBots', botList);
}

function initRange() {
  rangeTargets = [];
  rangeStats = { shots: 0, hits: 0 };
  activateMap('range');
  spawnRangeTargets();
  updateRangeHUD();
  const hud = document.getElementById('range-hud');
  if (hud) hud.style.display = 'flex';
}

function updateRangeHUD() {
  const acc = rangeStats.shots > 0 ? Math.round(rangeStats.hits / rangeStats.shots * 100) : 0;
  const el = document.getElementById('range-stats');
  if (el) el.textContent = `SHOTS ${rangeStats.shots}  ·  HITS ${rangeStats.hits}  ·  ACC ${acc}%`;
}

function updateRange(dt) {
  const now = Date.now();
  for (const rt of rangeTargets) {
    const pData = players[rt.id];
    const bot   = gameBots.find(b => b.id === rt.id);
    const mesh  = remoteMeshes[rt.id];

    // Respawn check
    if (pData && pData.dead && rt.respawnAt > 0 && now >= rt.respawnAt) {
      pData.dead = false;
      pData.hp   = 100;
      if (bot)  { bot.dead = false; bot.hp = 100; bot.prevHp = 100; }
      if (mesh) { mesh.visible = true; mesh.rotation.x = 0; }
      rt.respawnAt = 0;
      socket.emit('forceRespawnBot', { botId: rt.id, x: bot ? bot.x : rt.baseX, z: rt.z, hp: 100 });
    }

    // Moving target animation
    if (rt.moving && pData && !pData.dead) {
      const newX = (bot ? bot.x : rt.baseX) + rt.dir * rt.speed * dt;
      if (newX > rt.baseX + 10 || newX < rt.baseX - 10) rt.dir *= -1;
      const cx = Math.max(rt.baseX - 10, Math.min(rt.baseX + 10, newX));
      if (bot)  bot.x = cx;
      if (mesh) mesh.position.x = cx;
    }
  }
}

function getBotTarget(bot) {
  // D-Day turrets: target nearest attacking enemy bot
  if (bot.state === 'turret') {
    let best = null, bestDist = Infinity;
    for (const ob of gameBots) {
      if (ob.dead || ob.state !== 'dday_attacker') continue;
      const d = Math.hypot(ob.x - bot.x, ob.z - bot.z);
      if (d < bestDist) { bestDist = d; best = ob; }
    }
    return best ? { x: best.x, z: best.z, isPlayer: false, botRef: best } : null;
  }

  // D-Day attackers: advance toward bunker line, target nearest defender
  if (bot.state === 'dday_attacker') {
    let best = null, bestDist = 40; // only attack if within 40 units
    // Player
    if (!isDead) {
      const d = Math.hypot(camera.position.x - bot.x, camera.position.z - bot.z);
      if (d < bestDist) { bestDist = d; best = { x: camera.position.x, z: camera.position.z, isPlayer: true }; }
    }
    // Ally turret bots
    for (const ob of gameBots) {
      if (ob.dead || ob.team !== 'ally') continue;
      const d = Math.hypot(ob.x - bot.x, ob.z - bot.z);
      if (d < bestDist) { bestDist = d; best = { x: ob.x, z: ob.z, isPlayer: false, botRef: ob }; }
    }
    // If no target in range, just advance up the map (toward z=+30)
    if (!best) return { x: bot.x + (Math.random()-0.5)*4, z: 30, isPlayer: false };
    return best;
  }

  const oppositeTeam = bot.team === 'enemy' ? 'ally' : 'enemy';
  // ── FFA-style modes: bots treat the player as just another entity (no gang-up) ──
  // Picks the nearest valid target by distance — could be the player or another bot.
  const isFFAMode = match && (match.type === 'ffa' || match.type === 'arcade' || match.type === 'br');
  if (isFFAMode) {
    let best = null, bestDist = Infinity, bestIsPlayer = false;
    // Consider the player as a candidate (just like a bot)
    if (!isDead) {
      const d = Math.hypot(camera.position.x - bot.x, camera.position.z - bot.z);
      if (d < bestDist) { bestDist = d; bestIsPlayer = true; best = null; }
    }
    // Consider other bots
    for (const ob of gameBots) {
      if (ob.dead || ob.id === bot.id) continue;
      // In Infection mode, zombies hunt humans (anyone not infected), humans avoid zombies
      if (match.arcade === 'infect') {
        const meIsZombie = match.infectedIds[bot.id];
        const targetIsZombie = match.infectedIds[ob.id];
        if (meIsZombie && targetIsZombie) continue; // zombies don't fight each other
        if (!meIsZombie && targetIsZombie) continue; // humans don't preemptively attack zombies (treat them like obstacles)
      }
      const d = Math.hypot(ob.x - bot.x, ob.z - bot.z);
      if (d < bestDist) { bestDist = d; bestIsPlayer = false; best = ob; }
    }
    if (bestIsPlayer) {
      bot.currentTargetId = myId;
      return { x: camera.position.x, z: camera.position.z, isPlayer: true };
    }
    if (best) { bot.currentTargetId = best.id; return { x: best.x, z: best.z, isPlayer: false, botRef: best }; }
    return null;
  }
  // Enemy bots always prioritise the player when alive (team-based modes only)
  if (bot.team === 'enemy' && !isDead) {
    bot.currentTargetId = myId;
    // EXPERT: if no LOS but a recent team sighting exists, push toward last known spot
    if (bot.difficulty === 'expert' && !hasLineOfSight(bot.x, bot.z, camera.position.x, camera.position.z)) {
      const sight = teamSightings[bot.team];
      if (sight && Date.now() - sight.t < 5000) {
        return { x: sight.x, z: sight.z, isPlayer: true };
      }
    }
    return { x: camera.position.x, z: camera.position.z, isPlayer: true };
  }
  // HARD: focus fire — prefer the target most allies are already shooting at
  // Skip in FFA-style modes (no "allies" — would just gang up on player)
  if (bot.difficulty === 'hard' && !isFFAMode) {
    const focusCounts = new Map(); // botId → count of allies targeting it
    for (const ally of gameBots) {
      if (ally.dead || ally.team !== bot.team || ally.id === bot.id) continue;
      if (!ally.currentTargetId) continue;
      focusCounts.set(ally.currentTargetId, (focusCounts.get(ally.currentTargetId) || 0) + 1);
    }
    if (focusCounts.size > 0) {
      let bestId = null, bestVotes = 0;
      for (const [tid, votes] of focusCounts) {
        if (votes > bestVotes) { bestVotes = votes; bestId = tid; }
      }
      if (bestId && bestVotes >= 2) {
        const focusBot = gameBots.find(b => b.id === bestId && !b.dead && b.team === oppositeTeam);
        if (focusBot) { bot.currentTargetId = focusBot.id; return { x: focusBot.x, z: focusBot.z, isPlayer: false, botRef: focusBot }; }
      }
    }
  }
  // Target nearest bot on the opposing team
  let best = null, bestDist = Infinity;
  for (const ob of gameBots) {
    if (ob.dead || ob.id === bot.id || ob.team !== oppositeTeam) continue;
    const d = Math.hypot(ob.x - bot.x, ob.z - bot.z);
    if (d < bestDist) { bestDist = d; best = ob; }
  }
  if (best) { bot.currentTargetId = best.id; return { x: best.x, z: best.z, isPlayer: false, botRef: best }; }
  for (const ob of gameBots) {
    if (ob.dead || ob.id === bot.id) continue;
    const d = Math.hypot(ob.x - bot.x, ob.z - bot.z);
    if (d < bestDist) { bestDist = d; best = ob; }
  }
  if (best) { bot.currentTargetId = best.id; return { x: best.x, z: best.z, isPlayer: false, botRef: best }; }
  bot.currentTargetId = null;
  return null;
}

// ── Cover-point finder ────────────────────────────────────────────────────
// Returns a world position behind the nearest suitable wall, relative to target
function findBotCover(bot, target) {
  const tx = target ? (target.isPlayer ? camera.position.x : target.x) : bot.x;
  const tz = target ? (target.isPlayer ? camera.position.z : target.z) : bot.z;
  let bestScore = Infinity, bestPt = null;
  for (const box of wallColliders) {
    const bw = box.max.x - box.min.x, bd = box.max.z - box.min.z;
    if (bw < 1.5 && bd < 1.5) continue; // skip tiny colliders
    const cx = (box.min.x + box.max.x) / 2;
    const cz = (box.min.z + box.max.z) / 2;
    const distToBot = Math.hypot(cx - bot.x, cz - bot.z);
    if (distToBot > 20 || distToBot < 0.5) continue;
    // Find point on the bot-facing side of the box (away from target)
    const toTX = tx - cx, toTZ = tz - cz;
    const toTLen = Math.hypot(toTX, toTZ) || 1;
    const pt = {
      x: cx - (toTX / toTLen) * (bw * 0.5 + 1.0),
      z: cz - (toTZ / toTLen) * (bd * 0.5 + 1.0),
    };
    // Prefer close walls that are actually between bot and target
    const score = distToBot * 0.7 + Math.hypot(pt.x - bot.x, pt.z - bot.z) * 0.3;
    if (score < bestScore) { bestScore = score; bestPt = pt; }
  }
  return bestPt;
}

function updateBotAI(dt) {
  if (!gameBots.length) return;
  if (match?.type === 'range') return; // range targets are handled by updateRange()
  // ⚡ Admin freeze: stop all bot AI entirely
  if (adminCheats.freezeBots && currentUser?.isAdmin) return;
  // Stun grenade: per-bot AI freeze
  const __nowS = Date.now();
  for (const b of gameBots) { if (b._stunUntil && __nowS < b._stunUntil) b._stunActive = true; else b._stunActive = false; }
  const roundLive = !match || match.roundActive; // false only during countdown
  const now = Date.now();
  const playerHp = players[myId]?.hp ?? 300; // used for melee-charge trigger
  for (const bot of gameBots) {
    if (bot.dead) continue;
    if (bot.state === 'target') continue; // range targets don't move or shoot
    if (bot._stunActive) continue; // 🪖 stunned by admin stun grenade — frozen this frame

    // 🎒 Auto loadout-swap based on engagement distance (NEW)
    // < 4 m → secondary if it's a pistol/shotgun
    // 4-30 m → primary (default)
    // No melee swap yet (different fire path)
    if (bot.primaryId) {
      const myMe = players[myId];
      const tgtDist = myMe ? Math.hypot(bot.x - myMe.x, bot.z - myMe.z) : 999;
      const desired = (tgtDist < 4 && bot.secondaryId) ? 'secondary' : 'primary';
      if (desired !== bot.activeSlot) {
        bot.activeSlot = desired;
        const newWeaponId = desired === 'secondary' ? bot.secondaryId : bot.primaryId;
        if (newWeaponId !== bot.weaponId) {
          bot.weaponId = newWeaponId;
          if (players[bot.id]) players[bot.id].weaponId = newWeaponId;
          const newW = WEAPONS.find(w => w.id === newWeaponId);
          if (newW) { bot.botMag = newW.mag; bot.botAmmo = newW.mag; bot.botReserve = newW.reserve || 90; }
        }
      }
    }

    // 💣 Utility usage — throw a grenade-style utility occasionally if hostile + in range
    if (bot.utilityId && bot.utilityUsesLeft > 0 && now >= (bot.nextUtilityAt || 0)) {
      const myMe2 = players[myId];
      if (myMe2 && !isDead && bot.team === 'enemy') {
        const d2 = Math.hypot(bot.x - myMe2.x, bot.z - myMe2.z);
        if (d2 < 14 && d2 > 4) {
          // Use frag-like (explosive) utilities — others are silently consumed
          const util = SUPPORT_ITEMS.find(s => s.id === bot.utilityId);
          if (util && (util.damage >= 60 || util.id === 'frag')) {
            // Apply damage directly (simplest; no projectile sim for bots)
            applyBotDamageToPlayer && applyBotDamageToPlayer(util.id, bot.id);
            // Show a brief AOE FX at the player's feet for visual feedback
            spawnAbilityAOEFX(new THREE.Vector3(myMe2.x || camera.position.x, 0.1, myMe2.z || camera.position.z),
              util.radius || 4, util.bulletColor || 0xff8844);
          }
        }
      }
      bot.utilityUsesLeft--;
      bot.nextUtilityAt = now + 10000 + Math.random() * 8000;
    }

    // ── Vertical physics: air grenades + land mines can launch bots upward ──
    if (bot.yVel != null && (bot.yVel !== 0 || (bot.y || 0) > 0)) {
      bot.yVel -= 28 * dt; // gravity
      bot.y = (bot.y || 0) + bot.yVel * dt;
      if (bot.y <= 0) { bot.y = 0; bot.yVel = 0; }
    }

    // ── Frost slow: regen +2/sec, lethal at 0 ────────────────────────────────
    if (bot.frostSlow != null) {
      bot.frostSlow = Math.min(100, bot.frostSlow + dt * 2);
      if (bot.frostSlow <= 0 && !bot.dead) {
        bot.dead = true;
        if (players[bot.id]) players[bot.id].dead = true;
        const mesh = remoteMeshes[bot.id];
        if (mesh) {
          mesh.visible = false;
          // Visual icicle: leave a frozen sprite briefly
          const ice = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.6, 6), new THREE.MeshLambertMaterial({ color: 0x99eeff, transparent: true, opacity: 0.8 }));
          ice.position.set(bot.x, 0.8, bot.z);
          scene.add(ice);
          setTimeout(() => scene.remove(ice), 1500);
        }
        myKills++;
        creditWeaponKill(currentEquippedId());
        saveKillReplay(bot.id, currentEquippedId());
        const kc = document.getElementById('kill-count');
        if (kc) kc.textContent = `Kills: ${myKills}`;
        showAnnouncement('FROZEN', players[bot.id]?.name || 'Bot', '#99eeff', 1400);
        onEntityDied(bot.id, myId);
        setTimeout(() => clientRespawnBot(bot.id), 3000);
        continue;
      }
    }

    // During countdown: bots walk toward the centre so they're in position when it ends
    if (!roundLive) continue; // frozen during countdown
    try {

    // ── Turret mode: stationary, rotates and fires only ──────────────────────
    if (bot.state === 'turret') {
      const target = getBotTarget(bot);
      if (target) {
        bot.rotY = Math.atan2(-(target.x - bot.x), -(target.z - bot.z));
        const dist = Math.hypot(target.x - bot.x, target.z - bot.z);
        const targetZ = target.isPlayer ? camera.position.z : target.z;
        // Turret fires through its slit — only needs target to be in front (not through back wall)
        if (dist < 50 && targetZ < bot.z - 1.5 && now - bot.lastShot > 55) {
          const tx = target.x, tz = target.z;
          {
            bot.lastShot = now;
            if (target.isPlayer) {
              const _mpType = meleeAbilityBuff?.type;
              const _turretHits = botShotHitsPlayer(bot, dist).hit; // duck below the slit to dodge
              if (_turretHits && !isShielded() && !isRiotShieldBlocking() && _mpType !== 'parry' && _mpType !== 'deflect') {
                socket.emit('botHitMe', { botId: bot.id, weapon: 'mg42' }); applyBotDamageToPlayer('mg42', bot.id);
              } else if (_turretHits && !isShielded() && _mpType === 'deflect') {
                const _defPos1 = remoteMeshes[bot.id] ? remoteMeshes[bot.id].position.clone().setY(1.0) : camera.position.clone().setY(1.0);
                emitHit(bot.id, `deflect_${myId}_${Date.now()}`, 'katana', _defPos1);
              }
            } else if (target.botRef) {
              const dmg = 15;
              target.botRef.hp = Math.max(0, target.botRef.hp - dmg);
              if (target.botRef.hp <= 0 && !target.botRef.dead) {
                target.botRef.dead = true;
                socket.emit('hitBot', { botId: target.botRef.id, weapon: 'mg42',
                                        bulletId: `trt_${now}`, killerId: bot.id, headshot: true, instakill: true });
              } else {
                socket.emit('hitBot', { botId: target.botRef.id, weapon: 'mg42',
                                        bulletId: `trt_${now}`, killerId: bot.id, headshot: false });
              }
            }
            // Visual tracer
            const origin = new THREE.Vector3(bot.x, 1.5, bot.z);
            const dir = new THREE.Vector3(tx - bot.x, 0, tz - bot.z).normalize();
            spawnLocalBullet(origin, dir, `trt_${bot.id}_${now}`, false, 145, 0xffcc55, 0.055, 'mg42');
          }
        }
      }
      const mesh = remoteMeshes[bot.id];
      if (mesh) { mesh.position.set(bot.x, 0, bot.z); mesh.rotation.y = bot.rotY; }
      continue; // skip movement block
    }

    const target = getBotTarget(bot);
    let moveX = 0, moveZ = 0;

    // ── Detect HP drop (bot was just hit) ─────────────────────────────────
    const wasHit = (bot.prevHp !== undefined && bot.hp < bot.prevHp);
    bot.prevHp = bot.hp;

    // ── Tick tactical timer ───────────────────────────────────────────────
    bot.tacTimer  = (bot.tacTimer  || 0) - dt;
    bot.strafeFlipTimer = (bot.strafeFlipTimer || 0) - dt;

    if (!target) {
      // Wander
      bot.state = 'wander';
      bot.wanderTimer -= dt;
      if (bot.wanderTimer <= 0) { bot.wanderAngle += (Math.random()-0.5)*1.8; bot.wanderTimer = 1.5 + Math.random()*2; }
      moveX = Math.sin(bot.wanderAngle) * 4 * dt;
      moveZ = Math.cos(bot.wanderAngle) * 4 * dt;
      bot.rotY = Math.atan2(moveX, moveZ);
    } else {
      const dx = target.x - bot.x, dz = target.z - bot.z;
      const dist = Math.sqrt(dx*dx + dz*dz);
      bot.rotY = Math.atan2(-dx, -dz);

      // ── State transitions ───────────────────────────────────────────────

      // Melee charge: enemy bot + player is critically low HP
      const playerLow = playerHp < 80 && !isDead;
      // MEDIUM/HARD: only initiate melee charge if player is within reasonable range (don't sprint across the map)
      const meleeChargeMaxStart = bot.difficulty && bot.difficulty !== 'easy' ? 12 : 999;
      // HARD/EXPERT: NEVER charge into someone with a close-range demolition weapon — keep distance instead
      const skipMeleeCharge = (bot.difficulty === 'hard' || bot.difficulty === 'expert') && playerHasScaryCloseWeapon();
      if (bot.team === 'enemy' && playerLow && target.isPlayer && bot.state !== 'melee_charge' && dist < meleeChargeMaxStart && !skipMeleeCharge) {
        bot.state = 'melee_charge';
        bot.tacTimer = 6;
      }
      // HARD/EXPERT: if already charging and player has a scary weapon, abort immediately
      if ((bot.difficulty === 'hard' || bot.difficulty === 'expert') && bot.state === 'melee_charge' && playerHasScaryCloseWeapon()) {
        bot.state = 'flank'; bot.tacTimer = 0;
        bot.strafeDir = Math.random() < 0.5 ? 1 : -1;
        bot.strafeFlipTimer = 1.2 + Math.random() * 1.8;
      }
      // Cancel melee charge if player recovered or died
      if (bot.state === 'melee_charge' && (!playerLow || isDead)) {
        bot.state = 'chase'; bot.tacTimer = 0;
      }
      // MEDIUM/HARD: abandon charge if player gets far away (no infinite sprint)
      if (bot.state === 'melee_charge' && bot.difficulty && bot.difficulty !== 'easy'
          && dist > (bot.meleeChargeAbandonDist || 18)) {
        bot.state = 'chase'; bot.tacTimer = 0;
      }
      // Melee charge expires
      if (bot.state === 'melee_charge' && bot.tacTimer <= 0) {
        bot.state = 'chase';
      }

      // Cover: just took a hit → duck behind nearest wall
      if (wasHit && bot.hp > 0 && bot.state !== 'melee_charge' && bot.state !== 'cover') {
        const cp = findBotCover(bot, target);
        if (cp) { bot.state = 'cover'; bot.coverPt = cp; bot.tacTimer = 2.5 + Math.random() * 2; }
      }
      // Exit cover after timer
      if (bot.state === 'cover' && bot.tacTimer <= 0) {
        bot.state = 'flank'; bot.tacTimer = 2 + Math.random() * 2;
        bot.strafeDir = Math.random() < 0.5 ? 1 : -1;
        bot.strafeFlipTimer = 1.5 + Math.random() * 2;
      }

      // ── Player command override: react physically to quick-chat (Z key) ───
      const cmdOv = bot._commandOverride;
      const cmdActive = cmdOv && now < cmdOv.until && bot.team === 'ally';
      if (cmdActive) {
        switch (cmdOv.type) {
          case 'run':
          case 'fallback': {
            // Go to nearest cover, regardless of personal flee logic
            if (bot.state !== 'cover') {
              const cp = findBotCover(bot, target) || { x: bot.team === 'ally' ? bot.x : 0, z: 35 }; // fallback toward ally side
              bot.state = 'cover';
              bot.coverPt = cp;
              bot.tacTimer = (cmdOv.until - now) / 1000;
            }
            break;
          }
          case 'charge':
          case 'group_push': {
            // Force chase, cancel hit-and-run + cover
            bot.state = 'chase';
            bot.coverPt = null;
            bot.hitAndRunUntil = 0; bot.hitAndRunTarget = null;
            // If close enough, melee_charge
            if (dist < 8 && bot.hp >= 100) {
              bot.state = 'melee_charge';
              bot.tacTimer = 4;
            }
            break;
          }
          case 'cover_player': {
            // Move TOWARD the player position to defend them
            const pdx = cmdOv.coverPos.x - bot.x, pdz = cmdOv.coverPos.z - bot.z;
            const pdist = Math.hypot(pdx, pdz);
            if (pdist > 4) {
              // Head toward player as a chase target
              bot.state = 'chase';
              bot._coverPlayerActive = true;
              // Override the move vector this frame
              bot._coverMoveX = (pdx / pdist) * 9 * dt;
              bot._coverMoveZ = (pdz / pdist) * 9 * dt;
            } else {
              bot._coverPlayerActive = true;
              bot._coverMoveX = 0; bot._coverMoveZ = 0;
              bot.state = 'flank';
            }
            break;
          }
          case 'spotted': {
            // Add the player's current position to team sightings so all expert bots know
            teamSightings[bot.team] = { x: camera.position.x, z: camera.position.z, t: now };
            // Push toward player
            bot.state = 'chase';
            bot.hitAndRunUntil = 0;
            break;
          }
          case 'flank': {
            // Move wide perpendicular to the line bot→target
            const dx = target.x - bot.x, dz = target.z - bot.z;
            const len = Math.max(0.01, Math.hypot(dx, dz));
            const perpX = -dz / len, perpZ = dx / len;
            const side = (bot.id.charCodeAt(bot.id.length - 1) & 1) ? 1 : -1;
            bot.hitAndRunTarget = {
              x: Math.max(-46, Math.min(46, bot.x + perpX * side * 12 + dx / len * 4)),
              z: Math.max(-46, Math.min(46, bot.z + perpZ * side * 12 + dz / len * 4)),
            };
            bot.hitAndRunUntil = Math.min(cmdOv.until, now + 2500);
            bot.state = 'flank';
            break;
          }
          case 'hold': {
            // Stay in place, just shoot. Cancel movement, hold current position.
            bot.state = 'flank'; // flank still allows shooting; movement gets overridden
            bot._holdPosActive = true;
            bot.hitAndRunUntil = 0;
            break;
          }
          case 'regroup': {
            // Sprint toward the player's position (cmdOv.coverPos was set at command time)
            const rdx = cmdOv.coverPos.x - bot.x, rdz = cmdOv.coverPos.z - bot.z;
            const rdist = Math.hypot(rdx, rdz);
            if (rdist > 3) {
              bot.state = 'chase';
              bot._regroupMoveX = (rdx / rdist) * 12 * dt;
              bot._regroupMoveZ = (rdz / rdist) * 12 * dt;
              bot._regroupActive = true;
            } else {
              bot._regroupActive = false;
              bot.state = 'flank';
            }
            break;
          }
          case 'cover_sniper': {
            // Heads down — go to nearest cover, low profile
            if (bot.state !== 'cover') {
              const cp = findBotCover(bot, target);
              if (cp) {
                bot.state = 'cover';
                bot.coverPt = cp;
                bot.tacTimer = (cmdOv.until - now) / 1000;
              }
            }
            break;
          }
          case 'watch_flank': {
            // Just look around — random direction jiggle this frame
            bot.rotY = (bot.rotY || 0) + (Math.random() - 0.5) * 0.5;
            // No movement override; bot still does normal behavior otherwise
            break;
          }
          case 'scatter': {
            // Pick a scatter direction once and stick to it (perpendicular to player + away)
            if (!bot._scatterAngle) {
              const px = cmdOv.coverPos.x, pz = cmdOv.coverPos.z;
              const away = Math.atan2(bot.z - pz, bot.x - px);
              // Random offset ±90° so each ally goes a different direction
              bot._scatterAngle = away + (Math.random() - 0.5) * Math.PI;
            }
            const sa = bot._scatterAngle;
            bot._scatterMoveX = Math.cos(sa) * 11 * dt;
            bot._scatterMoveZ = Math.sin(sa) * 11 * dt;
            bot.state = 'flank';
            bot.hitAndRunUntil = 0;
            bot._scatterActive = true;
            break;
          }
          case 'distract': {
            // Push out into LOS of nearest enemy and shoot loudly to draw aggro
            // Find nearest enemy bot to "show off" to
            let nearestEnemy = null, nDist = Infinity;
            for (const ob of gameBots) {
              if (ob.dead || ob.team === bot.team || ob.id === bot.id) continue;
              const d = Math.hypot(ob.x - bot.x, ob.z - bot.z);
              if (d < nDist) { nDist = d; nearestEnemy = ob; }
            }
            if (nearestEnemy) {
              // Move toward an exposed spot — straight toward enemy minus a bit
              bot.state = 'chase';
              bot.coverPt = null;
              bot.hitAndRunUntil = 0;
              const edx = nearestEnemy.x - bot.x, edz = nearestEnemy.z - bot.z;
              const ed = Math.max(0.01, Math.hypot(edx, edz));
              bot._distractMoveX = (edx / ed) * 9 * dt;
              bot._distractMoveZ = (edz / ed) * 9 * dt;
              bot._distractActive = true;
            }
            break;
          }
        }
      } else if (bot._commandOverride && now >= bot._commandOverride.until) {
        bot._commandOverride = null;
        bot._coverPlayerActive = false;
        bot._holdPosActive = false;
        bot._regroupActive = false;
        bot._scatterActive = false;
        bot._distractActive = false;
        bot._scatterAngle = 0;
      }

      // HARD/EXPERT: comprehensive flee check — many situations make bots want to disengage
      const isExpert = bot.difficulty === 'expert';
      // Suppress flee while complying with a charge/push order (committed to attack)
      const fleeSuppressed = cmdActive && (cmdOv.type === 'charge' || cmdOv.type === 'group_push' || cmdOv.type === 'cover_player');
      const fleeReason = fleeSuppressed ? null : botShouldFlee(bot, dist);
      const URGENT_FLEE = new Set(['low_hp','panic','frosted','scary_close','reloading']);
      if (fleeReason && bot.state !== 'cover' && bot.state !== 'melee_charge') {
        const cp = findBotCover(bot, target);
        if (cp) {
          bot.state = 'cover';
          bot.coverPt = cp;
          // Longer cover commit for more urgent reasons
          const urgentTime = (fleeReason === 'low_hp' || fleeReason === 'panic' || fleeReason === 'frosted') ? 5 : 3;
          bot.tacTimer = urgentTime + Math.random() * 1.5;
          // Speech bubble: react to the flee trigger
          if (bot._fleeReason !== fleeReason) {
            const line = pickThought(fleeReason);
            if (line) showBotSpeech(bot, line, 2400, '#ff8888');
          }
          bot._fleeReason = fleeReason; // store for HUD/debug
        } else {
          // No cover available → at least force a flank away
          bot.state = 'flank';
          bot.strafeDir = Math.random() < 0.5 ? 1 : -1;
          bot.strafeFlipTimer = 1.5;
        }
      }
      // HARD/EXPERT: aggressive charge check — only fires when no URGENT flee reason
      // Charges have priority over non-urgent flee (e.g., outmatched, losing_trade) when bot has clear advantage.
      const chargeReason = (!fleeReason || !URGENT_FLEE.has(fleeReason)) ? botShouldCharge(bot, dist) : null;
      if (chargeReason && bot.state !== 'melee_charge') {
        // Speech bubble on new charge reason
        if (bot._chargeReason !== chargeReason) {
          const line = pickThought(chargeReason);
          if (line) showBotSpeech(bot, line, 2200, '#ffaa44');
        }
        bot._chargeReason = chargeReason;
        // Override prior flee state set above (if non-urgent) → push close
        bot.state = 'chase';
        bot.coverPt = null;
        bot.tacTimer = 0;
        // If close enough, escalate to melee_charge for the finish
        if (dist < 10 && (chargeReason === 'finisher' || chargeReason === 'airborne' || chargeReason === 'slowed_target')) {
          if (bot.state !== 'melee_charge') {
            const meleeline = pickThought('melee_charge');
            if (meleeline) showBotSpeech(bot, meleeline, 1800, '#ff4444');
          }
          bot.state = 'melee_charge';
          bot.tacTimer = 5;
        }
      }

      // EXPERT: hit-and-run — after firing, periodically reposition to a new flanking spot
      if (isExpert && now >= bot.nextRunCheck) {
        const tune = bot.tune || botTuning(bot.difficulty);
        bot.nextRunCheck = now + 3200 + Math.random() * 1200;
        // Reposition occasionally, but never so often that Expert stops applying pressure.
        if (now > bot.hitAndRunUntil && bot.state !== 'cover' && bot.state !== 'melee_charge' && dist < 24 && Math.random() < tune.hitRunChance) {
          // Pick a perpendicular reposition point relative to target
          const dx = target.x - bot.x, dz = target.z - bot.z;
          const len = Math.max(0.01, Math.hypot(dx, dz));
          const perpX = -dz / len, perpZ = dx / len;
          const side = Math.random() < 0.5 ? 1 : -1;
          const moveDist = 5 + Math.random() * 4;
          bot.hitAndRunTarget = {
            x: Math.max(-46, Math.min(46, bot.x + perpX * side * moveDist + dx / len * 2)),
            z: Math.max(-46, Math.min(46, bot.z + perpZ * side * moveDist + dz / len * 2)),
          };
          bot.hitAndRunUntil = now + 1500 + Math.random() * 800;
        }
      }

      // EXPERT: player is reloading → push hard, UNLESS they have a scary close weapon (reload ends fast)
      const playerReloading = target.isPlayer && (typeof reloading !== 'undefined' && reloading);
      if (isExpert && playerReloading && bot.state !== 'melee_charge' && dist < 18 && !playerHasScaryCloseWeapon()) {
        bot.state = 'chase'; // sprint toward
        bot.hitAndRunUntil = 0; // cancel hit-and-run if running
      }

      // EXPERT: weapon-aware engagement — counter the player's current weapon
      let preferDist = null;
      if (isExpert && target.isPlayer && typeof currentWeapon !== 'undefined' && currentWeapon) {
        const cls = classifyWeapon(currentWeapon.id);
        // If player has a close-range weapon → bot stays far. If player has long-range → bot closes in.
        if (cls === 'close')      preferDist = 18;   // outrange shotguns/flamethrower
        else if (cls === 'long')  preferDist = 6;    // get in their face vs snipers
        else                       preferDist = 12;
        // DPS-aware: if player's weapon out-DPSes ours, prefer more cover/distance
        const playerDPS = WEAPON_DPS_CACHE[currentWeapon.id] || 150;
        if (playerDPS > bot.dps * 1.2 && bot.hp < 200) {
          // Outgunned → seek cover instead of brawling
          if (bot.state !== 'cover') {
            const cp = findBotCover(bot, target);
            if (cp) { bot.state = 'cover'; bot.coverPt = cp; bot.tacTimer = 2.0 + Math.random() * 1.5; }
          }
          preferDist = Math.max(preferDist, 16);
        }
      }
      // HARD: personality-based engagement preferences
      if (preferDist == null) {
        if (bot.personality === 'sniper')    preferDist = 22;
        else if (bot.personality === 'camper')  preferDist = 14;
        else if (bot.personality === 'aggressor') preferDist = 5;
        else if (bot.personality === 'tactician') preferDist = 11;
      }
      // HARD/EXPERT: hard cap — if player wields a demolition close-range weapon, force >=20m engagement
      if ((bot.difficulty === 'hard' || bot.difficulty === 'expert') && target.isPlayer && playerHasScaryCloseWeapon()) {
        preferDist = Math.max(preferDist || 20, 20);
        // Cancel any active hit-and-run if it would put us closer to the player
        if (bot.hitAndRunTarget && Math.hypot(bot.hitAndRunTarget.x - camera.position.x, bot.hitAndRunTarget.z - camera.position.z) < dist) {
          bot.hitAndRunUntil = 0;
          bot.hitAndRunTarget = null;
        }
      }
      // HARD/EXPERT: any flee reason → push preferred distance up significantly
      if (fleeReason) {
        const fleeDist = fleeReason === 'low_hp' || fleeReason === 'panic' ? 24
                       : fleeReason === 'frosted' || fleeReason === 'reloading' ? 22
                       : fleeReason === 'outnumbered' || fleeReason === 'last_one' ? 20
                       : 16;
        preferDist = Math.max(preferDist || fleeDist, fleeDist);
        // Cancel any hit-and-run that would put us in danger
        bot.hitAndRunUntil = 0; bot.hitAndRunTarget = null;
      }
      // HARD/EXPERT: charging → push preferred distance way DOWN (rush in)
      if (chargeReason) {
        // Finishers want point-blank; others just want close range
        const chargeDist = chargeReason === 'finisher' || chargeReason === 'airborne' ? 3 : 5;
        preferDist = Math.min(preferDist == null ? chargeDist : preferDist, chargeDist);
        // Cancel hit-and-run while charging — go straight in
        bot.hitAndRunUntil = 0; bot.hitAndRunTarget = null;
      }

      // ── Close-combat avoidance: back away unless we have absolute advantage ─
      // Applies to ALL difficulties (including easy) when fighting the player.
      // Bot only commits to close range if its weapon out-DPSes the player or it's a close-range class AND HP is healthy.
      const isPlayerTarget = target.isPlayer && bot.team === 'enemy' && !isDead;
      if (isPlayerTarget && dist < 6 && bot.state !== 'cover' && bot.state !== 'melee_charge') {
        if (!hasCloseRangeAdvantage(bot)) {
          // Force a back-away flank at ~10m
          bot.state = 'flank';
          preferDist = Math.max(preferDist || 10, 10);
          if (!bot.strafeFlipTimer || bot.strafeFlipTimer <= 0) {
            bot.strafeDir = Math.random() < 0.5 ? 1 : -1;
            bot.strafeFlipTimer = 1.2 + Math.random() * 1.8;
          }
        }
      }

      // Distance-based state selection (only when not in special states)
      if (bot.state !== 'cover' && bot.state !== 'melee_charge') {
        // Personality-modified thresholds
        const chaseThresh = preferDist != null ? preferDist + 6 : 20;
        const closeThresh = preferDist != null ? Math.max(3, preferDist - 3) : 5;
        if (dist > chaseThresh) {
          bot.state = 'chase';
        } else if (dist > closeThresh) {
          if (bot.state === 'chase' || bot.state === 'wander') {
            bot.state = 'flank';
            bot.strafeDir = Math.random() < 0.5 ? 1 : -1;
            bot.strafeFlipTimer = 1.2 + Math.random() * 1.8;
            bot.tacTimer = 3 + Math.random() * 3;
          }
        } else {
          // HARD/EXPERT: if player has a scary close-range weapon, ALWAYS flank (back away), never rush
          if ((bot.difficulty === 'hard' || bot.difficulty === 'expert') && isPlayerTarget && playerHasScaryCloseWeapon()) {
            bot.state = 'flank';
          }
          // Close range: only rush if we have the advantage; otherwise hold flank for back-away
          else if (isPlayerTarget && !hasCloseRangeAdvantage(bot)) {
            bot.state = 'flank';
          } else {
            bot.state = (bot.personality === 'sniper') ? 'flank' : 'chase';
          }
        }
      }

      // Flip strafe direction periodically
      if (bot.strafeFlipTimer <= 0) {
        bot.strafeDir = Math.random() < 0.5 ? 1 : -1;
        bot.strafeFlipTimer = 1.2 + Math.random() * 1.8;
      }

      // ── Movement by state ───────────────────────────────────────────────
      if (bot.state === 'melee_charge') {
        // Sprint straight at player, ignoring walls; swing when close
        const spd = 13 * dt;
        if (dist > 1.8) {
          moveX = (dx / dist) * spd;
          moveZ = (dz / dist) * spd;
        } else if (now - bot.lastShot > 750) {
          bot.lastShot = now;
          if (bot.team === 'enemy' && !isShielded() && !isRiotShieldBlocking()) {
            const _mp = meleeAbilityBuff?.type;
            if (_mp === 'parry' || _mp === 'deflect') {
              if (_mp === 'deflect') {
                const _defPos2 = remoteMeshes[bot.id] ? remoteMeshes[bot.id].position.clone().setY(1.0) : camera.position.clone().setY(1.0);
                emitHit(bot.id, `deflect_${myId}_${Date.now()}`, 'katana', _defPos2);
              }
            } else {
              socket.emit('botHitMe', { botId: bot.id, weapon: 'bat' }); applyBotDamageToPlayer('bat', bot.id);
            }
          }
          const hitPos = new THREE.Vector3(bot.x + dx * 0.5, 1.3, bot.z + dz * 0.5);
          spawnHitParticle(hitPos);
        }
      } else if (bot.state === 'cover') {
        // Sprint to cover point; once there, peek-shoot briefly before timer expires
        const cpDx = bot.coverPt.x - bot.x, cpDz = bot.coverPt.z - bot.z;
        const cpDist = Math.hypot(cpDx, cpDz);
        if (cpDist > 0.7) {
          const spd = 10 * dt;
          moveX = (cpDx / cpDist) * spd;
          moveZ = (cpDz / cpDist) * spd;
        } else if (bot.tacTimer < 0.8) {
          // Peek: sidestep out of cover to shoot
          const perpX = -dz / Math.max(dist, 0.01);
          const perpZ =  dx / Math.max(dist, 0.01);
          moveX = perpX * bot.strafeDir * 6 * dt;
          moveZ = perpZ * bot.strafeDir * 6 * dt;
        }
      } else if (bot.state === 'flank') {
        // HOLD POSITION override: don't move, just shoot
        if (bot._holdPosActive) {
          moveX = 0; moveZ = 0;
        } else
        // SCATTER override: sprint in pre-chosen scatter direction
        if (bot._scatterActive && bot._scatterMoveX != null) {
          moveX = bot._scatterMoveX;
          moveZ = bot._scatterMoveZ;
        } else
        // EXPERT: hit-and-run takes priority — sprint to repositioning target
        if (isExpert && now < bot.hitAndRunUntil && bot.hitAndRunTarget) {
          const hdx = bot.hitAndRunTarget.x - bot.x, hdz = bot.hitAndRunTarget.z - bot.z;
          const hdist = Math.hypot(hdx, hdz);
          if (hdist > 0.5) {
            const spd = 11 * dt;
            moveX = (hdx / hdist) * spd;
            moveZ = (hdz / hdist) * spd;
          } else {
            bot.hitAndRunUntil = 0; // arrived
          }
        } else {
          // ── KITE-RETREAT: if player has a scary close weapon and we're too close ──
          // Run mostly AWAY from the player and pick the open path (no wall-hugging)
          const scaryClose = target.isPlayer && bot.team === 'enemy' && !isDead
                          && typeof playerHasScaryCloseWeapon === 'function' && playerHasScaryCloseWeapon()
                          && dist < (preferDist || 16);
          if (scaryClose) {
            const spd = 12 * dt; // even faster — sprint to escape
            // Sample 16 candidate angles around the FULL 360° (not just back-facing)
            // so bots can escape sideways or even briefly toward the player if their back is to a wall.
            let bestAngle = 0, bestScore = -Infinity, bestCandX = 0, bestCandZ = 0;
            const playerAngle = Math.atan2(-dz, -dx); // points away from player
            for (let i = 0; i < 16; i++) {
              const a = (i / 16) * Math.PI * 2; // 0..360°
              const candX = Math.cos(a), candZ = Math.sin(a);
              // Probe 4m ahead — longer probe to find truly open paths
              const probeX = bot.x + candX * 4;
              const probeZ = bot.z + candZ * 4;
              const clearAhead = hasLineOfSight(bot.x, bot.z, probeX, probeZ);
              // Distance from probe to player (higher = better — we want to be farther)
              const newDist = Math.hypot(probeX - tx, probeZ - tz);
              // Penalize directions that point TOWARD the player (cosine of angle vs away-vector)
              const awayAlignment = Math.cos(a - playerAngle); // 1 = perfectly away, -1 = straight at player
              // Score: huge bonus for clear path, bonus for distance gained, bonus for not facing player
              const score = (clearAhead ? 20 : -10) + (newDist - dist) * 2 + awayAlignment * 3;
              if (score > bestScore) {
                bestScore = score;
                bestAngle = a;
                bestCandX = candX; bestCandZ = candZ;
              }
            }
            // Move primarily along the chosen escape vector
            moveX = bestCandX * spd;
            moveZ = bestCandZ * spd;
            bot._kiting = true; // flag for shooting block: prioritize firing while retreating
            bot._lastKiteAngle = bestAngle;
          } else {
            // Normal flank — strafe around target while shooting
            const perpX = -dz / Math.max(dist, 0.01);
            const perpZ =  dx / Math.max(dist, 0.01);
            const spd = 8 * dt;
            const targetD = (isExpert && preferDist != null) ? preferDist : 10;
            const leanIn  = dist > targetD + 3 ?  0.4 : (dist < targetD - 3 ? -0.35 : 0);
            moveX = (perpX * bot.strafeDir * 0.75 + (dx / Math.max(dist,0.01)) * leanIn) * spd;
            moveZ = (perpZ * bot.strafeDir * 0.75 + (dz / Math.max(dist,0.01)) * leanIn) * spd;
            bot._kiting = false;
          }
        }
      } else {
        // chase / rush — direct approach (OR "cover me!" / "regroup" / "distract" override)
        if (bot._distractActive && bot._distractMoveX != null) {
          moveX = bot._distractMoveX;
          moveZ = bot._distractMoveZ;
        } else if (bot._regroupActive && bot._regroupMoveX != null) {
          moveX = bot._regroupMoveX;
          moveZ = bot._regroupMoveZ;
        } else if (bot._coverPlayerActive && (bot._coverMoveX != null)) {
          moveX = bot._coverMoveX;
          moveZ = bot._coverMoveZ;
        } else if ((bot.stuckTimer || 0) > 0) {
          bot.stuckTimer -= dt;
          moveX = Math.sin(bot.wanderAngle) * 7 * dt;
          moveZ = Math.cos(bot.wanderAngle) * 7 * dt;
        } else if (dist > 4) {
          const spd = 9 * dt;
          moveX = (dx / dist) * spd;
          moveZ = (dz / dist) * spd;
        }
      }

      // ── Shooting (all states except melee_charge which uses swings) ─────
      if (bot.state !== 'melee_charge') {
        const w = WEAPONS.find(w => w.id === bot.weaponId) || WEAPONS[0];
        const tune = bot.tune || botTuning(bot.difficulty);
        const isDDayAttacker = bot.state === 'dday_attacker';
        // MEDIUM/HARD: bot is currently reloading? skip
        const isReloading = bot.reloadUntil && now < bot.reloadUntil;
        const canShoot = !isReloading;
        // 🔫 Burst-aware fire interval. Auto weapons fire a rapid burst at
        // their REAL fireRate, then pause between bursts. Semi weapons keep
        // the old one-shot-per-interval pacing.
        let fireInterval;
        if (isDDayAttacker) {
          fireInterval = Math.max(w.fireRate, 500) + Math.random() * 400;
        } else if (w.auto) {
          fireInterval = (bot.burstLeft || 0) > 0
            ? Math.max(55, w.fireRate)                          // mid-burst: real auto cadence
            : tune.fireMin + Math.random() * tune.fireRand;     // between bursts: long pause
        } else {
          fireInterval = Math.max(w.fireRate, tune.fireMin) + Math.random() * tune.fireRand;
        }
        const tx = target.isPlayer ? camera.position.x : target.x;
        const tz = target.isPlayer ? camera.position.z : target.z;
        const hasLOS = hasLineOfSight(bot.x, bot.z, tx, tz);

        // MEDIUM/HARD: reaction time — only "see" the target after a delay
        if (hasLOS) {
          if (!bot.firstSeenAt) {
            bot.firstSeenAt = now;
            // Speech bubble: spotted the player (only ~25% chance to avoid spam)
            if (target.isPlayer && bot.team === 'enemy' && Math.random() < 0.25) {
              const line = pickThought('spotted');
              if (line) showBotSpeech(bot, line, 1600, '#ffff88');
            }
          }
          // Track last-seen position for hard mode memory
          bot.lastSeenPos = { x: tx, z: tz };
          bot.lastSeenAt = now;
          // EXPERT: telepathic team comms — share sightings of the player with all allies
          if (bot.difficulty === 'expert' && target.isPlayer) {
            teamSightings[bot.team] = { x: tx, z: tz, t: now };
          }
        } else {
          bot.firstSeenAt = 0; // reset reaction timer on LOS break
        }
        const reactionDone = !bot.reactionMs || (hasLOS && now - bot.firstSeenAt >= bot.reactionMs);

        // HARD/EXPERT: weapon ability — fire a high-damage powershot on cooldown
        const useAbilities = bot.difficulty === 'hard' || bot.difficulty === 'expert';
        // EXPERT: shorter ability CD + always fires opportunistically while player is reloading
        const expertAbilityReady = bot.difficulty === 'expert' && (typeof reloading !== 'undefined' && reloading)
                                  && now >= (bot.nextAbilityAt || 0) - 6000;
        if (useAbilities && hasLOS && reactionDone && roundLive && dist < 28
            && (now >= (bot.nextAbilityAt || 0) || expertAbilityReady)
            && !isReloading && target.isPlayer && bot.team === 'enemy'
            && !isShielded() && !isRiotShieldBlocking()) {
          bot.nextAbilityAt = now + (bot.difficulty === 'expert' ? 7000 : 12000) + Math.random() * 6000;
          // Pick a high-dmg "ability" projectile based on weapon class
          const abId = w.id === 'srx' ? 'srx' : w.id === 'lever' ? 'lever_ab'
                     : w.id === 'railgun' ? 'railgun_ab' : w.id === 'boombow' ? 'boombow_ab'
                     : w.id === 'hand_cannon' ? 'hand_cannon_ab' : null;
          if (abId) {
            applyBotDamageToPlayer(abId, bot.id);
            const origin = new THREE.Vector3(bot.x, 1.5, bot.z);
            const dir = new THREE.Vector3((tx - bot.x), 0, (tz - bot.z)).normalize();
            playWeaponSound(abId, { baseWeapon: w, remote: true, position: origin, volume: 1.05 });
            spawnLocalBullet(origin, dir, `botab_${bot.id}_${now}`, false, (w.bulletSpeed||120)*1.5, 0xffaa00, 0.10, abId);
          }
        }
        // While kiting (retreating from scary close weapon), reduce fire interval so they shoot while running
        const kiteFireInterval = bot._kiting ? Math.max(w.fireRate, Math.min(360, tune.fireMin)) + Math.random() * Math.min(180, tune.fireRand) : fireInterval;
        const shootRange = bot.difficulty === 'expert' ? 46 : bot.difficulty === 'hard' ? 40 : 35;
        if (canShoot && reactionDone && roundLive && dist < shootRange && now - bot.lastShot > kiteFireInterval) {
          if (hasLOS) {
            bot.lastShot = now;
            // 🔫 Burst bookkeeping: start a new 4-8 round burst when empty
            if (w.auto) {
              if ((bot.burstLeft || 0) <= 0) bot.burstLeft = 4 + Math.floor(Math.random() * 5);
              bot.burstLeft--;
            }
            // 🛹 Raycast the shot against the player's (crouch-adjusted) hitbox
            // so ducking/sliding lets shots sail overhead. Auto weapons add an
            // extra spray-inaccuracy roll on top since they fire fast.
            let shotHits = true;
            if (target.isPlayer) {
              shotHits = botShotHitsPlayer(bot, dist).hit;
              if (shotHits && w.auto) {
                const sprayChance = Math.max(0.35, Math.min(0.92, (bot.aimSkill || 1) * 0.6 - dist * 0.005));
                shotHits = Math.random() < sprayChance;
              }
            }
            // MEDIUM/HARD: consume ammo, trigger reload when empty
            if (bot.difficulty && bot.difficulty !== 'easy') {
              bot.botAmmo--;
              if (bot.botAmmo <= 0) {
                const reloadMs = tune.reloadMin + Math.random() * tune.reloadRand;
                bot.reloadUntil = now + reloadMs;
                bot.botAmmo = bot.botMag;
                bot.burstLeft = 0; // reload interrupts the burst
              }
            }
            if (target.isPlayer) {
              if (bot.team === 'enemy' && !isShielded() && !isRiotShieldBlocking() && shotHits) {
                const _mp = meleeAbilityBuff?.type;
                if (_mp === 'parry' || _mp === 'deflect') {
                  if (_mp === 'deflect') {
                    const _defPos3 = remoteMeshes[bot.id] ? remoteMeshes[bot.id].position.clone().setY(1.0) : camera.position.clone().setY(1.0);
                    emitHit(bot.id, `deflect_${myId}_${Date.now()}`, 'katana', _defPos3);
                  }
                } else {
                  socket.emit('botHitMe', { botId: bot.id, weapon: bot.weaponId }); applyBotDamageToPlayer(bot.weaponId, bot.id);
                }
              }
            } else if (target.botRef) {
              target.botRef.hp = Math.max(0, target.botRef.hp - (w.damage || 25));
              if (target.botRef.hp <= 0 && !target.botRef.dead) {
                target.botRef.dead = true;
                socket.emit('hitBot', { botId: target.botRef.id, weapon: bot.weaponId,
                                        bulletId: `bb_${now}`, killerId: bot.id, headshot: true, instakill: true });
              }
            }
            const origin = new THREE.Vector3(bot.x, 1.5, bot.z);
            // MEDIUM/HARD: skill-based spread reduction (higher aimSkill = tighter shots)
            const skill = bot.aimSkill || 1;
            const spreadBase = bot.state === 'cover' ? 0.18 : 0.06;
            const spread = (spreadBase + Math.max(0, dist - 8) / 100) / skill;
            // MEDIUM/HARD: bullet leading for player targets
            let aimX = tx, aimZ = tz;
            if (target.isPlayer && bot.difficulty && bot.difficulty !== 'easy') {
              const bulletSpeed = w.bulletSpeed || 120;
              const travelTime = dist / bulletSpeed;
              // Lead by predicted player movement, dampened by skill (better aim = more accurate lead)
              const leadScale = Math.min(0.7, skill * 0.5);
              aimX = tx + playerVelocity.x * travelTime * leadScale;
              aimZ = tz + playerVelocity.z * travelTime * leadScale;
              // EXPERT: trajectory prediction — fit a short trend over position history for curved paths
              if (bot.difficulty === 'expert' && playerPosHistory.length >= 4) {
                const recent = playerPosHistory.slice(-4);
                const oldest = recent[0], newest = recent[recent.length - 1];
                const dtH = Math.max(0.05, (newest.t - oldest.t) / 1000);
                const trendVx = (newest.x - oldest.x) / dtH;
                const trendVz = (newest.z - oldest.z) / dtH;
                // Use the trend instead of instantaneous velocity — handles strafing/curving better
                aimX = tx + trendVx * travelTime * 0.85;
                aimZ = tz + trendVz * travelTime * 0.85;
              }
            }
            const aimDx = aimX - bot.x, aimDz = aimZ - bot.z;
            const aimLen = Math.max(Math.hypot(aimDx, aimDz), 0.01);
            const dir = new THREE.Vector3(
              aimDx / aimLen + (Math.random()-0.5)*spread,
              (Math.random()-0.5)*0.03,
              aimDz / aimLen + (Math.random()-0.5)*spread
            ).normalize();
            playWeaponSound(w.id, { baseWeapon: w, remote: true, position: origin });
            spawnLocalBullet(origin, dir, `bot_${bot.id}_${now}`, false, w.bulletSpeed || 120, w.bulletColor, w.bulletSize, w.id);
          }
        }
      }
    }

    // ☣️ Hazard avoidance — steer around damage zones (lava, acid, toxic, fire).
    // Easy bots are oblivious; medium/hard/expert dodge with rising urgency.
    if (bot.difficulty && bot.difficulty !== 'easy') {
      const avoidStrength = bot.difficulty === 'expert' ? 1.6 : bot.difficulty === 'hard' ? 1.2 : 0.8;
      let pushX = 0, pushZ = 0;
      const checkZone = (z, pad) => {
        const ddx = bot.x - z.x, ddz = bot.z - z.z;
        const d = Math.hypot(ddx, ddz);
        const danger = (z.r || z.radius || 2) + pad; // react before touching
        if (d < danger && d > 0.01) {
          const force = (danger - d) / danger; // 0..1, stronger when closer
          pushX += (ddx / d) * force;
          pushZ += (ddz / d) * force;
        }
      };
      const g = activeMapGimmicks;
      if (g.damageZones) for (const z of g.damageZones) checkZone(z, 2.5);
      // Active burn zones (thermite, fire poker, firework) too
      for (const z of burnZones) checkZone(z, 2.0);
      if (pushX || pushZ) {
        const plen = Math.hypot(pushX, pushZ) || 1;
        // Blend the repulsion into the planned movement
        moveX += (pushX / plen) * Math.abs(moveX || 0.08) * avoidStrength * 2;
        moveZ += (pushZ / plen) * Math.abs(moveZ || 0.08) * avoidStrength * 2;
      }
    }

    // 🏋️ Weapon weight slows the bot (same rule as the player). Floor at 0.15.
    const botEquipped = WEAPONS.find(w => w.id === bot.weaponId);
    if (botEquipped) {
      const wgt = (botEquipped.weight != null) ? botEquipped.weight : getDefaultWeaponWeight(botEquipped);
      const wMult = Math.max(0.15, 1 - wgt);
      moveX *= wMult;
      moveZ *= wMult;
    }
    // Apply movement + wall collision
    const prevBotX = bot.x, prevBotZ = bot.z;
    let nx = bot.x + moveX, nz = bot.z + moveZ;
    // Map boundary varies — BR arena is 250×250, standard maps are 100×100
    const mapHalf = activeMapName === 'br_arena' ? 123 : 47;
    nx = Math.max(-mapHalf, Math.min(mapHalf, nx));
    nz = Math.max(-mapHalf, Math.min(mapHalf, nz));
    [nx, nz] = resolvePosCollisions(nx, nz, bot.y || 0);
    bot.x = nx; bot.z = nz;

    // ── Stuck detection: if chasing but collision ate all movement, trigger detour ─
    if (target && (bot.stuckTimer || 0) <= 0) {
      const actualMoved = Math.hypot(bot.x - prevBotX, bot.z - prevBotZ);
      const intendedMoved = Math.hypot(moveX, moveZ);
      if (intendedMoved > 0.001 && actualMoved < intendedMoved * 0.2) {
        // Blocked by wall — detour sideways for 0.5s
        const dx2 = target.x - bot.x, dz2 = target.z - bot.z;
        bot.wanderAngle = Math.atan2(dx2, dz2) + (Math.PI / 2) * (Math.random() < 0.5 ? 1 : -1) + (Math.random()-0.5) * 0.6;
        bot.stuckTimer = 0.5;
      }
    }

    // ── Kite safety: if kiting and barely moving (pinned to a wall), force a sideways break ─
    if (bot._kiting && Math.hypot(bot.x - prevBotX, bot.z - prevBotZ) < 0.04) {
      // Try BOTH perpendicular directions and pick whichever moves us more
      const lastA = bot._lastKiteAngle || 0;
      const sideA = lastA + Math.PI / 2;
      const sideB = lastA - Math.PI / 2;
      const probeDist = 3;
      const aClear = hasLineOfSight(bot.x, bot.z, bot.x + Math.cos(sideA) * probeDist, bot.z + Math.sin(sideA) * probeDist);
      const bClear = hasLineOfSight(bot.x, bot.z, bot.x + Math.cos(sideB) * probeDist, bot.z + Math.sin(sideB) * probeDist);
      const chosen = aClear ? sideA : (bClear ? sideB : sideA);
      // Apply an immediate forced step along the perpendicular
      const stepX = Math.cos(chosen) * 0.30;
      const stepZ = Math.sin(chosen) * 0.30;
      let fx = Math.max(-47, Math.min(47, bot.x + stepX));
      let fz = Math.max(-47, Math.min(47, bot.z + stepZ));
      [fx, fz] = resolvePosCollisions(fx, fz, bot.y || 0);
      bot.x = fx; bot.z = fz;
      bot.strafeDir = -bot.strafeDir;
      bot.strafeFlipTimer = 0.8;
    }
    // ── Anti-freeze safety net: if bot hasn't moved in 0.5s, force them to walk ─
    // This catches ANY freeze cause: stuck cover-camping, dead-state-machine paths, broken hit-and-run, etc.
    const movedThisFrame = Math.hypot(bot.x - prevBotX, bot.z - prevBotZ);
    if (movedThisFrame < 0.01) {
      bot.freezeTimer = (bot.freezeTimer || 0) + dt;
    } else {
      bot.freezeTimer = 0;
    }
    if (bot.freezeTimer >= 0.5) {
      // Force unstick: snap out of cover, clear hit-and-run, pick a new wander direction, and step
      bot.state = 'wander';
      bot.coverPt = null;
      bot.hitAndRunUntil = 0;
      bot.hitAndRunTarget = null;
      bot.tacTimer = 0;
      bot.wanderAngle = Math.random() * Math.PI * 2;
      bot.stuckTimer = 0.6; // brief commitment to the new direction
      bot.freezeTimer = 0;
      // Apply a small immediate step so they visibly move this frame
      const stepX = Math.sin(bot.wanderAngle) * 0.15;
      const stepZ = Math.cos(bot.wanderAngle) * 0.15;
      let fx = Math.max(-47, Math.min(47, bot.x + stepX));
      let fz = Math.max(-47, Math.min(47, bot.z + stepZ));
      [fx, fz] = resolvePosCollisions(fx, fz, bot.y || 0);
      bot.x = fx; bot.z = fz;
    }

    // Apply frost-slow to movement (bots get slower as they freeze)
    const frostMult = (bot.frostSlow || 100) / 100;
    if (frostMult < 1) { bot.x = prevBotX + (bot.x - prevBotX) * frostMult; bot.z = prevBotZ + (bot.z - prevBotZ) * frostMult; }

    // Sync remote mesh position (with vertical lift from air grenade)
    const mesh = remoteMeshes[bot.id];
    if (mesh) { mesh.position.set(bot.x, bot.y || 0, bot.z); mesh.rotation.y = bot.rotY; }
    } catch(e) { console.error('[botAI] error for bot', bot.id, ':', e.message, e.stack); }
  }
  // Batch-send bot positions to server
  botMoveTimer += dt;
  if (botMoveTimer >= BOT_MOVE_INTERVAL) {
    botMoveTimer = 0;
    const moves = gameBots.filter(b => !b.dead).map(b => ({ id: b.id, x: b.x, y: 1, z: b.z, rotY: b.rotY }));
    if (moves.length) socket.emit('botMove', moves);
  }
}

// ── Per-frame character animation pass ──────────────────────────────────────
// Bots never crouch; remote human players' crouch/slide is inferred from their
// camera eye-height (synced via the `move` event into players[id].y).
function animateCharacters(dt) {
  for (const id in remoteMeshes) {
    const mesh = remoteMeshes[id];
    if (!mesh || !mesh.visible || !mesh._rig) continue;
    let crouchTarget = 0;
    const isBot = gameBots.some(b => b.id === id);
    if (!isBot) {
      const p = players[id];
      if (p && typeof p.y === 'number') {
        // 1.65 standing → 0.70 sliding. Map to 0..1 crouch amount.
        crouchTarget = Math.max(0, Math.min(1, (1.65 - p.y) / (1.65 - 0.70)));
      }
    }
    animateCharacterMesh(mesh, dt, crouchTarget);
  }
}

// 👑 Crown the match's top fragger ("the strongest person"). Admin meshes keep
// their crown regardless. Best-effort/local: each client crowns whoever it sees
// leading among the meshes it has. Throttled to ~3 Hz.
let _kingId = null, _kingTimer = 0;
function updateKingCrown(dt) {
  _kingTimer += dt;
  if (_kingTimer < 0.33) return;
  _kingTimer = 0;
  const killsOf = (id) => {
    if (id === myId) return myKills || 0;
    const b = gameBots.find(b => b.id === id);
    if (b && typeof b.kills === 'number') return b.kills;
    return (players[id] && players[id].kills) || 0;
  };
  let bestId = null, bestK = 0;
  if ((myKills || 0) > bestK) { bestK = myKills; bestId = myId; }
  for (const id in remoteMeshes) {
    const k = killsOf(id);
    if (k > bestK) { bestK = k; bestId = id; }
  }
  if (bestK < 1) bestId = null; // nobody is "strongest" until a kill happens
  if (bestId === _kingId) return;
  // Un-crown the previous king (unless they're an admin — admins always wear it)
  if (_kingId && _kingId !== myId && remoteMeshes[_kingId] && !(players[_kingId] && players[_kingId].isAdmin)) {
    setMeshCrown(remoteMeshes[_kingId], false);
  }
  _kingId = bestId;
  if (_kingId && _kingId !== myId && remoteMeshes[_kingId]) setMeshCrown(remoteMeshes[_kingId], true);
}

// ── Game loop ──────────────────────────────────────────────────────────────
let lastTime = performance.now();
function loop() {
  requestAnimationFrame(loop);
  const now = performance.now();
  const dt = Math.min((now-lastTime)/1000, 0.05);
  lastTime = now;
  updateMovement(dt);
  updateBullets(dt);
  updateBotAI(dt);
  animateCharacters(dt); // walk-cycle + slide pose for bots & remote players
  updateKingCrown(dt);   // 👑 crown the current top fragger
  updateBurnZones(dt); // firework launcher DOT fields
  updateTraps(dt); // tripwires, magnet mines, bounce pads, hologram decoys
  updateP2WSystems(dt); // orbital strikes, guardian drones, nano shield
  updateMapGimmicks(dt); // lava DOT, jump pads, low-grav zones, ice friction
  updateBotSpeech(dt);  // bot speech bubbles follow their heads
  updateChatFeed();     // fade old chat lines
  updateAdminCheats(dt);// admin cheat tick (fly, kill aura, etc.)
  updateUAV(dt);        // 🛰️ Predator UAV overlay tick
  updateMapEffects(dt); // airport darkening, chernobyl gas, mortar prompt
  updateBatch5(dt);     // train scroll, vacuum, weather, lights-out, chandelier, debris
  killcamSample(performance.now());
  updateKillcam(performance.now());
  updateVehiclePrompt();// 🚙 vehicle pickup prompt (BR arena)
  updateVehiclePiloting(dt); // 🚙 move + sync vehicle while piloted
  updateReloadAnim();   // weapon tilts/rotates during reload
  updateSwitchbladeHUD(); // shows only when switchblade is active
  updateSpectatorCamera(dt); // follow teammates while dead
  if (spectatorState) updateSpectatorHUD(); // refresh HUD (ally name / count may change)
  if (match?.type === 'range') updateRange(dt);

  // ── Melee ability buff updates ─────────────────────────────────────────────
  if (meleeAbilityBuff) {
    const mab = meleeAbilityBuff;
    const nowMs = Date.now();

    // Expiry for timed buffs
    if (mab.endTime && nowMs > mab.endTime) {
      // Reset spin rotation on the actually-equipped melee (any model that was spinning)
      if (mab.type === 'spin') {
        for (const m of meleeModels) m.rotation.z = 0;
      }
      meleeAbilityBuff = null;
      updateAbilityHUD();
    }

    // Melee spin (screwdriver, yo-yo, etc): auto-damage nearby enemies + spin the model
    else if (mab.type === 'spin') {
      if (!mab.lastSpinHits) mab.lastSpinHits = {};
      // Spin the currently-equipped melee model visually
      if (activeSlot === 'melee' && meleeModels[selectedMeleeIdx])
        meleeModels[selectedMeleeIdx].rotation.z += 25 * dt;
      const item = MELEE_ITEMS[selectedMeleeIdx];
      const spinRange = (item?.id === 'yoyo') ? 3.5 : 5.0;
      const spinDmg   = (item?.id === 'yoyo') ? 15 : 18;
      const spinInterval = 100;
      for (const [pid, mesh] of Object.entries(remoteMeshes)) {
        const d = camera.position.distanceTo(mesh.position.clone().setY(camera.position.y));
        if (d > spinRange) continue;
        const p = players[pid];
        if (!p || p.team !== 'enemy') continue;
        const lastHit = mab.lastSpinHits[pid] || 0;
        if (nowMs - lastHit < spinInterval) continue;
        mab.lastSpinHits[pid] = nowMs;
        const hitPos = mesh.position.clone().setY(1.0);
        const dummy = TRAINING_DUMMIES.find(dd => dd.id === pid);
        if (dummy) handleDummyHit(dummy, mesh, { damage: spinDmg }, hitPos);
        else emitHit(pid, `spin_${myId}_${nowMs}_${pid}`, item?.id || 'screwdriver', hitPos);
        spawnHitParticle(hitPos);
      }
    }
    // Rev Up auto-swing (chainsaw, nunchucks, etc with melee_revup ability)
    else if (mab.type === 'revup' && activeSlot === 'melee' && MELEE_ITEMS[selectedMeleeIdx]?.ability?.type === 'melee_revup') {
      if (!isDead) tryMelee();
    }
  }

  // Spear: re-show spear model when CD has expired
  if (spearThrown && selectedMeleeIdx === 4) { // 4 = spear index
    const spearItem = MELEE_ITEMS[4];
    const elapsed = Date.now() - (abilityCDs[spearItem.id] || 0);
    if (elapsed >= spearItem.ability.cd) {
      spearThrown = false;
      if (activeSlot === 'melee' && meleeModels[4]) meleeModels[4].visible = true;
    }
  }

  updateMatchTimer(dt);
  updateGrenades(dt);
  updateDDay(dt);
  updateGrenadeWindup(dt);
  updateAbilityBuff(dt);
  updatePendingFanFire(dt);
  updateAbilityHUD();
  updateMeleeSwing(dt);
  updateWeaponSelector();
  updateTrashcanProximity();
  updateDamageNumbers();
  // Spin minigun barrel cluster around the forward (Z) axis
  if (currentWeaponIdx !== null && weaponModels[currentWeaponIdx]?._barrelCluster && shooting) {
    weaponModels[currentWeaponIdx]._barrelCluster.rotation.z +=
      (weaponModels[currentWeaponIdx]._spinRate || 10) * dt;
  }
  // While the theater is active, theaterTick() owns rendering (it runs even when
  // loop() isn't, e.g. opened from the cold menu). Don't double-render here.
  if (!THEATER.active) renderer.render(scene, camera);
}

// ── Loadout screen ─────────────────────────────────────────────────────────
// ── 🛒 Standalone SHOP screen (separate from the loadout / ready flow) ──
let shopTab = 'bundles'; // 'bundles' | 'primary' | 'secondary' | 'melee' | 'utility'
function openShop() {
  if (!currentUser) { alert('Log in first.'); return; }
  let scr = document.getElementById('shop-screen');
  if (!scr) {
    scr = document.createElement('div');
    scr.id = 'shop-screen';
    scr.style.cssText = 'display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(5,5,15,0.97);z-index:200;color:#fff;font-family:"Courier New",monospace;overflow-y:auto;padding:24px;';
    document.body.appendChild(scr);
  }
  scr.style.display = 'block';
  renderShop();
}
function closeShop() {
  const scr = document.getElementById('shop-screen');
  if (scr) scr.style.display = 'none';
}

function renderShop() {
  const scr = document.getElementById('shop-screen');
  if (!scr || !currentUser) return;
  const credits = currentUser.isAdmin ? '∞' : (currentUser.credits ?? 0);
  const frags   = currentUser.isAdmin ? '∞' : (currentUser.fragments ?? 0);
  const ch = currentUser.chests || { common: 0, rare: 0 };
  const tabs = [
    ['bundles',   '💼 BUNDLES'],
    ['primary',   '🔫 PRIMARY'],
    ['secondary', '🔫 SECONDARY'],
    ['melee',     '⚔️ MELEE'],
    ['utility',   '🧰 UTILITY'],
    ['chests',    '📦 CHESTS'],
    ['wheel',     '🎡 WHEEL'],
    ['upgrade',   '✨ UPGRADES'],
  ];
  scr.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #444;padding-bottom:10px;margin-bottom:14px;">
      <div style="font-size:22px;letter-spacing:6px;color:#aaccff;">🛒 WEAPON SHOP</div>
      <div style="display:flex;gap:14px;align-items:center;">
        <span style="font-size:13px;color:#ffdd55;">💰 ${credits}</span>
        <span style="font-size:13px;color:#aaccff;">🧩 ${frags}</span>
        <span style="font-size:13px;color:#ddccff;">📦 ${ch.common}/${ch.rare}</span>
        <button id="shop-close" style="padding:6px 14px;background:#3a1a1a;color:#ff8888;border:1px solid #ff4444;cursor:pointer;font-family:inherit;font-size:11px;letter-spacing:2px;border-radius:4px;">✕ CLOSE</button>
      </div>
    </div>
    <div id="shop-tabs" style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;"></div>
    <div id="shop-body" style="display:flex;gap:10px;flex-wrap:wrap;"></div>
  `;
  const tabsEl = scr.querySelector('#shop-tabs');
  for (const [id, label] of tabs) {
    const b = document.createElement('button');
    const active = shopTab === id;
    b.textContent = label;
    b.style.cssText = `padding:7px 14px;background:${active ? '#2a2a4a' : '#1a1a1a'};color:${active ? '#aaccff' : '#888'};border:1px solid ${active ? '#6699ff' : '#444'};cursor:pointer;font-family:inherit;font-size:11px;letter-spacing:2px;border-radius:4px;`;
    b.addEventListener('click', () => { shopTab = id; renderShop(); });
    tabsEl.appendChild(b);
  }
  scr.querySelector('#shop-close').addEventListener('click', closeShop);
  const body = scr.querySelector('#shop-body');
  if (shopTab === 'bundles')      renderShopBundles(body);
  else if (shopTab === 'chests')  renderShopChests(body);
  else if (shopTab === 'wheel')   renderShopWheel(body);
  else if (shopTab === 'upgrade') renderShopUpgrades(body);
  else                            renderShopItems(body, shopTab);
}

function renderShopChests(body) {
  const ch = currentUser.chests || { common: 0, rare: 0 };
  const passActive = adminPassActive();
  const minsLeft = Math.ceil(adminPassMsLeft() / 60000);
  body.innerHTML = `
    <div style="width:100%;font-size:11px;color:#aaa;margin-bottom:14px;letter-spacing:1px;">
      Open chests to get 🧩 weapon fragments + 💰 credits.
      Use 100 fragments to unlock any weapon, or upgrade ones you own.
      Earn chests by playing matches (chance per match), or buy them here.
    </div>
    <div style="width:100%;background:linear-gradient(135deg,#3a1a1a,#2a1a3a);border:2px solid #ff8844;border-radius:6px;padding:14px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;">
      <div>
        <div style="font-size:17px;font-weight:bold;color:#ffcc88;letter-spacing:2px;">🪖 ADMIN PASS · 10 MINUTES</div>
        <div style="font-size:11px;color:#ddc;margin-top:4px;">Unlocks EVERY weapon (admin items included) for one 10-minute window. Try anything.</div>
        ${passActive ? `<div style="font-size:12px;color:#88ff99;margin-top:6px;">✓ ACTIVE — ${minsLeft} min left</div>` : ''}
      </div>
      <button id="buy-admin-pass" ${passActive ? 'disabled' : ''} style="padding:10px 22px;background:${passActive ? '#222' : '#3a1a1a'};color:${passActive ? '#666' : '#ffcc88'};border:1px solid ${passActive ? '#444' : '#ff8844'};font-size:13px;letter-spacing:2px;cursor:${passActive ? 'default' : 'pointer'};border-radius:4px;font-family:inherit;">
        ${passActive ? 'ACTIVE' : `BUY · ${ADMIN_PASS_COST}💰`}
      </button>
    </div>
  `;
  const ap = body.querySelector('#buy-admin-pass');
  if (ap) ap.addEventListener('click', async () => { if (await buyAdminPass()) renderShop(); });
  for (const type of ['common', 'rare']) {
    const have = ch[type] || 0;
    const cost = CHEST_PRICES_CLIENT[type];
    const isRare = type === 'rare';
    const card = document.createElement('div');
    card.style.cssText = `min-width:240px;background:#0f1018;border:2px solid ${isRare ? '#aa66ff' : '#888'};border-radius:6px;padding:14px;margin-right:10px;`;
    card.innerHTML = `
      <div style="font-size:22px;font-weight:bold;color:${isRare ? '#cc99ff' : '#ccc'};">${isRare ? '🟣 RARE' : '📦 COMMON'} CHEST</div>
      <div style="font-size:11px;color:#aaa;margin:6px 0 10px;line-height:1.5;">
        ${isRare ? '35-80 frags · 30-100 credits · 5% chance of a free weapon' : '10-25 frags · 0-30 credits'}
      </div>
      <div style="font-size:13px;margin-bottom:10px;">You have: <b style="color:${isRare ? '#cc99ff' : '#ccc'};">${have}</b></div>
      <div style="display:flex;gap:6px;">
        <button class="open" ${have <= 0 ? 'disabled' : ''} style="flex:1;padding:8px;background:${have > 0 ? '#1a2a1a' : '#222'};color:${have > 0 ? '#88ff99' : '#555'};border:1px solid ${have > 0 ? '#88ff99' : '#444'};font-size:12px;cursor:${have > 0 ? 'pointer' : 'not-allowed'};border-radius:4px;font-family:inherit;">OPEN</button>
        <button class="buy" style="flex:1;padding:8px;background:#1a1a2a;color:#aabbff;border:1px solid #6688cc;font-size:12px;cursor:pointer;border-radius:4px;font-family:inherit;">BUY ${cost}💰</button>
      </div>
    `;
    const o = card.querySelector('.open');
    const b = card.querySelector('.buy');
    o.addEventListener('click', async () => { if (await openChest(type)) renderShop(); });
    b.addEventListener('click', async () => { if (await buyChest(type)) renderShop(); });
    body.appendChild(card);
  }
}

function renderShopWheel(body) {
  body.innerHTML = `
    <div style="width:100%;font-size:11px;color:#aaa;margin-bottom:14px;letter-spacing:1px;">
      🎡 Spin the wheel for credits, fragments, or — if you're VERY lucky (0.3%) — a free rare weapon.
      1 free spin per day; extra spins cost 100 credits.
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;width:100%;">
      <div id="wheel-visual" style="width:280px;height:280px;border-radius:50%;border:8px solid #ffdd55;background:conic-gradient(#ffdd55 0deg 162deg,#aaccff 162deg 288deg,#88ff99 288deg 338deg,#ff8866 338deg 358deg,#cc99ff 358deg 360deg);display:flex;align-items:center;justify-content:center;font-size:60px;transition:transform 4s cubic-bezier(0.2,0.85,0.2,1);">🎡</div>
      <div id="wheel-result" style="margin-top:18px;font-size:18px;letter-spacing:2px;color:#ffdd55;min-height:30px;text-align:center;"></div>
      <button id="wheel-spin" style="margin-top:16px;padding:12px 40px;background:#3a2a1a;color:#ffdd55;border:2px solid #ffdd55;font-size:16px;letter-spacing:3px;cursor:pointer;border-radius:6px;font-family:inherit;">
        ${currentUser.freeSpinAvailable || currentUser.isAdmin ? '🎁 FREE SPIN' : 'SPIN · 100💰'}
      </button>
    </div>
  `;
  const wheel = body.querySelector('#wheel-visual');
  const out = body.querySelector('#wheel-result');
  let rot = 0;
  body.querySelector('#wheel-spin').addEventListener('click', async () => {
    out.textContent = 'Spinning…';
    rot += 360 * 5 + Math.random() * 360;
    wheel.style.transform = `rotate(${rot}deg)`;
    const res = await spinWheel();
    setTimeout(() => {
      if (!res) { out.textContent = '— spin failed —'; return; }
      const lines = [];
      if (res.kind === 'jackpot' && res.weapon) lines.push(`✨ JACKPOT! Unlocked: ${res.weapon}`);
      else if (res.kind === 'bigBundle')         lines.push(`💎 BIG BUNDLE: +${res.credits || 0}💰 · +${res.fragments || 0}🧩`);
      else if (res.kind === 'smallRare')         lines.push(`✨ RARE: ${res.credits ? `+${res.credits}💰` : `+${res.fragments}🧩`}`);
      else if (res.kind === 'bigFragments')      lines.push(`🧩 +${res.fragments} fragments!`);
      else if (res.kind === 'fragments')         lines.push(`🧩 +${res.fragments} fragments`);
      else if (res.kind === 'credits')           lines.push(`💰 +${res.credits} credits`);
      out.innerHTML = lines.join('<br/>');
      // Re-render so the spin button updates (free → paid)
      setTimeout(renderShop, 2200);
    }, 4000);
  });
}

function renderShopUpgrades(body) {
  body.innerHTML = `
    <div style="width:100%;font-size:11px;color:#aaa;margin-bottom:14px;letter-spacing:1px;">
      ✨ Spend fragments to upgrade weapons you own. Each stat can be levelled up to ${MAX_LEVELS_PER_STAT} times independently — max +120% damage, +250% mag, -85% reload.<br>
      Costs scale: ${UPGRADE_COSTS_CLIENT.join(' / ')} fragments per level. Effects per level: +12% damage, +25% magazine, -15% reload time.
    </div>
  `;
  const owned = [...FREE_WEAPONS, ...(currentUser.purchased || [])];
  const uniq  = [...new Set(owned)];
  for (const id of uniq) {
    const w = WEAPONS.find(x => x.id === id) || MELEE_ITEMS.find(x => x.id === id) || SUPPORT_ITEMS.find(x => x.id === id);
    if (!w) continue;
    // Only primary/secondary upgrades affect gameplay right now — filter to slot-bearing items
    if (w.slot !== 'primary' && w.slot !== 'secondary') continue;
    const up = getWeaponUpgrades(id);
    const total = totalUpgradeLevels(id);
    const fullyMaxed = up.damage >= MAX_LEVELS_PER_STAT && up.mag >= MAX_LEVELS_PER_STAT && up.reload >= MAX_LEVELS_PER_STAT;
    const card = document.createElement('div');
    card.style.cssText = 'min-width:240px;max-width:270px;background:#0f1018;border:1px solid #444;border-radius:5px;padding:10px 12px;';
    const statRow = (stat, label, cssClr, border) => {
      const lvl = up[stat] || 0;
      const maxed = lvl >= MAX_LEVELS_PER_STAT;
      const cost = maxed ? null : UPGRADE_COSTS_CLIENT[lvl];
      return `<button data-stat="${stat}" ${maxed ? 'disabled' : ''} style="padding:5px;background:${maxed ? '#222' : '#1a1a1a'};color:${maxed ? '#88ff99' : cssClr};border:1px solid ${maxed ? '#88ff99' : border};font-size:10px;cursor:${maxed ? 'default' : 'pointer'};border-radius:3px;font-family:inherit;display:flex;justify-content:space-between;">
        <span>${label} (${lvl}/${MAX_LEVELS_PER_STAT})</span>
        <span>${maxed ? 'MAXED' : cost + '🧩'}</span>
      </button>`;
    };
    card.innerHTML = `
      <div style="font-size:13px;font-weight:bold;color:#ddd;">${w.name}</div>
      <div style="font-size:9px;color:#888;margin:2px 0 6px;">${w.type}</div>
      <div style="font-size:10px;color:#aaccff;margin-bottom:6px;">
        Total: ${total}/${MAX_LEVELS_PER_STAT * 3}
      </div>
      ${fullyMaxed ? '<div style="text-align:center;color:#88ff99;font-size:11px;">✓ FULLY MAXED</div>' : `
        <div style="display:flex;flex-direction:column;gap:4px;">
          ${statRow('damage', '+12% DMG',    '#ff8866', '#cc6644')}
          ${statRow('mag',    '+25% MAG',    '#88ff99', '#44aa66')}
          ${statRow('reload', '-15% RELOAD', '#aaccff', '#6699cc')}
        </div>
      `}
    `;
    card.querySelectorAll('[data-stat]').forEach(btn => {
      if (btn.disabled) return;
      btn.addEventListener('click', async () => { if (await upgradeWeapon(id, btn.dataset.stat)) renderShop(); });
    });
    body.appendChild(card);
  }
}

function renderShopBundles(body) {
  for (const b of BUNDLES) {
    const totalSum = b.items.reduce((s, id) => s + (shopCost(id) ?? 0), 0);
    const ownedCt = b.items.filter(id => isOwned(id)).length;
    const allOwned = ownedCt === b.items.length;
    const card = document.createElement('div');
    card.style.cssText = `min-width:200px;max-width:240px;background:#1a1424;border:2px solid ${allOwned ? '#666' : '#aa66ff'};border-radius:6px;padding:12px 14px;`;
    card.innerHTML = `
      <div style="font-size:15px;font-weight:bold;color:${allOwned ? '#88ff99' : '#ddccff'};margin-bottom:4px;">${b.icon} ${b.name}</div>
      <div style="font-size:10px;color:#aaa;margin-bottom:8px;">${b.desc}</div>
      <div style="font-size:10px;color:#ccc;line-height:1.5;margin-bottom:10px;">${b.items.map(id => isOwned(id) ? `<s style="color:#666">${id}</s>` : id).join(' · ')}</div>
      <div style="font-size:9px;color:#aaccff;margin-bottom:8px;">${ownedCt}/${b.items.length} owned · save ${totalSum - b.price} (was ${totalSum})</div>
      ${allOwned
        ? '<div style="text-align:center;color:#88ff99;font-size:12px;padding:6px 0;">✓ FULLY OWNED</div>'
        : `<button class="shop-buy-bundle" style="width:100%;padding:8px;background:#1a2a1a;color:#88ff99;border:1px solid #88ff99;font-size:13px;cursor:pointer;border-radius:4px;font-family:inherit;letter-spacing:1px;">BUY · ${b.price}💰</button>`
      }
    `;
    const btn = card.querySelector('.shop-buy-bundle');
    if (btn) btn.addEventListener('click', async () => { if (await buyBundle(b.id)) renderShop(); });
    body.appendChild(card);
  }
}

function renderShopItems(body, slot) {
  // Decide which source list + how each card describes itself
  let source, descFn, pickIsAdmin;
  if (slot === 'primary') {
    source = WEAPONS.filter(w => w.slot !== 'secondary' && !w.ddayOnly);
    descFn = w => `DMG ${w.damage} · MAG ${w.mag} · ${w.auto ? 'AUTO' : 'SEMI'}`;
    pickIsAdmin = w => !!w.adminItem;
  } else if (slot === 'secondary') {
    source = WEAPONS.filter(w => w.slot === 'secondary' && !w.ddayOnly);
    descFn = w => `DMG ${w.damage} · MAG ${w.mag}`;
    pickIsAdmin = w => !!w.adminItem;
  } else if (slot === 'melee') {
    source = MELEE_ITEMS;
    descFn = m => `DMG ${m.damage} · RANGE ${m.range}`;
    pickIsAdmin = m => !!m.adminItem;
  } else {
    source = SUPPORT_ITEMS;
    descFn = s => `${s.heal ? 'HEAL ' + s.heal : 'DMG ' + (s.damage || 0)} · USES ${s.uses}`;
    pickIsAdmin = s => !!s.adminItem;
  }
  for (const item of source) {
    if (pickIsAdmin(item)) continue; // admin items are promo-only — not in shop
    const id = item.id;
    const cost = shopCost(id);
    if (cost == null) continue; // not priced → not yet in the shop catalogue
    const owned = isOwned(id);
    const card = document.createElement('div');
    card.style.cssText = `min-width:170px;max-width:200px;background:#0f1018;border:1px solid ${owned ? '#88ff99' : '#444'};border-radius:5px;padding:10px 12px;`;
    card.innerHTML = `
      <div style="font-size:13px;font-weight:bold;color:${owned ? '#88ff99' : '#ddd'};">${item.name}</div>
      <div style="font-size:9px;color:#888;margin:2px 0 4px;">${item.type}</div>
      <div style="font-size:10px;color:#bbb;margin-bottom:8px;">${descFn(item)}</div>
      ${owned
        ? `<div style="text-align:center;color:#88ff99;font-size:11px;">${FREE_WEAPONS.has(id) ? 'FREE' : '✓ OWNED'}</div>`
        : `<div style="display:flex;flex-direction:column;gap:4px;">
             <div style="display:flex;gap:4px;">
               <button class="sbuy"   style="flex:1;padding:5px;background:#1a2a1a;color:#88ff99;border:1px solid #88ff99;font-size:10px;cursor:pointer;border-radius:3px;font-family:inherit;">BUY ${cost}💰</button>
               <button class="strial" style="flex:1;padding:5px;background:#1a1a2a;color:#aabbff;border:1px solid #6688cc;font-size:10px;cursor:pointer;border-radius:3px;font-family:inherit;">TRIAL ${shopTrialCost(id)}💰</button>
             </div>
             <button class="sfrag" style="padding:4px;background:#1a1a2a;color:#aaccff;border:1px solid #6677aa;font-size:9px;cursor:pointer;border-radius:3px;font-family:inherit;">UNLOCK · ${fragmentUnlockCost(id)}🧩</button>
           </div>`
      }
    `;
    const b = card.querySelector('.sbuy');
    const t = card.querySelector('.strial');
    const f = card.querySelector('.sfrag');
    if (b) b.addEventListener('click', async () => { if (await buyWeapon(id)) renderShop(); });
    if (t) t.addEventListener('click', async () => { if (await trialWeapon(id)) renderShop(); });
    if (f) f.addEventListener('click', async () => { if (await unlockWithFragments(id)) renderShop(); });
    body.appendChild(card);
  }
}

// ── 📋 Best Loadouts: 30 curated meta builds ────────────────────────────
const BEST_LOADOUTS = [
  { icon:'🏆', name:'The Lockdown',            desc:'Tournament-grade fundamentals', p:'burst',              s:'revolver',         m:'knife',          u:'medkit' },
  { icon:'⚡', name:'Caffeine Crash',          desc:'Outrun every bullet',           p:'vector',             s:'machine_pistol',   m:'knife',          u:'adrenaline' },
  { icon:'🎯', name:'Headhunter',              desc:'One scope. One tap.',           p:'srx',                s:'revolver',         m:'knife',          u:'smoke' },
  { icon:'💥', name:'Demo Disco',              desc:'Make the floor shake',          p:'grenade_launcher',   s:'pocket_rocket',    m:'sledge',         u:'sticky_charge' },
  { icon:'🔥', name:"Arsonist's Holiday",      desc:'Everything burns',              p:'flamethrower',       s:'flare',            m:'fire_axe',       u:'sticky_charge' },
  { icon:'🤖', name:'404: You Lose',           desc:'Nothing works for them',        p:'smart_smg',          s:'emp_pistol',       m:'shock_baton',    u:'emp_grenade' },
  { icon:'🥷', name:'Lights Out',              desc:'Heard, never seen',             p:'air_rifle',          s:'blowgun',          m:'knife',          u:'smoke' },
  { icon:'🛡️', name:'Immovable Object',        desc:'You will not pass',             p:'sg100',              s:'taser',            m:'riot_shield',    u:'nano_shield' },
  { icon:'🏏', name:'Recess Bully',            desc:'Playground chaos',              p:'paintball',          s:'slingshot',        m:'cricket_bat',    u:'rubber_duck' },
  { icon:'🌪️', name:'Yeet Squad',              desc:'Send them flying',              p:'shockwave_launcher', s:'sawed_off',        m:'sledge',         u:'air_grenade' },
  { icon:'⚔️', name:'For The Realm',           desc:"Knight's loadout",              p:'sg8',                s:'flare',            m:'katana',         u:'smoke' },
  { icon:'🩸', name:'Bloodletter',             desc:'Heal off their pain',           p:'auto_shotgun',       s:'hand_cannon',      m:'vampire_blade',  u:'adrenaline' },
  { icon:'🏹', name:'Sherwood Special',        desc:'Bows + bolas',                  p:'crossbow',           s:'throwing_knives',  m:'knife',          u:'tripwire' },
  { icon:'🛹', name:'No Brakes',               desc:'Sprint-only kit',               p:'p90',                s:'machine_pistol',   m:'knife',          u:'adrenaline' },
  { icon:'🧊', name:'Permafrost',              desc:'Slow them, finish them',        p:'freeze_gun',         s:'frost_blaster',    m:'knife',          u:'smoke' },
  { icon:'⚡', name:"Thor's Allowance",        desc:'Shock therapy',                 p:'arc_rifle',          s:'taser',            m:'shock_baton',    u:'emp_grenade' },
  { icon:'🎯', name:'Steady Hand',             desc:'Mid-range scalpel',             p:'lever',              s:'duelist_pistol',   m:'bat',            u:'ammo_fountain' },
  { icon:'🍳', name:'Recipe for Disaster',     desc:'Loaded with kitchen tools',     p:'paintball',          s:'laser_pointer',    m:'frying_pan',     u:'rubber_duck' },
  { icon:'💎', name:'Credit Card Maxed',       desc:'Pure P2W energy',               p:'royal_minigun',      s:'auto_revolver',    m:'lightsabre',     u:'orbital_strike' },
  { icon:'🐢', name:'The Hedge',               desc:'Camp + punish',                 p:'srx',                s:'pistol',           m:'bat',            u:'tripwire' },
  { icon:'🌌', name:'Spacefarer',              desc:'Built in orbit',                p:'plasma_carbine',     s:'phase_pistol',     m:'phase_blade',    u:'warp_beacon' },
  { icon:'🎪', name:'Clown Convention',        desc:'Slapstick warfare',             p:'paintball',          s:'slingshot',        m:'baguette',       u:'confetti_cannon' },
  { icon:'🔮', name:'Light Show',              desc:'Refractive chaos',              p:'prism_engine',       s:'dart_gun',         m:'cane',           u:'ink_bomb' },
  { icon:'🦅', name:'Bread & Butter',          desc:'Reliable in any mode',          p:'ak30',               s:'revolver',         m:'bat',            u:'frag' },
  { icon:'🥊', name:'Closing Time',            desc:'Bar-fight ready',               p:'sg100',              s:'machine_pistol',   m:'brass_knuckles', u:'adrenaline' },
  { icon:'🌠', name:'Reality Breaker',         desc:'Endgame cosmic flex',           p:'void_harvester',     s:'ion_revolver',     m:'gravity_hammer', u:'specter_drone' },
  { icon:'🎤', name:'Loudpack',                desc:'Subtle as a brick',             p:'minigun',            s:'boomstick',        m:'chainsaw',       u:'dynamite' },
  { icon:'🪖', name:'Boots on Ground',         desc:'Mil-spec professional',         p:'an94',               s:'revolver',         m:'combat_axe',     u:'frag' },
  { icon:'🩹', name:'Field Medic',             desc:'Outlive everyone',              p:'burst',              s:'pistol',           m:'bat',            u:'healing_pulse' },
  { icon:'👻', name:'Through the Veil',        desc:'Phase past their wards',        p:'phase_driver',       s:'phase_pistol',     m:'machete',        u:'cloak' },
];

function findWeaponIdx(id) { return WEAPONS.findIndex(w => w.id === id); }
function findMeleeIdx(id)  { return MELEE_ITEMS.findIndex(m => m.id === id); }
function findUtilIdx(id)   { return SUPPORT_ITEMS.findIndex(s => s.id === id); }

function applyBestLoadout(L) {
  const pIdx = findWeaponIdx(L.p);
  const sIdx = findWeaponIdx(L.s);
  const mIdx = findMeleeIdx(L.m);
  const uIdx = findUtilIdx(L.u);
  const missing = [];
  if (pIdx < 0 || !isOwned(L.p)) missing.push(L.p);
  if (sIdx < 0 || !isOwned(L.s)) missing.push(L.s);
  if (mIdx < 0 || !isOwned(L.m)) missing.push(L.m);
  if (uIdx < 0 || !isOwned(L.u)) missing.push(L.u);
  if (missing.length) {
    alert(`Can't equip "${L.name}" — missing/unowned items:\n\n• ${missing.join('\n• ')}\n\nBuy or trial them in the shop first.`);
    return;
  }
  selectedPrimaryIdx   = pIdx;
  selectedSecondaryIdx = sIdx;
  selectedMeleeIdx     = mIdx;
  selectedSupportIdx   = uIdx;
  showLoadoutScreen(loadoutMode); // re-render to highlight the new picks
  toggleBestLoadoutsPanel(false);
}

function toggleBestLoadoutsPanel(show) {
  let panel = document.getElementById('best-loadouts-panel');
  if (show && !panel) {
    panel = document.createElement('div');
    panel.id = 'best-loadouts-panel';
    panel.style.cssText = 'position:fixed;top:0;right:0;width:380px;height:100%;background:rgba(10,10,16,0.97);border-left:2px solid #ffcc66;color:#fff;font-family:"Courier New",monospace;z-index:9700;overflow-y:auto;padding:18px;';
    document.body.appendChild(panel);
  }
  if (!panel) return;
  if (!show) { panel.style.display = 'none'; return; }
  panel.style.display = 'block';
  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #444;padding-bottom:10px;margin-bottom:14px;">
      <div style="font-size:16px;color:#ffcc66;letter-spacing:3px;">📋 BEST LOADOUTS</div>
      <button id="best-close" style="padding:4px 10px;background:#3a1a1a;color:#ff8888;border:1px solid #ff4444;cursor:pointer;font-family:inherit;font-size:11px;border-radius:4px;">✕</button>
    </div>
    <div style="font-size:10px;color:#888;margin-bottom:14px;">30 curated meta builds — tap to equip. Missing items show in the shop.</div>
    ${BEST_LOADOUTS.map((L, i) => {
      const allOwned = isOwned(L.p) && isOwned(L.s) && isOwned(L.m) && isOwned(L.u);
      return `<div data-idx="${i}" class="bl-card" style="background:${allOwned ? '#0f1018' : '#1a0f0f'};border:1px solid ${allOwned ? '#444' : '#553'};border-left:3px solid ${allOwned ? '#ffcc66' : '#666'};padding:8px 10px;margin-bottom:6px;cursor:pointer;border-radius:4px;">
        <div style="font-size:12px;color:${allOwned ? '#ffdd88' : '#aa9966'};font-weight:bold;">${L.icon} ${L.name}</div>
        <div style="font-size:9px;color:#aaa;margin:2px 0 3px;">${L.desc}</div>
        <div style="font-size:9px;color:#888;line-height:1.4;">${L.p} · ${L.s} · ${L.m} · ${L.u}</div>
        ${!allOwned ? '<div style="font-size:9px;color:#cc6644;margin-top:2px;">⚠ unowned items</div>' : ''}
      </div>`;
    }).join('')}
  `;
  panel.querySelector('#best-close').addEventListener('click', () => toggleBestLoadoutsPanel(false));
  panel.querySelectorAll('.bl-card').forEach(el => {
    el.addEventListener('click', () => applyBestLoadout(BEST_LOADOUTS[+el.dataset.idx]));
  });
}

function showLoadoutScreen(mode) {
  loadoutMode = mode || 'death';
  const screen = document.getElementById('loadout-screen');
  const pList  = document.getElementById('loadout-primary-list');
  const sList  = document.getElementById('loadout-secondary-list');
  const mList  = document.getElementById('loadout-melee-list');
  const uList  = document.getElementById('loadout-support-list');
  pList.innerHTML = ''; sList.innerHTML = ''; mList.innerHTML = ''; uList.innerHTML = '';

  // Build card elements
  const cardEls = {};
  const meleeEls = {};
  const supportEls = {};
  // Helper: is this admin item unlocked for the current user?
  const isUnlocked = (id) => adminPassActive() || !!(currentUser && currentUser.unlocks && currentUser.unlocks.includes(id));

  // Loadout screen only shows items the player can equip RIGHT NOW.
  // Buying / trialing happens in the dedicated shop (open from mode-select).
  function decorateOwnedBadge(card, id, isAdminItem) {
    if (isAdminItem) return isUnlocked(id);
    if (!isOwned(id)) return false; // caller will skip rendering
    const badge = document.createElement('div');
    badge.style.cssText = 'font-size:9px;color:#88ff99;letter-spacing:1px;margin-top:3px;';
    badge.textContent = FREE_WEAPONS.has(id) ? 'FREE' : trialingThisMatch.has(id) ? '🧪 TRIAL' : '✓ OWNED';
    card.appendChild(badge);
    // 🏆 Mastery title (if any) — shown below the OWNED badge
    const tier = weaponTitleFor(id);
    if (tier) {
      const tb = document.createElement('div');
      tb.style.cssText = `font-size:9px;color:${tier.color};letter-spacing:1px;margin-top:2px;font-weight:bold;`;
      tb.textContent = `🏆 ${tier.title} · ${weaponKills[id] || 0} kills`;
      card.appendChild(tb);
    }
    return true;
  }

  const rerenderLoadout = () => showLoadoutScreen(loadoutMode); // re-paint with fresh state

  WEAPONS.forEach((w, i) => {
    if (w.ddayOnly) return; // skip D-Day exclusive weapons
    if (w.adminItem && !isUnlocked(w.id)) return; // hide locked admin weapons
    const isPrimary = w.slot !== 'secondary';
    const card = document.createElement('div');
    card.className = 'loadout-card';
    card.dataset.idx = i;
    card.dataset.itemId = w.id;
    const fireTag = w.auto ? 'AUTO' : 'SEMI';
    const rateTag = w.ammoRegen ? 'REGEN' : `${Math.round(1000/w.fireRate)}/s`;
    const adminTag = w.adminItem ? ' <span style="color:#ffcc44;font-size:9px;">🪖 ADMIN</span>' : '';
    card.innerHTML = `<div class="lc-name">${w.name}${adminTag}</div>
      <div class="lc-type">${w.type}</div>
      <div class="lc-stats">DMG ${w.damage} · MAG ${w.mag} · ${fireTag} · ${rateTag}</div>`;
    if (!w.adminItem && !isOwned(w.id)) return; // not yet bought — hidden from loadout
    const usable = decorateOwnedBadge(card, w.id, !!w.adminItem);
    const handler = () => { if (usable) pickLoadoutWeapon(i, isPrimary, card); };
    card.addEventListener('click',      handler);
    card.addEventListener('touchstart', e => { e.stopPropagation(); e.preventDefault(); handler(); }, { passive: false });
    (isPrimary ? pList : sList).appendChild(card);
    cardEls[i] = card;
  });
  MELEE_ITEMS.forEach((m, i) => {
    if (m.adminItem && !isUnlocked(m.id)) return;
    const card = document.createElement('div');
    card.className = 'loadout-card';
    card.dataset.idx = i;
    card.dataset.itemId = m.id;
    const adminTag = m.adminItem ? ' <span style="color:#ffcc44;font-size:9px;">🪖 ADMIN</span>' : '';
    card.innerHTML = `<div class="lc-name">${m.name}${adminTag}</div>
      <div class="lc-type">${m.type}</div>
      <div class="lc-stats">DMG ${m.damage} · RANGE ${m.range} · ${Math.round(1000/m.cooldown)}/s</div>`;
    if (!m.adminItem && !isOwned(m.id)) return;
    const usable = decorateOwnedBadge(card, m.id, !!m.adminItem);
    const handler = () => { if (usable) pickMelee(i, card); };
    card.addEventListener('click',      handler);
    card.addEventListener('touchstart', e => { e.stopPropagation(); e.preventDefault(); handler(); }, { passive: false });
    mList.appendChild(card);
    meleeEls[i] = card;
  });
  SUPPORT_ITEMS.forEach((s, i) => {
    if (s.adminItem && !isUnlocked(s.id)) return;
    const card = document.createElement('div');
    card.className = 'loadout-card';
    card.dataset.idx = i;
    card.dataset.itemId = s.id;
    const stat = s.heal ? `HEAL ${s.heal}` : s.blink ? `BLINK ${s.blink}` : s.refill ? 'REFILL AMMO' : `DMG ${s.damage || 0}`;
    const adminTag = s.adminItem ? ' <span style="color:#ffcc44;font-size:9px;">🪖 ADMIN</span>' : '';
    card.innerHTML = `<div class="lc-name">${s.name}${adminTag}</div>
      <div class="lc-type">${s.type}</div>
      <div class="lc-stats">${stat} · USES ${s.uses}</div>`;
    if (!s.adminItem && !isOwned(s.id)) return;
    const usable = decorateOwnedBadge(card, s.id, !!s.adminItem);
    const handler = () => { if (usable) pickSupport(i, card); };
    card.addEventListener('click',      handler);
    card.addEventListener('touchstart', e => { e.stopPropagation(); e.preventDefault(); handler(); }, { passive: false });
    uList.appendChild(card);
    supportEls[i] = card;
  });

  // Always pre-select previous loadout when one exists; only fall back to defaults the very first time
  const readyBtn = document.getElementById('loadout-ready-btn');
  if (loadoutReady()) {
    // We've equipped a loadout before → keep it pre-selected
    cardEls[selectedPrimaryIdx]   && cardEls[selectedPrimaryIdx].classList.add('selected');
    cardEls[selectedSecondaryIdx] && cardEls[selectedSecondaryIdx].classList.add('selected');
    meleeEls[selectedMeleeIdx]    && meleeEls[selectedMeleeIdx].classList.add('selected');
    supportEls[selectedSupportIdx]&& supportEls[selectedSupportIdx].classList.add('selected');
    readyBtn.disabled = false;
    readyBtn.style.pointerEvents = 'all';
  } else {
    // First-time entry: apply defaults — pick first OWNED item per slot so
    // we don't auto-select something the user can't actually afford.
    selectedPrimaryIdx   = WEAPONS.findIndex(w => w.slot !== 'secondary' && !w.ddayOnly && isOwned(w.id));
    selectedSecondaryIdx = WEAPONS.findIndex(w => w.slot === 'secondary' && isOwned(w.id));
    selectedMeleeIdx     = MELEE_ITEMS.findIndex(m => isOwned(m.id));
    selectedSupportIdx   = SUPPORT_ITEMS.findIndex(s => isOwned(s.id));
    if (selectedPrimaryIdx   < 0) selectedPrimaryIdx   = 0;
    if (selectedSecondaryIdx < 0) selectedSecondaryIdx = WEAPONS.findIndex(w => w.slot === 'secondary');
    if (selectedMeleeIdx     < 0) selectedMeleeIdx     = 0;
    if (selectedSupportIdx   < 0) selectedSupportIdx   = 0;
    cardEls[selectedPrimaryIdx] && cardEls[selectedPrimaryIdx].classList.add('selected');
    cardEls[selectedSecondaryIdx] && cardEls[selectedSecondaryIdx].classList.add('selected');
    meleeEls[selectedMeleeIdx] && meleeEls[selectedMeleeIdx].classList.add('selected');
    supportEls[selectedSupportIdx] && supportEls[selectedSupportIdx].classList.add('selected');
    readyBtn.disabled = !loadoutReady();
    readyBtn.style.pointerEvents = loadoutReady() ? 'all' : 'none';
  }

  // Update title label to show context
  const title = screen.querySelector('h2');
  if (title) title.textContent = loadoutMode === 'swap' ? 'SWAP LOADOUT' : 'SELECT LOADOUT';

  screen.style.display = 'flex';
}

function pickLoadoutWeapon(idx, isPrimary, card) {
  const listId = isPrimary ? 'loadout-primary-list' : 'loadout-secondary-list';
  document.querySelectorAll(`#${listId} .loadout-card`).forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');
  if (isPrimary) selectedPrimaryIdx = idx; else selectedSecondaryIdx = idx;
  const ready = document.getElementById('loadout-ready-btn');
  const bothChosen = loadoutReady();
  ready.disabled = !bothChosen;
  // Explicit JS pointer-events (avoids iOS Safari CSS pseudo-class caching bug)
  ready.style.pointerEvents = bothChosen ? 'all' : 'none';
}

function pickMelee(idx, card) {
  document.querySelectorAll('#loadout-melee-list .loadout-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');
  selectedMeleeIdx = idx;
  const ready = document.getElementById('loadout-ready-btn');
  ready.disabled = !loadoutReady();
  ready.style.pointerEvents = loadoutReady() ? 'all' : 'none';
}

function pickSupport(idx, card) {
  document.querySelectorAll('#loadout-support-list .loadout-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');
  selectedSupportIdx = idx;
  const ready = document.getElementById('loadout-ready-btn');
  ready.disabled = !loadoutReady();
  ready.style.pointerEvents = loadoutReady() ? 'all' : 'none';
}

// PvP matchmaking searching overlay
function showPvpSearching(mode) {
  let el = document.getElementById('pvp-searching');
  if (!el) {
    el = document.createElement('div');
    el.id = 'pvp-searching';
    el.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.92);'
      + 'z-index:9900;display:flex;flex-direction:column;align-items:center;justify-content:center;'
      + 'color:#fff;font-family:"Courier New",monospace;';
    document.body.appendChild(el);
  }
  el.innerHTML = `
    <div style="font-size:11px;letter-spacing:4px;color:#88ccff;margin-bottom:14px;">🌐 PVP MATCHMAKING</div>
    <div style="font-size:36px;letter-spacing:8px;color:#fff;margin-bottom:10px;">SEARCHING…</div>
    <div style="font-size:14px;color:#ccc;letter-spacing:2px;">Looking for other players in ${mode.toUpperCase()}</div>
    <div style="font-size:11px;color:#888;margin-top:18px;">Will fall back to bots if no one joins in 3s</div>
    <div style="margin-top:24px;width:200px;height:3px;background:#222;border-radius:2px;overflow:hidden;">
      <div id="pvp-bar" style="height:100%;width:0%;background:#44ff66;transition:width 3s linear;"></div>
    </div>`;
  el.style.display = 'flex';
  // Animate the progress bar
  setTimeout(() => { const bar = document.getElementById('pvp-bar'); if (bar) bar.style.width = '100%'; }, 50);
}
function hidePvpSearching() {
  const el = document.getElementById('pvp-searching');
  if (el) el.style.display = 'none';
}

// ── 🌐 PvP match state (assigned by the server when matchmaking succeeds) ─
// pvpMatch: null = solo with bots (current behavior)
//           { mode, team, opponents: [{socketId, team}], isHost }
let pvpMatch = null;

// ── 🏛️ Staging-lobby state ───────────────────────────────────────────────
// ── 💡 Fun facts shown in lobby + at match start ─────────────────────
const FUN_FACTS = [
  // 🧠 Useful
  '💡 The default loadout is more versatile than it looks.',
  '💡 Aiming down sights tightens spread on every gun.',
  '💡 Reloading early loses your reserve bullets — finish the mag.',
  '💡 You can buy a Trial for 1/20 the price to test a weapon for one match.',
  '💡 Match wins award more credits than losses — try to live.',
  '💡 Upgrades cost fragments — open chests to stack them.',
  '💡 Free spin resets daily at midnight UTC.',
  '💡 The shop is open between matches from the mode-select screen.',
  '💡 Tap G to use your weapon ability; cooldown shown bottom-right.',
  '💡 Free starter loadout: AK20 + SG-8 + Pistol + Flare + Fists + Pan + Frag + Medkit.',
  // 🎯 Strategic
  '🎯 Cycler never reloads — perfect for finishing weak enemies.',
  '🎯 SR-X one-shots headshots — aim for the dome.',
  '🎯 SG100 hits like a truck up close, useless at range.',
  '🎯 Stim Shot is faster than Medkit — use it mid-fight.',
  '🎯 Smoke bombs break enemy line-of-sight even with wallhacks.',
  '🎯 Vampire Blade heals you per hit — duel multiple enemies.',
  '🎯 RPD has no reload — perfect for prolonged firefights.',
  '🎯 Knife users move 2× as fast — close gaps fast.',
  '🎯 Boombow charges up — a fully-drawn shot ignores armor.',
  '🎯 Throwing a frag at your feet during a finisher kills you and them.',
  '🎯 KOTH gives 3 lives — don\'t waste them rushing the center first.',
  // 🤫 Secretive
  '🤫 Electric weapons hit harder on ice and water.',
  '🤫 Fire weapons burn hotter in the forest.',
  '🤫 Gravity weapons amplify in low-gravity zones.',
  '🤫 Frost weapons are extra brutal in the tundra.',
  '🤫 Some sci-fi weapons grant you a double jump while equipped.',
  '🤫 You can climb the skyscraper in URBAN.',
  '🤫 Chernobyl\'s 4 reactors can be destroyed for an XP bonus.',
  '🤫 Airport glass + lights are breakable.',
  '🤫 Mortars in Trenches can be piloted by holding E.',
  '🤫 Helicopters in KOTH can be hijacked mid-air.',
  '🤫 The admin password is `(redacted)` — but it\'s patched now anyway.',
  '🤫 Type the right unlock code and get free admin weapons.',
  '🤫 0.3% wheel jackpot drops a random rare weapon ≥400 credits.',
  // 😂 Funny
  '😂 Chainsaw users are legally required to scream while charging.',
  '😂 Frying Pan does NOT in fact deflect bullets. Stop trying.',
  '😂 Confetti Cannon is everyone\'s favorite useless weapon.',
  '😂 Trash123 has every admin item. Suspicious.',
  '😂 Tennis Racket reflects bullets. We don\'t know how.',
  '😂 Baguette ability "Eat" heals you. Carbs.',
  '😂 Royal Minigun costs 3500. The "Royalty Bundle" includes 4 of those-tier items for 4500. Math.',
  '😂 If you punch the wall, the wall punches back. Not really.',
  '😂 Tac Nuke is balanced because it costs 250 of your fragile feelings.',
  '😂 Fists are free. They have always been free. They will always be free.',
];
function pickFunFact() { return FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)]; }

let stagingLobbyMode = null; // mode ID we're currently waiting in, or null
let stagingLobbyState = null; // last received state from server
let pendingLobbyConfig = null; // saved selectedModeConfig when entering lobby

function showStagingLobby(mode) {
  let el = document.getElementById('staging-lobby');
  if (!el) {
    el = document.createElement('div');
    el.id = 'staging-lobby';
    el.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9800;'
      + 'background:rgba(0,0,0,0.95);color:#fff;font-family:"Courier New",monospace;'
      + 'display:flex;flex-direction:column;align-items:center;justify-content:center;padding:30px;';
    document.body.appendChild(el);
  }
  el.style.display = 'flex';
  renderStagingLobby();
}
function hideStagingLobby() {
  const el = document.getElementById('staging-lobby');
  if (el) el.style.display = 'none';
}
function renderStagingLobby() {
  const el = document.getElementById('staging-lobby');
  if (!el) return;
  const s = stagingLobbyState;
  const mode = stagingLobbyMode || (s && s.mode);
  if (!mode) return;
  const cfg = GAME_MODE_CONFIGS[mode] || {};
  const teamSize = cfg.type === 'elim' ? (cfg.allies + 1) : Math.max(1, cfg.allies + 1);
  const allyPlayers = s ? s.players.filter(p => p.team === 'ally') : [];
  const enemyPlayers = s ? s.players.filter(p => p.team === 'enemy') : [];
  const me = s ? s.players.find(p => p.socketId === myId) : null;
  el.innerHTML = `
    <div style="font-size:32px;letter-spacing:8px;color:#ffaa44;margin-bottom:6px;">🏛️ MATCH LOBBY</div>
    <div style="font-size:14px;color:#888;letter-spacing:3px;margin-bottom:24px;">${mode.toUpperCase()} · WAITING FOR PLAYERS</div>
    <div style="display:flex;gap:60px;margin-bottom:30px;">
      <div style="text-align:center;min-width:200px;">
        <div style="font-size:11px;color:#88ccff;letter-spacing:3px;margin-bottom:8px;">TEAM ALLY (${allyPlayers.length}/${cfg.allies != null ? cfg.allies + 1 : '?'})</div>
        ${allyPlayers.length ? allyPlayers.map(p => `<div style="padding:6px 12px;background:rgba(68,170,255,0.15);border-left:3px solid #44aaff;margin-bottom:4px;text-align:left;">
          ${p.ready ? '✅' : '⏳'} ${p.name}${p.socketId === myId ? ' (YOU)' : ''}
        </div>`).join('') : '<div style="color:#666;font-style:italic;">empty</div>'}
      </div>
      <div style="font-size:36px;color:#666;align-self:center;">VS</div>
      <div style="text-align:center;min-width:200px;">
        <div style="font-size:11px;color:#ff6666;letter-spacing:3px;margin-bottom:8px;">TEAM ENEMY (${enemyPlayers.length}/${cfg.enemies != null ? cfg.enemies : '?'})</div>
        ${enemyPlayers.length ? enemyPlayers.map(p => `<div style="padding:6px 12px;background:rgba(255,68,68,0.15);border-left:3px solid #ff4444;margin-bottom:4px;text-align:left;">
          ${p.ready ? '✅' : '⏳'} ${p.name}${p.socketId === myId ? ' (YOU)' : ''}
        </div>`).join('') : '<div style="color:#666;font-style:italic;">empty</div>'}
      </div>
    </div>
    <label style="display:flex;align-items:center;gap:8px;margin-bottom:14px;color:#ccc;font-size:12px;cursor:pointer;">
      <input type="checkbox" id="lobby-fillbots" ${me?.fillBots !== false ? 'checked' : ''}>
      Fill missing slots with bots
    </label>
    <div style="display:flex;gap:10px;margin-top:6px;">
      <button id="lobby-team-switch" style="padding:10px 18px;background:#222;color:#aaa;border:1px solid #555;cursor:pointer;font-family:inherit;font-size:13px;letter-spacing:2px;border-radius:4px;">SWITCH TEAM</button>
      <button id="lobby-ready" style="padding:10px 30px;background:${me?.ready ? '#226622' : '#553311'};color:#fff;border:2px solid ${me?.ready ? '#44ff44' : '#ffaa44'};cursor:pointer;font-family:inherit;font-size:15px;font-weight:bold;letter-spacing:3px;border-radius:4px;">
        ${me?.ready ? '✅ READY!' : '⏳ READY UP'}
      </button>
      <button id="lobby-leave" style="padding:10px 18px;background:#222;color:#aaa;border:1px solid #555;cursor:pointer;font-family:inherit;font-size:13px;letter-spacing:2px;border-radius:4px;">LEAVE LOBBY</button>
    </div>
    <div style="font-size:11px;color:#666;margin-top:18px;letter-spacing:1px;">Match starts when all players ready · ${me?.fillBots !== false ? 'Bots will fill empty slots' : 'No bots — playing as-is'}</div>
    <div style="margin-top:28px;padding:10px 18px;background:rgba(255,200,80,0.10);border:1px solid #aa8844;border-radius:6px;max-width:580px;text-align:center;font-size:12px;color:#ffcc66;letter-spacing:1px;font-style:italic;">
      ${pickFunFact()}
    </div>
  `;
  // Wire buttons
  const fbox = document.getElementById('lobby-fillbots');
  const readyBtn = document.getElementById('lobby-ready');
  const switchBtn = document.getElementById('lobby-team-switch');
  const leaveBtn = document.getElementById('lobby-leave');
  if (fbox) fbox.addEventListener('change', () => {
    socket.emit('setLobbyReady', { ready: me?.ready || false, fillBots: fbox.checked });
  });
  if (readyBtn) readyBtn.addEventListener('click', () => {
    socket.emit('setLobbyReady', { ready: !me?.ready, fillBots: fbox?.checked !== false });
  });
  if (switchBtn) switchBtn.addEventListener('click', () => socket.emit('switchLobbyTeam'));
  if (leaveBtn) leaveBtn.addEventListener('click', () => {
    socket.emit('leaveStagingLobby');
    hideStagingLobby();
    stagingLobbyMode = null;
    stagingLobbyState = null;
    document.getElementById('mode-screen').style.display = 'flex';
  });
}

function confirmLoadout() {
  // Guard: both slots must be chosen (belt-and-suspenders against spurious mobile touch events)
  if (!loadoutReady()) return;

  document.getElementById('loadout-screen').style.display = 'none';
  resetCombatResources();

  if (!gameStarted) {
    // ── Find the mode ID and decide whether to route through the staging lobby ──
    const modeIds = Object.entries(GAME_MODE_CONFIGS).find(([id, cfg]) => cfg === selectedModeConfig);
    const modeId  = modeIds ? modeIds[0] : null;
    // Lobby-eligible modes: 1v1/2v2/3v3 (elim) + 5v5/10v10 (race) + FFA + KOTH
    const lobbyEligible = ['1v1','2v2','3v3','5v5','10v10','ffa5','ffa15','koth',
                            'gungame','oitc','juggernaut','infection','sniper_only','speedrun'];
    if (modeId && lobbyEligible.includes(modeId)) {
      // Route through staging lobby — wait for others to ready up
      stagingLobbyMode = modeId;
      socket.emit('joinStagingLobby', { mode: modeId });
      showStagingLobby(modeId);
      return;
    }
    // Non-lobby modes (frontlines, dday, laststand, range, etc.): spawn bots immediately
    gameStarted = true;
    spawnGameBots();
    requestPointerLockSafe();
    loop();
  } else if (loadoutMode === 'swap') {
    // Mid-game swap via trashcan — player is still alive, no respawn needed
    requestPointerLockSafe();
  } else if (loadoutMode === 'waiting') {
    // Player changed loadout mid-elim-round while waiting — they stay dead, just return to waiting screen
    // Their new loadout will be active when the next round respawns them (resetPlayerForRound in startMatchRound)
    document.getElementById('waiting-screen').style.display = 'flex';
    showAnnouncement('LOADOUT UPDATED', 'Active next round', '#4cf', 1400);
  } else {
    // Respawn after death on this player's team side, don't rely on the server's center spawn.
    resetPlayerForRound();
    grantSpawnShield(3000);
    requestPointerLockSafe();
  }
}

function requestPointerLockSafe() {
  if (!renderer.domElement.requestPointerLock) return;
  try {
    const lock = renderer.domElement.requestPointerLock();
    if (lock && typeof lock.catch === 'function') lock.catch(() => {});
  } catch (e) {}
}

// ── Start ──────────────────────────────────────────────────────────────────
// ── User accounts + admin item unlocks ────────────────────────────────────
let currentUser = null; // { username, password, unlocks: [], isAdmin: false }
// 🎭 Locally-chosen character skin (others see it via setSkin broadcast)
let mySkin = (() => { try { const s = localStorage.getItem('pvp_skin'); return SKIN_IDS.includes(s) ? s : 'default'; } catch(e){ return 'default'; } })();
function emitMySkin() {
  if (!socket) return;
  socket.emit('setSkin', { skin: mySkin, isAdmin: !!(currentUser && currentUser.isAdmin) });
}
// Admin cheat toggles — only active when currentUser.isAdmin
const adminCheats = {
  fly: false,
  killAura: false,
  infiniteAmmo: false,
  godMode: false,
  aimbot: false,
  speed: false,
  freezeBots: false,
};

// On page load: try to auto-login with stored credentials
(function tryAutoLogin() {
  try {
    const saved = JSON.parse(localStorage.getItem('pvp_user') || 'null');
    if (saved && saved.username && saved.password) {
      const nameEl = document.getElementById('name-input');
      const passEl = document.getElementById('pass-input');
      if (nameEl) nameEl.value = saved.username;
      if (passEl) passEl.value = saved.password;
      // Silently try to log in — populate currentUser if successful
      authRequest('/auth/login', saved).then(r => {
        if (r && r.ok) {
          currentUser = { username: r.username, password: saved.password, unlocks: r.unlocks || [], purchased: r.purchased || [], credits: r.credits ?? 0, fragments: r.fragments ?? 0, chests: r.chests || { common: 0, rare: 0 }, upgrades: r.upgrades || {}, freeSpinAvailable: !!r.freeSpinAvailable, adminPassExpiresAt: r.adminPassExpiresAt || 0, isAdmin: !!r.isAdmin };
          const wb = document.getElementById('welcome-back');
          if (wb) {
            wb.textContent = r.isAdmin
              ? `🔓 ADMIN · ${r.username}`
              : `Welcome back, ${r.username} · ${(r.unlocks||[]).length} admin items unlocked`;
            wb.style.color = r.isAdmin ? '#ff4444' : '#88ccff';
            wb.style.display = 'block';
          }
        }
      }).catch(()=>{});
    }
  } catch (e) {}
})();

// Resolve to localhost:3001 when running from file:// (so auth still works)
const AUTH_BASE = window.location.protocol === 'file:' ? 'http://localhost:3001' : '';
async function authRequest(url, body) {
  try {
    const r = await fetch(AUTH_BASE + url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await r.json();
  } catch (e) {
    console.warn('[auth] network error:', e?.message || e);
    return { error: 'cannot reach server — is it running on port 3001?' };
  }
}

function setAuthStatus(text, color) {
  const el = document.getElementById('auth-status');
  if (el) { el.textContent = text; el.style.color = color || '#ccc'; }
}

async function startGame() {
  if (gameStarted) return;
  const name = document.getElementById('name-input').value.trim();
  const pass = document.getElementById('pass-input').value;
  if (!name) { setAuthStatus('Please enter a username', '#ff6666'); return; }
  if (!pass) { setAuthStatus('Please enter a password', '#ff6666'); return; }

  setAuthStatus('Signing in…', '#cccccc');

  // Try login first; if user doesn't exist, fall through to register
  let result = await authRequest('/auth/login', { username: name, password: pass });
  if (result.error === 'user not found') {
    setAuthStatus(`Creating new account "${name}"…`, '#88ccff');
    result = await authRequest('/auth/register', { username: name, password: pass });
  }
  if (!result || result.error) {
    setAuthStatus(result?.error || 'Login failed', '#ff6666');
    return;
  }

  currentUser = { username: result.username, password: pass, unlocks: result.unlocks || [], purchased: result.purchased || [], credits: result.credits ?? 0, fragments: result.fragments ?? 0, chests: result.chests || { common: 0, rare: 0 }, upgrades: result.upgrades || {}, freeSpinAvailable: !!result.freeSpinAvailable, adminPassExpiresAt: result.adminPassExpiresAt || 0, isAdmin: !!result.isAdmin };
  localStorage.setItem('pvp_user', JSON.stringify({ username: name, password: pass }));
  setAuthStatus(result.isAdmin ? `🔓 ADMIN ACCESS GRANTED · ${result.username}` : `Logged in as ${result.username}`, result.isAdmin ? '#ff4444' : '#88ff88');

  players[myId] && (players[myId].name = name);
  socket.emit('setName', name);
  emitMySkin();
  document.getElementById('overlay').style.display = 'none';
  const ms = document.getElementById('mode-screen');
  ms.style.display = 'flex';
  updateUserInfoBar(); // populate user info on mode screen
}

// "Enter Code" button — opens prompt, redeems code on server (only shown after login)
async function promptUnlockCode() {
  if (!currentUser) {
    alert('Please log in first.');
    return;
  }
  const code = prompt('Enter unlock code:');
  if (!code) return;
  const result = await authRequest('/auth/redeem', {
    username: currentUser.username,
    password: currentUser.password,
    code: code.trim(),
  });
  if (result.error) {
    alert('❌ ' + result.error);
    return;
  }
  if (result.already) {
    alert(`⚠️ You already have "${result.item}" unlocked.`);
    return;
  }
  currentUser.unlocks = result.unlocks || [];
  alert(`✅ UNLOCKED: ${result.item}\n\nTotal admin items: ${currentUser.unlocks.length}`);
  updateUserInfoBar(); // refresh the count display
}

// ── 🛒 Shop actions: buy / trial / award ─────────────────────────────────
async function buyWeapon(weaponId) {
  if (!currentUser) { alert('Log in first.'); return false; }
  if (currentUser.isAdmin) return true;
  if (FREE_WEAPONS.has(weaponId) || (currentUser.purchased || []).includes(weaponId)) return true;
  const cost = shopCost(weaponId);
  if (cost == null) { alert('That item is not purchasable.'); return false; }
  if ((currentUser.credits ?? 0) < cost) { alert(`Not enough credits.\nNeed ${cost} · You have ${currentUser.credits ?? 0}`); return false; }
  if (!confirm(`Buy "${weaponId}" for ${cost} credits?\n\nYou have ${currentUser.credits} credits.`)) return false;
  const r = await authRequest('/shop/buy', { username: currentUser.username, password: currentUser.password, weaponId });
  if (!r || r.error) { alert('❌ ' + (r?.error || 'shop error')); return false; }
  currentUser.purchased = r.purchased || currentUser.purchased;
  currentUser.credits = r.credits ?? currentUser.credits;
  updateUserInfoBar();
  return true;
}

async function buyBundle(bundleId) {
  if (!currentUser) { alert('Log in first.'); return false; }
  const b = BUNDLES.find(x => x.id === bundleId);
  if (!b) return false;
  if (currentUser.isAdmin) return true;
  const remaining = b.items.filter(id => !isOwned(id));
  if (remaining.length === 0) { alert('You already own every item in this bundle!'); return false; }
  if ((currentUser.credits ?? 0) < b.price) { alert(`Not enough credits.\nBundle costs ${b.price} · You have ${currentUser.credits ?? 0}`); return false; }
  const sumIndividual = b.items.reduce((s, id) => s + (shopCost(id) ?? 0), 0);
  if (!confirm(`Buy "${b.name}" bundle for ${b.price} credits?\n\nIncludes: ${b.items.join(', ')}\nValue: ${sumIndividual} credits (saving ${sumIndividual - b.price})\nNew items: ${remaining.length}`)) return false;
  const r = await authRequest('/shop/buy-bundle', { username: currentUser.username, password: currentUser.password, bundleId });
  if (!r || r.error) { alert('❌ ' + (r?.error || 'shop error')); return false; }
  currentUser.purchased = r.purchased || currentUser.purchased;
  currentUser.credits = r.credits ?? currentUser.credits;
  updateUserInfoBar();
  alert(`✅ Unlocked ${r.added?.length || 0} new items! Balance: ${currentUser.credits}`);
  return true;
}

async function trialWeapon(weaponId) {
  if (!currentUser) { alert('Log in first.'); return false; }
  if (currentUser.isAdmin || FREE_WEAPONS.has(weaponId) || (currentUser.purchased || []).includes(weaponId)) {
    trialingThisMatch.add(weaponId);
    return true;
  }
  const cost = shopTrialCost(weaponId);
  if (cost == null) { alert('That item is not purchasable.'); return false; }
  if ((currentUser.credits ?? 0) < cost) { alert(`Not enough credits for trial.\nNeed ${cost} · You have ${currentUser.credits ?? 0}`); return false; }
  if (!confirm(`Trial "${weaponId}" for ${cost} credits (one match only)?`)) return false;
  const r = await authRequest('/shop/trial', { username: currentUser.username, password: currentUser.password, weaponId });
  if (!r || r.error) { alert('❌ ' + (r?.error || 'shop error')); return false; }
  currentUser.credits = r.credits ?? currentUser.credits;
  trialingThisMatch.add(weaponId);
  updateUserInfoBar();
  return true;
}

async function awardMatchCredits(kills, won) {
  if (!currentUser || currentUser.isAdmin) return;
  try {
    const r = await authRequest('/shop/award', { username: currentUser.username, password: currentUser.password, kills, won: !!won });
    if (r && r.ok) {
      currentUser.credits = r.credits ?? currentUser.credits;
      if (r.chests) currentUser.chests = r.chests;
      let msg = `💰 +${r.awarded} credits earned`;
      if (r.chestDrops?.common) msg += ' · 📦 +1 Common';
      if (r.chestDrops?.rare)   msg += ' · 🟣 +1 Rare';
      updateUserInfoBar();
      const t = document.createElement('div');
      t.textContent = msg;
      t.style.cssText = 'position:fixed;top:80px;right:20px;background:#1a1a0a;border:2px solid #ffdd55;color:#ffdd55;padding:10px 18px;font-family:"Courier New",monospace;font-size:14px;letter-spacing:2px;z-index:9999;border-radius:4px;';
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 4500);
    }
  } catch (e) {}
}

// ── 📦 Chest, 🧩 fragment, ✨ upgrade, 🎡 wheel actions ────────────────
const CHEST_PRICES_CLIENT = { common: 120, rare: 400 };
const FRAGMENT_UNLOCK_MIN = 100;
function fragmentUnlockCost(weaponId) {
  const price = WEAPON_COSTS[weaponId];
  if (price == null) return null;
  return Math.max(FRAGMENT_UNLOCK_MIN, Math.floor(price / 4));
}
const UPGRADE_COSTS_CLIENT = [30, 60, 120, 240, 480, 800, 1200, 1800, 2500, 3500];
const MAX_LEVELS_PER_STAT = 10;
const UPGRADE_STAT_LABELS = { damage: '+12% Damage', mag: '+25% Magazine', reload: '-15% Reload Time' };

const ADMIN_PASS_COST = 300;
async function buyAdminPass() {
  if (!currentUser) return false;
  if (adminPassActive()) {
    alert(`You already have an active Admin Pass — ${Math.ceil(adminPassMsLeft()/60000)} min left.`);
    return false;
  }
  if (!currentUser.isAdmin && (currentUser.credits ?? 0) < ADMIN_PASS_COST) {
    alert(`Need ${ADMIN_PASS_COST} credits · You have ${currentUser.credits ?? 0}`);
    return false;
  }
  if (!confirm(`Buy Admin Pass for ${ADMIN_PASS_COST} credits?\n\nUnlocks EVERY weapon (including admin items) for 10 minutes.`)) return false;
  const r = await authRequest('/shop/admin-pass', { username: currentUser.username, password: currentUser.password });
  if (!r || r.error) { alert('❌ ' + (r?.error || 'shop error')); return false; }
  currentUser.credits = r.credits ?? currentUser.credits;
  currentUser.adminPassExpiresAt = r.adminPassExpiresAt;
  updateUserInfoBar();
  return true;
}

async function buyChest(type) {
  if (!currentUser) return false;
  const cost = CHEST_PRICES_CLIENT[type];
  if (!cost) return false;
  if (!confirm(`Buy a ${type.toUpperCase()} chest for ${cost} credits?`)) return false;
  const r = await authRequest('/shop/buy-chest', { username: currentUser.username, password: currentUser.password, type });
  if (!r || r.error) { alert('❌ ' + (r?.error || 'shop error')); return false; }
  currentUser.credits = r.credits;
  currentUser.chests = r.chests;
  updateUserInfoBar();
  return true;
}
async function openChest(type) {
  if (!currentUser) return false;
  if ((currentUser.chests?.[type] || 0) <= 0) { alert(`You don't have any ${type} chests.`); return false; }
  const r = await authRequest('/shop/open-chest', { username: currentUser.username, password: currentUser.password, type });
  if (!r || r.error) { alert('❌ ' + (r?.error || 'shop error')); return false; }
  currentUser.credits = r.credits;
  currentUser.fragments = r.fragments;
  currentUser.chests = r.chests;
  currentUser.purchased = r.purchased || currentUser.purchased;
  updateUserInfoBar();
  const lines = [`📦 ${type.toUpperCase()} CHEST OPENED`];
  if (r.drops.fragments) lines.push(`🧩 +${r.drops.fragments} fragments`);
  if (r.drops.credits)   lines.push(`💰 +${r.drops.credits} credits`);
  if (r.drops.weapon)    lines.push(`✨ NEW WEAPON: ${r.drops.weapon}!`);
  alert(lines.join('\n'));
  return true;
}
async function unlockWithFragments(weaponId) {
  if (!currentUser) return false;
  const cost = fragmentUnlockCost(weaponId);
  if (cost == null) { alert('That item has no fragment cost.'); return false; }
  if ((currentUser.fragments || 0) < cost) { alert(`Need ${cost} fragments · You have ${currentUser.fragments || 0}`); return false; }
  if (!confirm(`Unlock "${weaponId}" for ${cost} fragments?`)) return false;
  const r = await authRequest('/shop/unlock-fragments', { username: currentUser.username, password: currentUser.password, weaponId });
  if (!r || r.error) { alert('❌ ' + (r?.error || 'shop error')); return false; }
  currentUser.fragments = r.fragments;
  currentUser.purchased = r.purchased || currentUser.purchased;
  updateUserInfoBar();
  return true;
}
function getWeaponUpgrades(weaponId) {
  return currentUser?.upgrades?.[weaponId] || { damage: 0, mag: 0, reload: 0 };
}
function totalUpgradeLevels(weaponId) {
  const u = getWeaponUpgrades(weaponId);
  return (u.damage || 0) + (u.mag || 0) + (u.reload || 0);
}
async function upgradeWeapon(weaponId, stat) {
  if (!currentUser) return false;
  const up = getWeaponUpgrades(weaponId);
  const currentLvl = up[stat] || 0;
  if (currentLvl >= MAX_LEVELS_PER_STAT) { alert(`Max level (${MAX_LEVELS_PER_STAT}) reached for that stat.`); return false; }
  const cost = UPGRADE_COSTS_CLIENT[currentLvl];
  if ((currentUser.fragments || 0) < cost) { alert(`Need ${cost} fragments · You have ${currentUser.fragments || 0}`); return false; }
  const r = await authRequest('/shop/upgrade-weapon', { username: currentUser.username, password: currentUser.password, weaponId, stat });
  if (!r || r.error) { alert('❌ ' + (r?.error || 'shop error')); return false; }
  currentUser.fragments = r.fragments;
  currentUser.upgrades = r.upgrades || currentUser.upgrades;
  updateUserInfoBar();
  return true;
}
async function spinWheel() {
  if (!currentUser) return null;
  const r = await authRequest('/shop/spin-wheel', { username: currentUser.username, password: currentUser.password });
  if (!r || r.error) { alert('❌ ' + (r?.error || 'wheel error')); return null; }
  currentUser.credits = r.result.credits_balance ?? currentUser.credits;
  currentUser.fragments = r.result.fragments_balance ?? currentUser.fragments;
  currentUser.purchased = r.result.purchased || currentUser.purchased;
  currentUser.freeSpinAvailable = false;
  updateUserInfoBar();
  return r.result;
}

// Apply weapon upgrades to a base weapon definition for the current user.
// Returns a shallow-cloned object with scaled damage/mag/reloadTime.
function applyUpgrades(w) {
  if (!w || !currentUser || !currentUser.upgrades) return w;
  const up = currentUser.upgrades[w.id];
  if (!up) return w;
  const clone = { ...w };
  if (up.damage) clone.damage = Math.round((w.damage || 0) * (1 + 0.12 * up.damage));
  if (up.mag)    clone.mag    = Math.round((w.mag    || 0) * (1 + 0.25 * up.mag));
  if (up.reload) clone.reloadTime = Math.round((w.reloadTime || 0) * Math.pow(0.85, up.reload));
  clone._upgraded = true;
  return clone;
}

function selectMode(modeId) {
  selectedModeConfig = GAME_MODE_CONFIGS[modeId] || GAME_MODE_CONFIGS['ffa5'];
  document.getElementById('mode-screen').style.display = 'none';
  if (modeId === 'dday') {
    // D-Day: skip loadout, force MG42 + infinite AK20
    const mg42Idx = WEAPONS.findIndex(w => w.id === 'mg42');
    const ak20Idx = WEAPONS.findIndex(w => w.id === 'ak20');
    selectedPrimaryIdx   = mg42Idx >= 0 ? mg42Idx : 0;
    selectedSecondaryIdx = ak20Idx >= 0 ? ak20Idx : 1;
    selectedMeleeIdx     = 0;
    selectedSupportIdx   = 0;
    weaponAmmo[selectedPrimaryIdx]   = { ammo: 5000, reserve: 0 };
    weaponAmmo[selectedSecondaryIdx] = { ammo: 30,   reserve: 999999 };
    activeSlot = 'primary';
    weaponModels.forEach(m => m.visible = false);
    meleeModels.forEach(m  => m.visible = false);
    supportModels.forEach(m => m.visible = false);
    currentWeaponIdx = selectedPrimaryIdx;
    currentWeapon    = WEAPONS[selectedPrimaryIdx];
    if (weaponModels[selectedPrimaryIdx]) weaponModels[selectedPrimaryIdx].visible = true;
    updateAmmoHUD(); updateWeaponHUD(); updateWeaponSelector();
    gameStarted = true;
    spawnGameBots();
    requestPointerLockSafe();
    loop();
  } else if (modeId === 'range') {
    // Shooting range: skip loadout, give infinite ammo on all weapons
    selectedPrimaryIdx   = 0;
    selectedSecondaryIdx = 1;
    selectedMeleeIdx     = 0;
    selectedSupportIdx   = 0;
    // Infinite ammo for all weapons
    weaponAmmo.forEach((_, idx) => { weaponAmmo[idx] = { ammo: 999999, reserve: 999999 }; });
    activeSlot = 'primary';
    weaponModels.forEach(m => m.visible = false);
    meleeModels.forEach(m  => m.visible = false);
    supportModels.forEach(m => m.visible = false);
    currentWeaponIdx = selectedPrimaryIdx;
    currentWeapon    = WEAPONS[selectedPrimaryIdx];
    if (weaponModels[selectedPrimaryIdx]) weaponModels[selectedPrimaryIdx].visible = true;
    updateAmmoHUD(); updateWeaponHUD(); updateWeaponSelector();
    gameStarted = true;
    spawnGameBots();
    requestPointerLockSafe();
    loop();
  } else {
    showLoadoutScreen('death');
  }
}
document.getElementById('play-btn').addEventListener('click', startGame);
document.getElementById('play-btn').addEventListener('touchstart', e => { e.preventDefault(); startGame(); }, { passive: false });
const _ecBtn = document.getElementById('enter-code-btn');
if (_ecBtn) {
  _ecBtn.addEventListener('click', promptUnlockCode);
  _ecBtn.addEventListener('touchstart', e => { e.preventDefault(); promptUnlockCode(); }, { passive: false });
}
// Tick the user-info bar each 15s so the Admin Pass timer counts down live
setInterval(() => { if (adminPassActive() && !currentUser?.isAdmin) updateUserInfoBar(); }, 15000);

// 🎛️ Shoot-FX settings panel
function openShootFxPanel() {
  let panel = document.getElementById('shoot-fx-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'shoot-fx-panel';
    panel.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9900;background:#1a1024;border:2px solid #aa77ff;border-radius:8px;padding:24px;color:#fff;font-family:"Courier New",monospace;min-width:340px;box-shadow:0 4px 30px rgba(0,0,0,0.6);';
    document.body.appendChild(panel);
  }
  panel.style.display = 'block';
  const rowHTML = (id, label, min, max, step, val) =>
    `<label style="display:flex;justify-content:space-between;margin:10px 0;font-size:12px;color:#ddccff;">
       <span>${label}</span>
       <span id="${id}-val" style="color:#fff;width:42px;text-align:right;">${val.toFixed(2)}×</span>
     </label>
     <input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${val}" style="width:100%;margin-bottom:6px;">`;
  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px solid #553388;padding-bottom:10px;">
      <div style="font-size:18px;letter-spacing:3px;color:#cc99ff;">🔊 SHOOT FX</div>
      <button id="sfx-close" style="background:#3a1a1a;color:#ff8888;border:1px solid #ff4444;padding:4px 10px;cursor:pointer;font-family:inherit;border-radius:3px;">✕</button>
    </div>
    <div style="font-size:10px;color:#aaa;margin-bottom:12px;line-height:1.4;">
      Tweak the muzzle blast on every gun. Saved per device.
    </div>
    ${rowHTML('fx-vol',    'VOLUME',  0.3, 2.5, 0.05, SHOOT_FX.vol)}
    ${rowHTML('fx-pitch',  'PITCH',   0.3, 2.5, 0.05, SHOOT_FX.pitch)}
    ${rowHTML('fx-attack', 'ATTACK (snap)',  0.0, 2.5, 0.05, SHOOT_FX.attack)}
    ${rowHTML('fx-body',   'BODY (boom)',    0.0, 2.5, 0.05, SHOOT_FX.body)}
    ${rowHTML('fx-dur',    'DURATION',0.3, 2.5, 0.05, SHOOT_FX.dur)}
    <div style="display:flex;gap:8px;margin-top:18px;">
      <button id="sfx-test"  style="flex:1;padding:10px;background:#1a3a1a;color:#88ff99;border:1px solid #88ff99;cursor:pointer;font-family:inherit;letter-spacing:2px;border-radius:4px;">🔫 TEST</button>
      <button id="sfx-reset" style="flex:1;padding:10px;background:#2a2a1a;color:#ffcc66;border:1px solid #ffaa44;cursor:pointer;font-family:inherit;letter-spacing:2px;border-radius:4px;">RESET</button>
    </div>
  `;
  const bind = (id, key) => {
    const input = document.getElementById(id);
    const lbl = document.getElementById(id + '-val');
    input.addEventListener('input', () => {
      const v = parseFloat(input.value);
      SHOOT_FX[key] = v;
      lbl.textContent = v.toFixed(2) + '×';
      saveShootFx();
    });
  };
  bind('fx-vol', 'vol'); bind('fx-pitch', 'pitch'); bind('fx-attack', 'attack');
  bind('fx-body', 'body'); bind('fx-dur', 'dur');
  document.getElementById('sfx-close').addEventListener('click', () => panel.style.display = 'none');
  document.getElementById('sfx-test').addEventListener('click', () => {
    const ctx = getAudioCtx(); if (!ctx) return;
    const gain = ctx.createGain(); gain.connect(ctx.destination);
    playMuzzleBlast(ctx, ctx.currentTime + 0.002, gain, 'auto_blast', 0.9);
  });
  document.getElementById('sfx-reset').addEventListener('click', () => {
    SHOOT_FX = { pitch: 1, vol: 1, attack: 1, body: 1, dur: 1 };
    saveShootFx();
    openShootFxPanel(); // refresh UI
  });
}
const _sfxBtn = document.getElementById('shoot-fx-btn');
if (_sfxBtn) {
  _sfxBtn.addEventListener('click', openShootFxPanel);
  _sfxBtn.addEventListener('touchstart', e => { e.preventDefault(); openShootFxPanel(); }, { passive: false });
}

// 🎭 Skin picker — choose how other players see your character
const SKIN_SWATCH = {
  default:     ['#1971c2', '#ffcc99'],
  swat:        ['#23272e', '#2f7dff'],
  swat_shades: ['#2a2e35', '#080808'],
  riot_chad:   ['#33271f', '#c62828'],
  soldier:     ['#4b5320', '#3d4a24'],
  spiky:       ['#5a2a2a', '#2b1a10'],
  green_cap:   ['#6b5d3a', '#3f6b2f'],
  shadow:      ['#141414', '#f4f4f4'],
};
function openSkinsPanel() {
  let panel = document.getElementById('skins-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'skins-panel';
    panel.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9550;background:#0d1622;border:2px solid #55bbff;border-radius:8px;padding:20px;color:#fff;font-family:"Courier New",monospace;min-width:360px;max-width:520px;max-height:78vh;overflow-y:auto;';
    document.body.appendChild(panel);
  }
  panel.style.display = 'block';
  const isAdmin = !!(currentUser && currentUser.isAdmin);
  const cards = SKINS.map(s => {
    const [c1, c2] = SKIN_SWATCH[s.id] || ['#444', '#888'];
    const sel = s.id === mySkin;
    return `<div class="skin-card" data-skin="${s.id}" style="display:flex;align-items:center;gap:12px;padding:10px;margin-bottom:8px;border:2px solid ${sel ? '#55ffaa' : '#2a3a4a'};border-radius:6px;cursor:pointer;background:${sel ? '#11261d' : '#11202e'};">
        <div style="flex:none;width:34px;height:46px;border-radius:4px;background:${c1};display:flex;align-items:flex-start;justify-content:center;overflow:hidden;">
          <div style="width:20px;height:14px;margin-top:5px;border-radius:3px;background:${c2};"></div>
        </div>
        <div style="flex:1;">
          <div style="color:${sel ? '#88ffcc' : '#cfe8ff'};font-size:14px;letter-spacing:1px;">${s.name}${sel ? ' ✓' : ''}</div>
          <div style="color:#7d97ad;font-size:10px;margin-top:2px;">${s.desc}</div>
        </div>
      </div>`;
  }).join('');
  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #244;padding-bottom:10px;margin-bottom:12px;">
      <div style="font-size:16px;color:#88ddff;letter-spacing:3px;">🎭 SKINS</div>
      <button id="sk-close" style="background:#1a2a3a;color:#88ccff;border:1px solid #4499ff;padding:4px 10px;cursor:pointer;font-family:inherit;border-radius:3px;">✕</button>
    </div>
    ${cards}
    <div style="margin-top:10px;font-size:10px;color:#ffd227;text-align:center;">👑 ${isAdmin ? 'As admin, you always wear the crown.' : 'The match\'s top fragger wears the crown.'}</div>`;
  panel.querySelector('#sk-close').addEventListener('click', () => { panel.style.display = 'none'; });
  panel.querySelectorAll('.skin-card').forEach(card => {
    card.addEventListener('click', () => {
      mySkin = card.dataset.skin;
      try { localStorage.setItem('pvp_skin', mySkin); } catch(e){}
      emitMySkin();
      openSkinsPanel(); // re-render to show selection
    });
  });
}
const _skinsBtn = document.getElementById('skins-btn');
if (_skinsBtn) {
  _skinsBtn.addEventListener('click', openSkinsPanel);
  _skinsBtn.addEventListener('touchstart', e => { e.preventDefault(); openSkinsPanel(); }, { passive: false });
}

// 📹 Kill Log list — pick a saved kill to watch in the 6-cam theater
function openKillLogList() {
  let panel = document.getElementById('kill-log-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'kill-log-panel';
    panel.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9550;background:#1a1208;border:2px solid #ff8844;border-radius:8px;padding:20px;color:#fff;font-family:"Courier New",monospace;min-width:340px;max-height:70vh;overflow-y:auto;';
    document.body.appendChild(panel);
  }
  panel.style.display = 'block';
  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #553;padding-bottom:10px;margin-bottom:12px;">
      <div style="font-size:16px;color:#ffaa66;letter-spacing:3px;">📹 KILL LOG <span style="font-size:10px;color:#888;">(${killLog.length}/${KILL_LOG_CAP})</span></div>
      <button id="kl-close" style="background:#3a1a1a;color:#ff8888;border:1px solid #ff4444;padding:4px 10px;cursor:pointer;font-family:inherit;border-radius:3px;">✕</button>
    </div>
    <div style="font-size:10px;color:#aaa;margin-bottom:12px;">⭐ favorite (immune to cleanup) · 📌 pin to top · 🗑️ delete · tap the row to watch</div>
    ${killLog.length === 0
      ? '<div style="color:#777;font-style:italic;padding:14px 0;text-align:center;">No kills recorded yet — go get some!</div>'
      : killLog.map((k, i) => `
        <div style="display:flex;align-items:center;gap:6px;background:#0f0a04;border:1px solid #553;border-left:3px solid ${k.pinned ? '#ffdd44' : k.favorite ? '#ff66aa' : '#ff8844'};border-radius:4px;padding:8px 10px;margin-bottom:6px;">
          <div class="kl-watch" data-idx="${i}" style="flex:1;cursor:pointer;">
            <div style="font-size:12px;color:#ffcc88;">${k.pinned ? '📌 ' : ''}${k.favorite ? '⭐ ' : ''}💀 ${k.victim}</div>
            <div style="font-size:10px;color:#aaa;margin-top:2px;">${k.weapon} · ${new Date(k.ts).toLocaleTimeString()}</div>
          </div>
          <button class="kl-fav"  data-idx="${i}" title="Favorite" style="background:${k.favorite?'#5a2a44':'#1a1a1a'};color:#ff66aa;border:1px solid #aa4477;padding:4px 7px;cursor:pointer;border-radius:3px;font-size:12px;">⭐</button>
          <button class="kl-pin"  data-idx="${i}" title="Pin"      style="background:${k.pinned?'#5a4a1a':'#1a1a1a'};color:#ffdd44;border:1px solid #aa8833;padding:4px 7px;cursor:pointer;border-radius:3px;font-size:12px;">📌</button>
          <button class="kl-del"  data-idx="${i}" title="Delete"   style="background:#1a1a1a;color:#ff6666;border:1px solid #aa3333;padding:4px 7px;cursor:pointer;border-radius:3px;font-size:12px;">🗑️</button>
        </div>`).join('')}
  `;
  panel.querySelector('#kl-close').addEventListener('click', () => panel.style.display = 'none');
  panel.querySelectorAll('.kl-watch').forEach(row => {
    row.addEventListener('click', () => { panel.style.display = 'none'; openKillTheater(+row.dataset.idx); });
  });
  panel.querySelectorAll('.kl-fav').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation(); const k = killLog[+b.dataset.idx]; k.favorite = !k.favorite; saveKillLogToDisk(); openKillLogList();
  }));
  panel.querySelectorAll('.kl-pin').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation(); const k = killLog[+b.dataset.idx]; k.pinned = !k.pinned; autoCleanupKillLog(); saveKillLogToDisk(); openKillLogList();
  }));
  panel.querySelectorAll('.kl-del').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation(); const k = killLog[+b.dataset.idx];
    if (k.favorite && !confirm('This replay is favorited. Delete anyway?')) return;
    killLog.splice(+b.dataset.idx, 1); saveKillLogToDisk(); openKillLogList();
  }));
}
const _klBtn = document.getElementById('kill-log-btn');
if (_klBtn) {
  _klBtn.addEventListener('click', openKillLogList);
  _klBtn.addEventListener('touchstart', e => { e.preventDefault(); openKillLogList(); }, { passive: false });
}

const _shopBtn = document.getElementById('open-shop-btn');
if (_shopBtn) {
  _shopBtn.addEventListener('click', openShop);
  _shopBtn.addEventListener('touchstart', e => { e.preventDefault(); openShop(); }, { passive: false });
}
const _bestBtn = document.getElementById('best-loadouts-btn');
if (_bestBtn) {
  _bestBtn.addEventListener('click', () => toggleBestLoadoutsPanel(true));
  _bestBtn.addEventListener('touchstart', e => { e.preventDefault(); toggleBestLoadoutsPanel(true); }, { passive: false });
}
const _logoutBtn = document.getElementById('logout-btn');
if (_logoutBtn) {
  _logoutBtn.addEventListener('click', () => {
    if (!confirm('Log out? You\'ll have to sign in again.')) return;
    localStorage.removeItem('pvp_user');
    currentUser = null;
    location.reload();
  });
}

// Update the mode-screen user-info bar (called after login + after redeeming codes)
function updateUserInfoBar() {
  if (!currentUser) return;
  const nameEl = document.getElementById('user-info-name');
  const unlocksEl = document.getElementById('user-info-unlocks');
  if (nameEl) nameEl.textContent = currentUser.isAdmin ? `🔓 ADMIN · ${currentUser.username}` : `👤 ${currentUser.username}`;
  if (nameEl) nameEl.style.color = currentUser.isAdmin ? '#ff4444' : '#88ccff';
  if (unlocksEl) {
    const n = currentUser.unlocks?.length || 0;
    const credits  = currentUser.isAdmin ? '∞' : (currentUser.credits ?? 0);
    const frags    = currentUser.isAdmin ? '∞' : (currentUser.fragments ?? 0);
    const ch = currentUser.chests || { common: 0, rare: 0 };
    const passTag = adminPassActive() && !currentUser.isAdmin
      ? ` · <b style="color:#ffcc88">🪖 PASS ${Math.ceil(adminPassMsLeft()/60000)}m</b>`
      : '';
    unlocksEl.innerHTML = `💰 <b style="color:#ffdd55">${credits}</b> · 🧩 <b style="color:#aaccff">${frags}</b> frags · 📦 ${ch.common}c/${ch.rare}r · 🪖 ${n}/24${passTag}`;
  }
  // Show admin panel button if admin
  let adminBtn = document.getElementById('admin-panel-btn');
  if (currentUser.isAdmin && !adminBtn) {
    adminBtn = document.createElement('button');
    adminBtn.id = 'admin-panel-btn';
    adminBtn.textContent = '⚡ ADMIN PANEL [F2]';
    adminBtn.style.cssText = 'padding:6px 14px;background:#3a1a1a;color:#ff4444;border:1px solid #ff4444;cursor:pointer;font-family:"Courier New",monospace;font-size:11px;letter-spacing:2px;border-radius:4px;';
    adminBtn.addEventListener('click', toggleAdminPanel);
    const bar = document.getElementById('user-info-bar');
    if (bar) bar.appendChild(adminBtn);
  }
}

// ── 🔓 ADMIN CHEAT PANEL ──────────────────────────────────────────────────
let adminPanelOpen = false;
function toggleAdminPanel() {
  if (!currentUser?.isAdmin) return;
  if (adminPanelOpen) { closeAdminPanel(); return; }
  openAdminPanel();
}
function openAdminPanel() {
  let panel = document.getElementById('admin-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'admin-panel';
    panel.style.cssText = 'position:fixed;top:80px;right:20px;width:280px;z-index:9700;'
      + 'background:rgba(15,0,0,0.94);border:2px solid #ff4444;border-radius:8px;padding:14px;'
      + 'font-family:"Courier New",monospace;color:#fff;font-size:12px;'
      + 'box-shadow:0 6px 20px rgba(255,0,0,0.4);';
    document.body.appendChild(panel);
  }
  panel.innerHTML = `
    <div style="font-size:13px;letter-spacing:3px;color:#ff4444;margin-bottom:10px;text-align:center;font-weight:bold;">⚡ ADMIN PANEL</div>
    <div style="font-size:10px;color:#888;margin-bottom:8px;text-align:center;">[F2] toggle · [F] fly toggle</div>
    <div style="border-bottom:1px solid #444;margin:6px 0;"></div>
    <div style="font-size:10px;color:#888;letter-spacing:2px;margin-bottom:6px;">TOGGLE CHEATS</div>
    ${[
      ['fly',          '🪂 Fly mode',           'H'],
      ['godMode',      '🛡️ God mode',           'J'],
      ['infiniteAmmo', '♾️ Infinite ammo',      'L'],
      ['killAura',     '☠️ Kill aura (8m)',     'K'],
      ['aimbot',       '🎯 Aimbot',             'B'],
      ['speed',        '⚡ Speed boost (3×)',   'N'],
      ['freezeBots',   '🧊 Freeze all bots',    'M'],
    ].map(([key, label, hotkey]) =>
      `<label style="display:flex;align-items:center;gap:8px;padding:5px;cursor:pointer;background:rgba(50,20,20,0.5);border-radius:4px;margin-bottom:3px;">
        <input type="checkbox" data-cheat="${key}" ${adminCheats[key] ? 'checked' : ''} style="cursor:pointer;">
        <span style="flex:1;">${label}</span>
        <span style="color:#888;font-size:10px;">[${hotkey}]</span>
      </label>`
    ).join('')}
    <div style="border-bottom:1px solid #444;margin:10px 0 6px;"></div>
    <div style="font-size:10px;color:#888;letter-spacing:2px;margin-bottom:6px;">INSTANT ACTIONS</div>
    <button data-action="nuke"     style="width:100%;padding:8px;margin-bottom:4px;background:#661111;color:#fff;border:1px solid #ff4444;cursor:pointer;font-family:inherit;font-size:12px;border-radius:4px;">💀 NUKE EVERYBODY</button>
    <button data-action="heal"     style="width:100%;padding:8px;margin-bottom:4px;background:#116611;color:#fff;border:1px solid #44ff44;cursor:pointer;font-family:inherit;font-size:12px;border-radius:4px;">❤️ FULL HEAL</button>
    <button data-action="ammo"     style="width:100%;padding:8px;margin-bottom:4px;background:#222288;color:#fff;border:1px solid #88aaff;cursor:pointer;font-family:inherit;font-size:12px;border-radius:4px;">📦 REFILL AMMO</button>
    <button data-action="endRound" style="width:100%;padding:8px;background:#444411;color:#ffcc44;border:1px solid #ffcc44;cursor:pointer;font-family:inherit;font-size:12px;border-radius:4px;">🏁 INSTANT WIN ROUND</button>
  `;
  panel.style.display = 'block';
  // Bind checkboxes
  panel.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => { adminCheats[cb.dataset.cheat] = cb.checked; });
  });
  // Bind action buttons
  panel.querySelectorAll('button[data-action]').forEach(btn => {
    btn.addEventListener('click', () => adminAction(btn.dataset.action));
  });
  adminPanelOpen = true;
}
function closeAdminPanel() {
  const panel = document.getElementById('admin-panel');
  if (panel) panel.style.display = 'none';
  adminPanelOpen = false;
}
function adminAction(act) {
  if (!currentUser?.isAdmin) return;
  switch (act) {
    case 'nuke': {
      // Kill all bots instantly via emitHit with insane damage
      for (const bot of gameBots) {
        if (bot.dead) continue;
        const mesh = remoteMeshes[bot.id];
        const hp = mesh ? mesh.position.clone().setY(1.0) : new THREE.Vector3(bot.x, 1, bot.z);
        emitHit(bot.id, `admin_nuke_${Date.now()}_${bot.id}`, 'tac_nuke', hp);
      }
      flashScreen('rgba(255,80,0,0.5)', 800);
      showAnnouncement('💀 EVERYBODY DIES', 'Admin nuke deployed', '#ff2200', 2200);
      break;
    }
    case 'heal': {
      const me = players[myId];
      if (me) { me.hp = 300; updateHealthHUD(300); }
      isDead = false;
      flashScreen('rgba(68,255,68,0.3)', 500);
      showAnnouncement('❤️ FULL HEAL', '', '#44ff44', 1200);
      break;
    }
    case 'ammo': {
      weaponAmmo.forEach((_, idx) => {
        const w = WEAPONS[idx];
        if (w) weaponAmmo[idx] = { ammo: w.mag, reserve: w.reserve === 0 ? 99999 : w.reserve };
      });
      supportUses.forEach((_, i) => { supportUses[i] = SUPPORT_ITEMS[i]?.uses || 1; });
      updateAmmoHUD();
      showAnnouncement('📦 AMMO REFILLED', '', '#88aaff', 1000);
      break;
    }
    case 'endRound': {
      // Same as nuke but only kills enemies (preserves allies for round-win)
      for (const bot of gameBots) {
        if (bot.dead || bot.team !== 'enemy') continue;
        const mesh = remoteMeshes[bot.id];
        const hp = mesh ? mesh.position.clone().setY(1.0) : new THREE.Vector3(bot.x, 1, bot.z);
        emitHit(bot.id, `admin_kill_${Date.now()}_${bot.id}`, 'tac_nuke', hp);
      }
      showAnnouncement('🏁 ROUND WON', 'All enemies eliminated', '#ffcc44', 1500);
      break;
    }
  }
}
// Per-frame: apply active admin cheats
function updateAdminCheats(dt) {
  if (!currentUser?.isAdmin) return;
  // Fly mode: spacebar = up, ctrl = down, no gravity
  if (adminCheats.fly && !isDead) {
    const flySpeed = 6 * dt;
    if (keys['Space']) camera.position.y += flySpeed;
    if (keys['ControlLeft'] || keys['ControlRight'] || keys['ShiftLeft']) camera.position.y -= flySpeed;
    camera.position.y = Math.max(0.5, Math.min(40, camera.position.y));
    // Override slamState gravity
    if (slamState) slamState.vel = 0;
  }
  // Kill aura: every 200ms, damage all enemies within 8m
  if (adminCheats.killAura && !isDead) {
    if (!window._lastAuraTick || Date.now() - window._lastAuraTick > 200) {
      window._lastAuraTick = Date.now();
      for (const bot of gameBots) {
        if (bot.dead || bot.team !== 'enemy') continue;
        const d = Math.hypot(bot.x - camera.position.x, bot.z - camera.position.z);
        if (d < 8) {
          const mesh = remoteMeshes[bot.id];
          const hp = mesh ? mesh.position.clone().setY(1.0) : new THREE.Vector3(bot.x, 1, bot.z);
          emitHit(bot.id, `aura_${myId}_${Date.now()}_${bot.id}`, 'tac_nuke', hp); // tac_nuke = 500 dmg, one-shots
        }
      }
    }
  }
  // Freeze bots: just stop their AI from running (handled via flag check in updateBotAI)
  // Aimbot: handled in tryShoot
  // Infinite ammo: handled in tryShoot
  // Speed: handled in updateMovement
  // God mode: handled in applyBotDamageToPlayer
}
document.querySelectorAll('.mode-card').forEach(card => {
  card.addEventListener('click', () => selectMode(card.dataset.mode));
  card.addEventListener('touchstart', e => { e.preventDefault(); selectMode(card.dataset.mode); }, { passive: false });
});
// Difficulty selector
const DIFFICULTY_DESCS = {
  easy:   'Original AI · no reload · no leading · no reaction delay',
  medium: '+ Reloading · Bullet leading · Reaction time · Skill variation · Smarter melee charges',
  hard:   '+ Personalities · Weapon abilities · Focus fire · Low-HP retreat · Last-seen memory',
  expert: '+ Faster aim/fire/reload · Weapon-aware pressure · Team comms · Punishes reloading · Trajectory prediction',
};
function selectDifficulty(diff) {
  selectedDifficulty = diff;
  document.querySelectorAll('.diff-card').forEach(c => {
    if (c.dataset.diff === diff) {
      c.classList.add('selected');
      c.style.background = c.dataset.diff === 'easy' ? 'rgba(68,204,255,0.2)'
                          : c.dataset.diff === 'medium' ? 'rgba(255,204,68,0.2)'
                          : c.dataset.diff === 'hard' ? 'rgba(255,68,68,0.2)'
                          : 'rgba(204,0,255,0.2)';
    } else {
      c.classList.remove('selected');
      c.style.background = 'transparent';
    }
  });
  const desc = document.getElementById('difficulty-desc');
  if (desc) desc.textContent = DIFFICULTY_DESCS[diff] || '';
}
document.querySelectorAll('.diff-card').forEach(card => {
  card.addEventListener('click', () => selectDifficulty(card.dataset.diff));
  card.addEventListener('touchstart', e => { e.preventDefault(); selectDifficulty(card.dataset.diff); }, { passive: false });
});

// Map selector
const MAP_DESCS = {
  auto:       'Random — game picks one for you each match',
  blank:      'Classic — open arena with crosshatch walls (original)',
  urban:      'Urban Plaza — corner buildings, cars as low cover',
  warehouse:  'Warehouse — stacked crates, pipes, narrow lanes',
  forest:     'Forest Clearing — trees + rocks, mostly open',
  volcano:    '🔥 Volcano — lava pools deal 4 dmg/sec',
  cyber:      '⚡ Cyber Alley — neon city, JUMP PADS launch you up',
  desert:     'Desert Ruins — broken pillars + sand dunes, open sightlines',
  tundra:     '❄️ Tundra — ice patches make you slip and slide',
  space:      '🌌 Space Station — LOW GRAVITY zones · jump higher',
  airport:    '🛬 Airport — break glass + lights · gets darker as lights die',
  trenches:   '🪖 Trenches — barbed wire + 4 PILOTABLE mortar cannons (F to use)',
  chernobyl:  '☢️ Chernobyl — toxic gas (1 dmg/s) + 4 destructible reactors (500 HP each)',
  refinery:   'Oil Refinery — oil slicks make you slide + explosive barrels',
  skydock:    'Skydock Launch — many jump pads + raised gantry fights',
  sewer:      'Acid Sewer — toxic pools force bridge fights',
  gravity_lab:'Gravity Lab — low gravity domes + launch pads',
  glassworks: 'Glassworks — breakable glass maze + barrel traps',
  carrier:    '🚢 Carrier — flat runway top deck · hangars + control tower',
  overgrowth: '🌲 Overgrowth — abandoned city reclaimed by nature',
  orbital_station: '🛰️ Orbital Station — modular pods + central hub',
  foundry:    '🏭 Foundry — conveyor belts, molten pools, giant gears',
  carnival:   '🎪 Carnival — ferris wheel, tents, bumper-car arena',
  biosphere:  '🧬 Biosphere — 4-zone dome (jungle / desert / frozen / dirt)',
  lockdown:   '🚨 Lockdown — prison cell blocks + security tower',
  studio:     '🎥 Studio — western, sci-fi, and castle sets back-to-back',
  temple:     '🕍 Temple — stone columns, giant idol, trap pits',
  holiday:    '🎄 Holiday — snowy village + giant tree + frozen lake',
  labyrinth:  '🧪 Labyrinth — maze of walls, lots of corners',
  arena:      '🏟️ Arena — green field surrounded by stadium walls',
  opera:      '🎭 Opera — stage + balconies + chandelier',
  doomsday:   '🌋 Doomsday — collapsing city, fire pillars, abandoned heli',
  train:      '🚂 Train — long row of cars + engine + side rails',
  dreamscape: '🌌 Dreamscape — floating stairs + impossible shapes',
};
function selectMapPick(mapId) {
  selectedMap = mapId;
  document.querySelectorAll('.map-card').forEach(c => {
    const sel = c.dataset.map === mapId;
    c.classList.toggle('selected', sel);
    if (sel) c.style.background = c.style.borderColor.replace(')', ',0.2)').replace('rgb','rgba') || 'rgba(255,255,255,0.15)';
    else c.style.background = 'transparent';
  });
  const desc = document.getElementById('map-desc');
  if (desc) desc.textContent = MAP_DESCS[mapId] || '';
}
document.querySelectorAll('.map-card').forEach(card => {
  card.addEventListener('click', () => selectMapPick(card.dataset.map));
  card.addEventListener('touchstart', e => { e.preventDefault(); selectMapPick(card.dataset.map); }, { passive: false });
});
document.getElementById('loadout-ready-btn').addEventListener('click', confirmLoadout);
document.getElementById('loadout-ready-btn').addEventListener('touchstart', e => { e.preventDefault(); confirmLoadout(); }, { passive: false });
// Change loadout while waiting between rounds in elim mode
const _changeBtn = document.getElementById('change-loadout-btn');
if (_changeBtn) {
  const openLoadoutFromWaiting = () => {
    document.getElementById('waiting-screen').style.display = 'none';
    showLoadoutScreen('waiting'); // new mode so confirmLoadout knows where to return
  };
  _changeBtn.addEventListener('click', openLoadoutFromWaiting);
  _changeBtn.addEventListener('touchstart', e => { e.preventDefault(); openLoadoutFromWaiting(); }, { passive: false });
}
renderer.domElement.addEventListener('click', ()=>{
  if (gameStarted) requestPointerLockSafe();
});
window.addEventListener('resize', ()=>{
  camera.aspect=window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Mobile controls ────────────────────────────────────────────────────────
const joystickBase  = document.getElementById('joystick-base');
const joystickThumb = document.getElementById('joystick-thumb');
const JOYSTICK_RADIUS = 48;
const TOUCH_SENS = 0.006;

// Show mobile UI immediately on touch devices
if (navigator.maxTouchPoints > 0 || 'ontouchstart' in window) {
  document.getElementById('mobile-controls').classList.add('active');
  document.getElementById('controls-hint').style.display = 'none';
}

// Button IDs that should NOT trigger look/joystick
const BTN_IDS = new Set(['btn-fire','btn-ads','btn-reload-mobile','btn-prev-weapon','btn-next-weapon','btn-interact']);

let joyTouchId  = null, joyOrigin = { x: 0, y: 0 };
let lookTouchId = null, lastLookPos = null;

function isButton(el) {
  while (el) { if (BTN_IDS.has(el.id)) return true; el = el.parentElement; }
  return false;
}

document.addEventListener('touchstart', e => {
  if (!gameStarted) return;
  e.preventDefault();
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (isButton(e.target)) continue;           // buttons handle themselves
    const leftSide = t.clientX < window.innerWidth * 0.45;
    if (leftSide && joyTouchId === null) {
      joyTouchId = t.identifier;
      joyActive  = true;
      joyOrigin  = { x: t.clientX, y: t.clientY };
      joystickBase.style.left    = t.clientX + 'px';
      joystickBase.style.top     = t.clientY + 'px';
      joystickBase.style.display = 'block';
    } else if (!leftSide && lookTouchId === null) {
      lookTouchId = t.identifier;
      lastLookPos = { x: t.clientX, y: t.clientY };
    }
  }
}, { passive: false });

document.addEventListener('touchmove', e => {
  if (!gameStarted) return;
  e.preventDefault();
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (t.identifier === joyTouchId) {
      let dx = t.clientX - joyOrigin.x;
      let dy = t.clientY - joyOrigin.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist > JOYSTICK_RADIUS) { dx *= JOYSTICK_RADIUS/dist; dy *= JOYSTICK_RADIUS/dist; }
      joyDir.x = dx / JOYSTICK_RADIUS;
      joyDir.y = dy / JOYSTICK_RADIUS;
      joystickThumb.style.left = (50 + joyDir.x * 50) + '%';
      joystickThumb.style.top  = (50 + joyDir.y * 50) + '%';
    } else if (t.identifier === lookTouchId) {
      euler.y -= (t.clientX - lastLookPos.x) * TOUCH_SENS;
      euler.x -= (t.clientY - lastLookPos.y) * TOUCH_SENS;
      euler.x  = Math.max(-Math.PI/2.2, Math.min(Math.PI/2.2, euler.x));
      camera.quaternion.setFromEuler(euler);
      lastLookPos = { x: t.clientX, y: t.clientY };
    }
  }
}, { passive: false });

document.addEventListener('touchend', e => {
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (t.identifier === joyTouchId) {
      joyTouchId = null; joyActive = false; joyDir = { x:0, y:0 };
      joystickBase.style.display = 'none';
      joystickThumb.style.left = '50%'; joystickThumb.style.top = '50%';
    }
    if (t.identifier === lookTouchId) { lookTouchId = null; lastLookPos = null; }
  }
});
document.addEventListener('touchcancel', e => {
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (t.identifier === joyTouchId)  { joyTouchId = null; joyActive = false; joyDir = {x:0,y:0}; joystickBase.style.display='none'; }
    if (t.identifier === lookTouchId) { lookTouchId = null; lastLookPos = null; }
  }
});

// ── Buttons ────────────────────────────────────────────────────────────────
const btnFire = document.getElementById('btn-fire');
btnFire.addEventListener('touchstart', e => { e.stopPropagation(); e.preventDefault(); shooting=true; btnFire.classList.add('pressed'); tryUseActive(); }, { passive:false });
btnFire.addEventListener('touchend',   e => { e.stopPropagation(); shooting=false; btnFire.classList.remove('pressed'); }, { passive:false });

document.getElementById('btn-ads').addEventListener('touchstart', e => {
  e.stopPropagation(); e.preventDefault();
  toggleADS();
  document.getElementById('btn-ads').classList.toggle('active-ads', isADS);
}, { passive:false });

document.getElementById('btn-reload-mobile').addEventListener('touchstart', e => {
  e.stopPropagation(); e.preventDefault();
  if (activeSlot !== 'primary' && activeSlot !== 'secondary') return;
  const pool = weaponAmmo[currentWeaponIdx];
  if (!reloading && !currentWeapon.noReload && pool.ammo < currentWeapon.mag && pool.reserve > 0) startReload();
}, { passive:false });

document.getElementById('btn-prev-weapon').addEventListener('touchstart', e => {
  e.stopPropagation(); e.preventDefault();
  cycleActiveSlot();
  equipActiveSlot();
}, { passive:false });
document.getElementById('btn-next-weapon').addEventListener('touchstart', e => {
  e.stopPropagation(); e.preventDefault();
  cycleActiveSlot();
  equipActiveSlot();
}, { passive:false });

// In-game slot taps
['ws-primary','ws-secondary','ws-melee','ws-support'].forEach((id, slotIdx) => {
  const el = document.getElementById(id);
  if (!el) return;
  const handler = e => {
    e.stopPropagation(); e.preventDefault();
    if (!gameStarted || !loadoutReady()) return;
    activeSlot = ['primary','secondary','melee','support'][slotIdx];
    equipActiveSlot();
  };
  el.addEventListener('click', handler);
  el.addEventListener('touchstart', handler, { passive: false });
});


// Trashcan interact button (mobile)
const btnInteract = document.getElementById('btn-interact');
if (btnInteract) {
  btnInteract.addEventListener('touchstart', e => {
    e.stopPropagation(); e.preventDefault();
    if (nearTrashcan && !isDead && gameStarted) showLoadoutScreen('swap');
  }, { passive: false });
  btnInteract.addEventListener('click', () => {
    if (nearTrashcan && !isDead && gameStarted) showLoadoutScreen('swap');
  });
}

// Mobile sprint / crouch buttons — set window._mobileSprint / _mobileCrouch flags
function _wireHold(id, prop) {
  const el = document.getElementById(id);
  if (!el) return;
  const on  = e => { e?.preventDefault?.(); el.classList.add('pressed'); window[prop] = true; };
  const off = e => { e?.preventDefault?.(); el.classList.remove('pressed'); window[prop] = false; };
  el.addEventListener('touchstart', on,  { passive: false });
  el.addEventListener('touchend',   off, { passive: false });
  el.addEventListener('touchcancel',off, { passive: false });
  el.addEventListener('mousedown',  on);
  el.addEventListener('mouseup',    off);
  el.addEventListener('mouseleave', off);
}
_wireHold('btn-crouch', '_mobileCrouch');
// Slide is edge-triggered like jump — single tap = single slide burst
const _slideBtn = document.getElementById('btn-slide');
if (_slideBtn) {
  const trigger = e => {
    e?.preventDefault?.();
    _slideBtn.classList.add('pressed');
    window._mobileSlide = true;
    // Clear the flag next frame so it edge-triggers exactly once
    setTimeout(() => { window._mobileSlide = false; _slideBtn.classList.remove('pressed'); }, 100);
  };
  _slideBtn.addEventListener('touchstart', trigger, { passive: false });
  _slideBtn.addEventListener('mousedown',  trigger);
}
// Jump is edge-triggered, not held — single tap = single jump
const _jumpBtn = document.getElementById('btn-jump');
if (_jumpBtn) {
  const trigger = e => {
    e?.preventDefault?.();
    _jumpBtn.classList.add('pressed');
    window._mobileJump = true;
    setTimeout(() => _jumpBtn.classList.remove('pressed'), 120);
  };
  _jumpBtn.addEventListener('touchstart', trigger, { passive: false });
  _jumpBtn.addEventListener('mousedown',  trigger);
}

document.addEventListener('contextmenu', e => e.preventDefault());
