# Weapon ranking — primaries and secondaries

Generated from the live `WEAPONS` table and `getClientWeaponDamage()`, 2026-10-13. This is a **list to react to**, not a set of
decisions: nothing in the game was changed to produce it.

## How to read it

- **In play** = not archived, not an admin item, not skin-only, not D-Day-only, not mode-only. 27 primaries and 25 secondaries.
  The 55 archived / admin / legend weapons are left out (they are priced 84,000–280,000 or not for sale).
- **Dmg** is damage per hit (pellets shown as `damage × pellets`). **Shots/s** is `1000 / fireRate`.
- **Burst DPS** = damage per second while the trigger is held, magazine ignored. **Sustained DPS** includes the reload (and
  heat pauses / spool-up). No reload (`noReload`) weapons are the same number in both columns, or the ammo regen rate.
- **Kill time\*** = how long to put 300 HP into one target with body shots at point-blank, **including the reloads** it takes if the
  magazine is smaller than the shots needed. "mag cannot kill a full-HP player" means exactly that.
- **DPS @30 m** is burst DPS after range falloff. Shotguns and SMGs lose most of theirs; rifles and snipers lose none.
- Medians among the primaries: sustained **109 DPS**, kill time **1.8 s**, price **1,740**.

## Things the numbers don't show

- **Frame rate changes fire rate.** The shot check is `now - lastShot < fireRate` once per frame and `lastShot` is not
  carried over, so the real interval is rounded **up** to a whole number of frames. At 60 fps the P90's 20 ms becomes 33 ms
  (750 -> ~450 DPS), the minigun's 32 ms becomes 33 ms, the Vector's 45 ms becomes 50 ms; at 144 Hz they all get close to
  their listed numbers. Every weapon under ~50 ms between shots is faster on a fast monitor.
- **Minigun**: 2 s of spool-up before the first round, and it overheats after 10 s of fire. The 844 is only reachable after that.
- **Chain Gun** starts at one shot a second and speeds up to ten; the table is the fully-spun figure.
- **Explosives** do splash on top of the listed hit; this table counts the direct hit only, so they look weaker than they play.
- Damage numbers are the table value; **headshots** multiply by ~2 (AK20 2.33, Flechette 4). Only the AMR kills in one headshot.
- Accuracy (spread) and bullet speed are not folded in. Arcing weapons (slingshot, crossbow, mortar, boombow, javelin) will
  miss more than their numbers say.

## What stands out

**Primaries that are weak** (low damage output and not cheap, not an alpha-strike weapon):

| Weapon | Price | Sustained | Kill time | Why it reads weak |
|---|--:|--:|--:|---|
| Cyroclasm | 1,920 | 55 | 2.7 s | 10 damage a hit, needs 30 hits; priced like a rocket launcher |
| Freeze Gun | 1,400 | 74 | 2.5 s | 13 damage, 24 hits to kill; the slow is its whole point |
| Storm Bloom | 2,080 | 90 | 2.5 s | 10 pellets of 5; falloff is 7–18 m, so it is 2% damage at 30 m |
| Javelin Launcher | 224,000 | 18 | 15.8 s | 30 damage a javelin; only the volley ability makes it threatening |
| Mortar Rifle | 1,920 | 49 | 6.4 s | 85 per shell, lobbed, 3-shell mag |
| RPG-7 / Bazooka | 2,080 / 2,480 | 52 / 54 | 6.6 / 7.4 s | 1-round mag and a reload per rocket; 3 direct hits to kill (splash not counted) |
| Boombow / Crossbow | 2,000 / 1,120 | 68 / 67 | 6.5 / 5.6 s | 1-round mag, arc, 4 hits to kill |
| Railgun | 2,400 | 52 | 2.8 s | slowest firing rifle for 100 damage; priced above the AMR-class feel |

Sniper-class by design (high alpha, low DPS): **SR-X** 61 DPS / 4 shots, **AMR** 82 DPS / 2 shots + one-shot headshot for 8,000.

**Primaries that are strong:**

| Weapon | Price | Burst / sustained | Kill time | Note |
|---|--:|--:|--:|---|
| Minigun | 2,400 | 844 / 490 | 2.35 s incl. spool | after 2 s of spool it is the highest output in the game |
| **P90** | 1,400 | 750 / 315 | **0.38 s** | the fastest kill in the game for 1,400; 24% damage left at 36 m |
| Vector SMG | 1,200 | 400 / 199 | 0.72 s | holds 255 DPS at 30 m, far better than the other SMGs |
| Compressed Air Rifle | 1,280 | 283 / 188 | 0.90 s | **no falloff to 42 m**, silent, 6 shots |
| M1 Garand | 1,520 | 292 / 187 | 0.80 s | 3 shots to kill, no falloff to 42 m |

AK20, the "default" rifle, sits at 131 sustained and 1.44 s — about the median and well under the P90 / Vector / Air Rifle / Garand.

**Secondaries that out-perform the primary median** (sustained 109 DPS, kill 1.8 s, price 1,740) — i.e. a secondary is
better than a typical primary while costing a third as much:

| Weapon | Price | Sustained | Kill time | Why it stands out |
|---|--:|--:|--:|---|
| **Gunslinger** | 880 | **251** | 0.84 s | 83 damage a shot with a **30-round magazine** (6,225 damage per life). Beats every primary except the minigun and P90 on sustained DPS. |
| Revolver | 600 | 126 | 1.05 s | 4 shots to kill, no falloff to 32 m; kills faster than the AK20 for 40% less |
| Hand Cannon | 1,040 | 117 | 1.04 s | 3 shots to kill, no falloff to 32 m |
| Sawed-Off | 1,040 | 108 | **0.75 s** | 2 shots to kill at close range; faster than every primary shotgun |
| Nail Gun | 720 | 146 | 1.21 s | out-damages the AK20 sustained for 28% less; falls off past 14 m |
| Mauser C96 | 800 | 114 | 1.20 s | 9 shots, 150 ms apart |
| Slingshot | **400** | 180 | 1.65 s | **unlimited ammo**, 20 shots/s; it lobs, which is the only thing holding it back |
| Machine Revolver | 960 | 114 | 2.6 s | 480 burst DPS but a magazine of 8 can't kill a full-HP player (36 x 9 needed) |
| Auto Revolver | 880 | 97 | 2.8 s | 350 burst DPS, same magazine problem |

**Secondaries that are weak:** Gatecrasher (5 damage a hit, 17 DPS, 1,120), Taser (11 DPS, 31 s to kill; control only),
Frost Blaster (0 damage, slow only), Laser Pointer (75 burst, hitscan, 4 s to kill), Cycler (24 sustained once the magazine is
gone), Flare (85 damage, 1-round mag, 8 s to kill with reloads), Duelist (90 damage, 1-round mag, 5.9 s).

## Full tables

### Primaries

| # | Weapon | Type | Cost | Dmg | Shots/s | Mag | Burst DPS | Sustained DPS | Kill time* | DPS @30 m | Notes |
|--:|---|---|--:|---|--:|--:|--:|--:|--:|--:|---|
| 1 | **Minigun** (`minigun`) | Heavy | 2,400 | 27 | 31.2 | 180 | 844 | 490 | 2.35 s | 437 | 2 s spool-up before it fires; overheats after 10 s; weight 0.3 |
| 2 | **P90** (`p90`) | SMG+ | 1,400 | 15 | 50.0 | 50 | 750 | 315 | 0.38 s | 317 |  |
| 3 | **Vector SMG** (`vector`) | SMG | 1,200 | 18 | 22.2 | 32 | 400 | 199 | 0.72 s | 255 |  |
| 4 | **Compressed Air Rifle** (`air_rifle`) | Silent Rifle | 1,280 | 51 | 5.6 | 20 | 283 | 188 | 0.90 s | 283 |  |
| 5 | **M1 Garand** (`m1_garand`) | Battle Rifle | 1,520 | 117 | 2.5 | 8 | 292 | 187 | 0.80 s | 292 |  |
| 6 | **RPD** (`rpd`) | LMG | 1,800 | 10 | 16.7 | 300 | 167 | 167 | 1.74 s | 151 | 300-round belt, no reload, no reserve |
| 7 | **Flamethrower** (`flamethrower`) | Area | 1,680 | 3×4 | 28.6 | 80 | 343 | 161 | 0.84 s | 27 | range 12 m |
| 8 | **Burst Rifle** (`burst`) | Burst AR | 1,120 | 47 | 21.3 | 21 | 167 | 140 | 1.78 s | 167 | 3-shot bursts, 750 ms pause |
| 9 | **SG-8** (`sg8`) | Shotgun | 880 | 18×6 | 2.2 | 8 | 240 | 138 | 0.90 s | 5 |  |
| 10 | **Chain Gun** (`chain_gun`) | Spin-Up LMG | 2,240 | 22 | 10.0 | 50 | 220 | 136 | 1.30 s | 199 | spin-up 1.0 s -> 0.1 s between shots (full-spin figures) |
| 11 | **AK20** (`ak20`) | AR | 1,000 | 24 | 8.3 | 30 | 200 | 131 | 1.44 s | 196 |  |
| 12 | **MP-40** (`mp40`) | SMG | 800 | 15 | 12.5 | 40 | 188 | 127 | 1.52 s | 79 |  |
| 13 | **Lever Rifle** (`lever`) | Marksman | 1,440 | 93 | 1.9 | 8 | 179 | 125 | 1.56 s | 179 |  |
| 14 | **Grenade Launcher** (`grenade_launcher`) | Explosive | 2,000 | 90 | 1.4 | 6 | 130 | 109 | 2.08 s | 130 |  |
| 15 | **Paintball** (`paintball`) | Paintball | 480 | 40 | 5.0 | 8 | 200 | 107 | 1.40 s | 80 |  |
| 16 | **Storm Bloom** (`storm_bloom`) | Lightning Shotgun | 2,080 | 5×10 | 2.0 | 33 | 100 | 90 | 2.50 s | 2 |  |
| 17 | **Anti-Material Rifle** (`amr`) | Heavy Sniper | 8,000 | 180 | 0.6 | 3 | 112 | 82 | 1.60 s | 112 | one-shot headshot |
| 18 | **Freeze Gun** (`freeze_gun`) | Control | 1,400 | 13 | 9.1 | 30 | 118 | 74 | 2.53 s | 116 |  |
| 19 | **Boombow** (`boombow`) | Explosive Bow | 2,000 | 95 | 1.3 | 1 | 127 | 68 | 6.45 s (+3 reloads) | 127 | mag cannot kill a full-HP player; arcs |
| 20 | **Crossbow** (`crossbow`) | Projectile | 1,120 | 80 | 1.5 | 1 | 123 | 67 | 5.55 s (+3 reloads) | 123 | mag cannot kill a full-HP player; arcs |
| 21 | **SR-X** (`srx`) | Sniper | 2,000 | 95 | 0.8 | 5 | 79 | 61 | 3.60 s | 79 | no spread |
| 22 | **Cyroclasm** (`cyroclasm`) | Cryo Burst | 1,920 | 10 | 16.7 | 30 | 114 | 55 | 2.74 s | 111 | 5-shot bursts, 200 ms pause |
| 23 | **Bazooka** (`bazooka`) | Rocket | 2,480 | 140 | 0.9 | 1 | 127 | 54 | 7.40 s (+2 reloads) | 127 | mag cannot kill a full-HP player |
| 24 | **RPG-7** (`rpg`) | Rocket | 2,080 | 120 | 1.0 | 1 | 120 | 52 | 6.60 s (+2 reloads) | 120 | mag cannot kill a full-HP player |
| 25 | **Railgun** (`railgun`) | Charge | 2,400 | 100 | 0.7 | 3 | 71 | 52 | 2.80 s | 71 |  |
| 26 | **Mortar Rifle** (`mortar_rifle`) | Indirect Explosive | 1,920 | 85 | 0.8 | 3 | 71 | 49 | 6.40 s (+1 reload) | 71 | mag cannot kill a full-HP player; arcs |
| 27 | **Javelin Launcher** (`javelin_launcher`) | Guided Launcher | 224,000 | 30 | 0.7 | 6 | 21 | 18 | 15.80 s (+1 reload) | 21 | mag cannot kill a full-HP player; arcs |

### Secondaries

| # | Weapon | Type | Cost | Dmg | Shots/s | Mag | Burst DPS | Sustained DPS | Kill time* | DPS @30 m | Notes |
|--:|---|---|--:|---|--:|--:|--:|--:|--:|--:|---|
| 1 | **Gunslinger** (`gunslinger`) | Secondary | 880 | 83 | 3.6 | 30 | 296 | 251 | 0.84 s | 296 |  |
| 2 | **Slingshot** (`slingshot`) | Secondary | 400 | 9 | 20.0 | 999 | 180 | 180 | 1.65 s | 163 | unlimited ammo, lobbed; arcs |
| 3 | **Nail Gun** (`nail_gun`) | Secondary | 720 | 27 | 9.1 | 20 | 245 | 146 | 1.21 s | 98 |  |
| 4 | **Revolver** (`revolver`) | Secondary | 600 | 83 | 2.9 | 6 | 237 | 126 | 1.05 s | 237 |  |
| 5 | **Hand Cannon** (`hand_cannon`) | Secondary+ | 1,040 | 105 | 1.9 | 5 | 202 | 117 | 1.04 s | 202 |  |
| 6 | **Mauser C96** (`mauser`) | Secondary | 800 | 36 | 6.7 | 10 | 240 | 114 | 1.20 s | 190 |  |
| 7 | **Machine Revolver** (`machine_revolver`) | Secondary | 960 | 36 | 13.3 | 8 | 480 | 114 | 2.60 s (+1 reload) | 86 | mag cannot kill a full-HP player |
| 8 | **Machine Pistol** (`machine_pistol`) | Secondary | 880 | 14 | 14.3 | 24 | 200 | 108 | 1.47 s | 36 |  |
| 9 | **Sawed-Off** (`sawed_off`) | Secondary | 1,040 | 35×5 | 1.3 | 2 | 233 | 108 | 0.75 s | 5 |  |
| 10 | **Continuum** (`continuum`) | Secondary | 2,400 | 30 | 4.0 | 5 | 120 | 100 | 2.75 s (+1 reload) | 120 | mag cannot kill a full-HP player; infinite reserve |
| 11 | **Auto Revolver** (`auto_revolver`) | Secondary | 880 | 42 | 8.3 | 6 | 350 | 97 | 2.84 s (+1 reload) | 342 | mag cannot kill a full-HP player |
| 12 | **Snubnose** (`snub_revolver`) | Secondary | 560 | 48 | 3.6 | 6 | 171 | 90 | 3.48 s (+1 reload) | 136 | mag cannot kill a full-HP player |
| 13 | **Shorty** (`shorty`) | Secondary | 720 | 30×4 | 1.4 | 2 | 171 | 81 | 3.65 s (+1 reload) | 3 | mag cannot kill a full-HP player |
| 14 | **Throwing Knives** (`throwing_knives`) | Thrown | 480 | 45 | 4.2 | 3 | 188 | 80 | 3.84 s (+2 reloads) | 149 | mag cannot kill a full-HP player |
| 15 | **Cream Pie** (`cream_pie`) | Thrown | 560 | 34 | 3.6 | 5 | 121 | 73 | 3.44 s (+1 reload) | 96 | mag cannot kill a full-HP player |
| 16 | **Pistol** (`pistol`) | Secondary | 240 | 20 | 5.0 | 15 | 100 | 71 | 2.80 s | 79 |  |
| 17 | **Dart Gun** (`dart_gun`) | Secondary | 640 | 38 | 2.9 | 6 | 109 | 68 | 4.05 s (+1 reload) | 86 | mag cannot kill a full-HP player |
| 18 | **Traffic Cone** (`traffic_cone`) | Thrown | 640 | 38 | 3.1 | 4 | 119 | 64 | 3.64 s (+1 reload) | 94 | mag cannot kill a full-HP player |
| 19 | **Duelist** (`duelist_pistol`) | Secondary | 1,120 | 90 | 2.9 | 1 | 257 | 56 | 5.85 s (+3 reloads) | 257 | mag cannot kill a full-HP player |
| 20 | **Laser Pointer** (`laser_pointer`) | Secondary | 480 | 6 | 12.5 | 50 | 75 | 36 | 3.92 s | 73 | ammo regenerates 6/s |
| 21 | **Flare** (`flare`) | Secondary | 320 | 85 | 5.0 | 1 | 425 | 34 | 8.10 s (+3 reloads) | 425 | mag cannot kill a full-HP player; arcs |
| 22 | **Cycler** (`cycler`) | Secondary | 560 | 8 | 20.0 | 100 | 160 | 24 | 1.85 s | 145 | ammo regenerates 3/s |
| 23 | **Gatecrasher** (`gatecrasher`) | Secondary · Piercer Burst | 1,120 | 5 | 3.8 | 36 | 19 | 17 | 16.99 s (+1 reload) | 15 | mag cannot kill a full-HP player |
| 24 | **Taser** (`taser`) | Control | 800 | 10 | 2.2 | 2 | 22 | 11 | 31.25 s (+14 reloads) | 18 | mag cannot kill a full-HP player |
| 25 | **Frost Blaster** (`frost_blaster`) | Secondary | 960 | 0 | 10.0 | 50 | 0 | 0 | — | 0 | mag cannot kill a full-HP player; ammo regenerates 5/s |

\* Kill time: 300 HP, body shots, point-blank, accuracy and headshots ignored; reloads counted.
