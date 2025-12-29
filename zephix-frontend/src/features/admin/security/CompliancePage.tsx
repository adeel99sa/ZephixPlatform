import { BadgeCheck } from 'lucide-react';

interface ComplianceItem {
  name: string;
  status: 'complete' | 'in-progress' | 'planned';
  description: string;
}

const complianceItems: ComplianceItem[] = [
  {
    name: 'SOC 2 Type II',
    status: 'planned',
    description: 'Security, availability, and confidentiality controls',
  },
  {
    name: 'GDPR Compliance',
    status: 'in-progress',
    description: 'Data protection and privacy regulations',
  },
  {
    name: 'Data Encryption',
    status: 'complete',
    description: 'Encryption at rest and in transit',
  },
  {
    name: 'Access Controls',
    status: 'complete',
    description: 'Role-based access control and permissions',
  },
  {
    name: 'Audit Logging',
    status: 'in-progress',
    description: 'Comprehensive audit trail for all actions',
  },
];

export default function CompliancePage() {
  const getStatusBadge = (status: ComplianceItem['status']) => {
    switch (status) {
      case 'complete':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Complete</span>;
      case 'in-progress':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">In Progress</span>;
      case 'planned':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">Planned</span>;
    }
  };

  return (
    <div className="p-6" data-testid="admin-security-compliance-root">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BadgeCheck className="h-6 w-6" />
          Compliance
        </h1>
        <p className="text-gray-600 mt-2">
          View compliance status and data region information for your organization.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-3xl space-y-6">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Data Region</h2>
          <div className="bg-gray-50 rounded-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Primary Data Region</p>
                <p className="text-sm text-gray-600 mt-1">US East (Virginia)</p>
              </div>
              <BadgeCheck className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Compliance Status</h2>
          <div className="space-y-3">
            {complianceItems.map((item) => (
              <div
                key={item.name}
                className="flex items-start justify-between p-4 border border-gray-200 rounded-md"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-sm font-semibold text-gray-900">{item.name}</h3>
                    {getStatusBadge(item.status)}
                  </div>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="border-t border-gray-200 pt-4">
          <p className="text-sm text-gray-500">
            <strong>Note:</strong> This is a read-only view. Compliance configuration and certification management will be available in a future update.
          </p>
        </div>
      </div>
    </div>
  );
}

















