import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BalancesModule } from '../balances/balances.module.js';
import { OnboardingModule } from '../onboarding/onboarding.module.js';
import { TransactionsModule } from '../transactions/transactions.module.js';
import { ReportResultEntity } from './report-result.entity.js';
import { ReportsController } from './reports.controller.js';
import { ReportEntity } from './reports.entity.js';
import { ReportsRepository } from './reports.repository.js';
import { ReportsService } from './reports.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReportEntity, ReportResultEntity]),
    BalancesModule,
    OnboardingModule,
    TransactionsModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService, ReportsRepository],
  exports: [ReportsService],
})
export class ReportsModule {}
