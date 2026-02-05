import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getDoc, updateDoc, Doc } from "@/features/docs/api";
import { useWorkspaceStore } from "@/state/workspace.store";
import { toast } from "sonner";

export default function DocsPage() {
  const { docId } = useParams();
  const navigate = useNavigate();
  const { activeWorkspaceId } = useWorkspaceStore();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!docId) {
      setError("Doc ID required");
      setLoading(false);
      return;
    }

    loadDoc();
  }, [docId]);

  const loadDoc = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDoc(docId!);
      setDoc(data);
      setTitle(data.title);
      setContent(data.content || "");
    } catch (e: any) {
      setError(e?.message || "Failed to load doc");
      toast.error("Failed to load doc");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!docId) return;

    setSaving(true);
    try {
      const updated = await updateDoc(docId, { title, content });
      setDoc(updated);
      toast.success("Doc saved");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save doc");
    } finally {
      setSaving(false);
    }
  };

  const handleContentBlur = () => {
    if (docId && (title !== doc?.title || content !== doc?.content)) {
      handleSave();
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-gray-500">Loading doc...</div>
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
        onBlur={handleSave}
        className="w-full text-2xl font-semibold mb-4 border-none outline-none focus:outline-none"
        placeholder="Doc title..."
      />

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={handleContentBlur}
        className="w-full min-h-[500px] p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Start writing..."
      />
    </div>
  );
}
