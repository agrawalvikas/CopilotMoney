import { Module } from '@nestjs/common';
import { ConnectionsService } from './connections.service';
import { ConnectionsController } from './connections.controller';
import { EncryptionModule } from '../encryption/encryption.module';
import { TellerModule } from '../teller/teller.module';

@Module({
  imports: [EncryptionModule, TellerModule],
  controllers: [ConnectionsController],
  providers: [ConnectionsService],
})
export class ConnectionsModule {}
