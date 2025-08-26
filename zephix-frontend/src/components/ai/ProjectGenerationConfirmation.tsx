import React from 'react';

interface ProjectGenerationConfirmationProps {
  projectId: string | null;
  onViewProject: () => void;
  onStartNew: () => void;
}

export const ProjectGenerationConfirmation: React.FC<ProjectGenerationConfirmationProps> = ({
  projectId,
  onViewProject,
  onStartNew,
}) => {
  return (
    <div className="project-generation-confirmation">
      <div className="max-w-2xl mx-auto text-center">
        {/* Success Icon */}
        <div className="mb-6">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        {/* Success Message */}
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          🎉 Project Plan Generated Successfully!
        </h2>
        
        <p className="text-lg text-gray-600 mb-8">
          Your AI-powered project plan is ready. The system has automatically created tasks, 
          timelines, and resource allocations based on your document requirements.
        </p>

        {/* Project Summary */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8 text-left">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            📋 Generated Project Summary
          </h3>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Project ID:</span>
              <span className="ml-2 text-gray-900 font-mono">{projectId}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Status:</span>
              <span className="ml-2 text-green-600 font-medium">Ready</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Generated:</span>
              <span className="ml-2 text-gray-900">{new Date().toLocaleString()}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Methodology:</span>
              <span className="ml-2 text-gray-900">AI-Optimized</span>
            </div>
          </div>
        </div>

        {/* What's Next */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 text-left">
          <h3 className="text-lg font-medium text-blue-900 mb-4">
            🚀 What's Next?
          </h3>
          
          <div className="space-y-3 text-sm text-blue-800">
            <div className="flex items-start space-x-3">
              <span className="text-blue-600 font-bold">1.</span>
              <span>Review the generated project structure and task breakdown</span>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-blue-600 font-bold">2.</span>
              <span>Assign team members to tasks and set priorities</span>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-blue-600 font-bold">3.</span>
              <span>Customize timelines and dependencies as needed</span>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-blue-600 font-bold">4.</span>
              <span>Start tracking progress with the Kanban board</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onViewProject}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            🎯 View Project Dashboard
          </button>
          
          <button
            onClick={onStartNew}
            className="px-8 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            📄 Process Another Document
          </button>
        </div>

        {/* Additional Features */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl mb-2">📊</div>
            <h4 className="font-medium text-gray-900 mb-2">Progress Tracking</h4>
            <p className="text-sm text-gray-600">
              Monitor project progress with real-time dashboards and automated reporting
            </p>
          </div>
          
          <div className="text-center">
            <div className="text-2xl mb-2">🔄</div>
            <h4 className="font-medium text-gray-900 mb-2">Agile Workflows</h4>
            <p className="text-sm text-gray-600">
              Built-in Scrum and Kanban boards for flexible project management
            </p>
          </div>
          
          <div className="text-center">
            <div className="text-2xl mb-2">📈</div>
            <h4 className="font-medium text-gray-900 mb-2">Analytics</h4>
            <p className="text-sm text-gray-600">
              AI-powered insights and performance metrics to optimize your process
            </p>
          </div>
        </div>

        {/* Help & Support */}
        <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600 text-center">
            Need help? Check out our{' '}
            <a href="/docs" className="text-blue-600 hover:text-blue-800 underline">
              documentation
            </a>{' '}
            or contact{' '}
            <a href="/support" className="text-blue-600 hover:text-blue-800 underline">
              support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};
