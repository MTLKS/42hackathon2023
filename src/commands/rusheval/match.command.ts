import { Subcommand, Context, SlashCommandContext, Options } from 'necord';
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
import { ForceDto, monthNameToNumber } from 'src/utils';
import { RushEval } from 'src/schema/rusheval.schema';

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

function getComparator(rushProjectSlug: string) {
  /**
   * @returns The difference in month
   */
  const studentPoolYearMonthComparator = (a: Student, b: Student) => {
    return ((+a.poolYear - +b.poolYear) * 12)
      + (monthNameToNumber(a.poolMonth) - monthNameToNumber(b.poolMonth));
  };

  if (rushProjectSlug === 'c-piscine-rush-00') {
    return (a: Evaluator, b: Evaluator) => studentPoolYearMonthComparator(b.student, a.student);
  } else if (['c-piscine-rush-01', 'c-piscine-rush-02'].includes(rushProjectSlug)) {
    return (a: Evaluator, b: Evaluator) => studentPoolYearMonthComparator(a.student, b.student);
  } else {
    throw new Error(`Unknown rush project slug: ${rushProjectSlug}`);
  }
}

@RushEvalCommandDecorator()
export class RushEvalMatchCommand {
  private readonly logger = new ConsoleLogger('RushEvalMatchCommand');

  constructor(
    @InjectModel(RushEval.name) private readonly rushEvalModel: Model<RushEval>,
    @InjectModel(Team.name) private readonly teamModel: Model<Team>,
    @InjectModel(Evaluator.name) private readonly evaluatorModel: Model<Evaluator>,
  ) { }

  private async clearMatch() {
    const teams = await this.teamModel.find().exec();

    await Promise.all(teams.map(t => {
      t.evaluator = undefined;
      t.feedback = undefined;
      t.feedbackAt = undefined;
      return t.save();
    }));
  }

  private async matching(comparator: (a: Evaluator, b: Evaluator) => number) {
    let teams = await this.teamModel.find({ timeslot: { $ne: undefined } }).exec();
    let evaluators = await this.evaluatorModel.find({timeslots: {$ne: []}}).exec();

    evaluators.sort(comparator);
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
    return await Promise.all(teams.map(t => {
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
    }));
  }

  @Subcommand({
    name: 'match',
    description: 'Lock in cadet and pisciner timeslots',
  })
  public async onCommandCall(@Context() [interaction]: SlashCommandContext, @Options() { force }: ForceDto) {
    const projectSlug = (await this.rushEvalModel.findOne().exec())?.project;

    if (projectSlug === undefined) {
      this.logger.error('Error: No Ongoing Rush Project');
      return interaction.reply('Error: No Ongoing Rush Project\n');
    }
    this.logger.log(`${interaction.user.username} attempted to match teams and evaluators with force: ${force}`);
    await interaction.deferReply({ ephemeral: true });
    if (force !== true && await this.teamModel.count({ feedback: { $ne: undefined } }).exec() !== 0) {
      this.logger.error(`${interaction.user.username} attempted to match after feedback has been given.`);
      return interaction.editReply('Error: Some feedback has been given to teams, doing so will result in clearing existing feedback.\n'
        + "If you deem it's necessary, please invoke the command again with force: True.\n");
    }
    interaction.editReply('Matching rush teams and evaluators...');
    this.logger.log('Matching rush teams and evaluators...');
    await this.clearMatch();
    try {
      await this.matching(getComparator(projectSlug));
    } catch (error) {
      this.logger.error('Error occured while matching teams and evaluators');
      console.error(error);
      return interaction.editReply('Error occured while matching teams and evaluators\n');
    }
    if (force !== true) {
      interaction.editReply('Looking for teams without evaluator...');
      this.logger.log('Looking for teams without evaluator...');
      try {
        const teamsWithoutEvaluator = await this.teamModel.find({ evaluator: undefined }).exec();

        if (teamsWithoutEvaluator.length) {
          const embed = getMissingEvaluatorEmbeds(teamsWithoutEvaluator);

          this.clearMatch();
          this.logger.log(`Below teams are missing evaluator: ${teamsWithoutEvaluator.map(team => team.name)}`);
          return interaction.editReply({ content: 'Below teams are missing evaluator: \n', embeds: embed });
        }
      } catch (error) {
        this.logger.error('Error occured while checking teams without evaluator');
        console.error(error);
        return interaction.editReply('Error occured while checking teams without evaluator\n');
      }
    }
    interaction.editReply('Generating time table...');
    this.logger.log('Generating time table...');
    const outfile = `rush${projectSlug.substr(-2)}_evaluation_time_table.jpg`;
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
        this.logger.log('Generated time table');
        return interaction.channel.send({ content: replyContent, files: [outfile] })
          // return interaction.editReply({content: replyContent, files: [outfile]})
          .finally(() => unlink(outfile, () => { }));
      } else {
        this.logger.error('Error occured while generating time table');
        return interaction.editReply('Error occured while generating time table\n');
      }
    });
  }
}
