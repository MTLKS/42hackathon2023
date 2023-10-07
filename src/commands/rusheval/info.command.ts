import { Subcommand, Context, SlashCommandContext } from 'necord';
import { RushEvalCommandDecorator } from './rusheval.command';

@RushEvalCommandDecorator()
export class RushEvalInfoCommand {
  @Subcommand({
    name: 'info',
    description: 'Get current info about rush eval',
  })
  public async onPing(@Context() [interaction]: SlashCommandContext) {
    return interaction.reply({ content: 'Pong!', ephemeral: true });
  }
}