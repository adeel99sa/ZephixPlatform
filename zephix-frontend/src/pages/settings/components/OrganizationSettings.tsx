import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { track } from "@/lib/telemetry";
import { useAuth } from "@/state/AuthContext";
import { apiClient } from "@/lib/api/client";
import { isOrganizationAdminUser } from "@/utils/access";
import { useOrganizationStore } from "@/stores/organizationStore";
import type { Organization } from "@/types/organization";
import { getAxiosErrorMessage } from "../settingsErrors";

const SIZE_OPTIONS: Array<{
  value: "" | "startup" | "small" | "medium" | "large" | "enterprise";
  label: string;
}> = [
  { value: "", label: "Not specified" },
  { value: "startup", label: "Startup" },
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
  { value: "enterprise", label: "Enterprise" },
];

type OrgForm = {
  name: string;
  website: string;
  industry: string;
  size: "" | "startup" | "small" | "medium" | "large" | "enterprise";
  description: string;
};

export function OrganizationSettings() {
  const { user } = useAuth();
  const orgId = user?.organizationId ?? null;
  const canEditOrg = isOrganizationAdminUser(user);

  const setCurrentOrganization = useOrganizationStore((s) => s.setCurrentOrganization);
  const organizations = useOrganizationStore((s) => s.organizations);
  const setOrganizations = useOrganizationStore((s) => s.setOrganizations);
  const currentOrganization = useOrganizationStore((s) => s.currentOrganization);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [size, setSize] = useState<OrgForm["size"]>("");
  const [description, setDescription] = useState("");

  const initialRef = useRef<OrgForm | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadOrganization = useCallback(async () => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    setLoadError(null);
    setLoading(true);
    try {
      const data = await apiClient.get<Organization>(`/organizations/${orgId}`);
      const next: OrgForm = {
        name: data.name ?? "",
        website: data.website ?? "",
        industry: data.industry ?? "",
        size: (data.size as OrgForm["size"]) || "",
        description: data.description ?? "",
      };
      setName(next.name);
      setWebsite(next.website);
      setIndustry(next.industry);
      setSize(next.size);
      setDescription(next.description);
      initialRef.current = next;
    } catch (e) {
      setLoadError(getAxiosErrorMessage(e, "Could not load organization."));
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void loadOrganization();
  }, [loadOrganization]);

  const handleSave = async () => {
    if (!orgId || !canEditOrg) return;
    setSaveError(null);

    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 255) {
      setSaveError("Organization name must be between 2 and 255 characters.");
      return;
    }

    const ws = website.trim();
    if (ws) {
      try {
        // eslint-disable-next-line no-new
        new URL(ws);
      } catch {
        setSaveError("Website must be a valid URL (e.g. https://example.com).");
        return;
      }
    }

    const base = initialRef.current;
    if (!base) {
      setSaveError("Organization data not loaded yet.");
      return;
    }

    const payload: Record<string, unknown> = {};
    if (trimmedName !== base.name.trim()) payload.name = trimmedName;
    const websiteVal = ws || undefined;
    if ((websiteVal ?? "") !== (base.website.trim() || "")) {
      payload.website = websiteVal;
    }
    const ind = industry.trim();
    if (ind !== base.industry.trim()) payload.industry = ind || undefined;
    const sizeVal = size || undefined;
    const baseSize = base.size || "";
    if ((sizeVal ?? "") !== (baseSize || "")) {
      payload.size = sizeVal;
    }
    const desc = description.trim();
    if (desc !== base.description.trim()) payload.description = desc || undefined;

    if (Object.keys(payload).length === 0) {
      toast.info("No organization changes to save.");
      return;
    }

    setSaving(true);
    track("settings.organization.save_attempt", {});
    try {
      const updated = await apiClient.patch<Organization>(
        `/organizations/${orgId}`,
        payload,
      );

      const next: OrgForm = {
        name: updated.name ?? "",
        website: updated.website ?? "",
        industry: updated.industry ?? "",
        size: (updated.size as OrgForm["size"]) || "",
        description: updated.description ?? "",
      };
      initialRef.current = next;

      const idx = organizations.findIndex((o) => o.id === orgId);
      const nextOrgs =
        idx >= 0
          ? organizations.map((o) => (o.id === orgId ? updated : o))
          : [...organizations, updated];
      setOrganizations(nextOrgs);
      if (currentOrganization?.id === orgId) {
        setCurrentOrganization(updated);
      }

      toast.success("Organization settings saved.");
    } catch (e) {
      const msg = getAxiosErrorMessage(e, "Could not save organization settings.");
      setSaveError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!orgId) {
    return (
      <section data-testid="settings-organization" className="space-y-3">
        <h2 className="font-medium">Organization</h2>
        <p className="text-sm text-slate-600">No organization is associated with your account.</p>
      </section>
    );
  }

  if (loading) {
    return (
      <section data-testid="settings-organization" className="flex items-center gap-2 text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading organization…
      </section>
    );
  }

  if (loadError) {
    return (
      <section data-testid="settings-organization" className="space-y-3">
        <h2 className="font-medium">Organization</h2>
        <p className="text-sm text-red-600">{loadError}</p>
        <button type="button" className="btn" onClick={() => void loadOrganization()}>
          Retry
        </button>
      </section>
    );
  }

  const disabled = !canEditOrg || saving;

  return (
    <section data-testid="settings-organization" className="space-y-3">
      <h2 className="font-medium">Organization</h2>
      {!canEditOrg && (
        <p className="text-sm text-slate-600 max-w-xl">
          Only organization admins can edit these settings. Contact an admin if you need changes.
        </p>
      )}
      <div className="grid gap-2 max-w-xl">
        <label className="grid">
          <span>Organization name</span>
          <input
            data-testid="settings-org-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={disabled}
            minLength={2}
            maxLength={255}
            required
            aria-required="true"
          />
        </label>
        <label className="grid">
          <span>Website</span>
          <input
            data-testid="settings-org-website"
            className="input"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            disabled={disabled}
            placeholder="https://..."
          />
        </label>
        <label className="grid">
          <span>Industry</span>
          <input
            data-testid="settings-org-industry"
            className="input"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            disabled={disabled}
          />
        </label>
        <label className="grid">
          <span>Size</span>
          <select
            data-testid="settings-org-size"
            className="input"
            value={size}
            onChange={(e) =>
              setSize(e.target.value as OrgForm["size"])
            }
            disabled={disabled}
          >
            {SIZE_OPTIONS.map((o) => (
              <option key={o.value || "none"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid">
          <span>Description</span>
          <textarea
            data-testid="settings-org-description"
            className="input min-h-[100px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={disabled}
            rows={4}
          />
        </label>
      </div>
      {saveError && (
        <p className="text-sm text-red-600" role="alert">
          {saveError}
        </p>
      )}
      <button
        type="button"
        data-testid="settings-organization-save"
        onClick={() => void handleSave()}
        disabled={!canEditOrg || saving}
        className="btn-primary inline-flex items-center gap-2"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        Save organization settings
      </button>
    </section>
  );
}
