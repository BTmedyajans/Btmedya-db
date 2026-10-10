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
import json, math, os, re, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

W, H = 1200, 675
KEN = 56
INK = (255, 255, 255)
KIRMIZI = (255, 64, 56)        # editoryal aksan; src/news-page.js ile ayni
SARI = (255, 212, 0)             # sosyal kapaklarda tek kelimelik odak rengi
GRI = (176, 187, 200)

BANT = 58                      # alttaki kirmizi kunye bandinin yuksekligi
SERIT = 452                    # sagdaki muhabir seridinin genisligi
GECIS = 190                    # seridin sol kenarindaki yumusak gecis

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fontlar")
SG = os.path.join(FONT_DIR, "space-grotesk-tam.ttf")
MR = os.path.join(FONT_DIR, "manrope-tam.ttf")

def buyuk(metin):
    """Turkce buyuk harf: Python'un upper()'i "i"yi "I" yapar, "Ekonomi"
    kapakta "EKONOMI" diye basiliyordu."""
    return str(metin).replace("i", "İ").replace("ı", "I").upper()


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


def kapak_norm(s):
    # "İ".lower() Python'da "i" + birlesik nokta (U+0307) verir; buyuk harfe
    # cevrilmis manset satiri ("BALIKESİR") vurgu kelimesiyle eslesmiyordu.
    return str(s or "").replace("İ", "i").replace("\u0307", "").lower().replace("ı","i").replace("ğ","g").replace("ü","u").replace("ş","s").replace("ö","o").replace("ç","c")


def ana_vurgu(metin):
    """Başlıktan tek güçlü kelime seçer; anlam eklemez, yalnız görsel hiyerarşi kurar."""
    dur = {"bir","bu","şu","olan","olarak","için","icin","ile","daha","çok","cok","ve","veya","de","da","den","dan","mi","mı","mu","mü","gibi","son","bugün","bugun"}
    aday=[]
    for w in re.findall(r"[0-9A-Za-zÇĞİÖŞÜçğıöşü]+", str(metin or "")):
        n=kapak_norm(w)
        if len(n)<4 or n in dur: continue
        puan=len(n)
        if re.search(r"\d", n): puan+=14
        if re.search(r"(iddia|şok|sok|yangin|yangın|uyuşturucu|uyusturucu|zam|fiyat|rekor|satış|satis|kaza|kriz|baskin|baskın)", n): puan+=12
        aday.append((puan,w))
    aday.sort(key=lambda x:(x[0],len(x[1])), reverse=True)
    return kapak_norm(aday[0][1]) if aday else ""


def satir_vurgulu(d, xy, metin, font, vurgu):
    """Başlıkta seçilen tek kelimeyi sarı zeminle öne çıkarır; metin aynıdır."""
    x,y=xy
    parcalar=re.split(r"(\s+)", str(metin or ""))
    for parca in parcalar:
        if parca.isspace():
            x += d.textlength(parca, font=font)
            continue
        if kapak_norm(re.sub(r"^[^0-9A-Za-zÇĞİÖŞÜçğıöşü]+|[^0-9A-Za-zÇĞİÖŞÜçğıöşü]+$", "", parca)) == vurgu:
            tw=d.textlength(parca, font=font)
            pad=max(4,int(font.size*.08))
            # Kutu harflerin gercek sinirindan olculur: sabit .88 oran "g, ş, j"
            # kuyruklarini kutunun disinda birakiyor, siyah yazi koyu zeminde
            # kayboluyordu ("Memleketinde", "Stratejileri" kesik gorunuyordu).
            bx0, by0, bx1, by1 = d.textbbox((x, y), parca, font=font)
            d.rounded_rectangle([bx0-pad, by0-pad//2, bx1+pad, by1+pad//2],radius=max(2,int(font.size*.04)),fill=SARI)
            d.text((x,y),parca,font=font,fill=(8,10,12))
            x += tw
        else:
            d.text((x,y),parca,font=font,fill=INK)
            x += d.textlength(parca, font=font)


def kapak(baslik, kategori, altbilgi, cikti, foto=None, video=False, ust=0.30,
          kunye="BTMEDYA", gercek=False, imza="HABER: BUSE TUNCAY"):
    """imza: alt banttaki sol yazi. Haber kapaklarinda muhabirin adi dogru
    kunyedir; bolum sayfalarinin paylasim kartinda "HABER:" yanlis beyan
    olur, o yuzden cagiran taraf degistirebilir."""
    im = perde(zemin(foto, ust), bool(foto))
    d = ImageDraw.Draw(im)

    # Baslik alani: fotograf varken serit disinda kalir.
    metin_gen = (W - SERIT + GECIS - 2 * KEN) if foto else (W - 2 * KEN - 30)

    # Kirmizi kategori etiketi, sol ust.
    kf = f_mr(19)
    kt = buyuk(kategori)
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
    vurgu = ana_vurgu(baslik)
    for s in satirlar:
        satir_vurgulu(d, (KEN, y), s, bf, vurgu)
        y += sat_y

    # Kaynak/tarih satiri. AGENTS.md geregi her kare AI URETIMI yada GERCEK
    # CEKIM etiketi tasir; etiket sayfa notunda degil karenin kendisinde
    # duruyor, boylece gorsel paylasildiginda da kaynagi belli oluyor.
    kaynak = f"{altbilgi} · {'GERÇEK ÇEKİM' if gercek else 'AI ÜRETİMİ'}"
    d.text((KEN, y + 14), kaynak, font=f_mr(21), fill=GRI)

    # Alt kunye bandi: muhabir solda, alan adi sagda.
    d.rectangle([0, H - BANT, W, H], fill=KIRMIZI)
    bf2 = f_mr(19)
    aralikli(d, (KEN, H - BANT + 19), imza, bf2, INK, 2.2)
    sf = f_sg(21)
    sag = "BTMEDYA.COM.TR" if kunye == "BTMEDYA" else kunye
    d.text((W - KEN - d.textlength(sag, font=sf), H - BANT + 17), sag, font=sf, fill=INK)

    os.makedirs(os.path.dirname(cikti), exist_ok=True)
    im.save(cikti, "WEBP", quality=92, method=6)
    return os.path.getsize(cikti)


# Kart gorseli icin kare kenar. Kartlarin kutu orani sayfadan sayfaya
# degisiyor (mobilde 352x388, masaustunde genis); kare kaynak her iki
# yonde de kirpilinca yuzu cercevede tutuyor.
FOTO = 1000


def kart_fotografi(foto_yolu, cikti, ust=0.30):
    """Metinsiz kart gorseli uretir.

    Bestelenmis kapak (basligi, kirmizi bandi ve kunyesi uzerinde basili)
    kart arkasina konunca kartin kendi basligiyla ust uste biniyordu; iki
    metin birbirini okunmaz hale getiriyordu. Kart artik yalniz fotografi
    kullanir, metni HTML tarafi yazar. Bestelenmis kapak paylasim gorseli
    (og:image) olarak kaliyor.
    """
    im = Image.open(foto_yolu).convert("RGB")
    im = kapla(im, FOTO, FOTO, ust)
    # Kartin uzerine perde dusecegi icin hafif kontrast; yuz yapisina
    # dokunan hicbir islem yok.
    im = ImageEnhance.Contrast(im).enhance(1.04)
    os.makedirs(os.path.dirname(cikti), exist_ok=True)
    im.save(cikti, "WEBP", quality=84, method=6)
    return os.path.getsize(cikti)


# Bilgi karti: ajans ve kurum kaynakli haberler icin fotografsiz kapak.
#
# NEDEN
# BTMEDYA'nin bu haberlerde kendi karesi yok. Onceden kapaga muhabirin
# portresi yada AI uretimi bir yuz konuyordu; bu hem haberle ilgisizdi hem
# de muhabir olay yerindeymis gibi yanlis bir izlenim veriyordu. Bilgi
# karti haberin kendi temel rakamini (plandaki "vurgu") ve yerini gosterir;
# rakam haber metninden aynen alinir, arac hicbir sey hesaplamaz.
#
# Renkler kategoriye gore sabittir ve sitedeki kart vurgu renkleriyle
# (public/cinematic-overrides.css) ayni aileden secildi; boylece okur
# kapaga bakinca bolumu taniyabilir.
KATEGORI_RENK = [
    ("yapay", (139, 124, 255)),     # mor: yapay zeka
    ("gundem", (255, 64, 56)),      # kirmizi: gundem / asayis / yangin
    ("ekonomi", (242, 193, 78)),    # altin: ekonomi
    ("tarim", (242, 193, 78)),
    ("kultur", (199, 125, 255)),    # eflatun: kultur / sanat
    ("spor", (101, 230, 164)),      # yesil: spor
    ("saglik", (255, 122, 107)),
    ("ulasim", (80, 214, 200)),     # camgobegi-yesil: ulasim / egitim
    ("yerel", (100, 228, 255)),     # camgobegi: yerel
    ("egitim", (80, 214, 200)),     # camgobegi-yesil: egitim (ulasim ile ayni aile)
    ("teknoloji", (92, 168, 255)),  # mavi: teknoloji / savunma / TEKNOFEST
    ("dunya", (64, 132, 220)),      # lacivert-mavi: dunya
    ("yasam", (246, 150, 70)),      # turuncu: yasam / cevre / tuketici
]


def duz(s):
    s = str(s or "").lower().replace("ı", "i").replace("i̇", "i")
    for a, b in zip("şğüöçâîû", "sguocaiu"):
        s = s.replace(a, b)
    return s


def kategori_rengi(kategori):
    k = duz(kategori)
    for anahtar, renk in KATEGORI_RENK:
        if anahtar in k:
            return renk
    return (100, 228, 255)


def yazi_rengi(zemin):
    """Acik renkli etiket zemininde beyaz yazi okunmaz (altin, camgobegi)."""
    r, g, b = zemin
    return (8, 12, 18) if (0.299 * r + 0.587 * g + 0.114 * b) > 150 else INK


def bilgi_zemini(w, h, renk, cx, cy):
    im = Image.new("RGB", (w, h), (7, 11, 18))
    isik = Image.new("RGB", (w, h), (0, 0, 0))
    d = ImageDraw.Draw(isik)
    for i in range(24, 0, -1):
        r = i * max(w, h) // 34
        t = (i / 24) ** 2
        d.ellipse([cx - r, cy - r, cx + r, cy + r],
                  fill=tuple(int(c * 0.30 * (1 - t)) for c in renk))
    isik = isik.filter(ImageFilter.GaussianBlur(max(w, h) // 14))
    im = Image.blend(im, isik, 0.5).point(lambda v: min(255, int(v * 2)))
    # Ince nokta izgarasi: duz degrade "bos" gorunmesin, veri grafigi dili.
    d = ImageDraw.Draw(im)
    for y in range(24, h, 32):
        for x in range(24, w, 32):
            d.point((x, y), fill=(34, 46, 62))
    return im


def sigdir(d, metin, font_fn, genislik, en_buyuk, en_kucuk=40):
    punto = en_buyuk
    while punto > en_kucuk and d.textlength(metin, font=font_fn(punto)) > genislik:
        punto -= 4
    return font_fn(punto)


def bilgi_karti(h, cikti):
    renk = kategori_rengi(h["kategori"])
    vurgu = h.get("vurgu") or {}
    im = bilgi_zemini(W, H, renk, int(W * 0.80), int(H * 0.42))
    d = ImageDraw.Draw(im)

    # Kategori etiketi: kategori renginde, okunur yazi rengiyle.
    kf = f_mr(19)
    kt = buyuk(h["kategori"])
    kw = olcu_aralikli(d, kt, kf, 2.6)
    d.rectangle([KEN, 44, KEN + kw + 38, 85], fill=renk)
    aralikli(d, (KEN + 19, 53), kt, kf, yazi_rengi(renk), 2.6)

    # Sag panel: yer, iri vurgu, aciklama.
    px, pw = 760, W - 760 - KEN
    d.line([(px - 36, 118), (px - 36, H - BANT - 70)], fill=tuple(int(c * .55) for c in renk), width=2)
    yer = buyuk(vurgu.get("yer") or "")
    if yer:
        d.ellipse([px, 132, px + 12, 144], fill=renk)
        aralikli(d, (px + 24, 126), yer, f_mr(18), GRI, 2.4)
    deger = vurgu.get("deger", "")
    if deger:
        vf = sigdir(d, deger, f_sg, pw, 150, 44)
        by = 176 + max(0, (150 - vf.size) // 2)
        d.text((px - 4, by), deger, font=vf, fill=renk)
        ey = by + int(vf.size * 1.12) + 8
        for s in sar(d, vurgu.get("etiket", ""), f_mr(27), pw)[:3]:
            d.text((px, ey), s, font=f_mr(27), fill=INK)
            ey += 36

    # Baslik: sol sutun, en fazla bes satir.
    metin_gen = px - 36 - KEN - 30
    punto = 76
    while punto > 40:
        bf = f_sg(punto)
        if len(sar(d, h["baslik"], bf, metin_gen)) <= 5:
            break
        punto -= 3
    bf = f_sg(punto)
    satirlar = sar(d, h["baslik"], bf, metin_gen)[:5]
    sat_y = int(punto * 1.06)
    y = H - BANT - 64 - len(satirlar) * sat_y
    for s in satirlar:
        d.text((KEN, y), s, font=bf, fill=INK)
        y += sat_y
    # Bu kapak fotograf degil grafik: "AI URETIMI" yazmak da "GERCEK CEKIM"
    # yazmak da yanlis beyan olurdu.
    d.text((KEN, y + 14), f"{h['altbilgi']} · BTMEDYA GRAFİK", font=f_mr(21), fill=GRI)

    d.rectangle([0, H - BANT, W, H], fill=KIRMIZI)
    aralikli(d, (KEN, H - BANT + 19), h.get("imza", "BTMEDYA HABER MERKEZİ"), f_mr(19), INK, 2.2)
    sf = f_sg(21)
    d.text((W - KEN - d.textlength("BTMEDYA.COM.TR", font=sf), H - BANT + 17), "BTMEDYA.COM.TR", font=sf, fill=INK)
    os.makedirs(os.path.dirname(cikti), exist_ok=True)
    im.save(cikti, "WEBP", quality=92, method=6)
    return os.path.getsize(cikti)


def bilgi_karti_foto(h, cikti):
    """Metinsiz kart gorselinin bilgi karti karsiligi, manset dilinde: baslik
    yok (kartin kendi basligi HTML'de), ortada dev sari rakam. Kare kaynak
    liste kucuk resminde ve genis kartta kirpildigi icin her sey ortada;
    eski surumde kirpilan yazi parcalari ("MERKE GERCE") gorunuyordu."""
    global W, H
    vurgu = h.get("vurgu") or {}
    eski = (W, H)
    W, H = FOTO, FOTO
    try:
        im = manset_zemini()
    finally:
        W, H = eski
    d = ImageDraw.Draw(im)
    gen = FOTO - 200
    deger = buyuk(vurgu.get("deger") or h["kategori"].split("·")[0].strip())
    vf = f_baslik(330)
    while vf.size > 90 and d.textlength(deger, font=vf) > gen:
        vf = f_baslik(vf.size - 10)
    etiket = buyuk(vurgu.get("etiket", "").split("·")[0].strip())
    ef = sigdir(d, etiket, f_baslik, gen, 64, 34) if etiket else None
    db = d.textbbox((0, 0), deger, font=vf)
    eh = (d.textbbox((0, 0), etiket, font=ef)[3] + 34) if etiket else 0
    y = (FOTO - (db[3] - db[1]) - eh) // 2
    golgeli_yazi(im, ((FOTO - (db[2] - db[0])) // 2 - db[0], y - db[1]), deger, vf, SARI_M, 6)
    if etiket:
        tb = d.textbbox((0, 0), etiket, font=ef)
        golgeli_yazi(im, ((FOTO - (tb[2] - tb[0])) // 2 - tb[0], y + (db[3] - db[1]) + 34 - tb[1]), etiket, ef, INK, 3)
    os.makedirs(os.path.dirname(cikti), exist_ok=True)
    im.save(cikti, "WEBP", quality=84, method=6)
    return os.path.getsize(cikti)


# Kanal karti: ulusal haber kanallarinin paylasim karti duzeni.
#
# NEDEN
# Bilgi karti haberin rakamini dogru veriyordu ama gorselsizdi; okur
# kanallarin kartlarinda once fotografa bakar. BTMEDYA'nin bu haberlerde
# kendi karesi yok ve ajans (AA, DHA, IHA) fotograflari abonelik olmadan
# kullanilamaz. Bu yuzden ozgur lisansli (Wikimedia Commons / Flickr CC)
# gercek fotograflar TEMSILI etiketiyle ve fotografcinin adi, lisansiyla
# birlikte basilir. Fotograf olayin kendisi degildir; etiket bunu acikca
# soyler. Yazar ve lisans bilgisi plandaki "temsili" alanindan gelir,
# public/data/kapak-foto-kaynaklari.json dosyasina da yazilir.
#
# Duzen: tam kadraj fotograf, altta koyu gecis, kategori seridi ve iri
# baslik sol altta, haberin rakami sag ustte kategori renginde kutuda,
# en altta kirmizi kunye bandi.
LISANS_ADI = {"by": "CC BY", "by-sa": "CC BY-SA", "cc0": "CC0", "pdm": "Kamu malı",
              # Commons {{Attribution}}: yalniz atif sarti olan ozgur lisans.
              "atif": "Serbest lisans (atıf)"}


def lisans_metni(t):
    ad = LISANS_ADI.get(t.get("lisans", ""), t.get("lisans", "").upper())
    return ad if t.get("lisans") in ("cc0", "pdm") else f"{ad} {t.get('lisans_surum', '')}".strip()


# Yazi tiplerinde Kiril harfi yok; fotografci adi kutu glifi olarak
# basiliyordu. Ad silinmez, Latin harfle yazilir (atif zorunlu).
KIRIL = dict(zip("абвгдеёжзийклмнопрстуфхцчшщъыьэюяАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ",
                 ["a","b","v","g","d","e","yo","zh","z","i","y","k","l","m","n","o","p","r","s","t","u","f","kh","ts","ch","sh","shch","","y","","e","yu","ya",
                  "A","B","V","G","D","E","Yo","Zh","Z","I","Y","K","L","M","N","O","P","R","S","T","U","F","Kh","Ts","Ch","Sh","Shch","","Y","","E","Yu","Ya"]))


def kunye_satiri(t):
    yazar = "".join(KIRIL.get(c, c) for c in (t.get("yazar") or "").strip()) or "anonim"
    if len(yazar) > 34:
        yazar = yazar[:32].rstrip() + "…"
    # "TEMSILI" yalniz olayla ilgisi olmayan genel kareler icin dogrudur;
    # haberde adi gecen kisi yada yerin kendi fotografi "ARSIV" olarak
    # etiketlenir (plandaki "rozet" alani).
    tur = {"arsiv": "ARŞİV FOTOĞRAFI", "harita": "HARİTA"}.get(t.get("rozet"), "TEMSİLİ FOTOĞRAF")
    return f"{tur} · {yazar} / {t.get('kaynak', 'Wikimedia Commons')} · {lisans_metni(t)}"


def alt_gecis(im, bas, guc=235):
    w, h = im.size
    maske = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(maske)
    for y in range(int(h * bas), h):
        t = (y - h * bas) / (h * (1 - bas))
        # Egri 1'in altinda: karartma basligin ust satirina erken ulassin;
        # acik renkli fotograflarda (harita, beyaz ucak) baslik okunmuyordu.
        d.line([(0, y), (w, y)], fill=int(guc * min(1.0, max(0.0, t)) ** 0.85))
    return Image.composite(Image.new("RGB", (w, h), (5, 8, 13)), im, maske)


def rakam_kutusu(d, x_sag, y, vurgu, renk, en_fazla=330):
    deger = vurgu.get("deger", "")
    if not deger:
        return
    vf = sigdir(d, deger, f_sg, en_fazla - 36, 66, 30)
    ef = f_mr(19)
    etiket = sar(d, vurgu.get("etiket", ""), ef, en_fazla - 36)[:2]
    gen = max(d.textlength(deger, font=vf), *(d.textlength(s, font=ef) for s in etiket or [""])) + 36
    yuk = int(vf.size * 1.08) + 20 + len(etiket) * 25 + 8
    x = x_sag - gen
    d.rectangle([x, y, x_sag, y + yuk], fill=renk)
    yr = yazi_rengi(renk)
    d.text((x + 18, y + 10), deger, font=vf, fill=yr)
    ey = y + 14 + int(vf.size * 1.08)
    for s in etiket:
        d.text((x + 18, ey), s, font=ef, fill=yr)
        ey += 25


def kanal_karti(h, foto_yolu, cikti):
    t = h["temsili"]
    renk = kategori_rengi(h["kategori"])
    im = kapla(Image.open(foto_yolu).convert("RGB"), W, H, t.get("odak", 0.45))
    im = ImageEnhance.Contrast(im).enhance(1.05)
    if t.get("rozet") == "harita":
        # Haritada koyu yazi acik zemin uzerinde; baslik o yazilarla
        # karisiyordu. Harita soluklastirilir, baslik one cikar.
        im = ImageEnhance.Brightness(im).enhance(0.5)
    im = alt_gecis(im, 0.26, 248)
    d = ImageDraw.Draw(im)

    # Sol ust: kanal imzasi. Kanallarin kartlarinda logo hep ayni kosede.
    amb = Image.open(os.path.join(KOK, "public", "assets", "btmedya-emblem-derived.png")).convert("RGBA")
    amb = amb.resize((62, 40), Image.LANCZOS)
    d.rectangle([KEN - 12, 34, KEN + 186, 88], fill=(6, 10, 15))
    im.paste(amb, (KEN, 41), amb)
    d.text((KEN + 72, 44), "HABER", font=f_sg(30), fill=INK)

    # Sag ust: haberin rakami.
    rakam_kutusu(d, W - KEN, 34, h.get("vurgu") or {}, renk)

    # Baslik bloku: sol alt. Genislik sag alttaki kunye satirina degmez.
    metin_gen = W - 2 * KEN - 40
    punto = 62
    while punto > 38:
        bf = f_sg(punto)
        if len(sar(d, h["baslik"], bf, metin_gen)) <= 3:
            break
        punto -= 2
    bf = f_sg(punto)
    satirlar = sar(d, h["baslik"], bf, metin_gen)[:3]
    sat_y = int(punto * 1.08)
    alt = H - BANT - 44
    y = alt - len(satirlar) * sat_y
    # Kategori seridi basligin hemen ustunde: kanallarin "alt bant" dili.
    kf = f_mr(18)
    kt = buyuk(h["kategori"])
    kw = olcu_aralikli(d, kt, kf, 2.4)
    d.rectangle([KEN, y - 50, KEN + kw + 32, y - 14], fill=renk)
    aralikli(d, (KEN + 16, y - 43), kt, kf, yazi_rengi(renk), 2.4)
    for s in satirlar:
        d.text((KEN, y), s, font=bf, fill=INK)
        y += sat_y
    d.text((KEN, alt + 8), h["altbilgi"], font=f_mr(19), fill=GRI)

    # Fotograf kunyesi: yazar + lisans, gorselle birlikte dolassin diye karenin
    # icinde. CC BY ve CC BY-SA bunu zorunlu tutuyor.
    kf2 = f_mr(15)
    ks = kunye_satiri(t)
    d.text((W - KEN - d.textlength(ks, font=kf2), alt + 11), ks, font=kf2, fill=(196, 204, 214))

    d.rectangle([0, H - BANT, W, H], fill=KIRMIZI)
    aralikli(d, (KEN, H - BANT + 19), h.get("imza", "BTMEDYA HABER MERKEZİ"), f_mr(19), INK, 2.2)
    sf = f_sg(21)
    d.text((W - KEN - d.textlength("BTMEDYA.COM.TR", font=sf), H - BANT + 17), "BTMEDYA.COM.TR", font=sf, fill=INK)
    os.makedirs(os.path.dirname(cikti), exist_ok=True)
    im.save(cikti, "WEBP", quality=88, method=6)
    return os.path.getsize(cikti)


def kanal_karti_foto(h, foto_yolu, cikti):
    """Metinsiz kart gorseli: fotograf + rakam kutusu + kunye. Baslik
    HTML'de. Kart kutulari kareyi 16:9'a kadar kirpiyor; rakam ve kunye
    bu yuzden karenin orta-alt bandinda tutulur."""
    t = h["temsili"]
    renk = kategori_rengi(h["kategori"])
    im = kapla(Image.open(foto_yolu).convert("RGB"), FOTO, FOTO, t.get("odak", 0.45))
    im = ImageEnhance.Contrast(im).enhance(1.04)
    if t.get("rozet") == "harita":
        im = ImageEnhance.Brightness(im).enhance(0.55)
    im = alt_gecis(im, 0.42, 215)
    d = ImageDraw.Draw(im)
    vurgu = h.get("vurgu") or {}
    if vurgu.get("deger"):
        # Rakam Haber sesiyle (Big Shoulders 900) yazilir. Kutu, yazi tipi
        # boyutundan degil glifin gercek sinirindan olculur; bu fontta harf
        # govdesi asagi oturdugu icin boyuta gore kutu ustte bos kaliyordu.
        vf = sigdir(d, vurgu["deger"], f_baslik, 520, 124, 52)
        ef = f_mr(30)
        etiket = sar(d, vurgu.get("etiket", ""), ef, 560)[:2]
        db = d.textbbox((0, 0), vurgu["deger"], font=vf)
        gen = max(db[2], *(d.textlength(s, font=ef) for s in etiket or [""])) + 48
        yuk = 22 + (db[3] - db[1]) + (14 + len(etiket) * 38 if etiket else 0) + 18
        y = 740 - yuk
        d.rectangle([60, y, 60 + gen, y + yuk], fill=renk)
        d.text((84, y + 22 - db[1]), vurgu["deger"], font=vf, fill=yazi_rengi(renk))
        for j, s in enumerate(etiket):
            d.text((84, y + 22 + (db[3] - db[1]) + 10 + j * 38), s, font=ef, fill=yazi_rengi(renk))
        kunye_y = max(752, y + yuk + 12)
    else:
        kunye_y = 752
    ks = kunye_satiri(t)
    kf = sigdir(d, ks, f_mr, FOTO - 120, 22, 14)
    d.text((60, kunye_y), ks, font=kf, fill=(214, 220, 228))
    os.makedirs(os.path.dirname(cikti), exist_ok=True)
    im.save(cikti, "WEBP", quality=84, method=6)
    return os.path.getsize(cikti)


# ---------------------------------------------------------------------------
# MANSET KAPAGI (3 Ekim 2026, kullanici ornekleri: ulusal/yerel haber kanali
# paylasim kartlari). Gorsel dil: dar ve kalin buyuk harf baslik, beyaz +
# sari, kirmizi egik serit, sag ustte logo plakasi, mavi noktali zemin.
#
# Orneklerden ALINMAYANLAR, cunku AGENTS.md ve kullanicinin gazetecilik
# kurallariyla celisir:
#   - "RESMEN ACIKLANDI" gibi neyin aciklandigini soylemeyen tik tuzagi:
#     kapakta her zaman haberin kendi basligi yazar.
#   - "SOKU" gibi iddiayi kesinlesmis gosteren sifatlar: kod basliga kelime
#     eklemez.
#   - Habere konu olmayan bir kisinin fotografini sucla iliskili bir basligin
#     yanina koymak (hakaret riski): kisi fotografi yalniz plandaki kendi
#     haberinde ve lisansli/kendi karemizse girer.
#   - "SON DAKIKA" yalniz planda son_dakika: true ise basilir.
# ---------------------------------------------------------------------------
# Haber sesi (Gorsel Kimlik 2.0): Big Shoulders Display 900. Anton'la ayni
# satir genisligini verir ama harf govdesi daha kisa ve yukari oturur;
# baslik satirinin dikey kaydirmasi bu yuzden BASLIK_KAYMA ile ayarlanir.
BASLIK_FONT = os.path.join(FONT_DIR, "big-shoulders-900.ttf")
BASLIK_KAYMA = 0.07
SARI_M = (255, 212, 0)
KIRMIZI_M = (227, 20, 27)
LACIVERT = ((5, 16, 44), (10, 46, 112))


def f_baslik(b): return ImageFont.truetype(BASLIK_FONT, b)


def manset_zemini():
    """Mavi degrade + nokta izgarasi + soldan altin isik: ornek 1'deki
    haber stüdyosu zemini. Harita kullanilmaz; sinir verisi depoda yok ve
    yanlis cizilmis bir Turkiye haritasi kabul edilemez."""
    im = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(im)
    (r0, g0, b0), (r1, g1, b1) = LACIVERT
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)], fill=(int(r0 + (r1 - r0) * t), int(g0 + (g1 - g0) * t), int(b0 + (b1 - b0) * t)))
    isik = Image.new("RGB", (W, H), (0, 0, 0))
    di = ImageDraw.Draw(isik)
    di.ellipse([-260, 120, 300, 640], fill=(150, 104, 10))
    di.ellipse([W - 220, -120, W + 260, 360], fill=(20, 70, 190))
    isik = isik.filter(ImageFilter.GaussianBlur(120))
    im = Image.composite(isik, im, isik.convert("L").point(lambda v: min(255, v * 2)))
    d = ImageDraw.Draw(im)
    for y in range(18, H, 14):
        for x in range(18, W, 14):
            v = 46 + int(26 * ((x * 7 + y * 3) % 5 == 0))
            d.ellipse([x - 2, y - 2, x + 2, y + 2], fill=(v, v + 22, v + 70))
    return im


def egik_serit(im, x, y, metin, font, zemin, yazi=INK, egim=16, pad=(22, 10)):
    d = ImageDraw.Draw(im)
    tw = d.textlength(metin, font=font)
    b = d.textbbox((0, 0), metin, font=font)
    h = (b[3] - b[1]) + 2 * pad[1]
    gen = tw + 2 * pad[0]
    d.polygon([(x + egim, y), (x + gen + egim, y), (x + gen, y + h), (x, y + h)], fill=zemin)
    d.text((x + pad[0] + egim // 2, y + pad[1] - b[1]), metin, font=font, fill=yazi)
    return x + gen + egim, y + h


def logo_plakasi(im):
    # 9 Ekim: logo v2 (tools/logo/logo-uret.py; sembol lacivert, yazi ayri
    # soft renk). PNG, SVG'nin 4x tarayici render'idir: Pillow SVG okuyamaz.
    logo = Image.open(os.path.join(KOK, "public", "assets", "logo", "btmedya-logo-v2-pozitif.png")).convert("RGBA")
    lh = 40
    logo = logo.resize((int(logo.width * lh / logo.height), lh), Image.LANCZOS)
    d = ImageDraw.Draw(im)
    x1, y0 = W - 30, 30
    x0 = x1 - logo.width - 28
    d.rounded_rectangle([x0, y0, x1, y0 + lh + 18], radius=8, fill=(255, 255, 255))
    im.paste(logo, (x0 + 14, y0 + 9), logo)


def golgeli_yazi(im, xy, metin, font, dolgu=INK, kontur=4):
    golge = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ImageDraw.Draw(golge).text((xy[0] + 3, xy[1] + 8), metin, font=font, fill=(0, 0, 0, 200),
                               stroke_width=kontur + 2, stroke_fill=(0, 0, 0, 200))
    golge = golge.filter(ImageFilter.GaussianBlur(7))
    im.paste(golge, (0, 0), golge)
    ImageDraw.Draw(im).text(xy, metin, font=font, fill=dolgu, stroke_width=kontur, stroke_fill=(0, 0, 0))


def manset_karti(h, cikti, temsili_yolu=None, portre=None, bicim="WEBP"):
    """Ulusal kanal (CNN Türk / Habertürk) manşet dili (10 Ekim, kullanıcı
    isteği: "blok çekme, sadece hafif siyah gölgelendirme ekle, ulusal
    kanalları örnek al"). Eski sürümde alta solid kırmızı + sarı bant
    basılıyordu; kullanıcı bunu "blok" olarak tanımladı. Artık:

      - Fotoğraf TAM KADRAJ, kapanmaz; alta yalnızca hafif siyah degrade
        (blok değil, okunurluk için yumuşak gölge) iner.
      - Başlık + alt başlık + künye bu gölgenin üstüne biner (lower-third).
      - Ana başlık büyük KIRMIZI (kullanıcı isteği), siyah konturla okunur;
        alt başlık daha küçük SARI. Kategori sol üstte kırmızı eğik şerit,
        logo sağ üstte plaka. Hiçbir yerde tam en solid renk bandı yok.
      - temsili.dosya2 varsa kadraj ikiye bölünür (kişi + kurum yan yana)."""
    dikey = H > W

    im = Image.new("RGB", (W, H), (9, 14, 24))

    # --- Fotoğraf alanı: tam kadraj, kapanmaz ---
    fotolar = []
    odak_v = (h.get("temsili") or {}).get("odak", 0.3)
    if temsili_yolu and os.path.exists(temsili_yolu):
        fotolar.append((temsili_yolu, odak_v))
    foto2 = (h.get("temsili") or {}).get("dosya2")
    if foto2:
        p2 = os.path.join(KOK, foto2)
        if os.path.exists(p2):
            fotolar.append((p2, (h.get("temsili") or {}).get("odak2", 0.3)))
    if portre and os.path.exists(portre[0]):
        fotolar.append((portre[0], portre[1]))

    foto_var = True
    if len(fotolar) >= 2:
        fw = W // 2
        for i, (yol, ust) in enumerate(fotolar[:2]):
            gw = fw if i == 0 else W - fw
            kare = kapla(Image.open(yol).convert("RGB"), gw, H, ust)
            im.paste(ImageEnhance.Contrast(kare).enhance(1.05), (i * fw, 0))
        ImageDraw.Draw(im).rectangle([fw - 2, 0, fw + 1, H], fill=(246, 239, 230))
    elif len(fotolar) == 1:
        yol, ust = fotolar[0]
        kare = kapla(Image.open(yol).convert("RGB"), W, H, ust)
        im.paste(ImageEnhance.Contrast(kare).enhance(1.05), (0, 0))
    else:
        foto_var = False
        im.paste(editoryal_zemin(), (0, 0))
        # Fotoğraf yoksa (grafik haber) üst alan boş kalmasın: haberin
        # rakamı dev ve sarı, üst-ortada (alttaki başlığa girmesin).
        dv = buyuk((h.get("vurgu") or {}).get("deger") or "")
        if dv:
            dd = ImageDraw.Draw(im)
            df = f_baslik(int(H * 0.37))
            while df.size > 40 and dd.textlength(dv, font=df) > W - 2 * KEN:
                df = f_baslik(df.size - 6)
            db = dd.textbbox((0, 0), dv, font=df)
            golgeli_yazi(im, ((W - (db[2] - db[0])) // 2 - db[0], int(H * 0.24) - db[1]), dv, df, SARI_M, 4)

    # --- Hafif siyah alt gölge (blok değil): başlığın altını okunur kılar ---
    im = alt_gecis(im, 0.40 if dikey else 0.34, 206 if foto_var else 150)
    d = ImageDraw.Draw(im)

    # Kategori etiketi: sol üstte kırmızı eğik şerit.
    vurgu = h.get("vurgu") or {}
    yer = (vurgu.get("yer") or "").strip()
    serit = "SON DAKİKA" if h.get("son_dakika") else buyuk(h["kategori"].split("·")[0].strip())
    if yer and buyuk(yer) not in serit:
        serit += "  ·  " + buyuk(yer)
    sx, _ = egik_serit(im, KEN - 18, 28, serit, f_baslik(int(H * 0.05)), KIRMIZI_M)
    if h.get("video"):
        egik_serit(im, sx + 8, 28, "▶ VİDEO", f_baslik(int(H * 0.05)), (255, 255, 255), (12, 12, 12))
    logo_plakasi(im)

    ic_x = KEN
    ic_gen = W - 2 * KEN

    # --- Künye: en altta, küçük, gölge üstünde ---
    if temsili_yolu:
        kaynak = kunye_satiri(h["temsili"])
    elif portre:
        kaynak = "GERÇEK ÇEKİM · BTMEDYA"
    else:
        kaynak = "BTMEDYA GRAFİK"
    sol = f"{h.get('altbilgi', '')} · {kaynak}".strip(" ·")
    dm = "BTMEDYA.COM.TR"
    kf = sigdir(d, sol, f_mr, W - 2 * KEN - int(W * 0.24), max(13, int(H * 0.026)), 11)
    sf = f_sg(max(14, int(H * 0.028)))
    kb = d.textbbox((0, 0), sol, font=kf)
    kunye_y = H - int(H * 0.035) - (kb[3] - kb[1])
    golgeli_yazi(im, (ic_x, kunye_y - kb[1]), sol, kf, (223, 230, 240), 1)
    db = d.textbbox((0, 0), dm, font=sf)
    golgeli_yazi(im, (W - KEN - (db[2] - db[0]), kunye_y - db[1]), dm, sf, SARI_M, 1)

    # --- Alt başlık: SARI, küçük, künyenin üstünde ---
    altm = ""
    if vurgu.get("deger"):
        altm = buyuk(vurgu["deger"])
        if vurgu.get("etiket"):
            altm += "  ·  " + buyuk(vurgu["etiket"].split("·")[0].strip())
    elif h.get("spot"):
        altm = buyuk(str(h["spot"]).split(".")[0])
    sub_bottom = kunye_y - int(H * 0.018)
    if altm:
        af = sigdir(d, altm, f_baslik, ic_gen, int(H * 0.058), int(H * 0.032))
        ab = d.textbbox((0, 0), altm, font=af)
        sub_top = sub_bottom - (ab[3] - ab[1])
        golgeli_yazi(im, (ic_x, sub_top - ab[1]), altm, af, SARI_M, 2)
    else:
        sub_top = sub_bottom

    # --- Ana başlık: büyük KIRMIZI, siyah konturla; lower-third ---
    baslik = buyuk(h["baslik"])
    azami_satir = 4 if dikey else 3
    punto = int(H * (0.072 if dikey else 0.098))
    while punto > int(H * 0.035):
        bf = f_baslik(punto)
        if len(sar(d, baslik, bf, ic_gen)) <= azami_satir:
            break
        punto -= 2
    bf = f_baslik(punto)
    satirlar = sar(d, baslik, bf, ic_gen)[:azami_satir]
    sat_y = int(punto * 1.02)
    y = sub_top - int(H * 0.02) - len(satirlar) * sat_y
    kontur = max(3, int(punto * 0.045))
    for s in satirlar:
        golgeli_yazi(im, (ic_x, y), s, bf, KIRMIZI_M, kontur)
        y += sat_y

    os.makedirs(os.path.dirname(cikti), exist_ok=True)
    if bicim == "JPEG":
        im.save(cikti, "JPEG", quality=88, optimize=True, progressive=True)
    else:
        im.save(cikti, "WEBP", quality=90, method=6)
    return os.path.getsize(cikti)


def manset_kaynagi(h, kareler=None):
    """Plan kaydindan manset kapaginin gorsel kaynagini cozer. None donerse
    kayit manset kapagina uygun degildir (gercek olmayan havuz karesi)."""
    if h.get("temsili"):
        return {"temsili_yolu": os.path.join(KOK, h["temsili"]["dosya"])}
    kareler = kareler if kareler is not None else havuz()
    kare = kareler.get(h.get("foto") or "")
    if kare and kare.get("gercek"):
        return {"portre": (os.path.join(KOK, kare["yol"]), kare.get("ust", 0.30))}
    if h.get("vurgu") and not h.get("foto"):
        return {}
    return None


def manset_sosyal(h, cikti, **kaynak):
    """Ayni manset dilinde 4:5 (1080x1350) JPEG sosyal kart. Instagram webp
    kabul etmez; akista 4:5 en buyuk alani kaplar."""
    global W, H
    eski = (W, H)
    W, H = 1080, 1350
    try:
        return manset_karti(h, cikti, bicim="JPEG", **kaynak)
    finally:
        W, H = eski


def _kategori_plakalari():
    """Plaka adları tek kaynaktan (src/kategori-sistemi.js -> kategoriler.json)."""
    with open(os.path.join(KOK, "public", "data", "kategoriler.json"), encoding="utf-8") as f:
        return {k["anahtar"]: k["ad"] for k in json.load(f)["kategoriler"]}


KATEGORI_PLAKALARI = _kategori_plakalari()


def kategori_plakalari():
    """Sabah Masasi'nin fotografsiz haberlerine gecici kapak. Eski plakalar
    her habere ayni "gunun one cikan gelismesi" cumlesini basiyordu; haber
    hakkinda bir sey soylemeyen cumle yanlis beyana yakindi. Plaka yalniz
    kategori adini ve kaynagini tasir; habere ozel manset sonra uretilir."""
    hedef = os.path.join(KOK, "public", "assets", "kategori-kapak")
    for anahtar, ad in KATEGORI_PLAKALARI.items():
        h = {"baslik": ad, "kategori": "BTMEDYA HABER MERKEZİ", "altbilgi": "BTMEDYA · kategori grafiği"}
        manset_karti(h, os.path.join(hedef, anahtar + ".webp"))
        manset_sosyal(h, os.path.join(hedef, anahtar + "-sosyal.jpg"))
        print("  plaka", anahtar)


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


def kaynak_dosyasi(kareler, plan_kayitlari):
    """Her haberin kapak karesinin kaynagini (gercek cekim / AI uretimi)
    diske yazar.

    Rozeti kodun icine sabitlemek yanlis beyana aciktir: kapak karesi
    degistiginde etiket eskisi gibi kalir. Havuzun 'gercek' alani tek
    dogruluk kaynagi; site bu dosyayi okuyup rozeti ona gore basar."""
    kayit = {}
    for h in plan_kayitlari:
        kare = kareler.get(h.get("foto") or "")
        # Bilgi karti fotograf icermeyen bir grafiktir; ne AI uretimi ne
        # gercek cekim diye etiketlenebilir.
        kayit[h["slug"]] = (h["temsili"].get("rozet", "temsili") if h.get("temsili")
                            else "grafik" if h.get("vurgu")
                            else "gercek" if (kare and kare.get("gercek")) else "ai")
    yol = os.path.join(KOK, "public", "data", "haber-kapak-kaynagi.json")
    with open(yol, "w", encoding="utf-8") as f:
        json.dump(kayit, f, ensure_ascii=False, indent=1, sort_keys=True)
        f.write("\n")
    g = sum(1 for v in kayit.values() if v == "gercek")
    return len(kayit), g


if __name__ == "__main__":
    if sys.argv[1:] == ["--kategori"]:
        kategori_plakalari()
        raise SystemExit(0)
    istenen = set(sys.argv[1:])
    hedef = os.path.join(KOK, "public", "assets", "haber-kapak")
    n = fotolu = 0
    kareler = havuz()
    for h in plan():
        if istenen and h["slug"] not in istenen:
            continue
        if h.get("temsili"):
            foto = os.path.join(KOK, h["temsili"]["dosya"])
            boyut = manset_karti(h, os.path.join(hedef, h["slug"] + ".webp"), temsili_yolu=foto)
            fb = kanal_karti_foto(h, foto, os.path.join(hedef, h["slug"] + "-foto.webp"))
            n += 1
            print(f"  T {h['slug'][:40]:42} {boyut/1024:>5.0f} KB + kart {fb/1024:>4.0f} KB")
            continue
        if h.get("vurgu"):
            boyut = manset_karti(h, os.path.join(hedef, h["slug"] + ".webp"))
            fb = bilgi_karti_foto(h, os.path.join(hedef, h["slug"] + "-foto.webp"))
            n += 1
            print(f"  B {h['slug'][:40]:42} {boyut/1024:>5.0f} KB + kart {fb/1024:>4.0f} KB")
            continue
        kare = kareler.get(h.get("foto") or "")
        if h.get("foto") and not kare:
            raise SystemExit(f"{h['slug']}: '{h['foto']}' kapak karesi havuzda yok.")
        foto = os.path.join(KOK, kare["yol"]) if kare else None
        if kare and kare.get("gercek"):
            # Muhabirin kendi gercek karesi: manset kapaginda sag serit.
            boyut = manset_karti(h, os.path.join(hedef, h["slug"] + ".webp"), portre=(foto, kare.get("ust", 0.30)))
        else:
          boyut = kapak(h["baslik"], h["kategori"], h["altbilgi"],
                      os.path.join(hedef, h["slug"] + ".webp"),
                      foto=foto, video=h.get("video", False),
                      ust=kare.get("ust", 0.30) if kare else 0.30,
                      kunye=kare.get("kunye", "BTMEDYA") if kare else "BTMEDYA",
                      gercek=bool(kare and kare.get("gercek")),
                      # Muhabir imzasi yalniz sahadaki haberlerde dogrudur;
                      # ajans ve kurum kaynakli haberler plandan
                      # "BTMEDYA HABER MERKEZİ" imzasi alir.
                      imza=h.get("imza", "HABER: BUSE TUNCAY"))
        kb = ""
        if foto:
            fb = kart_fotografi(foto, os.path.join(hedef, h["slug"] + "-foto.webp"),
                                kare.get("ust", 0.30))
            kb = f" + kart {fb/1024:>4.0f} KB"
        n += 1
        if foto: fotolu += 1
        print(f"  {'F' if foto else ' '} {h['slug'][:40]:42} {boyut/1024:>5.0f} KB{kb}")
    print(f"\n  {n} kapak uretildi ({fotolu} fotografli, {n-fotolu} bilgi karti/editoryal).")
    print(f"  {fotolu} metinsiz kart gorseli uretildi.")
    toplam, gercek = kaynak_dosyasi(kareler, plan())
    # Temsili fotograflarin atif kaydi: sitede ve paylasimda kunyenin
    # makine tarafindan okunabilir karsiligi.
    atif = {h["slug"]: {k: h["temsili"].get(k) for k in
                        ("baslik", "yazar", "kaynak", "kaynak_url", "lisans", "lisans_surum", "lisans_url", "rozet")}
            for h in plan() if h.get("temsili")}
    with open(os.path.join(KOK, "public", "data", "kapak-foto-kaynaklari.json"), "w", encoding="utf-8") as f:
        json.dump(atif, f, ensure_ascii=False, indent=1, sort_keys=True)
        f.write("\n")
    print(f"  kapak-foto-kaynaklari.json: {len(atif)} temsili fotograf atfi.")
    print(f"  haber-kapak-kaynagi.json: {toplam} kayit ({gercek} gercek cekim).")
    # Sosyal kuyruk 4:5 JPEG karti kullanir (Instagram webp kabul etmez);
    # kapak degisince kart da ayni anda yenilensin.
    import subprocess
    subprocess.run([sys.executable, os.path.join(KOK, "tools", "sosyal-kart.py"), *sorted(istenen)], check=True)
