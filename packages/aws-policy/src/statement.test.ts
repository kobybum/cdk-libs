import { describe, it, expect } from 'vitest'
import { AwsPolicy, AwsPolicyStatementProps, Statement } from './statement'
import { ZodError } from 'zod'

describe('Statement', () => {
    describe('instantiation and validation', () => {
        it('should create a valid statement with basic properties', () => {
            const props: AwsPolicyStatementProps = {
                Effect: 'Allow',
                Action: 's3:GetObject',
                Resource: 'arn:aws:s3:::example-bucket/*',
            }

            const statement = new Statement(props)
            expect(statement.raw).toEqual(props)
        })

        it('should create a valid statement with array of actions', () => {
            const props: AwsPolicyStatementProps = {
                Effect: 'Allow',
                Action: ['s3:GetObject', 's3:PutObject'],
                Resource: 'arn:aws:s3:::example-bucket/*',
            }

            const statement = new Statement(props)
            expect(statement.raw).toEqual(props)
        })

        it('should create a valid statement with array of resources', () => {
            const props: AwsPolicyStatementProps = {
                Effect: 'Allow',
                Action: 's3:GetObject',
                Resource: ['arn:aws:s3:::example-bucket/*', 'arn:aws:s3:::another-bucket/*'],
            }

            const statement = new Statement(props)
            expect(statement.raw).toEqual(props)
        })

        it('should create a valid statement with Principal', () => {
            const props: AwsPolicyStatementProps = {
                Effect: 'Allow',
                Action: 's3:GetObject',
                Resource: 'arn:aws:s3:::example-bucket/*',
                Principal: {
                    AWS: 'arn:aws:iam::123456789012:user/username',
                },
            }

            const statement = new Statement(props)
            expect(statement.raw).toEqual(props)
        })

        it('should create a valid statement with Condition', () => {
            const props: AwsPolicyStatementProps = {
                Effect: 'Allow',
                Action: 's3:GetObject',
                Resource: 'arn:aws:s3:::example-bucket/*',
                Condition: {
                    StringEquals: {
                        's3:prefix': ['photos', 'documents'],
                    },
                },
            }

            const statement = new Statement(props)
            expect(statement.raw).toEqual(props)
        })

        it('should throw when Effect is invalid', () => {
            const props = {
                Effect: 'Invalid',
                Action: 's3:GetObject',
                Resource: 'arn:aws:s3:::example-bucket/*',
            }

            expect(() => new Statement(props as any)).toThrow(ZodError)
        })

        it('should throw when Action is missing', () => {
            const props = {
                Effect: 'Allow',
                Resource: 'arn:aws:s3:::example-bucket/*',
            }

            expect(() => new Statement(props as any)).toThrow(ZodError)
        })

        it('should throw when Principal has multiple keys', () => {
            const props = {
                Effect: 'Allow',
                Action: 's3:GetObject',
                Resource: 'arn:aws:s3:::example-bucket/*',
                Principal: {
                    AWS: 'arn:aws:iam::123456789012:user/username',
                    Service: 'lambda.amazonaws.com',
                },
            }

            expect(() => new Statement(props as any)).toThrow()
        })

        it('should throw when Condition has invalid operator', () => {
            const props = {
                Effect: 'Allow',
                Action: 's3:GetObject',
                Resource: 'arn:aws:s3:::example-bucket/*',
                Condition: {
                    InvalidOperator: {
                        's3:prefix': 'photos',
                    },
                },
            }

            expect(() => new Statement(props as any)).toThrow(ZodError)
        })
    })
})

describe('AwsPolicy', () => {
    describe('static factory methods', () => {
        it('should create policy with AwsPolicy.from', () => {
            const policy = AwsPolicy.from({
                Effect: 'Allow',
                Action: 's3:GetObject',
                Resource: 'arn:aws:s3:::example-bucket/*',
            })

            expect(policy.statements.length).toBe(1)
            expect(policy.statements[0]!.raw).toEqual({
                Effect: 'Allow',
                Action: 's3:GetObject',
                Resource: 'arn:aws:s3:::example-bucket/*',
            })
        })

        it('should create policy with multiple statements', () => {
            const policy = AwsPolicy.from(
                {
                    Effect: 'Allow',
                    Action: 's3:GetObject',
                    Resource: 'arn:aws:s3:::example-bucket/*',
                },
                {
                    Effect: 'Deny',
                    Action: 's3:DeleteObject',
                    Resource: 'arn:aws:s3:::example-bucket/sensitive/*',
                },
            )

            expect(policy.statements.length).toBe(2)
            expect(policy.statements[0]!.raw).toEqual({
                Effect: 'Allow',
                Action: 's3:GetObject',
                Resource: 'arn:aws:s3:::example-bucket/*',
            })
            expect(policy.statements[1]!.raw).toEqual({
                Effect: 'Deny',
                Action: 's3:DeleteObject',
                Resource: 'arn:aws:s3:::example-bucket/sensitive/*',
            })
        })

        it('should create policy from raw JSON array', () => {
            const raw = [
                {
                    Effect: 'Allow',
                    Action: 's3:GetObject',
                    Resource: 'arn:aws:s3:::example-bucket/*',
                },
            ]

            const policy = AwsPolicy.fromRaw(raw)
            expect(policy.statements.length).toBe(1)
            expect(policy.statements[0]!.raw).toEqual(raw[0])
        })

        it('should create policy from raw JSON object', () => {
            const raw = {
                Effect: 'Allow',
                Action: 's3:GetObject',
                Resource: 'arn:aws:s3:::example-bucket/*',
            }

            const policy = AwsPolicy.fromRaw(raw)
            expect(policy.statements.length).toBe(1)
            expect(policy.statements[0]!.raw).toEqual(raw)
        })
    })

    describe('add method', () => {
        it('should add statements to an existing policy', () => {
            const policy = AwsPolicy.from({
                Effect: 'Allow',
                Action: 's3:GetObject',
                Resource: 'arn:aws:s3:::example-bucket/*',
            })

            policy.add({
                Effect: 'Deny',
                Action: 's3:DeleteObject',
                Resource: 'arn:aws:s3:::example-bucket/sensitive/*',
            })

            expect(policy.statements.length).toBe(2)
            expect(policy.statements[0]!.raw).toEqual({
                Effect: 'Allow',
                Action: 's3:GetObject',
                Resource: 'arn:aws:s3:::example-bucket/*',
            })
            expect(policy.statements[1]!.raw).toEqual({
                Effect: 'Deny',
                Action: 's3:DeleteObject',
                Resource: 'arn:aws:s3:::example-bucket/sensitive/*',
            })
        })

        it('should add multiple statements at once', () => {
            const policy = AwsPolicy.from({
                Effect: 'Allow',
                Action: 's3:GetObject',
                Resource: 'arn:aws:s3:::example-bucket/*',
            })

            policy.add(
                {
                    Effect: 'Deny',
                    Action: 's3:DeleteObject',
                    Resource: 'arn:aws:s3:::example-bucket/sensitive/*',
                },
                {
                    Effect: 'Allow',
                    Action: 's3:ListBucket',
                    Resource: 'arn:aws:s3:::example-bucket',
                },
            )

            expect(policy.statements.length).toBe(3)
        })

        it('should maintain chainability', () => {
            const policy = AwsPolicy.from({
                Effect: 'Allow',
                Action: 's3:GetObject',
                Resource: 'arn:aws:s3:::example-bucket/*',
            }).add({
                Effect: 'Deny',
                Action: 's3:DeleteObject',
                Resource: 'arn:aws:s3:::example-bucket/sensitive/*',
            })

            expect(policy.statements.length).toBe(2)
        })
    })

    describe('toJson method', () => {
        it('should convert policy to AWS-compatible JSON string', () => {
            const statement: AwsPolicyStatementProps = {
                Effect: 'Allow',
                Action: 's3:GetObject',
                Resource: 'arn:aws:s3:::example-bucket/*',
            }

            const policy = AwsPolicy.from(statement!)
            const json = policy.toJson()

            const expected = JSON.stringify({
                Version: '2012-10-17',
                Statement: [statement],
            })

            expect(json).toEqual(expected)
        })

        it('should handle multiple statements correctly', () => {
            const policy = AwsPolicy.from(
                {
                    Effect: 'Allow',
                    Action: 's3:GetObject',
                    Resource: 'arn:aws:s3:::example-bucket/*',
                },
                {
                    Effect: 'Deny',
                    Action: 's3:DeleteObject',
                    Resource: 'arn:aws:s3:::example-bucket/sensitive/*',
                },
            )

            const json = policy.toJson()

            const expected = JSON.stringify({
                Version: '2012-10-17',
                Statement: [
                    {
                        Effect: 'Allow',
                        Action: 's3:GetObject',
                        Resource: 'arn:aws:s3:::example-bucket/*',
                    },
                    {
                        Effect: 'Deny',
                        Action: 's3:DeleteObject',
                        Resource: 'arn:aws:s3:::example-bucket/sensitive/*',
                    },
                ],
            })

            expect(json).toEqual(expected)
        })

        it('should preserve array for actions and resources', () => {
            const policy = AwsPolicy.from({
                Effect: 'Allow',
                Action: ['s3:GetObject', 's3:ListBucket'],
                Resource: ['arn:aws:s3:::example-bucket', 'arn:aws:s3:::example-bucket/*'],
            })

            const json = policy.toJson()

            const expected = JSON.stringify({
                Version: '2012-10-17',
                Statement: [
                    {
                        Effect: 'Allow',
                        Action: ['s3:GetObject', 's3:ListBucket'],
                        Resource: ['arn:aws:s3:::example-bucket', 'arn:aws:s3:::example-bucket/*'],
                    },
                ],
            })

            expect(json).toEqual(expected)
        })
    })
})
