import initSqlJs, { type Database } from "sql.js";
import { createTables } from "./schema.js";
import { seedDatabase } from "./seed.js";

export async function createDatabase(): Promise<Database> {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  createTables(db);
  seedDatabase(db);
  return db;
}

export function closeDatabase(db: Database): void {
  db.close();
}
