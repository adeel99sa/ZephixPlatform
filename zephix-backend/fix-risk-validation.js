const fs = require('fs');
const path = './src/modules/risks/dto/create-risk.dto.ts';
let content = fs.readFileSync(path, 'utf8');

// Add custom validators
const validators = `
import { IsNumber, Min, Max, IsDateString, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';
import { IsFutureDate } from '../../../common/validators/is-future-date.validator';
`;

// Update probability validation
content = content.replace(
  '@IsOptional()\n  probability?: number;',
  '@IsOptional()\n  @IsNumber()\n  @Min(0)\n  @Max(100)\n  probability?: number;'
);

// Update impact_score validation  
content = content.replace(
  '@IsOptional()\n  impact_score?: number;',
  '@IsOptional()\n  @IsNumber()\n  @Min(1)\n  @Max(10)\n  impact_score?: number;'
);

fs.writeFileSync(path, content);
console.log('✅ Fixed risk DTO validation');
