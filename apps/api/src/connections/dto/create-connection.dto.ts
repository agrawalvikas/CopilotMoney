import { IsString, IsNotEmpty } from 'class-validator';

export class CreateConnectionDto {
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @IsString()
  @IsNotEmpty()
  tellerId: string; // This comes from enrollment.id

  @IsString()
  @IsNotEmpty()
  institutionName: string; // This comes from enrollment.institution.name
}
