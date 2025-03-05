import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { CdkConfig } from './cdk-config'

describe('CdkConfig', () => {
    // Define custom EnvId types for testing
    type TestEnvId =
        | 'dev/staging'
        | 'dev/production'
        | 'prod/staging'
        | 'prod/production'
        | 'dev/region1/staging'
        | 'dev/region1/production'
        | 'dev/region2/staging'
        | 'dev/region2/production'
        | 'a/b/c'
        | 'a/b/d'
        | 'a/e'
        | 'invalid/transform'

    // Basic schemas for testing
    const simpleSchema = z.object({
        name: z.string(),
        version: z.string().optional(),
        isEnabled: z.boolean().default(true),
    })

    const nestedSchema = z.object({
        app: z.object({
            name: z.string(),
            version: z.string().optional(),
            fullName: z.string().optional(),
        }),
        infrastructure: z.object({
            region: z.string(),
            resources: z
                .object({
                    s3: z.object({
                        bucketName: z.string().optional(),
                        arn: z.string().optional(),
                    }),
                })
                .default({ s3: {} }),
        }),
    })

    // Basic functionality tests
    describe('Basic Functionality', () => {
        it('should create a new instance with a schema', () => {
            const config = new CdkConfig<typeof simpleSchema, TestEnvId>(simpleSchema)
            expect(config).toBeInstanceOf(CdkConfig)
        })

        it('should throw an error if schema is not a Zod object', () => {
            // @ts-ignore - Testing invalid input
            expect(() => new CdkConfig(z.string())).toThrow('Schema must be a Zod object')
        })

        it('should set and get basic configuration values', () => {
            const config = new CdkConfig<typeof simpleSchema, TestEnvId>(simpleSchema)
            config.set('dev', { name: 'test-app' })
            const result = config.get('dev/staging')

            expect(result).toEqual({
                name: 'test-app',
                isEnabled: true, // default value from schema
            })
        })

        it('should merge values when set is called multiple times for the same environment', () => {
            const config = new CdkConfig<typeof simpleSchema, TestEnvId>(simpleSchema)
            config.set('dev', { name: 'test-app' })
            config.set('dev', { version: '1.0.0' })
            const result = config.get('dev/staging')

            expect(result).toEqual({
                name: 'test-app',
                version: '1.0.0',
                isEnabled: true,
            })
        })
    })

    // Hierarchical configuration tests
    describe('Hierarchical Configuration', () => {
        it('should merge values from parent paths', () => {
            const config = new CdkConfig<typeof nestedSchema, TestEnvId>(nestedSchema)
            config.set('dev', {
                app: { name: 'test-app' },
                infrastructure: { region: 'us-east-1' },
            })
            config.set('dev/staging', {
                app: { version: '1.0.0-beta' },
            })

            const result = config.get('dev/staging')

            expect(result).toEqual({
                app: {
                    name: 'test-app', // from 'dev'
                    version: '1.0.0-beta', // from 'dev/staging'
                },
                infrastructure: {
                    region: 'us-east-1', // from 'dev'
                    resources: {
                        s3: {},
                    },
                },
            })
        })

        it('should override values from parent paths correctly', () => {
            const config = new CdkConfig<typeof nestedSchema, TestEnvId>(nestedSchema)
            config.set('dev', {
                app: { name: 'test-app', version: '1.0.0' },
                infrastructure: { region: 'us-east-1' },
            })
            config.set('dev/staging', {
                app: { name: 'staging-app' },
                infrastructure: { resources: { s3: { bucketName: 'staging-bucket' } } },
            })

            const result = config.get('dev/staging')

            expect(result).toEqual({
                app: {
                    name: 'staging-app', // overridden in 'dev/staging'
                    version: '1.0.0', // from 'dev'
                },
                infrastructure: {
                    region: 'us-east-1', // from 'dev'
                    resources: {
                        s3: {
                            bucketName: 'staging-bucket', // from 'dev/staging'
                        },
                    },
                },
            })
        })

        it('should handle deeply nested paths', () => {
            const config = new CdkConfig<typeof nestedSchema, TestEnvId>(nestedSchema)
            config.set('dev', {
                app: { name: 'test-app' },
            })
            config.set('dev/region1', {
                infrastructure: { region: 'us-east-1' },
            })
            config.set('dev/region1/staging', {
                app: { version: '1.0.0-beta' },
                infrastructure: { resources: { s3: { bucketName: 'r1-staging-bucket' } } },
            })

            const result = config.get('dev/region1/staging')

            expect(result).toEqual({
                app: {
                    name: 'test-app', // from 'dev'
                    version: '1.0.0-beta', // from 'dev/region1/staging'
                },
                infrastructure: {
                    region: 'us-east-1', // from 'dev/region1'
                    resources: {
                        s3: {
                            bucketName: 'r1-staging-bucket', // from 'dev/region1/staging'
                        },
                    },
                },
            })
        })

        it('should handle complex path hierarchies', () => {
            const config = new CdkConfig<typeof nestedSchema, TestEnvId>(nestedSchema)
            config.setDefault({ infrastructure: { resources: { s3: {} } } })
            config.set('a', { app: { name: 'a' } })
            config.set('a/b', { app: { version: 'a/b' } })
            config.set('a/b/c', { infrastructure: { region: 'a/b/c' } })
            config.set('a/b/d', { infrastructure: { region: 'a/b/d' } })
            config.set('a/e', { app: { name: 'a/e' }, infrastructure: { region: 'a/e' } })

            const resultC = config.get('a/b/c')
            expect(resultC).toEqual({
                app: {
                    name: 'a',
                    version: 'a/b',
                },
                infrastructure: {
                    region: 'a/b/c',
                    resources: { s3: {} },
                },
            })

            const resultD = config.get('a/b/d')
            expect(resultD).toEqual({
                app: {
                    name: 'a',
                    version: 'a/b',
                },
                infrastructure: {
                    region: 'a/b/d',
                    resources: { s3: {} },
                },
            })

            const resultE = config.get('a/e')
            expect(resultE).toEqual({
                app: {
                    name: 'a/e',
                },
                infrastructure: {
                    region: 'a/e',
                    resources: { s3: {} },
                },
            })
        })
    })

    // Runtime configuration tests
    describe('Runtime Configuration', () => {
        it('should apply a single runtime configuration', () => {
            const config = new CdkConfig<typeof nestedSchema, TestEnvId>(nestedSchema)
            config.set('dev', {
                app: { name: 'test-app' },
                infrastructure: {
                    region: 'us-east-1',
                    resources: { s3: { bucketName: 'test-bucket' } },
                },
            })

            config.addRuntime((_, config) => ({
                infrastructure: {
                    resources: {
                        s3: {
                            // Calculate ARN based on the bucket name
                            arn: `arn:aws:s3:::${config.infrastructure.resources.s3.bucketName}`,
                        },
                    },
                },
            }))

            const result = config.get('dev/staging')

            expect(result.infrastructure.resources.s3.arn).toBe('arn:aws:s3:::test-bucket')
        })

        it('should apply multiple runtime configurations in order', () => {
            const config = new CdkConfig<typeof simpleSchema, TestEnvId>(simpleSchema)
            config.set('dev', { name: 'test-app', version: '1.0.0' })

            // First runtime config adds a suffix to the name
            config.addRuntime((_, config) => ({
                name: `${config.name}-dev`,
            }))

            // Second runtime config depends on the modified name
            config.addRuntime((_, config) => ({
                // This should see the name already modified by the first runtime config
                version: `${config.version}-${config.name.split('-').pop()}`,
            }))

            const result = config.get('dev/staging')

            expect(result.name).toBe('test-app-dev')
            expect(result.version).toBe('1.0.0-dev')
        })

        it('should handle runtime configs that depend on multiple levels', () => {
            const schema = z.object({
                app: z.object({
                    name: z.string(),
                    version: z.string().optional(),
                    fullName: z.string(),
                }),
                infrastructure: z.object({
                    region: z.string(),
                }),
            })
            type TestNestedEnvId = 'base/env/dev' | 'base/env/prod'

            const config = new CdkConfig<typeof schema, TestNestedEnvId>(schema)
            config.set('base', {
                app: { name: 'base-app' },
            })
            config.set('base/env', {
                infrastructure: { region: 'us-east-1' },
            })
            config.set('base/env/dev', {
                app: { version: 'dev-version' },
            })

            config.addRuntime((_, config) => ({
                app: {
                    // Combine values from different levels
                    fullName: `${config.app.name}-${config.app.version}-${config.infrastructure.region}`,
                },
            }))

            const result = config.get('base/env/dev')
            expect(result.app.fullName).toBe('base-app-dev-version-us-east-1')
        })

        it('should handle runtime configs with conditional logic', () => {
            const configSchema = z.object({
                app: z.object({
                    name: z.string(),
                    nameWithPrefix: z.string().optional(),
                }),
                prefix: z.string().optional(),
            })

            type PrefixEnvId = 'dev/staging' | 'prod/production'

            const config = new CdkConfig<typeof configSchema, PrefixEnvId>(configSchema)
            config.set('dev', {
                app: { name: 'myapp' },
            })
            config.set('prod', {
                app: { name: 'myapp' },
                prefix: 'prod-',
            })

            // Runtime config that uses prefix conditionally
            config.addRuntime((_, config) => ({
                app: {
                    nameWithPrefix: `default-${config.app.name}`,
                },
            }))

            config.addRuntime((_, config) => ({
                app: {
                    nameWithPrefix: config.prefix
                        ? `${config.prefix}${config.app.name}`
                        : `default-${config.app.name}`,
                },
            }))

            const devResult = config.get('dev/staging')
            const prodResult = config.get('prod/production')

            expect(devResult.app.nameWithPrefix).toBe('default-myapp')
            expect(prodResult.app.nameWithPrefix).toBe('prod-myapp')
        })
    })

    // Edge cases
    describe('Edge Cases', () => {
        it('should handle no configuration set', () => {
            const config = new CdkConfig<typeof simpleSchema, TestEnvId>(simpleSchema)

            // This should throw if required fields are missing
            expect(() => config.get('dev/staging')).toThrow(z.ZodError)
        })

        it('should use schema defaults for missing values', () => {
            const schemaWithDefaults = z.object({
                name: z.string().default('default-name'),
                version: z.string().default('0.0.0'),
                isEnabled: z.boolean().default(true),
            })

            type DefaultsEnvId = 'dev/staging' | 'prod/production'

            const config = new CdkConfig<typeof schemaWithDefaults, DefaultsEnvId>(
                schemaWithDefaults,
            )
            const result = config.get('dev/staging')

            expect(result).toEqual({
                name: 'default-name',
                version: '0.0.0',
                isEnabled: true,
            })
        })

        it('should handle empty objects', () => {
            const config = new CdkConfig<typeof simpleSchema, TestEnvId>(simpleSchema)
            config.set('dev', {})

            // Should fail because name is required and no default exists
            expect(() => config.get('dev/staging')).toThrow(z.ZodError)
        })

        it('should handle arrays in configuration', () => {
            const schemaWithArrays = z.object({
                tags: z.array(z.string()).default([]),
                features: z
                    .array(
                        z.object({
                            name: z.string(),
                            enabled: z.boolean().default(false),
                        }),
                    )
                    .default([]),
            })

            type ArrayEnvId = 'dev/staging' | 'dev/production'

            const config = new CdkConfig<typeof schemaWithArrays, ArrayEnvId>(schemaWithArrays)
            config.set('dev', {
                tags: ['api', 'backend'],
                features: [{ name: 'feature1' }],
            })

            config.set('dev/staging', {
                tags: ['staging'],
                features: [{ name: 'feature2' }],
            })

            // This test assumes deepMerge overrides arrays
            const result = config.get('dev/staging')

            // Should contain the tags from the most specific level
            expect(result.tags).not.toContain('api')
            expect(result.tags).not.toContain('backend')
            expect(result.tags).toContain('staging')

            // Should contain features from the most specific level
            expect(result.features.some((f) => f.name === 'feature1')).toBe(false)
            expect(result.features.some((f) => f.name === 'feature2')).toBe(true)
        })

        it('should handle runtime configs that transform data types', () => {
            const transformSchema = z.object({
                rawValue: z.string(),
                parsedValue: z.number().optional(),
            })

            type TransformEnvId = 'dev/transform' | 'invalid/transform'

            const config = new CdkConfig<typeof transformSchema, TransformEnvId>(transformSchema)
            config.set('dev', {
                rawValue: '42',
            })

            // Runtime config that parses a string into a number
            config.addRuntime((_, config) => ({
                parsedValue: parseInt(config.rawValue, 10),
            }))

            const result = config.get('dev/transform')
            expect(result.parsedValue).toBe(42)
        })

        it('should validate runtime configs against the schema', () => {
            const config = new CdkConfig<typeof simpleSchema, TestEnvId>(simpleSchema)
            config.set('dev', { name: 'test-app' })

            // This runtime config returns an invalid value (number instead of string)
            config.addRuntime(() => ({
                // @ts-ignore - Intentionally incorrect type for testing
                name: 123,
            }))

            expect(() => config.get('dev/staging')).toThrow(z.ZodError)
        })
    })

    // Type safety tests
    describe('Type Safety', () => {
        it('should work with custom EnvId types', () => {
            // Define a custom environment ID type
            type CustomEnvId = 'dev/web' | 'dev/api' | 'prod/web' | 'prod/api'

            const config = new CdkConfig<typeof simpleSchema, CustomEnvId>(simpleSchema)

            // Setting values on valid path segments should work
            config.set('dev', { name: 'test-app' })
            config.set('dev/web', { version: '1.0.0' })

            const result = config.get('dev/web')
            expect(result.name).toBe('test-app')
            expect(result.version).toBe('1.0.0')

            // TypeScript would prevent this at compile time:
            // config.get('invalid/path');
        })

        it('should properly type path segments', () => {
            type TreeEnvId = 'a/b/c/d'

            const config = new CdkConfig<typeof simpleSchema, TreeEnvId>(simpleSchema)

            // All of these should be allowed by the PathSegments type
            config.set('a', { name: 'level-a' })
            config.set('a/b', { name: 'level-ab' })
            config.set('a/b/c', { name: 'level-abc' })
            config.set('a/b/c/d', { name: 'level-abcd' })

            const result = config.get('a/b/c/d')
            expect(result.name).toBe('level-abcd')

            // TypeScript would prevent this:
            // config.set('x', { name: 'invalid' });
            // config.set('a/x', { name: 'invalid' });
        })

        it('should support union types for EnvId', () => {
            // Define a union type with a common pattern
            type UnionEnvId = 'dev/service1' | 'dev/service2' | 'prod/service1' | 'prod/service2'

            const config = new CdkConfig<typeof simpleSchema, UnionEnvId>(simpleSchema)

            // Should allow setting values on common prefixes
            config.set('dev', { name: 'dev-base' })
            config.set('prod', { name: 'prod-base' })

            // Should get values correctly from prefixes
            const service1Result = config.get('dev/service1')
            expect(service1Result.name).toBe('dev-base')

            // Should still validate complete environment IDs
            // TypeScript would prevent this:
            // const invalidResult = config.get('invalid/service');
        })
    })
})
