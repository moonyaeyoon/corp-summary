import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateReportDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;
}
