import type { ApiResponse } from '../types/index.js';
import { bold, dim, green, red, cyan, yellow } from './color.js';

type OutputMode = 'json' | 'plain' | 'human';

let mode: OutputMode = process.stdout.isTTY ? 'human' : 'json';
let prettyPrint = false;
let quietMode = false;

export function setOutputMode(m: OutputMode): void {
  mode = m;
}

export function setPrettyPrint(value: boolean): void {
  prettyPrint = value;
}

export function setQuietMode(value: boolean): void {
  quietMode = value;
}

export function output<T>(data: T): void {
  if (quietMode) return;

  switch (mode) {
    case 'json':
      outputJson(data);
      break;
    case 'plain':
      outputPlain(data);
      break;
    case 'human':
      outputHuman(data);
      break;
  }
}

export function outputError(code: string, message: string): void {
  if (quietMode) return;

  switch (mode) {
    case 'json': {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        error: { code, message },
      };
      console.log(prettyPrint ? JSON.stringify(response, null, 2) : JSON.stringify(response));
      break;
    }
    case 'plain':
      console.log(`error\t${code}\t${message}`);
      break;
    case 'human':
      console.log(`${red('✗')} ${bold(code)}: ${message}`);
      break;
  }
}

// --- JSON mode ---

function outputJson<T>(data: T): void {
  const response: ApiResponse<T> = { success: true, data, error: null };
  console.log(prettyPrint ? JSON.stringify(response, null, 2) : JSON.stringify(response));
}

// --- Plain mode ---

function outputPlain<T>(data: T): void {
  const d = data as Record<string, unknown>;

  if (d.tracks && Array.isArray(d.tracks)) {
    for (const t of d.tracks as Record<string, unknown>[]) {
      console.log([t.id, t.name, t.artist || formatArtists(t.artists), t.album, t.uri].join('\t'));
    }
    return;
  }

  if (d.playlists && Array.isArray(d.playlists)) {
    for (const p of d.playlists as Record<string, unknown>[]) {
      console.log([p.id, p.name, p.trackCount, p.creator].join('\t'));
    }
    return;
  }

  if (d.lrc !== undefined) {
    if (d.lrc) console.log(String(d.lrc));
    return;
  }

  if (d.url !== undefined) {
    console.log(String(d.url));
    return;
  }

  if (d.message !== undefined) {
    console.log(String(d.message));
    return;
  }

  // Fallback: key=value
  for (const [k, v] of Object.entries(d)) {
    if (v !== undefined && v !== null && typeof v !== 'object') {
      console.log(`${k}\t${v}`);
    }
  }
}

// --- Human mode ---

function outputHuman<T>(data: T): void {
  const d = data as Record<string, unknown>;

  // Track list (search results, library, playlist detail)
  if (d.tracks && Array.isArray(d.tracks)) {
    const tracks = d.tracks as Record<string, unknown>[];
    for (let i = 0; i < tracks.length; i++) {
      const t = tracks[i];
      const artist = t.artist || formatArtists(t.artists);
      const dur = t.duration ? `  ${dim(formatDuration(Number(t.duration)))}` : '';
      console.log(`  ${dim(String(i + 1).padStart(2, ' '))}  ${bold(String(t.name))} ${dim('-')} ${cyan(String(artist))}${dur}`);
    }
    const total = d.total !== undefined ? Number(d.total) : tracks.length;
    const showing = d.showing !== undefined ? Number(d.showing) : tracks.length;
    if (total > showing) {
      console.log(dim(`\n  ${showing} of ${total} tracks`));
    }
    return;
  }

  // Playlist list
  if (d.playlists && Array.isArray(d.playlists)) {
    const pls = d.playlists as Record<string, unknown>[];
    for (let i = 0; i < pls.length; i++) {
      const p = pls[i];
      console.log(`  ${dim(String(i + 1).padStart(2, ' '))}  ${bold(String(p.name))} ${dim(`(${p.trackCount} tracks)`)}`);
    }
    return;
  }

  // Lyrics
  if (d.lrc !== undefined) {
    if (d.lrc) {
      console.log(String(d.lrc));
    } else {
      console.log(dim('No lyrics available'));
    }
    return;
  }

  // Single track detail
  if (d.artists && Array.isArray(d.artists) && d.album && d.duration) {
    console.log(`  ${bold(String(d.name))}`);
    console.log(`  ${dim('Artist:')}  ${cyan(formatArtists(d.artists))}`);
    const album = d.album as Record<string, unknown>;
    console.log(`  ${dim('Album:')}   ${String(album.name)}`);
    console.log(`  ${dim('Duration:')} ${d.durationFormatted || formatDuration(Number(d.duration))}`);
    if (d.uri) console.log(`  ${dim('URI:')}      ${String(d.uri)}`);
    return;
  }

  // URL result
  if (d.url !== undefined && d.quality !== undefined) {
    console.log(`  ${dim('URL:')} ${String(d.url)}`);
    console.log(`  ${dim('Quality:')} ${String(d.quality)}`);
    return;
  }

  // Message-based output (auth, player, etc.)
  if (d.message !== undefined) {
    const icon = green('✓');
    console.log(`${icon} ${String(d.message)}`);
    return;
  }

  // Fallback
  for (const [k, v] of Object.entries(d)) {
    if (v !== undefined && v !== null && typeof v !== 'object') {
      console.log(`  ${dim(k + ':')} ${v}`);
    }
  }
}

// --- Helpers ---

function formatArtists(artists: unknown): string {
  if (!Array.isArray(artists)) return String(artists || '');
  return artists.map((a: any) => a.name || a).join(', ');
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
