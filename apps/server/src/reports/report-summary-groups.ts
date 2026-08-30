export enum SummaryGroupKey {
  Stage1 = 'stage1',
  Stage2CorpCore = 'stage2CorpCore',
  Stage2CorpMass = 'stage2CorpMass',
  Stage2Professional = 'stage2Professional',
  Stage3 = 'stage3',
  Etc = 'etc',
}

export type SummaryMetricMap = Record<SummaryGroupKey, number>;

export interface SummaryGroupDefinition {
  key: SummaryGroupKey;
  corpType: string;
  targetGroup: string;
}

export const SUMMARY_GROUPS: SummaryGroupDefinition[] = [
  { key: SummaryGroupKey.Stage1, corpType: '1단계', targetGroup: '-' },
  { key: SummaryGroupKey.Stage2CorpCore, corpType: '2단계', targetGroup: '상장법인-core' },
  { key: SummaryGroupKey.Stage2CorpMass, corpType: '2단계', targetGroup: '상장법인-mass' },
  { key: SummaryGroupKey.Stage2Professional, corpType: '2단계', targetGroup: '전문투자자등록법인' },
  { key: SummaryGroupKey.Stage3, corpType: '3단계', targetGroup: '-' },
  { key: SummaryGroupKey.Etc, corpType: '기타', targetGroup: '-' },
];

export const STAGE2_GROUPS = [
  SummaryGroupKey.Stage2CorpCore,
  SummaryGroupKey.Stage2CorpMass,
  SummaryGroupKey.Stage2Professional,
];

export function createEmptySummaryMetricMap(): SummaryMetricMap {
  return {
    [SummaryGroupKey.Stage1]: 0,
    [SummaryGroupKey.Stage2CorpCore]: 0,
    [SummaryGroupKey.Stage2CorpMass]: 0,
    [SummaryGroupKey.Stage2Professional]: 0,
    [SummaryGroupKey.Stage3]: 0,
    [SummaryGroupKey.Etc]: 0,
  };
}

export function resolveSummaryGroupKey(
  marketStage: string | null | undefined,
  corpType: string | null | undefined,
  isCore: string | null | undefined,
): SummaryGroupKey {
  const normalizedMarketStage = normalize(marketStage);
  const normalizedCorpType = normalize(corpType);
  const normalizedIsCore = normalize(isCore).toUpperCase();

  if (normalizedMarketStage.includes('1단계')) {
    return SummaryGroupKey.Stage1;
  }

  if (normalizedMarketStage.includes('2단계')) {
    if (normalizedCorpType === normalize('상장법인(금융회사제외)')) {
      return normalizedIsCore === 'Y'
        ? SummaryGroupKey.Stage2CorpCore
        : SummaryGroupKey.Stage2CorpMass;
    }

    if (normalizedCorpType === normalize('전문투자자법인')) {
      return SummaryGroupKey.Stage2Professional;
    }

    return SummaryGroupKey.Etc;
  }

  if (normalizedMarketStage.includes('3단계')) {
    return SummaryGroupKey.Stage3;
  }

  return SummaryGroupKey.Etc;
}

export function sumSummaryGroups(
  metrics: SummaryMetricMap,
  groups: SummaryGroupKey[],
): number {
  return groups.reduce((sum, group) => sum + metrics[group], 0);
}

function normalize(value: string | null | undefined): string {
  return (value ?? '').replaceAll(/\s/g, '');
}
