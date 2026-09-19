import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Database } from "sql.js";
import { castMemberStats, findCastMemberTitles } from "../database/queries.js";
import { textResult } from "./response.js";

export function registerCastTools(server: McpServer, db: Database): void {
  server.registerTool("titles_by_cast_member", {
    description: "Find every MCU movie and series featuring a cast member.",
    inputSchema: { name: z.string().min(1) },
  }, async ({ name }) => textResult(findCastMemberTitles(db, name)));

  server.registerTool("cast_member_stats", {
    description: "Count a cast member's MCU appearances, split between movies and TV series.",
    inputSchema: { name: z.string().min(1) },
  }, async ({ name }) => textResult(castMemberStats(db, name)));
}
