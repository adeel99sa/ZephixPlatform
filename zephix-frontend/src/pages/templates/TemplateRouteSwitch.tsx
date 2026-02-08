/**
 * Route switch: renders ActivationTemplatePicker when ?mode=activation,
 * otherwise renders the full TemplateCenterPage.
 */

import { useSearchParams } from "react-router-dom";
import { lazy, Suspense } from "react";

const ActivationTemplatePicker = lazy(
  () => import("./ActivationTemplatePicker"),
);
const TemplateCenterPage = lazy(() => import("./TemplateCenterPage"));

export default function TemplateRouteSwitch() {
  const [params] = useSearchParams();
  const isActivation = params.get("mode") === "activation";

  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-sm text-gray-400">
          Loading...
        </div>
      }
    >
      {isActivation ? <ActivationTemplatePicker /> : <TemplateCenterPage />}
    </Suspense>
  );
}
