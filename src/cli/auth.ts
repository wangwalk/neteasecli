import { Command } from 'commander';
import { getAuthManager } from '../auth/manager.js';
import { output, outputError } from '../output/json.js';
import { ExitCode } from '../types/index.js';

export function createAuthCommand(): Command {
  const auth = new Command('auth').description('认证管理');

  auth
    .command('login')
    .description('从 Chrome 导入登录信息')
    .option('--profile <name>', '指定 Chrome Profile 名称（默认使用 Default）')
    .action(async (options) => {
      const authManager = getAuthManager();

      try {
        await authManager.importFromBrowser(options.profile);
        output({
          message: '登录成功',
          authenticated: true,
          profile: options.profile || 'Default',
        });
      } catch (error) {
        outputError('AUTH_ERROR', error instanceof Error ? error.message : '登录失败');
        process.exit(ExitCode.AUTH_ERROR);
      }
    });

  auth
    .command('check')
    .description('检查登录状态')
    .action(async () => {
      const authManager = getAuthManager();

      try {
        const result = await authManager.checkAuth();
        if (result.valid) {
          output({
            valid: true,
            userId: result.userId,
            nickname: result.nickname,
            message: `已登录: ${result.nickname} (${result.userId})`,
          });
        } else {
          output({
            valid: false,
            error: result.error,
            message: result.error || '未登录',
          });
        }
      } catch (error) {
        outputError('AUTH_ERROR', error instanceof Error ? error.message : '检查失败');
        process.exit(ExitCode.AUTH_ERROR);
      }
    });

  auth
    .command('logout')
    .description('登出')
    .action(() => {
      const authManager = getAuthManager();
      authManager.logout();
      output({ message: '已登出', authenticated: false });
    });

  return auth;
}
