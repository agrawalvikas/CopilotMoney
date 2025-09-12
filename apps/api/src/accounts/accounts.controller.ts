import { Controller, Get, UseGuards } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { AuthUser } from '../auth/auth-user.decorator';

@Controller('/api/v1/accounts')
@UseGuards(ClerkAuthGuard)
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  findAll(@AuthUser() auth: { userId: string }) {
    return this.accountsService.findAll(auth.userId);
  }
}
