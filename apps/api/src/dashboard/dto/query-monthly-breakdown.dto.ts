import { IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryMonthlyBreakdownDto {
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number = new Date().getFullYear();
}
