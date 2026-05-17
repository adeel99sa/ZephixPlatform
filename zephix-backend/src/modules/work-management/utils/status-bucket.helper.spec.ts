/**
 * Status bucket helper invariants — per-project rewrite.
 *
 * Buckets are now `open | done | cancelled`. The helper accepts an
 * optional `projectStatuses` array; when supplied, rows from that array
 * win over the default mapping. Without it, the helper falls back to
 * `DEFAULT_STATUS_BUCKETS` keyed off the seven legacy status keys.
 */
import { TaskStatus } from '../enums/task.enums';
import { DEFAULT_STATUS_KEYS } from '../entities/work-task.entity';
import type { ProjectStatus } from '../entities/project-status.entity';
import {
  DEFAULT_STATUS_BUCKETS,
  StatusBucket,
  computeCompletionPercent,
  getStatusBucket,
  groupStatusesByBucket,
  isActiveStatus,
  isClosedStatus,
} from './status-bucket.helper';

const mkRow = (
  statusKey: string,
  bucket: StatusBucket,
): ProjectStatus =>
  ({
    id: `id-${statusKey}`,
    projectId: 'p1',
    organizationId: 'o1',
    statusKey,
    displayName: statusKey,
    color: '#000000',
    order: 0,
    bucket,
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }) as ProjectStatus;

describe('status-bucket.helper', () => {
  describe('DEFAULT_STATUS_BUCKETS fallback (no projectStatuses)', () => {
    it('places BACKLOG, TODO, IN_PROGRESS, BLOCKED, IN_REVIEW in open', () => {
      expect(getStatusBucket('BACKLOG')).toBe('open');
      expect(getStatusBucket('TODO')).toBe('open');
      expect(getStatusBucket('IN_PROGRESS')).toBe('open');
      expect(getStatusBucket('BLOCKED')).toBe('open');
      expect(getStatusBucket('IN_REVIEW')).toBe('open');
    });

    it('places DONE in done', () => {
      expect(getStatusBucket('DONE')).toBe('done');
    });

    it('places CANCELED in cancelled', () => {
      expect(getStatusBucket('CANCELED')).toBe('cancelled');
    });

    it('maps every legacy key + every TaskStatus enum value to a bucket', () => {
      for (const key of DEFAULT_STATUS_KEYS) {
        const bucket = getStatusBucket(key);
        expect(['open', 'done', 'cancelled']).toContain(bucket);
      }
      for (const status of Object.values(TaskStatus)) {
        const bucket = getStatusBucket(status);
        expect(['open', 'done', 'cancelled']).toContain(bucket);
      }
    });

    it('returns open as a final fallback for unknown keys', () => {
      expect(getStatusBucket('UNKNOWN_KEY')).toBe('open');
    });

    it('exposes DEFAULT_STATUS_BUCKETS as a frozen object with all 7 keys', () => {
      for (const key of DEFAULT_STATUS_KEYS) {
        expect(DEFAULT_STATUS_BUCKETS[key]).toBeDefined();
      }
    });
  });

  describe('with per-project rows (projectStatuses)', () => {
    it('prefers the project row over the default fallback', () => {
      // Override TODO to 'done' in this project's status set.
      const rows = [mkRow('TODO', 'done')];
      expect(getStatusBucket('TODO', rows)).toBe('done');
      // Default fallback for the same key would have been 'open'.
      expect(getStatusBucket('TODO')).toBe('open');
    });

    it('falls back to the default map when no row matches', () => {
      const rows = [mkRow('IN_PROGRESS', 'open')];
      expect(getStatusBucket('DONE', rows)).toBe('done');
    });

    it('falls back when projectStatuses is empty or null', () => {
      expect(getStatusBucket('DONE', [])).toBe('done');
      expect(getStatusBucket('DONE', null)).toBe('done');
    });

    it('ignores invalid bucket strings on project rows and falls back', () => {
      const rows = [mkRow('TODO', 'not_a_bucket' as StatusBucket)];
      expect(getStatusBucket('TODO', rows)).toBe('open');
    });
  });

  describe('predicate helpers', () => {
    it('isActiveStatus is true for the open bucket only', () => {
      expect(isActiveStatus('IN_PROGRESS')).toBe(true);
      expect(isActiveStatus('TODO')).toBe(true);
      expect(isActiveStatus('DONE')).toBe(false);
      expect(isActiveStatus('CANCELED')).toBe(false);
    });

    it('isClosedStatus is true for done or cancelled buckets', () => {
      expect(isClosedStatus('DONE')).toBe(true);
      expect(isClosedStatus('CANCELED')).toBe(true);
      expect(isClosedStatus('IN_PROGRESS')).toBe(false);
      expect(isClosedStatus('TODO')).toBe(false);
    });

    it('predicate helpers honor project rows when supplied', () => {
      const rows = [mkRow('IN_PROGRESS', 'done')];
      expect(isClosedStatus('IN_PROGRESS', rows)).toBe(true);
      expect(isActiveStatus('IN_PROGRESS', rows)).toBe(false);
    });
  });

  describe('groupStatusesByBucket', () => {
    it('returns empty buckets for empty input', () => {
      expect(groupStatusesByBucket([])).toEqual({
        open: [],
        done: [],
        cancelled: [],
      });
    });

    it('groups all seven legacy keys into open/done/cancelled', () => {
      const grouped = groupStatusesByBucket([...DEFAULT_STATUS_KEYS]);
      expect(grouped.open).toEqual(
        expect.arrayContaining([
          'BACKLOG',
          'TODO',
          'IN_PROGRESS',
          'BLOCKED',
          'IN_REVIEW',
        ]),
      );
      expect(grouped.done).toEqual(['DONE']);
      expect(grouped.cancelled).toEqual(['CANCELED']);
    });
  });

  describe('computeCompletionPercent', () => {
    it('returns 0 for empty children', () => {
      expect(computeCompletionPercent([])).toBe(0);
    });

    it('counts only done (not cancelled) toward completion', () => {
      expect(computeCompletionPercent(['DONE', 'DONE'])).toBe(100);
      expect(computeCompletionPercent(['DONE', 'CANCELED'])).toBe(50);
      expect(computeCompletionPercent(['CANCELED', 'CANCELED'])).toBe(0);
    });

    it('returns 0 when no child is done', () => {
      expect(
        computeCompletionPercent(['TODO', 'IN_PROGRESS', 'IN_REVIEW']),
      ).toBe(0);
    });

    it('rounds to the nearest whole percent', () => {
      // 1 done of 3 children → 33.33% → 33
      expect(computeCompletionPercent(['DONE', 'TODO', 'IN_PROGRESS'])).toBe(33);
      // 2 done of 3 children → 66.66% → 67
      expect(computeCompletionPercent(['DONE', 'DONE', 'TODO'])).toBe(67);
    });
  });
});
