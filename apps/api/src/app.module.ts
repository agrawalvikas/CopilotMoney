import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { TestController } from './test/test.controller';
import { TellerModule } from './teller/teller.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AuthModule,
    TellerModule,
  ],
  controllers: [AppController, TestController],
  providers: [AppService],
})
export class AppModule {}
