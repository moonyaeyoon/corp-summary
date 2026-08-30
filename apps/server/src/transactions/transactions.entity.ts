import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'myy_corp_transaction_mv' })
export class TransactionEntity {
  @PrimaryColumn({ name: 'cust_id', type: 'varchar', length: 50 })
  custId!: string;

  @PrimaryColumn({ name: 'mem_id', type: 'varchar', length: 50 })
  memId!: string;

  @PrimaryColumn({ name: 'transaction_dtm', type: 'timestamp' })
  transactionDateTime!: Date;

  @Column({ name: 'transaction_type', type: 'varchar', length: 20 })
  transactionType!: string;

  @Column({ name: 'inout_type', type: 'varchar', length: 20, nullable: true })
  inoutType!: string | null;

  @Column({ name: 'account_status', type: 'varchar', length: 100 })
  accountStatus!: string;

  @Column({ name: 'corp_nm', type: 'varchar', length: 300 })
  corpName!: string;

  @Column({ name: 'market_stage', type: 'varchar', length: 100 })
  marketStage!: string;

  @Column({ name: 'corp_type', type: 'varchar', length: 200 })
  corpType!: string;

  @Column({ name: 'coin_symbol_nm', type: 'varchar', length: 2000 })
  coinSymbolName!: string;

  @Column({ name: 'coin_qty', type: 'numeric', precision: 38, scale: 18 })
  coinQty!: string;

  @Column({ name: 'krw_amt', type: 'numeric', precision: 38, scale: 18 })
  krwAmount!: string;

  @Column({ name: 'basis_dt', type: 'date' })
  basisDate!: string;

  @Column({ name: 'is_core', type: 'varchar', length: 1 })
  isCore!: string;
}
