import { HttpException, HttpStatus } from '@nestjs/common';
import { ERROR_CODE_DEFAULT_MESSAGE_MAP } from '../constants/error-catalog.constant.js';
import { ErrorCode } from '../enums/error-code.enum.js';

export class AppException extends HttpException {
  constructor(status: HttpStatus, code: ErrorCode) {
    super(
      {
        code,
        message: ERROR_CODE_DEFAULT_MESSAGE_MAP[code],
      },
      status,
    );
  }
}
