import * as fs from 'fs';
import * as path from 'path';

/**
 * TC-B2 / AD-029 source-integrity guard.
 *
 * Fails if a stop-written field is reintroduced anywhere in the template
 * write paths: (1) persisting `delivery_method` into a template row, or
 * (2) seeding the deprecated `methodology: 'agile'` value. This is the dual of
 * the migration CHECK — it stops the drift at the source, not just the schema.
 */
const ROOT = path.join(__dirname, '..', '..', '..', '..'); // zephix-backend/src → repo/zephix-backend

const WRITE_FILES = [
  'src/bootstrap/system-bootstrap.service.ts',
  'src/scripts/seed-system-templates.ts',
  'src/modules/templates/services/templates.service.ts',
];

const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('AD-029 deprecated-writer guard', () => {
  it.each(WRITE_FILES)(
    'does not persist delivery_method into a template row: %s',
    (rel) => {
      const src = read(rel);
      // create-payload writes: `deliveryMethod: <def|dto|source>.deliveryMethod`
      expect(src).not.toMatch(
        /deliveryMethod:\s*(def|dto|source)\.deliveryMethod/,
      );
      // entity property assignment: `<something>.deliveryMethod = ...`
      expect(src).not.toMatch(/\.deliveryMethod\s*=/);
    },
  );

  it('seed definitions contain no deprecated methodology:"agile"', () => {
    const src = read(
      'src/modules/templates/data/system-template-definitions.ts',
    );
    expect(src).not.toMatch(/methodology:\s*'agile'/);
    // The type union must not offer 'agile' either.
    expect(src).not.toMatch(/methodology:\s*'agile'\s*\|/);
  });
});
