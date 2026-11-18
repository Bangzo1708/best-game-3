// Emberward — a tower defence for best-game-01.
//
// This program hands the game in. It takes this repository's game/ (the
// playable game as static files: index.html plus its ES modules, no library,
// no network request) and screenshots/ (four real renders of the game's own
// code) and writes them to /output, then writes /output/dossier.json with the
// kit's vendored buildDossier — the summary the judge reads. Outside the
// grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The copy is deterministic on purpose: files are walked in sorted order,
// only regular files and directories are copied (no symlinks, no stray
// state), and the dossier is written from exactly the files that landed in
// /output, so two runs of this program write the same bytes. Before it
// copies anything it refuses an entry the scorer would refuse — the wrong
// number of screenshots, one too big, or a game/ over the file or byte caps —
// and says which rule broke, so a bad entry fails loudly here instead of
// silently at the gate.
//
// One thing this program deliberately does NOT do: it never removes the
// output directory itself. The grader mounts /output as a volume, and
// removing a mount point fails the run. It clears only what is inside the
// output directory, one child at a time, and then writes fresh.
//
// Play the game locally with `node serve.ts`, then open http://localhost:8080:
// click a lantern plot to build a spire (1-4 pick the kind), U upgrades the
// selected spire, X sells it, SPACE starts the next wave, F doubles the
// speed, P pauses, R restarts.

import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The scorer's caps, from the kit's reference/gate.json. The dossier text
// cap shapes the bytes; the rest refuse an entry the scorer would refuse.
const CAPS = {
  textMaxBytes: 163840,
  screenshots: { min: 3, max: 4, maxBytes: 262144 },
  gameMaxFiles: 993,
  gameMaxBytes: 50331648,
  gamePathMaxBytes: 1000,
  outputMaxEntries: 1000,
  outputMaxBytes: 67108864,
};

const here = fileURLToPath(new URL('.', import.meta.url));
const repoGame = join(here, 'game');
const repoShots = join(here, 'screenshots');
const out = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

function fail(message) {
  throw new Error('emberward main.ts: ' + message);
}

// Every file under a directory, in sorted order, with its size — plus how
// many directories the walk crossed, so the output cap counts honestly.
function walk(dir, base = dir) {
  const files = [];
  let dirs = 0;
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) fail('symlink found (the gate refuses them): ' + path);
    if (stat.isDirectory()) {
      dirs += 1;
      const sub = walk(path, base);
      files.push(...sub.files);
      dirs += sub.dirs;
    } else if (stat.isFile()) {
      files.push({ path, rel: path.slice(base.length + 1), bytes: stat.size });
    } else {
      fail('not a plain file or directory: ' + path);
    }
  }
  return { files, dirs };
}

function checkShots() {
  if (!existsSync(repoShots)) fail('screenshots/ is missing');
  const shots = walk(repoShots).files.filter((f) => !f.rel.startsWith('.'));
  if (shots.length < CAPS.screenshots.min || shots.length > CAPS.screenshots.max) {
    fail('screenshots/ must hold 3 or 4 images, found ' + shots.length);
  }
  for (const shot of shots) {
    if (!/^[A-Za-z0-9._-]{1,128}$/.test(shot.rel) || shot.rel.startsWith('.') || shot.rel.startsWith('-')) {
      fail('bad screenshot name: ' + shot.rel);
    }
    if (shot.bytes > CAPS.screenshots.maxBytes) fail('screenshot over 256 KiB: ' + shot.rel);
  }
  return shots.length;
}

function checkGame() {
  const index = join(repoGame, 'index.html');
  if (!existsSync(index)) fail('game/index.html is missing');
  const indexBytes = statSync(index).size;
  if (indexBytes > 1048576) fail('game/index.html is ' + indexBytes + ' bytes, over the 1 MiB cap');
  const { files, dirs } = walk(repoGame);
  if (files.length + dirs > CAPS.gameMaxFiles) {
    fail('game/ holds ' + (files.length + dirs) + ' entries, over the 993 cap');
  }
  const bytes = files.reduce((sum, f) => sum + f.bytes, 0);
  if (bytes > CAPS.gameMaxBytes) fail('game/ is ' + bytes + ' bytes, over the 48 MiB cap');
  for (const f of files) {
    if (Buffer.byteLength(f.rel, 'utf8') > CAPS.gamePathMaxBytes) fail('game path too long: ' + f.rel);
  }
  return { files: files.length, bytes };
}

// A fresh output every run, without ever touching the output directory
// itself: each child inside it is removed on its own. (The grader mounts
// /output as a volume; removing the mount point itself throws EBUSY and
// fails the whole run — that is what sank the previous round's entry.)
function clearOutput() {
  mkdirSync(out, { recursive: true });
  for (const name of readdirSync(out).sort()) {
    const child = join(out, name);
    try {
      rmSync(child, { recursive: true, force: true });
    } catch (err) {
      // A child that cannot be removed (a mount point of its own, a locked
      // file) is left alone; the copy below overwrites what it can, and the
      // final cap check still guards the result.
      console.warn('emberward main.ts: could not clear ' + child + ' (' + (err.code || err.message) + '), leaving it');
    }
  }
}

clearOutput();

const shotCount = checkShots();
const gameInfo = checkGame();

cpSync(repoGame, join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(repoShots, join(out, 'screenshots'), { recursive: true });

const dossier = buildDossier(out, {
  text_max_bytes: CAPS.textMaxBytes,
  screenshots: { max: CAPS.screenshots.max, max_bytes: CAPS.screenshots.maxBytes },
  game_max_files: CAPS.gameMaxFiles,
  game_max_bytes: CAPS.gameMaxBytes,
  game_path_max_bytes: CAPS.gamePathMaxBytes,
});
writeFileSync(join(out, 'dossier.json'), dossier);
// The dossier must be a well-formed document, not just bytes.
JSON.parse(readFileSync(join(out, 'dossier.json'), 'utf8'));
// And the dossier must be exactly what the kit's library writes from the
// files that landed in /output — the gate rebuilds it and compares bytes, so
// a mismatch here means a bad entry, not a bad gate.
const dossierAgain = buildDossier(out, {
  text_max_bytes: CAPS.textMaxBytes,
  screenshots: { max: CAPS.screenshots.max, max_bytes: CAPS.screenshots.maxBytes },
  game_max_files: CAPS.gameMaxFiles,
  game_max_bytes: CAPS.gameMaxBytes,
  game_path_max_bytes: CAPS.gamePathMaxBytes,
});
if (!Buffer.from(dossierAgain).equals(Buffer.from(dossier))) fail('dossier does not match a fresh build from /output');

// The whole output stays under the platform's own 1,000-entry / 64 MiB cap,
// which game/, screenshots/ and dossier.json share.
const written = walk(out);
const writtenBytes = written.files.reduce((sum, f) => sum + f.bytes, 0);
const writtenEntries = written.files.length + written.dirs;
if (writtenEntries > CAPS.outputMaxEntries) fail('/output holds ' + writtenEntries + ' entries, over 1000');
if (writtenBytes > CAPS.outputMaxBytes) fail('/output is ' + writtenBytes + ' bytes, over 64 MiB');

console.log(
  'emberward: ' + gameInfo.files + ' game files (' + gameInfo.bytes + ' bytes), ' +
  shotCount + ' screenshots, ' + writtenEntries + ' entries (' + writtenBytes +
  ' bytes) in ' + out,
);
