import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PlaidApi,
  PlaidEnvironments,
  Configuration,
  Products,
  CountryCode,
  Transaction as PlaidTransaction,
} from 'plaid';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
import { DefaultCategorizationService } from '../transactions/default-categorization.service';
import { TransactionFlow } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Manages the complete lifecycle of Plaid bank connections:
 *   - Creating a Link token for the frontend Plaid Link UI
 *   - Exchanging the public token (from Plaid Link) for a permanent access token
 *   - Syncing accounts and transactions incrementally using Plaid's cursor-based API
 *
 * Sync strategy (cursor-based incremental):
 *   Plaid's transactions/sync endpoint is stateful — it tracks a cursor that
 *   advances with every call.  We store the cursor on the Connection record so
 *   subsequent syncs only receive new/modified/removed transactions rather than
 *   the entire history.  A null cursor means "start from the beginning".
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
export class PlaidService {
  private readonly plaidClient: PlaidApi;
  private readonly logger = new Logger(PlaidService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
    private readonly defaultCategorizer: DefaultCategorizationService,
  ) {
    // Plaid environment is configured via PLAID_ENV: sandbox | development | production
    const env = this.configService.get<string>('PLAID_ENV', 'sandbox');
    const configuration = new Configuration({
      basePath: PlaidEnvironments[env],
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': this.configService.get<string>('PLAID_CLIENT_ID'),
          'PLAID-SECRET': this.configService.get<string>('PLAID_SECRET'),
        },
      },
    });
    this.plaidClient = new PlaidApi(configuration);
  }

  /**
   * Creates a short-lived Plaid Link token that the frontend passes to the
   * Plaid Link widget to open the bank connection flow.
   */
  async createLinkToken(clerkId: string): Promise<string> {
    const response = await this.plaidClient.linkTokenCreate({
      user: { client_user_id: clerkId },
      client_name: 'CopilotMoney',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
    });
    return response.data.link_token;
  }

  /**
   * Called after the user completes the Plaid Link flow.
   *
   * Steps:
   *   1. Exchange the one-time public token for a permanent access token
   *   2. Encrypt and persist the access token as a new Connection record
   *   3. Immediately trigger a full sync so the user sees their data right away
   */
  async exchangeTokenAndSync(
    publicToken: string,
    institutionName: string,
    clerkId: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) throw new Error('User not found');

    // Exchange the short-lived public token for a permanent access token
    const exchangeResponse = await this.plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });
    const { access_token, item_id } = exchangeResponse.data;

    // Store the encrypted token — the raw access_token is never persisted in plaintext
    const encryptedToken = this.encryptionService.encrypt(access_token);
    const connection = await this.prisma.connection.create({
      data: {
        provider: 'PLAID',
        plaidItemId: item_id,
        institutionName,
        accessToken: encryptedToken,
        userId: user.id,
      },
    });

    // Kick off the initial sync; errors here are non-fatal (user can retry manually)
    try {
      await this.syncData(access_token, user.id, connection.id);
    } catch (error) {
      this.logger.error('Failed to sync Plaid data after connection', error);
    }

    return { id: connection.id, institutionName: connection.institutionName };
  }

  /**
   * Triggers an incremental sync for an existing Plaid connection.
   *
   * First calls transactions/refresh to ask Plaid to pull the latest data
   * from the financial institution before we fetch it.  This call is
   * fire-and-forget — it's not available in sandbox so errors are swallowed.
   *
   * Then calls syncData() with the stored cursor so only new/modified
   * transactions are returned.
   */
  async syncConnection(connectionId: string, clerkId: string) {
    const user = await this.prisma.user.findUnique({
      where: { clerkId },
      include: { connections: true },
    });
    if (!user) throw new Error('User not found');

    const connection = user.connections.find((c) => c.id === connectionId);
    if (!connection || connection.provider !== 'PLAID') {
      throw new Error('Plaid connection not found');
    }

    const accessToken = this.encryptionService.decrypt(connection.accessToken);

    // Ask Plaid to pull fresh data from the institution before we fetch it.
    // This is asynchronous on Plaid's side — errors are silently ignored
    // because sandbox environments don't support this endpoint.
    try {
      await this.plaidClient.transactionsRefresh({ access_token: accessToken });
    } catch {
      this.logger.warn(`transactions/refresh not available for connection ${connectionId} (sandbox?)`);
    }

    // Pass the stored cursor so Plaid only returns changes since the last sync
    return this.syncData(accessToken, user.id, connectionId, connection.plaidCursor ?? undefined);
  }

  /**
   * Core sync routine shared by both initial connection and subsequent syncs.
   *
   * Steps:
   *   1. Fetch and upsert all accounts for this connection
   *   2. Page through transactions/sync using the cursor until has_more = false
   *   3. Save the new cursor to the Connection record for next time
   *   4. Upsert all added/modified transactions with flow and category
   *
   * @param cursor  If undefined, starts from the beginning (full history fetch).
   *                If set, only fetches changes since that cursor position.
   */
  async syncData(
    accessToken: string,
    userId: string,
    connectionId: string,
    cursor?: string,
  ) {
    // --- Step 1: Accounts ---
    const accountsResponse = await this.plaidClient.accountsGet({ access_token: accessToken });
    const plaidAccounts = accountsResponse.data.accounts;

    // Map plaid account_id → internal DB id for linking transactions
    const accountIdMap = new Map<string, string>();

    for (const acct of plaidAccounts) {
      const accountType = this.normalizeAccountType(acct.type, acct.subtype ?? '');
      const savedAccount = await this.prisma.account.upsert({
        where: { plaidAccountId: acct.account_id },
        create: {
          plaidAccountId: acct.account_id,
          name: acct.name,
          mask: acct.mask,
          type: accountType,
          balance: acct.balances.current != null ? new Decimal(acct.balances.current) : null,
          availableBalance: acct.balances.available != null ? new Decimal(acct.balances.available) : null,
          currency: acct.balances.iso_currency_code ?? 'USD',
          institutionName: (await this.prisma.connection.findUnique({ where: { id: connectionId }, select: { institutionName: true } }))?.institutionName ?? '',
          userId,
          connectionId,
        },
        update: {
          // Only refresh live balance data on subsequent syncs
          balance: acct.balances.current != null ? new Decimal(acct.balances.current) : null,
          availableBalance: acct.balances.available != null ? new Decimal(acct.balances.available) : null,
        },
      });
      accountIdMap.set(acct.account_id, savedAccount.id);
    }

    // --- Step 2: Load user categorization rules ---
    const rules = await this.prisma.categorizationRule.findMany({ where: { userId } });

    // --- Step 3: Paginate through transactions/sync ---
    // Plaid may return results in multiple pages; keep fetching until has_more = false
    let nextCursor = cursor;
    let hasMore = true;
    const allAdded: PlaidTransaction[] = [];
    const allModified: PlaidTransaction[] = [];

    while (hasMore) {
      const syncResponse = await this.plaidClient.transactionsSync({
        access_token: accessToken,
        cursor: nextCursor,
      });
      const { added, modified, next_cursor, has_more } = syncResponse.data;
      allAdded.push(...added);
      allModified.push(...modified);
      nextCursor = next_cursor;
      hasMore = has_more;
    }

    // Persist the new cursor so the next sync is incremental
    await this.prisma.connection.update({
      where: { id: connectionId },
      data: { plaidCursor: nextCursor },
    });

    // --- Step 4: Upsert transactions ---
    for (const txn of [...allAdded, ...allModified]) {
      const internalAccountId = accountIdMap.get(txn.account_id);
      if (!internalAccountId) continue; // Skip if the account wasn't synced above

      const plaidAccount = plaidAccounts.find((a) => a.account_id === txn.account_id);
      const accountType = this.normalizeAccountType(plaidAccount?.type ?? '', plaidAccount?.subtype ?? '');
      const flow = this.getFlow(txn.amount, accountType, txn.personal_finance_category?.primary);

      // Always store as a positive amount; direction is encoded in `flow`
      const normalizedAmount = new Decimal(Math.abs(txn.amount));

      // Apply user rules first, then fall back to default keyword matching
      let categoryId: string | null = null;
      for (const rule of rules) {
        if (txn.name.toLowerCase().includes(rule.descriptionContains.toLowerCase())) {
          categoryId = rule.categoryId;
          break;
        }
      }
      if (!categoryId) {
        categoryId = await this.defaultCategorizer.categorize(txn.name);
      }

      await this.prisma.transaction.upsert({
        where: { plaidTransactionId: txn.transaction_id },
        create: {
          plaidTransactionId: txn.transaction_id,
          description: txn.name,
          amount: normalizedAmount,
          date: new Date(txn.date),
          type: txn.transaction_type ?? 'unknown',
          flow,
          accountId: internalAccountId,
          categoryId,
        },
        update: {
          amount: normalizedAmount,
          flow,
          description: txn.name,
          // Intentionally NOT updating categoryId — preserve any manual category changes
          // the user may have made since the last sync.
        },
      });
    }

    return { status: 'ok', message: `Synced ${allAdded.length} new, ${allModified.length} modified transactions.` };
  }

  /**
   * Determines TransactionFlow from Plaid's amount and optional category hint.
   *
   * Plaid's sign convention (opposite of what you might expect):
   *   amount > 0  →  money LEFT the account (expense/debit)
   *   amount < 0  →  money ENTERED the account (income/credit)
   *
   * Plaid's personal_finance_category.primary is used when available to
   * reliably detect transfers without relying on the sign alone.
   */
  private getFlow(amount: number, accountType: string, primaryCategory?: string): TransactionFlow {
    // Plaid explicitly labels transfers — use the category hint for accuracy
    if (primaryCategory === 'TRANSFER_IN') return TransactionFlow.INCOME;
    if (primaryCategory === 'TRANSFER_OUT' || primaryCategory === 'LOAN_PAYMENTS') {
      return TransactionFlow.TRANSFER;
    }

    // Fall back to sign-based detection
    if (amount > 0) return TransactionFlow.EXPENSE;
    if (amount < 0) return TransactionFlow.INCOME;
    return TransactionFlow.UNRECOGNIZED;
  }

  /**
   * Converts Plaid's account type/subtype into our normalised internal type string.
   * This gives us a consistent vocabulary regardless of provider.
   */
  private normalizeAccountType(plaidType: string, plaidSubtype: string): string {
    if (plaidType === 'credit') return 'credit';
    if (plaidType === 'depository') {
      if (plaidSubtype === 'savings') return 'savings';
      return 'checking';
    }
    if (plaidType === 'investment') return 'other';
    if (plaidType === 'loan') return 'other';
    return plaidSubtype || plaidType || 'other';
  }
}
