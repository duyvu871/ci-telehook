import { Telegraf, Context } from 'telegraf';
import { config } from '../config';
import { prisma } from '../config/database';
import { GitHubWebhookPayload } from '../types';

export class TelegramService {
  private bot: Telegraf;

  constructor() {
    this.bot = new Telegraf(config.telegram.botToken);
    this.setupCommands();
  }

  private setupCommands() {
    // Start command
    this.bot.start((ctx) => {
      ctx.reply(
        '🤖 Chào mừng đến với CI/CD Notification Bot!\n\n' +
        'Sử dụng các lệnh sau:\n' +
        '/register - Đăng ký nhận thông báo\n' +
        '/settings - Cài đặt thông báo\n' +
        '/projects - Xem danh sách dự án\n' +
        '/help - Xem trợ giúp'
      );
    });

    // Register command
    this.bot.command('register', async (ctx) => {
      const chatId = ctx.chat.id.toString();
      const username = ctx.from?.username;
      const messageText = ctx.message?.text || '';
      const chatType = ctx.chat.type; // 'private', 'group', 'supergroup', 'channel'

      // Parse command: /register <repository> [github_username]
      const parts = messageText.split(' ');

      if (parts.length < 2) {
        ctx.reply(
          '❌ Cách sử dụng không đúng!\n\n' +
          '✅ Cách dùng:\n' +
          '• `/register <repository>` - Đăng ký cho chat này\n' +
          '• `/register <repository> <github_username>` - Đăng ký cá nhân\n\n' +
          'Ví dụ:\n' +
          '`/register username/my-repo` (cho group/channel)\n' +
          '`/register username/my-repo myusername` (cá nhân)\n\n' +
          '📝 Repository format: `owner/repo`',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const repository = parts[1];
      const githubUsername = parts[2] || null; // Optional

      // Validate repository format
      if (!repository.includes('/') || repository.split('/').length !== 2) {
        ctx.reply('❌ Repository phải có format: `owner/repository`\nVí dụ: `username/my-repo`', {
          parse_mode: 'Markdown'
        });
        return;
      }

      try {
        // Check if project exists in database
        let project = await prisma.project.findUnique({
          where: { repository },
        });

        // If project doesn't exist, create it
        if (!project) {
          project = await prisma.project.create({
            data: {
              name: repository.split('/')[1], // Use repo name as project name
              repository,
              description: `Auto-created project for ${repository}`,
              webhookSecret: 'default-secret', // You can generate a unique secret
              isActive: true,
            },
          });
        }

        // Register user for notifications on this specific repository
        await prisma.notificationSettings.upsert({
          where: {
            chatId_repository: {
              chatId,
              repository
            }
          },
          update: {
            username,
            githubUsername,
            projectId: project.id,
            isActive: true,
          },
          create: {
            chatId,
            username,
            githubUsername,
            repository,
            projectId: project.id,
            isActive: true,
          },
        });

        const chatInfo = chatType === 'private' ? 'chat cá nhân' :
          chatType === 'group' ? 'group' :
            chatType === 'supergroup' ? 'supergroup' : 'channel';

        ctx.reply(
          `✅ Đăng ký thành công!\n\n` +
          `📂 Repository: \`${repository}\`\n` +
          `${githubUsername ? `👤 GitHub Username: \`${githubUsername}\`\n` : ''}` +
          `💬 Chat Type: ${chatInfo}\n` +
          `🆔 Chat ID: \`${chatId}\`\n\n` +
          `🔔 ${chatType === 'private' && githubUsername ? 'Bạn' : 'Chat này'} sẽ nhận được thông báo CI/CD cho repository này.\n` +
          `⚙️ Sử dụng /settings để xem tất cả dự án đã đăng ký.`,
          { parse_mode: 'Markdown' }
        );
      } catch (error) {
        console.error('Error registering user:', error);
        ctx.reply('❌ Đã xảy ra lỗi khi đăng ký. Vui lòng thử lại.');
      }
    });

    // Settings command
    this.bot.command('settings', async (ctx) => {
      const chatId = ctx.chat.id.toString();

      try {
        const allSettings = await prisma.notificationSettings.findMany({
          where: { chatId },
          include: { project: true },
          orderBy: { createdAt: 'desc' },
        });

        if (allSettings.length === 0) {
          ctx.reply(
            '❌ Bạn chưa đăng ký dự án nào\\.\n\n' +
            'Sử dụng: `/register <repository> <github_username>`\n' +
            'Ví dụ: `/register username/my\\-repo myusername`',
            { parse_mode: 'MarkdownV2' }
          );
          return;
        }

        let settingsText = `⚙️ *Cài đặt thông báo của bạn:*\n\n`;
        settingsText += `👤 *GitHub Username:* \`${allSettings[0].githubUsername || 'Chưa thiết lập'}\`\n`;
        settingsText += `💬 *Chat ID:* \`${chatId}\`\n\n`;

        settingsText += `📂 *Các dự án đã đăng ký (${allSettings.length}):*\n`;

        allSettings.forEach((setting, index) => {
          settingsText += `\n${index + 1}\\. *${setting.repository}*\n`;
          settingsText += `   • Thành công: ${setting.notifyOnSuccess ? '✅' : '❌'}\n`;
          settingsText += `   • Thất bại: ${setting.notifyOnFailure ? '✅' : '❌'}\n`;
          settingsText += `   • Build: ${setting.notifyOnBuild ? '✅' : '❌'}\n`;
          settingsText += `   • Deploy: ${setting.notifyOnDeploy ? '✅' : '❌'}\n`;
          settingsText += `   • Test: ${setting.notifyOnTest ? '✅' : '❌'}\n`;
        });

        settingsText += `\n💡 *Để thay đổi cài đặt cho dự án cụ thể:*\n`;
        settingsText += `Sử dụng: \`/toggle_<setting> <repository>\`\n`;
        settingsText += `Ví dụ: \`/toggle_success username/my-repo\``;

        ctx.reply(settingsText, { parse_mode: 'Markdown' });
      } catch (error) {
        console.error('Error getting settings:', error);
        ctx.reply('❌ Đã xảy ra lỗi khi lấy cài đặt.');
      }
    });

    // Toggle settings commands
    this.setupToggleCommands();

    // Unregister command
    this.bot.command('unregister', async (ctx) => {
      const chatId = ctx.chat.id.toString();
      const messageText = ctx.message?.text || '';

      // Parse command: /unregister <repository>
      const parts = messageText.split(' ');

      if (parts.length < 2) {
        try {
          const allSettings = await prisma.notificationSettings.findMany({
            where: { chatId },
            select: { repository: true },
          });

          if (allSettings.length === 0) {
            ctx.reply('❌ Bạn chưa đăng ký dự án nào.');
            return;
          }

          const repoList = allSettings.map(s => `• \`${s.repository}\``).join('\n');
          ctx.reply(
            `❌ Vui lòng chỉ định repository để hủy đăng ký!\n\n` +
            `Cách dùng: \`/unregister <repository>\`\n\n` +
            `Các repository của bạn:\n${repoList}`,
            { parse_mode: 'Markdown' }
          );
          return;
        } catch (error) {
          ctx.reply('❌ Đã xảy ra lỗi khi lấy danh sách repository.');
          return;
        }
      }

      const repository = parts[1];

      try {
        const deleted = await prisma.notificationSettings.deleteMany({
          where: {
            chatId,
            repository
          },
        });

        if (deleted.count > 0) {
          ctx.reply(
            `✅ Đã hủy đăng ký thành công khỏi repository \`${repository}\`.`,
            { parse_mode: 'Markdown' }
          );
        } else {
          ctx.reply(
            `❌ Bạn chưa đăng ký repository \`${repository}\`.`,
            { parse_mode: 'Markdown' }
          );
        }
      } catch (error) {
        console.error('Error unregistering:', error);
        ctx.reply('❌ Đã xảy ra lỗi khi hủy đăng ký.');
      }
    });

    // Projects command
    this.bot.command('projects', async (ctx) => {
      try {
        const projects = await prisma.project.findMany({
          where: { isActive: true },
          select: {
            name: true,
            repository: true,
            description: true,
          },
        });

        if (projects.length === 0) {
          ctx.reply('📋 Chưa có dự án nào được thiết lập.');
          return;
        }

        const projectsList = projects
          .map(
            (p, index) =>
              `${index + 1}\\. *${p.name}*\n   📂 ${p.repository}\n   ${p.description || 'Không có mô tả'}`
          )
          .join('\n\n');

        ctx.reply(`📋 *Danh sách dự án:*\n\n${projectsList}`, {
          parse_mode: 'Markdown',
        });
      } catch (error) {
        console.error('Error getting projects:', error);
        ctx.reply('❌ Đã xảy ra lỗi khi lấy danh sách dự án.');
      }
    });

    // Help command
    this.bot.help((ctx) => {
      const helpText = `📖 *Trợ giúp - CI/CD Notification Bot*

🤖 *Lệnh cơ bản:*
/start - Khởi động bot
/register - Đăng ký nhận thông báo
/unregister - Hủy đăng ký repository
/settings - Xem cài đặt thông báo
/projects - Xem danh sách dự án

⚙️ *Cài đặt thông báo:*
/toggle\\_success - Bật/tắt thông báo thành công
/toggle\\_failure - Bật/tắt thông báo thất bại
/toggle\\_build - Bật/tắt thông báo build
/toggle\\_deploy - Bật/tắt thông báo deploy
/toggle\\_test - Bật/tắt thông báo test

� *Admin commands:*
/unregister\\_chat - Hủy toàn bộ đăng ký của một chat

�📞 *Hỗ trợ:* Liên hệ admin nếu có vấn đề.`;

      ctx.reply(helpText, { parse_mode: 'Markdown' });
    });

    // Admin command: Unregister entire chat
    this.bot.command('unregister_chat', async (ctx) => {
      const messageText = ctx.message?.text || '';
      const parts = messageText.split(' ');

      if (parts.length < 2) {
        ctx.reply(
          '❌ Vui lòng chỉ định Chat ID!\n\n' +
          'Cách dùng: `/unregister_chat <chatId>`\n\n' +
          'Ví dụ: `/unregister_chat -123456789`\n\n' +
          '⚠️ *Cảnh báo:* Lệnh này sẽ hủy đăng ký TOÀN BỘ notifications của chat đó.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const targetChatId = parts[1];

      try {
        // Get all settings for this chat first to show what will be deleted
        const settingsToDelete = await prisma.notificationSettings.findMany({
          where: { chatId: targetChatId },
          include: { project: true },
        });

        if (settingsToDelete.length === 0) {
          ctx.reply(
            `❌ Không tìm thấy đăng ký nào cho Chat ID: \`${targetChatId}\``,
            { parse_mode: 'Markdown' }
          );
          return;
        }

        // Delete all notifications for this chat
        const deleted = await prisma.notificationSettings.deleteMany({
          where: { chatId: targetChatId },
        });

        const repoList = settingsToDelete.map(s => `• ${s.repository}`).join('\n');

        ctx.reply(
          `✅ *Admin Action: Đã hủy đăng ký thành công!*\n\n` +
          `🆔 Chat ID: \`${targetChatId}\`\n` +
          `📊 Số lượng: ${deleted.count} đăng ký\n\n` +
          `📂 *Repositories đã hủy:*\n${repoList}`,
          { parse_mode: 'Markdown' }
        );

        // Optional: Try to notify the target chat (if bot has access)
        try {
          await this.bot.telegram.sendMessage(
            targetChatId,
            `⚠️ *Thông báo:*\n\nToàn bộ đăng ký CI/CD notification của chat này đã bị hủy bởi admin.\n\n` +
            `Nếu muốn tiếp tục nhận thông báo, vui lòng đăng ký lại bằng lệnh /register`,
            { parse_mode: 'Markdown' }
          );
        } catch (notifyError: any) {
          // Ignore if we can't send to target chat (maybe bot was removed)
          console.log(`Could not notify target chat ${targetChatId}:`, notifyError?.message || notifyError);
        }

      } catch (error) {
        console.error('Error unregistering chat:', error);
        ctx.reply('❌ Đã xảy ra lỗi khi hủy đăng ký chat.');
      }
    });

    // Admin command: List all registered chats
    this.bot.command('list_chats', async (ctx) => {
      const messageText = ctx.message?.text || '';
      const parts = messageText.split(' ');

      if (parts.length < 2) {
        ctx.reply(
          '🔐 *Admin Command - Yêu cầu xác thực*\n\n' +
          'Cách dùng: `/list_chats <admin_password>`\n\n' +
          '⚠️ Lệnh này chỉ dành cho admin.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const providedPassword = parts[1];

      // Verify admin password
      if (providedPassword !== config.admin.password) {
        ctx.reply(
          '❌ *Mật khẩu admin không đúng!*\n\n' +
          '🚫 Truy cập bị từ chối.',
          { parse_mode: 'Markdown' }
        );

        // Log unauthorized access attempt
        console.warn(`❌ Unauthorized admin access attempt from chat ${ctx.chat.id} by user ${ctx.from?.username || 'unknown'}`);
        return;
      }

      try {
        const allSettings = await prisma.notificationSettings.findMany({
          include: { project: true },
          orderBy: [
            { chatId: 'asc' },
            { repository: 'asc' }
          ],
        });

        if (allSettings.length === 0) {
          ctx.reply('📋 Chưa có chat nào đăng ký nhận thông báo.');
          return;
        }

        // Group by chatId
        const chatGroups = allSettings.reduce((acc, setting) => {
          if (!acc[setting.chatId]) {
            acc[setting.chatId] = [];
          }
          acc[setting.chatId].push(setting);
          return acc;
        }, {} as { [key: string]: typeof allSettings });

        let message = `� *Admin Panel - Danh sách chats đã đăng ký:*\n\n`;
        message += `👥 Tổng số chats: ${Object.keys(chatGroups).length}\n`;
        message += `📊 Tổng số đăng ký: ${allSettings.length}\n\n`;

        Object.entries(chatGroups).forEach(([chatId, settings]) => {
          message += `🆔 *Chat ID:* \`${chatId}\`\n`;
          message += `👤 *User:* ${settings[0].githubUsername || settings[0].username || 'N/A'}\n`;
          message += `📂 *Repositories (${settings.length}):*\n`;

          settings.forEach(setting => {
            message += `   • ${setting.repository}\n`;
          });
          message += '\n';
        });

        // Split message if too long
        if (message.length > 4000) {
          const parts = message.match(/.{1,4000}/gs) || [message];
          for (const part of parts) {
            await ctx.reply(part, { parse_mode: 'Markdown' });
          }
        } else {
          ctx.reply(message, { parse_mode: 'Markdown' });
        }

        // Log successful admin access
        console.log(`✅ Admin accessed list_chats from chat ${ctx.chat.id} by user ${ctx.from?.username || 'unknown'}`);

      } catch (error) {
        console.error('Error listing chats:', error);
        ctx.reply('❌ Đã xảy ra lỗi khi lấy danh sách chats.');
      }
    });
  }

  private setupToggleCommands() {
    const toggleCommands = [
      { command: 'toggle_success', field: 'notifyOnSuccess', name: 'thành công' },
      { command: 'toggle_failure', field: 'notifyOnFailure', name: 'thất bại' },
      { command: 'toggle_build', field: 'notifyOnBuild', name: 'build' },
      { command: 'toggle_deploy', field: 'notifyOnDeploy', name: 'deploy' },
      { command: 'toggle_test', field: 'notifyOnTest', name: 'test' },
    ];

    toggleCommands.forEach(({ command, field, name }) => {
      this.bot.command(command, async (ctx) => {
        const chatId = ctx.chat.id.toString();
        const messageText = ctx.message?.text || '';

        // Parse command: /toggle_success <repository>
        const parts = messageText.split(' ');

        if (parts.length < 2) {
          // If no repository specified, show all repositories for this user
          try {
            const allSettings = await prisma.notificationSettings.findMany({
              where: { chatId },
              select: { repository: true },
            });

            if (allSettings.length === 0) {
              ctx.reply('❌ Bạn chưa đăng ký dự án nào. Sử dụng /register để đăng ký.');
              return;
            }

            const repoList = allSettings.map(s => `• \`${s.repository}\``).join('\n');
            ctx.reply(
              `❌ Vui lòng chỉ định repository!\n\n` +
              `Cách dùng: \`/${command} <repository>\`\n\n` +
              `Các repository của bạn:\n${repoList}`,
              { parse_mode: 'Markdown' }
            );
            return;
          } catch (error) {
            ctx.reply('❌ Đã xảy ra lỗi khi lấy danh sách repository.');
            return;
          }
        }

        const repository = parts[1];

        try {
          const settings = await prisma.notificationSettings.findUnique({
            where: {
              chatId_repository: {
                chatId,
                repository
              }
            },
          });

          if (!settings) {
            ctx.reply(`❌ Bạn chưa đăng ký repository \`${repository}\`. Sử dụng /register để đăng ký.`, {
              parse_mode: 'Markdown'
            });
            return;
          }

          const currentValue = (settings as any)[field];
          const newValue = !currentValue;

          await prisma.notificationSettings.update({
            where: {
              chatId_repository: {
                chatId,
                repository
              }
            },
            data: { [field]: newValue },
          });

          ctx.reply(
            `✅ Đã ${newValue ? 'bật' : 'tắt'} thông báo ${name} cho repository \`${repository}\`.`,
            { parse_mode: 'Markdown' }
          );
        } catch (error) {
          console.error(`Error toggling ${field}:`, error);
          ctx.reply('❌ Đã xảy ra lỗi khi thay đổi cài đặt.');
        }
      });
    });
  }

  async sendNotification(payload: GitHubWebhookPayload): Promise<void> {
    try {
      // Get project info
      const project = await prisma.project.findUnique({
        where: { repository: payload.repository },
      });

      if (!project || !project.isActive) {
        console.log(`Project ${payload.repository} not found or inactive`);
        return;
      }

      // Get notification settings for users who registered for this specific repository
      const notificationSettings = await prisma.notificationSettings.findMany({
        where: {
          isActive: true,
          repository: payload.repository,
          projectId: project.id,
        },
      });

      if (notificationSettings.length === 0) {
        console.log(`No users registered for notifications for repository: ${payload.repository}`);
        return;
      }

      // Determine notification type and filter users
      const shouldNotify = this.shouldSendNotification(payload, notificationSettings);

      console.log(`Sending notifications to ${shouldNotify.length} users for repository: ${payload.repository}`);

      for (const settings of shouldNotify) {
        const message = this.formatNotificationMessage(payload, project.name);

        try {
          await this.bot.telegram.sendMessage(settings.chatId, message, {
            parse_mode: 'Markdown',
          });
          console.log(`✅ Notification sent to user ${settings.githubUsername || settings.username} (${settings.chatId})`);
        } catch (error) {
          console.error(`❌ Error sending message to ${settings.chatId}:`, error);
        }
      }

      // Save webhook to database
      await prisma.webhook.create({
        data: {
          projectId: project.id,
          workflowName: payload.workflow_name,
          runId: payload.run_id,
          runUrl: payload.run_url,
          status: payload.status,
          branch: payload.branch,
          commitSha: payload.commit_sha,
          commitMessage: payload.commit_message,
          actor: payload.actor,
        },
      });

    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  }

  private shouldSendNotification(payload: GitHubWebhookPayload, settings: any[]) {
    return settings.filter(setting => {
      const status = payload.status.toLowerCase();
      const workflow = payload.workflow_name.toLowerCase();

      if (status === 'success' && !setting.notifyOnSuccess) return false;
      if (status === 'failure' && !setting.notifyOnFailure) return false;

      if (workflow.includes('build') && !setting.notifyOnBuild) return false;
      if (workflow.includes('deploy') && !setting.notifyOnDeploy) return false;
      if (workflow.includes('test') && !setting.notifyOnTest) return false;

      return true;
    });
  }

  private escapeMarkdown(text: string): string {
    return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
  }

  private formatNotificationMessage(payload: GitHubWebhookPayload, projectName: string): string {
    const statusEmoji = this.getStatusEmoji(payload.status);
    const statusFormatted = this.formatStatus(payload.status);

    const workflowName = this.escapeMarkdown(payload.workflow_name);
    const projectNameEscaped = this.escapeMarkdown(projectName);
    const actor = this.escapeMarkdown(payload.actor);
    const commitMessage = payload.commit_message ? this.escapeMarkdown(payload.commit_message) : '';
    const repoUrl = `https://github.com/${payload.repository}`;
    const branchUrl = `${repoUrl}/tree/${payload.branch}`;
    const actorUrl = `https://github.com/${payload.actor}`;

    // Build jobs section if present
    let jobsSection = '';
    // Prefer lightweight jobs if provided, otherwise derive from jobs_full
    let jobs = (payload.jobs ?? []) as NonNullable<GitHubWebhookPayload['jobs']>;
    if (!jobs || jobs.length === 0) {
      jobs = this.extractJobsFromFull(payload);
    }
    if (jobs.length > 0) {
      const maxJobs = 10;
      const shown = jobs.slice(0, maxJobs);
      const counts = { success: 0, failure: 0, in_progress: 0, cancelled: 0, skipped: 0 } as Record<string, number>;
      const jobLines = shown
        .map((j) => {
          // accumulate counts
          // @ts-ignore strict key typing handled by schema
          counts[j.result] = (counts as any)[j.result] + 1;
          const emoji = this.getResultEmoji(j.result);
          const name = this.escapeMarkdown(j.name);
          const label = j.result.toUpperCase().replace('_', ' ');
          return `  - ${emoji} [${name}](${j.url}) • ${label}`;
        })
        .join('\n');
      // finish counts for hidden jobs too
      if (jobs.length > shown.length) {
        for (const j of jobs.slice(shown.length)) {
          // @ts-ignore
          counts[j.result] = (counts as any)[j.result] + 1;
        }
      }
      const summaryLine = `Totals: ✅ ${counts.success} • ❌ ${counts.failure} • 🔄 ${counts.in_progress} • ⚠️ ${counts.cancelled} • ⏭️ ${counts.skipped}`;
      const moreLine = jobs.length > maxJobs ? `\n  …and ${jobs.length - maxJobs} more` : '';
      jobsSection = `\n\n*Jobs (${jobs.length}):*\n${jobLines}\n${summaryLine}${moreLine}`;
    }

    return `${statusEmoji} *CI/CD Notification*
    *Workflow:* ${workflowName}
    *Project:* ${projectNameEscaped}
    *Status:* ${statusFormatted}
    
    • *Repository:* [${payload.repository}](${repoUrl})
    • *Branch:* [${payload.branch}](${branchUrl})
    • *Actor:* [${actor}](${actorUrl})
    • *Commit:* \`${payload.commit_sha.substring(0, 7)}\`
    • *Message:* _\"${commitMessage || ""}\"_${jobsSection}
    
    [View Workflow Run](${payload.run_url})`.trim();
  }

  // Map GitHub Jobs API status/conclusion to our lightweight result set
  private mapJobApiToResult(status?: string, conclusion?: string): 'success' | 'failure' | 'in_progress' | 'cancelled' | 'skipped' {
    const st = (status || '').toLowerCase();
    const conc = (conclusion || '').toLowerCase();

    // If not completed or no conclusion yet
    if (st && st !== 'completed' && !conc) return 'in_progress';

    switch (conc) {
      case 'success':
        return 'success';
      case 'failure':
        return 'failure';
      case 'cancelled':
        return 'cancelled';
      case 'skipped':
        return 'skipped';
      // Map some extra conclusions into closest buckets
      case 'neutral':
        return 'success';
      case 'timed_out':
      case 'action_required':
      case 'startup_failure':
      case 'stale':
        return 'failure';
      default:
        return conc ? 'failure' : 'in_progress';
    }
  }

  // Derive lightweight jobs from full GitHub Jobs API payload if available
  private extractJobsFromFull(payload: GitHubWebhookPayload): NonNullable<GitHubWebhookPayload['jobs']> {
    const jf: any = (payload as any).jobs_full;
    if (!jf || !Array.isArray(jf.jobs)) return [] as unknown as NonNullable<GitHubWebhookPayload['jobs']>;

    return jf.jobs.map((job: any) => {
      const result = this.mapJobApiToResult(job.status, job.conclusion);
      const url: string = job.html_url || job.url || payload.run_url;
      const name: string = job.name || `Job ${job.id}`;
      const started_at: string | undefined = job.started_at || undefined;
      const completed_at: string | null | undefined = typeof job.completed_at === 'string' ? job.completed_at : undefined;
      let duration_ms: number | undefined;
      if (started_at && completed_at) {
        const s = Date.parse(started_at);
        const e = Date.parse(completed_at);
        if (!Number.isNaN(s) && !Number.isNaN(e) && e >= s) {
          duration_ms = e - s;
        }
      }
      return {
        id: Number(job.id),
        name,
        result,
        url,
        started_at,
        completed_at,
        duration_ms,
      };
    });
  }

  private formatStatus(status: string): string {
    switch (status.toLowerCase()) {
      case 'success':
        return '✅ *SUCCESS*';
      case 'failure':
        return '❌ *FAILURE*';
      case 'cancelled':
        return '⚠️ *CANCELLED*';
      case 'skipped':
        return '⏭️ *SKIPPED*';
      case 'in_progress':
        return '🔄 *IN PROGRESS*';
      default:
        return `🔵 *${status.toUpperCase()}*`;
    }
  }

  private getStatusEmoji(status: string): string {
    switch (status.toLowerCase()) {
      case 'success': return '✅';
      case 'failure': return '❌';
      case 'cancelled': return '⚠️';
      case 'skipped': return '⏭️';
      case 'in_progress': return '🔄';
      default: return '🔵';
    }
  }

  private getResultEmoji(result: string): string {
    switch (result.toLowerCase()) {
      case 'success': return '✅';
      case 'failure': return '❌';
      case 'in_progress': return '🔄';
      case 'cancelled': return '⚠️';
      case 'skipped': return '⏭️';
      default: return '🔵';
    }
  }

  private getWorkflowEmoji(workflow: string): string {
    const workflowLower = workflow.toLowerCase();
    if (workflowLower.includes('build')) return '🔨';
    if (workflowLower.includes('deploy')) return '🚀';
    if (workflowLower.includes('test')) return '🧪';
    if (workflowLower.includes('ci')) return '⚙️';
    return '📋';
  }

  launch() {
    this.bot.launch();
    console.log('Telegram bot started successfully');
  }

  stop() {
    this.bot.stop();
  }
}

// Graceful shutdown
process.once('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

process.once('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});
