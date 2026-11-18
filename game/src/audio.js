// audio.js — every sound in Emberward, synthesized with WebAudio oscillators.
// No audio files, no network: each effect is a short beep or arpeggio.
let AC = null;
function beep(f, d, type, vol, slide) {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(f, AC.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), AC.currentTime + d);
    g.gain.setValueAtTime(vol || 0.05, AC.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + d);
    o.connect(g); g.connect(AC.destination);
    o.start(); o.stop(AC.currentTime + d);
  } catch (e) { /* headless or muted: silence is fine */ }
}
function arp(notes, step, d, type, vol) {
  notes.forEach((f, i) => setTimeout(() => beep(f, d, type, vol), i * step));
}
export const sfx = {
  shoot() { beep(660, 0.05, 'square', 0.025, -180); },
  zap() { beep(1200, 0.07, 'sawtooth', 0.03, -700); },
  hit() { beep(210, 0.05, 'sawtooth', 0.04, -60); },
  kill() { beep(320, 0.13, 'triangle', 0.07, -190); },
  coin() { beep(920, 0.07, 'sine', 0.05, 360); },
  build() { beep(430, 0.12, 'sine', 0.08, 170); },
  leak() { beep(110, 0.3, 'sawtooth', 0.09, -40); },
  wave() { arp([392, 523, 659], 80, 0.12, 'sine', 0.07); },
  win() { arp([523, 659, 784, 1046], 110, 0.2, 'sine', 0.08); },
  over() { arp([330, 262, 196], 130, 0.25, 'sawtooth', 0.08); },
};
