import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AwsPreparedPolicy } from './prepared-policy'
import { Construct, RootConstruct } from 'constructs'

// Mock config system to simulate what users would do with real config
const mockAwsConfig = {
    get: vi.fn(),
}

// Mock Construct class
class MockConstruct extends RootConstruct {
    constructor(id: string) {
        super(id)
    }
}

describe('ScopedAwsPreparedPolicy', () => {
    let mockScope: Construct

    beforeEach(() => {
        mockScope = new MockConstruct('test-scope')

        // Reset the mock
        vi.resetAllMocks()

        // Set up default config values
        mockAwsConfig.get.mockReturnValue({
            accountId: '123456789012',
            region: 'us-east-1',
            environment: 'dev',
        })
    })

    it('should create a policy with scope-based values', () => {
        // Arrange
        const s3ReadPolicy = AwsPreparedPolicy.newScoped<{
            bucketName: string
        }>((scope, { bucketName }) => {
            // Get config from scope
            const { accountId } = mockAwsConfig.get(scope)

            return {
                Effect: 'Allow',
                Action: ['s3:GetObject'],
                Resource: [`arn:aws:s3:::${bucketName}/*`],
                Principal: {
                    AWS: `arn:aws:iam::${accountId}:root`,
                },
            }
        })

        // Act
        const policy = s3ReadPolicy.fill(mockScope, { bucketName: 'test-bucket' })
        const policyJson = JSON.parse(policy.toJson())

        // Assert
        expect(mockAwsConfig.get).toHaveBeenCalledWith(mockScope)
        expect(policyJson.Statement[0].Resource[0]).toBe('arn:aws:s3:::test-bucket/*')
        expect(policyJson.Statement[0].Principal.AWS).toBe('arn:aws:iam::123456789012:root')
    })

    it('should create multi-statement policies with scope', () => {
        // Arrange
        const complexPolicy = AwsPreparedPolicy.newScoped<{
            bucketName: string
            lambdaName: string
        }>((scope, { bucketName, lambdaName }) => {
            // Get config from scope
            const { accountId, region } = mockAwsConfig.get(scope)

            return [
                {
                    Effect: 'Allow',
                    Action: ['s3:GetObject'],
                    Resource: [`arn:aws:s3:::${bucketName}/*`],
                },
                {
                    Effect: 'Allow',
                    Action: ['lambda:InvokeFunction'],
                    Resource: [`arn:aws:lambda:${region}:${accountId}:function:${lambdaName}`],
                },
            ]
        })

        // Act
        const policy = complexPolicy.fill(mockScope, {
            bucketName: 'data-bucket',
            lambdaName: 'process-function',
        })
        const policyJson = JSON.parse(policy.toJson())

        // Assert
        expect(mockAwsConfig.get).toHaveBeenCalledWith(mockScope)
        expect(policyJson.Statement).toHaveLength(2)
        expect(policyJson.Statement[0].Resource[0]).toBe('arn:aws:s3:::data-bucket/*')
        expect(policyJson.Statement[1].Resource[0]).toBe(
            'arn:aws:lambda:us-east-1:123456789012:function:process-function',
        )
    })

    it('should support partial parameter filling with scope', () => {
        // Arrange
        const envPolicy = AwsPreparedPolicy.newScoped<{
            serviceName: string
            bucketName: string
        }>((scope, { serviceName, bucketName }) => {
            // Get config from scope
            const { accountId, environment } = mockAwsConfig.get(scope)

            return {
                Effect: 'Allow',
                Action: ['s3:GetObject'],
                Resource: [`arn:aws:s3:::${bucketName}/${environment}/${serviceName}/*`],
                Principal: {
                    AWS: `arn:aws:iam::${accountId}:role/${serviceName}-role`,
                },
            }
        })

        // Act - fill in serviceName first
        const servicePolicy = envPolicy.fillPartial({
            serviceName: 'api',
        })

        // Then fill in bucketName and provide scope
        const fullPolicy = servicePolicy.fill(mockScope, {
            bucketName: 'company-assets',
        })

        const policyJson = JSON.parse(fullPolicy.toJson())

        // Assert
        expect(mockAwsConfig.get).toHaveBeenCalledWith(mockScope)
        expect(policyJson.Statement[0].Resource[0]).toBe('arn:aws:s3:::company-assets/dev/api/*')
        expect(policyJson.Statement[0].Principal.AWS).toBe(
            'arn:aws:iam::123456789012:role/api-role',
        )
    })

    it('should handle multi-stage parameter filling with scope', () => {
        // Arrange
        const deploymentPolicy = AwsPreparedPolicy.newScoped<{
            bucketName: string
            serviceName: string
            team: string
        }>((scope, { bucketName, serviceName, team }) => {
            // Get config from scope
            const { accountId, environment } = mockAwsConfig.get(scope)

            return {
                Effect: 'Allow',
                Action: ['s3:GetObject', 's3:PutObject'],
                Resource: [`arn:aws:s3:::${bucketName}/${environment}/${team}/${serviceName}/*`],
                Principal: {
                    AWS: `arn:aws:iam::${accountId}:role/${environment}-${serviceName}`,
                },
            }
        })

        // Act - multi-stage filling
        const stage1 = deploymentPolicy.fillPartial({
            bucketName: 'deployments',
        })

        const stage2 = stage1.fillPartial({
            team: 'backend',
        })

        const finalPolicy = stage2.fill(mockScope, {
            serviceName: 'auth-service',
        })

        const policyJson = JSON.parse(finalPolicy.toJson())

        // Assert
        expect(mockAwsConfig.get).toHaveBeenCalledWith(mockScope)
        expect(policyJson.Statement[0].Resource[0]).toBe(
            'arn:aws:s3:::deployments/dev/backend/auth-service/*',
        )
        expect(policyJson.Statement[0].Principal.AWS).toBe(
            'arn:aws:iam::123456789012:role/dev-auth-service',
        )
    })

    it('should handle different config values for different scopes', () => {
        // Arrange
        const prodScope = new MockConstruct('prod-scope')

        // Different config for prod scope
        mockAwsConfig.get.mockImplementation((scope) => {
            if (scope === prodScope) {
                return {
                    accountId: '987654321098',
                    region: 'us-west-2',
                    environment: 'prod',
                }
            }
            return {
                accountId: '123456789012',
                region: 'us-east-1',
                environment: 'dev',
            }
        })

        const s3Policy = AwsPreparedPolicy.newScoped<{
            bucketName: string
        }>((scope, { bucketName }) => {
            const { accountId, environment } = mockAwsConfig.get(scope)
            return {
                Effect: 'Allow',
                Action: ['s3:GetObject'],
                Resource: [`arn:aws:s3:::${bucketName}-${environment}/*`],
                Principal: {
                    AWS: `arn:aws:iam::${accountId}:root`,
                },
            }
        })

        // Act - create policies for different environments
        const devPolicy = s3Policy.fill(mockScope, { bucketName: 'assets' })
        const prodPolicy = s3Policy.fill(prodScope, { bucketName: 'assets' })

        const devPolicyJson = JSON.parse(devPolicy.toJson())
        const prodPolicyJson = JSON.parse(prodPolicy.toJson())

        // Assert
        expect(mockAwsConfig.get).toHaveBeenCalledWith(mockScope)
        expect(mockAwsConfig.get).toHaveBeenCalledWith(prodScope)

        expect(devPolicyJson.Statement[0].Resource[0]).toBe('arn:aws:s3:::assets-dev/*')
        expect(devPolicyJson.Statement[0].Principal.AWS).toBe('arn:aws:iam::123456789012:root')

        expect(prodPolicyJson.Statement[0].Resource[0]).toBe('arn:aws:s3:::assets-prod/*')
        expect(prodPolicyJson.Statement[0].Principal.AWS).toBe('arn:aws:iam::987654321098:root')
    })
})
