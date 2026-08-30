import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ValidationError } from 'class-validator';
import { AppModule } from './app.module.js';
import { ErrorCode } from './common/enums/error-code.enum.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { setupSwagger } from './config/swagger.config.js';

function resolveValidationField(errors: ValidationError[]): string | undefined {
  const firstError = errors[0];

  if (!firstError) {
    return undefined;
  }

  return firstError.children?.length
    ? resolveValidationField(firstError.children)
    : firstError.property;
}

function resolveValidationMessage(errors: ValidationError[]): string {
  const firstError = errors[0];
  const firstConstraint = firstError?.constraints
    ? Object.values(firstError.constraints)[0]
    : undefined;

  return firstConstraint ?? 'Request validation failed';
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = Number(configService.get<string | number>('PORT', 4000));
  const corsOrigin = configService.get<string>('CORS_ORIGIN', 'http://localhost:3000');

  app.setGlobalPrefix('v1');
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) =>
        new BadRequestException({
          code: ErrorCode.VALIDATION_ERROR,
          message: resolveValidationMessage(errors),
          field: resolveValidationField(errors),
        }),
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  setupSwagger(app);

  await app.listen(port);
}
await bootstrap();
