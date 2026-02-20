
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateSubCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(clerkId: string) {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) throw new NotFoundException('User not found.');

    return this.prisma.category.findMany({
      where: { OR: [{ userId: null }, { userId: user.id }] },
      orderBy: { name: 'asc' },
    });
  }

  async findSubCategories(clerkId: string, categoryId: string) {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) throw new NotFoundException('User not found.');

    return this.prisma.subCategory.findMany({
      where: { categoryId, userId: user.id },
      orderBy: { name: 'asc' },
    });
  }

  async createSubCategory(clerkId: string, categoryId: string, dto: CreateSubCategoryDto) {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) throw new NotFoundException('User not found.');

    // Verify the category exists and is accessible
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, OR: [{ userId: null }, { userId: user.id }] },
    });
    if (!category) throw new NotFoundException('Category not found.');

    return this.prisma.subCategory.create({
      data: { name: dto.name, categoryId, userId: user.id },
    });
  }

  async deleteSubCategory(clerkId: string, categoryId: string, subCategoryId: string) {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) throw new NotFoundException('User not found.');

    const subCategory = await this.prisma.subCategory.findUnique({ where: { id: subCategoryId } });
    if (!subCategory || subCategory.categoryId !== categoryId) throw new NotFoundException('Sub-category not found.');
    if (subCategory.userId !== user.id) throw new ForbiddenException('Not authorized.');

    await this.prisma.subCategory.delete({ where: { id: subCategoryId } });
    return { message: 'Sub-category deleted.' };
  }
}
