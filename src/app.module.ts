import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NecordModule } from 'necord';
import { IntentsBitField } from 'discord.js';
import { LoginCommand } from './commands/login.command';
import { PingCommand } from './commands/ping.command';
import { RushEvalCadetCommand, RushEvalCadetStringSelectComponent } from './commands/rusheval/cadet.command';
import { RushEvalPiscinersCommand, RushEvalPiscinersButtonComponent, RushEvalPiscinersStringSelectComponent } from './commands/rusheval/pisciners.command';
import { RushEvalInfoCommand } from './commands/rusheval/info.command';
import { RushEvalMatchCommand } from './commands/rusheval/match.command';
import { HttpModule } from '@nestjs/axios';
import { Api42Service } from './api42/api42.service'
import { MongooseModule } from '@nestjs/mongoose';
import { Student, StudentSchema } from './schema/student.schema';
import { Timeslot, TimeslotSchema } from './schema/timeslot.schema';
import { Evaluator, EvaluatorSchema } from './schema/evaluator.schema';
import { Team, TeamSchema } from './schema/team.schema';
import { RushEvalFeedbackCommand, RushEvalFeedbackFormCommand } from './commands/rusheval/feedback.command';
import { UpdateRolesCommand } from './commands/updateroles.command';

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
    MongooseModule.forRoot('mongodb://127.0.0.1:27017/nest'),
    MongooseModule.forFeature([
      { name: Student.name, schema: StudentSchema },
      { name: Timeslot.name, schema: TimeslotSchema },
      { name: Evaluator.name, schema: EvaluatorSchema },
      { name: Team.name, schema: TeamSchema }
    ]) 
  ],
  controllers: [AppController],
  providers: [
    AppService,
    Api42Service,
    PingCommand,
    LoginCommand,
    RushEvalCadetCommand,
    RushEvalCadetStringSelectComponent,
    RushEvalPiscinersCommand,
    RushEvalPiscinersButtonComponent,
    RushEvalPiscinersStringSelectComponent,
    RushEvalInfoCommand,
    RushEvalMatchCommand,
    RushEvalFeedbackCommand,
    RushEvalFeedbackFormCommand,
    UpdateRolesCommand
  ],
})
export class AppModule {}
