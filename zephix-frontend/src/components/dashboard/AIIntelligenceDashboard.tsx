import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Zap, 
  Target, 
  TrendingUp, 
  Users, 
  FileText, 
  Calendar, 
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  BarChart3,
  Lightbulb,
  ArrowRight,
  Play,
  Settings,
  BookOpen,
  MessageSquare,
  Shield,
  Activity
} from 'lucide-react';

interface AIIntelligenceDashboardProps {
  projectId?: string;
}

interface AIInsights {
  projectType: string;
  complexityFactors: {
    stakeholderCount: number;
    technicalComponents: string[];
    regulatoryRequirements: string[];
    timeConstraints: string;
    resourceConstraints: string;
  };
  suggestedMethodology: string;
  identifiedRisks: Array<{
    patternName: string;
    probability: number;
    impact: string;
    mitigationStrategy: string;
  }>;
  aiInsights: {
    potentialBottlenecks: string[];
    resourceOptimization: string[];
    qualityCheckpoints: string[];
    successPredictors: string[];
  };
}

interface AICapabilities {
  capabilities: string[];
  advantages: string[];
  uniqueFeatures: string[];
  competitiveAdvantages: string[];
}

interface AIValuePropositions {
  competitorLimitations: string[];
  zephixAdvantages: string[];
  businessImpact: string[];
  roiMetrics: string[];
}

export const AIIntelligenceDashboard: React.FC<AIIntelligenceDashboardProps> = ({ projectId }) => {
  const [aiInsights, setAiInsights] = useState<AIInsights | null>(null);
  const [aiCapabilities, setAiCapabilities] = useState<AICapabilities | null>(null);
  const [aiValuePropositions, setAiValuePropositions] = useState<AIValuePropositions | null>(null);
  const [activeTab, setActiveTab] = useState<'insights' | 'capabilities' | 'value'>('insights');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAIData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch AI insights
        const insightsResponse = await fetch(`/api/ai-intelligence/project-insights/${projectId || 'demo'}`);
        const insights = await insightsResponse.json();
        setAiInsights(insights.aiInsights);

        // Fetch AI capabilities
        const capabilitiesResponse = await fetch('/api/ai-intelligence/ai-capabilities');
        const capabilities = await capabilitiesResponse.json();
        setAiCapabilities(capabilities);

        // Fetch AI value propositions
        const valueResponse = await fetch('/api/ai-intelligence/ai-value-propositions');
        const value = await valueResponse.json();
        setAiValuePropositions(value);
      } catch (error) {
        console.error('Error fetching AI data:', error);
        // Set demo data for showcase
        setDemoData();
      } finally {
        setIsLoading(false);
      }
    };

    fetchAIData();
  }, [projectId]);

  const setDemoData = () => {
    setAiInsights({
      projectType: 'software_development',
      complexityFactors: {
        stakeholderCount: 8,
        technicalComponents: ['API', 'Database', 'Frontend', 'Cloud Infrastructure'],
        regulatoryRequirements: ['GDPR Compliance'],
        timeConstraints: 'aggressive',
        resourceConstraints: 'adequate',
      },
      suggestedMethodology: 'agile',
      identifiedRisks: [
        {
          patternName: 'Technical Complexity Risk',
          probability: 0.7,
          impact: 'high',
          mitigationStrategy: 'Implement technical feasibility study and proof of concept',
        },
        {
          patternName: 'Stakeholder Resistance Risk',
          probability: 0.6,
          impact: 'medium',
          mitigationStrategy: 'Enhanced stakeholder engagement and communication plan',
        },
      ],
      aiInsights: {
        potentialBottlenecks: ['Technical integration challenges', 'Stakeholder communication complexity'],
        resourceOptimization: ['Implement skill-based task assignment', 'Establish stakeholder communication matrix'],
        qualityCheckpoints: ['Code review completion', 'Unit testing coverage', 'Integration testing'],
        successPredictors: ['Clear project objectives', 'Strong stakeholder engagement', 'Technical expertise availability'],
      },
    });

    setAiCapabilities({
      capabilities: [
        'Automatic project classification and methodology recommendation',
        'Intelligent document processing with conflict detection',
        'Adaptive project planning with dynamic template generation',
        'Predictive project health monitoring with early warning system',
        'Intelligent resource optimization with skill gap analysis',
        'Adaptive communication intelligence with stakeholder-specific messaging',
        'Continuous learning engine with pattern recognition',
        'Multi-project portfolio intelligence and optimization',
        'Cross-project knowledge transfer and learning',
        'Predictive stakeholder behavior analysis',
      ],
      advantages: [
        'Learns from every project to improve future recommendations',
        'Adapts to organization culture and constraints',
        'Provides reasoning for all AI suggestions',
        'Handles ANY project type, not just predefined templates',
        'Predicts problems before they happen',
        'Optimizes resources across multiple projects simultaneously',
        'Generates personalized communication for each stakeholder',
        'Continuously improves based on project outcomes',
      ],
      uniqueFeatures: [
        'Infinite adaptive intelligence that learns your organization',
        'Predictive project intelligence that prevents problems',
        'Dynamic project planning that adapts to your specific context',
        'Multi-project portfolio optimization',
        'Cross-project learning and knowledge transfer',
        'Predictive stakeholder management',
        'Intelligent constraint handling with creative solutions',
        'Adaptive methodology blending based on project needs',
      ],
      competitiveAdvantages: [
        'Beyond static templates - truly adaptive intelligence',
        'Beyond basic automation - predictive problem prevention',
        'Beyond one-size-fits-all - organization-specific learning',
        'Beyond task management - comprehensive project intelligence',
        'Beyond manual planning - AI-powered optimization',
        'Beyond basic reporting - intelligent insights and recommendations',
        'Beyond isolated projects - portfolio-level intelligence',
        'Beyond current state - predictive future state analysis',
      ],
    });

    setAiValuePropositions({
      competitorLimitations: [
        'ClickUp AI: "100+ static prompts"',
        'Monday.com: "Basic automation rules"',
        'Generic PM Tools: "One-size-fits-all templates"',
        'Traditional PM Software: "Manual planning and reporting"',
        'Basic AI Tools: "Limited to specific project types"',
      ],
      zephixAdvantages: [
        'Zephix: "Infinite adaptive intelligence that learns your organization"',
        'Zephix: "Predictive project intelligence that prevents problems"',
        'Zephix: "Dynamic project planning that adapts to your specific context"',
        'Zephix: "AI-powered optimization and intelligent insights"',
        'Zephix: "Comprehensive project intelligence for ANY project type"',
      ],
      businessImpact: [
        '65% reduction in project planning time',
        '40% improvement in project success rate',
        '30% reduction in resource conflicts',
        '50% faster stakeholder communication',
        '25% improvement in budget accuracy',
        '35% reduction in project delays',
      ],
      roiMetrics: [
        'Time savings: 20+ hours per project',
        'Cost savings: 15-25% through optimization',
        'Risk reduction: 60% fewer project failures',
        'Quality improvement: 40% fewer rework cycles',
        'Stakeholder satisfaction: 85% improvement',
        'Resource utilization: 30% more efficient',
      ],
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-400 mx-auto mb-4"></div>
          <p className="text-slate-300 text-lg">Loading AI Intelligence Engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
      {/* Header */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Brain className="w-8 h-8 text-indigo-400" />
            <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-white via-blue-100 to-indigo-200 bg-clip-text text-transparent">
              Zephix AI Intelligence Engine
            </h1>
          </div>
          <p className="text-xl text-slate-300 mb-6">
            Adaptive Project Learning System - Beyond Static Templates
          </p>
          <div className="flex items-center justify-center space-x-4 text-slate-400">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4" />
              <span>Real-time Analysis</span>
            </div>
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4" />
              <span>Continuous Learning</span>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4" />
              <span>Predictive Intelligence</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-1">
            <div className="flex space-x-1">
              {[
                { id: 'insights', label: 'AI Insights', icon: Brain },
                { id: 'capabilities', label: 'AI Capabilities', icon: Zap },
                { id: 'value', label: 'Value Propositions', icon: Target },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pb-20">
        {activeTab === 'insights' && aiInsights && (
          <div className="space-y-8">
            {/* Project Intelligence Overview */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8">
              <div className="flex items-center space-x-3 mb-6">
                <Brain className="w-6 h-6 text-indigo-400" />
                <h2 className="text-2xl font-bold text-white">Project Intelligence Analysis</h2>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white/5 rounded-xl p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <Target className="w-5 h-5 text-green-400" />
                    <h3 className="text-lg font-semibold text-white">Project Type</h3>
                  </div>
                  <p className="text-slate-300 capitalize">{aiInsights.projectType.replace('_', ' ')}</p>
                </div>

                <div className="bg-white/5 rounded-xl p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <Users className="w-5 h-5 text-blue-400" />
                    <h3 className="text-lg font-semibold text-white">Stakeholders</h3>
                  </div>
                  <p className="text-slate-300">{aiInsights.complexityFactors.stakeholderCount} identified</p>
                </div>

                <div className="bg-white/5 rounded-xl p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <Settings className="w-5 h-5 text-purple-400" />
                    <h3 className="text-lg font-semibold text-white">Methodology</h3>
                  </div>
                  <p className="text-slate-300 capitalize">{aiInsights.suggestedMethodology}</p>
                </div>
              </div>
            </div>

            {/* Complexity Factors */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8">
              <div className="flex items-center space-x-3 mb-6">
                <BarChart3 className="w-6 h-6 text-indigo-400" />
                <h2 className="text-2xl font-bold text-white">Complexity Assessment</h2>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Technical Components</h3>
                  <div className="space-y-2">
                    {aiInsights.complexityFactors.technicalComponents.map((component, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                        <span className="text-slate-300">{component}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Constraints</h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-yellow-400" />
                      <span className="text-slate-300 capitalize">Time: {aiInsights.complexityFactors.timeConstraints}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-green-400" />
                      <span className="text-slate-300 capitalize">Resources: {aiInsights.complexityFactors.resourceConstraints}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Risk Analysis */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8">
              <div className="flex items-center space-x-3 mb-6">
                <AlertTriangle className="w-6 h-6 text-red-400" />
                <h2 className="text-2xl font-bold text-white">AI Risk Analysis</h2>
              </div>
              
              <div className="space-y-4">
                {aiInsights.identifiedRisks.map((risk, index) => (
                  <div key={index} className="bg-white/5 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">{risk.patternName}</h3>
                      <div className="flex items-center space-x-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          risk.impact === 'high' ? 'bg-red-500/20 text-red-400' :
                          risk.impact === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          {risk.impact} impact
                        </span>
                        <span className="text-slate-400 text-sm">
                          {(risk.probability * 100).toFixed(0)}% probability
                        </span>
                      </div>
                    </div>
                    <p className="text-slate-300">{risk.mitigationStrategy}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Insights */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8">
              <div className="flex items-center space-x-3 mb-6">
                <Lightbulb className="w-6 h-6 text-yellow-400" />
                <h2 className="text-2xl font-bold text-white">AI-Generated Insights</h2>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span>Potential Bottlenecks</span>
                  </h3>
                  <div className="space-y-2">
                    {aiInsights.aiInsights.potentialBottlenecks.map((bottleneck, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                        <span className="text-slate-300">{bottleneck}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>Success Predictors</span>
                  </h3>
                  <div className="space-y-2">
                    {aiInsights.aiInsights.successPredictors.map((predictor, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span className="text-slate-300">{predictor}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'capabilities' && aiCapabilities && (
          <div className="space-y-8">
            {/* Core Capabilities */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8">
              <div className="flex items-center space-x-3 mb-6">
                <Zap className="w-6 h-6 text-indigo-400" />
                <h2 className="text-2xl font-bold text-white">Core AI Capabilities</h2>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                {aiCapabilities.capabilities.map((capability, index) => (
                  <div key={index} className="bg-white/5 rounded-xl p-6">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-indigo-400 rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-slate-300">{capability}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Unique Features */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8">
              <div className="flex items-center space-x-3 mb-6">
                <Target className="w-6 h-6 text-green-400" />
                <h2 className="text-2xl font-bold text-white">Unique Features</h2>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                {aiCapabilities.uniqueFeatures.map((feature, index) => (
                  <div key={index} className="bg-white/5 rounded-xl p-6">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-slate-300">{feature}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Competitive Advantages */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8">
              <div className="flex items-center space-x-3 mb-6">
                <TrendingUp className="w-6 h-6 text-purple-400" />
                <h2 className="text-2xl font-bold text-white">Competitive Advantages</h2>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                {aiCapabilities.competitiveAdvantages.map((advantage, index) => (
                  <div key={index} className="bg-white/5 rounded-xl p-6">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-slate-300">{advantage}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'value' && aiValuePropositions && (
          <div className="space-y-8">
            {/* Competitor Comparison */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8">
              <div className="flex items-center space-x-3 mb-6">
                <BarChart3 className="w-6 h-6 text-indigo-400" />
                <h2 className="text-2xl font-bold text-white">Competitor Comparison</h2>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-red-400 mb-4">Competitor Limitations</h3>
                  <div className="space-y-3">
                    {aiValuePropositions.competitorLimitations.map((limitation, index) => (
                      <div key={index} className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0"></div>
                          <p className="text-slate-300">{limitation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-green-400 mb-4">Zephix Advantages</h3>
                  <div className="space-y-3">
                    {aiValuePropositions.zephixAdvantages.map((advantage, index) => (
                      <div key={index} className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                          <p className="text-slate-300">{advantage}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Business Impact */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8">
              <div className="flex items-center space-x-3 mb-6">
                <TrendingUp className="w-6 h-6 text-green-400" />
                <h2 className="text-2xl font-bold text-white">Business Impact</h2>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {aiValuePropositions.businessImpact.map((impact, index) => (
                  <div key={index} className="bg-white/5 rounded-xl p-6">
                    <div className="flex items-center space-x-3 mb-3">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <h3 className="text-lg font-semibold text-white">Impact #{index + 1}</h3>
                    </div>
                    <p className="text-slate-300">{impact}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ROI Metrics */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8">
              <div className="flex items-center space-x-3 mb-6">
                <DollarSign className="w-6 h-6 text-yellow-400" />
                <h2 className="text-2xl font-bold text-white">ROI Metrics</h2>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {aiValuePropositions.roiMetrics.map((metric, index) => (
                  <div key={index} className="bg-white/5 rounded-xl p-6">
                    <div className="flex items-center space-x-3 mb-3">
                      <BarChart3 className="w-5 h-5 text-yellow-400" />
                      <h3 className="text-lg font-semibold text-white">Metric #{index + 1}</h3>
                    </div>
                    <p className="text-slate-300">{metric}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Call to Action */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pb-20">
        <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 backdrop-blur-md border border-white/10 rounded-2xl p-8 text-center">
          <h3 className="text-2xl font-bold text-white mb-4">
            Experience the Future of Project Management
          </h3>
          <p className="text-slate-300 mb-6 max-w-2xl mx-auto">
            Join the revolution in project management with AI intelligence that learns, adapts, and optimizes for your organization's unique needs.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <button className="group bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-2xl hover:shadow-indigo-500/25 active:scale-95">
              <div className="flex items-center space-x-3">
                <Play className="w-5 h-5" />
                <span>Start Free Trial</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
            <button className="group flex items-center space-x-2 text-slate-300 hover:text-white transition-colors">
              <BookOpen className="w-5 h-5" />
              <span>Learn More</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
