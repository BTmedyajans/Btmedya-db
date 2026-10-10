#!/usr/bin/env python3
"""BTMEDYA logo v5 — business kilit (10 Ekim, kullanıcı isteği).

İstek: "Amblemi logo yazısındaki yerde BT harflerinin yerine kullan, business
görünümlü logo olsun; orijinal logomu sarı tonlarında göster; arka planı temizle."

Kaynak kullanıcının gönderdiği özgün logodur (tools/logo/kaynak/). Biçim
değiştirilmez: harfler ve amblem kaynaktan kesilir, yalnız renk ve dizilim
değişir.
  - Kilit: [BT amblemi] + MEDYA. Amblemdeki B, MEDYA harf yüksekliğinin 1,28
    katı ve aynı taban çizgisinde; tek kelime gibi "BTMEDYA" okunur.
  - Renk: "lüks altın" metalik geçiş (bronz kenar, şampanya parlama bandı,
    derin kehribar). Kaynakta siyah olan T, MEDYA ve slogan bu geçişle
    boyanır; amblemdeki B kaynaktaki altın dokusunu korur.
  - Zemin: beyaz kaynak alfa kanalına çevrilir, kenar yumuşatması beyazdan
    ayrıştırılır (koyu zeminde açık hare kalmaz).
Çıktılar public/assets/logo/ ve public/assets/ altına:
  btmedya-logo-v5.png/.webp           kilit, yüksek çözünürlük (marka kiti, baskı)
  btmedya-logo-v5-baslik.webp/.png    kilit, site başlığı (132 px yükseklik)
  btmedya-logo-v5-tam.png/.webp       tam logo, sarı tonlarında (amblem + yazı + slogan)
  bt-amblem-v5.png/.webp              yalnız amblem
  favicon-v5.png, icon-*-v5.png       sekme ve uygulama simgeleri; ../favicon.ico
Çalıştır: python3 tools/logo/logo-v5-uret.py   (gerekli: Pillow, numpy)
"""
import os

import numpy as np
from PIL import Image

KOK = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
KAYNAK = os.path.join(KOK, "tools", "logo", "kaynak", "btmedya-logo-orijinal.jpg")
LOGO = os.path.join(KOK, "public", "assets", "logo")
ASSETS = os.path.join(KOK, "public", "assets")

# "Lüks altın" metalik geçiş (10 Ekim, kullanıcı: "daha lüks altın, daha şık";
# Teknoloji/AI seçeneği açık zeminde okunmadığı için varsayılan değil). Koyu
# bronz kenar → şampanya parlama bandı (%36) → altın → derin kehribar. Uç
# tonlar kaynak amblemin ölçülen altınından (226,170,58) türetildi.
DURAKLAR = [(0.00, (150, 98, 22)), (0.18, (236, 190, 92)), (0.36, (255, 240, 196)),
            (0.52, (232, 178, 66)), (0.80, (176, 116, 22)), (1.00, (120, 74, 10))]
ZEMIN = (7, 9, 11)          # uygulama simgesi zemini (site zemini)
ORAN = 1.28                 # amblemdeki B yüksekliği / MEDYA harf yüksekliği

a = np.asarray(Image.open(KAYNAK).convert("RGB")).astype(np.float32)
d = 255 - a.min(axis=2)
alfa = np.clip((d - 10) / 60.0, 0, 1)
on = np.where(alfa[..., None] > 0, (a - (1 - alfa[..., None]) * 255) / np.maximum(alfa[..., None], 1e-3), 0)
on = np.clip(on, 0, 255)
mx, mn = on.max(2), on.min(2)
siyah = (np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0) < 0.30) & (mx < 150)


def gecis(h):
    t = np.linspace(0, 1, h)
    out = np.zeros((h, 3))
    for (p0, c0), (p1, c1) in zip(DURAKLAR, DURAKLAR[1:]):
        m = (t >= p0) & (t <= p1)
        out[m] = np.array(c0) + (np.array(c1) - np.array(c0)) * ((t[m] - p0) / (p1 - p0))[:, None]
    return out


def kes(y0, y1, x0, x1):
    """Bölgeyi keser; siyah pikselleri kendi dikey aralığında altın geçişle boyar."""
    r, al, sy = on[y0:y1, x0:x1].copy(), alfa[y0:y1, x0:x1], siyah[y0:y1, x0:x1]
    satir = np.where(sy.any(1))[0]
    if len(satir):
        g = gecis(satir.max() - satir.min() + 1)
        for y in range(r.shape[0]):
            r[y][sy[y]] = g[min(max(y - satir.min(), 0), len(g) - 1)]
    im = Image.fromarray(np.dstack([r, al * 255]).astype(np.uint8), "RGBA")
    bb = im.getbbox()
    return im.crop(bb), y0 + bb[1]


def kaydet(im, yol, webp=True):
    im.save(yol + ".png", optimize=True)
    if webp:
        im.save(yol + ".webp", quality=90, method=6)
    print(os.path.relpath(yol, KOK), im.size)


amblem, amblem_ust = kes(280, 975, 380, 1280)
B_TABAN = 898                                   # kaynakta B'nin alt kenarı
medya, _ = kes(975, 1160, 500, 1415)            # yalnız MEDYA (BT harfleri yok)
CAP = medya.height


def kilit():
    s = ORAN * CAP / (B_TABAN - amblem_ust)
    am = amblem.resize((round(amblem.width * s), round(amblem.height * s)), Image.LANCZOS)
    taban = round((B_TABAN - amblem_ust) * s)
    bosluk = round(CAP * 0.30)
    H = taban + max(am.height - taban, 0) + 2
    t = Image.new("RGBA", (am.width + bosluk + medya.width + 2, H), (0, 0, 0, 0))
    t.alpha_composite(am, (0, 0))
    t.alpha_composite(medya, (am.width + bosluk, taban - CAP))
    return t


def boyut(im, yukseklik):
    return im.resize((round(im.width * yukseklik / im.height), yukseklik), Image.LANCZOS)


k = kilit()
kaydet(boyut(k, 240), os.path.join(LOGO, "btmedya-logo-v5"))
kaydet(boyut(k, 132), os.path.join(LOGO, "btmedya-logo-v5-baslik"))

tam, _ = kes(280, 1260, 0, a.shape[1])
kaydet(tam.resize((1200, round(tam.height * 1200 / tam.width)), Image.LANCZOS), os.path.join(LOGO, "btmedya-logo-v5-tam"))

kaydet(amblem.resize((512, round(amblem.height * 512 / amblem.width)), Image.LANCZOS), os.path.join(LOGO, "bt-amblem-v5"))


def simge(kenar, dolgu, zemin):
    """Kare simge: amblem ortada; zemin None ise şeffaf."""
    t = Image.new("RGBA", (kenar, kenar), (0, 0, 0, 0) if zemin is None else zemin + (255,))
    ic = round(kenar * (1 - 2 * dolgu))
    s = min(ic / amblem.width, ic / amblem.height)
    am = amblem.resize((max(1, round(amblem.width * s)), max(1, round(amblem.height * s))), Image.LANCZOS)
    t.alpha_composite(am, ((kenar - am.width) // 2, (kenar - am.height) // 2))
    return t


kaydet(simge(64, 0.04, None), os.path.join(ASSETS, "favicon-v5"), webp=False)
kaydet(simge(192, 0.12, ZEMIN), os.path.join(ASSETS, "icon-192-v5"), webp=False)
kaydet(simge(512, 0.12, ZEMIN), os.path.join(ASSETS, "icon-512-v5"), webp=False)
kaydet(simge(512, 0.22, ZEMIN), os.path.join(ASSETS, "icon-512-maskable-v5"), webp=False)
kaydet(simge(180, 0.12, ZEMIN), os.path.join(ASSETS, "apple-touch-icon-v5"), webp=False)
ico = simge(256, 0.04, None)
ico.save(os.path.join(KOK, "public", "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
print("public/favicon.ico")
