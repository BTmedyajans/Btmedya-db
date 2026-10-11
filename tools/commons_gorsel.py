#!/usr/bin/env python3
"""Wikimedia Commons'tan haberle ilgili, lisanslı temsili fotoğraf bulur.

NEDEN (10 Ekim, kullanıcı isteği: "görsellerde haberde geçen kişi ya da
kurumlar ya da haber ile ilgili görseller"): kapak denetimi 142 temsili
karenin 117'sinin yabancı/genel olduğunu gösterdi; Balıkesir Tarım Fuarı
haberinde İngiltere'deki bir fuarın traktörü, Ayvalık sahil temizliğinde
Somali'deki bir etkinlik vardı. Bu modül haberin yerine (ilçe/Balıkesir)
bağlı kare arar.

KURALLAR
  - Yalnız serbest lisans: CC0, kamu malı, CC BY, CC BY-SA. Yazar, lisans ve
    kaynak adresi künyeye girer (haber-kapagi.py kunye_satiri).
  - Yer adı aynı olan başka yer elenir: "Edremit" araması Van'daki Edremit'i
    de getirir; açıklamada/başlıkta Van geçen kare alınmaz.
  - Harita, şema, logo, konum işaretli dosyalar alınmaz.
  - Kare her zaman TEMSİLİ etiketlidir; haberdeki olayın fotoğrafı değildir.
API, çıkış IP'sine göre hız sınırlıdır; GitHub Actions'ta doğrudan çalışır.
"""
import html
import json
import re
import urllib.parse
import urllib.request

UA = "BTMEDYA-kapak-bot/1.0 (https://btmedya.com.tr/iletisim/)"
API = "https://commons.wikimedia.org/w/api.php"
LISANS_IZIN = re.compile(r"^(cc0|public domain|pd|cc by(-sa)? \d(\.\d)?)", re.IGNORECASE)
DOSYA_YASAK = re.compile(r"\b(map|harita|location|locator|district|logo|flag|bayrak|diagram|şema|seal|coat of arms|"
                         r"arma|svg|png)\b", re.IGNORECASE)
BASKA_YER = {"edremit": re.compile(r"\bvan\b", re.IGNORECASE)}


def sorgu_adresi(sorgu, limit=12, genislik=1600):
    p = {
        "action": "query", "generator": "search", "gsrsearch": f"{sorgu} filetype:bitmap",
        "gsrnamespace": "6", "gsrlimit": str(limit), "prop": "imageinfo",
        "iiprop": "url|size|extmetadata|mime", "iiurlwidth": str(genislik),
        "iiextmetadatafilter": "LicenseShortName|LicenseUrl|Artist|ImageDescription",
        "format": "json", "formatversion": "2",
    }
    return API + "?" + urllib.parse.urlencode(p)


def getir(adres):
    req = urllib.request.Request(adres, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def duz(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", str(s or "")))).strip()


def adaylar(yanit):
    """API yanıtından künyeli aday listesi."""
    out = []
    for p in (yanit.get("query") or {}).get("pages") or []:
        ii = (p.get("imageinfo") or [{}])[0]
        em = ii.get("extmetadata") or {}
        out.append({
            "baslik": re.sub(r"^File:|\.[A-Za-z]+$", "", p.get("title") or "").strip(),
            "url": ii.get("thumburl") or ii.get("url"),
            "genislik": ii.get("width") or 0, "yukseklik": ii.get("height") or 0,
            "mime": ii.get("mime") or "",
            "lisans": duz((em.get("LicenseShortName") or {}).get("value")),
            "lisans_url": duz((em.get("LicenseUrl") or {}).get("value")),
            "yazar": duz((em.get("Artist") or {}).get("value"))[:80],
            "aciklama": duz((em.get("ImageDescription") or {}).get("value"))[:300],
            "kaynak_url": ii.get("descriptionshorturl") or ii.get("descriptionurl"),
        })
    return out


def uygun(a, yer=""):
    if a["mime"] not in ("image/jpeg",):
        return False
    if not LISANS_IZIN.match(a["lisans"] or ""):
        return False
    if not a["yazar"] or not a["kaynak_url"]:
        return False
    if DOSYA_YASAK.search(a["baslik"]):
        return False
    if a["genislik"] < 1000 or a["genislik"] < a["yukseklik"]:  # yatay, yeterli çözünürlük
        return False
    metin = f"{a['baslik']} {a['aciklama']}"
    for ad, desen in BASKA_YER.items():
        if ad in (yer or "").lower() and desen.search(metin):
            return False
    return True


def puan(a, anahtarlar):
    metin = f"{a['baslik']} {a['aciklama']}".lower()
    p = sum(3 for k in anahtarlar if k and k.lower() in metin)
    p += 1 if "balıkesir" in metin or "balikesir" in metin or "aegean" in metin else 0
    p += min(a["genislik"], 4000) / 4000
    return p


def en_iyi(yanit, yer="", anahtarlar=()):
    aday = [a for a in adaylar(yanit) if uygun(a, yer)]
    aday.sort(key=lambda a: -puan(a, anahtarlar or (yer,)))
    return aday


def lisans_kodu(lisans):
    """'CC BY-SA 4.0' -> ('by-sa', '4.0'); kamu malı/CC0 -> ('pd', '')."""
    m = re.match(r"cc (by(?:-sa)?) (\d(?:\.\d)?)", (lisans or "").lower())
    if m:
        return m.group(1), m.group(2)
    return ("cc0" if "cc0" in (lisans or "").lower() else "pdm"), ""


def temsili_kaydi(a, dosya, odak=0.4, rozet="temsili"):
    """haber-kapak-plani.json 'temsili' alanı (haber-kapagi.py ile aynı şema).
    rozet: haberde adı geçen yerin/kişinin kendi karesi "arsiv" (künyede
    ARŞİV FOTOĞRAFI), konuyu anlatan genel kare "temsili"."""
    kod, surum = lisans_kodu(a["lisans"])
    return {"dosya": dosya, "baslik": a["baslik"], "yazar": a["yazar"], "kaynak": "Wikimedia Commons",
            "kaynak_url": a["kaynak_url"], "lisans": kod, "lisans_surum": surum,
            "lisans_url": a["lisans_url"], "odak": odak, "rozet": rozet}


def indir(a, hedef):
    req = urllib.request.Request(a["url"], headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r, open(hedef, "wb") as f:
        f.write(r.read())
    return hedef
