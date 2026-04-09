/**
 * Phase 1 (2026-04-08) — Status bucket helper invariants.
 *
 * These tests enforce the contract between the runtime helper and the
 * template-level declaration in pm_waterfall_v2. If they drift, governance
 * silently disagrees with the template's stated semantics — that's exactly
 * the bug class buckets exist to prevent. Run them in CI on every change
 * to either file.
 */
import { TaskStatus } from '../enums/task.enums';
import {
  StatusBucket,
  computeCompletionPercent,
  getStatusBucket,
  groupStatusesByBucket,
  isActiveStatus,
  isClosedStatus,
  isNotStartedStatus,
} from './status-bucket.helper';
import { SYSTEM_TEMPLATE_DEFS } from '../../templates/data/system-template-definitions';

describe('status-bucket.helper', () => {
  describe('getStatusBucket', () => {
    it('maps every TaskStatus value to a bucket (totality)', () => {
      for (const status of Object.values(TaskStatus)) {
        const bucket = getStatusBucket(status);
        expect(['not_started', 'active', 'closed']).toContain(bucket);
      }
    });

    it('places BACKLOG and TODO in not_started', () => {
      expect(getStatusBucket(TaskStatus.BACKLOG)).toBe('not_started');
      expect(getStatusBucket(TaskStatus.TODO)).toBe('not_started');
    });

    it('places IN_PROGRESS, BLOCKED, and IN_REVIEW in active', () => {
      expect(getStatusBucket(TaskStatus.IN_PROGRESS)).toBe('active');
      expect(getStatusBucket(TaskStatus.BLOCKED)).toBe('active');
      expect(getStatusBucket(TaskStatus.IN_REVIEW)).toBe('active');
    });

    it('places DONE and CANCELED in closed', () => {
      expect(getStatusBucket(TaskStatus.DONE)).toBe('closed');
      expect(getStatusBucket(TaskStatus.CANCELED)).toBe('closed');
    });
  });

  describe('predicate helpers', () => {
    it('isActiveStatus matches the active bucket exactly', () => {
      expect(isActiveStatus(TaskStatus.IN_PROGRESS)).toBe(true);
      expect(isActiveStatus(TaskStatus.BLOCKED)).toBe(true);
      expect(isActiveStatus(TaskStatus.IN_REVIEW)).toBe(true);
      expect(isActiveStatus(TaskStatus.TODO)).toBe(false);
      expect(isActiveStatus(TaskStatus.DONE)).toBe(false);
    });

    it('isClosedStatus matches the closed bucket exactly', () => {
      expect(isClosedStatus(TaskStatus.DONE)).toBe(true);
      expect(isClosedStatus(TaskStatus.CANCELED)).toBe(true);
      expect(isClosedStatus(TaskStatus.IN_PROGRESS)).toBe(false);
      expect(isClosedStatus(TaskStatus.BACKLOG)).toBe(false);
    });

    it('isNotStartedStatus matches the not_started bucket exactly', () => {
      expect(isNotStartedStatus(TaskStatus.BACKLOG)).toBe(true);
      expect(isNotStartedStatus(TaskStatus.TODO)).toBe(true);
      expect(isNotStartedStatus(TaskStatus.IN_PROGRESS)).toBe(false);
      expect(isNotStartedStatus(TaskStatus.DONE)).toBe(false);
    });
  });

  describe('groupStatusesByBucket', () => {
    it('returns empty buckets for empty input', () => {
      expect(groupStatusesByBucket([])).toEqual({
        not_started: [],
        active: [],
        closed: [],
      });
    });

    it('groups every TaskStatus into the right bucket', () => {
      const grouped = groupStatusesByBucket(Object.values(TaskStatus));
      expect(grouped.not_started).toEqual(
        expect.arrayContaining([TaskStatus.BACKLOG, TaskStatus.TODO]),
      );
      expect(grouped.active).toEqual(
        expect.arrayContaining([
          TaskStatus.IN_PROGRESS,
          TaskStatus.BLOCKED,
          TaskStatus.IN_REVIEW,
        ]),
      );
      expect(grouped.closed).toEqual(
        expect.arrayContaining([TaskStatus.DONE, TaskStatus.CANCELED]),
      );
    });
  });

  describe('computeCompletionPercent', () => {
    it('returns 0 for empty children', () => {
      expect(computeCompletionPercent([])).toBe(0);
    });

    it('returns 100 when every child is in a closed status', () => {
      expect(
        computeCompletionPercent([TaskStatus.DONE, TaskStatus.CANCELED]),
      ).toBe(100);
    });

    it('returns 0 when no child is closed', () => {
      expect(
        computeCompletionPercent([
          TaskStatus.TODO,
          TaskStatus.IN_PROGRESS,
          TaskStatus.IN_REVIEW,
        ]),
      ).toBe(0);
    });

    it('rounds to the nearest whole percent', () => {
      // 1 closed of 3 children → 33.33% → rounds to 33
      expect(
        computeCompletionPercent([
          TaskStatus.DONE,
          TaskStatus.TODO,
          TaskStatus.IN_PROGRESS,
        ]),
      ).toBe(33);
      // 2 closed of 3 children → 66.66% → rounds to 67
      expect(
        computeCompletionPercent([
          TaskStatus.DONE,
          TaskStatus.DONE,
          TaskStatus.TODO,
        ]),
      ).toBe(67);
    });
  });

  describe('agreement with pm_waterfall_v2 template declaration', () => {
    /**
     * The Waterfall template declares an explicit `statusBuckets` mapping.
     * That declaration MUST agree with this helper's runtime mapping —
     * otherwise governance and rollups will disagree with the template's
     * stated semantics, which is exactly the bug class buckets exist to
     * prevent. This test reads pm_waterfall_v2 from the system template
     * definitions and asserts every status appears in the same bucket on
     * both sides.
     */
    const waterfall = SYSTEM_TEMPLATE_DEFS.find(
      (def) => def.code === 'pm_waterfall_v2',
    );

    it('pm_waterfall_v2 exists in SYSTEM_TEMPLATE_DEFS', () => {
      expect(waterfall).toBeDefined();
    });

    it('pm_waterfall_v2 declares statusBuckets', () => {
      expect(waterfall?.statusBuckets).toBeDefined();
    });

    it('every TaskStatus is declared in exactly one pm_waterfall_v2 bucket', () => {
      const buckets = waterfall!.statusBuckets!;
      const allDeclared = [
        ...buckets.not_started,
        ...buckets.active,
        ...buckets.closed,
      ];
      const allEnum = Object.values(TaskStatus);
      // Each enum value appears exactly once across the three buckets.
      for (const status of allEnum) {
        expect(allDeclared.filter((s) => s === status)).toHaveLength(1);
      }
      // No extra strings declared that don't correspond to enum values.
      for (const declared of allDeclared) {
        expect(allEnum).toContain(declared as TaskStatus);
      }
    });

    it('pm_waterfall_v2 bucket assignments agree with the runtime helper', () => {
      const buckets = waterfall!.statusBuckets!;
      const checkBucket = (bucket: StatusBucket, statuses: string[]) => {
        for (const s of statuses) {
          expect(getStatusBucket(s as TaskStatus)).toBe(bucket);
        }
      };
      checkBucket('not_started', buckets.not_started);
      checkBucket('active', buckets.active);
      checkBucket('closed', buckets.closed);
    });
  });
});
