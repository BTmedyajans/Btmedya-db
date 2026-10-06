#!/usr/bin/env python3
"""BTMEDYA giriş filmi ses tasarımı (6 Ekim).

Neden: giriş filmini oluşturan AI planlarının hiçbirinde ses izi yoktu;
ana sayfa filmi "ilk sesli" sunulacaktı. Hazır müzik ya da üçüncü taraf
kayıt kullanılmaz (lisans riski); ses tamamen burada sentezlenir.

Zaman çizelgesi kurgudaki gerçek anlara göre ölçüldü (sahne değişimi ve
parlaklık eğrisi, tools/giris-filmi/kurgu.sh çıktısı üzerinde):
  0.00-4.10  çöl planları: rüzgâr yatağı + sıcak alçak drone
  2.25       çöl planları arası geçiş: yumuşak hışırtı
  4.10-4.45  karartma: aşağı inen hışırtı + derin vuruş (şehre geçiş)
  4.50-6.30  göğüste enerji: yükselen gerilim + çıtırtı
  6.50-8.00  zırh oluşuyor: metalik kenetlenmeler
  8.00-8.60  miğfer kapanıyor: servo vızıltısı + kilit vuruşu
  9.00-10.4  gözler yanıyor: parıltı
  11.00      karşı robot: alçak, karanlık "braam"
  11.6-12.1  çarpışmaya yükselen gerilim, 12.10 patlama
  12.42-13.62 son kare 1,2 sn durur (seçenekler bu karede gelir);
             patlamanın kuyruğu burada söner

Çalıştır: python3 tools/giris-filmi/ses-tasarimi.py <cikti.wav> [sure_sn]
Gereken: numpy. Çıktı 48 kHz stereo 16 bit WAV; ses düzeyi kurgu
betiğinde loudnorm ile -16 LUFS'a getirilir.
"""
import sys
import wave

import numpy as np

SR = 48000
SURE = float(sys.argv[2]) if len(sys.argv) > 2 else 13.62
N = int(SR * SURE)
t = np.arange(N) / SR
# Sabit tohum: aynı komut her seferinde aynı dosyayı üretir (yeniden üretilebilir kurgu).
rng = np.random.default_rng(20261006)


def gurultu(n):
    return rng.standard_normal(n)


def tek_kutup(x, kesim, tur="alcak"):
    """Tek kutuplu süzgeç; kesim sabit ya da örnek başına dizi olabilir."""
    k = np.broadcast_to(np.asarray(kesim, dtype=float), x.shape)
    a = np.exp(-2 * np.pi * k / SR)
    y = np.empty_like(x)
    s = 0.0
    for i in range(len(x)):
        s = (1 - a[i]) * x[i] + a[i] * s
        y[i] = s
    return y if tur == "alcak" else x - y


def bant(x, alt, ust):
    return tek_kutup(tek_kutup(x, ust), alt, "yuksek")


def zarf(bas, atak, birak, n=N, egri=4.0):
    """bas saniyesinde başlayan, atak ile açılıp üstel sönen zarf."""
    e = np.zeros(n)
    i0 = int(bas * SR)
    na, nb = int(atak * SR), int(birak * SR)
    a = np.linspace(0, 1, max(na, 1))
    b = np.exp(-egri * np.linspace(0, 1, max(nb, 1)))
    parca = np.concatenate([a, b])
    son = min(n, i0 + len(parca))
    if i0 < n:
        e[i0:son] = parca[: son - i0]
    return e


def aralik(bas, bit, yumus=0.25):
    """bas-bit arasında 1, kenarları yumuşak geçişli pencere."""
    e = np.clip((t - bas) / yumus, 0, 1) * np.clip((bit - t) / yumus, 0, 1)
    return e


def kaydir(x, sn):
    """Stereo genişlik için küçük gecikme (Haas)."""
    k = int(sn * SR)
    return np.concatenate([np.zeros(k), x[: len(x) - k]])


sol = np.zeros(N)
sag = np.zeros(N)


def ekle(x, kazanc=1.0, pan=0.0, genis=0.0):
    global sol, sag
    x = x * kazanc
    sol += x * np.sqrt((1 - pan) / 2) * np.sqrt(2)
    sag += (kaydir(x, genis) if genis else x) * np.sqrt((1 + pan) / 2) * np.sqrt(2)


# 1) Çöl rüzgârı: bant geçiren gürültü, yavaş esintiler.
esinti = 0.55 + 0.45 * np.sin(2 * np.pi * 0.31 * t + 1.1) * np.sin(2 * np.pi * 0.13 * t)
ruzgar_kesim = 700 + 900 * esinti
ruzgar = tek_kutup(gurultu(N), ruzgar_kesim)
ruzgar = tek_kutup(ruzgar, 120, "yuksek")
ekle(ruzgar * esinti * aralik(0.0, 4.35, 0.6), 0.9, -0.15, 0.011)
ekle(tek_kutup(gurultu(N), 2400) * aralik(0.0, 4.2, 0.6) * 0.18, 0.5, 0.25, 0.017)

# 2) Sıcak drone (La minör): film boyunca alçak yatak, çatışmada yükselir.
drone_g = 0.10 * aralik(0.0, 12.3, 0.8) + 0.08 * aralik(8.2, 12.2, 1.0)
for f, g in ((55.0, 1.0), (82.41, 0.55), (110.0, 0.45), (164.81, 0.2)):
    sapma = 1 + 0.002 * np.sin(2 * np.pi * 0.21 * t + f)
    ekle(np.sin(2 * np.pi * f * sapma * t) * g * drone_g, 1.0, 0.0, 0.009)


def hisirti(bas, sure, yukari=True, kazanc=0.5):
    n = int(sure * SR)
    i0 = int(bas * SR)
    k = np.geomspace(300, 5200, n) if yukari else np.geomspace(5200, 220, n)
    x = tek_kutup(gurultu(n), k)
    x = tek_kutup(x, 150, "yuksek")
    e = np.sin(np.linspace(0, np.pi, n)) ** 2
    y = np.zeros(N)
    son = min(N, i0 + n)
    y[i0:son] = (x * e)[: son - i0]
    ekle(y, kazanc, 0.0, 0.013)


def vurus(bas, f0=90, f1=34, sure=1.1, kazanc=0.9):
    e = zarf(bas, 0.004, sure, egri=5)
    faz = 2 * np.pi * np.cumsum(f1 + (f0 - f1) * np.exp(-np.clip(t - bas, 0, None) * 6)) / SR
    ekle(np.sin(faz) * e, kazanc)


def metal(bas, frekans=2600, kazanc=0.35, pan=0.0):
    e = zarf(bas, 0.002, 0.28, egri=9)
    x = bant(gurultu(N), frekans * 0.6, frekans * 1.4) * e
    ton = sum(np.sin(2 * np.pi * frekans * r * t) * a for r, a in ((1, 0.5), (1.52, 0.3), (2.31, 0.2))) * zarf(bas, 0.001, 0.45, egri=7)
    ekle(x * 0.8 + ton * 0.35, kazanc, pan, 0.006)
    vurus(bas, 140, 60, 0.25, kazanc * 0.9)


# 3) Geçişler.
hisirti(1.85, 0.8, True, 0.35)
hisirti(3.75, 0.75, False, 0.55)
vurus(4.42, 95, 32, 1.4, 1.0)

# 4) Göğüste enerji: yükselen ton + gerilim gürültüsü + çıtırtı.
yuksel = aralik(4.5, 6.4, 0.3)
glide = 180 * (1 + 3.2 * np.clip((t - 4.5) / 1.9, 0, 1) ** 2)
ekle(np.sin(2 * np.pi * np.cumsum(glide) / SR) * yuksel * 0.12, 1.0, 0.0, 0.008)
ekle(bant(gurultu(N), 900, 4200) * yuksel * np.clip((t - 4.5) / 1.9, 0, 1) * 0.35, 0.7, 0.0, 0.015)
citirti = (rng.random(N) > 0.9975).astype(float) * rng.uniform(-1, 1, N)
citirti = bant(citirti, 1500, 9000) * 6
ekle(citirti * aralik(4.9, 6.4, 0.2), 0.45, 0.1, 0.004)
vurus(6.25, 120, 40, 0.9, 0.7)

# 5) Zırh kenetlenmeleri ve miğfer.
for bas, fr, pan in ((6.6, 2300, -0.4), (7.15, 2900, 0.35), (7.7, 2100, -0.2)):
    metal(bas, fr, 0.4, pan)
servo = aralik(8.0, 8.55, 0.08)
servo_f = 260 + 380 * np.clip((t - 8.0) / 0.55, 0, 1)
testere = 2 * ((np.cumsum(servo_f) / SR) % 1) - 1
ekle(bant(testere, 200, 2500) * servo * 0.25, 1.0, 0.2, 0.005)
metal(8.55, 1900, 0.45, 0.0)
vurus(8.55, 110, 38, 1.0, 0.6)

# 6) Gözler yanıyor: parıltı.
parilti = aralik(9.0, 10.6, 0.35) * (0.6 + 0.4 * np.sin(2 * np.pi * 7 * t))
for f, g in ((1760, 0.5), (2637, 0.35), (3520, 0.2)):
    ekle(np.sin(2 * np.pi * f * t) * parilti * g * 0.05, 1.0, 0.0, 0.019)

# 7) Karşı robot: karanlık braam.
braam = zarf(11.0, 0.06, 1.4, egri=2.5)
br = sum(2 * ((np.cumsum(np.full(N, f)) / SR) % 1) - 1 for f in (55, 55.3, 110.4))
ekle(tek_kutup(br, 420) * braam * 0.22, 1.0, 0.0, 0.012)
vurus(11.0, 70, 30, 1.0, 0.6)

# 8) Çarpışma: gerilim + patlama.
hisirti(11.45, 0.7, True, 0.55)
vurus(12.1, 75, 26, 1.5, 1.6)
patla = zarf(12.1, 0.003, 1.45, egri=3.0)
ekle(tek_kutup(gurultu(N), 3800) * patla * 0.6, 1.0, 0.0, 0.021)
ekle(tek_kutup(gurultu(N), 600) * patla * 0.8, 1.0, 0.0, 0.007)
# Patlamanın yankısı: donan son karede uzaklaşan kuyruk.
yanki = zarf(12.35, 0.15, 1.2, egri=2.5)
ekle(tek_kutup(gurultu(N), 900) * yanki * 0.18, 1.0, 0.0, 0.031)

# Son: video bittiğinde ses kesilmez, kısa iner; başta tık sesi olmaz.
kenar = np.clip(t / 0.05, 0, 1) * np.clip((SURE - t) / 0.6, 0, 1)
stereo = np.stack([sol * kenar, sag * kenar], axis=1)
stereo /= max(1e-9, np.abs(stereo).max()) / 0.89

with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((stereo * 32767).astype("<i2").tobytes())
print(f"{sys.argv[1]}: {SURE:.2f} sn, 48 kHz stereo")
