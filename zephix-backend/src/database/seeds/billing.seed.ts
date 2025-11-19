import { DataSource } from 'typeorm';
import { PlansService } from '../../billing/services/plans.service';
import { Plan } from '../../billing/entities/plan.entity';

export async function seedBillingPlans(dataSource: DataSource) {
  const plansRepository = dataSource.getRepository(Plan);
  const plansService = new PlansService(plansRepository);

  console.log('🌱 Seeding billing plans...');
  await plansService.seedPlans();
  console.log('✅ Billing plans seeded successfully');
}
