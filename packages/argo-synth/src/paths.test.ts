import { describe, it, expect, beforeEach } from 'vitest'
import { addSynthPath, getSynthPath } from './paths'
import { Construct } from 'constructs'
import { App } from 'cdk8s'

// Create actual construct instances since we're testing real behavior
class TestConstruct extends Construct {
    constructor(scope: Construct, id: string) {
        super(scope, id)
    }
}

describe('synth-path', () => {
    let app: App

    beforeEach(() => {
        app = new App()
    })

    it('should set and get a path', () => {
        const construct = new TestConstruct(app, 'test1')

        addSynthPath(construct, 'staging')

        expect(getSynthPath(construct)).toBe('staging')
    })

    it('should set and get multiple path segments', () => {
        const construct = new TestConstruct(app, 'test2')

        addSynthPath(construct, 'staging', 'web-api')

        expect(getSynthPath(construct)).toBe('staging/web-api')
    })

    it('should keep paths independent between constructs', () => {
        const construct1 = new TestConstruct(app, 'construct1')
        const construct2 = new TestConstruct(app, 'construct2')

        addSynthPath(construct1, 'staging')
        addSynthPath(construct2, 'prod')

        expect(getSynthPath(construct1)).toBe('staging')
        expect(getSynthPath(construct2)).toBe('prod')
    })

    it('should append to existing paths', () => {
        const construct = new TestConstruct(app, 'test3')

        addSynthPath(construct, 'staging')
        expect(getSynthPath(construct)).toBe('staging')

        addSynthPath(construct, 'web-api')
        expect(getSynthPath(construct)).toBe('staging/web-api')
    })

    it('should work with parent-child constructs', () => {
        const parent = new TestConstruct(app, 'parent')
        addSynthPath(parent, 'staging')

        const child = new TestConstruct(parent, 'child')
        addSynthPath(child, 'web-api')

        expect(getSynthPath(parent)).toBe('staging')
        expect(getSynthPath(child)).toBe('staging/web-api')
    })

    it('should throw when no path is set', () => {
        const construct = new TestConstruct(app, 'test4')
        expect(() => getSynthPath(construct)).toThrow(/No synth path found/)
    })
})
