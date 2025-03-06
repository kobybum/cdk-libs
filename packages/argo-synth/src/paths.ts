import { type Construct } from 'constructs'
import path from 'path'

const SYNTH_PATH_KEY = '@cdklib/argocd/synthPath'

/**
 * Adds a suffix to the synthesized path
 *
 * Use this to structure your environments / apps for ArgoCD
 */
export const addSynthPath = (scope: Construct, ...suffixes: string[]) => {
    let currentPath: string = ''
    try {
        currentPath = getSynthPath(scope)
    } catch {
        // no-op
    }

    const basePath = currentPath ? [currentPath] : []

    scope.node.setContext(SYNTH_PATH_KEY, path.join(...basePath, ...suffixes))
}

/**
 * Gets the synth path for the cdk8s App / Chart
 *
 * Uses context to store the path (addSynthPath)
 */
export const getSynthPath = (scope: Construct): string => {
    try {
        return scope.node.getContext(SYNTH_PATH_KEY)
    } catch (e) {
        if (e instanceof Error && e.message.includes('No context value')) {
            throw new Error('No synth path found - call addSynthPath first')
        }
        throw e
    }
}
