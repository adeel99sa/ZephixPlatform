import {
  Controller,
  Post,
  Req,
  Body,
  Headers,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { getAuthContext } from '../../common/http/get-auth-context';
import { AuthRequest } from '../../common/http/auth-request';
import { WorkspaceRoleGuardService } from '../workspace-access/workspace-role-guard.service';
import { CsvAnalyzeService } from './services/csv-analyze.service';
import { CsvExecuteService } from './services/csv-execute.service';
import { ExecuteCsvDto } from './dto/execute-csv.dto';

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

@ApiTags('importer')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('import/csv')
export class ImporterController {
  constructor(
    private readonly csvAnalyzeService: CsvAnalyzeService,
    private readonly csvExecuteService: CsvExecuteService,
    private readonly workspaceRoleGuard: WorkspaceRoleGuardService,
  ) {}

  @Post('analyze')
  @ApiOperation({ summary: 'Parse a CSV file and detect its preset (ClickUp/Asana/generic)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  @ApiResponse({ status: 200, description: 'Analysis result with fileToken for execute call' })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_BYTES },
      fileFilter: (_req, file, cb) => {
        const ext = file.originalname.split('.').pop()?.toLowerCase();
        if (ext !== 'csv') {
          return cb(new BadRequestException({ code: 'INVALID_FILE_TYPE', message: 'Only .csv files accepted' }), false);
        }
        cb(null, true);
      },
    }),
  )
  async analyze(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceId: string,
  ) {
    const auth = getAuthContext(req);
    await this.workspaceRoleGuard.requireWorkspaceWrite(workspaceId, auth.userId);

    if (!file) {
      throw new BadRequestException({ code: 'NO_FILE', message: 'No file uploaded' });
    }

    return this.csvAnalyzeService.analyze(file.buffer, file.originalname);
  }

  @Post('execute')
  @ApiOperation({ summary: 'Import tasks from a previously analyzed CSV file' })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  @ApiResponse({ status: 201, description: 'Import result' })
  async execute(
    @Body() dto: ExecuteCsvDto,
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceId: string,
  ) {
    const auth = getAuthContext(req);
    await this.workspaceRoleGuard.requireWorkspaceWrite(workspaceId, auth.userId);

    // Attach workspace from header to auth context (execute needs it for tenancy)
    const enrichedAuth = { ...auth, workspaceId };

    return this.csvExecuteService.execute(enrichedAuth, dto);
  }
}
