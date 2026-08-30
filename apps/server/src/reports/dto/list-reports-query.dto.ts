import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class ListReportsQueryDto {
  @ApiPropertyOptional({
    description: '조회할 리포트 개수',
    default: 20,
    example: 20,
    maximum: 100,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: '다음 페이지 조회용 cursor',
    example: '11111111-1111-4111-8111-111111111111',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4')
  cursor?: string;
}
