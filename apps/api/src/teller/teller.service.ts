import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import type { AxiosInstance } from 'axios';
import { TransactionMapperService } from '../transactions/transaction-mapper.service';

// Define interfaces for the Teller API responses based on their documentation/structure
interface TellerAccount {
  id: string;
  last_four: string;
  name: string;
  institution: { name: string };
  type: string;
  currency: string;
}

interface TellerBalance {
  available: string;
  current: string; // Add current balance for credit cards
}

interface TellerTransaction {
  id: string;
  description: string;
  amount: string;
  date: string;
  type: 'debit' | 'credit';
}

@Injectable()
export class TellerService {
  constructor(
    @Inject('TellerApi')
    private readonly tellerApi: AxiosInstance,
    private readonly prisma: PrismaService,
    private readonly transactionMapper: TransactionMapperService,
  ) {}

  async syncData(accessToken: string, userId: string, connectionId: string) {
    const auth = { username: accessToken, password: '' };

    const accountsResponse = await this.tellerApi.get<TellerAccount[]>('/accounts', { auth });
    const accounts = accountsResponse.data;

    if (!Array.isArray(accounts)) {
      console.error('Teller API did not return an array of accounts. Halting sync for this connection.');
      return;
    }

    for (const account of accounts) {
      const balanceResponse = await this.tellerApi.get<TellerBalance>(`/accounts/${account.id}/balances`, { auth });
      const balance = balanceResponse.data;

      // For credit cards, the 'current' balance is what's owed.
      // For depository accounts, the 'available' balance is what can be spent.
      const balanceToUse = account.type === 'credit' ? balance.current : balance.available;

      const savedAccount = await this.prisma.account.upsert({
        where: { tellerAccountId: account.id },
        create: {
          tellerAccountId: account.id,
          name: account.name,
          mask: account.last_four,
          type: account.type,
          balance: new Decimal(balanceToUse),
          currency: account.currency,
          institutionName: account.institution.name,
          userId,
          connectionId,
        },
        update: {
          balance: new Decimal(balanceToUse),
        },
      });

      const transactionsResponse = await this.tellerApi.get<TellerTransaction[]>(`/accounts/${account.id}/transactions`, { auth });
      const transactions = transactionsResponse.data;

      for (const transaction of transactions) {
        // Determine the flow using the mapper service
        const flow = this.transactionMapper.getFlow({
          type: transaction.type,
          description: transaction.description,
          amount: parseFloat(transaction.amount),
        });

        await this.prisma.transaction.upsert({
          where: { tellerTransactionId: transaction.id },
          create: {
            tellerTransactionId: transaction.id,
            description: transaction.description,
            amount: new Decimal(transaction.amount),
            date: new Date(transaction.date),
            type: transaction.type,
            flow: flow, // Set the new flow column
            accountId: savedAccount.id,
          },
          update: {
            amount: new Decimal(transaction.amount),
            description: transaction.description,
            flow: flow, // Also update the flow on existing transactions
          },
        });
      }
    }

    return { status: 'ok', message: 'Sync completed successfully.' };
  }
}