import { describe, expect, it } from 'vitest'
import { deepMerge } from './deep-merge'

describe('deepMerge', () => {
    it('should merge two flat objects', () => {
        const original = { a: 1, b: 2, c: 3 }
        const override = { b: 4, d: 5 }
        const result = deepMerge(original, override)

        expect(result).toEqual({ a: 1, b: 4, c: 3, d: 5 })
    })

    it('should merge nested objects recursively', () => {
        const original = {
            a: 1,
            b: {
                c: 2,
                d: 3,
            },
        }
        const override = {
            b: {
                d: 4,
                e: 5,
            },
        }
        const result = deepMerge(original, override)

        expect(result).toEqual({
            a: 1,
            b: {
                c: 2,
                d: 4,
                e: 5,
            },
        })
    })

    it('should handle undefined values in override', () => {
        const original = { a: 1, b: 2, c: 3 }
        const override = { b: undefined }
        const result = deepMerge(original, override)

        expect(result).toEqual({ a: 1, b: undefined, c: 3 })
        expect(Object.keys(result)).toContain('b')
        expect(result.b).toBeUndefined()
    })

    it('should handle null values in override', () => {
        const original = { a: 1, b: 2, c: 3 }
        const override = { b: null }
        const result = deepMerge(original, override)

        expect(result).toEqual({ a: 1, b: null, c: 3 })
        expect(Object.keys(result)).toContain('b')
        expect(result.b).toBeNull()
    })

    it('should handle missing keys in override (no undefined value)', () => {
        const original = { a: 1, b: 2, c: 3 }
        const override = { a: 4 }
        const result = deepMerge(original, override)

        expect(result).toEqual({ a: 4, b: 2, c: 3 })
    })

    it('should handle objects with multiple levels of nesting', () => {
        const original = {
            a: {
                b: {
                    c: 1,
                    d: 2,
                },
                e: 3,
            },
            f: 4,
        }
        const override = {
            a: {
                b: {
                    d: 5,
                    g: 6,
                },
            },
            h: 7,
        }
        const result = deepMerge(original, override)

        expect(result).toEqual({
            a: {
                b: {
                    c: 1,
                    d: 5,
                    g: 6,
                },
                e: 3,
            },
            f: 4,
            h: 7,
        })
    })

    it('should treat arrays as atomic values (replace, not merge)', () => {
        const original = { a: [1, 2, 3], b: 2 }
        const override = { a: [4, 5] }
        const result = deepMerge(original, override)

        expect(result).toEqual({ a: [4, 5], b: 2 })
        expect(result.a).toEqual([4, 5])
    })

    it('should handle nested null values in override', () => {
        const original = {
            a: {
                b: {
                    c: 1,
                },
            },
        }
        const override = {
            a: {
                b: null,
            },
        }
        const result = deepMerge(original, override)

        expect(result).toEqual({
            a: {
                b: null,
            },
        })
    })

    it('should handle nested undefined values in override', () => {
        const original = {
            a: {
                b: {
                    c: 1,
                },
            },
        }
        const override = {
            a: {
                b: undefined,
            },
        }
        const result = deepMerge(original, override)

        expect(result).toEqual({
            a: {
                b: undefined,
            },
        })
    })

    it('should handle empty objects', () => {
        const original = {}
        const override = {}
        const result = deepMerge(original, override)

        expect(result).toEqual({})
    })

    it('should handle complex configuration-like objects', () => {
        const defaultConfig = {
            server: {
                port: 3000,
                host: 'localhost',
                timeout: 5000,
            },
            database: {
                url: 'mongodb://localhost',
                name: 'mydb',
                options: {
                    poolSize: 10,
                    retryWrites: true,
                },
            },
            features: {
                logging: true,
                metrics: false,
            },
        }

        const envConfig = {
            server: {
                port: 8080,
                timeout: null,
            },
            database: {
                url: 'mongodb://production-server',
                options: {
                    poolSize: 20,
                },
            },
            features: undefined,
        }

        const result = deepMerge(defaultConfig, envConfig)

        expect(result).toEqual({
            server: {
                port: 8080,
                host: 'localhost',
                timeout: null,
            },
            database: {
                url: 'mongodb://production-server',
                name: 'mydb',
                options: {
                    poolSize: 20,
                    retryWrites: true,
                },
            },
            features: undefined,
        })
    })

    it('should preserve property access order', () => {
        const original = { a: 1, b: 2, c: 3 }
        const override = { d: 4, e: 5, a: 6 }
        const result = deepMerge(original, override)

        // Keys from both objects should be present
        expect(Object.keys(result)).toContain('a')
        expect(Object.keys(result)).toContain('b')
        expect(Object.keys(result)).toContain('c')
        expect(Object.keys(result)).toContain('d')
        expect(Object.keys(result)).toContain('e')

        // Values should be correctly merged
        expect(result.a).toBe(6) // From override
        expect(result.b).toBe(2) // From original
        expect(result.c).toBe(3) // From original
        expect(result.d).toBe(4) // From override
        expect(result.e).toBe(5) // From override
    })
})
