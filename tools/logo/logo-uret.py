#!/usr/bin/env python3
"""BTMEDYA logo v2 (6 Ekim, kullanıcı isteği).

Neden: eski logoda sembol (BT monogramı) ve yazı aynı altın degradeydi;
küçük boyutta ikisi birbirine karışıyor, ulusal yayıncıların logo dilinden
(ayrı renkli işaret + sade yazı) uzak duruyordu. v2:
  - İşaret: yuvarlatılmış kare, yumuşak lacivert zemin, fildişi "BT".
  - Yazı: "BT" kalın + "MEDYA" ince; işaretten farklı, soft renkte.
  - Harfler sitenin kendi yazı tipi Manrope'dan konturlanır (SVG <img>
    olarak yüklendiğinde font gerekmez, her ekranda aynı görünür).
Çıktılar public/assets/logo/ altına:
  btmedya-logo-v2.svg          açık zemin
  btmedya-logo-v2-negatif.svg  koyu zemin (site başlığı)
  bt-amblem-v2.svg             yalnız işaret (favicon, profil)
Çalıştır: python3 tools/logo/logo-uret.py   (gerekli: fontTools)
"""
import os

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

KOK = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FONT = os.path.join(KOK, "public", "assets", "fonts", "manrope-latin.woff2")
HEDEF = os.path.join(KOK, "public", "assets", "logo")

# Soft kurumsal palet: lacivert işaret, fildişi harf, ılık gri yazı.
LACIVERT = "#24405F"
LACIVERT_ACIK = "#3A5C82"
FILDISI = "#F4EFE6"
KOMUR = "#1D2633"
ARDUVAZ = "#6E7F93"
GRI_ACIK = "#AEB9C6"


def font(agirlik):
    f = TTFont(FONT)
    return instantiateVariableFont(f, {"wght": agirlik}, inplace=False)


def yazi_yolu(f, metin, x, taban, boy, aralik=0.0):
    """Metni SVG path 'd' dizisine çevirir; (d, genişlik) döner."""
    gs = f.getGlyphSet()
    cmap = f.getBestCmap()
    olcek = boy / f["head"].unitsPerEm
    parcalar = []
    for ch in metin:
        ad = cmap[ord(ch)]
        pen = SVGPathPen(gs)
        gs[ad].draw(TransformPen(pen, (olcek, 0, 0, -olcek, x, taban)))
        parcalar.append(pen.getCommands())
        x += gs[ad].width * olcek + aralik * boy
    return " ".join(parcalar), x


def isaret(x, y, boyut, kalin):
    """Yuvarlatılmış kare + ortalanmış BT."""
    d, son = yazi_yolu(kalin, "BT", 0, 0, boyut * 0.56, -0.02)
    gen = son
    tx = x + (boyut - gen) / 2
    ty = y + boyut * 0.5 + boyut * 0.56 * 0.36
    d, _ = yazi_yolu(kalin, "BT", tx, ty, boyut * 0.56, -0.02)
    r = boyut * 0.22
    return (
        f'<rect x="{x:.1f}" y="{y:.1f}" width="{boyut}" height="{boyut}" rx="{r:.1f}" fill="url(#zemin)"/>'
        f'<rect x="{x + boyut * 0.18:.1f}" y="{y + boyut * 0.80:.1f}" width="{boyut * 0.64:.1f}" height="{boyut * 0.045:.1f}" rx="{boyut * 0.02:.1f}" fill="{FILDISI}" opacity=".55"/>'
        f'<path d="{d}" fill="{FILDISI}"/>'
    )


def logo(dosya, koyu):
    kalin, ince = font(800), font(400)
    boy, isaret_boyu, bosluk = 64, 88, 22
    x0 = isaret_boyu + bosluk
    taban = isaret_boyu / 2 + boy * 0.36
    d1, x = yazi_yolu(kalin, "BT", x0, taban, boy, 0.01)
    d2, x = yazi_yolu(ince, "MEDYA", x + boy * 0.04, taban, boy, 0.01)
    gen = x + 4
    renk1, renk2 = (FILDISI, GRI_ACIK) if koyu else (KOMUR, ARDUVAZ)
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {gen:.0f} {isaret_boyu}" width="{gen:.0f}" height="{isaret_boyu}" role="img" aria-label="BTMEDYA">'
        f'<defs><linearGradient id="zemin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{LACIVERT_ACIK}"/><stop offset="1" stop-color="{LACIVERT}"/></linearGradient></defs>'
        + isaret(0, 0, isaret_boyu, kalin)
        + f'<path d="{d1}" fill="{renk1}"/><path d="{d2}" fill="{renk2}"/></svg>'
    )
    open(os.path.join(HEDEF, dosya), "w", encoding="utf-8").write(svg)
    print(dosya, f"{gen:.0f}x{isaret_boyu}")


def amblem():
    kalin = font(800)
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-label="BTMEDYA">'
        f'<defs><linearGradient id="zemin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{LACIVERT_ACIK}"/><stop offset="1" stop-color="{LACIVERT}"/></linearGradient></defs>'
        + isaret(0, 0, 256, kalin)
        + "</svg>"
    )
    open(os.path.join(HEDEF, "bt-amblem-v2.svg"), "w", encoding="utf-8").write(svg)
    print("bt-amblem-v2.svg 256x256")


if __name__ == "__main__":
    logo("btmedya-logo-v2.svg", koyu=False)
    logo("btmedya-logo-v2-negatif.svg", koyu=True)
    amblem()
