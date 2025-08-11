import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { Template, TemplateField, Organization } from '../models';
import { authMiddleware } from '../middleware/auth';
import { checkPermission } from '../middleware/permissions';
import { Industry, TemplateCategory, FieldType, Permission } from '../../shared/types';
import { Op } from 'sequelize';

const router = Router();

// Get all templates (with filtering)
router.get(
  '/',
  authMiddleware,
  [
    query('industry').optional().isIn(Object.values(Industry)),
    query('category').optional().isIn(Object.values(TemplateCategory)),
    query('isPublic').optional().isBoolean(),
    query('search').optional().isString(),
    query('page').optional().isInt({ min: 1 }).default(1),
    query('limit').optional().isInt({ min: 1, max: 100 }).default(20),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        industry,
        category,
        isPublic,
        search,
        page = 1,
        limit = 20,
      } = req.query;

      const where: any = {
        [Op.or]: [
          { organizationId: req.user.organizationId },
          { isPublic: true },
        ],
      };

      if (industry) where.industry = industry;
      if (category) where.category = category;
      if (isPublic !== undefined) where.isPublic = isPublic === 'true';
      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } },
          { tags: { [Op.contains]: [search] } },
        ];
      }

      const offset = (Number(page) - 1) * Number(limit);

      const { count, rows: templates } = await Template.findAndCountAll({
        where,
        include: [
          {
            model: TemplateField,
            as: 'fields',
            attributes: ['id', 'name', 'label', 'type', 'required'],
          },
        ],
        order: [['createdAt', 'DESC']],
        limit: Number(limit),
        offset,
      });

      res.json({
        templates,
        pagination: {
          total: count,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(count / Number(limit)),
        },
      });
    } catch (error) {
      console.error('Error fetching templates:', error);
      res.status(500).json({ error: 'Failed to fetch templates' });
    }
  }
);

// Get single template
router.get(
  '/:id',
  authMiddleware,
  param('id').isUUID(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const template = await Template.findOne({
        where: {
          id: req.params.id,
          [Op.or]: [
            { organizationId: req.user.organizationId },
            { isPublic: true },
          ],
        },
        include: [
          {
            model: TemplateField,
            as: 'fields',
            order: [['order', 'ASC']],
          },
        ],
      });

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      res.json(template);
    } catch (error) {
      console.error('Error fetching template:', error);
      res.status(500).json({ error: 'Failed to fetch template' });
    }
  }
);

// Create template
router.post(
  '/',
  authMiddleware,
  checkPermission(Permission.EDIT),
  [
    body('name').notEmpty().isString().isLength({ max: 255 }),
    body('description').optional().isString(),
    body('industry').isIn(Object.values(Industry)),
    body('category').isIn(Object.values(TemplateCategory)),
    body('isPublic').optional().isBoolean(),
    body('tags').optional().isArray(),
    body('aiSettings').optional().isObject(),
    body('fields').isArray().notEmpty(),
    body('fields.*.name').notEmpty().isString(),
    body('fields.*.label').notEmpty().isString(),
    body('fields.*.type').isIn(Object.values(FieldType)),
    body('fields.*.required').isBoolean(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        name,
        description,
        industry,
        category,
        isPublic = false,
        tags = [],
        aiSettings,
        fields,
      } = req.body;

      // Create template
      const template = await Template.create({
        name,
        description,
        industry,
        category,
        isPublic,
        tags,
        aiSettings,
        organizationId: req.user.organizationId,
        createdBy: req.user.id,
      });

      // Create fields
      const createdFields = await Promise.all(
        fields.map((field: any, index: number) =>
          TemplateField.create({
            ...field,
            templateId: template.id,
            order: index,
          })
        )
      );

      // Return template with fields
      const result = template.toJSON();
      result.fields = createdFields;

      res.status(201).json(result);
    } catch (error) {
      console.error('Error creating template:', error);
      res.status(500).json({ error: 'Failed to create template' });
    }
  }
);

// Update template
router.put(
  '/:id',
  authMiddleware,
  checkPermission(Permission.EDIT),
  [
    param('id').isUUID(),
    body('name').optional().isString().isLength({ max: 255 }),
    body('description').optional().isString(),
    body('industry').optional().isIn(Object.values(Industry)),
    body('category').optional().isIn(Object.values(TemplateCategory)),
    body('isPublic').optional().isBoolean(),
    body('tags').optional().isArray(),
    body('aiSettings').optional().isObject(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const template = await Template.findOne({
        where: {
          id: req.params.id,
          organizationId: req.user.organizationId,
        },
      });

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      await template.update(req.body);
      await template.incrementVersion();

      res.json(template);
    } catch (error) {
      console.error('Error updating template:', error);
      res.status(500).json({ error: 'Failed to update template' });
    }
  }
);

// Clone template
router.post(
  '/:id/clone',
  authMiddleware,
  checkPermission(Permission.EDIT),
  param('id').isUUID(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const sourceTemplate = await Template.findOne({
        where: {
          id: req.params.id,
          [Op.or]: [
            { organizationId: req.user.organizationId },
            { isPublic: true },
          ],
        },
      });

      if (!sourceTemplate) {
        return res.status(404).json({ error: 'Template not found' });
      }

      const clonedTemplate = await sourceTemplate.clone(
        req.user.id,
        req.user.organizationId
      );

      res.status(201).json(clonedTemplate);
    } catch (error) {
      console.error('Error cloning template:', error);
      res.status(500).json({ error: 'Failed to clone template' });
    }
  }
);

// Delete template
router.delete(
  '/:id',
  authMiddleware,
  checkPermission(Permission.DELETE),
  param('id').isUUID(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const template = await Template.findOne({
        where: {
          id: req.params.id,
          organizationId: req.user.organizationId,
        },
      });

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      // Check if template is being used
      const documentsCount = await template.countDocuments();
      if (documentsCount > 0) {
        return res.status(400).json({
          error: 'Cannot delete template that is being used by documents',
        });
      }

      await template.destroy();

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting template:', error);
      res.status(500).json({ error: 'Failed to delete template' });
    }
  }
);

// Share template with another organization
router.post(
  '/:id/share',
  authMiddleware,
  checkPermission(Permission.SHARE),
  [
    param('id').isUUID(),
    body('organizationId').isUUID(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const template = await Template.findOne({
        where: {
          id: req.params.id,
          organizationId: req.user.organizationId,
        },
      });

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      const targetOrg = await Organization.findByPk(req.body.organizationId);
      if (!targetOrg) {
        return res.status(404).json({ error: 'Target organization not found' });
      }

      // Clone template to target organization
      const sharedTemplate = await template.clone(
        req.user.id,
        req.body.organizationId
      );

      res.json({
        message: 'Template shared successfully',
        sharedTemplate,
      });
    } catch (error) {
      console.error('Error sharing template:', error);
      res.status(500).json({ error: 'Failed to share template' });
    }
  }
);

// Get predefined templates for industry
router.get(
  '/predefined/:industry',
  authMiddleware,
  param('industry').isIn(Object.values(Industry)),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const templates = await Template.findAll({
        where: {
          industry: req.params.industry,
          isPublic: true,
          organizationId: null, // System templates
        },
        include: [
          {
            model: TemplateField,
            as: 'fields',
            order: [['order', 'ASC']],
          },
        ],
      });

      res.json(templates);
    } catch (error) {
      console.error('Error fetching predefined templates:', error);
      res.status(500).json({ error: 'Failed to fetch predefined templates' });
    }
  }
);

export default router;