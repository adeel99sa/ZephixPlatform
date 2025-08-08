import React, { useState, useRef } from 'react';
import { Upload, FileText, Building, Users, Target, AlertTriangle } from 'lucide-react';

interface DocumentUploadProps {
  onAnalysisComplete: (file: File, type: string, orgContext: any) => void;
  loading: boolean;
  error: string | null;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({ onAnalysisComplete, loading, error }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>('BRD');
  const [organizationContext, setOrganizationContext] = useState({
    industry: '',
    companySize: '',
    projectComplexity: 'medium',
    teamSize: '',
    budget: '',
    timeline: '',
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const documentTypes = [
    { value: 'BRD', label: 'Business Requirements Document', description: 'Detailed business requirements and specifications' },
    { value: 'Charter', label: 'Project Charter', description: 'High-level project authorization document' },
    { value: 'SOW', label: 'Statement of Work', description: 'Detailed scope and deliverables' },
    { value: 'Proposal', label: 'Project Proposal', description: 'Project proposal and justification' },
    { value: 'RFP', label: 'Request for Proposal', description: 'Requirements and evaluation criteria' },
  ];

  const companySizes = [
    { value: 'startup', label: 'Startup (1-50 employees)' },
    { value: 'small', label: 'Small Business (51-200 employees)' },
    { value: 'medium', label: 'Medium Business (201-1000 employees)' },
    { value: 'large', label: 'Large Enterprise (1000+ employees)' },
  ];

  const projectComplexities = [
    { value: 'low', label: 'Low Complexity', description: 'Simple, well-defined projects' },
    { value: 'medium', label: 'Medium Complexity', description: 'Moderate complexity with some unknowns' },
    { value: 'high', label: 'High Complexity', description: 'Complex projects with many unknowns' },
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (selectedFile && documentType) {
      onAnalysisComplete(selectedFile, documentType, organizationContext);
    }
  };

  const handleContextChange = (field: string, value: string) => {
    setOrganizationContext(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center mb-8">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 mb-4">
            <Upload className="h-6 w-6 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Project Document</h2>
          <p className="text-gray-600">
            Upload your project document and we'll analyze it to create a comprehensive project initiation package.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Document Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Document Type
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {documentTypes.map((type) => (
                <label
                  key={type.value}
                  className={`relative flex cursor-pointer rounded-lg border p-4 ${
                    documentType === type.value
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-300 bg-white hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="documentType"
                    value={type.value}
                    checked={documentType === type.value}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className="sr-only"
                  />
                  <div className="flex w-full items-center justify-between">
                    <div className="flex items-center">
                      <div className="text-sm">
                        <p className="font-medium text-gray-900">{type.label}</p>
                        <p className="text-gray-500">{type.description}</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-indigo-600">
                      {documentType === type.value && (
                        <FileText className="h-5 w-5" />
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Upload Document
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center ${
                selectedFile
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-300 hover:border-indigo-400'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {selectedFile ? (
                <div className="space-y-2">
                  <FileText className="mx-auto h-12 w-12 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-indigo-600 hover:text-indigo-800 underline"
                      >
                        Click to upload
                      </button>{' '}
                      or drag and drop
                    </p>
                    <p className="text-sm text-gray-500">
                      PDF, DOC, DOCX, or TXT files up to 10MB
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Organization Context */}
          <div>
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center">
                <Building className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-sm font-medium text-gray-700">
                  Organization Context (Optional)
                </span>
              </div>
              <span className="text-sm text-gray-500">
                {isExpanded ? 'Hide' : 'Show'} details
              </span>
            </button>

            {isExpanded && (
              <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Industry
                    </label>
                    <input
                      type="text"
                      value={organizationContext.industry}
                      onChange={(e) => handleContextChange('industry', e.target.value)}
                      placeholder="e.g., Technology, Healthcare, Finance"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Size
                    </label>
                    <select
                      value={organizationContext.companySize}
                      onChange={(e) => handleContextChange('companySize', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select company size</option>
                      {companySizes.map((size) => (
                        <option key={size.value} value={size.value}>
                          {size.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project Complexity
                    </label>
                    <select
                      value={organizationContext.projectComplexity}
                      onChange={(e) => handleContextChange('projectComplexity', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {projectComplexities.map((complexity) => (
                        <option key={complexity.value} value={complexity.value}>
                          {complexity.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expected Team Size
                    </label>
                    <input
                      type="text"
                      value={organizationContext.teamSize}
                      onChange={(e) => handleContextChange('teamSize', e.target.value)}
                      placeholder="e.g., 5-10 people"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Budget Range
                    </label>
                    <input
                      type="text"
                      value={organizationContext.budget}
                      onChange={(e) => handleContextChange('budget', e.target.value)}
                      placeholder="e.g., $100K - $500K"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Timeline
                    </label>
                    <input
                      type="text"
                      value={organizationContext.timeline}
                      onChange={(e) => handleContextChange('timeline', e.target.value)}
                      placeholder="e.g., 6-12 months"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!selectedFile || loading}
              className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white ${
                !selectedFile || loading
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
              }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Analyzing Document...
                </>
              ) : (
                <>
                  <Target className="h-5 w-5 mr-2" />
                  Analyze Document
                </>
              )}
            </button>
          </div>
        </form>

        {/* Information Panel */}
        <div className="mt-8 bg-blue-50 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                What happens next?
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>AI will analyze your document and extract key project information</li>
                  <li>Generate a comprehensive project charter with objectives and scope</li>
                  <li>Identify stakeholders and create RACI matrices</li>
                  <li>Assess risks and create response strategies</li>
                  <li>Build a work breakdown structure (WBS)</li>
                  <li>Provide methodology and team size recommendations</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentUpload;
