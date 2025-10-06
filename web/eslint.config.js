import js from '@eslint/js';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import prettierPlugin from 'eslint-plugin-prettier';

const reactHooksRecommended = reactHooksPlugin.configs.recommended;
const tsRecommended = tsPlugin.configs['flat/recommended'];

export default [
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  js.configs.recommended,
  reactPlugin.configs.flat.recommended,
  ...(Array.isArray(tsRecommended) ? tsRecommended : [tsRecommended]),
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      'react-hooks': reactHooksPlugin,
      prettier: prettierPlugin,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...reactHooksRecommended.rules,
      'prettier/prettier': ['error'],
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },
  },
  {
    files: ['src/**/*.{test,spec}.{ts,tsx,js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
];
