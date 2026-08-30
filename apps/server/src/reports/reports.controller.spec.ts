import { Test, TestingModule } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';

describe('ReportsController', () => {
  let controller: ReportsController;
  const reportsService = {
    createReport: vi.fn(),
    deleteReport: vi.fn(),
    getReportSummary: vi.fn(),
    listReports: vi.fn(),
    runReport: vi.fn(),
    updateReport: vi.fn(),
    updateReportDates: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [{ provide: ReportsService, useValue: reportsService }],
    }).compile();

    controller = module.get(ReportsController);
  });

  it('delegates report creation to the service', async () => {
    reportsService.createReport.mockResolvedValue({ id: 'rpt_001' });

    await expect(controller.createReport({ name: '08.21 실적' })).resolves.toEqual({
      id: 'rpt_001',
    });
    expect(reportsService.createReport).toHaveBeenCalledWith({ name: '08.21 실적' });
  });

  it('delegates report list query to the service', async () => {
    reportsService.listReports.mockResolvedValue({ items: [], nextCursor: null });

    await controller.listReports({ limit: '20', cursor: 'abc' });

    expect(reportsService.listReports).toHaveBeenCalledWith({ limit: '20', cursor: 'abc' });
  });

  it('delegates report run to the service', async () => {
    reportsService.runReport.mockResolvedValue({ report: { id: 'rpt_001' } });

    await controller.runReport('rpt_001');

    expect(reportsService.runReport).toHaveBeenCalledWith('rpt_001');
  });

  it('documents report endpoints with Swagger examples for manual API tests', async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [{ provide: ReportsService, useValue: reportsService }],
    }).compile();
    const app = module.createNestApplication();

    await app.init();
    const document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
    await app.close();

    expect(document.paths['/reports']?.post?.summary).toBe('Create report');
    expect(document.paths['/reports/{reportId}/dates']?.patch?.summary).toBe(
      'Update report dates',
    );
    expect(document.paths['/reports/{reportId}/run']?.post?.summary).toBe(
      'Run report aggregation',
    );
    expect(
      document.paths['/reports/{reportId}/dates']?.patch?.parameters?.some(
        (parameter) =>
          parameter.name === 'reportId' && parameter.schema?.example === 'rpt_001',
      ),
    ).toBe(true);
    expect(document.components?.schemas?.CreateReportDto?.properties?.name?.example).toBe(
      '08.27 실적',
    );
    expect(
      document.components?.schemas?.UpdateReportDatesDto?.properties?.previousDate?.example,
    ).toBe('2026-07-07');
    expect(
      document.components?.schemas?.UpdateReportDatesDto?.properties?.currentDate?.example,
    ).toBe('2026-08-27');
  });
});
