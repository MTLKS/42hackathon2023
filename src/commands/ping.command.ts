import { Injectable } from '@nestjs/common';
import { EmbedBuilder } from 'discord.js';
import { SlashCommand, SlashCommandContext, Context } from 'necord';

@Injectable()
export class PingCommand {
	@SlashCommand({
		name: 'ping',
		description: 'Ping!',
	})
	public async onPing(@Context() [interaction]: SlashCommandContext) {
		
    		// Create a MessageEmbed for your response
		const newEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(':ping_pong:   Pong!')

    return interaction.reply({ content: '', ephemeral: true, embeds: [newEmbed]});
	}
}
