import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { closeDatabase, createDatabase } from "./database/connection.js";
import { createMcpServer } from "./server.js";

const port = Number(process.env.PORT ?? 3000);
const db = await createDatabase();
const transports = new Map<string, StreamableHTTPServerTransport>();

function getMcpRequestDetails(body: unknown): string {
  if (!body || typeof body !== "object") return "";

  const request = body as { method?: unknown; params?: { name?: unknown } };
  const method = typeof request.method === "string" ? request.method : undefined;
  const toolName =
    request.params && typeof request.params.name === "string"
      ? request.params.name
      : undefined;

  return [method && `mcpMethod=${method}`, toolName && `tool=${toolName}`]
    .filter(Boolean)
    .join(" ");
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  if (chunks.length === 0) return undefined;
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error("Request body must be valid JSON");
  }
}

function sendError(res: ServerResponse, status: number, message: string): void {
  if (!res.headersSent) {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: message }));
  }
}

async function handleMcp(
  req: IncomingMessage,
  res: ServerResponse,
  body: unknown,
): Promise<void> {
  const sessionId = req.headers["mcp-session-id"];
  let transport = typeof sessionId === "string" ? transports.get(sessionId) : undefined;

  if (!transport && req.method === "POST" && isInitializeRequest(body)) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (newSessionId) => {
        transports.set(newSessionId, transport as StreamableHTTPServerTransport);
      },
    });
    transport.onclose = () => {
      if (transport?.sessionId) transports.delete(transport.sessionId);
    };
    await createMcpServer(db).connect(transport);
  }

  if (!transport) {
    sendError(res, 400, "Missing or invalid MCP session");
    return;
  }
  await transport.handleRequest(req, res, body);
}

const httpServer = createServer(async (req, res) => {
  const startedAt = performance.now();
  const requestDetails = `${req.method ?? "UNKNOWN"} ${req.url ?? ""}`;
  console.error(`[request] ${requestDetails}`);
  res.once("finish", () => {
    const durationMs = Math.round(performance.now() - startedAt);
    console.error(
      `[response] ${requestDetails} status=${res.statusCode} duration=${durationMs}ms`,
    );
  });

  if (req.url !== "/mcp") {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
    return;
  }

  try {
    const body = req.method === "POST" ? await readBody(req) : undefined;
    const mcpDetails = getMcpRequestDetails(body);
    if (mcpDetails) console.error(`[request] ${requestDetails} ${mcpDetails}`);

    await handleMcp(req, res, body);
  } catch (error) {
    console.error("MCP request failed:", error);
    sendError(res, 500, "Internal server error");
  }
});

httpServer.listen(port, () => {
  console.error(`MCU MCP server listening at http://localhost:${port}/mcp`);
});

async function shutdown(): Promise<void> {
  await Promise.all([...transports.values()].map((transport) => transport.close()));
  closeDatabase(db);
  httpServer.close();
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
