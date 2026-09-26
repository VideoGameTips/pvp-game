# CLAUDE.md — PVP Arena

Multiplayer browser FPS. Three.js + Socket.IO + Express. Repo `VideoGameTips/pvp-game`.

**Live at https://sushigamelab.com/pvp/** (was Railway; the old
`pvp-game-production.up.railway.app` is dead and 404s). To put a change live,
see **上线 / Deploy** below — Andy just says "上线".
**Also shipped on itch.io** as a static bundle — see [`docs/ITCH.md`](docs/ITCH.md),
built with `./tools/build-itch.sh`.

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

6. **Never write a root-relative URL** (`fetch('/auth/login')`, `href="/wiki.html"`).
   The game is NOT served from a site root: sushigamelab.com proxies it under
   `/pvp/`, and on itch.io it runs on a foreign CDN host entirely. A leading `/`
   resolves to that host's root, where none of our routes exist — Caddy answers
   404, `r.json()` throws on the HTML body, and the user sees the catch-block
   message `cannot reach server — is it running on port 3001?` while the server
   is perfectly healthy. This silently killed login and the whole shop on the
   live site. Go through `SERVER.base` / `window.SERVER_BASE` (resolved once at
   the top of `public/game.js`) for requests, and keep asset paths relative.
   `tools/build-itch.sh` fails the build if `index.html` regresses on this.

7. **Verify before claiming done.** Several "bugs" were actually just a stale build still being served (pushed but not deployed), or the page loaded from `file://` instead of `http://localhost:3001`. When prod looks wrong, compare `curl -s https://sushigamelab.com/pvp/game.js | shasum -a 256` with `shasum -a 256 public/game.js`.

8. **The UI is bilingual (EN / 中文, `public/i18n.js`).** English is the key: a
   MutationObserver translates text nodes and placeholder/title/aria-label as the
   game writes them, `alert/confirm/prompt` are wrapped, and `{placeholders}` match
   whole strings (`'ROUND {n}': '第 {n} 回合'`). So: write new UI text in English
   as usual and add the Chinese to the `ZH` table — a missing entry just shows
   English. Never branch on displayed text (`if (btn.textContent === 'READY')`):
   in Chinese it isn't English any more. Text people type (chat) goes through
   `I18N.exact()` or lives under `data-no-i18n`. Weapon/skin/map/character names
   stay untranslated on purpose.

## Run / preview

- `.claude/launch.json` defines server `pvp-game` on port 3001 (`node server.js`).
- Use `mcp__Claude_Preview__preview_start` with name `pvp-game`. If port busy: `lsof -ti :3001 | xargs kill -9`, then retry. A launchd agent (`com.tabs.pvp`) may auto-respawn it — `launchctl unload ~/Library/LaunchAgents/com.tabs.pvp.plist` to free it.
- Server reads `process.env.PORT || 3001`.

## 上线 / Deploy — when Andy says "上线", "deploy", "ship it" or "go live"

The live game is a separate clone on the server plus a Node backend. Pushing to GitHub changes
nothing there — only the deploy script does. Since the 2026-09-26 server move this section is the
source of truth; older notes elsewhere (e.g. `TABS/CLAUDE.md`) may point at the old server.

1. **Push.** Only `main` goes live: commit, then `git push origin HEAD:main`.
2. **See what will ship.** Live commit: `ssh irontide-vps 'git -C /opt/games/sushigamelab/pvp log --oneline -1'`,
   then `git log --oneline <live>..origin/main`. If that's more than Andy's latest change, show him the list.
3. **Stop and ask Andy to check with his dad first** if that range
   - changes `package.json` — the script never runs `npm install`, so the server would crash on start;
   - removes or renames anything players can buy — real accounts own it, so the live accounts get checked first;
   - touches real-money payments, or needs a new secret / env var on the server.
4. **Who's playing?** A deploy *always* restarts the backend and drops everyone mid-match:
   `ssh irontide-vps "ss -tn state established '( sport = :7780 )' | tail -n +2 | wc -l"` — `0` = nobody. Otherwise ask.
5. **Deploy:** `ssh irontide-vps '/opt/games/sushigamelab/deploy-pvp.sh'`. Expect `pvp ⬆️ <old> → <new>`,
   `→ 重启 pvp 服务端`, `active`. Anything but `active` means the game is down — read
   `ssh irontide-vps 'sudo journalctl -u sushigamelab-pvp -n 40 --no-pager -o cat'` and tell Andy.
6. **Verify — a successful push is not a deploy:** the live commit (step 2) now equals your HEAD;
   `curl -s https://sushigamelab.com/pvp/game.js | shasum -a 256` equals `shasum -a 256 public/game.js`;
   `ssh irontide-vps 'sudo systemctl status sushigamelab-pvp --no-pager | grep Active:'` shows a time after the deploy.
7. **Report** the commit range that went live and those three checks, briefly (see "Verify in proportion").

`irontide-vps` is an SSH alias in `~/.ssh/config`. This repo is public, so the server's address and
username are deliberately **not** written here. If the alias is missing, stop and tell Andy — setting
it up is Job 4 in his server-move doc. Full runbook: `docs/DEPLOY.md` in the private sushigamelab repo (Parts 3–5).

## Architecture

- **One server process.** Logical isolation via `matchId` + `emitToMatch(matchId, event, data)`. Lobby = default room. Each private match = its own bubble (fixed the old "6v6 when a stranger joins" bug).
- **Bots are client-side**, simulated on the match HOST. Host spawns bots; guests receive them over the network. `pvpMatch.isHost` gates this.
- **Hits are client-authoritative** (`emitHit` → server applies). Bots always hit the player (no miss roll) EXCEPT auto-weapon burst shots now roll a hit chance.
- **Staging lobby** (`stagingLobbies[mode]`) is the live matchmaking path (`joinStagingLobby` → `lobbyStart`). The old `pvpQueues`/`pvpResult` path is orphaned — no client listener. **1v1 and the team modes (2v2 / 3v3 / 5v5 / 10v10) look for real players for up to 15 s** before filling with bots (`HUMAN_SEARCH_MODES`); the rest start as soon as everyone in the lobby is ready.
- **Lobby 13 is one shared room (`'hub'`)** — real players see each other there (#46). Its 37-character cast is **client-local**: never `spawnBots` / `botMove` it, or N players put N×37 bodies in the hub. ⚔️ DUEL challenges a real player there (`duelInvite` → `duelAnswer` → a no-bot 1v1 via `startLobbyMatch(…, { duel: true })`).
- **Changing room drops your bots** (`movePlayerToMatch`): the client re-sends `spawnBots` for every match, and `teardownMatchWorld()` sends `leaveMatch`. A real opponent who leaves an elim match ends it (`opponentLeft`, scoped to `currentRoom` — `playerLeft` only means "left the room you're in").
- **Several real players in one match (#48): the host runs it.** The host (first in the match lobby, `pvpMatch.hostId`) simulates the bots and decides rounds, timeouts, team kills and the end, sending them as `matchEvent`; guests play them out (`mpApplyRound`) instead of deciding (`mpGuest()` gates every decision point). Bot shots are relayed (`botShots`) and flown through each target's own hitbox test. Local deaths are told to the server (`iDied`), local bot kills go as `fatal` — client and server damage differ, so without that a death stays on one screen. Every such path is gated on `mpMatch()` (another real player in this match): single-player is untouched.
- **Teams are absolute on the wire, relative in the client.** `fromWire()` turns an incoming player's `team` into my side (`'ally'`) / theirs; `absTeam()` turns a local label back for anything sent (bots in `spawnBots`) and for spawn sides. Don't compare a received `team` with `pvpMatch.team` — it's already relative. FFA / KOTH / arcade with several real players are still decided per client.
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
- `DATA_DIR` controls the `users.json` path. On the live server it points outside the checkout, so a deploy never touches accounts (the old Railway volume note no longer applies).
- Repo is **public** — admin unlock codes are visible in server.js (user accepts this).

## Working with Andy (work habits)

- **Commit + push after essentially every change.** Detailed commit messages, end with `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`. Push to `main` (PR #1 already merged). Report briefly after.
- **Bias to action.** He often answers tersely ("y", "k", "do it", "go") or dismisses question prompts. Make the reasonable call and keep building rather than over-asking. Ask only when genuinely blocked or a decision is irreversible.
- Requests arrive as a stream of small features; he frequently **playtests and reports bugs** in casual language ("the enemy walked through the wall", "shuriken doesn't work"). Treat those as real bug reports — investigate, don't hand-wave.
- **New weapons: don't bother verifying they work in a live preview — Andy playtests those himself.** For a new/modified weapon, item, or skin, just `node --check` the files and confirm parallel-array alignment (gotcha #2) + client/server table mirrors (gotcha #4), then commit. (Still verify *bug fixes* and non-weapon behavior changes when practical.)
- **Verify in proportion — Andy is on the $20 plan.** A small change must not turn into hours of
  testing. Default to the lightest check that fits (#28):

  | change | check |
  |---|---|
  | copy, colours, numbers, new weapons / skins | `node --check` + gotchas #2 / #4; no tests — Andy playtests |
  | bug fix / behaviour change | one targeted check (a quick probe or preview, seconds to a minute); no mutation testing, no full regression |
  | big UI / flow overhaul | tests + full regression + a real phone — once, before merging |

  Scratch test scripts stay out of the repo unless asked.
- Likes **balance**: P2W weapons should be *ridiculously expensive*, not cheap. Fragments/credits should require grind for top-tier items.
- Enjoys **humor + casual banter**; sometimes writes in Chinese/English mix. Match the energy but stay focused on shipping.
- He can't run `claude` CLI (not in PATH) and sets up Railway via dashboard manually — give click-by-click guidance, can't do dashboard steps for him.
- After big features, he may share AI-generated **comics** about the game for fun — react, don't over-engineer features off them unless asked.
