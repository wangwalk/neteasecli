/**
 * Integration tests for neteasecli
 *
 * - Public tests: run without auth (lyrics API)
 * - Auth tests: require MUSIC_U env var (search, track, library, playlist)
 */

import { execFile } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync, writeFileSync, rmSync } from 'fs';
import { homedir, tmpdir } from 'os';
import { join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = resolve(__dirname, '..', 'dist', 'index.js');
const TRACK_ID = '1859245776';

let pass = 0;
let fail = 0;
let skip = 0;

function run(args, env = {}) {
  return new Promise((resolve) => {
    execFile('node', [CLI, '--json', ...args], { env: { ...process.env, ...env }, timeout: 30000 }, (err, stdout, stderr) => {
      try {
        const json = JSON.parse(stdout);
        resolve({ ok: json.success === true, data: json.data, raw: stdout, stderr });
      } catch {
        resolve({ ok: false, raw: stdout, stderr, err });
      }
    });
  });
}

async function test(label, args, env = {}) {
  const pad = label.padEnd(45);
  const result = await run(args, env);
  if (result.ok) {
    console.log(`  ✓  ${pad}`);
    pass++;
  } else {
    console.log(`  ✗  ${pad}`);
    if (result.raw) console.log(`     ${result.raw.slice(0, 200)}`);
    if (result.stderr) console.log(`     ${result.stderr.slice(0, 200)}`);
    fail++;
  }
  return result;
}

function skipTest(label, reason) {
  console.log(`  -  ${label.padEnd(45)} skip (${reason})`);
  skip++;
}

// --- Setup auth for CI ---
const MUSIC_U = process.env.MUSIC_U;
if (MUSIC_U) {
  // Write session file so CLI can find it
  const profileDir = join(homedir(), '.config', 'neteasecli', 'profiles', 'default');
  mkdirSync(profileDir, { recursive: true });
  writeFileSync(join(profileDir, 'session.json'), JSON.stringify({ MUSIC_U }));
}

const hasAuth = !!MUSIC_U;

// --- Public tests (no auth needed) ---
console.log('\n=== Public (no auth) ===');

// --help (not JSON, just check exit code)
const helpResult = await new Promise((resolve) => {
  execFile('node', [CLI, '--help'], { timeout: 10000 }, (err, stdout) => {
    resolve({ ok: !err && stdout.includes('neteasecli') });
  });
});
const padHelp = '--help'.padEnd(45);
if (helpResult.ok) { console.log(`  ✓  ${padHelp}`); pass++; } else { console.log(`  ✗  ${padHelp}`); fail++; }

// lyrics works without auth
await test('track lyric', ['track', 'lyric', TRACK_ID]);

// --- Output modes ---
console.log('\n=== Output Modes ===');

// JSON mode (already default in run())
await test('json output', ['track', 'lyric', TRACK_ID]);

// Plain mode
const plainResult = await new Promise((resolve) => {
  execFile('node', [CLI, '--plain', 'track', 'lyric', TRACK_ID], { timeout: 15000 }, (err, stdout) => {
    resolve({ ok: !err && stdout.length > 0, raw: stdout });
  });
});
const pad1 = 'plain output'.padEnd(45);
if (plainResult.ok) { console.log(`  ✓  ${pad1}`); pass++; } else { console.log(`  ✗  ${pad1}`); fail++; }

// Quiet mode
const quietResult = await new Promise((resolve) => {
  execFile('node', [CLI, '--quiet', 'track', 'lyric', TRACK_ID], { timeout: 15000 }, (err, stdout) => {
    resolve({ ok: !err && stdout.trim() === '', raw: stdout });
  });
});
const pad2 = 'quiet output (empty)'.padEnd(45);
if (quietResult.ok) { console.log(`  ✓  ${pad2}`); pass++; } else { console.log(`  ✗  ${pad2}`); fail++; }

// --- Auth tests ---
console.log('\n=== Auth Required ===');

if (hasAuth) {
  await test('auth check', ['auth', 'check']);
  await test('search track', ['search', 'track', 'Jay Chou', '-l', '3']);
  await test('search album', ['search', 'album', 'Fantasy', '-l', '3']);
  await test('search artist', ['search', 'artist', 'Jay Chou', '-l', '3']);
  await test('search playlist', ['search', 'playlist', 'Chill', '-l', '3']);
  await test('track detail', ['track', 'detail', TRACK_ID]);
  await test('track url', ['track', 'url', TRACK_ID]);
  await test('library liked', ['library', 'liked', '-l', '3']);
  await test('library recent', ['library', 'recent', '-l', '3']);
  await test('playlist list', ['playlist', 'list']);
} else {
  const authTests = [
    'auth check', 'search track', 'search album', 'search artist',
    'search playlist', 'track detail', 'track url',
    'library liked', 'library recent', 'playlist list',
  ];
  for (const t of authTests) {
    skipTest(t, 'MUSIC_U not set');
  }
}

// --- Download test (auth required, skip in CI to save time) ---
console.log('\n=== Download ===');
if (hasAuth && !process.env.CI) {
  const tmpFile = join(tmpdir(), `neteasecli-test-${Date.now()}.mp3`);
  const dlResult = await new Promise((resolve) => {
    execFile('node', [CLI, 'track', 'download', TRACK_ID, '-o', tmpFile], { timeout: 120000 }, (err, stdout, stderr) => {
      const ok = !err && existsSync(tmpFile);
      resolve({ ok });
    });
  });
  const pad3 = 'track download'.padEnd(45);
  if (dlResult.ok) { console.log(`  ✓  ${pad3}`); pass++; } else { console.log(`  ✗  ${pad3}`); fail++; }
  rmSync(tmpFile, { force: true });
} else {
  skipTest('track download', hasAuth ? 'CI environment' : 'MUSIC_U not set');
}

// --- Summary ---
console.log(`\n${'='.repeat(45)}`);
console.log(`  PASS: ${pass}  FAIL: ${fail}  SKIP: ${skip}`);
console.log(`${'='.repeat(45)}\n`);

process.exit(fail > 0 ? 1 : 0);
