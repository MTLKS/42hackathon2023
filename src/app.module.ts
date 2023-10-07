import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NecordModule } from 'necord';
import { IntentsBitField } from 'discord.js';
import { LoginCommand } from './commands/login.command';
import { PingCommand } from './commands/ping.command';
import { RushEvalCadetCommand, RushEvalCadetStringSelectComponent } from './commands/rusheval/cadet.command';
import { RushEvalPiscinersCommand } from './commands/rusheval/pisciners.command';
import { RushEvalInfoCommand } from './commands/rusheval/info.command';
import { RushEvalMatchCommand } from './commands/rusheval/match.command';
import { HttpModule } from '@nestjs/axios';
import { Api42Service } from './api42/api42.service'

@Module({
  imports: [
    NecordModule.forRoot({
      token: process.env.DISCORD_TOKEN,
      intents: [
        IntentsBitField.Flags.Guilds
      ],
      development: [process.env.DISCORD_DEVELOPMENT_GUILD_ID]
    }),
    HttpModule,
  ],
  controllers: [AppController],
  providers: [AppService, Api42Service, PingCommand, LoginCommand, RushEvalCadetCommand, RushEvalCadetStringSelectComponent, RushEvalPiscinersCommand, RushEvalInfoCommand, RushEvalMatchCommand ],
})
export class AppModule {}
