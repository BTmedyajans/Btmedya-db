# BTMEDYA içerik çalışma alanı

Bu klasör haber, sosyal medya brief'leri ve AI LAB üretimleri için editoryal dosya düzenidir. **Tek başına yayın sistemi değildir.**

## Dizin yapısı

```text
content/
├── 01-haber/
│   ├── gerçek-haberler/
│   └── resmi-kaynaklar/
├── 02-sosyal/
│   ├── hizmet-paketleri/
│   └── metricool-data/
├── 03-ai-lab/
│   ├── ai-visual/
│   └── ai-video/
└── _templates/
```

## Yayın kaynağı ve adres kuralları

- Günlük haberler ve medya kayıtları için kanonik kayıt yeri yönetim paneli ve Cloudflare D1'dir. Bu klasöre bir Markdown dosyası eklemek içeriği web sitesinde yayımlamaz.
- Mevcut haber yolu `/haberler/{slug}.html` biçimindedir. `/haber/{slug}` eski bağlantıları bu kanonik adrese 301 yönlendirir.
- `/sosyal/{slug}` ve `/ai-lab/{slug}` örnekleri bu çalışma alanında hedeflenen içerik bağlantılarıdır; tek tek canlı sayfaların var olduğu anlamına gelmez.
- Yeni bir web adresi açılmadan önce Worker yönlendirmesi, gerçek sayfa üretimi, canonical, sitemap ve 404 davranışı birlikte doğrulanmalıdır.
- Kaynak koduna, içerik dosyalarına veya commit'lere API anahtarı, erişim token'ı, parola ya da OAuth sırrı eklenmez.

## Editoryal güvenlik

- Haber metinlerinde doğrulanabilir kaynak URL'si ve kaynak kontrol tarihi tutulur.
- Resmî kurum açıklaması, BTMEDYA'nın kendi haber anlatımıymış gibi gösterilmez; kurum bağlantısı açıkça verilir.
- Arşiv içeriği güncel haber gibi sunulmaz. Yayın tarihi ile olayın gerçekleştiği tarih gerektiğinde ayrı tutulur.
- AI görsel ve videoları gerçek saha çekimlerinden ayrı sınıflandırılır; ilgili içerikte AI üretimi etiketi bulunur.
- Sosyal içerikler platforma göre ayrı varyantlar alır. Taslak kaydı otomatik yayın izni değildir.

## Metricool klasörü

`02-sosyal/metricool-data/` yalnızca dışa aktarılmış raporlar ve güvenli, hassas olmayan performans verileri içindir. Token, parola veya oturum bilgisi saklamayın. Mevcut doğrudan yayın akışı Metricool kimlik bilgilerine bağımlı değildir.
