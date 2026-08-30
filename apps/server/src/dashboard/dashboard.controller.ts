import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service.js';

@Controller('dashboard')
@ApiTags('Dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Get dashboard overview' })
  @ApiQuery({
    name: 'basisDate',
    required: false,
    example: '2026-08-30',
    description: '대시보드 기준일. 없으면 서버 오늘 날짜를 사용한다.',
  })
  @ApiOkResponse({
    description: '대시보드 요약 조회 성공',
    example: {
      basisDate: '2026-08-30',
      balanceBasisDate: '2026-08-30',
      totals: {
        transactionKrw: 9290000000,
        balanceKrw: 4944000000,
        onboardingCount: 215,
      },
      upcomingKycCorporations: [],
    },
  })
  getOverview(@Query('basisDate') basisDate?: string) {
    return this.dashboardService.getOverview(basisDate);
  }
}
