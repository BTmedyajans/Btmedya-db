#!/usr/bin/env python3
"""BTMEDYA otomatik kapak üreticisi (10 Ekim, kullanıcı isteği: "tüm üretim
işlemlerini otomatik yapacak bir sistem").

NEDEN
Worker (Cloudflare) Python/Pillow çalıştıramadığı için Sabah Masası ve
Autopilot otomatik yayınladığında haberin gerçek kapağı üretilemiyor; kart
genel kategori plakası gösteriyor (kapakSec, src/worker.js). Bu betik canlı
yayın akışından kapaksız haberleri bulur, her birine plan girişi yazar ve
kapak üreticisini (haber-kapagi.py) çağırır. GitHub Actions'ta zamanlı çalışır
ve üretilen kapakları main'e commit eder; Workers Builds dağıtınca kapakSec
otomatik gerçek kapağı servis eder (D1 yazımı gerekmez).

DOĞRULUK
vurgu rakamı YALNIZ haberin başlığında/özetinde geçen bir sayıdan alınır
(uydurma yok). Güvenilir bir sayı yoksa vurgu boş bırakılır; kapak o zaman
editoryal zemin + kırmızı başlık olur. Kategori etiketi haberin kendi
kategorisidir.

Çalıştır:
  python3 tools/kapak-otomasyonu.py              canlı akıştan üret
  python3 tools/kapak-otomasyonu.py --kaynak <url>   başka bir /api/news ucu
"""
import json
import os
import re
import subprocess
import sys
import urllib.request

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLAN = os.path.join(KOK, "public", "data", "haber-kapak-plani.json")
VARSAYILAN_KAYNAK = "https://btmedya.com.tr/api/news?limit=400&ozet=1"
PLAKA = re.compile(r"/assets/kategori-kapak/")

AYLAR = ["", "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz",
         "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"]

# Sayıyı bir birimle birlikte yakala: "9 milyon", "137 çeşit", "13 bin lira",
# "337 kez", "yüzde 24", "%86,6", "3-1". Birim listesi haber dilinden; birimsiz
# çıplak sayı (ör. tarih parçası) alınmaz, yanlış vurgu üretmesin.
BIRIMLER = (r"milyar|milyon|bin|çeşit|kez|kişi|lira|tl|₺|gün|saat|yıl|ay|"
            r"hafta|ton|kg|metre|km|adet|proje|il|ilçe|puan|derece|dakika|yüzde")
SAYI_DESENLERI = [
    re.compile(r"%\s?\d+(?:[.,]\d+)?"),
    re.compile(r"\byüzde\s+\d+(?:[.,]\d+)?", re.IGNORECASE),
    re.compile(r"\b\d{1,3}(?:[.\s]\d{3})*\s+(?:" + BIRIMLER + r")\b", re.IGNORECASE),
    re.compile(r"\b\d+\s+(?:" + BIRIMLER + r")\b", re.IGNORECASE),
    re.compile(r"\b\d+\s?[-–]\s?\d+\b"),  # skor: 3-1
]


def vurgu_bul(metin):
    """Başlık/özetten en güçlü sayı ifadesini döndürür; yoksa ''."""
    for desen in SAYI_DESENLERI:
        m = desen.search(metin or "")
        if m:
            deger = re.sub(r"\s+", " ", m.group(0)).strip()
            return deger[:14]
    return ""


def tarih_tr(iso):
    m = re.match(r"(\d{4})-(\d{2})-(\d{2})", str(iso or ""))
    if not m:
        return ""
    y, ay, g = int(m.group(1)), int(m.group(2)), int(m.group(3))
    return f"{g} {AYLAR[ay]} {y}"


def akis_oku(url):
    req = urllib.request.Request(url, headers={"Accept": "application/json",
                                               "User-Agent": "BTMEDYA-kapak-otomasyonu"})
    with urllib.request.urlopen(req, timeout=30) as r:
        d = json.load(r)
    if isinstance(d, list):
        return d
    for k in ("haberler", "news", "items", "sonuclar"):
        if isinstance(d.get(k), list):
            return d[k]
    return []


def main():
    kaynak = VARSAYILAN_KAYNAK
    if "--kaynak" in sys.argv:
        kaynak = sys.argv[sys.argv.index("--kaynak") + 1]

    with open(PLAN, encoding="utf-8") as f:
        plan = json.load(f)
    mevcut = {h["slug"] for h in plan}

    haberler = akis_oku(kaynak)
    yeni = []
    for h in haberler:
        slug = (h.get("slug") or "").strip()
        if not slug or slug in mevcut:
            continue
        cover = str(h.get("cover_url") or h.get("kapak") or h.get("cover") or "")
        # Zaten gerçek kapağı olan (plan dışı ama /assets/haber-kapak/) atlanır.
        if cover and not PLAKA.search(cover) and "/assets/haber-kapak/" in cover:
            continue
        baslik = (h.get("title") or h.get("baslik") or "").strip()
        if not baslik:
            continue
        kategori = (h.get("category") or h.get("kategori") or "Gündem").strip()
        deger = vurgu_bul(baslik + " " + (h.get("excerpt") or h.get("ozet") or ""))
        kayit = {
            "slug": slug,
            "baslik": baslik,
            "kategori": kategori,
            "altbilgi": "BTMEDYA · " + (tarih_tr(h.get("published_at") or h.get("tarih")) or "Haber Merkezi"),
            "imza": "BTMEDYA HABER MERKEZİ",
        }
        if deger:
            kayit["vurgu"] = {"deger": deger, "etiket": ""}
        plan.append(kayit)
        mevcut.add(slug)
        yeni.append(slug)

    if not yeni:
        print("Kapaksız haber yok; plan güncel.")
        return 0

    with open(PLAN, "w", encoding="utf-8") as f:
        json.dump(plan, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print(f"{len(yeni)} yeni plan girişi eklendi:")
    for s in yeni:
        print("  +", s)

    # Kapakları üret (yalnız yeni slug'lar; kaynagi.json tüm plandan yazılır).
    cmd = [sys.executable, os.path.join(KOK, "tools", "haber-kapagi.py"), *yeni]
    return subprocess.run(cmd, check=False).returncode


if __name__ == "__main__":
    raise SystemExit(main())
