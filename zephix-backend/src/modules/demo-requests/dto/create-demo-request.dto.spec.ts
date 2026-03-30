import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateDemoRequestDto } from './create-demo-request.dto';

describe('CreateDemoRequestDto', () => {
  const base = () => ({
    companyName: 'Acme',
    contactName: 'Jane',
    email: 'jane@acme.com',
    useCase: 'Need a demo',
  });

  it('accepts optional campaignSlug and leadIntent for attribution', async () => {
    const dto = plainToInstance(CreateDemoRequestDto, {
      ...base(),
      campaignSlug: 'resource-risk',
      leadIntent: 'contact',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects campaignSlug longer than 128 chars', async () => {
    const dto = plainToInstance(CreateDemoRequestDto, {
      ...base(),
      campaignSlug: 'x'.repeat(129),
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
