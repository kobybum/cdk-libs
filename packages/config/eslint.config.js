import js from '@eslint/js'
import prettier from 'eslint-plugin-prettier' // Prettier plugin
import prettierConfig from 'eslint-config-prettier' // Prettier config
import tsParser from '@typescript-eslint/parser'
import typescript from '@typescript-eslint/eslint-plugin'
import globals from 'globals'

// const project = resolve(process.cwd(), 'tsconfig.json')

/** @type {import("eslint").Linter.Config} */
const config = [
  js.configs.recommended,
  prettierConfig,
  {
    plugins: { '@typescript-eslint': typescript, prettier },
    // settings: {
    //   'import/resolver': {
    //     typescript: {
    //       project,
    //     },
    //   },
    // },
    languageOptions: {
      parser: tsParser,
      globals: {
        ...globals.node,
      },
    },
    ignores: [
      // Ignore dotfiles
      '.*.js',
      '*.js',
      'node_modules/',
      'dist/',
    ],
    files: ['src/**/*.ts', 'src/**/*.js'],
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          disallowTypeAnnotations: true,
          fixStyle: 'inline-type-imports',
        },
      ],
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error'],
    },
  },
]

export default config
