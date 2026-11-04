import { useQuery, UseQueryOptions, QueryFunctionContext } from "@tanstack/react-query";
import { z } from "zod";
import { parseWithLog } from "./parse-with-log";

type UseQueryWithParseOptions<T> = Omit<UseQueryOptions<T, Error, T>, "queryFn"> & {
  // Receives React Query's context so callers can forward `signal` and let it cancel stale requests.
  queryFn: (context: QueryFunctionContext) => Promise<unknown>;
  schema: z.ZodType<T, unknown>;
  context?: string;
};

export function useQueryWithParse<T>({
  queryFn,
  schema,
  context,
  ...options
}: UseQueryWithParseOptions<T>) {
  return useQuery({
    ...options,
    queryFn: async (queryContext) => {
      const response = await queryFn(queryContext);
      return parseWithLog(schema, response, context);
    },
  });
}
