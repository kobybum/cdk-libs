import { Construct } from 'constructs'
import type { Except } from 'type-fest'
import { AwsPolicyStatementProps, AwsPolicy } from './statement'
import { ScopedAwsPreparedPolicy } from './scoped-prepared-policy'

/**
 * Represents a policy statement with parameters that can be filled in later.
 * This allows for creating reusable policy templates that can be filled with
 * specific values when needed.
 *
 * @template T The type of parameters this policy requires
 */
export class AwsPreparedPolicy<T extends Record<string, any>> {
    /**
     * Creates a new prepared policy with the given statement function.
     * Note: Use the static `new` method instead of this constructor.
     *
     * @param statementFn Function that generates policy statements from parameters
     */
    private constructor(
        private readonly statementFn: (
            params: T,
        ) => AwsPolicyStatementProps | AwsPolicyStatementProps[],
    ) {}

    /**
     * Creates a new prepared policy with explicitly typed parameters.
     *
     * @template T The type of parameters this policy requires
     * @param statementFn Function that generates policy statements from parameters
     * @returns A new AwsPreparedPolicy instance
     *
     * @example
     * const s3ReadPolicy = AwsPreparedPolicy.new<{
     *   bucketName: string;
     *   accountId: string;
     * }>(({ bucketName, accountId }) => ({
     *   Effect: 'Allow',
     *   Action: ['s3:GetObject'],
     *   Resource: [`arn:aws:s3:::${bucketName}/*`]
     * }));
     */
    static new<T extends Record<string, any>>(
        statementFn: (params: T) => AwsPolicyStatementProps | AwsPolicyStatementProps[],
    ): AwsPreparedPolicy<T> {
        return new AwsPreparedPolicy<T>(statementFn)
    }

    /**
     * Creates a new prepared policy that has access to a construct scope.
     * This allows the policy to access configuration values from the scope.
     *
     * @template T The type of parameters this policy requires
     * @param statementFn Function that generates policy statements from scope and parameters
     * @returns A new ScopedAwsPreparedPolicy instance
     *
     * @example
     * const s3ReadPolicy = AwsPreparedPolicy.newScoped<{
     *   bucketName: string;
     * }>((scope, { bucketName }) => {
     *   // Get config values from scope
     *   const { accountId } = awsConfig.get(scope);
     *
     *   return {
     *     Effect: 'Allow',
     *     Action: ['s3:GetObject'],
     *     Resource: [`arn:aws:s3:::${bucketName}/*`]
     *   };
     * });
     */
    static newScoped<T extends Record<string, any>>(
        statementFn: (
            scope: Construct,
            params: T,
        ) => AwsPolicyStatementProps | AwsPolicyStatementProps[],
    ): ScopedAwsPreparedPolicy<T> {
        return ScopedAwsPreparedPolicy.new(statementFn)
    }

    /**
     * Fills all required parameters and creates a concrete AWS policy.
     *
     * @param params The parameter values to fill the policy with
     * @returns A fully instantiated AWS policy
     *
     * @example
     * const policy = s3ReadPolicy.fill({
     *   bucketName: 'my-bucket',
     *   accountId: '123456789012'
     * });
     */
    fill(params: T): AwsPolicy {
        const result = this.statementFn(params)
        const statements = Array.isArray(result) ? result : [result]
        return AwsPolicy.from(...statements)
    }

    /**
     * Partially fills some parameters and returns a new AwsPreparedPolicy
     * that only requires the remaining parameters.
     *
     * @template K Keys of parameters being filled
     * @param params Subset of parameters to fill now
     * @returns A new AwsPreparedPolicy requiring only the remaining parameters
     *
     * @example
     * const partialPolicy = s3ReadPolicy.fillPartial({
     *   bucketName: 'my-bucket'
     * });
     *
     * // Later, only the accountId is required
     * const fullPolicy = partialPolicy.fill({
     *   accountId: '123456789012'
     * });
     */
    fillPartial<K extends keyof T>(params: Pick<T, K>): AwsPreparedPolicy<Except<T, K>> {
        return new AwsPreparedPolicy<Except<T, K>>((remainingParams) => {
            const combinedParams = { ...params, ...remainingParams } as unknown as T
            return this.statementFn(combinedParams)
        })
    }
}
