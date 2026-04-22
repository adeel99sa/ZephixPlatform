describe('data-source-migrate', () => {
  const originalUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    process.env.DATABASE_URL =
      'postgresql://localhost:5432/zephix_migrate_metadata_test';
  });

  afterEach(() => {
    process.env.DATABASE_URL = originalUrl;
    jest.resetModules();
  });

  it('registers entity globs so repository-based migrations can resolve metadata', async () => {
    const { default: dataSource } = await import('./data-source-migrate');
    const entities = dataSource.options.entities;
    expect(entities).toBeDefined();
    expect(Array.isArray(entities)).toBe(true);
    expect((entities as string[]).some((p) => String(p).includes('.entity'))).toBe(
      true,
    );
  });
});
