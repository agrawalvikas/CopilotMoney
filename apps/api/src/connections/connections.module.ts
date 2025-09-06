import { Module } from '@nestjs/common';
import { ConnectionsService } from './connections.service';
import { ConnectionsController } from './connections.controller';
import { AuthModule } from '../auth/auth.module';
import { EncryptionModule } from '../encryption/encryption.module';
import { TellerModule } from '../teller/teller.module';

@Module({
  imports: [AuthModule, EncryptionModule, TellerModule],
  controllers: [ConnectionsController],
  providers: [ConnectionsService],
})
export class ConnectionsModule {}
