# Contributing to CDK Libraries

Thank you for your interest in contributing to our CDK libraries! This is a monorepo containing multiple packages under the `packages/` directory, including:

- `@cdklib/argo-synth` - ArgoCD directory structure for CDK8s
- `@cdklib/config` - Type-safe configuration management

This guide will help you get started with contributing to any of these packages.

## Project Philosophy

This library follows a few key principles:

- **Simplicity**: Keep the API surface small and focused
- **Composability**: Work well with other libraries like `@cdklib/config`
- **Minimal Dependencies**: Only depend on what's absolutely necessary
- **Unopinionated**: Provide tools, not constraints

## Prerequisites

- Node.js (v20+)
- pnpm
- Basic knowledge of TypeScript and cdk8s

## Setting Up Your Environment

1. **Fork the repository**:

   - Visit the GitHub repository and click "Fork"

2. **Clone your fork**:

   ```bash
   git clone https://github.com/your-username/cdk-libs.git
   cd cdk-libs
   ```

3. **Install dependencies**:
   ```bash
   pnpm install
   ```

## Development Workflow

1. **Create a branch**:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**:

   - Navigate to the appropriate package directory under `packages/`
   - Keep changes focused on a single issue/feature
   - Follow the existing code style
   - Add tests for new functionality

3. **Run tests**:

   ```bash
   # Run tests for all packages
   pnpm -r test

   # Or run tests for a specific package
   cd packages/argo-synth
   pnpm test
   ```

4. **Commit your changes**:
   - Use clear commit messages
   - Reference issues when applicable

## Pull Request Process

1. **Push your branch**:

   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a pull request**:

   - Go to the original repository
   - Click "New Pull Request"
   - Select your branch
   - Provide a clear title starting with the package name (e.g., "@cdklib/argo-synth - Add new feature")

3. **Respond to feedback**:
   - Be open to suggestions
   - Make requested changes promptly

## Coding Guidelines

- Write clean, readable TypeScript
- Document public APIs with JSDoc comments (hover over your function to see the comment)
- Keep functions small and focused
- Follow the Keep It Simple principle
- Add proper tests for new functionality

## Testing

We use Vitest for testing. Tests should:

- Be located alongside the source files
- Follow the pattern `*.test.ts`
- Use descriptive test names
- Test both success and failure cases

## Need Help?

If you have questions or need clarification:

- Open an issue on GitHub with your question
- Add the "question" label and specify which package you're asking about

Thank you for contributing to make our CDK libraries better!
