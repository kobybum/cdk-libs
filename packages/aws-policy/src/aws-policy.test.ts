import { describe, expect, it } from 'vitest'
import { AwsPolicy } from './aws-policy'
import { type AwsPolicyStatementProps } from './statement'

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

    describe('combine policies', () => {
        it('should combine multiple policies into one', () => {
            // Arrange
            const readPolicy = AwsPolicy.from({
                Effect: 'Allow',
                Action: 's3:GetObject',
                Resource: 'arn:aws:s3:::my-bucket/*',
            })

            const listPolicy = AwsPolicy.from({
                Effect: 'Allow',
                Action: 's3:ListBucket',
                Resource: 'arn:aws:s3:::my-bucket',
            })

            const denyPolicy = AwsPolicy.from({
                Effect: 'Deny',
                Action: 's3:DeleteObject',
                Resource: 'arn:aws:s3:::my-bucket/*',
            })

            // Act
            const combinedPolicy = AwsPolicy.combine([readPolicy, listPolicy, denyPolicy])
            const policyJson = JSON.parse(combinedPolicy.toJson())

            // Assert
            expect(policyJson.Statement).toHaveLength(3)
            expect(policyJson.Statement[0].Action).toBe('s3:GetObject')
            expect(policyJson.Statement[1].Action).toBe('s3:ListBucket')
            expect(policyJson.Statement[2].Effect).toBe('Deny')
        })

        it('should return an empty policy when no policies are provided', () => {
            // Act
            const emptyPolicy = AwsPolicy.combine([])
            const policyJson = JSON.parse(emptyPolicy.toJson())

            // Assert
            expect(policyJson.Statement).toHaveLength(0)
        })

        it('should handle policies with multiple statements', () => {
            // Arrange
            const multiStatementPolicy = AwsPolicy.from(
                { Effect: 'Allow', Action: 's3:GetObject', Resource: 'arn:aws:s3:::bucket-1/*' },
                { Effect: 'Allow', Action: 's3:ListBucket', Resource: 'arn:aws:s3:::bucket-1' },
            )

            const singleStatementPolicy = AwsPolicy.from({
                Effect: 'Allow',
                Action: 's3:GetObject',
                Resource: 'arn:aws:s3:::bucket-2/*',
            })

            // Act
            const combinedPolicy = AwsPolicy.combine([multiStatementPolicy, singleStatementPolicy])
            const policyJson = JSON.parse(combinedPolicy.toJson())

            // Assert
            expect(policyJson.Statement).toHaveLength(3)
        })
    })
})
