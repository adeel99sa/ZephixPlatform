/**
 * Default post-auth landing path by platform role (MP-3).
 * MEMBER → My Work; ADMIN and others keep Inbox. VIEWER never uses My Work nav.
 */
import { isPlatformMember, type UserLike } from '@/utils/access';

export function defaultPostLoginPath(user: UserLike): string {
  if (isPlatformMember(user)) return '/my-work';
  return '/inbox';
}
