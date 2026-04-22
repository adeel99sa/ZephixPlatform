/**
 * Phase 2 (2026-04-08) — Frontend status-bucket helper invariants.
 *
 * Mirrors the backend test in
 * `zephix-backend/src/modules/work-management/utils/status-bucket.helper.spec.ts`.
 * The two helpers MUST agree on bucket assignment for every status. If
 * either side drifts, governance/rollups disagree with the render and
 * users see inconsistent state. Run on every change to either file.
 */
import { describe, it, expect } from 'vitest';
import {
  computeCompletionPercent,
  computeDurationDays,
  getStatusBucket,
  isActiveStatus,
  isClosedStatus,
  isNotStartedStatus,
} from '../statusBucket';

describe('statusBucket helper (frontend mirror)', () => {
  describe('getStatusBucket', () => {
    it('places BACKLOG and TODO in not_started', () => {
      expect(getStatusBucket('BACKLOG')).toBe('not_started');
      expect(getStatusBucket('TODO')).toBe('not_started');
    });

    it('places IN_PROGRESS, BLOCKED, IN_REVIEW in active', () => {
      expect(getStatusBucket('IN_PROGRESS')).toBe('active');
      expect(getStatusBucket('BLOCKED')).toBe('active');
      expect(getStatusBucket('IN_REVIEW')).toBe('active');
    });

    it('places DONE and CANCELED in closed', () => {
      expect(getStatusBucket('DONE')).toBe('closed');
      expect(getStatusBucket('CANCELED')).toBe('closed');
    });
  });

  describe('predicate helpers', () => {
    it('isActiveStatus matches the active bucket', () => {
      expect(isActiveStatus('IN_PROGRESS')).toBe(true);
      expect(isActiveStatus('BLOCKED')).toBe(true);
      expect(isActiveStatus('IN_REVIEW')).toBe(true);
      expect(isActiveStatus('TODO')).toBe(false);
      expect(isActiveStatus('DONE')).toBe(false);
    });

    it('isClosedStatus matches the closed bucket', () => {
      expect(isClosedStatus('DONE')).toBe(true);
      expect(isClosedStatus('CANCELED')).toBe(true);
      expect(isClosedStatus('IN_PROGRESS')).toBe(false);
      expect(isClosedStatus('BACKLOG')).toBe(false);
    });

    it('isNotStartedStatus matches the not_started bucket', () => {
      expect(isNotStartedStatus('BACKLOG')).toBe(true);
      expect(isNotStartedStatus('TODO')).toBe(true);
      expect(isNotStartedStatus('IN_PROGRESS')).toBe(false);
      expect(isNotStartedStatus('DONE')).toBe(false);
    });
  });

  describe('computeCompletionPercent', () => {
    it('returns 0 for empty children (caller decides display)', () => {
      expect(computeCompletionPercent([])).toBe(0);
    });

    it('returns 100 when every countable child is done (CANCELED excluded)', () => {
      expect(computeCompletionPercent(['DONE', 'CANCELED'])).toBe(100);
    });

    it('uses status weights when no child is fully done', () => {
      expect(
        computeCompletionPercent(['TODO', 'IN_PROGRESS', 'IN_REVIEW']),
      ).toBe(42);
    });

    it('rounds to nearest whole percent (weighted)', () => {
      expect(computeCompletionPercent(['DONE', 'TODO', 'IN_PROGRESS'])).toBe(50);
      expect(computeCompletionPercent(['DONE', 'DONE', 'TODO'])).toBe(67);
    });

    it('matches the operator mockup example: Ideation Phase 5 of 6 closed = 83%', () => {
      // From the ClickUp mockup: Ideation Phase showed 83% with 6 children,
      // 5 done and 1 todo. Verifies our formula matches the reference.
      expect(
        computeCompletionPercent([
          'DONE',
          'DONE',
          'DONE',
          'DONE',
          'DONE',
          'TODO',
        ]),
      ).toBe(83);
    });
  });

  describe('computeDurationDays', () => {
    it('returns 0 when either date is missing', () => {
      expect(computeDurationDays(null, '2026-04-10')).toBe(0);
      expect(computeDurationDays('2026-04-01', null)).toBe(0);
      expect(computeDurationDays(undefined, undefined)).toBe(0);
    });

    it('returns 1 for same start and due (single-day task)', () => {
      expect(computeDurationDays('2026-04-01', '2026-04-01')).toBe(1);
    });

    it('returns inclusive day count for valid ranges', () => {
      // 2026-04-01 to 2026-04-03 is 3 days inclusive
      expect(computeDurationDays('2026-04-01', '2026-04-03')).toBe(3);
      // 2026-04-01 to 2026-04-30 is 30 days inclusive
      expect(computeDurationDays('2026-04-01', '2026-04-30')).toBe(30);
    });

    it('returns 0 when due is before start (invalid range)', () => {
      expect(computeDurationDays('2026-04-10', '2026-04-01')).toBe(0);
    });

    it('accepts Date objects as well as strings', () => {
      expect(
        computeDurationDays(new Date('2026-04-01'), new Date('2026-04-05')),
      ).toBe(5);
    });

    it('returns 0 for invalid date strings', () => {
      expect(computeDurationDays('not-a-date', '2026-04-01')).toBe(0);
    });
  });
});
