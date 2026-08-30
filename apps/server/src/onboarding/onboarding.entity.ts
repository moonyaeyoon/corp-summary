import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'myy_corp_member_dim' })
export class OnboardingEntity {
  @PrimaryColumn({ name: 'cust_id', type: 'varchar', length: 50 })
  custId!: string;

  @PrimaryColumn({ name: 'mem_id', type: 'varchar', length: 50 })
  memId!: string;

  @Column({ name: 'corp_nm', type: 'varchar', length: 300 })
  corpName!: string;

  @Column({ name: 'account_status', type: 'varchar', length: 100 })
  accountStatus!: string;

  @Column({ name: 'kyc_status', type: 'varchar', length: 100 })
  kycStatus!: string;

  @Column({ name: 'market_stage', type: 'varchar', length: 100 })
  marketStage!: string;

  @Column({ name: 'corp_market_type', type: 'varchar', length: 200 })
  corpMarketType!: string;

  @Column({ name: 'corp_type', type: 'varchar', length: 200, nullable: true })
  corpType!: string | null;

  @Column({ name: 'is_core', type: 'varchar', length: 1 })
  isCore!: string;

  @Column({ name: 'member_join_dtm', type: 'timestamp', nullable: true })
  memberJoinDateTime!: Date | null;

  @Column({ name: 'mem_leave_dtm', type: 'timestamp', nullable: true })
  memberLeaveDateTime!: Date | null;

  @Column({ name: 'first_kyc_dtm', type: 'timestamp', nullable: true })
  firstKycDateTime!: Date | null;

  @Column({ name: 'latest_kyc_dtm', type: 'timestamp', nullable: true })
  latestKycDateTime!: Date | null;

  @Column({ name: 'next_kyc_dtm', type: 'timestamp', nullable: true })
  nextKycDateTime!: Date | null;

  @Column({ name: 'is_onboarding_target', type: 'varchar', length: 1, nullable: true })
  isOnboardingTarget!: string | null;

  @Column({ name: 'loaded_at', type: 'timestamp' })
  loadedAt!: Date;
}
