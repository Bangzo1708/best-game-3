// main.js — Emberward's entrypoint in the browser: it wires the canvas, the
// input, the simulation and the renderer together and runs the frame loop.
// The game is fully playable from this file's module graph, offline.
import { W, H, TOWER_ORDER } from './config.js';
import { G, resetGame, update, startWave, placeTower, upgradeTower, sellTower } from './world.js';
import { draw } from './render.js';
import { attachInput } from './input.js';
import { setupShot, autoplay } from './shots.js';

const params = new URLSearchParams(location.search);
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const SEED = Number.isInteger(seedParam) ? seedParam : 1234567;
resetGame(SEED);

const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
const statusEl = document.getElementById('status');

attachInput(cv, {
  onTitleStart() { G.state = 'build'; },
  onRestart() { resetGame(SEED); G.state = 'build'; },
  onPauseToggle() {
    if (G.state === 'wave') G.state = 'paused';
    else if (G.state === 'paused') G.state = 'wave';
  },
  onStartWave() { startWave(G.wave + 1); G.state = 'wave'; },
  onToggleFast() { G.fast = !G.fast; },
  onSelectBuild(k) { G.buildType = TOWER_ORDER[+k - 1]; G.selected = null; },
  onUpgrade() { if (G.selected) upgradeTower(G.selected); },
  onSell() { if (G.selected) sellTower(G.selected); },
  onPlotClick(plot) { placeTower(plot, G.buildType); },
  onTowerClick(t) { G.selected = t; },
});

setupShot(params.get('shot'));

let last = 0;
function frame(t) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (t - last) / 1000 || 0.016);
  last = t;
  if (G.state === 'wave') {
    const steps = G.fast ? 2 : 1;
    for (let i = 0; i < steps; i++) update(dt);
  }
  draw(ctx);
  if (statusEl) {
    statusEl.textContent = G.state + ' wave ' + G.wave + ' gold ' + G.gold +
      ' heart ' + G.heart + ' score ' + G.score;
  }
}
requestAnimationFrame(frame);

// Hooks for the screenshot driver and the balance check.
window.__shotState = () => G.state + ' wave=' + G.wave + ' gold=' + G.gold +
  ' heart=' + G.heart + ' score=' + G.score + ' kills=' + G.kills +
  ' foes=' + G.foes.length + ' towers=' + G.towers.length;
window.__autoplay = () => JSON.stringify(autoplay());
