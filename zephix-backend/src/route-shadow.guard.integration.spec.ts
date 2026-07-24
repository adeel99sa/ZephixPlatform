/**
 * ROUTE-SHADOW-1 — route-shadow guard
 *
 * Express matches routes in registration order (= declaration order within a
 * controller). A single-segment static route declared AFTER a parameterized
 * route at the same depth is unreachable: `/base/skills` matches `/base/:id`
 * first and the static handler 404s silently — invisible to query-level and
 * module-level analysis both (the resources controller had four).
 *
 * This test enumerates every registered route from the Nest container and
 * fails if any route is shadowed by an EARLIER, more-general route on the same
 * controller + HTTP method. It is a mechanical guard against a class of defect
 * that no other check catches.
 */
import { Test } from '@nestjs/testing';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Enumerating routes needs the full AppModule, and compile() initializes the
// DataSource — so this is an INTEGRATION spec: it loads .env.test and runs under
// test:integration (real test DB), and is excluded from test:unit.
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
import { AppModule } from './app.module';

jest.setTimeout(120000);

interface RouteInfo {
  controller: string;
  method: string;
  path: string;
  segs: string[];
  order: number;
}

interface Shadow {
  controller: string;
  method: string;
  earlier: string; // the general route that captures the request
  later: string; // the shadowed (unreachable) route
}

const isParam = (seg: string): boolean => seg.startsWith(':') || seg.startsWith('*');

/**
 * Does `earlier` shadow `later`? True iff same depth, `earlier` matches every
 * path `later` matches (equal or param at each segment), and `earlier` is
 * strictly more general somewhere (param where `later` is static).
 */
export function shadows(earlier: string[], later: string[]): boolean {
  if (earlier.length !== later.length) return false;
  let strictlyMoreGeneral = false;
  for (let k = 0; k < earlier.length; k++) {
    const eParam = isParam(earlier[k]);
    const lParam = isParam(later[k]);
    if (eParam) {
      if (!lParam) strictlyMoreGeneral = true; // param over static
    } else {
      if (earlier[k] !== later[k]) return false; // static that doesn't cover `later`
    }
  }
  return strictlyMoreGeneral;
}

export function detectShadows(routes: RouteInfo[]): Shadow[] {
  const groups = new Map<string, RouteInfo[]>();
  for (const r of routes) {
    const key = `${r.controller}|${r.method}`;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(r);
  }
  const out: Shadow[] = [];
  for (const group of groups.values()) {
    const ordered = [...group].sort((a, b) => a.order - b.order);
    for (let i = 0; i < ordered.length; i++) {
      for (let j = 0; j < i; j++) {
        if (shadows(ordered[j].segs, ordered[i].segs)) {
          out.push({
            controller: ordered[i].controller,
            method: ordered[i].method,
            earlier: ordered[j].path,
            later: ordered[i].path,
          });
        }
      }
    }
  }
  return out;
}

const toSegs = (base: unknown, sub: unknown): string[] => {
  const b = Array.isArray(base) ? base[0] : (base ?? '');
  const s = Array.isArray(sub) ? sub[0] : (sub ?? '');
  return `${String(b)}/${String(s)}`.split('/').filter(Boolean);
};

describe('ROUTE-SHADOW-1 route-shadow guard', () => {
  // --- unit: the detector is not a no-op ---
  it('flags a parameterized route shadowing a later static route', () => {
    expect(shadows([':id'], ['skills'])).toBe(true);
    expect(shadows(['work', ':id'], ['work', 'skills'])).toBe(true);
    const found = detectShadows([
      { controller: 'X', method: 'GET', path: '/x/:id', segs: ['x', ':id'], order: 0 },
      { controller: 'X', method: 'GET', path: '/x/skills', segs: ['x', 'skills'], order: 1 },
    ]);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ earlier: '/x/:id', later: '/x/skills' });
  });

  it('does NOT flag correct ordering or different depths/methods', () => {
    // static BEFORE param — correct
    expect(detectShadows([
      { controller: 'X', method: 'GET', path: '/x/skills', segs: ['x', 'skills'], order: 0 },
      { controller: 'X', method: 'GET', path: '/x/:id', segs: ['x', ':id'], order: 1 },
    ])).toHaveLength(0);
    // different depth — :id (2) cannot shadow :id/timeline (3)
    expect(shadows(['x', ':id'], ['x', ':id', 'timeline'])).toBe(false);
    // different HTTP method — GET :id does not shadow POST skills
    expect(detectShadows([
      { controller: 'X', method: 'GET', path: '/x/:id', segs: ['x', ':id'], order: 0 },
      { controller: 'X', method: 'POST', path: '/x/skills', segs: ['x', 'skills'], order: 1 },
    ])).toHaveLength(0);
  });

  // --- repo-wide: no shadow exists on the current tree ---
  it('has NO route shadows anywhere in the backend', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const discovery = moduleRef.get(DiscoveryService);
    const scanner = new MetadataScanner();

    const routes: RouteInfo[] = [];
    let order = 0;
    for (const wrapper of discovery.getControllers()) {
      const cls = wrapper.metatype as (new (...a: any[]) => any) | undefined;
      if (!cls || !cls.prototype) continue;
      const base = Reflect.getMetadata(PATH_METADATA, cls);
      for (const name of scanner.getAllMethodNames(cls.prototype)) {
        const handler = (cls.prototype as any)[name];
        const routePath = Reflect.getMetadata(PATH_METADATA, handler);
        const reqMethod = Reflect.getMetadata(METHOD_METADATA, handler);
        if (routePath === undefined || reqMethod === undefined) continue;
        const segs = toSegs(base, routePath);
        routes.push({
          controller: cls.name,
          method: RequestMethod[reqMethod] ?? String(reqMethod),
          path: '/' + segs.join('/'),
          segs,
          order: order++,
        });
      }
    }

    const shadowsFound = detectShadows(routes);

    // Optionally inject a synthetic (non-allowlisted) shadow to demonstrate the
    // guard fires on a NEW shadow. Run: ROUTE_SHADOW_INJECT=1.
    if (process.env.ROUTE_SHADOW_INJECT === '1') {
      shadowsFound.push({
        controller: 'INJECTED', method: 'GET',
        earlier: '/injected/:id', later: '/injected/static',
      });
    }

    const key = (s: Shadow) =>
      `${s.controller}|${s.method}|${s.earlier}|${s.later}`;

    // Known pre-existing shadows, surfaced by ROUTE-SHADOW-1 and left UNFIXED
    // (this ticket is detect-only; fixes are separate tickets). New shadows are
    // NOT allowlisted — they fail the guard.
    //
    //   THIS LIST MAY ONLY SHRINK. A new shadow is a failure, not an append.
    //
    const KNOWN_SHADOWS = new Set<string>([
      // WorkspacesController: DELETE /workspaces/:id/invite-link/active is
      // captured by the earlier :linkId route. Outside resources — report only.
      'WorkspacesController|DELETE|/workspaces/:id/invite-link/:linkId|/workspaces/:id/invite-link/active',
      // ResourcesController: GET /resources/heatmap/timeline is captured by
      // :id/timeline (id='heatmap'). Has a live caller (useResources.ts:327).
      // A fifth resources shadow, not in SEC-XORG-RESOURCES-1 scope.
      'ResourcesController|GET|/resources/:id/timeline|/resources/heatmap/timeline',
    ]);

    const unexpected = shadowsFound.filter((s) => !KNOWN_SHADOWS.has(key(s)));

    if (unexpected.length > 0) {
      // eslint-disable-next-line no-console
      console.error(
        `NEW ROUTE SHADOW(S) DETECTED (${unexpected.length}) — not in the allowlist:\n` +
          unexpected
            .map(
              (s) =>
                `  [${s.method}] ${s.controller}: "${s.later}" is shadowed by earlier "${s.earlier}"`,
            )
            .join('\n'),
      );
    }

    expect({ count: unexpected.length, shadows: unexpected }).toEqual({
      count: 0,
      shadows: [],
    });

    await moduleRef.close();
  });
});
