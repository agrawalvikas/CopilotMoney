
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateRuleDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  descriptionContains?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  categoryId?: string;
}
