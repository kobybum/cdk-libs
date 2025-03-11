import { addSynthPath, getSynthPath } from './paths'
import { synthApps } from './synth/synth'
export { GitOpsHelmChart, type GitOpsHelmChartConfig as GitOpsHelmChartOptions } from './helm/chart'

/**
 * ArgoSynth provides utilities for organizing and synthesizing CDK8s apps into
 * directory structures that work well with ArgoCD's path-based application definitions.
 *
 * @example
 * ```typescript
 * import { App, Chart } from 'cdk8s';
 * import { ArgoSynth } from '@cdklib/argo-synth';
 *
 * // Create an app for each environment
 * const stagingApp = new App();
 * const prodApp = new App();
 *
 * // Create charts for your services
 * const stagingWebChart = new Chart(stagingApp, 'web');
 * const prodWebChart = new Chart(prodApp, 'web');
 *
 * // Set paths for ArgoCD directory structure
 * ArgoSynth.addPath(stagingWebChart, 'staging', 'web');
 * ArgoSynth.addPath(prodWebChart, 'prod', 'web');
 *
 * // Synthesize to output directory
 * await ArgoSynth.synth('gitops', [stagingApp, prodApp]);
 * ```
 *
 * This creates a directory structure like:
 * ```
 * gitops/
 * ├── staging/
 * │   └── web/
 * │       └── ... (manifests)
 * └── prod/
 *     └── web/
 *         └── ... (manifests)
 * ```
 *
 * Which maps cleanly to ArgoCD applications targeting paths like:
 * - `staging/web`
 * - `prod/web`
 */
export class ArgoSynth {
    /** Synthesizes multiple applications with regards to ArgoCD paths */
    static synth = synthApps
    /** Adds a suffix to the synthesized path for ArgoCD apps */
    static addPath = addSynthPath
    /** Gets the synth path for the cdk8s App / Chart */
    static getPath = getSynthPath
}
