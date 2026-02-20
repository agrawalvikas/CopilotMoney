import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { QuerySummaryDto } from './dto/query-summary.dto';
import { QueryMonthlyBreakdownDto } from './dto/query-monthly-breakdown.dto';

/**
 * Provides aggregated financial data for the dashboard.
 *
 * All queries exclude:
 *   - TRANSFER transactions — moving money between accounts would inflate both
 *     income (deposit side) and expenses (withdrawal side) on the dashboard.
 *   - Hidden transactions (isHidden = true) — marked hidden by the user to
 *     exclude noise (e.g. internal credit card payments) from their totals.
 *
 * All heavy queries within each method are fired in parallel via Promise.all
 * to minimise response latency.
 */
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns financial summary for a date range:
   *   - Total income
   *   - Total expenses broken down by category (with sub-categories)
   *   - Net income (income − expenses)
   *
   * The category breakdown is built client-side from a Prisma groupBy result
   * (grouping by categoryId + subCategoryId together) so we get accurate
   * sub-category totals without multiple sequential queries.
   *
   * Categories are fetched for both the user AND the system (userId = null)
   * because system categories are shared across all users.
   */
  async getSummary(clerkId: string, queryDto: QuerySummaryDto) {
    const { startDate: queryStartDate, endDate: queryEndDate } = queryDto;

    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) throw new NotFoundException('User not found.');

    const baseWhere: Prisma.TransactionWhereInput = {
      account: { userId: user.id },
      isHidden: false,
    };

    if (queryStartDate && queryEndDate) {
      // Extend endDate to the last millisecond of the day so the range is inclusive
      const endOfDay = new Date(queryEndDate);
      endOfDay.setUTCHours(23, 59, 59, 999);
      baseWhere.date = { gte: new Date(queryStartDate), lte: endOfDay };
    }

    // Fire all four queries in parallel — they're independent of each other
    const totalIncomePromise = this.prisma.transaction.aggregate({
      where: { ...baseWhere, flow: 'INCOME' },
      _sum: { amount: true },
    });

    // GroupBy categoryId + subCategoryId gives us spending totals at the
    // sub-category granularity, which we then roll up into parent categories below
    const expensesPromise = this.prisma.transaction.groupBy({
      by: ['categoryId', 'subCategoryId'],
      where: { ...baseWhere, flow: 'EXPENSE' },
      _sum: { amount: true },
    });

    // Fetch both system categories (userId=null) and user-created categories
    const categoriesPromise = this.prisma.category.findMany({
      where: { OR: [{ userId: user.id }, { userId: null }] },
      select: { id: true, name: true },
    });

    const subCategoriesPromise = this.prisma.subCategory.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, categoryId: true },
    });

    const [incomeResult, expensesResult, categories, subCategories] = await Promise.all([
      totalIncomePromise,
      expensesPromise,
      categoriesPromise,
      subCategoriesPromise,
    ]);

    const totalIncome = incomeResult._sum.amount?.toNumber() ?? 0;

    const categoryMap    = new Map(categories.map(cat => [cat.id, cat.name]));
    const subCategoryMap = new Map(subCategories.map(sc => [sc.id, sc]));

    // Build a nested category → sub-category structure from the flat groupBy result.
    // Each entry in expensesResult represents a unique (categoryId, subCategoryId) pair.
    const categoryGroups = new Map<string | null, {
      id: string | null;
      name: string;
      total: number;
      subCategories: { id: string; name: string; total: number }[];
    }>();

    for (const group of expensesResult) {
      const catKey  = group.categoryId ?? null;
      const catName = catKey ? (categoryMap.get(catKey) ?? 'Unknown') : 'Uncategorized';
      const amount  = group._sum.amount?.toNumber() ?? 0;

      if (!categoryGroups.has(catKey)) {
        categoryGroups.set(catKey, { id: catKey, name: catName, total: 0, subCategories: [] });
      }

      const catGroup = categoryGroups.get(catKey)!;
      catGroup.total += amount;

      // Add sub-category entry if this row has a sub-category
      if (group.subCategoryId) {
        const sc = subCategoryMap.get(group.subCategoryId);
        if (sc) {
          catGroup.subCategories.push({ id: group.subCategoryId, name: sc.name, total: amount });
        }
      }
    }

    const totalExpenses = Array.from(categoryGroups.values()).reduce((sum, g) => sum + g.total, 0);

    // Sort both categories and their sub-categories by total spend (descending)
    const spendingByCategory = Array.from(categoryGroups.values())
      .sort((a, b) => b.total - a.total)
      .map(cat => ({
        ...cat,
        subCategories: cat.subCategories.sort((a, b) => b.total - a.total),
      }));

    return {
      totalIncome,
      totalExpenses,
      netIncome: totalIncome - totalExpenses,
      spendingByCategory,
    };
  }

  /**
   * Returns monthly expense totals broken down by category for a full calendar year.
   * Used to power the stacked bar chart on the dashboard.
   *
   * The response shape is designed for Recharts:
   *   categories — ordered list of category names + annual totals (for legend/colours)
   *   months     — array of 12 objects, each shaped as { month: 'Jan', 'Groceries': 120, ... }
   *
   * Categories are sorted by annual total (descending) so the largest spenders
   * get consistent colours at the bottom of the stacked bars.
   */
  async getMonthlyBreakdown(clerkId: string, dto: QueryMonthlyBreakdownDto) {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) throw new NotFoundException('User not found.');

    const year      = dto.year;
    const startDate = new Date(`${year}-01-01T00:00:00Z`);
    const endDate   = new Date(`${year + 1}-01-01T00:00:00Z`); // Exclusive upper bound

    const [transactions, categories] = await Promise.all([
      this.prisma.transaction.findMany({
        where: {
          account: { userId: user.id },
          flow: 'EXPENSE',
          isHidden: false,
          date: { gte: startDate, lt: endDate },
        },
        select: { date: true, amount: true, categoryId: true },
      }),
      this.prisma.category.findMany({
        where: { OR: [{ userId: user.id }, { userId: null }] },
        select: { id: true, name: true },
      }),
    ]);

    const categoryMap = new Map(categories.map(c => [c.id, c.name]));

    // Accumulate totals per month (1–12) × category key
    const monthData: Record<number, Record<string, number>> = {};
    for (let m = 1; m <= 12; m++) monthData[m] = {};

    for (const t of transactions) {
      const month  = t.date.getUTCMonth() + 1; // getUTCMonth() is 0-indexed
      const catKey = t.categoryId ?? '__uncategorized__';
      monthData[month][catKey] = (monthData[month][catKey] ?? 0) + t.amount.toNumber();
    }

    // Determine the annual total per category so we can sort them for the chart legend
    const categoryTotals: Record<string, number> = {};
    for (const month of Object.values(monthData)) {
      for (const [catKey, amount] of Object.entries(month)) {
        categoryTotals[catKey] = (categoryTotals[catKey] ?? 0) + amount;
      }
    }

    // Sort categories by annual total (largest first = bottom of stacked bar)
    const sortedCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([catKey, total]) => ({
        id:    catKey === '__uncategorized__' ? null : catKey,
        name:  catKey === '__uncategorized__' ? 'Uncategorized' : (categoryMap.get(catKey) ?? 'Unknown'),
        total,
      }));

    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Build the Recharts-friendly array: one entry per month with category amounts as keys
    const months = MONTH_NAMES.map((name, idx) => {
      const monthNum = idx + 1;
      const entry: Record<string, string | number> = { month: name };
      for (const cat of sortedCategories) {
        const catKey  = cat.id ?? '__uncategorized__';
        entry[cat.name] = monthData[monthNum][catKey] ?? 0;
      }
      return entry;
    });

    return { categories: sortedCategories, months };
  }

  /**
   * Returns the distinct years for which this user has transactions.
   * Used to populate the year selector on the monthly breakdown chart.
   * Raw SQL is used because Prisma doesn't support EXTRACT(YEAR ...) in a groupBy.
   */
  async getTransactionYears(clerkId: string): Promise<number[]> {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) throw new NotFoundException('User not found.');

    const yearsResult = await this.prisma.$queryRaw<Array<{ year: number }>>(
      Prisma.sql`SELECT DISTINCT EXTRACT(YEAR FROM "date")::integer AS year FROM "Transaction" WHERE "accountId" IN (SELECT id FROM "Account" WHERE "userId" = ${user.id}) ORDER BY year DESC`
    );

    return yearsResult.map(item => item.year);
  }
}
