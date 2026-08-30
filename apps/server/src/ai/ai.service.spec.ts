import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service.js';
import { AiService } from './ai.service.js';

function createService(queryMock: ReturnType<typeof vi.fn>) {
  const queryRunner = {
    connect: vi.fn().mockResolvedValue(undefined),
    startTransaction: vi.fn().mockResolvedValue(undefined),
    query: queryMock,
    rollbackTransaction: vi.fn().mockResolvedValue(undefined),
    release: vi.fn().mockResolvedValue(undefined),
    isTransactionActive: true,
  };
  const dataSource = {
    createQueryRunner: vi.fn().mockReturnValue(queryRunner),
  };
  const databaseService = {
    getDataSource: vi.fn().mockReturnValue(dataSource),
  };
  const configService = {
    get: vi.fn((key: string, defaultValue?: string | number) => {
      const values: Record<string, string | number> = {
        AI_QUERY_RESULT_LIMIT: 10,
        AI_QUERY_TIMEOUT_MS: 3000,
      };

      return values[key] ?? defaultValue;
    }),
  };

  return {
    queryRunner,
    service: new AiService(
      configService as unknown as ConfigService,
      databaseService as unknown as DatabaseService,
    ),
  };
}

describe('AiService', () => {
  it('executes safe SELECT SQL in a read-only transaction', async () => {
    const queryMock = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([{ mem_id: 'A1234', balance_krw_amt: '5000.000000000000000000' }]);
    const { queryRunner, service } = createService(queryMock);

    const result = await (
      service as unknown as {
        executeReadOnlySql: (sql: string) => Promise<{
          executed: boolean;
          columns: string[];
          executedSql: string | null;
          rows: Record<string, string | number | boolean | null>[];
          rowCount: number;
          error: string | null;
        }>;
      }
    ).executeReadOnlySql("SELECT mem_id, balance_krw_amt FROM myy_corp_balance_mv WHERE mem_id = 'A1234'");

    expect(queryRunner.connect).toHaveBeenCalled();
    expect(queryRunner.startTransaction).toHaveBeenCalled();
    expect(queryMock).toHaveBeenNthCalledWith(1, 'SET TRANSACTION READ ONLY');
    expect(queryMock).toHaveBeenNthCalledWith(2, 'SET LOCAL statement_timeout = 3000');
    expect(queryMock).toHaveBeenNthCalledWith(
      3,
      "SELECT * FROM (SELECT mem_id, balance_krw_amt FROM myy_corp_balance_mv WHERE mem_id = 'A1234') AS ai_query_result LIMIT 10",
    );
    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(result).toMatchObject({
      executed: true,
      columns: ['mem_id', 'balance_krw_amt'],
      rowCount: 1,
      rows: [{ mem_id: 'A1234', balance_krw_amt: '5000.000000000000000000' }],
    });
  });

  it('rejects multiple statements as unsafe SQL', () => {
    const { service } = createService(vi.fn());

    const isSafeSelect = (
      service as unknown as {
        isSafeSelect: (sql: string) => boolean;
      }
    ).isSafeSelect('SELECT * FROM myy_corp_balance_mv; DROP TABLE reports;');

    expect(isSafeSelect).toBe(false);
  });
});
