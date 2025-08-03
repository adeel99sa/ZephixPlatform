import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserEntity } from '../../domain/entities/user.entity';
import { IUserRepository } from '../../domain/repositories/user-repository.interface';
import { UnauthorizedException, ForbiddenException } from '../../shared/errors';
import { AuthenticatedRequest } from '../../shared/types';
import { env } from '../../shared/types';
import { Logger } from '../../infrastructure/logging/logger';

/**
 * Authentication middleware for protecting routes
 */
export class AuthMiddleware {
  private readonly JWT_SECRET = env.JWT_SECRET;

  /**
   * Extracts token from authorization header
   */
  private extractToken(authHeader: string | undefined): string | null {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1] || null;
  }

  /**
   * Verifies JWT token and returns payload
   */
  private verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.JWT_SECRET);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * Creates a minimal user object from JWT payload
   */
  private createUserFromPayload(payload: any): { userId: string; email: string; role: string } {
    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role
    };
  }

  /**
   * Main authentication middleware
   */
  authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      const token = this.extractToken(authHeader);

      if (!token) {
        throw new UnauthorizedException('No token provided');
      }

      const payload = this.verifyToken(token);
      
      // Add user to request
      req.user = this.createUserFromPayload(payload);

      next();
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        res.status(401).json({
          error: 'Unauthorized',
          message: error.message
        });
      } else {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid authentication token'
        });
      }
    }
  };

  /**
   * Role-based authorization middleware
   */
  authorize = (roles: string[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      try {
        if (!req.user) {
          throw new UnauthorizedException('User not authenticated');
        }

        if (!roles.includes(req.user.role)) {
          throw new ForbiddenException('Insufficient permissions');
        }

        next();
      } catch (error) {
        if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
          res.status(error.statusCode).json({
            error: error.name,
            message: error.message
          });
        } else {
          res.status(500).json({
            error: 'Internal Server Error',
            message: 'Authorization check failed'
          });
        }
      }
    };
  };

  /**
   * Admin-only authorization middleware
   */
  requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    this.authorize(['admin'])(req, res, next);
  };

  /**
   * User or admin authorization middleware
   */
  requireUserOrAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    this.authorize(['user', 'admin'])(req, res, next);
  };

  /**
   * Optional authentication middleware (doesn't fail if no token)
   */
  optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      const token = this.extractToken(authHeader);

      if (token) {
        const payload = this.verifyToken(token);
        req.user = this.createUserFromPayload(payload);
      }

      next();
    } catch (error) {
      // Continue without authentication
      next();
    }
  };
}

/**
 * Global authentication middleware instance
 */
export const authMiddleware = new AuthMiddleware(); 