let OFF = 0;
let ERROR = 2;

module.exports = {
  rules: {
    '@typescript-eslint/explicit-function-return-type': OFF,
    '@typescript-eslint/explicit-module-boundary-types': OFF,
    'import/order': ERROR,
    'import/first': ERROR,
    'import/no-default-export': ERROR,
    'prettier/prettier': ['error', { singleQuote: true }],
    'no-console': [ERROR, { allow: ['error'] }],
    eqeqeq: 'error',
  },
  overrides: [
    {
      files: ['*.js'],
      parser: 'espree',
    },
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  plugins: ['prettier', 'import', '@typescript-eslint'],
  env: { node: true },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    project: ['./tsconfig.json'],
  },
};
