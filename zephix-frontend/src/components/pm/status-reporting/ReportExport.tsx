import React, { useState } from 'react';

interface ReportExportProps {
  projectId: string;
  onExportReport: (reportId: string, format: string) => Promise<void>;
}

const ReportExport: React.FC<ReportExportProps> = ({
  projectId,
  onExportReport,
}) => {
  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [selectedReport, setSelectedReport] = useState('latest');

  const mockReports = [
    {
      id: 'report-1',
      name: 'Weekly Status Report - Week 12',
      date: '2024-12-01',
      type: 'weekly',
      status: 'completed',
    },
    {
      id: 'report-2',
      name: 'Monthly Status Report - November',
      date: '2024-11-30',
      type: 'monthly',
      status: 'completed',
    },
    {
      id: 'report-3',
      name: 'Executive Summary - Q4',
      date: '2024-11-15',
      type: 'quarterly',
      status: 'completed',
    },
  ];

  const exportFormats = [
    { id: 'pdf', name: 'PDF', icon: '📄', description: 'Portable Document Format' },
    { id: 'pptx', name: 'PowerPoint', icon: '📊', description: 'Microsoft PowerPoint Presentation' },
    { id: 'excel', name: 'Excel', icon: '📈', description: 'Microsoft Excel Spreadsheet' },
    { id: 'html', name: 'HTML', icon: '🌐', description: 'Web Page Format' },
  ];

  const handleExport = async () => {
    await onExportReport(selectedReport, selectedFormat);
  };

  return (
    <div className="space-y-6">
      {/* Export Configuration */}
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Export Configuration</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Report
            </label>
            <select
              value={selectedReport}
              onChange={(e) => setSelectedReport(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="latest">Latest Report</option>
              {mockReports.map((report) => (
                <option key={report.id} value={report.id}>
                  {report.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Export Format
            </label>
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {exportFormats.map((format) => (
                <option key={format.id} value={format.id}>
                  {format.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Export Report
        </button>
      </div>

      {/* Format Options */}
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Export Formats</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {exportFormats.map((format) => (
            <div
              key={format.id}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                selectedFormat === format.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedFormat(format.id)}
            >
              <div className="flex items-center space-x-3">
                <div className="text-2xl">{format.icon}</div>
                <div>
                  <h5 className="font-medium text-gray-900">{format.name}</h5>
                  <p className="text-sm text-gray-600">{format.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Report History */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-lg font-semibold text-gray-900">Report History</h4>
        </div>
        <div className="divide-y divide-gray-200">
          {mockReports.map((report) => (
            <div key={report.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h5 className="text-sm font-medium text-gray-900">{report.name}</h5>
                  <p className="text-sm text-gray-600">Generated on {report.date}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      report.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {report.status}
                    </span>
                    <span className="text-xs text-gray-500 capitalize">{report.type}</span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => onExportReport(report.id, 'pdf')}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Export PDF
                  </button>
                  <button
                    onClick={() => onExportReport(report.id, 'pptx')}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Export PPT
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Export Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Export Settings</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h5 className="font-medium text-gray-700 mb-2">Content Options</h5>
            <div className="space-y-2">
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" defaultChecked />
                <span className="text-sm">Include charts and graphs</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" defaultChecked />
                <span className="text-sm">Include appendices</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" defaultChecked />
                <span className="text-sm">Include raw data</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" />
                <span className="text-sm">Include confidential information</span>
              </label>
            </div>
          </div>
          <div>
            <h5 className="font-medium text-gray-700 mb-2">Formatting Options</h5>
            <div className="space-y-2">
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" defaultChecked />
                <span className="text-sm">Include company branding</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" defaultChecked />
                <span className="text-sm">Include page numbers</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" defaultChecked />
                <span className="text-sm">Include table of contents</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" />
                <span className="text-sm">Include executive summary</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Scheduled Exports */}
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Scheduled Exports</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h5 className="font-medium text-gray-900">Weekly Executive Report</h5>
              <p className="text-sm text-gray-600">Every Monday at 9:00 AM</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Active</span>
              <button className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h5 className="font-medium text-gray-900">Monthly Sponsor Report</h5>
              <p className="text-sm text-gray-600">First day of each month at 10:00 AM</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Active</span>
              <button className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
            </div>
          </div>
          <button className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-600 hover:border-gray-400 hover:text-gray-700">
            + Add New Scheduled Export
          </button>
        </div>
      </div>

      {/* Export Templates */}
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Export Templates</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <h5 className="font-medium text-gray-900 mb-2">Executive Summary</h5>
            <p className="text-sm text-gray-600 mb-3">High-level overview for executives</p>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Use Template
            </button>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h5 className="font-medium text-gray-900 mb-2">Detailed Report</h5>
            <p className="text-sm text-gray-600 mb-3">Comprehensive project analysis</p>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Use Template
            </button>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h5 className="font-medium text-gray-900 mb-2">Dashboard Export</h5>
            <p className="text-sm text-gray-600 mb-3">Visual dashboard with charts</p>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Use Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportExport;
