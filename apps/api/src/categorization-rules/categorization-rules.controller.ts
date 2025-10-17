
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ValidationPipe } from '@nestjs/common';
import { CategorizationRulesService } from './categorization-rules.service';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { AuthUser } from '../auth/auth-user.decorator';

@Controller('/api/v1/rules')
@UseGuards(ClerkAuthGuard)
export class CategorizationRulesController {
  constructor(private readonly rulesService: CategorizationRulesService) {}

  @Post()
  create(
    @AuthUser() auth: { userId: string },
    @Body(new ValidationPipe({ transform: true, whitelist: true })) createRuleDto: CreateRuleDto,
  ) {
    return this.rulesService.create(auth.userId, createRuleDto);
  }

  @Get()
  findAll(@AuthUser() auth: { userId: string }) {
    return this.rulesService.findAll(auth.userId);
  }

  @Patch(':id')
  update(
    @AuthUser() auth: { userId: string },
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) updateRuleDto: UpdateRuleDto,
  ) {
    return this.rulesService.update(auth.userId, id, updateRuleDto);
  }

  @Delete(':id')
  remove(@AuthUser() auth: { userId: string }, @Param('id') id: string) {
    return this.rulesService.remove(auth.userId, id);
  }
}
