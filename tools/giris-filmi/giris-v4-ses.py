#!/usr/bin/env python3
"""BTMEDYA giriş filmi v4 ses tasarımı (7 Ekim, kullanıcı isteği).

Amaç: okura yapay zekâ / teknoloji hissi. Kaynak planlarda ses yok;
lisanslı müzik kullanılmaz, her şey sentezdir. Kurgu
(tools/giris-filmi/giris-v4.sh) ile aynı çizelge:
  0.00-1.00  altın devreler: elektrik uğultusu, veri bip'leri, 1.00 patlama
  1.00-5.60  stüdyo: 120 BPM dijital arpej, alt bas nabzı
  5.60       piksel geçişi: glitch kekemesi + vuruş; sosyal medya nabzı
  8.50       piksel geçişi: glitch; fütüristik stüdyo, alçalan arpej
  9.25       karakter panele dokunur: arayüz dokunuş sesi + parıltı
  11.60      kameraya döner: kapanış akoru, 15.00'te söner
Bip'ler sabit tohumla üretilir: her çalıştırma aynı sesi verir.

Çalıştır: python3 tools/giris-filmi/giris-v4-ses.py <cikti.wav>
"""
import sys
import wave

import numpy as np

SR = 48000
SURE = 15.0
N = int(SR * SURE)
t = np.arange(N) / SR
rng = np.random.default_rng(20261007)
sol = np.zeros(N)
sag = np.zeros(N)


def tek_kutup(x, kesim, tur="alcak"):
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


def zarf(bas, atak, birak, egri=4.0):
    e = np.zeros(N)
    i0 = int(bas * SR)
    parca = np.concatenate([np.linspace(0, 1, max(int(atak * SR), 1)), np.exp(-egri * np.linspace(0, 1, max(int(birak * SR), 1)))])
    son = min(N, i0 + len(parca))
    if i0 < N:
        e[i0:son] = parca[: son - i0]
    return e


def aralik(bas, bit, yumus=0.25):
    return np.clip((t - bas) / yumus, 0, 1) * np.clip((bit - t) / yumus, 0, 1)


def ekle(x, kazanc=1.0, pan=0.0, genis=0.0):
    global sol, sag
    x = x * kazanc
    k = int(genis * SR)
    sag_x = np.concatenate([np.zeros(k), x[: N - k]]) if k else x
    sol += x * np.sqrt(1 - pan)
    sag += sag_x * np.sqrt(1 + pan)


def vurus(bas, f0=90, f1=34, sure=1.0, kazanc=0.9):
    e = zarf(bas, 0.004, sure, egri=5)
    faz = 2 * np.pi * np.cumsum(f1 + (f0 - f1) * np.exp(-np.clip(t - bas, 0, None) * 6)) / SR
    ekle(np.sin(faz) * e, kazanc)


def hisirti(bas, sure, yukari=True, kazanc=0.4):
    n = int(sure * SR)
    i0 = int(bas * SR)
    k = np.geomspace(300, 6000, n) if yukari else np.geomspace(6000, 220, n)
    x = tek_kutup(tek_kutup(rng.standard_normal(n), k), 150, "yuksek") * np.sin(np.linspace(0, np.pi, n)) ** 2
    y = np.zeros(N)
    son = min(N, i0 + n)
    y[i0:son] = x[: son - i0]
    ekle(y, kazanc, 0.0, 0.013)


def kare(f):
    """Yumuşatılmış kare dalga: dijital, sentez rengi."""
    return np.tanh(4 * np.sin(2 * np.pi * f * t))


def bip(bas, f, sure=0.06, kazanc=0.08, pan=0.0):
    ekle(np.sin(2 * np.pi * f * t) * zarf(bas, 0.002, sure, egri=7), kazanc, pan)


def glitch(bas, sure=0.32, kazanc=0.5):
    """Kekeleyen, bit düşürülmüş gürültü: piksel geçişinin sesi."""
    n = int(sure * SR)
    i0 = int(bas * SR)
    g = rng.standard_normal(n)
    g = np.round(g * 3) / 3  # bit düşürme
    kapi = (np.floor(np.arange(n) / SR * 34) % 2 == 0).astype(float)  # 34 Hz kekeme
    ton = np.sign(np.sin(2 * np.pi * np.geomspace(1800, 300, n) * np.arange(n) / SR))
    x = (0.6 * g + 0.4 * ton) * kapi * np.exp(-3 * np.linspace(0, 1, n))
    y = np.zeros(N)
    son = min(N, i0 + n)
    y[i0:son] = x[: son - i0]
    ekle(bant(y, 400, 9000), kazanc, 0.0, 0.006)


# 1) Altın devreler: elektrik uğultusu, rastgele veri bip'leri, 1.0 patlama.
ekle(bant(rng.standard_normal(N), 200, 1800) * aralik(0.0, 1.1, 0.2) * np.clip(t / 1.0, 0, 1) * 0.3, 1.0, 0.0, 0.012)
for _ in range(26):
    b = rng.uniform(0.05, 14.4)
    bip(b, rng.choice([1567.98, 2093.0, 2637.0, 3135.96, 4186.0]), 0.04, 0.05 if b < 11.6 else 0.03, rng.uniform(-0.8, 0.8))
hisirti(0.35, 0.7, True, 0.5)
vurus(1.0, 95, 30, 1.4, 1.2)
ekle(tek_kutup(rng.standard_normal(N), 3500) * zarf(1.0, 0.003, 1.0, egri=3.5) * 0.45, 1.0, 0.0, 0.021)
citirti = bant((rng.random(N) > 0.9975).astype(float) * rng.uniform(-1, 1, N), 1500, 9000) * 6
ekle(citirti * aralik(1.0, 2.8, 0.2), 0.35, 0.1, 0.004)

# Taban: alt bas dronu tüm film boyunca, sonda genişler.
for f, g in ((55.0, 1.0), (82.41, 0.45), (110.0, 0.35)):
    ekle(np.sin(2 * np.pi * f * t) * g * (0.06 * aralik(0.0, 14.8, 0.8) + 0.04 * aralik(8.5, 14.8, 0.6)), 1.0, 0.0, 0.009)

# 2) Stüdyo (1.2-5.6): 120 BPM, on altılık dijital arpej (A minör), süzgeç açılır.
ARP = (220.0, 261.63, 329.63, 440.0, 329.63, 261.63, 392.0, 329.63)
on_alti = 0.125
arpej = np.zeros(N)
for i in range(int((5.6 - 1.2) / on_alti)):
    b = 1.2 + i * on_alti
    arpej += kare(ARP[i % len(ARP)]) * zarf(b, 0.003, 0.11, egri=6)
ekle(tek_kutup(arpej, np.geomspace(500, 2600, N)) * aralik(1.2, 5.7, 0.4), 0.11, -0.2, 0.011)
for i in range(int((5.6 - 1.2) / 0.5)):
    vurus(1.2 + i * 0.5, 70, 40, 0.3, 0.35)

# 3) Piksel geçişi -> sosyal medya (5.6-8.5): glitch, vuruş, sekizlik nabız.
hisirti(5.2, 0.5, True, 0.4)
glitch(5.55, 0.34, 0.45)
vurus(5.6, 110, 40, 0.8, 0.9)
for i in range(int((8.45 - 5.6) / 0.25)):
    b = 5.6 + i * 0.25
    if i % 2 == 0:
        vurus(b, 80, 45, 0.25, 0.45)
    ekle(bant(rng.standard_normal(N), 6000, 14000) * zarf(b + 0.125, 0.001, 0.05, egri=9), 0.16, 0.3 if i % 2 else -0.3)
for f in (220.0, 261.63, 329.63):
    testere = 2 * ((f * t) % 1) - 1
    ekle(tek_kutup(testere, 1100) * aralik(5.6, 8.6, 0.2) * 0.045, 1.0, 0.0, 0.017)

# 4) Piksel geçişi -> fütüristik stüdyo (8.5): glitch, alçalan arpej, panel dokunuşu.
hisirti(8.1, 0.5, True, 0.35)
glitch(8.45, 0.34, 0.4)
vurus(8.5, 120, 38, 0.9, 0.85)
arpej = np.zeros(N)
for i, f in enumerate((1760.0, 1318.51, 1046.5, 880.0, 659.25, 523.25)):
    arpej += kare(f) * zarf(8.6 + i * 0.09, 0.002, 0.12, egri=7)
ekle(tek_kutup(arpej, 3000), 0.05, 0.3)
# Dokunuş (9.25): arayüz sesi, iki katlı tını + kısa yankı; parmak panelde kalırken parıltı.
for gecikme, kz in ((0.0, 1.0), (0.11, 0.4), (0.22, 0.16)):
    for fr, d in ((1046.5, 0.0), (1567.98, 0.05)):
        ekle(np.sin(2 * np.pi * fr * t) * zarf(9.25 + gecikme + d, 0.003, 0.25, egri=6), 0.13 * kz, -0.35 + gecikme)
parilti = aralik(9.3, 11.6, 0.4) * (0.6 + 0.4 * np.sin(2 * np.pi * 6 * t))
for f, g in ((1760, 0.5), (2637, 0.35), (3520, 0.2)):
    ekle(np.sin(2 * np.pi * f * t) * parilti * g * 0.035, 1.0, 0.0, 0.019)

# 5) Kameraya döner (11.6): kapanış akoru + yükselen arpej, 15.0'te söner.
for f, g in ((110.0, 0.5), (164.81, 0.45), (220.0, 0.4), (261.63, 0.32), (329.63, 0.26), (440.0, 0.16)):
    ekle(np.sin(2 * np.pi * f * t) * zarf(11.6, 0.5, 2.6, egri=2.0) * g * 0.22, 1.0, 0.0, 0.012)
vurus(11.6, 70, 28, 1.4, 0.85)
for i, f in enumerate((440.0, 523.25, 659.25, 880.0, 1046.5, 1318.51, 1760.0)):
    bip(11.75 + i * 0.12, f, 0.18, 0.05 * (1 - i / 9), -0.4 + i * 0.12)

# 6) Kimlik kartları (giris-katman.py): her kart girişinde kısa hava sesi,
# kicker harfleri otururken veri tıkırtısı.
for bas in (0.45, 2.25, 3.85, 5.95, 8.85):
    hisirti(bas - 0.05, 0.3, True, 0.18)
    for i in range(7):
        bip(bas + 0.12 + i * 0.03, 2637.0 + 220 * (i % 3), 0.02, 0.035, -0.5 + i * 0.15)

kenar = np.clip(t / 0.05, 0, 1) * np.clip((SURE - t) / 0.6, 0, 1)
stereo = np.stack([sol * kenar, sag * kenar], axis=1)
stereo /= max(1e-9, np.abs(stereo).max()) / 0.89
with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((stereo * 32767).astype("<i2").tobytes())
print(f"{sys.argv[1]}: {SURE:.1f} sn")
