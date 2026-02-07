import { Command } from 'commander';
import { getAuthManager } from '../auth/manager.js';
import { output, outputError } from '../output/json.js';
import { ExitCode } from '../types/index.js';
import { getProfile } from '../auth/storage.js';

export function createAuthCommand(): Command {
  const auth = new Command('auth').description('Authentication');

  auth
    .command('login')
    .description('Import login cookies from browser (Chrome, Edge, Firefox, Safari)')
    .option('--profile <name>', 'Chrome/Edge profile name')
    .action(async (options) => {
      const authManager = getAuthManager();

      try {
        await authManager.importFromBrowser(options.profile);
        const source = authManager.getSource();
        output({
          message: `Login successful${source ? ` (via ${source})` : ''}`,
          authenticated: true,
          browser: source || 'unknown',
        });
      } catch (error) {
        outputError('AUTH_ERROR', error instanceof Error ? error.message : 'Login failed');
        process.exit(ExitCode.AUTH_ERROR);
      }
    });

  auth
    .command('check')
    .description('Check login status')
    .action(async () => {
      const authManager = getAuthManager();

      try {
        const result = await authManager.checkAuth();
        output({
          valid: result.valid,
          userId: result.userId,
          nickname: result.nickname,
          profile: getProfile(),
          credentials: result.credentials,
          warnings: result.warnings,
          error: result.error,
          message: result.valid
            ? `Logged in: ${result.nickname} (${result.userId})`
            : result.error || 'Not logged in',
        });
      } catch (error) {
        outputError('AUTH_ERROR', error instanceof Error ? error.message : 'Check failed');
        process.exit(ExitCode.AUTH_ERROR);
      }
    });

  auth
    .command('logout')
    .description('Logout')
    .action(() => {
      const authManager = getAuthManager();
      authManager.logout();
      output({ message: 'Logged out', authenticated: false });
    });

  return auth;
}
