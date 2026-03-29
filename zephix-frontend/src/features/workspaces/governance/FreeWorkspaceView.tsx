import { Layout, FormInput, Zap, Library } from "lucide-react";
import { Button } from "@/ui/components/Button";
import { FeatureCard } from "./FeatureCard";

interface FreeWorkspaceViewProps {
  onAddFromLibrary?: () => void;
  onCustomizeViews?: () => void;
  onAddField?: () => void;
  onConfigureAutomations?: () => void;
}

export function FreeWorkspaceView({
  onAddFromLibrary,
  onCustomizeViews,
  onAddField,
  onConfigureAutomations,
}: FreeWorkspaceViewProps) {
  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-z-text-primary">Workspace Setup</h1>
          <p className="mt-1 text-z-text-secondary">
            Customize your delivery setup
          </p>
        </div>
        <Button variant="primary" size="md" onClick={onAddFromLibrary}>
          <Library size={16} className="mr-2" />
          Add from Template Library
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <FeatureCard
          title="Views"
          description="Board, List, Gantt, Calendar"
          icon={Layout}
          action="Customize"
          editable
        />
        <FeatureCard
          title="Custom Fields"
          description="Add team-specific tracking"
          icon={FormInput}
          action="Add Field"
          editable
        />
        <FeatureCard
          title="Automations"
          description="Workflow rules"
          icon={Zap}
          action="Configure"
          editable
        />
      </div>
    </div>
  );
}
