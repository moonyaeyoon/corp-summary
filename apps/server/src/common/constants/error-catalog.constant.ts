import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../enums/error-code.enum.js';
import { ErrorMessage } from '../enums/error-message.enum.js';

export const HTTP_STATUS_ERROR_CODE_MAP: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: ErrorCode.VALIDATION_ERROR,
  [HttpStatus.NOT_FOUND]: ErrorCode.REPORT_NOT_FOUND,
  [HttpStatus.CONFLICT]: ErrorCode.REPORT_ALREADY_RUNNING,
  [HttpStatus.INTERNAL_SERVER_ERROR]: ErrorCode.INTERNAL_ERROR,
};

export const ERROR_CODE_DEFAULT_MESSAGE_MAP: Record<ErrorCode, ErrorMessage> = {
  [ErrorCode.VALIDATION_ERROR]: ErrorMessage.VALIDATION_ERROR,
  [ErrorCode.REPORT_DATE_REQUIRED]: ErrorMessage.REPORT_DATE_REQUIRED,
  [ErrorCode.REPORT_NAME_ALREADY_EXISTS]: ErrorMessage.REPORT_NAME_ALREADY_EXISTS,
  [ErrorCode.REPORT_NOT_FOUND]: ErrorMessage.REPORT_NOT_FOUND,
  [ErrorCode.REPORT_ALREADY_RUNNING]: ErrorMessage.REPORT_ALREADY_RUNNING,
  [ErrorCode.REPORT_SUMMARY_NOT_FOUND]: ErrorMessage.REPORT_SUMMARY_NOT_FOUND,
  [ErrorCode.REPORT_AGGREGATION_FAILED]: ErrorMessage.REPORT_AGGREGATION_FAILED,
  [ErrorCode.INTERNAL_ERROR]: ErrorMessage.INTERNAL_ERROR,
};
