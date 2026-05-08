import type { OrgRoleUi } from "@/lib/auth/auth.types";

type OrgProps = {
  kind: "org";
  id?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  value: OrgRoleUi;
  onChange: (next: OrgRoleUi) => void;
  disabled?: boolean;
  /** Shown as native `title` when demotion is blocked (e.g. last admin). */
  disabledReason?: string;
};

type WorkspaceProps = {
  kind: "workspace";
  id?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  value: "owner" | "member" | "viewer";
  onChange: (next: "owner" | "member" | "viewer") => void;
  disabled?: boolean;
  disabledReason?: string;
};

export type RoleSelectorProps = OrgProps | WorkspaceProps;

/**
 * Accessible role dropdown for org platform roles or simplified workspace roles.
 */
export function RoleSelector(props: RoleSelectorProps) {
  const title = props.disabled && props.disabledReason ? props.disabledReason : undefined;

  if (props.kind === "org") {
    return (
      <select
        id={props.id}
        aria-label={props["aria-label"]}
        aria-labelledby={props["aria-labelledby"]}
        title={title}
        disabled={props.disabled}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value as OrgRoleUi)}
        className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="admin">Admin</option>
        <option value="member">Member</option>
        <option value="viewer">Viewer</option>
      </select>
    );
  }

  return (
    <select
      id={props.id}
      aria-label={props["aria-label"]}
      aria-labelledby={props["aria-labelledby"]}
      title={title}
      disabled={props.disabled}
      value={props.value}
      onChange={(e) => props.onChange(e.target.value as "owner" | "member" | "viewer")}
      className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <option value="owner">Owner</option>
      <option value="member">Member</option>
      <option value="viewer">Viewer</option>
    </select>
  );
}
