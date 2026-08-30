import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type {
  ComparisonTableDto,
  SentenceSummaryDto,
  SourceDatesDto,
  SummaryTableDto,
} from './dto/report-summary-response.dto.js';

@Entity({ name: 'report_results' })
export class ReportResultEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'report_id', type: 'uuid' })
  reportId!: string;

  @Column({ name: 'summary_table_json', type: 'jsonb' })
  summaryTable!: SummaryTableDto;

  @Column({ name: 'comparison_table_json', type: 'jsonb' })
  comparisonTable!: ComparisonTableDto;

  @Column({ name: 'sentence_summary_json', type: 'jsonb' })
  sentenceSummary!: SentenceSummaryDto;

  @Column({ name: 'source_dates_json', type: 'jsonb' })
  sourceDates!: SourceDatesDto;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
