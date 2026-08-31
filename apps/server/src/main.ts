import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { ErrorCode } from './common/enums/error-code.enum.js';
import { AppException } from './common/exceptions/app.exception.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { setupSwagger } from './config/swagger.config.js';

function parseCorsOrigin(value: string): boolean | string | string[] {
  if (value === '*') {
    return true;
  }

  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length > 1 ? origins : origins[0] ?? value;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter());
  const configService = app.get(ConfigService);
  const port = Number(configService.get<string | number>('PORT', 4000));
  const corsOrigin = configService.get<string>('CORS_ORIGIN', 'http://localhost:3000');

  app.setGlobalPrefix('v1');
  app.enableCors({
    origin: parseCorsOrigin(corsOrigin),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: () =>
        new AppException(HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_ERROR),
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  setupSwagger(app);

  await app.listen(port);
}
await bootstrap();
