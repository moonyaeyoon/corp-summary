import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AiModule } from './ai/ai.module.js';
import { DatabaseModule } from './database/database.module.js';
import { BalancesModule } from './balances/balances.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { OnboardingModule } from './onboarding/onboarding.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { TransactionsModule } from './transactions/transactions.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AiModule,
    DatabaseModule,
    DashboardModule,
    ReportsModule,
    TransactionsModule,
    OnboardingModule,
    BalancesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
