import js from '@eslint/js';
export default [
  js.configs.recommended,
  {
    files: ['src/**/*.js', 'js/**/*.js'],
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
      'semi': ['error', 'always'],
      'quotes': ['error', 'single'],
      'indent': ['error', 2],
      'prefer-const': 'error',
      'eqeqeq': 'error'
    }
  }
];
