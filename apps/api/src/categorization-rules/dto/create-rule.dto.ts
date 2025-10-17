
import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateRuleDto {
  @IsString()
  @IsNotEmpty()
  descriptionContains: string;

  @IsString()
  @IsNotEmpty()
  categoryId: string;
}
