import { Subcommand, Context, SlashCommandContext } from 'necord';
import { RushEvalCommandDecorator } from './rusheval.command';

@RushEvalCommandDecorator()
export class RushEvalMatchCommand {
  @Subcommand({
    name: 'match',
    description: 'Lock in cadet and pisciner timeslots',
  })
  public async onPing(@Context() [interaction]: SlashCommandContext) {
    return interaction.reply({ content: 'Pong!', ephemeral: true });
  }
}
