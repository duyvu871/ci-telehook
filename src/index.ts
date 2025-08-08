import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { prismaService } from './config/database';

import { config } from './config';
import { TelegramService } from './services/telegramService';
import { AuthService } from './services/authService';
import { ApiResponse } from './types';

// Routes
import authRoutes from './routes/auth';
import webhookRoutes from './routes/webhook';
import projectRoutes from './routes/projects';

const app = express();

// Initialize services
const telegramService = new TelegramService();
const authService = new AuthService();
// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  const response: ApiResponse = {
    success: true,
    data: {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  };
  res.json(response);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/projects', projectRoutes);

// API documentation
app.get('/api', (req, res) => {
  const response: ApiResponse = {
    success: true,
    data: {
      name: 'CI/CD Telegram Notification API',
      version: '1.0.0',
      description: 'API for GitHub webhook notifications via Telegram with Zod validation',
      endpoints: {
        auth: {
          'POST /api/auth/login': 'Login with credentials (validates AuthRequestSchema)',
          'POST /api/auth/change-password': 'Change password (requires auth, validates ChangePasswordRequestSchema)',
          'GET /api/auth/profile': 'Get user profile (requires auth)',
        },
        webhooks: {
          'POST /api/webhook/github': 'Receive GitHub webhook (requires webhook secret, validates GitHubWebhookPayloadSchema)',
          'GET /api/webhook/history': 'Get webhook history (requires auth, validates WebhookQuerySchema)',
        },
        projects: {
          'POST /api/projects': 'Create new project (requires auth, validates ProjectRequestSchema)',
          'GET /api/projects': 'Get user projects (requires auth)',
          'GET /api/projects/:id': 'Get project details (requires auth)',
          'PUT /api/projects/:id': 'Update project (requires auth, validates ProjectRequestSchema)',
          'PATCH /api/projects/:id/toggle': 'Toggle project status (requires auth)',
          'DELETE /api/projects/:id': 'Delete project (requires auth)',
        },
      },
      schemas: {
        AuthRequest: {
          username: 'string (min 1)',
          password: 'string (min 6)',
        },
        ChangePasswordRequest: {
          currentPassword: 'string (min 1)',
          newPassword: 'string (min 6, must contain uppercase, lowercase, number)',
        },
        GitHubWebhookPayload: {
          workflow_name: 'string',
          repository: 'string',
          run_id: 'string',
          run_url: 'string (URL)',
          status: 'enum: success|failure|cancelled|skipped|in_progress',
          branch: 'string',
          commit_sha: 'string (min 7)',
          commit_message: 'string (optional)',
          actor: 'string',
        },
      },
      example_webhook_payload: {
        workflow_name: 'CI',
        repository: 'username/repository',
        run_id: '123456789',
        run_url: 'https://github.com/username/repository/actions/runs/123456789',
        status: 'success',
        branch: 'main',
        commit_sha: 'abc123def456',
        commit_message: 'Fix bug in authentication',
        actor: 'username',
      },
    },
  };
  res.json(response);
});

// 404 handler
app.use('*', (req, res) => {
  const response: ApiResponse = {
    success: false,
    error: 'Endpoint not found',
    message: 'The requested endpoint does not exist',
  };
  res.status(404).json(response);
});

// Error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  
  const response: ApiResponse = {
    success: false,
    error: 'Internal server error',
    message: config.nodeEnv === 'development' ? error.message : 'Something went wrong',
  };
  
  res.status(500).json(response);
});

async function startServer() {
  try {
    // Connect to database
    await prismaService.connect();

    // Create default user
    await authService.createDefaultUser();

    // Start Telegram bot
    telegramService.launch();

    // Start Express server
    app.listen(config.port, () => {
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`🌍 Environment: ${config.nodeEnv}`);
      console.log(`📚 API Documentation: http://localhost:${config.port}/api`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, shutting down gracefully');
  telegramService.stop();
  await prismaService.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully');
  telegramService.stop();
  await prismaService.disconnect();
  process.exit(0);
});

// Start the server
startServer();

export default app;
