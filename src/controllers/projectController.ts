import { Request, Response } from 'express';
import { ProjectRequest, ApiResponse } from '../types';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../config/database';

export class ProjectController {
  async createProject(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const projectData: ProjectRequest = req.body;

      if (!projectData.name || !projectData.repository) {
        return res.status(400).json({
          error: 'Project name and repository are required',
        });
      }

      // Check if repository already exists
      const existingProject = await prisma.project.findUnique({
        where: { repository: projectData.repository },
      });

      if (existingProject) {
        return res.status(409).json({
          error: 'Project with this repository already exists',
        });
      }

      // Create project
      const project = await prisma.project.create({
        data: {
          name: projectData.name,
          repository: projectData.repository,
          description: projectData.description,
        },
      });

      // Associate user with project
      await prisma.userProject.create({
        data: {
          userId: req.user.id,
          projectId: project.id,
          role: 'admin',
        },
      });

      res.status(201).json({
        message: 'Project created successfully',
        project,
      });
    } catch (error) {
      console.error('Create project error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getProjects(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const projects = await prisma.project.findMany({
        where: {
          users: {
            some: {
              userId: req.user.id,
            },
          },
        },
        include: {
          users: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
          },
          _count: {
            select: {
              webhooks: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ projects });
    } catch (error) {
      console.error('Get projects error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getProject(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { id } = req.params;

      const project = await prisma.project.findFirst({
        where: {
          id,
          users: {
            some: {
              userId: req.user.id,
            },
          },
        },
        include: {
          users: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
          },
          webhooks: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      res.json({ project });
    } catch (error) {
      console.error('Get project error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateProject(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { id } = req.params;
      const updateData: Partial<ProjectRequest> = req.body;

      // Check if user has access to project
      const userProject = await prisma.userProject.findFirst({
        where: {
          projectId: id,
          userId: req.user.id,
          role: 'admin',
        },
      });

      if (!userProject) {
        return res.status(403).json({
          error: 'You do not have permission to update this project',
        });
      }

      const project = await prisma.project.update({
        where: { id },
        data: updateData,
      });

      res.json({
        message: 'Project updated successfully',
        project,
      });
    } catch (error) {
      console.error('Update project error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async toggleProjectStatus(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { id } = req.params;

      // Check if user has access to project
      const userProject = await prisma.userProject.findFirst({
        where: {
          projectId: id,
          userId: req.user.id,
          role: 'admin',
        },
      });

      if (!userProject) {
        return res.status(403).json({
          error: 'You do not have permission to modify this project',
        });
      }

      const currentProject = await prisma.project.findUnique({
        where: { id },
      });

      if (!currentProject) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const project = await prisma.project.update({
        where: { id },
        data: { isActive: !currentProject.isActive },
      });

      res.json({
        message: `Project ${project.isActive ? 'activated' : 'deactivated'} successfully`,
        project,
      });
    } catch (error) {
      console.error('Toggle project status error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteProject(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { id } = req.params;

      // Check if user has access to project
      const userProject = await prisma.userProject.findFirst({
        where: {
          projectId: id,
          userId: req.user.id,
          role: 'admin',
        },
      });

      if (!userProject) {
        return res.status(403).json({
          error: 'You do not have permission to delete this project',
        });
      }

      await prisma.project.delete({
        where: { id },
      });

      res.json({
        message: 'Project deleted successfully',
      });
    } catch (error) {
      console.error('Delete project error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
