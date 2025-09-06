import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EncryptionService } from './encryption.service';

@Module({
  imports: [ConfigModule], // Import ConfigModule to use ConfigService
  providers: [EncryptionService],
  exports: [EncryptionService], // Export EncryptionService for other modules
})
export class EncryptionModule {}
