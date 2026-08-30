import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getNextDate } from '../utils/date.util.js';
import { OnboardingEntity } from './onboarding.entity.js';

export interface AggregateRawRow {
  marketStage: string | null;
  corpType: string | null;
  isCore: string | null;
  value: string | null;
}

@Injectable()
export class OnboardingRepository {
  constructor(
    @InjectRepository(OnboardingEntity)
    private readonly onboardingRepository: Repository<OnboardingEntity>,
  ) {}

  async aggregateOnboardingCountByGroup(currentDate: string): Promise<AggregateRawRow[]> {
    const endExclusiveDate = getNextDate(currentDate);

    return this.onboardingRepository
      .createQueryBuilder('onboarding')
      .select('onboarding.marketStage', 'marketStage')
      .addSelect('onboarding.corpMarketType', 'corpType')
      .addSelect('onboarding.isCore', 'isCore')
      .addSelect('COUNT(DISTINCT onboarding.custId)', 'value')
      .where(
        '((onboarding.accountStatus = :activeAccountStatus AND onboarding.kycStatus = :completedKycStatus) OR (onboarding.accountStatus = :dormantAccountStatus AND onboarding.kycStatus = :beforeKycStatus))',
        {
          activeAccountStatus: '활성화계정',
          completedKycStatus: '고객확인완료',
          dormantAccountStatus: '휴면계정',
          beforeKycStatus: '고객확인전단계',
        },
      )
      .andWhere('onboarding.latestKycDateTime >= :startDate', {
        startDate: '2025-01-01',
      })
      .andWhere('onboarding.latestKycDateTime < :endExclusiveDate', {
        endExclusiveDate,
      })
      .groupBy('onboarding.marketStage')
      .addGroupBy('onboarding.corpMarketType')
      .addGroupBy('onboarding.isCore')
      .getRawMany<AggregateRawRow>();
  }
}
