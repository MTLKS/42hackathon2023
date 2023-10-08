import { Subcommand, Context, SlashCommandContext, TextCommandsService } from 'necord';
import { RushEvalCommandDecorator } from './rusheval.command';
import { InjectModel } from '@nestjs/mongoose';
import { Team } from 'src/schema/team.schema';
import { Model } from 'mongoose';
import { Evaluator } from 'src/schema/evaluator.schema';

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

    let sessionMap = new Map<string, Array<{team: string, cadet: string}>>()
    teams.forEach(team => {
      const evaluatorName = team.evaluator.intraName
      const groupName = `${team.teamLeader.intraName}'s group`
      const session = team.timeslot.timeslot
      sessionMap[session] = {
        team: groupName,
        cadet: evaluatorName
      }
    })

    let text_content = []
    for (let session in sessionMap) {
      text_content.push(`${session}: ${JSON.stringify(sessionMap[session])}`)
    }
    return interaction.reply(text_content.join('\n'))
  }
}
