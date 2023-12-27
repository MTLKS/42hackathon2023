import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { ConsoleLogger } from '@nestjs/common';

function checkEnv() {
  const requiredEnv = new Array<[string, string]>(
      ['HOST(ex: http://localhost)', process.env.HOST],
      ['API_UID', process.env.API_UID],
      ['API_SECRET', process.env.API_SECRET],
      ['DISCORD_TOKEN', process.env.DISCORD_TOKEN],
    );
  const missingEnv = requiredEnv
    .filter(([msg, value]) => value === undefined)
    .map(([msg, value]) => msg)
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
    return ;
  }
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  await app.listen(process.env.PORT || 3000);
}

bootstrap().catch(error => console.error(error));
