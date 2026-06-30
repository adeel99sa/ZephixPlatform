// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import importPlugin from 'eslint-plugin-import'

export default tseslint.config([
  { ignores: ['dist', 'node_modules', 'coverage', 'storybook-static'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'jsx-a11y': jsxA11y,
      'import': importPlugin,
    },
    rules: {
      // TypeScript rules
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',

      // React rules
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Accessibility rules
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-proptypes': 'error',
      'jsx-a11y/aria-unsupported-elements': 'error',
      'jsx-a11y/role-has-required-aria-props': 'error',
      'jsx-a11y/role-supports-aria-props': 'error',

      // Auth: never gate access by comparing user identifiers (email) to string literals.
      // Use platform RBAC helpers (see utils/roles.ts, utils/access.ts, App.tsx guards).
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "BinaryExpression[operator='==='][left.type='MemberExpression'][left.property.name='email'][right.type='Literal']",
          message:
            'Do not use email string equality for authentication or authorization. Use platform RBAC (e.g. platformRoleFromUser, isPlatformAdmin, isAdminRole).',
        },
      ],

      // Import rules
      'import/order': ['error', {
        'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
      }],

      // Prevent importing deprecated work-items API (deleted in Wave 0)
      // Allowed: ProjectTasksList.tsx
      'no-restricted-imports': ['error', {
        'paths': [
          {
            'name': '@/services/api',
            'message': 'DEPRECATED: Use @/lib/api instead. See import cleanup migration.',
          },
          {
            'name': 'axios',
            'message': 'Use the shared axios instance from @/lib/api instead of direct axios imports.',
          },
          {
            'name': '@/components/layouts/admin-nav.config',
            'message': 'DELETED in Phase 4E: Use layouts/AdminLayout.tsx buildAdminNavItems as single source.',
          },
          {
            'name': '@/components/layouts/AdminLayout',
            'message': 'DELETED in Phase 4E: Use layouts/AdminLayout.tsx as the canonical admin layout.',
          },
          {
            'name': '@/pages/admin/AdminLayout',
            'message': 'DELETED in Phase 4E: Use layouts/AdminLayout.tsx as the canonical admin layout.',
          },
        ],
      }],
    },
  },
  // Allow axios in lib/api files (they define the shared instance) and files that need axios types
  {
    files: [
      '**/src/lib/api.ts',
      '**/src/lib/api/**/*.ts',
      '**/src/lib/__tests__/**/*.ts',
      '**/src/features/workspaces/api/workspace-invite.api.ts', // Uses type-only axios import
    ],
    rules: {
      'no-restricted-imports': ['error', {
        'paths': [
          {
            'name': '@/services/api',
            'message': 'DEPRECATED: Use @/lib/api instead. See import cleanup migration.',
          },
          // axios is allowed in lib/api files and type imports
          {
            'name': '@/components/layouts/admin-nav.config',
            'message': 'DELETED in Phase 4E: Use layouts/AdminLayout.tsx buildAdminNavItems as single source.',
          },
          {
            'name': '@/components/layouts/AdminLayout',
            'message': 'DELETED in Phase 4E: Use layouts/AdminLayout.tsx as the canonical admin layout.',
          },
          {
            'name': '@/pages/admin/AdminLayout',
            'message': 'DELETED in Phase 4E: Use layouts/AdminLayout.tsx as the canonical admin layout.',
          },
        ],
      }],
    },
  },
  // Theme D Phase 1: enforce canonical role helpers on high-risk surfaces.
  {
    files: [
      '**/src/features/admin/**/*.{ts,tsx}',
      '**/src/features/administration/**/*.{ts,tsx}',
      '**/src/features/workspaces/**/*.{ts,tsx}',
      '**/src/pages/auth/**/*.{ts,tsx}',
      '**/src/App.tsx',
    ],
    rules: {
      // Rule A (ERROR): Ban raw role string equality checks.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "BinaryExpression[operator='==='][left.type='MemberExpression'][left.property.name='role'][right.type='Literal'][right.value='ADMIN']",
          message: 'Use canonical RBAC helpers instead of raw role string equality.',
        },
        {
          selector:
            "BinaryExpression[operator='==='][left.type='MemberExpression'][left.property.name='role'][right.type='Literal'][right.value='MEMBER']",
          message: 'Use canonical RBAC helpers instead of raw role string equality.',
        },
        {
          selector:
            "BinaryExpression[operator='==='][left.type='MemberExpression'][left.property.name='role'][right.type='Literal'][right.value='VIEWER']",
          message: 'Use canonical RBAC helpers instead of raw role string equality.',
        },
        {
          selector:
            "BinaryExpression[operator='==='][left.type='MemberExpression'][left.property.name='role'][right.type='Literal'][right.value='OWNER']",
          message: 'Use canonical RBAC helpers instead of raw role string equality.',
        },
        {
          selector:
            "BinaryExpression[operator='==='][left.type='MemberExpression'][left.property.name='role'][right.type='Literal'][right.value='GUEST']",
          message: 'Use canonical RBAC helpers instead of raw role string equality.',
        },
        {
          selector:
            "BinaryExpression[operator='==='][left.type='MemberExpression'][left.property.name='role'][right.type='Literal'][right.value='workspace_owner']",
          message: 'Use canonical workspace helper APIs instead of raw role string equality.',
        },
        {
          selector:
            "BinaryExpression[operator='==='][left.type='MemberExpression'][left.property.name='role'][right.type='Literal'][right.value='workspace_member']",
          message: 'Use canonical workspace helper APIs instead of raw role string equality.',
        },
        {
          selector:
            "BinaryExpression[operator='==='][left.type='MemberExpression'][left.property.name='role'][right.type='Literal'][right.value='workspace_viewer']",
          message: 'Use canonical workspace helper APIs instead of raw role string equality.',
        },
      ],
      // Rule B (WARN): Discourage direct role comparisons; prefer helpers.
      'no-restricted-properties': [
        'warn',
        {
          object: 'user',
          property: 'role',
          message: 'Avoid direct user.role checks; use platformRoleFromUser/isPlatformAdmin.',
        },
      ],
    },
  },
], storybook.configs["flat/recommended"]);
