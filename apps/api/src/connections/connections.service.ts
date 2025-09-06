import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';

import { CreateConnectionDto } from './dto/create-connection.dto';

@Injectable()
export class ConnectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async create(createConnectionDto: CreateConnectionDto, userId: string) {
    const { accessToken, tellerId, institutionName } = createConnectionDto;

    // Encrypt the access token before storing it
    const encryptedAccessToken = this.encryptionService.encrypt(accessToken);

    // Save the new connection to the database
    const newConnection = await this.prisma.connection.create({
      data: {
        userId,
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
