import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SqlGuideRequestDto {
  @ApiProperty({
    description: '법인 데이터 또는 SQL 생성 관련 사용자 질문',
    example: '회원 ID A1234인 법인의 지난주 예치금 알려줘.',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  question!: string;

  @ApiPropertyOptional({
    description: '생성할 SQL 방언',
    default: 'postgres',
    enum: ['postgres', 'redshift'],
  })
  @IsOptional()
  @IsIn(['postgres', 'redshift'])
  dialect?: 'postgres' | 'redshift';
}
