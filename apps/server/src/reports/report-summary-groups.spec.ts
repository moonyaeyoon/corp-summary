import {
  SummaryGroupKey,
  createEmptySummaryMetricMap,
  resolveSummaryGroupKey,
  sumSummaryGroups,
} from './report-summary-groups.js';

describe('report summary groups', () => {
  it('splits stage 2 listed corporations by core flag', () => {
    expect(
      resolveSummaryGroupKey('2단계', '상장법인(금융회사제외)', 'Y'),
    ).toBe(SummaryGroupKey.Stage2CorpCore);
    expect(
      resolveSummaryGroupKey('2단계', '상장법인(금융회사제외)', 'N'),
    ).toBe(SummaryGroupKey.Stage2CorpMass);
  });

  it('splits stage 2 professional investor corporations separately', () => {
    expect(resolveSummaryGroupKey('2단계', '전문투자자법인', 'N')).toBe(
      SummaryGroupKey.Stage2Professional,
    );
  });

  it('creates stable empty metric maps and sums selected groups', () => {
    const map = createEmptySummaryMetricMap();
    map[SummaryGroupKey.Stage2CorpCore] = 3;
    map[SummaryGroupKey.Stage2CorpMass] = 4;

    expect(sumSummaryGroups(map, [SummaryGroupKey.Stage2CorpCore, SummaryGroupKey.Stage2CorpMass])).toBe(7);
  });
});
