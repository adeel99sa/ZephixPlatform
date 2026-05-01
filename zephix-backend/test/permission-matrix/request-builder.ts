import { INestApplication } from '@nestjs/common';
import type { Test } from 'supertest';
import { supertestMethodBridge } from '../tenancy/helpers/cross-tenant-workspace.test-helper';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface TestRequestContext {
  app: INestApplication;
  accessToken?: string;
  /** e.g. { id: workspaceId, workspaceId: '...' } */
  pathParams?: Record<string, string>;
  body?: unknown;
  query?: Record<string, string>;
  extraHeaders?: Record<string, string>;
}

/**
 * Supertest's `request(app)` returns an agent with `.get()`, `.post()`, etc.
 * The shared cross-tenant helper expects a `(method, path) => Test` function.
 * This adapter is the single bridge used by the permission matrix harness and
 * `assertCrossTenantWorkspace403`.
 */
export function createSupertestMethodFn(
  app: INestApplication,
): (method: string, path: string) => Test {
  return supertestMethodBridge(app.getHttpServer());
}

/**
 * Replace `:id`, `:workspaceId`, `:wsId` in a path template using pathParams and fallbacks.
 */
export function applyPathTemplate(
  pathTemplate: string,
  pathParams: Record<string, string> = {},
): string {
  let p = pathTemplate;
  for (const [key, value] of Object.entries(pathParams)) {
    p = p.replace(new RegExp(`:${key}\\b`, 'g'), value);
  }
  return p;
}

/**
 * Build a supertest chain with Authorization and optional body/query/headers.
 */
export function createTestRequest(
  method: HttpMethod,
  path: string,
  ctx: TestRequestContext,
): Test {
  const fn = createSupertestMethodFn(ctx.app);
  let chain = fn(method, path);
  if (ctx.accessToken) {
    chain = chain.set('Authorization', `Bearer ${ctx.accessToken}`);
  }
  if (ctx.query && Object.keys(ctx.query).length > 0) {
    chain = chain.query(ctx.query);
  }
  if (ctx.extraHeaders) {
    for (const [k, v] of Object.entries(ctx.extraHeaders)) {
      chain = chain.set(k, v);
    }
  }
  if (ctx.body !== undefined && method !== 'GET') {
    chain = chain.send(ctx.body as object);
  }
  return chain;
}
