import { Command } from 'commander';
import { getAuthManager } from '../auth/manager.js';
import { output, outputError } from '../output/json.js';
import { ExitCode } from '../types/index.js';

export function createAuthCommand(): Command {
  const auth = new Command('auth').description('Authentication');

  auth
    .command('login')
    .description('Import login cookies from Chrome')
    .option('--profile <name>', 'Chrome profile name (default: Default)')
    .action(async (options) => {
      const authManager = getAuthManager();

      try {
        await authManager.importFromBrowser(options.profile);
        output({
          message: 'Login successful',
          authenticated: true,
          method: 'chrome',
          profile: options.profile || 'Default',
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
        if (result.valid) {
          output({
            valid: true,
            userId: result.userId,
            nickname: result.nickname,
            message: `Logged in: ${result.nickname} (${result.userId})`,
          });
        } else {
          output({
            valid: false,
            error: result.error,
            message: result.error || 'Not logged in',
          });
        }
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
