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
    const accounts = await this.tellerClient.accounts.list({ accessToken });

    for (const account of accounts) {
      const savedAccount = await this.prisma.account.upsert({
        where: { tellerAccountId: account.id },
        create: {
          tellerAccountId: account.id,
          name: account.name,
          mask: account.mask,
          type: account.type,
          balance: new Decimal(account.balance),
          currency: account.currency,
          institutionName: account.institution.name,
          userId,
        },
        update: {
          balance: new Decimal(account.balance),
        },
      });

      const transactions = await this.tellerClient.transactions.list({
        accessToken,
        accountId: account.id,
      });

      for (const transaction of transactions) {
        await this.prisma.transaction.upsert({
          where: { tellerTransactionId: transaction.id },
          create: {
            tellerTransactionId: transaction.id,
            description: transaction.description,
            amount: new Decimal(transaction.amount),
            date: new Date(transaction.date),
            currency: transaction.currency,
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
