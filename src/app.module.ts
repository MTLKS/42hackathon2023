import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NecordModule } from 'necord';
import { IntentsBitField } from 'discord.js';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { Student, StudentSchema } from './schema/student.schema';
import { Timeslot, TimeslotSchema } from './schema/timeslot.schema';
import { Evaluator, EvaluatorSchema } from './schema/evaluator.schema';
import { Team, TeamSchema } from './schema/team.schema';
import { LoginCommand } from './commands/login.command';
import { PingCommand } from './commands/ping.command';
import { HelpCommand } from './commands/help.command';
import { RushEvalCadetCommand, RushEvalCadetFetchSlotsComponent, RushEvalCadetStringSelectComponent } from './commands/rusheval/cadet.command';
import { RushEvalPiscinersCommand, RushEvalPiscinersButtonComponent, RushEvalPiscinersStringSelectComponent } from './commands/rusheval/pisciners.command';
import { RushEvalInfoCommand } from './commands/rusheval/info.command';
import { RushEvalMatchCommand } from './commands/rusheval/match.command';
import { RushEvalFeedbackCommand, RushEvalFeedbackForm, RushEvalFeedbackTeamSelectButton } from './commands/rusheval/feedback.command';
import { UpdateRolesCommand } from './commands/updateroles.command';
import { CleanCommand, CleanDatabase } from './commands/clean.command';
import { TestCommand } from './commands/test.command';
import { StudentService } from './StudentService';
import { LoginCode, LoginCodeSchema } from './schema/logincode.schema';
import { RushEvalExportFeedbackCommand } from './commands/rusheval/export.command';
import { RushEval, RushEvalSchema } from './schema/rusheval.schema';

@Module({
  imports: [
    NecordModule.forRoot({
      token: process.env.THILA_BOT_DISCORD_TOKEN,
      intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers
      ],
      development: [process.env.DISCORD_DEVELOPMENT_GUILD_ID]
    }),
    HttpModule,
    MongooseModule.forRoot(process.env.THILA_BOT_DATABASE_URL),
    MongooseModule.forFeature([
      { name: RushEval.name, schema: RushEvalSchema },
      { name: Student.name, schema: StudentSchema },
      { name: Timeslot.name, schema: TimeslotSchema },
      { name: Evaluator.name, schema: EvaluatorSchema },
      { name: Team.name, schema: TeamSchema },
      { name: LoginCode.name, schema: LoginCodeSchema },
    ])
  ],
  controllers: [AppController],
  providers: [
    AppService,
    StudentService,
    PingCommand,
    LoginCommand,
    // HelpCommand,
    RushEvalCadetCommand,
    RushEvalCadetFetchSlotsComponent,
    RushEvalCadetStringSelectComponent,
    RushEvalPiscinersCommand,
    RushEvalPiscinersButtonComponent,
    RushEvalPiscinersStringSelectComponent,
    RushEvalInfoCommand,
    RushEvalMatchCommand,
    RushEvalFeedbackCommand,
    RushEvalFeedbackTeamSelectButton,
    RushEvalFeedbackForm,
    CleanCommand,
    CleanDatabase,
    RushEvalExportFeedbackCommand,
    // UpdateRolesCommand,
    // TestCommand,
  ],
})
export class AppModule { }
