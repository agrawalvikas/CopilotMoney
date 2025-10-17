
import { Controller, Get, Query, UseGuards, ValidationPipe, Patch, Param, Body, ParseUUIDPipe, Post } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { AuthUser } from '../auth/auth-user.decorator';
import { QueryTransactionsDto } from './dto/query-transactions.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Controller('/api/v1/transactions')
@UseGuards(ClerkAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  create(
    @AuthUser() auth: { userId: string },
    @Body(new ValidationPipe({ transform: true, whitelist: true })) body: CreateTransactionDto,
  ) {
    return this.transactionsService.create(auth.userId, body);
  }

  @Post('backfill-rules')
  backfillRules(@AuthUser() auth: { userId: string }) {
    return this.transactionsService.backfillRules(auth.userId);
  }

  @Patch(':id')
  update(
    @AuthUser() auth: { userId: string },
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) body: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(auth.userId, id, body);
  }

  @Get()
  findAll(
    @AuthUser() auth: { userId: string },
    @Query(new ValidationPipe({ transform: true, whitelist: true })) query: QueryTransactionsDto,
  ) {
    return this.transactionsService.findAll(auth.userId, query);
  }
}