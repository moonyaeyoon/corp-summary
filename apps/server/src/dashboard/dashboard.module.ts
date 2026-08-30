import { Module } from '@nestjs/common';
import { BalancesModule } from '../balances/balances.module.js';
import { OnboardingModule } from '../onboarding/onboarding.module.js';
import { TransactionsModule } from '../transactions/transactions.module.js';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';

@Module({
  imports: [BalancesModule, OnboardingModule, TransactionsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
