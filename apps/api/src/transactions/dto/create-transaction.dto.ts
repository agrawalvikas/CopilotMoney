
import { IsString, IsNotEmpty, IsNumber, IsPositive, IsDateString, IsIn, IsUUID } from 'class-validator';

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

  @IsUUID()
  accountId: string;
}
