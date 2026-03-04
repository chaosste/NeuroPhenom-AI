# Worktree Workflow Protocol

## Purpose
Standardize agent/human workflow for this repo using dedicated worktree lanes and branch namespaces.

## Worktree Paths
- Mac 1 Codex: `/Users/stephenbeale/Workspaces/worktrees/neurophenom-ai/mac1-codex`
- Mac 1 Antigravity: `/Users/stephenbeale/Workspaces/worktrees/neurophenom-ai/mac1-antigravity`
- Mac 1 Gemini: `/Users/stephenbeale/Workspaces/worktrees/neurophenom-ai/mac1-gemini`
- Mac 2 Codex: `/Users/stephenbeale/Workspaces/worktrees/neurophenom-ai/mac2-codex`
- Mac 2 Antigravity: `/Users/stephenbeale/Workspaces/worktrees/neurophenom-ai/mac2-antigravity`
- Mac 2 Gemini: `/Users/stephenbeale/Workspaces/worktrees/neurophenom-ai/mac2-gemini`

## Branch Naming
- Antigravity: `codex/<machine>-antigravity/<task-name>`
- Codex: `codex/<machine>-codex/<task-name>`
- Gemini: `codex/<machine>-gemini/<task-name>`

Examples:
- `codex/mac1-antigravity/neurophenom-reskin-2026-02-27`
- `codex/mac1-codex/neurophenom-stabilize-2026-02-27`

## Start-of-Work Commands
Run in the relevant worktree before making changes:

```bash
git fetch origin
git switch codex/<machine>-<agent>/<task-name>
git rebase origin/main
```

If the branch does not exist yet:

```bash
git fetch origin
git switch -c codex/<machine>-<agent>/<task-name> origin/main
```

## Guardrails
- Never commit directly to `main`.
- Never have two machines/agents push to the same branch.
- Keep one PR per app pass.
- Rebase from `origin/main` before opening or updating PR.
