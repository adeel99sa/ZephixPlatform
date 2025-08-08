import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Interfaces from '../interfaces/document-intelligence.interface';

@Injectable()
export class ZephixIntelligentDocumentProcessor {
  private readonly logger = new Logger(ZephixIntelligentDocumentProcessor.name);
  private readonly anthropicApiKey: string;

  constructor(private configService: ConfigService) {
    this.anthropicApiKey = this.configService.get<string>('anthropic.apiKey');
    if (!this.anthropicApiKey) {
      this.logger.warn('ANTHROPIC_API_KEY not configured');
    }
  }

  // MAIN PROCESSING ENGINE: Document → Professional PM Intelligence
  async processProjectDocument(
    document: Interfaces.ProjectDocument,
    organizationContext: Interfaces.OrganizationContext
  ): Promise<Interfaces.PMDocumentAnalysis> {
    this.logger.log('Processing project document with intelligent analysis');

    try {
      // STEP 1: Extract Standard BRD Components or Document Elements
      const documentAnalysis = await this.extractDocumentElements(document);
      
      // STEP 2: Apply Professional PM Framework Analysis
      const pmAnalysis = await this.applyPMFramework(documentAnalysis, document);
      
      // STEP 3: Analyze People, Process, Business Dimensions
      const dimensionAnalysis = await this.performDimensionAnalysis(pmAnalysis);
      
      // STEP 4: Methodology Recommendation Based on Project Characteristics
      const methodologyRec = await this.recommendMethodology(dimensionAnalysis, organizationContext);
      
      return {
        peopleAnalysis: dimensionAnalysis.people,
        processAnalysis: dimensionAnalysis.process,
        businessAnalysis: dimensionAnalysis.business,
        methodologyAnalysis: methodologyRec
      };
    } catch (error) {
      this.logger.error('Error processing project document:', error);
      throw error;
    }
  }

  // STEP 1: Document Element Extraction
  private async extractDocumentElements(document: Interfaces.ProjectDocument): Promise<Interfaces.BRDAnalysis> {
    const prompt = `
    You are an expert project manager analyzing a project document. Extract key project elements:
    
    PROJECT DOCUMENT ANALYSIS:
    
    1. EXECUTIVE SUMMARY:
       - Business justification and strategic value
       - Expected outcomes and benefits
       - Executive sponsorship and support
    
    2. PROJECT OBJECTIVES:
       - Business goals and objectives
       - Technical objectives
       - Success criteria and KPIs
       - Measurable outcomes
    
    3. PROJECT SCOPE:
       - What is included in the project
       - What is explicitly excluded
       - Key assumptions
       - Project boundaries
    
    4. REQUIREMENTS:
       - Functional requirements (what the system/solution must do)
       - Non-functional requirements (performance, security, etc.)
       - Business rules and policies
       - Acceptance criteria
    
    5. STAKEHOLDERS:
       - Project sponsors and decision makers
       - Business users and customers
       - Technical team members
       - External parties and vendors
    
    6. CONSTRAINTS:
       - Time limitations and deadlines
       - Budget limitations
       - Resource constraints
       - Technical constraints
       - Regulatory or compliance constraints
    
    7. FINANCIAL ANALYSIS:
       - Implementation costs
       - Operational costs
       - Expected benefits and ROI
       - Financial risks
    
    Document Content: ${document.content}
    Document Type: ${document.type}
    
    Extract these elements and provide structured analysis in JSON format.
    Focus on actionable project management insights.
    `;
    
    return await this.callAIIntelligenceEngine(prompt);
  }

  // STEP 2: Professional PM Framework Analysis
  private async applyPMFramework(
    documentAnalysis: Interfaces.BRDAnalysis, 
    document: Interfaces.ProjectDocument
  ): Promise<Interfaces.PMFrameworkAnalysis> {
    const prompt = `
    Apply professional project management analysis to this project:
    
    PROJECT MANAGEMENT AREAS TO ANALYZE:
    
    1. PROJECT INTEGRATION:
       - How do different project components connect?
       - What coordination is needed across work streams?
       - Change management approach needed?
    
    2. SCOPE MANAGEMENT:
       - Work breakdown structure recommendations
       - Scope validation and control approach
       - Deliverable management strategy
    
    3. TIME MANAGEMENT:
       - Key activities and milestones
       - Dependencies and sequencing
       - Critical path considerations
       - Schedule risk factors
    
    4. COST MANAGEMENT:
       - Cost estimation approach
       - Budget planning and control
       - Financial risk management
    
    5. QUALITY MANAGEMENT:
       - Quality requirements and standards
       - Quality assurance approach
       - Quality control measures
    
    6. RESOURCE MANAGEMENT:
       - Team composition and skills needed
       - Resource acquisition strategy
       - Resource optimization opportunities
    
    7. COMMUNICATIONS:
       - Communication planning needs
       - Stakeholder engagement strategy
       - Reporting requirements
    
    8. RISK MANAGEMENT:
       - Risk identification and assessment
       - Risk mitigation strategies
       - Risk monitoring approach
    
    9. PROCUREMENT:
       - Vendor and supplier needs
       - Contract management requirements
       - Make vs buy decisions
    
    Document Analysis: ${JSON.stringify(documentAnalysis)}
    
    Provide professional PM recommendations for each area.
    `;
    
    return await this.callAIIntelligenceEngine(prompt);
  }

  // STEP 3: Multi-Dimensional Analysis
  private async performDimensionAnalysis(pmAnalysis: Interfaces.PMFrameworkAnalysis): Promise<Interfaces.DimensionAnalysis> {
    const prompt = `
    Analyze this project across three key dimensions:
    
    PEOPLE DIMENSION:
    - Leadership requirements and challenges
    - Team building and development needs
    - Stakeholder engagement strategy
    - Communication and collaboration needs
    - Conflict resolution considerations
    - Organizational change management
    
    PROCESS DIMENSION:
    - Project lifecycle and methodology fit
    - Planning and execution approach
    - Monitoring and control mechanisms
    - Risk and issue management processes
    - Quality assurance processes
    - Change control procedures
    
    BUSINESS DIMENSION:
    - Business value delivery approach
    - Organizational impact assessment
    - Compliance and governance needs
    - External environment factors
    - Strategic alignment considerations
    - Benefits realization planning
    
    PM Analysis Input: ${JSON.stringify(pmAnalysis)}
    
    Provide dimension-specific insights and recommendations.
    `;
    
    return await this.callAIIntelligenceEngine(prompt);
  }

  // STEP 4: Methodology Recommendation
  private async recommendMethodology(
    dimensionAnalysis: Interfaces.DimensionAnalysis,
    orgContext: Interfaces.OrganizationContext
  ): Promise<Interfaces.MethodologyRecommendation> {
    const prompt = `
    Recommend the optimal project management approach based on project characteristics:
    
    PLAN-DRIVEN APPROACH INDICATORS:
    - Requirements are well-defined and stable
    - Low frequency of expected changes
    - Regulatory or compliance-heavy environment
    - Traditional organizational structure
    - Physical deliverables or construction projects
    - Clear sequential dependencies
    
    AGILE APPROACH INDICATORS:
    - Requirements are evolving or uncertain
    - High frequency of expected changes
    - Innovation and experimentation focus
    - Collaborative organizational culture
    - Software or digital product development
    - Customer feedback loops are critical
    - Early value delivery is important
    
    HYBRID APPROACH INDICATORS:
    - Mixed requirement stability
    - Some well-defined components, others emerging
    - Regulatory requirements combined with innovation
    - Large, complex projects with multiple work streams
    - Need for both predictability and adaptability
    
    METHODOLOGY SELECTION FACTORS:
    - Project complexity and size
    - Organizational culture and maturity
    - Stakeholder preferences and expectations
    - Team capabilities and experience
    - Industry and regulatory environment
    - Timeline and budget constraints
    
    Analysis Input: ${JSON.stringify(dimensionAnalysis)}
    Organization Context: ${JSON.stringify(orgContext)}
    
    Provide specific methodology recommendation with implementation guidance.
    `;
    
    return await this.callAIIntelligenceEngine(prompt);
  }

  // Professional AI Engine (No Copyrighted Content)
  private async callAIIntelligenceEngine(prompt: string): Promise<any> {
    if (!this.anthropicApiKey) {
      this.logger.error('ANTHROPIC_API_KEY not configured');
      throw new Error('AI service not configured');
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.anthropicApiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: `${prompt}
            
            IMPORTANT: You are a professional project management expert with knowledge of:
            - Industry standard project management practices
            - Public PMI frameworks and methodologies
            - Real-world project management experience
            - Both traditional and agile project approaches
            - Enterprise project management best practices
            
            Base recommendations on established industry practices and professional experience.
            Provide actionable, practical insights that can be implemented immediately.
            
            Return your response as valid JSON that can be parsed directly.`
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`AI API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.content || !data.content[0] || !data.content[0].text) {
        throw new Error('Invalid response format from AI service');
      }

      const content = data.content[0].text;
      
      try {
        return JSON.parse(content);
      } catch (parseError) {
        this.logger.error('Failed to parse AI response as JSON:', parseError);
        this.logger.debug('Raw AI response:', content);
        
        // Fallback: try to extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        
        throw new Error('AI response could not be parsed as JSON');
      }
    } catch (error) {
      this.logger.error('Error calling AI intelligence engine:', error);
      throw error;
    }
  }

  // Utility method to extract file content
  async extractFileContent(file: Express.Multer.File): Promise<string> {
    try {
      if (file.mimetype === 'text/plain' || file.mimetype === 'text/markdown') {
        return file.buffer.toString('utf-8');
      }
      
      // For other file types, you might need additional processing
      // This is a simplified version - in production you'd want proper file parsing
      return file.buffer.toString('utf-8');
    } catch (error) {
      this.logger.error('Error extracting file content:', error);
      throw new Error('Failed to extract file content');
    }
  }

  // Utility method to detect document type from filename
  detectDocumentType(filename: string): Interfaces.ProjectDocument['type'] {
    const lowerFilename = filename.toLowerCase();
    
    if (lowerFilename.includes('brd') || lowerFilename.includes('business_requirements')) {
      return 'BRD';
    } else if (lowerFilename.includes('charter') || lowerFilename.includes('project_charter')) {
      return 'PROJECT_CHARTER';
    } else if (lowerFilename.includes('requirements') || lowerFilename.includes('req')) {
      return 'REQUIREMENTS';
    } else if (lowerFilename.includes('technical') || lowerFilename.includes('spec')) {
      return 'TECHNICAL_SPEC';
    } else if (lowerFilename.includes('meeting') || lowerFilename.includes('notes')) {
      return 'MEETING_NOTES';
    } else {
      return 'OTHER';
    }
  }

  // Method to process document upload
  async processDocumentUpload(
    file: Express.Multer.File,
    documentType: Interfaces.ProjectDocument['type'],
    organizationContext: Interfaces.OrganizationContext
  ): Promise<Interfaces.DocumentUploadResponse> {
    const startTime = Date.now();
    
    try {
      const fileContent = await this.extractFileContent(file);
      
      const document: Interfaces.ProjectDocument = {
        type: documentType,
        content: fileContent,
        metadata: {
          source: file.originalname,
          uploadDate: new Date(),
          fileSize: file.size,
          mimeType: file.mimetype
        }
      };

      const analysis = await this.processProjectDocument(document, organizationContext);
      const processingTime = Date.now() - startTime;

      return {
        success: true,
        documentId: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        analysis,
        processingTime,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Error processing document upload:', error);
      throw error;
    }
  }
}
