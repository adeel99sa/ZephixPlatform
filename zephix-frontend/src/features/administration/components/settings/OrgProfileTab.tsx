/**
 * OrgProfileTab — MVP-4: Organization Profile settings tab.
 * Reads/writes existing Organization entity columns (name, industry, website, description, size).
 */
import { useState, useEffect } from "react";
import { Building2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input/Input";
import { Select } from "@/components/ui/form/Select";
import { Textarea } from "@/components/ui/form/Textarea";
import { Button } from "@/components/ui/button/Button";
import { administrationApi } from "../../api/administration.api";

const INDUSTRY_OPTIONS = [
  { value: "", label: "Select industry..." },
  { value: "technology", label: "Technology" },
  { value: "finance", label: "Finance & Banking" },
  { value: "healthcare", label: "Healthcare" },
  { value: "construction", label: "Construction & Engineering" },
  { value: "consulting", label: "Consulting & Professional Services" },
  { value: "government", label: "Government & Public Sector" },
  { value: "education", label: "Education" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "retail", label: "Retail & E-commerce" },
  { value: "energy", label: "Energy & Utilities" },
  { value: "other", label: "Other" },
];

const SIZE_OPTIONS = [
  { value: "", label: "Select company size..." },
  { value: "startup", label: "1-10 employees" },
  { value: "small", label: "11-50 employees" },
  { value: "medium", label: "51-200 employees" },
  { value: "large", label: "201-1,000 employees" },
  { value: "enterprise", label: "1,001+ employees" },
];

export function OrgProfileTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [form, setForm] = useState({ name: "", industry: "", website: "", description: "", size: "" });

  useEffect(() => {
    setIsLoading(true);
    administrationApi
      .getOrgProfile()
      .then((data) =>
        setForm({
          name: data.name || "",
          industry: data.industry || "",
          website: data.website || "",
          description: data.description || "",
          size: data.size || "",
        }),
      )
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  async function handleSave() {
    setIsSaving(true);
    setMsg(null);
    try {
      await administrationApi.updateOrgProfile(form);
      setMsg({ type: "success", text: "Organization profile saved." });
      setTimeout(() => setMsg(null), 4000);
    } catch {
      setMsg({ type: "error", text: "Failed to save. Please try again." });
    } finally {
      setIsSaving(false);
    }
  }

  function upd(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setMsg(null);
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
          <Building2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Organization Profile</h2>
          <p className="text-sm text-gray-500">Basic information about your organization</p>
        </div>
      </div>

      <div className="max-w-xl space-y-4">
        <Input
          label="Organization name"
          value={form.name}
          onChange={(e) => upd("name", e.target.value)}
          placeholder="Acme Corporation"
        />
        <Select
          label="Industry"
          options={INDUSTRY_OPTIONS}
          value={form.industry}
          onChange={(e) => upd("industry", e.target.value)}
        />
        <Select
          label="Company size"
          options={SIZE_OPTIONS}
          value={form.size}
          onChange={(e) => upd("size", e.target.value)}
        />
        <Input
          label="Website"
          value={form.website}
          onChange={(e) => upd("website", e.target.value)}
          placeholder="https://example.com"
        />
        <Textarea
          label="Description"
          value={form.description}
          onChange={(e) => upd("description", e.target.value)}
          placeholder="A short description of your organization"
          rows={3}
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
