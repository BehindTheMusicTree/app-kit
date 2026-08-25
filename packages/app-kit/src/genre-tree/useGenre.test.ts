import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";

const {
  fetchMock,
  useSessionMock,
  useQueryWithParseMock,
  useValidatedMutationMock,
  invalidateAllGenrePlaylistQueriesMock,
  invalidateQueriesMock,
  parseWithLogMock,
} = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  useSessionMock: vi.fn(),
  useQueryWithParseMock: vi.fn(),
  useValidatedMutationMock: vi.fn(),
  invalidateAllGenrePlaylistQueriesMock: vi.fn(),
  invalidateQueriesMock: vi.fn(),
  parseWithLogMock: vi.fn(),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: invalidateQueriesMock }),
  };
});

vi.mock("../transport/useFetchWrapper", () => ({
  useFetchWrapper: () => ({ fetch: fetchMock }),
}));

vi.mock("../auth/SessionContext", () => ({
  useSession: () => useSessionMock(),
}));

vi.mock("./useGenrePlaylist", () => ({
  useInvalidateAllGenrePlaylistQueries: () => invalidateAllGenrePlaylistQueriesMock,
}));

vi.mock("../transport/lib/use-query-with-parse", () => ({
  useQueryWithParse: (options: unknown) => useQueryWithParseMock(options),
}));

vi.mock("../transport/lib/use-validated-mutation", () => ({
  useValidatedMutation: (options: unknown) => useValidatedMutationMock(options),
}));

vi.mock("../transport/lib/parse-with-log", () => ({
  parseWithLog: (...args: unknown[]) => parseWithLogMock(...args),
}));

import {
  useListGenres,
  useFetchGenre,
  useLoadExampleTreeGenre,
  useCreateGenre,
  useUpdateGenre,
  useDeleteGenre,
} from "./useGenre";

const getBackendBaseUrl = () => "https://backend.example.com";

describe("useGenre", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSessionMock.mockReturnValue({ session: { accessToken: "token" }, sessionRestored: true });
    useValidatedMutationMock.mockReturnValue({ mutate: vi.fn(), formErrors: [] });
  });

  describe("useListGenres", () => {
    it("queries the reference endpoint and is always enabled for the reference scope", () => {
      renderHook(() => useListGenres(2, 50, "reference", getBackendBaseUrl));
      const { queryKey, enabled, queryFn } = useQueryWithParseMock.mock.calls[0][0];

      expect(queryKey).toEqual(["referenceGenres", "list", 2]);
      expect(enabled).toBe(true);

      queryFn();
      expect(fetchMock).toHaveBeenCalledWith("genres/", true, false, {}, { page: 2, pageSize: 50 });
    });

    it("queries the me endpoint and gates on a restored session with a token", () => {
      renderHook(() => useListGenres(1, 50, "me", getBackendBaseUrl));
      const { queryKey, enabled, queryFn } = useQueryWithParseMock.mock.calls[0][0];

      expect(queryKey).toEqual(["genres", "list", 1]);
      expect(enabled).toBe(true);

      queryFn();
      expect(fetchMock).toHaveBeenCalledWith("me/genres/", true, true, {}, { page: 1, pageSize: 50 });
    });

    it("disables the me query until the session is restored", () => {
      useSessionMock.mockReturnValue({ session: null, sessionRestored: false });
      renderHook(() => useListGenres(1, 50, "me", getBackendBaseUrl));

      expect(useQueryWithParseMock.mock.calls[0][0].enabled).toBe(false);
    });
  });

  describe("useFetchGenre", () => {
    it("fetches the reference detail endpoint and validates the response", async () => {
      fetchMock.mockResolvedValue({ uuid: "g1" });
      parseWithLogMock.mockReturnValue({ uuid: "g1" });
      const { result } = renderHook(() => useFetchGenre("reference", getBackendBaseUrl));

      const genre = await result.current("g1");

      expect(fetchMock).toHaveBeenCalledWith("genres/g1/", true, false);
      expect(parseWithLogMock).toHaveBeenCalledWith(expect.anything(), { uuid: "g1" }, "useFetchGenre");
      expect(genre).toEqual({ uuid: "g1" });
    });

    it("fetches the me detail endpoint", async () => {
      fetchMock.mockResolvedValue({ uuid: "g1" });
      const { result } = renderHook(() => useFetchGenre("me", getBackendBaseUrl));

      await result.current("g1");

      expect(fetchMock).toHaveBeenCalledWith("me/genres/g1/", true, true);
    });
  });

  describe("useLoadExampleTreeGenre", () => {
    it("posts to the reference load-example endpoint", async () => {
      renderHook(() => useLoadExampleTreeGenre("reference", getBackendBaseUrl));
      const { mutationFn } = useValidatedMutationMock.mock.calls[0][0];

      await mutationFn();

      expect(fetchMock).toHaveBeenCalledWith("genres/tree/load-example/", true, false, { method: "POST" });
    });

    it("posts to the me load-example endpoint", async () => {
      renderHook(() => useLoadExampleTreeGenre("me", getBackendBaseUrl));
      const { mutationFn } = useValidatedMutationMock.mock.calls[0][0];

      await mutationFn();

      expect(fetchMock).toHaveBeenCalledWith("me/genres/tree/load-example/", true, true, { method: "POST" });
    });

    it("onSuccess invalidates the scoped genre query and genre playlist queries", () => {
      renderHook(() => useLoadExampleTreeGenre("me", getBackendBaseUrl));
      const { onSuccess } = useValidatedMutationMock.mock.calls[0][0];

      onSuccess();

      expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ["genres"] });
      expect(invalidateAllGenrePlaylistQueriesMock).toHaveBeenCalled();
    });

    it("onSuccess invalidates the reference genre query and genre playlist queries", () => {
      renderHook(() => useLoadExampleTreeGenre("reference", getBackendBaseUrl));
      const { onSuccess } = useValidatedMutationMock.mock.calls[0][0];

      onSuccess();

      expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ["referenceGenres"] });
      expect(invalidateAllGenrePlaylistQueriesMock).toHaveBeenCalled();
    });
  });

  describe("useCreateGenre", () => {
    it("posts new genre data to the me create endpoint", async () => {
      fetchMock.mockResolvedValue({ uuid: "g1" });
      renderHook(() => useCreateGenre("me", getBackendBaseUrl));
      const { mutationFn } = useValidatedMutationMock.mock.calls[0][0];

      const result = await mutationFn({ name: "Jazz" });

      expect(fetchMock).toHaveBeenCalledWith("me/genres/", true, true, {
        method: "POST",
        body: JSON.stringify({ name: "Jazz" }),
      });
      expect(result).toEqual({ uuid: "g1" });
    });

    it("posts new genre data to the reference create endpoint", async () => {
      fetchMock.mockResolvedValue({ uuid: "g1" });
      renderHook(() => useCreateGenre("reference", getBackendBaseUrl));
      const { mutationFn } = useValidatedMutationMock.mock.calls[0][0];

      await mutationFn({ name: "Jazz" });

      expect(fetchMock).toHaveBeenCalledWith("genres/", true, false, {
        method: "POST",
        body: JSON.stringify({ name: "Jazz" }),
      });
    });

    it("onSuccess invalidates the reference genre query and genre playlist queries", () => {
      renderHook(() => useCreateGenre("reference", getBackendBaseUrl));
      const { onSuccess } = useValidatedMutationMock.mock.calls[0][0];

      onSuccess();

      expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ["referenceGenres"] });
      expect(invalidateAllGenrePlaylistQueriesMock).toHaveBeenCalled();
    });

    it("onSuccess invalidates the me genre query and genre playlist queries", () => {
      renderHook(() => useCreateGenre("me", getBackendBaseUrl));
      const { onSuccess } = useValidatedMutationMock.mock.calls[0][0];

      onSuccess();

      expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ["genres"] });
      expect(invalidateAllGenrePlaylistQueriesMock).toHaveBeenCalled();
    });
  });

  describe("useUpdateGenre", () => {
    it("mutationFn PUTs to the scoped update endpoint", async () => {
      fetchMock.mockResolvedValue({ uuid: "g1", name: "Rock" });
      renderHook(() => useUpdateGenre("me", getBackendBaseUrl));
      const { mutationFn } = useValidatedMutationMock.mock.calls[0][0];

      const result = await mutationFn({ uuid: "g1", data: { name: "Rock" } });

      expect(fetchMock).toHaveBeenCalledWith("me/genres/g1/", true, true, {
        method: "PUT",
        body: JSON.stringify({ name: "Rock" }),
      });
      expect(result).toEqual({ uuid: "g1", name: "Rock" });
    });

    it("mutationFn PUTs to the reference update endpoint", async () => {
      fetchMock.mockResolvedValue({ uuid: "g1", name: "Rock" });
      renderHook(() => useUpdateGenre("reference", getBackendBaseUrl));
      const { mutationFn } = useValidatedMutationMock.mock.calls[0][0];

      await mutationFn({ uuid: "g1", data: { name: "Rock" } });

      expect(fetchMock).toHaveBeenCalledWith("genres/g1/", true, false, {
        method: "PUT",
        body: JSON.stringify({ name: "Rock" }),
      });
    });

    it("onSuccess invalidates the me list and detail query keys plus genre playlist queries", () => {
      renderHook(() => useUpdateGenre("me", getBackendBaseUrl));
      const { onSuccess } = useValidatedMutationMock.mock.calls[0][0];

      onSuccess(undefined, { uuid: "g1", data: {} });

      expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ["genres"] });
      expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ["genres", "detail", "g1"] });
      expect(invalidateAllGenrePlaylistQueriesMock).toHaveBeenCalled();
    });

    it("onSuccess invalidates the reference list and detail query keys plus genre playlist queries", () => {
      renderHook(() => useUpdateGenre("reference", getBackendBaseUrl));
      const { onSuccess } = useValidatedMutationMock.mock.calls[0][0];

      onSuccess(undefined, { uuid: "g1", data: {} });

      expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ["referenceGenres"] });
      expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ["referenceGenres", "detail", "g1"] });
      expect(invalidateAllGenrePlaylistQueriesMock).toHaveBeenCalled();
    });

    it("renameGenre calls mutate with a name-only patch", () => {
      const mutate = vi.fn();
      useValidatedMutationMock.mockReturnValue({ mutate, formErrors: [] });
      const { result } = renderHook(() => useUpdateGenre("me", getBackendBaseUrl));

      result.current.renameGenre("g1", "New Name");

      expect(mutate).toHaveBeenCalledWith({ uuid: "g1", data: { name: "New Name" } });
    });

    it("updateGenreParent calls mutate with a parent patch and resolves", async () => {
      const mutate = vi.fn();
      useValidatedMutationMock.mockReturnValue({ mutate, formErrors: [] });
      const { result } = renderHook(() => useUpdateGenre("me", getBackendBaseUrl));

      await expect(result.current.updateGenreParent("g1", "parent-1")).resolves.toBeUndefined();
      expect(mutate).toHaveBeenCalledWith({ uuid: "g1", data: { parent: "parent-1" } });
    });
  });

  describe("useDeleteGenre", () => {
    it("mutationFn DELETEs the scoped endpoint", async () => {
      fetchMock.mockResolvedValue({ uuid: "g1" });
      renderHook(() => useDeleteGenre("reference", getBackendBaseUrl));
      const { mutationFn } = useValidatedMutationMock.mock.calls[0][0];

      await mutationFn({ uuid: "g1" });

      expect(fetchMock).toHaveBeenCalledWith("genres/g1/", true, false, { method: "DELETE" });
    });

    it("mutationFn DELETEs the me endpoint", async () => {
      fetchMock.mockResolvedValue({ uuid: "g1" });
      renderHook(() => useDeleteGenre("me", getBackendBaseUrl));
      const { mutationFn } = useValidatedMutationMock.mock.calls[0][0];

      await mutationFn({ uuid: "g1" });

      expect(fetchMock).toHaveBeenCalledWith("me/genres/g1/", true, true, { method: "DELETE" });
    });

    it("onSuccess invalidates the reference list and detail query keys plus genre playlist queries", () => {
      renderHook(() => useDeleteGenre("reference", getBackendBaseUrl));
      const { onSuccess } = useValidatedMutationMock.mock.calls[0][0];

      onSuccess(undefined, { uuid: "g1" });

      expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ["referenceGenres"] });
      expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ["referenceGenres", "detail", "g1"] });
      expect(invalidateAllGenrePlaylistQueriesMock).toHaveBeenCalled();
    });

    it("onSuccess invalidates the me list and detail query keys plus genre playlist queries", () => {
      renderHook(() => useDeleteGenre("me", getBackendBaseUrl));
      const { onSuccess } = useValidatedMutationMock.mock.calls[0][0];

      onSuccess(undefined, { uuid: "g1" });

      expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ["genres"] });
      expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ["genres", "detail", "g1"] });
      expect(invalidateAllGenrePlaylistQueriesMock).toHaveBeenCalled();
    });
  });
});
