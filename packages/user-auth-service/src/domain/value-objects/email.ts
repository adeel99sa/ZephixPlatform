/**
 * Email value object with validation and normalization
 */
export class Email {
  private readonly _value: string;

  constructor(value: string) {
    this.validate(value);
    this._value = this.normalize(value);
  }

  /**
   * Gets the email value
   */
  get value(): string {
    return this._value;
  }

  /**
   * Validates email format
   */
  private validate(email: string): void {
    if (!email || typeof email !== 'string') {
      throw new Error('Email must be a non-empty string');
    }

    const trimmedEmail = email.trim();
    if (trimmedEmail.length === 0) {
      throw new Error('Email cannot be empty');
    }

    if (trimmedEmail.length > 254) {
      throw new Error('Email cannot exceed 254 characters');
    }

    // Basic email format validation
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(trimmedEmail)) {
      throw new Error('Invalid email format');
    }

    // Check for valid domain
    const parts = trimmedEmail.split('@');
    if (parts.length !== 2) {
      throw new Error('Invalid email format');
    }

    const domain = parts[1];
    if (!domain || domain.length === 0) {
      throw new Error('Invalid email domain');
    }

    if (domain.length > 253) {
      throw new Error('Email domain too long');
    }

    // Check for valid TLD
    const domainParts = domain.split('.');
    if (domainParts.length < 2) {
      throw new Error('Invalid email domain');
    }

    const tld = domainParts[domainParts.length - 1];
    if (!tld || tld.length === 0) {
      throw new Error('Invalid email TLD');
    }
  }

  /**
   * Normalizes email (lowercase, trim)
   */
  private normalize(email: string): string {
    return email.toLowerCase().trim();
  }

  /**
   * Gets the domain part of the email
   */
  getDomain(): string {
    const parts = this._value.split('@');
    return parts[1] || '';
  }

  /**
   * Gets the local part of the email
   */
  getLocalPart(): string {
    const parts = this._value.split('@');
    return parts[0] || '';
  }

  /**
   * Checks if email is from a disposable domain
   */
  isDisposable(): boolean {
    const disposableDomains = [
      '10minutemail.com',
      'guerrillamail.com',
      'tempmail.org',
      'mailinator.com',
      'yopmail.com'
    ];
    return disposableDomains.includes(this.getDomain());
  }

  /**
   * Checks if email is from a corporate domain
   */
  isCorporate(): boolean {
    const corporateDomains = [
      'gmail.com',
      'yahoo.com',
      'hotmail.com',
      'outlook.com',
      'icloud.com'
    ];
    return !corporateDomains.includes(this.getDomain());
  }

  /**
   * Creates from string
   */
  static fromString(value: string): Email {
    return new Email(value);
  }

  /**
   * Checks if string is valid email
   */
  static isValid(value: string): boolean {
    try {
      new Email(value);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * String representation
   */
  toString(): string {
    return this._value;
  }

  /**
   * Equality check
   */
  equals(other: Email): boolean {
    return this._value === other._value;
  }
} 