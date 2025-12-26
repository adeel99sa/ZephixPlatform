// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', '**/*.spec.ts', '**/*.test.ts'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      // Phase 2a: Block tenant scoping bypass patterns in modules
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@nestjs/typeorm',
              importNames: ['InjectRepository'],
              message:
                'Use TenantAwareRepository instead of @InjectRepository. Import from tenancy module.',
            },
          ],
          patterns: [
            {
              group: ['typeorm'],
              message:
                'Direct TypeORM imports are forbidden in modules. Use TenantAwareRepository from tenancy module.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'CallExpression[callee.property.name="getRepository"][callee.object.name="dataSource"]',
          message:
            'DataSource.getRepository is forbidden. Use TenantAwareRepository provider.',
        },
        {
          selector:
            'CallExpression[callee.property.name="query"][callee.object.name="dataSource"]',
          message:
            'DataSource.query is forbidden. Use TenantAwareRepository query builder.',
        },
        {
          selector:
            'CallExpression[callee.property.name="query"][callee.object.name="manager"]',
          message:
            'EntityManager.query is forbidden. Use TenantAwareRepository query builder.',
        },
        {
          selector:
            'CallExpression[callee.name="createQueryRunner"]',
          message:
            'QueryRunner usage is forbidden outside infra modules. Use TenantAwareRepository.',
        },
        {
          selector:
            'MemberExpression[object.name="req"][property.name="user"]',
          message:
            'Direct req.user access is forbidden. Use getAuthContext(req) from common/http/get-auth-context.',
        },
      ],
    },
  },
  // Allow bypass patterns only in specific directories
  {
    files: [
      '**/tenancy/**',
      '**/database/**',
      '**/migrations/**',
      '**/scripts/**',
      '**/config/**',
    ],
    rules: {
      'no-restricted-imports': 'off',
      'no-restricted-syntax': 'off',
    },
  },
  // Allow req.user access in the helper files themselves
  {
    files: [
      '**/common/http/get-auth-context.ts',
      '**/common/http/get-auth-context-optional.ts',
    ],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
);
