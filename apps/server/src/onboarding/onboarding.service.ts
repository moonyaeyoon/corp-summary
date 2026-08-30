import { Injectable } from '@nestjs/common';
import {
  SummaryMetricMap,
  createEmptySummaryMetricMap,
  resolveSummaryGroupKey,
} from '../reports/report-summary-groups.js';
import {
  OnboardingDetailRawRow,
  OnboardingRepository,
} from './onboarding.repository.js';

@Injectable()
export class OnboardingService {
  constructor(private readonly onboardingRepository: OnboardingRepository) {}

  async getSummaryMetrics(currentDate: string): Promise<SummaryMetricMap> {
    const rows = await this.onboardingRepository.aggregateOnboardingCountByGroup(currentDate);
    const metrics = createEmptySummaryMetricMap();

    for (const row of rows) {
      const key = resolveSummaryGroupKey(row.marketStage, row.corpType, row.isCore);
      metrics[key] += Number(row.value ?? 0);
    }

    return metrics;
  }

  async getTotalCountUntil(currentDate: string): Promise<number> {
    return Number(await this.onboardingRepository.countOnboardingUntil(currentDate));
  }

  async getDetailsUntil(
    currentDate: string,
    limit: number,
  ): Promise<OnboardingDetailRawRow[]> {
    return this.onboardingRepository.findDetailsUntil(currentDate, limit);
  }

  async getUpcomingKyc(
    basisDate: string,
    limit: number,
  ): Promise<OnboardingDetailRawRow[]> {
    return this.onboardingRepository.findUpcomingKyc(basisDate, limit);
  }
}
