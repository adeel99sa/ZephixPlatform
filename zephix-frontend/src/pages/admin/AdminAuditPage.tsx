import { useEffect } from "react";
import { track } from "@/lib/telemetry";

export default function AdminAuditPage() {
  useEffect(() => {
    track("admin.audit.viewed");
  }, []);

  return (
    <div className="p-6" data-testid="admin-audit-root">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Audit Log</h1>
        <p className="text-sm text-gray-500 mt-1">Administrative action history</p>
      </div>
      <div className="mt-6 rounded-xl border p-8 text-center text-gray-500">
        <p>Audit log functionality coming soon</p>
      </div>
    </div>
  );
}



















