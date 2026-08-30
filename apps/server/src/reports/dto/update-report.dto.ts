import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateReportDto {
  @ApiProperty({
    description: '변경할 리포트 이름',
    example: '08.27 실적 수정',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;
}
