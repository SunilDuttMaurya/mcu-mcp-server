import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Database } from "sql.js";
import { searchTitles } from "../database/queries.js";
import { textResult } from "./response.js";

export function registerSearchTools(server: McpServer, db: Database): void {
  server.registerTool("search_mcu", {
    description: "Search MCU titles, descriptions, and cast members.",
    inputSchema: { query: z.string().min(1) },
  }, async ({ query }) => textResult(searchTitles(db, query)));
}
