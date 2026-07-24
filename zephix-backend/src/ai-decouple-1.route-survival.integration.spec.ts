/**
 * AI-DECOUPLE-1 — survival test.
 *
 * Replaces the FloatingAIAssistant survival test (that route — ai-chat — lives in
 * the unmounted PMModule and 404s today, before this ticket). The real guarantee:
 * after AppModule imports AIModule DIRECTLY (previously it reached AppModule only
 * via the now-deleted RiskManagementModule), AIModule's mounted controllers still
 * resolve — and the purged surfaces (document upload, pm/risk-management) do NOT.
 *
 * Boots the full AppModule (proves no missing-provider error) and enumerates every
 * registered route from the Nest container.
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: path.resolve(__dirname, '../.env.test') });
}
if (
  !process.env.DATABASE_URL ||
  process.env.DATABASE_URL.toLowerCase().includes('production')
) {
  throw new Error('❌ DATABASE_URL appears to be production. Use test DB only.');
}

// eslint-disable-next-line import/first
import { Test } from '@nestjs/testing';
// eslint-disable-next-line import/first
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
// eslint-disable-next-line import/first
import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
// eslint-disable-next-line import/first
import { RequestMethod } from '@nestjs/common';
// eslint-disable-next-line import/first
import { AppModule } from './app.module';

jest.setTimeout(120000);

describe('AI-DECOUPLE-1 route survival (integration)', () => {
  let routes: string[];
  let moduleRef: Awaited<ReturnType<ReturnType<typeof Test.createTestingModule>['compile']>>;

  beforeAll(async () => {
    // compile() wires the whole graph — a missing provider throws here.
    moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    const discovery = moduleRef.get(DiscoveryService);
    const scanner = new MetadataScanner();
    const seg = (v: unknown) => (Array.isArray(v) ? v[0] : (v ?? ''));

    routes = [];
    for (const wrapper of discovery.getControllers()) {
      const cls = wrapper.metatype as (new (...a: any[]) => any) | undefined;
      if (!cls || !cls.prototype) continue;
      const base = seg(Reflect.getMetadata(PATH_METADATA, cls));
      for (const name of scanner.getAllMethodNames(cls.prototype)) {
        const handler = (cls.prototype as any)[name];
        const p = Reflect.getMetadata(PATH_METADATA, handler);
        const m = Reflect.getMetadata(METHOD_METADATA, handler);
        if (p === undefined || m === undefined) continue;
        const full = `/${`${base}/${seg(p)}`.split('/').filter(Boolean).join('/')}`;
        routes.push(`${RequestMethod[m] ?? m} ${full}`);
      }
    }
  });

  afterAll(async () => {
    if (moduleRef) await moduleRef.close();
  });

  it('boots AppModule with AIModule imported directly (no missing-provider error)', () => {
    expect(routes.length).toBeGreaterThan(0);
  });

  it('KEEP: AIModule mounted controllers resolve — ai/mapping, ai/suggestions, ai/project-generation', () => {
    const has = (frag: string) => routes.some((r) => r.includes(frag));
    expect(has('/ai/mapping')).toBe(true);
    expect(has('/ai/suggestions')).toBe(true);
    expect(has('/ai/project-generation')).toBe(true);
  });

  it('PURGED: document-upload and pm/risk-management routes are gone', () => {
    const has = (frag: string) => routes.some((r) => r.includes(frag));
    expect(has('/v1/documents')).toBe(false); // DocumentUploadController deleted
    expect(has('/pm/risk-management')).toBe(false); // RiskManagementController deleted
  });
});
