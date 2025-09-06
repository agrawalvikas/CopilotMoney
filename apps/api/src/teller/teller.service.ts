import { Injectable, Inject } from '@nestjs/common';
import { TellerClient } from '@maxint/teller';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class TellerService {
  constructor(
    @Inject('TellerClient')
    private readonly tellerClient: TellerClient,
    private readonly prisma: PrismaService,
  ) {}

  async syncData(accessToken: string, userId: string) {
    const accounts = await this.tellerClient.account.list({ accessToken });

    for (const account of accounts) {
      const balance = await this.tellerClient.account.balances(account.id, { accessToken });

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
        },
        update: {
          balance: new Decimal(balance.available),
        },
      });

      const transactions = await this.tellerClient.transactions.list(
        account.id,
        { accessToken },
      );

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
