import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';

async function testDI() {
  try {
    const app = await NestFactory.create(AppModule);
    console.log('✅ All dependency injection working');
    await app.close();
  } catch (error) {
    console.error('❌ DI Error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testDI();
