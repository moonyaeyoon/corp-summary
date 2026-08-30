import { Injectable } from '@nestjs/common';
import {
  SummaryMetricMap,
  createEmptySummaryMetricMap,
  resolveSummaryGroupKey,
} from '../reports/report-summary-groups.js';
import { BalanceDetailRawRow, BalancesRepository } from './balances.repository.js';

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

  async getLatestBasisDateOnOrBefore(currentDate: string): Promise<string | null> {
    return this.balancesRepository.findLatestBasisDateOnOrBefore(currentDate);
  }

  async getTotalBalanceByBasisDate(basisDate: string): Promise<number> {
    return Number(await this.balancesRepository.sumBalanceByBasisDate(basisDate));
  }

  async getDetailsByBasisDate(
    basisDate: string,
    limit: number,
    offset: number,
  ): Promise<{ items: BalanceDetailRawRow[]; totalItems: number }> {
    const [items, totalItems] = await Promise.all([
      this.balancesRepository.findDetailsByBasisDate(basisDate, limit, offset),
      this.balancesRepository.countDetailsByBasisDate(basisDate),
    ]);

    return { items, totalItems };
  }
}
