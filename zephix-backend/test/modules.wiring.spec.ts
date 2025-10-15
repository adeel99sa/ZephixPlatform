import 'reflect-metadata';
import { TasksModule } from '../src/modules/tasks/tasks.module';

describe('Module wiring', () => {
  it('TasksModule imports AuthModule', () => {
    const imports = Reflect.getMetadata('imports', TasksModule) || [];
    const names = imports.map((i: any) => i?.name).filter(Boolean);
    expect(names).toContain('AuthModule');
  });
});
