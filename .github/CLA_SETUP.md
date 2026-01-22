# CLA Enforcement Setup Guide

This guide explains how to automatically enforce the Contributor License Agreement (CLA) for all pull requests.

## Option 1: CLA Assistant (Recommended)

**CLA Assistant** is a free GitHub App that automatically manages CLA signing.

### Setup Steps

1. **Go to CLA Assistant**
   - Visit: https://cla-assistant.io/
   - Click "Configure CLA"

2. **Sign in with GitHub**
   - Authorize the CLA Assistant app
   - Grant access to your repository

3. **Configure CLA Assistant**
   - Repository: `Agent-Flow-AI/chat_platform`
   - CLA Document URL: `https://github.com/Agent-Flow-AI/chat_platform/blob/main/CLA.md`
   - Branch: `main` (or `develop`)

4. **Enable the App**
   - Install CLA Assistant on your repository
   - Set required status check

### How It Works

When someone opens a PR:
1. ✅ CLA Assistant bot comments automatically
2. ✅ Checks if contributor has signed
3. ✅ If not signed, provides a link to sign
4. ✅ Blocks PR merge until signed
5. ✅ Once signed, marks check as passed

### Example Bot Comment

```
Thank you for your contribution!

Before we can merge this PR, we need you to sign our Contributor
License Agreement (CLA).

🔗 Click here to review and sign the CLA: [Sign CLA]

This only needs to be done once. Future contributions will be
automatically verified.
```

---

## Option 2: CLA Bot (Alternative)

**CLA Bot** is another free option with similar functionality.

### Setup Steps

1. **Install CLA Bot**
   - Visit: https://github.com/apps/cla-bot
   - Click "Configure"
   - Select your repository

2. **Create Configuration File**
   Create `.github/cla.yml`:

```yaml
# CLA Bot Configuration
label: 'cla-signed'
recheckComment: 'I have read the CLA Document and I hereby sign the CLA'

message:
  notSigned: >
    Thank you for your contribution! Before we can merge this PR,
    please sign our Contributor License Agreement (CLA).

    Read the CLA: https://github.com/Agent-Flow-AI/chat_platform/blob/main/CLA.md

    To sign, please comment on this PR:
    **I have read the CLA Document and I hereby sign the CLA**

  signed: 'Thank you for signing the CLA! ✅'
  updated: 'CLA signature verified. Thank you!'
```

3. **Enable Required Status Check**
   - Go to: Settings → Branches → Branch protection rules
   - Add `cla-bot/cla` as required check

---

## Option 3: Manual Process (Not Recommended)

If you don't want to use automated tools:

### Manual Workflow

1. **Create a CLA tracker issue**
   - Title: "CLA Signatures"
   - Body: List of contributors who signed

2. **When PR is opened**:
   - Manually comment asking them to sign
   - They comment: "I have read the CLA Document and I hereby sign the CLA"
   - You add their name to the tracker issue
   - You manually merge after verification

**Downside:** Very time-consuming and error-prone.

---

## Recommended: CLA Assistant Setup

Here's the exact configuration for AgentFlow:

### Step-by-Step

1. **Visit CLA Assistant**
   ```
   https://cla-assistant.io/
   ```

2. **Authorize with GitHub**
   - Use your Agent-Flow-AI organization account

3. **Add Repository**
   - Click "+ Add Repository"
   - Select: `Agent-Flow-AI/chat_platform`

4. **Configure CLA**
   ```
   CLA Document URL:
   https://github.com/Agent-Flow-AI/chat_platform/blob/main/CLA.md

   Custom Fields: (optional)
   - Full Name
   - Email
   - Company (optional)

   Minimum Number of Approvers: 1
   ```

5. **Save Configuration**

6. **Enable Branch Protection**
   - Go to: Settings → Branches
   - Add rule for `main` (or `develop`)
   - Check: "Require status checks to pass before merging"
   - Select: "cla/assistant"

7. **Test It**
   - Create a test PR from a different account
   - Verify bot comments and blocks merge
   - Sign CLA and verify check passes

---

## What Contributors See

### First-Time Contributor

1. Opens PR
2. Sees bot comment:
   ```
   ✋ Thank you for your PR!

   Before we can merge, please sign our CLA:
   👉 Click here to sign: [Link]

   This takes 30 seconds and only needs to be done once.
   ```

3. Clicks link → Reviews CLA → Signs with GitHub account
4. Returns to PR → Check is now ✅ green
5. All future PRs automatically pass

---

## Maintaining the CLA

### View Signed CLAs
- CLA Assistant dashboard: https://cla-assistant.io/
- See list of all contributors who signed
- Export signatures if needed

### Update CLA Terms
If you change `CLA.md`:
- Old signers remain valid (unless you re-request)
- New contributors sign the updated version
- Optionally re-request signatures from existing contributors

### Revoke Access
If needed, you can revoke a signature from the CLA Assistant dashboard.

---

## Troubleshooting

### Bot Not Commenting
- Check CLA Assistant is installed on repo
- Verify CLA document URL is accessible
- Ensure branch protection rules are set

### Check Always Failing
- Verify contributor signed with correct GitHub account
- Check CLA Assistant has permission to read org members
- Try re-signing

### Multiple Accounts
If contributor has multiple GitHub accounts:
- They need to sign with the account they're committing from
- Email address must match commit author

---

## Cost

- **CLA Assistant**: FREE for open source
- **CLA Bot**: FREE
- **Manual**: FREE but time-consuming

---

## Next Steps

1. Choose your preferred method (recommend CLA Assistant)
2. Follow setup steps above
3. Test with a dummy PR
4. Announce CLA requirement in README and first issue

## Questions?

Contact the maintainers or open an issue for CLA-related questions.
