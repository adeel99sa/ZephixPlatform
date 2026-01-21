/**
 * PHASE 5.3: Workspace Slug Redirect
 *
 * Redirects to /w/:slug/home (workspace home route)
 */
import { useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

export default function WorkspaceSlugRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!slug) {
      navigate('/workspaces');
      return;
    }

    // PHASE 5.3: Always redirect to /w/:slug/home
    // If already on /w/:slug/home, do nothing (let WorkspaceHomeBySlug handle it)
    if (location.pathname === `/w/${slug}/home`) {
      return;
    }

    // Redirect to workspace home
    navigate(`/w/${slug}/home`, { replace: true });
  }, [slug, navigate, location.pathname]);

  // Return null while redirecting
  return null;
}
