import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";

function runLint(code: string, fileName: string): { output: string; exitCode: number } {
  try {
    const output = execSync(
      `printf '%s\\n' "${code.replace(/"/g, '\\"')}" | npx eslint --stdin --stdin-filename "${fileName}"`,
      { encoding: "utf8", cwd: process.cwd(), stdio: "pipe" },
    );
    return { output, exitCode: 0 };
  } catch (error) {
    const output =
      error && typeof error === "object" && "stdout" in error
        ? String((error as { stdout?: unknown }).stdout ?? "")
        : "";
    const exitCode =
      error && typeof error === "object" && "status" in error
        ? Number((error as { status?: unknown }).status ?? 1)
        : 1;
    return { output, exitCode };
  }
}

describe("RBAC lint enforcement rules", () => {
  it("flags raw role string equality as an error", () => {
    const result = runLint(
      "const bad = user.role === 'ADMIN';",
      "src/features/admin/__lint-smoke-bad.tsx",
    );
    expect(result.exitCode).not.toBe(0);
    expect(result.output).toContain("no-restricted-syntax");
  });

  it("flags raw role equality under features/administration (Rule A extension WS-LINT-RULE-A-EXTENSION)", () => {
    const result = runLint(
      "const bad = user.role === 'ADMIN';",
      "src/features/administration/__lint-smoke-bad.tsx",
    );
    expect(result.exitCode).not.toBe(0);
    expect(result.output).toContain("no-restricted-syntax");
  });

  it("warns on direct user.role comparisons", () => {
    const result = runLint(
      "const maybe = user.role === roleFromApi;",
      "src/features/workspaces/__lint-smoke-warn.tsx",
    );
    expect(result.output).toContain("no-restricted-properties");
  });

  it("does not flag canonical helper usage with RBAC rule ids", () => {
    const result = runLint(
      "const user = { platformRole: 'ADMIN' }; const ok = isPlatformAdmin(user);",
      "src/features/admin/__lint-smoke-ok.tsx",
    );
    expect(result.output).not.toContain("no-restricted-syntax");
    expect(result.output).not.toContain("no-restricted-properties");
  });
});
