import type { Except, UnionToIntersection } from 'type-fest'
import { AwsPolicy } from './aws-policy'
import { type AwsPolicyStatementProps } from './statement'

/**
 * Represents a policy statement with parameters that can be filled in later.
 *
 * This allows for creating reusable policy templates that can be filled with
 * specific values when needed.
 */
export class AwsPreparedPolicy<T extends Record<string, unknown>> {
    /**
     * Creates a new prepared policy with explicitly typed parameters.
     *
     * @param statementFn Function that generates policy statements from parameters
     * @returns A new AwsPreparedPolicy instance
     *
     * @example
     * const s3ReadPolicy = new AwsPreparedPolicy<{
     *   bucketName: string;
     *   accountId: string;
     * }>(({ bucketName, accountId }) => ({
     *   Effect: 'Allow',
     *   Action: ['s3:GetObject'],
     *   Resource: [`arn:aws:s3:::${bucketName}/*`]
     * }));
     */
    constructor(
        private readonly statementFn: (
            params: T,
        ) => AwsPolicyStatementProps | AwsPolicyStatementProps[],
    ) {}

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

    /**
     * Combines multiple prepared policies into a single prepared policy.
     * The resulting policy will accept the union of all parameter types.
     *
     * @param policies An array of prepared policies to combine
     * @returns A new prepared policy that requires all parameters from the input policies
     *
     * @example
     * ```typescript
     * const s3Policy = new AwsPreparedPolicy<{ bucketName: string }>( ... );
     * const lambdaPolicy = new AwsPreparedPolicy<{ functionName: string }>( ... );
     * const combinedPolicy = AwsPreparedPolicy.combine([s3Policy, lambdaPolicy]);
     *
     * // Combined policy requires both parameters
     * const policy = combinedPolicy.fill({
     *   bucketName: 'my-bucket',
     *   functionName: 'my-function'
     * });
     * ```
     */
    static combine<T extends Record<string, unknown>[]>(
        ...policies: {
            [K in keyof T]: AwsPreparedPolicy<T[K]>
        }
    ): AwsPreparedPolicy<UnionToIntersection<T[number]>> {
        return new AwsPreparedPolicy<UnionToIntersection<T[number]>>((params) => {
            const statements: AwsPolicyStatementProps[] = []

            // Apply parameters to each policy and collect statements
            for (const policy of policies) {
                const policyResult = policy.statementFn(params)
                if (Array.isArray(policyResult)) {
                    statements.push(...policyResult)
                } else {
                    statements.push(policyResult)
                }
            }

            return statements
        })
    }
}
