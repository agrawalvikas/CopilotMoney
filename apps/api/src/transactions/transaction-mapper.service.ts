
import { Injectable } from '@nestjs/common';
import { TransactionFlow } from '@prisma/client';

// Define a raw transaction object type, mirroring what we get from Teller
interface RawTransaction {
  type: string;
  description: string;
  amount: number; // Or string, depending on what axios returns
}

// Define the structure for a mapping rule
interface FlowRule {
  // Conditions
  tellerTypes?: string[];
  descriptionContains?: string;
  // Result
  flow: TransactionFlow;
}

// Centralized, configurable rules
const rules: FlowRule[] = [
  // Rule for transfers (e.g., credit card payments)
  {
    tellerTypes: ['payment'],
    flow: TransactionFlow.TRANSFER,
  },
  {
    descriptionContains: 'credit card payment',
    flow: TransactionFlow.TRANSFER,
  },

  // Rule for income
  {
    tellerTypes: ['credit', 'deposit', 'adjustment'],
    flow: TransactionFlow.INCOME,
  },
  {
    descriptionContains: 'refund',
    flow: TransactionFlow.INCOME,
  },

  // Rule for expenses
  {
    tellerTypes: ['debit', 'card_payment','fees'],
    flow: TransactionFlow.EXPENSE,
  },
];

@Injectable()
export class TransactionMapperService {
  getFlow(transaction: RawTransaction): TransactionFlow {
    const lowerCaseDescription = transaction.description.toLowerCase();

    for (const rule of rules) {
      // Check tellerType condition
      if (rule.tellerTypes && rule.tellerTypes.includes(transaction.type)) {
        return rule.flow;
      }

      // Check descriptionContains condition
      if (rule.descriptionContains && lowerCaseDescription.includes(rule.descriptionContains)) {
        return rule.flow;
      }
    }

    // Default fallback: if it's not income or transfer, it's an expense.
    // This is safer than defaulting to income.
    return TransactionFlow.EXPENSE;
  }
}
