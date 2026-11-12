import type { ReactNode } from "react";

export type SearchGroupItem = { key: string; content: ReactNode; onSelect: () => void };

/** One headed list of results in a `SearchBox`, resolved by the host or by a group hook. */
export type SearchGroup = {
  key: string;
  /** Heading of the group; omitted when it is the only one. */
  label?: string;
  items: SearchGroupItem[];
  /** Announced politely, e.g. "No artists found". */
  status?: string;
  /** Shows a spinner in place of the search icon while this group resolves. */
  loading?: boolean;
};

export const SEARCH_FAILED_STATUS = "Search failed";

/** "Search failed" on error, "No <noun> found" once settled and empty, else "". */
export const searchStatus = (
  state: { isError: boolean; settled: boolean },
  count: number,
  noun: string,
): string => (state.isError ? SEARCH_FAILED_STATUS : state.settled && count === 0 ? `No ${noun} found` : "");
