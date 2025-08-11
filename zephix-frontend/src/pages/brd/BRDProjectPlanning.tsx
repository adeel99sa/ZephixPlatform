import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { MethodologySelector } from '../../components/brd/MethodologySelector';
import { ProjectPlanResults } from '../../components/brd/ProjectPlanResults';
import { brdApi } from '../../services/api';
import type { BRDAnalysisResult, GeneratedProjectPlan } from '../../types/brd.types';

export const BRDProjectPlanning: React.FC = () => {
  const { brdId } = useParams<{ brdId: string }>();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<BRDAnalysisResult | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedProjectPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'analysis' | 'planning' | 'results'>('analysis');

  useEffect(() => {
    if (brdId) {
      loadBRDAnalysis();
    }
  }, [brdId]);

  const loadBRDAnalysis = async () => {
    try {
      setIsLoading(true);
      const analysisData = await brdApi.getBRDAnalysis(brdId!);
      setAnalysis(analysisData);
      setCurrentStep('planning');
    } catch (error) {
      toast.error('Failed to load BRD analysis');
      console.error('Error loading BRD analysis:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMethodologySelect = async (methodology: string) => {
    if (!brdId || !analysis) return;

    try {
      setIsLoading(true);
      const plan = await brdApi.generateProjectPlan(brdId, { methodology });
      setGeneratedPlan(plan);
      setCurrentStep('results');
      toast.success('Project plan generated successfully!');
    } catch (error) {
      toast.error('Failed to generate project plan');
      console.error('Error generating project plan:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanRefinement = async (refinementRequest: string) => {
    if (!generatedPlan) return;

    try {
      setIsLoading(true);
      const refinedPlan = await brdApi.refinePlan(generatedPlan.id, { refinementRequest });
      setGeneratedPlan(refinedPlan);
      toast.success('Plan refined successfully!');
    } catch (error) {
      toast.error('Failed to refine plan');
      console.error('Error refining plan:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async (projectData: any) => {
    if (!generatedPlan) return;

    try {
      setIsLoading(true);
      const project = await brdApi.createProjectFromPlan(generatedPlan.id, projectData);
      toast.success('Project created successfully!');
      navigate(`/projects/${project.id}/status`);
    } catch (error) {
      toast.error('Failed to create project');
      console.error('Error creating project:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Processing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">BRD Project Planning</h1>
          <p className="mt-2 text-gray-600">
            Transform your Business Requirements Document into a comprehensive project plan
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            <div className={`flex items-center ${currentStep === 'analysis' ? 'text-indigo-600' : 'text-gray-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 'analysis' ? 'bg-indigo-600 text-white' : 'bg-gray-200'
              }`}>
                1
              </div>
              <span className="ml-2 font-medium">Analysis</span>
            </div>
            <div className={`flex items-center ${currentStep === 'planning' ? 'text-indigo-600' : 'text-gray-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 'planning' ? 'bg-indigo-600 text-white' : 'bg-gray-200'
              }`}>
                2
              </div>
              <span className="ml-2 font-medium">Planning</span>
            </div>
            <div className={`flex items-center ${currentStep === 'results' ? 'text-indigo-600' : 'text-gray-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 'results' ? 'bg-indigo-600 text-white' : 'bg-gray-200'
              }`}>
                3
              </div>
              <span className="ml-2 font-medium">Results</span>
            </div>
          </nav>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow">
          {currentStep === 'analysis' && (
            <div className="p-6">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Analyzing your BRD...</p>
              </div>
            </div>
          )}

          {currentStep === 'planning' && analysis && (
            <div className="p-6">
              <MethodologySelector
                analysis={analysis}
                onMethodologySelect={handleMethodologySelect}
              />
            </div>
          )}

          {currentStep === 'results' && generatedPlan && (
            <div className="p-6">
              <ProjectPlanResults
                plan={generatedPlan}
                onRefine={handlePlanRefinement}
                onCreateProject={handleCreateProject}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BRDProjectPlanning;
