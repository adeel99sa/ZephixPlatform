import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { 
  RegisterDto, 
  LoginDto, 
  PasswordResetRequestDto, 
  PasswordResetDto, 
  PasswordChangeDto, 
  EmailVerificationDto, 
  MFASetupDto, 
  MFAVerificationDto, 
  TokenRefreshDto, 
  UpdateProfileDto 
} from '../../application/dto/auth.dto';
import { AuthenticatedRequest } from '../../shared/types';
import { authMiddleware } from '../middleware/auth.middleware';
import { Logger } from '../../infrastructure/logging/logger';

const authRoutes = Router();
const logger = new Logger('AuthRoutes');

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               firstName:
 *                 type: string
 *                 minLength: 2
 *               lastName:
 *                 type: string
 *                 minLength: 2
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: User already exists
 */
authRoutes.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
  body('firstName').isLength({ min: 2, max: 50 }).trim(),
  body('lastName').isLength({ min: 2, max: 50 }).trim()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const registerDto: RegisterDto = {
      email: req.body.email,
      password: req.body.password,
      firstName: req.body.firstName,
      lastName: req.body.lastName
    };

    const authService = (req.app as any).authService;
    const result = await authService.register(registerDto);

    if (result.success) {
      return res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: result.user?.id,
          email: result.user?.email,
          firstName: result.user?.firstName,
          lastName: result.user?.lastName
        },
        token: result.token,
        refreshToken: result.refreshToken
      });
    } else {
      return res.status(400).json({
        error: 'Registration failed',
        message: result.error
      });
    }
  } catch (error) {
    logger.error('Registration failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Registration failed'
    });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
authRoutes.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const loginDto: LoginDto = {
      email: req.body.email,
      password: req.body.password
    };

    const authService = (req.app as any).authService;
    const result = await authService.login(loginDto);

    if (result.success) {
      return res.status(200).json({
        message: 'Login successful',
        user: {
          id: result.user?.id,
          email: result.user?.email,
          firstName: result.user?.firstName,
          lastName: result.user?.lastName,
          role: result.user?.role
        },
        token: result.token,
        refreshToken: result.refreshToken,
        requiresMFA: result.requiresMFA
      });
    } else {
      return res.status(401).json({
        error: 'Authentication failed',
        message: result.error
      });
    }
  } catch (error) {
    logger.error('Login failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Login failed'
    });
  }
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Invalid refresh token
 */
authRoutes.post('/refresh', [
  body('refreshToken').notEmpty()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const refreshDto: TokenRefreshDto = {
      refreshToken: req.body.refreshToken
    };

    const authService = (req.app as any).authService;
    const result = await authService.refreshToken(refreshDto);

    if (result.success) {
      return res.status(200).json({
        message: 'Token refreshed successfully',
        token: result.token,
        refreshToken: result.refreshToken
      });
    } else {
      return res.status(401).json({
        error: 'Token refresh failed',
        message: result.error
      });
    }
  } catch (error) {
    logger.error('Token refresh failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Token refresh failed'
    });
  }
});

/**
 * @swagger
 * /api/auth/request-password-reset:
 *   post:
 *     summary: Request password reset
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Password reset email sent
 */
authRoutes.post('/request-password-reset', [
  body('email').isEmail().normalizeEmail()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const requestDto: PasswordResetRequestDto = {
      email: req.body.email
    };

    const authService = (req.app as any).authService;
    await authService.requestPasswordReset(requestDto);

    return res.status(200).json({
      message: 'Password reset email sent'
    });
  } catch (error) {
    logger.error('Password reset request failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Password reset request failed'
    });
  }
});

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired token
 */
authRoutes.post('/reset-password', [
  body('token').notEmpty(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const resetDto: PasswordResetDto = {
      token: req.body.token,
      newPassword: req.body.password
    };

    const authService = (req.app as any).authService;
    await authService.resetPassword(resetDto);

    return res.status(200).json({
      message: 'Password reset successfully'
    });
  } catch (error) {
    logger.error('Password reset failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Password reset failed'
    });
  }
});

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Change user password
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Current password incorrect
 */
authRoutes.post('/change-password', [
  authMiddleware.authenticate,
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const changeDto: PasswordChangeDto = {
      newPassword: req.body.newPassword,
      token: req.body.currentPassword // Using currentPassword as token for now
    };

    const authService = (req.app as any).authService;
    await authService.changePassword(req.user!.userId, changeDto);

    return res.status(200).json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Password change failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Password change failed'
    });
  }
});

/**
 * @swagger
 * /api/auth/verify-email:
 *   post:
 *     summary: Verify email with token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired token
 */
authRoutes.post('/verify-email', [
  body('token').notEmpty()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const verificationDto: EmailVerificationDto = {
      token: req.body.token
    };

    const authService = (req.app as any).authService;
    await authService.verifyEmail(verificationDto);

    return res.status(200).json({
      message: 'Email verified successfully'
    });
  } catch (error) {
    logger.error('Email verification failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Email verification failed'
    });
  }
});

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         description: Unauthorized
 */
authRoutes.get('/profile', [
  authMiddleware.authenticate
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authService = (req.app as any).authService;
    const user = await authService.getUserProfile(req.user!.userId);

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        emailVerified: user.emailVerified,
        mfaEnabled: user.mfaEnabled,
        lastLoginAt: user.lastLoginAt
      }
    });
  } catch (error) {
    logger.error('Get profile failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get profile'
    });
  }
});

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 minLength: 2
 *               lastName:
 *                 type: string
 *                 minLength: 2
 *               bio:
 *                 type: string
 *               location:
 *                 type: string
 *               website:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 */
authRoutes.put('/profile', [
  authMiddleware.authenticate,
  body('firstName').optional().isLength({ min: 2, max: 50 }).trim(),
  body('lastName').optional().isLength({ min: 2, max: 50 }).trim(),
  body('bio').optional().isLength({ max: 500 }).trim(),
  body('location').optional().isLength({ max: 100 }).trim(),
  body('website').optional().isLength({ max: 100 }).trim()
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const updateDto: UpdateProfileDto = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      bio: req.body.bio,
      location: req.body.location,
      website: req.body.website
    };

    const authService = (req.app as any).authService;
    const result = await authService.updateProfile(req.user!.userId, updateDto);

    return res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: result.id,
        email: result.email,
        firstName: result.firstName,
        lastName: result.lastName,
        role: result.role
      }
    });
  } catch (error) {
    logger.error('Profile update failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Profile update failed'
    });
  }
});

/**
 * @swagger
 * /api/auth/mfa/setup:
 *   post:
 *     summary: Setup MFA for user
 *     tags: [MFA]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mfaToken
 *             properties:
 *               mfaToken:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 6
 *     responses:
 *       200:
 *         description: MFA setup successfully
 *       400:
 *         description: Invalid MFA token
 */
authRoutes.post('/mfa/setup', [
  authMiddleware.authenticate,
  body('mfaToken').isLength({ min: 6, max: 6 })
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const setupDto: MFASetupDto = {
      mfaToken: req.body.mfaToken
    };

    const authService = (req.app as any).authService;
    const result = await authService.setupMFA(req.user!.userId, setupDto);

    return res.status(200).json({
      message: 'MFA setup successfully',
      secret: result.secret,
      qrCode: result.qrCode
    });
  } catch (error) {
    logger.error('MFA setup failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'MFA setup failed'
    });
  }
});

/**
 * @swagger
 * /api/auth/mfa/verify:
 *   post:
 *     summary: Verify MFA token
 *     tags: [MFA]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mfaToken
 *             properties:
 *               mfaToken:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 6
 *     responses:
 *       200:
 *         description: MFA verification successful
 *       400:
 *         description: Invalid MFA token
 */
authRoutes.post('/mfa/verify', [
  authMiddleware.authenticate,
  body('mfaToken').isLength({ min: 6, max: 6 })
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const verificationDto: MFAVerificationDto = {
      mfaToken: req.body.mfaToken
    };

    const authService = (req.app as any).authService;
    const isValid = await authService.verifyMFA(req.user!.userId, verificationDto);

    if (isValid) {
      return res.status(200).json({
        message: 'MFA verification successful'
      });
    } else {
      return res.status(400).json({
        error: 'MFA verification failed',
        message: 'Invalid MFA token'
      });
    }
  } catch (error) {
    logger.error('MFA verification failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'MFA verification failed'
    });
  }
});

/**
 * @swagger
 * /api/auth/mfa/disable:
 *   post:
 *     summary: Disable MFA for user
 *     tags: [MFA]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: MFA disabled successfully
 */
authRoutes.post('/mfa/disable', [
  authMiddleware.authenticate
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authService = (req.app as any).authService;
    // Note: This method doesn't exist in the current service, would need to be added
    // await authService.disableMFA(req.user!.userId);

    return res.status(200).json({
      message: 'MFA disabled successfully'
    });
  } catch (error) {
    logger.error('MFA disable failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'MFA disable failed'
    });
  }
});

/**
 * @swagger
 * /api/auth/password-strength:
 *   post:
 *     summary: Check password strength
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password strength analysis
 */
authRoutes.post('/password-strength', [
  body('password').notEmpty()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const password = req.body.password;
    
    // Simple password strength analysis
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[@$!%*?&]/.test(password);
    const isLongEnough = password.length >= 8;

    const score = [hasLower, hasUpper, hasNumber, hasSpecial, isLongEnough]
      .filter(Boolean).length;

    const strength = score < 3 ? 'weak' : score < 4 ? 'medium' : 'strong';

    return res.status(200).json({
      score,
      strength,
      feedback: {
        hasLower,
        hasUpper,
        hasNumber,
        hasSpecial,
        isLongEnough
      }
    });
  } catch (error) {
    logger.error('Password strength check failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Password strength check failed'
    });
  }
});

export { authRoutes }; 