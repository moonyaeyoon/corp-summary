import { Injectable } from '@nestjs/common';
import {
  SummaryMetricMap,
  createEmptySummaryMetricMap,
  resolveSummaryGroupKey,
} from '../reports/report-summary-groups.js';
import { BalancesRepository } from './balances.repository.js';

@Injectable()
export class BalancesService {
  constructor(private readonly balancesRepository: BalancesRepository) {}

  async getSummaryMetrics(basisDate: string): Promise<SummaryMetricMap> {
    const rows = await this.balancesRepository.aggregateBalanceByGroup(basisDate);
    const metrics = createEmptySummaryMetricMap();

    for (const row of rows) {
      const key = resolveSummaryGroupKey(row.marketStage, row.corpType, row.isCore);
      metrics[key] += Number(row.value ?? 0);
    }

    return metrics;
  }
}
