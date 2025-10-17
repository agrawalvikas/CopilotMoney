
import { Module } from '@nestjs/common';
import { CategorizationRulesService } from './categorization-rules.service';
import { CategorizationRulesController } from './categorization-rules.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CategorizationRulesController],
  providers: [CategorizationRulesService],
})
export class CategorizationRulesModule {}
