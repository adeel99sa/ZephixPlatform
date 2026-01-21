import { useState } from 'react';
import { Sparkles } from 'lucide-react';

export default function AiSettingsPage() {
  const [aiEnabled, setAiEnabled] = useState(false);

  return (
    <div className="p-6" data-testid="admin-ai-settings-root">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="h-6 w-6" />
          AI Settings
        </h1>
        <p className="text-gray-600 mt-2">
          Configure AI features and preferences for your organization.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-2xl">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">AI Features</h3>
              <p className="text-sm text-gray-600 mt-1">
                Enable AI-powered features such as project suggestions, risk detection, and automated insights.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={aiEnabled}
                onChange={(e) => setAiEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm text-gray-500">
              <strong>Note:</strong> This is a placeholder. AI feature configuration and model settings will be available in a future update.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


















