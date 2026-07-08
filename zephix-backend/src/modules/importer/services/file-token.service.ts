import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { randomUUID } from 'crypto';

const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface TokenMeta {
  filePath: string;
  expiresAt: number;
}

// Module-scoped map; lives for the process lifetime, evicted by TTL.
const tokenStore = new Map<string, TokenMeta>();

@Injectable()
export class FileTokenService {
  store(buffer: Buffer): string {
    this.evictExpired();
    const token = randomUUID();
    const filePath = path.join(os.tmpdir(), `zephix-import-${token}.csv`);
    fs.writeFileSync(filePath, buffer);
    tokenStore.set(token, { filePath, expiresAt: Date.now() + TOKEN_TTL_MS });
    return token;
  }

  retrieve(token: string): Buffer | null {
    this.evictExpired();
    const meta = tokenStore.get(token);
    if (!meta) return null;
    if (!fs.existsSync(meta.filePath)) {
      tokenStore.delete(token);
      return null;
    }
    return fs.readFileSync(meta.filePath);
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [token, meta] of tokenStore.entries()) {
      if (meta.expiresAt <= now) {
        try { fs.unlinkSync(meta.filePath); } catch { /* already gone */ }
        tokenStore.delete(token);
      }
    }
  }
}
