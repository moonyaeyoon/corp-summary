import { SummaryGroupKey } from '../reports/report-summary-groups.js';
import { OnboardingRepository } from './onboarding.repository.js';
import { OnboardingService } from './onboarding.service.js';

describe('OnboardingService', () => {
  it('aggregates onboarding member counts by report summary group', async () => {
    const repository = {
      aggregateOnboardingCountByGroup: vi.fn().mockResolvedValue([
        {
          marketStage: '3단계',
          corpType: '일반법인',
          isCore: 'N',
          value: '12',
        },
      ]),
    };
    const service = new OnboardingService(repository as unknown as OnboardingRepository);

    const result = await service.getSummaryMetrics('2026-08-21');

    expect(repository.aggregateOnboardingCountByGroup).toHaveBeenCalledWith('2026-08-21');
    expect(result[SummaryGroupKey.Stage3]).toBe(12);
  });
});
