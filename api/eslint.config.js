import js from '@eslint/js';
import pluginImport from 'eslint-plugin-import';
import pluginPrettier from 'eslint-plugin-prettier';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

const tsRecommended = tsPlugin.configs['flat/recommended'];

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'prisma/**'],
  },
  js.configs.recommended,
  pluginImport.flatConfigs.recommended,
  ...(Array.isArray(tsRecommended) ? tsRecommended : [tsRecommended]),
  {
    files: ['**/*.{ts,tsx,js}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      prettier: pluginPrettier,
    },
    settings: {
      'import/resolver': {
        typescript: { alwaysTryTypes: true },
      },
    },
    rules: {
      'prettier/prettier': ['error'],
      'import/extensions': [
        'error',
        'ignorePackages',
        { ts: 'never', tsx: 'never', js: 'never' },
      ],
      'import/no-unresolved': 'error',
      'import/no-named-as-default': 'off',
      'import/no-named-as-default-member': 'off',
      'import/order': ['error', { 'newlines-between': 'always' }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'off',
      'prefer-const': 'off',
    },
  },
  {
    files: ['**/*.d.ts'],
    rules: {
      'import/no-unresolved': 'off',
    },
  },
  {
    files: ['**/*.js'],
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
    },
  },
  {
    files: ['src/tests/**/*.{ts,tsx,js}'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
];
