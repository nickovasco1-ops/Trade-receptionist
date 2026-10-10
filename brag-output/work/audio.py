"""Soundtrack for the Trade Receptionist brag video.

120 BPM, A minor (i–VI–III–VII), resolving to C major on the outro.
Every sound effect is pitched to the chord underneath it and sent through
the same reverb as the music, so the effects sit inside the track.
"""
import numpy as np
import wave
import sys

SR = 48000
DUR = 21.0
N = int(SR * DUR)
BEAT = 0.5
rng = np.random.default_rng(7)


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def t_arr(d):
    return np.arange(int(SR * d)) / SR


def env_adsr(n, a, d, s, r, sustain_len):
    a_n, d_n, r_n = int(a * SR), int(d * SR), int(r * SR)
    s_n = max(0, int(sustain_len * SR) - a_n - d_n)
    e = np.concatenate([
        np.linspace(0, 1, a_n, endpoint=False),
        np.linspace(1, s, d_n, endpoint=False),
        np.full(s_n, s),
        np.linspace(s, 0, r_n),
    ])
    out = np.zeros(n)
    out[: min(n, len(e))] = e[:n]
    return out


def lowpass(x, cutoff):
    # one-pole, cutoff may be an array
    cutoff = np.broadcast_to(cutoff, x.shape)
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.zeros_like(x)
    z = 0.0
    for i in range(len(x)):
        z = (1 - a[i]) * x[i] + a[i] * z
        y[i] = z
    return y


def place(bus, sig, start):
    i = int(start * SR)
    j = min(len(bus), i + len(sig))
    if j > i:
        bus[i:j] += sig[: j - i]


# ---------- harmony ----------
AM, F, C, G = [57, 60, 64], [53, 57, 60], [48, 52, 55, 60], [55, 59, 62]
BARS = [(0, AM), (2, F), (4, C), (6, G), (8, AM), (10, F), (12, C), (14, G), (16, F), (18, C)]
ROOTS = {0: 45, 2: 41, 4: 48, 6: 43, 8: 45, 10: 41, 12: 48, 14: 43, 16: 41, 18: 36}

music = np.zeros(N)
sfx = np.zeros(N)
verb_send = np.zeros(N)

# ---------- pad ----------
pad = np.zeros(N)
for start, chord in BARS:
    length = 3.0 if start == 18 else 2.0
    tt = t_arr(length + 0.6)
    sig = np.zeros_like(tt)
    for m in chord + [chord[0] + 12]:
        for det in (-0.07, 0.07):
            f = hz(m + det)
            # soft saw: a few harmonics
            sig += sum(np.sin(2 * np.pi * f * k * tt) / k for k in range(1, 6)) * 0.12
    e = env_adsr(len(tt), 0.35 if start else 0.8, 0.4, 0.8, 0.6, length)
    place(pad, sig * e, start)
cut = 500 + 1600 * np.clip((np.arange(N) / SR - 2.5) / 4, 0, 1)   # opens up after the hook
cut += 1400 * np.clip((np.arange(N) / SR - 17.6) / 1.2, 0, 1)     # brightens into the outro
pad = lowpass(pad, cut)
music += pad * 0.22
verb_send += pad * 0.25

# ---------- kick (from 3.0, four on the floor, ends at 18) ----------
def kick():
    tt = t_arr(0.35)
    f = 45 + 75 * np.exp(-tt * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-tt * 9) * 0.9

for b in np.arange(3.0, 18.0, BEAT):
    place(music, kick() * (0.5 if b < 7 else 0.6), b)
place(music, kick() * 0.7, 18.0)

# ---------- bass: eighth-note roots, sidechained by the kick ----------
bass = np.zeros(N)
for start, root in ROOTS.items():
    if start < 3:
        continue
    for k in range(4 if start < 18 else 1):
        on = start + k * BEAT + BEAT / 2 if start < 18 else start
        d = 0.22 if start < 18 else 2.6
        tt = t_arr(d)
        f = hz(root)
        s = np.tanh(1.6 * (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(4 * np.pi * f * tt)))
        place(bass, s * env_adsr(len(tt), 0.005, 0.08, 0.6, 0.06 if start < 18 else 1.6, d), on)
    if start < 18:
        for k in range(4):
            place(bass, (lambda tt: np.tanh(1.4 * np.sin(2 * np.pi * hz(root) * tt)) *
                         env_adsr(len(tt), 0.005, 0.05, 0.4, 0.05, 0.12))(t_arr(0.18)), start + k * BEAT)
music += lowpass(bass, 900) * 0.30

# ---------- hats (offbeat, from 7.0) ----------
for b in np.arange(7.0, 18.0, BEAT):
    tt = t_arr(0.05)
    n = rng.standard_normal(len(tt))
    n = n - lowpass(n, 7000)
    place(music, n * np.exp(-tt * 90) * 0.10, b + BEAT / 2)

# ---------- pluck arpeggio (7 – 18) ----------
pl = np.zeros(N)
for start, chord in BARS:
    if start < 7 or start >= 18:
        continue
    notes = [m + 12 for m in chord] + [chord[1] + 24]
    for k in range(16):
        on = start + k * 0.125
        if on < 7.0:
            continue
        m = notes[k % len(notes)]
        tt = t_arr(0.3)
        f = hz(m)
        s = (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * 2 * f * tt)) * np.exp(-tt * 18)
        place(pl, s * (0.9 if k % 4 == 0 else 0.55), on)
pl = lowpass(pl, 3200)
music += pl * 0.07
verb_send += pl * 0.12

# ---------- SFX (all in key) ----------
def tone(freqs, d, decay, level=1.0, trem=0.0):
    tt = t_arr(d)
    s = sum(np.sin(2 * np.pi * f * tt) for f in freqs) / len(freqs)
    if trem:
        s *= 0.75 + 0.25 * np.sin(2 * np.pi * trem * tt)
    e = np.minimum(1, tt / 0.01) * np.exp(-tt * decay)
    return s * e * level

# ring: UK-style double ring, A5 + E6 with a soft warble, shaped so it is not shrill
def ring_burst(d=0.36):
    tt = t_arr(d)
    s = (np.sin(2 * np.pi * hz(81) * tt) + 0.6 * np.sin(2 * np.pi * hz(88) * tt)) / 1.6
    s *= 0.7 + 0.3 * np.sin(2 * np.pi * 20 * tt)
    e = np.minimum(1, tt / 0.02) * np.minimum(1, (d - tt) / 0.04)
    return lowpass(s * e, 3500)

for on in (0.25, 0.75, 1.55, 2.05):
    place(sfx, ring_burst() * 0.16, on)

# connect: soft click + low A
place(sfx, tone([hz(69), hz(76)], 0.3, 14, 0.16), 2.82)

# chips: rising chord tones of Am
for on, m in zip((8.7, 9.1, 9.5, 9.9), (81, 84, 88, 93)):
    place(sfx, tone([hz(m)], 0.4, 16, 0.11), on)

# SMS chime: two notes inside F (C6 → A6)
place(sfx, tone([hz(84)], 0.9, 6, 0.15), 11.45)
place(sfx, tone([hz(93)], 1.1, 5, 0.13), 11.60)

# diary thunk: G2 body + a soft wooden tick
tt = t_arr(0.4)
place(sfx, np.sin(2 * np.pi * hz(43) * tt) * np.exp(-tt * 14) * 0.35, 15.62)
place(sfx, tone([hz(79), hz(86)], 0.25, 25, 0.10), 15.62)

# outro: noise riser into 18, then a bell on C
tt = t_arr(1.0)
nz = rng.standard_normal(len(tt))
riser = lowpass(nz, 300 + 5000 * (tt / 1.0) ** 2) * (tt / 1.0) ** 2 * 0.10
place(sfx, riser, 17.0)
place(sfx, tone([hz(72), hz(79), hz(84)], 3.0, 1.4, 0.16), 18.0)

verb_send += sfx * 0.45

# ---------- reverb (shared space) ----------
ir_t = t_arr(1.4)
ir = rng.standard_normal(len(ir_t)) * np.exp(-ir_t * 4.0)
ir = lowpass(ir, 4500)
ir /= np.sqrt(np.sum(ir ** 2))
L = len(verb_send) + len(ir) - 1
nfft = 1 << (L - 1).bit_length()
wet = np.fft.irfft(np.fft.rfft(verb_send, nfft) * np.fft.rfft(ir, nfft), nfft)[: N]

mix = music + sfx + wet * 0.35

# gentle sidechain on everything but the kick feel: duck pad slightly on beats
# fade in / out
ts = np.arange(N) / SR
mix *= np.minimum(1, ts / 0.15) * np.clip((DUR - ts) / 0.6, 0, 1)
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
mix /= np.max(np.abs(mix)) + 1e-9
mix *= 0.89

# stereo: slight width from a short delay on the wet
stereo = np.stack([mix, mix], axis=1)
d = int(0.012 * SR)
stereo[d:, 1] = 0.85 * mix[d:] + 0.15 * mix[:-d]

out = sys.argv[1] if len(sys.argv) > 1 else 'music.wav'
pcm = (np.clip(stereo, -1, 1) * 32767).astype('<i2')
with wave.open(out, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('wrote', out)
