import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { ConsoleLogger } from '@nestjs/common';
import { ApiManager } from './ApiManager';

function checkEnv() {
  const requiredEnv = new Array<[string, string]>(
    ['BOT_HOST(ex: http://localhost)', process.env.BOT_HOST],
    ['API_UID', process.env.API_UID],
    ['API_SECRET', process.env.API_SECRET],
    ['DISCORD_TOKEN', process.env.DISCORD_TOKEN],
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
    logger.fatal(`Failed to get access token from 42 API: ${error.response.data.error_description}`);
    return;
  }
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  await app.listen(process.env.BOT_PORT || 80);
}

bootstrap().catch(error => console.error('bootstrap:', error));
