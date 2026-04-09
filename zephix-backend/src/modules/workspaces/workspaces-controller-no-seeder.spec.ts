/**
 * Phase 4.7.3 — workspace creation truthfulness lock.
 *
 * Static-source regression: the workspaces controller MUST NOT silently
 * invoke the sample-project seeder on the workspace-create path. The
 * SampleProjectSeederService is intentionally kept around for a future
 * explicit onboarding-choice endpoint, but the default create path must
 * produce an empty workspace with zero projects.
 *
 * This is a static check rather than a Nest TestingModule integration
 * test because it's faster, deterministic, and pins the exact rule
 * ("no call to seedIfNeeded from this file") at the file level, which
 * is what the product rule requires.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const CONTROLLER = join(__dirname, 'workspaces.controller.ts');

describe('Phase 4.7.3 — workspace creation must not seed sample project', () => {
  const src = readFileSync(CONTROLLER, 'utf8');

  it('controller source contains no call to sampleSeeder.seedIfNeeded', () => {
    expect(src).not.toMatch(/sampleSeeder\.seedIfNeeded/);
    expect(src).not.toMatch(/this\.sampleSeeder\.seedIfNeeded/);
  });

  it('controller still constructor-injects SampleProjectSeederService for the future explicit onboarding-choice endpoint', () => {
    // We deliberately keep the wiring in place so a future explicit
    // "Load sample workspace" choice can call the seeder directly.
    // Removing the injection entirely would force a wiring rewrite when
    // that endpoint lands.
    expect(src).toMatch(/SampleProjectSeederService/);
  });

  it('the rule lock comment cites the product decision', () => {
    // The truthfulness rule must be referenced near the create path so
    // future readers see the why, not just the absence of a call.
    expect(src).toMatch(/Default workspace creation MUST create an empty workspace/);
    expect(src).toMatch(
      /sample-project seeder is intentionally NOT called/,
    );
  });
});
