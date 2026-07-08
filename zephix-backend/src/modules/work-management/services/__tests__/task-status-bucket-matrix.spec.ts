/**
 * WM-A2b — Bucket-matrix status transition tests.
 *
 * Three concerns:
 * 1. Legacy parity: default-status projects behave identically to pre-A2b.
 * 2. Custom status recognition: project_statuses rows extend the known-key set.
 * 3. Blocked transitions: done→cancelled and cancelled→done are rejected.
 *
 * Does not require a running database or full NestJS DI.
 */

import { getStatusBucket, DEFAULT_STATUS_KEYS } from '../../utils/status-bucket.helper';
import { TaskStatus } from '../../enums/task.enums';

// ── Helpers that mirror the private assertStatusTransitionBucket logic ────────

interface PsRow {
  statusKey: string;
  bucket: 'open' | 'done' | 'cancelled';
}

function isRecognized(status: string, projectStatuses: PsRow[]): boolean {
  const known = new Set<string>([
    ...DEFAULT_STATUS_KEYS,
    ...projectStatuses.map((ps) => ps.statusKey),
  ]);
  return known.has(status);
}

function isBucketBlocked(
  fromStatus: string,
  toStatus: string,
  projectStatuses: PsRow[],
): boolean {
  const fromBucket = getStatusBucket(fromStatus, projectStatuses as any);
  const toBucket = getStatusBucket(toStatus, projectStatuses as any);
  return (
    (fromBucket === 'done' && toBucket === 'cancelled') ||
    (fromBucket === 'cancelled' && toBucket === 'done')
  );
}

// ── 1. DEFAULT_STATUS_KEYS covers exactly the seven legacy keys ───────────────

describe('DEFAULT_STATUS_KEYS', () => {
  const EXPECTED = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'BLOCKED', 'IN_REVIEW', 'DONE', 'CANCELED'];

  it('contains all seven legacy status keys', () => {
    for (const key of EXPECTED) {
      expect(DEFAULT_STATUS_KEYS).toContain(key);
    }
  });

  it('has exactly seven entries', () => {
    expect(DEFAULT_STATUS_KEYS).toHaveLength(7);
  });
});

// ── 2. Legacy parity — projects with only default statuses ───────────────────

describe('legacy parity — default-status project (empty projectStatuses [])', () => {
  const ps: PsRow[] = [];

  it('all seven default keys are recognized', () => {
    const defaults = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'BLOCKED', 'IN_REVIEW', 'DONE', 'CANCELED'];
    for (const key of defaults) {
      expect(isRecognized(key, ps)).toBe(true);
    }
  });

  it('an invented key is UNRECOGNIZED', () => {
    expect(isRecognized('WONT_FIX', ps)).toBe(false);
  });

  it('open→done not blocked (gate fires, but transition is allowed)', () => {
    expect(isBucketBlocked('IN_PROGRESS', 'DONE', ps)).toBe(false);
    expect(isBucketBlocked('TODO', 'DONE', ps)).toBe(false);
  });

  it('done→open not blocked (reopen)', () => {
    expect(isBucketBlocked('DONE', 'IN_PROGRESS', ps)).toBe(false);
    expect(isBucketBlocked('DONE', 'TODO', ps)).toBe(false);
  });

  it('done→done not blocked (lateral)', () => {
    expect(isBucketBlocked('DONE', 'DONE', ps)).toBe(false);
  });

  it('cancelled→open not blocked (reopen)', () => {
    expect(isBucketBlocked('CANCELED', 'TODO', ps)).toBe(false);
  });

  it('cancelled→cancelled not blocked (lateral)', () => {
    expect(isBucketBlocked('CANCELED', 'CANCELED', ps)).toBe(false);
  });

  it('done→cancelled IS blocked', () => {
    expect(isBucketBlocked('DONE', 'CANCELED', ps)).toBe(true);
  });

  it('cancelled→done IS blocked', () => {
    expect(isBucketBlocked('CANCELED', 'DONE', ps)).toBe(true);
  });

  it('open→cancelled not blocked', () => {
    expect(isBucketBlocked('IN_PROGRESS', 'CANCELED', ps)).toBe(false);
  });
});

// ── 3. Custom status recognition ─────────────────────────────────────────────

describe('custom status recognition — project with UAT_SIGNED_OFF (done bucket)', () => {
  const ps: PsRow[] = [
    { statusKey: 'UAT_SIGNED_OFF', bucket: 'done' },
    { statusKey: 'NEEDS_REVISION', bucket: 'open' },
  ];

  it('UAT_SIGNED_OFF is recognized when in project_statuses', () => {
    expect(isRecognized('UAT_SIGNED_OFF', ps)).toBe(true);
  });

  it('NEEDS_REVISION is recognized when in project_statuses', () => {
    expect(isRecognized('NEEDS_REVISION', ps)).toBe(true);
  });

  it('an unknown key is still unrecognized even with custom statuses present', () => {
    expect(isRecognized('WONT_FIX', ps)).toBe(false);
  });

  it('UAT_SIGNED_OFF has done bucket', () => {
    expect(getStatusBucket('UAT_SIGNED_OFF', ps as any)).toBe('done');
  });

  it('NEEDS_REVISION has open bucket', () => {
    expect(getStatusBucket('NEEDS_REVISION', ps as any)).toBe('open');
  });

  it('UAT_SIGNED_OFF→CANCELED is blocked (done→cancelled)', () => {
    expect(isBucketBlocked('UAT_SIGNED_OFF', 'CANCELED', ps)).toBe(true);
  });

  it('CANCELED→UAT_SIGNED_OFF is blocked (cancelled→done)', () => {
    expect(isBucketBlocked('CANCELED', 'UAT_SIGNED_OFF', ps)).toBe(true);
  });

  it('UAT_SIGNED_OFF→IN_PROGRESS is allowed (done→open reopen)', () => {
    expect(isBucketBlocked('UAT_SIGNED_OFF', 'IN_PROGRESS', ps)).toBe(false);
  });

  it('NEEDS_REVISION→UAT_SIGNED_OFF is allowed (open→done)', () => {
    expect(isBucketBlocked('NEEDS_REVISION', 'UAT_SIGNED_OFF', ps)).toBe(false);
  });
});

// ── 4. Gate fires only on true open→done crossing with custom statuses ────────

describe('gate-fire predicate — custom status project', () => {
  const ps: PsRow[] = [{ statusKey: 'UAT_SIGNED_OFF', bucket: 'done' }];

  function shouldGateFire(fromStatus: string, toStatus: string): boolean {
    const fromBucket = getStatusBucket(fromStatus, ps as any);
    const toBucket = getStatusBucket(toStatus, ps as any);
    return fromBucket !== 'done' && toBucket === 'done';
  }

  it('open→UAT_SIGNED_OFF fires gate', () => {
    expect(shouldGateFire('IN_PROGRESS', 'UAT_SIGNED_OFF')).toBe(true);
  });

  it('UAT_SIGNED_OFF→UAT_SIGNED_OFF (lateral done→done) does NOT fire gate', () => {
    expect(shouldGateFire('UAT_SIGNED_OFF', 'UAT_SIGNED_OFF')).toBe(false);
  });

  it('UAT_SIGNED_OFF→IN_PROGRESS (reopen) does NOT fire gate', () => {
    expect(shouldGateFire('UAT_SIGNED_OFF', 'IN_PROGRESS')).toBe(false);
  });

  it('DONE→UAT_SIGNED_OFF (done→done lateral across custom+default) does NOT fire gate', () => {
    expect(shouldGateFire('DONE', 'UAT_SIGNED_OFF')).toBe(false);
  });
});
