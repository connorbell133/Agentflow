# GitHub Rulesets Import Instructions

## Overview
This repository uses GitHub Rulesets to enforce branch protection rules. These rulesets ensure code quality and require proper review before merging.

## Files
- `rulesets/develop-ruleset.json` - Protection rules for the `develop` branch
- `rulesets/main-ruleset.json` - Protection rules for the `main` branch (stricter)
- `CODEOWNERS` - Defines who must review specific files

## Import Instructions

### Step 1: Create the `develop` Branch
If you don't have a `develop` branch yet:

```bash
git checkout main
git pull origin main
git checkout -b develop
git push origin develop
```

### Step 2: Update CODEOWNERS
1. Edit `.github/CODEOWNERS`
2. Replace `@yourusername` with your actual GitHub username
3. Add any trusted maintainers if desired

### Step 3: Import Rulesets via GitHub UI

**Note:** GitHub doesn't currently support direct JSON import via UI. You need to use the GitHub API.

#### Option A: Using GitHub CLI (Recommended)

```bash
# Install GitHub CLI if you haven't
# https://cli.github.com/

# Authenticate
gh auth login

# Import develop ruleset
gh api \
  --method POST \
  -H "Accept: application/vnd.github+json" \
  /repos/connorbell133/Agentflow/rulesets \
  --input .github/rulesets/develop-ruleset.json

# Import main ruleset
gh api \
  --method POST \
  -H "Accept: application/vnd.github+json" \
  /repos/connorbell133/Agentflow/rulesets \
  --input .github/rulesets/main-ruleset.json
```

Replace `OWNER/REPO` with your repository (e.g., `yourusername/Agentflow-1`)

#### Option B: Using curl

```bash
# Set your GitHub token
GITHUB_TOKEN="your_personal_access_token"
OWNER="yourusername"
REPO="Agentflow-1"

# Import develop ruleset
curl -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/repos/$OWNER/$REPO/rulesets \
  -d @.github/rulesets/develop-ruleset.json

# Import main ruleset
curl -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/repos/$OWNER/$REPO/rulesets \
  -d @.github/rulesets/main-ruleset.json
```

#### Option C: Manual Configuration via GitHub UI

If API access is not available, configure manually:

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Rules** → **Rulesets**
3. Click **New branch ruleset**

**For `develop` branch:**
- Name: "Develop Branch Protection"
- Enforcement status: Active
- Target branches: `develop`
- Rules:
  - ✅ Require pull request (1 approval, require code owner review)
  - ✅ Require status checks (build, lint, test, type-check, strict)
  - ✅ Block force pushes
  - ✅ Prevent deletion

**For `main` branch:**
- Name: "Main Branch Protection"
- Enforcement status: Active
- Target branches: `main`
- Rules:
  - ✅ Require pull request (2 approvals, dismiss stale reviews, require code owner review, require last push approval)
  - ✅ Require status checks (build, lint, test, test:e2e, type-check, strict)
  - ✅ Block force pushes
  - ✅ Prevent deletion
  - ✅ Require signed commits
  - ✅ Require linear history

### Step 4: Verify Setup

1. Go to **Settings** → **Rules** → **Rulesets**
2. You should see both rulesets listed and "Active"
3. Try to push directly to `develop` - it should be blocked
4. Try to create a PR without approval - it should require review

### Step 5: Test the Workflow

```bash
# Create a test feature branch
git checkout develop
git checkout -b test/branch-protection

# Make a small change
echo "# Test" >> TEST.md
git add TEST.md
git commit -m "test: verify branch protection"

# Push and create PR
git push origin test/branch-protection

# Open PR to develop on GitHub
# Verify that:
# 1. CI checks run automatically
# 2. Your approval is required before merge
# 3. Cannot bypass the protection
```

## Required CI Checks

The rulesets reference these CI check names. Ensure your CI workflow produces these status checks:
- `build` - Production build succeeds
- `lint` - Code linting passes
- `test` - Unit tests pass
- `test:e2e` - E2E tests pass (main branch only)
- `type-check` - TypeScript compilation succeeds

These are defined in `.github/workflows/ci.yml`

## Bypass Actors

Currently, no bypass actors are configured. To add yourself as a bypass (not recommended):

```json
"bypass_actors": [
  {
    "actor_id": YOUR_GITHUB_USER_ID,
    "actor_type": "RepositoryRole",
    "bypass_mode": "always"
  }
]
```

## Troubleshooting

**Problem:** CI checks not showing up in PR
- Ensure `.github/workflows/ci.yml` is on the branch
- Check that workflow has run at least once
- Verify check names match exactly in ruleset

**Problem:** Ruleset import fails
- Ensure you have admin access to the repository
- Verify your GitHub token has `repo` and `admin:repo_hook` scopes
- Check JSON syntax is valid

**Problem:** Can't merge even with approvals
- Verify all CI checks have passed
- Ensure branch is up to date with base branch
- Check that all conversations are resolved

## Additional Resources

- [GitHub Rulesets Documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)
- [CODEOWNERS Documentation](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- [GitHub API Rulesets](https://docs.github.com/en/rest/repos/rules)
