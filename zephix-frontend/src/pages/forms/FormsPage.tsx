import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getForm, updateForm, Form } from "@/features/forms/api";
import { useWorkspaceStore } from "@/state/workspace.store";
import { toast } from "sonner";

export default function FormsPage() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { activeWorkspaceId } = useWorkspaceStore();
  const [form, setForm] = useState<Form | null>(null);
  const [title, setTitle] = useState("");
  const [schemaJson, setSchemaJson] = useState("{}");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    if (!formId) {
      setError("Form ID required");
      setLoading(false);
      return;
    }

    loadForm();
  }, [formId]);

  const loadForm = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getForm(formId!);
      setForm(data);
      setTitle(data.title);
      setSchemaJson(JSON.stringify(data.schema || {}, null, 2));
    } catch (e: any) {
      setError(e?.message || "Failed to load form");
      toast.error("Failed to load form");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formId) return;

    // Validate JSON
    let schema: any;
    try {
      schema = JSON.parse(schemaJson);
      setJsonError(null);
    } catch (e) {
      setJsonError("Invalid JSON");
      toast.error("Invalid JSON schema");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateForm(formId, { title, schema });
      setForm(updated);
      toast.success("Form saved");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save form");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-gray-500">Loading form...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-lg font-semibold text-red-600">Error</div>
        <div className="mt-2 text-sm text-gray-600">{error}</div>
        <Link className="mt-4 inline-block text-blue-600" to="/home">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-4 flex items-center justify-between">
        <Link className="text-blue-600 hover:text-blue-700" to="/home">
          ← Back
        </Link>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full text-2xl font-semibold mb-4 border-none outline-none focus:outline-none"
        placeholder="Form title..."
      />

      {jsonError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
          {jsonError}
        </div>
      )}

      <div className="mb-2 text-sm text-gray-600">Schema (JSON):</div>
      <textarea
        value={schemaJson}
        onChange={(e) => {
          setSchemaJson(e.target.value);
          setJsonError(null);
        }}
        className="w-full min-h-[500px] p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
        placeholder='{"fields": []}'
      />
    </div>
  );
}
