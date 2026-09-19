# Copilot Instructions

## Project overview

`mcu-mcp-server` is a TypeScript Model Context Protocol (MCP) server for
querying a Marvel Cinematic Universe catalog. It supports both:

- **stdio transport** for MCP clients that launch the server as a child process.
- **Streamable HTTP transport** for clients that connect to an HTTP endpoint.

The catalog is loaded from `data/marvel-movies.json` into an in-memory SQLite
database implemented by `sql.js`. The JSON file is the source of truth; the
database is rebuilt every time the process starts and is never persisted.

Keep changes focused on the MCP server, its catalog, its transports, and the
documentation needed to operate them. Do not commit generated `dist/` output
or `node_modules/`.

## Runtime architecture

The application is organized into four layers:

1. **Transport/bootstrap layer**
   - `src/index.ts` starts the stdio server.
   - `src/http.ts` starts the Streamable HTTP server.
   - Both entrypoints create one database, create one configured MCP server,
     connect the server to a transport, and close resources on shutdown.
2. **MCP composition layer**
   - `src/server.ts` creates the `McpServer` instance.
   - It registers title, cast, and search tool groups against the same database.
3. **Query/data layer**
   - `src/database/connection.ts` initializes `sql.js`, creates the schema, and
     seeds the catalog.
   - `src/database/schema.ts` defines normalized SQLite tables and indexes.
   - `src/database/seed.ts` reads and validates the expected catalog shape by
     loading `data/marvel-movies.json`, then inserts titles and cast relations.
   - `src/database/queries.ts` contains reusable, typed query functions.
4. **Response layer**
   - `src/mcps/response.ts` converts query results into MCP text content.
   - Tool handlers should delegate database work to query functions and return
     the shared response shape rather than formatting data independently.

The normal request flow is:

```text
MCP client
  -> stdio or HTTP transport
  -> McpServer
  -> registered tool handler
  -> database query helper
  -> in-memory SQLite
  -> shared text response
  -> MCP client
```

## Repository structure

```text
.
├── .github/
│   ├── copilot-instructions.md
│   └── workflows/build.yml
├── data/
│   └── marvel-movies.json
├── src/
│   ├── database/
│   │   ├── connection.ts
│   │   ├── queries.ts
│   │   ├── schema.ts
│   │   └── seed.ts
│   ├── mcps/
│   │   ├── cast-tools.ts
│   │   ├── response.ts
│   │   ├── search-tools.ts
│   │   └── title-tools.ts
│   ├── http.ts
│   ├── index.ts
│   ├── server.ts
│   └── types.ts
├── package.json
├── package-lock.json
├── README.md
└── tsconfig.json
```

## Catalog and database model

The catalog contains `movies` and `tv_series` arrays. Entries use the shared
types in `src/types.ts`:

- `type`: `movie`, `tv_series`, `tv_special`, or `documentary_series`
- `status`: `released`, `upcoming`, or `announced`
- `release_year`: an optional numeric year
- `cast`: an array of actor names

The normalized database has three tables:

- `titles`: title metadata, including type, status, release year, and synopsis.
- `cast_members`: unique actor names.
- `title_cast`: many-to-many relationship between titles and cast members.

The relationship table has a composite primary key and foreign keys with
cascade deletion. Indexes exist for title year, title type, and cast name.
Preserve these constraints when changing the schema.

When adding catalog data:

1. Keep the JSON shape consistent with `src/types.ts`.
2. Use the canonical actor name already present in the catalog when possible.
3. Update `last_updated` if the catalog's contents change.
4. Run the TypeScript build after editing the data or seed logic.

## MCP tools

Tool registration is grouped by concern:

### Title tools (`src/mcps/title-tools.ts`)

- `movies_by_year`: movie entries for a required year.
- `list_movies`: movies filtered optionally by year and status.
- `list_tv_series`: TV series filtered optionally by year and status.
- `list_mcu_titles`: all supported entry types with optional type, year, and
  status filters.

Year inputs are integers from 1900 through 2200. Type and status inputs use
Zod enums. Preserve these validation boundaries and use optional filters rather
than duplicating query implementations.

### Cast tools (`src/mcps/cast-tools.ts`)

- `titles_by_cast_member`: titles whose cast contains a case-insensitive
  partial match for a supplied actor name.
- `cast_member_stats`: appearance counts split into movies and TV series.

These tools search actor names, not fictional character names. Do not silently
map a character such as Tony Stark to an actor unless that mapping is added to
the catalog model and explicitly documented.

### Search tools (`src/mcps/search-tools.ts`)

- `search_mcu`: case-insensitive partial search across title, synopsis, and
  cast member name.

Keep user-facing tool descriptions accurate and keep each tool's input schema
strict. Reject empty strings through Zod instead of returning a success-shaped
fallback.

## Query implementation rules

Put reusable SQL in `src/database/queries.ts`; do not embed database queries
inside MCP registration functions. Use parameterized SQL values, never string
concatenation for user input. Keep result types explicit and preserve the
stable ordering currently used by the API: release year first, then title.

When a query needs complete title details, use the existing title/cast
aggregation approach so every tool returns the same `TitleWithCast` shape.
Handle titles without cast members as an empty array, not `null`.

Surface failures explicitly. Do not add broad catches, silent defaults, or
success responses that hide malformed catalog data or database errors.

## Transport behavior and logging

### Stdio

`src/index.ts` connects `McpServer` to `StdioServerTransport`. stdout is
reserved for MCP JSON-RPC traffic. Diagnostic logging for the stdio server
must use `console.error()` or another stderr-based logger; never write debug
messages with `console.log()` because that can corrupt the protocol.

### HTTP

`src/http.ts` exposes `/mcp` on port `process.env.PORT` or `3000`. It manages
Streamable HTTP transports in an in-memory map keyed by the MCP session ID.
Only an initialize POST without a session creates a transport. Later requests
must provide a valid `mcp-session-id` header.

The HTTP server logs request methods, MCP method/tool names, response status,
and duration to stderr. It intentionally does not log request payloads or
session identifiers. Preserve that privacy boundary when adding diagnostics.

Because HTTP sessions are in memory, restarting the process invalidates old
client sessions. A client must initialize a new session after a restart.
When debugging `Missing or invalid MCP session`, first verify that exactly one
server owns the configured port and reconnect the MCP client.

## Development commands

Use the existing npm scripts:

```bash
npm install
npm run build
npm run typecheck
npm start
npm run start:http
npm run dev
npm run dev:http
```

`npm run build` compiles `src/**/*.ts` into `dist/`. The GitHub Actions build
workflow runs `npm ci` followed by `npm run build` on pushes to `main` and
feature branches and on pull requests.

Before submitting code changes:

1. Run `npm run build`.
2. Run `npm run typecheck` when changing types, queries, or tool schemas.
3. Run `git diff --check`.
4. Update `README.md` when commands, tools, transports, or operational behavior
   change.

## Change guidelines

- Follow the existing TypeScript strict-mode and ES module configuration.
- Use `.js` extensions in relative imports because the project uses
  `module: "NodeNext"`.
- Prefer small, cohesive modules and existing helpers over duplicated logic.
- Keep MCP tool names and response formats backward compatible unless the
  change explicitly requires a breaking change.
- Add or update tests when a test harness is introduced; until then, validate
  behavior with the build, typecheck, and focused runtime checks available.
- Do not commit secrets, local database files, logs, generated output, or
  dependency directories.
