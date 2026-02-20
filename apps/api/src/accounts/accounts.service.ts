import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { randomUUID } from 'crypto';

/**
 * Manages financial accounts in the database.
 *
 * Accounts come from three sources:
 *   1. Teller sync   — created/updated in TellerService.syncData()
 *   2. Plaid sync    — created/updated in PlaidService.syncData()
 *   3. Manual entry  — created here via create(); no live balance, isManual = true
 *
 * Manual accounts use a generated "manual_<uuid>" as their tellerAccountId
 * placeholder so the unique constraint on that column is satisfied.
 *
 * Deleting an account cascades to all its transactions (defined in the schema),
 * so one delete call removes the account AND all its transaction history.
 */
@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a user-owned manual account (cash, wallet, etc.).
   * institutionName defaults to the account name when not provided.
   */
  async create(clerkId: string, dto: CreateAccountDto) {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) throw new NotFoundException('User not found.');

    return this.prisma.account.create({
      data: {
        name: dto.name,
        type: dto.type,
        institutionName: dto.institutionName ?? dto.name,
        currency: dto.currency ?? 'USD',
        isManual: true,
        tellerAccountId: `manual_${randomUUID()}`, // Placeholder to satisfy the unique constraint
        userId: user.id,
      },
    });
  }

  /**
   * Returns all accounts for a user, including the connection provider info
   * (TELLER / PLAID) so the frontend can route sync calls to the correct endpoint.
   * Ordered alphabetically by institution name for consistent display.
   */
  async findAllByUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) return [];

    return this.prisma.account.findMany({
      where:   { userId: user.id },
      include: { connection: { select: { provider: true } } },
      orderBy: { institutionName: 'asc' },
    });
  }

  /**
   * Permanently deletes an account and all its transactions (via cascade).
   * Ownership is verified before deletion to prevent cross-user data access.
   */
  async delete(clerkId: string, accountId: string) {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) throw new NotFoundException('User not found.');

    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundException('Account not found.');
    if (account.userId !== user.id) throw new ForbiddenException('You do not have permission to delete this account.');

    // The schema sets onDelete: Cascade on Account → Transaction,
    // so this single delete also removes all associated transactions
    await this.prisma.account.delete({ where: { id: accountId } });

    return { message: 'Account and all associated transactions deleted.' };
  }
}
