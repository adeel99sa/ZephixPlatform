import { useNavigate } from 'react-router-dom';
import { FileStack, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';

export default function AdminTemplatesPage() {
  const navigate = useNavigate();

  return (
    <div className="p-6" data-testid="admin-templates-root">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileStack className="h-6 w-6" />
          Template Center
        </h1>
        <p className="text-gray-600 mt-2">
          Manage project templates and create standardized project structures for your organization.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-2xl">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Template Management
            </h2>
            <p className="text-gray-600 text-sm">
              The Template Center is where you create, edit, and manage project templates.
              Templates include project structure (phases and tasks), risk presets, and KPI presets
              that are automatically applied when creating new projects.
            </p>
          </div>

          <div className="bg-blue-50 rounded-md p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">
              Key Features
            </h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-blue-800 ml-2">
              <li>Create reusable project templates with predefined structures</li>
              <li>Define risk presets that are automatically added to new projects</li>
              <li>Configure KPI presets for consistent project metrics</li>
              <li>Filter templates by methodology, category, and search</li>
              <li>All project creation flows through Template Center</li>
            </ul>
          </div>

          <div className="pt-4">
            <Button
              onClick={() => navigate('/templates')}
              className="flex items-center gap-2"
            >
              Open Template Center
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

















