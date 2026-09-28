#!/usr/bin/env python3
"""Her haber icin 4:5 (1080x1350) JPEG sosyal medya karti uretir.

NEDEN
Sosyal kuyruk haberin kapagini (.webp, 16:9) dogrudan Metricool'a
veriyordu. Instagram webp kabul etmez ve akista 4:5'ten kisa gorseller
kucuk kalir. Bu kart ayni gorsel kaynagindan (kapagin metinsiz -foto.webp
surumu) uretilir; baslik, kategori ve gorselin turu (gercek cekim,
temsili fotograf, grafik, AI uretimi) kartin kendisine basilir.

EDITORYAL KURAL
Etiket elle yazilmaz: public/data/haber-kapak-kaynagi.json'dan okunur
(haber-kapagi.py uretir). Temsili fotograflarin kunyesi -foto.webp'nin
icinde zaten basili ve kirpma bu bandi koruyacak sekilde yapilir.

Kullanim:
  python3 tools/sosyal-kart.py            # plandaki tum haberler
  python3 tools/sosyal-kart.py <slug>...  # yalniz verilenler
Cikti: public/assets/sosyal-kart/<slug>.jpg
"""
import importlib.util, json, os, sys, urllib.request
from PIL import Image, ImageDraw

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_spec = importlib.util.spec_from_file_location("kapak", os.path.join(KOK, "tools", "haber-kapagi.py"))
kapak = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(kapak)

W, H = 1080, 1350
GORSEL_H = 820                 # ustteki gorsel alani
KIRP_UST = 60                  # -foto.webp kunyesi (1000'de ~752-776) alanda kalsin
KEN = 48
ZEMIN = (7, 11, 18)
ETIKET = {
    "gercek": "GERÇEK ÇEKİM",
    "temsili": "TEMSİLİ FOTOĞRAF",
    "arsiv": "ARŞİV FOTOĞRAFI",
    "harita": "HARİTA",
    "grafik": "BTMEDYA GRAFİK",
    "ai": "AI ÜRETİMİ",
}
LOGO = os.path.join(KOK, "public", "assets", "logo", "btmedya-logo-yatay-negatif.png")


def canli_haberler():
    """Baslik ve spot canli haberden okunur: plandaki baslik kapaga sigsin
    diye kisaltilmis olabilir ("Acikogretim Lisesi"). Ag yoksa plan esas."""
    try:
        r = urllib.request.Request("https://btmedya.com.tr/api/news?limit=100",
                                   headers={"User-Agent": "Mozilla/5.0 BTMEDYA-sosyal-kart"})
        with urllib.request.urlopen(r, timeout=30) as y:
            return {n["slug"]: n for n in json.load(y).get("items", [])}
    except Exception as e:
        print(f"  (canli haberler okunamadi: {e}; plan basliklari kullaniliyor)")
        return {}


def gorsel(slug):
    for ad in (f"{slug}-foto.webp", f"{slug}.webp"):
        yol = os.path.join(KOK, "public", "assets", "haber-kapak", ad)
        if os.path.exists(yol):
            return yol
    return None


def kart(h, tur, cikti, spot=""):
    im = Image.new("RGB", (W, H), ZEMIN)
    renk = kapak.kategori_rengi(h["kategori"])
    yol = gorsel(h["slug"])
    if yol:
        g = Image.open(yol).convert("RGB")
        if g.width == g.height:
            g = g.resize((W, W), Image.LANCZOS).crop((0, KIRP_UST, W, KIRP_UST + GORSEL_H))
        else:
            g = kapak.kapla(g, W, GORSEL_H, 0.40)
        # Gorselin alti panele yumusak gecsin; baslik ayri zeminde okunur.
        g = kapak.alt_gecis(g, 0.78, 255)
        im.paste(g, (0, 0))
    d = ImageDraw.Draw(im)

    # Logo: acik fotograflarda da okunsun diye koyu yari saydam zeminde.
    if os.path.exists(LOGO):
        lg = Image.open(LOGO).convert("RGBA")
        lh = 46
        lg = lg.resize((int(lg.width * lh / lg.height), lh), Image.LANCZOS)
        taban = Image.new("RGBA", (lg.width + 36, lh + 26), (5, 8, 13, 190))
        im.paste(taban, (KEN - 18, 36), taban)
        im.paste(lg, (KEN, 49), lg)

    y = GORSEL_H + 22
    kf = kapak.f_mr(24)
    kt = kapak.buyuk(h["kategori"])
    kw = kapak.olcu_aralikli(d, kt, kf, 2.4)
    d.rectangle([KEN, y, KEN + kw + 36, y + 46], fill=renk)
    kapak.aralikli(d, (KEN + 18, y + 9), kt, kf, kapak.yazi_rengi(renk), 2.4)

    # Baslik en fazla uc satir; sigmazsa punto kuculur. Kalan alani spot
    # doldurur: okur haberin ne oldugunu linke tiklamadan anlasin.
    gen = W - 2 * KEN
    punto = 62
    while punto > 42:
        bf = kapak.f_sg(punto)
        if len(kapak.sar(d, h["baslik"], bf, gen)) <= 3:
            break
        punto -= 2
    bf = kapak.f_sg(punto)
    ty = y + 72
    for s in kapak.sar(d, h["baslik"], bf, gen)[:3]:
        d.text((KEN, ty), s, font=bf, fill=kapak.INK)
        ty += int(punto * 1.1)
    alt_y = H - 78
    if spot:
        sf = kapak.f_mr(29)
        satir = max(0, min(3, (alt_y - 24 - (ty + 14)) // 40))
        parca = kapak.sar(d, spot, sf, gen)
        if len(parca) > satir and satir:
            parca = parca[:satir]
            parca[-1] = parca[-1].rstrip(" .,;:") + "…"
        for s in parca[:satir]:
            d.text((KEN, ty + 14), s, font=sf, fill=kapak.GRI)
            ty += 40

    # Alt satir: adres + gorsel turu. Kirmizi serit marka imzasi.
    af = kapak.f_sg(28)
    d.ellipse([KEN, alt_y + 10, KEN + 14, alt_y + 24], fill=kapak.KIRMIZI)
    d.text((KEN + 26, alt_y), "btmedya.com.tr", font=af, fill=kapak.INK)
    et = ETIKET.get(tur, "AI ÜRETİMİ")
    ef = kapak.f_mr(22)
    ew = kapak.olcu_aralikli(d, et, ef, 2.2)
    kapak.aralikli(d, (W - KEN - ew, alt_y + 5), et, ef, kapak.GRI, 2.2)
    d.rectangle([0, H - 12, W, H], fill=kapak.KIRMIZI)

    os.makedirs(os.path.dirname(cikti), exist_ok=True)
    im.save(cikti, "JPEG", quality=88, optimize=True, progressive=True)
    return os.path.getsize(cikti)


if __name__ == "__main__":
    istenen = set(sys.argv[1:])
    turler = json.load(open(os.path.join(KOK, "public", "data", "haber-kapak-kaynagi.json"), encoding="utf-8"))
    hedef = os.path.join(KOK, "public", "assets", "sosyal-kart")
    canli = canli_haberler()
    n = 0
    for h in kapak.plan():
        if istenen and h["slug"] not in istenen:
            continue
        c = canli.get(h["slug"]) or {}
        h = {**h, "baslik": c.get("title") or h["baslik"]}
        spot = " ".join(str(c.get("excerpt") or "").split())
        boyut = kart(h, turler.get(h["slug"], "ai"), os.path.join(hedef, h["slug"] + ".jpg"), spot)
        n += 1
        print(f"  {h['slug'][:56]:58} {boyut/1024:>5.0f} KB")
    print(f"\n  {n} sosyal kart uretildi -> public/assets/sosyal-kart/")
