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

export interface OnboardingDetailRawRow {
  cust_id: string;
  mem_id: string;
  corp_nm: string;
  account_status: string;
  kyc_status: string;
  market_stage: string;
  corp_market_type: string;
  corp_type: string | null;
  is_core: string;
  member_join_dtm: Date | null;
  mem_leave_dtm: Date | null;
  first_kyc_dtm: Date | null;
  latest_kyc_dtm: Date | null;
  next_kyc_dtm: Date | null;
  is_onboarding_target: string | null;
  loaded_at: Date;
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

  async countOnboardingUntil(currentDate: string): Promise<string> {
    const endExclusiveDate = getNextDate(currentDate);
    const row = await this.onboardingRepository
      .createQueryBuilder('onboarding')
      .select('COUNT(DISTINCT onboarding.custId)', 'value')
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
      .getRawOne<{ value: string | null }>();

    return row?.value ?? '0';
  }

  async findDetailsUntil(
    currentDate: string,
    limit: number,
    offset: number,
  ): Promise<OnboardingDetailRawRow[]> {
    const endExclusiveDate = getNextDate(currentDate);

    return this.onboardingRepository
      .createQueryBuilder('onboarding')
      .select('onboarding.custId', 'cust_id')
      .addSelect('onboarding.memId', 'mem_id')
      .addSelect('onboarding.corpName', 'corp_nm')
      .addSelect('onboarding.accountStatus', 'account_status')
      .addSelect('onboarding.kycStatus', 'kyc_status')
      .addSelect('onboarding.marketStage', 'market_stage')
      .addSelect('onboarding.corpMarketType', 'corp_market_type')
      .addSelect('onboarding.corpType', 'corp_type')
      .addSelect('onboarding.isCore', 'is_core')
      .addSelect('onboarding.memberJoinDateTime', 'member_join_dtm')
      .addSelect('onboarding.memberLeaveDateTime', 'mem_leave_dtm')
      .addSelect('onboarding.firstKycDateTime', 'first_kyc_dtm')
      .addSelect('onboarding.latestKycDateTime', 'latest_kyc_dtm')
      .addSelect('onboarding.nextKycDateTime', 'next_kyc_dtm')
      .addSelect('onboarding.isOnboardingTarget', 'is_onboarding_target')
      .addSelect('onboarding.loadedAt', 'loaded_at')
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
      .orderBy('onboarding.latestKycDateTime', 'DESC')
      .addOrderBy('onboarding.corpName', 'ASC')
      .offset(offset)
      .limit(limit)
      .getRawMany<OnboardingDetailRawRow>();
  }

  async countDetailsUntil(currentDate: string): Promise<number> {
    const endExclusiveDate = getNextDate(currentDate);

    return this.onboardingRepository
      .createQueryBuilder('onboarding')
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
      .getCount();
  }

  async findUpcomingKyc(
    basisDate: string,
    limit: number,
  ): Promise<OnboardingDetailRawRow[]> {
    const endExclusiveDate = new Date(`${basisDate}T00:00:00.000Z`);
    endExclusiveDate.setUTCDate(endExclusiveDate.getUTCDate() + 8);

    return this.onboardingRepository
      .createQueryBuilder('onboarding')
      .select('onboarding.custId', 'cust_id')
      .addSelect('onboarding.memId', 'mem_id')
      .addSelect('onboarding.corpName', 'corp_nm')
      .addSelect('onboarding.accountStatus', 'account_status')
      .addSelect('onboarding.kycStatus', 'kyc_status')
      .addSelect('onboarding.marketStage', 'market_stage')
      .addSelect('onboarding.corpMarketType', 'corp_market_type')
      .addSelect('onboarding.corpType', 'corp_type')
      .addSelect('onboarding.isCore', 'is_core')
      .addSelect('onboarding.memberJoinDateTime', 'member_join_dtm')
      .addSelect('onboarding.memberLeaveDateTime', 'mem_leave_dtm')
      .addSelect('onboarding.firstKycDateTime', 'first_kyc_dtm')
      .addSelect('onboarding.latestKycDateTime', 'latest_kyc_dtm')
      .addSelect('onboarding.nextKycDateTime', 'next_kyc_dtm')
      .addSelect('onboarding.isOnboardingTarget', 'is_onboarding_target')
      .addSelect('onboarding.loadedAt', 'loaded_at')
      .where('onboarding.nextKycDateTime >= :basisDate', { basisDate })
      .andWhere('onboarding.nextKycDateTime < :endExclusiveDate', {
        endExclusiveDate: endExclusiveDate.toISOString().slice(0, 10),
      })
      .orderBy('onboarding.nextKycDateTime', 'ASC')
      .addOrderBy('onboarding.corpName', 'ASC')
      .limit(limit)
      .getRawMany<OnboardingDetailRawRow>();
  }
}
