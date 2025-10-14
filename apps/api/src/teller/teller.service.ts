import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import type { AxiosInstance } from 'axios';

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

      const savedAccount = await this.prisma.account.upsert({
        where: { tellerAccountId: account.id },
        create: {
          tellerAccountId: account.id,
          name: account.name,
          mask: account.last_four,
          type: account.type === 'depository' ? 'checking' : 'credit_card',
          balance: new Decimal(balance.available),
          currency: account.currency,
          institutionName: account.institution.name,
          userId,
          connectionId,
        },
        update: {
          balance: new Decimal(balance.available),
        },
      });

      const transactionsResponse = await this.tellerApi.get<TellerTransaction[]>(`/accounts/${account.id}/transactions`, { auth });
      const transactions = transactionsResponse.data;

      for (const transaction of transactions) {
        await this.prisma.transaction.upsert({
          where: { tellerTransactionId: transaction.id },
          create: {
            tellerTransactionId: transaction.id,
            description: transaction.description,
            amount: new Decimal(transaction.amount),
            date: new Date(transaction.date),
            type: transaction.type,
            accountId: savedAccount.id,
          },
          update: {
            amount: new Decimal(transaction.amount),
            description: transaction.description,
          },
        });
      }
    }

    return { status: 'ok', message: 'Sync completed successfully.' };
  }
}