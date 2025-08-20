import { Test, TestingModule } from '@nestjs/testing';
import { BRDValidationService } from '../brd-validation.service';
import * as seedData from '../../schema/brd.seed.json';

describe('BRDValidationService', () => {
  let service: BRDValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BRDValidationService],
    }).compile();

    service = module.get<BRDValidationService>(BRDValidationService);

    // Initialize the service (normally done by onModuleInit)
    service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validate', () => {
    it('should validate valid seed data successfully', () => {
      const result = service.validate(seedData);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject payload with missing required metadata', () => {
      const invalidPayload = {
        businessContext: {
          problemStatement: 'Some problem',
          businessObjective: 'Some objective',
        },
        functionalRequirements: [
          {
            id: 'FR-001',
            title: 'Test requirement',
            description: 'Test description',
            priority: 'Must Have',
            acceptanceCriteria: ['Test criteria'],
          },
        ],
      };

      const result = service.validate(invalidPayload);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.path.includes('metadata'))).toBe(true);
    });

    it('should reject payload with invalid email format', () => {
      const invalidPayload = {
        ...seedData,
        metadata: {
          ...seedData.metadata,
          documentOwner: {
            name: 'John Doe',
            email: 'invalid-email',
            role: 'Manager',
          },
        },
      };

      const result = service.validate(invalidPayload);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('email'))).toBe(true);
    });

    it('should reject payload with invalid enum values', () => {
      const invalidPayload = {
        ...seedData,
        metadata: {
          ...seedData.metadata,
          department: 'InvalidDepartment',
        },
      };

      const result = service.validate(invalidPayload);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.message.includes('Must be one of')),
      ).toBe(true);
    });

    it('should reject payload with string too short', () => {
      const invalidPayload = {
        ...seedData,
        metadata: {
          ...seedData.metadata,
          title: 'ab', // Too short (min 3 characters)
        },
      };

      const result = service.validate(invalidPayload);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('at least'))).toBe(
        true,
      );
    });

    it('should reject payload with invalid functional requirement ID pattern', () => {
      const invalidPayload = {
        ...seedData,
        functionalRequirements: [
          {
            id: 'INVALID-001', // Should be FR-001 format
            title: 'Test requirement',
            description: 'Test description with enough characters',
            priority: 'Must Have',
            acceptanceCriteria: ['Test criteria'],
          },
        ],
      };

      const result = service.validate(invalidPayload);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('pattern'))).toBe(
        true,
      );
    });

    it('should reject payload with array exceeding max items', () => {
      const invalidPayload = {
        ...seedData,
        metadata: {
          ...seedData.metadata,
          tags: new Array(25).fill('tag'), // Max 20 items allowed
        },
      };

      const result = service.validate(invalidPayload);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.message.includes('no more than')),
      ).toBe(true);
    });
  });

  describe('validateOrThrow', () => {
    it('should not throw for valid payload', () => {
      expect(() => {
        service.validateOrThrow(seedData);
      }).not.toThrow();
    });

    it('should throw for invalid payload', () => {
      const invalidPayload = {
        metadata: {
          title: 'ab', // Too short
        },
      };

      expect(() => {
        service.validateOrThrow(invalidPayload);
      }).toThrow('BRD validation failed');
    });
  });

  describe('getSchema', () => {
    it('should return the JSON schema', () => {
      const schema = service.getSchema();

      expect(schema).toBeDefined();
      expect(schema.$schema).toBe(
        'https://json-schema.org/draft/2020-12/schema',
      );
      expect(schema.title).toBe('Business Requirements Document Schema');
    });
  });

  describe('getValidationSummary', () => {
    it('should return summary for valid payload', () => {
      const summary = service.getValidationSummary(seedData);

      expect(summary.isValid).toBe(true);
      expect(summary.errorCount).toBe(0);
      expect(summary.errorsBySection).toEqual({});
      expect(summary.missingRequiredFields).toHaveLength(0);
    });

    it('should return summary for invalid payload', () => {
      const invalidPayload = {
        businessContext: {
          problemStatement: 'Problem',
          businessObjective: 'Objective',
        },
        functionalRequirements: [
          {
            id: 'INVALID',
            title: 'ab', // Too short
            description: 'Test',
            priority: 'InvalidPriority',
            acceptanceCriteria: ['Test'],
          },
        ],
      };

      const summary = service.getValidationSummary(invalidPayload);

      expect(summary.isValid).toBe(false);
      expect(summary.errorCount).toBeGreaterThan(0);
      expect(Object.keys(summary.errorsBySection).length).toBeGreaterThan(0);
      expect(summary.missingRequiredFields.length).toBeGreaterThan(0);
    });
  });

  describe('formatErrorPath', () => {
    it('should format simple paths correctly', () => {
      const error = {
        instancePath: '/metadata/title',
        schemaPath: '#/properties/metadata/properties/title/minLength',
        keyword: 'minLength',
        params: { limit: 3 },
        message: 'must NOT have fewer than 3 characters',
        data: 'ab',
      };

      const result = service.validate({ metadata: { title: 'ab' } });

      expect(result.errors[0].path).toBe('metadata.title');
    });

    it('should format array paths correctly', () => {
      const invalidPayload = {
        ...seedData,
        functionalRequirements: [
          {
            id: 'FR-001',
            title: 'ab', // Too short
            description: 'Test description',
            priority: 'Must Have',
            acceptanceCriteria: ['Test'],
          },
        ],
      };

      const result = service.validate(invalidPayload);
      const titleError = result.errors.find(
        (e) =>
          e.path.includes('functionalRequirements') && e.path.includes('title'),
      );

      expect(titleError?.path).toMatch(/functionalRequirements\.\d+\.title/);
    });
  });

  describe('formatErrorMessage', () => {
    it('should format different error types correctly', () => {
      const testCases = [
        {
          payload: { metadata: { title: 'ab' } }, // Too short
          expectedMessage: /at least.*characters/,
        },
        {
          payload: {
            metadata: { title: 'Valid title', department: 'Invalid' },
          }, // Invalid enum
          expectedMessage: /Must be one of/,
        },
        {
          payload: {
            metadata: {
              title: 'Valid title',
              documentOwner: {
                name: 'John Doe',
                email: 'invalid-email',
                role: 'Manager',
              },
            },
          }, // Invalid email format
          expectedMessage: /Invalid.*format/,
        },
      ];

      testCases.forEach(({ payload, expectedMessage }) => {
        const result = service.validate(payload);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => expectedMessage.test(e.message))).toBe(
          true,
        );
      });
    });
  });
});
