import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateReportDto } from './dto/create-report.dto.js';
import { ListReportsQueryDto } from './dto/list-reports-query.dto.js';
import { UpdateReportDatesDto } from './dto/update-report-dates.dto.js';
import { UpdateReportDto } from './dto/update-report.dto.js';
import { ReportsService } from './reports.service.js';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  createReport(@Body() createReportDto: CreateReportDto) {
    return this.reportsService.createReport(createReportDto);
  }

  @Get()
  listReports(@Query() query: ListReportsQueryDto) {
    return this.reportsService.listReports(query);
  }

  @Patch(':reportId')
  updateReport(@Param('reportId') reportId: string, @Body() updateReportDto: UpdateReportDto) {
    return this.reportsService.updateReport(reportId, updateReportDto);
  }

  @Delete(':reportId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteReport(@Param('reportId') reportId: string) {
    return this.reportsService.deleteReport(reportId);
  }

  @Patch(':reportId/dates')
  updateReportDates(
    @Param('reportId') reportId: string,
    @Body() updateReportDatesDto: UpdateReportDatesDto,
  ) {
    return this.reportsService.updateReportDates(reportId, updateReportDatesDto);
  }

  @Post(':reportId/run')
  runReport(@Param('reportId') reportId: string) {
    return this.reportsService.runReport(reportId);
  }

  @Get(':reportId/summary')
  getReportSummary(@Param('reportId') reportId: string) {
    return this.reportsService.getReportSummary(reportId);
  }
}
