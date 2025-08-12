import { z } from 'zod';

// Job schema for GitHub Actions
export const GitHubJobSchema = z.object({
  id: z.number(),
  name: z.string().min(1, 'Job name is required'),
  result: z.enum(['success', 'failure', 'in_progress', 'cancelled', 'skipped']),
  url: z.string().url('Job URL must be a valid URL'),
});
export type GitHubWebhookJob = z.infer<typeof GitHubJobSchema>;

// GitHub Webhook Payload Schema
export const GitHubWebhookPayloadSchema = z.object({
  workflow_name: z.string().min(1, 'Workflow name is required'),
  repository: z.string().min(1, 'Repository is required'),
  run_id: z.string().min(1, 'Run ID is required'),
  run_url: z.string().url('Run URL must be a valid URL'),
  status: z.enum(['success', 'failure', 'cancelled', 'skipped', 'in_progress']),
  branch: z.string().min(1, 'Branch is required'),
  commit_sha: z.string().min(7, 'Commit SHA must be at least 7 characters'),
  commit_message: z.string().optional(),
  actor: z.string().min(1, 'Actor is required'),
  // New: list of jobs in the workflow run
  jobs: z.array(GitHubJobSchema).optional().default([]),
});

export type GitHubWebhookPayload = z.infer<typeof GitHubWebhookPayloadSchema>;

// Authentication Schemas
export const AuthRequestSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type AuthRequest = z.infer<typeof AuthRequestSchema>;

export const AuthResponseSchema = z.object({
  token: z.string(),
  user: z.object({
    id: z.string(),
    username: z.string(),
  }),
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;

// Project Schemas
export const ProjectRequestSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Project name too long'),
  repository: z
    .string()
    .min(1, 'Repository is required')
    .regex(/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/, 'Repository must be in format: owner/repo'),
  description: z.string().max(500, 'Description too long').optional(),
});

export type ProjectRequest = z.infer<typeof ProjectRequestSchema>;

// Notification Settings Schemas
export const NotificationSettingsRequestSchema = z.object({
  chatId: z.string().min(1, 'Chat ID is required'),
  username: z.string().optional(),
  notifyOnSuccess: z.boolean().default(false),
  notifyOnFailure: z.boolean().default(true),
  notifyOnBuild: z.boolean().default(true),
  notifyOnDeploy: z.boolean().default(true),
  notifyOnTest: z.boolean().default(true),
});

export type NotificationSettingsRequest = z.infer<typeof NotificationSettingsRequestSchema>;

// Change Password Schema
export const ChangePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(6, 'New password must be at least 6 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'New password must contain at least one lowercase letter, one uppercase letter, and one number'
    ),
});

export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequestSchema>;

// User Project Assignment Schema
export const UserProjectAssignmentSchema = z.object({
  userId: z.string().cuid('Invalid user ID'),
  projectId: z.string().cuid('Invalid project ID'),
  role: z.enum(['admin', 'member']).default('member'),
});

export type UserProjectAssignment = z.infer<typeof UserProjectAssignmentSchema>;

// Query Parameters Schemas
export const PaginationSchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform(Number)
    .refine((n) => n > 0, 'Page must be positive'),
  limit: z
    .string()
    .optional()
    .default('10')
    .transform(Number)
    .refine((n) => n > 0 && n <= 100, 'Limit must be between 1 and 100'),
});

export type PaginationQuery = z.infer<typeof PaginationSchema>;

export const WebhookQuerySchema = z
  .object({
    projectId: z.string().cuid('Invalid project ID').optional(),
    status: z.enum(['success', 'failure', 'cancelled', 'skipped', 'in_progress']).optional(),
    branch: z.string().optional(),
    actor: z.string().optional(),
  })
  .merge(PaginationSchema);

export type WebhookQuery = z.infer<typeof WebhookQuerySchema>;

// API Response Schemas
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};
