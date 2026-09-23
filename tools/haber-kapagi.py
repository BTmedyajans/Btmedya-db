#!/usr/bin/env python3
"""BTMEDYA haber kapagi uretir (1200x675), mevcut 27 kapagin tasarim diliyle.

D1'deki uc guncel haberin cover_url alani doluydu ama dosyalar yoktu;
makale sayfasinda kirik gorsel cikiyordu. Bu betik eksik kapaklari ayni
gorsel dille uretir: koyu zemin, ustte camgobegi kategori etiketi ve ince
cizgi, solda iri iki satir baslik, altinda kucuk alt metin, en altta
BT MEDYA imzasi.

Tipografi sitenin kendi fontlari: Space Grotesk (baslik), Manrope (metin).
"""
import os, random
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

W, H = 1200, 675
BG = (7, 12, 18)
INK = (255, 255, 255)
CYAN = (53, 214, 255)
GRI = (139, 152, 168)
KEN = 48

FONT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fontlar")
SG = os.path.join(FONT_DIR, "space-grotesk-tam.ttf")
MR = os.path.join(FONT_DIR, "manrope-tam.ttf")

def f_sg(b): return ImageFont.truetype(SG, b)
def f_mr(b): return ImageFont.truetype(MR, b)


def parlama(im, tohum):
    """Sag ust kadranda yumusak camgobegi isik. Mevcut kapaklarin zemininde
    bu var; duz siyah zemin onlarin yaninda sonuk duruyor."""
    r = random.Random(tohum + 100)
    kat = Image.new("RGB", (W, H), (0, 0, 0))
    kd = ImageDraw.Draw(kat)
    cx, cy = r.randint(int(W * 0.62), int(W * 0.84)), r.randint(int(H * 0.18), int(H * 0.52))
    for i in range(26, 0, -1):
        yc = i * 26
        t = int(52 * (i / 26) ** 2)
        kd.ellipse([cx - yc, cy - yc, cx + yc, cy + yc], fill=(4, t // 3, t))
    kat = kat.filter(ImageFilter.GaussianBlur(70))
    return Image.blend(im, Image.blend(im, kat, 0.0), 0.0) if False else ImageChops.add(im, kat)


def arkaplan(d, tohum):
    """Soyut camgobegi geometri. Her kapak farkli gorunsun diye tohumlanir;
    render tekrar edilebilir olsun diye rastgelelik sabit tohumla baslar."""
    r = random.Random(tohum)
    # Ince izgara.
    for x in range(0, W, 60):
        d.line([(x, 0), (x, H)], fill=(20, 32, 44), width=1)
    for y in range(0, H, 60):
        d.line([(0, y), (W, y)], fill=(18, 28, 40), width=1)
    # Sag tarafta degisken yogunlukta yatay cizgi kumesi.
    for i in range(34):
        y = r.randint(40, H - 40)
        x1 = r.randint(int(W * 0.52), int(W * 0.74))
        x2 = x1 + r.randint(60, 380)
        ton = r.randint(30, 150)
        d.line([(x1, y), (min(x2, W - 30), y)], fill=(18, ton, min(255, ton + 90)), width=r.choice([2, 3, 4]))
    # Birkac soluk blok.
    for i in range(5):
        x = r.randint(int(W * 0.58), W - 120)
        y = r.randint(60, H - 140)
        w = r.randint(40, 110); h = r.randint(30, 80)
        d.rectangle([x, y, x + w, y + h], fill=(12, 40 + r.randint(0, 40), 60 + r.randint(0, 50)))


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


def kapak(kategori, baslik, altmetin, cikti, tohum=0):
    im = Image.new("RGB", (W, H), BG)
    im = parlama(im, tohum)
    d = ImageDraw.Draw(im)
    arkaplan(d, tohum)

    # Ust serit: kategori etiketi + ince cizgi + kose parantezi.
    kf = f_mr(17)
    kt = kategori.upper()
    ARA = 2.2  # harf araligi: mevcut kapaklarda etiket genis harfli
    kw = sum(d.textlength(c, font=kf) + ARA for c in kt) - ARA
    d.rectangle([KEN, 30, KEN + kw + 32, 63], fill=CYAN)
    cx = KEN + 16
    for c in kt:
        d.text((cx, 38), c, font=kf, fill=(4, 18, 26))
        cx += d.textlength(c, font=kf) + ARA
    d.line([(KEN + kw + 46, 46), (W - 150, 46)], fill=CYAN, width=2)
    d.line([(W - 150, 46), (W - 150, 92)], fill=(20, 120, 160), width=2)
    d.line([(W - 150, 46), (W - 60, 46)], fill=(20, 120, 160), width=2)

    # Baslik: en fazla iki satir, sigmazsa punto kucultulur.
    punto = 132
    while punto > 64:
        bf = f_sg(punto)
        satirlar = sar(d, baslik, bf, W * 0.52)
        if len(satirlar) <= 2:
            break
        punto -= 6
    bf = f_sg(punto)
    satirlar = sar(d, baslik, bf, W * 0.52)[:2]
    y = 452 - len(satirlar) * int(punto * 0.98)
    for s in satirlar:
        d.text((KEN, y), s, font=bf, fill=INK)
        y += int(punto * 0.98)

    # Alt blok: dikey camgobegi aksan + alt metin + imza.
    ust = y + 20
    d.text((KEN + 18, ust), altmetin, font=f_mr(21), fill=GRI)
    imf = f_sg(25)
    d.text((KEN + 18, H - 78), "BT", font=imf, fill=INK)
    bw = d.textlength("BT", font=imf)
    d.text((KEN + 18 + bw + 10, H - 78), "MEDYA", font=f_mr(23), fill=(150, 165, 180))
    d.line([(KEN, ust + 2), (KEN, H - 50)], fill=(30, 120, 155), width=2)

    im.save(cikti, "WEBP", quality=88, method=6)
    return os.path.getsize(cikti)


if __name__ == "__main__":
    hedef = "public/assets/haber-kapak"
    isler = [
        ("Gündem · Yangın", "Yangın kontrol altında", "Karesi Kocaavşar",
         "karesi-kocaavsar-orman-yangini-kontrol-altina-alindi", 11),
        ("Yerel · Altyapı", "Altyapı yenilendi", "Edremit Altınkum",
         "edremit-altinkum-kanalizasyon-altyapi-yatirimi", 23),
        ("Gündem · Asayiş", "Asayiş raporu", "7-13 Eylül 2026",
         "balikesir-emniyet-7-13-eylul-2026-faaliyetleri", 37),
    ]
    for kat, bas, alt, slug, tohum in isler:
        p = f"{hedef}/{slug}.webp"
        boyut = kapak(kat, bas, alt, p, tohum)
        print(f"  {slug[:46]:48} {boyut/1024:>5.0f} KB")
