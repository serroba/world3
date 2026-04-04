#!/usr/bin/env bash
# sync-core.sh — Copy @world3/core sources into app/static/ts/core/
#
# The app compiles ts/ → js/ with tsc (rootDir: "ts"), so core files must
# live inside that directory. This script makes packages/core/src/ the single
# source of truth and copies the files before each build.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$REPO_ROOT/packages/core/src"
DEST="$REPO_ROOT/app/static/ts/core"

rm -rf "$DEST"
mkdir -p "$DEST"
cp "$SRC"/*.ts "$DEST/"

echo "sync-core: copied $(ls "$DEST"/*.ts | wc -l | tr -d ' ') files → app/static/ts/core/"
