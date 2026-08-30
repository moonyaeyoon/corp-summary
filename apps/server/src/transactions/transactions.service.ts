import { Injectable } from '@nestjs/common';
import {
  SummaryMetricMap,
  createEmptySummaryMetricMap,
  resolveSummaryGroupKey,
} from '../reports/report-summary-groups.js';
import {
  TransactionDetailRawRow,
  TransactionsRepository,
} from './transactions.repository.js';

@Injectable()
export class TransactionsService {
  constructor(private readonly transactionsRepository: TransactionsRepository) {}

  async getSummaryMetrics(currentDate: string): Promise<SummaryMetricMap> {
    const rows = await this.transactionsRepository.aggregateTransactionAmountByGroup(currentDate);
    const metrics = createEmptySummaryMetricMap();

    for (const row of rows) {
      const key = resolveSummaryGroupKey(row.marketStage, row.corpType, row.isCore);
      metrics[key] += Number(row.value ?? 0);
    }

    return metrics;
  }

  async getTotalAmountUntil(currentDate: string): Promise<number> {
    return Number(await this.transactionsRepository.sumTransactionAmountUntil(currentDate));
  }

  async getDetailsUntil(
    currentDate: string,
    limit: number,
  ): Promise<TransactionDetailRawRow[]> {
    return this.transactionsRepository.findDetailsUntil(currentDate, limit);
  }
}
