import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TellerClientProvider } from './teller.provider';
import { TellerService } from './teller.service';
import { TellerController } from './teller.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EncryptionModule } from '../encryption/encryption.module';

@Module({
  imports: [ConfigModule, PrismaModule, EncryptionModule],
  controllers: [TellerController],
  providers: [TellerClientProvider, TellerService],
  exports: [TellerService],
})
export class TellerModule {}
