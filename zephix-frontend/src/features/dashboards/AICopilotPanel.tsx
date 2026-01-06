// Phase 4.3: AI Copilot Panel for Dashboard Builder
import { useState } from "react";
import { Sparkles, Loader2, AlertCircle, Plus, Check } from "lucide-react";
import { aiSuggest, aiGenerate } from "./api";
import type { DashboardEntity, DashboardWidget, AISuggestResponse, AIGenerateResponse } from "./types";
import { createWidget } from "./widget-registry";
import type { WidgetType } from "./types";

interface AICopilotPanelProps {
  dashboard: DashboardEntity;
  workspaceId: string | null;
  startDate: string;
  endDate: string;
  onApplyWidgets: (widgets: DashboardWidget[]) => void;
  onApplyDashboard: (dash: Partial<DashboardEntity>) => void;
}

export function AICopilotPanel({
  dashboard,
  workspaceId,
  startDate,
  endDate,
  onApplyWidgets,
  onApplyDashboard,
}: AICopilotPanelProps) {
  const [prompt, setPrompt] = useState("Create a PMO dashboard for execs. Include project health, resource utilization, conflict trends, and delivery risk. Use weekly trend widgets. Keep to 6 to 8 widgets.");
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const [suggestResult, setSuggestResult] = useState<AISuggestResponse | null>(null);
  const [generateResult, setGenerateResult] = useState<AIGenerateResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"suggestions" | "generated">("suggestions");

  const handleSuggest = async () => {
    if (!prompt.trim()) {
      setError({ message: "Please enter a prompt" });
      return;
    }

    if (!workspaceId) {
      setError({ message: "Workspace ID is required" });
      return;
    }

    setLoadingSuggest(true);
    setError(null);
    setSuggestResult(null);

    try {
      const result = await aiSuggest(prompt);
      setSuggestResult(result);
      setActiveTab("suggestions");
    } catch (err: any) {
      const requestId = err?.response?.headers?.['x-request-id'] || err?.response?.data?.requestId;
      setError({
        message: err?.response?.data?.message || err?.message || "Failed to get suggestions",
        requestId,
      });
    } finally {
      setLoadingSuggest(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError({ message: "Please enter a prompt" });
      return;
    }

    if (!workspaceId) {
      setError({ message: "Workspace ID is required" });
      return;
    }

    setLoadingGenerate(true);
    setError(null);
    setGenerateResult(null);

    try {
      const result = await aiGenerate(prompt);
      setGenerateResult(result);
      setActiveTab("generated");
    } catch (err: any) {
      const requestId = err?.response?.headers?.['x-request-id'] || err?.response?.data?.requestId;
      setError({
        message: err?.response?.data?.message || err?.message || "Failed to generate dashboard",
        requestId,
      });
    } finally {
      setLoadingGenerate(false);
    }
  };

  const handleAddWidget = (widgetType: WidgetType) => {
    // Find next available position
    const maxY = dashboard.widgets.reduce((max, w) => Math.max(max, (w.layout.y || 0) + (w.layout.h || 3)), 0);
    const newWidget = createWidget(widgetType, { x: 0, y: maxY });

    // Merge with existing widgets
    const mergedWidgets = [...dashboard.widgets, newWidget];
    onApplyWidgets(mergedWidgets);
  };

  const handleApplyGenerated = () => {
    if (!generateResult) return;

    // Update dashboard name and description
    onApplyDashboard({
      name: generateResult.name,
      description: generateResult.description,
      visibility: generateResult.visibility as any,
    });

    // Convert generated widgets to DashboardWidget format
    const newWidgets: DashboardWidget[] = generateResult.widgets.map((w, index) => {
      // Use provided layout or calculate position
      const layout = w.layout || { x: (index % 3) * 4, y: Math.floor(index / 3) * 3, w: 4, h: 3 };

      return {
        id: crypto.randomUUID(),
        type: w.widgetKey,
        title: w.title,
        layout,
        config: w.config || {},
      };
    });

    // Replace all widgets
    onApplyWidgets(newWidgets);
  };

  return (
    <div className="h-full flex flex-col bg-white border-l" data-testid="ai-copilot-panel">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center space-x-2 mb-3">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-gray-900">AI Copilot</h3>
        </div>

        {/* Prompt Input */}
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the dashboard you want to create..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500 resize-none"
          rows={4}
          data-testid="copilot-prompt-input"
        />

        {/* Action Buttons */}
        <div className="flex space-x-2 mt-3">
          <button
            onClick={handleSuggest}
            disabled={loadingSuggest || loadingGenerate || !workspaceId}
            className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="copilot-suggest-button"
          >
            {loadingSuggest ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Suggesting...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Suggest
              </>
            )}
          </button>

          <button
            onClick={handleGenerate}
            disabled={loadingSuggest || loadingGenerate || !workspaceId}
            className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="copilot-generate-button"
          >
            {loadingGenerate ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate"
            )}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-800 font-medium">{error.message}</p>
              {error.requestId && (
                <p className="text-xs text-red-600 mt-1">RequestId: {error.requestId}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Results Area */}
      <div className="flex-1 overflow-y-auto">
        {/* Tabs */}
        {(suggestResult || generateResult) && (
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab("suggestions")}
              className={`flex-1 px-4 py-2 text-sm font-medium ${
                activeTab === "suggestions"
                  ? "text-indigo-600 border-b-2 border-indigo-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              data-testid="copilot-tab-suggestions"
            >
              Suggestions
            </button>
            <button
              onClick={() => setActiveTab("generated")}
              className={`flex-1 px-4 py-2 text-sm font-medium ${
                activeTab === "generated"
                  ? "text-indigo-600 border-b-2 border-indigo-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              data-testid="copilot-tab-generated"
            >
              Generated
            </button>
          </div>
        )}

        {/* Suggestions Tab */}
        {activeTab === "suggestions" && suggestResult && (
          <div className="p-4" data-testid="copilot-suggestions-content">
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Recommended Template</h4>
              <div className="px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-md">
                <p className="text-sm text-indigo-900">{suggestResult.templateKey}</p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Suggested Widgets</h4>
              <div className="space-y-2">
                {suggestResult.widgetSuggestions.map((widgetType) => {
                  const existingWidget = dashboard.widgets.find((w) => w.type === widgetType);
                  return (
                    <div
                      key={widgetType}
                      className="flex items-center justify-between px-3 py-2 border border-gray-200 rounded-md"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{widgetType}</p>
                        {existingWidget && (
                          <p className="text-xs text-gray-500">Already added</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleAddWidget(widgetType)}
                        disabled={!!existingWidget}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        data-testid={`copilot-add-widget-${widgetType}`}
                      >
                        {existingWidget ? (
                          <>
                            <Check className="w-3 h-3 mr-1" />
                            Added
                          </>
                        ) : (
                          <>
                            <Plus className="w-3 h-3 mr-1" />
                            Add
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Generated Tab */}
        {activeTab === "generated" && generateResult && (
          <div className="p-4" data-testid="copilot-generated-content">
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Generated Dashboard</h4>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md">
                <p className="text-sm font-medium text-gray-900">{generateResult.name}</p>
                {generateResult.description && (
                  <p className="text-xs text-gray-600 mt-1">{generateResult.description}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">Visibility: {generateResult.visibility}</p>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Widgets ({generateResult.widgets.length})</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {generateResult.widgets.map((widget, index) => (
                  <div
                    key={index}
                    className="px-3 py-2 border border-gray-200 rounded-md"
                  >
                    <p className="text-sm font-medium text-gray-900">{widget.title}</p>
                    <p className="text-xs text-gray-500">{widget.widgetKey}</p>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleApplyGenerated}
              className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
              data-testid="copilot-apply-generated-button"
            >
              <Check className="w-4 h-4 mr-2" />
              Apply Generated Dashboard
            </button>
          </div>
        )}

        {/* Empty State */}
        {!suggestResult && !generateResult && !loadingSuggest && !loadingGenerate && (
          <div className="p-8 text-center">
            <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-sm text-gray-500">
              Enter a prompt and click Suggest or Generate to get AI-powered dashboard recommendations.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

