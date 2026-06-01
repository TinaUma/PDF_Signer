#!/usr/bin/env bash
# Build the standalone desktop app (Tauri + embedded FastAPI sidecar) and collect
# the installers into ./release/ at the repo root (not buried in
# src-tauri/target/...). Cross-platform: builds for the HOST OS — Windows
# (.exe/.msi), macOS (.dmg/.app), or Linux (.deb/.rpm/.AppImage). Run from
# anywhere; requires Rust/cargo, Python + PyInstaller, and Node/npm (plus the
# OS-specific Tauri prerequisites — see docs/DEVELOPMENT). The same steps run in
# CI (.github/workflows/release.yml, currently Windows only).
set -euo pipefail
cd "$(dirname "$0")/.."

# Windows sidecar/main binaries carry a .exe suffix; macOS/Linux do not.
TRIPLE="$(rustc -Vv | sed -n 's/^host: //p')"
case "$TRIPLE" in
  *windows*) EXT=".exe" ;;
  *)         EXT="" ;;
esac

# Interpreter for the PyInstaller sidecar build. MUST be a LEAN env (only the
# backend's runtime deps), or the sidecar balloons — a global Python with
# torch/scipy/pandas produced a ~273MB sidecar vs ~43MB from the project venv
# (dead-end #24). Override with PYTHON=... ; default to the repo's .venv when
# present (a bare `python` on Windows/git-bash can resolve to a fat global env
# even with the venv on PATH), else fall back to `python`.
ROOT="$(pwd)"
if [ -n "${PYTHON:-}" ]; then
  PY="$PYTHON"
elif [ -x "$ROOT/.venv/Scripts/python.exe" ]; then
  PY="$ROOT/.venv/Scripts/python.exe"   # Windows venv
elif [ -x "$ROOT/.venv/bin/python" ]; then
  PY="$ROOT/.venv/bin/python"           # POSIX venv
else
  PY="python"
fi
echo "==> Using Python: $PY ($("$PY" -c 'import sys;print(sys.executable)'))"

echo "==> [1/6] Build FastAPI sidecar (PyInstaller)"
(cd backend && "$PY" -m PyInstaller api_server.spec --distpath dist --workpath build_pyi --noconfirm)

echo "==> [2/6] Place sidecar under the Rust target triple ($TRIPLE)"
mkdir -p src-tauri/binaries
cp "backend/dist/api-server$EXT" "src-tauri/binaries/api-server-$TRIPLE$EXT"

echo "==> [3/6] Install frontend deps (+ Tauri CLI)"
(cd frontend && npm install)
[ -x frontend/node_modules/.bin/tauri ] || (cd frontend && npm install -D '@tauri-apps/cli@^2')

echo "==> [4/6] Icons — committed under src-tauri/icons/ (master: app-icon.png)"
# Icons are version-controlled, not generated at build time. To refresh them
# after editing app-icon.png, run: ./frontend/node_modules/.bin/tauri icon app-icon.png

echo "==> [5/6] tauri build (webview discovers the sidecar's dynamic port at runtime)"
# No VITE_API_BASE: the webview asks Rust for the sidecar port via the api_port
# command (see src-tauri/src/lib.rs) and builds the API base at runtime.
./frontend/node_modules/.bin/tauri build

echo "==> [6/6] Collect artifacts into ./release/"
mkdir -p release
# Installer bundles for whichever OS this is (Tauri targets="all" → host formats).
find src-tauri/target/release/bundle -type f \
  \( -name '*.exe' -o -name '*.msi' -o -name '*.dmg' \
     -o -name '*.deb' -o -name '*.rpm' -o -name '*.AppImage' \) \
  -exec cp -f {} release/ \;
# Tauri resolves the sidecar (api-server) next to the main binary at runtime, so
# the bare executable can't start the API without it. Copy both alongside so
# release/ holds a runnable standalone pair. (The installers embed the sidecar
# themselves via externalBin — this is only for the loose binary.)
cp -f "src-tauri/target/release/pdf-signer$EXT" release/ 2>/dev/null || true
cp -f "src-tauri/target/release/api-server$EXT" release/ 2>/dev/null || true
echo "Done. Artifacts in ./release/:"
ls -la release/
