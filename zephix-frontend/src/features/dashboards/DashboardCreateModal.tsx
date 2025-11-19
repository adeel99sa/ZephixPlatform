import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { X } from "lucide-react";

interface DashboardCreateModalProps {
  open: boolean;
  onClose: () => void;
}

interface Template {
  id: string;
  name: string;
  description?: string;
}

export function DashboardCreateModal({ open, onClose }: DashboardCreateModalProps) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<"workspace" | "private">("workspace");
  const [scope, setScope] = useState<"workspace" | "org">("workspace");
  const [startWith, setStartWith] = useState<"blank" | "template">("blank");
  const [templateId, setTemplateId] = useState<string>("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load templates when startWith changes to "template"
  useEffect(() => {
    if (startWith === "template" && templates.length === 0) {
      loadTemplates();
    }
  }, [startWith, templates.length]);

  const loadTemplates = async () => {
    try {
      const response = await api.get(`/api/templates?scope=${scope}`);
      setTemplates(response.data?.data || []);
    } catch (error) {
      console.error("Failed to load templates:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        visibility,
        scope,
        templateId: startWith === "template" ? templateId : undefined,
      };

      const response = await api.post("/api/dashboards", payload, {
        headers: {
          "Idempotency-Key": crypto.randomUUID(),
        },
      });

      const dashboardId = response.data?.data?.id;
      if (dashboardId) {
        navigate(`/dashboards/${dashboardId}/edit`);
        onClose();
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to create dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName("");
    setVisibility("workspace");
    setScope("workspace");
    setStartWith("blank");
    setTemplateId("");
    setError(null);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" data-testid="dashboard-create-modal">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-25" onClick={handleClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Create Dashboard</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
              data-testid="modal-close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="dashboard-name" className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                id="dashboard-name"
                data-testid="dashboard-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter dashboard name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label htmlFor="dashboard-visibility" className="block text-sm font-medium text-gray-700 mb-1">
                Visibility
              </label>
              <select
                id="dashboard-visibility"
                data-testid="dashboard-visibility"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as "workspace" | "private")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="workspace">Workspace</option>
                <option value="private">Private</option>
              </select>
            </div>

            <div>
              <label htmlFor="dashboard-scope" className="block text-sm font-medium text-gray-700 mb-1">
                Scope
              </label>
              <select
                id="dashboard-scope"
                data-testid="dashboard-scope"
                value={scope}
                onChange={(e) => setScope(e.target.value as "workspace" | "org")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="workspace">Workspace</option>
                <option value="org">Organization</option>
              </select>
            </div>

            <div>
              <label htmlFor="dashboard-start-with" className="block text-sm font-medium text-gray-700 mb-1">
                Start with
              </label>
              <select
                id="dashboard-start-with"
                data-testid="dashboard-start-with"
                value={startWith}
                onChange={(e) => setStartWith(e.target.value as "blank" | "template")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="blank">Blank</option>
                <option value="template">Template</option>
              </select>
            </div>

            {startWith === "template" && (
              <div>
                <label htmlFor="dashboard-template" className="block text-sm font-medium text-gray-700 mb-1">
                  Template
                </label>
                <select
                  id="dashboard-template"
                  data-testid="dashboard-template"
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select a template</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                data-testid="dashboard-submit"
                disabled={!name.trim() || loading}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Creating..." : "Create"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
