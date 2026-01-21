// zephix-backend/src/modules/auth/types/user-jwt.interface.ts

export interface UserJwt {
  sub: string;
  id: string; // Alias for sub, used by controllers
  email: string;
  organizationId: string;
  role: string;
  platformRole?: string;
  iat?: number;
  exp?: number;
}
