
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Transaction } from '@prisma/client';

@Injectable()
export class RulesEngineService {
  constructor(private readonly prisma: PrismaService) {}

  async applyRules(userId: string, transactions: Transaction[]): Promise<Transaction[]> {
    const rules = await this.prisma.categorizationRule.findMany({
      where: { userId },
      orderBy: { descriptionContains: 'asc' }, // Simple ordering
    });

    if (rules.length === 0) {
      return transactions; // No rules to apply
    }

    const updatedTransactions = transactions.map(transaction => {
      for (const rule of rules) {
        // Case-insensitive check
        if (transaction.description.toLowerCase().includes(rule.descriptionContains.toLowerCase())) {
          // Apply the first rule that matches
          if (transaction.categoryId !== rule.categoryId) {
            return { ...transaction, categoryId: rule.categoryId };
          }
          break; // Stop checking rules for this transaction once one has matched
        }
      }
      return transaction; // Return original transaction if no rules matched
    });

    return updatedTransactions;
  }
}
