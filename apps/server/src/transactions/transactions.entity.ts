import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'myy_corp_transaction_mv' })
export class TransactionEntity {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  custId!: string;

  @Column({ type: 'varchar', length: 50 })
  memId!: string;
}
