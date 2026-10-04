# BTMEDYA AI Agent Gateway

## Amaç

ChatGPT, Claude Code, Cloud Code ve gelecekte eklenecek AI istemcilerinin BTMEDYA production sistemine doğrudan ve sınırsız erişmesi yerine tek bir kontrollü işlem kapısı kullanması.

## Kanonik zincir

```text
AI Client
  -> Agent Gateway
  -> capability + role check
  -> plan / diff / validation
  -> approval queue
  -> GitHub branch / commit
  -> CI checks
  -> production deploy
  -> Cloudflare Worker / D1 / R2
```

İçerik akışı için:

```text
Source / webhook / RSS / scheduler
  -> News Intelligence
  -> candidate scoring
  -> AI editorial draft
  -> media selection / generation
  -> CMS draft
  -> Admin approval
  -> Web publish
  -> Metricool review/schedule
```

## Yetki seviyeleri

- `observer`: yalnızca durum, log, metrik ve dosya okuyabilir.
- `editor`: haber taslağı, sosyal taslak ve medya metadata hazırlayabilir.
- `publisher`: onaylanmış içerikleri yayın kuyruğuna gönderebilir.
- `developer`: branch üzerinde kod değişikliği hazırlayabilir; production'a doğrudan yazamaz.
- `owner`: canlı deploy, bağlantı kaldırma ve kritik güvenlik işlemleri için kullanıcı onayı gerekir.

## Varsayılan güvenlik politikası

1. Production `main` branch'e AI istemcisi doğrudan push yapmaz.
2. Kod değişiklikleri branch + diff + test sonucuyla birlikte gösterilir.
3. Canlı deploy kullanıcı onayı olmadan yapılmaz.
4. Silme, secret değiştirme, domain/DNS değişikliği ve sosyal hesap bağlantısı kaldırma her zaman kullanıcı onayı ister.
5. Hassas haberler otomatik yayınlanmaz.
6. Kaynak URL'si her haber kaydında korunur.
7. AI taslağı kaynakta bulunmayan olgu üretmemelidir.
8. Her agent işlemi audit log'a yazılır.
9. Metricool'a gönderim, sosyal ağın gerçekten bağlı olduğu doğrulanmadan yapılmaz.
10. Instagram/Facebook bağlantıları tamamlanmadan mevcut TikTok/YouTube yayın zinciri genişletilmez.

## Admin paneli: Agent Center

Önerilen ekranlar:

- Agent durumları
- Son işlemler
- Bekleyen onaylar
- Kod değişiklikleri / diff
- Preview bağlantısı
- Test sonuçları
- Haber adayları
- Sosyal yayın kuyruğu
- Metricool bağlantıları
- Cloudflare servis durumu
- GitHub deploy durumu
- Audit log

Her işlem için üç sonuç bulunur:

`Taslak` -> `Onay bekliyor` -> `Uygulandı`

Hatalı işlem:

`Reddedildi` veya `Başarısız`

## Otomatik yayın politikası

Autopilot mevcut skor/kategori/kaynak seviyesi politikasını kullanmaya devam eder. Yeni Gateway bu politikanın üzerine çıkarak canlı kod değişikliklerinde ve kritik altyapı işlemlerinde ayrıca onay kapısı oluşturur.

İçerik tarafında sistemin amacı hızlı hazırlamadır. Editoryal risk taşıyan içeriklerde Admin paneli son karar noktasıdır.

## Sosyal yayın

Metricool mevcut yayın katmanıdır. Bağlı olmayan ağlar için yayın isteği oluşturulmaz. Yeni içerik önce sosyal varyasyonlara ayrılır:

- Instagram Reel / gönderi
- Facebook Reel / gönderi
- TikTok
- YouTube Short
- LinkedIn / X gerektiğinde ayrı adaptasyon

Platforma özel metin, başlık ve medya oranları Gateway tarafından ayrı hazırlanır.

## Uygulama sırası

1. Agent Gateway API sözleşmesi
2. Admin Agent Center UI
3. Approval + audit tabloları
4. GitHub branch/diff işlemleri
5. Cloudflare preview/deploy kontrolü
6. Metricool Instagram/Facebook bağlantılarının doğrulanması
7. End-to-end test
8. Kullanıcı onayı
9. Production'a geçiş

Bu belge yalnızca `ai-agent-gateway` hazırlık branch'indeki tasarımı tanımlar. Production `main` branch'ine tek başına geçiş yapmaz.
