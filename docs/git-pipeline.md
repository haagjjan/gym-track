# Git Pipeline

## Status

Foundation workflow for the repo now that the local app foundation exists. This document defines how changes should move through Git and GitHub.

## Branch Workflow

- Use `main` as the protected integration branch.
- Use short feature branches for implementation work, for example `feature/scaffold-api` or `docs/schema-notes`.
- Keep each branch focused on one logical change.
- Rebase or merge from `main` before opening a pull request if the branch is stale.

Tiny documentation fixes may be committed directly to `main` while this is still a solo project. Implementation changes should normally go through a pull request once the branch protection workflow is enabled, unless the user explicitly asks for a focused direct commit and push to `main`.

## Commit Rules

- Keep commits small and specific.
- Prefer many reviewable commits over one large end-of-task commit.
- Commit at natural boundaries such as asset/data definitions, implementation wiring, styles, tests, and docs.
- Avoid commits that touch more than 3 files unless the files are mechanically coupled, such as a package manifest and lockfile.
- Split changes before committing when a commit would add hundreds of lines or combine unrelated behavior.
- Passing checks do not make a broad commit acceptable. Validation proves the working tree is good; it does not decide commit boundaries.
- Use concise imperative messages, for example:
  - `Record session storage decision`
  - `Add API scaffold`
  - `Create initial schema migration`
- Avoid generic messages such as `update`, `changes`, or `fix stuff`.
- Do not mix unrelated docs, tooling, schema, and implementation changes in one commit.

## Commit Split Gate

Before staging or committing, pause and inspect:

```sh
git diff --stat
git diff --name-only
```

Split the work into multiple commits when any of these are true:

- The diff touches API implementation, web implementation, tests, and docs together.
- The diff changes more than 3 files that are not mechanically coupled.
- The diff adds or removes hundreds of lines.
- The staged files need different explanations in the commit message.
- A reviewer would naturally want to inspect part of the change without the rest.

Use separate commits for natural boundaries, for example:

- dependencies and lockfile changes
- data/schema/migration changes
- API contracts, routes, services, and repositories
- web route handlers, UI, and styles
- tests and smoke coverage
- documentation updates

Only keep a larger commit when the files are mechanically inseparable and the commit message can honestly explain the whole staged diff in one sentence. If an agent is about to make a large commit, it must stop, report the proposed split, and ask before continuing.

## Pull Request Rules

Pull requests are the default for implementation work once branch protection is enabled. Focused direct commits to `main` are acceptable during solo development when explicitly requested.

Every pull request should include:

- A clear scope summary.
- The related docs, ADR, issue, or requirement.
- The checks/tests that were run.
- Any skipped checks and why.
- Risks, known gaps, or rollback notes.

Pull requests should stay reviewable. If a PR touches unrelated areas or becomes hard to summarize, split it.

## Required Checks

The GitHub Actions pipeline runs:

- `git diff --check`
- required documentation file presence
- guard against accidental app scaffolding without workspace config
- pnpm dependency install with a frozen lockfile
- `pnpm check`
- API database integration tests against PostgreSQL
- Playwright web smoke tests against the local Docker Compose app stack

Local implementation work should run:

- `pnpm install` when dependencies change
- `pnpm check`
- `pnpm test:integration` when API persistence behavior changes
- `pnpm smoke:web` when core browser flows or app routing change
- `git diff --check`
- `git status --short`

## Manual GitHub Settings

Configure GitHub manually after the first workflow run:

- Create a branch protection rule or repository ruleset for `main`.
- Require pull requests before merging implementation work.
- Block force pushes to `main`.
- Require the `Project checks`, `API database integration`, and `Web smoke` status checks.
- Prefer linear history if it stays comfortable for solo development.

## Local Pre-Commit Checklist

Before committing:

- Run `git status --short`.
- Confirm the diff includes only intended files.
- Run `git diff --stat` and `git diff --name-only`.
- Decide the commit split before staging. If the staged diff crosses natural boundaries, unstage and split it.
- Stage intentionally, file by file or hunk by hunk, instead of defaulting to `git add -A`.
- Run `git diff --check`.
- Run `git diff --cached --stat` and confirm the staged commit is small enough to review.
- Run `pnpm check` for implementation or tooling changes.
- Keep the commit message specific.
- Push after a completed task unless intentionally keeping local-only work.
