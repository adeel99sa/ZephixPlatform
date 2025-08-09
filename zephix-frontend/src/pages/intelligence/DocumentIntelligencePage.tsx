import React from 'react';
import DocumentIntelligence from '../../components/intelligence/DocumentIntelligence';
import { PMDocumentAnalysis } from '../../types/document-intelligence.types';

const DocumentIntelligencePage: React.FC = () => {
  const handleAnalysisComplete = (analysis: PMDocumentAnalysis) => {
    console.log('Document analysis completed:', analysis);
    // You can add additional logic here like saving to store, analytics, etc.
  };

  const handleError = (error: string) => {
    console.error('Document analysis error:', error);
    // You can add error handling logic here like showing notifications, etc.
  };

  return (
    <DocumentIntelligence 
      onAnalysisComplete={handleAnalysisComplete}
      onError={handleError}
    />
  );
};

export default DocumentIntelligencePage;
