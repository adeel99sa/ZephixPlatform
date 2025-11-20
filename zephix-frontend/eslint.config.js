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

      // Import rules
      'import/order': ['error', {
        'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
      }],

      // Enforce single HTTP client - block direct axios imports
      'no-restricted-imports': ['error', {
        paths: [
          {
            name: 'axios',
            message: 'Use the centralized API client from @/lib/api instead of importing axios directly.',
            importNames: ['default'],
          },
          {
            name: '@/components/create/GlobalCreateMenu',
            message: 'Global creation is forbidden. Use workspace-scoped creation.',
          },
          {
            name: '@/components/dashboards/DashboardsSwitcher',
            message: 'Global dashboards switching is forbidden. Use workspace-first navigation.',
          },
          {
            name: '@/components/shell/UserAvatarMenu',
            message: 'Header user menu is forbidden. Use the sidebar account block.',
          },
        ],
        patterns: [
          {
            group: ['**/GlobalNew*', '**/GlobalCreate*', '**/DashboardsMenu*'],
            message: 'Global creation/switching patterns are forbidden.',
          },
        ],
      }],
    },
  },
  {
    // Override for central API client only - allow axios usage
    files: ['src/lib/api.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
], storybook.configs["flat/recommended"]);
