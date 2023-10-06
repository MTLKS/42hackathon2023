import { Injectable } from '@nestjs/common';
import { SlashCommand, SlashCommandContext, Context } from 'necord';

@Injectable()
export class LoginService {
	@SlashCommand({
		name: 'login',
		description: 'Login to 42 API',
	})
	public async onLogin(@Context() [interaction]: SlashCommandContext) {
		return interaction.reply({ content: 'Hi!', ephemeral: true });
	}
}
