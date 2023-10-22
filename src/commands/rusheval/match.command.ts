import { Subcommand, Context, SlashCommandContext, TextCommandsService } from 'necord';
import { RushEvalCommandDecorator } from './rusheval.command';
import { InjectModel } from '@nestjs/mongoose';
import { Team } from 'src/schema/team.schema';
import { Model } from 'mongoose';
import { Evaluator } from 'src/schema/evaluator.schema';
import { unlink } from 'fs';
import { exec } from 'child_process';
import { Embed, EmbedBuilder, embedLength } from 'discord.js';
import { getRole } from '../updateroles.command';

@RushEvalCommandDecorator()
export class RushEvalMatchCommand {

  constructor(
    @InjectModel(Team.name) private readonly teamModel: Model<Team>,
    @InjectModel(Evaluator.name) private readonly evaluatorModel: Model<Evaluator>,
  ) {}

  @Subcommand({
    name: 'match',
    description: 'Lock in cadet and pisciner timeslots',
  })
  public async onPing(@Context() [interaction]: SlashCommandContext) {
    let teams = await this.teamModel.find().exec();
    let evaluators = await this.evaluatorModel.find().exec();

    await interaction.deferReply({ephemeral: true});
    for (let team of teams) {
      evaluators.find((evaluator) => {
        const matchedSlot = evaluator.timeslots.find(slot =>
          slot.timeslot === team.timeslot.timeslot);

        if (!matchedSlot) {
          return false;
        }
        team.timeslot = matchedSlot;
        team.evaluator = evaluator.student;
        evaluator.timeslots.splice(evaluator.timeslots.indexOf(matchedSlot), 1);
        team.save();
        return true;
      });
    }
    const outfile = 'rush_evaluation_time_table.jpg';
    const child = exec(`python rusheval_time_table.py ${outfile}`,
      (error, stdout, stderr) => {
        if (stdout) {
          console.log(stdout);
        }
        if (error) {
          console.error(error);
        } else if (stderr) {
          console.error(stderr);
        }
      });
    // const newEmbed = new EmbedBuilder()
    //   .setColor('#00FFFF')
    //   .setTitle('Rush evaluation time table')

    // interaction.guild.members.fetch({
        // user: teams.map(team => team.evaluator.discordId),
        // time: 10 * 1000,
      // }).then(matchedEvaluatorsDc => {
        child.on('exit', (code, signal) => {
          if (code === 0) {
            interaction.deleteReply();
            return interaction.channel.send({
                /** Ideal way is to assign a role for rush evaluators.
                 * As I heard that there's problem with explicit individual ping.
                 */
                content: `Rush evaluation time table for dear evaluators: ${getRole(interaction.guild, 'CADET')}`,
                files: [outfile]
              }).then(() => unlink(outfile, ()=>{}));
          } else {
            return interaction.editReply({content: `Internal Server Error`});
          }
        })
      // }).catch(error => {
        // console.error(error);
        // return interaction.editReply({content: 'Timeout fetching guild members', embeds: [newEmbed]});
      // });

  }
}
