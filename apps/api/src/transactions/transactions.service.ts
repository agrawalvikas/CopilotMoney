import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryTransactionsDto } from './dto/query-transactions.dto';
import { Prisma, Transaction } from '@prisma/client';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { randomUUID } from 'crypto';
import { Decimal } from '@prisma/client/runtime/library';
import { RulesEngineService } from './rules-engine.service';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rulesEngine: RulesEngineService,
  ) {}

  async backfillRules(clerkId: string) {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) throw new NotFoundException('User not found.');

    const allTransactions = await this.prisma.transaction.findMany({
      where: { account: { userId: user.id } },
    });

    const updatedTransactions = await this.rulesEngine.applyRules(user.id, allTransactions);

    let updatedCount = 0;

    const updatePromises = updatedTransactions.map((transaction, index) => {
      // Check if the categoryId was changed by the rules engine
      if (transaction.categoryId !== allTransactions[index].categoryId) {
        updatedCount++;
        return this.prisma.transaction.update({
          where: { id: transaction.id },
          data: { categoryId: transaction.categoryId },
        });
      }
      return null;
    }).filter(promise => promise !== null);

    await Promise.all(updatePromises);

    return { message: `Backfill complete. ${updatedCount} transactions updated.` };
  }

  async create(clerkId: string, dto: CreateTransactionDto) {
    const user = await this.prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    // Verify that the account belongs to the user
    const account = await this.prisma.account.findFirst({
      where: {
        id: dto.accountId,
        userId: user.id,
      },
    });

    if (!account) {
      throw new ForbiddenException('Account not found or you do not have permission to add a transaction to it.');
    }

    // Note: The 'flow' will be set during the sync process. Manual transactions don't have a raw 'type' to map from.
    // We will default it to EXPENSE, as that is the most common manual entry.
    const newTransaction = await this.prisma.transaction.create({
      data: {
        ...dto,
        amount: new Decimal(dto.amount),
        date: new Date(dto.date),
        isManual: true,
        flow: 'EXPENSE', // Default manual transactions to expense
        tellerTransactionId: `manual_${randomUUID()}`,
        accountId: dto.accountId,
      },
    });

    return newTransaction;
  }

  async update(clerkId: string, transactionId: string, dto: UpdateTransactionDto) {
    const user = await this.prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const result = await this.prisma.transaction.updateMany({
      where: {
        id: transactionId,
        account: {
          userId: user.id,
        },
      },
      data: dto,
    });

    if (result.count === 0) {
      throw new NotFoundException('Transaction not found or you do not have permission to update it.');
    }

    return this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });
  }

  async findAll(clerkId: string, queryDto: QueryTransactionsDto) {
    const { accountId, startDate, endDate, page, limit } = queryDto;

    const user = await this.prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const where: Prisma.TransactionWhereInput = {
      account: {
        userId: user.id,
      },
    };

    if (accountId) {
      where.accountId = accountId;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    const transactions = await this.prisma.transaction.findMany({
      where,
      include: {
        category: true,
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        date: 'desc',
      },
    });

    const totalTransactions = await this.prisma.transaction.count({ where });

    return {
      data: transactions,
      pagination: {
        total: totalTransactions,
        page,
        limit,
        totalPages: Math.ceil(totalTransactions / limit),
      },
    };
  }
}