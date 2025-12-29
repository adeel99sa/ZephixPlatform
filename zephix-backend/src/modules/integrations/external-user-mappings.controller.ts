import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ExternalUserMappingService } from './services/external-user-mapping.service';
import { CreateExternalUserMappingDto } from './dto/create-external-user-mapping.dto';
import {
  formatResponse,
  formatArrayResponse,
} from '../../shared/helpers/response.helper';

@Controller('integrations/external-users/mappings')
@UseGuards(JwtAuthGuard)
export class ExternalUserMappingsController {
  constructor(private readonly mappingService: ExternalUserMappingService) {}

  @Post()
  async createMapping(
    @Body() dto: CreateExternalUserMappingDto,
    @CurrentUser() user: any,
  ) {
    // Scope by organizationId from JWT
    const organizationId = user.organizationId;
    if (!organizationId) {
      throw new Error('Organization ID required');
    }

    const mapping = await this.mappingService.createMapping(
      organizationId,
      dto,
    );

    return formatResponse(mapping);
  }

  @Get()
  async listMappings(@CurrentUser() user: any) {
    // Scope by organizationId from JWT
    const organizationId = user.organizationId;
    if (!organizationId) {
      throw new Error('Organization ID required');
    }

    const mappings = await this.mappingService.listMappings(organizationId);

    return formatArrayResponse(mappings);
  }
}
