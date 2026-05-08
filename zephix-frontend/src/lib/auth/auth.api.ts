/**
 * Stream A identity endpoints — safe no-ops when routes are not deployed yet.
 */
import { request, unwrapZephixClientPayload } from "@/lib/api";

export type MfaEnrollmentStartResponse = {
  secret: string;
  otpauthUrl?: string;
  qrCodeDataUrl?: string;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object") return null;
  return v as Record<string, unknown>;
}

export async function getMfaStatus(): Promise<{ enrolled: boolean } | null> {
  try {
    const res = await request.get<unknown>("/auth/mfa/status");
    const flat = asRecord(unwrapZephixClientPayload(res) ?? res);
    if (!flat) return null;
    if ("enrolled" in flat) {
      return { enrolled: Boolean(flat.enrolled) };
    }
    return null;
  } catch {
    return null;
  }
}

export async function startMfaEnrollment(): Promise<MfaEnrollmentStartResponse | null> {
  try {
    const res = await request.post<unknown>("/auth/mfa/enrollment/start", {});
    const flat = asRecord(unwrapZephixClientPayload(res) ?? res);
    if (!flat || typeof flat.secret !== "string") return null;
    return {
      secret: flat.secret,
      otpauthUrl: typeof flat.otpauthUrl === "string" ? flat.otpauthUrl : undefined,
      qrCodeDataUrl: typeof flat.qrCodeDataUrl === "string" ? flat.qrCodeDataUrl : undefined,
    };
  } catch {
    return null;
  }
}

export async function verifyMfaEnrollment(code: string): Promise<void> {
  await request.post("/auth/mfa/enrollment/verify", { code });
}

export async function disableMfa(body: { password: string; code?: string }): Promise<void> {
  await request.post("/auth/mfa/disable", body);
}

/** Completes password login after MFA challenge (Stream A contract). */
export async function verifyLoginMfa(body: { mfaToken: string; code: string }): Promise<unknown> {
  return request.post<unknown>("/auth/login/mfa-verify", body);
}

export async function acceptInvitationWithPassword(body: {
  token: string;
  password: string;
  confirmPassword: string;
}): Promise<unknown> {
  return request.post<unknown>("/invites/accept-with-password", body);
}
