#!/usr/bin/env bash
# Build the itch.io upload for PVP Arena.
#
# itch.io serves HTML5 games as a static zip from its own CDN host — there is no
# Node process there, so the multiplayer has to reach OUR server. No build-time
# patching is needed for that: game.js resolves the server address at runtime
# (see the SERVER block at the top of public/game.js) and, on any host that
# isn't ours, points itself at PUBLIC_ORIGIN. So this script only has to
# assemble the static files and get index.html to the ZIP ROOT, which is where
# itch looks for the entry point.
#
# Usage:  ./tools/build-itch.sh          bundle the working tree (for testing)
#         ./tools/build-itch.sh --head   bundle committed HEAD (for uploading)
#
# Prefer --head for anything you actually publish. The working tree routinely has
# half-finished work in it (a map being built, a weapon being tuned), and a zip
# is a one-way door once strangers have downloaded it.
#
# Output: dist/pvp-arena-itch.zip
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"
OUT="$ROOT/dist"
STAGE="$OUT/itch"
ZIP="$OUT/pvp-arena-itch.zip"

FROM_HEAD=0
[ "${1:-}" = "--head" ] && FROM_HEAD=1

# Where to copy the game files from: the working tree, or a throwaway checkout
# of HEAD.
SRC="$ROOT/public"
HEADTMP=""
if [ "$FROM_HEAD" = 1 ]; then
  HEADTMP="$(mktemp -d)"
  trap 'rm -rf "$HEADTMP"' EXIT
  git archive HEAD public | tar -x -C "$HEADTMP"
  SRC="$HEADTMP/public"
  echo "==> source: committed HEAD ($(git rev-parse --short HEAD))"
else
  echo "==> source: working tree"
fi

# Files the game actually needs. Listed explicitly rather than globbing public/,
# so a stray file (a scratch map, an editor backup) can never ride along into a
# public upload.
FILES=(index.html game.js chat.js three.min.js socket.io.min.js wiki.html equipment-models.js)

echo "==> staging"
rm -rf "$STAGE" "$ZIP"
mkdir -p "$STAGE"
for f in "${FILES[@]}"; do
  [ -f "$SRC/$f" ] || { echo "MISSING: public/$f" >&2; exit 1; }
  cp "$SRC/$f" "$STAGE/$f"
done

# Say plainly when the bundle contains work that isn't committed, so nobody
# uploads a colleague's half-built map by accident.
if [ "$FROM_HEAD" = 0 ]; then
  DIRTY="$(git diff --name-only HEAD -- $(printf 'public/%s ' "${FILES[@]}") 2>/dev/null || true)"
  if [ -n "$DIRTY" ]; then
    echo
    echo "!! WARNING: bundling UNCOMMITTED changes in:" >&2
    printf '     %s\n' $DIRTY >&2
    echo "!! Fine for testing. For a real upload use: ./tools/build-itch.sh --head" >&2
    echo
  fi
fi

# macOS litter. Harmless, but it should not be in something strangers download.
find "$STAGE" -name '.DS_Store' -delete

echo "==> checks"
# index.html must sit at the zip root or itch shows "no index.html found".
[ -f "$STAGE/index.html" ] || { echo "index.html not at zip root" >&2; exit 1; }

# Every asset index.html pulls must be relative. A leading slash resolves to the
# CDN host root on itch, where nothing of ours exists.
if grep -oE '(src|href)="/[^"]*"' "$STAGE/index.html"; then
  echo "^^ root-relative reference in index.html — breaks on itch and under /pvp/" >&2
  exit 1
fi

# The runtime server-resolution block has to be present, or a cross-origin build
# silently falls back to same-origin and every request 404s on itch's CDN.
grep -q 'PUBLIC_ORIGIN' "$STAGE/game.js" || { echo "game.js has no PUBLIC_ORIGIN block" >&2; exit 1; }

# Every script index.html loads must actually be IN the bundle. FILES above is a
# hand-maintained list, and a new script added to the page (equipment-models.js
# was exactly this) otherwise ships as a 404 on itch — the page loads, the script
# 404s, and game.js dies at module level on a missing global. Derive the required
# set from the page itself so the list cannot silently fall behind again.
missing=0
while read -r src; do
  [ -z "$src" ] && continue
  case "$src" in http*|//*) continue ;; esac      # external, not ours to bundle
  if [ ! -f "$STAGE/$src" ]; then
    echo "index.html loads '$src' but it is NOT in the bundle" >&2
    missing=1
  fi
done < <(grep -oE '<script[^>]+src="[^"]+"' "$STAGE/index.html" | sed -E 's/.*src="([^"]+)".*/\1/')
[ "$missing" = 0 ] || { echo "^^ add it to FILES in this script" >&2; exit 1; }

node --check "$STAGE/game.js"
node --check "$STAGE/chat.js"

echo "==> zipping"
# -X drops resource forks / extra attrs; cd so paths in the zip are bare names.
( cd "$STAGE" && zip -q -X -r "$ZIP" . )

echo
echo "built: ${ZIP#$ROOT/}"
du -h "$ZIP" | awk '{print "size:  " $1}'
echo "contents:"
unzip -Z1 "$ZIP" | sed 's/^/  /'
echo
echo "Upload that zip to itch, tick \"This file will be played in the browser\","
echo "and see docs/ITCH.md for the rest of the page settings."
