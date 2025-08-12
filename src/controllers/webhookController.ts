import { Request, Response } from 'express';
import { TelegramService } from '../services/telegramService';
import { GitHubWebhookPayload, GitHubWebhookPayloadSchema, ApiResponse } from '../types';
import { prisma } from '../config/database';

export class WebhookController {
  constructor(private telegramService: TelegramService) {}

  async handleGitHubWebhook(req: Request, res: Response) {
    try {
      // Validate payload using Zod
      const validationResult = GitHubWebhookPayloadSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errorMessages = validationResult.error.issues.map(
          (issue) => `${issue.path.join('.')}: ${issue.message}`
        );
        
        const response: ApiResponse = {
          success: false,
          error: 'Invalid webhook payload',
          message: errorMessages.join(', '),
        };
        
        return res.status(400).json(response);
      }

      const payload: GitHubWebhookPayload = validationResult.data;

      console.log('Received webhook:', {
        repository: payload.repository,
        workflow: payload.workflow_name,
        status: payload.status,
        branch: payload.branch,
        actor: payload.actor,
      });

      // Send notification via Telegram
      await this.telegramService.sendNotification(payload);

      // Build jobs summary for response
      const jobs = payload.jobs || [];
      type JobResult = 'success' | 'failure' | 'in_progress' | 'cancelled' | 'skipped';
      const counts: Record<'total' | JobResult, number> = {
        total: 0,
        success: 0,
        failure: 0,
        in_progress: 0,
        cancelled: 0,
        skipped: 0,
      };
      for (const j of jobs) {
        counts[j.result] += 1;
        counts.total += 1;
      }

      const jobDetails = jobs.map(j => ({ id: j.id, name: j.name, result: j.result, url: j.url }));

      res.json({
        message: 'Webhook processed successfully',
        timestamp: new Date().toISOString(),
        jobs: jobDetails,
        jobs_summary: counts,
      });
    } catch (error) {
      console.error('Webhook processing error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private isValidWebhookPayload(payload: any): payload is GitHubWebhookPayload {
    const requiredFields = [
      'workflow_name',
      'repository',
      'run_id',
      'run_url',
      'status',
      'branch',
      'commit_sha',
      'actor',
    ];

    return requiredFields.every(field => 
      payload.hasOwnProperty(field) && 
      typeof payload[field] === 'string' && 
      payload[field].length > 0
    );
  }

  async getWebhookHistory(req: Request, res: Response) {
    try {
      const { projectId, limit = 20, offset = 0 } = req.query;

      const where = projectId ? { projectId: projectId as string } : {};

      const [webhooks, total] = await Promise.all([
        prisma.webhook.findMany({
          where,
          include: {
            project: {
              select: {
                name: true,
                repository: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: parseInt(limit as string),
          skip: parseInt(offset as string),
        }),
        prisma.webhook.count({ where }),
      ]);

      res.json({
        webhooks,
        pagination: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: parseInt(offset as string) + parseInt(limit as string) < total,
        },
      });
    } catch (error) {
      console.error('Get webhook history error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

// Global prisma declaration for temporary use
declare global {
  var prisma: any;
}
