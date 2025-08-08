import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ApiResponse } from '../types';

export const validateSchema = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.issues.map(
          (issue) => `${issue.path.join('.')}: ${issue.message}`
        );
        
        const response: ApiResponse = {
          success: false,
          error: 'Validation failed',
          message: errorMessages.join(', '),
        };
        
        return res.status(400).json(response);
      }
      
      const response: ApiResponse = {
        success: false,
        error: 'Invalid request data',
      };
      
      return res.status(400).json(response);
    }
  };
};

export const validateQuery = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate query parameters
      const validatedQuery = schema.parse(req.query);
      req.query = validatedQuery as any;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.issues.map(
          (issue) => `${issue.path.join('.')}: ${issue.message}`
        );
        
        const response: ApiResponse = {
          success: false,
          error: 'Query validation failed',
          message: errorMessages.join(', '),
        };
        
        return res.status(400).json(response);
      }
      
      const response: ApiResponse = {
        success: false,
        error: 'Invalid query parameters',
      };
      
      return res.status(400).json(response);
    }
  };
};

export const validateParams = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate route parameters
      const validatedParams = schema.parse(req.params);
      req.params = validatedParams as any;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.issues.map(
          (issue) => `${issue.path.join('.')}: ${issue.message}`
        );
        
        const response: ApiResponse = {
          success: false,
          error: 'Parameter validation failed',
          message: errorMessages.join(', '),
        };
        
        return res.status(400).json(response);
      }
      
      const response: ApiResponse = {
        success: false,
        error: 'Invalid route parameters',
      };
      
      return res.status(400).json(response);
    }
  };
};
