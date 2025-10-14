import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { TestController } from './test/test.controller';
import { TellerModule } from './teller/teller.module';
import { PrismaModule } from './prisma/prisma.module';
import { EncryptionModule } from './encryption/encryption.module';
import { ConnectionsModule } from './connections/connections.module';
import { AccountsModule } from './accounts/accounts.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
    }),
    AuthModule,
    TellerModule,
    PrismaModule,
    EncryptionModule,
    ConnectionsModule,
    AccountsModule,
  ],
  controllers: [AppController, TestController],
  providers: [AppService],
})
export class AppModule {}
