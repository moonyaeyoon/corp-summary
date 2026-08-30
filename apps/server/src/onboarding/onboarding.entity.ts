import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'myy_corp_member_dim' })
export class OnboardingEntity {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  custId!: string;

  @Column({ type: 'varchar', length: 50 })
  memId!: string;
}
