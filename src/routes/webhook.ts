import express from 'express';
import { WebhookController } from '../controllers/webhookController';
import { TelegramService } from '../services/telegramService';
import { validateWebhookSecret } from '../middleware/auth';
import { validateSchema } from '../middleware/validation';
import { GitHubWebhookPayloadSchema } from '../types';

const router = express.Router();
const telegramService = new TelegramService();
const webhookController = new WebhookController(telegramService);

// Webhook endpoint with validation
router.post('/github', 
  validateWebhookSecret,
  validateSchema(GitHubWebhookPayloadSchema),
  webhookController.handleGitHubWebhook.bind(webhookController)
);

export default router;
