// rng.js — a small seeded random generator and the numeric helpers the game
// uses. Seeded so a screenshot setup replays the same scene every time.
export function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
