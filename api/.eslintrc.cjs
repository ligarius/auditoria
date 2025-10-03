/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: { node: true, es2022: true },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: false,
  },
  plugins: ['@typescript-eslint', 'import', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:prettier/recommended',
  ],
  settings: {
    'import/resolver': {
      typescript: { alwaysTryTypes: true },
    },
  },
  rules: {
    'prettier/prettier': ['error'],
    'import/extensions': ['error', 'ignorePackages', { ts: 'never', tsx: 'never', js: 'never' }],
    'import/no-unresolved': 'error',
    'import/no-named-as-default': 'off',
    'import/no-named-as-default-member': 'off',
    'import/order': ['error', { 'newlines-between': 'always' }],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-non-null-asserted-optional-chain': 'off',
    'prefer-const': 'off',
  },
  overrides: [
    { files: ['**/*.d.ts'], rules: { 'import/no-unresolved': 'off' } },
    { files: ['**/*.js'], rules: { '@typescript-eslint/no-var-requires': 'off' } },
    { files: ['src/tests/**/*'], env: { jest: true } },
  ],
  ignorePatterns: ['dist/**', 'node_modules/**'],
};
