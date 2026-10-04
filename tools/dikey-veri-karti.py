#!/usr/bin/env python3
"""Veri haberleri icin dikey (1080x1920) sosyal medya karuseli uretir.

NEDEN AYRI BIR ARAC
Haber kapagi (1200x675) yatay ve basliga dayali; TikTok/Reels akisinda
kucuk kalir ve haberin asil degeri olan rakami gostermez. Veri haberinde
izleyiciyi durduran sey rakamin kendisidir, bu yuzden karusel ilk karede
tek bir iri rakamla acar, ikinci karede karsilastirmayi, ucuncude baglami
ve yontem uyarisini verir.

EDITORYAL KURAL
Karttaki her rakam tanim dosyasindan gelir ve tanim dosyasi haberin
kaynagindaki rakamlarla birebir ayni olmak zorundadir. Arac hicbir
rakami hesaplamaz, yuvarlamaz ya da tahmin etmez.

GUVENLI ALAN
TikTok arayuzu ust ~150 px'i, alt ~380 px'i (aciklama metni) ve sag
~130 px'i (begeni/yorum dugmeleri) kapatir. Okunmasi gereken her sey
bu alanlarin disinda kalir; yalnizca zemin ve kunye bandi tasar.

Kullanim:
  python3 tools/dikey-veri-karti.py tools/sosyal-kartlar/<slug>.json
Cikti: public/assets/sosyal/<slug>-1.jpg, -2.jpg, -3.jpg
"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1080, 1920
SOL, SAG = 80, 950            # sag kenar begeni dugmelerinin solunda biter
UST, ALT = 170, 1520          # alt sinir aciklama metninin ustunde biter

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_DIR = os.path.join(KOK, "tools", "fontlar")
SG = os.path.join(FONT_DIR, "space-grotesk-tam.ttf")
MR = os.path.join(FONT_DIR, "manrope-tam.ttf")
AMBLEM = os.path.join(KOK, "public", "assets", "btmedya-emblem-derived.png")

INK = (255, 255, 255)
GRI = (168, 180, 196)
SOLUK = (92, 108, 128)
KIRMIZI = (255, 64, 56)       # src/news-page.js ve haber kapagi ile ayni aksan
CUBUK = (54, 74, 98)


def sg(b, kalin=700):
    f = ImageFont.truetype(SG, b)
    try:
        f.set_variation_by_axes([kalin])
    except Exception:
        pass
    return f


def mr(b, kalin=500):
    f = ImageFont.truetype(MR, b)
    try:
        f.set_variation_by_axes([kalin])
    except Exception:
        pass
    return f


def zemin():
    """Koyu lacivert degrade + sag ustte hafif isik; rakam on planda kalsin diye sade."""
    im = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(im)
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)], fill=(int(12 - 6 * t), int(22 - 12 * t), int(36 - 20 * t)))
    isik = Image.new("RGB", (W, H), (0, 0, 0))
    idr = ImageDraw.Draw(isik)
    for i in range(22, 0, -1):
        r = i * 34
        v = int(40 * (i / 22) ** 2)
        idr.ellipse([int(W * .82) - r, 260 - r, int(W * .82) + r, 260 + r], fill=(v // 2, v // 5, v // 6))
    isik = isik.filter(ImageFilter.GaussianBlur(120))
    return Image.merge("RGB", [Image.blend(a, b, .5) for a, b in zip(im.split(), isik.split())]).point(
        lambda v: min(255, int(v * 1.9)))


def sar(d, metin, font, genislik):
    satirlar, satir = [], ""
    for k in metin.split():
        deneme = (satir + " " + k).strip()
        if d.textlength(deneme, font=font) <= genislik:
            satir = deneme
        else:
            satirlar.append(satir)
            satir = k
    if satir:
        satirlar.append(satir)
    return satirlar


def paragraf(d, x, y, metin, font, dolgu, genislik, ara=1.28):
    for s in sar(d, metin, font, genislik):
        d.text((x, y), s, font=font, fill=dolgu)
        y += int(font.size * ara)
    return y


def etiket(d, x, y, metin, zemin_rengi=KIRMIZI, font=None):
    font = font or sg(30, 600)
    w = d.textlength(metin, font=font)
    d.rectangle([x, y, x + w + 40, y + 56], fill=zemin_rengi)
    d.text((x + 20, y + 10), metin, font=font, fill=INK)
    return x + w + 40


def iskelet(tanim, sira, toplam):
    im = zemin()
    d = ImageDraw.Draw(im)
    # Ust kunye: amblem + kategori; ust 150 px arayuz altinda kalsa da marka okunur kalsin diye UST'e yakin.
    amb = Image.open(AMBLEM).convert("RGBA")
    amb = amb.resize((93, 60), Image.LANCZOS)
    im.paste(amb, (SOL, UST), amb)
    d.text((SOL + 110, UST + 8), "BTMEDYA", font=sg(40, 700), fill=INK)
    etiket(d, SOL, UST + 96, tanim["kategori"])
    sayac = f"{sira}/{toplam}"
    d.text((SAG - d.textlength(sayac, font=mr(30, 600)), UST + 14), sayac, font=mr(30, 600), fill=GRI)
    # Alt: kaynak satiri (guvenli alanin icinde) + tam genislik kunye bandi (tasabilir, yalnizca marka).
    y = ALT - 96
    d.line([(SOL, y), (SAG, y)], fill=(40, 56, 76), width=2)
    paragraf(d, SOL, y + 22, "Kaynak: " + tanim["kaynak"], mr(27, 500), GRI, SAG - SOL)
    d.rectangle([0, H - 64, W, H], fill=KIRMIZI)
    d.text((SOL, H - 50), tanim["kunye"], font=sg(28, 600), fill=INK)
    return im, d


def kart_rakam(tanim, k, sira, toplam):
    im, d = iskelet(tanim, sira, toplam)
    y = UST + 250
    y = paragraf(d, SOL, y, k["ust"], mr(44, 600), GRI, SAG - SOL)
    y += 10
    d.text((SOL - 8, y), k["rakam"], font=sg(300, 700), fill=INK)
    y += 330
    y = paragraf(d, SOL, y, k["aciklama"], sg(52, 600), INK, SAG - SOL, 1.2) + 50
    for yazi, deger in k["kutular"]:
        d.rounded_rectangle([SOL, y, SAG, y + 150], radius=18, fill=(20, 34, 52), outline=(44, 62, 86), width=2)
        d.text((SOL + 32, y + 26), yazi, font=mr(32, 600), fill=GRI)
        d.text((SOL + 32, y + 72), deger, font=sg(50, 700), fill=INK)
        y += 176
    if k.get("devam"):
        # Yazi tiplerinde ok isareti yok; kutu glifi cikmasin diye ok cizilir.
        f = mr(34, 700)
        d.text((SOL, y + 10), k["devam"], font=f, fill=KIRMIZI)
        x = SOL + d.textlength(k["devam"], font=f) + 18
        d.polygon([(x, y + 20), (x + 22, y + 34), (x, y + 48)], fill=KIRMIZI)
    return im


def kart_cubuk(tanim, k, sira, toplam):
    im, d = iskelet(tanim, sira, toplam)
    y = UST + 250
    y = paragraf(d, SOL, y, k["baslik"], sg(72, 700), INK, SAG - SOL, 1.12) + 12
    y = paragraf(d, SOL, y, k["alt"], mr(32, 500), GRI, SAG - SOL) + 44
    en_buyuk = max(v for _, v, _ in k["satirlar"] if v is not None)
    ad_gen = 250
    cubuk_gen = SAG - SOL - ad_gen - 150
    for ad, deger, vurgu in k["satirlar"]:
        if deger is None:
            # Siralamadaki atlanan ulkeler: bosluk dogrudan gosterilir, gizlenmez.
            d.text((SOL + ad_gen, y + 4), ad, font=mr(30, 600), fill=SOLUK)
            y += 70
            continue
        renk = KIRMIZI if vurgu else CUBUK
        d.text((SOL, y + 10), ad, font=mr(38, 800 if vurgu else 600), fill=INK if vurgu else GRI)
        uzun = max(6, int(cubuk_gen * deger / en_buyuk))
        d.rounded_rectangle([SOL + ad_gen, y + 6, SOL + ad_gen + uzun, y + 62], radius=8, fill=renk)
        yazi = "%" + f"{deger:.1f}".replace(".", ",")
        d.text((SOL + ad_gen + uzun + 18, y + 10), yazi, font=sg(40, 700), fill=INK)
        y += 92
    return im


def kart_baglam(tanim, k, sira, toplam):
    im, d = iskelet(tanim, sira, toplam)
    y = UST + 250
    y = paragraf(d, SOL, y, k["baslik"], sg(72, 700), INK, SAG - SOL, 1.12) + 40
    yarim = (SAG - SOL - 30) // 2
    for i, (ad, deger, vurgu) in enumerate(k["ikili"]):
        x = SOL + i * (yarim + 30)
        d.rounded_rectangle([x, y, x + yarim, y + 250], radius=20,
                            fill=(20, 34, 52), outline=KIRMIZI if vurgu else (44, 62, 86), width=3)
        d.text((x + 30, y + 30), ad, font=mr(32, 700), fill=GRI)
        d.text((x + 26, y + 88), deger, font=sg(110, 700), fill=INK)
    y += 290
    y = paragraf(d, SOL, y, k["fark"], sg(44, 600), INK, SAG - SOL, 1.2) + 50
    son = paragraf(d, SOL + 36, y + 4, k["yontem"], mr(31, 500), GRI, SAG - SOL - 40, 1.32)
    d.rectangle([SOL, y, SOL + 8, son], fill=KIRMIZI)
    d.text((SOL, son + 50), k["cagri"], font=sg(40, 700), fill=KIRMIZI)
    return im


TURLER = {"rakam": kart_rakam, "cubuk": kart_cubuk, "baglam": kart_baglam}


def main(yol):
    tanim = json.load(open(yol, encoding="utf-8"))
    hedef = os.path.join(KOK, "public", "assets", "sosyal")
    os.makedirs(hedef, exist_ok=True)
    kartlar = tanim["kartlar"]
    for i, k in enumerate(kartlar, 1):
        im = TURLER[k["tur"]](tanim, k, i, len(kartlar))
        cikti = os.path.join(hedef, f"{tanim['slug']}-{i}.jpg")
        im.save(cikti, "JPEG", quality=90, optimize=True, progressive=True)
        print(cikti)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
