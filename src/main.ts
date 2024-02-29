import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { ConsoleLogger } from '@nestjs/common';
import { ApiManager } from './ApiManager';

function checkEnv() {
  const requiredEnv = new Array<[string, string]>(
    ['THILA_BOT_DISCORD_TOKEN', process.env.THILA_BOT_DISCORD_TOKEN],
    ['THILA_BOT_API_UID', process.env.THILA_BOT_API_UID],
    ['THILA_BOT_API_SECRET', process.env.THILA_BOT_API_SECRET],
    ['THILA_BOT_URL(ex: http://localhost:8080)', process.env.THILA_BOT_URL],
    ['THILA_BOT_DATABASE_URL', process.env.THILA_BOT_DATABASE_URL],
  );
  const missingEnv = requiredEnv
    .filter(([_, value]) => value === undefined)
    .map(([msg, _]) => msg)
    ;

  if (missingEnv.length > 0) {
    const logger = new ConsoleLogger("main");
    logger.fatal(`Please set the following environment variables: ${missingEnv.join(', ')}`);
    return false;
  }
  else {
    return true;
  }
}

async function bootstrap() {
  if (!checkEnv()) {
    return;
  }
  try {
    await ApiManager.initDefaultInstance();
  } catch (error) {
    const logger = new ConsoleLogger("main");
    logger.fatal(`Failed to get access token from 42 API:
Error message: ${error.response.data.error_description}

Potential causes include:
Incorrect THILA_BOT_API_UID or THILA_BOT_API_SECRET
THILA_BOT_API_SECRET has been refreshed
`);
    return;
  }
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  await app.listen(new URL(process.env.THILA_BOT_URL).port || 80);
}

bootstrap().catch(error => console.error('bootstrap:', error));
