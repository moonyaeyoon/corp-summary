import { SummaryGroupKey } from '../reports/report-summary-groups.js';
import { TransactionsRepository } from './transactions.repository.js';
import { TransactionsService } from './transactions.service.js';

describe('TransactionsService', () => {
  it('aggregates buy and sell transaction amounts by report summary group', async () => {
    const repository = {
      aggregateTransactionAmountByGroup: vi.fn().mockResolvedValue([
        {
          marketStage: '1단계',
          corpType: '-',
          isCore: 'N',
          value: '3000000',
        },
      ]),
    };
    const service = new TransactionsService(repository as unknown as TransactionsRepository);

    const result = await service.getSummaryMetrics('2026-08-21');

    expect(repository.aggregateTransactionAmountByGroup).toHaveBeenCalledWith('2026-08-21');
    expect(result[SummaryGroupKey.Stage1]).toBe(3_000_000);
  });
});
