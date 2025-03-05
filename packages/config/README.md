# @cdklib/config

- [Table of Contents](#table-of-contents)

A type-safe, hierarchical configuration library for AWS CDK projects that supports environment-specific overrides and runtime-computed values.

## Why This Exists

While tools like Terragrunt for Terraform and Helm charts for Kubernetes handle configuration management, CDK projects often don’t have a unified solution.

`@cdklib/config` provides a simple, type-safe way to manage nested environments and shared settings.

### Key Features

- **Simple** - Offers a clear configuration approach for CDK projects.
- **Runtime Validation** - Utilizes Zod to catch missing / malformed configuration at runtime, before you apply your stacks.
- **Hierarchical** - Supports nested environments with shared defaults and environment-specific overrides.
- **Cross-CDK Compatibility** - Works with AWS CDK, cdktf, and cdk8s.
- **Shared Configuration** - Enables configuration sharing through a monorepo with a shared package or a common configuration directory.

This is a very simple implementation; you may copy it to your project or contribute.

# Table of Contents

- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Hierarchical Configuration](#hierarchical-configuration)
- [Runtime Configuration](#runtime-configuration)
- [Modular Configuration](#modular-configuration)
- [Customizing Environment IDs](#customizing-environment-ids)
- [Using with CDK](#using-with-constructs)
- [Best Practices](#best-practices)
- [License](#license)

## Installation

```bash
# Using pnpm
pnpm add @cdklib/config

# Using npm
npm install @cdklib/config

# Using yarn
yarn add @cdklib/config
```

## Key Features

- 🔄 **Hierarchical Configuration**: Inherit and override settings based on environment path segments
- 🔐 **Type Safety**: Full TypeScript support with Zod schema validation
- 🧩 **Modular Design**: Create purpose-specific configuration modules
- 🔄 **Runtime Values**: Compute derived configuration values at runtime
- 🔍 **Validation**: Automatic validation of configuration values using Zod schemas
- 🏗️ **CDK Integration**: Easily access environment-specific configuration from any construct in your CDK app
  - This works with `cdktf`, `cdk8s`, `aws-cdk` and any other construct based library

## Basic Usage

```typescript
import { CdkConfig } from '@cdklib/config'
import { z } from 'zod'

// Define a schema for your configuration
const schema = z.object({
  accountId: z.string(),
  region: z.string(),
  bucketName: z.string(),
})

// Create and configure
const awsConfig = new CdkConfig(schema)
  .setDefault({ region: 'us-east-1' })
  .set('dev', {
    accountId: '123456789012',
    bucketName: 'my-dev-bucket',
  })
  .set('prod', {
    accountId: '987654321098',
    bucketName: 'my-prod-bucket',
  })

// Get configuration for a specific environment
const devConfig = awsConfig.get('dev/staging')
console.log(devConfig)
// { accountId: '123456789012', region: 'us-east-1', bucketName: 'my-dev-bucket' }
```

## Hierarchical Configuration

The library supports hierarchical environment paths like `dev/staging`, `dev/production`, or even deeper like `dev/region1/staging`:

```typescript
const awsConfig = new CdkConfig(schema)
  .setDefault({ region: 'us-east-1' })
  .set('dev', {
    accountId: '123456789012',
  })
  .set('dev/staging', {
    bucketName: 'dev-staging-bucket',
  })
  .set('dev/production', {
    bucketName: 'dev-production-bucket',
  })

// Configurations inherit from parent paths
const stagingConfig = awsConfig.get('dev/staging')
console.log(stagingConfig)
// {
//   accountId: '123456789012',  // from 'dev'
//   region: 'us-east-1',        // from default
//   bucketName: 'dev-staging-bucket' // from 'dev/staging'
// }
```

## Runtime Configuration

You can compute values at runtime using other configuration values:

```typescript
const awsConfig = new CdkConfig(schema)
  .set('dev', {
    accountId: '123456789012',
    region: 'us-east-1',
    bucketName: 'my-dev-bucket',
  })
  .addRuntime((envId, config) => ({
    // Compute the S3 ARN using the accountId and bucketName
    bucketArn: `arn:aws:s3:::${config.bucketName}`,
    // We can use envId to conditionally compute values
    tags: { Environment: envId },
  }))

const devConfig = awsConfig.get('dev/staging')
console.log(devConfig.bucketArn) // "arn:aws:s3:::my-dev-bucket"
console.log(devConfig.tags.Environment) // "dev"
```

## Modular Configuration

Create purpose-specific configuration modules:

```typescript
// aws-config.ts
export const awsConfig = new CdkConfig(awsSchema)
  .set('dev', { accountId: '123456789012', region: 'us-east-1' })
  .set('prod', { accountId: '987654321098', region: 'us-west-2' })

// eks-config.ts
export const eksConfig = new CdkConfig(eksSchema)
  .set('dev', { clusterName: 'dev-cluster', nodeCount: 2 })
  .set('prod', { clusterName: 'prod-cluster', nodeCount: 5 })
  .addRuntime((envId, config) => {
    // You can even use values from other config modules
    const awsValues = awsConfig.get(envId)
    return {
      clusterArn: `arn:aws:eks:${awsValues.region}:${awsValues.accountId}:cluster/${config.clusterName}`,
    }
  })
```

## Customizing Environment IDs

You can define your own environment ID types by declaring them in a `.d.ts` file:

```typescript
// cdklib-config.d.ts
declare module '@cdklib/config/types' {
  // Define your custom environment IDs
  export type EnvId =
    | 'global'
    | 'management'
    | 'dev/qa'
    | 'dev/staging'
    | 'prod/us-east-1'
    | 'prod/us-west-2'
}
```

Then, include the types in your `tsconfig.json`:

```json
{
    ...,
    "include": [..., "<path to file>/cdklib-config.d.ts"],
    ...
}
```

This provides type safety and intellisense when using `set`/`get` methods.

## Using with Constructs

The `@cdklib/config` library seamlessly integrates with CDK constructs using the environment context utilities:

```typescript
import { getEnvId, setEnvContext, initialContext } from '@cdklib/config'
import { App, Stack } from 'aws-cdk-lib'
import { awsConfig } from './config/aws'

// Initialize a CDK app with environment context
const app = new App({
  context: initialContext('dev/staging'),
})

// Create a stack that uses the configuration
class MyStack extends Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id)

    // Get the configuration for this environment - You can use scope or EnvId
    const { region } = awsConfig.get(this)

    // Use the configuration values in your constructs
    new SomeBucket(this, 'MyBucket', {
      bucketName: bucketName,
      tags: config.tags,
    })
  }
}

// Or you can set the environment context explicitly on a per-stack basis
const prodStack = new MyStack(app, 'ProdStack')
setEnvContext(prodStack, 'prod/us-east-1')
```

This approach enables you to:

- Access environment-specific configurations from any construct
- Keep your configuration type-safe and validated throughout your CDK project

## Best Practices

1. **Modular Configuration**: Create separate configuration modules for different aspects of your infrastructure:

   - `awsConfig` for AWS account settings
   - `networkConfig` for VPC, subnets, etc.
   - `databaseConfig` for database settings
   - `eksConfig` for Kubernetes settings

2. **Environment Structure**: Design your environment hierarchy thoughtfully.

   - **Do you have multiple accounts?** - Consider prefixing your environment IDs with the account name.
     For example, for a multi-account AWS setup, you might have:

     - `management`
     - `dev/qa`
     - `dev/staging`
     - `prod/us-east-1`

   - **Are you building multi-tenant?** - You could utilize the environment ID to share some configuration between tenants.
     For example, you might have:

     - `dev/staging/tenant1`
     - `dev/staging/tenant2`

3. **Runtime Composition**: Use runtime configurations to create relationships between different configuration modules.

## License

MIT
