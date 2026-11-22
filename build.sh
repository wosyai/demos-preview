#!/usr/bin/env bash
set -euo pipefail
root=$(cd "$(dirname "$0")" && pwd)
cd "$root/voxel"
"${WOSY:-wosy}" build app
node "$root/tools/verify-wasm.mjs" "$PWD/.wosy/artifacts/app/dev/main/main" --binary
cp "$PWD/.wosy/artifacts/app/dev/main/main" "$PWD/engine.wasm"
