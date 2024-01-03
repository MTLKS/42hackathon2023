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

function getMissingEvaluatorEmbeds(teamsWithoutEvaluator: Team[]) {
  const teamsNoRegister = teamsWithoutEvaluator.filter(team => !team.timeslot);
  const teamsRegitered = teamsWithoutEvaluator.filter(team => team.timeslot);
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

  private async matching() {
    let teams = await this.teamModel.find({ timeslot: {$ne: undefined}}).exec();
    let evaluators = await this.evaluatorModel.find().exec();

    for (let t of teams) {
      for (let e of evaluators) {
        const matchedSlot = e.timeslots.find(slot =>
          slot.timeslot === t.timeslot.timeslot);

        if (!matchedSlot) {
          continue ;
        }
        t.timeslot = matchedSlot;
        t.evaluator = e.student;
        e.timeslots.splice(e.timeslots.indexOf(matchedSlot), 1);
        await t.save();
        break ;
      }
    }
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
      await this.matching();
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
            interaction.deleteReply();
            /** Ideal way is to assign a role for rush evaluators.
             * As I heard that there's problem with explicit individual ping.
             */
            replyContent += `Rush evaluation time table for dear evaluators: ${getRole(interaction.guild, 'CADET')}\n`;
            return interaction.channel.send({content: replyContent, files: [outfile]})
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
