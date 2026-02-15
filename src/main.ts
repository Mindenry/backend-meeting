import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/http-exception.filter';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new AllExceptionsFilter());

  // Enable CORS before setting global prefix
  app.enableCors({
    origin: true, // Allow any origin for testing
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Increase body size limit for file uploads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Set global prefix for API routes (but exclude WebSocket)
  app.setGlobalPrefix('api', {
    exclude: ['socket.io'],
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
