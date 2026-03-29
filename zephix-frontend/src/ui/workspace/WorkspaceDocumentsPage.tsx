import { EmptyState } from "@/ui/components/EmptyState";

export function WorkspaceDocumentsPage() {
  return (
    <div className="p-6">
      <EmptyState
        title="Workspace documents"
        description="Workspace-level documentation and references will appear here."
      />
    </div>
  );
}

