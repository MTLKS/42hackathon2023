import { Injectable } from '@nestjs/common';
import { SlashCommand, SlashCommandContext, Context } from 'necord';

@Injectable()
export class PingCommand {
	@SlashCommand({
		name: 'ping',
		description: 'Ping!',
	})
	public async onPing(@Context() [interaction]: SlashCommandContext) {
		return interaction.reply({ content: 'Pong!', ephemeral: true });
	}
}
