#!/usr/bin/env bash
# BTMedya hero master kurgusu
#
# Kaynak : public/assets/media/web/showreel-action.mp4
#          640x1148, 30fps, 10s, SAHNE KESMESI YOK (tek cekim)
# Kurgu  : 0.40s -> 9.80s araligi, tek parca, kesmesiz.
#          Dikey kaynaktan 16:9 pencere, elle kalibre edilmis takip hareketiyle
#          (anahtar kareler keyframes.json) yukari/asagi kayarak konuyu takip eder.
# Cikti  : hero-story.mp4        1152x648  masaustu, kaydirmaya baglanabilir (yogun keyframe)
#          hero-story-mobile.mp4  576x1024 mobil, kaynak kadrajinda
#          hero-story-poster.jpg  poster
set -euo pipefail
cd "$(cd "$(dirname "$0")/../.." && pwd)"

SRC=public/assets/media/web/showreel-action.mp4
OUT=public/assets/media/web
HERE="$(cd "$(dirname "$0")" && pwd)"
IN=0.40
DUR=9.40

PANY="$(python3 "$HERE/pany.py" "$(cat "$HERE/keyframes.json")")"

# BTMedya derecelendirmesi: lacivert golgeler (#07111c), altin yuksek isiklar (#d6a84a)
GRADE="eq=contrast=1.09:saturation=1.04:gamma=0.97,\
colorbalance=rs=-0.05:gs=-0.02:bs=0.11:rm=0.02:gm=0.00:bm=0.02:rh=0.07:gh=0.03:bh=-0.04,\
vignette=angle=PI/4.2"

echo "▸ masaustu masteri 1152x648"
ffmpeg -v error -stats -ss $IN -t $DUR -i "$SRC" \
  -vf "fps=24,scale=1152:2066:flags=lanczos,crop=1152:648:0:'(${PANY})*0.9',unsharp=5:5:0.45:5:5:0.0,${GRADE},format=yuv420p" \
  -an -c:v libx264 -preset veryslow -crf 28 -g 5 -keyint_min 5 -sc_threshold 0 \
  -profile:v high -level 4.0 -movflags +faststart "$OUT/hero-story.mp4" -y

echo "▸ mobil masteri 576x1024"
ffmpeg -v error -stats -ss $IN -t $DUR -i "$SRC" \
  -vf "fps=24,crop=640:1138:0:5,scale=576:1024:flags=lanczos,unsharp=5:5:0.40:5:5:0.0,${GRADE},format=yuv420p" \
  -an -c:v libx264 -preset veryslow -crf 30 -g 12 -keyint_min 12 -sc_threshold 0 \
  -profile:v high -level 4.0 -movflags +faststart "$OUT/hero-story-mobile.mp4" -y

echo "▸ poster"
ffmpeg -v error -ss 4.20 -i "$SRC" -frames:v 1 \
  -vf "scale=1152:2066:flags=lanczos,crop=1152:648:0:297,unsharp=5:5:0.45:5:5:0.0,${GRADE}" \
  -q:v 6 "$OUT/hero-story-poster.jpg" -y

echo; ls -la "$OUT"/hero-story*
for f in "$OUT"/hero-story.mp4 "$OUT"/hero-story-mobile.mp4; do
  echo "$f -> $(ffprobe -v error -select_streams v:0 -show_entries stream=width,height,nb_frames,avg_frame_rate -of csv=p=0 "$f")"
done
