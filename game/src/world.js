// world.js — Emberward's simulation: the game state, the waves, the spires,
// the wraiths, the projectiles and the economy. Rendering lives in render.js;
// input lives in input.js; this file only decides what happens.
import { PATH, HEART, PLOTS, TOWERS, KINDS, WAVES, START_GOLD, WAVE_CLEAR_BONUS } from './config.js';
import { mulberry32, clamp } from './rng.js';
import { sfx } from './audio.js';

export const PATH_LEN = (() => {
  let l = 0;
  for (let i = 0; i < PATH.length - 1; i++) l += Math.hypot(PATH[i + 1][0] - PATH[i][0], PATH[i + 1][1] - PATH[i][1]);
  return l;
})();

export function pathPoint(d) {
  let left = d;
  for (let i = 0; i < PATH.length - 1; i++) {
    const [x1, y1] = PATH[i], [x2, y2] = PATH[i + 1];
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (left <= len) { const t = left / len; return { x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t }; }
    left -= len;
  }
  const l = PATH[PATH.length - 1];
  return { x: l[0], y: l[1] };
}

export function newGame(seed) {
  return {
    seed,
    state: 'title', // title | build | wave | paused | over | win
    wave: 0, gold: START_GOLD, score: 0, heart: HEART.hp, heartMax: HEART.hp, kills: 0,
    towers: [], foes: [], shots: [], zaps: [], parts: [], floats: [],
    spawnQueue: [], spawnT: 0, waveActive: false,
    selected: null, buildType: 'spark', hoverPlot: -1, fast: false,
    shake: 0, time: 0, banner: '', bannerT: 0,
    best: +(localStorage.getItem('emberward-best') || 0),
  };
}

export let G = newGame(1234567);
export let rng = mulberry32(G.seed);
export function resetGame(seed) {
  G = newGame(seed);
  rng = mulberry32(seed);
}
export function saveBest() {
  if (G.score > G.best) {
    G.best = G.score;
    try { localStorage.setItem('emberward-best', String(G.best)); } catch (e) { /* private mode */ }
  }
}

export function plotAt(x, y) {
  let bi = -1, bd = 1e9;
  PLOTS.forEach(([px, py], i) => {
    const d = Math.hypot(x - px, y - py);
    if (d < 28 && d < bd) { bd = d; bi = i; }
  });
  return bi;
}
export function towerAt(x, y) {
  return G.towers.find((t) => Math.hypot(x - t.x, y - t.y) < 26) || null;
}

export function startWave(n) {
  G.wave = n; G.waveActive = true; G.spawnQueue = [];
  for (const [kind, count, gap, mul] of WAVES[n - 1]) {
    for (let i = 0; i < count; i++) G.spawnQueue.push({ kind, at: i * gap, hpMul: mul });
  }
  G.spawnT = 0;
  G.banner = 'WAVE ' + n + ' / 12';
  G.bannerT = 2.2;
  sfx.wave();
}

export function spawnFoe(kind, hpMul, dist) {
  const k = KINDS[kind];
  G.foes.push({
    kind, dist: dist === undefined ? -20 : dist,
    hp: k.hp * hpMul, maxHp: k.hp * hpMul,
    speed: k.speed * (0.92 + rng() * 0.16),
    r: k.r, color: k.color, bounty: k.bounty, leak: k.leak,
    splits: k.splits || null, hpMul,
    slowUntil: 0, hitFlash: 0, dead: false, x: -40, y: -40,
  });
}

export function placeTower(plot, type) {
  const t = TOWERS[type];
  if (G.gold < t.cost) return false;
  G.gold -= t.cost;
  G.towers.push({
    plot, x: PLOTS[plot][0], y: PLOTS[plot][1], type, level: 1, cd: 0,
    angle: -Math.PI / 2,
  });
  sfx.build();
  burst(PLOTS[plot][0], PLOTS[plot][1], t.color, 10);
  return true;
}

export function upgradeTower(t) {
  const cost = Math.round(TOWERS[t.type].cost * 0.9 * t.level);
  if (t.level >= 3 || G.gold < cost) return false;
  G.gold -= cost; t.level++;
  sfx.coin();
  burst(t.x, t.y, '#fff2b0', 12);
  return true;
}

export function sellTower(t) {
  G.gold += Math.round(TOWERS[t.type].cost * 0.6 * t.level);
  G.towers.splice(G.towers.indexOf(t), 1);
  G.selected = null;
  sfx.coin();
}

export function burst(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = rng() * Math.PI * 2, s = 40 + rng() * 120;
    G.parts.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: 0.4 + rng() * 0.35, max: 0.75, color, r: 2 + rng() * 3,
    });
  }
}
export function floatText(x, y, text, color) {
  G.floats.push({ x, y, text, color, life: 1 });
}

function fireAt(t, foe) {
  const d = TOWERS[t.type], mul = 1 + 0.6 * (t.level - 1);
  t.angle = Math.atan2(foe.y - t.y, foe.x - t.x);
  t.cd = 1 / (d.rate * (1 + 0.15 * (t.level - 1)));
  if (t.type === 'prism') {
    // Lightning chains instantly to the nearest foes.
    let from = { x: t.x, y: t.y }, target = foe, dmg = d.dmg * mul;
    const hit = new Set();
    for (let jump = 0; jump < d.chain && target; jump++) {
      hit.add(target);
      G.zaps.push({ x1: from.x, y1: from.y, x2: target.x, y2: target.y, life: 0.14 });
      damageFoe(target, dmg, false);
      from = target;
      dmg *= 0.7;
      let next = null, nd = 110;
      for (const f of G.foes) {
        if (f.dead || hit.has(f)) continue;
        const dd = Math.hypot(f.x - from.x, f.y - from.y);
        if (dd < nd) { nd = dd; next = f; }
      }
      target = next;
    }
    sfx.zap();
    return;
  }
  G.shots.push({
    x: t.x, y: t.y, tx: foe, tx2: { x: foe.x, y: foe.y }, speed: 520,
    dmg: d.dmg * mul,
    splash: d.splash ? d.splash * (1 + 0.25 * (t.level - 1)) : 0,
    color: d.color, kind: t.type,
  });
  sfx.shoot();
}

export function damageFoe(foe, dmg, slow) {
  foe.hp -= dmg;
  foe.hitFlash = 0.09;
  if (slow) foe.slowUntil = G.time + 1.2;
  if (foe.hp <= 0 && !foe.dead) {
    foe.dead = true;
    G.kills++;
    G.gold += foe.bounty;
    G.score += foe.bounty * 10;
    sfx.kill();
    burst(foe.x, foe.y, foe.color, 14);
    floatText(foe.x, foe.y, '+' + foe.bounty + 'g', '#ffd76a');
    if (foe.splits) {
      for (let i = 0; i < 2; i++) spawnFoe(foe.splits, foe.hpMul, Math.max(-20, foe.dist - 12 - i * 14));
    }
  } else if (foe.hp > 0) {
    sfx.hit();
  }
}

export function update(dt) {
  G.time += dt;
  if (G.bannerT > 0) G.bannerT -= dt;
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 30);
  for (const z of G.zaps) z.life -= dt;
  G.zaps = G.zaps.filter((z) => z.life > 0);

  // Spawn the wave, one wraith at a time.
  if (G.waveActive && G.spawnQueue.length) {
    G.spawnT += dt;
    while (G.spawnQueue.length && G.spawnQueue[0].at <= G.spawnT) {
      const s = G.spawnQueue.shift();
      spawnFoe(s.kind, s.hpMul);
    }
  }

  // The wraiths march.
  for (const f of G.foes) {
    const slow = f.slowUntil > G.time ? 0.5 : 1;
    f.dist += f.speed * slow * dt;
    const p = pathPoint(f.dist);
    f.x = p.x; f.y = p.y;
    if (f.hitFlash > 0) f.hitFlash -= dt;
    if (f.dist >= PATH_LEN) {
      f.dead = true;
      G.heart -= f.leak;
      G.shake = 8;
      sfx.leak();
      floatText(HEART.x - 30, HEART.y - 30, '-' + f.leak, '#ff5d7a');
      burst(HEART.x, HEART.y, '#ff5d7a', 16);
      if (G.heart <= 0) {
        G.heart = 0;
        G.state = 'over';
        sfx.over();
        saveBest();
      }
    }
  }
  G.foes = G.foes.filter((f) => !f.dead);

  // The spires fire at the wraith furthest along the road.
  for (const t of G.towers) {
    t.cd -= dt;
    if (t.cd > 0) continue;
    const range = TOWERS[t.type].range * (1 + 0.12 * (t.level - 1));
    let best = null, bd = -1;
    for (const f of G.foes) {
      if (f.dist <= 0) continue;
      const d = Math.hypot(f.x - t.x, f.y - t.y);
      if (d < range && f.dist > bd) { bd = f.dist; best = f; }
    }
    if (best) fireAt(t, best);
  }

  // Projectiles fly to their target.
  for (const s of G.shots) {
    const tx = s.tx && !s.tx.dead ? s.tx : s.tx2;
    const dx = tx.x - s.x, dy = tx.y - s.y, d = Math.hypot(dx, dy), step = s.speed * dt;
    if (d <= step + 6) {
      s.dead = true;
      if (s.splash) {
        burst(tx.x, tx.y, s.color, 10);
        for (const f of G.foes) {
          if (Math.hypot(f.x - tx.x, f.y - tx.y) < s.splash) damageFoe(f, s.dmg, s.kind === 'frost');
        }
      } else if (s.tx && !s.tx.dead) {
        damageFoe(s.tx, s.dmg, s.kind === 'frost');
      }
    } else {
      s.x += dx / d * step;
      s.y += dy / d * step;
    }
  }
  G.shots = G.shots.filter((s) => !s.dead);

  // Particles and floating text fade.
  for (const p of G.parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; }
  G.parts = G.parts.filter((p) => p.life > 0);
  for (const f of G.floats) { f.life -= dt * 0.9; f.y -= 26 * dt; }
  G.floats = G.floats.filter((f) => f.life > 0);

  // Wave cleared: bounty, then the next wave or the win.
  if (G.waveActive && !G.spawnQueue.length && !G.foes.length) {
    G.waveActive = false;
    const bonus = WAVE_CLEAR_BONUS(G.wave);
    G.gold += bonus;
    G.score += bonus * 5;
    floatText(640, 300, 'WAVE CLEAR  +' + bonus + 'g', '#8dff9a');
    if (G.wave >= 12) {
      G.state = 'win';
      sfx.win();
      saveBest();
    } else {
      G.state = 'build';
      G.banner = 'WAVE ' + G.wave + ' CLEAR — press SPACE for the next';
      G.bannerT = 2.5;
    }
  }
}

// Next-wave preview for the build phase: what is coming, in plain words.
export function nextWaveText() {
  if (G.wave >= 12) return 'The Ash King has fallen. The flame endures.';
  const groups = WAVES[G.wave];
  const parts = groups.map(([kind, count]) => count + ' ' + kind + (count > 1 ? 's' : ''));
  return 'Next wave ' + (G.wave + 1) + ': ' + parts.join(', ');
}
