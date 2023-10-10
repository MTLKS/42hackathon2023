import { Subcommand, Context, SlashCommandContext, TextCommandsService } from 'necord';
import { RushEvalCommandDecorator } from './rusheval.command';
import { InjectModel } from '@nestjs/mongoose';
import { Team } from 'src/schema/team.schema';
import { Model } from 'mongoose';
import { Evaluator } from 'src/schema/evaluator.schema';
import { EmbedBuilder } from 'discord.js';
import { writeFile } from 'fs';
import { exec } from 'child_process';

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
    let teams = await this.teamModel.find().exec()
    let evaluators = await this.evaluatorModel.find().exec()

    teams.forEach(team => {
      evaluators.find(evaluator => {
        const matchedSlot = evaluator.timeslots.find(slot =>
          slot.timeslot === team.timeslot.timeslot)

        if (matchedSlot) {
          team.timeslot = matchedSlot
          team.evaluator = evaluator.student
          team.save()
          return true
        }
      })
    })
    writeFile('match.json', JSON.stringify(teams, null, '\t'), ()=>{})
    exec('python3 rusheval_time_table.py match.json test.jpg', (error, stdout, stderr) => {
      console.log("COMMAND FINISHED")
      if (stdout) {
        console.log(`stdout: ${stdout}`)
      }
      if (error) {
        console.error(`error: ${error}`)
      }else if (stderr) {
        console.error(`stderr: ${stderr}`)
      }
    })
    const info = teams.map(team => {
      const evaluatorName = team.evaluator.intraName
      const groupName = team.teamLeader.intraName
      const time = team.timeslot.timeslot

      return `${time} | ${evaluatorName} | ${groupName}`
    }).join('\n');

    const newEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Rush eval match info')
      .setDescription('Current rush eval match info')
      .addFields(
        { name: 'Time | Evaluator | Team Leader', value: info || 'None' },
      );

    return interaction.reply({ephemeral: true, embeds: [newEmbed]})
  }
}
