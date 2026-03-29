import { useCallback, useMemo, useState } from "react";
import type { ReactElement } from "react";
import { Menu, MenuButton, MenuItem, MenuItems, MenuSeparator } from "@headlessui/react";
import { MoreHorizontal, ShieldCheck } from "lucide-react";

import {
  ASSIGNABLE_MEMBER_ROLES,
  SETTINGS_TABLE_SELECT_CLASS,
  WORKSPACE_MEMBER_ROLE_LABELS,
  WORKSPACE_MEMBER_ROLE_ORDER,
  isGovernanceRole,
  type WorkspaceMemberRole,
} from "../constants/memberRoles";

import { cn } from "@/lib/utils";


/** Shared with Billing / platform tables — pill badges. */
function settingsTableBadgeClass(
  tone: "amber" | "slate" | "indigo" | "muted",
): string {
  switch (tone) {
    case "amber":
      return "bg-amber-100 text-amber-900";
    case "slate":
      return "bg-slate-100 text-slate-700";
    case "indigo":
      return "bg-indigo-100 text-indigo-800";
    default:
      return "bg-slate-50 text-slate-400";
  }
}

const OWNER_ROLE_TOOLTIP = "Owner role cannot be changed";

export type MembersTableVariant = "members" | "guests" | "pending";

export type MemberRowModel = {
  id: string;
  name: string;
  email: string;
  initials: string;
  role: WorkspaceMemberRole;
  twoFactorEnabled: boolean;
};

function getInitialRows(variant: MembersTableVariant): MemberRowModel[] {
  switch (variant) {
    case "guests":
      return [
        {
          id: "g1",
          name: "Alex Rivera",
          email: "alex.vendor@external.io",
          initials: "AR",
          role: "read_only",
          twoFactorEnabled: false,
        },
        {
          id: "g2",
          name: "Jordan Lee",
          email: "jordan@client.org",
          initials: "JL",
          role: "read_only",
          twoFactorEnabled: true,
        },
        {
          id: "g3",
          name: "Sam Patel",
          email: "sam.consultant@partner.com",
          initials: "SP",
          role: "member",
          twoFactorEnabled: false,
        },
        {
          id: "g4",
          name: "Riley Chen",
          email: "riley@auditor.example",
          initials: "RC",
          role: "read_only",
          twoFactorEnabled: false,
        },
      ];
    case "pending":
      return [
        {
          id: "p1",
          name: "Invited user",
          email: "new.pm@acme.com",
          initials: "IU",
          role: "project_manager",
          twoFactorEnabled: false,
        },
        {
          id: "p2",
          name: "Invited user",
          email: "contractor@design.studio",
          initials: "IU",
          role: "member",
          twoFactorEnabled: false,
        },
      ];
    case "members":
    default:
      return [
        {
          id: "m1",
          name: "Sarah Connor",
          email: "sarah.connor@acme.com",
          initials: "SC",
          role: "workspace_owner",
          twoFactorEnabled: true,
        },
        {
          id: "m2",
          name: "Marcus Webb",
          email: "marcus.webb@acme.com",
          initials: "MW",
          role: "admin",
          twoFactorEnabled: true,
        },
        {
          id: "m3",
          name: "Priya Nandakumar",
          email: "priya.n@acme.com",
          initials: "PN",
          role: "governance_admin",
          twoFactorEnabled: true,
        },
        {
          id: "m4",
          name: "Diego Alvarez",
          email: "diego.a@acme.com",
          initials: "DA",
          role: "project_manager",
          twoFactorEnabled: false,
        },
      ];
  }
}

export type MembersTableProps = {
  variant: MembersTableVariant;
};

export function MembersTable({ variant }: MembersTableProps): ReactElement {
  const [rows, setRows] = useState<MemberRowModel[]>(() =>
    getInitialRows(variant),
  );

  const isPendingTab = variant === "pending";
  const isGuestTab = variant === "guests";

  const roleOptionsAssignable = useMemo(() => ASSIGNABLE_MEMBER_ROLES, []);

  const updateRole = useCallback(
    (id: string, role: WorkspaceMemberRole) => {
      if (isPendingTab) return;
      setRows((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          if (r.role === "workspace_owner") return r;
          if (role === "workspace_owner") return r;
          return { ...r, role };
        }),
      );
    },
    [isPendingTab],
  );

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-200">
            <th
              scope="col"
              className="min-h-[56px] pb-3 text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              User
            </th>
            <th
              scope="col"
              className="min-h-[56px] pb-3 text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              Email
            </th>
            <th
              scope="col"
              className="min-h-[56px] pb-3 text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              Status
            </th>
            <th
              scope="col"
              className="min-h-[56px] pb-3 text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              Role
            </th>
            <th
              scope="col"
              className="min-h-[56px] pb-3 text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              Security
            </th>
            <th
              scope="col"
              className="min-h-[56px] pb-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isOwnerRow = row.role === "workspace_owner";
            const roleSelectDisabled =
              isPendingTab || isOwnerRow;
            const roleOptionsForRow = isOwnerRow
              ? WORKSPACE_MEMBER_ROLE_ORDER.filter((r) => r === "workspace_owner")
              : roleOptionsAssignable;

            return (
              <tr
                key={row.id}
                className="min-h-[56px] border-b border-slate-100 last:border-0"
              >
                <td className="min-h-[56px] py-4 pr-4 align-middle">
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700"
                      aria-hidden
                    >
                      {row.initials}
                    </div>
                    <div className="min-w-0 flex flex-col gap-0.5">
                      <span className="text-sm font-medium text-slate-900">
                        {row.name}
                      </span>
                      {isGuestTab ? (
                        <>
                          <span className="text-xs font-medium text-slate-500">
                            Limited access
                          </span>
                          <span className="text-xs text-slate-400">
                            No team assignment
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="min-h-[56px] py-4 pr-4 align-middle text-sm text-slate-500">
                  {row.email}
                </td>
                <td className="min-h-[56px] py-4 pr-4 align-middle">
                  {isPendingTab ? (
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        settingsTableBadgeClass("amber"),
                      )}
                    >
                      Invited
                    </span>
                  ) : (
                    <span className="text-sm text-slate-400" aria-hidden>
                      —
                    </span>
                  )}
                </td>
                <td className="min-h-[56px] py-4 pr-4 align-middle">
                  <div className="flex flex-wrap items-center gap-2">
                    <label htmlFor={`role-${row.id}`} className="sr-only">
                      Role for {row.name}
                    </label>
                    <select
                      id={`role-${row.id}`}
                      className={SETTINGS_TABLE_SELECT_CLASS}
                      value={row.role}
                      disabled={roleSelectDisabled}
                      title={
                        isOwnerRow ? OWNER_ROLE_TOOLTIP : undefined
                      }
                      aria-disabled={roleSelectDisabled}
                      onChange={(e) =>
                        updateRole(row.id, e.target.value as WorkspaceMemberRole)
                      }
                    >
                      {roleOptionsForRow.map((value) => (
                        <option key={value} value={value}>
                          {WORKSPACE_MEMBER_ROLE_LABELS[value]}
                        </option>
                      ))}
                    </select>
                    {isGovernanceRole(row.role) && !isPendingTab ? (
                      <span
                        className={cn(
                          "inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          settingsTableBadgeClass("indigo"),
                        )}
                        title="Governance role — phase gates and policy alignment"
                      >
                        Governance
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="min-h-[56px] py-4 pr-4 align-middle">
                  {row.twoFactorEnabled ? (
                    <ShieldCheck
                      className="h-5 w-5 text-emerald-600"
                      aria-label="2FA enabled"
                    />
                  ) : (
                    <span className="text-slate-400" aria-label="2FA not enabled">
                      —
                    </span>
                  )}
                </td>
                <td className="min-h-[56px] py-4 align-middle text-right">
                  <div className="relative inline-block text-left">
                    <Menu>
                      <MenuButton
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                        aria-label={`Actions for ${row.name}`}
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </MenuButton>
                      <MenuItems
                        anchor="bottom end"
                        modal={false}
                        className="z-50 mt-1 w-52 origin-top-right rounded-md border border-slate-200 bg-white py-1 shadow-lg outline-none"
                      >
                        <MenuItem>
                          {({ focus }) => (
                            <button
                              type="button"
                              className={cn(
                                "block w-full px-3 py-2 text-left text-sm text-slate-700",
                                focus && "bg-slate-50",
                              )}
                            >
                              View Profile
                            </button>
                          )}
                        </MenuItem>
                        <MenuItem>
                          {({ focus }) => (
                            <button
                              type="button"
                              className={cn(
                                "block w-full px-3 py-2 text-left text-sm text-slate-700",
                                focus && "bg-slate-50",
                              )}
                            >
                              Reset Password
                            </button>
                          )}
                        </MenuItem>
                        <MenuSeparator className="my-1 border-t border-slate-100" />
                        <MenuItem>
                          {({ focus }) => (
                            <button
                              type="button"
                              className={cn(
                                "block w-full px-3 py-2 text-left text-sm text-red-600",
                                focus && "bg-red-50",
                              )}
                            >
                              Remove from Workspace
                            </button>
                          )}
                        </MenuItem>
                      </MenuItems>
                    </Menu>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
