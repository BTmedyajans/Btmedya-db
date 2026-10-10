#!/usr/bin/env python3
"""BTMEDYA marka kiti: projede tanimli olculerde tasarim sablonlari.

NEDEN
Sitede dort ayri renk dili vardi (marka sisteminde lime, anasayfada
camgobegi, haber bandinda kirmizi, logoda altin) ve kapak/sosyal kart
olculeri yalnizca kodun icinde yaziliydi (worker.js SITE_SLOTS,
PLATFORM_RULES, haber-kapagi.py). Bu betik tek dogruluk kaynagi olan
public/data/marka-kiti.json dosyasini yazar ve her olcu icin manset
dilinde ornek sablon uretir. Sablonlar ornek metin tasir ve ustlerinde
"SABLON" yazar; haber gibi dolasima girmesinler.

Kullanim: python3 tools/marka-kiti.py
Cikti:    public/assets/marka-kiti/*.jpg,
          public/data/marka-kiti.json, public/marka-kiti/index.html
"""
import importlib.util, json, os

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_spec = importlib.util.spec_from_file_location("kapak", os.path.join(KOK, "tools", "haber-kapagi.py"))
kapak = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(kapak)

# Renkler rolleriyle. Degerler sitede ve kapak aracinda kullanilanlardir;
# altin logodan olculdu (btmedya-logo-yatay-negatif.png baskin ton).
RENKLER = [
    {"ad": "Gece Siyahı", "hex": "#050607", "rol": "Site zemini, metin üstü koyu yüzey", "kaynak": "btmedya-brand-system.css --bt-brand-bg"},
    {"ad": "Kâğıt Beyazı", "hex": "#F4F7F8", "rol": "Ana metin, başlık", "kaynak": "--bt-brand-ink"},
    {"ad": "Haber Kırmızısı", "hex": "#E3141B", "rol": "Kategori şeridi, SON DAKİKA, uyarı", "kaynak": "haber-kapagi.py KIRMIZI_M"},
    {"ad": "Manşet Sarısı", "hex": "#FFD400", "rol": "Olgu etiketi, vurgu satırı, rakam", "kaynak": "haber-kapagi.py SARI_M"},
    {"ad": "Stüdyo Laciverti", "hex": "#0A2E70", "rol": "Manşet zemini, grafik kart", "kaynak": "haber-kapagi.py LACIVERT"},
    {"ad": "BT Altını", "hex": "#E3A436", "rol": "Logo ve Prodüksiyon sesi (sinema kapağı çizgi ve rozetleri); haber kapağında kullanılmaz", "kaynak": "logodan ölçüldü"},
    {"ad": "Sinyal Camgöbeği", "hex": "#35D6FF", "rol": "Site bağlantısı, birincil düğme", "kaynak": "home.css --cyan"},
    {"ad": "Canlı Lime", "hex": "#D9FF3F", "rol": "Ajans vurgusu, canlı nokta, AI ÜRETİMİ çipi; haber kapağında kullanılmaz", "kaynak": "--bt-brand-accent"},
    {"ad": "Sentez Moru", "hex": "#8B5CFF", "rol": "AI LAB sesi: kategori çipi, ızgara ve ışık; yalnız AI üretimi işlerde", "kaynak": "btmedya-brand-system.css --bt-ses-ai"},
    {"ad": "Film Kremi", "hex": "#F3E9D2", "rol": "Prodüksiyon sesi: sinema kapağı başlığı (Gece Siyahı üstünde)", "kaynak": "btmedya-brand-system.css --bt-ses-film"},
]

TIPOGRAFI = [
    {"ad": "Anton", "kullanim": "Yalnız giriş filmi başlığı; haber kapaklarında yerini Big Shoulders aldı", "lisans": "SIL OFL 1.1"},
    {"ad": "Bricolage Grotesque", "kullanim": "Site büyük başlıkları (display)", "lisans": "SIL OFL 1.1"},
    {"ad": "Space Grotesk", "kullanim": "Kart başlığı, alan adı imzası", "lisans": "SIL OFL 1.1"},
    {"ad": "Manrope", "kullanim": "Gövde metni, künye, açıklama", "lisans": "SIL OFL 1.1"},
    {"ad": "JetBrains Mono", "kullanim": "Üst etiket (kicker), kaynak ve durum etiketleri", "lisans": "SIL OFL 1.1"},
    {"ad": "Unbounded 800", "kullanim": "Marka sesi: SAHADAN EKRANA gibi marka cümleleri, paylaşım görseli, kanal kapağı", "lisans": "SIL OFL 1.1"},
    {"ad": "Big Shoulders Display 900", "kullanim": "Haber sesi: haber kapağı, sosyal kart ve kategori plakası başlığı; video kapağında TV alt bandı (BÜYÜK HARF)", "lisans": "SIL OFL 1.1"},
    {"ad": "Fraunces 900 İtalik", "kullanim": "Prodüksiyon sesi: film ve klip adı, sinema afişi başlığı", "lisans": "SIL OFL 1.1"},
    {"ad": "Archivo Black", "kullanim": "Reklam sesi: ürün ve marka filmi başlığı", "lisans": "SIL OFL 1.1"},
    {"ad": "Syne 800", "kullanim": "AI LAB sesi: geniş, fütüristik başlık (renk kaymalı)", "lisans": "SIL OFL 1.1"},
    {"ad": "Instrument Serif İtalik", "kullanim": "Editoryal vurgu: alt başlık, alıntı, imza cümlesi", "lisans": "SIL OFL 1.1"},
]

# Görsel Kimlik 2.0: tek marka, dört içerik sesi. Kapak türü başlık
# okunmadan anlaşılsın diye her kategori kendi yazı tipi, rengi ve
# kompozisyonuyla gelir. Örnekler sitedeki gerçek YouTube kapaklarıdır.
KAPAK_DILLERI = [
    {"ad": "Haber & Saha", "font": "Big Shoulders Display 900", "renkler": ["Haber Kırmızısı", "Manşet Sarısı"],
     "kompozisyon": "Belgesel renk ayarı, TV alt bandı: sarı yer şeridi + kırmızı başlık bandı; kişi kesilip öne alınabilir.",
     "ornek": "/assets/portfoy-youtube/kpxTyrsBTuw.webp"},
    {"ad": "Prodüksiyon", "font": "Fraunces 900 İtalik", "renkler": ["BT Altını", "Film Kremi"],
     "kompozisyon": "Sinemaskop şeritleri, sıcak altın ayar, film greni; 'BİR BTMEDYA YAPIMI' üst başlığı.",
     "ornek": "/assets/portfoy-youtube/ffsnWWZupcY.webp"},
    {"ad": "Reklam & Tanıtım", "font": "Archivo Black", "renkler": ["Sinyal Camgöbeği", "Kâğıt Beyazı"],
     "kompozisyon": "Açık zemin, yuvarlak köşeli ürün kartı, camgöbeği vurgu çizgisi; temiz ve ticari.",
     "ornek": "/assets/portfoy-youtube/k6yTp16e22w.webp"},
    {"ad": "AI LAB", "font": "Syne 800", "renkler": ["Sentez Moru", "Canlı Lime"],
     "kompozisyon": "Koyu ızgara, mor ışık, renk kaymalı başlık, lime konturlu özne; kapakta AI ÜRETİMİ çipi zorunlu.",
     "ornek": "/assets/portfoy-youtube/hsuPlVIZ7zw.webp"},
]

ETIKETLER = [
    {"etiket": "GERÇEK ÇEKİM", "ne_zaman": "BTMEDYA'nın kendi kamerasıyla çekilmiş, katalogda gercek:true işaretli kare."},
    {"etiket": "AI ÜRETİMİ", "ne_zaman": "Yapay zekâ ile üretilmiş her görsel/video. Kaynak bilinmiyorsa varsayılan budur."},
    {"etiket": "TEMSİLİ FOTOĞRAF", "ne_zaman": "Olayın kendisini göstermeyen lisanslı genel kare; künye (yazar, kaynak, lisans) karede yazar."},
    {"etiket": "ARŞİV FOTOĞRAFI", "ne_zaman": "Haberde adı geçen kişi ya da yerin daha önce çekilmiş, lisanslı karesi."},
    {"etiket": "BTMEDYA GRAFİK", "ne_zaman": "Fotoğraf içermeyen bilgi/manşet kartı. Ne AI ne gerçek çekim diye etiketlenir."},
]

# Olculer: kaynaklari koddadir; bu liste onlari tek yerde toplar.
OLCULER = [
    {"ad": "Haber kapağı", "w": 1200, "h": 675, "oran": "16:9", "kaynak": "tools/haber-kapagi.py", "dosya": "haber-kapagi-1200x675.jpg"},
    {"ad": "Sosyal kart (Instagram/Facebook akış)", "w": 1080, "h": 1350, "oran": "4:5", "kaynak": "tools/sosyal-kart.py · PLATFORM_RULES instagram-post", "dosya": "sosyal-kart-1080x1350.jpg"},
    {"ad": "Kare gönderi", "w": 1080, "h": 1080, "oran": "1:1", "kaynak": "PLATFORM_RULES instagram-post", "dosya": "kare-1080x1080.jpg"},
    {"ad": "Dikey: Reels, TikTok, Shorts, Hikâye", "w": 1080, "h": 1920, "oran": "9:16", "kaynak": "PLATFORM_RULES (Reels, TikTok, Shorts)", "dosya": "dikey-1080x1920.jpg"},
    {"ad": "YouTube kapak", "w": 1280, "h": 720, "oran": "16:9", "kaynak": "PLATFORM_RULES youtube", "dosya": "youtube-1280x720.jpg"},
    {"ad": "Paylaşım görseli (og:image)", "w": 1200, "h": 630, "oran": "1.91:1", "kaynak": "SITE_SLOTS og-image", "dosya": "og-1200x630.jpg"},
    {"ad": "Giriş filmi kapak karesi", "w": 1920, "h": 1080, "oran": "16:9", "kaynak": "SITE_SLOTS hero-poster", "dosya": "hero-1920x1080.jpg"},
]
# Fotograf yuvalari: sablon degil, gercek kare ister.
FOTO_YUVALARI = [
    {"ad": "Giriş filmi (video)", "w": 1920, "h": 1080, "not": "En fazla 30 sn. Dikey film de olur (1080x1920); site oranı kendisi algılar."},
    {"ad": "Sahada çalışırken kare", "w": 1600, "h": 900, "not": "Gerçek fotoğraf; mikrofonlu, iş başında."},
    {"ad": "Portre", "w": 1200, "h": 1500, "not": "Gerçek fotoğraf; yüz yapısı ve oranlar korunur, güzelleştirme yok."},
]

ORNEK = {
    "baslik": "Başlık buraya gelir: haberin kendi başlığı, en fazla dört satır",
    "kategori": "Gündem",
    "altbilgi": "ŞABLON · BTMEDYA marka kiti",
    "vurgu": {"deger": "RAKAM", "etiket": "haberin gerçek rakamı ve kısa açıklaması", "yer": "Balıkesir"},
}


def uret(w, h, cikti, kayit):
    eski = (kapak.W, kapak.H)
    kapak.W, kapak.H = w, h
    try:
        return kapak.manset_karti(kayit, cikti, bicim="JPEG")
    finally:
        kapak.W, kapak.H = eski


def e(t):
    return str(t).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def sayfa(veri):
    """public/marka-kiti/index.html: ayni veriden uretilir, elle duzenlenmez.
    Sitenin ortak katmanlari (menu, mobil tipografi, hareket) da sablondadir;
    elle eklenince bir sonraki uretimde kayboluyordu.
    Sayfada satir ici calisan betik yok (gerileme kurali 12); olcum.js var
    (kural 13)."""
    renk = "".join(
        f'<li class="renk"><span class="ornek" style="background:{r["hex"]}"></span>'
        f'<b>{e(r["ad"])}</b><code>{r["hex"]}</code><small>{e(r["rol"])}</small></li>' for r in veri["renkler"])
    tip = "".join(
        f'<li><span class="tip-ornek tip-{e(t["ad"].split()[0].lower())}">Balıkesir’den haber · ŞĞİÖÜÇ 0123</span>'
        f'<b>{e(t["ad"])}</b><small>{e(t["kullanim"])} · {e(t["lisans"])}</small></li>' for t in veri["tipografi"])
    etk = "".join(f'<li><span class="cip">{e(x["etiket"])}</span><p>{e(x["ne_zaman"])}</p></li>' for x in veri["etiketler"])
    olc = "".join(
        f'<li class="sablon"><a href="/assets/marka-kiti/{o["dosya"]}" target="_blank" rel="noopener">'
        f'<img src="/assets/marka-kiti/{o["dosya"]}" alt="{e(o["ad"])} şablonu, {o["w"]}×{o["h"]}" loading="lazy" width="{o["w"]}" height="{o["h"]}"></a>'
        f'<b>{e(o["ad"])}</b><small>{o["w"]}×{o["h"]} px · {o["oran"]}</small>'
        f'<a class="indir" href="/assets/marka-kiti/{o["dosya"]}" download>Şablonu indir ↓</a></li>' for o in veri["olculer"])
    ses = "".join(
        f'<li class="ses"><img src="{d["ornek"]}" alt="{e(d["ad"])} kapak örneği" loading="lazy" width="960" height="540">'
        f'<b class="tip-ornek tip-{e(d["font"].split()[0].lower())}">{e(d["ad"])}</b>'
        f'<small>{e(d["font"])} · {e(" + ".join(d["renkler"]))}</small><p>{e(d["kompozisyon"])}</p></li>' for d in veri["kapak_dilleri"])
    foto = "".join(f'<tr><td>{e(f["ad"])}</td><td>{f["w"]}×{f["h"]}</td><td>{e(f["not"])}</td></tr>' for f in veri["foto_yuvalari"])
    logo = "".join(
        f'<li class="{"koyu" if "negatif" in l or "daire" in l or "v5" in l else "acik"}"><img src="{l}" alt="BTMEDYA logo dosyası" loading="lazy">'
        f'<a href="{l}" download>{e(l.rsplit("/", 1)[1])} ↓</a></li>' for l in veri["logolar"])
    baslik = "BTMEDYA Marka Kiti | Logo, Renk, Yazı Tipi ve Şablon Ölçüleri"
    acik = "BTMEDYA marka kiti: logo dosyaları, renkler, yazı tipleri, kaynak etiketleri ve haber kapağı, sosyal kart, dikey video ile paylaşım görseli şablonları."
    return f'''<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{baslik}</title><meta name="description" content="{acik}">
<link rel="canonical" href="https://btmedya.com.tr/marka-kiti/"><link rel="icon" href="/assets/favicon.png">
<meta property="og:title" content="{baslik}"><meta property="og:description" content="{acik}"><meta property="og:image" content="https://btmedya.com.tr/assets/marka-kiti/og-1200x630.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="/assets/fonts/fonts.css"><link rel="stylesheet" href="/assets/fonts/marka2/marka2.css">
<script type="application/ld+json">{{"@context":"https://schema.org","@graph":[{{"@type":"WebPage","@id":"https://btmedya.com.tr/marka-kiti/#sayfa","url":"https://btmedya.com.tr/marka-kiti/","name":"{baslik}","description":"{acik}","inLanguage":"tr-TR","isPartOf":{{"@type":"WebSite","@id":"https://btmedya.com.tr/#website","url":"https://btmedya.com.tr/","name":"BTMEDYA"}},"publisher":{{"@type":"NewsMediaOrganization","@id":"https://btmedya.com.tr/#organization","name":"BTMEDYA","url":"https://btmedya.com.tr/"}},"breadcrumb":{{"@id":"https://btmedya.com.tr/marka-kiti/#breadcrumb"}}}},{{"@type":"BreadcrumbList","@id":"https://btmedya.com.tr/marka-kiti/#breadcrumb","itemListElement":[{{"@type":"ListItem","position":1,"name":"BTMEDYA","item":"https://btmedya.com.tr/"}},{{"@type":"ListItem","position":2,"name":"Marka Kiti","item":"https://btmedya.com.tr/marka-kiti/"}}]}}]}}</script>
<style>
@font-face{{font-family:Anton;src:url(/assets/fonts/anton.ttf) format('truetype');font-display:swap}}
:root{{--z:#050607;--y:#0b0f13;--m:#F4F7F8;--g:#96a3ad;--c:rgba(255,255,255,.12);--k:#E3141B;--s:#FFD400;--l:#0A2E70;--a:#35D6FF}}
*{{box-sizing:border-box}}html{{-webkit-text-size-adjust:100%}}body{{margin:0;background:var(--z);color:var(--m);font:400 16px/1.6 Manrope,Inter,Arial,sans-serif}}
a{{color:var(--a)}}header,main,footer{{width:min(1200px,100%);margin:auto;padding-left:16px;padding-right:16px}}
header{{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:64px;border-bottom:1px solid var(--c)}}
header>a{{display:inline-flex;align-items:center;min-height:44px}}header img{{height:30px;width:auto;display:block}}header nav a{{display:inline-flex;align-items:center;min-height:44px;padding:0 12px;color:var(--m);text-decoration:none;font-weight:700}}
.hero{{padding:56px 0 24px}}.ust{{font:700 12px/1.2 'JetBrains Mono',ui-monospace,monospace;letter-spacing:.14em;color:var(--s)}}
h1{{font:900 clamp(48px,12vw,118px)/.92 'BT Big Shoulders',Anton,Impact,sans-serif;text-transform:uppercase;margin:12px 0}}h1 span{{color:var(--s)}}
h2{{font:900 clamp(32px,6.4vw,56px)/1 'BT Big Shoulders',Anton,Impact,sans-serif;text-transform:uppercase;margin:0 0 6px}}
section{{padding:40px 0;border-top:1px solid var(--c)}}section>p{{color:var(--g);max-width:62ch;margin:0 0 20px}}
ul{{list-style:none;margin:0;padding:0}}.izgara{{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(min(100%,240px),1fr))}}
.renk,.izgara>li{{background:var(--y);border:1px solid var(--c);border-radius:14px;padding:14px;display:grid;gap:4px}}
.ornek{{display:block;height:88px;border-radius:10px;border:1px solid var(--c)}}code{{font:600 14px 'JetBrains Mono',monospace;color:var(--s)}}small{{color:var(--g);font-size:14px}}
.logo li{{place-items:center;text-align:center}}.logo li.acik{{background:#F4F7F8}}.logo li.acik a{{color:#0A2E70}}.logo img{{max-width:100%;height:72px;object-fit:contain}}
.logo a,.indir{{display:inline-flex;align-items:center;min-height:44px;font-weight:700}}
.tip li{{background:var(--y);border:1px solid var(--c);border-radius:14px;padding:16px;display:grid;gap:4px;margin-bottom:12px}}
.tip-ornek{{font-size:clamp(22px,4.5vw,34px);line-height:1.15;overflow-wrap:anywhere}}.tip-anton{{font-family:Anton,Impact;text-transform:uppercase}}.tip-bricolage{{font-family:'Bricolage Grotesque';font-weight:800}}.tip-space{{font-family:'Space Grotesk';font-weight:700}}.tip-manrope{{font-family:Manrope}}.tip-jetbrains{{font-family:'JetBrains Mono';font-size:clamp(16px,3.4vw,24px)}}.tip-unbounded{{font-family:'BT Unbounded';font-weight:800}}.tip-big{{font-family:'BT Big Shoulders';font-weight:900;text-transform:uppercase}}.tip-fraunces{{font-family:'BT Fraunces';font-style:italic;font-weight:900}}.tip-archivo{{font-family:'BT Archivo Black'}}.tip-syne{{font-family:'BT Syne';font-weight:800}}.tip-instrument{{font-family:'BT Instrument Serif';font-style:italic}}
.sesler{{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(min(100%,280px),1fr))}}.ses{{background:var(--y);border:1px solid var(--c);border-radius:14px;padding:14px;display:grid;gap:6px;align-content:start}}.ses img{{width:100%;height:auto;aspect-ratio:16/9;border-radius:10px;display:block}}.ses p{{margin:0;color:var(--g);font-size:15px}}
.etiket li{{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;align-items:start;padding:12px 0;border-bottom:1px solid var(--c)}}.etiket p{{margin:0;color:var(--g)}}
.cip{{font:700 12px/1 'JetBrains Mono',monospace;letter-spacing:.06em;padding:8px 10px;border-radius:6px;background:rgba(0,0,0,.6);border:1px solid var(--c);white-space:nowrap}}
.kural{{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))}}.kural>div{{border-radius:14px;padding:18px;border:1px solid var(--c)}}
.evet{{background:rgba(53,214,255,.07)}}.hayir{{background:rgba(227,20,27,.09)}}.kural h3{{margin:0 0 8px;font:800 18px Manrope}}.kural li{{margin:6px 0 6px 18px;list-style:disc}}
.sablon img{{width:100%;height:auto;border-radius:10px;background:#000;display:block}}.sablon{{align-content:start}}
.tablo{{overflow-x:auto}}table{{width:100%;border-collapse:collapse}}td,th{{text-align:left;padding:12px 10px;border-bottom:1px solid var(--c);vertical-align:top}}th{{color:var(--g);font-weight:600}}
footer{{padding:32px 16px 96px;color:var(--g);font-size:14px;border-top:1px solid var(--c)}}footer a{{display:inline-flex;align-items:center;min-height:44px}}
@media (prefers-reduced-motion:reduce){{*{{transition:none!important}}}}
</style><link rel="stylesheet" href="/site-motion-v2.css?v=20261005-1"><link rel="stylesheet" href="/mobil-tipografi.css?v=20261006-1"><link rel="stylesheet" href="/kategori-menu.css?v=20261006-1"><script src="/kategori-menu.js?v=20261006-1" defer></script>
</head><body>
<header><a href="/" aria-label="BTMEDYA ana sayfa"><img src="/assets/logo/btmedya-logo-yatay-v4-negatif.webp" alt="BTMEDYA" width="172" height="37"></a><nav aria-label="Marka kiti"><a href="/basin-kiti/">Basın kiti</a><a href="/teklif-al/?kaynak=/marka-kiti/">Teklif al</a></nav></header>
<main id="icerik">
<div class="hero"><p class="ust">BTMEDYA · MARKA KİTİ · SÜRÜM {veri["surum"]}</p><h1>Tek marka,<br><span>dört ses.</span></h1><p>Haber kapağından sosyal karta, dikey videodan paylaşım görseline kadar BTMEDYA'nın görsel dili. Değerler sitede ve kapak araçlarında kullanılanlardır; ölçüler projenin kendi tanımlarından gelir.</p></div>
<section aria-labelledby="logo"><h2 id="logo">Logo</h2><p>Ana logo amblem + MEDYA kilididir; altın tonlarında, şeffaf zeminli tek dosya koyu ve açık zeminde kullanılır. Tam logo (slogan dahil) büyük alanlarda, amblem simge ve profil görsellerinde kullanılır; son dosya kaynak logonun orijinal renkleridir. Logonun çevresinde en az logo yüksekliğinin yarısı kadar boşluk bırakılır; dijitalde en küçük yükseklik 24 px. Logo eğilmez, gölge ya da başka renk eklenmez, fotoğrafın meşgul bir alanına konmaz; manşet kapaklarında sağ üstteki beyaz plaka kullanılır.</p><ul class="izgara logo">{logo}</ul></section>
<section aria-labelledby="ses"><h2 id="ses">İçerik sesleri</h2><p>Görsel Kimlik 2.0: kapak, başlık okunmadan türünü söyler. Her içerik türünün kendi yazı tipi, rengi ve kompozisyonu var; logo, sağ üst plaka ve kaynak etiketi hepsinde aynı kalır. YouTube kapaklarında sağ alt köşe süre rozeti için boş bırakılır.</p><ul class="sesler">{ses}</ul></section>
<section aria-labelledby="renk"><h2 id="renk">Renkler</h2><p>Haber dili kırmızı, sarı ve lacivert; ajans ve site dili siyah, camgöbeği ve lime. Altın logoda ve Prodüksiyon sesinde, mor yalnız AI LAB işlerinde. Lime haber kapağında kullanılmaz.</p><ul class="izgara">{renk}</ul></section>
<section aria-labelledby="tip"><h2 id="tip">Yazı tipleri</h2><p>Tamamı açık lisanslı (SIL OFL 1.1). Türkçe karakterlerin tamamı desteklenir. İçerik seslerinin yazı tipleri sitede barındırılır (/assets/fonts/marka2/, lisans metniyle).</p><ul class="tip">{tip}</ul></section>
<section aria-labelledby="etiket"><h2 id="etiket">Kaynak etiketleri</h2><p>Her görselin üzerinde kaynağı yazar; etiket görselle birlikte dolaşsın diye karenin içine basılır. Kaynak bilinmiyorsa etiket AI ÜRETİMİ'dir.</p><ul class="etiket">{etk}</ul></section>
<section aria-labelledby="dil"><h2 id="dil">Manşet kapak dili</h2><p>Görsel dil ulusal ve yerel haber kanallarının paylaşım kartlarından gelir; editoryal kurallar BTMEDYA'nındır.</p>
<div class="kural"><div class="evet"><h3>Yapılır</h3><ul><li>Kapakta haberin kendi başlığı yazar, BÜYÜK HARF ve dar yazı tipiyle.</li><li>Sarı etiket haberin metninde geçen gerçek rakamı taşır.</li><li>Kırmızı şeritte kategori ve yer yazar.</li><li>Temsilî fotoğrafın yazarı, kaynağı ve lisansı karede yazar.</li><li>Kişi fotoğrafı yalnız o kişi haberin öznesiyse ve kare BTMEDYA'nın ya da lisanslıysa kullanılır.</li></ul></div>
<div class="hayir"><h3>Yapılmaz</h3><ul><li>Neyin açıklandığını söylemeyen "RESMEN AÇIKLANDI" gibi tık tuzağı.</li><li>İddiayı kesinleşmiş gösteren "ŞOKU", "BOMBA" gibi sıfatlar.</li><li>Habere konu olmayan birinin fotoğrafını suçla ilgili bir başlığın yanına koymak.</li><li>Gerçekten taze olmayan habere "SON DAKİKA" yazmak.</li><li>Anahtar kelimeyle bulunmuş, konuyla ilgisi doğrulanmamış fotoğraf.</li></ul></div></div></section>
<section aria-labelledby="olcu"><h2 id="olcu">Ölçüler ve şablonlar</h2><p>Şablonlarda örnek metin vardır ve "ŞABLON" yazar. Kapak ve sosyal kartları tools/haber-kapagi.py üretir; elle tasarımda bu ölçüler kullanılır.</p><ul class="izgara">{olc}</ul></section>
<section aria-labelledby="foto"><h2 id="foto">Fotoğraf ve video yuvaları</h2><p>Bu yuvalar şablon değil, gerçek kare ister. Panelden yüklenir.</p><div class="tablo"><table><thead><tr><th>Yuva</th><th>Ölçü</th><th>Not</th></tr></thead><tbody>{foto}</tbody></table></div></section>
</main>
<footer>BTMEDYA Marka Kiti · sürüm {veri["surum"]} · {veri["tarih"]} · Kaynak veri: <a href="/data/marka-kiti.json">marka-kiti.json</a></footer>
<script src="/olcum.js?v=20261003-2" defer></script><script src="/site-motion-v2.js?v=20261005-2" defer></script>
</body></html>
'''


if __name__ == "__main__":
    hedef = os.path.join(KOK, "public", "assets", "marka-kiti")
    os.makedirs(hedef, exist_ok=True)
    for o in OLCULER:
        b = uret(o["w"], o["h"], os.path.join(hedef, o["dosya"]), ORNEK)
        print(f"  {o['dosya']:30} {b/1024:>5.0f} KB")
    # Sitenin paylasim gorseli artik btmedya-og-v2.jpg: uc gercek cekim
    # karesi, Unbounded marka sesi (Gorsel Kimlik 2.0). Yazili manset karti
    # markayi degil yalnizca bir cumleyi gosteriyordu; burada uretilmez.
    veri = {"surum": "2.0", "tarih": "2026-10-05", "renkler": RENKLER, "tipografi": TIPOGRAFI, "kapak_dilleri": KAPAK_DILLERI,
            "etiketler": ETIKETLER, "olculer": OLCULER, "foto_yuvalari": FOTO_YUVALARI,
            # Resmî logo v5 (10 Ekim): amblem + MEDYA, altın tonları, şeffaf zemin
            # (tools/logo/logo-v5-uret.py); son dosya orijinal renkler (logo-v4-uret.py).
            "logolar": ["/assets/logo/btmedya-logo-v5.png", "/assets/logo/btmedya-logo-v5-tam.png", "/assets/logo/bt-amblem-v5.png", "/assets/logo/btmedya-logo-v4.png"]}
    with open(os.path.join(KOK, "public", "data", "marka-kiti.json"), "w", encoding="utf-8") as f:
        json.dump(veri, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print("  data/marka-kiti.json")
    os.makedirs(os.path.join(KOK, "public", "marka-kiti"), exist_ok=True)
    with open(os.path.join(KOK, "public", "marka-kiti", "index.html"), "w", encoding="utf-8") as f:
        f.write(sayfa(veri))
    print("  marka-kiti/index.html")
