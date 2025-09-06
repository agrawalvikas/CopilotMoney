import { Controller, Post, UseGuards, Body } from '@nestjs/common';
import { ConnectionsService } from './connections.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { AuthUser } from '../auth/auth-user.decorator';

import { CreateConnectionDto } from './dto/create-connection.dto';

@Controller('/api/v1/connections')
@UseGuards(ClerkAuthGuard)
export class ConnectionsController {
  constructor(private readonly connectionsService: ConnectionsService) {}

  @Post()
  create(
    @Body() createConnectionDto: CreateConnectionDto,
    @AuthUser() auth: { userId: string },
  ) {
    // auth.userId is the clerkId from the token
    return this.connectionsService.create(createConnectionDto, auth.userId);
  }
}
