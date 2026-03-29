import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Check,
  Globe,
  Link2,
  Lock,
  Users,
  X,
} from "lucide-react";

import { useAuth } from "@/state/AuthContext";

type PermissionLevel = "full_edit" | "edit" | "comment" | "view_only";

const PERMISSION_OPTIONS: {
  id: PermissionLevel;
  label: string;
  description: string;
}[] = [
  {
    id: "full_edit",
    label: "Full edit",
    description:
      "Can create and edit entities in this Space. Owners and admins can manage Space settings.",
  },
  {
    id: "edit",
    label: "Edit",
    description:
      "Can create and edit entities in this Space. Can't manage Space settings or delete entities.",
  },
  {
    id: "comment",
    label: "Comment",
    description:
      "Can comment on entities within this Space. Can't manage Space settings or edit entities.",
  },
  {
    id: "view_only",
    label: "View only",
    description:
      "Read-only. Can't edit entities or comment in this Space.",
  },
];

type WorkspaceShareModalProps = {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  workspaceName: string;
  isPrivate: boolean;
  onTogglePrivate: () => void;
};

export function WorkspaceShareModal({
  open,
  onClose,
  workspaceId,
  workspaceName,
  isPrivate,
  onTogglePrivate,
}: WorkspaceShareModalProps) {
  const { user } = useAuth();
  const [inviteEmail, setInviteEmail] = useState("");
  const [permission, setPermission] = useState<PermissionLevel>("full_edit");
  const [permDropdownOpen, setPermDropdownOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const permBtnRef = useRef<HTMLButtonElement>(null);
  const permMenuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  // Close perm dropdown on outside click
  useEffect(() => {
    if (!permDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        permMenuRef.current?.contains(target) ||
        permBtnRef.current?.contains(target)
      )
        return;
      setPermDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [permDropdownOpen]);

  // Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (permDropdownOpen) setPermDropdownOpen(false);
        else onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, permDropdownOpen, onClose]);

  if (!open) return null;

  const selectedPerm = PERMISSION_OPTIONS.find((o) => o.id === permission)!;
  const shareLink = `${window.location.origin}/workspaces/${workspaceId}`;

  function handleCopyLink() {
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  }

  function handleInvite() {
    if (!inviteEmail.trim()) return;
    // TODO: call invite API when backend supports workspace-level invites
    setInviteEmail("");
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/30"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Share this Space
            </h2>
            <p className="mt-0.5 text-[13px] text-slate-500">
              Sharing Space with all views{" "}
              <span className="font-medium text-slate-700">
                {workspaceName}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 space-y-5 pb-2">
          {/* Invite field */}
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              className="h-10 flex-1 rounded-lg border border-slate-300 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-colors"
              placeholder="Invite by name or email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleInvite();
              }}
            />
            <button
              type="button"
              onClick={handleInvite}
              disabled={!inviteEmail.trim()}
              className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              Invite
            </button>
          </div>

          {/* Private link */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">
                Private link
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {copySuccess ? "Copied!" : "Copy link"}
            </button>
          </div>

          {/* Default permission */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">
                Default permission
              </span>
            </div>
            <div className="relative">
              <button
                ref={permBtnRef}
                type="button"
                onClick={() => setPermDropdownOpen((v) => !v)}
                className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                {selectedPerm.label}
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {permDropdownOpen ? (
                <div
                  ref={permMenuRef}
                  className="absolute right-0 top-full z-50 mt-1 w-72 rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                >
                  {PERMISSION_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setPermission(opt.id);
                        setPermDropdownOpen(false);
                      }}
                      className={`flex w-full flex-col px-3 py-2.5 text-left transition-colors hover:bg-slate-50 ${
                        permission === opt.id ? "bg-blue-50" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-sm font-medium ${
                            permission === opt.id
                              ? "text-blue-700"
                              : "text-slate-900"
                          }`}
                        >
                          {opt.label}
                        </span>
                        {permission === opt.id ? (
                          <Check className="h-3.5 w-3.5 text-blue-600" />
                        ) : null}
                      </div>
                      <span className="mt-0.5 text-xs text-slate-500">
                        {opt.description}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {/* Share with section */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Share with
            </p>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-xs font-bold text-white">
                  {workspaceName.charAt(0).toUpperCase()}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-800">
                    {workspaceName}
                  </span>
                  <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                    Workspace
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {user ? (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-300 text-[10px] font-bold text-white">
                    {(user.name || user.email || "U").charAt(0).toUpperCase()}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Footer: Make Private */}
        <div className="mt-3 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onTogglePrivate}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-100 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
          >
            {isPrivate ? (
              <>
                <Globe className="h-4 w-4" />
                Make Public
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                Make Private
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
