---
title: Public booking MCP server
---

# Public booking MCP server

The first implementation uses the official MCP SDK over **stdio**. A local MCP
host starts the process; the server calls the existing public booking REST API.
It does not start Express, import database models, or implement an HTTP MCP
endpoint. No booking-account credentials are required.

Work record: [implementation Epic](../epics/mcp-server/index.md).
The [research memo](contracts/api/mcp-gap-analysis.md) remains the design context,
not a claim that authenticated or purchase tools are implemented.

## Install and start

Use Node.js 22.12 or newer for the MCP integration and install the locked backend
dependencies. The legacy backend declares Node.js 18 compatibility, but the SDK's
transitive HTTP adapter declares a newer engine requirement; that legacy minimum
is not a compatibility guarantee for this new integration.

```bash
npm ci --prefix /home/runner/work/booking-app/booking-app/backend
```

Start the booking API separately using the existing development setup. Then a
local MCP host can launch the server with this configuration:

```json
{
  "mcpServers": {
    "booking": {
      "command": "node",
      "args": [
        "/home/runner/work/booking-app/booking-app/backend/server/mcp/index.js"
      ],
      "env": {
        "BOOKING_API_BASE_URL": "http://localhost:4000"
      }
    }
  }
}
```

Adjust the absolute checkout path for your machine. The API URL is trusted
operator configuration, not a tool argument. Use only a trusted booking API
origin; do not embed credentials or pass a user-supplied URL.

For a terminal process launch:

```bash
npm --silent --prefix /home/runner/work/booking-app/booking-app/backend run mcp:start
```

The process speaks MCP on stdin/stdout, not a human-readable interactive prompt.
Use the direct Node entrypoint in hosts to avoid package-manager banners on
protocol stdout. Operational errors belong on stderr; never log credentials.

## Simple protocol test

```bash
npm --prefix /home/runner/work/booking-app/booking-app/backend run test:mcp
```

The test uses a simple official SDK `Client` with `StdioClientTransport` to spawn
the actual server entrypoint. A localhost HTTP fixture acts as the booking API.
The client initializes the connection, lists tools and invokes public discovery
tools, verifying the returned data and HTTP requests. All transports, server
processes and fixture listeners are closed after the test.

This is a genuine MCP protocol exchange, not a direct function-only test. It is
database-free and requires no Discord credentials, running Express application,
external model, or live booking data. It does **not** prove production database,
availability, authentication, payment or booking behavior.

## Tools and boundary

| Tool | Backing endpoint | Purpose |
|---|---|---|
| `search_experiences` | `GET /api/experiences` | Public experience discovery with a narrow validated query surface |
| `get_experience` | `GET /api/experiences/{experienceCode}` | Public experience details |
| `list_experience_dates` | `GET /api/experiences/{experienceCode}/schedule` | Scheduled dates and API timezone |

Inputs:

- Search: optional `city` (1–100 characters) and `currentPage` (default 1,
  maximum 10,000). The API returns six results per page.
- Detail: positive integer `experienceCode`.
- Dates: positive integer `experienceCode`, optional `currentPage`, `pageSize`
  (1–100, default 6), and `startDate` (`YYYY-MM-DD` in the schedule timezone).

Experience identifiers are bounded to 2,147,483,647; unknown arguments are
rejected. Use MCP tool discovery for the authoritative schemas. Outputs
contain only selected public fields, not complete database models or arbitrary
upstream JSON. The REST list/detail and schedule responses use different
envelopes; the adapter handles each explicitly.

**Schedule caveat:** the existing schedule GET may synchronize/populate sessions
when none are found. Calling the dates tool does not explicitly book or edit an
experience, but it is not guaranteed to be free of backend writes.

## Security and operations

- Stdio is a trusted local process boundary, not remote authentication. This
  implementation must not be exposed as a public remote MCP service.
- The server uses fixed public paths under its configured API origin. It sends
  no booking cookies, authorization headers, Discord tokens or user credentials.
- Inputs are validated; each HTTP response has a 5-second deadline and 1 MiB
  size limit, redirects are rejected,
  and upstream diagnostics replaced with safe tool errors. There is no automatic
  retry, especially for schedule reads with possible synchronization side effects.
- API descriptions are untrusted content, not instructions. A model or host must
  not treat returned text as authority to run other actions.
- Account linking, organization management, cart changes, reservations, checkout,
  private receipts and verification-token handling remain unimplemented.
- Discovery data is informational, not an inventory hold, final-price guarantee
  or completed payment. Continue booking in the existing application.

If a host cannot initialize, check the absolute entrypoint and Node installation.
If a tool reports an API failure, verify the configured origin and API
availability outside the model session; do not paste raw private responses,
cookies or tokens into chat. Roll back by removing the host entry or stopping its
child process; no REST routes, database schemas or booking state are installed by
the MCP server.

## Architecture findings and deployment considerations

These findings were reviewed on 2026-10-27. They distinguish the implemented
stdio integration from possible future production infrastructure; they do not
authorize or implement remote hosting, authenticated tools or booking writes.

### Service boundary and LangChain

The MCP server does **not** have to run inside the Express backend. Its code
currently shares the backend package and dependencies, but runs as a separate
process and calls REST rather than importing controllers or database models.
Code location, process isolation and independent deployment are separate choices.

LangChain serves a different role: it can orchestrate a conversational agent that
uses MCP tools. A future interaction path could be:

**Discord → LangChain agent/MCP client → MCP server → Booking REST API → database**

Neither LangChain nor a Discord runtime is implemented here. LangChain could
instead call REST directly, reducing components for a single bot but bypassing
the reusable MCP interface and its tested validation/filtering boundary. The
recommended starting point is to retain MCP and add agent orchestration only
when conversational behavior is required. LangChain does not supply booking
identity, consent, authorization or safe checkout automatically.

The public website chat sidebar now uses a LangChain `ChatOpenAI` model with the
OpenAI API, and calls the existing MCP public experience tools in-process over
an in-memory MCP transport. Configure `OPENAI_API_KEY` in the backend
environment; `OPENAI_MODEL` defaults to `gpt-4o-mini`. This is a separate API
integration and billing account from Copilot. The assistant can search public
experiences and read their details and dates, but has no booking, payment,
account, or private-data tools. The public `POST /api/chat` endpoint limits
conversation size and requests per IP; browser conversation history is sent
with each message and is not stored by this backend. Chat messages and public
tool results are sent to OpenAI to generate replies.

### Transport and hosting options

| Option | Suitable use | Considerations |
|---|---|---|
| Client-owned stdio child process | One bot/agent deployment using the current implementation | No network MCP listener or ingress needed; the host owns process startup, shutdown and restart. Multiple bot replicas each own their MCP child. |
| Independent MCP service using Streamable HTTP | Multiple clients needing a shared network endpoint | Requires new transport implementation, authentication/authorization, TLS, rate limits and connection/session lifecycle management. Not supported by the current entrypoint. |

A child process can be packaged with its client or launched through a
container-aware host, but an ordinary detached stdio container is not a remotely
callable MCP service. Likewise, adding a reverse proxy in front of this stdio
entrypoint does not turn it into Streamable HTTP.

For independent packaging, separate the MCP package/image and its SDK dependencies
from the API package without moving business logic or database access into MCP.
Only the booking API should own database access; MCP and bot/agent components
should receive no MySQL credentials. Cross-container API configuration must use
the API service address, not `localhost`, which identifies the caller's own
container. The existing origin validator accepts only an HTTP(S) origin, not a
path prefix or embedded credentials.

| Infrastructure | Appropriate starting point | Main trade-off |
|---|---|---|
| Single VM with Docker Compose | Small initial deployment with manageable availability requirements | Simple operations, but shared host failure and operator-owned backups/upgrades |
| Managed container platform | Independent releases/scaling with less host administration | Platform cost, networking/secrets configuration and transport compatibility |
| Kubernetes | Established platform team or demonstrated orchestration needs | More operational complexity; not required merely because MCP is a separate process |

Long-lived bot connections and MCP streaming/session behavior must match the
chosen platform's connection limits, request timeouts and scale-to-zero behavior.
For Streamable HTTP, decide whether sessions are stateful before designing
replica routing, reconnects or shared state; do not assume arbitrary load
balancing preserves a session.

### Current repository production gaps

The production Compose definition at
`/home/runner/work/booking-app/booking-app/docker-compose.prod.yml` describes the
frontend, API, MySQL, Redis and an administrative helper. It does not launch MCP,
a bot or an agent. It builds application images locally; it is a deployment
baseline, not evidence that the infrastructure below is provisioned.

- Both `/home/runner/work/booking-app/booking-app/backend/Dockerfile` and the
  frontend build stage at
  `/home/runner/work/booking-app/booking-app/frontend/Dockerfile` use Node 18.
  Reconcile these with the MCP runtime guidance above: select a supported Node
  LTS, test image builds and the native dependencies, and align CI/runtime
  versions before shipping. Do not assume the current API image is a validated
  MCP production image.
- Compose publishes the frontend on HTTP port 80. Public HTTPS needs a configured
  TLS ingress/proxy or a correctly configured tunnel. API and data services must
  remain private; omit administrative helpers unless explicitly needed and
  access-controlled.
- Docker volumes provide persistence, not backup, restore verification,
  replication or high availability. Choose managed MySQL/Redis or explicitly own
  those operational responsibilities.
- The Compose file defines a Redis service, while the API consumes `REDIS_URL`
  from configuration. Confirm the intended instance and connectivity rather
  than assuming that the local service is automatically used.
- The deployment guide already requires deliberate migrations, disabled startup
  schema synchronization, and scheduling in exactly one worker. Preserve those
  constraints when adding replicas; MCP must not run migrations or scheduling.

### Production readiness checklist

**Build and release**

- Build immutable, versioned images from lockfiles in CI; promote the same
  artifacts through staging and production rather than rebuilding on each host.
  Use multi-stage builds where appropriate, non-root runtime users, minimal
  runtime contents and regularly updated base images.
- Run existing backend regressions, MCP protocol tests, frontend build/tests and
  applicable end-to-end checks. Add container startup and real staging API
  interoperability checks: the fixture smoke alone does not validate production.
- Scan dependencies/images and generate an artifact inventory/SBOM. Keep secrets
  out of build arguments, image layers, frontend bundles and source control.
- Run schema migrations as a controlled release step with compatible rollout
  sequencing and a recovery plan. Keep a known-good image and configuration for
  rollback; an application rollback does not automatically undo a migration.

**Network and credential boundaries**

- Terminate TLS at a controlled ingress, restrict proxy trust to the actual
  topology, and keep MySQL/Redis on private networks. Restrict MCP egress to the
  trusted booking API where the platform supports it.
- If remote MCP is introduced, validate HTTP host/origin expectations, authenticate
  callers and authorize tool access; CORS is not authentication. Define token
  audience/scopes and credential rotation. Never forward a caller's arbitrary
  bearer token to the booking API.
- Inject secrets at runtime using the deployment secret store. The current public
  MCP tools need no account, Discord or model-provider credentials; future
  bot/agent credentials belong to their owning service, not every container.
- Authenticated booking tools require a separate user-linking, tenant-isolation,
  consent and revocation design. Current cookie-based REST auth is not an
  existing delegated-agent authorization contract.

**Reliability, scaling and data**

- Separate frontend, API, bot/agent and any remote MCP service release boundaries.
  A model-provider or bot outage should not prevent ordinary website bookings.
- Set concurrency/resource limits, request deadlines and graceful shutdown.
  Supervise stdio child processes; drain active calls before termination where
  practical. Configure any streaming proxy to avoid unwanted buffering and
  premature connection termination.
- Budget database connections across API replicas. Keep scheduler ownership
  explicit and test backup restoration against defined recovery requirements.
  Protect backup and log access as carefully as live data.
- The existing MCP adapter enforces a 5-second HTTP deadline, 1 MiB response limit
  and no automatic retries; these are code defaults, not environment-tunable
  production controls. Size and load-test them before changing them. Do not
  blindly retry dates calls: their GET can synchronize schedules. Checkout
  remains unimplemented and lacks a client idempotency contract.

**Observability, agent safety and cost**

- Add readiness/liveness signals appropriate to the deployment: a stdio process
  is not an HTTP health endpoint. Monitor initialization failures, tool latency,
  upstream errors, timeouts, process restarts and saturation.
- Correlate requests across client/MCP/API without logging full prompts, tool
  payloads, cookies, receipt capabilities or customer PII. Define retention and
  redaction policies before enabling model tracing.
- Bound agent iterations, tool calls, concurrency and model spending. Treat API
  content as untrusted input; tool allowlists and backend authorization remain
  required even when an agent requests an action.
- A future Discord adapter needs mention-safe formatting, platform rate-limit
  handling and least-privilege permissions. Discord identity alone is not proof
  of booking-account or receipt ownership.

### Recommended initial topology and open decisions

Start with Compose or a managed container platform, private data services and a
bot/agent that owns its local stdio MCP child. Extract an independent package/image
when release or dependency isolation warrants it; adopt a network MCP service
only when shared remote clients justify the added operational/security boundary.
Keep discovery public-only and continue purchases in the existing application.

Before provisioning, decide the expected clients/traffic, availability and
recovery requirements, hosting region/data residency, operating owner, monthly
cost limits, and whether remote MCP is actually needed. Decide LangChain/model
provider and Discord scope separately from MCP transport. Authenticated tools,
payment integration and public remote exposure require their own approved
implementation and verification work.
