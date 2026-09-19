# MCU MCP Server

An MCP server backed by an in-memory SQLite database populated from
`data/marvel-movies.json` when the process starts.

## Setup

```bash
npm install
npm run build
npm start
```

The project uses TypeScript and emits compiled files into `dist/`. The same
build is verified automatically by the GitHub Actions workflow on pushes to
`main` or feature branches and on pull requests.

For an HTTP MCP endpoint, run:

```bash
npm run start:http
```

This exposes the Streamable HTTP MCP endpoint at `http://localhost:3000/mcp`.
Set `PORT` to use a different port. Run `npm run dev:http` during development.
The stdio server remains available with `npm start`.

The HTTP server logs incoming request methods and MCP method/tool names to
stderr, followed by the response status and duration. Request payloads and
session identifiers are not logged.

## Tools

- `movies_by_year`: every movie for a release year.
- `list_movies`: all movies, optionally filtered by year or status.
- `list_tv_series`: all MCU television series, optionally filtered by year or status.
- `titles_by_cast_member`: every movie or series featuring a cast member.
- `cast_member_stats`: appearance count split between movies and TV series.
- `search_mcu`: search titles, descriptions, and cast members.
- `list_mcu_titles`: general catalog query with type, year, and status filters.

The SQLite database is intentionally in-memory: the JSON catalog is the source
of truth and no database file is written to disk.

## Project structure

- `src/database/connection.ts`: creates and closes the in-memory SQLite connection.
- `src/database/schema.ts`: defines tables and indexes.
- `src/database/seed.ts`: loads the catalog JSON into SQLite.
- `src/database/queries.ts`: contains reusable database queries.
- `src/mcps/`: MCP tool registration grouped by title, cast, and search concerns.
- `src/index.ts`: application bootstrap and transport setup.
