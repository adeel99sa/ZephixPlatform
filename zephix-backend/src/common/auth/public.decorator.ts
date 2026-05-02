import { SetMetadata } from '@nestjs/common';

/** Reflect metadata key — checked by {@link JwtAuthGuard} (AD-027 public allowlist / explicit surface). */
export const IS_PUBLIC_KEY = 'zephix:is_public';

/**
 * Marks a route as intentionally public (no JWT required).
 * AD-027 Gate 2: enumerate public auth surface; reviewers grep `@Public()`.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
