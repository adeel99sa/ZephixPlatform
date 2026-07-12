import { describe, it, expect } from "vitest";
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";

import { normalizeAxiosError } from "../normalizeError";

function axResponse(
  status: number,
  data: { message?: string; code?: string },
  cfg: InternalAxiosRequestConfig
): AxiosResponse {
  return {
    status,
    data,
    statusText: "",
    headers: {},
    config: cfg,
  };
}

describe("normalizeAxiosError", () => {
  it("maps status codes to StandardError codes", () => {
    const cfg: InternalAxiosRequestConfig = { url: "/a", headers: { "x-request-id": "r1" } };
    const e400 = new AxiosError("bad", "ERR_BAD_REQUEST", cfg, undefined, axResponse(400, { message: "Invalid" }, cfg));
    expect(normalizeAxiosError(e400)).toMatchObject({
      code: "VALIDATION_ERROR",
      status: 400,
      message: "Invalid",
      requestId: "r1",
    });

    const cfg401: InternalAxiosRequestConfig = { url: "/a" };
    const e401 = new AxiosError(
      "unauth",
      "ERR_BAD_REQUEST",
      cfg401,
      undefined,
      axResponse(401, { message: "No" }, cfg401)
    );
    expect(normalizeAxiosError(e401).code).toBe("AUTH_ERROR");

    const cfg404: InternalAxiosRequestConfig = { url: "/a" };
    const e404 = new AxiosError("nf", "ERR_BAD_REQUEST", cfg404, undefined, axResponse(404, { message: "Gone" }, cfg404));
    expect(normalizeAxiosError(e404).code).toBe("NOT_FOUND");

    const cfg502: InternalAxiosRequestConfig = { url: "/a" };
    const e500 = new AxiosError(
      "srv",
      "ERR_BAD_REQUEST",
      cfg502,
      undefined,
      axResponse(502, { message: "Bad gateway" }, cfg502)
    );
    expect(normalizeAxiosError(e500).code).toBe("SERVER_ERROR");
  });

  it('preserves backend response.data.code instead of flattening to SERVER_ERROR', () => {
    const cfg: InternalAxiosRequestConfig = { url: "/work/my-tasks" };
    const err = new AxiosError(
      "forbidden",
      "ERR_BAD_REQUEST",
      cfg,
      undefined,
      axResponse(403, { message: "No access", code: "AUTH_FORBIDDEN" }, cfg)
    );
    expect(normalizeAxiosError(err)).toMatchObject({
      code: "AUTH_FORBIDDEN",
      status: 403,
      message: "No access",
    });

    const cfg2: InternalAxiosRequestConfig = { url: "/work/tasks" };
    const ws = new AxiosError(
      "ws",
      "ERR_BAD_REQUEST",
      cfg2,
      undefined,
      axResponse(403, { message: "Workspace required", code: "WORKSPACE_REQUIRED" }, cfg2)
    );
    expect(normalizeAxiosError(ws).code).toBe("WORKSPACE_REQUIRED");
  });

  it("preserves custom .code on plain Error (e.g. client WORKSPACE_REQUIRED)", () => {
    const err = new Error("WORKSPACE_REQUIRED") as Error & { code: string; meta: { url: string } };
    err.code = "WORKSPACE_REQUIRED";
    err.meta = { url: "/work/tasks" };
    expect(normalizeAxiosError(err)).toMatchObject({
      code: "WORKSPACE_REQUIRED",
      message: "WORKSPACE_REQUIRED",
      status: 500,
    });
  });

  it("maps ECONNABORTED without response to NETWORK_ERROR", () => {
    const err = new AxiosError("timeout", "ECONNABORTED", { url: "/a" });
    expect(normalizeAxiosError(err)).toMatchObject({
      code: "NETWORK_ERROR",
      status: 0,
    });
  });

  it("does not treat Axios transport codes as StandardError codes when body has no code", () => {
    const cfg: InternalAxiosRequestConfig = { url: "/a" };
    const err = new AxiosError(
      "bad",
      "ERR_BAD_REQUEST",
      cfg,
      undefined,
      axResponse(403, { message: "Denied" }, cfg)
    );
    // No body.code → status map leaves non-4xx-special as SERVER_ERROR (existing contract)
    expect(normalizeAxiosError(err).code).toBe("SERVER_ERROR");
    expect(normalizeAxiosError(err).status).toBe(403);
  });

  it("wraps generic Error without .code as SERVER_ERROR", () => {
    const n = normalizeAxiosError(new Error("oops"));
    expect(n.code).toBe("SERVER_ERROR");
    expect(n.message).toBe("oops");
    expect(n.status).toBe(500);
  });

  it("falls back for unknown payloads", () => {
    const n = normalizeAxiosError(null);
    expect(n.message).toBe("An error occurred");
    expect(n.code).toBe("SERVER_ERROR");
  });
});
