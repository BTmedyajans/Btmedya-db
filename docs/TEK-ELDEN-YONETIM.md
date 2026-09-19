# BTMEDYA — Tek Elden Yönetim

## Hedef

BTMEDYA'nın günlük yönetimi `https://btmedya.com.tr/admin/` üzerinden yapılır.

- Cloudflare Worker: uygulama, API ve yayın
- D1: haberler, mesajlar ve medya kayıtları
- R2: fotoğraf, video, ses ve belge
- GitHub: yalnızca kod ve sürüm geçmişi
- Cloudflare Workers Builds: `main` dalından production deploy

## Günlük kullanım

```
İçerik ekleme/düzeltme
        ↓
btmedya.com.tr/admin/
        ↓
D1 + R2
        ↓
btmedya.com.tr
```

Günlük haber, fotoğraf ve video işlemleri için GitHub veya Cloudflare Dashboard'a girilmez.

## Kod yayınlama

```
GitHub main
    ↓
Cloudflare Workers Builds
    ↓
npx wrangler deploy
    ↓
btmedya-db
    ↓
btmedya.com.tr
```

Production build ayarları:

- Üretim şubesi: `main`
- Derleme komutu: boş
- Dağıtım komutu: `npx wrangler deploy`
- Kök dizin: `/`

`npx wrangler versions upload` production akışının ana komutu değildir.

## Mobil düzeltme

Mobil yerleşim düzeltmesi GitHub'da `a820b12` commit'inde bulunuyor:

`fix: stabilize mobile layout and touch interactions`

## Admin paneli

Adres:

https://btmedya.com.tr/admin/

Panelde mevcut işlevler:

- Site durumu
- Medya Kasası
- Haberler
- Videolar
- Gelen Mesajlar

Medya yüklemeleri R2'ye, içerik kayıtları D1'e gider.

## Güvenlik

Secrets GitHub'a veya `wrangler.toml` dosyasına yazılmaz. Worker çalışma zamanı secret'ları Cloudflare tarafında tutulur:

- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `MEDIA_SIGNING_SECRET`

## Değişiklik kuralı

Canlı içerik: **admin paneli**  
Kod: **GitHub main**  
Altyapı: **Cloudflare Dashboard**

Bu ayrım BTMEDYA'yı tek merkezli ve takip edilebilir tutar.
