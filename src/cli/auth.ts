import { Command } from 'commander';
import { getAuthManager } from '../auth/manager.js';
import { output, outputError } from '../output/json.js';
import { ExitCode } from '../types/index.js';

export function createAuthCommand(): Command {
  const auth = new Command('auth').description('认证管理');

  auth
    .command('import')
    .description('导入 Cookie')
    .option('--file <path>', '从 JSON 文件导入 Cookie')
    .option('--browser <name>', '从浏览器导入 Cookie (chrome/firefox/safari)')
    .action(async (options) => {
      const authManager = getAuthManager();

      try {
        if (options.file) {
          await authManager.importFromFile(options.file);
          output({ message: 'Cookie 导入成功', authenticated: true });
        } else if (options.browser) {
          await authManager.importFromBrowser(options.browser);
          output({ message: 'Cookie 导入成功', authenticated: true });
        } else {
          outputError('INVALID_ARGS', '请指定 --file 或 --browser 参数');
          process.exit(ExitCode.GENERAL_ERROR);
        }
      } catch (error) {
        outputError('AUTH_ERROR', error instanceof Error ? error.message : '导入失败');
        process.exit(ExitCode.AUTH_ERROR);
      }
    });

  auth
    .command('status')
    .description('查看登录状态')
    .action(() => {
      const authManager = getAuthManager();
      output(authManager.getStatus());
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
