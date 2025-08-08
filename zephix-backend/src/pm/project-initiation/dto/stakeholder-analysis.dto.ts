import { IsString, IsOptional, IsArray, IsEnum } from 'class-validator';

export class StakeholderAnalysisDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsString()
  @IsOptional()
  organization?: string;

  @IsEnum(['low', 'medium', 'high'])
  @IsOptional()
  influence?: 'low' | 'medium' | 'high';

  @IsEnum(['low', 'medium', 'high'])
  @IsOptional()
  interest?: 'low' | 'medium' | 'high';

  @IsEnum(['champion', 'supporter', 'neutral', 'critic', 'blocker'])
  @IsOptional()
  category?: 'champion' | 'supporter' | 'neutral' | 'critic' | 'blocker';

  @IsArray()
  @IsOptional()
  communicationNeeds?: string[];

  @IsString()
  @IsOptional()
  engagementStrategy?: string;
}
