import { useEffect, useState } from "react";
import {
  administrationApi,
  type AdminTemplate,
} from "@/features/administration/api/administration.api";
import {
  TemplateDetailPanel,
  type TemplatePanelData,
} from "@/features/administration/components/TemplateDetailPanel";

export default function AdministrationTemplatesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<AdminTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplatePanelData | null>(null);

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
          Manage blueprint project templates and approved standards. Select a template to open
          details, columns, and governance configuration.
        </p>
      </header>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-lg border border-gray-200 bg-white p-4 lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-900">Template library</h2>
          <div className="mt-3 space-y-2">
            {loading ? (
              <p className="text-sm text-gray-500">Loading templates...</p>
            ) : templates.length === 0 ? (
              <p className="text-sm text-gray-500">No templates available.</p>
            ) : (
              templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() =>
                    setSelectedTemplate(template as unknown as TemplatePanelData)
                  }
                  className="w-full rounded border border-gray-200 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  <span className="font-medium text-gray-900">{template.name}</span>
                  {template.status ? (
                    <span className="ml-2 text-xs text-gray-500">
                      {template.status}
                    </span>
                  ) : null}
                </button>
              ))
            )}
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">Approved templates</h2>
          <p className="mt-2 text-sm text-gray-700">
            {approvedTemplates.length > 0
              ? `${approvedTemplates.length} approved template${approvedTemplates.length === 1 ? "" : "s"}.`
              : "No approved templates."}
          </p>
        </section>
      </div>

      {selectedTemplate ? (
        <TemplateDetailPanel
          template={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
        />
      ) : null}
    </div>
  );
}
