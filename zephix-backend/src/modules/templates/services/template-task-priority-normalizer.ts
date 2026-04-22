/**
 * Phase 5A.4 — Canonical template task priority normalizer.
 *
 * The Zephix codebase has two priority vocabularies:
 *
 *   1. **Template task vocabulary** (lowercase):
 *      `'low' | 'medium' | 'high' | 'critical'`
 *      Used by:
 *        - SystemTemplateDef.taskTemplates[].priority (hardcoded in
 *          system-template-definitions.ts)
 *        - The flat `template.task_templates` JSONB column
 *        - The save-as-template snapshot shape
 *
 *   2. **WorkTask DB enum** (uppercase):
 *      `'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'`
 *      Defined in:
 *        - TaskPriority enum at
 *          `zephix-backend/src/modules/work-management/enums/task.enums.ts`
 *        - Migration `1767637754000-Phase5WorkManagementCore.ts` line 119
 *        - work_tasks.priority column type
 *
 * Until Phase 5A.4, the instantiate-v5_1 service did a raw cast
 * `(taskDef.priority as TaskPriority)` which let lowercase strings reach
 * the DB and produced:
 *
 *   invalid input value for enum work_tasks_priority_enum: "high"
 *
 * This helper is the single normalization point. It accepts either
 * vocabulary, returns the canonical uppercase enum value, and rejects
 * unknown inputs with an explicit error that includes the bad value.
 *
 * Rules:
 *   - Lowercase template tokens normalize to uppercase enum tokens.
 *   - Already-uppercase enum tokens pass through unchanged.
 *   - Whitespace is trimmed before comparison.
 *   - `null` / `undefined` / empty input → returns null (caller picks
 *     the default — currently TaskPriority.MEDIUM at the instantiate
 *     site). The brief warned against silent fallback, so the helper
 *     returns null and the caller is explicit about the default.
 *   - Any other non-empty string is an unknown value and throws.
 */
import { TaskPriority } from '../../work-management/enums/task.enums';

/**
 * The locked set of accepted DB enum values for WorkTask.priority.
 * Sourced directly from the TaskPriority enum so any future expansion
 * automatically widens the normalizer.
 */
const ACCEPTED_DB_VALUES: ReadonlySet<TaskPriority> = new Set(
  Object.values(TaskPriority),
);

/**
 * Normalize any template task priority token into the canonical
 * WorkTask.priority enum value.
 *
 * Returns:
 *   - A `TaskPriority` enum value when the input maps to a known token.
 *   - `null` when the input is null/undefined/empty (caller picks default).
 *
 * Throws:
 *   - `Error` with the bad value embedded when the input is a non-empty
 *     string that does not map to any known token.
 */
export function normalizeTemplateTaskPriority(
  input: unknown,
): TaskPriority | null {
  if (input === null || input === undefined) return null;
  if (typeof input !== 'string') {
    throw new Error(
      `Invalid template task priority: expected string, got ${typeof input}`,
    );
  }

  const trimmed = input.trim();
  if (trimmed.length === 0) return null;

  // Uppercase the token. Both `'high'` and `'HIGH'` end up at `'HIGH'`.
  const upper = trimmed.toUpperCase() as TaskPriority;

  if (ACCEPTED_DB_VALUES.has(upper)) {
    return upper;
  }

  // Unknown value — throw with the original token in the message so the
  // operator can fix the offending template definition.
  throw new Error(
    `Invalid template task priority: "${input}". ` +
      `Accepted values are: ${Array.from(ACCEPTED_DB_VALUES).join(', ')}.`,
  );
}

/**
 * Convenience wrapper that returns the canonical default
 * (`TaskPriority.MEDIUM`) when the input is null / undefined / empty.
 *
 * Use this at call sites that previously had inline
 * `|| TaskPriority.MEDIUM` fallbacks. It keeps the default behavior
 * explicit (NOT silent), and any unknown non-empty input still throws.
 */
export function normalizeTemplateTaskPriorityOrDefault(
  input: unknown,
): TaskPriority {
  return normalizeTemplateTaskPriority(input) ?? TaskPriority.MEDIUM;
}
