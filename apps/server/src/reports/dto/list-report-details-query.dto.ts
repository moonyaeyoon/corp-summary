import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListReportDetailsQueryDto {
  @ApiPropertyOptional({
    description: '조회할 상세 데이터 개수',
    default: 50,
    example: 50,
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
    required: false,
  })
  @IsOptional()
  @IsString()
  cursor?: string;
}
