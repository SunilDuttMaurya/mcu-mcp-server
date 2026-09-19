import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Database } from "sql.js";
import type { Catalog, CatalogEntry } from "../types.js";

const catalogPath = resolve(process.cwd(), "data", "marvel-movies.json");

function loadCatalog(): Catalog {
  try {
    return JSON.parse(readFileSync(catalogPath, "utf8")) as Catalog;
  } catch (error) {
    throw new Error(`Unable to load MCU catalog from ${catalogPath}`, { cause: error });
  }
}

export function seedDatabase(db: Database): void {
  const catalog = loadCatalog();
  const entries: CatalogEntry[] = [...catalog.movies, ...catalog.tv_series];

  for (const entry of entries) {
    db.run(
      "INSERT INTO titles (title, type, status, release_year, about) VALUES (?, ?, ?, ?, ?)",
      [entry.title, entry.type, entry.status, entry.release_year, entry.about],
    );
    const titleId = db.exec("SELECT last_insert_rowid() AS id")[0].values[0][0] as number;

    for (const actor of entry.cast) {
      db.run("INSERT OR IGNORE INTO cast_members (name) VALUES (?)", [actor]);
      const castResult = db.exec("SELECT id FROM cast_members WHERE name = ?", [actor]);
      const castMemberId = castResult[0].values[0][0] as number;
      db.run("INSERT INTO title_cast (title_id, cast_member_id) VALUES (?, ?)", [
        titleId,
        castMemberId,
      ]);
    }
  }
}
