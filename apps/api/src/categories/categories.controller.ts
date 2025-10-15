
import { Controller, Get, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
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
}
