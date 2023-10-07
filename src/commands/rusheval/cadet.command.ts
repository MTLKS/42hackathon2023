import { Subcommand, Context, SlashCommandContext } from 'necord';
import { RushEvalCommandDecorator } from './rusheval.command';

@RushEvalCommandDecorator()
export class RushEvalCadetCommand {
  @Subcommand({
    name: 'cadet',
    description: 'Get cadets to create timeslots',
  })
  public async onPing(@Context() [interaction]: SlashCommandContext) {
    return interaction.reply({ content: 'Pong!', ephemeral: true });
  }
}