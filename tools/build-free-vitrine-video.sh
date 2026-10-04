#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

OUT="public/assets/generated"
mkdir -p "$OUT"

FONT="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
test -f "$FONT"

declare -a IMAGES=(
  "public/assets/media/portfoy/buse-tuncay-saha-roportaj.webp"
  "public/assets/media/portfoy/buse-tuncay-kamera-arkasi.webp"
  "public/assets/media/kurumsal/btmedya-marka-kapak.webp"
  "public/assets/media/ai-lab/ai-portre-studyo.webp"
  "public/assets/media/portfoy/buse-tuncay-portre-siyah-beyaz.webp"
)

declare -a LABELS=(
  "GERCEK CEKIM / SAHA HABER"
  "GERCEK CEKIM / PRODÜKSIYON"
  "GERCEK CEKIM / BTMEDYA"
  "AI LAB / AI ÜRETIMI"
  "GERCEK CEKIM / PORTFÖY"
)

for f in "${IMAGES[@]}"; do
  test -s "$f"
done

build() {
  local W="$1"
  local H="$2"
  local NAME="$3"
  local FILTER=""
  local INPUTS=()
  local i

  for i in "${!IMAGES[@]}"; do
    INPUTS+=(-loop 1 -t 2.6 -i "${IMAGES[$i]}")
  done

  FILTER="[0:v]scale=$W:$H:force_original_aspect_ratio=increase,crop=$W:$H,zoompan=z='min(zoom+0.0007,1.07)':d=78:s=${W}x${H}:fps=30,setsar=1,drawtext=fontfile=$FONT:text='${LABELS[0]}':x=56:y=${H}-110:fontsize=${W}/48:fontcolor=white:box=1:boxcolor=black@0.48:boxborderw=18,fade=t=in:st=0:d=0.35,fade=t=out:st=2.15:d=0.35[v0];"
  for i in 1 2 3 4; do
    FILTER+="[$i:v]scale=$W:$H:force_original_aspect_ratio=increase,crop=$W:$H,zoompan=z='min(zoom+0.0007,1.07)':d=78:s=${W}x${H}:fps=30,setsar=1,drawtext=fontfile=$FONT:text='${LABELS[$i]}':x=56:y=${H}-110:fontsize=${W}/48:fontcolor=white:box=1:boxcolor=black@0.48:boxborderw=18,fade=t=in:st=0:d=0.35,fade=t=out:st=2.15:d=0.35[v$i];"
  done
  FILTER+="[v0][v1][v2][v3][v4]concat=n=5:v=1:a=0,format=yuv420p[v]"

  ffmpeg -hide_banner -loglevel error -y "${INPUTS[@]}" \
    -filter_complex "$FILTER" -map "[v]" -c:v libx264 -preset veryfast -crf 27 \
    -movflags +faststart -an "$OUT/$NAME"

  test -s "$OUT/$NAME"
  SIZE=$(stat -c%s "$OUT/$NAME")
  echo "$NAME -> $SIZE bytes"
}

build 1280 720 "btmedya-vitrin-16x9.mp4"
build 720 1280 "btmedya-vitrin-9x16.mp4"

ffmpeg -hide_banner -loglevel error -y -i "$OUT/btmedya-vitrin-16x9.mp4" -frames:v 1 -q:v 3 "$OUT/btmedya-vitrin-poster.jpg"
test -s "$OUT/btmedya-vitrin-poster.jpg"

echo "FREE_VITRINE_VIDEO_OK"
