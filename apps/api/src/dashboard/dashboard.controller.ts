
import { Controller, Get, UseGuards, Query, ValidationPipe } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { AuthUser } from '../auth/auth-user.decorator';
import { QuerySummaryDto } from './dto/query-summary.dto';
import { QueryMonthlyBreakdownDto } from './dto/query-monthly-breakdown.dto';

@Controller('/api/v1/dashboard')
@UseGuards(ClerkAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getSummary(
    @AuthUser() auth: { userId: string },
    @Query(new ValidationPipe({ transform: true, whitelist: true })) query: QuerySummaryDto,
  ) {
    return this.dashboardService.getSummary(auth.userId, query);
  }

  @Get('monthly-breakdown')
  getMonthlyBreakdown(
    @AuthUser() auth: { userId: string },
    @Query(new ValidationPipe({ transform: true, whitelist: true })) query: QueryMonthlyBreakdownDto,
  ) {
    return this.dashboardService.getMonthlyBreakdown(auth.userId, query);
  }

  @Get('transaction-years')
  getTransactionYears(@AuthUser() auth: { userId: string }) {
    return this.dashboardService.getTransactionYears(auth.userId);
  }
}
