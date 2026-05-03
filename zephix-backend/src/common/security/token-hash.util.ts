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
  /** Read at call time so tests and runtime can set env before first hash. */
  private static readTokenHashSecret(): string | undefined {
    return process.env.TOKEN_HASH_SECRET;
  }

  private static readRefreshTokenPepper(): string | undefined {
    return process.env.REFRESH_TOKEN_PEPPER;
  }

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
    const secret = this.readTokenHashSecret();
    if (!secret) {
      throw new Error(
        'TOKEN_HASH_SECRET environment variable is required for token hashing',
      );
    }

    if (secret.length < 32) {
      throw new Error('TOKEN_HASH_SECRET must be at least 32 characters long');
    }

    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(rawToken);
    return hmac.digest('hex'); // 64 character hex string
  }

  /**
   * Hash a refresh token using HMAC-SHA256 with pepper
   * Input = refreshToken + REFRESH_TOKEN_PEPPER
   *
   * @param rawRefreshToken - The raw refresh token string
   * @returns Hex-encoded hash (64 characters)
   */
  static hashRefreshToken(rawRefreshToken: string): string {
    const pepper = this.readRefreshTokenPepper();
    const secret = this.readTokenHashSecret();
    if (!pepper) {
      throw new Error(
        'REFRESH_TOKEN_PEPPER environment variable is required for refresh token hashing',
      );
    }

    if (pepper.length < 32) {
      throw new Error(
        'REFRESH_TOKEN_PEPPER must be at least 32 characters long',
      );
    }

    if (!secret || secret.length < 32) {
      throw new Error(
        'TOKEN_HASH_SECRET environment variable is required for refresh token hashing',
      );
    }

    // Hash input = refreshToken + REFRESH_TOKEN_PEPPER
    const input = rawRefreshToken + pepper;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(input);
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
   * Verify a refresh token against a hash
   *
   * @param rawRefreshToken - The raw refresh token to verify
   * @param hash - The stored hash (hex string)
   * @returns true if token matches hash
   */
  static verifyRefreshToken(rawRefreshToken: string, hash: string): boolean {
    const computedHash = this.hashRefreshToken(rawRefreshToken);
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
