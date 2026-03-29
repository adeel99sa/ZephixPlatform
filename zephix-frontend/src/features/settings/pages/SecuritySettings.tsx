import { useCallback, useMemo, useState } from "react";
import type { ReactElement } from "react";

import { SETTINGS_TABLE_SELECT_CLASS } from "../constants/memberRoles";
import {
  SettingsPageHeader,
  SettingsRow,
  SettingsSection,
} from "../components/ui";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";


type TwoFactorPolicy = "optional" | "admins" | "all";
type SsoProvider = "disabled" | "google" | "microsoft" | "okta" | "custom_saml";
type SessionDays = 7 | 14 | 30;

type SecurityState = {
  twoFactor: TwoFactorPolicy;
  sso: SsoProvider;
  sessionDays: SessionDays;
};

const INITIAL: SecurityState = {
  twoFactor: "optional",
  sso: "disabled",
  sessionDays: 14,
};

const TWO_FACTOR_OPTIONS: { value: TwoFactorPolicy; label: string }[] = [
  { value: "optional", label: "Optional" },
  { value: "admins", label: "Required for Admins" },
  { value: "all", label: "Required for All" },
];

const SSO_OPTIONS: { value: SsoProvider; label: string }[] = [
  { value: "disabled", label: "Disabled" },
  { value: "google", label: "Google" },
  { value: "microsoft", label: "Microsoft" },
  { value: "okta", label: "Okta" },
  { value: "custom_saml", label: "Custom SAML" },
];

const SESSION_OPTIONS: { value: SessionDays; label: string }[] = [
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
  { value: 30, label: "30 days" },
];

function selectClassName(): string {
  return cn(
    SETTINGS_TABLE_SELECT_CLASS,
    "h-10 min-w-[220px] max-w-xs px-3 disabled:opacity-50",
  );
}

export default function SecuritySettings(): ReactElement {
  const [state, setState] = useState<SecurityState>(INITIAL);
  const [saved, setSaved] = useState<SecurityState>(INITIAL);

  const dirty = useMemo(
    () =>
      state.twoFactor !== saved.twoFactor ||
      state.sso !== saved.sso ||
      state.sessionDays !== saved.sessionDays,
    [state, saved],
  );

  const handleSave = useCallback(() => {
    setSaved({ ...state });
  }, [state]);

  return (
    <div data-settings-security-sso>
      <SettingsPageHeader
        title="Security & SSO"
        description="Authentication policies and single sign-on. Enforcement is applied by the identity service."
      />

      <SettingsSection title="Authentication">
        <SettingsRow
          label="Two-factor authentication (2FA)"
          description="Who must enroll a second factor before accessing the workspace."
          control={
            <select
              className={selectClassName()}
              value={state.twoFactor}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  twoFactor: e.target.value as TwoFactorPolicy,
                }))
              }
              aria-label="Two-factor authentication policy"
            >
              {TWO_FACTOR_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          }
        />
        <SettingsRow
          label="Single sign-on (SSO)"
          description="Connect your IdP for SAML or OIDC-based login."
          badge="Enterprise"
          control={
            <select
              className={selectClassName()}
              value={state.sso}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  sso: e.target.value as SsoProvider,
                }))
              }
              aria-label="SSO provider"
            >
              {SSO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          }
        />
      </SettingsSection>

      <SettingsSection title="Session Management">
        <SettingsRow
          label="Session duration"
          description="Idle and absolute session limits are enforced server-side."
          badge="Enterprise"
          control={
            <select
              className={selectClassName()}
              value={state.sessionDays}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  sessionDays: Number(e.target.value) as SessionDays,
                }))
              }
              aria-label="Session duration"
            >
              {SESSION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          }
        />
      </SettingsSection>

      <footer className="mt-10 flex justify-end border-t border-slate-200 pt-6">
        <Button type="button" disabled={!dirty} onClick={handleSave}>
          Save Changes
        </Button>
      </footer>
    </div>
  );
}
