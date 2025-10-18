
import { IsOptional, IsDateString } from 'class-validator';

export class QuerySummaryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
