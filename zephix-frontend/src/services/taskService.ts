/**
 * Thin wrapper over work management API only.
 * All task traffic goes to /api/work/tasks. No legacy /tasks/* endpoints.
 * Maps WorkTask <-> legacy Task for backward compatibility until Phase 3 callers are updated.
 */

import type { Task, CreateTaskInput, ProjectPhase } from "../types/task.types";
import * as workTasksApi from "@/features/work-management/workTasks.api";
import type { WorkTask, WorkTaskStatus, UpdateTaskPatch } from "@/features/work-management/workTasks.api";

function workTaskToTask(w: WorkTask): Task {
  const statusMap: Record<string, Task["status"]> = {
    DONE: "done",
    IN_REVIEW: "review",
    IN_PROGRESS: "in_progress",
    BLOCKED: "in_progress",
    TODO: "todo",
    BACKLOG: "todo",
    CANCELED: "done",
  };
  const priorityMap: Record<string, Task["priority"]> = {
    CRITICAL: "critical",
    HIGH: "high",
    MEDIUM: "medium",
    LOW: "low",
  };
  const progress = w.status === "DONE" ? 100 : w.status === "IN_PROGRESS" || w.status === "IN_REVIEW" ? 50 : 0;
  return {
    id: w.id,
    projectId: w.projectId,
    phaseId: w.phaseId ?? undefined,
    name: w.title,
    description: w.description ?? undefined,
    assignedTo: w.assigneeUserId ?? undefined,
    status: statusMap[w.status] ?? "todo",
    progress,
    startDate: w.startDate ?? undefined,
    dueDate: w.dueDate ?? undefined,
    completedDate: w.completedAt ?? undefined,
    priority: priorityMap[w.priority] ?? "medium",
    createdAt: w.createdAt,
    updatedAt: w.updatedAt,
  };
}

function mapPriority(p?: string): workTasksApi.WorkTaskPriority {
  const m: Record<string, workTasksApi.WorkTaskPriority> = {
    low: "LOW",
    medium: "MEDIUM",
    high: "HIGH",
    critical: "CRITICAL",
  };
  const result = p && m[p.toLowerCase()];
  return result || "MEDIUM";
}

function mapStatus(s?: string): WorkTaskStatus | undefined {
  const m: Record<string, WorkTaskStatus> = {
    todo: "TODO",
    in_progress: "IN_PROGRESS",
    blocked: "BLOCKED",
    review: "IN_REVIEW",
    done: "DONE",
  };
  return s ? m[s.toLowerCase()] : undefined;
}

export const taskService = {
  async getTasks(projectId: string): Promise<Task[]> {
    const result = await workTasksApi.listTasks({ projectId });
    return result.items.map(workTaskToTask);
  },

  async getTask(taskId: string): Promise<Task> {
    const w = await workTasksApi.getTask(taskId);
    return workTaskToTask(w);
  },

  async createTask(task: CreateTaskInput): Promise<Task> {
    const w = await workTasksApi.createTask({
      projectId: task.projectId,
      title: task.name,
      description: task.description,
      phaseId: task.phaseId,
      assigneeUserId: task.assignedTo,
      dueDate: task.dueDate,
      priority: mapPriority(task.priority),
    });
    return workTaskToTask(w);
  },

  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
    const patch: UpdateTaskPatch = {};
    if (updates.name !== undefined) patch.title = updates.name;
    if (updates.description !== undefined) patch.description = updates.description;
    if (updates.status !== undefined) patch.status = mapStatus(updates.status);
    if (updates.priority !== undefined) patch.priority = mapPriority(updates.priority);
    if (updates.assignedTo !== undefined) patch.assigneeUserId = updates.assignedTo ?? null;
    if (updates.dueDate !== undefined) patch.dueDate = updates.dueDate;
    if (updates.startDate !== undefined) patch.startDate = updates.startDate;
    const w = await workTasksApi.updateTask(taskId, patch);
    return workTaskToTask(w);
  },

  async deleteTask(taskId: string): Promise<void> {
    await workTasksApi.deleteTask(taskId);
  },

  /**
   * Legacy progress endpoint removed. Work tasks use status only.
   * No-op: refetches task so UI still receives an updated task shape.
   */
  async updateProgress(taskId: string, _progress: number): Promise<Task> {
    const w = await workTasksApi.getTask(taskId);
    return workTaskToTask(w);
  },

  /**
   * Phases come from work plan API. Use phases from GET /work/projects/:id/plan or phases.api.
   */
  async getProjectPhases(_projectId: string): Promise<ProjectPhase[]> {
    throw new Error("Use work plan or phases API (GET /work/projects/:id/plan)");
  },
};
