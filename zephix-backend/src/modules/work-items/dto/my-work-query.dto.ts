import { IsIn, IsOptional, IsUUID, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';

const STATUS = ['active', 'at_risk', 'blocked', 'completed', 'all'] as const;
const ASSIGNEE = ['me', 'any'] as const;
const DATE_RANGE = [
  'last_7_days',
  'last_30_days',
  'this_month',
  'this_quarter',
  'all_time',
] as const;
const HEALTH = ['on_track', 'at_risk', 'blocked'] as const;

export type MyWorkStatus = (typeof STATUS)[number];
export type MyWorkAssignee = (typeof ASSIGNEE)[number];
export type MyWorkDateRange = (typeof DATE_RANGE)[number];
export type MyWorkHealth = (typeof HEALTH)[number];

export class MyWorkQueryDto {
  @IsOptional()
  @IsUUID()
  workspaceId?: string;

  @IsOptional()
  @IsIn(STATUS as unknown as string[])
  status?: MyWorkStatus;

  @IsOptional()
  @IsIn(ASSIGNEE as unknown as string[])
  assignee?: MyWorkAssignee;

  @IsOptional()
  @IsIn(DATE_RANGE as unknown as string[])
  dateRange?: MyWorkDateRange;

  @IsOptional()
  @IsArray()
  @IsIn(HEALTH as unknown as string[], { each: true })
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value ? [value] : [],
  )
  health?: MyWorkHealth[];
}

export function resolveDateRange(dateRange?: MyWorkDateRange): {
  from?: Date;
  to?: Date;
} {
  if (!dateRange || dateRange === 'all_time') return {};

  const now = new Date();
  const to = now;

  if (dateRange === 'last_7_days') {
    const from = new Date(now);
    from.setDate(from.getDate() - 7);
    return { from, to };
  }

  if (dateRange === 'last_30_days') {
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    return { from, to };
  }

  if (dateRange === 'this_month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from, to };
  }

  if (dateRange === 'this_quarter') {
    const q = Math.floor(now.getMonth() / 3);
    const from = new Date(now.getFullYear(), q * 3, 1);
    return { from, to };
  }

  return {};
}
