import 'reflect-metadata';
console.log('Minimal NestJS app starting...');
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  console.log('Creating app...');
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`App running on port ${port}`);
}
bootstrap();
