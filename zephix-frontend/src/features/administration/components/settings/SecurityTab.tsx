/**
 * SecurityTab — MVP-4: Security settings tab.
 * Wires the previously orphaned SecuritySettings entity.
 */
import { useState, useEffect } from "react";
import { Loader2, Shield } from "lucide-react";
import { Input } from "@/components/ui/input/Input";
import { Switch } from "@/components/ui/form/Switch";
import { Textarea } from "@/components/ui/form/Textarea";
import { Button } from "@/components/ui/button/Button";
import { administrationApi, type SecuritySettingsData } from "../../api/administration.api";

export function SecurityTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [data, setData] = useState<SecuritySettingsData>({
    twoFactorEnabled: false,
    sessionTimeout: 480,
    passwordPolicy: { minLength: 8, requireNumbers: true, requireSymbols: true, requireUppercase: true },
    ipWhitelist: [],
    maxFailedAttempts: 5,
    lockoutDuration: 30,
  });

  useEffect(() => {
    setIsLoading(true);
    administrationApi
      .getSecuritySettings()
      .then(setData)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  async function handleSave() {
    setIsSaving(true);
    setMsg(null);
    try {
      const updated = await administrationApi.updateSecuritySettings(data);
      setData(updated);
      setMsg({ type: "success", text: "Security settings saved." });
      setTimeout(() => setMsg(null), 4000);
    } catch {
      setMsg({ type: "error", text: "Failed to save. Please try again." });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Security Settings</h2>
          <p className="text-sm text-gray-500">Configure authentication and access policies</p>
        </div>
      </div>

      <div className="max-w-xl space-y-6">
        {/* Authentication */}
        <div className="space-y-4">
          <Switch
            label="Two-factor authentication"
            help="Require 2FA for all organization members"
            checked={data.twoFactorEnabled}
            onChange={(e) => setData((d) => ({ ...d, twoFactorEnabled: e.target.checked }))}
          />
          <Input
            label="Session timeout (minutes)"
            help="Automatically log out users after this period of inactivity"
            type="number"
            min={5}
            max={10080}
            value={String(data.sessionTimeout)}
            onChange={(e) => setData((d) => ({ ...d, sessionTimeout: Number(e.target.value) || 480 }))}
          />
        </div>

        {/* Password Policy */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Password Policy</h3>
          <div className="space-y-3">
            <Input
              label="Minimum length"
              type="number"
              min={6}
              max={128}
              value={String(data.passwordPolicy.minLength)}
              onChange={(e) =>
                setData((d) => ({
                  ...d,
                  passwordPolicy: { ...d.passwordPolicy, minLength: Number(e.target.value) || 8 },
                }))
              }
            />
            <Switch
              label="Require numbers"
              checked={data.passwordPolicy.requireNumbers}
              onChange={(e) =>
                setData((d) => ({
                  ...d,
                  passwordPolicy: { ...d.passwordPolicy, requireNumbers: e.target.checked },
                }))
              }
            />
            <Switch
              label="Require special characters"
              checked={data.passwordPolicy.requireSymbols}
              onChange={(e) =>
                setData((d) => ({
                  ...d,
                  passwordPolicy: { ...d.passwordPolicy, requireSymbols: e.target.checked },
                }))
              }
            />
            <Switch
              label="Require uppercase letters"
              checked={data.passwordPolicy.requireUppercase}
              onChange={(e) =>
                setData((d) => ({
                  ...d,
                  passwordPolicy: { ...d.passwordPolicy, requireUppercase: e.target.checked },
                }))
              }
            />
          </div>
        </div>

        {/* Lockout */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Account Lockout</h3>
          <div className="space-y-3">
            <Input
              label="Max failed login attempts"
              type="number"
              min={1}
              max={20}
              value={String(data.maxFailedAttempts)}
              onChange={(e) => setData((d) => ({ ...d, maxFailedAttempts: Number(e.target.value) || 5 }))}
            />
            <Input
              label="Lockout duration (minutes)"
              type="number"
              min={1}
              max={1440}
              value={String(data.lockoutDuration)}
              onChange={(e) => setData((d) => ({ ...d, lockoutDuration: Number(e.target.value) || 30 }))}
            />
          </div>
        </div>

        {/* IP Whitelist */}
        <Textarea
          label="IP Whitelist (optional)"
          help="Enter allowed IP addresses, one per line. Leave empty to allow all."
          value={(data.ipWhitelist || []).join("\n")}
          onChange={(e) =>
            setData((d) => ({
              ...d,
              ipWhitelist: e.target.value
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean),
            }))
          }
          rows={3}
          placeholder="192.168.1.0/24&#10;10.0.0.0/8"
        />
      </div>

      <div className="mt-6 flex items-center gap-4">
        <Button variant="primary" size="sm" onClick={handleSave} loading={isSaving}>
          Save changes
        </Button>
        {msg && (
          <span className={`text-sm ${msg.type === "success" ? "text-emerald-600" : "text-red-600"}`}>
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}
