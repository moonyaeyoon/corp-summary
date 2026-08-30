import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportResultEntity } from './report-result.entity.js';
import { ReportEntity, ReportStatus } from './reports.entity.js';
import {
  ComparisonTableDto,
  SentenceSummaryDto,
  SourceDatesDto,
  SummaryTableDto,
} from './dto/report-summary-response.dto.js';

export interface SaveReportResultInput {
  reportId: string;
  summaryTable: SummaryTableDto;
  comparisonTable: ComparisonTableDto;
  sentenceSummary: SentenceSummaryDto;
  sourceDates: SourceDatesDto;
}

@Injectable()
export class ReportsRepository {
  constructor(
    @InjectRepository(ReportEntity)
    private readonly reportsRepository: Repository<ReportEntity>,
    @InjectRepository(ReportResultEntity)
    private readonly reportResultsRepository: Repository<ReportResultEntity>,
  ) {}

  async create(nameOrReport: string | ReportEntity): Promise<ReportEntity> {
    const report =
      typeof nameOrReport === 'string'
        ? this.reportsRepository.create({ name: nameOrReport, status: ReportStatus.Draft })
        : nameOrReport;

    return this.reportsRepository.save(report);
  }

  async findById(id: string): Promise<ReportEntity | null> {
    return this.reportsRepository.findOne({ where: { id } });
  }

  async findByName(name: string): Promise<ReportEntity | null> {
    return this.reportsRepository.findOne({ where: { name } });
  }

  async findMany(limit: number, cursor?: string): Promise<ReportEntity[]> {
    const query = this.reportsRepository
      .createQueryBuilder('report')
      .orderBy('report.updatedAt', 'DESC')
      .addOrderBy('report.id', 'DESC')
      .take(limit + 1);

    if (cursor) {
      const cursorReport = await this.findById(cursor);

      if (cursorReport) {
        query.where(
          '(report.updatedAt < :updatedAt OR (report.updatedAt = :updatedAt AND report.id < :id))',
          {
            updatedAt: cursorReport.updatedAt,
            id: cursorReport.id,
          },
        );
      }
    }

    return query.getMany();
  }

  async update(report: ReportEntity): Promise<ReportEntity> {
    return this.reportsRepository.save(report);
  }

  async updateDates(
    report: ReportEntity,
    previousDate: string,
    currentDate: string,
  ): Promise<ReportEntity> {
    report.previousDate = previousDate;
    report.currentDate = currentDate;

    return this.update(report);
  }

  async updateStatus(report: ReportEntity, status: ReportStatus): Promise<ReportEntity> {
    report.status = status;

    return this.update(report);
  }

  async delete(report: ReportEntity): Promise<void> {
    await this.reportsRepository.remove(report);
  }

  async saveResult(input: SaveReportResultInput): Promise<ReportResultEntity> {
    const result = this.reportResultsRepository.create(input);

    return this.reportResultsRepository.save(result);
  }

  async findLatestResultByReportId(reportId: string): Promise<ReportResultEntity | null> {
    return this.reportResultsRepository.findOne({
      where: { reportId },
      order: { createdAt: 'DESC' },
    });
  }
}
