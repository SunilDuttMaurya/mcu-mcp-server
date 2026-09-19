import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { closeDatabase, createDatabase } from "./database/connection.js";
import { createMcpServer } from "./server.js";

const db = await createDatabase();
const server = createMcpServer(db);

process.on("SIGINT", () => {
  closeDatabase(db);
  process.exit(0);
});
process.on("SIGTERM", () => {
  closeDatabase(db);
  process.exit(0);
});

await server.connect(new StdioServerTransport());
