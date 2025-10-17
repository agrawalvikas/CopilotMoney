
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(clerkId: string) {
    const user = await this.prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    // Define date range for the current month
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const baseWhere: Prisma.TransactionWhereInput = {
      account: {
        userId: user.id,
      },
      date: {
        gte: startDate,
        lte: endDate,
      },
    };

    // 1. Calculate Total Income
    const totalIncomePromise = this.prisma.transaction.aggregate({
      where: {
        ...baseWhere,
        flow: 'INCOME',
      },
      _sum: {
        amount: true,
      },
    });

    // 2. Calculate Total Expenses
    const totalExpensesPromise = this.prisma.transaction.aggregate({
      where: {
        ...baseWhere,
        flow: 'EXPENSE',
      },
      _sum: {
        amount: true,
      },
    });

    // 3. Calculate Spending by Category
    const spendingByCategoryPromise = this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        ...baseWhere,
        flow: 'EXPENSE',
        categoryId: { not: null },
      },
      _sum: {
        amount: true,
      },
      orderBy: {
        _sum: {
          amount: 'desc',
        },
      },
    });

    // Execute all queries in parallel
    const [totalIncomeResult, totalExpensesResult, spendingByCategoryResult] = await Promise.all([
      totalIncomePromise,
      totalExpensesPromise,
      spendingByCategoryPromise,
    ]);

    // Get category names for the spending breakdown
    const categoryIds = spendingByCategoryResult.map(item => item.categoryId!);
    const categories = await this.prisma.category.findMany({
      where: {
        id: { in: categoryIds },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const categoryMap = new Map(categories.map(cat => [cat.id, cat.name]));

    const formattedSpendingByCategory = spendingByCategoryResult.map(item => ({
      name: categoryMap.get(item.categoryId!) ?? 'Uncategorized',
      total: item._sum.amount?.toNumber() ?? 0,
    }));

    const totalIncome = totalIncomeResult._sum.amount?.toNumber() ?? 0;
    const totalExpenses = totalExpensesResult._sum.amount?.toNumber() ?? 0;

    return {
      totalIncome,
      totalExpenses,
      netIncome: totalIncome - totalExpenses,
      spendingByCategory: formattedSpendingByCategory,
    };
  }
}
