/**
 * Build 1 — v1 auth/MFA endpoints (locked contracts).
 */
import { request, unwrapZephixClientPayload } from "@/lib/api";

export type MfaEnrollResponse = {
  secret: string;
  qrCodeDataUrl: string;
  manualEntryKey: string;
};

function unwrap<T>(payload: unknown): T {
  return (unwrapZephixClientPayload(payload) ?? payload) as T;
}

export async function enrollMfa(): Promise<MfaEnrollResponse> {
  const raw = await request.post<unknown>("/v1/auth/mfa/enroll", {});
  const data = unwrap<Record<string, unknown>>(raw);
  const secret = String(data.secret ?? "");
  const qrCodeDataUrl = String(data.qrCodeDataUrl ?? "");
  const manualEntryKey = String(data.manualEntryKey ?? data.secret ?? "");
  if (!secret && !manualEntryKey) {
    throw new Error("Invalid MFA enroll response");
  }
  return { secret: secret || manualEntryKey, qrCodeDataUrl, manualEntryKey: manualEntryKey || secret };
}

export async function verifyMfaEnrollment(code: string): Promise<{ mfa_enabled: boolean }> {
  const raw = await request.post<unknown>("/v1/auth/mfa/verify", { code });
  return unwrap<{ mfa_enabled: boolean }>(raw);
}

export async function disableMfa(body: { currentPassword: string }): Promise<{ mfa_enabled: boolean }> {
  const raw = await request.delete<unknown>("/v1/auth/mfa", { data: body });
  return unwrap<{ mfa_enabled: boolean }>(raw);
}

/** Path B — SPA MFA step after password login. */
export async function submitMfaChallenge(body: {
  challengeToken: string;
  code: string;
}): Promise<unknown> {
  return request.post<unknown>("/v1/auth/mfa/challenge", body);
}

export async function requestPasswordReset(email: string): Promise<void> {
  await request.post("/v1/auth/forgot-password", { email });
}

/** Body matches backend ResetPasswordDto: { token, newPassword } */
export async function resetPasswordWithToken(body: { token: string; newPassword: string }): Promise<void> {
  await request.post("/v1/auth/reset-password", body);
}
