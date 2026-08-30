import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum ReportStatus {
  Draft = 'DRAFT',
  Running = 'RUNNING',
  Completed = 'COMPLETED',
  Failed = 'FAILED',
}

@Entity({ name: 'reports' })
export class ReportEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'varchar', length: 20, default: ReportStatus.Draft })
  status!: ReportStatus;

  @Column({ type: 'date', nullable: true })
  previousDate!: string | null;

  @Column({ type: 'date', nullable: true })
  currentDate!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
