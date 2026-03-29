/**
 * Lessons Learned Tab — MVP placeholder
 * Captures project lessons, retrospective notes, and improvement items.
 */
import { useState } from "react";
import { BookOpen, Plus } from "lucide-react";
import { useProjectContext } from "../layout/ProjectPageContext";

interface Lesson {
  id: string;
  text: string;
  category: "success" | "improvement" | "process";
  createdAt: string;
}

const CATEGORY_LABELS: Record<Lesson["category"], string> = {
  success: "What went well",
  improvement: "What to improve",
  process: "Process change",
};

const CATEGORY_COLORS: Record<Lesson["category"], string> = {
  success: "bg-green-50 text-green-700 border-green-200",
  improvement: "bg-amber-50 text-amber-700 border-amber-200",
  process: "bg-blue-50 text-blue-700 border-blue-200",
};

export function ProjectLessonsLearnedTab() {
  const { project } = useProjectContext();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [newText, setNewText] = useState("");
  const [newCategory, setNewCategory] = useState<Lesson["category"]>("success");
  const [showForm, setShowForm] = useState(false);

  function handleAdd() {
    if (!newText.trim()) return;
    const lesson: Lesson = {
      id: crypto.randomUUID(),
      text: newText.trim(),
      category: newCategory,
      createdAt: new Date().toISOString(),
    };
    setLessons((prev) => [lesson, ...prev]);
    setNewText("");
    setShowForm(false);
  }

  function handleRemove(id: string) {
    setLessons((prev) => prev.filter((l) => l.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Lessons Learned</h2>
          <p className="text-sm text-gray-500">
            Capture what worked, what didn't, and process improvements for{" "}
            {project?.name || "this project"}.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> Add lesson
        </button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Describe the lesson learned..."
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm resize-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none"
            rows={3}
            autoFocus
          />
          <div className="flex items-center gap-3">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as Lesson["category"])}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm"
            >
              <option value="success">What went well</option>
              <option value="improvement">What to improve</option>
              <option value="process">Process change</option>
            </select>
            <button
              onClick={handleAdd}
              disabled={!newText.trim()}
              className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {lessons.length === 0 && !showForm ? (
        <div className="text-center py-12 border rounded-lg border-dashed border-gray-300">
          <BookOpen className="h-8 w-8 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No lessons captured yet.</p>
          <p className="text-xs text-gray-400 mt-1">
            Add lessons as you go to build a knowledge base for future projects.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {lessons.map((lesson) => (
            <div
              key={lesson.id}
              className={`rounded-lg border p-4 ${CATEGORY_COLORS[lesson.category]}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <span className="text-xs font-medium uppercase tracking-wider opacity-70">
                    {CATEGORY_LABELS[lesson.category]}
                  </span>
                  <p className="mt-1 text-sm">{lesson.text}</p>
                  <p className="mt-2 text-xs opacity-60">
                    {new Date(lesson.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleRemove(lesson.id)}
                  className="text-xs opacity-50 hover:opacity-100"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
