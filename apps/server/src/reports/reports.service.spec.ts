import { BadRequestException, ConflictException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ErrorCode } from '../common/enums/error-code.enum.js';
import { ReportEntity, ReportStatus } from './reports.entity.js';
import { ReportsRepository } from './reports.repository.js';
import { ReportsService } from './reports.service.js';

const now = new Date('2026-08-30T12:00:00.000Z');

function createReport(overrides: Partial<ReportEntity> = {}): ReportEntity {
  return {
    id: 'rpt_001',
    name: '08.21 실적',
    status: ReportStatus.Draft,
    previousDate: null,
    currentDate: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as ReportEntity;
}

function createRepositoryMock() {
  return {
    create: vi.fn(),
    delete: vi.fn(),
    findById: vi.fn(),
    findByName: vi.fn(),
    findLatestResultByReportId: vi.fn(),
    saveResult: vi.fn(),
    update: vi.fn(),
    updateDates: vi.fn(),
    updateStatus: vi.fn(),
    findMany: vi.fn(),
  } satisfies Partial<Record<keyof ReportsRepository, ReturnType<typeof vi.fn>>>;
}

describe('ReportsService', () => {
  it('creates a draft report', async () => {
    const repository = createRepositoryMock();
    repository.findByName.mockResolvedValue(null);
    repository.create.mockResolvedValue(createReport());
    const service = new ReportsService(repository as unknown as ReportsRepository);

    await expect(service.createReport({ name: '08.21 실적' })).resolves.toMatchObject({
      id: 'rpt_001',
      name: '08.21 실적',
      status: ReportStatus.Draft,
      previousDate: null,
      currentDate: null,
    });
  });

  it('rejects duplicate report names', async () => {
    const repository = createRepositoryMock();
    repository.findByName.mockResolvedValue(createReport());
    const service = new ReportsService(repository as unknown as ReportsRepository);

    await expect(service.createReport({ name: '08.21 실적' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('rejects date updates when previousDate is not earlier than currentDate', async () => {
    const repository = createRepositoryMock();
    repository.findById.mockResolvedValue(createReport());
    const service = new ReportsService(repository as unknown as ReportsRepository);

    await expect(
      service.updateReportDates('rpt_001', {
        previousDate: '2026-08-21',
        currentDate: '2026-08-21',
      }),
    ).rejects.toMatchObject({
      response: {
        code: ErrorCode.VALIDATION_ERROR,
        field: 'previousDate',
      },
    });
  });

  it('runs a report and persists mock summary result', async () => {
    const report = createReport({
      previousDate: '2026-08-14',
      currentDate: '2026-08-21',
    });
    const repository = createRepositoryMock();
    repository.findById.mockResolvedValue(report);
    repository.updateStatus.mockResolvedValue(createReport({ ...report, status: ReportStatus.Completed }));
    repository.saveResult.mockResolvedValue({
      id: 'res_001',
      reportId: 'rpt_001',
      summaryTable: { title: '이번주 실적', rows: [] },
      comparisonTable: { title: '전주대비', rows: [] },
      sentenceSummary: { title: '문장요약', lines: [] },
      sourceDates: {
        previousBalanceBasisDate: '2026-08-14',
        currentBalanceBasisDate: '2026-08-21',
      },
      createdAt: now,
    });
    const service = new ReportsService(repository as unknown as ReportsRepository);

    await expect(service.runReport('rpt_001')).resolves.toMatchObject({
      report: {
        id: 'rpt_001',
        status: ReportStatus.Completed,
        previousDate: '2026-08-14',
        currentDate: '2026-08-21',
      },
      summaryTable: {
        title: '이번주 실적',
        rows: [],
      },
    });
  });

  it('requires report dates before running aggregation', async () => {
    const repository = createRepositoryMock();
    repository.findById.mockResolvedValue(createReport());
    const service = new ReportsService(repository as unknown as ReportsRepository);

    await expect(service.runReport('rpt_001')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws not found when a report does not exist', async () => {
    const repository = createRepositoryMock();
    repository.findById.mockResolvedValue(null);
    const service = new ReportsService(repository as unknown as ReportsRepository);

    await expect(service.getReportSummary('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('wraps unexpected repository errors', async () => {
    const repository = createRepositoryMock();
    repository.findByName.mockRejectedValue(new Error('db failed'));
    const service = new ReportsService(repository as unknown as ReportsRepository);

    await expect(service.createReport({ name: '08.21 실적' })).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });
});
