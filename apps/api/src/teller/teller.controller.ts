import {
  Controller,
  Post,
  UseGuards,
  Body,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { TellerService } from './teller.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { AuthUser } from '../auth/auth-user.decorator';
import { SyncConnectionDto } from './dto/sync-connection.dto';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';

@Controller('/api/v1/teller')
@UseGuards(ClerkAuthGuard)
export class TellerController {
  constructor(
    private readonly tellerService: TellerService,
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
  ) {}

  @Post('sync')
  async sync(
    @Body() syncConnectionDto: SyncConnectionDto,
    @AuthUser() auth: { userId: string },
  ) {
    const { connectionId } = syncConnectionDto;

    const user = await this.prisma.user.findUnique({
      where: { clerkId: auth.userId },
      include: { connections: true },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const connection = user.connections.find((c) => c.id === connectionId);

    if (!connection) {
      throw new ForbiddenException('Connection not found or does not belong to user.');
    }

    const decryptedAccessToken = this.encryptionService.decrypt(
      connection.accessToken,
    );

    return this.tellerService.syncData(decryptedAccessToken, user.id, connectionId);
  }
}
