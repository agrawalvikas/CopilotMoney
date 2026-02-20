import { Controller, Get, Delete, Post, Param, Body, UseGuards, ValidationPipe } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { AuthUser } from '../auth/auth-user.decorator';
import { CreateAccountDto } from './dto/create-account.dto';

@Controller('/api/v1/accounts')
@UseGuards(ClerkAuthGuard)
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  create(
    @AuthUser() auth: { userId: string },
    @Body(new ValidationPipe({ transform: true, whitelist: true })) body: CreateAccountDto,
  ) {
    return this.accountsService.create(auth.userId, body);
  }

  @Get()
  findAll(@AuthUser() auth: { userId: string }) {
    return this.accountsService.findAllByUser(auth.userId);
  }

  @Delete(':id')
  delete(
    @AuthUser() auth: { userId: string },
    @Param('id') id: string,
  ) {
    return this.accountsService.delete(auth.userId, id);
  }
}
