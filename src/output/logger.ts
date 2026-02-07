import { dim, yellow } from './color.js';

let verboseEnabled = false;
let debugEnabled = false;

export function setVerbose(v: boolean): void {
  verboseEnabled = v;
}

export function setDebug(v: boolean): void {
  debugEnabled = v;
  if (v) verboseEnabled = true;
}

export function isVerbose(): boolean {
  return verboseEnabled;
}

export function isDebug(): boolean {
  return debugEnabled;
}

export function verbose(msg: string): void {
  if (verboseEnabled) process.stderr.write(dim(`[verbose] ${msg}`) + '\n');
}

export function debug(msg: string): void {
  if (debugEnabled) process.stderr.write(yellow(`[debug] ${msg}`) + '\n');
}
