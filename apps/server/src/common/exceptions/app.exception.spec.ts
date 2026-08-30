import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../enums/error-code.enum.js';
import { ErrorMessage } from '../enums/error-message.enum.js';
import { AppException } from './app.exception.js';

describe('AppException', () => {
  it('builds response body from error code catalog', () => {
    const exception = new AppException(HttpStatus.NOT_FOUND, ErrorCode.REPORT_NOT_FOUND);

    expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
    expect(exception.getResponse()).toEqual({
      code: ErrorCode.REPORT_NOT_FOUND,
      message: ErrorMessage.REPORT_NOT_FOUND,
    });
  });

  it('does not include field metadata in the error response', () => {
    const exception = new AppException(HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_ERROR);

    expect(exception.getResponse()).toEqual({
      code: ErrorCode.VALIDATION_ERROR,
      message: ErrorMessage.VALIDATION_ERROR,
    });
  });
});
