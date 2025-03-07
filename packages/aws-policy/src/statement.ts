import z from 'zod'
import { conditionOperators } from './condition-operators'

const POLICY_VERSION = '2012-10-17'

/** One or more strings */
const stringsSchema = z.union([z.string(), z.array(z.string()).min(1)])

const principalOptions = ['AWS', 'CanonicalUser', 'Federated', 'Service'] as const

const policyStatementSchema = z.object({
    Effect: z.enum(['Allow', 'Deny']),
    Action: stringsSchema,
    Resource: stringsSchema.optional(),
    Principal: z
        .record(z.enum(principalOptions), z.string())
        .refine((principal) => Object.keys(principal).length === 1)
        .optional(),
    Condition: z.record(z.enum(conditionOperators), z.record(z.string(), stringsSchema)).optional(),
})

export type AwsPolicyStatementProps = z.infer<typeof policyStatementSchema>

export class Statement {
    constructor(public readonly raw: AwsPolicyStatementProps) {
        policyStatementSchema.parse(raw)
    }
}

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

    /** Convert to an AWS compatible JSON, including Version */
    toJson() {
        return JSON.stringify({
            Version: POLICY_VERSION,
            Statement: this.statements.map((s) => s.raw),
        })
    }
}
