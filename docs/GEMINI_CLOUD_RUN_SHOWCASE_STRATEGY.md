# Gemini Cloud Run Showcase Strategy

## Objective

Run Azure as the default production runtime and expose Gemini-on-Cloud-Run only for controlled demo/showcase traffic.

## Target operating model

- Production default: Azure App Service + Azure OpenAI Realtime.
- Showcase path: Google Cloud Run + Gemini for specific demos and media captures.
- Routing control: explicit feature flag or dedicated showcase hostnames.

## Recommended topology

1. Keep existing Azure sites as primary:
   - `neurophenom-finesse.azurewebsites.net`
   - `microphenom.azurewebsites.net`
   - `facilitator-ai.azurewebsites.net`
2. Create separate showcase hosts (example):
   - `showcase.neurophenomai.newpsychonaut.com`
   - `showcase.microphenomai.newpsychonaut.com`
   - `showcase.facilitatorai.newpsychonaut.com`
3. Point showcase hosts to Cloud Run services with Gemini credentials isolated from Azure secrets.

## Cost controls

## Hard limits

- Cloud Run `max-instances`: set low (for example `1-3`) per showcase service.
- Cloud Run concurrency: keep moderate (`10-20`) to avoid over-scaling spikes.
- Request timeout: cap to realistic session limits.
- Scheduled disable: stop showcase services outside demo windows.

## Budget governance

- Create per-project budget alerts at 50%, 80%, 100%.
- Add daily spend alerting to Slack/email.
- Use separate GCP project for showcase workloads.

## Traffic gating

- Require a showcase token/header or basic auth on showcase hosts.
- Optionally IP-allowlist known demo networks.
- Disable search indexing for showcase domains.

## Product controls

- Default provider in UI remains Azure Realtime.
- Enable Gemini provider only when `SHOWCASE_MODE=true`.
- Add a runtime banner: `Showcase Mode (Gemini)`.

## Operational controls

## Kill switches

- `SHOWCASE_MODE=false` environment variable disables Gemini path instantly.
- Cloud Run IAM lockdown fallback: remove public invoker role.
- DNS rollback: repoint showcase CNAMEs away from Cloud Run.

## Observability

- Capture provider, request count, session count, duration, and error-rate.
- Add daily report: cost, sessions, successful completions.
- Alert on unusual burst rate or token usage anomalies.

## Rollout plan

1. Phase 1: internal-only showcase host + auth gate.
2. Phase 2: curated external demos with scheduled availability.
3. Phase 3: evaluate ROI and decide keep/expand/sunset.

## Decision rubric

Keep Gemini showcase enabled only if at least one applies:

- material conversion impact (demos -> leads/users/partners)
- meaningful brand/media showcase value
- unique capability not matched by Azure path

If not, keep Cloud Run disabled and retain Azure-only operation.
