import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/overlay/Modal";
import { Button } from "@/components/ui/button/Button";
import { administrationApi } from "@/features/administration/api/administration.api";
import { RoleSelector } from "@/components/admin/RoleSelector";
import type { OrgRoleUi } from "@/lib/auth/auth.types";

const STORAGE_MFA_BLOCK = "zephix.adminMfaPrompt.sessionDismissed";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** When false, skip the org-admin MFA reminder interstitial. */
  requireMfaInterstitial?: boolean;
};

function mapOrgUiToInviteRole(role: OrgRoleUi): "Admin" | "Member" | "Viewer" {
  if (role === "admin") return "Admin";
  if (role === "viewer") return "Viewer";
  return "Member";
}

/**
 * Single-invite flow: email, display name (stored client-side until Stream A accepts name),
 * and org platform role.
 */
export function InviteOrgMemberDialog({
  isOpen,
  onClose,
  onSuccess,
  requireMfaInterstitial = true,
}: Props) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<OrgRoleUi>("member");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<
    Array<{ email: string; status: "success" | "error"; message?: string }> | null
  >(null);
  const [mfaWall, setMfaWall] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setEmail("");
    setFullName("");
    setRole("member");
    setSubmitting(false);
    setError(null);
    setResults(null);
    setMfaWall(false);
  }, [isOpen]);

  async function performInvite(): Promise<void> {
    setError(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }

    void fullName.trim();

    setSubmitting(true);
    try {
      const payload = await administrationApi.inviteUsers({
        emails: [trimmed],
        platformRole: mapOrgUiToInviteRole(role),
      });
      setResults(payload.results);
      const ok = payload.results.every((r) => r.status === "success");
      if (ok) {
        onSuccess?.();
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { code?: string; message?: string } } };
      const code = ax?.response?.data?.code;
      const msg = ax?.response?.data?.message || "Invite failed.";
      if (
        code === "SEAT_LIMIT_EXCEEDED" ||
        code === "PLAN_SEAT_CAP" ||
        /seat/i.test(msg) ||
        /plan/i.test(msg)
      ) {
        setError(
          "Your organization has reached its seat limit. Upgrade your plan to invite more people.",
        );
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }

    if (requireMfaInterstitial && sessionStorage.getItem(STORAGE_MFA_BLOCK) !== "1") {
      setMfaWall(true);
      return;
    }

    await performInvite();
  }

  async function continuePastMfaWall() {
    sessionStorage.setItem(STORAGE_MFA_BLOCK, "1");
    setMfaWall(false);
    await performInvite();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invite organization member" size="md">
      {mfaWall ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Multi-factor authentication is required for organization administrators before sending
            invitations. Enroll MFA from your profile, then return here.
          </p>
          <p className="text-xs text-gray-500">
            If your organization has not enabled MFA enforcement yet, you may continue after
            acknowledging this reminder.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={continuePastMfaWall}>
              I understand — continue
            </Button>
          </div>
        </div>
      ) : results ? (
        <div className="space-y-3">
          <ul className="space-y-2 text-sm">
            {results.map((r) => (
              <li
                key={r.email}
                className={r.status === "success" ? "text-green-800" : "text-red-700"}
              >
                <span className="font-medium">{r.email}</span>
                {r.message ? ` — ${r.message}` : r.status === "success" ? " — invited" : ""}
              </li>
            ))}
          </ul>
          <div className="flex justify-end">
            <Button type="button" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          ) : null}
          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="invite-email">
              Email
            </label>
            <input
              id="invite-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="invite-name">
              Full name
            </label>
            <input
              id="invite-name"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(ev) => setFullName(ev.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Display name for your records. Final profile name is confirmed when the invite is
              accepted.
            </p>
          </div>
          <div>
            <span id="invite-role-label" className="block text-sm font-medium text-gray-700">
              Organization role
            </span>
            <div className="mt-1">
              <RoleSelector
                kind="org"
                id="invite-role"
                aria-labelledby="invite-role-label"
                value={role}
                onChange={setRole}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Sending…" : "Send invite"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
