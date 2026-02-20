import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryTransactionsDto } from './dto/query-transactions.dto';
import { Prisma, Transaction } from '@prisma/client';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { randomUUID } from 'crypto';
import { Decimal } from '@prisma/client/runtime/library';
import { RulesEngineService } from './rules-engine.service';
import { DefaultCategorizationService } from './default-categorization.service';

/**
 * Handles CRUD operations and bulk categorization for transactions.
 *
 * Key design decisions:
 * - Amounts are always stored as positive Decimals; direction is in `flow`.
 * - Only manual transactions can be deleted — synced ones are owned by the provider.
 * - Manual transactions get a generated "manual_<uuid>" as their tellerTransactionId
 *   so the unique constraint is satisfied without a real provider ID.
 * - Hidden transactions (isHidden = true) are excluded from dashboard totals but
 *   remain visible in the transaction list so users can audit them.
 */
@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rulesEngine: RulesEngineService,
    private readonly defaultCategorizer: DefaultCategorizationService,
  ) {}

  /**
   * Re-runs both user rules AND default keyword categorization over every
   * transaction for this user.
   *
   * This is heavier than backfillRules() because it also applies the built-in
   * keyword rules, not just the user-defined ones.  It's useful after the
   * default rule set changes or when a user wants a clean slate.
   *
   * All transactions are categorized in parallel since DefaultCategorizationService
   * is in-memory after startup (no DB round-trips per transaction).
   */
  async recategorizeAll(clerkId: string) {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) throw new NotFoundException('User not found.');

    const [allTransactions, userRules] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { account: { userId: user.id } },
      }),
      this.prisma.categorizationRule.findMany({ where: { userId: user.id } }),
    ]);

    // Categorize all transactions in parallel (safe because categorizer is in-memory)
    const categorized = await Promise.all(
      allTransactions.map(async (transaction) => {
        let newCategoryId: string | null = null;

        // User rules take priority over default keyword rules
        for (const rule of userRules) {
          if (transaction.description.toLowerCase().includes(rule.descriptionContains.toLowerCase())) {
            newCategoryId = rule.categoryId;
            break;
          }
        }

        // Fall back to default keyword categorization
        if (!newCategoryId) {
          newCategoryId = await this.defaultCategorizer.categorize(transaction.description);
        }

        return { id: transaction.id, currentCategoryId: transaction.categoryId, newCategoryId };
      }),
    );

    // Only write to DB for transactions where the category actually changed
    const updates = categorized.filter(t => t.newCategoryId !== t.currentCategoryId);

    await Promise.all(
      updates.map(t =>
        this.prisma.transaction.update({
          where: { id: t.id },
          data: { categoryId: t.newCategoryId },
        }),
      ),
    );

    return { message: `Re-categorization complete. ${updates.length} transactions updated.` };
  }

  /**
   * Applies only the user's CategorizationRules to all past transactions.
   *
   * Unlike recategorizeAll(), this does NOT apply the built-in default keyword
   * rules — it only re-runs user-defined rules.  This is the action triggered
   * by the "Apply Rules to Past Transactions" button in the Settings page.
   */
  async backfillRules(clerkId: string) {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) throw new NotFoundException('User not found.');

    const allTransactions = await this.prisma.transaction.findMany({
      where: { account: { userId: user.id } },
    });

    const updatedTransactions = await this.rulesEngine.applyRules(user.id, allTransactions);

    let updatedCount = 0;

    // Build a map for O(1) lookup by ID because applyRules() may reorder the array
    const originalMap = new Map(allTransactions.map(t => [t.id, t]));
    const updatePromises = updatedTransactions.map((transaction) => {
      const original = originalMap.get(transaction.id);
      if (original && transaction.categoryId !== original.categoryId) {
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

  /**
   * Permanently deletes a transaction.
   * Only manual transactions can be deleted — synced provider transactions will
   * reappear on the next sync if removed from the DB directly.
   */
  async delete(clerkId: string, transactionId: string) {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) throw new NotFoundException('User not found.');

    const transaction = await this.prisma.transaction.findFirst({
      where: { id: transactionId, account: { userId: user.id } },
    });

    if (!transaction) throw new NotFoundException('Transaction not found.');
    if (!transaction.isManual) throw new ForbiddenException('Only manually added transactions can be deleted.');

    await this.prisma.transaction.delete({ where: { id: transactionId } });

    return { message: 'Transaction deleted.' };
  }

  /**
   * Creates a manual transaction on a user-owned account.
   * isManual = true marks it as user-entered so it can be deleted later.
   * A UUID is generated as a placeholder tellerTransactionId to satisfy the
   * unique constraint on that column.
   */
  async create(clerkId: string, dto: CreateTransactionDto) {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) throw new NotFoundException('User not found.');

    // Verify ownership — prevents users from adding transactions to other users' accounts
    const account = await this.prisma.account.findFirst({
      where: { id: dto.accountId, userId: user.id },
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
        flow: dto.flow ?? 'EXPENSE',
        tellerTransactionId: `manual_${randomUUID()}`, // Placeholder to satisfy unique constraint
        accountId: dto.accountId,
      },
    });

    return newTransaction;
  }

  /**
   * Partial update of a transaction (e.g. changing category, notes, flow, isHidden).
   * Uses updateMany with a nested userId filter to enforce ownership in a single query.
   */
  async update(clerkId: string, transactionId: string, dto: UpdateTransactionDto) {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) throw new NotFoundException('User not found.');

    // updateMany with a nested account.userId filter enforces ownership without
    // a separate findFirst — if count = 0 the transaction doesn't exist or isn't owned
    const result = await this.prisma.transaction.updateMany({
      where: {
        id: transactionId,
        account: { userId: user.id },
      },
      data: dto,
    });

    if (result.count === 0) {
      throw new NotFoundException('Transaction not found or you do not have permission to update it.');
    }

    return this.prisma.transaction.findUnique({ where: { id: transactionId } });
  }

  /**
   * Returns a paginated, filtered list of transactions along with a summary
   * (total income, expenses, transfers) computed over the SAME filter window.
   *
   * All DB queries (list, count, income sum, expense sum, transfer sum) are
   * fired in parallel via Promise.all to minimise response latency.
   *
   * Hidden transactions (isHidden = true) are excluded from the summary totals
   * but ARE included in the paginated list so users can still see them.
   *
   * endDate is extended to 23:59:59 UTC so that a "single-day" filter (same
   * start and end date) still captures all transactions on that day.
   */
  async findAll(clerkId: string, queryDto: QueryTransactionsDto) {
    const { accountId, startDate, endDate, page, limit, categoryId, subCategoryId, amount, amountOperator, description, flow } = queryDto;

    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) throw new NotFoundException('User not found.');

    // Base filter: only this user's transactions
    const where: Prisma.TransactionWhereInput = {
      account: { userId: user.id },
    };

    if (accountId)     where.accountId    = accountId;
    if (categoryId)    where.categoryId   = categoryId;
    if (subCategoryId) where.subCategoryId = subCategoryId;
    if (description)   where.description  = { contains: description, mode: 'insensitive' };
    if (flow)          where.flow         = flow;

    if (startDate && endDate) {
      // Extend endDate to the last millisecond of the day so the range is inclusive
      const endOfDay = new Date(endDate);
      endOfDay.setUTCHours(23, 59, 59, 999);
      where.date = { gte: new Date(startDate), lte: endOfDay };
    }

    if (amountOperator && amount !== undefined) {
      // Map query param operator names to Prisma operators
      const operator = amountOperator === 'eq' ? 'equals' : amountOperator;
      where.amount = { [operator]: amount };
    }

    // Fire all five queries in parallel to avoid sequential round-trips
    const transactionsPromise = this.prisma.transaction.findMany({
      where,
      include: { category: true, subCategory: true, account: true },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { date: 'desc' },
    });

    const totalTransactionsPromise = this.prisma.transaction.count({ where });

    // Summary totals exclude hidden transactions but respect all other active filters
    const visibleWhere = { ...where, isHidden: false };
    const incomePromise   = this.prisma.transaction.aggregate({ where: { ...visibleWhere, flow: 'INCOME'   }, _sum: { amount: true } });
    const expensePromise  = this.prisma.transaction.aggregate({ where: { ...visibleWhere, flow: 'EXPENSE'  }, _sum: { amount: true } });
    const transferPromise = this.prisma.transaction.aggregate({ where: { ...visibleWhere, flow: 'TRANSFER' }, _sum: { amount: true } });

    const [transactions, totalTransactions, incomeResult, expenseResult, transferResult] = await Promise.all([
      transactionsPromise,
      totalTransactionsPromise,
      incomePromise,
      expensePromise,
      transferPromise,
    ]);

    return {
      data: transactions,
      pagination: {
        total: totalTransactions,
        page,
        limit,
        totalPages: Math.ceil(totalTransactions / limit),
      },
      summary: {
        income:    incomeResult._sum.amount?.toNumber()   ?? 0,
        expenses:  expenseResult._sum.amount?.toNumber()  ?? 0,
        transfers: transferResult._sum.amount?.toNumber() ?? 0,
      },
    };
  }
}
