import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isHydrated = useAuthStore(s => s.isHydrated)
  const authed     = useAuthStore(s => s.isAuthenticated)
  const loc        = useLocation()
  if (!isHydrated) return <div className="p-4 text-sm opacity-70">Loading…</div>
  if (!authed)     return <Navigate to="/login" replace state={{ from: loc }} />
  return <>{children}</>
}