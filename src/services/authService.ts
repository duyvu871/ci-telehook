import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../config/database';
import { AuthRequest, AuthResponse, ChangePasswordRequest } from '../types';

export class AuthService {
  async login(credentials: AuthRequest): Promise<AuthResponse | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { username: credentials.username },
      });

      if (!user || !user.isActive) {
        return null;
      }

      const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
      if (!isPasswordValid) {
        return null;
      }

      const token = jwt.sign(
        { userId: user.id, username: user.username },
        config.jwtSecret,
        { expiresIn: '24h' }
      );

      return {
        token,
        user: {
          id: user.id,
          username: user.username,
        },
      };
    } catch (error) {
      console.error('Login error:', error);
      return null;
    }
  }

  async changePassword(userId: string, passwordData: ChangePasswordRequest): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return false;
      }

      const isCurrentPasswordValid = await bcrypt.compare(
        passwordData.currentPassword,
        user.password
      );

      if (!isCurrentPasswordValid) {
        return false;
      }

      const hashedNewPassword = await bcrypt.hash(passwordData.newPassword, 12);

      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedNewPassword },
      });

      return true;
    } catch (error) {
      console.error('Change password error:', error);
      return false;
    }
  }

  verifyToken(token: string): any {
    try {
      return jwt.verify(token, config.jwtSecret);
    } catch (error) {
      return null;
    }
  }

  async createDefaultUser(): Promise<void> {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { username: config.defaultBot.username },
      });

      if (existingUser) {
        console.log('Default user already exists');
        return;
      }

      const hashedPassword = await bcrypt.hash(config.defaultBot.password, 12);

      await prisma.user.create({
        data: {
          username: config.defaultBot.username,
          password: hashedPassword,
        },
      });

      console.log('Default user created successfully');
    } catch (error) {
      console.error('Error creating default user:', error);
    }
  }

  async getUserById(userId: string) {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        isActive: true,
        createdAt: true,
        projects: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
                repository: true,
                description: true,
              },
            },
          },
        },
      },
    });
  }

  async createUser(username: string, password: string): Promise<{ id: string; username: string } | null> {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { username },
      });

      if (existingUser) {
        return null; // User already exists
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: {
          username,
          password: hashedPassword,
        },
      });

      return {
        id: user.id,
        username: user.username,
      };
    } catch (error) {
      console.error('Error creating user:', error);
      return null;
    }
  }
}
