import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { brdApi } from '../../services/api';
import type { BRD, BRDAnalysisResult } from '../../types/brd.types';

export const BRDDetails: React.FC = () => {
  const { brdId } = useParams<{ brdId: string }>();
  const navigate = useNavigate();
  const [brd, setBrd] = useState<BRD | null>(null);
  const [analysis, setAnalysis] = useState<BRDAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (brdId) {
      loadBRDDetails();
    }
  }, [brdId]);

  const loadBRDDetails = async () => {
    try {
      setIsLoading(true);
      const [brdData, analysisData] = await Promise.all([
        brdApi.getBRD(brdId!),
        brdApi.getBRDAnalysis(brdId!).catch(() => null)
      ]);
      setBrd(brdData);
      setAnalysis(analysisData);
    } catch (error) {
      toast.error('Failed to load BRD details');
      console.error('Error loading BRD details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateProjectPlan = () => {
    navigate(`/brd/${brdId}/project-planning`);
  };

  const handleEditBRD = () => {
    // TODO: Implement BRD editing functionality
    toast.info('BRD editing coming soon');
  };

  const handleDeleteBRD = async () => {
    if (!brd || !window.confirm('Are you sure you want to delete this BRD?')) {
      return;
    }

    try {
      await brdApi.deleteBRD(brd.id);
      toast.success('BRD deleted successfully');
      navigate('/brd/upload');
    } catch (error) {
      toast.error('Failed to delete BRD');
      console.error('Error deleting BRD:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading BRD details...</p>
        </div>
      </div>
    );
  }

  if (!brd) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">BRD Not Found</h1>
          <p className="text-gray-600 mb-6">The requested BRD could not be found.</p>
          <button
            onClick={() => navigate('/brd/upload')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
          >
            Go to BRD Upload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{brd.getTitle()}</h1>
              <p className="mt-2 text-gray-600">
                Business Requirements Document • Version {brd.version}
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleEditBRD}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Edit BRD
              </button>
              <button
                onClick={handleDeleteBRD}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="mb-6">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            brd.status === 'approved' ? 'bg-green-100 text-green-800' :
            brd.status === 'in_review' ? 'bg-yellow-100 text-yellow-800' :
            brd.status === 'published' ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {brd.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        {/* BRD Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Summary */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Summary</h2>
              <p className="text-gray-700">{brd.getSummary() || 'No summary available'}</p>
            </div>

            {/* Business Context */}
            {brd.payload?.businessContext && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Business Context</h2>
                <div className="space-y-4">
                  {brd.payload.businessContext.industry && (
                    <div>
                      <span className="font-medium text-gray-700">Industry:</span>
                      <span className="ml-2 text-gray-600">{brd.payload.businessContext.industry}</span>
                    </div>
                  )}
                  {brd.payload.businessContext.department && (
                    <div>
                      <span className="font-medium text-gray-700">Department:</span>
                      <span className="ml-2 text-gray-600">{brd.payload.businessContext.department}</span>
                    </div>
                  )}
                  {brd.payload.businessContext.priority && (
                    <div>
                      <span className="font-medium text-gray-700">Priority:</span>
                      <span className="ml-2 text-gray-600">{brd.payload.businessContext.priority}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Requirements */}
            {brd.payload?.requirements && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Requirements</h2>
                <div className="space-y-3">
                  {Array.isArray(brd.payload.requirements) ? (
                    brd.payload.requirements.map((req: any, index: number) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-indigo-600 rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-gray-700">{req.description || req}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-600">Requirements not available in structured format</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Project Planning Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Planning</h3>
              <p className="text-gray-600 mb-4">
                Generate a comprehensive project plan from this BRD using AI-powered analysis.
              </p>
              <button
                onClick={handleGenerateProjectPlan}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
              >
                Generate Project Plan
              </button>
            </div>

            {/* Analysis Status */}
            {analysis && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Analysis Status</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Analysis Complete:</span>
                    <span className="text-green-600 font-medium">Yes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Confidence Score:</span>
                    <span className="text-gray-900 font-medium">
                      {analysis.confidenceScore ? `${analysis.confidenceScore}%` : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Document Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Created:</span>
                  <span className="text-gray-900">
                    {new Date(brd.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Updated:</span>
                  <span className="text-gray-900">
                    {new Date(brd.updated_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Completion:</span>
                  <span className="text-gray-900">
                    {brd.getCompletionPercentage()}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BRDDetails;
