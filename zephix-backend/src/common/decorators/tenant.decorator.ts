// src/common/decorators/tenant.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface TenantContext {
  organizationId: string;
  userId: string;
  userRole: string;
}

// Decorator to extract tenant context from request
export const GetTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): TenantContext => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    console.log('🔍 GetTenant decorator - user object:', JSON.stringify(user, null, 2));

    if (!user?.organizationId || !user?.id) {
      console.error('❌ Tenant context not found - missing organizationId or id');
      throw new Error('Tenant context not found');
    }

    const tenantContext = {
      organizationId: user.organizationId,
      userId: user.id,
      userRole: user.role,
    };

    console.log('✅ Tenant context extracted:', JSON.stringify(tenantContext, null, 2));

    return tenantContext;
  },
);

// Base repository class with automatic tenant filtering
export abstract class TenantAwareRepository<T> {
  constructor(
    protected repository: any, // TypeORM repository
    protected entityName: string
  ) {}

  // Override find methods to automatically include organization filter
  async find(organizationId: string, options: any = {}): Promise<T[]> {
    return this.repository.find({
      ...options,
      where: {
        ...options.where,
        organizationId, // ALWAYS include org filter
      },
    });
  }

  async findOne(organizationId: string, options: any = {}): Promise<T | null> {
    return this.repository.findOne({
      ...options,
      where: {
        ...options.where,
        organizationId, // ALWAYS include org filter
      },
    });
  }

  async findById(id: string, organizationId: string, relations: string[] = []): Promise<T | null> {
    return this.repository.findOne({
      where: { id, organizationId },
      relations,
    });
  }

  async create(data: Partial<T>, organizationId: string): Promise<T> {
    const entity = this.repository.create({
      ...data,
      organizationId, // ALWAYS set org
    });
    return this.repository.save(entity);
  }

  async update(
    id: string, 
    organizationId: string, 
    data: Partial<T>
  ): Promise<T | null> {
    // First verify the record exists and belongs to org
    const existing = await this.findById(id, organizationId);
    if (!existing) {
      return null;
    }

    // Update with org filter in WHERE clause
    await this.repository.update(
      { id, organizationId }, // WHERE clause includes org
      { ...data, organizationId } // Ensure org doesn't change
    );

    return this.findById(id, organizationId);
  }

  async delete(id: string, organizationId: string): Promise<boolean> {
    // First verify the record exists and belongs to org
    const existing = await this.findById(id, organizationId);
    if (!existing) {
      return false;
    }

    const result = await this.repository.delete({ id, organizationId });
    return result.affected > 0;
  }

  async count(organizationId: string, where: any = {}): Promise<number> {
    return this.repository.count({
      where: {
        ...where,
        organizationId,
      },
    });
  }
}
