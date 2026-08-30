import {
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ErrorCode } from '../common/enums/error-code.enum.js';
import { AppException } from '../common/exceptions/app.exception.js';
import { formatDateLabel, isDateBefore } from '../utils/date.util.js';
import { CreateReportDto } from './dto/create-report.dto.js';
import { ListReportsQueryDto } from './dto/list-reports-query.dto.js';
import {
  ReportListResponseDto,
  ReportResponseDto,
} from './dto/report-response.dto.js';
import {
  ComparisonTableDto,
  ReportSummaryResponseDto,
  SentenceSummaryDto,
  SourceDatesDto,
  SummaryTableDto,
} from './dto/report-summary-response.dto.js';
import { UpdateReportDatesDto } from './dto/update-report-dates.dto.js';
import { UpdateReportDto } from './dto/update-report.dto.js';
import { ReportResultEntity } from './report-result.entity.js';
import { ReportEntity, ReportStatus } from './reports.entity.js';
import { ReportsRepository } from './reports.repository.js';

@Injectable()
export class ReportsService {
  constructor(private readonly reportsRepository: ReportsRepository) {}

  async createReport(createReportDto: CreateReportDto): Promise<ReportResponseDto> {
    try {
      await this.assertReportNameAvailable(createReportDto.name);
      const report = await this.reportsRepository.create(createReportDto.name);

      return this.toReportResponse(report);
    } catch (error) {
      this.handleUnexpectedError(error);
    }
  }

  async listReports(query: ListReportsQueryDto): Promise<ReportListResponseDto> {
    try {
      const limit = query.limit ?? 20;
      const rows = await this.reportsRepository.findMany(limit, query.cursor);
      const items = rows.slice(0, limit).map((report) => this.toReportResponse(report));
      const hasNextPage = rows.length > limit;
      const nextCursor = hasNextPage ? items.at(-1)?.id ?? null : null;

      return { items, nextCursor };
    } catch (error) {
      this.handleUnexpectedError(error);
    }
  }

  async updateReport(
    reportId: string,
    updateReportDto: UpdateReportDto,
  ): Promise<ReportResponseDto> {
    try {
      const report = await this.findReportById(reportId);
      const duplicate = await this.reportsRepository.findByName(updateReportDto.name);

      if (duplicate && duplicate.id !== reportId) {
        throw new AppException(HttpStatus.CONFLICT, ErrorCode.REPORT_NAME_ALREADY_EXISTS);
      }

      report.name = updateReportDto.name;

      return this.toReportResponse(await this.reportsRepository.update(report));
    } catch (error) {
      this.handleUnexpectedError(error);
    }
  }

  async updateReportDates(
    reportId: string,
    updateReportDatesDto: UpdateReportDatesDto,
  ): Promise<ReportResponseDto> {
    try {
      const report = await this.findReportById(reportId);

      if (!isDateBefore(updateReportDatesDto.previousDate, updateReportDatesDto.currentDate)) {
        throw new AppException(HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_ERROR);
      }

      const updatedReport = await this.reportsRepository.updateDates(
        report,
        updateReportDatesDto.previousDate,
        updateReportDatesDto.currentDate,
      );

      return this.toReportResponse(updatedReport);
    } catch (error) {
      this.handleUnexpectedError(error);
    }
    }

  async deleteReport(reportId: string): Promise<void> {
    try {
      const report = await this.findReportById(reportId);

      await this.reportsRepository.delete(report);
    } catch (error) {
      this.handleUnexpectedError(error);
    }
    }

  async runReport(reportId: string): Promise<ReportSummaryResponseDto> {
    try {
      const report = await this.findReportById(reportId);

      if (report.status === ReportStatus.Running) {
        throw new AppException(HttpStatus.CONFLICT, ErrorCode.REPORT_ALREADY_RUNNING);
      }

      this.assertReportDates(report);

      await this.reportsRepository.updateStatus(report, ReportStatus.Running);
      const summary = this.buildMockSummary(report);
      const result = await this.reportsRepository.saveResult({
        reportId: report.id,
        summaryTable: summary.summaryTable,
        comparisonTable: summary.comparisonTable,
        sentenceSummary: summary.sentenceSummary,
        sourceDates: summary.sourceDates,
      });
      const completedReport = await this.reportsRepository.updateStatus(
        report,
        ReportStatus.Completed,
      );
      this.assertReportDates(completedReport);

      return this.toReportSummaryResponse(completedReport, result);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCode.REPORT_AGGREGATION_FAILED);
    }
  }

  async getReportSummary(reportId: string): Promise<ReportSummaryResponseDto> {
    try {
      const report = await this.findReportById(reportId);
      const result = await this.reportsRepository.findLatestResultByReportId(report.id);

      if (!result) {
        throw new AppException(HttpStatus.NOT_FOUND, ErrorCode.REPORT_SUMMARY_NOT_FOUND);
      }

      this.assertReportDates(report);

      return this.toReportSummaryResponse(report, result);
    } catch (error) {
      this.handleUnexpectedError(error);
    }
  }

  private async assertReportNameAvailable(name: string): Promise<void> {
    const report = await this.reportsRepository.findByName(name);

    if (report) {
      throw new AppException(HttpStatus.CONFLICT, ErrorCode.REPORT_NAME_ALREADY_EXISTS);
    }
  }

  private async findReportById(reportId: string): Promise<ReportEntity> {
    const report = await this.reportsRepository.findById(reportId);

    if (!report) {
      throw new AppException(HttpStatus.NOT_FOUND, ErrorCode.REPORT_NOT_FOUND);
    }

    return report;
  }

  private assertReportDates(report: ReportEntity): asserts report is ReportEntity & {
    previousDate: string;
    currentDate: string;
  } {
    if (!report.previousDate || !report.currentDate) {
      throw new AppException(HttpStatus.BAD_REQUEST, ErrorCode.REPORT_DATE_REQUIRED);
    }
  }

  private buildMockSummary(report: ReportEntity & { previousDate: string; currentDate: string }): {
    sourceDates: SourceDatesDto;
    summaryTable: SummaryTableDto;
    comparisonTable: ComparisonTableDto;
    sentenceSummary: SentenceSummaryDto;
  } {
    const previousLabel = formatDateLabel(report.previousDate);
    const currentLabel = formatDateLabel(report.currentDate);

    return {
      sourceDates: {
        previousBalanceBasisDate: report.previousDate,
        currentBalanceBasisDate: report.currentDate,
      },
      summaryTable: {
        title: '이번주 실적',
        previousLabel: `실적 (${previousLabel} 기준)`,
        currentLabel: `실적 (${currentLabel} 기준)`,
        rows: [],
      },
      comparisonTable: {
        title: '전주대비',
        unit: {
          balanceKrw: 'MILLION_KRW',
          transactionKrw: 'MILLION_KRW',
        },
        rows: [
          {
            label: previousLabel,
            total: 0,
            stage1: 0,
            stage2: 0,
            stage3: 0,
            etc: 0,
            balanceMillionKrw: 0,
            transactionMillionKrw: 0,
          },
          {
            label: currentLabel,
            total: 0,
            stage1: 0,
            stage2: 0,
            stage3: 0,
            etc: 0,
            balanceMillionKrw: 0,
            transactionMillionKrw: 0,
          },
          {
            label: '대비증감',
            total: 0,
            stage1: 0,
            stage2: 0,
            stage3: 0,
            etc: 0,
            balanceMillionKrw: 0,
            transactionMillionKrw: 0,
            isDiff: true,
          },
        ],
      },
      sentenceSummary: {
        title: '문장요약',
        lines: [],
      },
    };
  }

  private toReportResponse(report: ReportEntity): ReportResponseDto {
    return {
      id: report.id,
      name: report.name,
      status: report.status,
      previousDate: report.previousDate,
      currentDate: report.currentDate,
      createdAt: report.createdAt?.toISOString(),
      updatedAt: report.updatedAt?.toISOString(),
    };
  }

  private toReportSummaryResponse(
    report: ReportEntity & { previousDate: string; currentDate: string },
    result: ReportResultEntity,
  ): ReportSummaryResponseDto {
    return {
      report: {
        id: report.id,
        name: report.name,
        status: report.status,
        previousDate: report.previousDate,
        currentDate: report.currentDate,
        generatedAt: result.createdAt.toISOString(),
      },
      sourceDates: result.sourceDates,
      summaryTable: result.summaryTable,
      comparisonTable: result.comparisonTable,
      sentenceSummary: result.sentenceSummary,
    };
  }

  private handleUnexpectedError(error: unknown): never {
    if (error instanceof HttpException) {
      throw error;
    }

    throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_ERROR);
  }
}
