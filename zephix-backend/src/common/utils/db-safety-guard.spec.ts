import {
  extractDbHost,
  validateDbWiring,
  PRODUCTION_DB_HOSTS,
  STAGING_DB_HOST,
} from './db-safety-guard';

describe('DB Safety Guard', () => {
  describe('extractDbHost', () => {
    it('extracts host from a postgres:// URL', () => {
      expect(
        extractDbHost(
          'postgresql://user:pass@postgres-jj7b.railway.internal:5432/railway',
        ),
      ).toBe('postgres-jj7b.railway.internal');
    });

    it('extracts host from a public proxy URL', () => {
      expect(
        extractDbHost(
          'postgresql://postgres:abc@ballast.proxy.rlwy.net:12345/railway',
        ),
      ).toBe('ballast.proxy.rlwy.net');
    });

    it('extracts host from internal production URL', () => {
      expect(
        extractDbHost(
          'postgresql://postgres:pw@postgres.railway.internal:5432/railway',
        ),
      ).toBe('postgres.railway.internal');
    });

    it('returns empty string for garbage input', () => {
      expect(extractDbHost('not-a-url')).toBe('');
    });

    it('returns empty string for empty string', () => {
      expect(extractDbHost('')).toBe('');
    });
  });

  describe('validateDbWiring', () => {
    // ─── Staging must not hit production ────────────────────────────────
    it('rejects staging + production internal host', () => {
      const result = validateDbWiring(
        'staging',
        'postgresql://u:p@postgres.railway.internal:5432/railway',
      );
      expect(result.safe).toBe(false);
      expect(result.message).toContain('production');
      expect(result.dbHost).toBe('postgres.railway.internal');
    });

    it('rejects staging + production public proxy host', () => {
      const result = validateDbWiring(
        'staging',
        'postgresql://u:p@ballast.proxy.rlwy.net:5432/railway',
      );
      expect(result.safe).toBe(false);
      expect(result.message).toContain('production');
    });

    // ─── Production must not hit staging ────────────────────────────────
    it('rejects production + staging host', () => {
      const result = validateDbWiring(
        'production',
        'postgresql://u:p@postgres-jj7b.railway.internal:5432/railway',
      );
      expect(result.safe).toBe(false);
      expect(result.message).toContain('staging');
    });

    // ─── Happy paths ────────────────────────────────────────────────────
    it('accepts staging + staging host', () => {
      const result = validateDbWiring(
        'staging',
        'postgresql://u:p@postgres-jj7b.railway.internal:5432/railway',
      );
      expect(result.safe).toBe(true);
    });

    it('accepts production + production internal host', () => {
      const result = validateDbWiring(
        'production',
        'postgresql://u:p@postgres.railway.internal:5432/railway',
      );
      expect(result.safe).toBe(true);
    });

    it('accepts production + production public proxy host', () => {
      const result = validateDbWiring(
        'production',
        'postgresql://u:p@ballast.proxy.rlwy.net:5432/railway',
      );
      expect(result.safe).toBe(true);
    });

    it('accepts test env (no cross-wiring checks)', () => {
      const result = validateDbWiring(
        'test',
        'postgresql://u:p@yamabiko.proxy.rlwy.net:5432/railway',
      );
      expect(result.safe).toBe(true);
    });

    it('accepts empty ZEPHIX_ENV (local dev, no guard)', () => {
      const result = validateDbWiring(
        '',
        'postgresql://u:p@localhost:5432/zephix',
      );
      expect(result.safe).toBe(true);
    });
  });

  describe('constants', () => {
    it('PRODUCTION_DB_HOSTS contains internal and proxy hosts', () => {
      expect(PRODUCTION_DB_HOSTS).toContain('postgres.railway.internal');
      expect(PRODUCTION_DB_HOSTS).toContain('ballast.proxy.rlwy.net');
    });

    it('STAGING_DB_HOST is the staging private host', () => {
      expect(STAGING_DB_HOST).toBe('postgres-jj7b.railway.internal');
    });
  });
});
