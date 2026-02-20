import { IsString, IsNotEmpty } from 'class-validator';

export class SyncPlaidConnectionDto {
  @IsString()
  @IsNotEmpty()
  connectionId: string;
}
