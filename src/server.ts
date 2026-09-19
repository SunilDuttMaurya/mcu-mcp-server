import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Database } from "sql.js";
import { registerCastTools } from "./mcps/cast-tools.js";
import { registerSearchTools } from "./mcps/search-tools.js";
import { registerTitleTools } from "./mcps/title-tools.js";

export function createMcpServer(db: Database): McpServer {
  const server = new McpServer({ name: "mcu-mcp-server", version: "1.0.0" });
  registerTitleTools(server, db);
  registerCastTools(server, db);
  registerSearchTools(server, db);
  return server;
}
