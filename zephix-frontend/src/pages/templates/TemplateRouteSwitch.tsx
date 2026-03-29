/**
 * /templates route (paid members only — see App.tsx RequirePaidInline):
 * - mode=activation → full-page activation picker (first-project flow)
 * - otherwise → open Template Center modal and replace URL with /home (no full-page gallery)
 */

import { lazy, Suspense, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useWorkspaceStore } from "@/state/workspace.store";
import { useTemplateCenterModalStore } from "@/state/templateCenterModal.store";

const ActivationTemplatePicker = lazy(
  () => import("./ActivationTemplatePicker"),
);

function TemplatesModalDeepLink() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);
  const openTemplateCenter = useTemplateCenterModalStore(
    (s) => s.openTemplateCenter,
  );

  useEffect(() => {
    const ws = searchParams.get("workspaceId");
    if (ws) {
      setActiveWorkspace(ws, null);
    }
    openTemplateCenter(ws ?? undefined);
    navigate("/home", { replace: true });
  }, [searchParams, navigate, setActiveWorkspace, openTemplateCenter]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center bg-[var(--zs-color-surface)] text-sm text-z-text-secondary">
      Opening Template Center…
    </div>
  );
}

export default function TemplateRouteSwitch() {
  const [params] = useSearchParams();
  const isActivation = params.get("mode") === "activation";

  if (isActivation) {
    return (
      <Suspense
        fallback={
          <div className="flex h-64 items-center justify-center text-sm text-gray-400">
            Loading...
          </div>
        }
      >
        <ActivationTemplatePicker />
      </Suspense>
    );
  }

  return <TemplatesModalDeepLink />;
}
