import { readdirSync, readFileSync } from "fs";
import { join } from "path";

function allFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap(d => d.isDirectory() ? allFiles(join(dir, d.name)) : [join(dir, d.name)]);
}

test("no raw fetch outside tests/mocks", () => {
  const files = allFiles("src").filter(f => !/(__tests__|__mocks__|\.spec\.|\.test\.)/.test(f));
  const offenders = files.filter(f => {
    const content = readFileSync(f, "utf8");
    // Look for actual fetch() calls, not refetch() or other functions
    return /[^a-zA-Z]fetch\s*\(/.test(content);
  });
  expect(offenders).toEqual([]);
});