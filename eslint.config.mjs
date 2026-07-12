import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettierPlugin from 'eslint-plugin-prettier'
import vueParser from 'vue-eslint-parser'
import vuePlugin from 'eslint-plugin-vue'

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/.prisma/**',
      '.opencode/**',
      'docs/**',
      'scripts/**',
      'openspec/**',
      '.superpowers/**',
      '.agents/**',
    ],
  },

  js.configs.recommended,

  ...tseslint.configs.recommended,

  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  {
    files: ['**/*.ts', '**/*.vue'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },

  {
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  {
    files: ['**/*.js'],
    rules: {
      'no-undef': 'off',
    },
  },

  {
    files: ['**/*.ts', '**/*.mts'],
    languageOptions: {
      parser: tseslint.parser,
    },
    rules: {
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
          leadingUnderscore: 'allow',
        },
        { selector: 'function', format: ['camelCase'] },
        { selector: 'class', format: ['PascalCase'] },
        { selector: 'interface', format: ['PascalCase'] },
        { selector: 'typeAlias', format: ['PascalCase'] },
        { selector: 'enum', format: ['PascalCase'] },
        { selector: 'method', format: ['camelCase'] },
        { selector: 'property', format: ['camelCase', 'UPPER_CASE'] },
        { selector: 'parameter', format: ['camelCase'], leadingUnderscore: 'allow' },
        {
          selector: 'property',
          modifiers: ['requiresQuotes'],
          format: null,
        },
      ],
    },
  },

  ...vuePlugin.configs['flat/essential'].map((config) => ({
    ...config,
    files: ['**/*.vue'],
  })),

  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
      },
    },
    rules: {
      'vue/multi-word-component-names': 'error',
    },
  },

  {
    files: ['**/*.ts'],
    rules: {
      'no-magic-numbers': [
        'warn',
        {
          ignore: [0, 1, -1, 100],
          ignoreArrayIndexes: true,
          enforceConst: true,
          detectObjects: false,
        },
      ],
    },
  },

  {
    files: ['server/**/*.ts'],
    rules: {
      'no-magic-numbers': 'off',
    },
  },
)
