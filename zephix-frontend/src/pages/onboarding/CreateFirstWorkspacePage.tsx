/**
 * Dedicated route for creating the first workspace (smoke tests + activation).
 * Expects: input#workspaceName, submit → POST /workspaces → navigate /w/:slug/home
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Layers, Loader2 } from "lucide-react";

import { createWorkspace } from "@/features/workspaces/api";
import { useWorkspaceStore } from "@/state/workspace.store";
import { useAuth } from "@/state/AuthContext";
import { orgOnboardingStatusQueryKey } from "@/features/organizations/useOrgOnboardingStatusQuery";

function slugify(v: string) {
  return v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function CreateFirstWorkspacePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { setActiveWorkspace } = useWorkspaceStore();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2 || busy) return;

    setBusy(true);
    try {
      const slug = slugify(trimmed) || "workspace";
      const workspace = await createWorkspace({
        name: trimmed,
        slug,
        description: description.trim() || undefined,
      });
      const wsId = workspace.workspaceId;
      const resolvedSlug = (workspace.slug && workspace.slug.trim()) || slug;

      useWorkspaceStore.getState().setSidebarWorkspacePlaceholder({
        id: wsId,
        name: workspace.name?.trim() || trimmed,
      });
      useWorkspaceStore.getState().bumpWorkspacesDirectory();
      if (user?.id) {
        void queryClient.invalidateQueries({ queryKey: orgOnboardingStatusQueryKey(user.id) });
      }
      setActiveWorkspace(wsId);
      toast.success("Workspace created");
      navigate(`/w/${resolvedSlug}/home`, { replace: true });
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string"
          ? (err as { message: string }).message
          : "Could not create workspace.";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-auto bg-gradient-to-br from-[#0B1020] via-[#111827] to-[#1E293B]">
      <div className="fixed left-6 top-6 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-teal-500 text-xs font-bold text-white">
          Z
        </div>
        <span className="text-sm font-semibold text-slate-300">Zephix</span>
      </div>

      <div className="m-4 w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#0F172A] p-8 shadow-2xl shadow-black/40">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400">
            <Layers className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#F8FAFC]">Create your first workspace</h1>
            <p className="mt-1 text-sm text-[#94A3B8]">Name it and you can start inviting your team.</p>
          </div>
        </div>

        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
          <div>
            <label htmlFor="workspaceName" className="mb-1.5 block text-sm font-medium text-slate-300">
              Workspace name
            </label>
            <input
              id="workspaceName"
              name="workspaceName"
              type="text"
              autoComplete="organization"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Engineering"
              className="w-full rounded-lg border border-white/[0.1] bg-[#0B1222] px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              required
              minLength={2}
              disabled={busy}
            />
          </div>
          <div>
            <label htmlFor="workspaceDescription" className="mb-1.5 block text-sm font-medium text-slate-300">
              Description <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <textarea
              id="workspaceDescription"
              name="workspaceDescription"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this workspace for?"
              className="w-full resize-none rounded-lg border border-white/[0.1] bg-[#0B1222] px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              disabled={busy}
            />
          </div>
          <button
            type="submit"
            disabled={busy || name.trim().length < 2}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Create workspace
          </button>
        </form>
      </div>
    </div>
  );
}
