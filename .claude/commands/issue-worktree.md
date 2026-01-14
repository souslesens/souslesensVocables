
---
name: issue-worktree
description: Create an isolated git worktree for a GitHub issue from origin/master, then run a supervised issue solver (analysis → plan → diff → approval → apply)
---

## Usage
/issue-worktree <issue-number>

## Preconditions
- You are inside a git repository
- Remote "origin" exists
- Base branch "origin/master" exists
- A CLAUDE.md file is present at repository root (rules & conventions)
- gh CLI is authenticated (read-only is sufficient)
- Git Bash is available (Windows)

## Workflow (two phases)

### Phase A — Prepare isolated worktree (strict safety)
1) Validate input
- Ensure an issue number is provided (e.g. 123)
- Verify the issue exists via GitHub:
  !`gh issue view <issue-number> --json title,htmlUrl,state`

2) Read CLAUDE.md
- Open and acknowledge rules, conventions and constraints
  - No refactors beyond scope
  - Follow existing style guides
  - Keep fix minimal

3) Sync base branch
- Update refs:
  !`git fetch origin`
- Verify base exists:
  !`git show-ref --verify refs/remotes/origin/master`

4) Prepare naming
- Branch: `issue/<issue-number>`
- Worktree path: `../<repo-name>-issue-<issue-number>`
  (compute repo name):
  !`basename "$(git rev-parse --show-toplevel)"`

5) Create branch & worktree (atomic)
- Add worktree from `origin/master` with new branch:
  !`git worktree add -b issue/<issue-number> ../<repo-name>-issue-<issue-number> origin/master`

6) Output context
- Display:
  - Issue title & URL
  - Worktree path
  - Branch name
  - Base branch (origin/master)

### Phase B — Supervised Issue Solver (no auto-commit, no auto-push)
> Goal: analyze the issue, propose a minimal fix, output a unified diff; apply ONLY after explicit approval.

1) Gather context
- Read the issue details (body + comments):
  !`gh issue view <issue-number> --json body,comments,title,labels,htmlUrl`
- Scan repository structure in the new worktree:
  !`cd ../<repo-name>-issue-<issue-number>`
  !`ls -la`
  !`git status`

2) Analysis
- Identify suspected root cause, files likely impacted, and constraints from CLAUDE.md
- Produce a short, structured technical summary:
  - Problem statement
  - Expected behavior vs. current
  - Candidate files / modules
  - Risks & ambiguities

3) Plan & Fix proposal (do NOT edit yet)
- Propose a minimal change plan aligned with CLAUDE.md
- Generate an **unified diff** (**do not apply changes yet**):
  - Show exact changes per file
  - Explain each hunk briefly

4) Ask for explicit approval before applying
- Wait for the user to answer **“Approve patch”** or **“Reject patch”**

5) Apply changes (if approved)
- Apply the proposed diff to files
- Run local checks/tests:
  !`npm test` (or your project’s test command)
- Stage & commit locally (NO push):
  !`git add -A`
  !`git commit -m "Fix issue #<issue-number>: <short description>"`

6) (Optional, gated) Prepare PR content (NO push/PR creation)
- Draft PR title/body and list of reviewers
- **Ask for explicit approval** before any GitHub action
- If approved later by the user, create PR via `gh pr create` (else skip)

## Safety rules
- Do NOT push
- Do NOT create PR automatically
- Do NOT modify GitHub data (comments, labels) without explicit user permission
- Keep all changes inside the worktree branch `issue/<issue-number>`
- Follow CLAUDE.md constraints at all times

## Notes
This command sets up a safe isolated workspace, performs a supervised analysis & fix proposal, and only applies after explicit approval. GitHub write operations remain gated by the user.
``
