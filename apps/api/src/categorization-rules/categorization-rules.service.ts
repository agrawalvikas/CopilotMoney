
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';

@Injectable()
export class CategorizationRulesService {
  constructor(private readonly prisma: PrismaService) {}

  private async _getUser(clerkId: string) {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    return user;
  }

  async create(clerkId: string, createRuleDto: CreateRuleDto) {
    const user = await this._getUser(clerkId);

    // Verify the category exists and belongs to the user or is a default category
    const category = await this.prisma.category.findFirst({
      where: {
        id: createRuleDto.categoryId,
        OR: [{ userId: user.id }, { userId: null }],
      },
    });

    if (!category) {
      throw new ForbiddenException('Category not found or does not belong to user.');
    }

    return this.prisma.categorizationRule.create({
      data: {
        userId: user.id,
        descriptionContains: createRuleDto.descriptionContains,
        categoryId: createRuleDto.categoryId,
      },
    });
  }

  async findAll(clerkId: string) {
    const user = await this._getUser(clerkId);
    return this.prisma.categorizationRule.findMany({
      where: { userId: user.id },
      include: { category: { select: { name: true } } }, // Include category name for context
      orderBy: { descriptionContains: 'asc' },
    });
  }

  async update(clerkId: string, ruleId: string, updateRuleDto: UpdateRuleDto) {
    const user = await this._getUser(clerkId);
    const result = await this.prisma.categorizationRule.updateMany({
      where: {
        id: ruleId,
        userId: user.id, // Ownership check
      },
      data: updateRuleDto,
    });

    if (result.count === 0) {
      throw new NotFoundException('Rule not found or you do not have permission to update it.');
    }

    return this.prisma.categorizationRule.findUnique({ where: { id: ruleId } });
  }

  async remove(clerkId: string, ruleId: string) {
    const user = await this._getUser(clerkId);
    const result = await this.prisma.categorizationRule.deleteMany({
      where: {
        id: ruleId,
        userId: user.id, // Ownership check
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Rule not found or you do not have permission to delete it.');
    }

    return { message: 'Rule deleted successfully' };
  }
}
