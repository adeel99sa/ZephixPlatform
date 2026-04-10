import { useState } from "react";

/**
 * SecuritySettingsTab — 2FA enforcement, session timeout, password policy, IP whitelist.
 * No backend endpoint exists yet — fields are rendered but disabled with a notice.
 */

export function SecuritySettingsTab() {
  const [twoFactor, setTwoFactor] = useState("off");
  const [sessionTimeout, setSessionTimeout] = useState("4h");

  return (
    <div className="mt-2 space-y-6 max-w-2xl">
      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Security settings will be configurable in a future release. Controls shown below are preview-only.
      </div>

      {/* Two-factor authentication */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900">Two-Factor Authentication</h3>
        <p className="mt-1 text-xs text-gray-500">
          Require members to use two-factor authentication when signing in.
        </p>
        <fieldset disabled className="mt-4 space-y-2 opacity-60">
          {(["off", "optional", "required"] as const).map((option) => (
            <label key={option} className="flex items-center gap-2 text-sm text-gray-700 cursor-not-allowed">
              <input
                type="radio"
                name="twoFactor"
                value={option}
                checked={twoFactor === option}
                onChange={(e) => setTwoFactor(e.target.value)}
                className="h-4 w-4 border-gray-300 text-blue-600"
              />
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </label>
          ))}
        </fieldset>
      </div>

      {/* Session timeout */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900">Session Timeout</h3>
        <p className="mt-1 text-xs text-gray-500">
          Maximum duration of idle sessions before automatic sign-out.
        </p>
        <select
          disabled
          value={sessionTimeout}
          onChange={(e) => setSessionTimeout(e.target.value)}
          className="mt-3 w-full max-w-xs rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 opacity-60 cursor-not-allowed"
        >
          <option value="30m">30 minutes</option>
          <option value="1h">1 hour</option>
          <option value="4h">4 hours</option>
          <option value="8h">8 hours</option>
          <option value="24h">24 hours</option>
          <option value="never">Never</option>
        </select>
      </div>

      {/* Password policy */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900">Password Policy</h3>
        <p className="mt-1 text-xs text-gray-500">
          Enforce password complexity and expiration rules.
        </p>
        <div className="mt-3 space-y-3 opacity-60">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-not-allowed">
            <input type="checkbox" disabled defaultChecked className="h-4 w-4 rounded border-gray-300" />
            Minimum 8 characters
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-not-allowed">
            <input type="checkbox" disabled defaultChecked className="h-4 w-4 rounded border-gray-300" />
            Require uppercase and lowercase
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-not-allowed">
            <input type="checkbox" disabled className="h-4 w-4 rounded border-gray-300" />
            Require number and special character
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-not-allowed">
            <input type="checkbox" disabled className="h-4 w-4 rounded border-gray-300" />
            Expire passwords every 90 days
          </label>
        </div>
      </div>

      {/* Allowed email domains */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900">Allowed Email Domains</h3>
        <p className="mt-1 text-xs text-gray-500">
          Restrict sign-up and invitation to specific email domains.
        </p>
        <input
          disabled
          type="text"
          placeholder="e.g. example.com, acme.org"
          className="mt-3 w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 opacity-60 cursor-not-allowed"
        />
      </div>

      {/* IP allowlist */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900">IP Allowlist</h3>
        <p className="mt-1 text-xs text-gray-500">
          Restrict access to specific IP addresses or CIDR ranges.
        </p>
        <textarea
          disabled
          rows={3}
          placeholder="e.g. 10.0.0.0/8, 192.168.1.0/24"
          className="mt-3 w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 opacity-60 cursor-not-allowed"
        />
      </div>
    </div>
  );
}
