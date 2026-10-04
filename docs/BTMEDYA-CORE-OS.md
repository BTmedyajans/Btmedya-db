# BTMEDYA Core OS

BTMEDYA'nın ana çalışma altyapısı Cloudflare + GitHub üzerinde çalışır.

## Kaynak gerçeği

- Kod: GitHub `BTmedyajans/Btmedya-db`
- Yayın: Cloudflare Worker `btmedya-db`
- DNS/edge: Cloudflare
- Operasyon verisi: Cloudflare D1
- Medya: Cloudflare R2
- Cache/lock: Cloudflare KV
- Uzun işlemler: Cloudflare Workflows + Durable Objects
- Zamanlayıcı: Worker Cron
- AI: Workers AI
- CI/CD: GitHub Actions

## Çekirdek modüller

1. Haber CMS
2. Medya Kasası
3. Sosyal yayın kuyruğu
4. Satış / CRM
5. Müşteri çalışma alanı
6. Müşteri onay akışı
7. Agency Supervisor
8. Haber istihbaratı
9. Sabah Masası
10. Autopilot
11. Core OS: içerik, yayın, entegrasyon, job ve audit kayıtları

## Harici servislerin rolü

Harici servisler sistemin kaynağı değil, adapter olur.

- Dropbox -> R2 medya kasası
- HubSpot -> D1 satış/CRM
- Supabase -> D1/R2/KV/DO
- Metricool -> yalnız sosyal platform teslim adapteri
- Figma -> tasarım/marka üretim aracı
- Template Creator -> tekrar kullanılabilir BTMEDYA şablonlarının üretim aracı
- Porter Metrics -> D1 tabanlı kurum içi analitik katmanı

## Güvenlik

- API anahtarları D1 veya GitHub koduna yazılmaz.
- Worker Secrets yalnızca çalışma zamanında kullanılır.
- Müşteri ve yayın kayıtları D1'de tutulur.
- Medya nesneleri R2'de tutulur.
- Yönetim endpointleri admin oturumu ile korunur.
- Kritik işlemler audit kaydı üretir.

## Hedef

BTMEDYA için tek operasyon merkezi:

Haber -> Medya -> İçerik -> Onay -> Yayın kuyruğu -> Platform adapteri -> Analitik -> Audit

Harici servislerden biri devre dışı kalsa bile çekirdek içerik ve müşteri operasyonu çalışmaya devam eder.
