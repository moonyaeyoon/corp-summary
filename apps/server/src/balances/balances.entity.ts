import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'myy_corp_balance_mv' })
export class BalanceEntity {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  basisDt!: string;

  @Column({ type: 'varchar', length: 50 })
  custId!: string;
}
