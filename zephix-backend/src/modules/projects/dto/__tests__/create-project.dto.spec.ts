// zephix-backend/src/modules/projects/dto/__tests__/create-project.dto.spec.ts
import 'reflect-metadata';
import { validate } from 'class-validator';
import { CreateProjectDto } from '../create-project.dto';

it('requires workspaceId', async () => {
  const dto = new CreateProjectDto();
  dto.name = 'X';
  const errs = await validate(dto);
  expect(JSON.stringify(errs)).toMatch(/workspaceId/);
});

