#!/usr/bin/env python3
"""BTMEDYA haber kapagi uretir (1200x675), ulusal haber sitesi standardinda.

TASARIM GEREKCESI
Onceki kapaklar soyut teknoloji grafigiydi (izgara, veri cizgileri). Bir
haber sitesinde kapak haberin kendisini tasimali. Ulusal haber sitelerinin
ortak dili:

  - tam kare fotograf, altta okunurluk icin koyu degrade
  - sol ustte kirmizi kategori etiketi
  - sol altta iri beyaz baslik
  - basligin altinda ince kirmizi cizgi + kaynak/tarih satiri
  - sag ustte yayinci imzasi
  - video haberlerde oynat rozeti

Fotograf verilmezse ayni duzen korunur, fotografin yerini derin editoryal
degrade alir. Boylece fotografli ve fotografsiz kapaklar ayni aileden
gorunur.

FOTOGRAF KURALI
Kapak fotografi yalnizca BTMEDYA'nin kendi karesinden gelir. Arsiv
haberlerinin videolari baska bir yayincinin kanalinda ve kucuk resimleri
o yayincinin bandini tasiyor; bu kareler kapak yapilmaz. Haber kendi
kanalimiza tasindiginda plandaki "foto" alani doldurulur.

Kullanim:
  python3 tools/haber-kapagi.py            plandaki tum kapaklari uretir
  python3 tools/haber-kapagi.py <slug>...  yalnizca verilenleri uretir
"""
import json, math, os, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1200, 675
KEN = 56
INK = (255, 255, 255)
KIRMIZI = (255, 64, 56)        # editoryal aksan; src/news-page.js ile ayni
GRI = (168, 180, 194)

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fontlar")
SG = os.path.join(FONT_DIR, "space-grotesk-tam.ttf")
MR = os.path.join(FONT_DIR, "manrope-tam.ttf")

def f_sg(b): return ImageFont.truetype(SG, b)
def f_mr(b): return ImageFont.truetype(MR, b)


def zemin(foto_yolu=None):
    """Fotograf varsa tam kareye kirpar; yoksa derin editoryal degrade."""
    if foto_yolu and os.path.exists(foto_yolu):
        im = Image.open(foto_yolu).convert("RGB")
        oran = max(W / im.width, H / im.height)
        im = im.resize((math.ceil(im.width * oran), math.ceil(im.height * oran)), Image.LANCZOS)
        sol = (im.width - W) // 2
        # Roportaj karelerinde yuz genelde ust yarida; ustten kirp.
        ust = max(0, min((im.height - H) // 2, int(im.height * 0.12)))
        return im.crop((sol, ust, sol + W, ust + H))

    im = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(im)
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)], fill=(int(14 - 9 * t), int(25 - 16 * t), int(37 - 24 * t)))
    # Marka bagini koruyan soluk camgobegi isik, sag ust kadran.
    isik = Image.new("RGB", (W, H), (0, 0, 0))
    idr = ImageDraw.Draw(isik)
    cx, cy = int(W * 0.76), int(H * 0.26)
    for i in range(26, 0, -1):
        r = i * 26
        v = int(34 * (i / 26) ** 2)
        idr.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(2, v // 3, v))
    isik = isik.filter(ImageFilter.GaussianBlur(90))
    return Image.merge("RGB", [
        Image.blend(a, b, 0.65) for a, b in zip(im.split(), isik.split())
    ]).point(lambda v: min(255, int(v * 1.7)))


def perde(im, guc=1.0):
    """Alt degrade: baslik her zaman okunur kalsin."""
    maske = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(maske)
    for y in range(H):
        t = y / H
        a = 0.12 + 0.88 * max(0.0, (t - 0.30) / 0.70) ** 1.4
        d.line([(0, y), (W, y)], fill=int(min(255, 255 * a * guc)))
    return Image.composite(Image.new("RGB", (W, H), (4, 7, 11)), im, maske)


def sar(d, metin, font, genislik):
    satir, akt = [], ""
    for k in metin.split():
        dene = (akt + " " + k).strip()
        if d.textlength(dene, font=font) <= genislik:
            akt = dene
        else:
            if akt: satir.append(akt)
            akt = k
    if akt: satir.append(akt)
    return satir


def aralikli(d, xy, metin, font, dolgu, ara):
    """Harf aralikli metin: PIL'de dogrudan desteklenmiyor."""
    x, y = xy
    for c in metin:
        d.text((x, y), c, font=font, fill=dolgu)
        x += d.textlength(c, font=font) + ara


def olcu_aralikli(d, metin, font, ara):
    return sum(d.textlength(c, font=font) + ara for c in metin) - ara


def kapak(baslik, kategori, altbilgi, cikti, foto=None, video=False):
    im = perde(zemin(foto), 1.0 if foto else 0.80)
    d = ImageDraw.Draw(im)

    # Kirmizi kategori etiketi, sol ust.
    kf = f_mr(18)
    kt = kategori.upper()
    ARA = 2.4
    kw = olcu_aralikli(d, kt, kf, ARA)
    d.rectangle([KEN, 44, KEN + kw + 36, 82], fill=KIRMIZI)
    aralikli(d, (KEN + 18, 52), kt, kf, INK, ARA)

    # Yayinci imzasi, sag ust.
    imf = f_sg(26)
    d.text((W - KEN - d.textlength("BTMEDYA", font=imf), 50), "BTMEDYA", font=imf, fill=INK)

    # Video rozeti.
    if video:
        r, cx, cy = 46, W // 2, int(H * 0.42)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=INK, width=3)
        d.polygon([(cx - 13, cy - 21), (cx - 13, cy + 21), (cx + 22, cy)], fill=INK)

    # Baslik, sol alt. Uc satira kadar; sigmazsa punto kucultulur.
    punto = 82
    while punto > 42:
        bf = f_sg(punto)
        if len(sar(d, baslik, bf, W - 2 * KEN - 30)) <= 3:
            break
        punto -= 4
    bf = f_sg(punto)
    satirlar = sar(d, baslik, bf, W - 2 * KEN - 30)[:3]

    sat_y = int(punto * 1.07)
    y = H - KEN - 92 - len(satirlar) * sat_y + 10
    for s in satirlar:
        d.text((KEN, y), s, font=bf, fill=INK)
        y += sat_y

    # Ince kirmizi cizgi + kaynak/tarih.
    y += 20
    d.rectangle([KEN, y, KEN + 64, y + 4], fill=KIRMIZI)
    d.text((KEN, y + 20), altbilgi, font=f_mr(21), fill=GRI)

    os.makedirs(os.path.dirname(cikti), exist_ok=True)
    im.save(cikti, "WEBP", quality=88, method=6)
    return os.path.getsize(cikti)


def plan():
    p = os.path.join(KOK, "public", "data", "haber-kapak-plani.json")
    with open(p, encoding="utf-8") as f:
        return json.load(f)


if __name__ == "__main__":
    istenen = set(sys.argv[1:])
    hedef = os.path.join(KOK, "public", "assets", "haber-kapak")
    n = fotolu = 0
    for h in plan():
        if istenen and h["slug"] not in istenen:
            continue
        foto = os.path.join(KOK, h["foto"]) if h.get("foto") else None
        boyut = kapak(h["baslik"], h["kategori"], h["altbilgi"],
                      os.path.join(hedef, h["slug"] + ".webp"),
                      foto=foto, video=h.get("video", False))
        n += 1
        if foto: fotolu += 1
        print(f"  {'F' if foto else ' '} {h['slug'][:44]:46} {boyut/1024:>5.0f} KB")
    print(f"\n  {n} kapak uretildi ({fotolu} fotografli, {n-fotolu} editoryal).")
