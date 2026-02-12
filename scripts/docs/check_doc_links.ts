#!/usr/bin/env npx ts-node
/**
 * Documentation Link Checker
 * 
 * Scans the repository for references to doc paths and reports broken links.
 * Usage: npx ts-node scripts/docs/check_doc_links.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const REPO_ROOT = path.resolve(__dirname, '../..');

interface LinkIssue {
  file: string;
  line: number;
  link: string;
  issue: string;
}

const EXTENSIONS_TO_CHECK = ['.md', '.ts', '.tsx', '.yml', '.yaml', '.json'];
const IGNORE_PATTERNS = [
  'node_modules',
  'dist',
  '.git',
  'coverage',
  '.next',
  '.turbo',
];

function shouldIgnore(filePath: string): boolean {
  return IGNORE_PATTERNS.some(pattern => filePath.includes(pattern));
}

function findAllFiles(dir: string, extensions: string[]): string[] {
  const files: string[] = [];
  
  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (shouldIgnore(fullPath)) continue;
      
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }
  
  walk(dir);
  return files;
}

function extractMarkdownLinks(content: string): Array<{ link: string; line: number }> {
  const links: Array<{ link: string; line: number }> = [];
  const lines = content.split('\n');
  
  // Match [text](link) and bare paths like ./docs/FILE.md or ../docs/FILE.md
  const linkRegex = /\[([^\]]*)\]\(([^)]+)\)|(?:^|\s)(\.\.?\/[^\s)]+\.md)/g;
  
  lines.forEach((line, index) => {
    let match;
    while ((match = linkRegex.exec(line)) !== null) {
      const link = match[2] || match[3];
      if (link && !link.startsWith('http') && !link.startsWith('#')) {
        links.push({ link: link.split('#')[0], line: index + 1 });
      }
    }
  });
  
  return links;
}

function extractDocImports(content: string): Array<{ link: string; line: number }> {
  const links: Array<{ link: string; line: number }> = [];
  const lines = content.split('\n');
  
  // Match import statements and require calls with .md paths
  const importRegex = /(?:import|require)\s*\(?['"]([^'"]+\.md)['"]\)?/g;
  
  lines.forEach((line, index) => {
    let match;
    while ((match = importRegex.exec(line)) !== null) {
      links.push({ link: match[1], line: index + 1 });
    }
  });
  
  return links;
}

function checkLinks(): void {
  console.log('=== Documentation Link Checker ===\n');
  console.log(`Scanning: ${REPO_ROOT}\n`);
  
  const files = findAllFiles(REPO_ROOT, EXTENSIONS_TO_CHECK);
  console.log(`Found ${files.length} files to check\n`);
  
  const issues: LinkIssue[] = [];
  let checkedLinks = 0;
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const relativePath = path.relative(REPO_ROOT, file);
    const fileDir = path.dirname(file);
    
    // Extract links based on file type
    let links: Array<{ link: string; line: number }> = [];
    
    if (file.endsWith('.md')) {
      links = extractMarkdownLinks(content);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      links = extractDocImports(content);
    }
    
    for (const { link, line } of links) {
      checkedLinks++;
      
      // Resolve relative path
      let resolvedPath: string;
      if (link.startsWith('/')) {
        resolvedPath = path.join(REPO_ROOT, link);
      } else {
        resolvedPath = path.resolve(fileDir, link);
      }
      
      // Check if file exists
      if (!fs.existsSync(resolvedPath)) {
        // Check for stub
        const stubPath = resolvedPath;
        if (!fs.existsSync(stubPath)) {
          issues.push({
            file: relativePath,
            line,
            link,
            issue: 'File not found and no stub exists',
          });
        }
      }
    }
  }
  
  console.log(`Checked ${checkedLinks} links\n`);
  
  if (issues.length === 0) {
    console.log('✓ No broken links found!\n');
    process.exit(0);
  } else {
    console.log(`✗ Found ${issues.length} broken links:\n`);
    
    // Group by file
    const byFile = new Map<string, LinkIssue[]>();
    for (const issue of issues) {
      const existing = byFile.get(issue.file) || [];
      existing.push(issue);
      byFile.set(issue.file, existing);
    }
    
    for (const [file, fileIssues] of byFile) {
      console.log(`${file}:`);
      for (const issue of fileIssues) {
        console.log(`  Line ${issue.line}: ${issue.link}`);
        console.log(`    → ${issue.issue}`);
      }
      console.log('');
    }
    
    // Output summary
    console.log('=== Summary ===');
    console.log(`Files with issues: ${byFile.size}`);
    console.log(`Total broken links: ${issues.length}`);
    console.log('\nFix these issues before proceeding with deletion.');
    
    process.exit(1);
  }
}

// Main execution
checkLinks();
