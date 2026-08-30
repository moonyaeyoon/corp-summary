import { SummaryGroupKey } from '../reports/report-summary-groups.js';
import { BalancesRepository } from './balances.repository.js';
import { BalancesService } from './balances.service.js';

describe('BalancesService', () => {
  it('aggregates balance amounts by report summary group', async () => {
    const repository = {
      aggregateBalanceByGroup: vi.fn().mockResolvedValue([
        {
          marketStage: '2단계',
          corpType: '상장법인(금융회사제외)',
          isCore: 'Y',
          value: '1500000.000000000000000000',
        },
        {
          marketStage: '기타',
          corpType: '그외',
          isCore: 'N',
          value: '2500000',
        },
      ]),
    };
    const service = new BalancesService(repository as unknown as BalancesRepository);

    const result = await service.getSummaryMetrics('2026-08-21');

    expect(repository.aggregateBalanceByGroup).toHaveBeenCalledWith('2026-08-21');
    expect(result[SummaryGroupKey.Stage2CorpCore]).toBe(1_500_000);
    expect(result[SummaryGroupKey.Etc]).toBe(2_500_000);
  });
});
