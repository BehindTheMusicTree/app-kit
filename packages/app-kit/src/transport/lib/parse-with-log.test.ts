import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { parseWithLog } from "./parse-with-log";

describe("parseWithLog", () => {
  const schema = z.object({ uuid: z.string().uuid() });

  it("throws a plain Error instead of a ZodError when data is null", () => {
    expect(() => parseWithLog(schema, null, "ctx")).toThrow("[ctx] received null response before schema validation");
  });

  it("throws a plain Error instead of a ZodError when data is undefined", () => {
    expect(() => parseWithLog(schema, undefined)).toThrow("received null response before schema validation");
  });

  it("still logs and throws a ZodError for malformed non-null data", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => parseWithLog(schema, { uuid: "not-a-uuid" }, "ctx")).toThrow(z.ZodError);
    expect(errorSpy).toHaveBeenCalledWith("[ctx] schema validation failed", expect.any(Object));
    errorSpy.mockRestore();
  });

  it("returns parsed data on success", () => {
    const uuid = "123e4567-e89b-12d3-a456-426614174000";
    expect(parseWithLog(schema, { uuid })).toEqual({ uuid });
  });
});
