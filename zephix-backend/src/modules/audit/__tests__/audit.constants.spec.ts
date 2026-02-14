/**
 * Phase 3B: Audit constants / enums validation tests.
 */
import {
  AuditEntityType,
  AuditAction,
  AuditSource,
  SANITIZE_KEYS,
} from '../audit.constants';

describe('Audit Constants', () => {
  describe('AuditEntityType', () => {
    it('has all required entity types', () => {
      expect(AuditEntityType.ORGANIZATION).toBe('organization');
      expect(AuditEntityType.WORKSPACE).toBe('workspace');
      expect(AuditEntityType.PROJECT).toBe('project');
      expect(AuditEntityType.PORTFOLIO).toBe('portfolio');
      expect(AuditEntityType.WORK_TASK).toBe('work_task');
      expect(AuditEntityType.WORK_RISK).toBe('work_risk');
      expect(AuditEntityType.DOC).toBe('doc');
      expect(AuditEntityType.ATTACHMENT).toBe('attachment');
      expect(AuditEntityType.SCENARIO_PLAN).toBe('scenario_plan');
      expect(AuditEntityType.SCENARIO_ACTION).toBe('scenario_action');
      expect(AuditEntityType.SCENARIO_RESULT).toBe('scenario_result');
      expect(AuditEntityType.BASELINE).toBe('baseline');
      expect(AuditEntityType.CAPACITY_CALENDAR).toBe('capacity_calendar');
      expect(AuditEntityType.BILLING_PLAN).toBe('billing_plan');
      expect(AuditEntityType.ENTITLEMENT).toBe('entitlement');
      expect(AuditEntityType.WEBHOOK).toBe('webhook');
      expect(AuditEntityType.BOARD_MOVE).toBe('board_move');
    });

    it('has exactly 17 entity types', () => {
      const values = Object.values(AuditEntityType);
      expect(values.length).toBe(17);
    });
  });

  describe('AuditAction', () => {
    it('has all required action types', () => {
      expect(AuditAction.CREATE).toBe('create');
      expect(AuditAction.UPDATE).toBe('update');
      expect(AuditAction.DELETE).toBe('delete');
      expect(AuditAction.ACTIVATE).toBe('activate');
      expect(AuditAction.COMPUTE).toBe('compute');
      expect(AuditAction.ATTACH).toBe('attach');
      expect(AuditAction.DETACH).toBe('detach');
      expect(AuditAction.INVITE).toBe('invite');
      expect(AuditAction.ACCEPT).toBe('accept');
      expect(AuditAction.SUSPEND).toBe('suspend');
      expect(AuditAction.REINSTATE).toBe('reinstate');
      expect(AuditAction.UPLOAD_COMPLETE).toBe('upload_complete');
      expect(AuditAction.DOWNLOAD_LINK).toBe('download_link');
      expect(AuditAction.PRESIGN_CREATE).toBe('presign_create');
      expect(AuditAction.QUOTA_BLOCK).toBe('quota_block');
      expect(AuditAction.PLAN_STATUS_BLOCK).toBe('plan_status_block');
      expect(AuditAction.WIP_OVERRIDE).toBe('wip_override');
      expect(AuditAction.ROLE_CHANGE).toBe('role_change');
    });

    it('has exactly 18 action types', () => {
      const values = Object.values(AuditAction);
      expect(values.length).toBe(18);
    });
  });

  describe('AuditSource', () => {
    it('has all required source values', () => {
      expect(AuditSource.ATTACHMENTS).toBe('attachments');
      expect(AuditSource.SCENARIOS).toBe('scenarios');
      expect(AuditSource.BASELINES).toBe('baselines');
      expect(AuditSource.SCHEDULE_DRAG).toBe('schedule_drag');
      expect(AuditSource.CAPACITY).toBe('capacity');
      expect(AuditSource.PORTFOLIO).toBe('portfolio');
      expect(AuditSource.BOARD).toBe('board');
      expect(AuditSource.ROLE_CHANGE).toBe('role_change');
      expect(AuditSource.INVITE).toBe('invite');
    });
  });

  describe('SANITIZE_KEYS', () => {
    it('includes all security-critical keys', () => {
      expect(SANITIZE_KEYS.has('token')).toBe(true);
      expect(SANITIZE_KEYS.has('password')).toBe(true);
      expect(SANITIZE_KEYS.has('secret')).toBe(true);
      expect(SANITIZE_KEYS.has('presignedUrl')).toBe(true);
      expect(SANITIZE_KEYS.has('authorization')).toBe(true);
      expect(SANITIZE_KEYS.has('cookie')).toBe(true);
      expect(SANITIZE_KEYS.has('apiKey')).toBe(true);
    });

    it('does not include safe keys', () => {
      expect(SANITIZE_KEYS.has('fileName')).toBe(false);
      expect(SANITIZE_KEYS.has('entityId')).toBe(false);
      expect(SANITIZE_KEYS.has('source')).toBe(false);
    });

    it('has at least 10 forbidden keys', () => {
      expect(SANITIZE_KEYS.size).toBeGreaterThanOrEqual(10);
    });
  });
});
