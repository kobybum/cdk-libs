import { describe, expect, it } from 'vitest'
import { AwsPreparedPolicy } from './prepared-policy'

describe('PreparedPolicy', () => {
    it('should create a policy with a single statement', () => {
        // Arrange
        const s3ReadPolicy = new AwsPreparedPolicy<{
            bucketName: string
        }>(({ bucketName }) => ({
            Effect: 'Allow',
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucketName}/*`],
        }))

        // Act
        const policy = s3ReadPolicy.fill({ bucketName: 'test-bucket' })
        const policyJson = JSON.parse(policy.toJson())

        // Assert
        expect(policyJson.Version).toBe('2012-10-17')
        expect(policyJson.Statement).toHaveLength(1)
        expect(policyJson.Statement[0].Resource[0]).toBe('arn:aws:s3:::test-bucket/*')
        expect(policyJson.Statement[0].Effect).toBe('Allow')
    })

    it('should create a policy with multiple statements', () => {
        // Arrange
        const complexPolicy = new AwsPreparedPolicy<{
            bucketName: string
            lambdaName: string
        }>(({ bucketName, lambdaName }) => [
            {
                Effect: 'Allow',
                Action: ['s3:GetObject'],
                Resource: [`arn:aws:s3:::${bucketName}/*`],
            },
            {
                Effect: 'Allow',
                Action: ['lambda:InvokeFunction'],
                Resource: [`arn:aws:lambda:*:*:function:${lambdaName}`],
            },
        ])

        // Act
        const policy = complexPolicy.fill({
            bucketName: 'data-bucket',
            lambdaName: 'process-function',
        })
        const policyJson = JSON.parse(policy.toJson())

        // Assert
        expect(policyJson.Statement).toHaveLength(2)
        expect(policyJson.Statement[0].Resource[0]).toBe('arn:aws:s3:::data-bucket/*')
        expect(policyJson.Statement[1].Resource[0]).toBe(
            'arn:aws:lambda:*:*:function:process-function',
        )
    })

    it('should allow partial filling of parameters', () => {
        // Arrange
        const s3ReadPolicy = new AwsPreparedPolicy<{
            bucketName: string
            accountId: string
        }>(({ bucketName, accountId }) => ({
            Effect: 'Allow',
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucketName}/*`],
            Principal: {
                AWS: `arn:aws:iam::${accountId}:root`,
            },
        }))

        // Act
        const partialPolicy = s3ReadPolicy.fillPartial({
            bucketName: 'shared-bucket',
        })
        const fullPolicy = partialPolicy.fill({
            accountId: '123456789012',
        })
        const policyJson = JSON.parse(fullPolicy.toJson())

        // Assert
        expect(policyJson.Statement[0].Resource[0]).toBe('arn:aws:s3:::shared-bucket/*')
        expect(policyJson.Statement[0].Principal.AWS).toBe('arn:aws:iam::123456789012:root')
    })

    it('should handle complex nested structures', () => {
        // Arrange
        const complexPolicy = new AwsPreparedPolicy<{
            bucketName: string
            ipAddress: string
        }>(({ bucketName, ipAddress }) => ({
            Effect: 'Allow',
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucketName}/*`],
            Condition: {
                IpAddress: {
                    'aws:SourceIp': ipAddress,
                },
            },
        }))

        // Act
        const policy = complexPolicy.fill({
            bucketName: 'private-bucket',
            ipAddress: '192.168.1.1/32',
        })
        const policyJson = JSON.parse(policy.toJson())

        // Assert
        expect(policyJson.Statement[0].Condition.IpAddress['aws:SourceIp']).toBe('192.168.1.1/32')
    })

    it('should handle multiple parameter filling stages', () => {
        // Arrange
        const multiStagePolicy = new AwsPreparedPolicy<{
            bucketName: string
            accountId: string
            userName: string
        }>(({ bucketName, accountId, userName }) => ({
            Effect: 'Allow',
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucketName}/*`],
            Principal: {
                AWS: `arn:aws:iam::${accountId}:user/${userName}`,
            },
        }))

        // Act
        const stage1 = multiStagePolicy.fillPartial({
            bucketName: 'company-data',
        })
        const stage2 = stage1.fillPartial({
            accountId: '123456789012',
        })
        const finalPolicy = stage2.fill({
            userName: 'developer',
        })
        const policyJson = JSON.parse(finalPolicy.toJson())

        // Assert
        expect(policyJson.Statement[0].Resource[0]).toBe('arn:aws:s3:::company-data/*')
        expect(policyJson.Statement[0].Principal.AWS).toBe(
            'arn:aws:iam::123456789012:user/developer',
        )
    })

    describe('AwsPreparedPolicy.combine', () => {
        it('should combine multiple prepared policies with different parameter types', () => {
            // Arrange
            const s3Policy = new AwsPreparedPolicy<{
                bucketName: string
            }>(({ bucketName }) => ({
                Effect: 'Allow',
                Action: ['s3:GetObject', 's3:ListBucket'],
                Resource: [`arn:aws:s3:::${bucketName}`, `arn:aws:s3:::${bucketName}/*`],
            }))

            const lambdaPolicy = new AwsPreparedPolicy<{
                functionName: string
                region: string
            }>(({ functionName, region }) => ({
                Effect: 'Allow',
                Action: ['lambda:InvokeFunction'],
                Resource: [`arn:aws:lambda:${region}:*:function:${functionName}`],
            }))

            // Act
            const combinedPolicy = AwsPreparedPolicy.combine(s3Policy, lambdaPolicy)

            // Assert - TypeScript should enforce all parameters are required
            const policy = combinedPolicy.fill({
                bucketName: 'data-bucket',
                functionName: 'processor',
                region: 'us-west-2',
            })

            const policyJson = JSON.parse(policy.toJson())

            expect(policyJson.Statement).toHaveLength(2)
            expect(policyJson.Statement[0].Resource).toContain('arn:aws:s3:::data-bucket')
            expect(policyJson.Statement[1].Resource[0]).toBe(
                'arn:aws:lambda:us-west-2:*:function:processor',
            )
        })

        it('should handle policies that return multiple statements', () => {
            // Arrange
            const s3Policy = new AwsPreparedPolicy<{
                bucketName: string
            }>(({ bucketName }) => [
                {
                    Effect: 'Allow',
                    Action: 's3:GetObject',
                    Resource: `arn:aws:s3:::${bucketName}/*`,
                },
                {
                    Effect: 'Allow',
                    Action: 's3:ListBucket',
                    Resource: `arn:aws:s3:::${bucketName}`,
                },
            ])

            const dynamoPolicy = new AwsPreparedPolicy<{
                tableName: string
            }>(({ tableName }) => ({
                Effect: 'Allow',
                Action: ['dynamodb:GetItem', 'dynamodb:PutItem'],
                Resource: `arn:aws:dynamodb:*:*:table/${tableName}`,
            }))

            // Act
            const combinedPolicy = AwsPreparedPolicy.combine(s3Policy, dynamoPolicy)
            const policy = combinedPolicy.fill({
                bucketName: 'assets',
                tableName: 'users',
            })

            const policyJson = JSON.parse(policy.toJson())

            // Assert
            expect(policyJson.Statement).toHaveLength(3)
            expect(policyJson.Statement[0].Resource).toBe('arn:aws:s3:::assets/*')
            expect(policyJson.Statement[1].Resource).toBe('arn:aws:s3:::assets')
            expect(policyJson.Statement[2].Resource).toBe('arn:aws:dynamodb:*:*:table/users')
        })

        it('should work with partial filling', () => {
            // Arrange
            const s3Policy = new AwsPreparedPolicy<{
                bucketName: string
            }>(({ bucketName }) => ({
                Effect: 'Allow',
                Action: 's3:GetObject',
                Resource: `arn:aws:s3:::${bucketName}/*`,
            }))

            const snsPolicy = new AwsPreparedPolicy<{
                topicName: string
            }>(({ topicName }) => ({
                Effect: 'Allow',
                Action: 'sns:Publish',
                Resource: `arn:aws:sns:*:*:${topicName}`,
            }))

            // Act
            const combinedPolicy = AwsPreparedPolicy.combine(s3Policy, snsPolicy)

            // Partially fill
            const partialPolicy = combinedPolicy.fillPartial({
                bucketName: 'logs',
            })

            // Fill remaining params
            const fullPolicy = partialPolicy.fill({
                topicName: 'alerts',
            })

            const policyJson = JSON.parse(fullPolicy.toJson())

            // Assert
            expect(policyJson.Statement).toHaveLength(2)
            expect(policyJson.Statement[0].Resource).toBe('arn:aws:s3:::logs/*')
            expect(policyJson.Statement[1].Resource).toBe('arn:aws:sns:*:*:alerts')
        })
    })
})
