import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TellerApiProvider } from './teller.provider';
import { TellerService } from './teller.service';
import { TellerController } from './teller.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EncryptionModule } from '../encryption/encryption.module';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [ConfigModule, PrismaModule, EncryptionModule, TransactionsModule],
  controllers: [TellerController],
  providers: [TellerApiProvider, TellerService],
  exports: [TellerService],
})
export class TellerModule {}
