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
const ANSWER_ID_COLUMNS = ['cust_id', 'mem_id'];
const COLUMN_LABEL_MAP: Record<string, string> = {
  account_status: '계정상태',
  balance_krw_amt: '원화환산잔고',
  basis_dt: '기준일',
  coin_qty: '코인수량',
  corp_market_type: '법인유형',
  corp_nm: '법인이름',
  corp_type: '법인유형',
  cust_id: 'cust_id',
  inout_type: '입출금구분',
  is_core: 'core여부',
  krw_amt: '원화환산거래금액',
  kyc_status: '고객확인상태',
  latest_kyc_dtm: '마지막고객확인날짜',
  market_stage: '시장참여단계',
  mem_id: 'mem_id',
  next_kyc_dtm: '다음고객확인날짜',
  transaction_dtm: '거래일시',
  transaction_type: '구분',
};

@Injectable()
export class AiService {
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
    const normalizedAnswer = this.normalizeFinalAnswer(
      dto.question,
      finalAnswer,
      resolvedQueryResult,
    );

    return {
      ...draftResponse,
      answer: normalizedAnswer,
      raw: [raw, '', '<DB_RESULT_ANSWER>', finalAnswer.trim(), '</DB_RESULT_ANSWER>'].join('\n'),
      queryResult: resolvedQueryResult,
    };
  }

  private async buildPrompt(question: string, dialect: 'postgres' | 'redshift'): Promise<string> {
    const guidePath =
      this.configService.get<string>('AI_GUIDE_PATH') ??
      join(process.cwd(), 'resources/ai/guide_current.md');
    const schemaPath =
      this.configService.get<string>('AI_SCHEMA_PATH') ??
      join(process.cwd(), 'resources/ai/schema_current.md');
    const [guide, schema] = await Promise.all([
      readFile(guidePath, 'utf8'),
      readFile(schemaPath, 'utf8'),
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
      'Return only one concise natural Korean sentence.',
      'Do not include SQL, DB_RESULT, EXECUTED_SQL, XML tags, JSON, markdown tables, or pipe-separated rows.',
      'The app displays SQL, query rows, and used tables separately.',
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

        resolve(this.cleanLlamaOutput(stdout.trim() || stderr.trim(), prompt));
      });
    });
  }

  private toResponse(raw: string): SqlGuideResponseDto {
    const cleanedRaw = this.cleanLlamaOutput(raw);
    const sql = this.extractSection(cleanedRaw, 'SQL');
    const normalizedSql = sql && sql.toUpperCase() !== 'NONE' ? this.stripSqlFence(sql) : null;

    return {
      answer: this.extractSection(cleanedRaw, 'ANSWER') || cleanedRaw,
      sql: normalizedSql,
      usedTables: this.parseListSection(this.extractSection(cleanedRaw, 'USED_TABLES')),
      cautions: this.parseListSection(this.extractSection(cleanedRaw, 'CAUTIONS')),
      isSafeSelect: normalizedSql ? this.isSafeSelect(normalizedSql) : true,
      raw: cleanedRaw,
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

  private cleanLlamaOutput(raw: string, prompt?: string): string {
    let output = this.stripAnsi(raw).trim();

    if (prompt && output.includes(prompt)) {
      output = output.slice(output.lastIndexOf(prompt) + prompt.length);
    }

    const markers = ['</DB_RESULT>', '</USER_QUESTION>', '</SCHEMA>'];
    const markerIndex = markers.reduce((latestIndex, marker) => {
      const index = output.lastIndexOf(marker);

      return index > latestIndex ? index + marker.length : latestIndex;
    }, -1);

    if (markerIndex >= 0) {
      output = output.slice(markerIndex);
    }

    output = output
      .replace(/\bloading model\.\.\.[\s\S]*?available commands:[\s\S]*?(?=\n\s*>|\nANSWER:|\nSQL:|$)/i, '')
      .replace(/\n?\s*>\s*/g, '\n')
      .replace(/\n?Exiting\.\.\.\s*$/i, '')
      .trim();

    return output;
  }

  private stripAnsi(value: string): string {
    const escapeCharacter = String.fromCharCode(27);
    const ansiPattern = new RegExp(`${escapeCharacter}\\[[0-?]*[ -/]*[@-~]`, 'g');

    return value.replace(ansiPattern, '');
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

  private normalizeFinalAnswer(
    question: string,
    finalAnswer: string,
    queryResult: SqlGuideQueryResultDto,
  ): string {
    const cleanedAnswer = this.cleanLlamaOutput(finalAnswer);
    const answerSection = this.extractSection(cleanedAnswer, 'ANSWER');
    const candidate = (answerSection || cleanedAnswer)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !this.isRawMarkerLine(line))
      .join(' ')
      .trim();

    if (!candidate || this.isRawLikeAnswer(candidate)) {
      return this.createNaturalAnswerFromQueryResult(question, queryResult);
    }

    return candidate;
  }

  private isRawMarkerLine(line: string): boolean {
    return /<\/?(DB_RESULT|EXECUTED_SQL|USER_QUESTION|SCHEMA|GUIDE|DB_RESULT_ANSWER)>/i.test(
      line,
    );
  }

  private isRawLikeAnswer(value: string): boolean {
    const normalized = value.trim();

    return (
      /\bDB_RESULT\b|\bEXECUTED_SQL\b|<\/?[A-Z_]+>/i.test(normalized) ||
      normalized.startsWith('{') ||
      normalized.startsWith('[') ||
      /^[A-Z0-9_-]+\s*\|\s*[^|]+/i.test(normalized)
    );
  }

  private createNaturalAnswerFromQueryResult(
    question: string,
    queryResult: SqlGuideQueryResultDto,
  ): string {
    if (queryResult.rowCount === 0) {
      return this.createFallbackAnswer(queryResult);
    }

    const [firstRow] = queryResult.rows;

    if (!firstRow) {
      return this.createFallbackAnswer(queryResult);
    }

    const identifier = this.resolveAnswerIdentifier(question, firstRow);
    const valueColumns = this.getAnswerValueColumns(question, queryResult.columns, firstRow);

    if (valueColumns.length === 0) {
      return this.createFallbackAnswer(queryResult);
    }

    if (queryResult.rowCount > 1) {
      return `조건에 맞는 데이터가 ${queryResult.rowCount.toLocaleString('ko-KR')}건 조회되었습니다.`;
    }

    const formattedValues = valueColumns
      .slice(0, 3)
      .map((column) => {
        const label = COLUMN_LABEL_MAP[column] ?? column;
        const value = this.formatAnswerCell(firstRow[column]);

        return { label, value };
      });

    const subject = identifier ?? '조회된 법인';

    if (formattedValues.length === 1) {
      const [formattedValue] = formattedValues;

      return `${subject}의 ${formattedValue.label}는 '${formattedValue.value}'입니다.`;
    }

    const summary = formattedValues
      .map((formattedValue) => `${formattedValue.label} '${formattedValue.value}'`)
      .join(', ');

    return `${subject}의 조회 결과는 ${summary}입니다.`;
  }

  private resolveAnswerIdentifier(
    question: string,
    row: Record<string, string | number | boolean | null>,
  ): string | null {
    const questionCustId = question.match(/\bcust[_\s-]?id\s+([a-zA-Z0-9_-]+)/i)?.[1];
    const questionMemId = question.match(/\bmem[_\s-]?id\s+([a-zA-Z0-9_-]+)/i)?.[1];

    if (questionCustId) {
      return `cust_id ${questionCustId}`;
    }

    if (questionMemId) {
      return `mem_id ${questionMemId}`;
    }

    const rowIdColumn = ANSWER_ID_COLUMNS.find((column) => row[column] !== undefined);
    const rowIdValue = rowIdColumn ? row[rowIdColumn] : null;

    return rowIdColumn && rowIdValue !== null && rowIdValue !== undefined
      ? `${rowIdColumn} ${String(rowIdValue)}`
      : null;
  }

  private getAnswerValueColumns(
    question: string,
    columns: string[],
    row: Record<string, string | number | boolean | null>,
  ): string[] {
    const availableColumns = columns.filter(
      (column) => !ANSWER_ID_COLUMNS.includes(column) && row[column] !== undefined,
    );
    const requestedColumn = availableColumns.find((column) => {
      const label = COLUMN_LABEL_MAP[column];

      return question.includes(column) || Boolean(label && question.includes(label));
    });

    return requestedColumn ? [requestedColumn] : availableColumns;
  }

  private formatAnswerCell(value: string | number | boolean | null | undefined): string {
    if (value === null || value === undefined) {
      return '-';
    }

    return String(value);
  }

  private createFallbackAnswer(queryResult: SqlGuideQueryResultDto): string {
    if (queryResult.rowCount === 0) {
      return '연결된 로컬 DB에서 조건에 맞는 데이터를 찾지 못했습니다.';
    }

    return `연결된 로컬 DB에서 ${queryResult.rowCount.toLocaleString('ko-KR')}건을 조회했습니다.`;
  }
}
