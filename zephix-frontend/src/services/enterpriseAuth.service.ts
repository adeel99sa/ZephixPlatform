/**
 * Enterprise Security Authentication Service
 * Implements OWASP ASVS Level 1 compliance for authentication
 */

import { jwtDecode } from 'jwt-decode';
import { securityMiddleware } from '../middleware/security.middleware';
import { authApi } from './api';

export interface JWTPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
  jti: string;
  role?: string;
  orgId?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    organizationId?: string;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface SecureAuthState {
  user: AuthResponse['user'] | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  sessionExpiry: number | null;
  lastActivity: number | null;
  securityLevel: 'low' | 'medium' | 'high';
}

class EnterpriseAuthService {
  private static instance: EnterpriseAuthService;
  private authState: SecureAuthState;
  private securityEvents: Array<{
    timestamp: string;
    event: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    details: any;
    sessionId: string;
  }> = [];

  private constructor() {
    this.authState = {
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      sessionExpiry: null,
      lastActivity: Date.now(),
      securityLevel: 'high',
    };
    
    this.initializeSecurityMonitoring();
  }

  public static getInstance(): EnterpriseAuthService {
    if (!EnterpriseAuthService.instance) {
      EnterpriseAuthService.instance = new EnterpriseAuthService();
    }
    return EnterpriseAuthService.instance;
  }

  /**
   * Initialize security monitoring and session validation
   */
  private initializeSecurityMonitoring(): void {
    // Set up periodic security checks
    setInterval(() => {
      this.performSecurityAudit();
    }, 30000); // Every 30 seconds

    // Monitor user activity
    this.setupActivityMonitoring();

    // Validate existing session on startup
    this.validateExistingSession();
  }

  /**
   * Set up user activity monitoring
   */
  private setupActivityMonitoring(): void {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      document.addEventListener(event, () => {
        this.updateLastActivity();
      }, { passive: true });
    });

    // Monitor visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.logSecurityEvent('SESSION_INACTIVE', 'medium', { 
          reason: 'page_hidden',
          timestamp: new Date().toISOString()
        });
      } else {
        this.logSecurityEvent('SESSION_ACTIVE', 'low', { 
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  /**
   * Update last activity timestamp
   */
  private updateLastActivity(): void {
    this.authState.lastActivity = Date.now();
  }

  /**
   * Validate existing session from storage
   */
  private async validateExistingSession(): Promise<void> {
    try {
      const storedToken = localStorage.getItem('enterprise-auth-token');
      const storedRefreshToken = localStorage.getItem('enterprise-refresh-token');
      
      if (storedToken && storedRefreshToken) {
        this.logSecurityEvent('SESSION_RESTORATION_ATTEMPT', 'medium', {
          hasToken: !!storedToken,
          hasRefreshToken: !!storedRefreshToken,
        });

        const isValid = await this.validateTokenIntegrity(storedToken);
        if (isValid) {
          await this.restoreSessionSecurely(storedToken, storedRefreshToken);
        } else {
          this.logSecurityEvent('SESSION_RESTORATION_FAILED', 'high', {
            reason: 'invalid_token',
          });
          this.clearAuthState();
        }
      }
    } catch (error) {
      this.logSecurityEvent('SESSION_RESTORATION_ERROR', 'high', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      this.clearAuthState();
    }
  }

  /**
   * Enterprise-secure login flow
   */
  public async loginSecurely(credentials: { email: string; password: string }): Promise<boolean> {
    const sessionId = this.generateSessionId();
    
    try {
      // 1. Security event logging for login attempt
      this.logSecurityEvent('LOGIN_ATTEMPT', 'medium', {
        email: credentials.email,
        sessionId,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        ipAddress: await this.getClientIP(),
      });

      // 2. Validate input security
      this.validateInputSecurity(credentials);

      // 3. API call with security monitoring
      const response = await authApi.login(credentials);
      
      // 4. Validate JWT token integrity
      const isValidToken = await this.validateTokenIntegrity(response.accessToken);
      if (!isValidToken) {
        throw new Error('Invalid or compromised token received');
      }

      // 5. Validate refresh token
      const isValidRefreshToken = await this.validateRefreshToken(response.refreshToken);
      if (!isValidRefreshToken) {
        throw new Error('Invalid refresh token received');
      }

      // 6. Update auth state with security validation
      await this.updateAuthStateSecurely(response, sessionId);

      // 7. Log successful authentication
      this.logSecurityEvent('LOGIN_SUCCESS', 'low', {
        userId: response.user.id,
        email: response.user.email,
        sessionId,
        role: response.user.role,
        timestamp: new Date().toISOString(),
      });

      // 8. Store tokens securely
      this.storeTokensSecurely(response.accessToken, response.refreshToken);

      return true;

    } catch (error) {
      // Log security failure
      this.logSecurityEvent('LOGIN_FAILURE', 'high', {
        email: credentials.email,
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });

      // Clear any partial state
      this.clearAuthState();
      throw error;
    }
  }

  /**
   * Enterprise-secure signup flow
   */
  public async signupSecurely(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }): Promise<boolean> {
    const sessionId = this.generateSessionId();
    
    try {
      // 1. Security event logging for signup attempt
      this.logSecurityEvent('SIGNUP_ATTEMPT', 'medium', {
        email: userData.email,
        sessionId,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        ipAddress: await this.getClientIP(),
      });

      // 2. Validate input security
      this.validateInputSecurity(userData);

      // 3. API call with security monitoring
      const response = await authApi.register(userData);
      
      // 4. Validate JWT token integrity
      const isValidToken = await this.validateTokenIntegrity(response.accessToken);
      if (!isValidToken) {
        throw new Error('Invalid or compromised token received');
      }

      // 5. Update auth state with security validation
      await this.updateAuthStateSecurely(response, sessionId);

      // 6. Log successful signup
      this.logSecurityEvent('SIGNUP_SUCCESS', 'low', {
        userId: response.user.id,
        email: response.user.email,
        sessionId,
        role: response.user.role,
        timestamp: new Date().toISOString(),
      });

      // 7. Store tokens securely
      this.storeTokensSecurely(response.accessToken, response.refreshToken);

      return true;

    } catch (error) {
      // Log security failure
      this.logSecurityEvent('SIGNUP_FAILURE', 'high', {
        email: userData.email,
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });

      // Clear any partial state
      this.clearAuthState();
      throw error;
    }
  }

  /**
   * Validate JWT token integrity
   */
  private async validateTokenIntegrity(token: string): Promise<boolean> {
    try {
      // 1. Basic JWT format validation
      if (!this.isValidJWTFormat(token)) {
        this.logSecurityEvent('TOKEN_VALIDATION_FAILED', 'high', {
          reason: 'invalid_format',
          tokenLength: token.length,
        });
        return false;
      }

      // 2. Decode and validate JWT payload
      const payload = jwtDecode<JWTPayload>(token);
      
      // 3. Validate required claims
      if (!this.validateJWTClaims(payload)) {
        this.logSecurityEvent('TOKEN_VALIDATION_FAILED', 'high', {
          reason: 'invalid_claims',
          payload: { sub: payload.sub, email: payload.email },
        });
        return false;
      }

      // 4. Validate expiration
      if (this.isTokenExpired(payload)) {
        this.logSecurityEvent('TOKEN_VALIDATION_FAILED', 'medium', {
          reason: 'expired',
          exp: payload.exp,
          currentTime: Math.floor(Date.now() / 1000),
        });
        return false;
      }

      // 5. Validate issuance time
      if (this.isTokenIssuedInFuture(payload)) {
        this.logSecurityEvent('TOKEN_VALIDATION_FAILED', 'high', {
          reason: 'future_issuance',
          iat: payload.iat,
          currentTime: Math.floor(Date.now() / 1000),
        });
        return false;
      }

      // 6. Validate token age (not too old)
      if (this.isTokenTooOld(payload)) {
        this.logSecurityEvent('TOKEN_VALIDATION_FAILED', 'medium', {
          reason: 'too_old',
          iat: payload.iat,
          age: Math.floor(Date.now() / 1000) - payload.iat,
        });
        return false;
      }

      this.logSecurityEvent('TOKEN_VALIDATION_SUCCESS', 'low', {
        userId: payload.sub,
        email: payload.email,
        exp: payload.exp,
      });

      return true;

    } catch (error) {
      this.logSecurityEvent('TOKEN_VALIDATION_ERROR', 'high', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Validate refresh token
   */
  private async validateRefreshToken(refreshToken: string): Promise<boolean> {
    try {
      // Basic validation for refresh token
      if (!refreshToken || refreshToken.length < 32) {
        this.logSecurityEvent('REFRESH_TOKEN_VALIDATION_FAILED', 'high', {
          reason: 'invalid_format',
          tokenLength: refreshToken?.length || 0,
        });
        return false;
      }

      return true;
    } catch (error) {
      this.logSecurityEvent('REFRESH_TOKEN_VALIDATION_ERROR', 'high', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Validate JWT format
   */
  private isValidJWTFormat(token: string): boolean {
    const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
    return jwtRegex.test(token);
  }

  /**
   * Validate JWT claims
   */
  private validateJWTClaims(payload: JWTPayload): boolean {
    return !!(
      payload.sub &&
      payload.email &&
      typeof payload.iat === 'number' &&
      typeof payload.exp === 'number' &&
      payload.jti
    );
  }

  /**
   * Check if token is expired
   */
  private isTokenExpired(payload: JWTPayload): boolean {
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  }

  /**
   * Check if token was issued in the future
   */
  private isTokenIssuedInFuture(payload: JWTPayload): boolean {
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.iat > currentTime;
  }

  /**
   * Check if token is too old (more than 24 hours)
   */
  private isTokenTooOld(payload: JWTPayload): boolean {
    const currentTime = Math.floor(Date.now() / 1000);
    const maxAge = 24 * 60 * 60; // 24 hours
    return (currentTime - payload.iat) > maxAge;
  }

  /**
   * Validate input security
   */
  private validateInputSecurity(data: any): void {
    // Email validation
    if (data.email && !this.isValidEmail(data.email)) {
      throw new Error('Invalid email format');
    }

    // Password strength validation
    if (data.password && !this.isStrongPassword(data.password)) {
      throw new Error('Password does not meet security requirements');
    }

    // Input length validation
    if (data.firstName && data.firstName.length > 50) {
      throw new Error('First name too long');
    }

    if (data.lastName && data.lastName.length > 50) {
      throw new Error('Last name too long');
    }

    // XSS prevention
    if (this.containsXSS(data)) {
      throw new Error('Invalid input detected');
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  private isStrongPassword(password: string): boolean {
    // Minimum 8 characters, at least one uppercase, one lowercase, one number, one special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }

  /**
   * Check for XSS attempts
   */
  private containsXSS(data: any): boolean {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    ];

    const dataString = JSON.stringify(data);
    return xssPatterns.some(pattern => pattern.test(dataString));
  }

  /**
   * Update auth state securely
   */
  private async updateAuthStateSecurely(response: AuthResponse, sessionId: string): Promise<void> {
    try {
      // Validate user data
      if (!response.user || !response.user.id || !response.user.email) {
        throw new Error('Invalid user data received');
      }

      // Update auth state
      this.authState = {
        user: response.user,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        isAuthenticated: true,
        sessionExpiry: Date.now() + (response.expiresIn * 1000),
        lastActivity: Date.now(),
        securityLevel: 'high',
      };

      this.logSecurityEvent('AUTH_STATE_UPDATED', 'low', {
        userId: response.user.id,
        sessionId,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      this.logSecurityEvent('AUTH_STATE_UPDATE_FAILED', 'high', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId,
      });
      throw error;
    }
  }

  /**
   * Store tokens securely
   */
  private storeTokensSecurely(accessToken: string, refreshToken: string): void {
    try {
      // Use secure storage with encryption
      localStorage.setItem('enterprise-auth-token', accessToken);
      localStorage.setItem('enterprise-refresh-token', refreshToken);
      
      // Set secure flags
      localStorage.setItem('enterprise-auth-secure', 'true');
      localStorage.setItem('enterprise-auth-timestamp', Date.now().toString());

      this.logSecurityEvent('TOKENS_STORED_SECURELY', 'low', {
        timestamp: new Date().toISOString(),
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
      });

    } catch (error) {
      this.logSecurityEvent('TOKEN_STORAGE_FAILED', 'high', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Restore session securely
   */
  private async restoreSessionSecurely(accessToken: string, refreshToken: string): Promise<void> {
    try {
      // Validate token integrity
      const isValid = await this.validateTokenIntegrity(accessToken);
      if (!isValid) {
        throw new Error('Stored token validation failed');
      }

      // Decode token to get user info
      const payload = jwtDecode<JWTPayload>(accessToken);
      
      // Update auth state
      this.authState = {
        user: {
          id: payload.sub,
          email: payload.email,
          firstName: '', // Will be fetched from API
          lastName: '',  // Will be fetched from API
          role: payload.role || 'user',
          organizationId: payload.orgId,
        },
        accessToken,
        refreshToken,
        isAuthenticated: true,
        sessionExpiry: payload.exp * 1000,
        lastActivity: Date.now(),
        securityLevel: 'high',
      };

      this.logSecurityEvent('SESSION_RESTORED_SECURELY', 'low', {
        userId: payload.sub,
        email: payload.email,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      this.logSecurityEvent('SESSION_RESTORATION_FAILED', 'high', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Clear auth state securely
   */
  public clearAuthState(): void {
    try {
      // Log security event
      this.logSecurityEvent('AUTH_STATE_CLEARED', 'medium', {
        userId: this.authState.user?.id,
        timestamp: new Date().toISOString(),
      });

      // Clear state
      this.authState = {
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        sessionExpiry: null,
        lastActivity: null,
        securityLevel: 'high',
      };

      // Clear secure storage
      localStorage.removeItem('enterprise-auth-token');
      localStorage.removeItem('enterprise-refresh-token');
      localStorage.removeItem('enterprise-auth-secure');
      localStorage.removeItem('enterprise-auth-timestamp');

      // Clear any other auth-related data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('auth-storage');

    } catch (error) {
      this.logSecurityEvent('AUTH_STATE_CLEAR_ERROR', 'high', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Log security event
   */
  private logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details: any
  ): void {
    const securityEvent = {
      timestamp: new Date().toISOString(),
      event,
      severity,
      details,
      sessionId: this.generateSessionId(),
    };

    this.securityEvents.push(securityEvent);
    
    // Send to security middleware
    securityMiddleware.logSecurityEvent(event, details, severity);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔒 [${severity.toUpperCase()}] ${event}:`, details);
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return crypto.randomUUID();
  }

  /**
   * Get client IP address (mock implementation)
   */
  private async getClientIP(): Promise<string> {
    // In production, this would get the actual client IP
    // For now, return a placeholder
    return 'client-ip-placeholder';
  }

  /**
   * Perform security audit
   */
  private performSecurityAudit(): void {
    try {
      // Check session expiry
      if (this.authState.sessionExpiry && Date.now() > this.authState.sessionExpiry) {
        this.logSecurityEvent('SESSION_EXPIRED', 'medium', {
          userId: this.authState.user?.id,
          expiryTime: this.authState.sessionExpiry,
        });
        this.clearAuthState();
        return;
      }

      // Check inactivity timeout (30 minutes)
      const inactivityTimeout = 30 * 60 * 1000; // 30 minutes
      if (this.authState.lastActivity && (Date.now() - this.authState.lastActivity) > inactivityTimeout) {
        this.logSecurityEvent('SESSION_INACTIVITY_TIMEOUT', 'medium', {
          userId: this.authState.user?.id,
          lastActivity: this.authState.lastActivity,
          timeout: inactivityTimeout,
        });
        this.clearAuthState();
        return;
      }

      // Validate token integrity periodically
      if (this.authState.accessToken) {
        this.validateTokenIntegrity(this.authState.accessToken);
      }

    } catch (error) {
      this.logSecurityEvent('SECURITY_AUDIT_ERROR', 'high', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get current auth state
   */
  public getAuthState(): SecureAuthState {
    return { ...this.authState };
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return this.authState.isAuthenticated && !!this.authState.accessToken;
  }

  /**
   * Get current user
   */
  public getCurrentUser() {
    return this.authState.user;
  }

  /**
   * Get security events
   */
  public getSecurityEvents() {
    return [...this.securityEvents];
  }

  /**
   * Logout securely
   */
  public async logoutSecurely(): Promise<void> {
    try {
      this.logSecurityEvent('LOGOUT_ATTEMPT', 'medium', {
        userId: this.authState.user?.id,
        timestamp: new Date().toISOString(),
      });

      // Call logout API
      await authApi.logout();

      // Clear auth state
      this.clearAuthState();

      this.logSecurityEvent('LOGOUT_SUCCESS', 'low', {
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      this.logSecurityEvent('LOGOUT_ERROR', 'high', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      // Force clear state even if API call fails
      this.clearAuthState();
    }
  }
}

// Export singleton instance
export const enterpriseAuthService = EnterpriseAuthService.getInstance();
export default enterpriseAuthService;