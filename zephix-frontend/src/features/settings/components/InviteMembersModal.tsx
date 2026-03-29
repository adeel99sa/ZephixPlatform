import { useCallback, useId, useState } from "react";
import type { ReactElement } from "react";

import {
  ASSIGNABLE_MEMBER_ROLES,
  INVITE_ROLE_DESCRIPTIONS,
  SETTINGS_TABLE_SELECT_CLASS,
  WORKSPACE_MEMBER_ROLE_LABELS,
  type WorkspaceMemberRole,
} from "../constants/memberRoles";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/overlay/Modal";
import { Textarea } from "@/components/ui/form/Textarea";


export type InviteMembersModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const DEFAULT_INVITE_ROLE: WorkspaceMemberRole = "member";

export function InviteMembersModal({
  isOpen,
  onClose,
}: InviteMembersModalProps): ReactElement {
  const descriptionId = useId();
  const [emailsRaw, setEmailsRaw] = useState("");
  const [assignRole, setAssignRole] =
    useState<WorkspaceMemberRole>(DEFAULT_INVITE_ROLE);

  const handleClose = useCallback(() => {
    setEmailsRaw("");
    setAssignRole(DEFAULT_INVITE_ROLE);
    onClose();
  }, [onClose]);

  const handleSend = useCallback(() => {
    /* B-3: no API — close only */
    handleClose();
  }, [handleClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Invite Members"
      size="md"
    >
      <div className="space-y-5">
        <p id={descriptionId} className="text-sm text-slate-600">
          Preview only — no invitations are sent and no email is delivered from this screen.
        </p>

        <Textarea
          label="Email addresses (preview)"
          placeholder="Enter email addresses, separated by commas"
          value={emailsRaw}
          onChange={(e) => setEmailsRaw(e.target.value)}
          aria-describedby={descriptionId}
          rows={4}
        />

        <div className="space-y-2">
          <label
            htmlFor="invite-assign-role"
            className="text-sm font-medium text-slate-900"
          >
            Assign role
          </label>
          <select
            id="invite-assign-role"
            className={cn(
              SETTINGS_TABLE_SELECT_CLASS,
              "h-10 w-full min-w-0 max-w-none",
            )}
            value={assignRole}
            onChange={(e) =>
              setAssignRole(e.target.value as WorkspaceMemberRole)
            }
          >
            {ASSIGNABLE_MEMBER_ROLES.map((value) => (
              <option key={value} value={value}>
                {WORKSPACE_MEMBER_ROLE_LABELS[value]}
              </option>
            ))}
          </select>
          <p className="text-sm text-slate-500">
            {INVITE_ROLE_DESCRIPTIONS[assignRole]}
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={handleSend}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
