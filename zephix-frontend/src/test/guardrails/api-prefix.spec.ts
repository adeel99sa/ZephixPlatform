import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { glob } from 'glob';

describe('API Prefix Guardrails', () => {
  it('no bare fetch/axios without /api prefix', async () => {
    const files = await glob('src/**/*.{ts,tsx}', { 
      cwd: process.cwd(),
      ignore: ['src/test/**', 'src/**/*.test.*', 'src/**/*.spec.*']
    });
    
    const offenders: string[] = [];
    
    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf8');
        
        // Check for bare fetch calls without /api prefix
        const badFetch = /fetch\(\s*['"`]\/(?!api\/)/.test(content);
        
        // Check for bare axios calls without /api prefix
        const badAxios = /axios\.(get|post|patch|put|delete)\(\s*['"`]\/(?!api\/)/.test(content);
        
        // Check for fetch calls with variables that might not have /api
        const suspiciousFetch = /fetch\(\s*[^'"`\s]/.test(content);
        
        if (badFetch || badAxios || suspiciousFetch) {
          offenders.push(file);
        }
      } catch (error) {
        // Skip files that can't be read
        console.warn(`Could not read file ${file}:`, error);
      }
    }
    
    if (offenders.length > 0) {
      console.error('Files with potential bare API calls:', offenders);
    }
    
    expect(offenders).toEqual([]);
  });
});
