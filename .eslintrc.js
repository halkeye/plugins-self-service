module.exports = {
  parserOptions: {
    ecmaVersion: 2019,
    sourceType: 'module'
  },
  extends: [
    'eslint:recommended',
    'standard'
  ],
  env: {
    es6: true,
    browser: true
  },
  plugins: [
    'svelte3',
    'import'
  ],
  overrides: [
    {
      files: ['*.svelte'],
      processor: 'svelte3/svelte3',
      rules: {
        'no-multiple-empty-lines': 0
      }
    }
  ],
  rules: {
    semi: ['error', 'always']
  },
  settings: {
    // ...
  }
};
