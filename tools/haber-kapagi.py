#!/usr/bin/env python3
"""BTMEDYA haber kapagi uretir (1200x675), ulusal haber sitesi standardinda.

TASARIM GEREKCESI
Kapak artik bir sunucu kapagi: sagda muhabirin kendi karesi, solda iri
baslik. Turkiye'deki ulusal haber kanallarinin paylasim karti dili budur
ve site ayni zamanda Buse Tuncay'in portfoyu oldugu icin her kapakta
muhabirin kendisi gorunur.

  - sag serit: muhabir karesi, sol kenari yumusak gecisli
  - zemin: ayni karenin bulanik ve koyulastirilmis hali (renk uyumu)
  - sol ust: kirmizi kategori etiketi
  - sol orta/alt: cok iri beyaz baslik (en fazla dort satir)
  - basligin altinda kaynak/tarih satiri
  - en altta tam genislikte kirmizi kunye bandi: muhabir + alan adi
  - video haberlerde karenin uzerinde oynat rozeti

FOTOGRAF KURALI
Kapak fotografi yalnizca BTMEDYA'nin kendi karesinden gelir. Baska bir
yayincinin bandini, filigranini yada logosunu tasiyan hicbir kare kapak
yapilmaz. Plandaki "foto" alani bos birakilirsa kapak editoryal degrade
ile uretilir; kimlik tasiyan yabanci kare asla ikame edilmez.

Kullanim:
  python3 tools/haber-kapagi.py            plandaki tum kapaklari uretir
  python3 tools/haber-kapagi.py <slug>...  yalnizca verilenleri uretir
"""
import json, math, os, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

W, H = 1200, 675
KEN = 56
INK = (255, 255, 255)
KIRMIZI = (255, 64, 56)        # editoryal aksan; src/news-page.js ile ayni
GRI = (176, 187, 200)

BANT = 58                      # alttaki kirmizi kunye bandinin yuksekligi
SERIT = 452                    # sagdaki muhabir seridinin genisligi
GECIS = 190                    # seridin sol kenarindaki yumusak gecis

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fontlar")
SG = os.path.join(FONT_DIR, "space-grotesk-tam.ttf")
MR = os.path.join(FONT_DIR, "manrope-tam.ttf")

def f_sg(b): return ImageFont.truetype(SG, b)
def f_mr(b): return ImageFont.truetype(MR, b)


def kapla(im, w, h, ust=0.30):
    """Orani bozmadan w x h kareye doldurur.

    "ust" dikey bosluk icindeki kirpma noktasidir: 0 en ust, 1 en alt. Yuz
    her karede ayni yerde degil (bazi karelerde muhabir cercevenin altinda),
    bu yuzden deger kare basina plandan geliyor."""
    oran = max(w / im.width, h / im.height)
    im = im.resize((math.ceil(im.width * oran), math.ceil(im.height * oran)), Image.LANCZOS)
    sol = (im.width - w) // 2
    bosluk = max(0, im.height - h)
    return im.crop((sol, round(bosluk * ust), sol + w, round(bosluk * ust) + h))


def editoryal_zemin():
    """Fotograf yoksa kullanilan derin editoryal degrade."""
    im = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(im)
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)], fill=(int(14 - 9 * t), int(25 - 16 * t), int(37 - 24 * t)))
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


def zemin(foto_yolu=None, ust=0.30):
    """Sunucu kapagi: bulanik zemin + sagda net muhabir seridi."""
    if not (foto_yolu and os.path.exists(foto_yolu)):
        return editoryal_zemin()

    kaynak = Image.open(foto_yolu).convert("RGB")

    # Zemin: ayni karenin bulanik, koyu ve soluk hali. Serit ile arka plan
    # ayni renk ailesinden olsun diye baska bir gorsel kullanilmiyor.
    arka = kapla(kaynak, W, H, ust).filter(ImageFilter.GaussianBlur(28))
    arka = ImageEnhance.Color(arka).enhance(0.45)
    arka = ImageEnhance.Brightness(arka).enhance(0.34)

    # Serit: net kare, hafif kontrast artisiyla one cikar.
    serit = kapla(kaynak, SERIT, H, ust)
    serit = ImageEnhance.Contrast(serit).enhance(1.07)
    serit = ImageEnhance.Brightness(serit).enhance(1.04)

    # Sol kenarda yumusak gecis: serit zemine erisin, yapistirilmis durmasin.
    maske = Image.new("L", (SERIT, H), 255)
    md = ImageDraw.Draw(maske)
    for x in range(GECIS):
        t = x / GECIS
        md.line([(x, 0), (x, H)], fill=int(255 * (t ** 1.55)))
    arka.paste(serit, (W - SERIT, 0), maske)
    return arka


def perde(im, foto):
    """Sol tarafta metin perdesi + altta bant gecisi."""
    maske = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(maske)
    sinir = int(W * 0.72) if foto else W
    for x in range(sinir):
        t = x / sinir
        d.line([(x, 0), (x, H)], fill=int(240 * (1 - t) ** 1.25))
    im = Image.composite(Image.new("RGB", (W, H), (6, 10, 15)), im, maske)

    alt = Image.new("L", (W, H), 0)
    ad = ImageDraw.Draw(alt)
    for y in range(int(H * 0.58), H):
        t = max(0.0, (y - H * 0.58) / (H * 0.42))
        ad.line([(0, y), (W, y)], fill=int(205 * t ** 1.4))
    return Image.composite(Image.new("RGB", (W, H), (5, 8, 13)), im, alt)


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


def kapak(baslik, kategori, altbilgi, cikti, foto=None, video=False, ust=0.30,
          kunye="BTMEDYA", gercek=False):
    im = perde(zemin(foto, ust), bool(foto))
    d = ImageDraw.Draw(im)

    # Baslik alani: fotograf varken serit disinda kalir.
    metin_gen = (W - SERIT + GECIS - 2 * KEN) if foto else (W - 2 * KEN - 30)

    # Kirmizi kategori etiketi, sol ust.
    kf = f_mr(19)
    kt = kategori.upper()
    ARA = 2.6
    kw = olcu_aralikli(d, kt, kf, ARA)
    d.rectangle([KEN, 44, KEN + kw + 38, 85], fill=KIRMIZI)
    aralikli(d, (KEN + 19, 53), kt, kf, INK, ARA)

    # Video rozeti: sag ust kose. Serit ortasina konunca muhabirin yuzunu
    # kapatiyordu; kosede hem her karede bos alan var hem de gorunurlugu ayni.
    if video:
        r, cx, cy = 38, W - 88, 88
        d.ellipse([cx - r - 5, cy - r - 5, cx + r + 5, cy + r + 5], fill=(8, 12, 18))
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=INK, width=4)
        d.polygon([(cx - 10, cy - 17), (cx - 10, cy + 17), (cx + 18, cy)], fill=INK)

    # Baslik: iri, en fazla dort satir. Ulusal haber kartlarinda basligin
    # kendisi gorselin yarisi kadar yer kaplar.
    punto = 100
    while punto > 48:
        bf = f_sg(punto)
        if len(sar(d, baslik, bf, metin_gen)) <= 4:
            break
        punto -= 4
    bf = f_sg(punto)
    satirlar = sar(d, baslik, bf, metin_gen)[:4]

    sat_y = int(punto * 1.04)
    y = H - BANT - 62 - len(satirlar) * sat_y
    for s in satirlar:
        d.text((KEN, y), s, font=bf, fill=INK)
        y += sat_y

    # Kaynak/tarih satiri. AGENTS.md geregi her kare AI URETIMI yada GERCEK
    # CEKIM etiketi tasir; etiket sayfa notunda degil karenin kendisinde
    # duruyor, boylece gorsel paylasildiginda da kaynagi belli oluyor.
    kaynak = f"{altbilgi} · {'GERÇEK ÇEKİM' if gercek else 'AI ÜRETİMİ'}"
    d.text((KEN, y + 14), kaynak, font=f_mr(21), fill=GRI)

    # Alt kunye bandi: muhabir solda, alan adi sagda.
    d.rectangle([0, H - BANT, W, H], fill=KIRMIZI)
    bf2 = f_mr(19)
    aralikli(d, (KEN, H - BANT + 19), "HABER: BUSE TUNCAY", bf2, INK, 2.2)
    sf = f_sg(21)
    sag = "BTMEDYA.COM.TR" if kunye == "BTMEDYA" else kunye
    d.text((W - KEN - d.textlength(sag, font=sf), H - BANT + 17), sag, font=sf, fill=INK)

    os.makedirs(os.path.dirname(cikti), exist_ok=True)
    im.save(cikti, "WEBP", quality=88, method=6)
    return os.path.getsize(cikti)


def plan():
    p = os.path.join(KOK, "public", "data", "haber-kapak-plani.json")
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def havuz():
    """Kapak karesi havuzu. Plan bir kareye adiyla atif yapar; boylece yeni
    bir kare eklemek icin kod degil yalnizca JSON duzenlenir."""
    p = os.path.join(KOK, "public", "data", "kapak-fotograflari.json")
    with open(p, encoding="utf-8") as f:
        return {k["ad"]: k for k in json.load(f)}


if __name__ == "__main__":
    istenen = set(sys.argv[1:])
    hedef = os.path.join(KOK, "public", "assets", "haber-kapak")
    n = fotolu = 0
    kareler = havuz()
    for h in plan():
        if istenen and h["slug"] not in istenen:
            continue
        kare = kareler.get(h.get("foto") or "")
        if h.get("foto") and not kare:
            raise SystemExit(f"{h['slug']}: '{h['foto']}' kapak karesi havuzda yok.")
        foto = os.path.join(KOK, kare["yol"]) if kare else None
        boyut = kapak(h["baslik"], h["kategori"], h["altbilgi"],
                      os.path.join(hedef, h["slug"] + ".webp"),
                      foto=foto, video=h.get("video", False),
                      ust=kare.get("ust", 0.30) if kare else 0.30,
                      kunye=kare.get("kunye", "BTMEDYA") if kare else "BTMEDYA",
                      gercek=bool(kare and kare.get("gercek")))
        n += 1
        if foto: fotolu += 1
        print(f"  {'F' if foto else ' '} {h['slug'][:44]:46} {boyut/1024:>5.0f} KB")
    print(f"\n  {n} kapak uretildi ({fotolu} fotografli, {n-fotolu} editoryal).")
