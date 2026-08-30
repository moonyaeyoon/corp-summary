import { ArgumentsHost, BadRequestException, HttpStatus } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter.js';
import { ErrorCode } from '../enums/error-code.enum.js';

function createHost() {
  const response = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };
  const request = {
    url: '/v1/reports',
  };

  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as ArgumentsHost;

  return { host, response };
}

describe('HttpExceptionFilter', () => {
  it('formats known http exceptions with the common error envelope', () => {
    const { host, response } = createHost();
    const filter = new HttpExceptionFilter();

    filter.catch(
      new BadRequestException({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'previousDate must be earlier than currentDate',
        field: 'previousDate',
      }),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(response.json).toHaveBeenCalledWith({
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'previousDate must be earlier than currentDate',
        field: 'previousDate',
      },
    });
  });

  it('formats unknown exceptions as internal errors', () => {
    const { host, response } = createHost();
    const filter = new HttpExceptionFilter();

    filter.catch(new Error('database is down'), host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(response.json).toHaveBeenCalledWith({
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Internal server error',
      },
    });
  });
});
