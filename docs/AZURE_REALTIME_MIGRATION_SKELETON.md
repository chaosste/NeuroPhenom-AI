# Azure Realtime Migration Skeleton (Safe Rollback)

## Objective
Migrate voice sessions from Gemini Live to Azure-hosted voice stack without breaking currently working paths.

## Branches
- `codex/azure-realtime-neurophenom` (this repo)
- `codex/azure-realtime-microphenom`
- `codex/azure-realtime-facilitator`

## Adapter + Flag Contract
- Keep Gemini path live.
- Add provider switch in app settings:
  - `GEMINI`
  - `AZURE_OPENAI_REALTIME`
  - `AZURE_STT_TTS`
- Env default:
  - `VITE_VOICE_PROVIDER_DEFAULT=GEMINI`

## Required Secrets (Azure-first)
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_DEPLOYMENT_CHAT`
- `AZURE_OPENAI_DEPLOYMENT_REALTIME` (when wired)
- `AZURE_OPENAI_API_VERSION`

## Rollout Method
1. Deploy each Azure branch to a separate app (`*-azure`).
2. Test only with `GEMINI` default first (control).
3. Wire Azure realtime adapter in branch and toggle provider.
4. Validate core flow:
   - mic permission prompt
   - live turn-taking
   - transcript generation
   - analysis/codification endpoint
5. Promote only after all checks pass.

## Rollback
- In settings, switch provider back to `GEMINI`.
- Or set `VITE_VOICE_PROVIDER_DEFAULT=GEMINI` and redeploy.

## Current Skeleton State (This Repo)
- Provider enum and selector added.
- Provider resolver + labels added.
- Non-Gemini providers currently return scaffold message (intentional).
