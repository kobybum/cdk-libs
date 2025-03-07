import z from 'zod'
import { conditionOperators } from './condition-operators'

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
