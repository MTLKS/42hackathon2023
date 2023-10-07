import { Subcommand, Context, SlashCommandContext } from 'necord';
import { RushEvalCommandDecorator } from './rusheval.command';

@RushEvalCommandDecorator()
export class RushEvalPiscinersCommand {
  @Subcommand({
    name: 'pisciners',
    description: 'Get pisciners to choose timeslots',
  })
  public async onPing(@Context() [interaction]: SlashCommandContext) {
    return interaction.reply({ content: 'Pong!', ephemeral: true });
  }
}