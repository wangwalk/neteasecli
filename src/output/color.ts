const envDisabled = !!process.env.NO_COLOR || process.env.TERM === 'dumb';
let forceOff = false;

export function setNoColor(v: boolean): void {
  forceOff = v;
}

function enabled(): boolean {
  return !envDisabled && !forceOff && !!process.stdout.isTTY;
}

function wrap(code: number, text: string): string {
  return enabled() ? `\x1b[${code}m${text}\x1b[0m` : text;
}

export const bold = (t: string) => wrap(1, t);
export const dim = (t: string) => wrap(2, t);
export const green = (t: string) => wrap(32, t);
export const red = (t: string) => wrap(31, t);
export const yellow = (t: string) => wrap(33, t);
export const cyan = (t: string) => wrap(36, t);
