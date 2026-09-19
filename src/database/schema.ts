import type { Database } from "sql.js";

export function createTables(db: Database): void {
  db.exec(`
    CREATE TABLE titles (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL CHECK (type IN ('movie', 'tv_series', 'tv_special', 'documentary_series')),
      status TEXT NOT NULL CHECK (status IN ('released', 'upcoming', 'announced')),
      release_year INTEGER,
      about TEXT NOT NULL
    );
    CREATE TABLE cast_members (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    );
    CREATE TABLE title_cast (
      title_id INTEGER NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
      cast_member_id INTEGER NOT NULL REFERENCES cast_members(id) ON DELETE CASCADE,
      PRIMARY KEY (title_id, cast_member_id)
    );
    CREATE INDEX titles_year_idx ON titles(release_year);
    CREATE INDEX titles_type_idx ON titles(type);
    CREATE INDEX cast_name_idx ON cast_members(name);
  `);
}
