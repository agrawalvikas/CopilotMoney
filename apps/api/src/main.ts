import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3002'],
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3001);

  const logger = new Logger('Bootstrap');
  logger.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
