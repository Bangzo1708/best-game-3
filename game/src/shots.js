// shots.js — deterministic states for Emberward's screenshots, plus a
// headless autoplay that proves the game can be won. A ?shot= URL picks a
// state; the simulation then fast-forwards to it with the fixed seed, so the
// same URL always photographs the same scene.
import { G, resetGame, placeTower, upgradeTower, startWave, update } from './world.js';
import { TOWER_ORDER } from './config.js';

function grantGold() { G.gold = 99999; }
function build(type, plot) { grantGold(); placeTower(plot, type); }
function levelAll(level) { for (const t of G.towers) t.level = level; }

export function setupShot(shot) {
  if (!shot || shot === 'title') return;
  if (shot === 'play') {
    // The cover: wave 5 mid-fight, six spires firing, kills already counted.
    G.state = 'wave';
    build('spark', 0); build('frost', 2); build('mortar', 4);
    build('prism', 6); build('spark', 7); build('frost', 9);
    G.towers[0].level = 2; G.towers[2].level = 2;
    G.gold = 320;
    startWave(5);
    for (let i = 0; i < 1100; i++) update(1 / 60);
    return;
  }
  if (shot === 'boss') {
    // Wave 12: the Ash King marches with his escort, eight spires hold the line.
    G.state = 'wave';
    build('spark', 0); build('spark', 1); build('frost', 2); build('mortar', 3);
    build('mortar', 4); build('prism', 6); build('spark', 7); build('frost', 9);
    levelAll(2);
    G.gold = 540;
    startWave(12);
    for (let i = 0; i < 1500; i++) update(1 / 60);
    return;
  }
  if (shot === 'win') {
    // The morning after: the flame endures, the board still standing.
    build('spark', 0); build('frost', 2); build('mortar', 4);
    G.state = 'win';
    G.wave = 12; G.score = 4820; G.kills = 214; G.gold = 640;
    G.best = Math.max(G.best, G.score);
    return;
  }
}

// A greedy bot plays the whole game headlessly: fill the plots with a mix of
// spires, upgrade the weakest, start every wave. Returns how the run ended,
// so the balance can be checked without playing by hand.
export function autoplay() {
  resetGame(1234567);
  G.state = 'build';
  let steps = 0;
  while (G.state !== 'over' && G.state !== 'win' && steps < 400000) {
    if (G.state === 'build' && !G.waveActive) {
      // Spend gold: new spires first (rotating types), then upgrades.
      const free = [];
      for (let i = 0; i < 12; i++) if (!G.towers.find((t) => t.plot === i)) free.push(i);
      for (const plot of free) {
        const type = TOWER_ORDER[G.towers.length % 4];
        if (!placeTower(plot, type)) break; // cannot afford the next one
      }
      for (const t of [...G.towers].sort((a, b) => a.level - b.level)) {
        if (t.level < 3) upgradeTower(t);
      }
      startWave(G.wave + 1);
      G.state = 'wave';
    }
    update(1 / 60);
    steps++;
  }
  return {
    result: G.state, heart: G.heart, score: G.score, kills: G.kills,
    waves: G.wave, towers: G.towers.length, gold: G.gold, steps,
  };
}
