
import { IsString, IsNotEmpty, IsNumber, IsPositive, IsDateString, IsIn, IsOptional } from 'class-validator';
import { TransactionFlow } from '@prisma/client';

export class CreateTransactionDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsDateString()
  date: string;

  @IsIn(['debit', 'credit'])
  type: 'debit' | 'credit';

  @IsString()
  @IsNotEmpty()
  accountId: string;

  @IsOptional()
  @IsIn([TransactionFlow.INCOME, TransactionFlow.EXPENSE, TransactionFlow.TRANSFER])
  flow?: TransactionFlow;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
