import { Yaml } from 'cdk8s'
import { writeFile } from 'fs/promises'
import path from 'path'
import { type GitOpsHelmChart } from '../helm/chart'
import { getSynthPath } from '../paths'
import { synthApiObjects } from './api-object'
import { ensureDirectory } from './fs'

const HELM_TEMPLATES_PATH = 'templates'

/**
 * Synthesizes a helm umbrella chart.
 *
 * - Renders API objects under `templates/`
 * - Generates `Chart.yaml` and `values.yaml`
 */
export const synthHelmChart = async (outputPath: string, helmChart: GitOpsHelmChart) => {
    const { name, version, repository, values } = helmChart

    const chartOutputPath = path.join(outputPath, getSynthPath(helmChart))

    // Create the chart output directory
    await ensureDirectory(chartOutputPath)

    // Check if there are any API objects to synthesize
    const apiObjects = helmChart.apiObjects

    let apiObjectsPromise = Promise.resolve()

    if (apiObjects.length > 0) {
        // Only create templates directory if there are API objects
        const templatesOutputPath = path.join(chartOutputPath, HELM_TEMPLATES_PATH)
        await ensureDirectory(templatesOutputPath)

        apiObjectsPromise = synthApiObjects(outputPath, helmChart, HELM_TEMPLATES_PATH)
    }

    /** [Chart.yaml](https://v2.helm.sh/docs/developing_charts/#the-chart-yaml-file) content */
    const chartYaml = {
        apiVersion: 'v2',
        name,
        version,
        description: `${name} cluster addon, managed by CDK8S.`,
        dependencies: [{ name, repository, version }],
    }

    const chartYamlPromise = writeFile(
        path.join(chartOutputPath, 'Chart.yaml'),
        Yaml.stringify(chartYaml),
    )

    // Dependencies only respect values under chart name.
    const chartValues = { [name]: values }
    const valuesPromise = writeFile(
        path.join(chartOutputPath, 'values.yaml'),
        Yaml.stringify(chartValues),
    )

    await Promise.all([apiObjectsPromise, chartYamlPromise, valuesPromise])
}
