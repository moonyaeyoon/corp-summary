import { Injectable } from '@nestjs/common';
import {
  SummaryMetricMap,
  createEmptySummaryMetricMap,
  resolveSummaryGroupKey,
} from '../reports/report-summary-groups.js';
import { OnboardingRepository } from './onboarding.repository.js';

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
}
