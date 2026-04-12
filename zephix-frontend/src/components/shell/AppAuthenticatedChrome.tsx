import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AdministrationWorkspacesModal } from "@/features/administration/components/AdministrationWorkspacesModal";
import { useAdminWorkspacesModalStore } from "@/stores/adminWorkspacesModalStore";

const WORKSPACES_Q = "workspaces";

/**
 * Wraps all authenticated routes: global admin UI (e.g. workspaces browser) + {@link Outlet}.
 */
export default function AppAuthenticatedChrome() {
  const location = useLocation();
  const navigate = useNavigate();
  const isOpen = useAdminWorkspacesModalStore((s) => s.isOpen);
  const close = useAdminWorkspacesModalStore((s) => s.close);

  // Deep link / bookmark: ?workspaces=1 opens modal then strips the param (stay on current path).
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    if (sp.get(WORKSPACES_Q) !== "1") return;
    useAdminWorkspacesModalStore.getState().open();
    sp.delete(WORKSPACES_Q);
    const next = sp.toString();
    navigate({ pathname: location.pathname, search: next ? `?${next}` : "" }, { replace: true });
  }, [location.search, location.pathname, navigate]);

  return (
    <>
      <AdministrationWorkspacesModal isOpen={isOpen} onClose={close} />
      <Outlet />
    </>
  );
}
