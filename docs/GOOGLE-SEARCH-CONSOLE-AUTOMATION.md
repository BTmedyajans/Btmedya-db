# BTMEDYA Google Search Console automation

Bu repo Google tarafındaki son bağlantıyı da otomatikleştirmek için hazırlandı.

## Ne otomatikleşti?

- `sitemap.xml` Search Console'a gönderilir.
- `news-sitemap.xml` Search Console'a gönderilir.
- Ana sayfa, haberler, hizmetler ve portföy için URL Inspection çalıştırılır.
- Workflow her gün çalışır; ayrıca `main` değişikliklerinde ve manuel tetiklemede çalışabilir.

Google, sitemap gönderimini öneriyor; tarama ve indeksleme sonrasında sonuçların görünmesi zaman alabilir.

## Yalnızca bir kez yapılacak Google işlemi

1. Search Console'da `https://btmedya.com.tr/` URL-prefix mülkünü veya `btmedya.com.tr` Domain mülkünü doğrula.
2. Otomasyon için oluşturulan Google service account'u doğrulanmış site sahibi olarak ekle.
3. Service account JSON anahtarını GitHub Actions secret olarak şu adla kaydet:
   `GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON`

Özel anahtar dosyası repoya **asla** konmaz.

Google'ın resmi belgeleri service account kullanımı için site sahipliğinin önce Search Console'da doğrulanmasını ve ardından service account'un owner olarak eklenmesini şart koşuyor:
https://developers.google.com/search/apis/indexing-api/v3/prereqs

Ardından workflow kendi başına sitemap gönderimi ve URL Inspection yapar.
