# CLAUDE.md — PVP Arena

Multiplayer browser FPS. Three.js + Socket.IO + Express. Hosted on Railway, repo `VideoGameTips/pvp-game`.

## ⚠️ Hard-won gotchas (don't repeat these)

1. **ALWAYS `cd /Users/andyli/projects/TABS/pvp-game` first** in Bash commands. Running `node --check public/game.js` or `git` from the parent dir fails with `Cannot find module /Users/andyli/projects/TABS/public/game.js`. This bit me ~10 times. The shell does NOT persist cwd between tool calls reliably — prefix or chain with `cd`.

2. **Parallel arrays must stay index-aligned.** When adding weapons:
   - `WEAPONS[]` ↔ `weaponModels[]` (build fns, same order)
   - `MELEE_ITEMS[]` ↔ `meleeModels[]` ↔ `MELEE_SWING_TYPES[]`
   - `SUPPORT_ITEMS[]` ↔ `supportModels[]`
   Add to ALL the parallel structures or you get off-by-one model/swing mismatches. Verify counts after.

3. **Weapon models need a `_flash` Object3D.** The fire code does `model._flash.visible = true` / `.getWorldPosition()` unconditionally. Custom (non-`_genericGun`) models MUST set `_flash` or firing throws (surfaced as the useless "Script error: 0" on `file://`). See `_throwableHolder`.

4. **Client ↔ server must mirror these tables** (edit BOTH files):
   - `WEAPON_COSTS` (public/game.js + server.js)
   - `BUNDLES` (public/game.js array + server.js object)
   - Map pool list (server picks the map; client honors `mapId`)
   - `WEAPON_DAMAGE` in server.js when adding damaging weapons.

5. **Helper names**: ground plane is `addMapGround(name, color, gridColor)` — NOT `addMapGroundPlane`. Boxes via `addMapBox(map, x,y,z, w,h,d, color, rotY?, opacity?)`.

6. **Verify before claiming done.** Several "bugs" were actually just Railway serving a stale build, or the page loaded from `file://` instead of `http://localhost:3001`. Check `curl -s <railway>/game.js | wc -c` vs local size when prod looks wrong.

## Run / preview

- `.claude/launch.json` defines server `pvp-game` on port 3001 (`node server.js`).
- Use `mcp__Claude_Preview__preview_start` with name `pvp-game`. If port busy: `lsof -ti :3001 | xargs kill -9`, then retry. A launchd agent (`com.tabs.pvp`) may auto-respawn it — `launchctl unload ~/Library/LaunchAgents/com.tabs.pvp.plist` to free it.
- Server reads `process.env.PORT || 3001`.

## Architecture

- **One server process.** Logical isolation via `matchId` + `emitToMatch(matchId, event, data)`. Lobby = default room. Each private match = its own bubble (fixed the old "6v6 when a stranger joins" bug).
- **Bots are client-side**, simulated on the match HOST. Host spawns bots; guests receive them over the network. `pvpMatch.isHost` gates this.
- **Hits are client-authoritative** (`emitHit` → server applies). Bots always hit the player (no miss roll) EXCEPT auto-weapon burst shots now roll a hit chance.
- **Staging lobby** (`stagingLobbies[mode]`) is the live matchmaking path (`joinStagingLobby` → `lobbyStart`). The old `pvpQueues`/`pvpResult` path is orphaned — no client listener.
- Main render loop: `function loop()`. Single `renderer.render(scene, camera)` (the Kill Log theater intercepts this for 6-viewport rendering).

## Where things live (public/game.js, ~15k lines)

- Weapons: `WEAPONS[]` (primary+secondary), `MELEE_ITEMS[]`, `SUPPORT_ITEMS[]` near top.
- Maps: `buildXxxMap()` fns + `MAP_GROUPS`, `registerMap()`, `activateMap()`. Batch-5 maps + `_batch5` mechanics state.
- Shop/economy: `WEAPON_COSTS`, `BUNDLES`, credits/fragments/chests/wheel/upgrades, `openShop()`, `SHOOT_FX` sliders.
- Bot AI: `updateBotAI(dt)`, `botTuning()`, spawn in `spawnGameBots()` / `makeBot()`.
- Killcam + Kill Log theater: `KILLCAM`, `killLog`, `THEATER`, `renderTheater()`.
- Sound: `playWeaponSound`, `playSoundEvent` (big dispatch), `playMuzzleBlast`.

## Security constraints (user opted into these for a hobby project)

- `users.json` = **plaintext passwords**, MUST stay gitignored. Never commit it.
- `ADMIN_MASTER_PASS` is now an **env var** (was hardcoded `A6D7m1n` — that's compromised, public repo). Don't hardcode it again.
- Railway needs a **persistent volume at `/data`** + `DATA_DIR=/data` env var or accounts wipe on redeploy. `DATA_DIR` controls `users.json` path.
- Repo is **public** — admin unlock codes are visible in server.js (user accepts this).

## Working with Andy (work habits)

- **Commit + push after essentially every change.** Detailed commit messages, end with `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`. Push to `main` (PR #1 already merged). Report briefly after.
- **Bias to action.** He often answers tersely ("y", "k", "do it", "go") or dismisses question prompts. Make the reasonable call and keep building rather than over-asking. Ask only when genuinely blocked or a decision is irreversible.
- Requests arrive as a stream of small features; he frequently **playtests and reports bugs** in casual language ("the enemy walked through the wall", "shuriken doesn't work"). Treat those as real bug reports — investigate, don't hand-wave.
- **If he points at a place, look THERE first.** When a report names a feature, system, button, or area ("mobile shooting", "the kill log", "bot AI", "the shop"), grep/read that exact code path before anything else. Start the investigation where he pointed — don't go exploring the whole codebase first.
- **Self-correct: after making the SAME mistake 3+ times, write it into this file.** If you catch yourself repeating an error (wrong cwd, off-by-one parallel array, stale build confusion, etc.) three or more times, immediately add a new entry to the "⚠️ Hard-won gotchas" section above so it stops happening. The gotchas list exists precisely because past mistakes got logged — keep feeding it.
- Likes **balance**: P2W weapons should be *ridiculously expensive*, not cheap. Fragments/credits should require grind for top-tier items.
- Enjoys **humor + casual banter**; sometimes writes in Chinese/English mix. Match the energy but stay focused on shipping.
- He can't run `claude` CLI (not in PATH) and sets up Railway via dashboard manually — give click-by-click guidance, can't do dashboard steps for him.
- After big features, he may share AI-generated **comics** about the game for fun — react, don't over-engineer features off them unless asked.
