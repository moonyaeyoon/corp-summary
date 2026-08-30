import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CreateReportDto } from './dto/create-report.dto.js';
import { ListReportsQueryDto } from './dto/list-reports-query.dto.js';
import { UpdateReportDatesDto } from './dto/update-report-dates.dto.js';
import { UpdateReportDto } from './dto/update-report.dto.js';
import { ReportsService } from './reports.service.js';

const reportIdSwaggerParam = {
  name: 'reportId',
  description: '리포트 ID',
  schema: {
    type: 'string',
    example: 'rpt_001',
  },
};

@Controller('reports')
@ApiTags('Reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @ApiOperation({ summary: 'Create report' })
  @ApiBody({ type: CreateReportDto })
  @ApiCreatedResponse({
    description: '리포트 생성 성공',
    example: {
      id: 'rpt_001',
      name: '08.27 실적',
      status: 'DRAFT',
      previousDate: null,
      currentDate: null,
      createdAt: '2026-08-30T12:00:00.000Z',
      updatedAt: '2026-08-30T12:00:00.000Z',
    },
  })
  @ApiBadRequestResponse({
    description: '요청 값 검증 실패',
    example: { error: { code: 'VALIDATION_ERROR', message: 'Request validation failed' } },
  })
  @ApiConflictResponse({
    description: '이미 존재하는 리포트 이름',
    example: { error: { code: 'REPORT_NAME_ALREADY_EXISTS', message: 'Report name already exists' } },
  })
  createReport(@Body() createReportDto: CreateReportDto) {
    return this.reportsService.createReport(createReportDto);
  }

  @Get()
  @ApiOperation({ summary: 'List reports' })
  @ApiQuery({ name: 'limit', required: false, example: 20, description: '조회할 리포트 개수' })
  @ApiQuery({
    name: 'cursor',
    required: false,
    example: 'rpt_001',
    description: '다음 페이지 조회용 cursor',
  })
  @ApiOkResponse({
    description: '리포트 목록 조회 성공',
    example: {
      items: [
        {
          id: 'rpt_001',
          name: '08.27 실적',
          status: 'COMPLETED',
          previousDate: '2026-07-07',
          currentDate: '2026-08-27',
          createdAt: '2026-08-30T12:00:00.000Z',
          updatedAt: '2026-08-30T12:30:00.000Z',
        },
      ],
      nextCursor: null,
    },
  })
  listReports(@Query() query: ListReportsQueryDto) {
    return this.reportsService.listReports(query);
  }

  @Patch(':reportId')
  @ApiOperation({ summary: 'Update report name' })
  @ApiParam(reportIdSwaggerParam)
  @ApiBody({ type: UpdateReportDto })
  @ApiOkResponse({
    description: '리포트 이름 변경 성공',
    example: {
      id: 'rpt_001',
      name: '08.27 실적 수정',
      status: 'DRAFT',
      previousDate: null,
      currentDate: null,
      createdAt: '2026-08-30T12:00:00.000Z',
      updatedAt: '2026-08-30T12:10:00.000Z',
    },
  })
  @ApiNotFoundResponse({
    description: '리포트 없음',
    example: { error: { code: 'REPORT_NOT_FOUND', message: 'Report not found' } },
  })
  updateReport(@Param('reportId') reportId: string, @Body() updateReportDto: UpdateReportDto) {
    return this.reportsService.updateReport(reportId, updateReportDto);
  }

  @Delete(':reportId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete report' })
  @ApiParam(reportIdSwaggerParam)
  @ApiNoContentResponse({ description: '리포트 삭제 성공' })
  @ApiNotFoundResponse({
    description: '리포트 없음',
    example: { error: { code: 'REPORT_NOT_FOUND', message: 'Report not found' } },
  })
  deleteReport(@Param('reportId') reportId: string) {
    return this.reportsService.deleteReport(reportId);
  }

  @Patch(':reportId/dates')
  @ApiOperation({ summary: 'Update report dates' })
  @ApiParam(reportIdSwaggerParam)
  @ApiBody({ type: UpdateReportDatesDto })
  @ApiOkResponse({
    description: '전주/이번주 기준일 저장 성공',
    example: {
      id: 'rpt_001',
      name: '08.27 실적',
      status: 'DRAFT',
      previousDate: '2026-07-07',
      currentDate: '2026-08-27',
      createdAt: '2026-08-30T12:00:00.000Z',
      updatedAt: '2026-08-30T12:10:00.000Z',
    },
  })
  @ApiBadRequestResponse({
    description: '요청 값 검증 실패 또는 previousDate가 currentDate보다 늦음',
    example: { error: { code: 'VALIDATION_ERROR', message: 'Request validation failed' } },
  })
  @ApiNotFoundResponse({
    description: '리포트 없음',
    example: { error: { code: 'REPORT_NOT_FOUND', message: 'Report not found' } },
  })
  updateReportDates(
    @Param('reportId') reportId: string,
    @Body() updateReportDatesDto: UpdateReportDatesDto,
  ) {
    return this.reportsService.updateReportDates(reportId, updateReportDatesDto);
  }

  @Post(':reportId/run')
  @ApiOperation({ summary: 'Run report aggregation' })
  @ApiParam(reportIdSwaggerParam)
  @ApiOkResponse({
    description: 'Summary 집계 성공',
    example: {
      report: {
        id: 'rpt_001',
        name: '08.27 실적',
        status: 'COMPLETED',
        previousDate: '2026-07-07',
        currentDate: '2026-08-27',
        generatedAt: '2026-08-30T12:30:00.000Z',
      },
      sourceDates: {
        previousBalanceBasisDate: '2026-07-07',
        currentBalanceBasisDate: '2026-08-27',
      },
      summaryTable: {
        title: '이번주 실적',
        previousLabel: '실적 (2026.07.07 기준)',
        currentLabel: '실적 (2026.08.27 기준)',
        rows: [],
      },
      comparisonTable: {
        title: '전주대비',
        unit: {
          balanceKrw: 'MILLION_KRW',
          transactionKrw: 'MILLION_KRW',
        },
        rows: [],
      },
      sentenceSummary: {
        title: '문장요약',
        lines: [],
      },
    },
  })
  @ApiBadRequestResponse({
    description: '집계에 필요한 기준일 없음',
    example: { error: { code: 'REPORT_DATE_REQUIRED', message: 'Report dates are required' } },
  })
  @ApiConflictResponse({
    description: '이미 집계 중인 리포트',
    example: { error: { code: 'REPORT_ALREADY_RUNNING', message: 'Report is already running' } },
  })
  @ApiNotFoundResponse({
    description: '리포트 없음',
    example: { error: { code: 'REPORT_NOT_FOUND', message: 'Report not found' } },
  })
  runReport(@Param('reportId') reportId: string) {
    return this.reportsService.runReport(reportId);
  }

  @Get(':reportId/summary')
  @ApiOperation({ summary: 'Get report summary' })
  @ApiParam(reportIdSwaggerParam)
  @ApiOkResponse({
    description: '저장된 Summary 조회 성공',
    example: {
      report: {
        id: 'rpt_001',
        name: '08.27 실적',
        status: 'COMPLETED',
        previousDate: '2026-07-07',
        currentDate: '2026-08-27',
        generatedAt: '2026-08-30T12:30:00.000Z',
      },
      sourceDates: {
        previousBalanceBasisDate: '2026-07-07',
        currentBalanceBasisDate: '2026-08-27',
      },
      summaryTable: {
        title: '이번주 실적',
        previousLabel: '실적 (2026.07.07 기준)',
        currentLabel: '실적 (2026.08.27 기준)',
        rows: [],
      },
      comparisonTable: {
        title: '전주대비',
        unit: {
          balanceKrw: 'MILLION_KRW',
          transactionKrw: 'MILLION_KRW',
        },
        rows: [],
      },
      sentenceSummary: {
        title: '문장요약',
        lines: [],
      },
    },
  })
  @ApiNotFoundResponse({
    description: '리포트 또는 Summary 없음',
    example: { error: { code: 'REPORT_SUMMARY_NOT_FOUND', message: 'Report summary not found' } },
  })
  getReportSummary(@Param('reportId') reportId: string) {
    return this.reportsService.getReportSummary(reportId);
  }
}
