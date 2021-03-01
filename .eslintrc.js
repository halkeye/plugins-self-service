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
        'import/first': 0,
        'import/no-duplicates': 0,
        'import/no-mutable-exports': 0,
        'import/no-unresolved': 0,
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
