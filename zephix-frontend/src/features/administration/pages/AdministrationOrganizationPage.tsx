import { useEffect, useState } from "react";
import {
  administrationApi,
  type OrganizationProfile,
} from "@/features/administration/api/administration.api";

type EditableProfileFields = Pick<
  OrganizationProfile,
  "name" | "description" | "website" | "industry" | "size"
>;

function formatDate(value: string | null): string {
  if (!value) return "Not available";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Not available";
  return d.toLocaleString();
}

export default function AdministrationOrganizationPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [profile, setProfile] = useState<OrganizationProfile | null>(null);
  const [form, setForm] = useState<EditableProfileFields>({
    name: "",
    description: null,
    website: null,
    industry: null,
    size: null,
  });

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await administrationApi.getOrganizationProfile();
      setProfile(data);
      setForm({
        name: data.name || "",
        description: data.description || "",
        website: data.website || "",
        industry: data.industry || "",
        size: data.size || "",
      });
    } catch {
      setProfile(null);
      setError("Failed to load organization governance profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, []);

  const onSave = async () => {
    if (!profile) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await administrationApi.updateOrganizationProfile({
        name: form.name.trim(),
        description: form.description || "",
        website: form.website || "",
        industry: form.industry || "",
        size: form.size || "",
      });
      setProfile((current) => ({
        ...(current || updated),
        ...updated,
      }));
      setSuccess("Organization profile updated.");
    } catch {
      setError("Failed to save organization profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-gray-900">Organization</h1>
        <p className="text-sm text-gray-600">
          Tenant identity and organization governance profile for the current
          control plane.
        </p>
      </header>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {success}
        </div>
      ) : null}

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Organization Profile</h2>
        {loading ? (
          <p className="mt-2 text-sm text-gray-500">Loading organization profile...</p>
        ) : !profile ? (
          <p className="mt-2 text-sm text-gray-500">
            Organization profile is unavailable.
          </p>
        ) : (
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Organization Name
              </span>
              <input
                value={form.name || ""}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-800"
              />
            </label>
            <div className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Slug
              </span>
              <p className="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {profile.slug}
              </p>
            </div>
            <label className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Website
              </span>
              <input
                value={form.website || ""}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, website: event.target.value }))
                }
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-800"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Industry
              </span>
              <input
                value={form.industry || ""}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, industry: event.target.value }))
                }
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-800"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Size
              </span>
              <input
                value={form.size || ""}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, size: event.target.value }))
                }
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-800"
              />
            </label>
            <div className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Data Region
              </span>
              <p className="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {profile.metadataSummary.dataRegion || "Not configured"}
              </p>
            </div>
            <label className="space-y-1 md:col-span-2">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Description
              </span>
              <textarea
                value={form.description || ""}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
                rows={3}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-800"
              />
            </label>

            <div className="md:col-span-2 flex justify-end">
              <button
                type="button"
                disabled={saving || loading || !profile}
                onClick={onSave}
                className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save organization profile"}
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Tenant Summary</h2>
        {loading ? (
          <p className="mt-2 text-sm text-gray-500">Loading tenant summary...</p>
        ) : !profile ? (
          <p className="mt-2 text-sm text-gray-500">No tenant summary available.</p>
        ) : (
          <div className="mt-2 grid gap-2 text-sm text-gray-700 md:grid-cols-2">
            <p>
              <span className="font-medium text-gray-900">Status:</span>{" "}
              {profile.status}
            </p>
            <p>
              <span className="font-medium text-gray-900">Plan:</span>{" "}
              {profile.planCode || "unknown"} ({profile.planStatus || "unknown"})
            </p>
            <p>
              <span className="font-medium text-gray-900">Users:</span>{" "}
              {profile.tenantSummary?.totalUsers ?? 0}
            </p>
            <p>
              <span className="font-medium text-gray-900">Workspaces:</span>{" "}
              {profile.tenantSummary?.totalWorkspaces ?? 0}
            </p>
            <p>
              <span className="font-medium text-gray-900">Created At:</span>{" "}
              {formatDate(profile.createdAt)}
            </p>
            <p>
              <span className="font-medium text-gray-900">Plan Expiry:</span>{" "}
              {formatDate(profile.planExpiresAt)}
            </p>
            <p className="md:col-span-2">
              <span className="font-medium text-gray-900">Allowed Domain:</span>{" "}
              {profile.metadataSummary.allowedEmailDomain || "Not configured"}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
