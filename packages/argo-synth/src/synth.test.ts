import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { App, Chart, ApiObject } from 'cdk8s'
import * as fs from 'fs/promises'
import * as path from 'path'
import { existsSync } from 'fs'
import { addSynthPath } from './paths'
import * as YAML from 'yaml'
import { synthApp, synthApps } from './synth'
import * as os from 'os'

describe('synth functionality', () => {
    let tempDir: string

    // Simple deployment definition
    const simpleDeployment = {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: { name: 'deployment' },
        spec: { replicas: 1 },
    }

    // Simple service definition
    const simpleService = {
        apiVersion: 'v1',
        kind: 'Service',
        metadata: { name: 'service' },
        spec: { ports: [{ port: 80 }] },
    }

    beforeEach(async () => {
        tempDir = path.join(os.tmpdir(), `cdk8s-test-${Date.now()}`)
        await fs.mkdir(tempDir, { recursive: true })
    })

    afterEach(async () => {
        if (existsSync(tempDir)) {
            await fs.rm(tempDir, { recursive: true, force: true })
        }
    })

    it('should synthesize ApiObjects to the correct paths with proper YAML content', async () => {
        // Create app and chart
        const app = new App()
        const chart = new Chart(app, 'chart')

        // Add synth path to chart
        addSynthPath(chart, 'staging', 'web-api')

        // Create API objects
        new ApiObject(chart, 'deployment', simpleDeployment)
        new ApiObject(chart, 'service', simpleService)

        // Synthesize
        await synthApp(tempDir, app)

        // Verify files exist
        const deploymentPath = path.join(
            tempDir,
            'staging',
            'web-api',
            'Deployment.deployment.yaml',
        )
        const servicePath = path.join(tempDir, 'staging', 'web-api', 'Service.service.yaml')

        expect(existsSync(deploymentPath)).toBe(true)
        expect(existsSync(servicePath)).toBe(true)

        // Verify YAML content
        const deploymentContent = await fs.readFile(deploymentPath, 'utf8')
        const serviceContent = await fs.readFile(servicePath, 'utf8')

        // Parse YAML to verify structure
        const deploymentYaml = YAML.parse(deploymentContent)
        const serviceYaml = YAML.parse(serviceContent)

        // Expected YAML structures
        const expectedDeployment = {
            apiVersion: 'apps/v1',
            kind: 'Deployment',
            metadata: { name: 'deployment' },
            spec: { replicas: 1 },
        }

        const expectedService = {
            apiVersion: 'v1',
            kind: 'Service',
            metadata: { name: 'service' },
            spec: { ports: [{ port: 80 }] },
        }

        // Compare parsed YAML with expected structure
        expect(deploymentYaml).toEqual(expect.objectContaining(expectedDeployment))
        expect(serviceYaml).toEqual(expect.objectContaining(expectedService))
    })

    it('should synthesize multiple charts with different paths', async () => {
        const app = new App()

        // Create charts with different paths
        const stagingChart = new Chart(app, 'staging-chart')
        addSynthPath(stagingChart, 'staging', 'api')
        new ApiObject(stagingChart, 'deployment', simpleDeployment)

        const prodChart = new Chart(app, 'prod-chart')
        addSynthPath(prodChart, 'prod', 'api')
        new ApiObject(prodChart, 'deployment', simpleDeployment)

        // Synthesize
        await synthApp(tempDir, app)

        // Verify files exist
        const stagingPath = path.join(tempDir, 'staging', 'api', 'Deployment.deployment.yaml')
        const prodPath = path.join(tempDir, 'prod', 'api', 'Deployment.deployment.yaml')

        expect(existsSync(stagingPath)).toBe(true)
        expect(existsSync(prodPath)).toBe(true)
    })

    it('should synthesize multiple apps with synthApps function', async () => {
        // Create app1
        const app1 = new App()
        const chart1 = new Chart(app1, 'chart1')
        addSynthPath(chart1, 'app1', 'service')
        new ApiObject(chart1, 'deployment', simpleDeployment)

        // Create app2
        const app2 = new App()
        const chart2 = new Chart(app2, 'chart2')
        addSynthPath(chart2, 'app2', 'service')
        new ApiObject(chart2, 'deployment', simpleDeployment)

        // Synthesize both apps
        await synthApps(tempDir, [app1, app2])

        // Verify files exist
        const app1Path = path.join(tempDir, 'app1', 'service', 'Deployment.deployment.yaml')
        const app2Path = path.join(tempDir, 'app2', 'service', 'Deployment.deployment.yaml')

        expect(existsSync(app1Path)).toBe(true)
        expect(existsSync(app2Path)).toBe(true)
    })
})
