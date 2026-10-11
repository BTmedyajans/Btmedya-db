#!/usr/bin/env python3
"""BTMEDYA logo v6 — canlı, 3B gerçekçi altın (11 Ekim, kullanıcı isteği).

İstek: "Logo şekli ve yapısı bakımından daha canlı, 3D gerçekçi altın,
parlak; arka planında gölge olmasın."

Biçim v5 ile aynıdır: harfler ve amblem kullanıcının özgün logosundan
(tools/logo/kaynak/) v5 üreticisinin kesimiyle alınır, yalnız malzeme
değişir. v5 düz bir dikey altın geçişiydi; v6 harfin kendi kabartmasını
hesaplar ve ışıkla boyar:
  - Kabartma: alfa kanalının iç uzaklık dönüşümünden yuvarlatılmış pah
    (bevel). Pah genişliği harf yüksekliğine oranlıdır; ince eğik çizgi de
    aynı malzemeyi alır.
  - Işık: sol üstten stüdyo ışığı (yayınık + parlama), sağ alttan sıcak
    kenar ışığı; düz yüz cilalı metal gibi ufuk bandını yansıtır.
  - Gölge YOK: zemin şeffaf kalır, alt gölge ya da hare eklenmez.
Çıktılar public/assets/logo/ altına (v5 dosyaları yerinde kalır):
  btmedya-logo-v6.png/.webp, btmedya-logo-v6-baslik.png/.webp,
  btmedya-logo-v6-tam.png/.webp, bt-amblem-v6.png/.webp
Çalıştır: python3 tools/logo/logo-v6-uret.py   (gerekli: Pillow, numpy, scipy)
"""
import importlib.util
import os

import numpy as np
from PIL import Image, ImageFilter
from scipy.ndimage import distance_transform_edt, gaussian_filter

KOK = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LOGO = os.path.join(KOK, "public", "assets", "logo")

# v5 üreticisinin kesim ve dizilimi tek kaynak: aynı biçim, yeni malzeme.
# v5 modülü içe aktarılırken kendi dosyalarını yeniden yazar; bu yüzden
# kesim işlevleri ayrı yüklenir ve yalnız gerekli adlar alınır.
_spec = importlib.util.spec_from_file_location("logo_v5", os.path.join(KOK, "tools", "logo", "logo-v5-uret.py"))
_kaynak = open(_spec.origin, encoding="utf-8").read().split("\nk = kilit()")[0]
v5 = {"__file__": _spec.origin, "__name__": "logo_v5"}
exec(compile(_kaynak, _spec.origin, "exec"), v5)

# Canlı altın: v5'ten daha doygun; parlama bandı neredeyse beyaz şampanya,
# dip tonlar yanık kehribar (ışıkta "sarı plastik" değil metal okunsun).
YUZ = [(0.00, (178, 112, 18)), (0.20, (255, 206, 92)), (0.38, (255, 246, 206)),
       (0.50, (255, 214, 104)), (0.72, (226, 150, 28)), (1.00, (140, 78, 6))]
PARLAMA = np.array([255, 251, 236], np.float32)
KENAR_ISIK = np.array([255, 168, 48], np.float32)
KOYU = np.array([92, 52, 4], np.float32)


def rampa(t):
    t = np.clip(t, 0, 1)
    out = np.zeros(t.shape + (3,), np.float32)
    for (p0, c0), (p1, c1) in zip(YUZ, YUZ[1:]):
        m = (t >= p0) & (t <= p1)
        k = ((t[m] - p0) / (p1 - p0))[:, None]
        out[m] = np.array(c0) * (1 - k) + np.array(c1) * k
    return out


def altinla(im, harf_yuksekligi, olcek=3):
    """RGBA şekli 3B altın malzemeyle boyar; yalnız alfa kullanılır."""
    W, H = im.width * olcek, im.height * olcek
    a = np.asarray(im.getchannel("A").resize((W, H), Image.LANCZOS)).astype(np.float32) / 255
    # Kaynak JPEG kenarındaki tırtık pahta dalga olarak büyür; uzaklık
    # dönüşümünden önce maske yumuşatılır.
    ic = gaussian_filter(a, 1.3 * olcek) > 0.5
    pah = max(3.0, 0.075 * harf_yuksekligi * olcek)
    d = distance_transform_edt(ic)
    h = np.sin(np.clip(d / pah, 0, 1) * np.pi / 2)
    h = gaussian_filter(h, 1.3 * olcek)
    gy, gx = np.gradient(h)
    egim = pah * 1.25
    n = np.dstack([-gx * egim, -gy * egim, np.ones_like(h)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)

    # Yüz rengi: dikey konumdan cilalı ufuk yansıması; pahta normal yönü
    # yansımayı kaydırır (üste bakan pah açık, alta bakan koyu).
    yy = np.linspace(0, 1, H, dtype=np.float32)[:, None] * np.ones((1, W), np.float32)
    ust = np.where(ic.any(1))[0]
    y0, y1 = (ust.min() / H, ust.max() / H) if len(ust) else (0, 1)
    t = (yy - y0) / max(y1 - y0, 1e-3)
    t = t - n[..., 1] * 0.55 + n[..., 0] * 0.08
    renk = rampa(t)

    isik = np.array([-0.45, -0.62, 0.64], np.float32); isik /= np.linalg.norm(isik)
    yayin = np.clip((n * isik).sum(2), 0, 1)
    yarim = isik + np.array([0, 0, 1], np.float32); yarim /= np.linalg.norm(yarim)
    parla = np.clip((n * yarim).sum(2), 0, 1) ** 40
    kenar_y = np.array([0.6, 0.55, 0.58], np.float32); kenar_y /= np.linalg.norm(kenar_y)
    kenar = np.clip((n * kenar_y).sum(2), 0, 1) ** 6 * (1 - n[..., 2])

    renk = renk * (0.72 + 0.42 * yayin[..., None])
    renk = renk + KENAR_ISIK * (kenar[..., None] * 0.55)
    renk = renk * (1 - (1 - n[..., 2])[..., None] * 0.25) + KOYU * ((1 - n[..., 2])[..., None] * 0.25) * (yayin[..., None] < 0.35)
    renk = renk + (PARLAMA - renk) * np.clip(parla * 1.4, 0, 1)[..., None]
    renk = np.clip(renk, 0, 255)

    rgba = np.dstack([renk, a * 255]).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA").resize((im.width, im.height), Image.LANCZOS)


def kaydet(im, yol):
    im.save(yol + ".png", optimize=True)
    im.save(yol + ".webp", quality=92, method=6)
    print(os.path.relpath(yol, KOK), im.size)


if __name__ == "__main__":
    CAP = v5["CAP"]
    kilit = v5["kilit"]()
    kilit6 = altinla(kilit, CAP)
    kaydet(v5["boyut"](kilit6, 240), os.path.join(LOGO, "btmedya-logo-v6"))
    kaydet(v5["boyut"](kilit6, 132), os.path.join(LOGO, "btmedya-logo-v6-baslik"))

    tam, _ = v5["kes"](280, 1260, 0, v5["a"].shape[1])
    tam = tam.resize((1200, round(tam.height * 1200 / tam.width)), Image.LANCZOS)
    kaydet(altinla(tam, 0.16 * tam.height), os.path.join(LOGO, "btmedya-logo-v6-tam"))

    amblem = v5["amblem"]
    amblem = amblem.resize((512, round(amblem.height * 512 / amblem.width)), Image.LANCZOS)
    kaydet(altinla(amblem, 0.5 * amblem.height), os.path.join(LOGO, "bt-amblem-v6"))
