import { type Construct } from 'constructs'
import type { Except } from 'type-fest'
import { AwsPolicy, type AwsPolicyStatementProps } from './statement'

/**
 * Represents a policy statement with parameters that can be filled in later,
 * with access to a construct scope for retrieving configuration values.
 *
 * This allows for creating reusable policy templates that can access configuration
 * based on the construct scope, like @cdklib/config.
 */
export class ScopedAwsPreparedPolicy<T extends Record<string, any>> {
    private constructor(
        private readonly statementFn: (
            scope: Construct,
            params: T,
        ) => AwsPolicyStatementProps | AwsPolicyStatementProps[],
    ) {}

    /**
     * Creates a new scoped prepared policy with the given statement function.
     *
     * @param statementFn Function that generates policy statements from parameters and scope
     */
    static new<T extends Record<string, any>>(
        statementFn: (
            scope: Construct,
            params: T,
        ) => AwsPolicyStatementProps | AwsPolicyStatementProps[],
    ): ScopedAwsPreparedPolicy<T> {
        return new ScopedAwsPreparedPolicy<T>(statementFn)
    }

    /**
     * Fills all required parameters with the provided scope and creates a concrete AWS policy.
     * The scope can be used within the policy template to access configuration values.
     *
     * @param scope The construct scope, typically used to access configuration
     * @param params The parameter values to fill the policy with
     * @returns A fully instantiated AWS policy
     *
     * @example
     * const policy = s3ReadPolicy.fill(this, {
     *   bucketName: 'my-bucket'
     * });
     */
    fill(scope: Construct, params: T): AwsPolicy {
        const result = this.statementFn(scope, params)
        const statements = Array.isArray(result) ? result : [result]
        return AwsPolicy.from(...statements)
    }

    /**
     * Partially fills some parameters and returns a new ScopedAwsPreparedPolicy
     * that only requires the remaining parameters and scope.
     *
     * @template K Keys of parameters being filled
     * @param params Subset of parameters to fill now
     * @returns A new ScopedAwsPreparedPolicy requiring only the remaining parameters
     *
     * @example
     * const partialPolicy = s3ReadPolicy.fillPartial({
     *   bucketName: 'my-bucket'
     * });
     *
     * // Later, provide the scope
     * const fullPolicy = partialPolicy.fill(this, {});
     */
    fillPartial<K extends keyof T>(params: Pick<T, K>): ScopedAwsPreparedPolicy<Except<T, K>> {
        return new ScopedAwsPreparedPolicy<Except<T, K>>((scope, remainingParams) => {
            const combinedParams = { ...params, ...remainingParams } as unknown as T
            return this.statementFn(scope, combinedParams)
        })
    }
}
