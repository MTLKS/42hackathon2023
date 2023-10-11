import { Injectable } from '@nestjs/common';
import { SlashCommand, SlashCommandContext, Context, CommandsService } from 'necord';
import { Embed, EmbedBuilder, embedLength } from 'discord.js';

@Injectable()
export class HelpCommand {
	@SlashCommand({
		name: 'help',
		description: 'an overview',
	})
	public async onHelp(@Context() [interaction]: SlashCommandContext) {

    let commands = new Map<string, string>()

    commands.set('**/ping**', 'Pong (for testing)');
    commands.set('**/login**', 'Login to 42 intra');
    commands.set('**/rusheval info**', 'Get current info about rush eval');
    commands.set('**/rusheval cadet**', 'Get cadets to create timeslots');
    commands.set('**/rusheval pisciners**', 'Get pisciners to choose timeslots');
    commands.set('**/rusheval match**', 'Lock in cadet and pisciner timeslots');
    commands.set('**/rusheval feedback**', 'Get feedback from rush evaluators');
    commands.set('**/updateroles**', 'Update user roles');
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
          inline:true
        }
      )
    return interaction.reply({ content: '', ephemeral: true, embeds: [newEmbed]});
  }
}
