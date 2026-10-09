#!/usr/bin/env bash
# BTMEDYA ana sayfa giriş filmi v4 (7 Ekim, kullanıcı isteği): tamamen AI
# üretimi planlar, Full HD (masaüstü 1920x1080, telefon 1080x1920),
# yazısız, okura teknoloji hissi veren sentez sesle.
#
# Kaynaklar (kullanıcı yüklemeleri; depoda değil, yollar ortamdan verilir):
#   STUDYO  6968ee10-...mp4   1920x1080, AI üretimi (altın devre, patlama, stüdyo)
#   KIRMIZI 8d33842d-...mp4   828x1108,  AI üretimi (sosyal medya, kırmızı set)
#   PANEL   8c24f5f5-...mp4   1280x720,  AI üretimi (fütüristik stüdyo, panele
#                             dokunur, sonda kameraya döner)
# Haber odası planı (848x486) Full HD'de bulanık kaldığı için kullanılmadı.
#
# Yazısız: PANEL planındaki "BTMEDYA" tabelası ve panel yazıları buzlu cam
# gibi bulanıklaştırılır. Kırmızı plan masaüstünde dikey olduğu belli
# olmasın diye kenar sütunlarından uzatılmış tek tip kırmızı sete oturur
# (bulanık kopya dolgu yok). Üretken işlem yok: yalnız kırpma, ölçek,
# bölgesel bulanıklık; yüz bölgesine dokunulmaz.
#
# 8 Ekim (kullanıcı isteği): üstüne kimlik kartları biner (giris-katman.py):
# Gazeteci, Yapay zekâ, Sunucu, Sosyal medya uzmanı, Dijital yapımcı.
#
# Kurgu (24 fps): 0.00 stüdyo (5,9) | 5.60 kırmızı (3,2) | 8.50 panel (5,21)
#   | 13.71-15.00 son kare durur (seçenekler bu karede açılır).
set -euo pipefail
cd "$(cd "$(dirname "$0")/../.." && pwd)"
FF=${FFMPEG:-ffmpeg}
PY=${PY:-python3}
OUT=${1:?cikti klasoru}
mkdir -p "$OUT"
SURE=15.0
# Geçişler dijital: piksel dağılarak bir plandan ötekine geçer.
GECIS="[a][b]xfade=transition=pixelize:duration=0.4:offset=5.6[ab];[ab][c]xfade=transition=pixelize:duration=0.4:offset=8.5[v0];[v0]tpad=stop_mode=clone:stop_duration=1.4,fade=t=in:st=0:d=0.5,trim=duration=$SURE,setpts=PTS-STARTPTS[v1];[v1][4:v]overlay=0:0:format=auto,format=yuv420p[v]"
GIRDI=(-ss 2.0 -t 5.9 -i "$STUDYO" -ss 0.4 -t 3.2 -i "$KIRMIZI" -t 5.21 -i "$PANEL" -i "$OUT/ses.wav")
ORT="fps=24,setsar=1,format=yuv420p"

echo "▸ ses"
$PY tools/giris-filmi/giris-v4-ses.py "$OUT/ses-ham.wav"
$FF -v error -y -i "$OUT/ses-ham.wav" -af "acompressor=threshold=-24dB:ratio=3:attack=8:release=180,loudnorm=I=-16:TP=-1.5:LRA=11" -ar 48000 "$OUT/ses.wav"

# Panel planı (1280x720 koordinatı): tabela + üç panel yazısı buzlu cama döner.
BUZ="split=5[t0][t1][t2][t3][t4];\
[t1]crop=430:150:160:36,gblur=sigma=18[k1];[t2]crop=195:82:185:196,gblur=sigma=14[k2];\
[t3]crop=200:82:185:318,gblur=sigma=14[k3];[t4]crop=195:82:185:438,gblur=sigma=14[k4];\
[t0][k1]overlay=160:36[u1];[u1][k2]overlay=185:196[u2];[u2][k3]overlay=185:318[u3];[u3][k4]overlay=185:438"

# Kırmızı set: plan 806x1080; iki yan, planın kendi kenar sütunlarından
# uzatılır (ışık değişimini izler), plan kenarı 48 px yumuşak geçişle oturur.
KIRMIZI_GENIS="scale=-2:1080:flags=lanczos,split=3[km][kl][kr];\
[kl]crop=6:1080:0:0,scale=600:1080,gblur=sigma=24[kls];\
[kr]crop=6:1080:iw-6:0,scale=600:1080,gblur=sigma=24[krs];\
[km]format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='255*clip(min(X,W-1-X)/48,0,1)'[kmf];\
color=c=black:s=1920x1080:r=24:d=3.2[kz];[kz][kls]overlay=0:0:shortest=1[k1];[k1][krs]overlay=1320:0[k2];[k2][kmf]overlay=(W-w)/2:0"

echo "▸ kimlik kartları (motion katmanı)"
$PY tools/giris-filmi/giris-katman.py "$OUT/katman-genis" genis
$PY tools/giris-filmi/giris-katman.py "$OUT/katman-dikey" dikey

echo "▸ masaüstü 1920x1080"
$FF -v error -y "${GIRDI[@]}" -framerate 24 -i "$OUT/katman-genis/%04d.png" -filter_complex "\
[0:v]scale=1920:1080:flags=lanczos,$ORT[a];\
[1:v]$KIRMIZI_GENIS,$ORT[b];\
[2:v]$BUZ,scale=1920:1080:flags=lanczos,unsharp=5:5:0.3:5:5:0,$ORT[c];\
$GECIS" -map "[v]" -map 3:a -c:v libx264 -preset slower -crf 20 -maxrate 5000k -bufsize 10000k -profile:v high -pix_fmt yuv420p -c:a aac -b:a 160k -t $SURE -movflags +faststart "$OUT/btmedya-ai-film-genis.mp4"

echo "▸ telefon 1080x1920"
$FF -v error -y "${GIRDI[@]}" -framerate 24 -i "$OUT/katman-dikey/%04d.png" -filter_complex "\
[0:v]crop=608:1080:656:0,scale=1080:1920:flags=lanczos,$ORT[a];\
[1:v]crop=623:1108:102:0,scale=1080:1920:flags=lanczos,$ORT[b];\
[2:v]$BUZ,crop=405:720:480:0,scale=1080:1920:flags=lanczos,unsharp=5:5:0.3:5:5:0,$ORT[c];\
$GECIS" -map "[v]" -map 3:a -c:v libx264 -preset slower -crf 22 -maxrate 3500k -bufsize 7000k -profile:v high -pix_fmt yuv420p -c:a aac -b:a 128k -t $SURE -movflags +faststart "$OUT/btmedya-ai-film.mp4"

echo "▸ WebM yedekleri ve posterler"
# Yalnız -crf ile WebM, MP4'ten büyük çıkıyordu; hedef bit hızı sınırlanır.
for f in btmedya-ai-film-genis:3200k:4200k btmedya-ai-film:2400k:3200k; do
  IFS=: read -r f br mr <<< "$f"
  $FF -v error -y -i "$OUT/$f.mp4" -c:v libvpx-vp9 -b:v $br -maxrate $mr -crf 33 -row-mt 1 -deadline good -cpu-used 2 -c:a libopus -b:a 112k "$OUT/$f.webm"
  $FF -v error -y -ss 0.8 -i "$OUT/$f.mp4" -frames:v 1 -q:v 3 "$OUT/$f-poster.jpg"
done
ls -la "$OUT"
