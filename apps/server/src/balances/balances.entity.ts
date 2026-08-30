import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'myy_corp_balance_mv' })
export class BalanceEntity {
  @PrimaryColumn({ name: 'basis_dt', type: 'varchar', length: 50 })
  basisDt!: string;

  @PrimaryColumn({ name: 'cust_id', type: 'varchar', length: 50 })
  custId!: string;

  @PrimaryColumn({ name: 'mem_id', type: 'varchar', length: 50 })
  memId!: string;

  @Column({ name: 'account_status', type: 'varchar', length: 100 })
  accountStatus!: string;

  @Column({ name: 'kyc_status', type: 'varchar', length: 100 })
  kycStatus!: string;

  @Column({ name: 'corp_nm', type: 'varchar', length: 300 })
  corpName!: string;

  @Column({ name: 'market_stage', type: 'varchar', length: 100 })
  marketStage!: string;

  @Column({ name: 'corp_type', type: 'varchar', length: 200 })
  corpType!: string;

  @Column({ name: 'is_core', type: 'varchar', length: 1 })
  isCore!: string;

  @PrimaryColumn({ name: 'coin_symbol_nm', type: 'varchar', length: 50 })
  coinSymbolName!: string;

  @Column({ name: 'coin_qty', type: 'numeric', precision: 38, scale: 18 })
  coinQty!: string;

  @Column({ name: 'balance_krw_amt', type: 'numeric', precision: 38, scale: 18 })
  balanceKrwAmount!: string;
}
