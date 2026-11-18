// input.js — mouse and keyboard for Emberward. It only translates browser
// events into game actions; the actions themselves live in world.js and
// main.js. Game coordinates are scaled from the canvas box, so the game
// plays the same at any display size.
import { W, H } from './config.js';
import { G, plotAt, towerAt } from './world.js';

export function attachInput(canvas, actions) {
  function toGame(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (W / r.width),
      y: (e.clientY - r.top) * (H / r.height),
    };
  }
  canvas.addEventListener('mousemove', (e) => {
    const { x, y } = toGame(e);
    G.hoverPlot = plotAt(x, y);
  });
  canvas.addEventListener('click', (e) => {
    const { x, y } = toGame(e);
    if (G.state === 'title') { actions.onTitleStart(); return; }
    if (G.state === 'over' || G.state === 'win') return;
    const pi = plotAt(x, y);
    if (pi >= 0) {
      const taken = G.towers.find((t) => t.plot === pi);
      if (taken) { actions.onTowerClick(taken); return; }
      actions.onPlotClick(pi);
      return;
    }
    const t = towerAt(x, y);
    actions.onTowerClick(t || null);
  });
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === ' ') e.preventDefault();
    if (G.state === 'title' && (k === ' ' || k === 'enter')) { actions.onTitleStart(); return; }
    if ((G.state === 'over' || G.state === 'win') && k === 'r') { actions.onRestart(); return; }
    if (k === 'p') { actions.onPauseToggle(); return; }
    if (G.state !== 'build' && G.state !== 'wave') return;
    if (k === ' ' && G.state === 'build') { actions.onStartWave(); return; }
    if (k === 'f') { actions.onToggleFast(); return; }
    if (k === 'r') { actions.onRestart(); return; }
    if (k === '1' || k === '2' || k === '3' || k === '4') { actions.onSelectBuild(k); return; }
    if (k === 'u') { actions.onUpgrade(); return; }
    if (k === 'x') { actions.onSell(); return; }
  });
}
