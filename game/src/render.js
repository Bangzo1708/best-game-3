// render.js — every pixel of Emberward: the night, the road, the spires, the
// wraiths, the HUD and the screens. Reads the state from world.js; draws it
// and nothing else. Visual-only randomness uses its own seeded generator so
// the simulation stays deterministic.
import { W, H, TAU, PATH, HEART, PLOTS, TOWERS, TOWER_ORDER } from './config.js';
import { G, nextWaveText } from './world.js';
import { mulberry32 } from './rng.js';

const vrng = mulberry32(20261118);
const STARS = Array.from({ length: 80 }, () => ({
  x: vrng() * W, y: vrng() * H, r: vrng() < 0.12 ? 3 : 2, a: 0.2 + vrng() * 0.6,
}));
const FIREFLIES = Array.from({ length: 26 }, () => ({
  x: vrng() * W, y: 60 + vrng() * (H - 140), ph: vrng() * TAU, sp: 0.3 + vrng() * 0.7,
}));
const CRYSTALS = [
  [90, 480], [360, 90], [700, 660], [980, 120], [1180, 620], [520, 560], [840, 480], [250, 560],
];

export function draw(ctx) {
  ctx.save();
  if (G.shake > 0) ctx.translate((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake);

  // Night ground, stars, moon and nebula.
  ctx.fillStyle = '#120e1e';
  ctx.fillRect(-20, -20, W + 40, H + 40);
  for (const s of STARS) {
    ctx.globalAlpha = s.a * (0.7 + 0.3 * Math.sin(G.time * 1.5 + s.x));
    ctx.fillStyle = '#cfc4ff';
    ctx.fillRect(s.x, s.y, s.r, s.r);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(90,60,160,0.16)';
  ctx.beginPath(); ctx.arc(300, 130, 170, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(40,110,160,0.13)';
  ctx.beginPath(); ctx.arc(1050, 580, 190, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffeec2';
  ctx.beginPath(); ctx.arc(1150, 70, 34, 0, TAU); ctx.fill();
  ctx.fillStyle = '#e8d9a8';
  ctx.beginPath(); ctx.arc(1140, 62, 8, 0, TAU); ctx.arc(1162, 80, 6, 0, TAU); ctx.fill();

  // Fireflies drift through the dark.
  for (const f of FIREFLIES) {
    const fx = f.x + Math.sin(G.time * f.sp + f.ph) * 14;
    const fy = f.y + Math.cos(G.time * f.sp * 0.8 + f.ph) * 10;
    ctx.globalAlpha = 0.35 + 0.3 * Math.sin(G.time * 2 + f.ph);
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath(); ctx.arc(fx, fy, 2.2, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Crystals glint on the ground.
  for (const [x, y] of CRYSTALS) {
    ctx.fillStyle = '#7dd7ff';
    ctx.globalAlpha = 0.5 + 0.2 * Math.sin(G.time * 2 + x);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-5, -5, 10, 10);
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  // A still pond and a ruined arch fill the hollow inside the road's loop.
  ctx.fillStyle = 'rgba(60,110,160,0.35)';
  ctx.beginPath(); ctx.ellipse(830, 400, 90, 42, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(140,190,230,0.35)';
  ctx.beginPath(); ctx.ellipse(830, 400, 62, 26, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#4a3f6e'; ctx.lineWidth = 10;
  ctx.beginPath(); ctx.arc(700, 420, 34, Math.PI, 0); ctx.stroke();
  ctx.fillStyle = '#3a2f55';
  ctx.fillRect(662, 420, 12, 26); ctx.fillRect(726, 420, 12, 26);

  // The road.
  ctx.strokeStyle = '#3a2f55'; ctx.lineWidth = 46; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); PATH.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
  ctx.strokeStyle = '#54467a'; ctx.lineWidth = 38;
  ctx.beginPath(); PATH.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
  ctx.strokeStyle = '#6b5a94'; ctx.lineWidth = 2; ctx.setLineDash([14, 18]);
  ctx.beginPath(); PATH.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
  ctx.setLineDash([]);

  // Lantern plots.
  PLOTS.forEach(([x, y], i) => {
    const taken = G.towers.find((t) => t.plot === i);
    ctx.fillStyle = taken ? '#241d3a' : '#1d1830';
    ctx.strokeStyle = G.hoverPlot === i ? '#ffd76a' : '#4a3f6e';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 24, 0, TAU); ctx.fill(); ctx.stroke();
    if (!taken) {
      ctx.fillStyle = '#6b5a94';
      ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
      ctx.fillText('+', x, y + 5);
    }
  });

  // The Emberheart, pulsing.
  const pulse = 1 + Math.sin(G.time * 3) * 0.08;
  const hg = ctx.createRadialGradient(HEART.x, HEART.y, 4, HEART.x, HEART.y, 90 * pulse);
  hg.addColorStop(0, 'rgba(255,190,80,0.9)');
  hg.addColorStop(0.5, 'rgba(255,110,60,0.35)');
  hg.addColorStop(1, 'rgba(255,110,60,0)');
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.arc(HEART.x, HEART.y, 90 * pulse, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffbe50';
  ctx.beginPath(); ctx.arc(HEART.x, HEART.y, 20 * pulse, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath(); ctx.arc(HEART.x, HEART.y, 10 * pulse, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffd76a';
  ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
  ctx.fillText('EMBERHEART', HEART.x - 12, HEART.y + 42);

  // Spires.
  for (const t of G.towers) {
    const d = TOWERS[t.type];
    ctx.fillStyle = '#241d3a';
    ctx.beginPath(); ctx.arc(t.x, t.y, 22, 0, TAU); ctx.fill();
    ctx.strokeStyle = d.color; ctx.lineWidth = 2; ctx.stroke();
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(t.angle);
    ctx.fillStyle = d.color;
    ctx.fillRect(0, -4, 26, 8);
    ctx.restore();
    ctx.fillStyle = d.color;
    ctx.beginPath(); ctx.arc(t.x, t.y, 9, 0, TAU); ctx.fill();
    ctx.fillStyle = '#120e1e';
    ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
    ctx.fillText('L' + t.level, t.x, t.y + 4);
    if (G.selected === t) {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(t.x, t.y, TOWERS[t.type].range * (1 + 0.12 * (t.level - 1)), 0, TAU);
      ctx.stroke();
    }
  }

  // Wraiths.
  for (const f of G.foes) {
    ctx.fillStyle = f.color;
    ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.arc(f.x - 3, f.y - 3, 3, 0, TAU); ctx.arc(f.x + 4, f.y - 2, 3, 0, TAU); ctx.fill();
    if (f.kind === 'boss') {
      ctx.fillStyle = '#ff8aa5';
      ctx.beginPath(); ctx.arc(f.x, f.y - f.r - 2, 5, 0, TAU); ctx.arc(f.x - 8, f.y - f.r + 4, 4, 0, TAU); ctx.arc(f.x + 8, f.y - f.r + 4, 4, 0, TAU); ctx.fill();
    }
    if (f.hitFlash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = '#1a1426';
    ctx.fillRect(f.x - f.r, f.y - f.r - 9, f.r * 2, 4);
    ctx.fillStyle = f.hp / f.maxHp > 0.5 ? '#8dff9a' : f.hp / f.maxHp > 0.25 ? '#ffd76a' : '#ff5d7a';
    ctx.fillRect(f.x - f.r, f.y - f.r - 9, f.r * 2 * Math.max(0, f.hp / f.maxHp), 4);
    if (f.kind === 'boss') {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
      ctx.fillText('ASH KING', f.x, f.y - f.r - 14);
    }
  }

  // Projectiles and lightning.
  for (const s of G.shots) {
    ctx.fillStyle = s.color;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.splash ? 6 : 4, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.arc(s.x, s.y, 2, 0, TAU); ctx.fill();
  }
  for (const z of G.zaps) {
    ctx.strokeStyle = 'rgba(201,154,255,' + Math.max(0, z.life / 0.14) + ')';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(z.x1, z.y1);
    const mx = (z.x1 + z.x2) / 2 + (Math.random() - 0.5) * 18;
    const my = (z.y1 + z.y2) / 2 + (Math.random() - 0.5) * 18;
    ctx.lineTo(mx, my);
    ctx.lineTo(z.x2, z.y2);
    ctx.stroke();
  }

  // Particles.
  for (const p of G.parts) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Floating text.
  ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
  for (const f of G.floats) {
    ctx.globalAlpha = Math.max(0, f.life);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;

  drawHud(ctx);
  drawPanel(ctx);
  drawScreens(ctx);
  ctx.restore();
}

function drawHud(ctx) {
  ctx.fillStyle = 'rgba(10,8,20,0.72)';
  ctx.fillRect(0, 0, W, 44);
  ctx.font = 'bold 17px monospace'; ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd76a';
  ctx.fillText('◈ ' + G.gold + 'g', 16, 29);
  ctx.fillStyle = '#ff9a5c';
  ctx.fillText('WAVE ' + (G.wave || '—') + ' / 12', 170, 29);
  ctx.fillStyle = G.heart <= 5 ? '#ff5d7a' : '#ff8a9a';
  ctx.fillText('♥ ' + G.heart + ' / ' + G.heartMax, 330, 29);
  ctx.fillStyle = '#8fd7ff';
  ctx.fillText('SCORE ' + G.score, 500, 29);
  ctx.fillStyle = '#b9a7ff';
  ctx.fillText('KILLS ' + G.kills, 690, 29);
  ctx.fillStyle = '#8f86b8';
  ctx.font = '13px monospace'; ctx.textAlign = 'right';
  ctx.fillText('BEST ' + G.best, W - 16, 28);
  if (G.bannerT > 0) {
    ctx.globalAlpha = Math.min(1, G.bannerT);
    ctx.fillStyle = '#ffeec2';
    ctx.font = 'bold 30px monospace'; ctx.textAlign = 'center';
    ctx.fillText(G.banner, W / 2, 110);
    ctx.globalAlpha = 1;
  }
}

function drawPanel(ctx) {
  ctx.fillStyle = 'rgba(10,8,20,0.78)';
  ctx.fillRect(0, H - 64, W, 64);
  ctx.font = '13px monospace'; ctx.textAlign = 'left';
  const sel = G.selected;
  if (sel) {
    const d = TOWERS[sel.type], up = Math.round(d.cost * 0.9 * sel.level);
    ctx.fillStyle = '#ffeec2';
    ctx.fillText(d.name + '  Lv' + sel.level + '  —  ' + d.desc, 16, H - 38);
    ctx.fillStyle = '#8f86b8';
    ctx.fillText('DMG ' + Math.round(d.dmg * (1 + 0.6 * (sel.level - 1))) +
      '   RANGE ' + Math.round(d.range * (1 + 0.12 * (sel.level - 1))) +
      '   RATE ' + d.rate.toFixed(1) + '/s', 16, H - 18);
    ctx.fillStyle = sel.level < 3 && G.gold >= up ? '#8dff9a' : '#5a5178';
    ctx.fillText('[U] UPGRADE ' + up + 'g', 560, H - 38);
    ctx.fillStyle = '#ff9a5c';
    ctx.fillText('[X] SELL +' + Math.round(d.cost * 0.6 * sel.level) + 'g', 560, H - 18);
  } else {
    ctx.fillStyle = '#ffeec2';
    ctx.fillText('BUILD —', 16, H - 38);
    const shortDesc = {
      spark: 'Fast bolts', frost: 'Chills 50%', mortar: 'Splash', prism: 'Chains x3',
    };
    TOWER_ORDER.forEach((k, i) => {
      const d = TOWERS[k], x = 110 + i * 175;
      ctx.fillStyle = G.buildType === k ? '#ffd76a' : '#b9a7ff';
      ctx.fillText('[' + (i + 1) + '] ' + d.name + ' ' + d.cost + 'g', x, H - 38);
      ctx.fillStyle = '#8f86b8';
      ctx.fillText(shortDesc[k], x, H - 18);
    });
  }
  ctx.fillStyle = '#8f86b8';
  ctx.font = '12px monospace'; ctx.textAlign = 'right';
  ctx.fillText('SPACE wave · F fast · P pause', W - 16, H - 38);
  if (G.state === 'build' && !G.waveActive) {
    ctx.fillStyle = '#8fd7ff';
    ctx.textAlign = 'right';
    ctx.fillText(nextWaveText(), W - 16, H - 18);
  }
}

function drawScreens(ctx) {
  if (G.state === 'paused') {
    ctx.fillStyle = 'rgba(8,6,16,0.6)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffeec2';
    ctx.font = 'bold 40px monospace'; ctx.textAlign = 'center';
    ctx.fillText('PAUSED — press P', W / 2, 360);
    return;
  }
  if (G.state === 'title') {
    ctx.fillStyle = 'rgba(8,6,16,0.78)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffd76a';
    ctx.font = 'bold 64px monospace'; ctx.textAlign = 'center';
    ctx.fillText('EMBERWARD', W / 2, 210);
    ctx.fillStyle = '#ff9a5c';
    ctx.font = '22px monospace';
    ctx.fillText('Defend the last flame. Twelve waves of ash-wraiths are coming.', W / 2, 258);
    ctx.fillStyle = '#e8e2ff';
    ctx.font = '17px monospace';
    ctx.fillText('Click a lantern plot, build a spire, press SPACE to start the wave.', W / 2, 322);
    ctx.fillText('Frost chills, mortar splashes, prisms chain lightning, sparks never rest.', W / 2, 350);
    ctx.fillText('Moths split in two when they fall — and the Ash King comes last.', W / 2, 378);
    ctx.fillStyle = '#8dff9a';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('CLICK OR PRESS SPACE TO BEGIN', W / 2, 448);
    ctx.fillStyle = '#8f86b8';
    ctx.font = '14px monospace';
    ctx.fillText('Best score: ' + G.best, W / 2, 488);
    return;
  }
  if (G.state === 'over' || G.state === 'win') {
    ctx.fillStyle = 'rgba(8,6,16,0.82)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = G.state === 'win' ? '#8dff9a' : '#ff5d7a';
    ctx.font = 'bold 56px monospace'; ctx.textAlign = 'center';
    ctx.fillText(G.state === 'win' ? 'THE FLAME ENDURES' : 'THE FLAME DIES', W / 2, 260);
    ctx.fillStyle = '#e8e2ff';
    ctx.font = '20px monospace';
    ctx.fillText('Score ' + G.score + '   •   Waves held ' + (G.wave - (G.state === 'win' ? 0 : 1)) +
      ' / 12   •   Wraiths banished ' + G.kills, W / 2, 310);
    ctx.fillText('Best ' + G.best, W / 2, 344);
    ctx.fillStyle = '#8dff9a';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('PRESS R TO PLAY AGAIN', W / 2, 410);
  }
}
