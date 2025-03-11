import { ApiObject, Yaml } from 'cdk8s'
import { type Construct } from 'constructs'
import { writeFile } from 'fs/promises'
import path from 'path'
import { getSynthPath } from 'src/paths'
import { ensureDirectory } from './fs'

type ApiObjectResult = { apiObject: ApiObject; outputPath: string }

/** Returns all API objects and cdk8s-plus resources */
export const getApiObjects = (...scopes: Construct[]): ApiObjectResult[] =>
    scopes.flatMap(
        (s) =>
            s.node
                .findAll()
                .map((s): ApiObjectResult | undefined => {
                    if (s instanceof ApiObject) return { apiObject: s, outputPath: getSynthPath(s) }

                    /** Handle cdk8s-plus resources */
                    const apiObject = (s as unknown as { apiObject: ApiObject }).apiObject
                    if (apiObject) return { apiObject, outputPath: getSynthPath(s) }

                    return undefined
                })
                .filter(Boolean) as ApiObjectResult[],
    )

/** Synthesize all API object to the relevant path
 *
 * @param outputPath - the full path to the output directory
 * @param scope - the scope to synthesize
 */
export const synthApiObjects = async (outputPath: string, scope: Construct, suffix?: string) => {
    const apiObjects = getApiObjects(scope)
    if (!apiObjects.length) return

    const uniqueSubPaths = new Set(apiObjects.map(({ outputPath }) => outputPath))

    await Promise.all(
        Array.from(uniqueSubPaths).map((subPath) =>
            ensureDirectory(path.join(outputPath, subPath, ...(suffix ? [suffix] : []))),
        ),
    )

    // Render chart resources under templates/ directory
    await Promise.all(
        apiObjects.map(({ apiObject, outputPath: subPath }) => {
            return writeFile(
                path.join(
                    outputPath,
                    subPath,
                    ...(suffix ? [suffix] : []),
                    `${apiObject.kind}.${apiObject.name}.yaml`,
                ),
                Yaml.stringify(apiObject.toJson()),
            )
        }),
    )
}
