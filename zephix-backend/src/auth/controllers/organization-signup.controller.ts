import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { OrganizationSignupService } from '../services/organization-signup.service';
import { OrganizationSignupDto } from '../dto/organization-signup.dto';

@ApiTags('Organization Signup')
@Controller('auth/organization')
export class OrganizationSignupController {
  constructor(
    private readonly organizationSignupService: OrganizationSignupService,
  ) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Sign up with new organization',
    description: 'Creates a new user and organization, with the user as the owner',
  })
  @ApiResponse({
    status: 201,
    description: 'Organization and user created successfully',
    schema: {
      example: {
        user: {
          id: 'uuid',
          email: 'john@acme.com',
          firstName: 'John',
          lastName: 'Doe',
        },
        organization: {
          id: 'uuid',
          name: 'Acme Corporation',
          slug: 'acme-corp',
          status: 'trial',
        },
        access_token: 'jwt_token_here',
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'User email or organization slug already exists',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  async signup(@Body() signupDto: OrganizationSignupDto) {
    return this.organizationSignupService.signupWithOrganization(signupDto);
  }

  @Get('check-slug')
  @ApiOperation({
    summary: 'Check organization slug availability',
    description: 'Checks if an organization slug is available for use',
  })
  @ApiQuery({
    name: 'slug',
    description: 'Organization slug to check',
    example: 'acme-corp',
  })
  @ApiResponse({
    status: 200,
    description: 'Slug availability status',
    schema: {
      example: {
        available: true,
        slug: 'acme-corp',
      },
    },
  })
  async checkSlugAvailability(@Query('slug') slug: string) {
    const available = await this.organizationSignupService.checkSlugAvailability(slug);
    return {
      available,
      slug,
    };
  }
}
