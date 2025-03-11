import { type App, Chart } from 'cdk8s'
import { addSynthPath } from 'src/paths'

/**
 * Configuration for a GitOps Helm chart.
 *
 * @see {@link GitOpsHelmChart}
 */
export type GitOpsHelmChartConfig = {
    /** Name of the Helm chart */
    name: string

    /** Repository of the Helm chart */
    repository: string

    /** Version of the Helm chart */
    version: string

    /** Values to pass to the Helm chart */
    values: Record<string, unknown>

    /** Synth path (relative to the cdk8s App) to save the umbrella chart */
    synthPath: string | string[]
}

/**
 * Creates a Helm umbrella chart for Kubernetes addons.
 *
 * You can create Argo applications that point to this directory to manage the helm chart.
 *
 * The chart and full values are rendered to the output directory.
 *
 * Api Objects under the Helm Chart are rendered to the template/ directory, and will be managed by argo
 */
export class GitOpsHelmChart extends Chart {
    readonly name: string
    readonly version: string
    readonly repository: string
    readonly values: Record<string, unknown>

    constructor(
        scope: App,
        { name, values, synthPath, version, repository }: GitOpsHelmChartConfig,
    ) {
        super(scope, name, {})

        this.name = name
        this.version = version
        this.values = values
        this.repository = repository
        const pathParts = Array.isArray(synthPath) ? synthPath : [synthPath]

        addSynthPath(this, ...pathParts)
    }
}
