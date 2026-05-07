import { describe, it, expect } from "vitest";
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";

import { normalizeAxiosError } from "../normalizeError";

function axResponse(
  status: number,
  data: { message?: string },
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

  it("maps ECONNABORTED without response to NETWORK_ERROR", () => {
    const err = new AxiosError("timeout", "ECONNABORTED", { url: "/a" });
    expect(normalizeAxiosError(err)).toMatchObject({
      code: "NETWORK_ERROR",
      status: 0,
    });
  });

  it("wraps generic Error", () => {
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
