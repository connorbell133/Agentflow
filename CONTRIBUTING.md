# Contributing to AgentFlow

Thank you for your interest in contributing to AgentFlow! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Contributor License Agreement (CLA)](#contributor-license-agreement-cla)
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Style Guidelines](#style-guidelines)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

## Contributor License Agreement (CLA)

**One-time, 10-second thing:** On your first PR, you'll be asked to agree to our [CLA](CLA.md). Just comment `I agree to the CLA` and you're done forever.

**You keep your copyright.** The CLA just gives us permission to include your work in both our open-source (AGPL) and commercial versions of AgentFlow.

### How It Works

1. Submit your first Pull Request
2. Our bot will comment asking you to sign
3. Reply with: `I agree to the CLA`
4. All future contributions are automatically covered! 🎉

**Note:** Documentation-only changes (`.md` files, `docs/**`) don't require CLA signing.

**Questions?** See our [CLA documentation](CLA.md) for details on what you're agreeing to.

## Code of Conduct

This project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/chat_platform.git
   cd chat_platform
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/Agent-Flow-AI/chat_platform.git
   ```
4. **Install dependencies**:
   ```bash
   npm install
   ```
5. **Set up your environment**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```
6. **Run the development server**:
   ```bash
   npm run dev
   ```

## How to Contribute

### Types of Contributions

- **Bug fixes**: Fix issues reported in the issue tracker
- **Features**: Implement new features (please discuss first)
- **Documentation**: Improve or add documentation
- **Tests**: Add or improve test coverage
- **Performance**: Optimize existing code
- **Refactoring**: Improve code quality without changing behavior

### Before You Start

1. Check existing [issues](https://github.com/Agent-Flow-AI/chat_platform/issues) to avoid duplicate work
2. For large changes, open an issue first to discuss the approach
3. Ensure your contribution aligns with the project's goals and architecture

## Development Workflow

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-description
   ```

2. **Make your changes**:
   - Write clean, readable code
   - Follow existing code patterns
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes**:
   ```bash
   # Run type checking
   npm run type-check

   # Run linting
   npm run lint

   # Run tests
   npm test

   # Run the development server and test manually
   npm run dev
   ```

4. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

### Commit Message Convention

We use [Conventional Commits](https://www.conventionalcommits.org/). Format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples**:
```
feat(chat): add message threading support
fix(auth): resolve session timeout issue
docs(readme): update installation instructions
```

## Pull Request Process

1. **Update your branch** with the latest upstream changes:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Push your branch** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

3. **Open a Pull Request** on GitHub with:
   - Clear title describing the change
   - Description of what changed and why
   - Reference to related issues (e.g., "Fixes #123")
   - Screenshots for UI changes

4. **Address review feedback**:
   - Respond to comments
   - Make requested changes
   - Push additional commits

5. **Merge**: Once approved, a maintainer will merge your PR

### PR Checklist

Before submitting, ensure:

- [ ] Code follows the project's style guidelines
- [ ] All tests pass (`npm test`)
- [ ] Type checking passes (`npm run type-check`)
- [ ] Linting passes (`npm run lint`)
- [ ] Documentation is updated if needed
- [ ] Commit messages follow conventions
- [ ] PR description explains the changes

## Style Guidelines

### TypeScript

- Use TypeScript strict mode
- Prefer explicit types over `any`
- Use interfaces for object shapes
- Document complex functions with JSDoc

### React

- Use functional components with hooks
- Prefer composition over inheritance
- Keep components focused and small
- Use meaningful component names

### CSS/Styling

- Use Tailwind CSS utilities
- Follow existing class naming patterns
- Keep styles close to components
- Use CSS variables for theming

### File Organization

```
src/
├── components/     # React components
│   ├── ui/        # Base UI components
│   ├── common/    # Shared components
│   └── features/  # Feature-specific components
├── actions/       # Server actions
├── hooks/         # Custom React hooks
├── lib/           # Utility libraries
├── types/         # TypeScript types
└── utils/         # Helper functions
```

## Reporting Bugs

### Before Reporting

1. Check existing issues to avoid duplicates
2. Try to reproduce with the latest version
3. Collect relevant information

### Bug Report Template

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment**
- OS: [e.g., macOS 14.0]
- Browser: [e.g., Chrome 120]
- Node.js version: [e.g., 18.17.0]

**Additional context**
Any other relevant information.
```

## Suggesting Features

### Before Suggesting

1. Check if the feature already exists
2. Check if it's been suggested before
3. Consider if it aligns with project goals

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
A clear description of the problem.

**Describe the solution you'd like**
What you want to happen.

**Describe alternatives you've considered**
Other solutions you've thought about.

**Additional context**
Any other information or mockups.
```

## Questions?

- Open a [Discussion](https://github.com/Agent-Flow-AI/chat_platform/discussions) for questions
- Check existing documentation in the `/docs` directory
- Review the [README](README.md) for project overview

## Recognition

Contributors will be recognized in:
- GitHub's contributors list
- Release notes for significant contributions

Thank you for contributing to AgentFlow!
