/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

export default defineConfig({
    plugins: [],
    test: {
        environment: 'node',
        globals: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
        },
    },
    resolve: {
        alias: {
            '@': resolve(dirname(fileURLToPath(import.meta.url)), './src'),
        },
    },
})
