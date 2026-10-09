#!/usr/bin/env python3
"""BTMEDYA giriş filmi motion katmanı (8 Ekim, kullanıcı isteği).

İstek: "videoyu zenginleştir, hareketlere küçük notlar ekle; benim ekran
yüzü olarak gazeteci, sunucu vb. kimliklerine büründüğüm motion dinamik
giriş". Film planları AI üretimidir (giris-v4.sh); bu betik üstüne binen
şeffaf kimlik kartlarını kare kare PNG olarak üretir.

Her kart: ince vurgu çizgisi uzar -> üst satır (kicker) şifre çözülür gibi
harf harf oturur -> başlık maskeden yukarı kayarak açılır -> küçük not
belirir -> kart yukarı süzülüp söner. Kartlar planlarla senkrondur;
seçenekler (film-secim.js) 11,4 sn'de geldiği için kartlar 11,0'da biter.
Notlar yalnız sitenin gerçekten sunduğu işleri söyler (uydurma iddia yok).
Rastgelelik sabit tohumludur: her çalıştırma aynı kareleri verir.

Çalıştır: python3 tools/giris-filmi/giris-katman.py <cikti_klasoru> <genis|dikey>
Gerekli: Pillow, fontTools (+brotli, woff2 okumak için).
"""
import functools
import io
import os
import random
import sys

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from PIL import Image, ImageDraw, ImageFilter, ImageFont

KOK = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FONTLAR = os.path.join(KOK, "public", "assets", "fonts")
FPS = 24
SURE = 15.0

# Soft marka paleti (tools/logo/logo-uret.py ve film-secim.css ile uyumlu).
FILDISI = (244, 239, 230)
VURGU = (166, 217, 234)
GOLGE = (6, 12, 20)

KARTLAR = [
    # (başlangıç, bitiş, kicker, başlık, not)
    (0.45, 2.05, "BUSE TUNCAY · BTMEDYA", "GAZETECİ", "Sahadan, kaynağıyla haber"),
    (2.25, 3.65, "AI LAB", "YAPAY ZEKÂ", "Açık etiketli AI üretim"),
    (3.85, 5.45, "STÜDYO", "SUNUCU", "Röportaj · program · stüdyo çekimi"),
    (5.95, 8.35, "SOSYAL MEDYA", "SOSYAL MEDYA UZMANI", "Reels · içerik planı · hesap yönetimi"),
    (8.85, 11.0, "TANITIM · AI PRODÜKSİYON", "DİJİTAL YAPIMCI", "Tanıtım filmi · reklam · web"),
]


@functools.lru_cache(maxsize=None)
def yazi_tipi(aile, agirlik, boy):
    """Manrope / JetBrains Mono woff2 alt kümelerini (latin + latin-ext)
    istenen ağırlıkta TTF'e çevirir; Türkçe harfler latin-ext'tedir."""
    sonuc = []
    for alt in ("latin", "latin-ext"):
        f = TTFont(os.path.join(FONTLAR, f"{aile}-{alt}.woff2"))
        if "fvar" in f:
            f = instantiateVariableFont(f, {"wght": agirlik}, inplace=False)
        f.flavor = None
        b = io.BytesIO()
        f.save(b)
        b.seek(0)
        sonuc.append((ImageFont.truetype(b, boy), set(f.getBestCmap())))
    return sonuc


def harf_fontu(fontlar, c):
    for font, cmap in fontlar:
        if ord(c) in cmap:
            return font
    return fontlar[0][0]


def yaz(ciz, x, y, metin, fontlar, renk, aralik=0.0):
    """Harf harf yazar (alt kümeler arasında font seçer); genişliği döner."""
    bas = x
    for c in metin:
        f = harf_fontu(fontlar, c)
        ciz.text((x, y), c, font=f, fill=renk)
        x += f.getlength(c) + aralik
    return x - bas


def genislik(metin, fontlar, aralik=0.0):
    return sum(harf_fontu(fontlar, c).getlength(c) + aralik for c in metin)


def yumusak(x):
    x = min(max(x, 0.0), 1.0)
    return 1 - (1 - x) ** 4


def main():
    cikti, mod = sys.argv[1], sys.argv[2]
    os.makedirs(cikti, exist_ok=True)
    if mod == "genis":
        W, H, s, x0, taban = 1920, 1080, 1.0, 96, 930
    else:
        W, H, s, x0, taban = 1080, 1920, 1.25, 72, 1640
    kicker_f = yazi_tipi("jetbrains-mono", 600, int(21 * s))
    baslik_boy = int(78 * s)
    not_f = yazi_tipi("manrope", 500, int(25 * s))
    azami = W - 2 * x0
    rnd = random.Random(20261008)
    karakterler = "ABCDEFGHJKLMNPRSTUVYZ0123456789#/<>*"

    for n in range(int(SURE * FPS)):
        t = n / FPS
        im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        for bas, bit, kicker, baslik, notu in KARTLAR:
            if not (bas <= t < bit + 0.4):
                continue
            yerel = t - bas
            cikis = yumusak((t - bit) / 0.35) if t > bit else 0.0
            alfa = 1.0 - cikis
            dy = -int(28 * s * cikis)
            # Başlık genişliğe sığmazsa küçülür (telefonda uzun unvanlar).
            boy = baslik_boy
            bf = yazi_tipi("manrope", 800, boy)
            while genislik(baslik, bf, -0.01 * boy) > azami and boy > 30:
                boy -= 4
                bf = yazi_tipi("manrope", 800, boy)
            y_baslik = taban - boy
            y_kicker = y_baslik - int(42 * s)
            y_not = taban + int(16 * s)

            # Okunurluk için kartın arkasına yumuşak, düşük opaklıkta gölge.
            golge = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            gc = ImageDraw.Draw(golge)
            gen = max(genislik(baslik, bf, -0.01 * boy), genislik(notu, not_f)) + 80 * s
            gc.rounded_rectangle((x0 - 36 * s, y_kicker - 30 * s + dy, x0 + gen, y_not + 54 * s + dy), radius=int(22 * s), fill=GOLGE + (int(92 * alfa * yumusak(yerel / 0.3)),))
            golge = golge.filter(ImageFilter.GaussianBlur(int(28 * s)))
            im.alpha_composite(golge)

            katman = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            c = ImageDraw.Draw(katman)
            # 1) Vurgu çizgisi uzar.
            uz = int(64 * s * yumusak(yerel / 0.28))
            if uz > 0:
                c.rectangle((x0, y_kicker - 14 * s + dy, x0 + uz, y_kicker - 10 * s + dy), fill=VURGU + (int(255 * alfa),))
            # 2) Kicker: şifre çözülür gibi harf harf oturur.
            if yerel > 0.08:
                gorunen = ""
                for i, ch in enumerate(kicker):
                    otur = 0.12 + i * 0.018
                    if ch == " " or yerel > otur + 0.1:
                        gorunen += ch
                    elif yerel > otur - 0.12:
                        gorunen += rnd.choice(karakterler)
                    else:
                        gorunen += " "
                yaz(c, x0, y_kicker + dy, gorunen, kicker_f, VURGU + (int(235 * alfa),), 0.16 * 21 * s)
            # 3) Başlık maskeden yukarı kayarak açılır.
            ac = yumusak((yerel - 0.12) / 0.5)
            if ac > 0:
                bas_k = Image.new("RGBA", (W, boy + int(30 * s)), (0, 0, 0, 0))
                yaz(ImageDraw.Draw(bas_k), x0, int((1 - ac) * (boy + 20 * s)), baslik, bf, FILDISI + (int(255 * alfa),), -0.01 * boy)
                katman.alpha_composite(bas_k, (0, int(y_baslik - 6 * s + dy)))
            # 4) Küçük not belirir.
            na = yumusak((yerel - 0.42) / 0.4)
            if na > 0:
                yaz(c, x0 + int((1 - na) * 14 * s), y_not + dy, notu, not_f, FILDISI + (int(205 * na * alfa),))
            im.alpha_composite(katman)
        im.save(os.path.join(cikti, f"{n:04d}.png"), compress_level=1)
    print(f"{cikti}: {int(SURE * FPS)} kare ({mod})")


if __name__ == "__main__":
    main()
