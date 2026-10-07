#!/usr/bin/env python3
"""BTMEDYA giriş filmi: "Sahadan stüdyoya" (V8, 2026-10-07).

NEDEN
Eski giriş filmi (hero-story.mp4) yapay zekâ üretimiydi: zırha dönüşen kişi,
robotlar, patlama. Anasayfanın ilk karesi ajansın gerçek işini değil bir
AI gösterisini anlatıyordu. Bu film yalnız BTMEDYA arşivindeki gerçek
çekimlerden kurulur: gece saha çekimi, stüdyo program kaydı, tartışma
masası, kamera arkası, defile prodüksiyonu. Her bölüm kendi gerçek sesiyle
gelir; defile bölümündeki salon müziği telifli olabileceği için kullanılmaz,
orada stüdyo sesi sürer.

V8: FİLM YAYINLANDIĞI EKRANA GÖRE KURULUR
V7 tek bir 720x720 kare film üretiyordu. Ana sayfa bu kareyi telefonda tam
ekran dikey kutuya "cover" ile yerleştirince karenin yalnız ortadaki %46'sı
görünüyor, alt bant ve logo kesiliyor, 400 px'lik kaynak ekran boyuna
gerildiği için görüntü bulanıyordu. Masaüstünde ise 720 px'lik film 1920'ye
büyütülüyordu. Artık iki ayrı kurgu var:

  dikey  720x1560 (telefon, 9:19,5)  -> giris-filmi.mp4 / .webm / -poster.jpg
  genis 1920x1080 (masaüstü, 16:9)   -> giris-filmi-genis.mp4 / .webm / -poster.jpg

İkisinde de çekim karesi kırpılmadan durur; çevresi aynı karenin bulanık ve
karartılmış büyütmesidir. Yazılar (etiket, bölüm adı, logo) çekimin üstüne
değil bu boşluklara, tuvalin kendi çözünürlüğünde çizilir: büyütülmüş yazı
yoktur. Kenarlarda "cover" kırpması için güvenli pay bırakılır.

KALİTE SINIRI (dürüst not)
Kaynaklar 400-480 px (Facebook arşivi kesitleri). Hiçbir işlem olmayan
ayrıntıyı geri getirmez. Burada yalnız hafif gürültü giderme, Lanczos
ölçekleme ve hafif keskinlik var; üretken büyütme ya da yüz onarımı YOK
(kişilerin yüzü kaynakla aynı kalır). Gerçek kalite artışı için kameradan
çıkan özgün dosyalar tools/giris-kaynak/ altına konup betik yeniden
çalıştırılmalıdır; kurgu aynı kalır, netlik kaynakla birlikte artar.

Kaynaklar tools/giris-kaynak/ altında (BTMEDYA Facebook arşivinden kesit).
Grafikler marka kitinden: Anton, Haber Kırmızısı, Manşet Sarısı.

Çalıştır: python3 tools/giris-filmi.py        (FFMPEG=... ile ffmpeg yolu verilebilir)
"""
import os, shutil, subprocess, tempfile
from PIL import Image, ImageDraw, ImageFont, ImageFilter

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KAYNAK = os.path.join(KOK, "tools", "giris-kaynak")
CIKTI = os.path.join(KOK, "public", "assets", "media", "web")
FONT = os.path.join(KOK, "tools", "fontlar", "anton-regular.ttf")
LOGO = os.path.join(KOK, "public", "assets", "logo", "btmedya-logo-yatay-pozitif.png")
FF = os.environ.get("FFMPEG") or shutil.which("ffmpeg") or "ffmpeg"
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

# Bit hızı tavanı bilerek düşük: kaynak 400 px olduğu için daha yüksek bit
# hızı ayrıntı getirmez, yalnız mobil veriyi harcar.
# Her kurgu: tuval, çekim karesinin kenarı ve konumu, yazı ölçeği (720 px'lik
# kare tasarıma göre), yazıların yerleri ve kodlama ayarı.
# Güvenli pay: telefonda adres çubuğu açıkken üst-alttan ~80 px, masaüstünde
# 16:10 ekranda yanlardan ~96 px kırpılır; yazılar bu payın içinde durur.
KURGULAR = {
    "dikey": dict(ad="giris-filmi", W=720, H=1560, K=720, x0=0, y0=380, s=1.0,
                  etiket=(28, 268), logo=(532, 256, 160), bant=(28, 1136), sayac=(692, 1320),
                  x264=["-crf", "26", "-maxrate", "1700k", "-bufsize", "3400k"], vp9="37"),
    "genis": dict(ad="giris-filmi-genis", W=1920, H=1080, K=1080, x0=420, y0=0, s=1.5,
                  etiket=(124, 96), logo=(1556, 84, 240), bant=(124, 780), sayac=(1796, 950),
                  x264=["-crf", "25", "-maxrate", "3400k", "-bufsize", "6800k"], vp9="36"),
}


def f(boyut):
    return ImageFont.truetype(FONT, max(8, int(round(boyut))))


def zemin(W, H):
    """Kart zemini: lacivert degrade, sol altta sıcak ışık, ince nokta dokusu."""
    im = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(im)
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)], fill=(int(5 + 5 * t), int(16 + 30 * t), int(44 + 68 * t)))
    k = min(W, H)
    isik = Image.new("RGB", (W, H))
    ImageDraw.Draw(isik).ellipse([-0.28 * k, H - 0.64 * k, 0.36 * k, H + 0.06 * k], fill=(150, 104, 10))
    isik = isik.filter(ImageFilter.GaussianBlur(k * 0.15))
    im = Image.composite(isik, im, isik.convert("L").point(lambda v: min(255, v * 2)))
    d = ImageDraw.Draw(im)
    adim = max(12, k // 60)
    for y in range(adim, H, adim):
        for x in range(adim, W, adim):
            d.ellipse([x - 1.5, y - 1.5, x + 1.5, y + 1.5], fill=(40, 62, 118))
    return im


def logo(im, gen, x, y):
    lg = Image.open(LOGO).convert("RGBA")
    lg = lg.resize((gen, int(lg.height * gen / lg.width)), Image.LANCZOS)
    d = ImageDraw.Draw(im)
    p = max(8, gen // 14)
    d.rounded_rectangle([x - p, y - p * 0.7, x + gen + p, y + lg.height + p * 0.7], radius=p * 0.7, fill=(255, 255, 255))
    im.paste(lg, (x, y), lg)


def serit(d, x, y, metin, font, zem, yazi=(255, 255, 255)):
    b = d.textbbox((0, 0), metin, font=font)
    ic = font.size * 0.3
    w, h = b[2] - b[0] + ic * 2, b[3] - b[1] + ic * 1.3
    d.polygon([(x + ic * 0.85, y), (x + w + ic * 0.85, y), (x + w, y + h), (x, y + h)], fill=zem)
    d.text((x + ic * 1.3 - b[0], y + ic * 0.65 - b[1]), metin, font=font, fill=yazi)
    return y + h


def kart(k, metin1, metin2, alt):
    """Açılış/kapanış kartı: tuvalin tamamı, yazılar ortada ve güvenli payın içinde."""
    W, H, s = k["W"], k["H"], k["s"]
    im = zemin(W, H)
    d = ImageDraw.Draw(im)
    enfazla = min(W, k["K"]) - 180 * s  # yan kırpma payı
    lg = int(210 * s)
    ust = H / 2 - 240 * s
    logo(im, lg, (W - lg) // 2, int(ust))
    for i, (m, renk) in enumerate(((metin1, (255, 255, 255)), (metin2, SARI))):
        fo = f(92 * s)
        while d.textlength(m, font=fo) > enfazla:
            fo = f(fo.size - 4)
        d.text(((W - d.textlength(m, font=fo)) / 2, ust + (180 + i * 104) * s), m, font=fo, fill=renk,
               stroke_width=int(3 * s), stroke_fill=(0, 0, 0))
    fo = f(26 * s)
    serit(d, (W - d.textlength(alt, font=fo) - fo.size * 0.9) / 2, ust + 440 * s, alt, fo, KIRMIZI)
    return im


def ustyazi(k, baslik, alt, no, toplam):
    """Bölüm üstyazısı, saydam PNG: provenans etiketi, logo, bölüm şeridi,
    sayaç. Hepsi çekim karesinin dışındaki boşlukta durur ve tuvalin kendi
    çözünürlüğünde çizilir."""
    W, H, s = k["W"], k["H"], k["s"]
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    x, y = k["bant"]
    y2 = serit(d, x, y, baslik, f(52 * s if k["W"] > k["H"] else 64), KIRMIZI)
    fo = f(26 * s if k["W"] > k["H"] else 30)
    d.rectangle([x + 6, y2 + 12, x + 6 + d.textlength(alt, font=fo) + fo.size * 0.9, y2 + 12 + fo.size * 1.55], fill=SARI)
    d.text((x + 6 + fo.size * 0.45, y2 + 12 + fo.size * 0.2), alt, font=fo, fill=(10, 10, 10))
    et = "GERÇEK ÇEKİM · BTMEDYA ARŞİVİ"
    fo = f(21 * s if k["W"] > k["H"] else 24)
    ex, ey = k["etiket"]
    d.rounded_rectangle([ex, ey, ex + d.textlength(et, font=fo) + fo.size * 1.2, ey + fo.size * 1.75], radius=6, fill=(0, 0, 0, 200))
    d.text((ex + fo.size * 0.6, ey + fo.size * 0.28), et, font=fo, fill=(255, 255, 255))
    no_m = f"{no:02d}/{toplam:02d}"
    fo = f(24 * s if k["W"] > k["H"] else 28)
    sx, sy = k["sayac"]
    d.text((sx - d.textlength(no_m, font=fo), sy), no_m, font=fo, fill=(255, 255, 255, 215))
    lx, ly, lg = k["logo"]
    logo(im, lg, lx, ly)
    return im


def calis(*a):
    subprocess.run([FF, "-v", "error", "-y", *a], check=True)


def uret(k):
    W, H, K, x0, y0 = k["W"], k["H"], k["K"], k["x0"], k["y0"]
    gecici = tempfile.mkdtemp(prefix="giris-")
    parcalar, t = [], 0.0
    kart(k, "SAHADAN", "STÜDYOYA", "HABER · PRODÜKSİYON · STÜDYO").save(os.path.join(gecici, "ac.png"))
    kart(k, "BTMEDYA", "HİKÂYELERİ YAŞATIR", "BALIKESİR · BTMEDYA.COM.TR").save(os.path.join(gecici, "kapa.png"))
    kod = ["-c:v", "libx264", "-crf", "16", "-preset", "medium", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k"]

    def kart_klibi(png, cikti, ses=None):
        # Açılış kartı: saha bölümünün gece ortam sesi altta başlar.
        a = ["-loop", "1", "-t", str(KART), "-i", png]
        if ses:
            a += ["-ss", str(ses[1]), "-t", str(KART), "-i", os.path.join(KAYNAK, ses[0])]
        else:
            a += ["-f", "lavfi", "-t", str(KART), "-i", "anullsrc=r=48000:cl=stereo"]
        calis(*a, "-vf", f"fps=30,format=yuv420p,fade=in:0:9,fade=out:st={KART-0.3}:d=0.3",
              "-af", f"aresample=48000,aformat=channel_layouts=stereo,afade=in:d=0.6,afade=out:st={KART-0.4}:d=0.4,volume=0.6",
              "-shortest", *kod, cikti)

    ac = os.path.join(gecici, "00.mp4")
    kart_klibi(os.path.join(gecici, "ac.png"), ac, ("saha-gece.mp4", 0.0))
    parcalar.append(ac); t += KART

    for i, (dosya, bas, sure, baslik, alt, duz, ses) in enumerate(BOLUMLER, 1):
        png = os.path.join(gecici, f"bant{i}.png")
        ustyazi(k, baslik, alt, i, len(BOLUMLER)).save(png)
        cik = os.path.join(gecici, f"{i:02d}.mp4")
        d = (duz + ",") if duz else ""
        # Zemin: aynı karenin küçük kopyası bulanıklaştırılıp tuvale yayılır
        # (küçükte bulanıklık hem ucuz hem pürüzsüz). Çekim: hafif gürültü
        # giderme (Facebook sıkıştırma karıncalanması), Lanczos, hafif keskinlik.
        vf = (f"[0:v]crop='min(iw,ih)':'min(iw,ih)',{d}fps=30,setsar=1,split[a][b];"
              f"[a]scale={W//4}:{H//4}:force_original_aspect_ratio=increase,crop={W//4}:{H//4},boxblur=10:2,"
              f"scale={W}:{H}:flags=bicubic,eq=brightness=-0.20:saturation=0.75[z];"
              f"[b]hqdn3d=1.2:1.2:3:3,scale={K}:{K}:flags=lanczos,unsharp=5:5:0.45:5:5:0.0[c];"
              f"[z][c]overlay={x0}:{y0},fade=in:0:6,fade=out:st={sure-0.2}:d=0.2[v];"
              f"[1:v]format=rgba,fade=in:st=0.25:d=0.35:alpha=1[u];[v][u]overlay=0:0:format=auto,format=yuv420p[o]")
        a = ["-ss", str(bas), "-t", str(sure), "-i", os.path.join(KAYNAK, dosya), "-loop", "1", "-t", str(sure), "-i", png]
        amap = "0:a"
        if ses:
            a += ["-ss", str(ses[1]), "-t", str(sure), "-i", os.path.join(KAYNAK, ses[0])]
            amap = "2:a"
        calis(*a, "-filter_complex", vf, "-map", "[o]", "-map", amap,
              "-af", f"aresample=48000,aformat=channel_layouts=stereo,afade=in:d=0.25,afade=out:st={sure-0.3}:d=0.3",
              "-t", str(sure), *kod, cik)
        parcalar.append(cik); t += sure

    kapa = os.path.join(gecici, "99.mp4")
    kart_klibi(os.path.join(gecici, "kapa.png"), kapa)
    parcalar.append(kapa); t += KART

    liste = os.path.join(gecici, "liste.txt")
    with open(liste, "w") as fh:
        fh.write("".join(f"file '{p}'\n" for p in parcalar))
    ham = os.path.join(gecici, "ham.mp4")
    calis("-f", "concat", "-safe", "0", "-i", liste, "-c", "copy", ham)
    # Ses: bölümler farklı mikrofonlardan; tek yüksekliğe çekilir (web için -16 LUFS).
    # Görüntü ara dosyadan (CRF 16) tek kez son ayara kodlanır.
    mp4 = os.path.join(CIKTI, k["ad"] + ".mp4")
    calis("-i", ham, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "48000", "-c:v", "libx264", *k["x264"], "-preset", "slow",
          "-profile:v", "high", "-pix_fmt", "yuv420p", "-g", "60", "-movflags", "+faststart", "-c:a", "aac", "-b:a", "128k", mp4)
    # H.264 çözemeyen tarayıcılar için aynı kurgunun VP9 kopyası.
    calis("-i", mp4, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", k["vp9"], "-row-mt", "1", "-deadline", "good", "-cpu-used", "3",
          "-c:a", "libopus", "-b:a", "96k", os.path.join(CIKTI, k["ad"] + ".webm"))
    # Poster: film başlamadan görünen kare, açılış kartı (marka + başlık).
    calis("-ss", "1.2", "-i", mp4, "-frames:v", "1", "-q:v", "3", os.path.join(CIKTI, k["ad"] + "-poster.jpg"))
    shutil.rmtree(gecici, ignore_errors=True)
    print(f"{k['ad']}.mp4  {W}x{H}  {t:.2f} sn  {os.path.getsize(mp4) // 1024} KB")


if __name__ == "__main__":
    for k in KURGULAR.values():
        uret(k)
