
import { IsString, IsOptional } from 'class-validator';

export class UpdateTransactionDto {
  @IsOptional()
  @IsString()
  categoryId?: string | null; // Allow null for un-categorizing

  @IsOptional()
  @IsString()
  notes?: string;
}
