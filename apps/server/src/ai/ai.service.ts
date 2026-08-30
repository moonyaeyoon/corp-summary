import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ErrorCode } from '../common/enums/error-code.enum.js';
import { AppException } from '../common/exceptions/app.exception.js';
import { DatabaseService } from '../database/database.service.js';
import { SqlGuideRequestDto } from './dto/sql-guide-request.dto.js';
import { SqlGuideQueryResultDto, SqlGuideResponseDto } from './dto/sql-guide-response.dto.js';

const FORBIDDEN_SQL_PATTERN =
  /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|merge|call|execute|copy)\b/i;
const SQL_PLACEHOLDER_PATTERN = /(:[a-zA-Z_][a-zA-Z0-9_]*|\$\{[^}]+})/;

@Injectable()
export class AiService {
  private readonly guidePath = join(process.cwd(), 'resources/ai/guide_current.md');
  private readonly schemaPath = join(process.cwd(), 'resources/ai/schema_current.md');

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
  ) {}

  async createSqlGuide(dto: SqlGuideRequestDto): Promise<SqlGuideResponseDto> {
    const llamaPath = this.configService.get<string>('AI_LLAMACLI_PATH');
    const modelPath = this.configService.get<string>('AI_MODEL_PATH');

    if (!llamaPath || !modelPath) {
      throw new AppException(HttpStatus.BAD_REQUEST, ErrorCode.AI_MODEL_NOT_CONFIGURED);
    }

    const prompt = await this.buildPrompt(dto.question, dto.dialect ?? 'postgres');
    const raw = await this.runLlama(llamaPath, modelPath, prompt);
    const draftResponse = this.toResponse(raw);

    if (!draftResponse.sql || !draftResponse.isSafeSelect || this.hasPlaceholders(draftResponse.sql)) {
      return draftResponse;
    }

    const queryResult = await this.executeReadOnlySql(draftResponse.sql);
    const resolvedQueryResult =
      queryResult.executed || !this.canRetryAsLocalAnalysisTable(draftResponse.sql)
        ? queryResult
        : await this.retryWithoutAnalysisSchema(draftResponse.sql);

    if (!resolvedQueryResult.executed) {
      return {
        ...draftResponse,
        answer: [
          '로컬 DB 조회에 실패해서 실제 값은 확인할 수 없습니다.',
          '아래 SQL은 생성했지만, 실행 결과를 근거로 한 답변은 아닙니다.',
        ].join(' '),
        cautions: [
          ...draftResponse.cautions,
          resolvedQueryResult.error ?? 'DB 조회 실패',
        ],
        queryResult: resolvedQueryResult,
      };
    }

    const finalAnswerPrompt = this.buildFinalAnswerPrompt(
      dto.question,
      resolvedQueryResult.executedSql ?? draftResponse.sql,
      resolvedQueryResult,
    );
    const finalAnswer = await this.runLlama(llamaPath, modelPath, finalAnswerPrompt);

    return {
      ...draftResponse,
      answer: finalAnswer.trim() || this.createFallbackAnswer(resolvedQueryResult),
      raw: [raw, '', '<DB_RESULT_ANSWER>', finalAnswer.trim(), '</DB_RESULT_ANSWER>'].join('\n'),
      queryResult: resolvedQueryResult,
    };
  }

  private async buildPrompt(question: string, dialect: 'postgres' | 'redshift'): Promise<string> {
    const [guide, schema] = await Promise.all([
      readFile(this.guidePath, 'utf8'),
      readFile(this.schemaPath, 'utf8'),
    ]);

    return [
      'You are a Korean corporate-data SQL guide assistant.',
      'Use only the guide and schema below as trusted context.',
      'Never invent tables or columns.',
      `SQL dialect: ${dialect}.`,
      'If the user asks for SQL, produce read-only SELECT SQL only.',
      'If the user asks for actual values, counts, rankings, or lists, do not invent the result.',
      'For executable SQL in this app, prefer local PostgreSQL tables: myy_corp_balance_mv, myy_corp_transaction_mv, myy_corp_member_dim.',
      'Use schema-qualified company tables only when the user asks where source data lives or explicitly asks for company source tables.',
      'If a required date, member id, customer id, or condition is missing, ask for it instead of guessing.',
      'Prefer analysis tables for normal questions.',
      'For balances, never sum multiple basis_dt snapshots.',
      "For transaction amount, include only transaction_type IN ('매수', '매도').",
      'Answer in Korean.',
      'Return exactly this structure:',
      'ANSWER:',
      '<short Korean answer>',
      'SQL:',
      '<SQL or NONE>',
      'USED_TABLES:',
      '<comma-separated table names or NONE>',
      'CAUTIONS:',
      '<bullet list or NONE>',
      '',
      '<GUIDE>',
      guide,
      '</GUIDE>',
      '',
      '<SCHEMA>',
      schema,
      '</SCHEMA>',
      '',
      '<USER_QUESTION>',
      question,
      '</USER_QUESTION>',
    ].join('\n');
  }

  private buildFinalAnswerPrompt(
    question: string,
    sql: string,
    queryResult: SqlGuideQueryResultDto,
  ): string {
    return [
      'You are a Korean corporate-data assistant.',
      'Answer the user using only the DB_RESULT rows below.',
      'Do not invent numbers, names, dates, or facts.',
      'If DB_RESULT is empty, say that there is no matching data in the connected local DB.',
      'Keep the answer concise.',
      '',
      '<USER_QUESTION>',
      question,
      '</USER_QUESTION>',
      '',
      '<EXECUTED_SQL>',
      sql,
      '</EXECUTED_SQL>',
      '',
      '<DB_RESULT>',
      JSON.stringify(
        {
          rowCount: queryResult.rowCount,
          columns: queryResult.columns,
          rows: queryResult.rows,
        },
        null,
        2,
      ),
      '</DB_RESULT>',
    ].join('\n');
  }

  private runLlama(llamaPath: string, modelPath: string, prompt: string): Promise<string> {
    const timeoutMs = Number(this.configService.get<string | number>('AI_TIMEOUT_MS', 60000));
    const ctxSize = this.configService.get<string>('AI_CONTEXT_SIZE', '8192');
    const maxTokens = this.configService.get<string>('AI_MAX_TOKENS', '1024');
    const subcommand = this.configService.get<string>('AI_LLAMACLI_SUBCOMMAND', '').trim();
    const args = [
      ...(subcommand ? [subcommand] : []),
      '-m',
      modelPath,
      '-p',
      prompt,
      '-c',
      ctxSize,
      '-n',
      maxTokens,
      '--temp',
      '0.1',
      '--single-turn',
      '--simple-io',
      '--no-display-prompt',
      '--no-show-timings',
    ];

    return new Promise((resolve, reject) => {
      const child = spawn(llamaPath, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let stdout = '';
      let stderr = '';
      const timer = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new AppException(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCode.AI_SQL_GUIDE_FAILED));
      }, timeoutMs);

      child.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString('utf8');
      });
      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString('utf8');
      });
      child.on('error', () => {
        clearTimeout(timer);
        reject(new AppException(HttpStatus.BAD_REQUEST, ErrorCode.AI_MODEL_NOT_CONFIGURED));
      });
      child.on('close', (code) => {
        clearTimeout(timer);

        if (code !== 0) {
          reject(new AppException(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCode.AI_SQL_GUIDE_FAILED));
          return;
        }

        resolve(stdout.trim() || stderr.trim());
      });
    });
  }

  private toResponse(raw: string): SqlGuideResponseDto {
    const sql = this.extractSection(raw, 'SQL');
    const normalizedSql = sql && sql.toUpperCase() !== 'NONE' ? this.stripSqlFence(sql) : null;

    return {
      answer: this.extractSection(raw, 'ANSWER') || raw,
      sql: normalizedSql,
      usedTables: this.parseListSection(this.extractSection(raw, 'USED_TABLES')),
      cautions: this.parseListSection(this.extractSection(raw, 'CAUTIONS')),
      isSafeSelect: normalizedSql ? this.isSafeSelect(normalizedSql) : true,
      raw,
    };
  }

  private async executeReadOnlySql(sql: string): Promise<SqlGuideQueryResultDto> {
    const queryRunner = this.databaseService.getDataSource().createQueryRunner();
    const statementTimeoutMs = Number(
      this.configService.get<string | number>('AI_QUERY_TIMEOUT_MS', 5000),
    );
    const limitedSql = this.wrapWithLimit(sql);

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      await queryRunner.query('SET TRANSACTION READ ONLY');
      await queryRunner.query(`SET LOCAL statement_timeout = ${this.toPositiveInteger(statementTimeoutMs, 5000)}`);

      const rows = (await queryRunner.query(limitedSql)) as Record<string, unknown>[];
      await queryRunner.rollbackTransaction();

      return {
        executed: true,
        columns: this.extractColumns(rows),
        executedSql: limitedSql,
        rows: rows.map((row) => this.toSerializableRow(row)),
        rowCount: rows.length,
        error: null,
      };
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }

      return {
        executed: false,
        columns: [],
        executedSql: limitedSql,
        rows: [],
        rowCount: 0,
        error: error instanceof Error ? error.message : 'DB 조회 실패',
      };
    } finally {
      await queryRunner.release();
    }
  }

  private async retryWithoutAnalysisSchema(sql: string): Promise<SqlGuideQueryResultDto> {
    const localSql = sql.replace(/\banalysis\./gi, '');
    const queryResult = await this.executeReadOnlySql(localSql);

    if (!queryResult.executed) {
      return queryResult;
    }

    return {
      ...queryResult,
      error: null,
    };
  }

  private extractSection(raw: string, name: string): string {
    const nextSectionPattern = 'ANSWER|SQL|USED_TABLES|CAUTIONS';
    const pattern = new RegExp(`${name}:\\s*([\\s\\S]*?)(?=\\n(?:${nextSectionPattern}):|$)`, 'i');
    const match = raw.match(pattern);

    return match?.[1]?.trim() ?? '';
  }

  private stripSqlFence(sql: string): string {
    return sql
      .replace(/^```sql\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();
  }

  private parseListSection(value: string): string[] {
    if (!value || value.toUpperCase() === 'NONE') {
      return [];
    }

    return value
      .split(/\n|,/)
      .map((item) => item.replace(/^[-*]\s*/, '').trim())
      .filter(Boolean);
  }

  private isSafeSelect(sql: string): boolean {
    const normalized = sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();

    return (
      /^(select|with)\b/i.test(normalized) &&
      !FORBIDDEN_SQL_PATTERN.test(normalized) &&
      !this.hasMultipleStatements(normalized)
    );
  }

  private hasMultipleStatements(sql: string): boolean {
    const withoutTrailingSemicolon = sql.trim().replace(/;\s*$/, '');

    return withoutTrailingSemicolon.includes(';');
  }

  private hasPlaceholders(sql: string): boolean {
    return SQL_PLACEHOLDER_PATTERN.test(sql);
  }

  private canRetryAsLocalAnalysisTable(sql: string): boolean {
    return /\banalysis\.myy_corp_(balance_mv|transaction_mv|member_dim)\b/i.test(sql);
  }

  private wrapWithLimit(sql: string): string {
    const limit = this.toPositiveInteger(
      Number(this.configService.get<string | number>('AI_QUERY_RESULT_LIMIT', 20)),
      20,
    );
    const trimmedSql = sql.trim().replace(/;\s*$/, '');

    return `SELECT * FROM (${trimmedSql}) AS ai_query_result LIMIT ${limit}`;
  }

  private toPositiveInteger(value: number, fallback: number): number {
    return Number.isInteger(value) && value > 0 ? value : fallback;
  }

  private extractColumns(rows: Record<string, unknown>[]): string[] {
    const [firstRow] = rows;

    return firstRow ? Object.keys(firstRow) : [];
  }

  private toSerializableRow(
    row: Record<string, unknown>,
  ): Record<string, string | number | boolean | null> {
    return Object.fromEntries(
      Object.entries(row).map(([key, value]) => [key, this.toSerializableValue(value)]),
    );
  }

  private toSerializableValue(value: unknown): string | number | boolean | null {
    if (value === null || value === undefined) {
      return null;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'bigint') {
      return value.toString();
    }

    return JSON.stringify(value);
  }

  private createFallbackAnswer(queryResult: SqlGuideQueryResultDto): string {
    if (queryResult.rowCount === 0) {
      return '연결된 로컬 DB에서 조건에 맞는 데이터를 찾지 못했습니다.';
    }

    return `연결된 로컬 DB에서 ${queryResult.rowCount.toLocaleString('ko-KR')}건을 조회했습니다.`;
  }
}
