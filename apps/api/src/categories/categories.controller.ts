
import { Controller, Get, Post, Delete, UseGuards, Param, Body, ValidationPipe } from '@nestjs/common';
import { CategoriesService, CreateSubCategoryDto } from './categories.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { AuthUser } from '../auth/auth-user.decorator';

@Controller('/api/v1/categories')
@UseGuards(ClerkAuthGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll(@AuthUser() auth: { userId: string }) {
    return this.categoriesService.findAll(auth.userId);
  }

  @Get(':categoryId/subcategories')
  findSubCategories(
    @AuthUser() auth: { userId: string },
    @Param('categoryId') categoryId: string,
  ) {
    return this.categoriesService.findSubCategories(auth.userId, categoryId);
  }

  @Post(':categoryId/subcategories')
  createSubCategory(
    @AuthUser() auth: { userId: string },
    @Param('categoryId') categoryId: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) body: CreateSubCategoryDto,
  ) {
    return this.categoriesService.createSubCategory(auth.userId, categoryId, body);
  }

  @Delete(':categoryId/subcategories/:id')
  deleteSubCategory(
    @AuthUser() auth: { userId: string },
    @Param('categoryId') categoryId: string,
    @Param('id') id: string,
  ) {
    return this.categoriesService.deleteSubCategory(auth.userId, categoryId, id);
  }
}
