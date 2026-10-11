#!/usr/bin/env python3
"""BTMEDYA kapak + haber yazım uyum denetimi (10 Ekim, kullanıcı sorusu:
"Haber kapakları haber yazma ve kapak kurallarına uygun mu?").

Kurallar iki kaynaktan gelir:
  - docs/BTMEDYA-HABER-STILI.md (başlık 55-95 karakter, ünlem/soru/şok yok,
    yasak klişeler, rakam kaynakta olmalı)
  - kapak kuralları (tools/haber-kapagi.py ve kapak-otomasyonu.py): kapaktaki
    vurgu rakamı haber metninde geçer, temsili fotoğrafın yazar/kaynak/lisans
    künyesi tam, her yayımlanan haberin kapağı ve metinsiz kart sürümü var.

Ağ gerektirmez; canlı akışın tam yanıtını dosyadan okur:
  curl -s 'https://btmedya.com.tr/api/news?limit=500' > /tmp/haberler.json
  python3 tools/kapak-uyum-denetimi.py /tmp/haberler.json [--json rapor.json]
Çıkış kodu her zaman 0'dır: bu bir rapordur, kapı değil (eski haberlerin
başlığını yayından sonra değiştirmek ayrı bir editoryal karardır).
"""
import json
import os
import re
import sys
import unicodedata

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLAN = os.path.join(KOK, "public", "data", "haber-kapak-plani.json")

YASAK_KLISE = ["dikkat çekti", "yoğun ilgi gördü", "göz doldurdu", "renkli görüntüler", "start aldı",
               "hayata geçirildi", "bir hayli", "vatandaşlar tarafından", "adeta", "tam anlamıyla",
               "bilindiği gibi"]
TIK_TUZAGI = re.compile(r"\b(şok|flaş|bomba|olay yarattı|son dakika|inanılmaz|herkes şaşırdı)\b", re.IGNORECASE)
TURKIYE_YER = re.compile(
    r"turkey|türkiye|turkiye|balıkesir|balikesir|ayvalık|ayvalik|edremit|bandırma|bandirma|burhaniye|gönen|"
    r"gonen|erdek|cunda|karesi|altıeylül|susurluk|bigadiç|manyas|marmara|istanbul|ankara|izmir|bursa|"
    r"çanakkale|canakkale|anatolia|anadolu|"
    # İlçe içi yer adları (Commons başlıkları ilçeyi yazmayabilir: "Plaj-Ören").
    r"ören|sarımsaklı|sarimsakli|şeytan sofrası|seytan sofrasi|badavut|akçay|akcay|altınoluk|altinoluk|"
    r"zeytinli|güre|kazdağ|kaz dağ|ida mountain", re.IGNORECASE)


def norm(s):
    s = str(s or "").replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    s = unicodedata.normalize("NFD", s.replace("İ", "i").replace("I", "ı").lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").replace("ı", "i")
    return re.sub(r"\s+", " ", s).strip()


CARPAN = {"bin": 1_000, "milyon": 1_000_000, "milyar": 1_000_000_000}


def degerler(s):
    """Metindeki sayıları değer olarak çıkarır: '179 bin 779' = '179.779' =
    179779; '6,5' = 6.5. Biçim farkı uydurma sayılmaz, ayrı kuralda raporlanır."""
    s = str(s or "")
    out = set()
    for m in re.finditer(r"(\d+(?:[.,]\d+)*)\s*(milyar|milyon|bin)(?:\s+(\d{1,3}))?", s, re.IGNORECASE):
        taban = float(m.group(1).replace(".", "").replace(",", "."))
        out.add(round(taban * CARPAN[m.group(2).lower()] + (int(m.group(3)) if m.group(3) else 0), 3))
    for m in re.finditer(r"\d+(?:[.,]\d+)*", s):
        g = m.group(0)
        if re.fullmatch(r"\d{1,3}(?:\.\d{3})+", g):
            out.add(float(g.replace(".", "")))
        else:
            out.add(float(g.replace(".", "").replace(",", ".")) if "," in g else float(g.replace(".", "")))
            if "," in g:  # 12.270,45 -> 12270 (kapakta tam kısım yazılabilir)
                out.add(float(g.split(",")[0].replace(".", "")))
            for parca in re.split(r"[.,]", g):
                out.add(float(parca))
    # Yazıyla sayılar ve sıra sayıları: "dört ilçe", "beş yıllık", "birincilik".
    n = norm(s)
    for kelime, deger in SAYI_ADLARI.items():
        if re.search(r"\b" + kelime, n):
            out.add(float(deger))
    return out


SAYI_ADLARI = {"bir": 1, "iki": 2, "uc": 3, "dort": 4, "bes": 5, "alti": 6, "yedi": 7, "sekiz": 8,
               "dokuz": 9, "on ": 10, "birinci": 1, "ikinci": 2, "ucuncu": 3, "dorduncu": 4, "besinci": 5}


def haber_metni(n):
    govde = n.get("body") or ""
    if isinstance(govde, list):
        govde = " ".join(govde)
    return " ".join([n.get("title") or "", n.get("excerpt") or "", govde])


def denetle(haberler):
    plan = {h["slug"]: h for h in json.load(open(PLAN, encoding="utf-8"))}
    yayinda = {n["slug"]: n for n in haberler if n.get("status") == "published" and n.get("slug")}
    bulgular, ozet = [], {}

    def ekle(slug, kural, ciddiyet, aciklama):
        bulgular.append({"slug": slug, "kural": kural, "ciddiyet": ciddiyet, "aciklama": aciklama})
        ozet[kural] = ozet.get(kural, 0) + 1

    yerel_kare = yabanci_kare = 0
    for slug, n in yayinda.items():
        h = plan.get(slug)
        baslik = n.get("title") or ""
        # Haber yazım kuralları (canlı başlık).
        if not 55 <= len(baslik) <= 95:
            ekle(slug, "baslik_uzunlugu", "dusuk", f"{len(baslik)} karakter (kural 55-95)")
        # Alıntı içindeki soru işareti (ör. sporcunun sözü) başlık dili sayılmaz.
        alintisiz = re.sub(r"['‘’\"“”][^'‘’\"“”]+['‘’\"“”]", "", baslik)
        if re.search(r"[!?]", alintisiz) or TIK_TUZAGI.search(alintisiz):
            ekle(slug, "tik_tuzagi_dili", "yuksek", baslik)
        for k in YASAK_KLISE:
            if norm(k) in norm(haber_metni(n)):
                ekle(slug, "yasak_klise", "orta", f'"{k}"')
        if len((n.get("excerpt") or "")) and not 100 <= len(n.get("excerpt") or "") <= 300:
            ekle(slug, "spot_uzunlugu", "dusuk", f"{len(n.get('excerpt') or '')} karakter (kural 140-260)")
        # Kapak kuralları.
        if not h:
            ekle(slug, "kapak_plani_yok", "yuksek", "yayımlanmış haberin kapak planı yok")
            continue
        for yol, ad in ((f"public/assets/haber-kapak/{slug}.webp", "kapak"),
                        (f"public/assets/haber-kapak/{slug}-foto.webp", "metinsiz kart"),
                        (f"public/assets/sosyal-kart/{slug}.jpg", "sosyal kart")):
            if not os.path.exists(os.path.join(KOK, yol)):
                ekle(slug, "dosya_eksik", "yuksek", f"{ad} yok: {yol}")
        if norm(h.get("baslik")) != norm(baslik):
            ekle(slug, "kapak_basligi_farkli", "orta", f'kapak: "{h.get("baslik")}" | haber: "{baslik}"')
        v = h.get("vurgu") or {}
        metin = haber_metni(n)
        istenen = degerler(re.sub(r"(\d)\.(?=\s|$)", r"\1", v.get("deger") or ""))  # "1." sıra sayısı
        if istenen and not istenen & degerler(metin):
            ekle(slug, "vurgu_rakami_kaynakta_yok", "yuksek", f'vurgu "{v.get("deger")}" metindeki hiçbir sayıyla eşleşmiyor')
        elif istenen and str(v.get("deger") or "") and not any(
                p in metin for p in re.findall(r"\d+(?:[.,]\d+)*", v.get("deger") or "")):
            ekle(slug, "vurgu_bicimi_kaynaktan_farkli", "dusuk", f'kapak "{v.get("deger")}" (metindeki yazım farklı)')
        # Kapak metni (sarı bant, kırmızı kutu, beyaz/sarı satırlar) haberde
        # olmayan bir sayı taşıyamaz; Sabah Masası yazdığında da aynı kapı.
        for alan, deger in (h.get("kapak_metni") or {}).items():
            sayilar = degerler(re.sub(r"(\d)\.(?=\s|$)", r"\1", str(deger or "")))
            if sayilar and not sayilar <= degerler(metin):
                eksik_sayi = sorted(sayilar - degerler(metin))
                ekle(slug, "kapak_metni_rakami_kaynakta_yok", "yuksek", f'{alan}: "{deger}" (metinde yok: {eksik_sayi})')
        t = h.get("temsili")
        if t:
            # Atıf yalnız CC BY / BY-SA'da zorunlu; CC0 ve kamu malında yazar boş olabilir.
            gerekli = ("kaynak_url", "lisans") if t.get("lisans") in ("cc0", "pdm") else ("yazar", "kaynak_url", "lisans")
            eksik = [k for k in gerekli if not t.get(k)]
            if eksik:
                ekle(slug, "temsili_kunye_eksik", "yuksek", "eksik: " + ", ".join(eksik))
            if TURKIYE_YER.search((t.get("baslik") or "") + " " + (t.get("kaynak_url") or "")):
                yerel_kare += 1
            else:
                yabanci_kare += 1
                if n.get("kategori_anahtari") == "balikesir":
                    ekle(slug, "yerel_habere_yabanci_temsili_kare", "orta",
                         f'Balıkesir haberi, kare: "{(t.get("baslik") or "")[:70]}"')
    return {"haber": len(yayinda), "plan": len(plan), "temsili_yerel_kare": yerel_kare,
            "temsili_yabanci_kare": yabanci_kare, "ozet": ozet, "bulgular": bulgular}


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 0
    d = json.load(open(sys.argv[1], encoding="utf-8"))
    rapor = denetle(d["items"] if isinstance(d, dict) else d)
    print(f"Yayında {rapor['haber']} haber, planda {rapor['plan']} kapak.")
    print(f"Temsili kareler: {rapor['temsili_yerel_kare']} Türkiye/Balıkesir, {rapor['temsili_yabanci_kare']} yabancı/genel.")
    for kural, sayi in sorted(rapor["ozet"].items(), key=lambda x: -x[1]):
        print(f"  {sayi:4} × {kural}")
    if "--json" in sys.argv:
        with open(sys.argv[sys.argv.index("--json") + 1], "w", encoding="utf-8") as f:
            json.dump(rapor, f, ensure_ascii=False, indent=1)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
