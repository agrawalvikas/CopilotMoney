import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PlaidService } from './plaid.service';
import { PlaidController } from './plaid.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EncryptionModule } from '../encryption/encryption.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ConfigModule, PrismaModule, EncryptionModule, TransactionsModule, AuthModule],
  controllers: [PlaidController],
  providers: [PlaidService],
  exports: [PlaidService],
})
export class PlaidModule {}
