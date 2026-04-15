import { useEffect, useState } from "react";
import { request } from "@/lib/api";

export type OrgProfile = {
  name: string;
  industry: string;
  website: string;
  description: string;
};

const INDUSTRY_OPTIONS = [
  "Technology",
  "Finance",
  "Healthcare",
  "Construction",
  "Consulting",
  "Government",
  "Education",
  "Other",
];

export function OrganizationProfileForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [profile, setProfile] = useState<OrgProfile>({
    name: "",
    industry: "Technology",
    website: "",
    description: "",
  });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const overview = await request.get<any>("/admin/organization/overview");
        if (!active) return;
        const p = overview?.profile || overview?.data?.profile || {};
        setProfile({
          name: p.name || "",
          industry: p.industry || "Technology",
          website: p.website || p.domain || "",
          description: p.description || "",
        });
      } catch {
        if (active) setError("Failed to load organization profile.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await request.patch("/admin/organization/profile", profile);
      setSuccess(true);
    } catch {
      setError("Failed to save organization profile. The backend endpoint may not be available yet.");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof OrgProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setSuccess(false);
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <p className="text-sm text-gray-500">Loading organization profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Organization profile saved.
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-6 space-y-5">
        <div>
          <label htmlFor="org-name" className="block text-sm font-medium text-gray-700">
            Organization Name
          </label>
          <input
            id="org-name"
            type="text"
            value={profile.name}
            onChange={(e) => updateField("name", e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="org-industry" className="block text-sm font-medium text-gray-700">
            Industry
          </label>
          <select
            id="org-industry"
            value={profile.industry}
            onChange={(e) => updateField("industry", e.target.value)}
            className="mt-1 w-full max-w-xs rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            {INDUSTRY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="org-website" className="block text-sm font-medium text-gray-700">
            Website URL <span className="text-gray-400">(optional)</span>
          </label>
          <input
            id="org-website"
            type="url"
            value={profile.website}
            onChange={(e) => updateField("website", e.target.value)}
            placeholder="https://example.com"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="org-description" className="block text-sm font-medium text-gray-700">
            Description <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            id="org-description"
            rows={3}
            value={profile.description}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="Brief description of your organization"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="pt-2">
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
