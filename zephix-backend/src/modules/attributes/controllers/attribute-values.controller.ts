import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AttributeValuesService } from '../services/attribute-values.service';
import { SetAttributeValueDto } from '../dto/set-attribute-value.dto';

type UserJwt = { id: string; organizationId: string; role: string };

@ApiTags('Attributes — Values')
@ApiBearerAuth()
@ApiHeader({ name: 'x-workspace-id', required: true })
@Controller('workspaces/:wsId/tasks/:taskId/attributes')
@UseGuards(JwtAuthGuard)
export class AttributeValuesController {
  constructor(private readonly valuesService: AttributeValuesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all attribute values for a task' })
  findAll(
    @Param('wsId') wsId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: UserJwt,
  ) {
    return this.valuesService.findAllForTask(taskId, wsId, user.organizationId);
  }

  /**
   * Idempotent upsert. Wrong primitive → 400 ATTRIBUTE_TYPE_MISMATCH.
   * Cross-tenant definition → 404.
   */
  @Put(':defId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set (upsert) an attribute value on a task' })
  upsert(
    @Param('wsId') wsId: string,
    @Param('taskId') taskId: string,
    @Param('defId') defId: string,
    @Body() dto: SetAttributeValueDto,
    @CurrentUser() user: UserJwt,
  ) {
    return this.valuesService.upsert(
      taskId,
      defId,
      dto.value,
      wsId,
      user.organizationId,
    );
  }

  @Delete(':defId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear an attribute value on a task' })
  async delete(
    @Param('wsId') wsId: string,
    @Param('taskId') taskId: string,
    @Param('defId') defId: string,
    @CurrentUser() user: UserJwt,
  ) {
    await this.valuesService.delete(taskId, defId, wsId, user.organizationId);
  }
}
