import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { AuthRequest, ChangePasswordRequest, ApiResponse } from '../types';
import { AuthenticatedRequest } from '../middleware/auth';

export class AuthController {
  constructor(private authService: AuthService) {}

  async login(req: Request, res: Response) {
    try {
      const credentials: AuthRequest = req.body; // Already validated by middleware

      const result = await this.authService.login(credentials);

      if (!result) {
        const response: ApiResponse = {
          success: false,
          error: 'Invalid credentials',
        };
        return res.status(401).json(response);
      }

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Login successful',
      };

      res.json(response);
    } catch (error) {
      console.error('Login error:', error);
      
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      
      res.status(500).json(response);
    }
  }

  async changePassword(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'User not authenticated',
        };
        return res.status(401).json(response);
      }

      const passwordData: ChangePasswordRequest = req.body; // Already validated by middleware
      const success = await this.authService.changePassword(req.user.id, passwordData);

      if (!success) {
        const response: ApiResponse = {
          success: false,
          error: 'Current password is incorrect',
        };
        return res.status(400).json(response);
      }

      const response: ApiResponse = {
        success: true,
        message: 'Password changed successfully',
      };

      res.json(response);
    } catch (error) {
      console.error('Change password error:', error);
      
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      
      res.status(500).json(response);
    }
  }

  async getProfile(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'User not authenticated',
        };
        return res.status(401).json(response);
      }

      const user = await this.authService.getUserById(req.user.id);

      if (!user) {
        const response: ApiResponse = {
          success: false,
          error: 'User not found',
        };
        return res.status(404).json(response);
      }

      const response: ApiResponse = {
        success: true,
        data: user,
      };

      res.json(response);
    } catch (error) {
      console.error('Get profile error:', error);
      
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      
      res.status(500).json(response);
    }
  }
}
