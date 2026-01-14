/**
 * PHASE 7 MODULE 7.2: My Work Response DTO
 */
export class MyWorkItemDto {
  id: string;
  title: string;
  status: string;
  dueDate?: string | null;
  updatedAt: string;
  projectId: string;
  projectName: string;
  workspaceId: string;
  workspaceName: string;
}

export class MyWorkResponseDto {
  version: number;
  counts: {
    total: number;
    overdue: number;
    dueSoon7Days: number;
    inProgress: number;
    todo: number;
    done: number;
  };
  items: MyWorkItemDto[];
}
