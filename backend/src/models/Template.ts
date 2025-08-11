import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
  Index,
  BeforeCreate,
} from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import { Organization } from './Organization';
import { User } from './User';
import { TemplateField } from './TemplateField';
import { BRDDocument } from './BRDDocument';
import {
  Industry,
  TemplateCategory,
  AISettings,
} from '../../shared/types';

@Table({
  tableName: 'templates',
  timestamps: true,
})
export class Template extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  id!: string;

  @Index
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  description?: string;

  @Index
  @Column({
    type: DataType.ENUM(...Object.values(Industry)),
    allowNull: false,
  })
  industry!: Industry;

  @Index
  @Column({
    type: DataType.ENUM(...Object.values(TemplateCategory)),
    allowNull: false,
  })
  category!: TemplateCategory;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 1,
    allowNull: false,
  })
  version!: number;

  @Index
  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  })
  isPublic!: boolean;

  @ForeignKey(() => Organization)
  @Index
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  organizationId!: string;

  @ForeignKey(() => User)
  @Index
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  createdBy!: string;

  @Column({
    type: DataType.ARRAY(DataType.STRING),
    defaultValue: [],
  })
  tags!: string[];

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  aiSettings?: AISettings;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  metadata?: Record<string, any>;

  // Associations
  @BelongsTo(() => Organization)
  organization!: Organization;

  @BelongsTo(() => User, 'createdBy')
  creator!: User;

  @HasMany(() => TemplateField, 'templateId')
  fields!: TemplateField[];

  @HasMany(() => BRDDocument)
  documents!: BRDDocument[];

  // Hooks
  @BeforeCreate
  static generateId(instance: Template) {
    if (!instance.id) {
      instance.id = uuidv4();
    }
  }

  // Instance methods
  async clone(userId: string, organizationId?: string): Promise<Template> {
    const newTemplate = await Template.create({
      name: `${this.name} (Copy)`,
      description: this.description,
      industry: this.industry,
      category: this.category,
      version: 1,
      isPublic: false,
      organizationId: organizationId || this.organizationId,
      createdBy: userId,
      tags: [...this.tags],
      aiSettings: this.aiSettings,
      metadata: { clonedFrom: this.id, ...(this.metadata || {}) },
    });

    // Clone fields
    const fields = await this.$get('fields');
    if (fields) {
      for (const field of fields) {
        await TemplateField.create({
          ...field.toJSON(),
          id: uuidv4(),
          templateId: newTemplate.id,
        });
      }
    }

    return newTemplate;
  }

  async incrementVersion(): Promise<void> {
    this.version += 1;
    await this.save();
  }

  // Static methods for predefined templates
  static async createPredefinedTemplates(organizationId: string, userId: string) {
    const predefinedTemplates = [
      {
        name: 'Software Development BRD',
        description: 'Comprehensive template for software development projects',
        industry: Industry.TECHNOLOGY,
        category: TemplateCategory.TECHNICAL_SPECIFICATION,
        tags: ['software', 'development', 'technical'],
        aiSettings: {
          enableFieldSuggestions: true,
          enableRiskAssessment: true,
          enableResourcePrediction: true,
          enableTimelineOptimization: true,
          enableIntegrationAnalysis: true,
        },
      },
      {
        name: 'Healthcare System Integration',
        description: 'Template for healthcare system integration projects',
        industry: Industry.HEALTHCARE,
        category: TemplateCategory.INTEGRATION_PLANNING,
        tags: ['healthcare', 'integration', 'compliance'],
        aiSettings: {
          enableFieldSuggestions: true,
          enableRiskAssessment: true,
          enableResourcePrediction: true,
          enableTimelineOptimization: true,
          enableIntegrationAnalysis: true,
          customPrompts: {
            riskAssessment: 'Focus on HIPAA compliance and patient data security risks',
          },
        },
      },
      {
        name: 'E-commerce Platform Launch',
        description: 'Template for launching e-commerce platforms',
        industry: Industry.ECOMMERCE,
        category: TemplateCategory.PROJECT_INITIATION,
        tags: ['ecommerce', 'launch', 'platform'],
        aiSettings: {
          enableFieldSuggestions: true,
          enableRiskAssessment: true,
          enableResourcePrediction: true,
          enableTimelineOptimization: true,
          enableIntegrationAnalysis: true,
        },
      },
      {
        name: 'Financial Risk Assessment',
        description: 'Template for financial project risk assessments',
        industry: Industry.FINANCE,
        category: TemplateCategory.RISK_ASSESSMENT,
        tags: ['finance', 'risk', 'compliance'],
        aiSettings: {
          enableFieldSuggestions: true,
          enableRiskAssessment: true,
          enableResourcePrediction: true,
          enableTimelineOptimization: false,
          enableIntegrationAnalysis: true,
          customPrompts: {
            riskAssessment: 'Include regulatory compliance risks and financial exposure analysis',
          },
        },
      },
    ];

    const templates = [];
    for (const templateData of predefinedTemplates) {
      const template = await Template.create({
        ...templateData,
        organizationId,
        createdBy: userId,
        isPublic: true,
      });
      templates.push(template);
    }

    return templates;
  }
}