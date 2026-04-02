import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles, Users, Building2, ArrowRight, Mail, Lock, Loader2 } from "lucide-react";
import { createWorkspace, listWorkspaces } from "@/features/workspaces/api";
import { useWorkspaceStore } from "@/state/workspace.store";
import { finalizeAdminOnboardingOnServer } from "@/features/organizations/finalizeAdminOnboarding";
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
  const inviteWorkspaceLoading =
    !userSkippedWorkspace &&
    workspaceCount > 0 &&
    !workspaceIdForInvite &&
    (workspacesQuery.isFetching || workspacesQuery.isLoading);

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
    const ok = await finalizeAdminOnboardingOnServer();
    if (!ok) {
      toast.error("We could not save your setup. Check your connection, then try again.");
      return;
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
    <div className="relative min-h-screen overflow-hidden bg-[#0b0f19] text-white antialiased">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 15% 0%, rgba(79, 70, 229, 0.35), transparent 50%), radial-gradient(ellipse 80% 60% at 95% 15%, rgba(14, 165, 233, 0.2), transparent 45%), radial-gradient(ellipse 70% 50% at 50% 100%, rgba(217, 70, 239, 0.12), transparent 50%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-8 sm:px-10 sm:py-12">
        <header className="mb-10 flex flex-col gap-6 sm:mb-12 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10">
              <Sparkles className="h-5 w-5 text-cyan-300" aria-hidden />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Zephix</p>
              <p className="text-sm font-medium text-slate-200">Organization setup</p>
            </div>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <span className="text-xs font-medium text-slate-400">{progressLabel}</span>
            <div className="flex h-1.5 w-full max-w-[200px] overflow-hidden rounded-full bg-white/10 sm:w-[200px]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 transition-all duration-500 ease-out"
                style={{ width: phase === "workspace" ? "50%" : "100%" }}
              />
            </div>
          </div>
        </header>

        <div className="grid flex-1 items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-16">
          <div className="space-y-5 lg:pr-2">
            <h1 className="text-balance text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl lg:text-[2.25rem]">
              {phase === "workspace" ? "Create your workspace" : "Invite your team"}
            </h1>
            <p className="max-w-lg text-base leading-relaxed text-slate-300 sm:text-[17px]">
              {phase === "workspace"
                ? "Set up your workspace to organize projects, dashboards, documents, and risks."
                : "Bring your team into Zephix so they can access work, dashboards, and updates."}
            </p>
            {phase === "invite" && userSkippedWorkspace ? (
              <div className="max-w-lg rounded-xl border border-amber-400/25 bg-amber-500/[0.08] px-4 py-3 text-sm leading-relaxed text-amber-50/95">
                <p className="font-medium text-amber-100">No workspace yet</p>
                <p className="mt-1 text-amber-100/85">
                  Invites are sent in the context of a workspace. Create one from Home when you are ready, or
                  choose <strong className="font-semibold">Do this later</strong> below to enter the app now.
                </p>
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-slate-200/10 bg-white p-8 text-slate-900 shadow-[0_24px_80px_-12px_rgba(15,23,42,0.45)] ring-1 ring-slate-900/[0.04] sm:p-10">
            {phase === "workspace" ? (
              <div className="space-y-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700">
                  <Building2 className="h-4 w-4" aria-hidden />
                  Workspace
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="ws-name">
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
                    autoComplete="organization"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                {!showSlug ? (
                  <button
                    type="button"
                    onClick={() => setShowSlug(true)}
                    className="text-left text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    Add custom slug (optional)
                  </button>
                ) : (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="ws-slug">
                      Slug <span className="font-normal text-slate-400">(optional)</span>
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
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                )}
                <div className="flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={handleSkipWorkspace}
                    disabled={submitting}
                    className="order-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 sm:order-1"
                  >
                    Skip for now
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateWorkspace}
                    disabled={submitting || !workspaceName.trim()}
                    className="order-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-40 sm:order-2"
                  >
                    {submitting ? "Creating…" : "Create workspace"}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700">
                  <Users className="h-4 w-4" aria-hidden />
                  Invites
                </div>

                {userSkippedWorkspace ? (
                  <div className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
                    <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                    <div>
                      <p className="font-medium text-slate-800">Sending invites is unavailable</p>
                      <p className="mt-1 leading-relaxed">
                        Workspace-scoped invites need an active workspace. Use{" "}
                        <span className="font-medium text-slate-900">Do this later</span> to continue, then create
                        a workspace from Home and invite people from{" "}
                        <span className="font-medium text-slate-900">Administration → Users</span>.
                      </p>
                    </div>
                  </div>
                ) : null}

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="emails">
                    Email addresses
                  </label>
                  <textarea
                    id="emails"
                    rows={4}
                    value={inviteEmails}
                    onChange={(e) => setInviteEmails(e.target.value)}
                    disabled={userSkippedWorkspace}
                    placeholder="colleague@company.com, teammate@company.com"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                  />
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-500">
                    <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                    Separate multiple emails with commas or new lines.
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="role">
                    Role
                  </label>
                  <select
                    id="role"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as InvitePlatformRole)}
                    disabled={userSkippedWorkspace}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-50"
                  >
                    <option value="Member">Member</option>
                    <option value="Guest">Guest (viewer)</option>
                  </select>
                </div>

                {inviteWorkspaceLoading ? (
                  <p className="flex items-center gap-2 text-xs text-slate-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" aria-hidden />
                    Loading workspace so invites can be attached…
                  </p>
                ) : null}

                <div className="flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => void finishOnboarding()}
                    disabled={submitting}
                    className="order-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 sm:order-1"
                  >
                    Do this later
                  </button>
                  <button
                    type="button"
                    onClick={handleSendInvites}
                    disabled={submitting || !canSendInvites}
                    title={
                      !canSendInvites && !userSkippedWorkspace
                        ? "Wait for workspace to load, or create a workspace in step 1"
                        : undefined
                    }
                    className="order-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 disabled:pointer-events-none disabled:opacity-40 sm:order-2"
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
