/**
 * SEC-UPGRADE-1 unit 3 (otel bump 0.56 -> SDK 2.x) — resource-attribute guard.
 *
 * This unit's defining weakness was ZERO specs on telemetry.service.ts, whose
 * blast zone is the NodeSDK resource built from SemanticResourceAttributes. The
 * silent-rename hazard: if a future @opentelemetry/semantic-conventions bump ever
 * drops one of our constants, `SemanticResourceAttributes.X` becomes `undefined`,
 * the resource writes to the key "undefined" instead of the real attribute, and
 * NOTHING throws — telemetry looks alive with hollow service identity.
 *
 * These assertions freeze the exact resource TelemetryService constructs (same
 * three SemanticResourceAttributes keys), so a constant that goes undefined turns
 * the board red instead of silently blanking the service identity. Deprecated
 * aggregate kept intentionally (OTEL-MODERNIZE fence) — it still resolves at 1.43.
 */
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

describe('otel resource attributes — populated identity (silent-blank guard)', () => {
  it('the three SemanticResourceAttributes constants resolve to their stable keys', () => {
    expect(SemanticResourceAttributes.SERVICE_NAME).toBe('service.name');
    expect(SemanticResourceAttributes.SERVICE_VERSION).toBe('service.version');
    expect(SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT).toBe(
      'deployment.environment',
    );
  });

  it('a resource built exactly as TelemetryService does has populated, correctly-keyed identity', () => {
    // Mirror telemetry.service.ts:29-33.
    const resource = resourceFromAttributes({
      [SemanticResourceAttributes.SERVICE_NAME]: 'zephix-backend',
      [SemanticResourceAttributes.SERVICE_VERSION]: '9.9.9',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: 'staging',
    });

    expect(resource.attributes['service.name']).toBe('zephix-backend');
    expect(resource.attributes['service.version']).toBe('9.9.9');
    expect(resource.attributes['deployment.environment']).toBe('staging');
  });

  it('never produces an "undefined" key — the silent-blank symptom of a dropped constant', () => {
    const resource = resourceFromAttributes({
      [SemanticResourceAttributes.SERVICE_NAME]: 'zephix-backend',
      [SemanticResourceAttributes.SERVICE_VERSION]: '9.9.9',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: 'staging',
    });
    expect(Object.keys(resource.attributes)).not.toContain('undefined');
  });
});
