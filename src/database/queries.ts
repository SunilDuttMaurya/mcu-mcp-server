import type { Database } from "sql.js";

export interface TitleRow {
  id: number;
  title: string;
  type: "movie" | "tv_series" | "tv_special" | "documentary_series";
  status: "released" | "upcoming" | "announced";
  release_year: number | null;
  about: string;
}

export interface TitleWithCast extends TitleRow {
  cast: string[];
}

type TitleFilters = {
  type?: TitleRow["type"];
  year?: number;
  status?: TitleRow["status"];
};

function queryRows<T>(
  db: Database,
  sql: string,
  params: Record<string, string | number> = {},
): T[] {
  const statement = db.prepare(sql);
  statement.bind(params);
  const rows: T[] = [];
  while (statement.step()) rows.push(statement.getAsObject() as T);
  statement.free();
  return rows;
}

export function getTitles(db: Database, filters: TitleFilters = {}): TitleWithCast[] {
  const clauses = ["1 = 1"];
  const params: Record<string, string | number> = {};
  if (filters.type) {
    clauses.push("t.type = $type");
    params.$type = filters.type;
  }
  if (filters.year) {
    clauses.push("t.release_year = $year");
    params.$year = filters.year;
  }
  if (filters.status) {
    clauses.push("t.status = $status");
    params.$status = filters.status;
  }

  const rows = queryRows<TitleRow & { cast_names: string | null }>(
    db,
    `SELECT t.id, t.title, t.type, t.status, t.release_year, t.about,
            GROUP_CONCAT(c.name, '||') AS cast_names
     FROM titles t
     LEFT JOIN title_cast tc ON tc.title_id = t.id
     LEFT JOIN cast_members c ON c.id = tc.cast_member_id
     WHERE ${clauses.join(" AND ")}
     GROUP BY t.id
     ORDER BY t.release_year, t.title`,
    params,
  );

  return rows.map(({ cast_names, ...title }) => ({
    ...title,
    cast: cast_names ? cast_names.split("||") : [],
  }));
}

export function searchTitles(db: Database, query: string): TitleWithCast[] {
  const rows = queryRows<{ id: number }>(
    db,
    `SELECT DISTINCT t.id FROM titles t
     LEFT JOIN title_cast tc ON tc.title_id = t.id
     LEFT JOIN cast_members c ON c.id = tc.cast_member_id
     WHERE t.title LIKE $query COLLATE NOCASE
        OR t.about LIKE $query COLLATE NOCASE
        OR c.name LIKE $query COLLATE NOCASE`,
    { $query: `%${query}%` },
  );
  const ids = new Set(rows.map((row) => row.id));
  return getTitles(db).filter((title) => ids.has(title.id));
}

export function findCastMemberTitles(db: Database, name: string): TitleWithCast[] {
  const rows = queryRows<{ id: number }>(
    db,
    `SELECT DISTINCT t.id FROM titles t
     JOIN title_cast tc ON tc.title_id = t.id
     JOIN cast_members c ON c.id = tc.cast_member_id
     WHERE c.name LIKE $name COLLATE NOCASE`,
    { $name: `%${name}%` },
  );
  const ids = new Set(rows.map((row) => row.id));
  return getTitles(db).filter((title) => ids.has(title.id));
}

export function castMemberStats(db: Database, name: string) {
  return queryRows(
    db,
    `SELECT c.name, COUNT(DISTINCT t.id) AS appearances,
            COUNT(DISTINCT CASE WHEN t.type = 'movie' THEN t.id END) AS movies,
            COUNT(DISTINCT CASE WHEN t.type = 'tv_series' THEN t.id END) AS tv_series
     FROM cast_members c
     JOIN title_cast tc ON tc.cast_member_id = c.id
     JOIN titles t ON t.id = tc.title_id
     WHERE c.name LIKE $name COLLATE NOCASE
     GROUP BY c.id ORDER BY appearances DESC, c.name`,
    { $name: `%${name}%` },
  );
}
