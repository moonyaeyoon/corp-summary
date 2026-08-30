import { ReportStatus } from '../reports.entity.js';

export interface ReportResponseDto {
  id: string;
  name: string;
  status: ReportStatus;
  previousDate: string | null;
  currentDate: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReportListResponseDto {
  items: ReportResponseDto[];
  nextCursor: string | null;
}
