
import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { TransactionMapperService } from './transaction-mapper.service';
import { RulesEngineService } from './rules-engine.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [TransactionsController],
  providers: [TransactionsService, TransactionMapperService, RulesEngineService],
  exports: [TransactionMapperService, RulesEngineService],
})
export class TransactionsModule {}
