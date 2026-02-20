import { Injectable } from '@nestjs/common';
import { TransactionFlow } from '@prisma/client';

interface RawTransactionInfo {
  accountType: string;  // Normalised account type: "credit" | "depository" | other
  tellerType: string;   // Raw Teller transaction type: "debit" | "credit" | "payment" | "transfer" | etc.
  description: string;
  amount: number;       // Signed raw amount from Teller (see sign convention below)
}

/**
 * Translates a raw Teller transaction into a standardised TransactionFlow value.
 *
 * Teller's sign convention differs by account type, which is why account type
 * is required as part of the input:
 *
 *   Depository (checking / savings):
 *     amount < 0  →  money LEFT the account  (expense or payment)
 *     amount > 0  →  money ENTERED the account (income / deposit)
 *
 *   Credit card:
 *     amount > 0  →  a charge / purchase (balance owed increases)
 *     amount < 0  →  a payment or refund  (balance owed decreases)
 *
 * This service is used ONLY by TellerService.  PlaidService has its own
 * flow-mapping logic because Plaid exposes a `personal_finance_category` field
 * that allows more reliable TRANSFER detection.
 */
@Injectable()
export class TransactionMapperService {
  getFlow(transactionInfo: RawTransactionInfo): TransactionFlow {
    const { accountType, tellerType, amount } = transactionInfo;

    // -----------------------------------------------------------------------
    // Credit card accounts
    // -----------------------------------------------------------------------
    if (accountType === 'credit') {
      if (amount > 0) {
        // Positive charge on a credit card = purchase → EXPENSE
        return TransactionFlow.EXPENSE;
      }
      if (amount < 0) {
        if (tellerType === 'payment' || tellerType === 'transfer') {
          // Paying the credit card bill moves money between accounts → TRANSFER
          return TransactionFlow.TRANSFER;
        }
        // Other negative amounts are refunds or credits → INCOME
        return TransactionFlow.INCOME;
      }
    }

    // -----------------------------------------------------------------------
    // Depository accounts (checking, savings)
    // -----------------------------------------------------------------------
    if (accountType === 'depository') {
      if (amount < 0) {
        if (tellerType === 'bill_payment' || tellerType === 'transfer') {
          // Paying a bill or moving money to another account → TRANSFER
          return TransactionFlow.TRANSFER;
        }
        // General withdrawal or debit card purchase → EXPENSE
        return TransactionFlow.EXPENSE;
      }
      if (amount > 0) {
        // Deposit, paycheck, ACH credit → INCOME
        return TransactionFlow.INCOME;
      }
    }

    // -----------------------------------------------------------------------
    // Fallback — zero-amount transactions or unrecognised account types
    // -----------------------------------------------------------------------
    return TransactionFlow.UNRECOGNIZED;
  }
}
