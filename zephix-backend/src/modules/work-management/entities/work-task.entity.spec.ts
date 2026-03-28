import { WorkTask } from './work-task.entity';
import { TaskStatus } from '../enums/task.enums';

describe('WorkTask entity — C-8 rework propagation', () => {
  it('sets isReworkTask when status is REWORK (AfterLoad)', () => {
    const task = new WorkTask();
    task.status = TaskStatus.REWORK;
    (task as unknown as { applyEffectiveState(): void }).applyEffectiveState();
    expect(task.isReworkTask).toBe(true);
  });

  it('clears isReworkTask when status is not REWORK', () => {
    const task = new WorkTask();
    task.status = TaskStatus.IN_PROGRESS;
    (task as unknown as { applyEffectiveState(): void }).applyEffectiveState();
    expect(task.isReworkTask).toBe(false);
  });
});
