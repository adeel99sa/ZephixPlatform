import React, { useState, useEffect } from 'react';
import { ArrowLeft, Upload, FileText, Calendar, CheckCircle, Clock, Users, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const SampleBRDPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const steps = [
    {
      title: 'Upload BRD',
      description: 'Upload your Business Requirements Document',
      icon: Upload,
      status: 'pending'
    },
    {
      title: 'AI Analysis',
      description: 'Zephix extracts scope and dependencies',
      icon: FileText,
      status: 'pending'
    },
    {
      title: 'Generate Plan',
      description: 'Create your project timeline',
      icon: Calendar,
      status: 'pending'
    }
  ];

  const sampleBRD = {
    title: 'Sample: Data Migration Project',
    content: `Business Requirements Document

Project: Legacy System Data Migration
Department: IT Operations
Priority: High

1. PROJECT OVERVIEW
   - Migrate data from legacy CRM system to new cloud platform
   - Ensure zero data loss during migration
   - Complete within 8 weeks

2. SCOPE
   - Customer data (50,000+ records)
   - Transaction history (2 years)
   - User accounts and permissions
   - Custom fields and configurations

3. STAKEHOLDERS
   - IT Operations Team
   - Business Analysts
   - End Users (Sales & Support)
   - Compliance Team

4. SUCCESS CRITERIA
   - 100% data integrity
   - <2 hours downtime
   - User training completed
   - Performance benchmarks met

5. CONSTRAINTS
   - Must maintain business continuity
   - Compliance with data regulations
   - Budget: $150,000
   - Team: 6 FTE`,
    estimatedTime: '2-3 minutes',
    extractedItems: [
      '5 core requirements identified',
      '4 stakeholder groups mapped',
      '3 critical dependencies found',
      '8-week timeline estimated'
    ]
  };

  const handleUpload = () => {
    setIsProcessing(true);
    setCurrentStep(1);
    
    // Simulate AI processing
    setTimeout(() => {
      setCurrentStep(2);
      setTimeout(() => {
        setIsComplete(true);
        setIsProcessing(false);
      }, 2000);
    }, 3000);
  };

  const handleStartOver = () => {
    setCurrentStep(0);
    setIsProcessing(false);
    setIsComplete(false);
  };

  useEffect(() => {
    // Analytics tracking
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'page_view', {
        page_title: 'Sample BRD Flow',
        page_location: '/sample-brd'
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Home</span>
            </Link>
            <div className="text-sm text-gray-500">
              Sample BRD Flow • No account required
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Try Zephix with a Sample BRD
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            See how Zephix transforms a Business Requirements Document into a complete project plan in under 3 minutes
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-8">
            {steps.map((step, index) => {
              const IconComponent = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              
              return (
                <div key={index} className="flex items-center">
                  <div className={`flex flex-col items-center space-y-2 ${
                    isActive ? 'text-indigo-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                      isActive 
                        ? 'bg-indigo-100 border-indigo-600' 
                        : isCompleted 
                          ? 'bg-green-100 border-green-600'
                          : 'bg-gray-100 border-gray-300'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        <IconComponent className="w-6 h-6" />
                      )}
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-sm">{step.title}</div>
                      <div className="text-xs opacity-75">{step.description}</div>
                    </div>
                  </div>
                  
                  {index < steps.length - 1 && (
                    <div className={`w-16 h-0.5 mx-4 ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-300'
                    }`}></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sample BRD Display */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{sampleBRD.title}</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>Estimated time: {sampleBRD.estimatedTime}</span>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">{sampleBRD.content}</pre>
          </div>
          
          <div className="flex items-center justify-center">
            <button
              onClick={handleUpload}
              disabled={isProcessing}
              className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? 'Processing...' : 'Upload This BRD'}
            </button>
          </div>
        </div>

        {/* Results Display */}
        {isComplete && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
            <div className="text-center mb-6">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Plan Generated Successfully!</h3>
              <p className="text-gray-600">Your project plan is ready in under 3 minutes</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-3">Extracted Information</h4>
                <ul className="space-y-2">
                  {sampleBRD.extractedItems.map((item, index) => (
                    <li key={index} className="flex items-center text-green-700">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-3">Generated Plan</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-blue-700">Project Duration</span>
                    <span className="font-semibold text-blue-900">8 weeks</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-blue-700">Team Size</span>
                    <span className="font-semibold text-blue-900">6 members</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-blue-700">Budget</span>
                    <span className="font-semibold text-blue-900">$150,000</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-blue-700">Stage Gates</span>
                    <span className="font-semibold text-blue-900">4 phases</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="text-center space-y-4">
              <div className="bg-indigo-50 rounded-lg p-4">
                <p className="text-indigo-700 font-medium">
                  🎯 This is exactly what Zephix does with your real BRDs
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleStartOver}
                  className="border-2 border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Try Another BRD
                </button>
                <Link
                  to="/"
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Get Started with Zephix
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tracking */}
        {isComplete && (
          <div className="text-center text-sm text-gray-500">
            <p>✅ Sample BRD flow completed • Analytics tracked</p>
          </div>
        )}
      </div>
    </div>
  );
};
