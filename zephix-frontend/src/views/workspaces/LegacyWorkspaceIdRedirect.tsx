import { useEffect, useState } from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";
import { getWorkspace } from "@/features/workspaces/api";

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export default function LegacyWorkspaceIdRedirect() {
  const { id, "*": rest } = useParams();
  const location = useLocation();
  const [target, setTarget] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const workspaceId = id || "";
    if (!isUuid(workspaceId)) {
      setDone(true);
      return;
    }

    (async () => {
      try {
        const workspace = await getWorkspace(workspaceId);
        // getWorkspace returns the Workspace with slug
        const slug = workspace?.slug;
        if (slug) {
          const suffix = rest ? `/${rest}` : "/home";
          setTarget(`/w/${slug}${suffix}${location.search || ""}`);
        }
      } finally {
        setDone(true);
      }
    })();
  }, [id, rest, location.search]);

  if (!done) return null;
  if (target) return <Navigate to={target} replace />;
  return <Navigate to={`/home${location.search || ""}`} replace />;
}
