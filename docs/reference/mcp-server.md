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
