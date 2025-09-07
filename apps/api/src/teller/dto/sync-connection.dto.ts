import { IsString, IsNotEmpty } from 'class-validator';

export class SyncConnectionDto {
  @IsString()
  @IsNotEmpty()
  connectionId: string;
}
