import { isNotFoundError } from "../app-errors/app-error";

const MAX_RESOURCE_ATTEMPTS = 3;

/** React Query `retry` for a single resource: a 404 is final, other failures retry up to three times. */
export const resourceRetry = (failureCount: number, error: Error) =>
  !isNotFoundError(error) && failureCount < MAX_RESOURCE_ATTEMPTS;

export type ResourceResult<T> =
  | { status: "idle" }
  | { status: "not-found" }
  | { status: "error" }
  | { status: "loading" }
  | { status: "success"; data: T };

/**
 * Maps a single-resource query to the state a panel renders. `isValidId: false` means the id can't
 * name a resource (e.g. a malformed uuid from the URL), so it is not found without a request.
 */
export function toResourceResult<T>({ id, isValidId, data, error, isPending }: {
  id: string | null;
  isValidId: boolean;
  data: T | undefined;
  error: Error | null;
  isPending: boolean;
}): ResourceResult<T> {
  if (id === null) return { status: "idle" };
  if (!isValidId || isNotFoundError(error)) return { status: "not-found" };
  if (error) return { status: "error" };
  if (isPending || data === undefined) return { status: "loading" };
  return { status: "success", data };
}
