import { ApiProperty } from '@nestjs/swagger';

export class SqlGuideQueryResultDto {
  @ApiProperty({
    description: '백엔드에서 SQL을 실제로 실행했으면 true',
    example: true,
  })
  executed!: boolean;

  @ApiProperty({
    description: '조회 결과 컬럼 목록',
    example: ['mem_id', 'balance_krw_amt'],
  })
  columns!: string[];

  @ApiProperty({
    description: '실제로 DB에 실행한 SQL',
    example: "SELECT * FROM (SELECT mem_id, balance_krw_amt FROM myy_corp_balance_mv) AS ai_query_result LIMIT 20",
    nullable: true,
  })
  executedSql!: string | null;

  @ApiProperty({
    description: '조회 결과 row 목록',
    example: [{ mem_id: 'A1234', balance_krw_amt: '5000000.000000000000000000' }],
  })
  rows!: Record<string, string | number | boolean | null>[];

  @ApiProperty({
    description: '응답에 포함된 row 수',
    example: 1,
  })
  rowCount!: number;

  @ApiProperty({
    description: '조회 실패 사유. executed가 false일 때만 값이 있을 수 있다.',
    example: null,
    nullable: true,
  })
  error!: string | null;
}

export class SqlGuideResponseDto {
  @ApiProperty({
    description: '사용자 질문에 대한 설명 답변',
    example: '법인 예치금은 analysis.myy_corp_balance_mv에서 기준일 Snapshot으로 조회합니다.',
  })
  answer!: string;

  @ApiProperty({
    description: '생성된 SQL. 테이블 안내 질문이면 null일 수 있다.',
    example: 'SELECT * FROM analysis.myy_corp_balance_mv WHERE mem_id = :mem_id;',
    nullable: true,
  })
  sql!: string | null;

  @ApiProperty({
    description: '답변 또는 SQL에서 사용한 테이블 목록',
    example: ['analysis.myy_corp_balance_mv'],
  })
  usedTables!: string[];

  @ApiProperty({
    description: '주의사항 또는 기준일 확인 필요 문구',
    example: ['잔고는 Snapshot이므로 여러 basis_dt를 합산하지 않습니다.'],
  })
  cautions!: string[];

  @ApiProperty({
    description: '생성 SQL이 조회 전용으로 판단되면 true',
    example: true,
  })
  isSafeSelect!: boolean;

  @ApiProperty({
    description: 'LLM 원문 응답',
  })
  raw!: string;

  @ApiProperty({
    description: '안전한 SELECT SQL을 로컬 DB에서 실행한 결과',
    type: SqlGuideQueryResultDto,
    required: false,
  })
  queryResult?: SqlGuideQueryResultDto;
}
