# Publishing PVP Arena on itch.io

## The one thing to understand first

itch.io hosts **static files only**. It unzips your upload onto its own CDN host
and serves it in an iframe — there is no Node process, no Express, no Socket.IO
server on itch's side.

So the game on itch is a client that talks back to **our** server at
`https://sushigamelab.com/pvp`. That means:

- **Multiplayer, accounts, and the shop only work while that server is up.** If
  the VPS is down, itch players get the "lost connection" banner.
- Bots are simulated client-side, so shooting practice survives an outage even
  though matchmaking doesn't.
- No build-time editing is needed to point the client at the server. `game.js`
  works it out at runtime (the `SERVER` block at the top of the file): on any
  host that isn't ours it uses `PUBLIC_ORIGIN`. One codebase, both deploys.

If the game ever moves off sushigamelab.com, change `PUBLIC_ORIGIN` /
`PUBLIC_PREFIX` at the top of `public/game.js` and rebuild. That is the only
place the address is written down.

## Build the upload

```bash
./tools/build-itch.sh --head
```

Produces `dist/pvp-arena-itch.zip` (~470 KB). The script refuses to build if
`index.html` isn't at the zip root, if any asset reference is root-relative
(a leading `/` resolves to itch's CDN root, where nothing of ours lives), or if
either script fails `node --check`.

**Use `--head` for anything you publish.** It bundles committed `HEAD` from a
throwaway checkout, so whatever half-finished map or weapon is sitting in your
working tree cannot ride along. Without the flag it bundles the working tree —
handy for testing a change before committing, and it prints a loud warning
listing exactly which uncommitted files went in. A zip is a one-way door once
strangers have downloaded it.

## itch page settings

Create the project at <https://itch.io/game/new>, then:

| Field | Value |
|---|---|
| **Kind of project** | **HTML** |
| Uploads | `dist/pvp-arena-itch.zip`, then tick **"This file will be played in the browser"** |
| Embed options | **Embed in page** |
| Viewport dimensions | **1280 × 720** |
| **Fullscreen button** | **enabled** |
| Mobile friendly | **off** — keyboard + mouse only |
| Automatically start on page load | off (let players click in; the browser needs a gesture before audio and mouse-lock work) |
| Visibility | start **Draft**, publish once you've played it in the itch iframe |

Genre: Action / Shooter. Tags worth having: `fps`, `multiplayer`, `3d`,
`shooter`, `browser`, `threejs`, `singleplayer` (bots).

## Before you hit publish

- **Play it once in the itch iframe as a draft.** Mouse-lock behaves differently
  inside an iframe than on a plain page. itch's iframe does allow pointer lock,
  but confirm it with your own hands rather than trusting this file.
- **Check the server is up**, or the first impression is a connection error:
  ```bash
  curl -s -o /dev/null -w "%{http_code}\n" https://sushigamelab.com/pvp/shop/catalog
  ```
  `200` means good.
- **Privacy** — same rule the family uses everywhere else: the byline can be a
  name, but **no age, city, school, or private email** in the page description,
  devlog, or profile. Name + age + city together is what actually identifies a
  kid. The itch account itself should be registered and operated by a parent.
- The repo is public and the admin unlock codes in `server.js` are visible in
  it. That was a deliberate call for a hobby project, but a wider audience is
  more people who might read it — worth revisiting if the shop economy starts
  mattering to anyone.

## Updating after launch

Rebuild and upload the new zip over the old one; itch keeps the same play URL.
Players may need a hard reload to drop a cached `game.js`.

Note that the itch build and sushigamelab.com share a server, so **accounts,
credits, and purchases are the same account on both**. A player can buy a weapon
on itch and have it on the website.
