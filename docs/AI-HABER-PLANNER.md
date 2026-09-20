# BTMEDYA AI Haber Planner

Bu taslak, ChatGPT/OpenAI'ı BTMEDYA Haber Merkezi'nin AI editör motoru olarak konumlandırır.

## Akış
Kaynaklar → planlayıcı → aday haber → kaynak/doğrulama → AI taslak → gerçek R2 medya eşleştirme → SEO/AEO → editör onayı → yayın → sosyal dağıtım.

AI tek başına haber yayınlamaz. Her adayda kaynak, tarih, özgünlük ve medya durumu tutulur.

## Plan
Varsayılan taramalar: 08:00, 13:00, 19:00 Europe/Istanbul.

Kapsam: Balıkesir, Türkiye, Dünya. Konular: yerel yönetim, ekonomi, kamu hizmetleri, ulaşım, iş dünyası, teknoloji, yapay zekâ, kültür ve spor.

## Kaynak bağlama
İlk aşamada RSS/XML, lisanslı ajans/API kaynakları ve manuel kaynaklar kullanılabilir. Kaynak erişimi olmayan bir servisin içeriği otomatik çekiliyormuş gibi gösterilmez.

## OpenAI
Worker Secret: OPENAI_API_KEY.
Model adı OPENAI_NEWS_MODEL ile değiştirilebilir. API anahtarı GitHub'a yazılmaz.

## Canlıya geçiş koşulu
1. Cloudflare Worker secret tanımlanır.
2. Gerçek haber kaynakları bağlanır.
3. Cron/planlayıcı etkinleştirilir.
4. Aday haberler önce taslak kuyruğuna düşer.
5. Editör onayı olmadan publish edilmez.
