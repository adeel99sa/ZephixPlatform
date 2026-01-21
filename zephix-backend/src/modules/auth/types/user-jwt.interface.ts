// zephix-backend/src/modules/auth/types/user-jwt.interface.ts

export interface UserJwt {
  sub: string;
  email: string;
  organizationId: string;
  role: string;
  platformRole?: string;
  iat?: number;
  exp?: number;
}
