import { Injectable, Logger } from '@nestjs/common';
import { IdentityEvent } from './identity-events';

/**
 * DI token for the identity event bus. Modules consume via
 * `@Inject(IDENTITY_EVENT_BUS)` so the implementation can be swapped
 * (NoOp in PR1, OutboxIdentityEventBus writing to `auth_outbox` in PR2).
 */
export const IDENTITY_EVENT_BUS = Symbol('IDENTITY_EVENT_BUS');

/**
 * Identity-domain event bus. Implementations decide how the event is
 * persisted/dispatched (outbox, in-memory, log-only). Callers do not
 * await delivery — `publish()` returning resolved means the event has
 * been *accepted*, not *delivered*. Persistence guarantees come from
 * the implementation (e.g., outbox row inserted in same DB transaction
 * as the originating mutation).
 */
export interface IdentityEventBus {
  publish(event: IdentityEvent): Promise<void>;
}

/**
 * No-op implementation used during PR1 (foundations). Logs at debug
 * level so we can see which events would fire if the real bus were
 * wired. Replaced by `OutboxIdentityEventBus` in PR2 cutover.
 *
 * Critical: this MUST default to no-op (not throw) so unit tests of
 * services that publish events don't need to mock the bus.
 */
@Injectable()
export class NoOpIdentityEventBus implements IdentityEventBus {
  private readonly logger = new Logger(NoOpIdentityEventBus.name);

  async publish(event: IdentityEvent): Promise<void> {
    this.logger.debug(
      `[noop] would publish identity event: ${event.type} (occurredAt=${event.occurredAt.toISOString()}, org=${event.organizationId ?? 'null'})`,
    );
  }
}
