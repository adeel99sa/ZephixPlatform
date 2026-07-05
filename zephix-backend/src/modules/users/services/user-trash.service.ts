import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PLATFORM_TRASH_RETENTION_DAYS_DEFAULT } from '../../../common/constants/platform-retention.constants';

export interface TrashItem {
  entityType: 'TASK' | 'PROJECT';
  id: string;
  displayName: string;
  workspaceId: string;
  projectId: string | null;
  deletedAt: Date;
}

@Injectable()
export class UserTrashService {
  constructor(private readonly dataSource: DataSource) {}

  async getTrash(userId: string, organizationId: string): Promise<TrashItem[]> {
    const retentionDays = PLATFORM_TRASH_RETENTION_DAYS_DEFAULT;

    const rows: Array<{
      entity_type: string;
      id: string;
      display_name: string;
      workspace_id: string;
      project_id: string | null;
      deleted_at: Date;
    }> = await this.dataSource.query(
      `
      SELECT entity_type, id, display_name, workspace_id, project_id, deleted_at
      FROM (
        SELECT
          'TASK'       AS entity_type,
          t.id,
          t.title      AS display_name,
          t.workspace_id,
          t.project_id,
          t.deleted_at
        FROM work_tasks t
        WHERE t.deleted_by_user_id = $1
          AND t.organization_id    = $2
          AND t.deleted_at IS NOT NULL
          AND t.deleted_at > NOW() - ($3 || ' days')::INTERVAL
          AND t.workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_id = $1
              AND organization_id = $2
              AND status = 'active'
          )

        UNION ALL

        SELECT
          'PROJECT'    AS entity_type,
          p.id,
          p.name       AS display_name,
          p.workspace_id,
          NULL         AS project_id,
          p.deleted_at
        FROM projects p
        WHERE p.deleted_by_user_id = $1
          AND p.organization_id    = $2
          AND p.deleted_at IS NOT NULL
          AND p.deleted_at > NOW() - ($3 || ' days')::INTERVAL
          AND p.workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_id = $1
              AND organization_id = $2
              AND status = 'active'
          )
      ) combined
      ORDER BY deleted_at DESC
      LIMIT 100
      `,
      [userId, organizationId, retentionDays],
    );

    return rows.map((r) => ({
      entityType: r.entity_type as 'TASK' | 'PROJECT',
      id: r.id,
      displayName: r.display_name,
      workspaceId: r.workspace_id,
      projectId: r.project_id,
      deletedAt: r.deleted_at,
    }));
  }
}
