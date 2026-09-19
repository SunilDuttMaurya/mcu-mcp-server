export type CatalogEntryType = "movie" | "tv_series" | "tv_special" | "documentary_series";
export type CatalogEntryStatus = "released" | "upcoming" | "announced";

export interface CatalogEntry {
  title: string;
  type: CatalogEntryType;
  status: CatalogEntryStatus;
  release_year: number | null;
  cast: string[];
  about: string;
}

export interface Catalog {
  catalog: string;
  scope: {
    included: string[];
    excluded: string[];
  };
  last_updated: string;
  movies: CatalogEntry[];
  tv_series: CatalogEntry[];
}
