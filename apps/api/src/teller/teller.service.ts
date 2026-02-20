import { Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import type { AxiosInstance } from 'axios';
import { TransactionMapperService } from '../transactions/transaction-mapper.service';
import { DefaultCategorizationService } from '../transactions/default-categorization.service';

// Teller API response shapes (based on Teller REST API docs)
interface TellerAccount {
  id: string;
  last_four: string;
  name: string;
  institution: { name: string };
  type: string;      // e.g. "depository", "credit"
  currency: string;
}

interface TellerBalance {
  available: string; // Available funds / available credit
  current: string;   // Not used — Teller uses "ledger" for the settled balance
  ledger: string;    // The ledger/settled balance (what we store as `balance`)
}

interface TellerTransaction {
  id: string;
  description: string;
  amount: string;    // Signed decimal string — positive or negative depending on account type
  date: string;      // ISO date string "YYYY-MM-DD"
  type: 'debit' | 'credit'; // Teller's raw transaction type
}

/**
 * Handles syncing accounts and transactions from Teller for a single connection.
 *
 * Sync strategy: Teller does not support cursor-based incremental syncs, so
 * every call re-fetches all accounts and all transactions for each account.
 * Upserts are used to handle both new and updated records without duplication.
 *
 * Categorization priority during sync:
 *   1. User-defined CategorizationRules (substring match on description)
 *   2. DefaultCategorizationService (built-in keyword rules)
 *   3. "Other" category as the final fallback
 *
 * Note: Manual category changes made by the user are NOT overwritten on sync
 * (the upsert `update` block intentionally omits categoryId).
 */
@Injectable()
export class TellerService {
  private readonly logger = new Logger(TellerService.name);

  constructor(
    @Inject('TellerApi')
    private readonly tellerApi: AxiosInstance,
    private readonly prisma: PrismaService,
    private readonly transactionMapper: TransactionMapperService,
    private readonly defaultCategorizer: DefaultCategorizationService,
  ) {}

  /**
   * Full re-sync for a Teller connection.
   *
   * Steps:
   *   1. Fetch all accounts for the connection
   *   2. For each account, fetch its balance and upsert it into the DB
   *   3. For each account, fetch all transactions and upsert them
   *   4. Determine the TransactionFlow for each transaction using TransactionMapperService
   *   5. Apply categorization rules (user-defined first, then default keywords)
   *
   * Accounts that return a 4xx error (e.g. 410 account.closed) are skipped so
   * one failed account does not abort the entire sync.
   */
  async syncData(accessToken: string, userId: string, connectionId: string) {
    // Teller uses HTTP Basic Auth: access token as the username, empty password
    const auth = { username: accessToken, password: '' };

    // Load all user categorization rules up front to avoid per-transaction DB queries
    const rules = await this.prisma.categorizationRule.findMany({
      where: { userId },
    });

    const accountsResponse = await this.tellerApi.get<TellerAccount[]>('/accounts', { auth });
    const accounts = accountsResponse.data;

    if (!Array.isArray(accounts)) {
      this.logger.error('Teller API did not return an array of accounts. Halting sync for this connection.');
      return;
    }

    for (const account of accounts) {
      try {
        const balanceResponse = await this.tellerApi.get<TellerBalance>(`/accounts/${account.id}/balances`, { auth });
        const balance = balanceResponse.data;

        const savedAccount = await this.prisma.account.upsert({
          where: { tellerAccountId: account.id },
          create: {
            tellerAccountId: account.id,
            name: account.name,
            mask: account.last_four,
            type: account.type,
            balance: new Decimal(balance.ledger ?? '0'),
            availableBalance: new Decimal(balance.available ?? '0'),
            currency: account.currency,
            institutionName: account.institution.name,
            userId,
            connectionId,
          },
          update: {
            // Only update live data on subsequent syncs; don't overwrite metadata
            balance: new Decimal(balance.ledger ?? '0'),
            availableBalance: new Decimal(balance.available ?? '0'),
          },
        });

        const transactionsResponse = await this.tellerApi.get<TellerTransaction[]>(`/accounts/${account.id}/transactions`, { auth });
        const transactions = transactionsResponse.data;

        for (const transaction of transactions) {
          const rawAmount = parseFloat(transaction.amount);

          if (isNaN(rawAmount)) {
            this.logger.error(`Skipping transaction ${transaction.id}: invalid amount "${transaction.amount}"`);
            continue;
          }

          // TransactionMapperService needs the raw signed amount to determine flow direction
          const flow = this.transactionMapper.getFlow({
            accountType: account.type,      // e.g. "credit", "depository"
            tellerType: transaction.type,   // e.g. "debit", "credit", "transfer"
            description: transaction.description,
            amount: rawAmount,
          });

          // Store amounts as absolute values; direction is captured by `flow`
          const normalizedAmount = new Decimal(Math.abs(rawAmount));

          // Apply user rules first (higher priority), then fall back to default keywords
          let categoryId: string | null = null;
          for (const rule of rules) {
            if (transaction.description.toLowerCase().includes(rule.descriptionContains.toLowerCase())) {
              categoryId = rule.categoryId;
              break;
            }
          }
          if (!categoryId) {
            categoryId = await this.defaultCategorizer.categorize(transaction.description);
          }

          await this.prisma.transaction.upsert({
            where: { tellerTransactionId: transaction.id },
            create: {
              tellerTransactionId: transaction.id,
              description: transaction.description,
              amount: normalizedAmount,
              date: new Date(transaction.date),
              type: transaction.type,
              flow,
              accountId: savedAccount.id,
              categoryId,
            },
            update: {
              amount: normalizedAmount,
              flow,
              // Intentionally NOT updating categoryId — preserve any manual category changes
              // the user may have made since the last sync.
            },
          });
        }
      } catch (error: any) {
        const status = error?.response?.status;
        const code = error?.response?.data?.error?.code;
        this.logger.error(`Skipping account ${account.id} (${account.name}): ${code ?? error?.message} (HTTP ${status ?? 'N/A'})`);
        // Continue syncing remaining accounts even if one fails (e.g. 410 account.closed)
      }
    }

    return { status: 'ok', message: 'Sync completed successfully.' };
  }
}
