import { type EnvId } from '@cdklib/config/types'
import { z } from 'zod'
import { deepMerge } from './deep-merge'
import type { ConfigMergeFn, Overrides, PartialDeep, PathSegments, RuntimeConfigFn } from './types'
import { type Construct } from 'constructs'
import { getEnvId } from './context'

/**
 * A configuration module for CDK.
 *
 * Used in conjunction with EnvId and constructs to get configuration for a specific environment.
 *
 * It is recommended to export the configuration as a named export from the module, and keep modules separate by use case.
 *
 * ### Example
 * From `config/aws.ts`
 * ```js
 * import { CdkConfig } from '@cdklib/config'
 *
 * const schema = z.object({
 *   accountId: z.string(),
 *   region: z.string(),
 * })
 *
 * export const awsConfig = new CdkConfig(schema)
 * ```
 *
 * @template TSchema Zod schema for the configuration (for validation, structure and defaults)
 */
export class CdkConfig<TSchema extends z.ZodObject<any>, TEnvId extends string = EnvId> {
    private schema: TSchema
    private mergeFn: ConfigMergeFn
    private defaultValues: PartialDeep<Overrides> = {}
    private overrides: Partial<Record<PathSegments<TEnvId>, Overrides>> = {}
    private runtimeConfigs: RuntimeConfigFn<TSchema>[] = []

    /**
     * Create a configuration. Recommended to be used in a modular fasion.
     *
     * ### Example
     *
     * ```js
     * import { CdkConfig } from '@cdklib/config'
     *
     * const schema = z.object({
     *   accountId: z.string(),
     *   region: z.string(),
     * })
     *
     * const awsConfig = new CdkConfig(schema)
     *   .set('dev', { accountId: '1234567890' })
     *   .set('dev/staging', { region: 'us-east-1' })
     * ```
     *
     * @param schema - Zod schema for validation (must be a ZodObject)
     * @param mergeFn - (Optional) Function to merge configuration objects
     */
    constructor(schema: TSchema, mergeFn: ConfigMergeFn = deepMerge) {
        if (!(schema instanceof z.ZodObject)) {
            throw new Error('Schema must be a Zod object')
        }
        this.schema = schema
        this.mergeFn = mergeFn
    }

    /**
     * Set default values for the configuration
     *
     * Applies first, before any overrides
     *
     * ### Example
     * ```js
     * const awsConfig = new CdkConfig(schema)
     *   .setDefault({ accountId: '1234567890' })
     *   .set('staging', { region: 'us-east-1' })
     *   .set('production', { region: 'us-east-2' })
     * ```
     *
     * @param values - Default values (can be partial)
     * @returns The CdkConfig instance for chaining
     */
    setDefault(values: PartialDeep<z.infer<TSchema>>): this {
        this.defaultValues = values as Overrides
        return this
    }

    /**
     * Set configuration values for a specific environment or path segment
     *
     * If called multiple times for the same path, values are merged
     *
     * ### Example
     * ```js
     *  .set('dev', {
     *    accountId: '1234567890',
     *  })
     *  .set('dev/staging', {
     *    region: 'us-east-1',
     *  })
     * ```
     *
     * @param envId - Environment identifier or path segment
     * @param values - Environment-specific values (can be partial)
     * @returns The CdkConfig instance for chaining
     */
    set(envId: PathSegments<TEnvId>, values: PartialDeep<z.infer<TSchema>>): this {
        if (this.overrides[envId]) {
            // If we already have values for this path, merge with them
            this.overrides[envId] = deepMerge(this.overrides[envId], values as Overrides)
        } else {
            // Otherwise, just set the values
            this.overrides[envId] = values as Overrides
        }
        return this
    }

    /**
     * Add a runtime configuration function for an environment
     *
     * Useful for computing configuration based on other keys and other CdkConfig modules.
     *
     * Multiple runtime config functions can be added to the same environment
     * and will be applied in the order they were added
     *
     * ### Example
     * ```js
     * const awsConfig = new CdkConfig(schema)
     *   .set('dev', { accountId: '1234567890' })
     *   .addRuntime((envId, config) => ({
     *     policyArn: `arn:aws:iam::${config.accountId}:policy/MyPolicy`
     *   }))
     * ```
     *
     * @param configFn - {@link RuntimeConfigFn} Function that computes runtime values based on derived config
     * @returns The CdkConfig instance for chaining
     */
    addRuntime(configFn: RuntimeConfigFn<TSchema>): this {
        this.runtimeConfigs.push(configFn)
        return this
    }

    /**
     * Get the resolved configuration for a specific environment
     *
     * Resolves by traversing the environment hierarchy and applying overrides
     *
     * Resolution hierarchy - default -> env segments -> runtime
     *
     * For example, given the environment ID 'dev/staging/tenant1', the hierarchy is:
     * - `default`
     * - `dev`
     * - `dev/staging`
     * - `dev/staging/tenant1`
     * - runtime functions
     *
     * @param envId - Environment identifier
     * @returns The resolved and validated configuration
     * @throws If the configuration fails validation
     */
    get(context: TEnvId | Construct): z.infer<TSchema> {
        const envId = getEnvId(context)

        // Get all relevant environment segments in hierarchy order
        const segments = this.getEnvironmentHierarchy(envId)

        let mergedConfig: Overrides = this.defaultValues

        // Apply each segment's configuration in order
        for (const stringSegment of segments) {
            const segment = stringSegment as PathSegments<TEnvId>
            if (this.overrides[segment]) {
                mergedConfig = this.mergeFn(mergedConfig, this.overrides[segment])
            }
        }

        // Apply all runtime configurations in sequence
        for (const runtimeConfigFn of this.runtimeConfigs) {
            const runtimeValues = runtimeConfigFn(envId, mergedConfig)
            mergedConfig = this.mergeFn(mergedConfig, runtimeValues as Overrides)
        }

        // Validate the configuration with runtime values included
        return this.schema.parse(mergedConfig)
    }

    /**
     * Get the environment hierarchy for a given environment ID
     *
     * For example, 'dev/staging/tenant1' would return ['dev', 'dev/staging', 'dev/staging/tenant1']
     *
     * Each segment is a potential configuration level
     *
     * @param envId - Environment identifier
     * @returns Array of environment segments in hierarchy order
     */
    private getEnvironmentHierarchy(envId: string): string[] {
        const segments: string[] = []

        // Handle hierarchical paths
        if (envId.includes('/')) {
            const parts = envId.split('/')

            // Build up all prefix paths
            let currentPath = ''
            for (let i = 0; i < parts.length; i++) {
                if (i === 0) {
                    currentPath = parts[0]!
                    segments.push(currentPath)
                } else {
                    currentPath = `${currentPath}/${parts[i]}`
                    segments.push(currentPath)
                }
            }
        } else {
            // For simple environment names like 'global' or 'staging'
            segments.push(envId)
        }

        return segments
    }
}
