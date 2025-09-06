import { Controller, Post, UseGuards, Body } from '@nestjs/common';
import { ConnectionsService } from './connections.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { AuthUser } from '../auth/auth-user.decorator';

import { CreateConnectionDto } from './dto/create-connection.dto';

@Controller('connections')
@UseGuards(ClerkAuthGuard)
export class ConnectionsController {
  constructor(private readonly connectionsService: ConnectionsService) {}

  @Post()
  create(
    @Body() createConnectionDto: CreateConnectionDto,
    @AuthUser() authUser: { id: string },
  ) {
    return this.connectionsService.create(createConnectionDto, authUser.id);
  }
}
