import type { GenreTreeProps } from "@behindthemusictree/genre-tree-view";

/** The host-owned detail panel's contract with the tree: the area the panel covers, and the node-style resolver the tree publishes back. */
export type HostPanelProps = Partial<Pick<GenreTreeProps, "obscuredInset" | "onNodeStyleResolverChange">>;
