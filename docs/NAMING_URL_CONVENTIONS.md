# Naming And URL Conventions

## Canonical product slugs

- `neurophenomai`
- `microphenomai`
- `facilitatorai`

These slugs are the canonical public naming standard. Each slug ends in `ai` and avoids separators.

## Public product labels

- NeuroPhenom AI
- MicroPhenom AI
- Facilitator AI

## API health service ids

Use canonical slugs in `/api/health` responses:

- `service: "neurophenomai"`
- `service: "microphenomai"`
- `service: "facilitatorai"`

## URL conventions

Preferred public hosts:

- `www.neurophenomai.newpsychonaut.com`
- `www.microphenomai.newpsychonaut.com`
- `www.facilitatorai.newpsychonaut.com`

Legacy operational Azure hostnames may remain in place for deployment/runtime compatibility:

- `neurophenom-finesse.azurewebsites.net`
- `microphenom.azurewebsites.net`
- `facilitator-ai.azurewebsites.net`

## Migration policy

1. Keep Azure app-service resource names unchanged unless a dedicated rename/migration sprint is scheduled.
2. Standardize user-facing names and health `service` identifiers immediately.
3. Add DNS aliases at canonical hosts before changing links in external docs/marketing.
4. After alias cutover, optionally deprecate legacy host references in templates/workflows.
