
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryTransactionsDto } from './dto/query-transactions.dto';
import { Prisma } from '@prisma/client';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { randomUUID } from 'crypto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

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

    const newTransaction = await this.prisma.transaction.create({
      data: {
        ...dto,
        amount: new Decimal(dto.amount),
        date: new Date(dto.date),
        isManual: true,
        // Generate a unique ID for manual transactions as they don't come from Teller
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

    // Use updateMany to ensure we can apply a compound where clause for security.
    // This ensures a user can only update a transaction that they own.
    const result = await this.prisma.transaction.updateMany({
      where: {
        id: transactionId,
        account: {
          userId: user.id,
        },
      },
      data: dto,
    });

    // If updateMany affects 0 rows, it means the transaction wasn't found for that user.
    if (result.count === 0) {
      throw new NotFoundException('Transaction not found or you do not have permission to update it.');
    }

    // Return the updated transaction
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
