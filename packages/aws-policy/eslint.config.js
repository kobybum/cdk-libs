import js from '@eslint/js'
import prettier from 'eslint-plugin-prettier'
import prettierConfig from 'eslint-config-prettier'
import tsParser from '@typescript-eslint/parser'
import typescript from '@typescript-eslint/eslint-plugin'
import globals from 'globals'

/** @type {import("eslint").Linter.Config} */
const config = [
  {
    ignores: ['node_modules/*', 'dist/*'],
  },
  js.configs.recommended,
  prettierConfig,
  {
    plugins: { '@typescript-eslint': typescript, prettier },
    languageOptions: {
      parser: tsParser,
      globals: {
        ...globals.node,
      },
    },
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
