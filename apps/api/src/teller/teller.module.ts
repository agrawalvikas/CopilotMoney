import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TellerClientProvider } from './teller.provider';
import { TellerService } from './teller.service';

@Module({
  imports: [ConfigModule], // Import ConfigModule because TellerClientProvider depends on ConfigService
  providers: [TellerClientProvider, TellerService],
  exports: [TellerService], // Export TellerService to make it available in other modules
})
export class TellerModule {}
