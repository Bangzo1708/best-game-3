// config.js — every number that defines Emberward: the road, the plots, the
// spires, the wraiths and the twelve waves. One job: the game's tuning data.
export const W = 1280, H = 720, TAU = Math.PI * 2;

// The road the wraiths march, from the west gate to the Emberheart.
export const PATH = [
  [30, 120], [300, 120], [300, 330], [560, 330], [560, 600],
  [900, 600], [900, 180], [1150, 180], [1150, 470], [1200, 470],
];
export const HEART = { x: 1222, y: 470, hp: 20 };

// Lantern plots where spires may stand. Hand-placed clear of the road.
export const PLOTS = [
  [150, 220], [210, 420], [430, 230], [430, 450], [660, 210], [660, 480],
  [790, 330], [1010, 330], [1010, 560], [1150, 300], [180, 90], [560, 120],
];

export const TOWERS = {
  spark: {
    name: 'Spark Spire', cost: 50, range: 130, rate: 2.6, dmg: 3,
    color: '#ffd76a', desc: 'Fast bolts, long reach',
  },
  frost: {
    name: 'Frost Bell', cost: 70, range: 135, rate: 1.1, dmg: 2,
    color: '#7dd7ff', desc: 'Chills foes 50% for 1.2s',
  },
  mortar: {
    name: 'Ember Mortar', cost: 110, range: 160, rate: 0.7, dmg: 9, splash: 65,
    color: '#ff8a4d', desc: 'Splash shells, slow fuse',
  },
  prism: {
    name: 'Storm Prism', cost: 90, range: 150, rate: 1.4, dmg: 5, chain: 3,
    color: '#c99aff', desc: 'Lightning chains to 3 foes',
  },
};
export const TOWER_ORDER = ['spark', 'frost', 'mortar', 'prism'];

export const KINDS = {
  wisp: { hp: 14, speed: 62, r: 10, color: '#b9a7ff', bounty: 5, leak: 1 },
  moth: { hp: 40, speed: 55, r: 12, color: '#ffcf5c', bounty: 8, leak: 1, splits: 'wisp' },
  ember: { hp: 34, speed: 46, r: 13, color: '#ff9a5c', bounty: 8, leak: 1 },
  brute: { hp: 95, speed: 30, r: 17, color: '#c96bff', bounty: 14, leak: 1 },
  boss: { hp: 1500, speed: 22, r: 26, color: '#ff4d6d', bounty: 200, leak: 5 },
};

// Twelve waves: [kind, count, gap seconds, hp multiplier]. The multiplier
// climbs steadily: a spire's damage is fixed, so only tougher wraiths can
// still reach the flame once the board fills up.
export const WAVES = [
  [['wisp', 6, 0.9, 1]],
  [['wisp', 10, 0.7, 1.1]],
  [['wisp', 8, 0.6, 1.2], ['ember', 4, 1.2, 1.2]],
  [['ember', 10, 0.8, 1.35], ['moth', 4, 1.0, 1.35]],
  [['wisp', 14, 0.4, 1.5], ['ember', 6, 0.9, 1.5], ['moth', 4, 0.9, 1.5]],
  [['brute', 5, 1.4, 1.7], ['ember', 10, 0.7, 1.7]],
  [['wisp', 22, 0.3, 2.0], ['brute', 5, 1.2, 2.0], ['moth', 8, 0.8, 2.0]],
  [['ember', 18, 0.6, 2.3], ['brute', 6, 1.1, 2.3], ['moth', 8, 0.7, 2.3]],
  [['brute', 10, 1.0, 2.7], ['wisp', 20, 0.35, 2.7], ['moth', 10, 0.6, 2.7]],
  [['ember', 22, 0.5, 3.1], ['brute', 8, 1.0, 3.1], ['moth', 10, 0.55, 3.1]],
  [['brute', 12, 0.9, 3.6], ['ember', 20, 0.5, 3.6], ['moth', 12, 0.5, 3.6]],
  [['boss', 1, 0, 2.5], ['brute', 8, 1.2, 4.2], ['moth', 12, 0.6, 4.2], ['wisp', 24, 0.3, 4.2]],
];

export const START_GOLD = 200;
export const WAVE_CLEAR_BONUS = (wave) => 30 + wave * 8;
