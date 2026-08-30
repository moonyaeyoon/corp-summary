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

  @Column({ name: 'previous_date', type: 'date', nullable: true })
  previousDate!: string | null;

  @Column({ name: 'current_date', type: 'date', nullable: true })
  currentDate!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
