# One-Shot Rollout Matrix

| Repo | Azure App | Branch | Provider Default | Required Secrets | DNS Host | Verify URL |
|---|---|---|---|---|---|---|
| NeuroPhenom-AI | `neurophenom-finesse` | `codex/azure-realtime-neurophenom` | `GEMINI` | `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_DEPLOYMENT_CHAT`, `AZURE_OPENAI_API_VERSION` | `www.neurophenomai.newpsychonaut.com` | `/api/health` |
| MicroPhenom-AI-1 | `microphenom` | `codex/azure-realtime-microphenom` | `GEMINI` | same as above | `www.microphenomai.newpsychonaut.com` | `/api/health` |
| Facilitator-AI | `facilitator-ai` | `codex/azure-realtime-facilitator` | `GEMINI` | same as above | `www.facilitator-ai.newpsychonaut.com` | `/api/health` |

## Gate to Promote
- `200` health response
- Live session connect/disconnect works
- Transcript segments emitted
- Codification response returns without fallback error
- Diagnostics panel remains green for key/mic/network/session
