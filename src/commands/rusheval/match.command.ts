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
import { ApiManager, ProjectStatus } from 'src/ApiManager';
import { Student } from 'src/schema/student.schema';
import { randomInt } from 'crypto';

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
      // if (t.evaluator !== undefined) {
      //   continue ;
      // }
      const evaluatorsWithMatchingTimelot = evaluators.filter(e => e.timeslots.find(slot => slot.timeslot === t.timeslot.timeslot));

      // console.log("evaluatorsWithMatchingTimelot: ", evaluatorsWithMatchingTimelot.map(logEvaluator));
      const len = evaluatorsWithMatchingTimelot.length;
      if (len === 0) {
        return ;
      }

      /* prefer the first 50% of sorted evaluators */
      const matchedEvaluator = evaluatorsWithMatchingTimelot[randomInt(Math.round(len / 2))];
      const slot = matchedEvaluator.timeslots.find(slot => slot.timeslot === t.timeslot.timeslot);
      t.timeslot = slot;
      t.evaluator = matchedEvaluator.student;
      matchedEvaluator.timeslots.splice(matchedEvaluator.timeslots.indexOf(slot), 1);
      return t.save();
    });
    await Promise.all(matchPromises);
  }

  private async fetchOngoingRush(projectSlugOrId: string | number) {
    const intraRushTeams = await ApiManager.getProjectTeams(projectSlugOrId,
      // 'range[created_at]=2023-09-01,2023-09-30'
      `filter[status]=${ProjectStatus.WaitingForCorrection}`
      );
    if (intraRushTeams.length === 0) {
      throw new Error(`No ongoing rush project`);
    }
    const allRushTeams = await Promise.all(intraRushTeams.map(team => ApiManager.intraTeamToTeam(team, this.studentModel)));
    const localTeams = await this.teamModel.find().exec();

    return await Promise.all(allRushTeams
      .filter(intra => !localTeams.find(local => local.intraId === intra.intraId))
      .map(intra => this.teamModel.create(intra))
      );
  }

  @Subcommand({
    name: 'match',
    description: 'Lock in cadet and pisciner timeslots',
  })
  public async onMatch(@Context() [interaction]: SlashCommandContext) {
    let replyContent = '';
    const projectSlug = 'c-piscine-rush-00';

    await interaction.deferReply({ephemeral: true});
    await this.fetchOngoingRush(projectSlug).catch(error => {
      replyContent += `This attempt will be assumed as testing since there is no ongoing \`\`${projectSlug}\`\` team that is waiting for correction.\n`;
    });
    try {
      await this.matching(projectSlug);
    } catch (error) {
      console.error(error);
      replyContent += `Error occured while matching teams and evaluators\n`;
      return interaction.editReply(replyContent);
    }
    try {
      const teamsWithoutEvaluator = await this.teamModel.find({evaluator: undefined}).exec();

      if (teamsWithoutEvaluator.length) {
        const embed = getMissingEvaluatorEmbeds(teamsWithoutEvaluator);

        replyContent += `Below teams are missing evaluator: \n`;
        return interaction.editReply({ content: replyContent, embeds: embed});
      }
    } catch (error) {
      console.error(error);
      replyContent += `Error occured while checking teams without evaluator\n`;
      return interaction.editReply(replyContent);
    }
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
    // interaction.guild.members.fetch({
        // user: teams.map(team => team.evaluator.discordId),
        // time: 10 * 1000,
      // }).then(matchedEvaluatorsDc => {
        child.on('exit', (code, signal) => {
          if (code === 0) {
            // interaction.deleteReply();
            /** Ideal way is to assign a role for rush evaluators.
             * As I heard that there's problem with explicit individual ping.
             */
            replyContent += `Rush evaluation time table for dear evaluators: ${getRole(interaction.guild, 'CADET')}\n`;
            // return interaction.channel.send({content: replyContent, files: [outfile]})
            return interaction.editReply({content: replyContent, files: [outfile]})
              .finally(() => unlink(outfile, ()=>{}));
          } else {
            replyContent += `Error occured while generating time table\n`;
            return interaction.editReply(replyContent);
          }
        })
      // }).catch(error => {
        // console.error(error);
        // return interaction.editReply({content: 'Timeout fetching guild members'});
      // });

  }
}
