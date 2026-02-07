#!/usr/bin/env node

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
