import { Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { ClerkClient } from '@clerk/backend';

@Injectable()
export class ConnectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
    @Inject('ClerkClient') private readonly clerkClient: ClerkClient,
  ) {}

  async create(createConnectionDto: CreateConnectionDto, clerkId: string) {
    const { accessToken, tellerId, institutionName } = createConnectionDto;

    // 1. Get user details from Clerk to get their email
    const clerkUser = await this.clerkClient.users.getUser(clerkId);
    if (!clerkUser) {
      throw new NotFoundException('Clerk user not found.');
    }
    const email = clerkUser.emailAddresses.find(e => e.id === clerkUser.primaryEmailAddressId)?.emailAddress;
    if (!email) {
      throw new InternalServerErrorException('Primary email not found for Clerk user.');
    }

    // 2. Find or create the user in our own database
    const user = await this.prisma.user.upsert({
      where: { clerkId },
      update: { email },
      create: { clerkId, email },
    });

    // 3. Encrypt the access token
    const encryptedAccessToken = this.encryptionService.encrypt(accessToken);

    // 4. Save the new connection, linking it to our internal user ID
    const newConnection = await this.prisma.connection.create({
      data: {
        userId: user.id, // Use the internal DB user ID
        tellerId,
        institutionName,
        accessToken: encryptedAccessToken,
      },
    });

    // It's good practice not to return the token, even if it's encrypted.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { accessToken: _, ...result } = newConnection;
    return result;
  }
}
