import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { ApiResponse } from '../types';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
  };
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    const response: ApiResponse = {
      success: false,
      error: 'Access token required',
    };
    return res.status(401).json(response);
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    req.user = {
      id: decoded.id,
      username: decoded.username,
    };
    next();
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Invalid or expired token',
    };
    return res.status(403).json(response);
  }
};

export const validateWebhookSecret = (req: Request, res: Response, next: NextFunction) => {
  const webhookSecret = req.headers['x-webhook-secret'];

  if (!webhookSecret) {
    const response: ApiResponse = {
      success: false,
      error: 'Webhook secret required',
    };
    return res.status(401).json(response);
  }

  if (webhookSecret !== config.webhook.secret) {
    const response: ApiResponse = {
      success: false,
      error: 'Invalid webhook secret',
    };
    return res.status(403).json(response);
  }

  next();
};
