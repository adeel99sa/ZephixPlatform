import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

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

      const sql = `
        INSERT INTO users (id, email, password, first_name, last_name, role, organization_id, is_active, is_email_verified, email_verified_at, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, true, NOW(), NOW(), NOW())
        ON CONFLICT (email)
        DO UPDATE SET
          password = EXCLUDED.password,
          role = EXCLUDED.role,
          organization_id = EXCLUDED.organization_id,
          updated_at = NOW();
      `;

      await this.ds.query(sql, [
        u.email,
        hash,
        u.firstName,
        u.lastName,
        u.role,
        orgId,
      ]);
      this.log.log(`bootstrap.demo.user.upserted: ${u.email} (${u.role})`);
    }
    this.log.log('Demo bootstrap complete ✅');
  }
}
