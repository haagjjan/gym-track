# Git Pipeline

## Status

Foundation workflow for the repo before application code exists. This document defines how changes should move through Git and GitHub.

## Branch Workflow

- Use `main` as the protected integration branch.
- Use short feature branches for implementation work, for example `feature/scaffold-api` or `docs/schema-notes`.
- Keep each branch focused on one logical change.
- Rebase or merge from `main` before opening a pull request if the branch is stale.

Tiny documentation fixes may be committed directly to `main` while this is still a solo project. Once application code exists, implementation changes should go through a pull request.

## Commit Rules

- Keep commits small and specific.
- Use concise imperative messages, for example:
  - `Record session storage decision`
  - `Add API scaffold`
  - `Create initial schema migration`
- Avoid generic messages such as `update`, `changes`, or `fix stuff`.
- Do not mix unrelated docs, tooling, schema, and implementation changes in one commit.

## Pull Request Rules

Pull requests are required for implementation work once app code exists.

Every pull request should include:

- A clear scope summary.
- The related docs, ADR, issue, or requirement.
- The checks/tests that were run.
- Any skipped checks and why.
- Risks, known gaps, or rollback notes.

Pull requests should stay reviewable. If a PR touches unrelated areas or becomes hard to summarize, split it.

## Required Checks

The current foundation pipeline runs repository hygiene checks only:

- `git diff --check`
- required documentation file presence
- guard against accidental app scaffolding without workspace config

After the TypeScript workspace exists, add checks for:

- install
- formatting
- linting
- type checking
- unit tests
- integration tests
- build

## Manual GitHub Settings

Configure GitHub manually after the first workflow run:

- Create a branch protection rule or repository ruleset for `main`.
- Require pull requests before merging implementation work.
- Block force pushes to `main`.
- Require the `repo-checks` status check.
- Prefer linear history if it stays comfortable for solo development.

## Local Pre-Commit Checklist

Before committing:

- Run `git status --short`.
- Confirm the diff includes only intended files.
- Run `git diff --check`.
- Keep the commit message specific.
- Push after a completed task unless intentionally keeping local-only work.
