import { type AwsPolicyStatementProps, Statement } from './statement'

const POLICY_VERSION = '2012-10-17'

/** Holds one or more AWS statements, and outputs JSON */
export class AwsPolicy {
    static from(...statements: AwsPolicyStatementProps[]) {
        return new AwsPolicy(...statements)
    }

    /** Creates statements without intellisense, used when loading from files */
    static fromRaw(statements: unknown) {
        return Array.isArray(statements)
            ? new AwsPolicy(...statements)
            : // @ts-expect-error validated in runtime
              new AwsPolicy(statements)
    }

    public readonly statements: Statement[]

    private constructor(...statements: AwsPolicyStatementProps[]) {
        this.statements = statements.map((s) => new Statement(s))
    }

    /** Adds statements to the policy */
    add(...statements: AwsPolicyStatementProps[]) {
        this.statements.push(...statements.map((s) => new Statement(s)))

        return this
    }

    /**
     * Combines multiple AWS policies into a single policy with all their statements.
     *
     * @param policies An array of AWS policies to combine
     * @returns A new AWS policy with all statements from the input policies
     *
     * @example
     * const readPolicy = AwsPolicy.from({ Effect: 'Allow', Action: 's3:GetObject', Resource: 'arn:aws:s3:::my-bucket/*' });
     * const listPolicy = AwsPolicy.from({ Effect: 'Allow', Action: 's3:ListBucket', Resource: 'arn:aws:s3:::my-bucket' });
     * const combinedPolicy = AwsPolicy.combine([readPolicy, listPolicy]);
     */
    static combine(policies: AwsPolicy[]): AwsPolicy {
        const statements: AwsPolicyStatementProps[] = []

        // Collect all statements from all policies
        for (const policy of policies) {
            statements.push(...policy.statements.map((s) => s.raw))
        }

        return AwsPolicy.from(...statements)
    }

    /** Convert to an AWS compatible JSON, including Version */
    toJson() {
        return JSON.stringify({
            Version: POLICY_VERSION,
            Statement: this.statements.map((s) => s.raw),
        })
    }
}
