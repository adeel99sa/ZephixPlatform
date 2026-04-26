import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { request } from "@/lib/api";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";

export type OrgProfile = {
  name: string;
  industry: string;
  website: string;
  description: string;
};

type OrgProfileResponse = Partial<OrgProfile> & { domain?: string | null };

type OrgProfileOverviewResponse = {
  profile?: OrgProfileResponse;
  data?: { profile?: OrgProfileResponse };
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
  const [profile, setProfile] = useState<OrgProfile>({
    name: "",
    industry: "Technology",
    website: "",
    description: "",
  });
  const latestOkRef = useRef<OrgProfile | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const overview = await request.get<OrgProfileOverviewResponse>(
          "/admin/organization/overview",
        );
        if (!active) return;
        const p: OrgProfileResponse = overview?.profile || overview?.data?.profile || {};
        const next: OrgProfile = {
          name: p.name || "",
          industry: p.industry || "Technology",
          website: p.website || p.domain || "",
          description: p.description || "",
        };
        setProfile(next);
        latestOkRef.current = next;
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

  const persist = useCallback(async (next: OrgProfile) => {
    setSaving(true);
    setError(null);
    try {
      await request.patch("/admin/organization/profile", next);
      latestOkRef.current = next;
    } catch {
      setError("Could not save organization profile.");
      toast.error("Could not save organization profile");
      if (latestOkRef.current) {
        setProfile(latestOkRef.current);
      }
    } finally {
      setSaving(false);
    }
  }, []);

  const debouncedPersist = useDebouncedCallback((next: OrgProfile) => {
    void persist(next);
  }, 600);

  const updateField = (field: keyof OrgProfile, value: string) => {
    setProfile((prev) => {
      const next = { ...prev, [field]: value };
      debouncedPersist(next);
      return next;
    });
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
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      <div className="space-y-5 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-gray-600">Changes save automatically.</p>
          {saving ? (
            <span className="text-xs font-medium text-neutral-500" aria-live="polite">
              Saving…
            </span>
          ) : null}
        </div>
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
      </div>
    </div>
  );
}
