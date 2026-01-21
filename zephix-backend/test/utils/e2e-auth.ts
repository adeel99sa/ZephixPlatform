import { INestApplication } from '@nestjs/common';
import request from 'supertest';

/**
 * Login and get access token for E2E tests
 * @param app NestJS application instance
 * @param email User email
 * @param password User password
 * @returns Access token string
 */
export async function loginAndGetToken(
  app: INestApplication,
  email: string,
  password: string,
): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password })
    .expect(201);

  if (!response.body.data?.accessToken) {
    throw new Error(
      `Login failed: Expected accessToken in response. Got: ${JSON.stringify(response.body)}`,
    );
  }

  return response.body.data.accessToken;
}

/**
 * Create Authorization header with Bearer token
 * @param token JWT access token
 * @returns Authorization header object
 */
export function authHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}
