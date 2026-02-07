#!/usr/bin/env node

// Node.js 22.x requires --experimental-sqlite for node:sqlite (used by sweet-cookie).
// If unavailable, re-spawn with the flag. Node.js 23+ has it enabled by default.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
try {
  require('node:sqlite');
} catch {
  if (!process.execArgv.includes('--experimental-sqlite')) {
    const { execFileSync } = await import('child_process');
    try {
      execFileSync(
        process.execPath,
        ['--no-warnings', '--experimental-sqlite', ...process.execArgv, ...process.argv.slice(1)],
        { stdio: 'inherit' },
      );
    } catch (e: unknown) {
      process.exit(e && typeof e === 'object' && 'status' in e ? (e.status as number) : 1);
    }
    process.exit(0);
  }
}

import { createProgram } from './cli/index.js';

const program = createProgram();

try {
  await program.parseAsync();
} catch (error) {
  if (error instanceof Error) {
    console.error(
      JSON.stringify(
        {
          success: false,
          error: {
            code: 'CLI_ERROR',
            message: error.message,
          },
        },
        null,
        2,
      ),
    );
  }
  process.exit(1);
}
