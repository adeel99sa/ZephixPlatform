import { IsNotEmpty, Length, Matches } from 'class-validator';

/**
 * Password value object with enterprise security requirements
 * Enforces strong password policies and secure handling
 */
export class Password {
  @IsNotEmpty({ message: 'Password is required' })
  @Length(8, 128, { message: 'Password must be between 8 and 128 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    { message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character' }
  )
  private readonly value: string;

  constructor(password: string) {
    this.value = password;
    this.validate();
  }

  /**
   * Validates the password against security requirements
   * @throws {Error} If password doesn't meet security requirements
   */
  private validate(): void {
    // Check for common weak passwords
    const weakPasswords = [
      'password', '123456', 'qwerty', 'admin', 'user',
      'letmein', 'welcome', 'monkey', 'dragon', 'master'
    ];

    if (weakPasswords.includes(this.value.toLowerCase())) {
      throw new Error('Password is too weak');
    }

    // Check for repeated characters
    if (/(.)\1{2,}/.test(this.value)) {
      throw new Error('Password cannot contain more than 2 repeated characters');
    }

    // Check for sequential characters
    const sequences = ['123', 'abc', 'qwe', 'asd', 'zxc'];
    const lowerValue = this.value.toLowerCase();
    if (sequences.some(seq => lowerValue.includes(seq))) {
      throw new Error('Password cannot contain sequential characters');
    }
  }

  /**
   * Returns the password value (should only be used for hashing)
   * @returns {string} The password value
   */
  public getValue(): string {
    return this.value;
  }

  /**
   * Checks if this password equals another password
   * @param {Password} other - The password to compare with
   * @returns {boolean} True if passwords are equal
   */
  public equals(other: Password): boolean {
    return this.value === other.value;
  }

  /**
   * Creates a Password instance from a string
   * @param {string} password - The password string
   * @returns {Password} Password instance
   */
  public static fromString(password: string): Password {
    return new Password(password);
  }

  /**
   * Generates a secure random password
   * @param {number} length - The length of the password (default: 16)
   * @returns {Password} A new Password instance
   */
  public static generate(length: number = 16): Password {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@$!%*?&';
    let password = '';
    
    // Ensure at least one character from each required category
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // Uppercase
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // Lowercase
    password += '0123456789'[Math.floor(Math.random() * 10)]; // Number
    password += '@$!%*?&'[Math.floor(Math.random() * 7)]; // Special character
    
    // Fill the rest with random characters
    for (let i = 4; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }
    
    // Shuffle the password
    password = password.split('').sort(() => Math.random() - 0.5).join('');
    
    return new Password(password);
  }

  /**
   * Gets password strength score (0-100)
   * @returns {number} Password strength score
   */
  public getStrengthScore(): number {
    let score = 0;
    
    // Length contribution
    score += Math.min(this.value.length * 4, 40);
    
    // Character variety contribution
    if (/[a-z]/.test(this.value)) score += 10;
    if (/[A-Z]/.test(this.value)) score += 10;
    if (/\d/.test(this.value)) score += 10;
    if (/[@$!%*?&]/.test(this.value)) score += 10;
    
    // Bonus for mixed case and numbers
    if (/[a-z]/.test(this.value) && /[A-Z]/.test(this.value)) score += 10;
    if (/\d/.test(this.value) && /[a-zA-Z]/.test(this.value)) score += 10;
    
    return Math.min(score, 100);
  }

  /**
   * Gets password strength level
   * @returns {string} Password strength level
   */
  public getStrengthLevel(): 'weak' | 'medium' | 'strong' | 'very-strong' {
    const score = this.getStrengthScore();
    
    if (score < 40) return 'weak';
    if (score < 60) return 'medium';
    if (score < 80) return 'strong';
    return 'very-strong';
  }
} 