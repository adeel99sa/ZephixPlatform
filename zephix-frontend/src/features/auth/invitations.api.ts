/**
 * Build 1 — locked invitation contract (GET preview + POST accept).
 */
import { api, unwrapZephixClientPayload } from "@/lib/api";

export type InvitationPreview = {
  email: string;
  orgName: string;
  workspaceName?: string;
  invitedRole: string;
  expiresAt: string;
};

function unwrap<T>(payload: unknown): T {
  return (unwrapZephixClientPayload(payload) ?? payload) as T;
}

export async function previewInvitation(token: string): Promise<InvitationPreview> {
  const raw = await api.get<unknown>(`/v1/invitations/${encodeURIComponent(token)}`);
  const data = raw.data;
  return unwrap<InvitationPreview>(data);
}

export type AcceptInvitationResult =
  | { status: 200; data: { orgId: string; workspaceId?: string } }
  | {
      status: 201;
      data: {
        user: Record<string, unknown>;
        accessToken: string;
        refreshToken: string;
        sessionId?: string;
      };
    };

/**
 * POST accept — uses raw axios so we can distinguish 200 (existing user) vs 201 (new user + session).
 */
export async function acceptInvitation(
  token: string,
  body: Record<string, unknown>,
): Promise<AcceptInvitationResult> {
  const res = await api.post<unknown>(`/v1/invitations/${encodeURIComponent(token)}/accept`, body);
  const flat = unwrap<Record<string, unknown>>(res.data);
  const status = res.status;
  if (status === 201) {
    const accessToken = String(flat.accessToken ?? flat.access_token ?? "");
    const refreshToken = String(flat.refreshToken ?? flat.refresh_token ?? "");
    return {
      status: 201,
      data: {
        user: (flat.user as Record<string, unknown>) ?? {},
        accessToken,
        refreshToken,
        sessionId: typeof flat.sessionId === "string" ? flat.sessionId : undefined,
      },
    };
  }
  return {
    status: 200,
    data: {
      orgId: String(flat.orgId ?? flat.org_id ?? ""),
      workspaceId:
        flat.workspaceId != null
          ? String(flat.workspaceId)
          : flat.workspace_id != null
            ? String(flat.workspace_id)
            : undefined,
    },
  };
}
