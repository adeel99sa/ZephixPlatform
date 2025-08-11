import { Sequelize } from 'sequelize-typescript';
import { config } from '../config';
import { User } from './User';
import { Organization } from './Organization';
import { Template } from './Template';
import { TemplateField } from './TemplateField';
import { BRDDocument } from './BRDDocument';
import { DocumentVersion } from './DocumentVersion';
import { Comment } from './Comment';
import { Approval } from './Approval';
import { ChangeHistory } from './ChangeHistory';
import { Collaborator } from './Collaborator';

export const sequelize = new Sequelize({
  dialect: 'postgres',
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  username: config.database.user,
  password: config.database.password,
  logging: config.database.logging ? console.log : false,
  models: [
    User,
    Organization,
    Template,
    TemplateField,
    BRDDocument,
    DocumentVersion,
    Comment,
    Approval,
    ChangeHistory,
    Collaborator,
  ],
});

// Define associations
export function defineAssociations() {
  // Organization associations
  Organization.hasMany(User, { foreignKey: 'organizationId' });
  Organization.hasMany(Template, { foreignKey: 'organizationId' });
  Organization.hasMany(BRDDocument, { foreignKey: 'organizationId' });

  // User associations
  User.belongsTo(Organization, { foreignKey: 'organizationId' });
  User.hasMany(Template, { foreignKey: 'createdBy' });
  User.hasMany(BRDDocument, { foreignKey: 'createdBy' });
  User.hasMany(Comment, { foreignKey: 'userId' });
  User.hasMany(ChangeHistory, { foreignKey: 'userId' });

  // Template associations
  Template.belongsTo(Organization, { foreignKey: 'organizationId' });
  Template.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
  Template.hasMany(TemplateField, { foreignKey: 'templateId', as: 'fields' });
  Template.hasMany(BRDDocument, { foreignKey: 'templateId' });

  // TemplateField associations
  TemplateField.belongsTo(Template, { foreignKey: 'templateId' });

  // BRDDocument associations
  BRDDocument.belongsTo(Organization, { foreignKey: 'organizationId' });
  BRDDocument.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
  BRDDocument.belongsTo(Template, { foreignKey: 'templateId' });
  BRDDocument.hasMany(DocumentVersion, { foreignKey: 'documentId' });
  BRDDocument.hasMany(Comment, { foreignKey: 'documentId' });
  BRDDocument.hasMany(Approval, { foreignKey: 'documentId' });
  BRDDocument.hasMany(ChangeHistory, { foreignKey: 'documentId' });
  BRDDocument.hasMany(Collaborator, { foreignKey: 'documentId' });

  // DocumentVersion associations
  DocumentVersion.belongsTo(BRDDocument, { foreignKey: 'documentId' });
  DocumentVersion.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

  // Comment associations
  Comment.belongsTo(User, { foreignKey: 'userId', as: 'author' });
  Comment.belongsTo(BRDDocument, { foreignKey: 'documentId' });
  Comment.belongsTo(Comment, { foreignKey: 'parentId', as: 'parent' });
  Comment.hasMany(Comment, { foreignKey: 'parentId', as: 'replies' });

  // Approval associations
  Approval.belongsTo(BRDDocument, { foreignKey: 'documentId' });
  Approval.belongsTo(User, { foreignKey: 'approverId', as: 'approver' });

  // ChangeHistory associations
  ChangeHistory.belongsTo(BRDDocument, { foreignKey: 'documentId' });
  ChangeHistory.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  // Collaborator associations
  Collaborator.belongsTo(BRDDocument, { foreignKey: 'documentId' });
  Collaborator.belongsTo(User, { foreignKey: 'userId' });
  Collaborator.belongsTo(User, { foreignKey: 'addedBy', as: 'addedByUser' });
}

export {
  User,
  Organization,
  Template,
  TemplateField,
  BRDDocument,
  DocumentVersion,
  Comment,
  Approval,
  ChangeHistory,
  Collaborator,
};