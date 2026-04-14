import { BadRequestException } from '@nestjs/common';
import { buildValidationError } from '../build-validation-error';

describe('buildValidationError', () => {
  it('does not replace ValidationPipe message for non-whitelist errors (e.g. IsEmail)', () => {
    const ex = new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: 'email must be an email',
      errors: [
        {
          property: 'email',
          constraints: { isEmail: 'email must be an email' },
        },
      ],
    });
    expect(buildValidationError(ex).message).toBe('email must be an email');
  });

  it('uses whitelist wording when forbidNonWhitelisted fires', () => {
    const ex = new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: 'some pipe message',
      errors: [
        {
          property: 'extraField',
          constraints: { whitelistValidation: 'property extraField should not exist' },
        },
      ],
    });
    expect(buildValidationError(ex).message).toBe(
      "property 'extraField' should not exist",
    );
  });
});
