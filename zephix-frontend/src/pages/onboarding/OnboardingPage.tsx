/**
 * Enterprise Onboarding Setup Flow
 *
 * Dark premium setup shell with 3-step activation:
 * 1. Confirm organization (from signup data)
 * 2. Create first workspace
 * 3. Invite teammates (only if workspace created)
 *
 * Every step is skippable. Skip lands user in the real app.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Building2,
  Layers,
  Users,
  ArrowRight,
  Check,
  Loader2,
  Mail,
} from "lucide-react";
import { createWorkspace } from "@/features/workspaces/api";
import { useWorkspaceStore } from "@/state/workspace.store";
import { finalizeAdminOnboardingOnServer } from "@/features/organizations/finalizeAdminOnboarding";
import { useAuth } from "@/state/AuthContext";
import { apiClient } from "@/lib/api/client";
import { administrationApi } from "@/features/administration/api/administration.api";
import { getEmailDomain, validateInviteEmails, offDomainErrorMessage, INVITE_DOMAIN_HELPER } from "@/utils/invite-validation";

type Step = "org" | "workspace" | "invite";

const STEPS: { id: Step; label: string; icon: typeof Building2 }[] = [
  { id: "org", label: "Organization", icon: Building2 },
  { id: "workspace", label: "Workspace", icon: Layers },
  { id: "invite", label: "Team", icon: Users },
];

function slugify(v: string) {
  return v.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function parseEmails(raw: string): string[] {
  return [...new Set(raw.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))];
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { setActiveWorkspace } = useWorkspaceStore();

  const [step, setStep] = useState<Step>("org");
  const [submitting, setSubmitting] = useState(false);

  // Org data
  const [orgName, setOrgName] = useState("");
  const [orgSize, setOrgSize] = useState("");
  const [orgLoading, setOrgLoading] = useState(true);

  // Workspace data
  const [wsName, setWsName] = useState("");
  const [wsDescription, setWsDescription] = useState("");
  const [createdWsId, setCreatedWsId] = useState<string | null>(null);

  // Invite data
  const [inviteEmails, setInviteEmails] = useState("");
  const [inviteRole, setInviteRole] = useState<"Member" | "Guest">("Member");

  const emailDomain = getEmailDomain(user?.email);
  const stepIndex = STEPS.findIndex((s) => s.id === step);

  // Load org data on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get("/admin/organization/overview");
        const org = (res as any)?.data ?? res;
        setOrgName(org?.name || "");
        setOrgSize(org?.size || org?.teamSize || "");
      } catch {
        // Use email domain as fallback org name
        setOrgName(emailDomain ? emailDomain.split(".")[0] : "Your organization");
      } finally {
        setOrgLoading(false);
      }
    })();
  }, [emailDomain]);

  // Finalize and exit onboarding
  async function finishAndLand() {
    await finalizeAdminOnboardingOnServer();
    await qc.invalidateQueries({ queryKey: ["org-onboarding-status"] });
    navigate("/inbox", { replace: true });
  }

  // Skip current step
  async function handleSkip() {
    if (step === "org") {
      setStep("workspace");
    } else if (step === "workspace") {
      // Skip workspace → skip invite too, land in app
      await finishAndLand();
    } else {
      await finishAndLand();
    }
  }

  // Step 1: Continue from org confirmation
  function handleOrgContinue() {
    setStep("workspace");
  }

  // Step 2: Create workspace
  async function handleCreateWorkspace() {
    if (!wsName.trim()) return;
    setSubmitting(true);
    try {
      const ws = await createWorkspace({
        name: wsName.trim(),
        slug: slugify(wsName),
        description: wsDescription.trim() || undefined,
      });
      const id = (ws as any)?.id || (ws as any)?.data?.id;
      if (id) {
        setCreatedWsId(id);
        setActiveWorkspace(id);
      }
      toast.success("Workspace created");
      setStep("invite");
    } catch (e: any) {
      toast.error(e?.message || "Failed to create workspace");
    } finally {
      setSubmitting(false);
    }
  }

  // Step 3: Send invites (with same-domain validation)
  async function handleSendInvites() {
    const emails = parseEmails(inviteEmails);
    if (emails.length === 0) return;

    // Enforce same-company domain rule
    if (emailDomain) {
      const { offDomain } = validateInviteEmails(emails, emailDomain);
      if (offDomain.length > 0) {
        toast.error(offDomainErrorMessage(offDomain, emailDomain));
        return;
      }
    }

    setSubmitting(true);
    try {
      await administrationApi.inviteUsers({
        emails,
        platformRole: inviteRole === "Guest" ? "Guest" : "Member",
        workspaceAssignments: createdWsId
          ? [{ workspaceId: createdWsId, accessLevel: inviteRole === "Guest" ? "Guest" : "Member" }]
          : [],
      });
      toast.success(`${emails.length} invite${emails.length > 1 ? "s" : ""} sent`);
      await finishAndLand();
    } catch (e: any) {
      toast.error(e?.message || "Failed to send invites");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-auto bg-gradient-to-br from-[#0B1020] via-[#111827] to-[#1E293B]">
      {/* Zephix logo */}
      <div className="fixed left-6 top-6 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-teal-500 text-xs font-bold text-white">
          Z
        </div>
        <span className="text-sm font-semibold text-slate-300">Zephix</span>
      </div>

      {/* Main setup panel */}
      <div className="m-4 w-full max-w-3xl rounded-2xl border border-white/[0.08] bg-[#0F172A] shadow-2xl shadow-black/40">
        {/* Step progress rail */}
        <div className="flex items-center gap-1 border-b border-white/[0.06] px-8 py-4">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isCurrent = s.id === step;
            const isDone = i < stepIndex;
            return (
              <div key={s.id} className="flex items-center gap-1">
                {i > 0 && <div className={`mx-2 h-px w-8 ${isDone ? "bg-emerald-500" : "bg-white/10"}`} />}
                <div
                  className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    isCurrent
                      ? "bg-blue-600/20 text-blue-400"
                      : isDone
                        ? "text-emerald-400"
                        : "text-slate-500"
                  }`}
                >
                  {isDone ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )}
                  {s.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div className="flex min-h-[380px] flex-col md:flex-row">
          {/* Left: context */}
          <div className="flex flex-col justify-center border-b border-white/[0.06] p-8 md:w-[280px] md:border-b-0 md:border-r">
            {step === "org" && (
              <>
                <h1 className="text-xl font-bold text-[#F8FAFC]">Set up your organization</h1>
                <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">
                  Your organization was created from your signup. Review the details and continue.
                </p>
              </>
            )}
            {step === "workspace" && (
              <>
                <h1 className="text-xl font-bold text-[#F8FAFC]">Create your first workspace</h1>
                <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">
                  Workspaces organize projects, people, dashboards, and templates.
                </p>
              </>
            )}
            {step === "invite" && (
              <>
                <h1 className="text-xl font-bold text-[#F8FAFC]">Invite your team</h1>
                <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">
                  Invite teammates to start collaborating in your workspace.
                </p>
              </>
            )}
          </div>

          {/* Right: form */}
          <div className="flex flex-1 flex-col justify-center p-8">
            {step === "org" && <OrgStep orgName={orgName} orgSize={orgSize} email={user?.email || ""} role="Admin" loading={orgLoading} />}
            {step === "workspace" && (
              <WorkspaceStep
                name={wsName}
                onNameChange={setWsName}
                description={wsDescription}
                onDescriptionChange={setWsDescription}
              />
            )}
            {step === "invite" && (
              <InviteStep
                emails={inviteEmails}
                onEmailsChange={setInviteEmails}
                role={inviteRole}
                onRoleChange={setInviteRole}
                domain={emailDomain}
              />
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-white/[0.06] px-8 py-4">
          <button
            type="button"
            onClick={handleSkip}
            disabled={submitting}
            className="text-sm font-medium text-[#CBD5E1] transition hover:bg-white/[0.04] rounded-lg px-3 py-1.5 disabled:opacity-50"
          >
            Skip for now
          </button>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            {step === "org" && "You can update organization details later from settings."}
            {step === "workspace" && "You can create workspaces anytime from the sidebar."}
            {step === "invite" && INVITE_DOMAIN_HELPER}
          </div>

          {step === "org" && (
            <button
              type="button"
              onClick={handleOrgContinue}
              className="flex items-center gap-2 rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1D4ED8]"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
          {step === "workspace" && (
            <button
              type="button"
              onClick={handleCreateWorkspace}
              disabled={!wsName.trim() || submitting}
              className="flex items-center gap-2 rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1D4ED8] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
              Create workspace
            </button>
          )}
          {step === "invite" && (
            <button
              type="button"
              onClick={handleSendInvites}
              disabled={parseEmails(inviteEmails).length === 0 || submitting}
              className="flex items-center gap-2 rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1D4ED8] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Send invites
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Step sub-components ── */

function OrgStep({
  orgName,
  orgSize,
  email,
  role,
  loading,
}: {
  orgName: string;
  orgSize: string;
  email: string;
  role: string;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <InfoRow label="Organization" value={orgName || "—"} />
      <InfoRow label="Your role" value={role} />
      {orgSize && <InfoRow label="Team size" value={orgSize} />}
      <InfoRow label="Work email" value={email} />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-3">
      <span className="text-xs font-medium uppercase tracking-wider text-[#94A3B8]">{label}</span>
      <span className="text-sm font-medium text-[#F8FAFC]">{value}</span>
    </div>
  );
}

function WorkspaceStep({
  name,
  onNameChange,
  description,
  onDescriptionChange,
}: {
  name: string;
  onNameChange: (v: string) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-[#94A3B8]">Workspace name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="e.g. Engineering, Cloud Team, PMO"
          autoFocus
          className="w-full rounded-lg border border-white/[0.12] bg-white/[0.05] px-4 py-2.5 text-sm text-[#F8FAFC] placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-[#94A3B8]">
          Description <span className="text-slate-600">(optional)</span>
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="What does this workspace focus on?"
          className="w-full rounded-lg border border-white/[0.12] bg-white/[0.05] px-4 py-2.5 text-sm text-[#F8FAFC] placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}

function InviteStep({
  emails,
  onEmailsChange,
  role,
  onRoleChange,
  domain,
}: {
  emails: string;
  onEmailsChange: (v: string) => void;
  role: "Member" | "Guest";
  onRoleChange: (v: "Member" | "Guest") => void;
  domain: string;
}) {
  return (
    <div className="space-y-5">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-[#94A3B8]">Team email addresses</label>
        <textarea
          value={emails}
          onChange={(e) => onEmailsChange(e.target.value)}
          placeholder={`colleague@${domain}\nanother@${domain}`}
          rows={3}
          className="w-full rounded-lg border border-white/[0.12] bg-white/[0.05] px-4 py-2.5 text-sm text-[#F8FAFC] placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
        />
        <p className="mt-1.5 text-xs text-slate-500">
          Separate multiple emails with commas or new lines.
        </p>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-[#94A3B8]">Role</label>
        <select
          value={role}
          onChange={(e) => onRoleChange(e.target.value as "Member" | "Guest")}
          className="w-full rounded-lg border border-white/[0.12] bg-white/[0.05] px-4 py-2.5 text-sm text-[#F8FAFC] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="Member">Member — can create and edit work</option>
          <option value="Guest">Guest — read-only access</option>
        </select>
      </div>
    </div>
  );
}
