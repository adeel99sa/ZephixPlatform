import { Modal } from "@/components/ui/overlay/Modal";
import { Button } from "@/components/ui/button/Button";
import { RoleSelector } from "@/components/admin/RoleSelector";
import type { AdminDirectoryUser } from "@/features/administration/api/administration.api";
import type { OrgRoleUi } from "@/lib/auth/auth.types";

type Props = {
  member: AdminDirectoryUser | null;
  isOpen: boolean;
  onClose: () => void;
  dropdownRole: OrgRoleUi;
  roleDisabled: boolean;
  roleDisabledReason?: string;
  busy?: boolean;
  onRoleChange: (role: OrgRoleUi) => void;
  onDeactivate: () => void;
  onReinvite?: () => void;
  /** When true, last-admin protection blocks deactivation (tooltip via `deactivateBlockedReason`). */
  deactivateBlocked?: boolean;
  deactivateBlockedReason?: string;
};

export function EditOrgMemberDialog({
  member,
  isOpen,
  onClose,
  dropdownRole,
  roleDisabled,
  roleDisabledReason,
  busy,
  onRoleChange,
  onDeactivate,
  onReinvite,
  deactivateBlocked,
  deactivateBlockedReason,
}: Props) {
  if (!member) return null;

  const deactivateDisabled = Boolean(busy || member.isOwner || deactivateBlocked);
  const deactivateTitle =
    member.isOwner && !deactivateBlocked
      ? "Organization owners are managed separately."
      : deactivateBlockedReason;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit ${member.name}`} size="md">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">{member.email}</p>

        <div>
          <span id="edit-org-role-label" className="block text-sm font-medium text-gray-700">
            Organization role
          </span>
          <div className="mt-1">
            <RoleSelector
              kind="org"
              id="edit-org-role"
              aria-labelledby="edit-org-role-label"
              value={dropdownRole}
              onChange={onRoleChange}
              disabled={roleDisabled || Boolean(member.isOwner) || busy}
              disabledReason={roleDisabledReason}
            />
          </div>
          {member.isOwner ? (
            <p className="mt-1 text-xs text-amber-700">Organization owner roles are managed separately.</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
          {member.status === "invited" && onReinvite ? (
            <Button type="button" variant="outline" disabled={busy} onClick={onReinvite}>
              Reinvite
            </Button>
          ) : null}
          <Button
            type="button"
            variant="destructive"
            disabled={deactivateDisabled}
            title={deactivateTitle}
            onClick={() => {
              if (deactivateDisabled) return;
              onDeactivate();
            }}
          >
            Deactivate access
          </Button>
          <div className="ml-auto">
            <Button type="button" variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
