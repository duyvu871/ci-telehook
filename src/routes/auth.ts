import express from 'express';
import { AuthController } from '../controllers/authController';
import { AuthService } from '../services/authService';
import { validateSchema } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';
import { AuthRequestSchema, ChangePasswordRequestSchema } from '../types';

const router = express.Router();
const authService = new AuthService();
const authController = new AuthController(authService);

// Public routes
router.post('/login', validateSchema(AuthRequestSchema), authController.login.bind(authController));

// Protected routes
router.use(authenticateToken);
router.get('/profile', authController.getProfile.bind(authController));
router.post('/change-password', validateSchema(ChangePasswordRequestSchema), authController.changePassword.bind(authController));

export default router;
