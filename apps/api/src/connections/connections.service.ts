import { Inject, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
import { CreateConnectionDto } from './dto/create-connection.dto';
import type { ClerkClient } from '@clerk/backend';
import { TellerService } from '../teller/teller.service';

/**
 * Handles creating new Teller connections.
 *
 * When the user completes the Teller Link flow in the browser, the frontend
 * receives an enrollment object containing an access token.  This service:
 *   1. Resolves (or creates) the user's local DB record from their Clerk ID
 *   2. Encrypts the access token via EncryptionService before storing it
 *   3. Saves the Connection record in the database
 *   4. Immediately triggers a full Teller sync so the user sees accounts/transactions
 *
 * Note: Plaid connections go through PlaidService.exchangeTokenAndSync() instead,
 * which has the same structure but uses the Plaid SDK's token exchange flow.
 */
@Injectable()
export class ConnectionsService {
  private readonly logger = new Logger(ConnectionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
    @Inject('ClerkClient') private readonly clerkClient: ClerkClient,
    private readonly tellerService: TellerService,
  ) {}

  async create(createConnectionDto: CreateConnectionDto, clerkId: string) {
    const { accessToken, tellerId, institutionName } = createConnectionDto;

    // Resolve the user's email from Clerk — needed to upsert our local User record
    const clerkUser = await this.clerkClient.users.getUser(clerkId);
    if (!clerkUser) throw new NotFoundException('Clerk user not found.');
    const email = clerkUser.emailAddresses.find(e => e.id === clerkUser.primaryEmailAddressId)?.emailAddress;
    if (!email) throw new InternalServerErrorException('Primary email not found for Clerk user.');

    // Upsert the local user record — creates it on first connection, updates email otherwise
    const user = await this.prisma.user.upsert({
      where:  { clerkId },
      update: { email },
      create: { clerkId, email },
    });

    // Encrypt the access token before persisting — never store it in plaintext
    const encryptedAccessToken = this.encryptionService.encrypt(accessToken);

    const newConnection = await this.prisma.connection.create({
      data: {
        userId: user.id,
        tellerId,
        institutionName,
        accessToken: encryptedAccessToken,
      },
    });

    // Immediately sync so the user sees their accounts and transactions right away.
    // This is best-effort — a sync failure here does not fail the connection creation.
    try {
      await this.tellerService.syncData(accessToken, user.id, newConnection.id);
    } catch (error) {
      this.logger.error('Failed to sync data after connection creation', error);
    }

    // Return the connection without the access token — even encrypted, it shouldn't leave the API
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { accessToken: _, ...result } = newConnection;
    return result;
  }
}
