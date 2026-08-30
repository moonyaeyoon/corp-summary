import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class RunReportDto {
  @ApiProperty({
    description: '전주 기준일',
    example: '2026-07-07',
    format: 'date',
  })
  @IsDateString()
  previousDate!: string;

  @ApiProperty({
    description: '이번주 기준일',
    example: '2026-08-27',
    format: 'date',
  })
  @IsDateString()
  currentDate!: string;
}
