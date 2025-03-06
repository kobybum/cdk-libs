import { ApiObject, type App, Yaml } from 'cdk8s'
import { type Construct } from 'constructs'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { getSynthPath } from './paths'

/** Returns all API objects and cdk8s-plus resources */
const getApiObjects = (scope: Construct) =>
    scope.node
        .findAll()
        .map((s) => {
            if (s instanceof ApiObject) return s

            /** Handle cdk8s-plus resources */
            const apiObject = (s as unknown as { apiObject: ApiObject }).apiObject
            if (apiObject) return apiObject

            return undefined
        })
        .filter(Boolean) as ApiObject[]

/** Synthesize all API object to the relevant path */
const synthApiObjects = async (outputPath: string, scope: Construct) => {
    const apiObjects = getApiObjects(scope)
    if (!apiObjects.length) return

    const synthPath = path.join(outputPath, getSynthPath(apiObjects[0]!))
    await mkdir(synthPath, { recursive: true })

    // Render chart resources under templates/ directory
    await Promise.all(
        apiObjects.map((o) =>
            writeFile(path.join(synthPath, `${o.kind}.${o.name}.yaml`), Yaml.stringify(o.toJson())),
        ),
    )
}

/**
 * Synthesizes an application with regards to ArgoCD paths.
 *
 * @param outputPath - The base path to output the synthesized resources
 * @param app - The application to synthesize
 */
export const synthApp = async (outputPath: string, app: App) => {
    const appSynthPromises = app.charts.map(async (app) => {
        await synthApiObjects(outputPath, app)
    })

    await Promise.all(appSynthPromises)
}

/**
 * Synthesizes all applications with regards to ArgoCD paths.
 *
 * @param outputPath - The base path to output the synthesized resources
 * @param apps - The applications to synthesize
 */
export const synthApps = async (outputPath: string, apps: App[]) => {
    await Promise.all(apps.map((app) => synthApp(outputPath, app)))
}
