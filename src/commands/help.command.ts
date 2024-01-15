import { Injectable } from '@nestjs/common';
import { SlashCommand, SlashCommandContext, Context, CommandsService } from 'necord';
import { EmbedBuilder } from 'discord.js';

@Injectable()
export class HelpCommand {
  @SlashCommand({
    name: 'help',
    description: 'an overview',
  })
  public async onHelp(@Context() [interaction]: SlashCommandContext) {

    const commands = new Map<string, string>()
      .set('**/ping**', 'Pong (for testing)')
      .set('**/login**', 'Login to 42 intra')
      .set('**/rusheval info**', 'Get current info about rush eval')
      .set('**/rusheval cadet**', 'Get cadets to create timeslots')
      .set('**/rusheval pisciners**', 'Get pisciners to choose timeslots')
      .set('**/rusheval match**', 'Lock in cadet and pisciner timeslots')
      .set('**/rusheval feedback**', 'Get feedback from rush evaluators')
      .set('**/updateroles**', 'Update user roles')
      .set('**/clean**', 'Clean the database')
      ;
    const newEmbed = new EmbedBuilder()
      .setColor('#00FFFF')
      .setTitle('__Available Commands__')
      .addFields(
        {
          name: '__Commands__',
          value: [...commands.keys()].join('\n\n'),
          inline: true
        },
        {
          name: '__Descriptions__',
          value: [...commands.values()].join('\n\n'),
          inline: true
        }
      )
    return interaction.reply({ embeds: [newEmbed], ephemeral: true });
  }
}
