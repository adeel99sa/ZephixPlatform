import { PartialType } from '@nestjs/swagger';
import { CreateProgramDto } from './create-program.dto';

export class UpdateProgramDto extends PartialType(CreateProgramDto) {
  // portfolioId should not be updatable via UpdateProgramDto
  // If needed, create a separate transfer endpoint
}


