import { useEffect, useState } from "react";
import {
  administrationApi,
  type AdminTemplate,
} from "@/features/administration/api/administration.api";

export default function AdministrationTemplatesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<AdminTemplate[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const items = await administrationApi.listTemplates();
        if (active) setTemplates(items);
      } catch {
        if (active) {
          setError("Failed to load templates.");
          setTemplates([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const approvedTemplates = templates.filter((template) => template.status === "APPROVED");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Templates</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage blueprint project templates and approved standards.
        </p>
      </header>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-lg border border-gray-200 bg-white p-4 lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-900">Template Library</h2>
          <div className="mt-3 space-y-2">
            {loading ? (
              <p className="text-sm text-gray-500">Loading templates...</p>
            ) : templates.length === 0 ? (
              <p className="text-sm text-gray-500">No templates available.</p>
            ) : (
              templates.map((template) => (
                <div key={template.id} className="rounded border border-gray-200 px-3 py-2 text-sm text-gray-700">
                  {template.name}
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">Approved Templates</h2>
          <p className="mt-2 text-sm text-gray-700">
            {approvedTemplates.length > 0 ? `${approvedTemplates.length} approved templates.` : "No approved templates."}
          </p>
          <button
            type="button"
            className="mt-4 rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Create template entry
          </button>
        </section>
      </div>
    </div>
  );
}
