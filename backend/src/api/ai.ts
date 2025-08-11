import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/auth';
import { AIService } from '../services/AIService';
import { BRDDocument, Template } from '../models';
import { checkPermission } from '../middleware/permissions';
import { Permission } from '../../shared/types';

const router = Router();
const aiService = new AIService();

// Generate field suggestion
router.post(
  '/suggest-field',
  authMiddleware,
  [
    body('documentId').isUUID(),
    body('fieldId').notEmpty().isString(),
    body('fieldType').notEmpty().isString(),
    body('context').optional().isObject(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { documentId, fieldId, fieldType, context } = req.body;

      // Get document and template
      const document = await BRDDocument.findOne({
        where: {
          id: documentId,
          organizationId: req.user.organizationId,
        },
        include: [Template],
      });

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Check if AI suggestions are enabled
      const template = document.template;
      if (!template.aiSettings?.enableFieldSuggestions) {
        return res.status(400).json({ error: 'AI suggestions not enabled for this template' });
      }

      // Generate suggestion
      const suggestion = await aiService.generateFieldSuggestion(
        fieldId,
        fieldType,
        context || document.data,
        template.industry,
        template.aiSettings.customPrompts?.[fieldId]
      );

      res.json(suggestion);
    } catch (error) {
      console.error('Error generating field suggestion:', error);
      res.status(500).json({ error: 'Failed to generate suggestion' });
    }
  }
);

// Perform risk assessment
router.post(
  '/risk-assessment',
  authMiddleware,
  checkPermission(Permission.VIEW),
  [
    body('documentId').isUUID(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { documentId } = req.body;

      // Get document and template
      const document = await BRDDocument.findOne({
        where: {
          id: documentId,
          organizationId: req.user.organizationId,
        },
        include: [Template],
      });

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const template = document.template;
      if (!template.aiSettings?.enableRiskAssessment) {
        return res.status(400).json({ error: 'Risk assessment not enabled for this template' });
      }

      // Perform risk assessment
      const assessment = await aiService.performRiskAssessment(
        document.data,
        template.industry,
        template.aiSettings.customPrompts?.riskAssessment
      );

      // Save to document
      document.aiAnalysis = {
        ...document.aiAnalysis,
        riskAssessment: assessment,
        generatedAt: new Date(),
      };
      await document.save();

      res.json(assessment);
    } catch (error) {
      console.error('Error performing risk assessment:', error);
      res.status(500).json({ error: 'Failed to perform risk assessment' });
    }
  }
);

// Predict resources
router.post(
  '/predict-resources',
  authMiddleware,
  checkPermission(Permission.VIEW),
  [
    body('documentId').isUUID(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { documentId } = req.body;

      const document = await BRDDocument.findOne({
        where: {
          id: documentId,
          organizationId: req.user.organizationId,
        },
        include: [Template],
      });

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const template = document.template;
      if (!template.aiSettings?.enableResourcePrediction) {
        return res.status(400).json({ error: 'Resource prediction not enabled for this template' });
      }

      // Predict resources
      const prediction = await aiService.predictResources(
        document.data,
        template.industry
      );

      // Save to document
      document.aiAnalysis = {
        ...document.aiAnalysis,
        resourcePrediction: prediction,
        generatedAt: new Date(),
      };
      await document.save();

      res.json(prediction);
    } catch (error) {
      console.error('Error predicting resources:', error);
      res.status(500).json({ error: 'Failed to predict resources' });
    }
  }
);

// Optimize timeline
router.post(
  '/optimize-timeline',
  authMiddleware,
  checkPermission(Permission.VIEW),
  [
    body('documentId').isUUID(),
    body('constraints').optional().isObject(),
    body('constraints.startDate').optional().isISO8601(),
    body('constraints.deadline').optional().isISO8601(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { documentId, constraints } = req.body;

      const document = await BRDDocument.findOne({
        where: {
          id: documentId,
          organizationId: req.user.organizationId,
        },
        include: [Template],
      });

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const template = document.template;
      if (!template.aiSettings?.enableTimelineOptimization) {
        return res.status(400).json({ error: 'Timeline optimization not enabled for this template' });
      }

      // Optimize timeline
      const optimization = await aiService.optimizeTimeline(
        document.data,
        constraints
      );

      // Save to document
      document.aiAnalysis = {
        ...document.aiAnalysis,
        timelineOptimization: optimization,
        generatedAt: new Date(),
      };
      await document.save();

      res.json(optimization);
    } catch (error) {
      console.error('Error optimizing timeline:', error);
      res.status(500).json({ error: 'Failed to optimize timeline' });
    }
  }
);

// Analyze integration complexity
router.post(
  '/integration-complexity',
  authMiddleware,
  checkPermission(Permission.VIEW),
  [
    body('documentId').isUUID(),
    body('systems').optional().isArray(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { documentId, systems } = req.body;

      const document = await BRDDocument.findOne({
        where: {
          id: documentId,
          organizationId: req.user.organizationId,
        },
        include: [Template],
      });

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const template = document.template;
      if (!template.aiSettings?.enableIntegrationAnalysis) {
        return res.status(400).json({ error: 'Integration analysis not enabled for this template' });
      }

      // Analyze integration complexity
      const analysis = await aiService.analyzeIntegrationComplexity(
        document.data,
        systems || []
      );

      // Save to document
      document.aiAnalysis = {
        ...document.aiAnalysis,
        integrationComplexity: analysis,
        generatedAt: new Date(),
      };
      await document.save();

      res.json(analysis);
    } catch (error) {
      console.error('Error analyzing integration complexity:', error);
      res.status(500).json({ error: 'Failed to analyze integration complexity' });
    }
  }
);

// Comprehensive analysis
router.post(
  '/comprehensive-analysis',
  authMiddleware,
  checkPermission(Permission.VIEW),
  [
    body('documentId').isUUID(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { documentId } = req.body;

      const document = await BRDDocument.findOne({
        where: {
          id: documentId,
          organizationId: req.user.organizationId,
        },
        include: [Template],
      });

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Perform comprehensive analysis
      const analysis = await aiService.performComprehensiveAnalysis(
        document as any,
        document.template as any
      );

      // Save to document
      document.aiAnalysis = analysis;
      await document.save();

      res.json(analysis);
    } catch (error) {
      console.error('Error performing comprehensive analysis:', error);
      res.status(500).json({ error: 'Failed to perform comprehensive analysis' });
    }
  }
);

// Batch field suggestions
router.post(
  '/batch-suggestions',
  authMiddleware,
  [
    body('documentId').isUUID(),
    body('fields').isArray(),
    body('fields.*.id').notEmpty().isString(),
    body('fields.*.type').notEmpty().isString(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { documentId, fields } = req.body;

      const document = await BRDDocument.findOne({
        where: {
          id: documentId,
          organizationId: req.user.organizationId,
        },
        include: [Template],
      });

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const template = document.template;
      if (!template.aiSettings?.enableFieldSuggestions) {
        return res.status(400).json({ error: 'AI suggestions not enabled for this template' });
      }

      // Generate suggestions for all fields
      const suggestions = await Promise.all(
        fields.map((field: any) =>
          aiService.generateFieldSuggestion(
            field.id,
            field.type,
            document.data,
            template.industry,
            template.aiSettings?.customPrompts?.[field.id]
          )
        )
      );

      res.json({ suggestions });
    } catch (error) {
      console.error('Error generating batch suggestions:', error);
      res.status(500).json({ error: 'Failed to generate batch suggestions' });
    }
  }
);

// Export AI analysis report
router.get(
  '/export-analysis/:documentId',
  authMiddleware,
  checkPermission(Permission.EXPORT),
  param('documentId').isUUID(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const document = await BRDDocument.findOne({
        where: {
          id: req.params.documentId,
          organizationId: req.user.organizationId,
        },
        include: [Template],
      });

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      if (!document.aiAnalysis) {
        return res.status(404).json({ error: 'No AI analysis available for this document' });
      }

      // Format analysis for export
      const exportData = {
        documentTitle: document.title,
        template: document.template.name,
        industry: document.template.industry,
        analysisDate: document.aiAnalysis.generatedAt,
        riskAssessment: document.aiAnalysis.riskAssessment,
        resourcePrediction: document.aiAnalysis.resourcePrediction,
        timelineOptimization: document.aiAnalysis.timelineOptimization,
        integrationComplexity: document.aiAnalysis.integrationComplexity,
      };

      res.json(exportData);
    } catch (error) {
      console.error('Error exporting AI analysis:', error);
      res.status(500).json({ error: 'Failed to export AI analysis' });
    }
  }
);

export default router;