
import { IsOptional, IsString, IsDateString, IsInt, Min, Max, IsIn, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryTransactionsDto {
  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  subCategoryId?: string;

  @IsOptional()
  @IsIn(['eq', 'gt', 'lt', 'gte', 'lte'])
  amountOperator?: 'eq' | 'gt' | 'lt' | 'gte' | 'lte';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(['INCOME', 'EXPENSE', 'TRANSFER', 'UNRECOGNIZED'])
  flow?: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'UNRECOGNIZED';

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 25;
}
