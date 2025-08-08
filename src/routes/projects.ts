import express from 'express';
import { ProjectController } from '../controllers/projectController';
import { validateSchema, validateParams } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';
import { ProjectRequestSchema } from '../types';
import { z } from 'zod';

const router = express.Router();
const projectController = new ProjectController();

// Schema for route parameters
const ProjectParamsSchema = z.object({
  id: z.string().cuid('Invalid project ID'),
});

// All routes require authentication
router.use(authenticateToken);

// Project CRUD operations
router.post('/', validateSchema(ProjectRequestSchema), projectController.createProject.bind(projectController));
router.get('/', projectController.getProjects.bind(projectController));
router.get('/:id', validateParams(ProjectParamsSchema), projectController.getProject.bind(projectController));
router.put('/:id', validateParams(ProjectParamsSchema), validateSchema(ProjectRequestSchema), projectController.updateProject.bind(projectController));
router.patch('/:id/toggle', validateParams(ProjectParamsSchema), projectController.toggleProjectStatus.bind(projectController));
router.delete('/:id', validateParams(ProjectParamsSchema), projectController.deleteProject.bind(projectController));

export default router;
