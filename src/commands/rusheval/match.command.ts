import { Subcommand, Context, SlashCommandContext } from 'necord';
import { RushEvalCommandDecorator } from './rusheval.command';
import { InjectModel } from '@nestjs/mongoose';
import { Team } from 'src/schema/team.schema';
import { Model } from 'mongoose';
import { Evaluator } from 'src/schema/evaluator.schema';
import { unlink } from 'fs';
import { exec } from 'child_process';
import { APIEmbedField, EmbedBuilder } from 'discord.js';
import { getRole } from '../updateroles.command';
import { Student } from 'src/schema/student.schema';
import { randomInt } from 'crypto';
import { ConsoleLogger } from '@nestjs/common';

function getMissingEvaluatorEmbeds(teamsWithoutEvaluator: Team[]) {
  const teamsNoRegister = teamsWithoutEvaluator.filter(team => team.timeslot === undefined);
  const teamsRegitered = teamsWithoutEvaluator.filter(team => team.timeslot !== undefined);
  let fields: APIEmbedField[] = [];

  if (teamsNoRegister.length) {
    fields.push({
      name: 'Teams did not registered',
      value: teamsNoRegister.map(team => team.name).join('\n\n'),
    });
  }
  if (teamsRegitered.length) {
    fields.push({
      name: 'Registered team missing evaluator',
      value: teamsRegitered.map(team => `${team.name}: ${team.timeslot.timeslot}`).join('\n\n'),
    });
  }
  return fields.map(field => {
    if (!field.value) {
      field.value = 'None';
    }
    const embed = new EmbedBuilder()
      .setColor('#00FFFF')
      .addFields([field])
      ;
    return embed;
  });
}

@RushEvalCommandDecorator()
export class RushEvalMatchCommand {
  private readonly logger = new ConsoleLogger('RushEvalMatchCommand');

  constructor(
    @InjectModel(Student.name) private readonly studentModel: Model<Student>,
    @InjectModel(Team.name) private readonly teamModel: Model<Team>,
    @InjectModel(Evaluator.name) private readonly evaluatorModel: Model<Evaluator>,
  ) {}

  private async matching(rushProjectSlug: string) {
    let teams = await this.teamModel.find({ timeslot: {$ne: undefined}}).exec();
    let evaluators = await this.evaluatorModel.find().exec();

    /* wanna sort the evaluator by their pool year */
    if (rushProjectSlug === 'c-piscine-rush-00') {
      evaluators.sort((a, b) => +b.student.poolYear - +a.student.poolYear);
    } else if (rushProjectSlug === 'c-piscine-rush-01') {
      evaluators.sort((a, b) => +a.student.poolYear - +b.student.poolYear);
    } else if (rushProjectSlug === 'c-piscine-rush-02') {
      throw new Error(`Not implemented yet: ${rushProjectSlug}`);
    } else {
      throw new Error(`Unknown rush project slug: ${rushProjectSlug}`);
    }


    // const logEvaluator = (evaluator: Evaluator) => {
    //   const student = evaluator.student;
    //   return {
    //     name: student.intraName,
    //     poolYear: student.poolYear,
    //     poolMonth: student.poolMonth,
    //     timeslots: evaluator.timeslots.map(slot => slot.timeslot),
    //   };
    // };
    // console.log("evaluators: ", evaluators.map(logEvaluator));
    // console.log("teams: ", teams.map(t => t.timeslot.timeslot));
    const matchPromises = teams.map(t => {
      t.evaluator = undefined;
      t.feedback = undefined;
      t.feedbackAt = undefined;
      const evaluatorsWithMatchingTimelot = evaluators.filter(e => e.timeslots.find(slot => slot.timeslot === t.timeslot.timeslot));

      // console.log("evaluatorsWithMatchingTimelot: ", evaluatorsWithMatchingTimelot.map(logEvaluator));
      const len = evaluatorsWithMatchingTimelot.length;
      if (len !== 0) {
        /* prefer the first 50% of sorted evaluators */
        const matchedEvaluator = evaluatorsWithMatchingTimelot[randomInt(Math.round(len / 2))];
        const slot = matchedEvaluator.timeslots.find(slot => slot.timeslot === t.timeslot.timeslot);

        t.evaluator = matchedEvaluator.student;
        matchedEvaluator.timeslots.splice(matchedEvaluator.timeslots.indexOf(slot), 1);
      }
      return t.save();
    });
    await Promise.all(matchPromises);
  }

  @Subcommand({
    name: 'match',
    description: 'Lock in cadet and pisciner timeslots',
  })
  public async onMatch(@Context() [interaction]: SlashCommandContext) {
    const projectSlug = 'c-piscine-rush-00';

    await interaction.deferReply({ephemeral: true});
    if (await this.teamModel.count({ feedbackAt: {$ne: undefined}}).exec() !== 0) {
      this.logger.error(`${interaction.user.username} attempted to match after feedback has been given.`);
      return interaction.editReply('Error: Some feedback has been given to teams, doing so may result in loses in feedback.\n'
      + "If you deem it's necessary, please notify qixeo to disable this failsafe.\n");
    }
    interaction.editReply('Matching rush teams and evaluators...');
    this.logger.log('Matching rush teams and evaluators...');
    try {
      await this.matching(projectSlug);
    } catch (error) {
      this.logger.error('Error occured while matching teams and evaluators');
      console.error(error);
      return interaction.editReply('Error occured while matching teams and evaluators\n');
    }
    interaction.editReply('Looking for teams without evaluator...');
    this.logger.log('Looking for teams without evaluator...');
    try {
      const teamsWithoutEvaluator = await this.teamModel.find({evaluator: undefined}).exec();

      if (teamsWithoutEvaluator.length) {
        const embed = getMissingEvaluatorEmbeds(teamsWithoutEvaluator);

        this.logger.log(`Below teams are missing evaluator: ${teamsWithoutEvaluator.map(team => team.name)}}`);
        return interaction.editReply({ content: 'Below teams are missing evaluator: \n', embeds: embed});
      }
    } catch (error) {
      this.logger.error('Error occured while checking teams without evaluator');
      console.error(error);
      return interaction.editReply('Error occured while checking teams without evaluator\n');
    }
    interaction.editReply('Generating time table...');
    this.logger.log('Generating time table...');
    const outfile = 'rush_evaluation_time_table.jpg';
    const child = exec(`python rusheval_time_table.py ${outfile}`, (error, stdout, stderr) => {
        if (stdout) {
          console.log(stdout);
        }
        if (error) {
          console.error(error);
        } else if (stderr) {
          console.error(stderr);
        }
      });
    child.on('exit', (code, signal) => {
      if (code === 0) {
        const replyContent = `Rush evaluation time table for dear evaluators: ${getRole(interaction.guild, 'CADET')}\n`;

        interaction.editReply('Done!');
        this.logger.log('Done!');
        return interaction.channel.send({content: replyContent, files: [outfile]})
        // return interaction.editReply({content: replyContent, files: [outfile]})
          .finally(() => unlink(outfile, ()=>{}));
      } else {
        this.logger.error('Error occured while generating time table');
        return interaction.editReply('Error occured while generating time table\n');
      }
    });
  }
}
