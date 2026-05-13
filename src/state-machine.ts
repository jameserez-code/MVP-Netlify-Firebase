// Execution state machines — canonical type definitions and transitions

export type TaskStatus = 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
export type RunStatus = 'starting' | 'running' | 'completed' | 'failed' | 'timed_out';

export const TASK_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  pending:   ['queued', 'cancelled'],
  queued:    ['running', 'cancelled'],
  running:   ['completed', 'failed', 'cancelled'],
  completed: [],   // terminal
  failed:    ['pending'],  // retry → reset
  cancelled: [],  // terminal
};

export const RUN_TRANSITIONS: Record<RunStatus, RunStatus[]> = {
  starting:  ['running', 'failed'],
  running:   ['completed', 'failed', 'timed_out'],
  completed: [],   // terminal
  failed:    [],   // terminal
  timed_out: [],   // terminal
};

export function isValidTransition<T extends string>(current: string, next: T, map: Record<string, T[]>): boolean {
  const allowed = map[current];
  if (!allowed) return false;
  return allowed.includes(next);
}

export function requireTransition<T extends string>(current: string, next: T, map: Record<string, T[]>, resourceId: string): void {
  if (!isValidTransition(current, next, map)) {
    throw new Error(`INVALID_TRANSITION: ${resourceId} cannot go from ${current} → ${next}`);
  }
}
