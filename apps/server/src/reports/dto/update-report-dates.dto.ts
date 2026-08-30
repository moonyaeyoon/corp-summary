import { IsDateString } from 'class-validator';

export class UpdateReportDatesDto {
  @IsDateString()
  previousDate!: string;

  @IsDateString()
  currentDate!: string;
}
