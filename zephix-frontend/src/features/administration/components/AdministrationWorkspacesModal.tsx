import { Modal } from "@/components/ui/overlay/Modal";
import { AdministrationWorkspacesPanel } from "./AdministrationWorkspacesPanel";

export type AdministrationWorkspacesModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

/**
 * “Browse workspaces” sheet — wide; vertically/horizontally centered (default Modal frame).
 */
export function AdministrationWorkspacesModal({ isOpen, onClose }: AdministrationWorkspacesModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Browse all workspaces"
      size="xl"
      showCloseButton
      closeOnOverlayClick
      closeOnEscape
      className="!max-w-[1200px] !w-[85vw] flex flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5"
      contentClassName="flex min-h-0 flex-1 flex-col p-0"
      frameClassName="items-center justify-center"
    >
      <div className="flex shrink-0 flex-col gap-3 border-b border-slate-100 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 md:px-8">
        <p className="text-sm leading-snug text-slate-600">
          Workspaces, owners, and status for your organization.
        </p>
        <a
          href="/workspaces"
          className="inline-flex shrink-0 items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
        >
          Create workspace
        </a>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/95 px-6 py-5 md:px-8 md:py-6" style={{ minHeight: '500px', maxHeight: '75vh' }}>
        <AdministrationWorkspacesPanel isActive={isOpen} onNavigate={onClose} />
      </div>
    </Modal>
  );
}
