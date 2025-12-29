import * as crypto from 'crypto';

/**
 * Token Hashing Utilities
 *
 * Uses deterministic HMAC-SHA256 for indexed lookups.
 * Never use bcrypt for tokens - it's salted and prevents indexed queries.
 *
 * Security:
 * - Tokens are generated with crypto.randomBytes(32) for 256 bits of entropy
 * - HMAC-SHA256 with server secret prevents token forgery
 * - Base64url encoding for URL-safe tokens
 * - Hex output for database storage (64 chars)
 */
export class TokenHashUtil {
  private static readonly TOKEN_HASH_SECRET = process.env.TOKEN_HASH_SECRET;

  /**
   * Generate a secure random token (base64url encoded)
   */
  static generateRawToken(): string {
    const bytes = crypto.randomBytes(32); // 256 bits of entropy
    return bytes.toString('base64url');
  }

  /**
   * Hash a token using HMAC-SHA256 (deterministic, indexable)
   *
   * @param rawToken - The raw token string
   * @returns Hex-encoded hash (64 characters)
   */
  static hashToken(rawToken: string): string {
    if (!this.TOKEN_HASH_SECRET) {
      throw new Error(
        'TOKEN_HASH_SECRET environment variable is required for token hashing',
      );
    }

    if (this.TOKEN_HASH_SECRET.length < 32) {
      throw new Error(
        'TOKEN_HASH_SECRET must be at least 32 characters long',
      );
    }

    const hmac = crypto.createHmac('sha256', this.TOKEN_HASH_SECRET);
    hmac.update(rawToken);
    return hmac.digest('hex'); // 64 character hex string
  }

  /**
   * Verify a token against a hash
   *
   * @param rawToken - The raw token to verify
   * @param hash - The stored hash (hex string)
   * @returns true if token matches hash
   */
  static verifyToken(rawToken: string, hash: string): boolean {
    const computedHash = this.hashToken(rawToken);
    return this.constantTimeEqual(computedHash, hash);
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private static constantTimeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }
}

