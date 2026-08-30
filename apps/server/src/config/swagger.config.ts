import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function createSwaggerConfig() {
  return new DocumentBuilder()
    .setTitle('Corp Summary API')
    .setDescription('Corp Summary backend API documentation')
    .setVersion('1.0')
    .build();
}

export function setupSwagger(app: INestApplication): void {
  const document = SwaggerModule.createDocument(app, createSwaggerConfig());
  SwaggerModule.setup('docs', app, document);
}
