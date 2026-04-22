/**
 * Phase 4.7.2 — sidebar workspace tree, child label truthfulness lock.
 *
 * Defensive invariants. The previous "generic Projects row appearing under
 * Cloud Team" defect was actually the standalone <NavLink to="/projects">
 * in Sidebar.tsx (removed in Phase 4.7.1). The render path inside
 * SidebarWorkspaces never had a "Projects" fallback — but until this file
 * existed, nothing in the test suite proved that. These invariants pin the
 * locked left-panel rules so the bug can never come back through either
 * file.
 *
 * Locked rules covered here:
 *
 *  Rule 3 — Child rows under a workspace are real entities only; never a
 *           generic "Projects" placeholder; if zero projects, render nothing
 *           extra (other than the "No projects yet" empty hint).
 *  Rule 4 — Project rows: click → /projects/:id; label = real project name.
 *  Rule 5 — "Projects" / "Dashboards" are section headers, not workspace
 *           child nodes.
 *  Rule 6 — Last-resort label is "Untitled project", never "Projects".
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SOURCE = join(__dirname, '..', 'SidebarWorkspaces.tsx');
const SIDEBAR = join(__dirname, '..', '..', '..', 'components', 'shell', 'Sidebar.tsx');

describe('Phase 4.7.2 — child label truthfulness', () => {
  const src = readFileSync(SOURCE, 'utf8');

  it('child row label is rendered from the real backend project name only', () => {
    // The map renders {realName}, where realName is derived from p.name.trim()
    // and falls back to 'Untitled project' only if p.name is missing.
    expect(src).toMatch(/const realName =\s*\n?\s*typeof p\.name === 'string' && p\.name\.trim\(\)\.length > 0/);
    expect(src).toMatch(/\?\s*p\.name\.trim\(\)/);
    expect(src).toMatch(/:\s*'Untitled project'/);
    // The JSX renders {realName}, not {p.name} unguarded.
    expect(src).toMatch(/\{realName\}/);
  });

  it('child render block contains no "Projects" string literal used as a label', () => {
    // Scope the check to the child render map — wider file-scope checks
    // false-positive on doc comments. Inside the children block we want
    // zero hardcoded display strings except the legitimate fallback
    // "Untitled project".
    const childrenBlock = src.match(
      /childrenLoaded\.map\(\(p\)[\s\S]*?\)\s*\)\s*\}/,
    );
    expect(childrenBlock).not.toBeNull();
    // Strip JS line and block comments so a doc comment that mentions the
    // forbidden literal (which is the rule itself, not a violation) does
    // not trip the check.
    const blockWithoutComments = (childrenBlock?.[0] ?? '')
      .replace(/\/\/[^\n]*\n/g, '\n')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    expect(blockWithoutComments).not.toMatch(/['"`]Projects['"`]/);
    // The only allowed hardcoded label inside the block is the fallback.
    expect(blockWithoutComments).toMatch(/'Untitled project'/);
  });

  it('the JSX child block does not contain the word "Projects" as visible text', () => {
    // Pull the children block out and assert it never spells "Projects" as
    // direct JSX text. (Substrings like "workspace-child-project-" come
    // from testid attributes; this scope check finds bare ">Projects<".)
    expect(src).not.toMatch(/>\s*Projects\s*</);
  });

  it('empty workspace renders only a non-interactive "No projects yet" hint, never a clickable placeholder row', () => {
    // Sidebar freeze addendum (rule 5): a muted empty-state hint is
    // allowed, but it MUST NOT look or behave like a clickable project
    // row — no <button>, no onClick, no role, no <a>, no anchor href,
    // and no `workspace-child-project-` testid in the empty branch.
    expect(src).toMatch(/childrenLoaded\.length === 0/);
    expect(src).toMatch(/No projects yet/);

    const emptyBlock = src.match(
      /childrenLoaded\.length === 0 && \([\s\S]*?\)\s*\}/,
    );
    expect(emptyBlock).not.toBeNull();
    const block = emptyBlock?.[0] ?? '';

    // Strip JS comments so doc comments mentioning the rule do not
    // false-positive on the literal checks below.
    const blockNoComments = block
      .replace(/\/\/[^\n]*\n/g, '\n')
      .replace(/\/\*[\s\S]*?\*\//g, '');

    expect(blockNoComments).not.toMatch(/workspace-child-project-/);
    expect(blockNoComments).not.toMatch(/<button\b/);
    expect(blockNoComments).not.toMatch(/onClick/);
    expect(blockNoComments).not.toMatch(/<a\s/);
    expect(blockNoComments).not.toMatch(/role=/);

    // The empty hint exists and carries an explicit testid so future
    // refactors cannot accidentally upgrade it into a clickable row.
    expect(blockNoComments).toMatch(/workspace-children-empty-/);
  });

  it('project row click navigates to /projects/:id, never to /projects', () => {
    // Each child row must navigate to the *specific* project, not to a
    // generic /projects index page (which would be the section view).
    expect(src).toMatch(/navigate\(`\/projects\/\$\{p\.id\}`\)/);
    // No bare navigate('/projects') inside the children block
    expect(src).not.toMatch(/navigate\(['"]\/projects['"]\)/);
  });

  it('project row carries no plus button (rule 4: ellipsis only on project rows)', () => {
    // The child render block uses a single <button> wrapping the row, no
    // additional Plus icon button is created inside the children map.
    const childrenBlock = src.match(
      /childrenLoaded\.map\(\(p\)[\s\S]*?\)\s*\)\s*\}/,
    );
    expect(childrenBlock).not.toBeNull();
    expect(childrenBlock?.[0]).not.toMatch(/<Plus\b/);
  });
});

describe('Phase 4.7.2 — Sidebar.tsx must not surface a section-header "Projects" nav link', () => {
  const sidebar = readFileSync(SIDEBAR, 'utf8');

  it('the standalone ws-nav-projects link stays removed', () => {
    expect(sidebar).not.toMatch(/data-testid=['"]ws-nav-projects['"]/);
  });

  it('Sidebar.tsx no longer derives hasProjects (the gate for the removed link)', () => {
    expect(sidebar).not.toMatch(/const hasProjects =/);
  });
});
