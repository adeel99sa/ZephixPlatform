describe('database.config (TypeORM)', () => {
  const originalFlag = process.env.ZEPHIX_ORM_SKIP_MIGRATION_GLOBS;

  afterEach(() => {
    if (originalFlag === undefined) {
      delete process.env.ZEPHIX_ORM_SKIP_MIGRATION_GLOBS;
    } else {
      process.env.ZEPHIX_ORM_SKIP_MIGRATION_GLOBS = originalFlag;
    }
    jest.resetModules();
  });

  it('uses empty migrations when ZEPHIX_ORM_SKIP_MIGRATION_GLOBS is true (Jest permission-matrix)', async () => {
    process.env.ZEPHIX_ORM_SKIP_MIGRATION_GLOBS = 'true';
    const { databaseConfig } = await import('./database.config');
    expect(databaseConfig.migrations).toEqual([]);
    expect(databaseConfig.autoLoadEntities).toBe(true);
    expect(databaseConfig.entities).toEqual([]);
  });

  it('uses migration globs when flag is unset', async () => {
    delete process.env.ZEPHIX_ORM_SKIP_MIGRATION_GLOBS;
    const { databaseConfig } = await import('./database.config');
    const m = databaseConfig.migrations as string[];
    expect(Array.isArray(m)).toBe(true);
    expect(m.length).toBeGreaterThan(0);
    expect(databaseConfig.autoLoadEntities).not.toBe(true);
    expect(Array.isArray(databaseConfig.entities)).toBe(true);
    expect((databaseConfig.entities as string[]).length).toBeGreaterThan(0);
  });
});
