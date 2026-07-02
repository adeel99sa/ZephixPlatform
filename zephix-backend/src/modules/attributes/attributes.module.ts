import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttributeDefinition } from './entities/attribute-definition.entity';
import { AttributeValue } from './entities/attribute-value.entity';
import { TemplateAttributeDefinition } from './entities/template-attribute-definition.entity';
import { WorkspaceEnabledAttribute } from './entities/workspace-enabled-attribute.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AttributeDefinition,
      AttributeValue,
      TemplateAttributeDefinition,
      WorkspaceEnabledAttribute,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class AttributesModule {}
