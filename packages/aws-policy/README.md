# @cdklib/aws-policy

A type-safe AWS policy library that provides TypeScript intellisense and validation for AWS IAM policy statements.

## Features

- 🔒 **Type-Safe**: Full TypeScript intellisense for policy statements
- ✂️ **Copy-Paste**: Import AWS examples directly into TypeScript
- 🧩 **Reusable Templates**: Support for parameterized policy templates
- 🔍 **Context-Aware**: Create policies that access configuration from a construct scope
- 📝 **Validation**: Runtime validation ensures policies are structurally correct
- 🔌 **Framework Compatible**: Works with any tool that uses AWS IAM policies (including cdktf)

## Installation

```bash
npm install @cdklib/aws-policy
```

## Type-Safe Policy Statements

Convert AWS policy statements directly into TypeScript with full intellisense and validation:

```typescript
import { AwsPolicy } from '@cdklib/aws-policy'

// Create a policy with multiple statements
const bucketPolicy = AwsPolicy.from(
  {
    Effect: 'Allow',
    Action: ['s3:GetObject', 's3:ListBucket'],
    Resource: ['arn:aws:s3:::my-bucket', 'arn:aws:s3:::my-bucket/*'],
  },
  {
    Effect: 'Deny',
    Action: 's3:DeleteObject',
    Resource: 'arn:aws:s3:::my-bucket/*',
  },
)

// Get JSON output (Version is automatically added)
const policyJson = bucketPolicy.toJson()

// You can also add more statements later if needed
bucketPolicy.add({
  Effect: 'Allow',
  Action: 's3:GetBucketLocation',
  Resource: 'arn:aws:s3:::my-bucket',
})
```

### Easy Import from AWS Examples

Copy-paste AWS examples directly and convert to TypeScript:

```typescript
// Original AWS example:
// {
//   "Effect": "Allow",
//   "Action": "s3:ListBucket",
//   "Resource": "arn:aws:s3:::example_bucket"
// }

// Import into TypeScript with validation
const policy = AwsPolicy.from({
  Effect: 'Allow',
  Action: 's3:ListBucket',
  Resource: 'arn:aws:s3:::example_bucket',
})

// Or import raw JSON from a file or API
const rawStatement = JSON.parse(fs.readFileSync('policy.json', 'utf8'))
const importedPolicy = AwsPolicy.fromRaw(rawStatement)
```

## Prepared Policies

Create reusable policy templates with parameters:

```typescript
import { AwsPreparedPolicy } from '@cdklib/aws-policy'

// Define a reusable policy template
const s3BucketPolicy = AwsPreparedPolicy.new<{
  bucketName: string
  accountId: string
}>(({ bucketName, accountId }) => ({
  Effect: 'Allow',
  Action: ['s3:GetObject', 's3:ListBucket'],
  Resource: [`arn:aws:s3:::${bucketName}`, `arn:aws:s3:::${bucketName}/*`],
  Principal: {
    AWS: `arn:aws:iam::${accountId}:root`,
  },
}))

// Create a concrete policy by filling in the parameters
const myBucketPolicy = s3BucketPolicy.fill({
  bucketName: 'my-application-data',
  accountId: '123456789012',
})
```

### Progressive Parameter Filling

```typescript
const deploymentPolicy = AwsPreparedPolicy.new<{
  accountId: string
  environment: string
  serviceName: string
}>(({ accountId, environment, serviceName }) => ({
  Effect: 'Allow',
  Action: ['ecs:CreateService'],
  Resource: [`arn:aws:ecs:*:${accountId}:service/${environment}/${serviceName}`],
}))

// Fill parameters in stages
const orgPolicy = deploymentPolicy.fillPartial({
  accountId: '123456789012',
})

const stagingPolicy = orgPolicy.fill({
  environment: 'staging',
  serviceName: 'api',
})
```

## Construct Scoped Policies

You can pass a Construct as a parameter to a prepared policy to create scoped policies.

This is especially useful when combined with @cdklib/config to automatically fill in configuration values.

```typescript
import { AwsPreparedPolicy } from '@cdklib/aws-policy'
import { awsConfig } from './config/aws'

// Define a policy that includes scope as a parameter
const s3BucketPolicy = AwsPreparedPolicy.new<{
  scope: Construct
  bucketName: string
}>(({ scope, bucketName }) => {
  // Get config values from scope
  const { accountId } = awsConfig.get(scope)

  return {
    Effect: 'Allow',
    Action: ['s3:GetObject', 's3:ListBucket'],
    Resource: [`arn:aws:s3:::${bucketName}`, `arn:aws:s3:::${bucketName}/*`],
    Principal: {
      AWS: `arn:aws:iam::${accountId}:root`,
    },
  }
})

// Provide scope and parameters
const policy = s3BucketPolicy.fill({
  scope: myApp,
  bucketName: 'app-assets',
})
```

## Combining Policies

You can combine multiple policies together, for example granting s3 read access and lambda invoke access.

The policy statements are combined - the library does not attempt to merge policies logically.

This works for both prepared and normal policies.

```typescript
// Combine regular policies
const s3ReadPolicy = ...
const lambdaInvokePolicy = ...

// Creates a new policy with statements from both policies - parameters are combined
AwsPreparedPolicy.combine(lambdaInvokePolicy).fill({
  bucketName: 'my-bucket',
  functionName: 'my-function',
})
```

## License

MIT
