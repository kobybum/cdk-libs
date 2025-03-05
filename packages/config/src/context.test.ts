import { Construct, RootConstruct } from 'constructs'
import { getEnvId, initialContext, setEnvContext } from './context'
import { expect, describe, test } from 'vitest'

// Mock implementation of Construct for testing
class TestConstruct extends Construct {
    constructor(scope: Construct, id: string, envId?: string) {
        super(scope, id)

        // Set environment context during construction if provided
        if (envId) {
            setEnvContext(this, envId)
        }
    }
}

describe('CDK Environment Context Functions', () => {
    test('context propagation through construct tree', () => {
        // Create a root construct with env context set during construction
        const rootConstruct = new RootConstruct('app')
        const root = new TestConstruct(rootConstruct, 'root', 'prod')

        // Test retrieving env id directly from root
        expect(getEnvId(root)).toBe('prod')

        // Create child constructs that inherit from parent
        const child1 = new TestConstruct(root, 'child1')
        const grandchild = new TestConstruct(child1, 'grandchild')

        // Create child with overridden context
        const child2 = new TestConstruct(root, 'child2', 'dev')

        // Test context propagation down the construct tree
        expect(getEnvId(child1)).toBe('prod')
        expect(getEnvId(grandchild)).toBe('prod')

        // Test overridden context
        expect(getEnvId(child2)).toBe('dev')

        // Root and other branches should remain unchanged
        expect(getEnvId(root)).toBe('prod')
    })

    test('initialContext for app initialization', () => {
        // Test creating initial context object
        const context = initialContext('staging')

        // Verify context object structure
        expect(context).toHaveProperty('@cdklib/config/envId', 'staging')

        // Create mock app class that would use initialContext
        class MockApp {
            private readonly rootConstruct: RootConstruct
            private readonly appConstruct: Construct

            constructor(envId: string) {
                // In a real app, this context would be passed during initialization
                const context = initialContext(envId)

                // Create root construct
                this.rootConstruct = new RootConstruct('app')

                // Create app construct
                this.appConstruct = new TestConstruct(this.rootConstruct, 'main')

                // Apply context to the app construct
                Object.entries(context).forEach(([key, value]) => {
                    this.appConstruct.node.setContext(key, value)
                })
            }

            get mainConstruct() {
                return this.appConstruct
            }
        }

        // Instantiate mock app with staging env
        const app = new MockApp('staging')

        // Test retrieving from the construct
        expect(getEnvId(app.mainConstruct)).toBe('staging')
    })

    test('getEnvId with both construct and EnvId input types', () => {
        // Test with construct having environment set during construction
        const rootConstruct = new RootConstruct('app')
        const testConstruct = new TestConstruct(rootConstruct, 'test', 'test-env')
        expect(getEnvId(testConstruct)).toBe('test-env')

        // Test with direct EnvId string
        const directEnvId = 'direct-env-id'
        expect(getEnvId(directEnvId)).toBe('direct-env-id')
    })
})
