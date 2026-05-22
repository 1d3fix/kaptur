# Contributing to Kaptur

Thank you for your interest in contributing! This document covers everything
you need to get started.

## Getting started

**Requirements:** Node 20.19+ and npm.

```bash
git clone https://github.com/1d3fix/kaptur.git
cd kaptur
npm install
npm run dev          # Chrome with HMR
npm run dev:firefox  # Firefox with HMR
```

Load the extension in your browser:

- **Chrome / Edge:** `chrome://extensions` → enable Developer mode → "Load
  unpacked" → select the `.output/chrome-mv3/` folder
- **Firefox:** `about:debugging` → This Firefox → Load Temporary Add-on →
  pick `manifest.json` from `.output/firefox-mv2/`

## Branch conventions

| Prefix      | Purpose                                 |
| ----------- | --------------------------------------- |
| `feat/`     | New feature                             |
| `fix/`      | Bug fix                                 |
| `docs/`     | Documentation only                      |
| `refactor/` | Code restructuring, no behaviour change |
| `chore/`    | Tooling, dependencies, CI               |

## Commit style

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(annotation): add polygon tool
fix(export): handle empty session correctly
docs: update CONTRIBUTING
```

## Before you push

Pre-commit hooks (Lefthook) run Prettier and ESLint automatically on every
commit. If you want to run them manually:

```bash
npm run format:check   # Check formatting
npm run compile        # TypeScript type check
npm run lint           # ESLint
npm run build          # Verify production build compiles
```

All checks must pass before a PR will be merged.

## Submitting a pull request

1. Fork the repository and create your branch from `main`
2. Make your changes and ensure all checks pass (see above)
3. Describe what you changed and **why** in the PR description
4. If the change affects UX, include a screenshot or screen recording
5. Link any related issues with `Closes #123`

## Reporting bugs

Open an issue at <https://github.com/1d3fix/kaptur/issues> with:

- Browser name and version
- Extension version
- Steps to reproduce
- What you expected vs. what happened

## Security vulnerabilities

Do **not** open a public issue for security vulnerabilities. See
[SECURITY.md](./SECURITY.md) for the responsible disclosure process.
