import {
  extractDbHost,
  validateDbWiring,
  PRODUCTION_PROXY_HOSTS,
  STAGING_PROXY_HOSTS,
  TEST_PROXY_HOSTS,
} from './db-safety-guard';

describe('DB Safety Guard', () => {
  describe('extractDbHost', () => {
    it('extracts host from a postgres:// URL', () => {
      expect(
        extractDbHost(
          'postgresql://user:pass@postgres.railway.internal:5432/railway',
        ),
      ).toBe('postgres.railway.internal');
    });

    it('extracts host from a public proxy URL', () => {
      expect(
        extractDbHost(
          'postgresql://postgres:abc@ballast.proxy.rlwy.net:12345/railway',
        ),
      ).toBe('ballast.proxy.rlwy.net');
    });

    it('extracts host from staging proxy URL', () => {
      expect(
        extractDbHost(
          'postgresql://postgres:pw@interchange.proxy.rlwy.net:53277/railway',
        ),
      ).toBe('interchange.proxy.rlwy.net');
    });

    it('extracts host from test proxy URL', () => {
      expect(
        extractDbHost(
          'postgresql://postgres:pw@yamabiko.proxy.rlwy.net:26837/railway',
        ),
      ).toBe('yamabiko.proxy.rlwy.net');
    });

    it('returns empty string for garbage input', () => {
      expect(extractDbHost('not-a-url')).toBe('');
    });

    it('returns empty string for empty string', () => {
      expect(extractDbHost('')).toBe('');
    });
  });

  describe('validateDbWiring — Railway internal hostnames (env-scoped)', () => {
    // Railway internal DNS is scoped per environment, so
    // postgres.railway.internal is valid for ALL ZEPHIX_ENV values.

    it('accepts staging + postgres.railway.internal', () => {
      const result = validateDbWiring(
        'staging',
        'postgresql://u:p@postgres.railway.internal:5432/railway',
      );
      expect(result.safe).toBe(true);
      expect(result.message).toContain('env-scoped');
    });

    it('accepts production + postgres.railway.internal', () => {
      const result = validateDbWiring(
        'production',
        'postgresql://u:p@postgres.railway.internal:5432/railway',
      );
      expect(result.safe).toBe(true);
      expect(result.message).toContain('env-scoped');
    });

    it('accepts test + postgres.railway.internal', () => {
      const result = validateDbWiring(
        'test',
        'postgresql://u:p@postgres.railway.internal:5432/railway',
      );
      expect(result.safe).toBe(true);
      expect(result.message).toContain('env-scoped');
    });

    it('accepts any internal hostname like custom-db.railway.internal', () => {
      const result = validateDbWiring(
        'staging',
        'postgresql://u:p@custom-db.railway.internal:5432/railway',
      );
      expect(result.safe).toBe(true);
    });
  });

  describe('validateDbWiring — public proxy hostnames (must match env)', () => {
    // ─── Staging must not use production or test proxies ──────────────
    it('rejects staging + production proxy host', () => {
      const result = validateDbWiring(
        'staging',
        'postgresql://u:p@ballast.proxy.rlwy.net:38318/railway',
      );
      expect(result.safe).toBe(false);
      expect(result.message).toContain('production');
    });

    it('rejects staging + test proxy host', () => {
      const result = validateDbWiring(
        'staging',
        'postgresql://u:p@yamabiko.proxy.rlwy.net:26837/railway',
      );
      expect(result.safe).toBe(false);
      expect(result.message).toContain('test');
    });

    it('accepts staging + staging proxy host (interchange)', () => {
      const result = validateDbWiring(
        'staging',
        'postgresql://u:p@interchange.proxy.rlwy.net:53277/railway',
      );
      expect(result.safe).toBe(true);
      expect(result.message).toContain('correct proxy');
    });

    it('accepts staging + staging proxy host (shortline)', () => {
      const result = validateDbWiring(
        'staging',
        'postgresql://u:p@shortline.proxy.rlwy.net:53277/railway',
      );
      expect(result.safe).toBe(true);
      expect(result.message).toContain('correct proxy');
    });

    // ─── Production must not use staging or test proxies ─────────────
    it('rejects production + staging proxy host', () => {
      const result = validateDbWiring(
        'production',
        'postgresql://u:p@interchange.proxy.rlwy.net:53277/railway',
      );
      expect(result.safe).toBe(false);
      expect(result.message).toContain('staging');
    });

    it('rejects production + test proxy host', () => {
      const result = validateDbWiring(
        'production',
        'postgresql://u:p@yamabiko.proxy.rlwy.net:26837/railway',
      );
      expect(result.safe).toBe(false);
      expect(result.message).toContain('test');
    });

    it('accepts production + production proxy host', () => {
      const result = validateDbWiring(
        'production',
        'postgresql://u:p@ballast.proxy.rlwy.net:38318/railway',
      );
      expect(result.safe).toBe(true);
      expect(result.message).toContain('correct proxy');
    });

    // ─── Test must not use production or staging proxies ─────────────
    it('rejects test + production proxy host', () => {
      const result = validateDbWiring(
        'test',
        'postgresql://u:p@ballast.proxy.rlwy.net:38318/railway',
      );
      expect(result.safe).toBe(false);
      expect(result.message).toContain('production');
    });

    it('rejects test + staging proxy host', () => {
      const result = validateDbWiring(
        'test',
        'postgresql://u:p@interchange.proxy.rlwy.net:53277/railway',
      );
      expect(result.safe).toBe(false);
      expect(result.message).toContain('staging');
    });

    it('accepts test + test proxy host', () => {
      const result = validateDbWiring(
        'test',
        'postgresql://u:p@yamabiko.proxy.rlwy.net:26837/railway',
      );
      expect(result.safe).toBe(true);
      expect(result.message).toContain('correct proxy');
    });
  });

  describe('validateDbWiring — edge cases', () => {
    it('accepts empty ZEPHIX_ENV (local dev, guard skipped)', () => {
      const result = validateDbWiring(
        '',
        'postgresql://u:p@localhost:5432/zephix',
      );
      expect(result.safe).toBe(true);
      expect(result.message).toContain('local dev');
    });

    it('accepts localhost for any ZEPHIX_ENV', () => {
      const result = validateDbWiring(
        'staging',
        'postgresql://u:p@localhost:5432/zephix',
      );
      expect(result.safe).toBe(true);
      expect(result.message).toContain('non-Railway');
    });

    it('accepts custom host for any ZEPHIX_ENV', () => {
      const result = validateDbWiring(
        'production',
        'postgresql://u:p@my-custom-db.example.com:5432/zephix',
      );
      expect(result.safe).toBe(true);
    });

    it('accepts unknown ZEPHIX_ENV with proxy host (no guard)', () => {
      const result = validateDbWiring(
        'preview',
        'postgresql://u:p@ballast.proxy.rlwy.net:38318/railway',
      );
      expect(result.safe).toBe(true);
      expect(result.message).toContain('unknown env');
    });
  });

  describe('constants', () => {
    it('PRODUCTION_PROXY_HOSTS contains ballast', () => {
      expect(PRODUCTION_PROXY_HOSTS).toContain('ballast.proxy.rlwy.net');
    });

    it('STAGING_PROXY_HOSTS contains interchange and shortline', () => {
      expect(STAGING_PROXY_HOSTS).toContain('interchange.proxy.rlwy.net');
      expect(STAGING_PROXY_HOSTS).toContain('shortline.proxy.rlwy.net');
    });

    it('TEST_PROXY_HOSTS contains yamabiko', () => {
      expect(TEST_PROXY_HOSTS).toContain('yamabiko.proxy.rlwy.net');
    });
  });
});
