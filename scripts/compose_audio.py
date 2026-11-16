#!/usr/bin/env python3
"""Original Moonlit score and sound design. No samples, recordings or AI API calls.

Requires Python 3.9+, numpy, scipy and ffmpeg. Run from any directory.
Masters stay in ignored .local/audio-masters; portable game assets go in public/audio/v1.
"""
import json
import math
import subprocess
from pathlib import Path

import numpy as np
from scipy import fft, signal
from scipy.io import wavfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/audio/v1"
MASTERS = ROOT / ".local/audio-masters"
SR = 44100
BPM = 72
BEAT = 60 / BPM
BARS = 32
PERIOD = round(BARS * 4 * BEAT * SR)
RNG = np.random.default_rng(20261116)
OUT.mkdir(parents=True, exist_ok=True)
MASTERS.mkdir(parents=True, exist_ok=True)


def hz(note):
    if isinstance(note, (int, float)):
        return float(note)
    names = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
    accidental = 1 if "#" in note else -1 if "b" in note else 0
    midi = 12 * (int(note[-1]) + 1) + names[note[0]] + accidental
    return 440 * 2 ** ((midi - 69) / 12)


def timebase(seconds):
    return np.arange(round(seconds * SR), dtype=np.float32) / SR


def edges(x, attack=0.005, release=0.04):
    a, r = min(round(attack * SR), len(x)), min(round(release * SR), len(x))
    x[:a] *= np.sin(np.linspace(0, math.pi / 2, a)) ** 2
    x[-r:] *= np.sin(np.linspace(math.pi / 2, 0, r)) ** 2
    return x.astype(np.float32)


def pluck(note, seconds=2.8, felt=False):
    t = timebase(seconds)
    f = hz(note)
    voice = np.zeros_like(t)
    weights = [1, .24, .10, .035, .012] if felt else [1, .34, .16, .065, .025]
    for harmonic, weight in enumerate(weights, 1):
        decay = (1.12 if felt else .83) / harmonic ** .43
        phase = 2 * np.pi * f * harmonic * t
        voice += weight * np.exp(-t / decay) * (np.sin(phase) + .14 * np.sin(phase * 1.0009))
    return edges(voice / sum(weights), .012 if felt else .003, .12)


def bell(note, seconds=2.3):
    t = timebase(seconds)
    voice = np.zeros_like(t)
    for ratio, weight, decay in [(1, 1, 1.1), (2.006, .24, .7), (3.99, .055, .35), (5.41, .015, .18)]:
        voice += weight * np.sin(2 * np.pi * hz(note) * ratio * t) * np.exp(-t / decay)
    return edges(voice, .007, .16)


def pad(note, seconds):
    t = timebase(seconds)
    f = hz(note)
    voice = np.zeros_like(t)
    for detune in [-.0018, 0, .0018]:
        phase = 2 * np.pi * f * (1 + detune) * t + RNG.uniform(0, 2 * np.pi)
        voice += np.sin(phase) + .18 * np.sin(2 * phase) + .045 * np.sin(3 * phase)
    voice *= (.94 + .06 * np.sin(2 * np.pi * .17 * t)) / 3.7
    return edges(voice, 1.15, 2.7)


def air(seconds, center=2400, width=1400):
    raw = RNG.normal(0, 1, round(seconds * SR)).astype(np.float32)
    filt = signal.butter(2, [max(80, center - width / 2), min(14000, center + width / 2)], fs=SR, btype="bandpass", output="sos")
    return signal.sosfilt(filt, raw).astype(np.float32)


def rustle(seconds=.25):
    t = timebase(seconds)
    texture = air(seconds, 3100, 3600)
    texture *= np.sin(np.pi * t / seconds) ** 2
    texture *= .7 + .3 * np.sin(2 * np.pi * 53 * t + 1)
    return edges(texture * .48, .008, .025)


def add(mix, voice, when, gain=1, pan=0, wrap=False):
    position = round(when * SR)
    left, right = math.cos((pan + 1) * math.pi / 4), math.sin((pan + 1) * math.pi / 4)
    if wrap:
        indexes = (position + np.arange(len(voice))) % len(mix)
        np.add.at(mix[:, 0], indexes, voice * gain * left)
        np.add.at(mix[:, 1], indexes, voice * gain * right)
    else:
        length = min(len(voice), len(mix) - position)
        if length > 0:
            mix[position:position + length, 0] += voice[:length] * gain * left
            mix[position:position + length, 1] += voice[:length] * gain * right


def reverb(mix, wet=.22, circular=False, seconds=2.6):
    for channel in range(2):
        ir = np.zeros(round(seconds * SR), dtype=np.float32)
        for delay, volume in [(.027, .35), (.051, .26), (.089, .2), (.137, .15), (.213, .1)]:
            ir[round((delay + channel * .0031) * SR)] = volume
        noise = air(seconds, 1700 + channel * 130, 2600)
        t = timebase(seconds)
        tail = noise * np.exp(-t * 3.6 / seconds) * (1 - np.exp(-t * 24))
        tail /= max(1, np.sqrt(np.sum(tail ** 2)))
        ir += tail * .42
        if circular:
            reflection = fft.irfft(fft.rfft(mix[:, channel]) * fft.rfft(ir, len(mix)), len(mix))
        else:
            reflection = signal.fftconvolve(mix[:, channel], ir)[:len(mix)]
        mix[:, channel] += reflection * wet
    return mix


def export(name, mix, description, loop=False, target_rms=.085):
    mix -= np.mean(mix, axis=0)
    rms = float(np.sqrt(np.mean(mix ** 2)))
    mix *= min(target_rms / max(rms, 1e-8), .68 / max(float(np.max(np.abs(mix))), 1e-8))
    if not loop:
        for channel in range(2):
            edges(mix[:, channel], .004, .06)
    master = MASTERS / f"{name}.wav"
    wavfile.write(master, SR, np.round(np.clip(mix, -1, 1) * 32767).astype(np.int16))
    common = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(master), "-map_metadata", "-1"]
    subprocess.run(common + ["-c:a", "libopus", "-b:a", "128k", "-vbr", "on", "-application", "audio", str(OUT / f"{name}.ogg")], check=True)
    subprocess.run(common + ["-c:a", "libmp3lame", "-b:a", "160k", str(OUT / f"{name}.mp3")], check=True)
    info = {"id": name, "description": description, "duration": round(len(mix) / SR, 6), "masterSampleRate": SR, "channels": 2, "loop": loop,
            "peakDbFS": round(20 * math.log10(max(float(np.max(np.abs(mix))), 1e-9)), 2),
            "rmsDbFS": round(20 * math.log10(max(float(np.sqrt(np.mean(mix ** 2))), 1e-9)), 2),
            "ogg": f"/audio/v1/{name}.ogg", "mp3": f"/audio/v1/{name}.mp3"}
    if loop:
        info["seamDelta"] = round(float(np.max(np.abs(mix[0] - mix[-1]))), 7)
    return info


# Two bars per harmony. Written melody, sparse off-beat harp and a slow string-like pad.
HARMONY = [
    ["D3", "A3", "C4", "E4", "F4"], ["Bb2", "F3", "A3", "D4", "F4"],
    ["F3", "A3", "C4", "E4", "G4"], ["C3", "G3", "C4", "D4", "E4"],
    ["G2", "D3", "F3", "A3", "Bb3"], ["A2", "D3", "F3", "A3", "E4"],
    ["Bb2", "F3", "A3", "D4", "F4"], ["C3", "G3", "Bb3", "D4", "F4"],
    ["F3", "A3", "C4", "E4", "G4"], ["C3", "G3", "B3", "D4", "E4"],
    ["G2", "D3", "G3", "A3", "B3"], ["D3", "A3", "C4", "E4", "F4"],
    ["Bb2", "F3", "A3", "D4", "F4"], ["G2", "D3", "F3", "A3", "Bb3"],
    ["C3", "G3", "C4", "D4", "E4"], ["D3", "A3", "C4", "E4", "F4"],
]
MELODY = [
    [(0, "A4"), (1.5, "D5"), (3.5, "E5"), (4.5, "F5"), (6.5, "E5")],
    [(1, "D5"), (4, "C5"), (5.5, "A4")],
    [(.5, "C5"), (2, "E5"), (4, "G5"), (6.5, "E5")],
    [(1, "D5"), (3, "E5"), (5, "G4"), (6.5, "A4")],
    [(0, "Bb4"), (2.5, "A4"), (4, "G4"), (6, "D5")],
    [(1, "E5"), (3, "F5"), (5.5, "D5")],
    [(0, "A4"), (2, "C5"), (4, "D5"), (6.5, "F5")],
    [(1, "E5"), (3.5, "D5"), (6, "C5")],
    [(.5, "A5"), (2.5, "G5"), (5, "E5")],
    [(1, "G5"), (3, "E5"), (5.5, "D5")],
    [(.5, "B4"), (2, "D5"), (4.5, "A4"), (6.5, "G4")],
    [(1, "A4"), (3, "E5"), (5, "F5"), (7, "E5")],
    [(0, "D5"), (3, "A4"), (5.5, "F4")],
    [(1, "G4"), (3, "Bb4"), (5, "A4")],
    [(1, "G4"), (3, "D5"), (5.5, "E5")],
    [(0, "F5"), (2.5, "E5"), (4, "D5"), (6.5, "A4")],
]


def compose_music():
    music = np.zeros((PERIOD, 2), dtype=np.float32)
    for section, chord in enumerate(HARMONY):
        start = section * 8 * BEAT
        for index, note in enumerate(chord):
            add(music, pad(note, 8 * BEAT + 2.7), start, .032, (index - 2) * .23, True)
        # Gentle pulse, never a metronome or drum beat.
        for index, offset in enumerate([0, 1.5, 3, 4, 5.5, 7]):
            note = chord[[1, 3, 4, 2, 4, 3][index]]
            add(music, pluck(hz(note) * 2, 2.8), start + offset * BEAT + .015 * (index % 2), .032 if index % 3 else .042, (-1 if index % 2 else 1) * .45, True)
        for index, (offset, note) in enumerate(MELODY[section]):
            add(music, pluck(note, 3.8, felt=True), start + offset * BEAT, .118 * (1 + .09 * math.sin(index + section)), .12 * math.sin(section), True)
        if section in [0, 4, 8, 12]:
            add(music, bell(hz(chord[3]) * 2, 4), start + 6 * BEAT, .024, -.36, True)
    music = reverb(music, .34, circular=True, seconds=3.6)
    return export("moonlit-nocturne", music, "月下回声 · 72 BPM · 32小节 · 原创竖琴、毡音键盘、玻璃钟与暖色铺底", True, .09)


DESIGNS = {
    "tap": (.22, "导航、选项与轻触：一颗温暖木质音粒"),
    "open": (.85, "打开面板或牌面故事：轻盈的上行双音"),
    "close": (.55, "关闭面板：柔和的下行双音"),
    "shuffle": (1.05, "洗牌：六次交叠的纸张摩擦，由左至右散开"),
    "select": (.72, "选中一张牌：竖琴泛音，轻而清晰"),
    "deselect": (.48, "放回一张牌：短促、柔和的下行音"),
    "deal": (1.15, "确认牌阵：纸张铺开与三颗低声竖琴音"),
    "flip": (1.0, "逐张翻牌：纸张掠过，随后亮起一声玻璃钟"),
    "reveal-all": (1.7, "全部揭晓：三次依次展开的纸张与上行钟音"),
    "send": (.8, "发起解读或追问：两颗向上漂浮的音粒"),
    "ready": (2.7, "初次解读完成：D小调九和弦，舒展而平静"),
    "answer": (1.55, "追问收到回复：简短、明亮的回应"),
    "cancel": (.5, "停止回答或取消：短而克制的收束"),
    "reset": (1.1, "开始新的占卜：回旋气流与低音竖琴"),
    "erase": (.55, "删除记录：柔软的纸张收拢声"),
    "error": (.8, "请求失败：两颗温和的低音提醒，不使用警报"),
    "success": (1.2, "设置保存成功：简短的上行和弦"),
}


def compose_effect(name, seconds, description):
    mix = np.zeros((round(seconds * SR), 2), dtype=np.float32)
    def tone(note, when=0, gain=.18, pan=0, glass=False):
        voice = bell(note, max(.1, seconds - when)) if glass else pluck(note, max(.1, seconds - when), felt=True)
        add(mix, voice, when, gain, pan)
    def paper(when=0, length=.2, gain=.22, pan=0):
        add(mix, rustle(length), when, gain, pan)
    if name == "tap":
        tone("D5", gain=.16)
        paper(length=.04, gain=.04)
    elif name in ["open", "close", "send", "cancel", "answer", "success", "deselect"]:
        notes = {"open": ["A4", "E5"], "close": ["A4", "D4"], "send": ["D5", "A5"], "cancel": ["F4", "D4"],
                 "answer": ["A5", "D6"], "success": ["D5", "F5", "A5"], "deselect": ["A4", "F4"]}[name]
        for i, note in enumerate(notes):
            tone(note, i * .105, .16, (i - .5) * .2, glass=name in ["answer", "send"])
    elif name == "select":
        tone("A5", gain=.17)
        tone("D6", .035, .055, .15, True)
        paper(length=.075, gain=.08)
    elif name == "shuffle":
        for i in range(6):
            paper(i * .115, .24, .22 + .025 * (i % 2), -.65 + i * .26)
    elif name == "deal":
        for i, note in enumerate(["D4", "A4", "D5"]):
            paper(i * .13, .23, .15, -.4 + .4 * i)
            tone(note, .08 + i * .13, .09, -.4 + .4 * i)
    elif name in ["flip", "reveal-all"]:
        notes = ["D6"] if name == "flip" else ["A5", "D6", "F6"]
        for i, note in enumerate(notes):
            paper(i * .2, .24, .19, -.3 + i * .3)
            tone(note, .1 + i * .2, .12, -.2 + i * .2, True)
    elif name == "ready":
        for i, note in enumerate(["D4", "A4", "F5", "E6"]):
            tone(note, i * .13, .14 if i < 3 else .07, -.3 + i * .2, i == 3)
    elif name == "reset":
        t = timebase(.7)
        add(mix, air(.7, 1600, 2100) * np.sin(np.pi * t / .7) ** 2, 0, .06, -.2)
        tone("D4", .23, .18)
        tone("A4", .38, .07, .2)
    elif name == "erase":
        paper(0, .22, .27, -.2)
        paper(.14, .16, .18, .2)
    elif name == "error":
        tone("D4", gain=.13)
        tone("C4", .19, .12)
    mix = reverb(mix, .16 if name not in ["ready", "answer"] else .28, seconds=.7)
    return export(name, mix, description, target_rms=.065 if name in ["tap", "error"] else .085)


if __name__ == "__main__":
    score = {"title": "月下回声", "englishTitle": "Moonlit Nocturne", "bpm": BPM, "timeSignature": "4/4", "bars": BARS,
             "harmony": HARMONY, "melody": MELODY, "credits": "Original composition and procedural sound design for Moonlit. No third-party samples or recordings."}
    (OUT / "score.json").write_text(json.dumps(score, ensure_ascii=False, indent=2) + "\n")
    tracks = [compose_music()]
    for name, (seconds, description) in DESIGNS.items():
        tracks.append(compose_effect(name, seconds, description))
    (OUT / "manifest.json").write_text(json.dumps({"version": 1, "tracks": tracks}, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"musicSeconds": tracks[0]["duration"], "effects": len(DESIGNS), "musicPeakDbFS": tracks[0]["peakDbFS"], "loopSeamDelta": tracks[0]["seamDelta"]}, ensure_ascii=False))
