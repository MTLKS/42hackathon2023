import { Subcommand, Context, SlashCommandContext } from 'necord';
import { RushEvalCommandDecorator } from './rusheval.command';
import { ActionRowBuilder, ModalBuilder, TextInputBuilder } from '@discordjs/builders';
import { TextInputStyle } from 'discord.js';

@RushEvalCommandDecorator()
export class RushEvalFeedbackCommand {
  @Subcommand({
    name: 'feedback',
    description: 'Get feedback from rush evaluators',
  })
  public async onPing(@Context() [interaction]: SlashCommandContext) {

    /** Q: what to do if multiple choice? (cadet with multiple slots)
     * prompt options?
     * fetch evaluator name and it's associate group from database,
     * verify it's identity as one of the registered rush evaluators,
     * construct a modal with CustomId=Your impression of {login}
     */
    const modal = new ModalBuilder()
      .setCustomId('modal')
      .setTitle('Evaluation notes for {team name}');

    const general = new TextInputBuilder()
      .setStyle(TextInputStyle.Paragraph)
      .setCustomId('general')
      .setLabel('General impression of said group and work')

    // for each member in team
    const member = new TextInputBuilder()
      .setStyle(TextInputStyle.Paragraph)
      .setCustomId('{login}')
      .setLabel('An introduction of {login}')
      /** Commented out due to 100 characters limitation for placeholder */
  //     .setPlaceholder(`Example:
  // <Name> <background and coding experience>.
  // <impression>
  // <contribution to the projects>
  // <actions during evaluation>
  // <something to keep in mind about said student? (if there's any)>
  // `)

    const notes = new TextInputBuilder()
      .setStyle(TextInputStyle.Paragraph)
      .setCustomId('notes')
      .setLabel('Additional notes and thoughts')

    /** Has to type hint it as any to avoid compile error,
     * despite still being functional
     */
    const components: any[] = [
      new ActionRowBuilder().addComponents(general),
      new ActionRowBuilder().addComponents(member),
      new ActionRowBuilder().addComponents(notes)
    ]

    modal.addComponents(components);
    await interaction.showModal(modal);
  }
}
