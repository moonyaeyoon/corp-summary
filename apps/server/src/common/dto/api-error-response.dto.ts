import { ErrorCode } from '../enums/error-code.enum.js';

export interface ApiErrorDto {
  code: ErrorCode;
  message: string;
  field?: string;
}

export interface ApiErrorResponseDto {
  error: ApiErrorDto;
}
