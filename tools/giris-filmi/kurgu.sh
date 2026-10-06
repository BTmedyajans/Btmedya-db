#!/usr/bin/env bash
# BTMEDYA ana sayfa giriş filmi kurgusu (6 Ekim, sesli ve yüksek kalite sürüm)
#
# Neden yeniden: ilk sürüm karakter planlarını hero-story.mp4'ten alıyordu.
# O dosya kaydırmaya bağlanmak için CRF 28 ve 5 karede bir anahtar kareyle
# sıkıştırılmıştı, film de üstüne bir kez daha sıkıştırıldı (çift kayıp).
# Bu betik karakter planını doğrudan kaynaktan (showreel-action.mp4) tek
# geçişte kodlar. Görüntüye üretken bir işlem (süper çözünürlük, yüz
# onarımı) uygulanmaz: yalnız ölçekleme, kırpma, hafif keskinlik ve global
# renk. Yüz yapısı ve oranları kaynakla aynı kalır.
#
# Kaynaklar
#   CÖL_D  kullanıcı yüklemesi VID-20260906-WA0022 (848x486, çöl, yatay)
#   CÖL_Y  kullanıcı yüklemesi VID-20260906-WA0024 (486x848, çöl, dikey)
#   CÖL_S  kullanıcı yüklemesi VID-20260906-WA0011 (472x850, çöl, dikey)
#   public/assets/media/web/showreel-action.mp4 (640x1148, karakter)
#   Yüklemeler depoda değil; yolları ortam değişkeniyle verilir.
#
# Kurgu (iki sürümde aynı zamanlama; ses izi ortak)
#   0.00  çöl planı 1 (2,6 sn) -> 2.25'te 0,35 sn geçiş -> çöl planı 2
#   4.00  0,45 sn karartma -> karakter planı (8,4 sn)
#   12.42 son kare 1,2 sn durur: patlamanın sesi söner, seçenekler bu karede tamamlanır
#
# Ses: tools/giris-filmi/ses-tasarimi.py (sentez, lisanslı müzik yok),
#      -16 LUFS, gerçek tepe -1,5 dBTP.
#
# Çalıştır:
#   COL_D=... COL_Y=... COL_S=... FFMPEG=ffmpeg PY=python3 tools/giris-filmi/kurgu.sh <cikti_klasoru>
set -euo pipefail
cd "$(cd "$(dirname "$0")/../.." && pwd)"
FF=${FFMPEG:-ffmpeg}
PY=${PY:-python3}
OUT=${1:?cikti klasoru}
mkdir -p "$OUT"
SRC=public/assets/media/web/showreel-action.mp4
HERO=tools/hero
PANY="$(python3 "$HERO/pany.py" "$(cat "$HERO/keyframes.json")")"
# hero-story ile aynı marka derecelendirmesi (filmin görünümü değişmesin).
GRADE="eq=contrast=1.09:saturation=1.04:gamma=0.97,colorbalance=rs=-0.05:gs=-0.02:bs=0.11:rm=0.02:gm=0.00:bm=0.02:rh=0.07:gh=0.03:bh=-0.04,vignette=angle=PI/4.2"
SON="tpad=stop_mode=clone:stop_duration=1.2"
SURE=13.62

echo "▸ ses"
$PY tools/giris-filmi/ses-tasarimi.py "$OUT/ses-ham.wav" $SURE
OLC=$($FF -hide_banner -i "$OUT/ses-ham.wav" -af "acompressor=threshold=-26dB:ratio=3:attack=8:release=180,loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p')
oku(){ printf '%s' "$OLC" | sed -n "s/.*\"$1\" : \"\([^\"]*\)\".*/\1/p"; }
$FF -v error -y -i "$OUT/ses-ham.wav" -af "acompressor=threshold=-26dB:ratio=3:attack=8:release=180,loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=$(oku input_i):measured_TP=$(oku input_tp):measured_LRA=$(oku input_lra):measured_thresh=$(oku input_thresh):offset=$(oku target_offset):linear=true,aresample=48000" "$OUT/ses.wav"

echo "▸ masaüstü 1152x648"
V="scale=1152:-2:flags=lanczos,crop=1152:648,fps=24,setsar=1,format=yuv420p"
$FF -v error -y \
  -ss 1.0 -t 2.6 -i "$COL_D" -ss 8.0 -t 2.2 -i "$COL_D" -ss 0.40 -t 8.4 -i "$SRC" -i "$OUT/ses.wav" \
  -filter_complex "[0:v]$V[a];[1:v]$V[b];[2:v]fps=24,scale=1152:2066:flags=lanczos,crop=1152:648:0:'(${PANY})*0.9',unsharp=5:5:0.45:5:5:0.0,${GRADE},setsar=1,format=yuv420p[c];[a][b]xfade=transition=fade:duration=0.35:offset=2.25[ab];[ab][c]xfade=transition=fadeblack:duration=0.45:offset=4.0,$SON[v]" \
  -map "[v]" -map 3:a -c:v libx264 -preset slower -crf 19 -maxrate 4000k -bufsize 8000k -profile:v high -pix_fmt yuv420p \
  -c:a aac -b:a 160k -t $SURE -movflags +faststart "$OUT/giris-ai-genis.mp4"

echo "▸ mobil 648x1152 (kaynak genişliğine yakın; 576'ya küçültülmez)"
M="scale=648:1152:force_original_aspect_ratio=increase:flags=lanczos,crop=648:1152,fps=24,setsar=1,format=yuv420p"
$FF -v error -y \
  -t 2.6 -i "$COL_Y" -t 2.2 -i "$COL_S" -ss 0.40 -t 8.4 -i "$SRC" -i "$OUT/ses.wav" \
  -filter_complex "[0:v]$M[a];[1:v]$M[b];[2:v]fps=24,crop=640:1138:0:5,scale=648:1152:flags=lanczos,unsharp=5:5:0.40:5:5:0.0,${GRADE},setsar=1,format=yuv420p[c];[a][b]xfade=transition=fade:duration=0.35:offset=2.25[ab];[ab][c]xfade=transition=fadeblack:duration=0.45:offset=4.0,$SON[v]" \
  -map "[v]" -map 3:a -c:v libx264 -preset slower -crf 23 -maxrate 2600k -bufsize 5200k -profile:v high -pix_fmt yuv420p \
  -c:a aac -b:a 128k -t $SURE -movflags +faststart "$OUT/giris-ai.mp4"

echo "▸ WebM yedekleri (H.264 çözemeyen tarayıcılar)"
for f in giris-ai-genis giris-ai; do
  $FF -v error -y -i "$OUT/$f.mp4" -c:v libvpx-vp9 -b:v 0 -crf 32 -row-mt 1 -deadline good -cpu-used 2 -c:a libopus -b:a 112k "$OUT/$f.webm"
done

echo "▸ posterler (ilk kare: film başlamadan görünen kare)"
$FF -v error -y -i "$OUT/giris-ai-genis.mp4" -frames:v 1 -q:v 4 "$OUT/giris-ai-genis-poster.jpg"
$FF -v error -y -i "$OUT/giris-ai.mp4" -frames:v 1 -q:v 4 "$OUT/giris-ai-poster.jpg"
ls -la "$OUT"
