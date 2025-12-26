import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserOrganization } from '../organizations/entities/user-organization.entity';

@Injectable()
export class DemoBootstrapService implements OnModuleInit {
  private readonly log = new Logger(DemoBootstrapService.name);
  private readonly DEMO = [
    {
      email: 'demo@zephix.ai',
      password: 'demo123456',
      firstName: 'Demo',
      lastName: 'User',
      role: 'admin',
    },
    {
      email: 'admin@zephix.ai',
      password: 'admin123456',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
    },
    {
      email: 'member@zephix.ai',
      password: 'member123456',
      firstName: 'Member',
      lastName: 'User',
      role: 'pm',
    },
    {
      email: 'guest@zephix.ai',
      password: 'guest123456',
      firstName: 'Guest',
      lastName: 'User',
      role: 'viewer',
    },
  ];

  constructor(private readonly ds: DataSource) {}

  async onModuleInit() {
    // Skip in test mode or if explicitly disabled
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    if (process.env.DISABLE_DEMO_BOOTSTRAP === 'true') {
      return;
    }
    await this.run();
  }

  async run() {
    if (process.env.DEMO_BOOTSTRAP !== 'true') {
      this.log.log('Demo bootstrap skipped (DEMO_BOOTSTRAP not set)');
      return;
    }

    this.log.log(`Bootstrapping ${this.DEMO.length} demo users…`);

    // Get or create organization
    const org = await this.ds.query(
      'SELECT id FROM organizations WHERE slug = $1 LIMIT 1',
      ['demo'],
    );
    let orgId: string;

    if (org.length === 0) {
      const newOrg = await this.ds.query(
        `INSERT INTO organizations (id, name, slug, status, created_at, updated_at) VALUES (gen_random_uuid(), 'Zephix Demo', 'demo', 'active', NOW(), NOW()) RETURNING id`,
      );
      orgId = newOrg[0].id;
      this.log.log('✅ Created demo organization');
    } else {
      orgId = org[0].id;
    }

    for (const u of this.DEMO) {
      const hash = await bcrypt.hash(u.password, 10);

      // Upsert user
      const userSql = `
        INSERT INTO users (id, email, password, first_name, last_name, role, organization_id, is_active, is_email_verified, email_verified_at, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, true, NOW(), NOW(), NOW())
        ON CONFLICT (email)
        DO UPDATE SET
          password = EXCLUDED.password,
          role = EXCLUDED.role,
          organization_id = EXCLUDED.organization_id,
          updated_at = NOW()
        RETURNING id;
      `;

      const userResult = await this.ds.query(userSql, [
        u.email,
        hash,
        u.firstName,
        u.lastName,
        u.role,
        orgId,
      ]);
      const userId = userResult[0]?.id;

      // Upsert UserOrganization record using TypeORM entity
      // Map user.role to UserOrganization.role:
      // - 'admin' → 'admin' (or 'owner' for first user)
      // - 'pm' → 'pm'
      // - 'viewer' → 'viewer'
      const orgRole = u.role === 'admin' ? 'admin' : u.role;

      const userOrgRepo = this.ds.getRepository(UserOrganization);

      // Find existing record or create new one
      let userOrg = await userOrgRepo.findOne({
        where: { userId, organizationId: orgId },
      });

      if (userOrg) {
        // Update existing record
        userOrg.role = orgRole as 'owner' | 'admin' | 'pm' | 'viewer';
        userOrg.isActive = true;
        await userOrgRepo.save(userOrg);
      } else {
        // Create new record
        userOrg = userOrgRepo.create({
          userId,
          organizationId: orgId,
          role: orgRole as 'owner' | 'admin' | 'pm' | 'viewer',
          isActive: true,
        });
        await userOrgRepo.save(userOrg);
      }

      this.log.log(
        `bootstrap.demo.user.upserted: ${u.email} (user.role=${u.role}, org.role=${orgRole})`,
      );
    }
    this.log.log(`Demo bootstrap complete ✅ (org slug: demo)`);
  }
}
