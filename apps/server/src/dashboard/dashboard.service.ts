import { Injectable } from '@nestjs/common';
import { BalancesService } from '../balances/balances.service.js';
import { OnboardingService } from '../onboarding/onboarding.service.js';
import { TransactionsService } from '../transactions/transactions.service.js';

function toDateString(value: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Seoul',
    year: 'numeric',
  }).format(value);
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly balancesService: BalancesService,
    private readonly onboardingService: OnboardingService,
    private readonly transactionsService: TransactionsService,
  ) {}

  async getOverview(basisDate = toDateString(new Date())) {
    const balanceBasisDate =
      (await this.balancesService.getLatestBasisDateOnOrBefore(basisDate)) ?? basisDate;
    const [
      transactionKrw,
      balanceKrw,
      onboardingCount,
      upcomingKycCorporations,
    ] = await Promise.all([
      this.transactionsService.getTotalAmountUntil(basisDate),
      this.balancesService.getTotalBalanceByBasisDate(balanceBasisDate),
      this.onboardingService.getTotalCountUntil(basisDate),
      this.onboardingService.getUpcomingKyc(basisDate, 20),
    ]);

    return {
      basisDate,
      balanceBasisDate,
      totals: {
        transactionKrw,
        balanceKrw,
        onboardingCount,
      },
      upcomingKycCorporations,
    };
  }
}
