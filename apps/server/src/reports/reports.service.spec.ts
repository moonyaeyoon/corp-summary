import { HttpStatus } from '@nestjs/common';
import { BalancesService } from '../balances/balances.service.js';
import { ErrorCode } from '../common/enums/error-code.enum.js';
import { AppException } from '../common/exceptions/app.exception.js';
import { OnboardingService } from '../onboarding/onboarding.service.js';
import { TransactionsService } from '../transactions/transactions.service.js';
import { SummaryGroupKey, createEmptySummaryMetricMap } from './report-summary-groups.js';
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

function createMetricMap(values: Partial<Record<SummaryGroupKey, number>>) {
  return {
    ...createEmptySummaryMetricMap(),
    ...values,
  };
}

function createService(
  repository: ReturnType<typeof createRepositoryMock>,
  overrides: {
    balancesService?: Partial<BalancesService>;
    onboardingService?: Partial<OnboardingService>;
    transactionsService?: Partial<TransactionsService>;
  } = {},
) {
  const balancesService = {
    getSummaryMetrics: vi.fn().mockResolvedValue(createEmptySummaryMetricMap()),
    ...overrides.balancesService,
  };
  const onboardingService = {
    getSummaryMetrics: vi.fn().mockResolvedValue(createEmptySummaryMetricMap()),
    ...overrides.onboardingService,
  };
  const transactionsService = {
    getSummaryMetrics: vi.fn().mockResolvedValue(createEmptySummaryMetricMap()),
    ...overrides.transactionsService,
  };

  return new ReportsService(
    repository as unknown as ReportsRepository,
    balancesService as unknown as BalancesService,
    onboardingService as unknown as OnboardingService,
    transactionsService as unknown as TransactionsService,
  );
}

describe('ReportsService', () => {
  it('creates a draft report', async () => {
    const repository = createRepositoryMock();
    repository.findByName.mockResolvedValue(null);
    repository.create.mockResolvedValue(createReport());
    const service = createService(repository);

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
    const service = createService(repository);

    await expect(service.createReport({ name: '08.21 실적' })).rejects.toMatchObject({
      response: {
        code: ErrorCode.REPORT_NAME_ALREADY_EXISTS,
      },
      status: HttpStatus.CONFLICT,
    });
  });

  it('rejects date updates when previousDate is not earlier than currentDate', async () => {
    const repository = createRepositoryMock();
    repository.findById.mockResolvedValue(createReport());
    const service = createService(repository);

    await expect(
      service.updateReportDates('rpt_001', {
        previousDate: '2026-08-21',
        currentDate: '2026-08-21',
      }),
    ).rejects.toMatchObject({
      response: {
        code: ErrorCode.VALIDATION_ERROR,
      },
    });
  });

  it('runs a report and persists calculated summary result', async () => {
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
      summaryTable: {
        title: '이번주 실적',
        previousLabel: '실적 (2026.08.14 기준)',
        currentLabel: '실적 (2026.08.21 기준)',
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
      sentenceSummary: { title: '문장요약', lines: [] },
      sourceDates: {
        previousBalanceBasisDate: '2026-08-14',
        currentBalanceBasisDate: '2026-08-21',
      },
      createdAt: now,
    });
    const balancesService = {
      getSummaryMetrics: vi
        .fn()
        .mockResolvedValueOnce(createMetricMap({ [SummaryGroupKey.Stage1]: 1_000_000 }))
        .mockResolvedValueOnce(createMetricMap({ [SummaryGroupKey.Stage1]: 2_000_000 })),
    };
    const onboardingService = {
      getSummaryMetrics: vi
        .fn()
        .mockResolvedValueOnce(createMetricMap({ [SummaryGroupKey.Stage1]: 1 }))
        .mockResolvedValueOnce(createMetricMap({ [SummaryGroupKey.Stage1]: 3 })),
    };
    const transactionsService = {
      getSummaryMetrics: vi
        .fn()
        .mockResolvedValueOnce(createMetricMap({ [SummaryGroupKey.Stage1]: 4_000_000 }))
        .mockResolvedValueOnce(createMetricMap({ [SummaryGroupKey.Stage1]: 7_000_000 })),
    };
    const service = createService(repository, {
      balancesService,
      onboardingService,
      transactionsService,
    });

    await expect(service.runReport('rpt_001')).resolves.toMatchObject({
      report: {
        id: 'rpt_001',
        status: ReportStatus.Completed,
        previousDate: '2026-08-14',
        currentDate: '2026-08-21',
      },
    });
    expect(balancesService.getSummaryMetrics).toHaveBeenNthCalledWith(1, '2026-08-14');
    expect(balancesService.getSummaryMetrics).toHaveBeenNthCalledWith(2, '2026-08-21');
    expect(repository.saveResult).toHaveBeenCalledWith(
      expect.objectContaining({
        summaryTable: expect.objectContaining({
          rows: expect.arrayContaining([
            expect.objectContaining({
              corpType: '1단계',
              previous: expect.objectContaining({ balanceKrw: 1_000_000 }),
              current: expect.objectContaining({ balanceKrw: 2_000_000 }),
            }),
          ]),
        }),
      }),
    );
  });

  it('requires report dates before running aggregation', async () => {
    const repository = createRepositoryMock();
    repository.findById.mockResolvedValue(createReport());
    const service = createService(repository);

    await expect(service.runReport('rpt_001')).rejects.toMatchObject({
      response: {
        code: ErrorCode.REPORT_DATE_REQUIRED,
      },
      status: HttpStatus.BAD_REQUEST,
    });
  });

  it('throws not found when a report does not exist', async () => {
    const repository = createRepositoryMock();
    repository.findById.mockResolvedValue(null);
    const service = createService(repository);

    await expect(service.getReportSummary('missing')).rejects.toBeInstanceOf(AppException);
  });

  it('wraps unexpected repository errors', async () => {
    const repository = createRepositoryMock();
    repository.findByName.mockRejectedValue(new Error('db failed'));
    const service = createService(repository);

    await expect(service.createReport({ name: '08.21 실적' })).rejects.toMatchObject({
      response: {
        code: ErrorCode.INTERNAL_ERROR,
      },
      status: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  });
});
