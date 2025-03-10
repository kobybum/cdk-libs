import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { App, ApiObject } from 'cdk8s'
import * as fs from 'fs/promises'
import * as path from 'path'
import { existsSync } from 'fs'
import * as YAML from 'yaml'
import * as os from 'os'
import { GitOpsHelmChart } from '../helm/chart'
import { synthHelmChart } from './helm-chart'

describe('Helm chart synthesis', () => {
    let tempDir: string

    beforeEach(async () => {
        tempDir = path.join(os.tmpdir(), `cdk8s-test-${Date.now()}`)
        await fs.mkdir(tempDir, { recursive: true })
    })

    afterEach(async () => {
        if (existsSync(tempDir)) {
            await fs.rm(tempDir, { force: true, recursive: true })
        }
    })

    it('should synthesize a basic helm umbrella chart', async () => {
        // Create app
        const app = new App()

        // Create a GitOpsHelmChart with simple values
        const helmChart = new GitOpsHelmChart(app, {
            name: 'test-chart',
            repository: 'https://charts.example.com/',
            version: '1.0.0',
            values: {
                enabled: true,
                replicas: 3,
            },
            synthPath: 'helm-test',
        })

        // Add a simple API object
        new ApiObject(helmChart, 'configmap', {
            apiVersion: 'v1',
            kind: 'ConfigMap',
            metadata: { name: 'test-config' },
            data: { key: 'value' },
        })

        // Synthesize directly using synthHelmChart
        await synthHelmChart(tempDir, helmChart)

        // Verify Chart.yaml exists and has correct content
        const chartYamlPath = path.join(tempDir, 'helm-test', 'Chart.yaml')
        expect(existsSync(chartYamlPath)).toBe(true)

        const chartYamlContent = await fs.readFile(chartYamlPath, 'utf8')
        const chartYaml = YAML.parse(chartYamlContent)

        // Verify Chart.yaml structure
        expect(chartYaml).toEqual({
            apiVersion: 'v2',
            name: 'test-chart',
            version: '1.0.0',
            description: 'test-chart cluster addon, managed by CDK8S.',
            dependencies: [
                {
                    name: 'test-chart',
                    repository: 'https://charts.example.com/',
                    version: '1.0.0',
                },
            ],
        })

        // Verify values.yaml exists and has correct content
        const valuesYamlPath = path.join(tempDir, 'helm-test', 'values.yaml')
        expect(existsSync(valuesYamlPath)).toBe(true)

        const valuesYamlContent = await fs.readFile(valuesYamlPath, 'utf8')
        const valuesYaml = YAML.parse(valuesYamlContent)

        // Verify values.yaml structure
        expect(valuesYaml).toEqual({
            'test-chart': {
                enabled: true,
                replicas: 3,
            },
        })

        // Verify templates directory exists
        const templatesDir = path.join(tempDir, 'helm-test', 'templates')
        expect(existsSync(templatesDir)).toBe(true)

        // Verify template file exists - note the path includes 'templates' twice because of how addSynthPath works
        const configMapPath = path.join(
            tempDir,
            'helm-test',
            'templates',
            'ConfigMap.test-config.yaml',
        )
        expect(existsSync(configMapPath)).toBe(true)

        // Verify template content
        const configMapContent = await fs.readFile(configMapPath, 'utf8')
        const configMapYaml = YAML.parse(configMapContent)

        expect(configMapYaml).toEqual({
            apiVersion: 'v1',
            kind: 'ConfigMap',
            metadata: expect.objectContaining({ name: 'test-config' }),
            data: { key: 'value' },
        })
    })

    it('should synthesize a helm chart with nested path', async () => {
        // Create app
        const app = new App()

        // Create a GitOpsHelmChart with nested path
        const helmChart = new GitOpsHelmChart(app, {
            name: 'example',
            repository: 'https://charts.example.com/',
            version: '1.2.0',
            values: {
                enabled: true,
            },
            synthPath: ['environments', 'staging', 'example'],
        })

        // Add a simple API object
        new ApiObject(helmChart, 'configmap', {
            apiVersion: 'v1',
            kind: 'ConfigMap',
            metadata: { name: 'test-config' },
            data: { key: 'value' },
        })

        // Synthesize
        await synthHelmChart(tempDir, helmChart)

        // Verify Chart.yaml exists with correct path
        const chartYamlPath = path.join(tempDir, 'environments', 'staging', 'example', 'Chart.yaml')
        expect(existsSync(chartYamlPath)).toBe(true)

        // Verify values.yaml exists with correct path
        const valuesYamlPath = path.join(
            tempDir,
            'environments',
            'staging',
            'example',
            'values.yaml',
        )
        expect(existsSync(valuesYamlPath)).toBe(true)

        // Verify templates directory exists
        const templatesDir = path.join(tempDir, 'environments', 'staging', 'example', 'templates')
        expect(existsSync(templatesDir)).toBe(true)

        // Verify template exists with correct path
        const configMapPath = path.join(
            tempDir,
            'environments',
            'staging',
            'example',
            'templates',
            'ConfigMap.test-config.yaml',
        )
        expect(existsSync(configMapPath)).toBe(true)
    })

    it('should synthesize a helm chart with multiple API objects', async () => {
        // Create app
        const app = new App()

        // Create a GitOpsHelmChart
        const helmChart = new GitOpsHelmChart(app, {
            name: 'multi-resource',
            repository: 'https://charts.example.com/',
            version: '1.0.0',
            values: {
                enabled: true,
            },
            synthPath: 'multi-test',
        })

        // Add multiple API objects
        new ApiObject(helmChart, 'configmap1', {
            apiVersion: 'v1',
            kind: 'ConfigMap',
            metadata: { name: 'config-one' },
            data: { key: 'value1' },
        })

        new ApiObject(helmChart, 'configmap2', {
            apiVersion: 'v1',
            kind: 'ConfigMap',
            metadata: { name: 'config-two' },
            data: { key: 'value2' },
        })

        // Synthesize
        await synthHelmChart(tempDir, helmChart)

        // Verify templates directory exists
        const templatesDir = path.join(tempDir, 'multi-test', 'templates')
        expect(existsSync(templatesDir)).toBe(true)

        // Verify all templates exist
        const configMap1Path = path.join(
            tempDir,
            'multi-test',
            'templates',
            'ConfigMap.config-one.yaml',
        )
        const configMap2Path = path.join(
            tempDir,
            'multi-test',
            'templates',
            'ConfigMap.config-two.yaml',
        )

        expect(existsSync(configMap1Path)).toBe(true)
        expect(existsSync(configMap2Path)).toBe(true)
    })

    it('should not create templates directory when there are no API objects', async () => {
        // Create app
        const app = new App()

        // Create a GitOpsHelmChart without any API objects
        const helmChart = new GitOpsHelmChart(app, {
            name: 'empty-chart',
            repository: 'https://charts.example.com/',
            version: '1.0.0',
            values: {
                enabled: true,
            },
            synthPath: 'empty-test',
        })

        // Synthesize
        await synthHelmChart(tempDir, helmChart)

        // Verify Chart.yaml exists
        const chartYamlPath = path.join(tempDir, 'empty-test', 'Chart.yaml')
        expect(existsSync(chartYamlPath)).toBe(true)

        // Verify values.yaml exists
        const valuesYamlPath = path.join(tempDir, 'empty-test', 'values.yaml')
        expect(existsSync(valuesYamlPath)).toBe(true)

        // Verify templates directory does NOT exist
        const templatesDir = path.join(tempDir, 'empty-test', 'templates')
        expect(existsSync(templatesDir)).toBe(false)
    })
})
