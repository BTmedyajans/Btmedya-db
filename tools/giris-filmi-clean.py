#!/usr/bin/env python3
"""BTMEDYA clean hero builder.

Produces the homepage opening film from real archive source clips with:
- no burned-in text
- no logo
- one scene per primary service direction
- a short frozen final frame for each scene so the web UI can place the
  category name exactly when the character pauses
- desktop and tall-mobile variants

The category typography is intentionally rendered by the website, not burned
into the video, so layout can adapt cleanly to mobile and desktop.
"""
from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "tools" / "giris-kaynak"
OUT = ROOT / "public" / "assets" / "media" / "web"
FFMPEG = os.environ.get("FFMPEG") or shutil.which("ffmpeg") or "ffmpeg"

FREEZE = 0.82
FPS = 30
SCENES = [
    ("saha-gece.mp4", 1.6, 4.2),
    ("studyo-program.mp4", 0.0, 5.0),
    ("defile.mp4", 0.0, 4.6),
]

def run(*args: str) -> None:
    subprocess.run([FFMPEG, "-hide_banner", "-loglevel", "error", "-y", *args], check=True)

def render_variant(width: int, height: int, stem: str, tmp: Path, mobile: bool = False) -> None:
    parts: list[Path] = []
    for i, (name, start, duration) in enumerate(SCENES, 1):
        src = SRC / name
        if not src.is_file():
            raise FileNotFoundError(src)
        part = tmp / f"{stem}-{i:02d}.mp4"
        total = duration + FREEZE
        if mobile:
            vf = (
                f"split[main][blur];"
                f"[blur]scale={width}:{height}:force_original_aspect_ratio=increase,"
                f"crop={width}:{height},boxblur=18:4,"
                f"eq=brightness=-0.10:contrast=1.05:saturation=0.72[bg];"
                f"[main]scale={width}:{height}:force_original_aspect_ratio=decrease,"
                f"format=rgba[fg];"
                f"[bg][fg]overlay=(W-w)/2:(H-h)/2:format=auto,"
                f"fps={FPS},format=yuv420p,"
                f"eq=brightness=0.02:contrast=1.04:saturation=1.04,"
                f"tpad=stop_mode=clone:stop_duration={FREEZE}"
            )
        else:
            vf = (
                f"scale={width}:{height}:force_original_aspect_ratio=increase,"
                f"crop={width}:{height},fps={FPS},format=yuv420p,"
                f"eq=brightness=0.02:contrast=1.04:saturation=1.04,"
                f"tpad=stop_mode=clone:stop_duration={FREEZE}"
            )
        af = (
            f"aresample=48000,"
            f"apad,"
            f"atrim=duration={total:.2f},"
            f"asetpts=N/SR/TB"
        )
        run(
            "-ss", f"{start:.2f}",
            "-t", f"{duration:.2f}",
            "-i", str(src),
            "-vf", vf,
            "-af", af,
            "-map", "0:v:0",
            "-map", "0:a:0?",
            "-c:v", "libx264",
            "-crf", "20",
            "-preset", "medium",
            "-profile:v", "high",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "160k",
            "-ar", "48000",
            "-t", f"{total:.2f}",
            "-movflags", "+faststart",
            str(part),
        )
        parts.append(part)

    manifest = tmp / f"{stem}-concat.txt"
    manifest.write_text("".join(f"file '{p.as_posix()}'\n" for p in parts), encoding="utf-8")
    out = OUT / f"{stem}.mp4"
    run(
        "-f", "concat",
        "-safe", "0",
        "-i", str(manifest),
        "-c", "copy",
        "-movflags", "+faststart",
        str(out),
    )
    poster = OUT / f"{stem}-poster.jpg"
    run(
        "-ss", "1.2",
        "-i", str(out),
        "-frames:v", "1",
        "-q:v", "2",
        str(poster),
    )

def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="btmedya-clean-hero-") as td:
        tmp = Path(td)
        render_variant(1920, 1080, "giris-filmi-clean-genis", tmp)
        render_variant(1080, 2340, "giris-filmi-clean", tmp, mobile=True)
    print("BTMEDYA clean hero generated.")
    print(f"Scene total: {sum(d for _, _, d in SCENES) + FREEZE * len(SCENES):.2f}s")

if __name__ == "__main__":
    main()
