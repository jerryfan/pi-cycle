#!/usr/bin/env bash
set -euo pipefail

# Regenerates demo.gif as a still-montage (robust):
# - installs pi-cycle + pi-oneliner into an isolated temp HOME
# - records one short clip per profile via VHS
# - extracts one stable still per clip
# - stitches stills into demo.gif
#
# Recommended: run inside WSL2.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

WORK="${1:-}"
if [[ -z "$WORK" ]]; then
  WORK="/tmp/pi-cycle-demo-$(date +%s)"
fi

HOME_DIR="$WORK/home"
AGENT_DIR="$HOME_DIR/.pi/agent"
CAP_DIR="$WORK/captures"
STILLS_DIR="$WORK/stills"
TAPES_DIR="$WORK/tapes"

mkdir -p "$HOME_DIR" "$AGENT_DIR" "$CAP_DIR" "$STILLS_DIR" "$TAPES_DIR"

export HOME="$HOME_DIR"
export PI_CODING_AGENT_DIR="$AGENT_DIR"
export PI_ONELINER_PRESET="${PI_ONELINER_PRESET:-ultra}"

# Make `pi install npm:<pkg>` work without sudo on Linux by using a writable npm global prefix.
export NPM_CONFIG_PREFIX="$HOME/.npm-global"
export PATH="$NPM_CONFIG_PREFIX/bin:$PATH"
mkdir -p "$NPM_CONFIG_PREFIX" "$NPM_CONFIG_PREFIX/bin"

# Only needed so model activation doesn't fail on missing key during demo.
# The demo never sends requests.
export OPENAI_API_KEY="${OPENAI_API_KEY:-demo}"

# Clean isolated agent home for deterministic output
rm -rf "$AGENT_DIR" || true
mkdir -p "$AGENT_DIR"

cd "$REPO_DIR"

# Install extensions into the isolated agent settings
pi install "$REPO_DIR" >/dev/null

# Reduce startup noise so captures only show the cycling UX.
node - <<'NODE'
const fs = require('fs');
const path = require('path');
const p = path.join(process.env.PI_CODING_AGENT_DIR, 'settings.json');
let s = {};
try { s = JSON.parse(fs.readFileSync(p, 'utf8')); } catch {}
s.quietStartup = true;
s.collapseChangelog = true;
fs.writeFileSync(p, JSON.stringify(s, null, 2) + '\n');
NODE

PI_ONELINER_SOURCE="${PI_ONELINER_SOURCE:-npm:pi-oneliner}"

if ! pi install "$PI_ONELINER_SOURCE" >/dev/null; then
  # Fallback for monorepo-based dev environments.
  if [[ -d "/mnt/c/code/pi/public/pi-oneliner" ]]; then
    pi install "/mnt/c/code/pi/public/pi-oneliner" >/dev/null
  else
    echo "failed: pi install $PI_ONELINER_SOURCE" >&2
    echo "Tip: set PI_ONELINER_SOURCE to a local checkout path, e.g.:" >&2
    echo "  PI_ONELINER_SOURCE=/path/to/pi-oneliner bash tools/vhs/render-demo.sh" >&2
    exit 2
  fi
fi

profiles=(deep code general fast value)

mk_tape() {
  local profile="$1"
  local tape="$2"
  cat > "$tape" <<EOF
Output clip.mp4

Require pi

Set Shell "bash"
Set FontSize 22
Set Width 1200
Set Height 650
Set Framerate 15
Set TypingSpeed 40ms

Type "pi --offline" Enter
Sleep 2s

Type "/reload" Enter
Sleep 900ms

Type "/cycle ${profile}" Enter
Sleep 1400ms

# settle on a clean, stable frame (oneliner footer shows model+thinking)
Sleep 800ms
EOF
}

for p in "${profiles[@]}"; do
  tape="$TAPES_DIR/${p}.tape"
  mk_tape "$p" "$tape"

  (cd "$WORK" && vhs -o "captures/${p}.mp4" "$tape" >/dev/null)

  # Grab a stable frame from near the end.
  ffmpeg -y -sseof -0.15 -i "$CAP_DIR/${p}.mp4" -frames:v 1 "$STILLS_DIR/${p}.png" >/dev/null 2>&1

done

# Stitch stills into a short looping GIF.
# The final file in the concat list must be repeated (ffmpeg concat demuxer requirement).
CONCAT="$WORK/concat.txt"
: > "$CONCAT"
for p in "${profiles[@]}"; do
  echo "file '$STILLS_DIR/${p}.png'" >> "$CONCAT"
  echo "duration 0.70" >> "$CONCAT"
done
# repeat last frame
last="${profiles[-1]}"
echo "file '$STILLS_DIR/${last}.png'" >> "$CONCAT"

ffmpeg -y -f concat -safe 0 -i "$CONCAT" \
  -vf "fps=15,scale=1200:-2:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=256[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5" \
  "$REPO_DIR/demo.gif" >/dev/null 2>&1

echo "wrote: $REPO_DIR/demo.gif"
echo "workdir: $WORK"
