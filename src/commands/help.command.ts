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

    const newEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('__Available Commands__')
      .addFields(
        { name: '__Commands__                                  __Descriptions__', value: '\n'},
        { name: "`/login`                                  :      Login to 42 intra ", value: '\n'},
        { name: '`/ping`                                    :      Pong', value: '\n'},
        { name: '`/rusheval cadet`             :      Get cadets to create timeslots', value: '\n'},
        { name: '`/rusheval feedback`      :      Get feedback from rush evaluators', value: '\n'},
        { name: '`/rusheval info`               :      Get current info about rush eval', value: '\n'},
        { name: '`/rusheval match`            :      Lock in cadet and pisciner timeslots', value: '\n'},
        { name: '`/rusheval pisciners`   :      Get pisciners to choose timeslots', value: '\n'},
        { name: '`/updateroles`                   :      Update user roles', value: '\n'},
      )
    return interaction.reply({ content: '', ephemeral: true, embeds: [newEmbed]});
  }
}
