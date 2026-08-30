import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ERROR_CODE_DEFAULT_MESSAGE_MAP,
  HTTP_STATUS_ERROR_CODE_MAP,
} from '../constants/error-catalog.constant.js';
import { ApiErrorResponseDto } from '../dto/api-error-response.dto.js';
import { ErrorCode } from '../enums/error-code.enum.js';

interface ExceptionResponseBody {
  code?: ErrorCode | string;
  message?: string | string[];
  field?: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const body = this.buildErrorBody(status, exceptionResponse, exception.message);

      response.status(status).json(body);
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: ERROR_CODE_DEFAULT_MESSAGE_MAP[ErrorCode.INTERNAL_ERROR],
      },
    } satisfies ApiErrorResponseDto);
  }

  private buildErrorBody(
    status: number,
    exceptionResponse: string | object,
    fallbackMessage: string,
  ): ApiErrorResponseDto {
    const responseBody = this.parseExceptionResponse(exceptionResponse);
    const code = this.resolveErrorCode(status, responseBody);
    const message = this.resolveMessage(responseBody, fallbackMessage, code);

    return {
      error: {
        code,
        message,
        ...(responseBody.field ? { field: responseBody.field } : {}),
      },
    };
  }

  private parseExceptionResponse(exceptionResponse: string | object): ExceptionResponseBody {
    if (typeof exceptionResponse === 'string') {
      return { message: exceptionResponse };
    }

    return exceptionResponse as ExceptionResponseBody;
  }

  private resolveErrorCode(status: number, exceptionResponse: ExceptionResponseBody): ErrorCode {
    if (exceptionResponse.code && this.isErrorCode(exceptionResponse.code)) {
      return exceptionResponse.code;
    }

    return HTTP_STATUS_ERROR_CODE_MAP[status] ?? ErrorCode.INTERNAL_ERROR;
  }

  private resolveMessage(
    exceptionResponse: ExceptionResponseBody,
    fallbackMessage: string,
    code: ErrorCode,
  ): string {
    if (Array.isArray(exceptionResponse.message)) {
      return exceptionResponse.message.join(', ');
    }

    return exceptionResponse.message ?? fallbackMessage ?? ERROR_CODE_DEFAULT_MESSAGE_MAP[code];
  }

  private isErrorCode(code: string): code is ErrorCode {
    return Object.values(ErrorCode).includes(code as ErrorCode);
  }
}
