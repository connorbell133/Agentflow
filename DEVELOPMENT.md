# Development Guide

## Pre-commit Hooks & Code Quality

This project uses industry-standard tooling to ensure code quality:

### Tools

- **Prettier** - Code formatting (auto-fixes on commit)
- **ESLint** - Code linting (auto-fixes on commit)
- **TypeScript** - Type checking (validates on commit)
- **Husky** - Git hooks management
- **lint-staged** - Runs checks only on staged files

### What Happens on Commit

When you run `git commit`, the following happens automatically:

1. **Formatting** - Prettier formats all staged files
2. **Linting** - ESLint checks and auto-fixes issues
3. **Type Checking** - TypeScript validates types
4. **Commit Message** - Validates Conventional Commits format

If any step fails, the commit is blocked until you fix the issues.

## Conventional Commits

All commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Format

```
type(scope): message
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, missing semi-colons, etc)
- `refactor` - Code refactoring
- `perf` - Performance improvements
- `test` - Adding or updating tests
- `build` - Build system or dependencies
- `ci` - CI/CD changes
- `chore` - Other changes that don't modify src or test files
- `revert` - Revert a previous commit

### Examples

```bash
git commit -m "feat(auth): add user login functionality"
git commit -m "fix(api): resolve timeout issue in conversations endpoint"
git commit -m "docs: update README with installation steps"
git commit -m "refactor(chat): simplify message rendering logic"
git commit -m "chore: update dependencies"
```

## Manual Commands

### Formatting

```bash
# Format all files
npm run format

# Check formatting without fixing
npm run format:check
```

### Linting

```bash
# Run ESLint
npm run lint

# Fix ESLint issues
npm run lint:fix
```

### Type Checking

```bash
# Check types
npm run type-check

# Check only production code (excludes tests)
npx tsc --project tsconfig.build.json --noEmit
```

## Bypassing Hooks (Not Recommended)

If you absolutely need to bypass hooks (not recommended for regular development):

```bash
# Skip pre-commit hooks
git commit --no-verify -m "your message"

# Skip commit-msg validation
git commit -n -m "your message"
```

⚠️ **Warning:** Bypassing hooks can lead to broken code in the repository. Only use in emergencies.

## Editor Setup

### VS Code

Install these extensions for the best experience:

1. **Prettier - Code formatter**

   ```
   esbenp.prettier-vscode
   ```

2. **ESLint**

   ```
   dbaeumer.vscode-eslint
   ```

3. **Tailwind CSS IntelliSense**
   ```
   bradlc.vscode-tailwindcss
   ```

Add to your `.vscode/settings.json`:

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

### WebStorm / IntelliJ IDEA

1. Go to Settings → Languages & Frameworks → JavaScript → Prettier
2. Enable "On save"
3. Go to Settings → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint
4. Enable "Automatic ESLint configuration"
5. Enable "Run eslint --fix on save"

## Troubleshooting

### "husky command not found"

```bash
npm run prepare
```

### Pre-commit hooks not running

```bash
# Reinstall husky
npm run prepare
chmod +x .husky/*
```

### Type check failing on commit

The pre-commit hook only checks files you're committing. If you see type errors:

```bash
# Check all types
npm run type-check

# Fix the errors, then commit again
```

### Prettier conflicts with ESLint

We've configured `eslint-config-prettier` to disable conflicting rules. If you see conflicts:

```bash
# Update dependencies
npm install
```

### Commit message validation failing

Ensure your commit message follows the format:

```
type(scope): description

Examples:
✅ feat(auth): add login
✅ fix: resolve bug
❌ Added new feature
❌ Fixed stuff
```

## CI/CD Integration

The same checks run in CI/CD:

- **Build** - Ensures code compiles
- **Lint** - ESLint with no warnings
- **Type Check** - TypeScript validation (production code)
- **Tests** - Jest unit tests (allowed to fail temporarily)

See [CI_CD_FIXES.md](./CI_CD_FIXES.md) for CI/CD details.

## Best Practices

1. **Commit Often** - Small, focused commits are better than large ones
2. **Write Descriptive Messages** - Help your team understand changes
3. **Fix Issues Before Committing** - Don't bypass hooks
4. **Run Tests Locally** - `npm test` before pushing
5. **Keep Dependencies Updated** - Regularly run `npm update`

## Getting Help

- Check existing docs in `/docs`
- Review [CLAUDE.md](./CLAUDE.md) for project architecture
- Ask in team Slack channel
- Create an issue on GitHub
