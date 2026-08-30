import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AiService } from './ai.service.js';
import { SqlGuideRequestDto } from './dto/sql-guide-request.dto.js';
import { SqlGuideResponseDto } from './dto/sql-guide-response.dto.js';

@Controller('ai')
@ApiTags('AI')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('sql-guide')
  @ApiOperation({ summary: 'Generate corporate data SQL guide answer' })
  @ApiBody({ type: SqlGuideRequestDto })
  @ApiOkResponse({
    description: 'SQL 가이드 답변 생성 성공',
    type: SqlGuideResponseDto,
    example: {
      answer: '법인 예치금은 analysis.myy_corp_balance_mv에서 기준일 Snapshot으로 조회합니다.',
      sql: "SELECT COALESCE(SUM(balance_krw_amt), 0) AS balance_krw_amt FROM analysis.myy_corp_balance_mv WHERE mem_id = 'A1234' AND basis_dt = CURRENT_DATE - INTERVAL '7 days';",
      usedTables: ['analysis.myy_corp_balance_mv'],
      cautions: ['잔고는 Snapshot이므로 여러 basis_dt를 합산하지 않습니다.'],
      isSafeSelect: true,
      raw: 'ANSWER:\n...',
    },
  })
  @ApiBadRequestResponse({
    description: '모델 경로 미설정 또는 요청 값 검증 실패',
    example: {
      error: {
        code: 'AI_MODEL_NOT_CONFIGURED',
        message: 'AI model is not configured',
      },
    },
  })
  createSqlGuide(@Body() dto: SqlGuideRequestDto): Promise<SqlGuideResponseDto> {
    return this.aiService.createSqlGuide(dto);
  }
}
