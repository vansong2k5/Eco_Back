import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { TraceContextInterceptor } from './common/interceptors/trace-id.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new TraceContextInterceptor());

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 EcoBack server running on http://localhost:${port}`);
  console.log(`❤️  Health check: http://localhost:${port}/health`);
}

bootstrap();
