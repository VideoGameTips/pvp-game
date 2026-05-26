# PVP Arena Wiki

**PVP Arena** is a fast-paced multiplayer browser FPS built on Three.js + Socket.IO. Battle bots and other players across 13 maps, 15+ game modes, and an arsenal of 200+ weapons.

🌐 **Play it live:** https://pvp-game-production.up.railway.app
📦 **Source code:** https://github.com/VideoGameTips/pvp-game

---

## 🎮 Game Modes

### Elimination (Round-Based)
- **1v1** · **2v2** · **3v3** — first team to win N rounds.
- No respawns within a round.

### Race (First to N Kills)
- **FFA5 · FFA8** — free-for-all to kill goal.
- **Race 2v2 / 3v3** — team kill race.

### Special Modes
- **D-Day** — Defend the hill against waves of enemies (MG42 + AK20 forced loadout).
- **Frontlines** — Push the battle line to the enemy base.
- **Last Stand** — Survive 10 escalating waves.
- **Shooting Range** — Practice mode, no enemies.
- **👑 King of the Hill (KOTH)** — 10 players, 3 lives each, last alive wins. Plays on the massive 250×250 BR arena map with vehicles, helicopters, and mortars.

### 🎮 Arcade Modes (6)
1. **Gun Game** — 21-tier weapon ladder, get a kill to upgrade, win on knife.
2. **One in the Chamber** — 1 bullet, every shot is a kill, refills on kill.
3. **Juggernaut** — One mega-buffed player vs. the rest; killer becomes the new juggernaut.
4. **Infection** — Zombies vs. humans. Zombies convert humans on kill.
5. **Sniper Only** — Snipers forced, no secondaries.
6. **Speedrun** — Solo race to 20 kills, personal best tracked in localStorage.

---

## 🗺️ Maps (13)

| Map | Theme | Notable Features |
|---|---|---|
| **Blank** | Open arena | Default, no obstacles |
| **Urban** | City | Climbable skyscraper 🤫 |
| **Warehouse** | Industrial | Crate cover |
| **Forest** | Woodland | Trees + tall grass |
| **Volcano** | Lava plain | Hot zones |
| **Cyber** | Neon city | Glowing structures |
| **Desert** | Arid | Long sightlines |
| **Tundra** | Snowy | Slippery |
| **Space Station** | Sci-fi | Low-G zones |
| **🛬 Airport** | Terminal | Breakable glass + lights |
| **🪖 Trenches** | WWI | Pilotable mortars (hold E) |
| **☢️ Chernobyl** | Nuclear | 4 destructible reactors, toxic gas |
| **🛢️ Refinery / 🛫 Skydock / ☣️ Sewer / 🌀 Gravity Lab / 🔷 Glassworks** | Various | (Codex-added) |
| **👑 BR Arena** | Massive | 250×250, vehicles + helis + mortars (KOTH only) |

---

## 🔫 Weapon Arsenal (200+ total)

### Slot Breakdown (non-admin)
- **60 Primaries**: ARs, SMGs, shotguns, snipers, LMGs, energy weapons, projectiles, joke guns
- **30 Secondaries**: Pistols, revolvers, thrown weapons, gimmicks
- **34 Melees**: Bats, swords, axes, kitchen tools, sci-fi blades
- **37 Utilities**: Grenades, heals, traps, drones, shields

### Plus 24 🪖 Admin Items
Unlockable via promo codes (case-sensitive). Includes:
- Heavy primaries (Minigun M134, Anti-Material Barrett, MK-44 Bushmaster)
- Tactical secondaries (Desert Eagle, M1911, PPK)
- Combat knives (Karambit, Bayonet, Tomahawk, OTs-04, Spec-Ops Garrote)
- Utilities (C4, Claymore, Stun Grenade, Thermite, Predator UAV, Care Package, Tactical Nuke)

---

## 🛒 Shop System

### 💰 Credits
- Earn from matches: **5 × kills + 50 (win) / 20 (loss)**, capped at **250/match**.
- Start with 500 on new account.
- Spend on weapons, bundles, chests, wheel spins, and the Admin Pass.

### 🧩 Weapon Fragments
- Drop from chests (10-80 per chest).
- **100 fragments = unlock any weapon** (alt to credits).
- Used to upgrade owned weapons.

### 📦 Chests
| Chest | Cost | Drops |
|---|---|---|
| **Common** | 120💰 | 10-25 frags + 0-30 credits |
| **Rare** | 400💰 | 35-80 frags + 30-100 credits + 5% chance of a free weapon |

**Earned at match end:**
- Win: 50% common drop + 15% rare drop chance
- Loss: 30% common + 5% rare

### ✨ Upgrades
Each weapon you own can be upgraded across 3 stats, **10 levels each**:
- **Damage** — +12% per level (max +120%)
- **Magazine** — +25% per level (max +250%)
- **Reload** — ×0.85 per level (max -85% / 6.7× faster)

Per-level costs: 30 / 60 / 120 / 240 / 480 / 800 / 1200 / 1800 / 2500 / 3500 fragments.

### 🎡 Daily Wheel
- 1 **free spin per day** (UTC reset)
- Extra spins cost 100 credits
- Possible outcomes (probabilities):
  - 45% Credits (60-180)
  - 35% Fragments (12-30)
  - 14% Big Fragments (40-80)
  - 5% Small Rare (200💰 or 100🧩)
  - 0.7% Big Bundle (400💰ﾠ+ 150🧩)
  - **0.3% JACKPOT** — random rare weapon worth ≥400 credits

### 🪖 Admin Pass
- **300 credits** for a 10-minute window where every weapon (including all admin items) is equippable.
- Trial-style flex — once it expires, you go back to whatever you actually own.

---

## 💼 Bundles (24 total)

All bundles save 40-70% off the sum of individual prices.

### 🎯 Standard
| Bundle | Cost | Contents |
|---|---|---|
| Pitiful Pack | 420💰 | Classic loadout: AK30, SG100, Revolver, Bat, Smoke |
| Starter Pro | 330💰 | AK30, Revolver, Bat, Stim |
| Heavy Duty | 700💰 | Minigun, Grenade Launcher, Machine Revolver, Crowbar, Sticky Charge |

### 🎯 Themed
| Bundle | Cost | Theme |
|---|---|---|
| Sniper Pack | 580💰 | Long-range duelist |
| Run & Gun | 430💰 | Fast SMGs + speed boost |
| Melee Master | 480💰 | Close-quarters |
| Shotgun Pack | 430💰 | Close-range chaos |
| Pyromaniac | 620💰 | Fire weapons |
| Stealth Ops | 360💰 | Silent kit |
| Storm Pack | 420💰 | Lightning weapons |
| Defensive | 450💰 | Tank-style survival |
| Frostbite | 380💰 | Cold weapons |
| Knockback | 500💰 | Send them flying |
| Smart Tech | 610💰 | Tracking drones |
| Mortar Squad | 550💰 | Indirect fire |
| Sci-Fi Arsenal | 500💰 | Energy weapons |
| Demolition | 600💰 | Explosives |
| Archer's Kit | 580💰 | Bows + traps |
| Marksman | 430💰 | Precision shooting |
| Knight's Honor | 410💰 | Swords + shotgun |

### 🎉 Fun
| Bundle | Cost | Theme |
|---|---|---|
| Retro Pack | 145💰 | Paintball, laser pointer, baguette, etc. |
| Chaos Mode | 150💰 | Goofy weapons |
| Kitchen Catastrophe | 130💰 | Frying pan, baguette, rubber duck |

### 💎 Premium
| Bundle | Cost | Contents |
|---|---|---|
| Royalty | 4,500💰 | Royal Minigun + Vampire Blade + Hand Cannon + Orbital Strike |
| **🌌 Cosmic P2W** | 80,000💰 | All 21 sci-fi P2W items (~30% off) |

---

## 📋 Best Loadouts (30 Curated Builds)

Accessible via the **📋 BEST LOADOUTS** button on the loadout screen. Tap any to auto-equip.

| # | Name | Theme |
|---|---|---|
| 1 | 🏆 The Lockdown | Tournament-grade fundamentals |
| 2 | ⚡ Caffeine Crash | Outrun every bullet |
| 3 | 🎯 Headhunter | One scope. One tap. |
| 4 | 💥 Demo Disco | Explosives party |
| 5 | 🔥 Arsonist's Holiday | Everything burns |
| 6 | 🤖 404: You Lose | Disable & dismantle |
| 7 | 🥷 Lights Out | Heard, never seen |
| 8 | 🛡️ Immovable Object | You will not pass |
| 9 | 🏏 Recess Bully | Playground chaos |
| 10 | 🌪️ Yeet Squad | Send them flying |
| 11 | ⚔️ For The Realm | Knight's loadout |
| 12 | 🩸 Bloodletter | Heal off their pain |
| 13 | 🏹 Sherwood Special | Bows + bolas |
| 14 | 🛹 No Brakes | Sprint-only kit |
| 15 | 🧊 Permafrost | Slow + finish |
| 16 | ⚡ Thor's Allowance | Shock therapy |
| 17 | 🎯 Steady Hand | Mid-range scalpel |
| 18 | 🍳 Recipe for Disaster | Kitchen tools |
| 19 | 💎 Credit Card Maxed | Pure P2W |
| 20 | 🐢 The Hedge | Camp + punish |
| 21 | 🌌 Spacefarer | Sci-fi tech |
| 22 | 🎪 Clown Convention | Slapstick warfare |
| 23 | 🔮 Light Show | Refractive chaos |
| 24 | 🦅 Bread & Butter | Reliable in any mode |
| 25 | 🥊 Closing Time | Bar-fight ready |
| 26 | 🌠 Reality Breaker | Endgame cosmic flex |
| 27 | 🎤 Loudpack | Subtle as a brick |
| 28 | 🪖 Boots on Ground | Mil-spec professional |
| 29 | 🩹 Field Medic | Outlive everyone |
| 30 | 👻 Through the Veil | Phase past wards |

---

## 🎯 Difficulty Tiers

- **Easy** — Bots aim slower, react late.
- **Medium** — Standard challenge.
- **Hard** — Faster reactions, better aim, ability use.
- **Expert** — Aggressive flanking, kite-retreat from scary weapons, low timidity.

---

## 💡 Tips & Tricks

### Useful
- The default loadout is more versatile than it looks.
- Aiming down sights tightens spread on every gun.
- Reloading early loses your reserve bullets — finish the mag.
- Free spin resets daily at midnight UTC.

### Strategic
- **Cycler** never reloads — perfect for finishing weak enemies.
- **SR-X** one-shots headshots.
- **Stim Shot** is faster than Medkit.
- **Knife** users move 2× as fast.
- **RPD** never reloads either.
- **KOTH** gives 3 lives — don't rush the center first.

### Secrets 🤫
- You can climb the skyscraper in **URBAN**.
- **Chernobyl's** 4 reactors are destructible.
- **Airport** glass + lights break.
- **Mortars** in Trenches are pilotable (hold E).
- **Helicopters** in KOTH can be hijacked mid-air.
- The 0.3% wheel jackpot drops a random rare weapon ≥400 credits.

---

## 🏛️ Lobby System

- **Staging lobby** before every multiplayer match.
- Players ready up; the side missing players can vote to fill with bots or play short-handed.
- **Match isolation** — each match runs in its own private bubble so concurrent games don't pollute each other.

---

## 👤 Account System

- Username + password (stored plaintext server-side — hobby project choice).
- Auto-save progress: credits, unlocks, purchased items, fragments, chests, upgrades.
- Auto-login on return via localStorage.
- Free starter loadout for every new account: **AK20, SG-8, Pistol, Flare, Fists, Frying Pan, Frag, Medkit**.

---

## 🔧 Tech Stack

- **Three.js** — 3D rendering
- **Socket.IO** — multiplayer networking
- **Express + Node.js** — server
- **Railway** — production hosting
- **Vanilla JS** — no framework on the client

---

## 📜 Credits

- Engine, design, and most code: **VideoGameTips** (zianandyli@gmail.com)
- Additional content: **Codex** (5 maps + respawn improvements)
- Master Admin: **Trash123** 👑 (suspiciously well-equipped — see fun facts)

---

*Last updated: contents reflect the current state of `main` branch.*
