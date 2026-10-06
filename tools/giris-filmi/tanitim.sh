#!/usr/bin/env bash
# BTMEDYA 15 sn tanıtım filmi (6 Ekim, kullanıcı isteği): yazısız, sesli,
# tam ekran. Anlatı: gazeteci (saha) -> sosyal medya uzmanı -> stüdyo /
# prodüksiyon -> yapay zekâ ile dijital uzman.
#
# Kaynaklar (yüklemeler depoda değil; yolları ortam değişkeniyle verilir):
#   SAHA   FB_VID_4491398818540326238 (400x400, GERÇEK ÇEKİM, gece saha)
#   STUDYO_ARSIV FB_VID_5135549764812543406 (400x400, GERÇEK ÇEKİM, stüdyo)
#   KIRMIZI 8d33842d-...mp4           (828x1108, AI üretimi)
#   STUDYO 6968ee10-...mp4            (1920x1080, AI üretimi)
#   AI     20260907_033721.mp4        (1280x720, AI üretimi)
# Kaynak karelere yazı eklenmez. AI planındaki "BTMEDYA / HABER" panelleri
# kadraj dışında bırakılır. Üretken işlem yok: yalnız kırpma, ölçekleme,
# global renk. Arşiv planı 400 px olduğu için büyütüldüğünde bulanık
# görünmesin diye ortada kare çerçeve, arkada bulanık dolgu kullanılır.
#
# Kurgu (24 fps, 0,3 sn geçişler, toplam 15,0 sn):
#   0.00 saha (2,7) | 2.40 stüdyo arşivi (1,5) | 3.60 kırmızı (3,5)
#   6.80 stüdyo (4,3) | 10.80 AI (4,2)
set -euo pipefail
cd "$(cd "$(dirname "$0")/../.." && pwd)"
FF=${FFMPEG:-ffmpeg}
PY=${PY:-python3}
OUT=${1:?cikti klasoru}
mkdir -p "$OUT"
X="xfade=transition=fade:duration=0.3"
GECIS="[a][b]${X}:offset=2.4[ab];[ab][c]${X}:offset=3.6[abc];[abc][d]${X}:offset=6.8[abcd];[abcd][e]${X}:offset=10.8[v0]"
SON="[v0]fade=t=in:st=0:d=0.4,trim=duration=15,setpts=PTS-STARTPTS[v]"
GIRDI=(-ss 2.0 -t 2.7 -i "$SAHA" -ss 6.0 -t 1.5 -i "$STUDYO_ARSIV" -ss 0.4 -t 3.5 -i "$KIRMIZI" -ss 2.6 -t 4.3 -i "$STUDYO" -ss 0.6 -t 4.2 -i "$AI" -i "$OUT/ses.wav")

echo "▸ ses"
$PY tools/giris-filmi/tanitim-ses.py "$OUT/ses-ham.wav"
$FF -v error -y -i "$OUT/ses-ham.wav" -af "acompressor=threshold=-24dB:ratio=3:attack=8:release=180,loudnorm=I=-16:TP=-1.5:LRA=11" -ar 48000 "$OUT/ses.wav"

# Arşiv: kare plan ortada, arkada aynı planın bulanık, karartılmış büyütmesi.
ARSIV_M="split[o][g];[g]scale=W:H:force_original_aspect_ratio=increase,crop=W:H,boxblur=24:2,eq=brightness=-0.12[g2];[o]scale=S:S:flags=lanczos,eq=gamma=1.45:brightness=0.03:contrast=1.06:saturation=0.9,noise=alls=7:allf=t[o2];[g2][o2]overlay=(W-S)/2:(H-S)/2"
arsiv(){ local w=$1 h=$2 s=$3; echo "$ARSIV_M" | sed "s/W/$w/g; s/H/$h/g; s/S/$s/g"; }
ORT="fps=24,setsar=1,format=yuv420p"

echo "▸ masaüstü 1920x1080"
$FF -v error -y "${GIRDI[@]}" -filter_complex "\
[0:v]$(arsiv 1920 1080 1080),$ORT[a];\
[1:v]$(arsiv 1920 1080 1080),$ORT[b];\
[2:v]split[k1][k2];[k2]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,boxblur=30:2,eq=brightness=-0.15[kg];[k1]scale=-2:1080:flags=lanczos[ko];[kg][ko]overlay=(W-w)/2:0,$ORT[c];\
[3:v]scale=1920:1080:flags=lanczos,$ORT[d];\
[4:v]crop=740:416:540:0,scale=1920:1080:flags=lanczos,unsharp=5:5:0.35:5:5:0,$ORT[e];\
$GECIS;$SON" -map "[v]" -map 5:a -c:v libx264 -preset slower -crf 23 -maxrate 3800k -bufsize 7600k -profile:v high -pix_fmt yuv420p -c:a aac -b:a 160k -t 15 -movflags +faststart "$OUT/tanitim-genis.mp4"

echo "▸ mobil 720x1280"
$FF -v error -y "${GIRDI[@]}" -filter_complex "\
[0:v]$(arsiv 720 1280 720),$ORT[a];\
[1:v]$(arsiv 720 1280 720),$ORT[b];\
[2:v]crop=623:1108:102:0,scale=720:1280:flags=lanczos,$ORT[c];\
[3:v]crop=608:1080:656:0,scale=720:1280:flags=lanczos,$ORT[d];\
[4:v]crop=405:720:560:0,scale=720:1280:flags=lanczos,unsharp=5:5:0.3:5:5:0,$ORT[e];\
$GECIS;$SON" -map "[v]" -map 5:a -c:v libx264 -preset slower -crf 24 -maxrate 2000k -bufsize 4000k -profile:v high -pix_fmt yuv420p -c:a aac -b:a 128k -t 15 -movflags +faststart "$OUT/tanitim.mp4"

echo "▸ WebM yedekleri ve posterler"
for f in tanitim-genis tanitim; do
  $FF -v error -y -i "$OUT/$f.mp4" -c:v libvpx-vp9 -b:v 0 -crf 37 -row-mt 1 -deadline good -cpu-used 2 -c:a libopus -b:a 112k "$OUT/$f.webm"
  $FF -v error -y -ss 0.5 -i "$OUT/$f.mp4" -frames:v 1 -q:v 4 "$OUT/$f-poster.jpg"
done
ls -la "$OUT"
