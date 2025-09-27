module.exports = {
  env: {
    es2021: true,
    node: true,
    jest: true
  },
  extends: ['eslint:recommended', 'plugin:import/recommended', 'plugin:jsdoc/recommended', 'plugin:prettier/recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    'import/order': ['error', { 'newlines-between': 'always' }],
    'jsdoc/require-jsdoc': 'off'
  }
};
