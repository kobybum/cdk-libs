# @cdklib/argo-synth

- [Table of Contents](#table-of-contents)

A directory structure management library for cdk8s projects that enables GitOps-friendly output organization for ArgoCD.

## Why This Exists

cdk8s is a great way to build Kubernetes applications. However, cdk8s's default synthesis behaviors are not argo-friendly.

ArgoCD works best with a directory structure that organizes Kubernetes resources by environment and application.

`@cdklib/argo-synth` provides a simple way to organize your cdk8s synthesized resources into a clean directory structure that's optimal for ArgoCD's path-based applications.

### Key Features

- **Simple** - Offers a clear path-based organization approach for cdk8s projects
- **ArgoCD-Optimized** - Creates a directory structure that maps perfectly to ArgoCD application paths
- **Path Inheritance** - Supports path building for complex directory structures
- **Multi-Environment** - Easily manage multiple environments in a single GitOps repository

# Table of Contents

- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Integrated Usage](#integrated-usage)
- [Directory Structure](#directory-structure)
- [Path Management](#path-management)
- [Integration with @cdklib/config](#integration-with-cdklibconfig)
- [Best Practices](#best-practices)
- [License](#license)

## Installation

```bash
# Using npm
npm install @cdklib/argo-synth

# Using yarn
yarn add @cdklib/argo-synth

# Using pnpm
pnpm add @cdklib/argo-synth
```

## Key Features

- 🗂️ **Structured Output**: Organize Kubernetes manifests in a directory structure that mirrors your environments and applications
- 🚀 **GitOps Ready**: Generate files in a format optimal for ArgoCD and GitOps workflows
- 🔄 **Multi-Environment Support**: Easily manage multiple environments in a single repository
- 🔄 **App Synthesis**: Synthesize multiple cdk8s apps seamlessly
- 👀 **Visibility**: Clearly understand what changed by keeping generated kube manifests in a separate directory

## Basic Usage

```typescript
import { App, Chart } from 'cdk8s'
import { ArgoSynth } from '@cdklib/argo-synth'

// Create an app for each environment
const stagingApp = new App()
const prodApp = new App()

// Create charts for your services
const stagingWebChart = new Chart(stagingApp, 'web')
const prodWebChart = new Chart(prodApp, 'web')

// Set paths for ArgoCD directory structure
ArgoSynth.addPath(stagingWebChart, 'staging', 'web')
ArgoSynth.addPath(prodWebChart, 'prod', 'web')

// Synthesize to output directory
await ArgoSynth.synth('gitops', [stagingApp, prodApp])
```

This creates a directory structure like:

```
gitops/
├── staging/
│   └── web/
│       └── ... (manifests)
└── prod/
    └── web/
        └── ... (manifests)
```

Which maps cleanly to ArgoCD applications targeting paths like:

- `staging/web`
- `prod/web`

## Integrated Usage

A recommended approach is to create base classes that automatically handle path management:

```typescript
import { App, Chart } from 'cdk8s'
import { Construct } from 'constructs'
import { CdkArgo } from '@cdklib/argo-synth'

// Create a base App class that handles environment path setup
class BaseApp extends App {
  constructor(envId: EnvId, props?: AppProps) {
    super(props)
    // The environment ID becomes the first path segment
    ArgoSynth.addPath(this, envId)
  }
}

// Create a base Chart class that automatically adds service paths
class BaseChart extends Chart {
  constructor(scope: Construct, id: string) {
    super(scope, id)
    // The chart ID becomes the service name in the path
    ArgoSynth.addPath(this, id)
  }
}

// Usage:
const stagingApp = new BaseApp('staging')
const prodApp = new BaseApp('prod')

// Service charts automatically get the correct paths
const stagingWebChart = new BaseChart(stagingApp, 'web')
const prodWebChart = new BaseChart(prodApp, 'web')

// Synthesize to output directory
await ArgoSynth.synth('gitops', [stagingApp, prodApp])
```

## Integration with @cdklib/config

The library works seamlessly with `@cdklib/config` for type-safe environment management:

```typescript
import { App, Chart, ApiObject } from 'cdk8s'
import { ArgoSynth } from '@cdklib/argo-synth'
import { CdkConfig, setEnvContext, EnvId } from '@cdklib/config'
import { z } from 'zod'

const webConfig = new CdkConfig(k8sSchema)
  .set('staging', {
    replicas: 2,
    namespace: 'staging',
    image: 'web-app:latest',
  })
  .set('prod', {
    replicas: 5,
    namespace: 'production',
    image: 'web-app:stable',
  })

// Create a base App class that uses environment IDs from config
class EnvApp extends App {
  constructor(
    readonly envId: EnvId,
    props?: AppProps,
  ) {
    super(props)
    // Set the environment context for @cdklib/config integration
    setEnvContext(this, envId)
    // Set the path for ArgoCD structure
    ArgoSynth.addPath(this, envId)
  }
}

// Usage
const stagingApp = new EnvApp('staging')
const prodApp = new EnvApp('prod')

// Create charts for specific services with built-in config handling
class WebChart extends Chart {
  constructor(scope: Construct) {
    super(scope, 'web')
    // Set the path for ArgoCD structure
    ArgoSynth.addPath(this, 'web')

    // Access config directly using this construct
    const { replicas, image } = webConfig.get(this)

    // Create resources using the environment-specific config
    new ApiObject(this, 'deployment', {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: { name: 'web' },
      spec: {
        replicas: replicas,
        template: {
          spec: {
            containers: [
              {
                name: 'web',
                image: image,
              },
            ],
          },
        },
        // ... other properties
      },
    })
  }
}

// Usage
const stagingApp = new EnvApp('staging')
const prodApp = new EnvApp('prod')

// Create service charts - configuration is handled internally
const stagingWebChart = new WebChart(stagingApp)
const prodWebChart = new WebChart(prodApp)

// Synthesize
await ArgoSynth.synth('gitops', [stagingApp, prodApp])
```

## Best Practices

1. **Environment Base Classes**: Create a base App class that handles environment paths:

   ```typescript
   class EnvApp extends App {
     constructor(envId: EnvId, props?: AppProps) {
       super(props)
       // Set up both ArgoCD paths and @cdklib/config context
       setEnvContext(this, envId)
       ArgoSynth.addPath(this, envId)
     }
   }
   ```

2. **Service Base Classes**: Create a base Chart class for services:

   ```typescript
   class ServiceChart extends Chart {
     constructor(scope: Construct, id: string) {
       super(scope, id)
       ArgoSynth.addPath(this, id)
     }
   }
   ```

3. **ArgoCD Application Structure**: Design your ArgoCD applications to match your path structure:

   ```yaml
   # staging-web.yaml
   apiVersion: argoproj.io/v1alpha1
   kind: Application
   metadata:
     name: staging-web
     namespace: argocd
   spec:
     project: default
     source:
       repoURL: https://github.com/your-org/your-gitops-repo.git
       targetRevision: main
       path: gitops/staging/web
     destination:
       server: https://kubernetes.default.svc
       namespace: staging
   ```

4. **Integration with Config**: Leverage `@cdklib/config` for type-safe environment configuration management:

   ```typescript
   // In your construct code
   const { replicas, image } = webConfig.get(scope)
   ```

## License

MIT
