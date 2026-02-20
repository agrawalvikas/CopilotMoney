
import { IsString, IsOptional, IsIn, IsBoolean } from 'class-validator';
import { TransactionFlow } from '@prisma/client';

export class UpdateTransactionDto {
  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @IsOptional()
  @IsString()
  subCategoryId?: string | null;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsIn([TransactionFlow.INCOME, TransactionFlow.EXPENSE, TransactionFlow.TRANSFER, TransactionFlow.UNRECOGNIZED])
  flow?: TransactionFlow;

  @IsOptional()
  @IsBoolean()
  isHidden?: boolean;
}
