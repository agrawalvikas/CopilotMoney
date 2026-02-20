import { Controller, Post, UseGuards, Body, Get } from '@nestjs/common';
import { PlaidService } from './plaid.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { AuthUser } from '../auth/auth-user.decorator';
import { ExchangeTokenDto } from './dto/exchange-token.dto';
import { SyncPlaidConnectionDto } from './dto/sync-plaid-connection.dto';

@Controller('/api/v1/plaid')
@UseGuards(ClerkAuthGuard)
export class PlaidController {
  constructor(private readonly plaidService: PlaidService) {}

  @Get('link-token')
  async createLinkToken(@AuthUser() auth: { userId: string }) {
    const linkToken = await this.plaidService.createLinkToken(auth.userId);
    return { linkToken };
  }

  @Post('exchange')
  async exchange(
    @Body() dto: ExchangeTokenDto,
    @AuthUser() auth: { userId: string },
  ) {
    return this.plaidService.exchangeTokenAndSync(
      dto.publicToken,
      dto.institutionName,
      auth.userId,
    );
  }

  @Post('sync')
  async sync(
    @Body() dto: SyncPlaidConnectionDto,
    @AuthUser() auth: { userId: string },
  ) {
    return this.plaidService.syncConnection(dto.connectionId, auth.userId);
  }
}
