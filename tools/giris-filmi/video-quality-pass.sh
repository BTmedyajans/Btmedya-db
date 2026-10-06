#!/usr/bin/env bash
# BTMEDYA Hero Video Quality Pass V1
# Mevcut giriş filmlerini 1080p/1080x1920 hedefe yeniden kodlar;
# hızlı bağlantıda HQ sürüm, düşük bantta mevcut standart sürüm kullanılır.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
FF="${FFMPEG:-ffmpeg}"
mkdir -p public/assets/media/web
need(){ test -s "$1" || { echo "Eksik medya: $1" >&2; exit 1; }; }
need public/assets/media/web/giris-filmi-genis.mp4
need public/assets/media/web/giris-filmi.mp4

echo "▸ desktop REAL 1920x1080 H.264"
"$FF" -hide_banner -loglevel error -y -i public/assets/media/web/giris-filmi-genis.mp4 \
  -vf "scale=1920:1080:flags=lanczos,unsharp=5:5:0.24:5:5:0.0,eq=contrast=1.015:saturation=1.015,setsar=1" \
  -c:v libx264 -preset slow -crf 18 -maxrate 9500k -bufsize 19000k -profile:v high -level 4.2 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -movflags +faststart \
  public/assets/media/web/giris-filmi-genis-hq.mp4

echo "▸ mobile REAL 1080x1920 H.264"
"$FF" -hide_banner -loglevel error -y -i public/assets/media/web/giris-filmi.mp4 \
  -vf "scale=1080:1920:flags=lanczos,unsharp=5:5:0.22:5:5:0.0,eq=contrast=1.015:saturation=1.015,setsar=1" \
  -c:v libx264 -preset slow -crf 18 -maxrate 8000k -bufsize 16000k -profile:v high -level 4.2 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -movflags +faststart \
  public/assets/media/web/giris-filmi-hq.mp4

echo "▸ REAL WebM"
"$FF" -hide_banner -loglevel error -y -i public/assets/media/web/giris-filmi-genis-hq.mp4 -c:v libvpx-vp9 -b:v 0 -crf 28 -row-mt 1 -deadline good -cpu-used 2 -c:a libopus -b:a 128k public/assets/media/web/giris-filmi-genis-hq.webm
"$FF" -hide_banner -loglevel error -y -i public/assets/media/web/giris-filmi-hq.mp4 -c:v libvpx-vp9 -b:v 0 -crf 28 -row-mt 1 -deadline good -cpu-used 2 -c:a libopus -b:a 128k public/assets/media/web/giris-filmi-hq.webm

echo "▸ REAL posters"
"$FF" -hide_banner -loglevel error -y -i public/assets/media/web/giris-filmi-genis-hq.mp4 -frames:v 1 -q:v 2 public/assets/media/web/giris-filmi-genis-hq-poster.jpg
"$FF" -hide_banner -loglevel error -y -i public/assets/media/web/giris-filmi-hq.mp4 -frames:v 1 -q:v 2 public/assets/media/web/giris-filmi-hq-poster.jpg

echo "▸ desktop 1920x1080 H.264"
"$FF" -hide_banner -loglevel error -y -i public/assets/media/web/giris-ai-genis.mp4 \
  -vf "scale=1920:1080:flags=lanczos,unsharp=5:5:0.28:5:5:0.0,eq=contrast=1.02:saturation=1.02,setsar=1" \
  -c:v libx264 -preset slow -crf 17 -maxrate 9000k -bufsize 18000k -profile:v high -level 4.2 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -movflags +faststart \
  public/assets/media/web/giris-ai-genis-hq.mp4
echo "▸ mobile 1080x1920 H.264"
"$FF" -hide_banner -loglevel error -y -i public/assets/media/web/giris-ai.mp4 \
  -vf "scale=1080:1920:flags=lanczos,unsharp=5:5:0.26:5:5:0.0,eq=contrast=1.02:saturation=1.02,setsar=1" \
  -c:v libx264 -preset slow -crf 17 -maxrate 7500k -bufsize 15000k -profile:v high -level 4.2 -pix_fmt yuv420p \
  -c:a aac -b:a 160k -movflags +faststart \
  public/assets/media/web/giris-ai-mobile-hq.mp4
echo "▸ desktop WebM VP9"
"$FF" -hide_banner -loglevel error -y -i public/assets/media/web/giris-ai-genis-hq.mp4 \
  -c:v libvpx-vp9 -b:v 0 -crf 27 -row-mt 1 -deadline good -cpu-used 2 \
  -c:a libopus -b:a 128k \
  public/assets/media/web/giris-ai-genis-hq.webm
echo "▸ mobile WebM VP9"
"$FF" -hide_banner -loglevel error -y -i public/assets/media/web/giris-ai-mobile-hq.mp4 \
  -c:v libvpx-vp9 -b:v 0 -crf 27 -row-mt 1 -deadline good -cpu-used 2 \
  -c:a libopus -b:a 128k \
  public/assets/media/web/giris-ai-mobile-hq.webm
echo "▸ high-quality posters"
"$FF" -hide_banner -loglevel error -y -i public/assets/media/web/giris-ai-genis-hq.mp4 -frames:v 1 -q:v 2 public/assets/media/web/giris-ai-genis-hq-poster.jpg
"$FF" -hide_banner -loglevel error -y -i public/assets/media/web/giris-ai-mobile-hq.mp4 -frames:v 1 -q:v 2 public/assets/media/web/giris-ai-hq-poster.jpg
ls -lh public/assets/media/web/giris-ai*-hq.*
