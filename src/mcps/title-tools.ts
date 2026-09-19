import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getTitles } from "../database/queries.js";
import type { Database } from "sql.js";
import { textResult } from "./response.js";

const typeSchema = z.enum(["movie", "tv_series", "tv_special", "documentary_series"]);
const statusSchema = z.enum(["released", "upcoming", "announced"]);
const yearSchema = z.number().int().min(1900).max(2200);

export function registerTitleTools(server: McpServer, db: Database): void {
  server.registerTool("movies_by_year", {
    description: "List every MCU movie released or scheduled for a specific year.",
    inputSchema: { year: yearSchema },
  }, async ({ year }) => textResult(getTitles(db, { type: "movie", year })));

  server.registerTool("list_movies", {
    description: "List all MCU movies, optionally filtered by release year or status.",
    inputSchema: { year: yearSchema.optional(), status: statusSchema.optional() },
  }, async ({ year, status }) => textResult(getTitles(db, { type: "movie", year, status })));

  server.registerTool("list_tv_series", {
    description: "List all Marvel Cinematic Universe television series.",
    inputSchema: { year: yearSchema.optional(), status: statusSchema.optional() },
  }, async ({ year, status }) => textResult(getTitles(db, { type: "tv_series", year, status })));

  server.registerTool("list_mcu_titles", {
    description: "List all MCU entries with optional type, year, and status filters.",
    inputSchema: {
      type: typeSchema.optional(),
      year: yearSchema.optional(),
      status: statusSchema.optional(),
    },
  }, async ({ type, year, status }) => textResult(getTitles(db, { type, year, status })));
}
