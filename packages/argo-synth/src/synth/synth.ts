import { type App, type Chart } from 'cdk8s'
import { GitOpsHelmChart } from '../helm/chart'
import { synthApiObjects } from './api-object'
import { wipeDirectory } from './fs'
import { synthHelmChart } from './helm-chart'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * Synthesizes an application with regards to ArgoCD paths.
 *
 * @param outputPath - The base path to output the synthesized resources
 * @param app - The application to synthesize
 */
export const synthApp = async (outputPath: string, app: App) => {
    const helmCharts: GitOpsHelmChart[] = []
    const otherCharts: Chart[] = []

    app.charts.forEach((o) => {
        if (o instanceof GitOpsHelmChart && 'repository' in o) {
            helmCharts.push(o as GitOpsHelmChart)
        } else {
            otherCharts.push(o)
        }
    })

    const appSynthPromises = otherCharts.map(async (chart) => {
        await synthApiObjects(outputPath, chart)
    })

    await Promise.all([
        ...helmCharts.map((helmChart) => synthHelmChart(outputPath, helmChart)),
        ...appSynthPromises,
    ])
}

type SynthOptions = {
    /**
     * Wipes the output directory before synthesizing.
     *
     * Recommended to enable this after you verify the output is correct.
     *
     * @default false
     */
    clean?: boolean

    /**
     * Whether to print a summary of synthesized files.
     *
     * @default true
     */
    summary?: boolean
}

/**
 * Creates a tree representation of synthesized files
 *
 * @param outputPath Directory containing synthesized files
 * @returns String representation of the file tree
 */
const createFileTree = async (outputPath: string): Promise<string> => {
    try {
        // Try to use the tree command if available
        const { stdout } = await execAsync(`tree ${outputPath} -I "node_modules"`)
        return stdout
    } catch {
        // Fall back to a simple listing if tree command is not available
        try {
            const { stdout } = await execAsync(`find ${outputPath} -type f | sort`)
            return stdout.split('\n').filter(Boolean).join('\n')
        } catch {
            return `Could not generate file listing for ${outputPath}.\nPlease check the directory manually.`
        }
    }
}

/**
 * Synthesizes all applications with regards to ArgoCD paths.
 *
 * @param outputPath - The base path to output the synthesized resources
 * @param apps - The applications to synthesize
 * @param options - Synthesis options
 */
export const synthApps = async (
    outputPath: string,
    apps: App[],
    { clean = false, summary = true }: SynthOptions = {},
) => {
    if (clean) await wipeDirectory(outputPath)

    const allSynthesizedFiles = await Promise.all(apps.map((app) => synthApp(outputPath, app)))
    const flattenedFiles = allSynthesizedFiles.flat()

    if (summary && flattenedFiles.length > 0) {
        const treeOutput = await createFileTree(outputPath)
        console.log(treeOutput)
    }
}
