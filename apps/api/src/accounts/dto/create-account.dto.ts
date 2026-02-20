import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

const ACCOUNT_TYPES = ['checking', 'savings', 'credit', 'cash', 'other'] as const;

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsIn(ACCOUNT_TYPES)
  type: string;

  @IsOptional()
  @IsString()
  institutionName?: string;

  @IsOptional()
  @IsString()
  currency?: string;
}
