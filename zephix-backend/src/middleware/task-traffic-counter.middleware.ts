import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Temporary middleware to prove task API cutover.
 * Counts requests to legacy task routes vs work management task routes.
 * Logging gated by TASK_TRAFFIC_LOG=true or throttled to once per 60s with totals.
 */
const counters = {
  legacyTasks: 0,
  legacyProjectTasks: 0,
  workTasks: 0,
};

let lastLogTime = 0;
const LOG_INTERVAL_MS = 60_000;

export function getTaskTrafficCounters() {
  return { ...counters };
}

export function resetTaskTrafficCounters() {
  counters.legacyTasks = 0;
  counters.legacyProjectTasks = 0;
  counters.workTasks = 0;
}

function maybeLog() {
  if (process.env.NODE_ENV === 'test') return;
  if (process.env.TASK_TRAFFIC_LOG !== 'true') return;
  const now = Date.now();
  if (
    now - lastLogTime >= LOG_INTERVAL_MS &&
    (counters.legacyTasks > 0 ||
      counters.legacyProjectTasks > 0 ||
      counters.workTasks > 0)
  ) {
    lastLogTime = now;
    console.log(
      `[task-traffic] (60s) legacy /tasks: ${counters.legacyTasks}, legacy /projects/:id/tasks: ${counters.legacyProjectTasks}, /work/tasks: ${counters.workTasks}`,
    );
  }
}

/** Standalone handler for e2e when Nest middleware chain may not run; same logic as TaskTrafficCounterMiddleware.use */
export function taskTrafficCounterHandler(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const rawPath =
    (req.url && req.url.split('?')[0]) ||
    req.path ||
    (req.originalUrl && req.originalUrl.split('?')[0]) ||
    '';
  const path = rawPath.startsWith('/api')
    ? rawPath.replace(/^\/api/, '') || '/'
    : rawPath || '/';

  if (path === '/tasks' || path.startsWith('/tasks/')) {
    counters.legacyTasks++;
    maybeLog();
  } else if (
    /^\/projects\/[^/]+\/tasks/.test(path) ||
    /^\/projects\/[^/]+\/tasks\//.test(path)
  ) {
    counters.legacyProjectTasks++;
    maybeLog();
  } else if (
    path === '/work/tasks' ||
    path.startsWith('/work/tasks') ||
    rawPath.includes('/work/tasks') ||
    (rawPath.includes('work') && rawPath.includes('tasks'))
  ) {
    counters.workTasks++;
    maybeLog();
  }
  next();
}

@Injectable()
export class TaskTrafficCounterMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const rawPath =
      (req.url && req.url.split('?')[0]) ||
      req.path ||
      (req.originalUrl && req.originalUrl.split('?')[0]) ||
      '';
    const path = rawPath.startsWith('/api')
      ? rawPath.replace(/^\/api/, '') || '/'
      : rawPath || '/';

    if (path === '/tasks' || path.startsWith('/tasks/')) {
      counters.legacyTasks++;
      maybeLog();
    } else if (
      /^\/projects\/[^/]+\/tasks/.test(path) ||
      /^\/projects\/[^/]+\/tasks\//.test(path)
    ) {
      counters.legacyProjectTasks++;
      maybeLog();
    } else if (
      path === '/work/tasks' ||
      path.startsWith('/work/tasks') ||
      rawPath === '/work/tasks' ||
      rawPath.startsWith('/work/tasks') ||
      rawPath.includes('/work/tasks') ||
      path.includes('/work/tasks')
    ) {
      counters.workTasks++;
      maybeLog();
    }

    next();
  }
}
