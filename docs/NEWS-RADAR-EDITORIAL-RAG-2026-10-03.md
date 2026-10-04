# BTMEDYA Haber Radarı + Editoryal RAG Sözleşmesi

Tarih: 3 Ekim 2026
Durum: Taslak / production dışı

## Amaç

Balıkesir merkez + 20 ilçe ve Türkiye gündemini saatlik tarayan sistemin keşif, doğrulama, rakip sinyali, taslak üretimi ve editör onayı adımlarını tek veri sözleşmesinde toplamak.

## Olay kaydı

Her haber adayı bir `EVENT_ID` altında kümelenir. Aynı olayın farklı sitelerdeki tekrarları tek olayda tutulur.

```json
{
  "event_id": "BTM-20261003-0001",
  "first_seen_at": "ISO-8601",
  "first_source_id": "BAL-VALILIK",
  "first_source_url": "https://...",
  "second_verification": {
    "status": "verified|partial|failed|pending",
    "source_id": "...",
    "checked_at": "ISO-8601"
  },
  "occurred_at": "ISO-8601|null",
  "location": {"province":"Balıkesir","district":"...","place":"..."},
  "category": "balikesir|turkiye|ekonomi|saha|spor|kultur|egitim|saglik|teknoloji-ai|dunya",
  "news_value": {
    "public_impact": 0,
    "freshness": 0,
    "source_strength": 0,
    "local_relevance": 0,
    "original_reporting_potential": 0,
    "multimedia_potential": 0
  },
  "competitor_first_seen_at": "ISO-8601|null",
  "btmedya_draft_at": "ISO-8601|null",
  "btmedya_published_at": "ISO-8601|null",
  "verification_notes": [],
  "source_ids": [],
  "media_provenance": [],
  "editor_notes": [],
  "approval": {"status":"pending|approved|rejected","approved_at":null}
}
```

## Editoryal RAG

Model davranışı ham internet metnini sürekli eğiterek değiştirilmez. Bunun yerine sürümlü, denetlenebilir bir bilgi tabanı kullanılır.

### RAG katmanları

1. `source-profiles`: kurumların kapsamı, güven/teyit kuralları ve URL'leri.
2. `editorial-rules`: başlık, spot, kaynak gösterme, düzeltme, hassas konu ve dil kuralları.
3. `approved-stories`: editör tarafından onaylanmış BTMedya haberleri ve iyi örnekler.
4. `corrections`: yapılan düzeltmeler ve nedenleri.
5. `seo-rules`: NewsArticle, canonical, sitemap, iç link ve arama görünürlüğü kuralları.
6. `platform-rules`: Instagram, Facebook, TikTok, YouTube ve web türevleri için format sözleşmeleri.
7. `bik-rules`: BİK uyumu için güncel resmi şartların ayrı, tarihli kayıtları.

Her RAG girdisi `version`, `approved_by`, `approved_at`, `source_url` ve `valid_from` alanlarıyla izlenmelidir.

## Üretim akışı

`WEB + SOCIAL -> SIGNAL -> CLUSTER -> PRIMARY SOURCE -> SECOND VERIFICATION -> NEWS VALUE -> DRAFT -> SEO/MEDIA -> USER APPROVAL -> PUBLISH -> DELIVERY AUDIT`

### Yayın kapıları

- P1 birincil kaynak yoksa önemli iddialar yayın kuyruğunda bekler.
- Sosyal medya sinyali tek başına haber kanıtı değildir.
- Suçlama, soruşturma, mahkeme, sağlık, çocuklar, kişisel veri ve güvenlik olaylarında ek doğrulama gerekir.
- Fotoğraf/video için kaynak, çekim zamanı/konumu, özgünlük ve kullanım hakkı kaydedilir.
- Ajans veya rakip metinleri yeniden yazılıp BTMedya özgün haberi gibi sunulmaz; bağımsız kaynak ve özgün katkı aranır.
- Ticari/sponsor uygunluğu haber değerinin önüne geçirilemez.
- Harici yayına geçişte kullanıcı onayı zorunludur.

## Rakip zaman metriği

Sistem her olay için aşağıdaki zamanları tutar:

`first_source -> social_signal -> competitor_first_seen -> btmedya_draft -> btmedya_publish`

Bu metrik editoryal operasyonu ölçmek içindir. Rakipten içerik kopyalama veya kaynak gizleme amacı taşımaz.

## Saatlik tarama hedefleri

- Balıkesir merkez + 20 ilçe
- Türkiye ulusal gündem
- Resmî kurum açıklamaları, kararlar, duyurular, PDF'ler, tablolar, veri setleri, ihaleler ve takvim değişiklikleri
- Güvenilir ajanslar
- Yerel medya/rakip sinyalleri
- Sosyal medya erken uyarıları

Tarama sıklığı kaynak önemine göre 15, 30, 60 veya 120 dakika olabilir. Sistem saatlik raporlama yaparken kritik P1/P4 sinyallerini daha kısa aralıkta kontrol edebilir.

## İlk sürüm kapsamı

Bu belge ve `public/data/news-radar-source-registry.json` üretim kodu değil, kontrollü entegrasyon için kaynak/sözleşme katmanıdır. Main branch'e merge edilmemeli ve kullanıcı onayı olmadan canlı yayın davranışı değiştirilmemelidir.
