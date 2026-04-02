import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles, Users, Building2, ArrowRight, Mail } from "lucide-react";
import { createWorkspace, listWorkspaces } from "@/features/workspaces/api";
import { useWorkspaceStore } from "@/state/workspace.store";
import { completeOnboarding } from "@/features/organizations/onboarding.api";
import { useOrgHomeState } from "@/features/organizations/useOrgHomeState";
import { administrationApi } from "@/features/administration/api/administration.api";

const LAST_WORKSPACE_KEY = "zephix.lastWorkspaceId";
const INVITE_PHASE_KEY = "zephix.adminOnboarding.invitePhase";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseEmails(raw: string): string[] {
  const parts = raw.split(/[\s,;]+/);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const e = p.trim().toLowerCase();
    if (!e || seen.has(e)) continue;
    seen.add(e);
    out.push(e);
  }
  return out;
}

type InvitePlatformRole = "Member" | "Guest";

export default function OnboardingPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { setActiveWorkspace } = useWorkspaceStore();
  const { workspaceCount } = useOrgHomeState();

  const workspacesQuery = useQuery({
    queryKey: ["onboarding-workspaces"],
    queryFn: listWorkspaces,
    enabled: workspaceCount > 0,
    staleTime: 15_000,
  });
  const firstWorkspaceId = workspacesQuery.data?.[0]?.id ?? null;

  const [phase, setPhase] = useState<"workspace" | "invite">("workspace");
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [workspaceSlugTouched, setWorkspaceSlugTouched] = useState(false);
  const [showSlug, setShowSlug] = useState(false);
  const [createdWorkspaceId, setCreatedWorkspaceId] = useState<string | null>(null);
  const [inviteEmails, setInviteEmails] = useState("");
  const [inviteRole, setInviteRole] = useState<InvitePlatformRole>("Member");
  const [submitting, setSubmitting] = useState(false);

  const userSkippedWorkspace = workspaceCount === 0 && !createdWorkspaceId;
  const workspaceIdForInvite = createdWorkspaceId ?? firstWorkspaceId;
  const canSendInvites = Boolean(workspaceIdForInvite) && !userSkippedWorkspace;

  useEffect(() => {
    try {
      const reachedInvite = sessionStorage.getItem(INVITE_PHASE_KEY) === "1";
      if (workspaceCount > 0 || reachedInvite) {
        setPhase("invite");
      }
    } catch {
      // sessionStorage unavailable
    }
  }, [workspaceCount]);

  const progressLabel = useMemo(
    () => (phase === "workspace" ? "Step 1 of 2" : "Step 2 of 2"),
    [phase],
  );

  async function finishOnboarding() {
    try {
      await completeOnboarding();
    } catch {
      /* non-blocking — user still lands in shell */
    }
    try {
      sessionStorage.removeItem(INVITE_PHASE_KEY);
    } catch {
      /* ignore */
    }
    await qc.invalidateQueries({ queryKey: ["org-onboarding-status"] });
    await qc.invalidateQueries({ queryKey: ["onboarding-workspaces"] });
    navigate("/home", { replace: true });
  }

  async function handleSkipWorkspace() {
    try {
      sessionStorage.setItem(INVITE_PHASE_KEY, "1");
    } catch {
      /* ignore */
    }
    setPhase("invite");
  }

  async function handleCreateWorkspace() {
    if (!workspaceName.trim()) {
      toast.error("Workspace name is required");
      return;
    }
    setSubmitting(true);
    try {
      const data = await createWorkspace({
        name: workspaceName.trim(),
        slug: workspaceSlug.trim() || undefined,
      });
      setCreatedWorkspaceId(data.workspaceId);
      setActiveWorkspace(data.workspaceId);
      try {
        localStorage.setItem(LAST_WORKSPACE_KEY, data.workspaceId);
      } catch {
        /* ignore */
      }
      try {
        sessionStorage.setItem(INVITE_PHASE_KEY, "1");
      } catch {
        /* ignore */
      }
      toast.success("Workspace created");
      await qc.invalidateQueries({ queryKey: ["onboarding-workspaces"] });
      setPhase("invite");
    } catch (error: unknown) {
      const msg =
        error && typeof error === "object" && "response" in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(msg || "Failed to create workspace");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendInvites() {
    const emails = parseEmails(inviteEmails);
    if (emails.length === 0) {
      toast.error("Add at least one email address");
      return;
    }
    if (!workspaceIdForInvite) {
      toast.error("Workspace is still loading — try again in a moment.");
      return;
    }
    setSubmitting(true);
    try {
      const { results } = await administrationApi.inviteUsers({
        emails,
        platformRole: inviteRole,
        workspaceAssignments: [
          { workspaceId: workspaceIdForInvite, accessLevel: inviteRole === "Guest" ? "Guest" : "Member" },
        ],
      });
      const failed = results.filter((r) => r.status === "error");
      if (failed.length > 0) {
        failed.forEach((r) => toast.error(r.email + (r.message ? `: ${r.message}` : "")));
      }
      if (failed.length < results.length) {
        toast.success("Invites sent");
      }
      await finishOnboarding();
    } catch (error: unknown) {
      const msg =
        error && typeof error === "object" && "message" in error
          ? String((error as Error).message)
          : "Failed to send invites";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 20% 20%, rgba(99, 102, 241, 0.45), transparent 55%), radial-gradient(ellipse 70% 50% at 80% 10%, rgba(236, 72, 153, 0.35), transparent 50%), radial-gradient(ellipse 60% 40% at 50% 100%, rgba(34, 211, 238, 0.25), transparent 55%)",
        }}
      />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-10 sm:px-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-indigo-200/90">
            <Sparkles className="h-4 w-4 text-cyan-300" aria-hidden />
            <span>Zephix</span>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-indigo-100/80">
            {progressLabel}
          </span>
        </div>

        <div className="grid flex-1 items-center gap-10 lg:grid-cols-2">
          <div className="space-y-4 lg:pr-4">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {phase === "workspace" ? "Create your workspace" : "Invite your team"}
            </h1>
            <p className="max-w-md text-base leading-relaxed text-indigo-100/75">
              {phase === "workspace"
                ? "Set up your workspace to organize projects, dashboards, documents, and risks."
                : "Bring your team into Zephix so they can access work, dashboards, and updates."}
            </p>
            {phase === "invite" && userSkippedWorkspace ? (
              <p className="max-w-md rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100/90">
                You skipped workspace creation. You can create a workspace anytime from Home. Team invites
                need a workspace — use &quot;Do this later&quot; to continue.
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/95 p-6 text-gray-900 shadow-2xl shadow-indigo-950/40 backdrop-blur sm:p-8">
            {phase === "workspace" ? (
              <div className="space-y-5">
                <div className="flex items-center gap-2 text-sm font-medium text-indigo-600">
                  <Building2 className="h-4 w-4" aria-hidden />
                  Workspace
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="ws-name">
                    Workspace name
                  </label>
                  <input
                    id="ws-name"
                    type="text"
                    value={workspaceName}
                    onChange={(e) => {
                      const next = e.target.value;
                      setWorkspaceName(next);
                      if (!workspaceSlugTouched) {
                        setWorkspaceSlug(slugify(next));
                      }
                    }}
                    placeholder="e.g. Engineering"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-gray-900 outline-none ring-indigo-500/0 transition focus:ring-2"
                  />
                </div>
                {!showSlug ? (
                  <button
                    type="button"
                    onClick={() => setShowSlug(true)}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    Add custom slug (optional)
                  </button>
                ) : (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="ws-slug">
                      Slug <span className="font-normal text-gray-400">(optional)</span>
                    </label>
                    <input
                      id="ws-slug"
                      type="text"
                      value={workspaceSlug}
                      onChange={(e) => {
                        setWorkspaceSlugTouched(true);
                        setWorkspaceSlug(slugify(e.target.value));
                      }}
                      placeholder="engineering"
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>
                )}
                <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={handleSkipWorkspace}
                    disabled={submitting}
                    className="order-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 sm:order-1"
                  >
                    Skip for now
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateWorkspace}
                    disabled={submitting || !workspaceName.trim()}
                    className="order-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-700 disabled:opacity-50 sm:order-2"
                  >
                    {submitting ? "Creating…" : "Create workspace"}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center gap-2 text-sm font-medium text-indigo-600">
                  <Users className="h-4 w-4" aria-hidden />
                  Invites
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="emails">
                    Email addresses
                  </label>
                  <textarea
                    id="emails"
                    rows={4}
                    value={inviteEmails}
                    onChange={(e) => setInviteEmails(e.target.value)}
                    disabled={userSkippedWorkspace}
                    placeholder="colleague@company.com, teammate@company.com"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                  <p className="mt-1 flex items-start gap-1 text-xs text-gray-500">
                    <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    Separate multiple emails with commas or new lines.
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="role">
                    Role
                  </label>
                  <select
                    id="role"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as InvitePlatformRole)}
                    disabled={userSkippedWorkspace}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:bg-gray-100"
                  >
                    <option value="Member">Member</option>
                    <option value="Guest">Guest (viewer)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={finishOnboarding}
                    disabled={submitting}
                    className="order-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 sm:order-1"
                  >
                    Do this later
                  </button>
                  <button
                    type="button"
                    onClick={handleSendInvites}
                    disabled={submitting || !canSendInvites}
                    className="order-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-700 disabled:opacity-50 sm:order-2"
                  >
                    {submitting ? "Sending…" : "Send invites"}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
