import { EnvId } from '@cdklib/config/types'
import { Construct } from 'constructs'

/** A context key used on constructs to propagate the env id */
const ENV_CONTEXT_KEY = '@cdklib/config/envId'

type EnvContext = EnvId | Construct

// Both functions can be used to initialize context of a CDK app
export const setEnvContext = (scope: Construct, envId: EnvId) =>
    scope.node.setContext(ENV_CONTEXT_KEY, envId)

export const initialContext = (envId: EnvId) => ({ [ENV_CONTEXT_KEY]: envId })

/**
 * Returns the environment id from the construct context.
 */
export const getEnvId = (context: EnvContext) => {
    if (!(context instanceof Construct)) return context
    return context.node.getContext(ENV_CONTEXT_KEY)
}
