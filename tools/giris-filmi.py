#!/usr/bin/env python3
"""BTMEDYA giriş filmi: "Sahadan stüdyoya" (V7, 2026-10-04).

NEDEN
Eski giriş filmi (hero-story.mp4) yapay zekâ üretimiydi: zırha dönüşen kişi,
robotlar, patlama. Anasayfanın ilk karesi ajansın gerçek işini değil bir
AI gösterisini anlatıyordu. Bu film yalnız BTMEDYA arşivindeki gerçek
çekimlerden kurulur: gece saha çekimi, stüdyo program kaydı, tartışma
masası, kamera arkası, defile prodüksiyonu. Her bölüm kendi gerçek sesiyle
gelir; defile bölümündeki salon müziği telifli olabileceği için kullanılmaz,
orada stüdyo sesi sürer.

Kaynaklar tools/giris-kaynak/ altında (BTMEDYA Facebook arşivinden kesit).
Grafikler marka kitinden: Anton, Haber Kırmızısı, Manşet Sarısı.

Çıktı: public/assets/media/web/giris-filmi.mp4 (+ .webm, -poster.jpg) ve
public/data/giris-filmi.json (bölüm zamanları; mobil oynatıcı bölüm
düğmelerini buradan değil kendi listesinden kurar, bu dosya kontrol içindir).

Çalıştır: python3 tools/giris-filmi.py
"""
import json, os, subprocess, tempfile
from PIL import Image, ImageDraw, ImageFont, ImageFilter

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KAYNAK = os.path.join(KOK, "tools", "giris-kaynak")
CIKTI = os.path.join(KOK, "public", "assets", "media", "web")
FONT = os.path.join(KOK, "tools", "fontlar", "anton-regular.ttf")
MR = os.path.join(KOK, "tools", "fontlar")
LOGO = os.path.join(KOK, "public", "assets", "logo", "btmedya-logo-yatay-pozitif.png")
FF = os.environ.get("FFMPEG") or "/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2"
K = 720  # kare kenarı: kaynaklar 400-480 px, 720 üstü yalnız bulanıklık ekler
SARI, KIRMIZI = (255, 212, 0), (227, 20, 27)

# (dosya, başlangıç, süre, bölüm adı, alt satır, görüntü düzeltmesi, ses kaynağı)
# Alt satırlar yalnız karede görüneni söyler; kişilerin rolü (konuk, sunucu)
# kaynakta yazmadığı için yazılmaz.
BOLUMLER = [
    ("saha-gece.mp4", 1.6, 4.2, "SAHA", "GECE ÇEKİMİ", "eq=brightness=0.10:gamma=1.55:saturation=1.15", None),
    ("studyo-program.mp4", 0.0, 5.0, "STÜDYO", "YEŞİL PERDE ÇEKİMİ", "", None),
    ("studyo-masa.mp4", 0.0, 5.0, "STÜDYO MASASI", "SET ÇEKİMİ", "", None),
    ("kamera-arkasi.mp4", 2.2, 4.6, "KAMERA ARKASI", "STÜDYODA ÇEKİM ANI", "", None),
    ("defile.mp4", 0.0, 4.6, "PRODÜKSİYON", "DEFİLE ÇEKİMİ", "", ("kamera-arkasi.mp4", 4.0)),
]
KART = 2.6  # açılış ve kapanış kartı süresi


def f(boyut, ad="anton"):
    return ImageFont.truetype(FONT, boyut)


def mr(boyut):
    for ad in ("Manrope-Bold.ttf", "manrope-bold.ttf"):
        y = os.path.join(MR, ad)
        if os.path.exists(y):
            return ImageFont.truetype(y, boyut)
    return ImageFont.truetype(FONT, int(boyut * 0.9))


def zemin():
    im = Image.new("RGB", (K, K))
    d = ImageDraw.Draw(im)
    for y in range(K):
        t = y / K
        d.line([(0, y), (K, y)], fill=(int(5 + 5 * t), int(16 + 30 * t), int(44 + 68 * t)))
    isik = Image.new("RGB", (K, K))
    ImageDraw.Draw(isik).ellipse([-200, 260, 260, 760], fill=(150, 104, 10))
    isik = isik.filter(ImageFilter.GaussianBlur(110))
    im = Image.composite(isik, im, isik.convert("L").point(lambda v: min(255, v * 2)))
    d = ImageDraw.Draw(im)
    for y in range(14, K, 12):
        for x in range(14, K, 12):
            d.ellipse([x - 1.5, y - 1.5, x + 1.5, y + 1.5], fill=(40, 62, 118))
    return im


def logo(im, gen=170, x=None, y=28):
    lg = Image.open(LOGO).convert("RGBA")
    lg = lg.resize((gen, int(lg.height * gen / lg.width)), Image.LANCZOS)
    x = K - gen - 52 if x is None else x
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([x - 12, y - 8, x + gen + 12, y + lg.height + 8], radius=8, fill=(255, 255, 255))
    im.paste(lg, (x, y), lg)


def serit(d, x, y, metin, font, zem, yazi=(255, 255, 255)):
    b = d.textbbox((0, 0), metin, font=font)
    w, h = b[2] - b[0] + 28, b[3] - b[1] + 18
    d.polygon([(x + 12, y), (x + w + 12, y), (x + w, y + h), (x, y + h)], fill=zem)
    d.text((x + 18 - b[0], y + 9 - b[1]), metin, font=font, fill=yazi)
    return y + h


def kart(metin1, metin2, alt):
    im = zemin()
    d = ImageDraw.Draw(im)
    logo(im, 210, (K - 210) // 2, 120)
    for i, (m, renk, boy) in enumerate(((metin1, (255, 255, 255), 92), (metin2, SARI, 92))):
        fo = f(boy)
        while d.textlength(m, font=fo) > K - 80:
            fo = f(fo.size - 4)
        d.text(((K - d.textlength(m, font=fo)) / 2, 300 + i * 104), m, font=fo, fill=renk, stroke_width=3, stroke_fill=(0, 0, 0))
    fo = f(26)
    serit(d, (K - d.textlength(alt, font=fo) - 40) / 2, 560, alt, fo, KIRMIZI)
    return im


def alt_bant(baslik, alt, no, toplam):
    """Bölüm üstyazısı: sol altta kırmızı eğik şerit + sarı alt satır; sol
    üstte provenans etiketi; sağ üstte logo. Saydam PNG, video üstüne biner."""
    im = Image.new("RGBA", (K, K), (0, 0, 0, 0))
    gol = Image.new("RGBA", (K, K), (0, 0, 0, 0))
    gd = ImageDraw.Draw(gol)
    for y in range(K - 230, K):
        gd.line([(0, y), (K, y)], fill=(0, 0, 0, int(200 * ((y - (K - 230)) / 230) ** 1.4)))
    im = Image.alpha_composite(im, gol)
    d = ImageDraw.Draw(im)
    y = serit(d, 26, K - 168, baslik, f(46), KIRMIZI)
    fo = f(24)
    d.rectangle([32, y + 10, 32 + d.textlength(alt, font=fo) + 22, y + 48], fill=SARI)
    d.text((43, y + 14), alt, font=fo, fill=(10, 10, 10))
    et = "GERÇEK ÇEKİM · BTMEDYA ARŞİVİ"
    fo = f(19)
    d.rounded_rectangle([22, 24, 22 + d.textlength(et, font=fo) + 24, 58], radius=5, fill=(0, 0, 0, 190))
    d.text((34, 28), et, font=fo, fill=(255, 255, 255))
    no_m = f"{no:02d}/{toplam:02d}"
    d.text((K - 30 - d.textlength(no_m, font=f(22)), K - 44), no_m, font=f(22), fill=(255, 255, 255, 200))
    logo(im, 120, None, 24)
    return im


def calis(*a):
    subprocess.run([FF, "-v", "error", "-y", *a], check=True)


def main():
    gecici = tempfile.mkdtemp(prefix="giris-")
    parcalar, zaman, t = [], [], 0.0
    # Açılış kartı: saha bölümünün gece ortam sesi altta başlar.
    kart("SAHADAN", "STÜDYOYA", "HABER · PRODÜKSİYON · STÜDYO").save(os.path.join(gecici, "ac.png"))
    kart("BTMEDYA", "HİKÂYELERİ YAŞATIR", "BALIKESİR · BTMEDYA.COM.TR").save(os.path.join(gecici, "kapa.png"))

    def kart_klibi(png, cikti, ses=None):
        a = ["-loop", "1", "-t", str(KART), "-i", png]
        if ses:
            a += ["-ss", str(ses[1]), "-t", str(KART), "-i", os.path.join(KAYNAK, ses[0])]
        else:
            a += ["-f", "lavfi", "-t", str(KART), "-i", "anullsrc=r=48000:cl=stereo"]
        calis(*a, "-vf", f"scale={K}:{K},fps=30,format=yuv420p,fade=in:0:9,fade=out:st={KART-0.3}:d=0.3,zoompan=z='1+0.0006*on':d=1:s={K}x{K}:fps=30",
              "-af", f"aresample=48000,aformat=channel_layouts=stereo,afade=in:d=0.6,afade=out:st={KART-0.4}:d=0.4,volume=0.6",
              "-shortest", "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-c:a", "aac", "-b:a", "160k", cikti)

    ac = os.path.join(gecici, "00.mp4")
    kart_klibi(os.path.join(gecici, "ac.png"), ac, ("saha-gece.mp4", 0.0))
    parcalar.append(ac); zaman.append({"bolum": "AÇILIŞ", "bas": 0.0}); t += KART

    for i, (dosya, bas, sure, baslik, alt, duz, ses) in enumerate(BOLUMLER, 1):
        png = os.path.join(gecici, f"bant{i}.png")
        alt_bant(baslik, alt, i, len(BOLUMLER)).save(png)
        cik = os.path.join(gecici, f"{i:02d}.mp4")
        kaynak = os.path.join(KAYNAK, dosya)
        vf = (f"[0:v]crop='min(iw,ih)':'min(iw,ih)',scale={K}:{K}:flags=lanczos,"
              f"{duz + ',' if duz else ''}unsharp=5:5:0.6,fps=30,setsar=1,"
              f"fade=in:0:6,fade=out:st={sure-0.2}:d=0.2[v];"
              f"[1:v]format=rgba,fade=in:st=0.25:d=0.35:alpha=1[b];[v][b]overlay=0:0:format=auto,format=yuv420p[o]")
        a = ["-ss", str(bas), "-t", str(sure), "-i", kaynak, "-loop", "1", "-t", str(sure), "-i", png]
        if ses:
            a += ["-ss", str(ses[1]), "-t", str(sure), "-i", os.path.join(KAYNAK, ses[0])]
            amap = "2:a"
        else:
            amap = "0:a"
        calis(*a, "-filter_complex", vf, "-map", "[o]", "-map", amap,
              "-af", f"aresample=48000,aformat=channel_layouts=stereo,afade=in:d=0.25,afade=out:st={sure-0.3}:d=0.3",
              "-t", str(sure), "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-c:a", "aac", "-b:a", "160k", cik)
        parcalar.append(cik); zaman.append({"bolum": baslik, "alt": alt, "bas": round(t, 2)}); t += sure

    kapa = os.path.join(gecici, "99.mp4")
    kart_klibi(os.path.join(gecici, "kapa.png"), kapa)
    parcalar.append(kapa); zaman.append({"bolum": "KAPANIŞ", "bas": round(t, 2)}); t += KART

    liste = os.path.join(gecici, "liste.txt")
    with open(liste, "w") as fh:
        fh.write("".join(f"file '{p}'\n" for p in parcalar))
    ham = os.path.join(gecici, "ham.mp4")
    calis("-f", "concat", "-safe", "0", "-i", liste, "-c", "copy", ham)
    # Ses: bölümler farklı mikrofonlardan; tek yüksekliğe çekilir (web için -16 LUFS).
    mp4 = os.path.join(CIKTI, "giris-filmi.mp4")
    calis("-i", ham, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-c:v", "libx264", "-crf", "25", "-preset", "slow",
          "-profile:v", "high", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-c:a", "aac", "-b:a", "128k", mp4)
    calis("-i", mp4, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "36", "-row-mt", "1", "-deadline", "good", "-cpu-used", "4",
          "-c:a", "libopus", "-b:a", "96k", os.path.join(CIKTI, "giris-filmi.webm"))
    # Masaüstü sahnesi 16:9 ve object-fit:cover; kare film orada kırpılır, alt
    # bantlar kaybolurdu. Geniş sürüm: kare film ortada, yanlar aynı karenin
    # bulanık ve karartılmış büyütmesi. Panel yuvası bunu gösterir; mobil
    # oynatıcı aynı adın kare eşini (-genis olmadan) oynatır.
    genis = os.path.join(CIKTI, "giris-filmi-genis.mp4")
    calis("-i", mp4, "-filter_complex",
          "[0:v]split[a][b];[a]scale=1280:1280,crop=1280:720,boxblur=24:2,eq=brightness=-0.18:saturation=0.8[z];"
          "[z][b]overlay=(W-w)/2:0,format=yuv420p[o]", "-map", "[o]", "-map", "0:a", "-c:v", "libx264", "-crf", "25",
          "-preset", "slow", "-profile:v", "high", "-movflags", "+faststart", "-c:a", "copy", genis)
    calis("-ss", "1.2", "-i", genis, "-frames:v", "1", "-q:v", "3", os.path.join(CIKTI, "giris-filmi-genis-poster.jpg"))
    # Poster: ilk bölümün bandı göründükten sonraki kare değil, açılış kartı (marka + başlık).
    calis("-ss", "1.2", "-i", mp4, "-frames:v", "1", "-q:v", "3", os.path.join(CIKTI, "giris-filmi-poster.jpg"))
    with open(os.path.join(KOK, "public", "data", "giris-filmi.json"), "w", encoding="utf-8") as fh:
        json.dump({"dosya": "/assets/media/web/giris-filmi.mp4", "sure": round(t, 2), "etiket": "GERÇEK ÇEKİM · BTMEDYA ARŞİVİ",
                   "kaynak": "BTMEDYA Facebook arşivi (saha, stüdyo, kamera arkası, defile)", "bolumler": zaman}, fh, ensure_ascii=False, indent=1)
    print("giris-filmi.mp4", round(t, 2), "sn", os.path.getsize(mp4) // 1024, "KB")
    for z in zaman:
        print(f"  {z['bas']:5.2f}  {z['bolum']}")


if __name__ == "__main__":
    main()
