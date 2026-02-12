#!/usr/bin/env npx ts-node
/**
 * Documentation Merge Script
 * 
 * Merges multiple source docs into canonical target files.
 * Usage: npx ts-node scripts/docs/merge_docs.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const REPO_ROOT = path.resolve(__dirname, '../..');
const CONFIG_PATH = path.join(__dirname, 'merge-config.json');

interface MergeConfig {
  merges: Array<{
    target: string;
    sources: string[];
    title: string;
  }>;
  stubs: Array<{
    original: string;
    redirect: string;
  }>;
}

function getGitCommitSha(filePath: string): string {
  try {
    const fullPath = path.join(REPO_ROOT, filePath);
    if (!fs.existsSync(fullPath)) return 'N/A';
    const sha = execSync(`git log -1 --format="%H" -- "${filePath}"`, {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
    }).trim();
    return sha || 'uncommitted';
  } catch {
    return 'uncommitted';
  }
}

function readFileIfExists(filePath: string): string | null {
  const fullPath = path.join(REPO_ROOT, filePath);
  if (fs.existsSync(fullPath)) {
    return fs.readFileSync(fullPath, 'utf-8');
  }
  return null;
}

function mergeDocuments(config: MergeConfig): void {
  console.log('=== Documentation Merge Script ===\n');

  for (const merge of config.merges) {
    console.log(`Merging into: ${merge.target}`);
    
    const targetPath = path.join(REPO_ROOT, merge.target);
    const targetDir = path.dirname(targetPath);
    
    // Ensure target directory exists
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    let content = `# ${merge.title}\n\n`;
    content += `> This is a canonical document. For the latest guidance, refer to this file.\n\n`;
    content += `---\n\n`;

    const sourceNotes: string[] = [];
    let sectionsAdded = 0;

    for (const source of merge.sources) {
      const sourceContent = readFileIfExists(source);
      if (sourceContent) {
        const sha = getGitCommitSha(source);
        const fileName = path.basename(source);
        
        content += `## From: ${fileName}\n\n`;
        
        // Remove duplicate title if present
        let processedContent = sourceContent;
        const titleMatch = processedContent.match(/^#\s+.+\n/);
        if (titleMatch) {
          processedContent = processedContent.replace(titleMatch[0], '');
        }
        
        content += processedContent.trim();
        content += '\n\n---\n\n';
        
        sourceNotes.push(`- \`${source}\` (commit: ${sha.substring(0, 8)})`);
        sectionsAdded++;
        console.log(`  + ${source}`);
      } else {
        console.log(`  - ${source} (not found, skipped)`);
      }
    }

    // Add provenance block
    content += `## Source Notes\n\n`;
    content += `This document was created by merging the following sources:\n\n`;
    content += sourceNotes.join('\n');
    content += `\n\n`;
    content += `*Merged on: ${new Date().toISOString().split('T')[0]}*\n`;

    if (sectionsAdded > 0) {
      fs.writeFileSync(targetPath, content);
      console.log(`  => Created with ${sectionsAdded} sections\n`);
    } else {
      console.log(`  => No sources found, skipped\n`);
    }
  }

  console.log('=== Merge complete ===\n');
}

function createStubs(config: MergeConfig): void {
  console.log('=== Creating Redirect Stubs ===\n');

  for (const stub of config.stubs) {
    const originalPath = path.join(REPO_ROOT, stub.original);
    
    // Only create stub if original exists and will be moved
    if (fs.existsSync(originalPath)) {
      const stubContent = `# Moved\n\n` +
        `This document has been moved to: [${stub.redirect}](${path.relative(path.dirname(stub.original), stub.redirect)})\n\n` +
        `Please update your bookmarks and references.\n`;
      
      // We don't overwrite here - stubs are created after moving
      console.log(`  Stub ready: ${stub.original} -> ${stub.redirect}`);
    }
  }

  console.log('\n=== Stubs prepared ===\n');
}

// Main execution
const config: MergeConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));

console.log('Loaded configuration with:');
console.log(`  - ${config.merges.length} merge targets`);
console.log(`  - ${config.stubs.length} stub redirects\n`);

mergeDocuments(config);
createStubs(config);

console.log('Done! Next steps:');
console.log('1. Review merged documents');
console.log('2. Run: scripts/docs/reorg.sh to move files');
console.log('3. Run: scripts/docs/check_doc_links.ts to validate');
