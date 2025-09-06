import { Controller, Get, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';

@Controller('/api/v1/test')
export class TestController {
  @Get()
  @UseGuards(ClerkAuthGuard)
  getHello(): string {
    return 'This is a protected route.';
  }
}
